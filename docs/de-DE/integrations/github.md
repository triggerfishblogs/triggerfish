# GitHub-Integration

Triggerfish integriert sich ueber zwei sich ergaenzende Ansaetze mit GitHub:

## Schnelleinrichtung: REST-API-Tools

Der schnellste Weg, GitHub zu verbinden. Gibt dem Agenten 14 eingebaute Tools fuer Repos, PRs, Issues, Actions und Code-Suche -- alles mit klassifizierungsbewusster Taint-Propagation.

```bash
triggerfish connect github
```

Dies fuehrt Sie durch die Erstellung eines feinkoernigen Personal Access Tokens, validiert ihn und speichert ihn im Betriebssystem-Schluesselbund. Das war's -- Ihr Agent kann jetzt alle `github_*`-Tools verwenden.

Siehe die [Skills-Dokumentation](/de-DE/integrations/skills) fuer mehr darueber, wie Skills funktionieren, oder fuehren Sie `triggerfish skills list` aus, um alle verfuegbaren Tools zu sehen.

## Erweitert: `gh` CLI + Webhooks

Fuer die vollstaendige Entwicklungs-Feedback-Schleife (Agent erstellt Branches, oeffnet PRs, reagiert auf Code-Review) unterstuetzt Triggerfish auch die `gh` CLI ueber Exec und webhook-gesteuerte Review-Zustellung. Dies verwendet drei kombinierbare Teile:

1. **`gh` CLI ueber Exec** -- alle GitHub-Aktionen ausfuehren (PRs erstellen, Reviews lesen, kommentieren, mergen)
2. **Review-Zustellung** -- zwei Modi: **Webhook-Ereignisse** (sofort, erfordert oeffentlichen Endpunkt) oder **trigger-basiertes Polling** ueber `gh pr view` (funktioniert hinter Firewalls)
3. **git-branch-management-Skill** -- lehrt den Agenten den vollstaendigen Branch/PR/Review-Workflow

Zusammen erzeugen diese eine vollstaendige Entwicklungs-Feedback-Schleife: Der Agent erstellt Branches, committet Code, oeffnet PRs und reagiert auf Reviewer-Feedback -- kein benutzerdefinierter GitHub-API-Code erforderlich.

### Voraussetzungen

#### gh CLI

Die GitHub CLI (`gh`) muss in der Umgebung, in der Triggerfish laeuft, installiert und authentifiziert sein.

```bash
# gh installieren (Fedora/RHEL)
sudo dnf install gh

# gh installieren (macOS)
brew install gh

# gh installieren (Debian/Ubuntu)
sudo apt install gh

# Authentifizieren
gh auth login
```

Authentifizierung verifizieren:

```bash
gh auth status
```

Der Agent verwendet `gh` ueber `exec.run("gh ...")` -- keine separate GitHub-Token-Konfiguration ist ueber das `gh`-Login hinaus erforderlich.

### Git

Git muss installiert und mit einem Benutzernamen und einer E-Mail konfiguriert sein:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Repository-Zugriff

Der Workspace des Agenten muss ein Git-Repository sein (oder eines enthalten) mit Push-Zugriff auf das Remote.

## Review-Zustellung

Es gibt zwei Moeglichkeiten, wie der Agent von neuen PR-Reviews erfaehrt. Waehlen Sie eine oder verwenden Sie beide zusammen.

### Option A: Trigger-basiertes Polling

Keine eingehende Konnektivitaet erforderlich. Der Agent fragt GitHub nach einem Zeitplan ueber `gh pr view` ab. Funktioniert hinter jeder Firewall, NAT oder VPN.

Fuegen Sie einen Cron-Job zu `triggerfish.yaml` hinzu:

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

Oder fuegen Sie "check open PRs for review feedback" zum TRIGGER.md des Agenten hinzu, fuer die Ausfuehrung waehrend des regulaeren Trigger-Wakeup-Zyklus.

### Option B: Webhook-Einrichtung

Webhooks liefern Review-Ereignisse sofort. Dies erfordert, dass das Triggerfish-Gateway von GitHubs Servern erreichbar ist (z.B. ueber Tailscale Funnel, Reverse Proxy oder Tunnel).

### Schritt 1: Webhook-Secret generieren

```bash
openssl rand -hex 32
```

Speichern Sie dies als Umgebungsvariable:

```bash
export GITHUB_WEBHOOK_SECRET="<generated-secret>"
```

Fuegen Sie es Ihrem Shell-Profil oder Secrets-Manager hinzu, damit es Neustarts ueberlebt.

### Schritt 2: Triggerfish konfigurieren

Fuegen Sie den Webhook-Endpunkt zu `triggerfish.yaml` hinzu:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # Secret im Betriebssystem-Schluesselbund gespeichert
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

### Schritt 3: Webhook-Endpunkt bereitstellen

Das Triggerfish-Gateway muss von GitHubs Servern erreichbar sein. Optionen:

**Tailscale Funnel (empfohlen fuer persoenliche Nutzung):**

```yaml
# In triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

Dies stellt `https://<your-machine>.ts.net/webhook/github` dem Internet bereit.

**Reverse Proxy (nginx, Caddy):**

Leiten Sie `/webhook/github` an den lokalen Port Ihres Gateways weiter.

**ngrok (Entwicklung/Testen):**

```bash
ngrok http 8080
```

Verwenden Sie die generierte URL als Webhook-Ziel.

### Schritt 4: GitHub-Webhook konfigurieren

In Ihrem GitHub-Repository (oder Ihrer Organisation):

1. Gehen Sie zu **Settings** > **Webhooks** > **Add webhook**
2. Setzen Sie die **Payload URL** auf Ihren bereitgestellten Endpunkt:
   ```
   https://<your-host>/webhook/github
   ```
3. Setzen Sie **Content type** auf `application/json`
4. Setzen Sie **Secret** auf denselben Wert wie `GITHUB_WEBHOOK_SECRET`
5. Unter **Which events would you like to trigger this webhook?** waehlen Sie **Let me select individual events** und haken Sie an:
   - **Pull requests** (umfasst `pull_request.opened`, `pull_request.closed`)
   - **Pull request reviews** (umfasst `pull_request_review`)
   - **Pull request review comments** (umfasst `pull_request_review_comment`)
   - **Issue comments** (umfasst `issue_comment` bei PRs und Issues)
6. Klicken Sie auf **Add webhook**

GitHub sendet ein Ping-Ereignis, um die Verbindung zu verifizieren. Pruefen Sie die Triggerfish-Logs, um den Empfang zu bestaetigen:

```bash
triggerfish logs --tail
```

## Wie die Feedback-Schleife funktioniert

### Mit Webhooks (sofort)

<img src="/diagrams/github-webhook-review.svg" alt="GitHub-Webhook-Review-Schleife: Agent oeffnet PR, wartet, empfaengt Webhook bei Review, liest Tracking-Datei, adressiert Feedback, committet und pusht" style="max-width: 100%;" />

### Mit trigger-basiertem Polling (hinter Firewall)

<img src="/diagrams/github-trigger-review.svg" alt="GitHub-trigger-basiertes Review: Agent oeffnet PR, schreibt Tracking-Datei, wartet auf Trigger-Wakeup, fragt Reviews ab, adressiert Feedback" style="max-width: 100%;" />

Beide Pfade verwenden dieselben Tracking-Dateien. Der Agent stellt den Kontext wieder her, indem er die PR-Tracking-Datei aus `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` liest.

## PR-Tracking-Dateien

Der Agent schreibt eine Tracking-Datei fuer jede PR, die er erstellt:

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

Nach dem Merge werden Tracking-Dateien nach `completed/` archiviert.

## Merge-Policy

Standardmaessig fuehrt der Agent genehmigte PRs **nicht** automatisch zusammen. Wenn ein Review genehmigt wird, benachrichtigt der Agent den Eigentuemer und wartet auf eine explizite Merge-Anweisung.

Um Auto-Merge zu aktivieren, fuegen Sie zu `triggerfish.yaml` hinzu:

```yaml
github:
  auto_merge: true
```

Wenn aktiviert, fuehrt der Agent `gh pr merge --squash --delete-branch` nach Erhalt eines genehmigenden Reviews aus.

::: warning Auto-Merge ist aus Sicherheitsgruenden standardmaessig deaktiviert. Aktivieren Sie es nur, wenn Sie den Aenderungen des Agenten vertrauen und Branch-Protection-Regeln (erforderliche Reviewer, CI-Checks) in GitHub konfiguriert haben. :::

## Optional: GitHub MCP-Server

Fuer reichhaltigeren GitHub-API-Zugriff ueber das hinaus, was `gh` CLI und die eingebauten Tools bieten, koennen Sie auch den GitHub MCP-Server konfigurieren:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # GitHub-Token wird aus dem Betriebssystem-Schluesselbund gelesen
    classification: CONFIDENTIAL
```

Dies ist fuer die meisten Workflows nicht erforderlich -- die eingebauten `github_*`-Tools (eingerichtet ueber `triggerfish connect github`) und `gh` CLI decken alle gaengigen Operationen ab. Der MCP-Server ist nuetzlich fuer erweiterte Abfragen, die von den eingebauten Tools nicht abgedeckt werden.

## Sicherheitsaspekte

| Kontrolle                 | Detail                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **HMAC-Verifizierung**    | Alle GitHub-Webhooks werden vor der Verarbeitung mit HMAC-SHA256 verifiziert (Webhook-Modus)                 |
| **Klassifizierung**       | GitHub-Daten werden standardmaessig als `INTERNAL` klassifiziert -- Code und PR-Daten gelangen nicht an oeffentliche Kanaele |
| **Session-Isolation**     | Jedes Webhook-Ereignis oder Trigger-Wakeup erstellt eine frische isolierte Session                           |
| **No Write-Down**         | Agenten-Antworten auf INTERNAL-klassifizierte PR-Ereignisse koennen nicht an PUBLIC-Kanaele gesendet werden  |
| **Anmeldedaten-Behandlung** | `gh` CLI verwaltet sein eigenes Auth-Token; keine GitHub-Tokens in triggerfish.yaml gespeichert            |
| **Branch-Benennung**      | `triggerfish/`-Praefix macht Agenten-Branches leicht identifizierbar und filterbar                           |

::: tip Wenn Ihr Repository sensitiven Code enthaelt (proprietaer, sicherheitskritisch), erwaegen Sie, die Webhook-Klassifizierung auf `CONFIDENTIAL` statt `INTERNAL` zu setzen. :::

## Fehlerbehebung

### Webhook empfaengt keine Ereignisse

1. Pruefen Sie, dass die Webhook-URL aus dem Internet erreichbar ist (verwenden Sie `curl` von einem externen Rechner)
2. Gehen Sie in GitHub zu **Settings** > **Webhooks** und pruefen Sie den Tab **Recent Deliveries** auf Fehler
3. Verifizieren Sie, dass das Secret zwischen GitHub und `GITHUB_WEBHOOK_SECRET` uebereinstimmt
4. Pruefen Sie Triggerfish-Logs: `triggerfish logs --tail`

### PR-Reviews werden nicht erkannt (Polling-Modus)

1. Pruefen Sie, dass der `pr-review-check`-Cron-Job in `triggerfish.yaml` konfiguriert ist
2. Verifizieren Sie, dass der Daemon laeuft: `triggerfish status`
3. Pruefen Sie, dass Tracking-Dateien in `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` existieren
4. Testen Sie manuell: `gh pr view <number> --json reviews`
5. Pruefen Sie Triggerfish-Logs: `triggerfish logs --tail`

### gh CLI nicht authentifiziert

```bash
gh auth status
# Falls nicht authentifiziert:
gh auth login
```

### Agent kann nicht zum Remote pushen

Verifizieren Sie Git-Remote und Anmeldedaten:

```bash
git remote -v
gh auth status
```

Stellen Sie sicher, dass das authentifizierte GitHub-Konto Push-Zugriff auf das Repository hat.

### Tracking-Datei waehrend Review nicht gefunden

Der Agent sucht Tracking-Dateien in `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`. Wenn die Datei fehlt, wurde die PR moeglicherweise ausserhalb von Triggerfish erstellt oder der Workspace wurde bereinigt. Der Agent sollte den Eigentuemer benachrichtigen und die automatische Behandlung ueberspringen.
