# SPINE and Triggers

Triggerfish uses two markdown files to define your agent's behavior: **SPINE.md** controls who your agent is, and **TRIGGER.md** controls what your agent does proactively. Both are freeform markdown -- you write them in plain English.

## SPINE.md -- Agent Identity

`SPINE.md` is the foundation of your agent's system prompt. It defines the agent's name, personality, mission, knowledge domains, and boundaries. Triggerfish loads this file every time it processes a message, so changes take effect immediately.

### File Location

```
~/.triggerfish/SPINE.md
```

For multi-agent setups, each agent has its own SPINE.md:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Getting Started

The setup wizard (`triggerfish dive`) generates a starter SPINE.md based on your answers. You can edit it freely at any time -- it is just markdown.

### Writing an Effective SPINE.md

A good SPINE.md is specific. The more concrete you are about your agent's role, the better it performs. Here is a recommended structure:

```markdown
# Identity

You are Reef, a personal AI assistant for Sarah.

# Mission

Help Sarah stay organized, informed, and productive. Prioritize
calendar management, email triage, and task tracking.

# Communication Style

- Be concise and direct. No filler.
- Use bullet points for lists of 3+ items.
- When uncertain, say so rather than guessing.
- Match the formality of the channel: casual on WhatsApp,
  professional on Slack.

# Domain Knowledge

- Sarah is a product manager at Acme Corp.
- Key tools: Linear for tasks, Google Calendar, Gmail, Slack.
- VIP contacts: @boss (David Chen), @skip (Maria Lopez).
- Current priorities: Q2 roadmap, mobile app launch.

# Boundaries

- Never send messages to external contacts without explicit approval.
- Never make financial transactions.
- Always confirm before deleting or modifying calendar events.
- When discussing work topics on personal channels, remind Sarah
  about classification boundaries.

# Response Preferences

- Default to short responses (2-3 sentences).
- Use longer responses only when the question requires detail.
- For code, include brief comments explaining key decisions.
```

### Best Practices

::: tip
**Be specific about personality.** Instead of "be helpful," write "be concise, direct, and use bullet points for clarity."
:::

::: tip
**Include context about the owner.** The agent performs better when it knows your role, tools, and priorities.
:::

::: tip
**Set explicit boundaries.** Define what the agent should never do. This supplements (but does not replace) the policy engine's deterministic enforcement.
:::

::: warning
SPINE.md instructions guide the LLM's behavior but are not security controls. For enforceable restrictions, use the policy engine in `triggerfish.yaml`. The policy engine is deterministic and cannot be bypassed -- SPINE.md instructions can be.
:::

## TRIGGER.md -- Proactive Behavior

`TRIGGER.md` defines what your agent should check, monitor, and act on during periodic wakeups. Unlike cron jobs (which execute fixed tasks on a schedule), triggers give the agent discretion to evaluate conditions and decide whether action is needed.

### File Location

```
~/.triggerfish/TRIGGER.md
```

For multi-agent setups:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### How Triggers Work

1. The trigger loop wakes the agent at a configured interval (set in `triggerfish.yaml`)
2. Triggerfish loads your TRIGGER.md and presents it to the agent
3. The agent evaluates each item and takes action if needed
4. All trigger actions pass through the normal policy hooks
5. The trigger session runs with a classification ceiling (also configured in YAML)
6. Quiet hours are respected -- no triggers fire during those times

### Trigger Configuration in YAML

Set the timing and constraints in your `triggerfish.yaml`:

```yaml
trigger:
  interval: 30m              # Check every 30 minutes
  classification: INTERNAL   # Max taint ceiling for trigger sessions
  quiet_hours: "22:00-07:00" # No wakeups during these hours
```

### Writing TRIGGER.md

Organize your triggers by priority. Be specific about what counts as actionable and what the agent should do about it.

```markdown
# Priority Checks

- Unread messages across all channels older than 1 hour --
  summarize and notify on primary channel.
- Calendar conflicts in the next 24 hours --
  flag and suggest resolution.
- Overdue tasks in Linear --
  list them with days overdue.

# Monitoring

- GitHub: PRs awaiting my review -- notify if older than 4 hours.
- Email: anything from VIP contacts (David Chen, Maria Lopez) --
  flag for immediate notification regardless of quiet hours.
- Slack: mentions in #incidents channel --
  summarize and escalate if unresolved.

# Proactive

- If morning (7-9am), prepare daily briefing with calendar,
  weather, and top 3 priorities.
- If Friday afternoon, draft weekly summary of completed tasks
  and open items.
- If inbox count exceeds 50 unread, offer to batch-triage.
```

### Example: Minimal TRIGGER.md

If you want a simple starting point:

```markdown
# Check on each wakeup

- Any unread messages older than 1 hour
- Calendar events in the next 4 hours
- Anything urgent in email
```

### Example: Developer-Focused TRIGGER.md

```markdown
# High Priority

- CI failures on main branch -- investigate and notify.
- PRs awaiting my review older than 2 hours.
- Sentry errors with "critical" severity in the last hour.

# Monitoring

- Dependabot PRs -- auto-approve patch updates, flag minor/major.
- Build times trending above 10 minutes -- report weekly.
- Open issues assigned to me with no updates in 3 days.

# Daily

- Morning: summarize overnight CI runs and deploy status.
- End of day: list PRs I opened that are still pending review.
```

### Triggers and the Policy Engine

All trigger actions are subject to the same policy enforcement as interactive conversations:

- Each trigger wakeup spawns an isolated session with its own taint tracking
- The classification ceiling in your YAML config limits what data the trigger can access
- The no write-down rule applies -- if a trigger accesses confidential data, it cannot send results to a public channel
- All trigger actions are logged in the audit trail

::: info
If TRIGGER.md is absent, trigger wakeups still occur at the configured interval. The agent uses its general knowledge and SPINE.md to decide what needs attention. For best results, write a TRIGGER.md.
:::

## SPINE.md vs TRIGGER.md

| Aspect | SPINE.md | TRIGGER.md |
|--------|----------|------------|
| Purpose | Define who the agent is | Define what the agent monitors |
| Loaded | Every message | Each trigger wakeup |
| Scope | All conversations | Trigger sessions only |
| Affects | Personality, knowledge, boundaries | Proactive checks and actions |
| Required | Yes (generated by dive wizard) | No (but recommended) |

## Next Steps

- Configure trigger timing and cron jobs in your [triggerfish.yaml](./configuration)
- Learn about all available CLI commands in the [Commands reference](./commands)
