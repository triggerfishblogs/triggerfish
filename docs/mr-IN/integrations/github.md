# GitHub Integration

Triggerfish GitHub शी दोन complementary approaches द्वारे integrate होतो:

## Quick Setup: REST API Tools

GitHub connect करण्याचा fastest way. Repos, PRs, issues, Actions, आणि code
search साठी एजंटला 14 built-in tools देतो -- सर्व classification-aware taint
propagation सह.

```bash
triggerfish connect github
```

हे fine-grained Personal Access Token create करण्यात walk through करतो, validate
करतो, आणि OS keychain मध्ये store करतो. बस इतकेच -- तुमचा एजंट आता सर्व
`github_*` tools वापरू शकतो.

Skills कसे काम करतात यावर अधिकसाठी [Skills documentation](/mr-IN/integrations/skills)
पहा, किंवा सर्व available tools पाहण्यासाठी `triggerfish skills list` run करा.

## Advanced: `gh` CLI + Webhooks

Full development feedback loop साठी (एजंट branches create करतो, PRs उघडतो, code
review ला respond करतो), Triggerfish exec द्वारे `gh` CLI आणि webhook-driven
review delivery देखील support करतो. हे तीन composable pieces वापरते:

1. **`gh` CLI via exec** -- सर्व GitHub actions perform करा (PRs create करा,
   reviews वाचा, comment करा, merge करा)
2. **Review delivery** -- दोन modes: **webhook events** (instant, public endpoint
   आवश्यक) किंवा `gh pr view` द्वारे **trigger-based polling** (firewalls मागे
   काम करतो)
3. **git-branch-management skill** -- एजंटला complete branch/PR/review workflow
   शिकवतो

एकत्र, हे full development feedback loop create करतात: एजंट branches create
करतो, code commit करतो, PRs उघडतो, आणि reviewer feedback ला respond करतो --
custom GitHub API code आवश्यक नाही.

### Prerequisites

#### gh CLI

Triggerfish run होत असलेल्या environment मध्ये GitHub CLI (`gh`) install आणि
authenticated असणे आवश्यक आहे.

```bash
# gh install करा (Fedora/RHEL)
sudo dnf install gh

# gh install करा (macOS)
brew install gh

# gh install करा (Debian/Ubuntu)
sudo apt install gh

# Authenticate करा
gh auth login
```

Authentication verify करा:

```bash
gh auth status
```

एजंट `exec.run("gh ...")` द्वारे `gh` वापरतो -- `gh` login च्या पलीकडे separate
GitHub token configuration आवश्यक नाही.

### Git

Git install आणि user name आणि email सह configured असणे आवश्यक आहे:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Repository Access

एजंटचे workspace remote ला push access सह git repository (किंवा एक contain
करणारे) असणे आवश्यक आहे.

## Review Delivery

एजंटला नवीन PR reviews बद्दल जाणून घेण्याचे दोन मार्ग आहेत. एक निवडा किंवा
दोन्ही एकत्र वापरा.

### Option A: Trigger-Based Polling

Inbound connectivity आवश्यक नाही. एजंट schedule वर `gh pr view` वापरून GitHub
poll करतो. कोणत्याही firewall, NAT, किंवा VPN मागे काम करतो.

`triggerfish.yaml` मध्ये cron job जोडा:

```yaml
scheduler:
  cron:
    jobs:
      - id: pr-review-check
        schedule: "*/15 * * * *"
        task: >
          scratch/pr-tracking/ मधील सर्व open PR tracking files check करा.
          प्रत्येक open PR साठी, gh pr view वापरून GitHub ला नवीन reviews किंवा
          state changes साठी query करा. Review feedback address करा,
          merges आणि closures handle करा.
        classification: INTERNAL
```

किंवा regular trigger wakeup cycle दरम्यान execution साठी एजंटच्या TRIGGER.md
मध्ये "open PRs review feedback साठी check करा" जोडा.

### Option B: Webhook Setup

Webhooks review events instantly deliver करतात. यासाठी Triggerfish gateway
GitHub च्या servers कडून reachable असणे आवश्यक आहे (उदा. Tailscale Funnel,
reverse proxy, किंवा tunnel द्वारे).

### पायरी 1: Webhook secret generate करा

```bash
openssl rand -hex 32
```

Environment variable म्हणून store करा:

```bash
export GITHUB_WEBHOOK_SECRET="<generated-secret>"
```

Restarts मध्ये persist होण्यासाठी तुमच्या shell profile किंवा secrets manager ला
जोडा.

### पायरी 2: Triggerfish कॉन्फिगर करा

`triggerfish.yaml` मध्ये webhook endpoint जोडा:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret OS keychain मध्ये stored
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: >
            PR review submitted झाले. Context recover करण्यासाठी
            scratch/pr-tracking/ मधून PR tracking file वाचा. Branch check
            out करा, review वाचा, requested changes address करा, commit
            करा, push करा, आणि केलेल्या changes च्या summary सह PR वर
            comment करा.
        - event: "pull_request_review_comment"
          task: >
            PR वर inline review comment posted झाले. PR tracking file
            वाचा, branch check out करा, specific comment address करा,
            commit करा, push करा.
        - event: "issue_comment"
          task: >
            PR किंवा issue वर comment posted झाले. scratch/pr-tracking/
            मधील tracking files lookup करून हा tracked PR आहे का check करा.
            Tracked असल्यास, branch check out करा आणि feedback address करा.
        - event: "pull_request.closed"
          task: >
            PR closed किंवा merged झाले. Tracking file वाचा. Merged असल्यास,
            clean up करा: local branch delete करा, tracking file
            completed/ ला archive करा. Owner ला merge बद्दल notify करा.
            Merge शिवाय closed असल्यास, archive करा आणि notify करा.
```

### पायरी 3: Webhook endpoint expose करा

Triggerfish चे gateway GitHub च्या servers कडून reachable असणे आवश्यक आहे. Options:

**Tailscale Funnel (personal use साठी recommended):**

```yaml
# triggerfish.yaml मध्ये
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

हे `https://<your-machine>.ts.net/webhook/github` internet ला expose करते.

**Reverse proxy (nginx, Caddy):**

`/webhook/github` तुमच्या gateway च्या local port ला forward करा.

**ngrok (development/testing):**

```bash
ngrok http 8080
```

Generated URL webhook target म्हणून वापरा.

### पायरी 4: GitHub webhook कॉन्फिगर करा

तुमच्या GitHub repository (किंवा organization) मध्ये:

1. **Settings** > **Webhooks** > **Add webhook** ला जा
2. **Payload URL** तुमच्या exposed endpoint ला set करा:
   ```
   https://<your-host>/webhook/github
   ```
3. **Content type** `application/json` ला set करा
4. **Secret** `GITHUB_WEBHOOK_SECRET` प्रमाणेच value ला set करा
5. **Which events would you like to trigger this webhook?** खाली, **Let me select
   individual events** निवडा आणि check करा:
   - **Pull requests** (`pull_request.opened`, `pull_request.closed` cover करतो)
   - **Pull request reviews** (`pull_request_review` cover करतो)
   - **Pull request review comments** (`pull_request_review_comment` cover करतो)
   - **Issue comments** (PRs आणि issues वर `issue_comment` cover करतो)
6. **Add webhook** क्लिक करा

GitHub connection verify करण्यासाठी ping event पाठवेल. Receipt confirm करण्यासाठी
Triggerfish logs check करा:

```bash
triggerfish logs --tail
```

## Feedback Loop कसे काम करते

### Webhooks सह (instant)

<img src="/diagrams/github-webhook-review.svg" alt="GitHub webhook review loop: agent opens PR, waits, receives webhook on review, reads tracking file, addresses feedback, commits and pushes" style="max-width: 100%;" />

### Trigger-based polling सह (firewall मागे)

<img src="/diagrams/github-trigger-review.svg" alt="GitHub trigger-based review: agent opens PR, writes tracking file, waits for trigger wakeup, polls for reviews, addresses feedback" style="max-width: 100%;" />

दोन्ही paths समान tracking files वापरतात. एजंट
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` मधील PR tracking file
वाचून context recover करतो.

## PR Tracking Files

एजंट create केलेल्या प्रत्येक PR साठी tracking file लिहितो:

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

Merge नंतर, tracking files `completed/` ला archived केल्या जातात.

## Merge Policy

Default वर, एजंट approved PRs **auto-merge** करत नाही. Review approved होतो
तेव्हा, एजंट owner ला notify करतो आणि explicit merge instruction साठी wait
करतो.

Auto-merge enable करण्यासाठी, `triggerfish.yaml` मध्ये जोडा:

```yaml
github:
  auto_merge: true
```

Enabled असताना, एजंट approving review receive केल्यावर
`gh pr merge --squash --delete-branch` run करेल.

::: warning Auto-merge safety साठी default वर disabled आहे. फक्त तेव्हाच enable
करा जेव्हा तुम्ही एजंटच्या changes वर trust करता आणि GitHub मध्ये branch
protection rules (required reviewers, CI checks) configured आहेत. :::

## Optional: GitHub MCP Server

`gh` CLI आणि built-in tools च्या पलीकडे richer GitHub API access साठी, तुम्ही
GitHub MCP server देखील configure करू शकता:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # GitHub token OS keychain मधून read केला जातो
    classification: CONFIDENTIAL
```

बहुतेक workflows साठी हे आवश्यक नाही -- built-in `github_*` tools
(`triggerfish connect github` द्वारे set up) आणि `gh` CLI सर्व common operations
cover करतात. MCP server built-in tools द्वारे covered नसलेल्या advanced queries
साठी उपयुक्त आहे.

## Security Considerations

| Control                 | Detail                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **HMAC verification**   | Processing पूर्वी सर्व GitHub webhooks HMAC-SHA256 सह verified (webhook mode)                                  |
| **Classification**      | GitHub data default वर `INTERNAL` म्हणून classified -- code आणि PR data public channels ला leak होत नाही     |
| **Session isolation**   | प्रत्येक webhook event किंवा trigger wakeup fresh isolated session spawn करतो                                   |
| **No Write-Down**       | INTERNAL-classified PR events ला agent responses PUBLIC channels ला पाठवले जाऊ शकत नाहीत                      |
| **Credential handling** | `gh` CLI स्वतःचा auth token manage करतो; triggerfish.yaml मध्ये GitHub tokens stored नाहीत                    |
| **Branch naming**       | `triggerfish/` prefix एजंट branches easily identifiable आणि filterable बनवतो                                  |

::: tip तुमच्या repository मध्ये sensitive code असल्यास (proprietary,
security-critical), webhook classification `INTERNAL` ऐवजी `CONFIDENTIAL` वर set
करणे consider करा. :::

## Troubleshooting

### Webhook events receive होत नाहीत

1. Webhook URL internet वरून reachable आहे का check करा (external machine वरून
   `curl` वापरा)
2. GitHub मध्ये, **Settings** > **Webhooks** ला जा आणि errors साठी **Recent
   Deliveries** tab check करा
3. GitHub आणि `GITHUB_WEBHOOK_SECRET` दरम्यान secret match आहे का verify करा
4. Triggerfish logs check करा: `triggerfish logs --tail`

### PR reviews picked up होत नाहीत (polling mode)

1. `pr-review-check` cron job `triggerfish.yaml` मध्ये configured आहे का check करा
2. Daemon running आहे का verify करा: `triggerfish status`
3. `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` मध्ये tracking files
   exist आहेत का check करा
4. Manually test करा: `gh pr view <number> --json reviews`
5. Triggerfish logs check करा: `triggerfish logs --tail`

### gh CLI authenticated नाही

```bash
gh auth status
# Authenticated नसल्यास:
gh auth login
```

### एजंट remote ला push करू शकत नाही

Git remote आणि credentials verify करा:

```bash
git remote -v
gh auth status
```

Authenticated GitHub account ला repository ला push access आहे ते सुनिश्चित करा.

### Review दरम्यान Tracking file सापडत नाही

एजंट `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` मध्ये tracking
files शोधतो. File missing असल्यास, PR Triggerfish च्या बाहेर created असेल,
किंवा workspace cleaned असेल. एजंटने owner ला notify करावे आणि automated handling
skip करावे.
