# Webhooks

Triggerfish ಬಾಹ್ಯ services ನಿಂದ inbound events ಸ್ವೀಕರಿಸಬಹುದು -- emails, error alerts,
CI/CD events, calendar changes, ಮತ್ತು ಹೆಚ್ಚಿನವುಗಳಿಗೆ real-time ಪ್ರತಿಕ್ರಿಯೆ ಸಾಧ್ಯ.
Webhooks ನಿಮ್ಮ agent ಅನ್ನು reactive question-answering system ನಿಂದ workflows ನಲ್ಲಿ
proactive participant ಆಗಿ ಬದಲಾಯಿಸುತ್ತವೆ.

## Webhooks ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತವೆ

External services Triggerfish gateway ನ registered webhook endpoints ಗೆ HTTP POST
requests ಕಳಿಸುತ್ತವೆ. ಪ್ರತಿ inbound event authenticity ಗಾಗಿ verify ಮಾಡಲ್ಪಡುತ್ತದೆ,
classify ಮಾಡಲ್ಪಡುತ್ತದೆ, ಮತ್ತು processing ಗಾಗಿ agent ಗೆ route ಮಾಡಲ್ಪಡುತ್ತದೆ.

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook pipeline: external services send HTTP POST through HMAC verification, classification, session isolation, and policy hooks to agent processing" style="max-width: 100%;" />

## ಬೆಂಬಲಿಸಿದ Event Sources

Triggerfish HTTP webhook delivery ಬೆಂಬಲಿಸುವ ಯಾವುದೇ service ನಿಂದ webhooks ಸ್ವೀಕರಿಸಬಹುದು.
ಸಾಮಾನ್ಯ integrations:

| Source   | Mechanism                  | Example Events                           |
| -------- | -------------------------- | ---------------------------------------- |
| Gmail    | Pub/Sub push notifications | ಹೊಸ email, label change                  |
| GitHub   | Webhook                    | PR opened, issue comment, CI failure     |
| Sentry   | Webhook                    | Error alert, regression detected         |
| Stripe   | Webhook                    | Payment received, subscription change    |
| Calendar | Polling ಅಥವಾ push          | Event reminder, conflict detected        |
| Custom   | Generic webhook endpoint   | ಯಾವುದೇ JSON payload                      |

## ಸಂರಚನೆ

Webhook endpoints `triggerfish.yaml` ನಲ್ಲಿ configure ಮಾಡಲ್ಪಡುತ್ತವೆ:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret stored in OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secret stored in OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Configuration Fields

| Field             | Required | ವಿವರಣೆ                                                   |
| ----------------- | :------: | --------------------------------------------------------- |
| `id`              |   ಹೌದು   | ಈ webhook endpoint ಗಾಗಿ unique identifier                 |
| `path`            |   ಹೌದು   | Endpoint register ಮಾಡಲಾದ URL path                        |
| `secret`          |   ಹೌದು   | HMAC signature verification ಗಾಗಿ shared secret           |
| `classification`  |   ಹೌದು   | ಈ source ನಿಂದ events ಗೆ assign ಮಾಡಿದ classification level |
| `actions`         |   ಹೌದು   | Event-to-task mappings ಪಟ್ಟಿ                              |
| `actions[].event` |   ಹೌದು   | Match ಮಾಡಬೇಕಾದ event type pattern                         |
| `actions[].task`  |   ಹೌದು   | Agent execute ಮಾಡಲು natural language task                 |

::: tip Webhook secrets OS keychain ನಲ್ಲಿ store ಮಾಡಲ್ಪಡುತ್ತವೆ. ಅವನ್ನು ಸುರಕ್ಷಿತವಾಗಿ
enter ಮಾಡಲು `triggerfish dive` ಚಲಾಯಿಸಿ ಅಥವಾ webhooks interactively configure ಮಾಡಿ. :::

## HMAC Signature Verification

ಪ್ರತಿ inbound webhook request payload process ಮಾಡುವ ಮೊದಲು HMAC signature validation
ಬಳಸಿ authenticity verify ಮಾಡಲ್ಪಡುತ್ತದೆ.

### Verification ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ

1. External service signature header ಜೊತೆ webhook ಕಳಿಸುತ್ತದೆ (ಉದಾಹರಣೆಗೆ,
   GitHub ಗಾಗಿ `X-Hub-Signature-256`)
2. Triggerfish configured shared secret ಬಳಸಿ request body ನ HMAC compute ಮಾಡುತ್ತದೆ
3. Computed signature ಮತ್ತು request header ನ signature ಹೋಲಿಸಲ್ಪಡುತ್ತದೆ
4. Signatures ಹೊಂದಾಣಿಕೆ ಆಗದಿದ್ದರೆ, request ತಕ್ಷಣ **reject** ಮಾಡಲ್ಪಡುತ್ತದೆ
5. Verified ಆದರೆ, payload classification ಮತ್ತು processing ಗೆ ಮುಂದುವರೆಯುತ್ತದೆ

<img src="/diagrams/hmac-verification.svg" alt="HMAC verification flow: check signature presence, compute HMAC, compare signatures, reject or proceed" style="max-width: 100%;" />

::: warning SECURITY Valid HMAC signatures ಇಲ್ಲದ Webhook requests ಯಾವುದೇ
processing ಮೊದಲೇ reject ಮಾಡಲ್ಪಡುತ್ತವೆ. ಇದು spoofed events agent actions trigger
ಮಾಡದಂತೆ ತಡೆಯುತ್ತದೆ. Production ನಲ್ಲಿ signature verification ಎಂದಿಗೂ disable
ಮಾಡಬೇಡಿ. :::

## Event Processing Pipeline

Webhook event signature verification pass ಆದ ನಂತರ, standard security pipeline
ಮೂಲಕ ಹರಿಯುತ್ತದೆ:

### 1. Classification

Event payload webhook endpoint ಗಾಗಿ configure ಮಾಡಿದ level ನಲ್ಲಿ classify ಮಾಡಲ್ಪಡುತ್ತದೆ.
`CONFIDENTIAL` ಆಗಿ configure ಮಾಡಿದ webhook endpoint `CONFIDENTIAL` events
ಉತ್ಪಾದಿಸುತ್ತದೆ.

### 2. Session Isolation

ಪ್ರತಿ webhook event ತನ್ನದೇ isolated session spawn ಮಾಡುತ್ತದೆ. ಅಂದರೆ:

- Event ongoing conversations ನಿಂದ ಸ್ವತಂತ್ರವಾಗಿ process ಮಾಡಲ್ಪಡುತ್ತದೆ
- Session taint fresh ಆಗಿ ಪ್ರಾರಂಭಿಸುತ್ತದೆ (webhook ನ classification level ನಲ್ಲಿ)
- Webhook-triggered sessions ಮತ್ತು user sessions ನಡುವೆ data leak ಇಲ್ಲ
- ಪ್ರತಿ session ತನ್ನದೇ taint tracking ಮತ್ತು lineage ಪಡೆಯುತ್ತದೆ

### 3. PRE_CONTEXT_INJECTION Hook

Event payload agent context ಪ್ರವೇಶಿಸುವ ಮೊದಲು `PRE_CONTEXT_INJECTION` hook ಮೂಲಕ
ಹಾದು ಹೋಗುತ್ತದೆ. ಈ hook:

- Payload structure validate ಮಾಡುತ್ತದೆ
- ಎಲ್ಲ data fields ಗೆ classification ಅನ್ವಯಿಸುತ್ತದೆ
- Inbound data ಗಾಗಿ lineage record ತಯಾರಿಸುತ್ತದೆ
- String fields ನಲ್ಲಿ injection patterns scan ಮಾಡುತ್ತದೆ
- Policy rules dictate ಮಾಡಿದರೆ event block ಮಾಡಬಹುದು

### 4. Agent Processing

Agent classified event ಸ್ವೀಕರಿಸಿ configured task execute ಮಾಡುತ್ತದೆ. Task natural
language instruction -- agent policy constraints ಒಳಗಡೆ ಅದನ್ನು complete ಮಾಡಲು
ತನ್ನ ಸಂಪೂರ್ಣ capabilities (tools, skills, browser, exec environment) ಬಳಸುತ್ತದೆ.

### 5. Output Delivery

Agent ನ ಯಾವುದೇ output (messages, notifications, actions) `PRE_OUTPUT` hook ಮೂಲಕ
ಹಾದು ಹೋಗುತ್ತದೆ. No Write-Down rule ಅನ್ವಯಿಸುತ್ತದೆ: `CONFIDENTIAL` webhook-triggered
session ನ output `PUBLIC` channel ಗೆ ಕಳಿಸಲಾಗದು.

### 6. Audit

ಸಂಪೂರ್ಣ event lifecycle log ಮಾಡಲ್ಪಡುತ್ತದೆ: receipt, verification, classification,
session creation, agent actions, ಮತ್ತು output decisions.

## Scheduler ಜೊತೆ Integration

Webhooks Triggerfish ನ [cron ಮತ್ತು trigger system](/kn-IN/features/cron-and-triggers)
ಜೊತೆ ನೈಸರ್ಗಿಕವಾಗಿ integrate ಆಗುತ್ತವೆ. Webhook event:

- **Existing cron job ಮೊದಲೇ trigger** ಮಾಡಬಹುದು (ಉದಾಹರಣೆಗೆ, deployment webhook
  immediate health check trigger ಮಾಡುತ್ತದೆ)
- **ಹೊಸ scheduled task ತಯಾರಿಸಬಹುದು** (ಉದಾಹರಣೆಗೆ, calendar webhook reminder
  schedule ಮಾಡುತ್ತದೆ)
- **Trigger priorities update ಮಾಡಬಹುದು** (ಉದಾಹರಣೆಗೆ, Sentry alert ಮುಂದಿನ trigger
  wakeup ನಲ್ಲಿ error investigation ಆದ್ಯತೆ ಮಾಡುತ್ತದೆ)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # Agent cron.create ಬಳಸಿ follow-up checks schedule ಮಾಡಬಹುದು
```

## Security Summary

| Control                 | ವಿವರಣೆ                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| HMAC verification       | ಎಲ್ಲ inbound webhooks processing ಮೊದಲು verify                                    |
| Classification          | Webhook payloads configured level ನಲ್ಲಿ classify                                 |
| Session isolation       | ಪ್ರತಿ event ತನ್ನದೇ isolated session ಪಡೆಯುತ್ತದೆ                                  |
| `PRE_CONTEXT_INJECTION` | Context ಪ್ರವೇಶಿಸುವ ಮೊದಲು payload scan ಮತ್ತು classify                            |
| No Write-Down           | High-classification events ನ output low-classification channels ತಲುಪಲಾಗದು       |
| Audit logging           | ಸಂಪೂರ್ಣ event lifecycle ದಾಖಲಿಸಲ್ಪಡುತ್ತದೆ                                        |
| Not publicly exposed    | Webhook endpoints default ಆಗಿ public internet ಗೆ expose ಆಗುವುದಿಲ್ಲ             |

## ಉದಾಹರಣೆ: GitHub PR Review Loop

Webhooks ಕ್ರಿಯೆಯಲ್ಲಿ real-world example: agent PR ತೆರೆಯುತ್ತದೆ, ನಂತರ GitHub webhook
events code review feedback loop drive ಮಾಡುತ್ತವೆ -- polling ಇಲ್ಲ.

### ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ

1. Agent feature branch ತಯಾರಿಸಿ, code commit ಮಾಡಿ, `gh pr create` ಮೂಲಕ PR ತೆರೆಯುತ್ತದೆ
2. Agent branch name, PR number, ಮತ್ತು task context ಜೊತೆ tracking file
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` ಗೆ write ಮಾಡುತ್ತದೆ
3. Agent ನಿಲ್ಲಿಸಿ ಕಾಯುತ್ತದೆ -- polling ಇಲ್ಲ

Reviewer feedback post ಮಾಡಿದಾಗ:

4. GitHub Triggerfish ಗೆ `pull_request_review` webhook ಕಳಿಸುತ್ತದೆ
5. Triggerfish HMAC signature verify ಮಾಡಿ, event classify ಮಾಡಿ, isolated session
   spawn ಮಾಡುತ್ತದೆ
6. Agent tracking file ಓದಿ context recover ಮಾಡಿ, branch checkout ಮಾಡಿ, review
   address ಮಾಡಿ, commit ಮಾಡಿ, push ಮಾಡಿ, ಮತ್ತು PR ನಲ್ಲಿ comment ಮಾಡುತ್ತದೆ
7. Review approve ಆಗುವ ತನಕ steps 4-6 repeat ಆಗುತ್ತವೆ

PR merge ಆದಾಗ:

8. GitHub `merged: true` ಜೊತೆ `pull_request.closed` webhook ಕಳಿಸುತ್ತದೆ
9. Agent cleanup ಮಾಡುತ್ತದೆ: local branch delete, tracking file archive

### ಸಂರಚನೆ

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

GitHub webhook ಕಳಿಸಬೇಕಾದ events: `Pull requests`, `Pull request reviews`,
`Pull request review comments`, ಮತ್ತು `Issue comments`.

Setup instructions ಮತ್ತು complete agent workflow ಗಾಗಿ full [GitHub Integration](/kn-IN/integrations/github)
guide ಮತ್ತು `git-branch-management` bundled skill ನೋಡಿ.

### Enterprise Controls

- **Webhook allowlist** admin ನಿರ್ವಹಿಸುತ್ತದೆ -- approved external sources ಮಾತ್ರ
  endpoints register ಮಾಡಬಹುದು
- **Rate limiting** per endpoint ದುರ್ಬಳಕೆ ತಡೆಯಲು
- **Payload size limits** memory exhaustion ತಡೆಯಲು
- **IP allowlisting** ಹೆಚ್ಚುವರಿ source verification ಗಾಗಿ
- **Retention policies** webhook event logs ಗಾಗಿ

::: info Webhook endpoints default ಆಗಿ public internet ಗೆ expose ಆಗುವುದಿಲ್ಲ.
External services ನಿಮ್ಮ Triggerfish instance ತಲುಪಲು port forwarding, reverse proxy,
ಅಥವಾ tunnel configure ಮಾಡಬೇಕು. Docs ನ [Remote Access](/kn-IN/reference/) section
secure exposure options cover ಮಾಡುತ್ತದೆ. :::
