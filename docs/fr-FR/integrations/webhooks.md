# Webhooks

Triggerfish peut accepter des evenements entrants de services externes, permettant
des reactions en temps reel aux emails, alertes d'erreurs, evenements CI/CD,
changements de calendrier et plus encore. Les webhooks transforment votre agent
d'un systeme reactif de questions-reponses en un participant proactif dans vos
workflows.

## Fonctionnement des webhooks

Les services externes envoient des requetes HTTP POST vers des points de
terminaison webhook enregistres sur le gateway Triggerfish. Chaque evenement
entrant est verifie pour son authenticite, classifie et achemine vers l'agent
pour traitement.

<img src="/diagrams/webhook-pipeline.svg" alt="Pipeline webhook : les services externes envoient des HTTP POST a travers la verification HMAC, la classification, l'isolation de session et les hooks de politique vers le traitement par l'agent" style="max-width: 100%;" />

## Sources d'evenements prises en charge

Triggerfish peut recevoir des webhooks de tout service prenant en charge la
livraison par webhook HTTP. Les integrations courantes incluent :

| Source   | Mecanisme                      | Exemples d'evenements                           |
| -------- | ------------------------------ | ----------------------------------------------- |
| Gmail    | Notifications push Pub/Sub     | Nouvel email, changement de label               |
| GitHub   | Webhook                        | PR ouverte, commentaire d'issue, echec CI       |
| Sentry   | Webhook                        | Alerte d'erreur, regression detectee            |
| Stripe   | Webhook                        | Paiement recu, changement d'abonnement          |
| Calendar | Polling ou push                | Rappel d'evenement, conflit detecte             |
| Custom   | Point de terminaison webhook generique | Toute charge utile JSON                    |

## Configuration

Les points de terminaison webhook sont configures dans `triggerfish.yaml` :

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret stocke dans le trousseau de cles du systeme
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret stocke dans le trousseau de cles du systeme
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secret stocke dans le trousseau de cles du systeme
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Champs de configuration

| Champ             | Requis | Description                                                             |
| ----------------- | :----: | ----------------------------------------------------------------------- |
| `id`              |  Oui   | Identifiant unique pour ce point de terminaison webhook                 |
| `path`            |  Oui   | Chemin URL ou le point de terminaison est enregistre                    |
| `secret`          |  Oui   | Secret partage pour la verification de signature HMAC                   |
| `classification`  |  Oui   | Niveau de classification attribue aux evenements de cette source        |
| `actions`         |  Oui   | Liste des mappages evenement-tache                                      |
| `actions[].event` |  Oui   | Motif de type d'evenement a correspondre                                |
| `actions[].task`  |  Oui   | Tache en langage naturel a executer par l'agent                         |

::: tip Les secrets webhook sont stockes dans le trousseau de cles du systeme.
Executez `triggerfish dive` ou configurez les webhooks de maniere interactive pour
les saisir en securite. :::

## Verification de signature HMAC

Chaque requete webhook entrante est verifiee pour son authenticite via la
validation de signature HMAC avant que la charge utile ne soit traitee.

### Fonctionnement de la verification

1. Le service externe envoie un webhook avec un en-tete de signature (par
   exemple, `X-Hub-Signature-256` pour GitHub)
2. Triggerfish calcule le HMAC du corps de la requete en utilisant le secret
   partage configure
3. La signature calculee est comparee a la signature dans l'en-tete de la requete
4. Si les signatures ne correspondent pas, la requete est **rejetee**
   immediatement
5. Si elle est verifiee, la charge utile procede a la classification et au
   traitement

<img src="/diagrams/hmac-verification.svg" alt="Flux de verification HMAC : verifier la presence de la signature, calculer le HMAC, comparer les signatures, rejeter ou continuer" style="max-width: 100%;" />

::: warning SECURITE Les requetes webhook sans signatures HMAC valides sont
rejetees avant tout traitement. Cela empeche les evenements usurpes de declencher
des actions de l'agent. Ne desactivez jamais la verification de signature en
production. :::

## Pipeline de traitement des evenements

Une fois qu'un evenement webhook passe la verification de signature, il traverse
le pipeline de securite standard :

### 1. Classification

La charge utile de l'evenement est classifiee au niveau configure pour le point
de terminaison webhook. Un point de terminaison webhook configure comme
`CONFIDENTIAL` produit des evenements `CONFIDENTIAL`.

### 2. Isolation de session

Chaque evenement webhook genere sa propre session isolee. Cela signifie :

- L'evenement est traite independamment de toute conversation en cours
- Le taint de session demarre frais (au niveau de classification du webhook)
- Aucune fuite de donnees entre les sessions declenchees par webhook et les
  sessions utilisateur
- Chaque session a son propre suivi de taint et lignage

### 3. Hook PRE_CONTEXT_INJECTION

La charge utile de l'evenement passe par le hook `PRE_CONTEXT_INJECTION` avant
d'entrer dans le contexte de l'agent. Ce hook :

- Valide la structure de la charge utile
- Applique la classification a tous les champs de donnees
- Cree un enregistrement de lignage pour les donnees entrantes
- Scanne les motifs d'injection dans les champs texte
- Peut bloquer l'evenement si les regles de politique le dictent

### 4. Traitement par l'agent

L'agent recoit l'evenement classifie et execute la tache configuree. La tache est
une instruction en langage naturel -- l'agent utilise toutes ses capacites
(outils, skills, navigateur, environnement d'execution) pour la completer dans
les contraintes de politique.

### 5. Livraison de la sortie

Toute sortie de l'agent (messages, notifications, actions) passe par le hook
`PRE_OUTPUT`. La regle de non ecriture descendante s'applique : la sortie d'une
session declenchee par webhook `CONFIDENTIAL` ne peut pas etre envoyee a un canal
`PUBLIC`.

### 6. Audit

Le cycle de vie complet de l'evenement est journalise : reception, verification,
classification, creation de session, actions de l'agent et decisions de sortie.

## Integration avec le planificateur

Les webhooks s'integrent naturellement avec le
[systeme de cron et declencheurs](/fr-FR/features/cron-and-triggers) de
Triggerfish. Un evenement webhook peut :

- **Declencher un cron job existant** en avance sur le planning (par exemple, un
  webhook de deploiement declenche une verification de sante immediate)
- **Creer une nouvelle tache planifiee** (par exemple, un webhook de calendrier
  planifie un rappel)
- **Mettre a jour les priorites des declencheurs** (par exemple, une alerte Sentry
  fait prioriser l'investigation d'erreur par l'agent lors de son prochain reveil
  de declencheur)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # secret stocke dans le trousseau de cles du systeme
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # L'agent peut utiliser cron.create pour planifier des verifications de suivi
```

## Resume de la securite

| Controle                | Description                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Verification HMAC       | Tous les webhooks entrants verifies avant traitement                                 |
| Classification          | Les charges utiles webhook classifiees au niveau configure                            |
| Isolation de session    | Chaque evenement obtient sa propre session isolee                                    |
| `PRE_CONTEXT_INJECTION` | Charge utile scannee et classifiee avant d'entrer dans le contexte                   |
| Non ecriture descendante | La sortie d'evenements a haute classification ne peut atteindre les canaux a basse classification |
| Journalisation d'audit  | Cycle de vie complet de l'evenement enregistre                                       |
| Non expose publiquement | Les points de terminaison webhook ne sont pas exposes a l'internet public par defaut |

## Exemple : Boucle de revue de PR GitHub

Un exemple concret de webhooks en action : l'agent ouvre une PR, puis les
evenements webhook GitHub alimentent la boucle de retour de revue de code sans
aucun polling.

### Fonctionnement

1. L'agent cree une branche de fonctionnalite, commite du code et ouvre une PR
   via `gh pr create`
2. L'agent ecrit un fichier de suivi dans
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` avec le nom de
   branche, le numero de PR et le contexte de la tache
3. L'agent s'arrete et attend -- pas de polling

Lorsqu'un relecteur publie des commentaires :

4. GitHub envoie un webhook `pull_request_review` a Triggerfish
5. Triggerfish verifie la signature HMAC, classifie l'evenement et genere une
   session isolee
6. L'agent lit le fichier de suivi pour recuperer le contexte, checkout la
   branche, traite la revue, commite, pousse et commente la PR
7. Les etapes 4-6 se repetent jusqu'a ce que la revue soit approuvee

Lorsque la PR est mergee :

8. GitHub envoie un webhook `pull_request.closed` avec `merged: true`
9. L'agent nettoie : supprime la branche locale, archive le fichier de suivi

### Configuration

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret stocke dans le trousseau de cles du systeme
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

Le webhook GitHub doit envoyer : `Pull requests`, `Pull request reviews`,
`Pull request review comments` et `Issue comments`.

Consultez le guide complet de l'[integration GitHub](/fr-FR/integrations/github)
pour les instructions de configuration et la skill fournie
`git-branch-management` pour le workflow complet de l'agent.

### Controles d'entreprise

- **Liste blanche de webhooks** geree par l'administrateur -- seules les sources
  externes approuvees peuvent enregistrer des points de terminaison
- **Limitation de debit** par point de terminaison pour prevenir les abus
- **Limites de taille de charge utile** pour prevenir l'epuisement de la memoire
- **Liste blanche d'IP** pour une verification supplementaire de la source
- **Politiques de retention** pour les journaux d'evenements webhook

::: info Les points de terminaison webhook ne sont pas exposes a l'internet public
par defaut. Pour que les services externes atteignent votre instance Triggerfish,
vous devez configurer une redirection de port, un proxy inverse ou un tunnel. La
section [Acces distant](/fr-FR/reference/) de la documentation couvre les options
d'exposition securisee. :::
