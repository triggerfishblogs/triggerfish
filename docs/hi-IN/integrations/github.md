# GitHub Integration

Triggerfish दो पूरक दृष्टिकोणों के माध्यम से GitHub के साथ एकीकृत होता है:

## त्वरित सेटअप: REST API Tools

GitHub कनेक्ट करने का सबसे तेज़ तरीका। Agent को repos, PRs, issues, Actions, और
code search के लिए 14 अंतर्निहित tools देता है -- सभी classification-aware taint
propagation के साथ।

```bash
triggerfish connect github
```

यह आपको fine-grained Personal Access Token बनाने, इसे validate करने, और OS
keychain में संग्रहीत करने के माध्यम से मार्गदर्शन करता है। बस इतना -- आपका
agent अब सभी `github_*` tools उपयोग कर सकता है।

Skills कैसे काम करती हैं इसके बारे में अधिक जानने के लिए [Skills दस्तावेज़](/hi-IN/integrations/skills)
देखें, या सभी उपलब्ध tools देखने के लिए `triggerfish skills list` चलाएँ।

## उन्नत: `gh` CLI + Webhooks

पूर्ण development feedback loop (agent branches बनाता है, PRs खोलता है, code
review पर प्रतिक्रिया करता है) के लिए, Triggerfish exec के माध्यम से `gh` CLI और
webhook-driven review delivery का भी समर्थन करता है। यह तीन composable टुकड़ों का
उपयोग करता है:

1. **exec के माध्यम से `gh` CLI** -- सभी GitHub actions करें (PRs बनाएँ, reviews
   पढ़ें, comment करें, merge करें)
2. **Review delivery** -- दो modes: **webhook events** (तत्काल, public endpoint
   आवश्यक) या **trigger-based polling** `gh pr view` के माध्यम से (firewalls के
   पीछे काम करता है)
3. **git-branch-management skill** -- agent को पूर्ण branch/PR/review workflow
   सिखाती है

मिलकर, ये एक पूर्ण development feedback loop बनाते हैं: agent branches बनाता है,
code commit करता है, PRs खोलता है, और reviewer feedback पर प्रतिक्रिया करता है --
कोई कस्टम GitHub API code आवश्यक नहीं।

### पूर्वापेक्षाएँ

#### gh CLI

GitHub CLI (`gh`) Triggerfish जहाँ चलता है उस environment में installed और
authenticated होनी चाहिए।

```bash
# gh install करें (Fedora/RHEL)
sudo dnf install gh

# gh install करें (macOS)
brew install gh

# gh install करें (Debian/Ubuntu)
sudo apt install gh

# Authenticate करें
gh auth login
```

Authentication सत्यापित करें:

```bash
gh auth status
```

Agent `gh` को `exec.run("gh ...")` के माध्यम से उपयोग करता है -- `gh` login के
अलावा कोई अलग GitHub token कॉन्फ़िगरेशन आवश्यक नहीं।

### Git

Git installed और user name और email के साथ configured होना चाहिए:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Repository Access

Agent का workspace एक git repository (या contain करता हुआ) होना चाहिए जिसमें
remote पर push access हो।

## Review Delivery

Agent के लिए नई PR reviews के बारे में जानने के दो तरीके हैं। एक चुनें या दोनों
एक साथ उपयोग करें।

### विकल्प A: Trigger-Based Polling

कोई inbound connectivity आवश्यक नहीं। Agent `gh pr view` का उपयोग करके schedule
पर GitHub poll करता है। किसी भी firewall, NAT, या VPN के पीछे काम करता है।

`triggerfish.yaml` में cron job जोड़ें:

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

या नियमित trigger wakeup cycle के दौरान निष्पादन के लिए agent के TRIGGER.md में
"check open PRs for review feedback" जोड़ें।

### विकल्प B: Webhook सेटअप

Webhooks review events तुरंत डिलीवर करते हैं। इसके लिए Triggerfish gateway
GitHub के servers से पहुँच योग्य होना आवश्यक है (जैसे Tailscale Funnel, reverse
proxy, या tunnel के माध्यम से)।

### चरण 1: Webhook secret उत्पन्न करें

```bash
openssl rand -hex 32
```

इसे environment variable के रूप में संग्रहीत करें:

```bash
export GITHUB_WEBHOOK_SECRET="<generated-secret>"
```

### चरण 2: Triggerfish कॉन्फ़िगर करें

`triggerfish.yaml` में webhook endpoint जोड़ें:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret OS keychain में संग्रहीत
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

### चरण 3: Webhook endpoint expose करें

Triggerfish का gateway GitHub के servers से पहुँच योग्य होना चाहिए। विकल्प:

**Tailscale Funnel (व्यक्तिगत उपयोग के लिए अनुशंसित):**

```yaml
# triggerfish.yaml में
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

### चरण 4: GitHub webhook कॉन्फ़िगर करें

अपने GitHub repository (या organization) में:

1. **Settings** > **Webhooks** > **Add webhook** पर जाएँ
2. **Payload URL** अपने exposed endpoint पर सेट करें
3. **Content type** को `application/json` सेट करें
4. **Secret** को `GITHUB_WEBHOOK_SECRET` के समान मान पर सेट करें
5. Events चुनें: **Pull requests**, **Pull request reviews**, **Pull request
   review comments**, **Issue comments**
6. **Add webhook** क्लिक करें

## PR Tracking Files

Agent प्रत्येक बनाई गई PR के लिए tracking file लिखता है:

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<branch-name>.json
```

Merge के बाद, tracking files `completed/` में archived होती हैं।

## Merge Policy

डिफ़ॉल्ट रूप से, agent approved PRs को auto-merge **नहीं** करता। जब review
approved होता है, agent owner को सूचित करता है और स्पष्ट merge निर्देश की
प्रतीक्षा करता है।

Auto-merge सक्षम करने के लिए, `triggerfish.yaml` में जोड़ें:

```yaml
github:
  auto_merge: true
```

::: warning Auto-merge सुरक्षा के लिए डिफ़ॉल्ट रूप से अक्षम है। इसे केवल तभी
सक्षम करें जब आप agent के परिवर्तनों पर भरोसा करते हैं और GitHub में branch
protection rules (required reviewers, CI checks) कॉन्फ़िगर हैं। :::

## सुरक्षा विचार

| नियंत्रण                | विवरण                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **HMAC सत्यापन**        | सभी GitHub webhooks processing से पहले HMAC-SHA256 से सत्यापित (webhook mode)                      |
| **Classification**      | GitHub डेटा डिफ़ॉल्ट रूप से `INTERNAL` वर्गीकृत -- code और PR डेटा public channels पर leak नहीं होता |
| **Session अलगाव**       | प्रत्येक webhook event या trigger wakeup एक ताज़ा अलग session spawn करता है                        |
| **No Write-Down**       | INTERNAL-classified PR events पर agent प्रतिक्रियाएँ PUBLIC channels पर नहीं भेजी जा सकतीं         |
| **Credential handling** | `gh` CLI अपना auth token प्रबंधित करता है; triggerfish.yaml में कोई GitHub tokens संग्रहीत नहीं     |
| **Branch naming**       | `triggerfish/` prefix agent branches को आसानी से पहचानने और filter करने योग्य बनाता है              |

::: tip यदि आपके repository में संवेदनशील code (proprietary, security-critical)
है, webhook classification को `INTERNAL` के बजाय `CONFIDENTIAL` सेट करने पर विचार
करें। :::
