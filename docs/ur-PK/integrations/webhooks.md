# Webhooks

Triggerfish external services سے inbound events accept کر سکتا ہے، emails، error alerts،
CI/CD events، calendar changes، اور مزید پر real-time reactions ممکن بناتا ہے۔ Webhooks
آپ کے ایجنٹ کو ایک reactive question-answering system سے آپ کے workflows میں ایک
proactive participant میں بدل دیتے ہیں۔

## Webhooks کیسے کام کرتے ہیں

External services Triggerfish gateway پر registered webhook endpoints کو HTTP POST
requests بھیجتے ہیں۔ ہر incoming event authenticity کے لیے verified، classified، اور
processing کے لیے ایجنٹ کو route کیا جاتا ہے۔

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook pipeline: external services send HTTP POST through HMAC verification, classification, session isolation, and policy hooks to agent processing" style="max-width: 100%;" />

## Support کردہ Event Sources

Triggerfish کسی بھی service سے webhooks receive کر سکتا ہے جو HTTP webhook delivery
support کرتی ہے۔ عام integrations:

| Source   | Mechanism                  | مثالی Events                           |
| -------- | -------------------------- | --------------------------------------- |
| Gmail    | Pub/Sub push notifications | نئی email، label تبدیلی                |
| GitHub   | Webhook                    | PR کھلا، issue comment، CI failure     |
| Sentry   | Webhook                    | Error alert، regression detected       |
| Stripe   | Webhook                    | Payment received، subscription تبدیلی |
| Calendar | Polling or push            | Event reminder، conflict detected      |
| Custom   | Generic webhook endpoint   | کوئی بھی JSON payload                  |

## Configuration

Webhook endpoints `triggerfish.yaml` میں configure کیے جاتے ہیں:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret OS keychain میں محفوظ
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret OS keychain میں محفوظ
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secret OS keychain میں محفوظ
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Configuration Fields

| Field             | ضروری | تفصیل                                                     |
| ----------------- | :---: | ---------------------------------------------------------- |
| `id`              |  ہاں  | اس webhook endpoint کا منفرد identifier                   |
| `path`            |  ہاں  | وہ URL path جہاں endpoint registered ہے                   |
| `secret`          |  ہاں  | HMAC signature verification کے لیے shared secret         |
| `classification`  |  ہاں  | اس source سے events کو تفویض کردہ classification level    |
| `actions`         |  ہاں  | Event-to-task mappings کی list                            |
| `actions[].event` |  ہاں  | Match کرنے کے لیے event type pattern                      |
| `actions[].task`  |  ہاں  | ایجنٹ کے لیے natural language task                        |

::: tip Webhook secrets OS keychain میں محفوظ ہوتے ہیں۔ انہیں securely درج کرنے کے
لیے `triggerfish dive` چلائیں یا webhooks interactively configure کریں۔ :::

## HMAC Signature Verification

ہر inbound webhook request payload process ہونے سے پہلے HMAC signature validation کا
استعمال کرتے ہوئے authenticity کے لیے verified ہوتی ہے۔

### Verification کیسے کام کرتی ہے

1. External service signature header کے ساتھ webhook بھیجتی ہے (مثلاً، GitHub کے لیے
   `X-Hub-Signature-256`)
2. Triggerfish configured shared secret استعمال کر کے request body کا HMAC compute
   کرتا ہے
3. Computed signature request header میں signature سے compare ہوتی ہے
4. اگر signatures match نہ کریں، request فوری **reject** ہوتی ہے
5. اگر verified ہو، payload classification اور processing کی طرف آگے بڑھتا ہے

<img src="/diagrams/hmac-verification.svg" alt="HMAC verification flow: check signature presence, compute HMAC, compare signatures, reject or proceed" style="max-width: 100%;" />

::: warning سیکیورٹی Valid HMAC signatures کے بغیر webhook requests کوئی processing
ہونے سے پہلے reject ہوتی ہیں۔ یہ spoofed events کو agent actions trigger کرنے سے
روکتا ہے۔ Production میں signature verification کبھی disable نہ کریں۔ :::

## Event Processing Pipeline

Signature verification پاس کرنے کے بعد، webhook event standard security pipeline سے
گزرتا ہے:

### 1. Classification

Event payload webhook endpoint کے لیے configured level پر classified ہوتا ہے۔ `CONFIDENTIAL`
configured webhook endpoint `CONFIDENTIAL` events پیدا کرتا ہے۔

### 2. Session Isolation

ہر webhook event اپنی isolated session spawn کرتا ہے۔ اس کا مطلب:

- Event کسی بھی ongoing conversations سے آزادانہ process ہوتا ہے
- Session taint تازہ شروع ہوتا ہے (webhook کی classification level پر)
- Webhook-triggered sessions اور user sessions کے درمیان کوئی data leak نہیں
- ہر session کو اپنا taint tracking اور lineage ملتا ہے

### 3. PRE_CONTEXT_INJECTION Hook

Event payload agent context میں داخل ہونے سے پہلے `PRE_CONTEXT_INJECTION` hook سے
گزرتا ہے۔ یہ hook:

- Payload structure validate کرتا ہے
- تمام data fields پر classification apply کرتا ہے
- Inbound data کے لیے lineage record بناتا ہے
- String fields میں injection patterns scan کرتا ہے
- Policy قواعد dictate کریں تو event block کر سکتا ہے

### 4. Agent Processing

ایجنٹ classified event receive کرتا ہے اور configured task execute کرتا ہے۔ Task ایک
natural language instruction ہے — ایجنٹ policy constraints کے اندر اسے مکمل کرنے کے
لیے اپنی مکمل capabilities (tools، skills، browser، exec environment) استعمال کرتا ہے۔

### 5. Output Delivery

ایجنٹ کا کوئی بھی output (messages، notifications، actions) `PRE_OUTPUT` hook سے گزرتا
ہے۔ No Write-Down قاعدہ لاگو ہوتا ہے: `CONFIDENTIAL` webhook-triggered session کا
output `PUBLIC` channel کو نہیں بھیجا جا سکتا۔

### 6. Audit

مکمل event lifecycle logged ہوتی ہے: موصولی، verification، classification، session
creation، agent actions، اور output فیصلے۔

## مثال: GitHub PR Review Loop

Webhooks in action کی ایک real-world مثال: ایجنٹ PR کھولتا ہے، پھر GitHub webhook
events بغیر کسی polling کے code review feedback loop چلاتے ہیں۔

### Configuration

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret OS keychain میں محفوظ
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

## Security خلاصہ

| Control                 | تفصیل                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| HMAC verification       | تمام inbound webhooks processing سے پہلے verified                               |
| Classification          | Webhook payloads configured level پر classified                                 |
| Session isolation       | ہر event کو اپنی isolated session ملتی ہے                                        |
| `PRE_CONTEXT_INJECTION` | Payload context میں داخل ہونے سے پہلے scanned اور classified                    |
| No Write-Down           | High-classification events کا output low-classification channels تک نہیں پہنچتا |
| Audit logging           | مکمل event lifecycle recorded                                                    |

::: info Webhook endpoints ڈیفالٹ طور پر public internet پر exposed نہیں ہوتے۔
External services کے لیے آپ کے Triggerfish instance تک پہنچنے کے لیے، آپ کو port
forwarding، reverse proxy، یا tunnel configure کرنا ہوگا۔ :::
