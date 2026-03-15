# GitHub-integration

Triggerfish integreras med GitHub via två kompletterande tillvägagångssätt:

## Snabbinstallation: REST API-verktyg

Det snabbaste sättet att ansluta GitHub. Ger agenten 14 inbyggda verktyg för repos, PRs, ärenden, Actions och kodsökning — allt med klassificeringsmedveten taint-propagering.

```bash
triggerfish connect github
```

Detta vägleder dig genom att skapa en detaljerad personlig åtkomsttoken, validerar den och lagrar den i OS-nyckelringen. Det är allt — din agent kan nu använda alla `github_*`-verktyg.

Se [Kunskapsdokumentationen](/sv-SE/integrations/skills) för mer om hur kunskaper fungerar, eller kör `triggerfish skills list` för att se alla tillgängliga verktyg.

## Avancerat: `gh` CLI + Webhooks

För den fullständiga utvecklingsfeedbackslingan (agent skapar grenar, öppnar PRs, svarar på kodgranskning) stöder Triggerfish också `gh` CLI via exec och webhook-driven granskningsleverans. Detta använder tre komposterbara delar:

1. **`gh` CLI via exec** — utför alla GitHub-åtgärder (skapa PRs, läsa granskningar, kommentera, merga)
2. **Granskningsleverans** — två lägen: **webhook-händelser** (omedelbart, kräver offentlig slutpunkt) eller **trigger-baserad pollning** via `gh pr view` (fungerar bakom brandväggar)
3. **git-branch-management-kunskapen** — lär agenten det kompletta gren/PR/granskning-arbetsflödet

Tillsammans skapar dessa en fullständig utvecklingsfeedbackslinga: agenten skapar grenar, commitar kod, öppnar PRs och svarar på granskarfeedback — ingen anpassad GitHub API-kod krävs.

### Förutsättningar

#### gh CLI

GitHub CLI (`gh`) måste vara installerat och autentiserat i miljön där Triggerfish körs.

```bash
# Installera gh (Fedora/RHEL)
sudo dnf install gh

# Installera gh (macOS)
brew install gh

# Installera gh (Debian/Ubuntu)
sudo apt install gh

# Autentisera
gh auth login
```

Verifiera autentisering:

```bash
gh auth status
```

Agenten använder `gh` via `exec.run("gh ...")` — ingen separat GitHub-tokenkonfiguration behövs utöver `gh`-inloggningen.

### Git

Git måste vara installerat och konfigurerat med ett användarnamn och en e-postadress:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Repositoryåtkomst

Agentens arbetsyta måste vara ett git-repository (eller innehålla ett) med push-åtkomst till det fjärranslutna.

## Granskningsleverans

Det finns två sätt för agenten att lära sig om nya PR-granskningar. Välj ett eller använd båda tillsammans.

### Alternativ A: Trigger-baserad pollning

Ingen inkommande anslutning krävs. Agenten pollar GitHub på ett schema med `gh pr view`. Fungerar bakom vilken brandvägg, NAT eller VPN som helst.

Lägg till ett cron-jobb i `triggerfish.yaml`:

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

Eller lägg till "kontrollera öppna PRs för granskningsfeedback" till agentens TRIGGER.md för körning under den vanliga triggervakningscykeln.

### Alternativ B: Webhook-installation

Webhooks levererar granskningshändelser omedelbart. Det kräver att Triggerfish-gatewayen är nåbar från GitHubs servrar (t.ex. via Tailscale Funnel, omvänd proxy eller tunnel).

### Steg 1: Generera en webhook-hemlighet

```bash
openssl rand -hex 32
```

Lagra detta som en miljövariabel:

```bash
export GITHUB_WEBHOOK_SECRET="<genererad-hemlighet>"
```

Lägg till det i din skalsprofil eller hemlighetshanterare så att det kvarstår mellan omstarter.

### Steg 2: Konfigurera Triggerfish

Lägg till webhook-slutpunkten i `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # hemlighet lagrad i OS-nyckelring
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

### Steg 3: Exponera webhook-slutpunkten

Triggerfishs gateway måste vara nåbar från GitHubs servrar. Alternativ:

**Tailscale Funnel (rekommenderat för personlig användning):**

```yaml
# I triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

Det exponerar `https://<din-maskin>.ts.net/webhook/github` till internet.

**Omvänd proxy (nginx, Caddy):**

Vidarebefordra `/webhook/github` till din gateways lokala port.

**ngrok (utveckling/testning):**

```bash
ngrok http 8080
```

Använd den genererade URL:en som webhook-mål.

### Steg 4: Konfigurera GitHub-webhooken

I ditt GitHub-repository (eller organisation):

1. Gå till **Settings** > **Webhooks** > **Add webhook**
2. Ange **Payload URL** till din exponerade slutpunkt:
   ```
   https://<din-värd>/webhook/github
   ```
3. Ange **Content type** till `application/json`
4. Ange **Secret** till samma värde som `GITHUB_WEBHOOK_SECRET`
5. Under **Which events would you like to trigger this webhook?**, välj **Let me select individual events** och markera:
   - **Pull requests** (täcker `pull_request.opened`, `pull_request.closed`)
   - **Pull request reviews** (täcker `pull_request_review`)
   - **Pull request review comments** (täcker `pull_request_review_comment`)
   - **Issue comments** (täcker `issue_comment` på PRs och ärenden)
6. Klicka på **Add webhook**

GitHub skickar en ping-händelse för att verifiera anslutningen. Kontrollera Triggerfish-loggarna för att bekräfta mottagandet:

```bash
triggerfish logs --tail
```

## Hur feedbackslingan fungerar

### Med webhooks (omedelbart)

<img src="/diagrams/github-webhook-review.svg" alt="GitHub webhook-granskningsslinga: agent öppnar PR, väntar, tar emot webhook vid granskning, läser spårningsfil, åtgärdar feedback, commitar och pushar" style="max-width: 100%;" />

### Med trigger-baserad pollning (bakom brandvägg)

<img src="/diagrams/github-trigger-review.svg" alt="GitHub trigger-baserad granskning: agent öppnar PR, skriver spårningsfil, väntar på triggervaknat, pollar för granskningar, åtgärdar feedback" style="max-width: 100%;" />

Båda vägarna använder samma spårningsfiler. Agenten återhämtar kontexten genom att läsa PR-spårningsfilen från `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`.

## PR-spårningsfiler

Agenten skriver en spårningsfil för varje PR den skapar:

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<grennamn>.json
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

Efter merge arkiveras spårningsfiler till `completed/`.

## Mergepolicy

Som standard auto-mergar agenten **inte** godkända PRs. När en granskning godkänns notifierar agenten ägaren och väntar på en explicit mergeinstruktion.

För att aktivera auto-merge, lägg till i `triggerfish.yaml`:

```yaml
github:
  auto_merge: true
```

När aktiverad kör agenten `gh pr merge --squash --delete-branch` efter att ha tagit emot en godkännandegranskning.

::: warning Auto-merge är inaktiverat som standard av säkerhetsskäl. Aktivera det bara om du litar på agentens ändringar och har grensskyddsregler (nödvändiga granskare, CI-kontroller) konfigurerade i GitHub. :::

## Valfritt: GitHub MCP-server

För rikare GitHub API-åtkomst utöver vad `gh` CLI och de inbyggda verktygen tillhandahåller kan du också konfigurera GitHub MCP-servern:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # GitHub-token läses från OS-nyckelringen
    classification: CONFIDENTIAL
```

Det krävs inte för de flesta arbetsflöden — de inbyggda `github_*`-verktygen (installerade via `triggerfish connect github`) och `gh` CLI täcker alla vanliga operationer. MCP-servern är användbar för avancerade frågor som inte täcks av de inbyggda verktygen.

## Säkerhetsöverväganden

| Kontroll                 | Detalj                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **HMAC-verifiering**     | Alla GitHub-webhooks verifieras med HMAC-SHA256 före bearbetning (webhook-läge)                            |
| **Klassificering**       | GitHub-data klassificeras som `INTERNAL` som standard — kod och PR-data läcker inte till offentliga kanaler |
| **Sessionsisolering**    | Varje webhook-händelse eller triggervaknat skapar en ny isolerad session                                    |
| **Nedskrivningsregeln**  | Agentsvar på INTERNAL-klassificerade PR-händelser kan inte skickas till PUBLIC-kanaler                     |
| **Uppgiftshantering**    | `gh` CLI hanterar sin egen autentiseringstoken; inga GitHub-tokens lagras i triggerfish.yaml               |
| **Grennamnsgivning**     | `triggerfish/`-prefix gör agentgrenar lätta att identifiera och filtrera                                   |

::: tip Om ditt repository innehåller känslig kod (proprietär, säkerhetskritisk), överväg att ange webhook-klassificeringen till `CONFIDENTIAL` istället för `INTERNAL`. :::

## Felsökning

### Webhook tar inte emot händelser

1. Kontrollera att webhook-URL:en är nåbar från internet (använd `curl` från en extern maskin)
2. I GitHub, gå till **Settings** > **Webhooks** och kontrollera fliken **Recent Deliveries** för fel
3. Verifiera att hemligheten matchar mellan GitHub och `GITHUB_WEBHOOK_SECRET`
4. Kontrollera Triggerfish-loggar: `triggerfish logs --tail`

### PR-granskningar plockas inte upp (pollningsläge)

1. Kontrollera att `pr-review-check`-cron-jobbet är konfigurerat i `triggerfish.yaml`
2. Verifiera att daemonen körs: `triggerfish status`
3. Kontrollera att spårningsfiler finns i `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
4. Testa manuellt: `gh pr view <nummer> --json reviews`
5. Kontrollera Triggerfish-loggar: `triggerfish logs --tail`

### gh CLI inte autentiserat

```bash
gh auth status
# Om inte autentiserat:
gh auth login
```

### Agenten kan inte pusha till fjärransluten

Verifiera git-fjärransluten och uppgifter:

```bash
git remote -v
gh auth status
```

Se till att det autentiserade GitHub-kontot har push-åtkomst till repositoryt.

### Spårningsfil hittades inte under granskning

Agenten letar efter spårningsfiler i `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`. Om filen saknas kan PR:en ha skapats utanför Triggerfish, eller arbetsytan har rensats. Agenten bör notifiera ägaren och hoppa över automatiserad hantering.
