# Cron and Triggers

Triggerfish agents are not limited to reactive question-and-answer. The cron and
trigger system enables proactive behavior: scheduled tasks, periodic check-ins,
morning briefings, background monitoring, and autonomous multi-step workflows.

## Cron Jobs

Cron jobs are scheduled tasks with fixed instructions, a delivery channel, and a
classification ceiling. They use standard cron expression syntax.

### Configuration

Define cron jobs in `triggerfish.yaml` or let the agent manage them at runtime
through the cron tool:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 AM daily
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # Where to deliver
        classification: INTERNAL # Max taint for this job

      - id: pipeline-check
        schedule: "0 */4 * * *" # Every 4 hours
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### How It Works

1. The **CronManager** parses standard cron expressions and maintains a
   persistent job registry that survives restarts.
2. When a job fires, the **OrchestratorFactory** creates an isolated
   orchestrator and session specifically for that execution.
3. The job runs in a **background session workspace** with its own taint
   tracking.
4. Output is delivered to the configured channel, subject to that channel's
   classification rules.
5. Execution history is recorded for audit.

### Agent-Managed Cron

The agent can create and manage its own cron jobs through the `cron` tool:

| Action         | Description             | Security                                    |
| -------------- | ----------------------- | ------------------------------------------- |
| `cron.list`    | List all scheduled jobs | Owner-only                                  |
| `cron.create`  | Schedule a new job      | Owner-only, classification ceiling enforced |
| `cron.delete`  | Remove a scheduled job  | Owner-only                                  |
| `cron.history` | View past executions    | Audit trail preserved                       |

::: warning Cron job creation requires owner authentication. The agent cannot
schedule jobs on behalf of external users or exceed the configured
classification ceiling. :::

### CLI Cron Management

Cron jobs can also be managed directly from the command line:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

The `--classification` flag sets the classification ceiling for the job. Valid
levels are `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, and `RESTRICTED`. If omitted,
defaults to `INTERNAL`.

## Trigger System

Triggers are periodic "check-in" loops where the agent wakes up to evaluate
whether any proactive action is needed. Unlike cron jobs with fixed tasks,
triggers give the agent discretion to decide what needs attention.

### TRIGGER.md

`TRIGGER.md` defines what the agent should check during each wakeup. It lives at
`~/.triggerfish/config/TRIGGER.md` and is a freeform markdown file where you
specify monitoring priorities, escalation rules, and proactive behaviors.

If `TRIGGER.md` is absent, the agent uses its general knowledge to decide what
needs attention.

**Example TRIGGER.md:**

```markdown
# TRIGGER.md -- What to check on each wakeup

## Priority Checks

- Unread messages across all channels older than 1 hour
- Calendar conflicts in the next 24 hours
- Overdue tasks in Linear or Jira

## Monitoring

- GitHub: PRs awaiting my review
- Email: anything from VIP contacts (flag for immediate notification)
- Slack: mentions in #incidents channel

## Proactive

- If morning (7-9am), prepare daily briefing
- If Friday afternoon, draft weekly summary
```

### Trigger Configuration

Trigger timing and constraints are set in `triggerfish.yaml`:

```yaml
scheduler:
  trigger:
    enabled: true # Set to false to disable triggers (default: true)
    interval_minutes: 30 # Check every 30 minutes (default: 30)
    # Set to 0 to disable triggers without removing config
    classification_ceiling: CONFIDENTIAL # Max taint ceiling (default: CONFIDENTIAL)
    quiet_hours:
      start: 22 # Don't wake between 10 PM ...
      end: 7 # ... and 7 AM
```

| Setting                                 | Description                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Whether periodic trigger wakeups are active. Set to `false` to disable.                                                                       |
| `interval_minutes`                      | How often (in minutes) the agent wakes up to check triggers. Default: `30`. Set to `0` to disable triggers without removing the config block. |
| `classification_ceiling`                | Maximum classification level the trigger session can reach. Default: `CONFIDENTIAL`.                                                          |
| `quiet_hours.start` / `quiet_hours.end` | Hour range (24h clock) during which triggers are suppressed.                                                                                  |

::: tip To temporarily disable triggers, set `interval_minutes: 0`. This is
equivalent to `enabled: false` and lets you keep your other trigger settings in
place so you can re-enable easily. :::

### Trigger Execution

Each trigger wakeup follows this sequence:

1. The scheduler fires at the configured interval.
2. A fresh background session is spawned with `PUBLIC` taint.
3. The agent reads `TRIGGER.md` for its monitoring instructions.
4. The agent evaluates each check, using available tools and MCP servers.
5. If action is needed, the agent acts -- sending notifications, creating tasks,
   or delivering summaries.
6. The session's taint may escalate as classified data is accessed, but it
   cannot exceed the configured ceiling.
7. The session is archived after completion.

::: tip Triggers and cron jobs complement each other. Use cron for tasks that
should run at exact times regardless of conditions (morning briefing at 7 AM).
Use triggers for monitoring that requires judgment (check if anything needs my
attention every 30 minutes). :::

## Trigger Context Tool

The agent can load trigger results into its current conversation using the
`trigger_add_to_context` tool. This is useful when a user asks about something
that was checked during the last trigger wakeup.

### Usage

| Parameter | Default     | Description                                                                                      |
| --------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `source`  | `"trigger"` | Which trigger output to load: `"trigger"` (periodic), `"cron:<job-id>"`, or `"webhook:<source>"` |

The tool loads the most recent execution result for the specified source and
adds it to the conversation context.

### Write-Down Enforcement

Trigger context injection respects the no-write-down rule:

- If the trigger's classification **exceeds** the session taint, the session
  taint **escalates** to match
- If the session taint **exceeds** the trigger's classification, the injection
  is **blocked** — data cannot flow from a higher classification to a lower one

::: warning A session already tainted at CONFIDENTIAL cannot load a PUBLIC
trigger result. This prevents classified context from being mixed with
lower-classification data in ways that could leak information. :::

### Persistence

Trigger results are stored via `StorageProvider` with keys in the format
`trigger:last:<source>`. Only the most recent result per source is kept.

## Security Integration

All scheduled execution integrates with the core security model:

- **Isolated sessions** -- Each cron job and trigger wakeup runs in its own
  spawned session with independent taint tracking.
- **Classification ceiling** -- Background tasks cannot exceed their configured
  classification level, even if the tools they invoke return higher-classified
  data.
- **Policy hooks** -- All actions within scheduled tasks pass through the same
  enforcement hooks as interactive sessions (PRE_TOOL_CALL, POST_TOOL_RESPONSE,
  PRE_OUTPUT).
- **Channel classification** -- Output delivery respects the target channel's
  classification level. A `CONFIDENTIAL` result cannot be sent to a `PUBLIC`
  channel.
- **Audit trail** -- Every scheduled execution is logged with full context: job
  ID, session ID, taint history, actions taken, and delivery status.
- **Persistence** -- Cron jobs are stored via `StorageProvider` (namespace:
  `cron:`) and survive gateway restarts.
