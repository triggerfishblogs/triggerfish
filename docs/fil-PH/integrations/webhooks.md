# Mga Webhook

Maaaring tumanggap ang Triggerfish ng inbound events mula sa external services, na nag-e-enable ng real-time reactions sa emails, error alerts, CI/CD events, calendar changes, at higit pa. Ginagawang proactive participant ng webhooks ang iyong agent sa iyong workflows mula sa reactive question-answering system.

## Paano Gumagana ang Webhooks

Nagpapadala ang external services ng HTTP POST requests sa registered webhook endpoints sa Triggerfish gateway. Bawat incoming event ay bine-verify para sa authenticity, classified, at inirurutas sa agent para sa processing.

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook pipeline: nagpapadala ang external services ng HTTP POST sa pamamagitan ng HMAC verification, classification, session isolation, at policy hooks sa agent processing" style="max-width: 100%;" />

## Mga Supported Event Source

Maaaring tumanggap ng webhooks ang Triggerfish mula sa anumang service na sumusuporta sa HTTP webhook delivery. Mga karaniwang integration:

| Source   | Mechanism                  | Mga Halimbawa ng Event                       |
| -------- | -------------------------- | -------------------------------------------- |
| Gmail    | Pub/Sub push notifications | Bagong email, label change                   |
| GitHub   | Webhook                    | PR opened, issue comment, CI failure         |
| Sentry   | Webhook                    | Error alert, regression detected             |
| Stripe   | Webhook                    | Payment received, subscription change        |
| Calendar | Polling o push             | Event reminder, conflict detected            |
| Custom   | Generic webhook endpoint   | Anumang JSON payload                         |

## Configuration

Naka-configure ang webhook endpoints sa `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret na naka-store sa OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret na naka-store sa OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secret na naka-store sa OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Mga Configuration Field

| Field             | Required | Paglalarawan                                                    |
| ----------------- | :------: | --------------------------------------------------------------- |
| `id`              |    Oo    | Unique identifier para sa webhook endpoint na ito               |
| `path`            |    Oo    | URL path kung saan naka-register ang endpoint                   |
| `secret`          |    Oo    | Shared secret para sa HMAC signature verification               |
| `classification`  |    Oo    | Classification level na naka-assign sa events mula sa source na ito |
| `actions`         |    Oo    | Listahan ng event-to-task mappings                              |
| `actions[].event` |    Oo    | Event type pattern na ita-tugma                                 |
| `actions[].task`  |    Oo    | Natural language task para i-execute ng agent                   |

::: tip Ang webhook secrets ay naka-store sa OS keychain. Patakbuhin ang `triggerfish dive` o mag-configure ng webhooks nang interactive para ma-enter ang mga ito nang ligtas. :::

## HMAC Signature Verification

Bawat inbound webhook request ay bine-verify para sa authenticity gamit ang HMAC signature validation bago ma-process ang payload.

### Paano Gumagana ang Verification

1. Nagpapadala ang external service ng webhook na may signature header (halimbawa, `X-Hub-Signature-256` para sa GitHub)
2. Kinokompute ng Triggerfish ang HMAC ng request body gamit ang configured shared secret
3. Kinokompara ang computed signature laban sa signature sa request header
4. Kung hindi tumutugma ang signatures, agad na **nire-reject** ang request
5. Kung verified, nagpapatuloy ang payload sa classification at processing

<img src="/diagrams/hmac-verification.svg" alt="HMAC verification flow: i-check ang signature presence, i-compute ang HMAC, ihambing ang signatures, i-reject o magpatuloy" style="max-width: 100%;" />

::: warning SECURITY Ang webhook requests na walang valid HMAC signatures ay nire-reject bago ang anumang processing. Pinipigilan nito ang spoofed events mula sa pag-trigger ng agent actions. Huwag kailanman i-disable ang signature verification sa production. :::

## Event Processing Pipeline

Kapag na-pass na ng webhook event ang signature verification, dumadaloy ito sa standard security pipeline:

### 1. Classification

Ang event payload ay classified sa level na configured para sa webhook endpoint. Ang webhook endpoint na configured bilang `CONFIDENTIAL` ay nagpo-produce ng `CONFIDENTIAL` events.

### 2. Session Isolation

Bawat webhook event ay nagsi-spawn ng sariling isolated session. Ibig sabihin nito:

- Independently na pini-process ang event mula sa anumang ongoing conversations
- Nagsisimula nang sariwa ang session taint (sa classification level ng webhook)
- Walang data leaks sa pagitan ng webhook-triggered sessions at user sessions
- Bawat session ay may sariling taint tracking at lineage

### 3. PRE_CONTEXT_INJECTION Hook

Ang event payload ay dumadaan sa `PRE_CONTEXT_INJECTION` hook bago pumasok sa agent context. Ang hook na ito ay:

- Bine-validate ang payload structure
- Nag-a-apply ng classification sa lahat ng data fields
- Gumagawa ng lineage record para sa inbound data
- Nagsi-scan ng injection patterns sa string fields
- Maaaring mag-block ng event kung nagdidikta ang policy rules

### 4. Agent Processing

Tumatanggap ang agent ng classified event at ine-execute ang configured task. Ang task ay natural language instruction -- ginagamit ng agent ang buong capabilities nito (tools, skills, browser, exec environment) para tapusin ito sa loob ng policy constraints.

### 5. Output Delivery

Anumang output mula sa agent (messages, notifications, actions) ay dumadaan sa `PRE_OUTPUT` hook. Naa-apply ang No Write-Down rule: ang output mula sa `CONFIDENTIAL` webhook-triggered session ay hindi maaaring ipadala sa `PUBLIC` channel.

### 6. Audit

Nilo-log ang kumpletong event lifecycle: receipt, verification, classification, session creation, agent actions, at output decisions.

## Integration sa Scheduler

Natural na nag-i-integrate ang webhooks sa [cron at trigger system](/fil-PH/features/cron-and-triggers) ng Triggerfish. Ang webhook event ay maaaring:

- **Mag-trigger ng existing cron job** nang mas maaga sa schedule (halimbawa, ang deployment webhook ay nagti-trigger ng immediate health check)
- **Gumawa ng bagong scheduled task** (halimbawa, ang calendar webhook ay nagshi-schedule ng reminder)
- **Mag-update ng trigger priorities** (halimbawa, ang Sentry alert ay nagpo-prioritize ng error investigation sa susunod na trigger wakeup ng agent)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # secret na naka-store sa OS keychain
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # Maaaring gumamit ang agent ng cron.create para mag-schedule ng follow-up checks
```

## Security Summary

| Control                 | Paglalarawan                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------- |
| HMAC verification       | Lahat ng inbound webhooks ay bine-verify bago i-process                                 |
| Classification          | Mga webhook payload ay classified sa configured level                                   |
| Session isolation       | Bawat event ay may sariling isolated session                                            |
| `PRE_CONTEXT_INJECTION` | Nisi-scan at classified ang payload bago pumasok sa context                             |
| No Write-Down           | Ang output mula sa high-classification events ay hindi maaaring ma-reach ng low-classification channels |
| Audit logging           | Nire-record ang kumpletong event lifecycle                                              |
| Hindi publicly exposed  | Hindi naka-expose sa public internet ang webhook endpoints bilang default               |

## Halimbawa: GitHub PR Review Loop

Isang real-world na halimbawa ng webhooks sa aksyon: nagbubukas ang agent ng PR, pagkatapos ang GitHub webhook events ang nagda-drive ng code review feedback loop nang walang polling.

### Paano Gumagana

1. Gumagawa ang agent ng feature branch, nag-commit ng code, at nagbubukas ng PR sa pamamagitan ng `gh pr create`
2. Nagsusulat ang agent ng tracking file sa `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` na may branch name, PR number, at task context
3. Humihinto ang agent at naghihintay -- walang polling

Kapag nag-post ng feedback ang reviewer:

4. Nagpapadala ang GitHub ng `pull_request_review` webhook sa Triggerfish
5. Bine-verify ng Triggerfish ang HMAC signature, classified ang event, at nagsi-spawn ng isolated session
6. Binabasa ng agent ang tracking file para ma-recover ang context, nag-check out ng branch, tina-address ang review, nag-commit, nagpu-push, at nagko-comment sa PR
7. Inuulit ang steps 4-6 hanggang ma-approve ang review

Kapag na-merge ang PR:

8. Nagpapadala ang GitHub ng `pull_request.closed` webhook na may `merged: true`
9. Nagli-linis ang agent: dine-delete ang local branch, ina-archive ang tracking file

### Configuration

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret na naka-store sa OS keychain
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

Kailangang magpadala ang GitHub webhook ng: `Pull requests`, `Pull request reviews`, `Pull request review comments`, at `Issue comments`.

Tingnan ang buong [GitHub Integration](/fil-PH/integrations/github) guide para sa setup instructions at ang `git-branch-management` bundled skill para sa kumpletong agent workflow.

### Mga Enterprise Control

- **Webhook allowlist** na mina-manage ng admin -- tanging approved external sources lang ang maaaring mag-register ng endpoints
- **Rate limiting** bawat endpoint para pigilan ang abuse
- **Payload size limits** para pigilan ang memory exhaustion
- **IP allowlisting** para sa karagdagang source verification
- **Retention policies** para sa webhook event logs

::: info Hindi naka-expose sa public internet ang webhook endpoints bilang default. Para ma-reach ng external services ang iyong Triggerfish instance, kailangan mong mag-configure ng port forwarding, reverse proxy, o tunnel. Sinasaklaw ng [Remote Access](/fil-PH/reference/) section ng docs ang mga secure exposure options. :::
