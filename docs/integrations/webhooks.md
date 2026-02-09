# Webhooks

Triggerfish can accept inbound events from external services, enabling real-time reactions to emails, error alerts, CI/CD events, calendar changes, and more. Webhooks turn your agent from a reactive question-answering system into a proactive participant in your workflows.

## How Webhooks Work

External services send HTTP POST requests to registered webhook endpoints on the Triggerfish gateway. Each incoming event is verified for authenticity, classified, and routed to the agent for processing.

```
External Services              Gateway              Agent
+----------------+          +------------+        +---------+
| Gmail PubSub   |--------->|            |        |         |
| GitHub         |--------->|  Webhook   |------->| Process |
| Sentry         |--------->|  Endpoint  |        |  Event  |
| Stripe         |--------->|            |        |         |
| Custom         |--------->|            |        |         |
+----------------+          +------------+        +---------+
                                  |
                            HMAC verification
                            Classification
                            Session isolation
                            Policy hooks
                            Audit logging
```

## Supported Event Sources

Triggerfish can receive webhooks from any service that supports HTTP webhook delivery. Common integrations include:

| Source | Mechanism | Example Events |
|--------|-----------|----------------|
| Gmail | Pub/Sub push notifications | New email, label change |
| GitHub | Webhook | PR opened, issue comment, CI failure |
| Sentry | Webhook | Error alert, regression detected |
| Stripe | Webhook | Payment received, subscription change |
| Calendar | Polling or push | Event reminder, conflict detected |
| Custom | Generic webhook endpoint | Any JSON payload |

## Configuration

Webhook endpoints are configured in `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      secret: "${GITHUB_WEBHOOK_SECRET}"
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      secret: "${SENTRY_WEBHOOK_SECRET}"
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      secret: "${STRIPE_WEBHOOK_SECRET}"
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Configuration Fields

| Field | Required | Description |
|-------|:--------:|-------------|
| `id` | Yes | Unique identifier for this webhook endpoint |
| `path` | Yes | URL path where the endpoint is registered |
| `secret` | Yes | Shared secret for HMAC signature verification (use env var reference) |
| `classification` | Yes | Classification level assigned to events from this source |
| `actions` | Yes | List of event-to-task mappings |
| `actions[].event` | Yes | Event type pattern to match |
| `actions[].task` | Yes | Natural language task for the agent to execute |

::: tip
Secrets should always be referenced via environment variables (`${VARIABLE_NAME}`), never hardcoded in the configuration file. Triggerfish resolves environment variable references at runtime.
:::

## HMAC Signature Verification

Every inbound webhook request is verified for authenticity using HMAC signature validation before the payload is processed.

### How Verification Works

1. External service sends a webhook with a signature header (for example, `X-Hub-Signature-256` for GitHub)
2. Triggerfish computes the HMAC of the request body using the configured shared secret
3. The computed signature is compared against the signature in the request header
4. If the signatures do not match, the request is **rejected** immediately
5. If verified, the payload proceeds to classification and processing

```
Inbound request
    |
    v
Signature present?  --NO-->  Reject (401)
    |
   YES
    |
    v
Compute HMAC(body, secret)
    |
    v
Signature matches?  --NO-->  Reject (403)
    |
   YES
    |
    v
Proceed to classification
```

::: warning SECURITY
Webhook requests without valid HMAC signatures are rejected before any processing occurs. This prevents spoofed events from triggering agent actions. Never disable signature verification in production.
:::

## Event Processing Pipeline

Once a webhook event passes signature verification, it flows through the standard security pipeline:

### 1. Classification

The event payload is classified at the level configured for the webhook endpoint. A webhook endpoint configured as `CONFIDENTIAL` produces `CONFIDENTIAL` events.

### 2. Session Isolation

Each webhook event spawns its own isolated session. This means:

- The event is processed independently of any ongoing conversations
- Session taint starts fresh (at the webhook's classification level)
- No data leaks between webhook-triggered sessions and user sessions
- Each session gets its own taint tracking and lineage

### 3. PRE_CONTEXT_INJECTION Hook

The event payload passes through the `PRE_CONTEXT_INJECTION` hook before entering the agent context. This hook:

- Validates the payload structure
- Applies classification to all data fields
- Creates a lineage record for the inbound data
- Scans for injection patterns in string fields
- Can block the event if policy rules dictate

### 4. Agent Processing

The agent receives the classified event and executes the configured task. The task is a natural language instruction -- the agent uses its full capabilities (tools, skills, browser, exec environment) to complete it within policy constraints.

### 5. Output Delivery

Any output from the agent (messages, notifications, actions) passes through the `PRE_OUTPUT` hook. The No Write-Down rule applies: output from a `CONFIDENTIAL` webhook-triggered session cannot be sent to a `PUBLIC` channel.

### 6. Audit

The complete event lifecycle is logged: receipt, verification, classification, session creation, agent actions, and output decisions.

## Integration with the Scheduler

Webhooks integrate naturally with Triggerfish's [cron and trigger system](/features/cron-and-triggers). A webhook event can:

- **Trigger an existing cron job** ahead of schedule (for example, a deployment webhook triggers an immediate health check)
- **Create a new scheduled task** (for example, a calendar webhook schedules a reminder)
- **Update trigger priorities** (for example, a Sentry alert makes the agent prioritize error investigation on its next trigger wakeup)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      secret: "${DEPLOY_WEBHOOK_SECRET}"
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # Agent may use cron.create to schedule follow-up checks
```

## Security Summary

| Control | Description |
|---------|-------------|
| HMAC verification | All inbound webhooks verified before processing |
| Classification | Webhook payloads classified at the configured level |
| Session isolation | Each event gets its own isolated session |
| `PRE_CONTEXT_INJECTION` | Payload scanned and classified before entering context |
| No Write-Down | Output from high-classification events cannot reach low-classification channels |
| Audit logging | Complete event lifecycle recorded |
| Not publicly exposed | Webhook endpoints are not exposed to the public internet by default |

### Enterprise Controls

- **Webhook allowlist** managed by admin -- only approved external sources can register endpoints
- **Rate limiting** per endpoint to prevent abuse
- **Payload size limits** to prevent memory exhaustion
- **IP allowlisting** for additional source verification
- **Retention policies** for webhook event logs

::: info
Webhook endpoints are not exposed to the public internet by default. For external services to reach your Triggerfish instance, you need to configure port forwarding, a reverse proxy, or a tunnel. The [Remote Access](/reference/) section of the docs covers secure exposure options.
:::
