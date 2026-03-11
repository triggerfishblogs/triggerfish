# GitHub Integration

Triggerfish integrates with GitHub through two complementary approaches:

## Quick Setup: REST API Tools

The fastest way to connect GitHub. Gives the agent 14 built-in tools for repos,
PRs, issues, Actions, and code search -- all with classification-aware taint
propagation.

```bash
triggerfish connect github
```

This walks you through creating a fine-grained Personal Access Token, validates
it, and stores it in the OS keychain. That's it -- your agent can now use all
`github_*` tools.

See the [Skills documentation](/en-GB/integrations/skills) for more on how skills
work, or run `triggerfish skills list` to see all available tools.

## Advanced: `gh` CLI + Webhooks

For the full development feedback loop (agent creates branches, opens PRs,
responds to code review), Triggerfish also supports the `gh` CLI via exec and
webhook-driven review delivery. This uses three composable pieces:

1. **`gh` CLI via exec** -- perform all GitHub actions (create PRs, read
   reviews, comment, merge)
2. **Review delivery** -- two modes: **webhook events** (instant, requires
   public endpoint) or **trigger-based polling** via `gh pr view` (works behind
   firewalls)
3. **git-branch-management skill** -- teaches the agent the complete
   branch/PR/review workflow

Together, these create a full development feedback loop: the agent creates
branches, commits code, opens PRs, and responds to reviewer feedback -- no
custom GitHub API code required.

### Prerequisites

#### gh CLI

The GitHub CLI (`gh`) must be installed and authenticated in the environment
where Triggerfish runs.

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

Verify authentication:

```bash
gh auth status
```

The agent uses `gh` via `exec.run("gh ...")` -- no separate GitHub token
configuration is needed beyond the `gh` login.

### Git

Git must be installed and configured with a user name and email:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Repository Access

The agent's workspace must be a git repository (or contain one) with push access
to the remote.

## Review Delivery

There are two ways for the agent to learn about new PR reviews. Choose one or
use both together.

### Option A: Trigger-Based Polling

No inbound connectivity required. The agent polls GitHub on a schedule using
`gh pr view`. Works behind any firewall, NAT, or VPN.

Add a cron job to `triggerfish.yaml`:

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

Or add "check open PRs for review feedback" to the agent's TRIGGER.md for
execution during the regular trigger wakeup cycle.

### Option B: Webhook Setup

Webhooks deliver review events instantly. This requires the Triggerfish gateway
to be reachable from GitHub's servers (e.g. via Tailscale Funnel, reverse proxy,
or tunnel).

### Step 1: Generate a webhook secret

```bash
openssl rand -hex 32
```

Store this as an environment variable:

```bash
export GITHUB_WEBHOOK_SECRET="<generated-secret>"
```

Add it to your shell profile or secrets manager so it persists across restarts.

### Step 2: Configure Triggerfish

Add the webhook endpoint to `triggerfish.yaml`:

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

### Step 3: Expose the webhook endpoint

Triggerfish's gateway must be reachable from GitHub's servers. Options:

**Tailscale Funnel (recommended for personal use):**

```yaml
# In triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

This exposes `https://<your-machine>.ts.net/webhook/github` to the internet.

**Reverse proxy (nginx, Caddy):**

Forward `/webhook/github` to your gateway's local port.

**ngrok (development/testing):**

```bash
ngrok http 8080
```

Use the generated URL as the webhook target.

### Step 4: Configure the GitHub webhook

In your GitHub repository (or organisation):

1. Go to **Settings** > **Webhooks** > **Add webhook**
2. Set the **Payload URL** to your exposed endpoint:
   ```
   https://<your-host>/webhook/github
   ```
3. Set **Content type** to `application/json`
4. Set **Secret** to the same value as `GITHUB_WEBHOOK_SECRET`
5. Under **Which events would you like to trigger this webhook?**, select **Let
   me select individual events** and check:
   - **Pull requests** (covers `pull_request.opened`, `pull_request.closed`)
   - **Pull request reviews** (covers `pull_request_review`)
   - **Pull request review comments** (covers `pull_request_review_comment`)
   - **Issue comments** (covers `issue_comment` on PRs and issues)
6. Click **Add webhook**

GitHub will send a ping event to verify the connection. Check Triggerfish logs
to confirm receipt:

```bash
triggerfish logs --tail
```

## How the Feedback Loop Works

### With webhooks (instant)

<img src="/diagrams/github-webhook-review.svg" alt="GitHub webhook review loop: agent opens PR, waits, receives webhook on review, reads tracking file, addresses feedback, commits and pushes" style="max-width: 100%;" />

### With trigger-based polling (behind firewall)

<img src="/diagrams/github-trigger-review.svg" alt="GitHub trigger-based review: agent opens PR, writes tracking file, waits for trigger wakeup, polls for reviews, addresses feedback" style="max-width: 100%;" />

Both paths use the same tracking files. The agent recovers context by reading
the PR tracking file from
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`.

## PR Tracking Files

The agent writes a tracking file for each PR it creates:

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

After merge, tracking files are archived to `completed/`.

## Merge Policy

By default, the agent does **not** auto-merge approved PRs. When a review is
approved, the agent notifies the owner and waits for an explicit merge
instruction.

To enable auto-merge, add to `triggerfish.yaml`:

```yaml
github:
  auto_merge: true
```

When enabled, the agent will run `gh pr merge --squash --delete-branch` after
receiving an approving review.

::: warning Auto-merge is disabled by default for safety. Only enable it if you
trust the agent's changes and have branch protection rules (required reviewers,
CI checks) configured in GitHub. :::

## Optional: GitHub MCP Server

For richer GitHub API access beyond what `gh` CLI and the built-in tools
provide, you can also configure the GitHub MCP server:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # GitHub token is read from the OS keychain
    classification: CONFIDENTIAL
```

This is not required for most workflows -- the built-in `github_*` tools (set up
via `triggerfish connect github`) and `gh` CLI cover all common operations. The
MCP server is useful for advanced queries not covered by the built-in tools.

## Security Considerations

| Control                 | Detail                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| **HMAC verification**   | All GitHub webhooks are verified with HMAC-SHA256 before processing (webhook mode)                    |
| **Classification**      | GitHub data is classified as `INTERNAL` by default -- code and PR data do not leak to public channels |
| **Session isolation**   | Each webhook event or trigger wakeup spawns a fresh isolated session                                  |
| **No Write-Down**       | Agent responses to INTERNAL-classified PR events cannot be sent to PUBLIC channels                    |
| **Credential handling** | `gh` CLI manages its own auth token; no GitHub tokens stored in triggerfish.yaml                      |
| **Branch naming**       | `triggerfish/` prefix makes agent branches easily identifiable and filterable                         |

::: tip If your repository contains sensitive code (proprietary,
security-critical), consider setting the webhook classification to
`CONFIDENTIAL` instead of `INTERNAL`. :::

## Troubleshooting

### Webhook not receiving events

1. Check that the webhook URL is reachable from the internet (use `curl` from an
   external machine)
2. In GitHub, go to **Settings** > **Webhooks** and check the **Recent
   Deliveries** tab for errors
3. Verify the secret matches between GitHub and `GITHUB_WEBHOOK_SECRET`
4. Check Triggerfish logs: `triggerfish logs --tail`

### PR reviews not being picked up (polling mode)

1. Check that the `pr-review-check` cron job is configured in `triggerfish.yaml`
2. Verify the daemon is running: `triggerfish status`
3. Check that tracking files exist in
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
4. Test manually: `gh pr view <number> --json reviews`
5. Check Triggerfish logs: `triggerfish logs --tail`

### gh CLI not authenticated

```bash
gh auth status
# If not authenticated:
gh auth login
```

### Agent cannot push to remote

Verify git remote and credentials:

```bash
git remote -v
gh auth status
```

Ensure the authenticated GitHub account has push access to the repository.

### Tracking file not found during review

The agent looks for tracking files in
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`. If the file is
missing, the PR may have been created outside Triggerfish, or the workspace was
cleaned. The agent should notify the owner and skip automated handling.
