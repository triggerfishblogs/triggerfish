# Webhooks

Triggerfish can accept inbound events from external services, enabling real-time
reactions to emails, error alerts, CI/CD events, calendar changes, and more.
Webhooks turn your agent from a reactive question-answering system into a
proactive participant in your workflows.

## How Webhooks Work

External services send HTTP POST requests to registered webhook endpoints on the
Triggerfish gateway. Each incoming event is verified for authenticity,
classified, and routed to the agent for processing.

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook pipeline: external services send HTTP POST through HMAC verification, classification, session isolation, and policy hooks to agent processing" style="max-width: 100%;" />

## Supported Event Sources

Triggerfish can receive webhooks from any service that supports HTTP webhook
delivery. Common integrations include:

| Source   | Mechanism                  | Example Events                        |
| -------- | -------------------------- | ------------------------------------- |
| Gmail    | Pub/Sub push notifications | New email, label change               |
| GitHub   | Webhook                    | PR opened, issue comment, CI failure  |
| Sentry   | Webhook                    | Error alert, regression detected      |
| Stripe   | Webhook                    | Payment received, subscription change |
| Calendar | Polling or push            | Event reminder, conflict detected     |
| Custom   | Generic webhook endpoint   | Any JSON payload                      |

## Configuration

Webhook endpoints are configured in `triggerfish.yaml`:

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

| Field             | Required | Description                                              |
| ----------------- | :------: | -------------------------------------------------------- |
| `id`              |   Yes    | Unique identifier for this webhook endpoint              |
| `path`            |   Yes    | URL path where the endpoint is registered                |
| `secret`          |   Yes    | Shared secret for HMAC signature verification            |
| `classification`  |   Yes    | Classification level assigned to events from this source |
| `actions`         |   Yes    | List of event-to-task mappings                           |
| `actions[].event` |   Yes    | Event type pattern to match                              |
| `actions[].task`  |   Yes    | Natural language task for the agent to execute           |

::: tip Webhook secrets are stored in the OS keychain. Run `triggerfish dive` or
configure webhooks interactively to enter them securely. :::

## HMAC Signature Verification

Every inbound webhook request is verified for authenticity using HMAC signature
validation before the payload is processed.

### How Verification Works

1. External service sends a webhook with a signature header (for example,
   `X-Hub-Signature-256` for GitHub)
2. Triggerfish computes the HMAC of the request body using the configured shared
   secret
3. The computed signature is compared against the signature in the request
   header
4. If the signatures do not match, the request is **rejected** immediately
5. If verified, the payload proceeds to classification and processing

<img src="/diagrams/hmac-verification.svg" alt="HMAC verification flow: check signature presence, compute HMAC, compare signatures, reject or proceed" style="max-width: 100%;" />

::: warning SECURITY Webhook requests without valid HMAC signatures are rejected
before any processing occurs. This prevents spoofed events from triggering agent
actions. Never disable signature verification in production. :::

## Event Processing Pipeline

Once a webhook event passes signature verification, it flows through the
standard security pipeline:

### 1. Classification

The event payload is classified at the level configured for the webhook
endpoint. A webhook endpoint configured as `CONFIDENTIAL` produces
`CONFIDENTIAL` events.

### 2. Session Isolation

Each webhook event spawns its own isolated session. This means:

- The event is processed independently of any ongoing conversations
- Session taint starts fresh (at the webhook's classification level)
- No data leaks between webhook-triggered sessions and user sessions
- Each session gets its own taint tracking and lineage

### 3. PRE_CONTEXT_INJECTION Hook

The event payload passes through the `PRE_CONTEXT_INJECTION` hook before
entering the agent context. This hook:

- Validates the payload structure
- Applies classification to all data fields
- Creates a lineage record for the inbound data
- Scans for injection patterns in string fields
- Can block the event if policy rules dictate

### 4. Agent Processing

The agent receives the classified event and executes the configured task. The
task is a natural language instruction -- the agent uses its full capabilities
(tools, skills, browser, exec environment) to complete it within policy
constraints.

### 5. Output Delivery

Any output from the agent (messages, notifications, actions) passes through the
`PRE_OUTPUT` hook. The No Write-Down rule applies: output from a `CONFIDENTIAL`
webhook-triggered session cannot be sent to a `PUBLIC` channel.

### 6. Audit

The complete event lifecycle is logged: receipt, verification, classification,
session creation, agent actions, and output decisions.

## Integration with the Scheduler

Webhooks integrate naturally with Triggerfish's
[cron and trigger system](/en-GB/features/cron-and-triggers). A webhook event can:

- **Trigger an existing cron job** ahead of schedule (for example, a deployment
  webhook triggers an immediate health check)
- **Create a new scheduled task** (for example, a calendar webhook schedules a
  reminder)
- **Update trigger priorities** (for example, a Sentry alert makes the agent
  prioritise error investigation on its next trigger wakeup)

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
          # Agent may use cron.create to schedule follow-up checks
```

## Security Summary

| Control                 | Description                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| HMAC verification       | All inbound webhooks verified before processing                                 |
| Classification          | Webhook payloads classified at the configured level                             |
| Session isolation       | Each event gets its own isolated session                                        |
| `PRE_CONTEXT_INJECTION` | Payload scanned and classified before entering context                          |
| No Write-Down           | Output from high-classification events cannot reach low-classification channels |
| Audit logging           | Complete event lifecycle recorded                                               |
| Not publicly exposed    | Webhook endpoints are not exposed to the public internet by default             |

## Example: GitHub PR Review Loop

A real-world example of webhooks in action: the agent opens a PR, then
GitHub webhook events drive the code review feedback loop without any polling.

### How It Works

1. The agent creates a feature branch, commits code, and opens a PR via
   `gh pr create`
2. The agent writes a tracking file to
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` with the branch
   name, PR number, and task context
3. The agent stops and waits -- no polling

When a reviewer posts feedback:

4. GitHub sends a `pull_request_review` webhook to Triggerfish
5. Triggerfish verifies the HMAC signature, classifies the event, and spawns an
   isolated session
6. The agent reads the tracking file to recover context, checks out the branch,
   addresses the review, commits, pushes, and comments on the PR
7. Steps 4-6 repeat until the review is approved

When the PR is merged:

8. GitHub sends a `pull_request.closed` webhook with `merged: true`
9. The agent cleans up: deletes the local branch, archives the tracking file

### Configuration

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

The GitHub webhook must send: `Pull requests`, `Pull request reviews`,
`Pull request review comments`, and `Issue comments`.

See the full [GitHub Integration](/en-GB/integrations/github) guide for setup
instructions and the `git-branch-management` bundled skill for the complete
agent workflow.

### Enterprise Controls

- **Webhook allowlist** managed by admin -- only approved external sources can
  register endpoints
- **Rate limiting** per endpoint to prevent abuse
- **Payload size limits** to prevent memory exhaustion
- **IP allowlisting** for additional source verification
- **Retention policies** for webhook event logs

::: info Webhook endpoints are not exposed to the public internet by default.
For external services to reach your Triggerfish instance, you need to configure
port forwarding, a reverse proxy, or a tunnel. The [Remote Access](/en-GB/reference/)
section of the docs covers secure exposure options. :::
