# GitHub Integration

Triggerfish GitHub کے ساتھ دو complementary approaches کے ذریعے integrate ہوتا ہے:

## Quick Setup: REST API Tools

GitHub جوڑنے کا سب سے تیز طریقہ۔ ایجنٹ کو repos، PRs، issues، Actions، اور code
search کے لیے 14 built-in tools دیتا ہے — سب classification-aware taint propagation
کے ساتھ۔

```bash
triggerfish connect github
```

یہ آپ کو fine-grained Personal Access Token بنانے میں رہنمائی کرتا ہے، اسے validate
کرتا ہے، اور OS keychain میں محفوظ کرتا ہے۔ بس — آپ کا ایجنٹ اب تمام `github_*`
tools استعمال کر سکتا ہے۔

## Advanced: `gh` CLI + Webhooks

مکمل development feedback loop کے لیے (ایجنٹ branches بناتا ہے، PRs کھولتا ہے، code
review کا جواب دیتا ہے)، Triggerfish exec کے ذریعے `gh` CLI اور webhook-driven review
delivery بھی support کرتا ہے۔ یہ تین composable pieces استعمال کرتا ہے:

1. **exec کے ذریعے `gh` CLI** — تمام GitHub actions (PRs بنانا، reviews پڑھنا،
   comment کرنا، merge کرنا)
2. **Review delivery** — دو modes: **webhook events** (instant، public endpoint
   درکار) یا **trigger-based polling** بذریعہ `gh pr view` (firewalls کے پیچھے کام
   کرتا ہے)
3. **git-branch-management skill** — ایجنٹ کو مکمل branch/PR/review workflow سکھاتا ہے

مل کر، یہ ایک مکمل development feedback loop بناتے ہیں: ایجنٹ branches بناتا ہے، کوڈ
commit کرتا ہے، PRs کھولتا ہے، اور reviewer feedback کا جواب دیتا ہے — کوئی custom
GitHub API code ضروری نہیں۔

### Prerequisites

#### gh CLI

GitHub CLI (`gh`) اس environment میں install اور authenticated ہونی چاہیے جہاں
Triggerfish چلتا ہے۔

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

Authentication verify کریں:

```bash
gh auth status
```

ایجنٹ `exec.run("gh ...")` کے ذریعے `gh` استعمال کرتا ہے — `gh` login سے پرے کوئی
الگ GitHub token configuration ضروری نہیں۔

### Git

Git install اور user name اور email کے ساتھ configured ہونا چاہیے:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

## Review Delivery

ایجنٹ کے نئے PR reviews کے بارے میں جاننے کے دو طریقے ہیں۔ ایک منتخب کریں یا دونوں
مل کر استعمال کریں۔

### Option A: Trigger-Based Polling

کوئی inbound connectivity ضروری نہیں۔ ایجنٹ schedule پر `gh pr view` کا استعمال کرتے
ہوئے GitHub poll کرتا ہے۔ کسی بھی firewall، NAT، یا VPN کے پیچھے کام کرتا ہے۔

`triggerfish.yaml` میں cron job شامل کریں:

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

یا ایجنٹ کے TRIGGER.md میں "check open PRs for review feedback" شامل کریں۔

### Option B: Webhook Setup

Webhooks review events فوری deliver کرتے ہیں۔ اس کے لیے Triggerfish gateway کو
GitHub کے servers سے قابل رسائی ہونا ضروری ہے۔

### قدم 1: Webhook secret بنائیں

```bash
openssl rand -hex 32
```

### قدم 2: Triggerfish Configure کریں

`triggerfish.yaml` میں webhook endpoint شامل کریں:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret OS keychain میں محفوظ
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

### قدم 3: GitHub Webhook Configure کریں

آپ کے GitHub repository میں:

1. **Settings** > **Webhooks** > **Add webhook** پر جائیں
2. **Payload URL** اپنے exposed endpoint پر set کریں
3. **Content type** کو `application/json` پر set کریں
4. **Secret** کو `GITHUB_WEBHOOK_SECRET` کے برابر set کریں
5. Events منتخب کریں: Pull requests، Pull request reviews، Pull request review comments،
   Issue comments
6. **Add webhook** کلک کریں

## PR Tracking Files

ایجنٹ ہر PR کے لیے جو یہ بناتا ہے ایک tracking file لکھتا ہے:

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<branch-name>.json
```

Merge کے بعد، tracking files `completed/` میں archive ہو جاتی ہیں۔

## Merge Policy

ڈیفالٹ طور پر، ایجنٹ approved PRs auto-merge **نہیں** کرتا۔ Auto-merge فعال کرنے
کے لیے:

```yaml
github:
  auto_merge: true
```

::: warning Auto-merge سیکیورٹی کے لیے ڈیفالٹ disabled ہے۔ صرف اسے فعال کریں اگر آپ
ایجنٹ کی تبدیلیوں پر اعتماد کرتے ہیں اور GitHub میں branch protection rules configure
ہیں۔ :::

## Security Considerations

| Control               | تفصیل                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **HMAC verification** | تمام GitHub webhooks processing سے پہلے HMAC-SHA256 سے verified                               |
| **Classification**    | GitHub data ڈیفالٹ `INTERNAL` classified — code اور PR data public channels تک leak نہیں ہوتا |
| **Session isolation** | ہر webhook event یا trigger wakeup تازہ isolated session spawn کرتا ہے                         |
| **No Write-Down**     | INTERNAL-classified PR events کے ایجنٹ responses PUBLIC channels کو نہیں بھیجے جا سکتے       |
| **Branch naming**     | `triggerfish/` prefix agent branches کو easily identifiable اور filterable بناتا ہے           |

## Troubleshooting

### Webhook events receive نہیں ہو رہے

1. Verify کریں کہ webhook URL internet سے قابل رسائی ہے
2. GitHub میں، **Settings** > **Webhooks** پر جائیں اور errors کے لیے **Recent Deliveries**
   tab چیک کریں
3. Verify کریں کہ secret GitHub اور `GITHUB_WEBHOOK_SECRET` کے درمیان match کرتا ہے
4. Triggerfish logs چیک کریں: `triggerfish logs --tail`

### PR reviews pick up نہیں ہو رہے (polling mode)

1. Check کریں کہ `pr-review-check` cron job `triggerfish.yaml` میں configured ہے
2. Daemon چل رہا ہے verify کریں: `triggerfish status`
3. Test manually: `gh pr view <number> --json reviews`

### gh CLI authenticated نہیں

```bash
gh auth status
# اگر authenticated نہیں:
gh auth login
```
