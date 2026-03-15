# GitHub Integration

Triggerfish GitHub ಜೊತೆ ಎರಡು ಪೂರಕ ವಿಧಾನಗಳ ಮೂಲಕ integrate ಮಾಡುತ್ತದೆ:

## Quick Setup: REST API Tools

GitHub ಸಂಪರ್ಕಿಸಲು ಅತ್ಯಂತ ವೇಗದ ಮಾರ್ಗ. Repos, PRs, issues, Actions, ಮತ್ತು code
search ಗಾಗಿ 14 built-in tools -- ಎಲ್ಲ classification-aware taint propagation ಜೊತೆ.

```bash
triggerfish connect github
```

ಇದು fine-grained Personal Access Token ತಯಾರಿಸಲು walk-through ನೀಡುತ್ತದೆ, validate
ಮಾಡುತ್ತದೆ, ಮತ್ತು OS keychain ನಲ್ಲಿ store ಮಾಡುತ್ತದೆ. ಅಷ್ಟೆ -- ನಿಮ್ಮ agent ಈಗ
ಎಲ್ಲ `github_*` tools ಬಳಸಬಹುದು.

Skills ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತವೆ ಎಂದು [Skills documentation](/kn-IN/integrations/skills)
ನೋಡಿ, ಅಥವಾ ಎಲ್ಲ ಲಭ್ಯ tools ನೋಡಲು `triggerfish skills list` ಚಲಾಯಿಸಿ.

## Advanced: `gh` CLI + Webhooks

ಸಂಪೂರ್ಣ development feedback loop ಗಾಗಿ (agent branches ತಯಾರಿಸಿ, PRs ತೆರೆದು,
code review ಗೆ ಪ್ರತಿಕ್ರಿಯಿಸಿ), Triggerfish exec ಮೂಲಕ `gh` CLI ಮತ್ತು
webhook-driven review delivery ಸಹ ಬೆಂಬಲಿಸುತ್ತದೆ. ಇದು ಮೂರು composable pieces
ಬಳಸುತ್ತದೆ:

1. **`gh` CLI via exec** -- ಎಲ್ಲ GitHub actions perform ಮಾಡಿ (PRs create, reviews
   read, comment, merge)
2. **Review delivery** -- ಎರಡು modes: **webhook events** (instant, public endpoint
   ಅಗತ್ಯ) ಅಥವಾ `gh pr view` ಮೂಲಕ **trigger-based polling** (firewalls ಹಿಂದೆ ಕಾರ್ಯ
   ನಿರ್ವಹಿಸುತ್ತದೆ)
3. **git-branch-management skill** -- agent ಗೆ complete branch/PR/review workflow
   ಕಲಿಸುತ್ತದೆ

ಜೊತೆಯಾಗಿ, ಇವು ಸಂಪೂರ್ಣ development feedback loop ತಯಾರಿಸುತ್ತವೆ: agent branches
ತಯಾರಿಸಿ, code commit ಮಾಡಿ, PRs ತೆರೆದು, reviewer feedback ಗೆ ಪ್ರತಿಕ್ರಿಯಿಸುತ್ತದೆ --
custom GitHub API code ಬೇಡ.

### Prerequisites

#### gh CLI

GitHub CLI (`gh`) Triggerfish ಚಲಿಸುವ environment ನಲ್ಲಿ install ಮತ್ತು authenticate
ಮಾಡಲ್ಪಡಬೇಕು.

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

Authentication verify ಮಾಡಿ:

```bash
gh auth status
```

Agent `exec.run("gh ...")` ಮೂಲಕ `gh` ಬಳಸುತ್ತದೆ -- `gh` login ಹೊರತು separate
GitHub token configuration ಬೇಡ.

### Git

Git install ಮತ್ತು user name ಮತ್ತು email ಜೊತೆ configure ಮಾಡಲ್ಪಡಬೇಕು:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Repository Access

Agent workspace git repository ಆಗಿರಬೇಕು (ಅಥವಾ ಒಂದನ್ನು ಒಳಗೊಂಡಿರಬೇಕು) ಮತ್ತು
remote ಗೆ push access ಇರಬೇಕು.

## Review Delivery

Agent ಹೊಸ PR reviews ಬಗ್ಗೆ ತಿಳಿಯಲು ಎರಡು ಮಾರ್ಗಗಳಿವೆ. ಒಂದು ಆಯ್ಕೆ ಮಾಡಿ ಅಥವಾ
ಎರಡೂ ಒಟ್ಟಿಗೆ ಬಳಸಿ.

### Option A: Trigger-Based Polling

Inbound connectivity ಬೇಡ. Agent schedule ಮೇಲೆ `gh pr view` ಬಳಸಿ GitHub poll
ಮಾಡುತ್ತದೆ. ಯಾವುದೇ firewall, NAT, ಅಥವಾ VPN ಹಿಂದೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ.

`triggerfish.yaml` ಗೆ cron job ಸೇರಿಸಿ:

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

ಅಥವಾ agent ನ TRIGGER.md ಗೆ "check open PRs for review feedback" ಸೇರಿಸಿ regular
trigger wakeup cycle ನಲ್ಲಿ execute ಆಗಲು.

### Option B: Webhook Setup

Webhooks review events instantly deliver ಮಾಡುತ್ತವೆ. Triggerfish gateway GitHub
servers ನಿಂದ reachable ಆಗಿರಬೇಕು (ಉದಾ. Tailscale Funnel, reverse proxy, ಅಥವಾ
tunnel ಮೂಲಕ).

### Step 1: Webhook secret generate ಮಾಡಿ

```bash
openssl rand -hex 32
```

ಇದನ್ನು environment variable ಆಗಿ store ಮಾಡಿ:

```bash
export GITHUB_WEBHOOK_SECRET="<generated-secret>"
```

Restarts ನ ನ್ತರ persist ಆಗಲು shell profile ಅಥವಾ secrets manager ಗೆ ಸೇರಿಸಿ.

### Step 2: Triggerfish Configure ಮಾಡಿ

`triggerfish.yaml` ಗೆ webhook endpoint ಸೇರಿಸಿ:

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

### Step 3: Webhook endpoint expose ಮಾಡಿ

Triggerfish gateway GitHub servers ನಿಂದ reachable ಆಗಿರಬೇಕು. Options:

**Tailscale Funnel (personal use ಗಾಗಿ recommended):**

```yaml
# In triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

ಇದು `https://<your-machine>.ts.net/webhook/github` ಅನ್ನು internet ಗೆ expose ಮಾಡುತ್ತದೆ.

**Reverse proxy (nginx, Caddy):**

`/webhook/github` ಅನ್ನು gateway ನ local port ಗೆ forward ಮಾಡಿ.

**ngrok (development/testing):**

```bash
ngrok http 8080
```

Generated URL ಅನ್ನು webhook target ಆಗಿ ಬಳಸಿ.

### Step 4: GitHub webhook configure ಮಾಡಿ

ನಿಮ್ಮ GitHub repository (ಅಥವಾ organization) ನಲ್ಲಿ:

1. **Settings** > **Webhooks** > **Add webhook** ಗೆ ಹೋಗಿ
2. **Payload URL** ಅನ್ನು ನಿಮ್ಮ exposed endpoint ಗೆ set ಮಾಡಿ:
   ```
   https://<your-host>/webhook/github
   ```
3. **Content type** ಅನ್ನು `application/json` ಗೆ set ಮಾಡಿ
4. **Secret** ಅನ್ನು `GITHUB_WEBHOOK_SECRET` ನ ಅದೇ value ಗೆ set ಮಾಡಿ
5. **Which events would you like to trigger this webhook?** ಅಡಿಯಲ್ಲಿ **Let me
   select individual events** ಆಯ್ಕೆ ಮಾಡಿ ಮತ್ತು check ಮಾಡಿ:
   - **Pull requests** (`pull_request.opened`, `pull_request.closed` cover)
   - **Pull request reviews** (`pull_request_review` cover)
   - **Pull request review comments** (`pull_request_review_comment` cover)
   - **Issue comments** (PRs ಮತ್ತು issues ನಲ್ಲಿ `issue_comment` cover)
6. **Add webhook** ಕ್ಲಿಕ್ ಮಾಡಿ

GitHub connection verify ಮಾಡಲು ping event ಕಳಿಸುತ್ತದೆ. Receipt confirm ಮಾಡಲು
Triggerfish logs check ಮಾಡಿ:

```bash
triggerfish logs --tail
```

## Feedback Loop ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ

### Webhooks ಜೊತೆ (instant)

<img src="/diagrams/github-webhook-review.svg" alt="GitHub webhook review loop: agent opens PR, waits, receives webhook on review, reads tracking file, addresses feedback, commits and pushes" style="max-width: 100%;" />

### Trigger-based polling ಜೊತೆ (firewall ಹಿಂದೆ)

<img src="/diagrams/github-trigger-review.svg" alt="GitHub trigger-based review: agent opens PR, writes tracking file, waits for trigger wakeup, polls for reviews, addresses feedback" style="max-width: 100%;" />

ಎರಡೂ paths ಅದೇ tracking files ಬಳಸುತ್ತವೆ. Agent `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
ನಿಂದ PR tracking file ಓದಿ context recover ಮಾಡುತ್ತದೆ.

## PR Tracking Files

Agent ತಯಾರಿಸಿದ ಪ್ರತಿ PR ಗಾಗಿ tracking file write ಮಾಡುತ್ತದೆ:

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

Merge ನಂತರ, tracking files `completed/` ಗೆ archive ಮಾಡಲ್ಪಡುತ್ತವೆ.

## Merge Policy

Default ಆಗಿ, agent approved PRs ಸ್ವಯಂಚಾಲಿತವಾಗಿ merge ಮಾಡುವುದಿಲ್ಲ. Review approve
ಆದಾಗ, agent owner ಗೆ notify ಮಾಡಿ explicit merge instruction ಗಾಗಿ ಕಾಯುತ್ತದೆ.

Auto-merge enable ಮಾಡಲು, `triggerfish.yaml` ಗೆ ಸೇರಿಸಿ:

```yaml
github:
  auto_merge: true
```

Enable ಮಾಡಿದಾಗ, approving review ಸ್ವೀಕರಿಸಿದ ನಂತರ agent `gh pr merge --squash --delete-branch`
ಚಲಾಯಿಸುತ್ತದೆ.

::: warning Auto-merge safety ಗಾಗಿ default ಆಗಿ disabled. Agent ನ changes trust
ಮಾಡುತ್ತೀರಿ ಮತ್ತು GitHub ನಲ್ಲಿ branch protection rules (required reviewers, CI
checks) configure ಮಾಡಿದ್ದೀರಿ ಎಂದಾಗ ಮಾತ್ರ enable ಮಾಡಿ. :::

## Optional: GitHub MCP Server

`gh` CLI ಮತ್ತು built-in tools ಒದಗಿಸುವುದಕ್ಕಿಂತ ಹೆಚ್ಚಿನ GitHub API access ಗಾಗಿ,
GitHub MCP server ಸಹ configure ಮಾಡಬಹುದು:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # GitHub token is read from the OS keychain
    classification: CONFIDENTIAL
```

ಹೆಚ್ಚಿನ workflows ಗಾಗಿ ಇದು ಅಗತ್ಯವಿಲ್ಲ -- built-in `github_*` tools (`triggerfish connect github`
ಮೂಲಕ setup) ಮತ್ತು `gh` CLI ಎಲ್ಲ ಸಾಮಾನ್ಯ operations cover ಮಾಡುತ್ತವೆ. Built-in
tools cover ಮಾಡದ advanced queries ಗಾಗಿ MCP server ಉಪಯುಕ್ತ.

## Security Considerations

| Control                 | Detail                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| **HMAC verification**   | ಎಲ್ಲ GitHub webhooks processing ಮೊದಲು HMAC-SHA256 ಜೊತೆ verify (webhook mode)                            |
| **Classification**      | GitHub data default ಆಗಿ `INTERNAL` -- code ಮತ್ತು PR data public channels ಗೆ leak ಆಗುವುದಿಲ್ಲ           |
| **Session isolation**   | ಪ್ರತಿ webhook event ಅಥವಾ trigger wakeup fresh isolated session spawn ಮಾಡುತ್ತದೆ                          |
| **No Write-Down**       | INTERNAL-classified PR events ಗೆ agent responses PUBLIC channels ಗೆ ಕಳಿಸಲಾಗದು                          |
| **Credential handling** | `gh` CLI ತನ್ನ auth token manage ಮಾಡುತ್ತದೆ; triggerfish.yaml ನಲ್ಲಿ GitHub tokens store ಮಾಡಲ್ಪಡುವುದಿಲ್ಲ |
| **Branch naming**       | `triggerfish/` prefix agent branches ಸುಲಭವಾಗಿ identify ಮತ್ತು filter ಮಾಡಲು ಸಾಧ್ಯ                       |

::: tip ನಿಮ್ಮ repository ಸೂಕ್ಷ್ಮ code ಒಳಗೊಂಡಿದ್ದರೆ (proprietary, security-critical),
webhook classification `INTERNAL` ಬದಲಾಗಿ `CONFIDENTIAL` ಗೆ set ಮಾಡಲು ಪರಿಗಣಿಸಿ. :::

## Troubleshooting

### Webhook events receive ಆಗುತ್ತಿಲ್ಲ

1. Webhook URL external machine ನಿಂದ reachable ಎಂದು check ಮಾಡಿ (`curl` ಬಳಸಿ)
2. GitHub ನಲ್ಲಿ **Settings** > **Webhooks** > **Recent Deliveries** tab errors ಪರಿಶೀಲಿಸಿ
3. Secret GitHub ಮತ್ತು `GITHUB_WEBHOOK_SECRET` ನಡುವೆ match ಆಗುತ್ತಿದೆಯೇ verify ಮಾಡಿ
4. Triggerfish logs check ಮಾಡಿ: `triggerfish logs --tail`

### PR reviews pick up ಆಗುತ್ತಿಲ್ಲ (polling mode)

1. `pr-review-check` cron job `triggerfish.yaml` ನಲ್ಲಿ configure ಮಾಡಿದ್ದೀರಾ check ಮಾಡಿ
2. Daemon running ಎಂದು verify ಮಾಡಿ: `triggerfish status`
3. Tracking files `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` ನಲ್ಲಿ
   exist ಆಗುತ್ತಿವೆಯೇ check ಮಾಡಿ
4. Manual test: `gh pr view <number> --json reviews`
5. Triggerfish logs check ಮಾಡಿ: `triggerfish logs --tail`

### gh CLI authenticate ಆಗಿಲ್ಲ

```bash
gh auth status
# Authenticate ಮಾಡಿಲ್ಲದಿದ್ದರೆ:
gh auth login
```

### Agent remote ಗೆ push ಮಾಡಲಾಗುತ್ತಿಲ್ಲ

Git remote ಮತ್ತು credentials verify ಮಾಡಿ:

```bash
git remote -v
gh auth status
```

Authenticated GitHub account ಗೆ repository ಗೆ push access ಇದೆಯೇ ಖಾತರಿ ಮಾಡಿ.

### Review ಸಮಯದಲ್ಲಿ tracking file ಸಿಗುತ್ತಿಲ್ಲ

Agent `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` ನಲ್ಲಿ tracking
files ಹುಡುಕುತ್ತದೆ. File missing ಆಗಿದ್ದರೆ, PR Triggerfish ಹೊರಗಡೆ create ಮಾಡಿರಬಹುದು,
ಅಥವಾ workspace clean ಮಾಡಲ್ಪಟ್ಟಿರಬಹುದು. Agent owner ಗೆ notify ಮಾಡಿ automated
handling skip ಮಾಡಬೇಕು.
