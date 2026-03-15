# Agent Teams

Triggerfish agents ಸಂಕೀರ್ಣ ಕಾರ್ಯಗಳ ಮೇಲೆ ಒಟ್ಟಾಗಿ ಕೆಲಸ ಮಾಡುವ collaborating agents
ನ ಶಾಶ್ವತ teams spawn ಮಾಡಬಹುದು. ಪ್ರತಿ team ಸದಸ್ಯ ತನ್ನದೇ session, ಪಾತ್ರ,
conversation context, ಮತ್ತು tools ಪಡೆಯುತ್ತದೆ. ಒಬ್ಬ ಸದಸ್ಯನನ್ನು **lead** ಎಂದು
ನಿಯೋಜಿಸಲ್ಪಡುತ್ತದೆ ಮತ್ತು ಕೆಲಸ ಸಂಘಟಿಸುತ್ತದೆ.

Teams ವಿಶೇಷ ಪಾತ್ರಗಳು ಸಮಾನಾಂತರವಾಗಿ ಕೆಲಸ ಮಾಡುವ open-ended ಕಾರ್ಯಗಳಿಗೆ ಉತ್ತಮ:
research + analysis + writing, architecture + implementation + review, ಅಥವಾ
ಭಿನ್ನ perspectives ಪರಸ್ಪರ ಕೆಲಸದ ಮೇಲೆ iterate ಮಾಡಬೇಕಾದ ಯಾವ ಕಾರ್ಯ.

::: info ಲಭ್ಯತೆ
Agent Teams Triggerfish Gateway ಬಳಸಿದಾಗ **Power** plan ($149/month) ಅಗತ್ಯ.
Open source users ತಮ್ಮ ಸ್ವಂತ API keys ಚಲಾಯಿಸುವವರಿಗೆ agent teams ಗೆ ಸಂಪೂರ್ಣ
ಪ್ರವೇಶ ಇದೆ -- ಪ್ರತಿ team ಸದಸ್ಯ ನಿಮ್ಮ configure ಮಾಡಿದ provider ನಿಂದ inference
ಬಳಸುತ್ತಾರೆ.
:::

## Tools

### `team_create`

ಕಾರ್ಯದ ಮೇಲೆ collaborate ಮಾಡುವ agents ನ ಶಾಶ್ವತ team ರಚಿಸಿ. ಸದಸ್ಯ ಪಾತ್ರಗಳು,
tools, ಮತ್ತು models ನಿರ್ಧರಿಸಿ. ನಿಖರವಾಗಿ ಒಬ್ಬ ಸದಸ್ಯ lead ಆಗಿರಬೇಕು.

| Parameter                | Type   | Required | Description                                                     |
| ------------------------ | ------ | -------- | --------------------------------------------------------------- |
| `name`                   | string | yes      | Human-readable team ಹೆಸರು                                      |
| `task`                   | string | yes      | Team ನ objective (lead ಗೆ initial instructions ಆಗಿ ಕಳುಹಿಸಲ್ಪಡುತ್ತದೆ) |
| `members`                | array  | yes      | Team ಸದಸ್ಯ definitions (ಕೆಳಗೆ ನೋಡಿ)                          |
| `idle_timeout_seconds`   | number | no       | Per-member idle timeout. ಡಿಫಾಲ್ಟ್: 300 (5 ನಿಮಿಷ)             |
| `max_lifetime_seconds`   | number | no       | ಗರಿಷ್ಠ team lifetime. ಡಿಫಾಲ್ಟ್: 3600 (1 ಗಂಟೆ)              |
| `classification_ceiling` | string | no       | Team-wide classification ceiling (ಉದಾ. `CONFIDENTIAL`)         |

**ಸದಸ್ಯ definition:**

| Field                    | Type    | Required | Description                                           |
| ------------------------ | ------- | -------- | ----------------------------------------------------- |
| `role`                   | string  | yes      | ಅನನ್ಯ ಪಾತ್ರ identifier (ಉದಾ. `researcher`, `reviewer`) |
| `description`            | string  | yes      | ಈ ಸದಸ್ಯ ಏನು ಮಾಡುತ್ತಾರೆ (system prompt ಗೆ inject ಮಾಡಲ್ಪಡುತ್ತದೆ) |
| `is_lead`                | boolean | yes      | ಈ ಸದಸ್ಯ team lead ಆಗಿದ್ದಾರೆಯೇ                        |
| `model`                  | string  | no       | ಈ ಸದಸ್ಯಗಾಗಿ model override                            |
| `classification_ceiling` | string  | no       | Per-member classification ceiling                      |
| `initial_task`           | string  | no       | Initial instructions (lead ಡಿಫಾಲ್ಟ್ team task ಗೆ)    |

**Validation rules:**

- Team ನಿಖರವಾಗಿ `is_lead: true` ಜೊತೆ ಒಬ್ಬ ಸದಸ್ಯ ಹೊಂದಿರಬೇಕು
- ಎಲ್ಲ ಪಾತ್ರಗಳು ಅನನ್ಯ ಮತ್ತು non-empty ಆಗಿರಬೇಕು
- ಸದಸ್ಯ classification ceilings team ceiling ಮೀರಲಾಗದು
- `name` ಮತ್ತು `task` non-empty ಆಗಿರಬೇಕು

### `team_status`

Active team ನ ಪ್ರಸ್ತುತ state ತಪಾಸಿಸಿ.

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `team_id` | string | yes      | Team ID     |

Team ನ status, aggregate taint ಮಟ್ಟ, ಮತ್ತು ಪ್ರತಿ ಸದಸ್ಯನ ಪ್ರಸ್ತುತ taint, status,
ಮತ್ತು ಕೊನೆಯ activity timestamp ಒಳಗೊಂಡ per-member ವಿವರಗಳನ್ನು ಹಿಂದಿರುಗಿಸುತ್ತದೆ.

### `team_message`

ನಿರ್ದಿಷ್ಟ team ಸದಸ್ಯರಿಗೆ message ಕಳುಹಿಸಿ. ಹೆಚ್ಚಿನ context ಒದಗಿಸಲು, ಕೆಲಸ
redirect ಮಾಡಲು, ಅಥವಾ progress updates ಕೇಳಲು ಉಪಯುಕ್ತ.

| Parameter | Type   | Required | Description                              |
| --------- | ------ | -------- | ---------------------------------------- |
| `team_id` | string | yes      | Team ID                                  |
| `role`    | string | no       | ಗುರಿ ಸದಸ್ಯ ಪಾತ್ರ (ಡಿಫಾಲ್ಟ್ lead)      |
| `message` | string | yes      | Message ವಿಷಯ                            |

Team `running` status ನಲ್ಲಿರಬೇಕು ಮತ್ತು ಗುರಿ ಸದಸ್ಯ `active` ಅಥವಾ `idle` ಆಗಿರಬೇಕು.

### `team_disband`

Team ಮುಚ್ಚಿ ಎಲ್ಲ ಸದಸ್ಯ sessions terminate ಮಾಡಿ.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `team_id` | string | yes      | Team ID                            |
| `reason`  | string | no       | Team ಏಕೆ disband ಮಾಡಲ್ಪಡುತ್ತಿದೆ    |

Team ರಚಿಸಿದ session ಅಥವಾ lead ಸದಸ್ಯ ಮಾತ್ರ team disband ಮಾಡಬಹುದು.

## Teams ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತವೆ

### ರಚನೆ

Agent `team_create` call ಮಾಡಿದಾಗ, Triggerfish:

1. Team definition validate ಮಾಡುತ್ತದೆ (ಪಾತ್ರಗಳು, lead count, classification ceilings)
2. Orchestrator factory ಮೂಲಕ ಪ್ರತಿ ಸದಸ್ಯಗಾಗಿ ಪ್ರತ್ಯೇಕ agent session spawn ಮಾಡುತ್ತದೆ
3. ಪ್ರತಿ ಸದಸ್ಯನ system prompt ಗೆ **team roster prompt** inject ಮಾಡುತ್ತದೆ,
   ಅವರ ಪಾತ್ರ, teammates, ಮತ್ತು collaboration instructions ವಿವರಿಸುತ್ತದೆ
4. Lead ಗೆ (ಅಥವಾ per ಸದಸ್ಯ custom `initial_task` ಗೆ) initial task ಕಳುಹಿಸುತ್ತದೆ
5. ಪ್ರತಿ 30 ಸೆಕೆಂಡ್‌ಗಳಿಗೆ team health ತಪಾಸಣೆ ಮಾಡುವ lifecycle monitor ಪ್ರಾರಂಭಿಸುತ್ತದೆ

ಪ್ರತಿ ಸದಸ್ಯ session ತನ್ನದೇ conversation context, taint tracking, ಮತ್ತು tool
access ಜೊತೆ ಸಂಪೂರ್ಣ ಪ್ರತ್ಯೇಕ.

### ಸಹಯೋಗ

Team ಸದಸ್ಯರು `sessions_send` ಬಳಸಿ ಪರಸ್ಪರ ಸಂವಾದಿಸುತ್ತಾರೆ. Creating agent ಸದಸ್ಯರ
ನಡುವೆ messages relay ಮಾಡಬೇಕಿಲ್ಲ. Typical flow:

1. Lead team objective ಸ್ವೀಕರಿಸುತ್ತಾನೆ
2. Lead ಕಾರ್ಯ ವಿಭಜಿಸಿ `sessions_send` ಮೂಲಕ ಸದಸ್ಯರಿಗೆ assignments ಕಳುಹಿಸುತ್ತಾನೆ
3. ಸದಸ್ಯರು ಸ್ವಾಯತ್ತವಾಗಿ ಕೆಲಸ ಮಾಡುತ್ತಾರೆ, tools call ಮಾಡಿ iterate ಮಾಡಿ
4. ಸದಸ್ಯರು lead ಗೆ (ಅಥವಾ ನೇರವಾಗಿ ಇನ್ನೊಬ್ಬ ಸದಸ್ಯರಿಗೆ) ಫಲಿತಾಂಶ ಕಳುಹಿಸುತ್ತಾರೆ
5. Lead ಫಲಿತಾಂಶ synthesize ಮಾಡಿ ಕೆಲಸ ಮುಗಿದಾಗ ನಿರ್ಧರಿಸುತ್ತಾನೆ
6. Lead team ಮುಚ್ಚಲು `team_disband` call ಮಾಡುತ್ತಾನೆ

Team ಸದಸ್ಯರ ನಡುವಿನ messages orchestrator ಮೂಲಕ ನೇರವಾಗಿ ತಲುಪಿಸಲ್ಪಡುತ್ತವೆ --
ಪ್ರತಿ message ಸ್ವೀಕರಿಸುವವರ session ನಲ್ಲಿ ಪೂರ್ಣ agent turn trigger ಮಾಡುತ್ತದೆ.

### Status

ಯಾವ ಸಮಯದಲ್ಲಾದರೂ progress ತಪಾಸಣೆ ಮಾಡಲು `team_status` ಬಳಸಿ. Response ಒಳಗೊಂಡಿದೆ:

- **Team status:** `running`, `paused`, `completed`, `disbanded`, ಅಥವಾ `timed_out`
- **Aggregate taint:** ಎಲ್ಲ ಸದಸ್ಯರ ನಾದ್ಯಂತ ಹೆಚ್ಚು classification ಮಟ್ಟ
- **Per-member ವಿವರಗಳು:** ಪಾತ್ರ, status (`active`, `idle`, `completed`, `failed`),
  ಪ್ರಸ್ತುತ taint ಮಟ್ಟ, ಮತ್ತು ಕೊನೆಯ activity timestamp

### Disband

Teams ಇವರಿಂದ disband ಮಾಡಬಹುದು:

- Creating session `team_disband` call ಮಾಡಿ
- Lead ಸದಸ್ಯ `team_disband` call ಮಾಡಿ
- Lifetime limit ಮೀರಿದ ನಂತರ lifecycle monitor ಸ್ವಯಂಚಾಲಿತವಾಗಿ disband ಮಾಡಿ
- ಎಲ್ಲ ಸದಸ್ಯರು inactive ಎಂದು lifecycle monitor ಪತ್ತೆ ಮಾಡಿ

Team disband ಆದಾಗ, ಎಲ್ಲ active ಸದಸ್ಯ sessions terminate ಮಾಡಲ್ಪಡುತ್ತವೆ ಮತ್ತು
resources cleanup ಆಗುತ್ತವೆ.

## Team ಪಾತ್ರಗಳು

### Lead

Lead ಸದಸ್ಯ team ಸಂಘಟಿಸುತ್ತಾನೆ. ರಚಿಸಲ್ಪಟ್ಟಾಗ:

- Team ನ `task` ಅನ್ನು initial instructions ಆಗಿ ಸ್ವೀಕರಿಸುತ್ತಾನೆ (ಹೊರತು `initial_task`
  override ಮಾಡಿದ್ದರೆ)
- ಕೆಲಸ ವಿಭಜಿಸಲು, tasks ನಿಯೋಜಿಸಲು, ಮತ್ತು objective ಪೂರ್ಣಗೊಂಡಾಗ ನಿರ್ಧರಿಸಲು
  system prompt instructions ಪಡೆಯುತ್ತಾನೆ
- Team disband ಮಾಡಲು authorized

ಒಂದು team ಗೆ ನಿಖರವಾಗಿ ಒಬ್ಬ lead.

### ಸದಸ್ಯರು

Non-lead ಸದಸ್ಯರು specialists. ರಚಿಸಲ್ಪಟ್ಟಾಗ:

- `initial_task` ಒದಗಿಸಿದ್ದರೆ ಸ್ವೀಕರಿಸುತ್ತಾರೆ, ಇಲ್ಲದಿದ್ದರೆ lead ಕೆಲಸ ಕಳುಹಿಸುವ ತನಕ
  idle ಆಗಿರುತ್ತಾರೆ
- Completed ಕೆಲಸ lead ಗೆ ಅಥವಾ ಮುಂದಿನ ಸೂಕ್ತ teammate ಗೆ ಕಳುಹಿಸಲು system prompt
  instructions ಪಡೆಯುತ್ತಾರೆ
- Team disband ಮಾಡಲಾಗದು

## Lifecycle ಮೇಲ್ವಿಚಾರಣೆ

Teams ಪ್ರತಿ 30 ಸೆಕೆಂಡ್‌ಗಳಿಗೆ ಚಲಿಸುವ ಸ್ವಯಂಚಾಲಿತ lifecycle monitoring ಹೊಂದಿವೆ.

### Idle Timeout

ಪ್ರತಿ ಸದಸ್ಯ idle timeout ಹೊಂದಿರುತ್ತಾರೆ (ಡಿಫಾಲ್ಟ್: 5 ನಿಮಿಷ). ಸದಸ್ಯ idle ಆದಾಗ:

1. **ಮೊದಲ threshold (idle_timeout_seconds):** ಸದಸ್ಯ ತಮ್ಮ ಕೆಲಸ ಪೂರ್ಣವಾಗಿದ್ದರೆ
   ಫಲಿತಾಂಶ ಕಳುಹಿಸಲು ಕೇಳುವ nudge message ಸ್ವೀಕರಿಸುತ್ತಾರೆ
2. **ಎರಡು ಪಟ್ಟು threshold (2x idle_timeout_seconds):** ಸದಸ್ಯ terminate ಮಾಡಲ್ಪಡುತ್ತಾರೆ
   ಮತ್ತು lead ಗೆ ತಿಳಿಸಲ್ಪಡುತ್ತದೆ

### Lifetime Timeout

Teams ಗರಿಷ್ಠ lifetime ಹೊಂದಿವೆ (ಡಿಫಾಲ್ಟ್: 1 ಗಂಟೆ). ಮಿತಿ ತಲುಪಿದಾಗ:

1. Lead ಅಂತಿಮ output ತಯಾರಿಸಲು 60 ಸೆಕೆಂಡ್ warning message ಜೊತೆ ಸ್ವೀಕರಿಸುತ್ತಾನೆ
2. Grace period ನಂತರ, team ಸ್ವಯಂಚಾಲಿತವಾಗಿ disband ಮಾಡಲ್ಪಡುತ್ತದೆ

### Health Checks

Monitor ಪ್ರತಿ 30 ಸೆಕೆಂಡ್‌ಗಳಿಗೆ session health ತಪಾಸಿಸುತ್ತದೆ:

- **Lead failure:** Lead session ತಲುಪಲಾಗದಿದ್ದರೆ, team paused ಮಾಡಲ್ಪಡುತ್ತದೆ
  ಮತ್ತು creating session ಗೆ ತಿಳಿಸಲ್ಪಡುತ್ತದೆ
- **Member failure:** Member session ಹೋಗಿದ್ದರೆ, ಅದನ್ನು `failed` ಎಂದು mark ಮಾಡಿ
  ಉಳಿದ ಸದಸ್ಯರೊಂದಿಗೆ ಮುಂದುವರೆಯಲು lead ಗೆ ತಿಳಿಸಲ್ಪಡುತ್ತದೆ
- **All inactive:** ಎಲ್ಲ ಸದಸ್ಯರು `completed` ಅಥವಾ `failed` ಆದ್ದರಿಂದ, ಹೊಸ
  instructions inject ಮಾಡಲು ಅಥವಾ disband ಮಾಡಲು creating session ಗೆ ತಿಳಿಸಲ್ಪಡುತ್ತದೆ

## Classification ಮತ್ತು Taint

Team ಸದಸ್ಯ sessions ಎಲ್ಲ ಇತರ sessions ಅದೇ classification rules ಅನುಸರಿಸುತ್ತವೆ:

- ಪ್ರತಿ ಸದಸ್ಯ `PUBLIC` taint ನಲ್ಲಿ ಪ್ರಾರಂಭಿಸಿ classified ಡೇಟಾ ಪ್ರವೇಶಿಸಿದಂತೆ escalate
  ಮಾಡುತ್ತಾರೆ
- **Classification ceilings** ಸದಸ್ಯರು ಯಾವ ಡೇಟಾ ಪ್ರವೇಶಿಸಬಹುದು ಎಂದು ನಿರ್ಬಂಧಿಸಲು
  per-team ಅಥವಾ per-member ಹೊಂದಿಸಬಹುದು
- **Write-down enforcement** ಎಲ್ಲ inter-member communication ಗೆ ಅನ್ವಯಿಸುತ್ತದೆ.
  `CONFIDENTIAL` ನಲ್ಲಿ tainted ಸದಸ್ಯ `PUBLIC` ನಲ್ಲಿ ಸದಸ್ಯರಿಗೆ ಡೇಟಾ ಕಳುಹಿಸಲಾಗದು
- **Aggregate taint** (ಎಲ್ಲ ಸದಸ್ಯರ ನಾದ್ಯಂತ ಹೆಚ್ಚು taint) creating session team ನ
  ಒಟ್ಟಾರೆ classification exposure track ಮಾಡಲು `team_status` ನಲ್ಲಿ ವರದಿ ಮಾಡಲ್ಪಡುತ್ತದೆ

::: danger SECURITY ಸದಸ್ಯ classification ceilings team ceiling ಮೀರಲಾಗದು.
Team ceiling `INTERNAL` ಆದ್ದರಿಂದ, `CONFIDENTIAL` ceiling ಜೊತೆ ಯಾವ ಸದಸ್ಯ
configure ಮಾಡಲಾಗದು. ಇದನ್ನು ರಚನೆ ಸಮಯದಲ್ಲಿ validate ಮಾಡಲ್ಪಡುತ್ತದೆ. :::

## Teams vs Sub-Agents

| Aspect          | Sub-Agent (`subagent`)                      | Team (`team_create`)                                   |
| --------------- | ------------------------------------------- | ------------------------------------------------------ |
| **Lifetime**    | ಒಂದೇ ಕಾರ್ಯ, ಫಲಿತಾಂಶ ಹಿಂದಿರುಗಿಸಿ ಮುಗಿಸುತ್ತದೆ | Disband ಅಥವಾ timeout ವರೆಗೆ ಶಾಶ್ವತ                |
| **Members**     | ಒಂದು agent                                  | ಭಿನ್ನ ಪಾತ್ರಗಳ ಬಹು agents                           |
| **Interaction** | Parent ನಿಂದ Fire-and-forget                 | ಸದಸ್ಯರು `sessions_send` ಮೂಲಕ ಸ್ವತಂತ್ರವಾಗಿ ಸಂವಾದಿಸುತ್ತಾರೆ |
| **Coordination**| Parent ಫಲಿತಾಂಶಕ್ಕಾಗಿ ಕಾಯುತ್ತದೆ            | Lead ಸಂಘಟಿಸುತ್ತಾನೆ, parent `team_status` ಮೂಲಕ ತಪಾಸಿಸಬಹುದು |
| **Use case**    | ಕೇಂದ್ರೀಕೃತ single-step delegation          | ಸಂಕೀರ್ಣ ಮಲ್ಟಿ-ಪಾತ್ರ ಸಹಯೋಗ                          |

ಕೇಂದ್ರೀಕೃತ ಕಾರ್ಯ ಮಾಡಿ ಫಲಿತಾಂಶ ಹಿಂದಿರುಗಿಸಲು ಒಂದೇ agent ಅಗತ್ಯವಿದ್ದರೆ **sub-agents
ಬಳಸಿ**. ಬಹು ವಿಶೇಷ perspectives ಪರಸ್ಪರ ಕೆಲಸದ ಮೇಲೆ iterate ಮಾಡುವ ಕಾರ್ಯಕ್ಕೆ
**teams ಬಳಸಿ**.

::: tip Teams ರಚಿಸಿದ ನಂತರ ಸ್ವಾಯತ್ತ. Creating agent status ತಪಾಸಿಸಬಹುದು ಮತ್ತು
messages ಕಳುಹಿಸಬಹುದು, ಆದರೆ micromanage ಮಾಡಬೇಕಿಲ್ಲ. Lead ಸಂಘಟನೆ ನಿರ್ವಹಿಸುತ್ತಾನೆ. :::
