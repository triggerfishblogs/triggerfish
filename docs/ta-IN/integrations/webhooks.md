# Webhooks

Triggerfish external services இலிருந்து inbound events ஏற்றுக்கொள்ளலாம், emails, error alerts, CI/CD events, calendar மாற்றங்கள், மற்றும் பலவற்றுக்கான real-time reactions enable செய்கிறது. Webhooks உங்கள் agent ஐ reactive question-answering system இலிருந்து உங்கள் workflows இல் proactive participant ஆக மாற்றுகின்றன.

## Webhooks எவ்வாறு செயல்படுகின்றன

External services Triggerfish gateway இல் registered webhook endpoints க்கு HTTP POST requests அனுப்புகின்றன. ஒவ்வொரு incoming event உம் authenticity க்காக verified, classified, மற்றும் processing க்காக agent க்கு routed ஆகிறது.

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook pipeline: external services send HTTP POST through HMAC verification, classification, session isolation, and policy hooks to agent processing" style="max-width: 100%;" />

## Supported Event Sources

HTTP webhook delivery support செய்யும் எந்த service இலிருந்தும் Triggerfish webhooks பெறலாம். Common integrations:

| Source   | Mechanism                  | Example Events                        |
| -------- | -------------------------- | ------------------------------------- |
| Gmail    | Pub/Sub push notifications | New email, label change               |
| GitHub   | Webhook                    | PR opened, issue comment, CI failure  |
| Sentry   | Webhook                    | Error alert, regression detected      |
| Stripe   | Webhook                    | Payment received, subscription change |
| Calendar | Polling or push            | Event reminder, conflict detected     |
| Custom   | Generic webhook endpoint   | எந்த JSON payload உம்                |

## கட்டமைப்பு

Webhook endpoints `triggerfish.yaml` இல் கட்டமைக்கப்படுகின்றன:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret OS keychain இல் stored
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret OS keychain இல் stored
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secret OS keychain இல் stored
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### கட்டமைப்பு Fields

| Field             | Required | விளக்கம்                                                  |
| ----------------- | :------: | ----------------------------------------------------------- |
| `id`              |   ஆம்   | இந்த webhook endpoint க்கான Unique identifier             |
| `path`            |   ஆம்   | Endpoint registered ஆகும் URL path                        |
| `secret`          |   ஆம்   | HMAC signature verification க்கான Shared secret          |
| `classification`  |   ஆம்   | இந்த source இலிருந்து events க்கு assigned Classification level |
| `actions`         |   ஆம்   | Event-to-task mappings பட்டியல்                           |
| `actions[].event` |   ஆம்   | Match செய்ய Event type pattern                            |
| `actions[].task`  |   ஆம்   | Agent execute செய்ய Natural language task                 |

::: tip Webhook secrets OS keychain இல் stored. Them securely enter செய்ய `triggerfish dive` இயக்கவும் அல்லது webhooks interactively configure செய்யவும். :::

## HMAC Signature Verification

Payload process ஆவதற்கு முன்பு ஒவ்வொரு inbound webhook request உம் HMAC signature validation பயன்படுத்தி authenticity க்காக verified ஆகிறது.

### Verification எவ்வாறு செயல்படுகிறது

1. External service ஒரு signature header உடன் webhook அனுப்புகிறது (உதாரணமாக, GitHub க்கு `X-Hub-Signature-256`)
2. Triggerfish configured shared secret பயன்படுத்தி request body இன் HMAC compute செய்கிறது
3. Computed signature request header இல் உள்ள signature உடன் compare ஆகிறது
4. Signatures match ஆகவில்லையென்றால், request உடனடியாக **rejected**
5. Verified ஆனால், payload classification மற்றும் processing க்கு proceeds

<img src="/diagrams/hmac-verification.svg" alt="HMAC verification flow: check signature presence, compute HMAC, compare signatures, reject or proceed" style="max-width: 100%;" />

::: warning SECURITY Valid HMAC signatures இல்லாத webhook requests எந்த processing உம் ஆவதற்கு முன்பு rejected. இது spoofed events agent actions trigger செய்வதை தடுக்கிறது. Production இல் signature verification disable செய்யவே வேண்டாம். :::

## Event Processing Pipeline

ஒரு webhook event signature verification pass ஆன பிறகு, standard security pipeline மூலம் flow ஆகிறது:

### 1. Classification

Event payload webhook endpoint க்கு configured level இல் classified ஆகிறது. `CONFIDENTIAL` ஆக configured webhook endpoint `CONFIDENTIAL` events produce செய்கிறது.

### 2. Session Isolation

ஒவ்வொரு webhook event உம் தன்னுடைய isolated session spawn செய்கிறது. இதன் பொருள்:

- Event ongoing conversations இலிருந்து independently process ஆகிறது
- Session taint fresh ஆக தொடங்குகிறது (webhook இன் classification level இல்)
- Webhook-triggered sessions மற்றும் user sessions இடையே data leaks இல்லை
- ஒவ்வொரு session உம் தன்னுடைய taint tracking மற்றும் lineage பெறுகிறது

### 3. PRE_CONTEXT_INJECTION Hook

Agent context இல் enter செய்வதற்கு முன்பு event payload `PRE_CONTEXT_INJECTION` hook மூலம் செல்கிறது. இந்த hook:

- Payload structure validate செய்கிறது
- அனைத்து data fields க்கும் classification apply செய்கிறது
- Inbound data க்கான lineage record உருவாக்குகிறது
- String fields இல் injection patterns scan செய்கிறது
- Policy rules dictate செய்தால் event block செய்யலாம்

### 4. Agent Processing

Agent classified event பெற்று configured task execute செய்கிறது. Task ஒரு natural language instruction -- agent தன்னுடைய full capabilities (tools, skills, browser, exec environment) பயன்படுத்தி policy constraints இல் அதை complete செய்கிறது.

### 5. Output Delivery

Agent இலிருந்து எந்த output உம் (messages, notifications, actions) `PRE_OUTPUT` hook மூலம் செல்கிறது. No Write-Down விதி பொருந்துகிறது: `CONFIDENTIAL` webhook-triggered session இலிருந்து output `PUBLIC` channel க்கு அனுப்ப முடியாது.

### 6. Audit

Complete event lifecycle logged: receipt, verification, classification, session creation, agent actions, மற்றும் output decisions.

## Scheduler உடன் Integration

Webhooks Triggerfish இன் [cron மற்றும் trigger system](/ta-IN/features/cron-and-triggers) உடன் naturally integrate ஆகின்றன. ஒரு webhook event:

- Schedule க்கு முன்பாக **existing cron job trigger செய்யலாம்** (உதாரணமாக, ஒரு deployment webhook உடனடி health check trigger செய்கிறது)
- **புதிய scheduled task உருவாக்கலாம்** (உதாரணமாக, calendar webhook ஒரு reminder schedule செய்கிறது)
- **Trigger priorities update செய்யலாம்** (உதாரணமாக, Sentry alert agent இன் அடுத்த trigger wakeup இல் error investigation prioritize செய்கிறது)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # secret OS keychain இல் stored
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # Agent follow-up checks schedule செய்ய cron.create பயன்படுத்தலாம்
```

## Security Summary

| Control                 | விளக்கம்                                                                        |
| ----------------------- | --------------------------------------------------------------------------------- |
| HMAC verification       | Processing க்கு முன்பு அனைத்து inbound webhooks verified                        |
| Classification          | Webhook payloads configured level இல் classified                                |
| Session isolation       | ஒவ்வொரு event உம் தன்னுடைய isolated session பெறுகிறது                          |
| `PRE_CONTEXT_INJECTION` | Payload context enter செய்வதற்கு முன்பு scanned மற்றும் classified             |
| No Write-Down           | High-classification events இலிருந்து output low-classification channels reach ஆக முடியாது |
| Audit logging           | Complete event lifecycle recorded                                                 |
| Not publicly exposed    | Webhook endpoints default ஆக public internet க்கு exposed ஆவதில்லை             |

## Example: GitHub PR Review Loop

Webhooks நடைமுறையில்: agent PR opens செய்கிறது, பின்னர் GitHub webhook events polling இல்லாமல் code review feedback loop drive செய்கின்றன.

### எவ்வாறு செயல்படுகிறது

1. Agent ஒரு feature branch உருவாக்கி, code commit செய்து, `gh pr create` மூலம் PR opens செய்கிறது
2. Agent branch name, PR number, மற்றும் task context உடன் `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` க்கு tracking file எழுதுகிறது
3. Agent நிறுத்துகிறது மற்றும் காத்திருக்கிறது -- polling இல்லை

ஒரு reviewer feedback post செய்யும்போது:

4. GitHub Triggerfish க்கு `pull_request_review` webhook அனுப்புகிறது
5. Triggerfish HMAC signature verify செய்கிறது, event classify செய்கிறது, மற்றும் isolated session spawn செய்கிறது
6. Agent tracking file படித்து context recover செய்கிறது, branch checkout செய்கிறது, review address செய்கிறது, commit செய்கிறது, push செய்கிறது, மற்றும் PR இல் comment செய்கிறது
7. Review approved ஆகும் வரை படிகள் 4-6 repeat ஆகின்றன

PR merged ஆகும்போது:

8. GitHub `merged: true` உடன் `pull_request.closed` webhook அனுப்புகிறது
9. Agent cleanup செய்கிறது: local branch delete செய்கிறது, tracking file archive செய்கிறது

### கட்டமைப்பு

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret OS keychain இல் stored
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

GitHub webhook இவை அனுப்ப வேண்டும்: `Pull requests`, `Pull request reviews`, `Pull request review comments`, மற்றும் `Issue comments`.

Setup instructions க்கு full [GitHub Integration](/ta-IN/integrations/github) guide மற்றும் complete agent workflow க்கு `git-branch-management` bundled skill பாருங்கள்.

### Enterprise Controls

- **Webhook allowlist** admin manage செய்கிறார் -- approved external sources மட்டுமே endpoints register செய்யலாம்
- Abuse தடுக்க per endpoint **Rate limiting**
- Memory exhaustion தடுக்க **Payload size limits**
- கூடுதல் source verification க்கு **IP allowlisting**
- Webhook event logs க்கான **Retention policies**

::: info Webhook endpoints default ஆக public internet க்கு exposed ஆவதில்லை. External services உங்கள் Triggerfish instance reach செய்ய, port forwarding, reverse proxy, அல்லது tunnel configure செய்ய வேண்டும். Secure exposure options க்கு docs இன் [Remote Access](/ta-IN/reference/) section பாருங்கள். :::
