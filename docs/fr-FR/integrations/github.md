# Integration GitHub

Triggerfish s'integre a GitHub a travers deux approches complementaires :

## Configuration rapide : Outils API REST

Le moyen le plus rapide de connecter GitHub. Donne a l'agent 14 outils integres
pour les depots, PR, issues, Actions et la recherche de code -- le tout avec une
propagation du taint tenant compte de la classification.

```bash
triggerfish connect github
```

Cela vous guide dans la creation d'un Personal Access Token a granularite fine, le
valide et le stocke dans le trousseau de cles du systeme. C'est tout -- votre
agent peut maintenant utiliser tous les outils `github_*`.

Consultez la [documentation des skills](/fr-FR/integrations/skills) pour en savoir
plus sur le fonctionnement des skills, ou executez `triggerfish skills list` pour
voir tous les outils disponibles.

## Avance : CLI `gh` + Webhooks

Pour la boucle de retroaction de developpement complete (l'agent cree des
branches, ouvre des PR, repond aux revues de code), Triggerfish prend egalement en
charge le CLI `gh` via exec et la livraison de revues pilotee par webhook. Cela
utilise trois elements composables :

1. **CLI `gh` via exec** -- effectuer toutes les actions GitHub (creer des PR,
   lire les revues, commenter, merger)
2. **Livraison des revues** -- deux modes : **evenements webhook** (instantanes,
   necessite un point de terminaison public) ou **polling base sur les
   declencheurs** via `gh pr view` (fonctionne derriere les pare-feux)
3. **Skill git-branch-management** -- enseigne a l'agent le workflow complet
   branche/PR/revue

Ensemble, ces elements creent une boucle de retroaction de developpement
complete : l'agent cree des branches, commite du code, ouvre des PR et repond aux
retours des relecteurs -- aucun code API GitHub personnalise n'est necessaire.

### Prerequis

#### CLI gh

Le CLI GitHub (`gh`) doit etre installe et authentifie dans l'environnement ou
Triggerfish s'execute.

```bash
# Installer gh (Fedora/RHEL)
sudo dnf install gh

# Installer gh (macOS)
brew install gh

# Installer gh (Debian/Ubuntu)
sudo apt install gh

# S'authentifier
gh auth login
```

Verifiez l'authentification :

```bash
gh auth status
```

L'agent utilise `gh` via `exec.run("gh ...")` -- aucune configuration de token
GitHub separee n'est necessaire au-dela du login `gh`.

### Git

Git doit etre installe et configure avec un nom d'utilisateur et un email :

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Acces au depot

L'espace de travail de l'agent doit etre un depot git (ou en contenir un) avec un
acces en push vers le remote.

## Livraison des revues

Il existe deux facons pour l'agent d'apprendre l'existence de nouvelles revues de
PR. Choisissez-en une ou utilisez les deux ensemble.

### Option A : Polling base sur les declencheurs

Aucune connectivite entrante requise. L'agent interroge GitHub selon un planning
en utilisant `gh pr view`. Fonctionne derriere tout pare-feu, NAT ou VPN.

Ajoutez un cron job a `triggerfish.yaml` :

```yaml
scheduler:
  cron:
    jobs:
      - id: pr-review-check
        schedule: "*/15 * * * *"
        task: >
          Check all open PR tracking files in scratch/pr-tracking/.
          For each open PR, query GitHub for new reviews or state changes
          using gh pr view. Address any review feedback, handle merges
          and closures.
        classification: INTERNAL
```

Ou ajoutez "verifier les PR ouvertes pour les retours de revue" au TRIGGER.md de
l'agent pour execution lors du cycle regulier de reveil des declencheurs.

### Option B : Configuration webhook

Les webhooks livrent les evenements de revue instantanement. Cela necessite que
le gateway Triggerfish soit accessible depuis les serveurs de GitHub (ex. via
Tailscale Funnel, proxy inverse ou tunnel).

### Etape 1 : Generer un secret webhook

```bash
openssl rand -hex 32
```

Stockez ceci comme variable d'environnement :

```bash
export GITHUB_WEBHOOK_SECRET="<secret-genere>"
```

Ajoutez-le a votre profil shell ou gestionnaire de secrets pour qu'il persiste
entre les redemarrages.

### Etape 2 : Configurer Triggerfish

Ajoutez le point de terminaison webhook a `triggerfish.yaml` :

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret stocke dans le trousseau de cles du systeme
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: >
            A PR review was submitted. Read the PR tracking file from
            scratch/pr-tracking/ to recover context. Check out the branch,
            read the review, address any requested changes, commit, push,
            and comment on the PR with a summary of changes made.
        - event: "pull_request_review_comment"
          task: >
            An inline review comment was posted on a PR. Read the PR
            tracking file, check out the branch, address the specific
            comment, commit, push.
        - event: "issue_comment"
          task: >
            A comment was posted on a PR or issue. Check if this is a
            tracked PR by looking up tracking files in scratch/pr-tracking/.
            If tracked, check out the branch and address the feedback.
        - event: "pull_request.closed"
          task: >
            A PR was closed or merged. Read the tracking file. If merged,
            clean up: delete local branch, archive tracking file to
            completed/. Notify the owner of the merge. If closed without
            merge, archive and notify.
```

### Etape 3 : Exposer le point de terminaison webhook

Le gateway de Triggerfish doit etre accessible depuis les serveurs de GitHub.
Options :

**Tailscale Funnel (recommande pour usage personnel) :**

```yaml
# Dans triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

Cela expose `https://<votre-machine>.ts.net/webhook/github` a l'internet.

**Proxy inverse (nginx, Caddy) :**

Redirigez `/webhook/github` vers le port local de votre gateway.

**ngrok (developpement/tests) :**

```bash
ngrok http 8080
```

Utilisez l'URL generee comme cible du webhook.

### Etape 4 : Configurer le webhook GitHub

Dans votre depot GitHub (ou organisation) :

1. Allez dans **Settings** > **Webhooks** > **Add webhook**
2. Definissez l'**URL de charge utile** vers votre point de terminaison expose :
   ```
   https://<votre-hote>/webhook/github
   ```
3. Definissez le **type de contenu** a `application/json`
4. Definissez le **Secret** a la meme valeur que `GITHUB_WEBHOOK_SECRET`
5. Sous **Quels evenements souhaitez-vous declencher ce webhook ?**, selectionnez
   **Laissez-moi selectionner des evenements individuels** et cochez :
   - **Pull requests** (couvre `pull_request.opened`, `pull_request.closed`)
   - **Pull request reviews** (couvre `pull_request_review`)
   - **Pull request review comments** (couvre `pull_request_review_comment`)
   - **Issue comments** (couvre `issue_comment` sur les PR et issues)
6. Cliquez sur **Add webhook**

GitHub enverra un evenement ping pour verifier la connexion. Verifiez les logs
Triggerfish pour confirmer la reception :

```bash
triggerfish logs --tail
```

## Fonctionnement de la boucle de retroaction

### Avec webhooks (instantane)

<img src="/diagrams/github-webhook-review.svg" alt="Boucle de revue webhook GitHub : l'agent ouvre une PR, attend, recoit un webhook a la revue, lit le fichier de suivi, traite les retours, commite et pousse" style="max-width: 100%;" />

### Avec polling base sur les declencheurs (derriere un pare-feu)

<img src="/diagrams/github-trigger-review.svg" alt="Revue basee sur les declencheurs GitHub : l'agent ouvre une PR, ecrit un fichier de suivi, attend le reveil du declencheur, interroge les revues, traite les retours" style="max-width: 100%;" />

Les deux chemins utilisent les memes fichiers de suivi. L'agent recupere le
contexte en lisant le fichier de suivi de PR depuis
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`.

## Fichiers de suivi de PR

L'agent ecrit un fichier de suivi pour chaque PR qu'il cree :

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<nom-de-branche>.json
```

Schema :

```json
{
  "branch": "triggerfish/agent-1/fix-auth-timeout",
  "prNumber": 42,
  "prUrl": "https://github.com/owner/repo/pull/42",
  "task": "Fix authentication timeout when token expires during long requests",
  "repository": "owner/repo",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "lastCheckedAt": "2025-01-15T10:30:00Z",
  "lastReviewId": "",
  "status": "open",
  "commits": [
    "feat: add token refresh before expiry",
    "test: add timeout edge case coverage"
  ]
}
```

Apres le merge, les fichiers de suivi sont archives dans `completed/`.

## Politique de merge

Par defaut, l'agent ne fait **pas** d'auto-merge des PR approuvees. Lorsqu'une
revue est approuvee, l'agent notifie le proprietaire et attend une instruction
de merge explicite.

Pour activer l'auto-merge, ajoutez a `triggerfish.yaml` :

```yaml
github:
  auto_merge: true
```

Lorsque active, l'agent executera
`gh pr merge --squash --delete-branch` apres reception d'une revue approbatrice.

::: warning L'auto-merge est desactive par defaut par securite. Ne l'activez que
si vous faites confiance aux changements de l'agent et que vous avez des regles de
protection de branche (relecteurs requis, verifications CI) configurees dans
GitHub. :::

## Optionnel : Serveur MCP GitHub

Pour un acces API GitHub plus riche au-dela de ce que le CLI `gh` et les outils
integres fournissent, vous pouvez egalement configurer le serveur MCP GitHub :

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # Le token GitHub est lu depuis le trousseau de cles du systeme
    classification: CONFIDENTIAL
```

Ce n'est pas requis pour la plupart des workflows -- les outils integres
`github_*` (configures via `triggerfish connect github`) et le CLI `gh` couvrent
toutes les operations courantes. Le serveur MCP est utile pour les requetes
avancees non couvertes par les outils integres.

## Considerations de securite

| Controle                      | Detail                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Verification HMAC**         | Tous les webhooks GitHub sont verifies avec HMAC-SHA256 avant traitement (mode webhook)                     |
| **Classification**            | Les donnees GitHub sont classifiees `INTERNAL` par defaut -- le code et les donnees de PR ne fuient pas vers les canaux publics |
| **Isolation de session**      | Chaque evenement webhook ou reveil de declencheur genere une session isolee fraiche                         |
| **Non ecriture descendante**  | Les reponses de l'agent aux evenements PR classifies INTERNAL ne peuvent pas etre envoyees aux canaux PUBLIC |
| **Gestion des identifiants**  | Le CLI `gh` gere son propre token d'authentification ; aucun token GitHub stocke dans triggerfish.yaml       |
| **Nommage des branches**      | Le prefixe `triggerfish/` rend les branches de l'agent facilement identifiables et filtrables               |

::: tip Si votre depot contient du code sensible (proprietaire, critique en
matiere de securite), envisagez de definir la classification du webhook a
`CONFIDENTIAL` au lieu de `INTERNAL`. :::

## Depannage

### Le webhook ne recoit pas d'evenements

1. Verifiez que l'URL du webhook est accessible depuis l'internet (utilisez `curl`
   depuis une machine externe)
2. Dans GitHub, allez dans **Settings** > **Webhooks** et verifiez l'onglet
   **Recent Deliveries** pour les erreurs
3. Verifiez que le secret correspond entre GitHub et `GITHUB_WEBHOOK_SECRET`
4. Verifiez les logs Triggerfish : `triggerfish logs --tail`

### Les revues de PR ne sont pas detectees (mode polling)

1. Verifiez que le cron job `pr-review-check` est configure dans
   `triggerfish.yaml`
2. Verifiez que le daemon est en cours d'execution : `triggerfish status`
3. Verifiez que les fichiers de suivi existent dans
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
4. Testez manuellement : `gh pr view <numero> --json reviews`
5. Verifiez les logs Triggerfish : `triggerfish logs --tail`

### CLI gh non authentifie

```bash
gh auth status
# Si non authentifie :
gh auth login
```

### L'agent ne peut pas pousser vers le remote

Verifiez le remote git et les identifiants :

```bash
git remote -v
gh auth status
```

Assurez-vous que le compte GitHub authentifie a un acces en push au depot.

### Fichier de suivi introuvable lors de la revue

L'agent cherche les fichiers de suivi dans
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`. Si le fichier est
manquant, la PR a peut-etre ete creee en dehors de Triggerfish, ou l'espace de
travail a ete nettoye. L'agent doit notifier le proprietaire et ignorer le
traitement automatise.
