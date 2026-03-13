# GitHub-integratie

Triggerfish integreert met GitHub via twee complementaire benaderingen:

## Snelle installatie: REST API-tools

De snelste manier om GitHub te verbinden. Geeft de agent 14 ingebouwde tools voor repos, PR's, issues, Actions en codezoeken — allemaal met classificatie-bewuste taint-propagatie.

```bash
triggerfish connect github
```

Dit begeleidt u door het aanmaken van een fijnmazig Personal Access Token, valideert het en slaat het op in de OS-sleutelhanger. Dat is het — uw agent kan nu alle `github_*`-tools gebruiken.

Zie de [Skills-documentatie](/nl-NL/integrations/skills) voor meer informatie over hoe skills werken, of voer `triggerfish skills list` uit om alle beschikbare tools te bekijken.

## Geavanceerd: `gh` CLI + webhooks

Voor de volledige ontwikkelingsfeedbacklus (agent maakt branches, opent PR's, reageert op codebeoordeling), ondersteunt Triggerfish ook de `gh` CLI via exec en webhook-gestuurde beoordelingslevering. Dit gebruikt drie samenwerkenende onderdelen:

1. **`gh` CLI via exec** — alle GitHub-acties uitvoeren (PR's maken, beoordelingen lezen, commentaar plaatsen, samenvoegen)
2. **Beoordelingslevering** — twee modi: **webhook-gebeurtenissen** (direct, vereist publiek eindpunt) of **op trigger gebaseerd pollen** via `gh pr view` (werkt achter firewalls)
3. **git-branch-management-skill** — leert de agent de volledige branch/PR/beoordelingsworkflow

Samen creëren deze een volledige ontwikkelingsfeedbacklus: de agent maakt branches, commit code, opent PR's en reageert op reviewer-feedback — geen aangepaste GitHub API-code vereist.

### Vereisten

#### gh CLI

De GitHub CLI (`gh`) moet geïnstalleerd en geverifieerd zijn in de omgeving waar Triggerfish draait.

```bash
# Install gh (Fedora/RHEL)
sudo dnf install gh

# Install gh (macOS)
brew install gh

# Install gh (Debian/Ubuntu)
sudo apt install gh

# Authenticate
gh auth login
```

Verificatie bevestigen:

```bash
gh auth status
```

De agent gebruikt `gh` via `exec.run("gh ...")` — er is geen afzonderlijke GitHub-tokenconfiguratie nodig naast de `gh`-login.

### Git

Git moet zijn geïnstalleerd en geconfigureerd met een gebruikersnaam en e-mailadres:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Repository-toegang

De werkruimte van de agent moet een git-repository zijn (of er een bevatten) met pushtoegang tot het externe systeem.

## Beoordelingslevering

Er zijn twee manieren waarop de agent kan leren over nieuwe PR-beoordelingen. Kies één of gebruik beide samen.

### Optie A: Op trigger gebaseerd pollen

Geen inkomende connectiviteit vereist. De agent poll GitHub op een schema via `gh pr view`. Werkt achter elke firewall, NAT of VPN.

Voeg een cron-taak toe aan `triggerfish.yaml`:

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

Of voeg "controleer open PR's op beoordelingsfeedback" toe aan de TRIGGER.md van de agent voor uitvoering tijdens de reguliere trigger-wakeupcyclus.

### Optie B: Webhookconfiguratie

Webhooks leveren beoordelingsgebeurtenissen direct. Dit vereist dat de Triggerfish-gateway bereikbaar is vanaf de servers van GitHub (bijv. via Tailscale Funnel, reverse proxy of tunnel).

### Stap 1: Genereer een webhookgeheim

```bash
openssl rand -hex 32
```

Sla dit op als een omgevingsvariabele:

```bash
export GITHUB_WEBHOOK_SECRET="<generated-secret>"
```

Voeg het toe aan uw shellprofiel of geheimenbeheerder zodat het blijft bestaan over herstarts.

### Stap 2: Configureer Triggerfish

Voeg het webhook-eindpunt toe aan `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret stored in OS keychain
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

### Stap 3: Stel het webhook-eindpunt bloot

De gateway van Triggerfish moet bereikbaar zijn vanaf de servers van GitHub. Opties:

**Tailscale Funnel (aanbevolen voor persoonlijk gebruik):**

```yaml
# In triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

Dit stelt `https://<uw-machine>.ts.net/webhook/github` bloot aan het internet.

**Reverse proxy (nginx, Caddy):**

Stuur `/webhook/github` door naar de lokale poort van uw gateway.

**ngrok (ontwikkeling/testen):**

```bash
ngrok http 8080
```

Gebruik de gegenereerde URL als webhook-doel.

### Stap 4: Configureer de GitHub-webhook

In uw GitHub-repository (of organisatie):

1. Ga naar **Settings** > **Webhooks** > **Add webhook**
2. Stel de **Payload URL** in op uw blootgesteld eindpunt:
   ```
   https://<uw-host>/webhook/github
   ```
3. Stel het **Content type** in op `application/json`
4. Stel het **Secret** in op dezelfde waarde als `GITHUB_WEBHOOK_SECRET`
5. Selecteer bij **Which events would you like to trigger this webhook?** de optie **Let me select individual events** en vink aan:
   - **Pull requests** (dekt `pull_request.opened`, `pull_request.closed`)
   - **Pull request reviews** (dekt `pull_request_review`)
   - **Pull request review comments** (dekt `pull_request_review_comment`)
   - **Issue comments** (dekt `issue_comment` op PR's en issues)
6. Klik op **Add webhook**

GitHub stuurt een ping-gebeurtenis om de verbinding te verifiëren. Controleer de Triggerfish-logboeken om ontvangst te bevestigen:

```bash
triggerfish logs --tail
```

## Hoe de feedbacklus werkt

### Met webhooks (direct)

<img src="/diagrams/github-webhook-review.svg" alt="GitHub-webhook-beoordelingslus: agent opent PR, wacht, ontvangt webhook bij beoordeling, leest trackingbestand, verwerkt feedback, commit en pusht" style="max-width: 100%;" />

### Met op trigger gebaseerd pollen (achter firewall)

<img src="/diagrams/github-trigger-review.svg" alt="GitHub trigger-gebaseerde beoordeling: agent opent PR, schrijft trackingbestand, wacht op trigger-wakeup, poll voor beoordelingen, verwerkt feedback" style="max-width: 100%;" />

Beide paden gebruiken dezelfde trackingbestanden. De agent herstelt context door het PR-trackingbestand te lezen uit `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`.

## PR-trackingbestanden

De agent schrijft een trackingbestand voor elke PR die hij aanmaakt:

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<branch-name>.json
```

Schema:

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

Na samenvoegen worden trackingbestanden gearchiveerd naar `completed/`.

## Samenvoegbeleid

Standaard voegt de agent goedgekeurde PR's **niet** automatisch samen. Wanneer een beoordeling is goedgekeurd, meldt de agent de eigenaar en wacht op een expliciete samenvoeginstructie.

Om automatisch samenvoegen in te schakelen, voeg toe aan `triggerfish.yaml`:

```yaml
github:
  auto_merge: true
```

Wanneer ingeschakeld, voert de agent `gh pr merge --squash --delete-branch` uit na het ontvangen van een goedkeurende beoordeling.

::: warning Automatisch samenvoegen is standaard uitgeschakeld voor veiligheid. Schakel het alleen in als u de wijzigingen van de agent vertrouwt en branchbeschermingsregels (vereiste reviewers, CI-controles) hebt geconfigureerd in GitHub. :::

## Optioneel: GitHub MCP-server

Voor uitgebreidere GitHub API-toegang dan wat `gh` CLI en de ingebouwde tools bieden, kunt u ook de GitHub MCP-server configureren:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # GitHub token is read from the OS keychain
    classification: CONFIDENTIAL
```

Dit is niet vereist voor de meeste workflows — de ingebouwde `github_*`-tools (ingesteld via `triggerfish connect github`) en `gh` CLI dekken alle veelgebruikte bewerkingen. De MCP-server is nuttig voor geavanceerde queries die niet worden gedekt door de ingebouwde tools.

## Beveiligingsoverwegingen

| Besturingselement       | Detail                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| **HMAC-verificatie**    | Alle GitHub-webhooks worden geverifieerd met HMAC-SHA256 vóór verwerking (webhookmodus)                        |
| **Classificatie**       | GitHub-gegevens zijn standaard geclassificeerd als `INTERNAL` — code en PR-gegevens lekken niet naar publieke kanalen |
| **Sessie-isolatie**     | Elke webhook-gebeurtenis of trigger-wakeup spawnt een verse geïsoleerde sessie                                 |
| **No Write-Down**       | Agentreacties op INTERNAL-geclassificeerde PR-gebeurtenissen kunnen niet worden verzonden naar PUBLIC-kanalen  |
| **Inloggegevensbeheer** | `gh` CLI beheert zijn eigen authenticatietoken; geen GitHub-tokens opgeslagen in triggerfish.yaml              |
| **Branchnaming**        | `triggerfish/`-prefix maakt agentbranches gemakkelijk herkenbaar en filterbaar                                 |

::: tip Als uw repository gevoelige code bevat (eigendomsrechtelijk beschermd, beveiligingskritiek), overweeg dan de webhookclassificatie in te stellen op `CONFIDENTIAL` in plaats van `INTERNAL`. :::

## Probleemoplossing

### Webhook ontvangt geen gebeurtenissen

1. Controleer of de webhook-URL bereikbaar is vanaf het internet (gebruik `curl` vanaf een externe machine)
2. Controleer in GitHub de tab **Recent Deliveries** bij **Settings** > **Webhooks** op fouten
3. Verifieer dat het geheim overeenkomt tussen GitHub en `GITHUB_WEBHOOK_SECRET`
4. Controleer Triggerfish-logboeken: `triggerfish logs --tail`

### PR-beoordelingen worden niet opgepikt (pollingmodus)

1. Controleer of de `pr-review-check`-cron-taak is geconfigureerd in `triggerfish.yaml`
2. Verifieer dat de daemon actief is: `triggerfish status`
3. Controleer of trackingbestanden bestaan in `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
4. Test handmatig: `gh pr view <number> --json reviews`
5. Controleer Triggerfish-logboeken: `triggerfish logs --tail`

### gh CLI niet geverifieerd

```bash
gh auth status
# If not authenticated:
gh auth login
```

### Agent kan niet pushen naar remote

Verifieer git-remote en inloggegevens:

```bash
git remote -v
gh auth status
```

Zorg ervoor dat het geverifieerde GitHub-account pushtoegang heeft tot de repository.

### Trackingbestand niet gevonden tijdens beoordeling

De agent zoekt naar trackingbestanden in `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`. Als het bestand ontbreekt, is de PR mogelijk buiten Triggerfish aangemaakt, of is de werkruimte opgeschoond. De agent moet de eigenaar informeren en geautomatiseerde verwerking overslaan.
