---
name: triggers
description: >
  Manage TRIGGER.md for proactive agent monitoring. Covers the trigger
  file format, scheduling options, quiet hours, classification ceilings,
  and best practices for autonomous periodic wakeups.
classification_ceiling: INTERNAL
requires_tools: [read_file, write_file, edit_file]
network_domains: []
---

# Triggers — Proactive Agent Monitoring

TRIGGER.md defines what you proactively monitor and act on during periodic
trigger wakeups. The scheduler reads this file each time the trigger fires and
sends its contents as your prompt.

## File Location

`~/.triggerfish/TRIGGER.md` (the owner's base directory).

## How Triggers Work

1. The scheduler fires a trigger at a configured interval (default: 30 minutes).
2. It reads TRIGGER.md and passes the content as a message to a fresh orchestrator.
3. You execute the instructions — check things, search, fetch, summarize.
4. Output is delivered to the owner via the notification service.

**If TRIGGER.md does not exist, create it.** Without this file the scheduler falls
back to a vague "check for anything worth reporting" prompt, which wastes tokens
and produces low-quality results. When the user asks about triggers, or when you
are setting up proactive monitoring, always check for TRIGGER.md first and create
it if missing. Use `write_file` with the path `~/.triggerfish/TRIGGER.md`.

## TRIGGER.md Format

Write natural language instructions. You can use markdown for structure.
The entire file is sent as your prompt, so be specific about what you want to monitor.

### Example

```markdown
# Morning Briefing

Check the following and send a summary:

- Weather forecast for today (use web_search)
- Any new GitHub notifications on my repos
- Upcoming calendar events for today

## Monitoring

- If Bitcoin price drops below $50,000, alert me immediately
- Check my email inbox for anything marked urgent

## Quiet Hours

I don't need trigger wakeups between 11pm and 7am.
```

## Classification Ceiling

Triggers run with a classification ceiling configured in `triggerfish.yaml`:

```yaml
scheduler:
  trigger:
    interval_minutes: 30
    classification_ceiling: INTERNAL
    quiet_hours:
      start: 23
      end: 7
```

The trigger session cannot access data above this ceiling. If you need to
access CONFIDENTIAL data during triggers, the ceiling must be raised in config.

## Quiet Hours

Quiet hours prevent triggers from firing during specified times.
Hours are in 24-hour local time format. The trigger simply skips if the
current time falls within the quiet window.

## Best Practices

- Be specific: "Check HackerNews front page for AI news" beats "look around the internet"
- Prioritize: List the most important checks first
- Set classification: If triggers only need public data, keep the ceiling at PUBLIC
- Use quiet hours: Avoid unnecessary wakeups during sleep/focus time
- Keep it concise: Long TRIGGER.md files cost tokens on every wakeup
