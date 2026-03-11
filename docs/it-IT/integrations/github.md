# Integrazione GitHub

Triggerfish si integra con GitHub attraverso due approcci complementari:

## Configurazione Rapida: Tool API REST

Il modo più veloce per connettere GitHub. Fornisce all'agent 14 tool integrati
per repository, PR, issue, Actions e ricerca nel codice -- tutti con
propagazione del taint consapevole della classificazione.

```bash
triggerfish connect github
```

Questo guida nella creazione di un Personal Access Token a granularità fine, lo
valida e lo archivia nel portachiavi del SO. Questo è tutto -- l'agent ora può
utilizzare tutti i tool `github_*`.

Consultare la [documentazione delle Skill](/it-IT/integrations/skills) per
approfondimenti su come funzionano le skill, o eseguire `triggerfish skills list`
per vedere tutti i tool disponibili.

## Avanzato: `gh` CLI + Webhook

Per il ciclo completo di feedback di sviluppo (l'agent crea branch, apre PR,
risponde alla code review), Triggerfish supporta anche la `gh` CLI tramite exec
e consegna delle review basata su webhook. Questo usa tre componenti
componibili:

1. **`gh` CLI tramite exec** -- eseguire tutte le azioni GitHub (creare PR,
   leggere review, commentare, fare merge)
2. **Consegna delle review** -- due modalità: **eventi webhook** (istantanei,
   richiedono endpoint pubblico) o **polling basato su trigger** tramite
   `gh pr view` (funziona dietro firewall)
3. **Skill git-branch-management** -- insegna all'agent il flusso di lavoro
   completo branch/PR/review

Insieme, questi creano un ciclo di feedback di sviluppo completo: l'agent crea
branch, effettua commit del codice, apre PR e risponde al feedback dei revisori
-- nessun codice API GitHub personalizzato richiesto.

### Prerequisiti

#### gh CLI

La GitHub CLI (`gh`) deve essere installata e autenticata nell'ambiente dove
Triggerfish viene eseguito.

```bash
# Installare gh (Fedora/RHEL)
sudo dnf install gh

# Installare gh (macOS)
brew install gh

# Installare gh (Debian/Ubuntu)
sudo apt install gh

# Autenticarsi
gh auth login
```

Verificare l'autenticazione:

```bash
gh auth status
```

L'agent usa `gh` tramite `exec.run("gh ...")` -- non è necessaria nessuna
configurazione separata del token GitHub oltre al login di `gh`.

### Git

Git deve essere installato e configurato con nome utente ed email:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Accesso al Repository

Lo spazio di lavoro dell'agent deve essere un repository git (o contenerne uno)
con accesso push al remote.

## Consegna delle Review

Ci sono due modi per l'agent di essere informato sulle nuove review delle PR.
Sceglierne uno o utilizzare entrambi insieme.

### Opzione A: Polling Basato su Trigger

Nessuna connettività in ingresso richiesta. L'agent interroga GitHub su uno
schedule usando `gh pr view`. Funziona dietro qualsiasi firewall, NAT o VPN.

Aggiungere un cron job a `triggerfish.yaml`:

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

Oppure aggiungere "check open PRs for review feedback" al TRIGGER.md dell'agent
per l'esecuzione durante il ciclo regolare di risveglio del trigger.

### Opzione B: Configurazione Webhook

I webhook consegnano gli eventi di review istantaneamente. Questo richiede che
il gateway di Triggerfish sia raggiungibile dai server GitHub (es. tramite
Tailscale Funnel, reverse proxy o tunnel).

### Passo 1: Generare un secret del webhook

```bash
openssl rand -hex 32
```

Archiviarlo come variabile d'ambiente:

```bash
export GITHUB_WEBHOOK_SECRET="<secret-generato>"
```

Aggiungerlo al profilo della shell o al gestore dei secret affinché persista
tra i riavvii.

### Passo 2: Configurare Triggerfish

Aggiungere l'endpoint webhook a `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # il secret è archiviato nel portachiavi del SO
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

### Passo 3: Esporre l'endpoint webhook

Il gateway di Triggerfish deve essere raggiungibile dai server GitHub. Opzioni:

**Tailscale Funnel (raccomandato per uso personale):**

```yaml
# In triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

Questo espone `https://<tua-macchina>.ts.net/webhook/github` a internet.

**Reverse proxy (nginx, Caddy):**

Inoltrare `/webhook/github` alla porta locale del gateway.

**ngrok (sviluppo/test):**

```bash
ngrok http 8080
```

Utilizzare l'URL generato come target del webhook.

### Passo 4: Configurare il webhook GitHub

Nel repository GitHub (o organizzazione):

1. Andare in **Settings** > **Webhooks** > **Add webhook**
2. Impostare il **Payload URL** all'endpoint esposto:
   ```
   https://<tuo-host>/webhook/github
   ```
3. Impostare **Content type** su `application/json`
4. Impostare **Secret** allo stesso valore di `GITHUB_WEBHOOK_SECRET`
5. Sotto **Which events would you like to trigger this webhook?**, selezionare
   **Let me select individual events** e spuntare:
   - **Pull requests** (copre `pull_request.opened`, `pull_request.closed`)
   - **Pull request reviews** (copre `pull_request_review`)
   - **Pull request review comments** (copre `pull_request_review_comment`)
   - **Issue comments** (copre `issue_comment` su PR e issue)
6. Cliccare **Add webhook**

GitHub invierà un evento ping per verificare la connessione. Controllare i log
di Triggerfish per confermare la ricezione:

```bash
triggerfish logs --tail
```

## Come Funziona il Ciclo di Feedback

### Con webhook (istantaneo)

<img src="/diagrams/github-webhook-review.svg" alt="Ciclo di review webhook GitHub: l'agent apre la PR, attende, riceve webhook sulla review, legge il file di tracciamento, gestisce il feedback, effettua commit e push" style="max-width: 100%;" />

### Con polling basato su trigger (dietro firewall)

<img src="/diagrams/github-trigger-review.svg" alt="Review basata su trigger GitHub: l'agent apre la PR, scrive il file di tracciamento, attende il risveglio del trigger, interroga per le review, gestisce il feedback" style="max-width: 100%;" />

Entrambi i percorsi usano gli stessi file di tracciamento. L'agent recupera il
contesto leggendo il file di tracciamento PR da
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`.

## File di Tracciamento PR

L'agent scrive un file di tracciamento per ogni PR che crea:

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<nome-branch>.json
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

Dopo il merge, i file di tracciamento vengono archiviati in `completed/`.

## Policy di Merge

Per impostazione predefinita, l'agent **non** effettua auto-merge delle PR
approvate. Quando una review viene approvata, l'agent notifica il proprietario
e attende un'istruzione esplicita di merge.

Per abilitare l'auto-merge, aggiungere a `triggerfish.yaml`:

```yaml
github:
  auto_merge: true
```

Quando abilitato, l'agent eseguirà `gh pr merge --squash --delete-branch` dopo
aver ricevuto una review con approvazione.

::: warning L'auto-merge è disabilitato per impostazione predefinita per
sicurezza. Abilitarlo solo se ci si fida delle modifiche dell'agent e si hanno
regole di protezione dei branch (revisori richiesti, controlli CI) configurate
in GitHub. :::

## Opzionale: Server MCP GitHub

Per un accesso più ricco all'API GitHub oltre a ciò che la `gh` CLI e i tool
integrati forniscono, è possibile anche configurare il server MCP GitHub:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # Il token GitHub viene letto dal portachiavi del SO
    classification: CONFIDENTIAL
```

Questo non è richiesto per la maggior parte dei flussi di lavoro -- i tool
integrati `github_*` (configurati tramite `triggerfish connect github`) e la
`gh` CLI coprono tutte le operazioni comuni. Il server MCP è utile per query
avanzate non coperte dai tool integrati.

## Considerazioni di Sicurezza

| Controllo                  | Dettaglio                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Verifica HMAC**          | Tutti i webhook GitHub sono verificati con HMAC-SHA256 prima dell'elaborazione (modalità webhook)             |
| **Classificazione**        | I dati GitHub sono classificati come `INTERNAL` per impostazione predefinita -- codice e dati PR non filtrano verso canali pubblici |
| **Isolamento della sessione** | Ogni evento webhook o risveglio del trigger genera una sessione isolata fresca                             |
| **No Write-Down**          | Le risposte dell'agent a eventi PR classificati INTERNAL non possono essere inviate a canali PUBLIC           |
| **Gestione credenziali**   | La `gh` CLI gestisce il proprio token di autenticazione; nessun token GitHub archiviato in triggerfish.yaml    |
| **Denominazione branch**   | Il prefisso `triggerfish/` rende i branch dell'agent facilmente identificabili e filtrabili                   |

::: tip Se il repository contiene codice sensibile (proprietario, critico per la
sicurezza), considerare di impostare la classificazione del webhook a
`CONFIDENTIAL` anziché `INTERNAL`. :::

## Risoluzione dei Problemi

### Il webhook non riceve eventi

1. Verificare che l'URL del webhook sia raggiungibile da internet (usare `curl`
   da una macchina esterna)
2. In GitHub, andare in **Settings** > **Webhooks** e controllare la scheda
   **Recent Deliveries** per errori
3. Verificare che il secret corrisponda tra GitHub e `GITHUB_WEBHOOK_SECRET`
4. Controllare i log di Triggerfish: `triggerfish logs --tail`

### Le review PR non vengono rilevate (modalità polling)

1. Verificare che il cron job `pr-review-check` sia configurato in
   `triggerfish.yaml`
2. Verificare che il daemon sia in esecuzione: `triggerfish status`
3. Verificare che i file di tracciamento esistano in
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
4. Testare manualmente: `gh pr view <number> --json reviews`
5. Controllare i log di Triggerfish: `triggerfish logs --tail`

### gh CLI non autenticata

```bash
gh auth status
# Se non autenticata:
gh auth login
```

### L'agent non riesce a fare push al remote

Verificare remote git e credenziali:

```bash
git remote -v
gh auth status
```

Assicurarsi che l'account GitHub autenticato abbia accesso push al repository.

### File di tracciamento non trovato durante la review

L'agent cerca i file di tracciamento in
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`. Se il file manca, la
PR potrebbe essere stata creata al di fuori di Triggerfish, o lo spazio di
lavoro è stato pulito. L'agent dovrebbe notificare il proprietario e saltare la
gestione automatizzata.
