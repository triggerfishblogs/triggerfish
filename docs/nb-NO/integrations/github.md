# GitHub-integrasjon

Triggerfish integreres med GitHub gjennom to komplementære tilnærminger:

## Hurtigoppsett: REST API-verktøy

Den raskeste måten å koble til GitHub. Gir agenten 14 innebygde verktøy for repoer, PR-er, problemer, Actions og kodesøk — alt med klassifiseringsbevisst taint-forplantning.

```bash
triggerfish connect github
```

Dette veileder deg gjennom å opprette et finkornig Personal Access Token, validerer det og lagrer det i OS-nøkkelringen. Det er alt — agenten din kan nå bruke alle `github_*`-verktøy.

## Avansert: `gh` CLI + webhooks

For den fullstendige utviklingstilbakemeldingsloopen (agent oppretter grener, åpner PR-er, svarer på kodegjennomgang), støtter Triggerfish også `gh` CLI via exec og webhook-drevet gjennomgangslevering. Dette bruker tre sammensettbare deler:

1. **`gh` CLI via exec** — utfør alle GitHub-handlinger (opprett PR-er, les gjennomganger, kommenter, slå sammen)
2. **Gjennomgangslevering** — to modi: **webhook-hendelser** (øyeblikkelig, krever offentlig endepunkt) eller **trigger-basert polling** via `gh pr view` (fungerer bak brannmurer)
3. **git-branch-management-ferdighet** — lærer agenten den fullstendige gren/PR/gjennomgangs-arbeidsflyten

Samlet skaper disse en fullstendig utviklingstilbakemeldingsloop: agenten oppretter grener, committer kode, åpner PR-er og svarer på anmelderens tilbakemelding — ingen egendefinert GitHub API-kode nødvendig.

### Forutsetninger

#### gh CLI

GitHub CLI (`gh`) må være installert og autentisert i miljøet der Triggerfish kjøres.

```bash
# Installer gh (Fedora/RHEL)
sudo dnf install gh

# Installer gh (macOS)
brew install gh

# Installer gh (Debian/Ubuntu)
sudo apt install gh

# Autentiser
gh auth login
```

Verifiser autentisering:

```bash
gh auth status
```

### Git

Git må være installert og konfigurert med brukernavn og e-post:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

## Gjennomgangslevering

Det er to måter agenten kan lære om nye PR-gjennomganger. Velg én eller bruk begge sammen.

### Alternativ A: Trigger-basert polling

Ingen innkommende tilkobling nødvendig. Agenten poller GitHub etter en plan ved hjelp av `gh pr view`. Fungerer bak enhver brannmur, NAT eller VPN.

Legg til en cron-jobb i `triggerfish.yaml`:

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

### Alternativ B: Webhook-oppsett

Webhooks leverer gjennomgangshendelser øyeblikkelig. Dette krever at Triggerfish-gatewayen er nåbar fra GitHubs servere (f.eks. via Tailscale Funnel, omvendt proxy eller tunnel).

#### Trinn 1: Generer en webhook-hemmelighet

```bash
openssl rand -hex 32
```

#### Trinn 2: Konfigurer Triggerfish

Legg til webhook-endepunktet i `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # hemmelighet lagret i OS-nøkkelringen
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
        - event: "pull_request.closed"
          task: >
            A PR was closed or merged. Read the tracking file. If merged,
            clean up: delete local branch, archive tracking file to
            completed/. Notify the owner of the merge.
```

#### Trinn 3: Eksponer webhook-endepunktet

**Tailscale Funnel (anbefalt for personlig bruk):**

```yaml
# I triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

#### Trinn 4: Konfigurer GitHub-webhook

I GitHub-repoet ditt:

1. Gå til **Settings** > **Webhooks** > **Add webhook**
2. Angi **Payload URL** til det eksponerte endepunktet
3. Angi **Content type** til `application/json`
4. Angi **Secret** til webhook-hemmeligheten
5. Velg individuelle hendelser: **Pull requests**, **Pull request reviews**, **Pull request review comments**, **Issue comments**
6. Klikk **Add webhook**

## PR-sporingssfiler

Agenten skriver en sporingsfil for hver PR den oppretter:

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<gren-navn>.json
```

Skjema:

```json
{
  "branch": "triggerfish/agent-1/fix-auth-timeout",
  "prNumber": 42,
  "prUrl": "https://github.com/eier/repo/pull/42",
  "task": "Fix authentication timeout when token expires during long requests",
  "repository": "eier/repo",
  "createdAt": "2025-01-15T10:30:00Z",
  "status": "open"
}
```

## Flettepolicy

Som standard slår ikke agenten automatisk sammen godkjente PR-er. For å aktivere auto-sammenslåing:

```yaml
github:
  auto_merge: true
```

::: warning Auto-sammenslåing er deaktivert som standard av sikkerhetshensyn. Aktiver bare hvis du stoler på agentens endringer og har grenvernsregler konfigurert i GitHub. :::

## Sikkerhetshensyn

| Kontroll                  | Detalj                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **HMAC-verifisering**     | Alle GitHub-webhooks verifiseres med HMAC-SHA256 før behandling (webhook-modus)                             |
| **Klassifisering**        | GitHub-data klassifiseres som `INTERNAL` som standard                                                       |
| **Sesjonsisolasjon**      | Hver webhook-hendelse eller trigger-oppvåkning spawner en frisk isolert sesjon                              |
| **No-Write-Down**         | Agentsvar på INTERNAL-klassifiserte PR-hendelser kan ikke sendes til PUBLIC-kanaler                         |
| **Legitimasjonshåndtering** | `gh` CLI administrerer sin egen autentiseringstoken; ingen GitHub-tokener lagres i triggerfish.yaml       |

## Feilsøking

### Webhook mottar ikke hendelser

1. Sjekk at webhook-URL-en er nåbar fra internett
2. I GitHub, gå til **Settings** > **Webhooks** og sjekk **Recent Deliveries** for feil
3. Verifiser at hemmeligheten samsvarer
4. Sjekk Triggerfish-logger: `triggerfish logs --tail`

### PR-gjennomganger plukkes ikke opp (pollingsmodus)

1. Sjekk at `pr-review-check` cron-jobben er konfigurert
2. Verifiser at daemonen kjører: `triggerfish status`
3. Sjekk at sporingssfiler finnes i `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
4. Test manuelt: `gh pr view <nummer> --json reviews`
