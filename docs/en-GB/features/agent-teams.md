# Agent Teams

Triggerfish agents can spawn persistent teams of collaborating agents that work
together on complex tasks. Each team member gets its own session, role,
conversation context, and tools. One member is designated the **lead** and
coordinates the work.

Teams are best for open-ended tasks that benefit from specialised roles working
in parallel: research + analysis + writing, architecture + implementation +
review, or any task where different perspectives need to iterate on each other's
work.

::: info Availability
Agent Teams require the **Power** plan ($149/month) when using Triggerfish
Gateway. Open source users running their own API keys have full access to agent
teams — each team member consumes inference from your configured provider.
:::

## Tools

### `team_create`

Create a persistent team of agents that collaborate on a task. Define member
roles, tools, and models. Exactly one member must be the lead.

| Parameter                | Type   | Required | Description                                                     |
| ------------------------ | ------ | -------- | --------------------------------------------------------------- |
| `name`                   | string | yes      | Human-readable team name                                        |
| `task`                   | string | yes      | The team's objective (sent to the lead as initial instructions)  |
| `members`                | array  | yes      | Team member definitions (see below)                             |
| `idle_timeout_seconds`   | number | no       | Per-member idle timeout. Default: 300 (5 minutes)               |
| `max_lifetime_seconds`   | number | no       | Maximum team lifetime. Default: 3600 (1 hour)                   |
| `classification_ceiling` | string | no       | Team-wide classification ceiling (e.g. `CONFIDENTIAL`)          |

**Member definition:**

| Field                    | Type    | Required | Description                                           |
| ------------------------ | ------- | -------- | ----------------------------------------------------- |
| `role`                   | string  | yes      | Unique role identifier (e.g. `researcher`, `reviewer`) |
| `description`            | string  | yes      | What this member does (injected into system prompt)    |
| `is_lead`                | boolean | yes      | Whether this member is the team lead                   |
| `model`                  | string  | no       | Model override for this member                         |
| `classification_ceiling` | string  | no       | Per-member classification ceiling                      |
| `initial_task`           | string  | no       | Initial instructions (lead defaults to team task)      |

**Validation rules:**

- The team must have exactly one member with `is_lead: true`
- All roles must be unique and non-empty
- Member classification ceilings cannot exceed the team ceiling
- `name` and `task` must be non-empty

### `team_status`

Check the current state of an active team.

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `team_id` | string | yes      | Team ID     |

Returns the team's status, aggregate taint level, and per-member details
including each member's current taint, status, and last activity timestamp.

### `team_message`

Send a message to a specific team member. Useful for providing additional
context, redirecting work, or asking for progress updates.

| Parameter | Type   | Required | Description                              |
| --------- | ------ | -------- | ---------------------------------------- |
| `team_id` | string | yes      | Team ID                                  |
| `role`    | string | no       | Target member role (defaults to lead)    |
| `message` | string | yes      | Message content                          |

The team must be in `running` status and the target member must be `active` or
`idle`.

### `team_disband`

Shut down a team and terminate all member sessions.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `team_id` | string | yes      | Team ID                            |
| `reason`  | string | no       | Why the team is being disbanded    |

Only the session that created the team or the lead member can disband the team.

## How Teams Work

### Creation

When the agent calls `team_create`, Triggerfish:

1. Validates the team definition (roles, lead count, classification ceilings)
2. Spawns an isolated agent session for each member via the orchestrator factory
3. Injects a **team roster prompt** into each member's system prompt, describing
   their role, teammates, and collaboration instructions
4. Sends the initial task to the lead (or custom `initial_task` per member)
5. Starts a lifecycle monitor that checks team health every 30 seconds

Each member session is fully isolated with its own conversation context, taint
tracking, and tool access.

### Collaboration

Team members communicate with each other using `sessions_send`. The creating
agent does not need to relay messages between members. The typical flow:

1. The lead receives the team objective
2. The lead decomposes the task and sends assignments to members via
   `sessions_send`
3. Members work autonomously, calling tools and iterating
4. Members send results back to the lead (or directly to another member)
5. The lead synthesises results and decides when the work is done
6. The lead calls `team_disband` to shut down the team

Messages between team members are delivered directly via the orchestrator --
each message triggers a full agent turn in the recipient's session.

### Status

Use `team_status` to check progress at any time. The response includes:

- **Team status:** `running`, `paused`, `completed`, `disbanded`, or `timed_out`
- **Aggregate taint:** The highest classification level across all members
- **Per-member details:** Role, status (`active`, `idle`, `completed`, `failed`),
  current taint level, and last activity timestamp

### Disband

Teams can be disbanded by:

- The creating session calling `team_disband`
- The lead member calling `team_disband`
- The lifecycle monitor auto-disbanding after the lifetime limit expires
- The lifecycle monitor detecting all members are inactive

When a team is disbanded, all active member sessions are terminated and
resources are cleaned up.

## Team Roles

### Lead

The lead member coordinates the team. When created:

- Receives the team's `task` as its initial instructions (unless overridden by
  `initial_task`)
- Gets system prompt instructions for decomposing work, assigning tasks, and
  deciding when the objective is met
- Is authorised to disband the team

There is exactly one lead per team.

### Members

Non-lead members are specialists. When created:

- Receive their `initial_task` if provided, otherwise idle until the lead sends
  them work
- Get system prompt instructions for sending completed work to the lead or the
  next appropriate teammate
- Cannot disband the team

## Lifecycle Monitoring

Teams have automatic lifecycle monitoring that runs every 30 seconds.

### Idle Timeout

Each member has an idle timeout (default: 5 minutes). When a member is idle:

1. **First threshold (idle_timeout_seconds):** The member receives a nudge
   message asking them to send results if their work is complete
2. **Double threshold (2x idle_timeout_seconds):** The member is terminated and
   the lead is notified

### Lifetime Timeout

Teams have a maximum lifetime (default: 1 hour). When the limit is reached:

1. The lead receives a warning message with 60 seconds to produce final output
2. After the grace period, the team is automatically disbanded

### Health Checks

The monitor checks session health every 30 seconds:

- **Lead failure:** If the lead session is no longer reachable, the team is
  paused and the creating session is notified
- **Member failure:** If a member session is gone, it is marked as `failed` and
  the lead is notified to continue with remaining members
- **All inactive:** If all members are `completed` or `failed`, the creating
  session is notified to either inject new instructions or disband

## Classification and Taint

Team member sessions follow the same classification rules as all other sessions:

- Each member starts at `PUBLIC` taint and escalates as it accesses classified
  data
- **Classification ceilings** can be set per-team or per-member to restrict what
  data members can access
- **Write-down enforcement** applies to all inter-member communication. A member
  tainted at `CONFIDENTIAL` cannot send data to a member at `PUBLIC`
- The **aggregate taint** (highest taint across all members) is reported in
  `team_status` so the creating session can track the team's overall
  classification exposure

::: danger SECURITY Member classification ceilings cannot exceed the team
ceiling. If the team ceiling is `INTERNAL`, no member can be configured with a
`CONFIDENTIAL` ceiling. This is validated at creation time. :::

## Teams vs Sub-Agents

| Aspect          | Sub-Agent (`subagent`)                      | Team (`team_create`)                                   |
| --------------- | ------------------------------------------- | ------------------------------------------------------ |
| **Lifetime**    | Single task, returns result and exits       | Persistent until disbanded or timed out                 |
| **Members**     | One agent                                   | Multiple agents with distinct roles                     |
| **Interaction** | Fire-and-forget from parent                 | Members communicate freely via `sessions_send`          |
| **Coordination**| Parent waits for result                     | Lead coordinates, parent can check in via `team_status` |
| **Use case**    | Focused single-step delegation              | Complex multi-role collaboration                        |

**Use sub-agents** when you need a single agent to do a focused task and return
a result. **Use teams** when the task benefits from multiple specialised
perspectives iterating on each other's work.

::: tip Teams are autonomous once created. The creating agent can check status
and send messages, but does not need to micromanage. The lead handles
coordination. :::
