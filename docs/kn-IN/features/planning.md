# Plan Mode ಮತ್ತು Task Tracking

Triggerfish ರಚನಾತ್ಮಕ ಕೆಲಸಕ್ಕಾಗಿ ಎರಡು ಪೂರಕ tools ಒದಗಿಸುತ್ತದೆ: ಸಂಕೀರ್ಣ
implementation ಯೋಜನೆಗಾಗಿ **plan mode** ಮತ್ತು sessions ನಾದ್ಯಂತ task management
ಗಾಗಿ **todo tracking**.

## Plan Mode

Plan mode agent ಅನ್ನು ಬದಲಾವಣೆ ಮಾಡುವ ಮೊದಲು read-only ಅನ್ವೇಷಣೆ ಮತ್ತು ರಚನಾತ್ಮಕ
ಯೋಜನೆಗೆ ನಿರ್ಬಂಧಿಸುತ್ತದೆ. ಇದು agent ಸಮಸ್ಯೆ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವ ಮೊದಲು implementation
ಗೆ ಧಾವಿಸುವುದನ್ನು ತಡೆಯುತ್ತದೆ.

### Tools

#### `plan_enter`

Plan mode ಪ್ರವೇಶಿಸಿ. Plan approve ಆಗುವ ತನಕ write operations (`write_file`,
`cron_create`, `cron_delete`) block ಮಾಡುತ್ತದೆ.

| Parameter | Type   | Required | Description                                              |
| --------- | ------ | -------- | -------------------------------------------------------- |
| `goal`    | string | yes      | Agent ಏನನ್ನು build/change ಮಾಡಲು ಯೋಜಿಸುತ್ತಿದೆ           |
| `scope`   | string | no       | ನಿರ್ದಿಷ್ಟ directories ಅಥವಾ modules ಗೆ ಅನ್ವೇಷಣೆ ನಿರ್ಬಂಧಿಸಿ |

#### `plan_exit`

Plan mode ತೊರೆದು user approval ಗಾಗಿ implementation plan ಪ್ರಸ್ತುತ ಮಾಡಿ.
ಸ್ವಯಂಚಾಲಿತವಾಗಿ execution ಪ್ರಾರಂಭಿಸುವುದಿಲ್ಲ.

| Parameter | Type   | Required | Description                                                             |
| --------- | ------ | -------- | ----------------------------------------------------------------------- |
| `plan`    | object | yes      | Implementation plan (summary, approach, steps, risks, files, tests) |

Plan object ಒಳಗೊಂಡಿದೆ:

- `summary` -- Plan ಏನನ್ನು ಸಾಧಿಸುತ್ತದೆ
- `approach` -- ಇದನ್ನು ಹೇಗೆ ಮಾಡಲಾಗುತ್ತದೆ
- `alternatives_considered` -- ಬೇರೆ ಯಾವ approaches ಮೌಲ್ಯಮಾಪಿಸಲ್ಪಟ್ಟವು
- `steps` -- ಪ್ರತಿಯೊಂದಕ್ಕೂ ಫೈಲ್‌ಗಳು, dependencies, ಮತ್ತು verification ಜೊತೆ ಅನುಕ್ರಮ
  implementation steps
- `risks` -- ತಿಳಿದ risks ಮತ್ತು mitigations
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

ಪ್ರಸ್ತುತ plan mode state ಹಿಂದಿರುಗಿಸುತ್ತದೆ: active mode, goal, ಮತ್ತು plan progress.

#### `plan_approve`

Pending plan approve ಮಾಡಿ execution ಪ್ರಾರಂಭಿಸಿ. User approve ಮಾಡಿದಾಗ call ಮಾಡಲ್ಪಡುತ್ತದೆ.

#### `plan_reject`

Pending plan reject ಮಾಡಿ normal mode ಗೆ ಹಿಂದಿರಿ.

#### `plan_step_complete`

Execution ಸಮಯದಲ್ಲಿ plan step complete ಎಂದು mark ಮಾಡಿ.

| Parameter             | Type   | Required | Description                          |
| --------------------- | ------ | -------- | ------------------------------------ |
| `step_id`             | number | yes      | Complete ಎಂದು mark ಮಾಡಬೇಕಾದ step ID |
| `verification_result` | string | yes      | Verification command ನ output        |

#### `plan_complete`

ಸಂಪೂರ್ಣ plan complete ಎಂದು mark ಮಾಡಿ.

| Parameter    | Type   | Required | Description                        |
| ------------ | ------ | -------- | ---------------------------------- |
| `summary`    | string | yes      | ಏನನ್ನು ಸಾಧಿಸಲಾಯಿತು               |
| `deviations` | array  | no       | Original plan ನಿಂದ ಯಾವ ಬದಲಾವಣೆಗಳು |

#### `plan_modify`

Approved plan step ಗೆ ಮಾರ್ಪಾಡು ಕೋರಿ. User approval ಅಗತ್ಯ.

| Parameter          | Type   | Required | Description                  |
| ------------------ | ------ | -------- | ---------------------------- |
| `step_id`          | number | yes      | ಯಾವ step ಬದಲಾಯಿಸಬೇಕು        |
| `reason`           | string | yes      | ಬದಲಾವಣೆ ಏಕೆ ಅಗತ್ಯ           |
| `new_description`  | string | yes      | ನವೀಕರಿಸಿದ step ವಿವರಣೆ        |
| `new_files`        | array  | no       | ನವೀಕರಿಸಿದ ಫೈಲ್ ಪಟ್ಟಿ        |
| `new_verification` | string | no       | ನವೀಕರಿಸಿದ verification command |

### Workflow

```
1. User ಸಂಕೀರ್ಣ ಏನಾದರೂ ಕೇಳುತ್ತಾರೆ
2. Agent plan_enter({ goal: "..." }) call ಮಾಡುತ್ತದೆ
3. Agent codebase ಅನ್ವೇಷಿಸುತ್ತದೆ (read-only tools ಮಾತ್ರ)
4. Agent plan_exit({ plan: { ... } }) call ಮಾಡುತ್ತದೆ
5. User plan ಪರಿಶೀಲಿಸುತ್ತಾರೆ
6. User approve → agent plan_approve call ಮಾಡುತ್ತದೆ
   (ಅಥವಾ reject → agent plan_reject call ಮಾಡುತ್ತದೆ)
7. Agent step by step execute ಮಾಡುತ್ತದೆ, ಪ್ರತಿ ನಂತರ plan_step_complete call ಮಾಡುತ್ತದೆ
8. Agent plan_complete call ಮಾಡುತ್ತದೆ ಮುಗಿದ ನಂತರ
```

### Plan Mode ಯಾವಾಗ ಬಳಸಬೇಕು

Agent ಸಂಕೀರ್ಣ ಕಾರ್ಯಗಳಿಗೆ plan mode ಪ್ರವೇಶಿಸುತ್ತದೆ: features build ಮಾಡಲು,
systems refactor ಮಾಡಲು, multi-file changes implement ಮಾಡಲು. ಸರಳ ಕಾರ್ಯಗಳಿಗೆ
(typo fix, variable rename), plan mode skip ಮಾಡಿ ನೇರವಾಗಿ ಕ್ರಿಯಿಸುತ್ತದೆ.

## Todo Tracking

Agent ಗೆ sessions ನಾದ್ಯಂತ ಮಲ್ಟಿ-ಸ್ಟೆಪ್ ಕೆಲಸ track ಮಾಡಲು ಶಾಶ್ವತ todo list ಇದೆ.

### Tools

#### `todo_read`

ಪ್ರಸ್ತುತ todo list ಓದಿ. ಅವುಗಳ ID, ವಿಷಯ, status, priority, ಮತ್ತು timestamps ಜೊತೆ
ಎಲ್ಲ items ಹಿಂದಿರುಗಿಸುತ್ತದೆ.

#### `todo_write`

ಸಂಪೂರ್ಣ todo list ಬದಲಾಯಿಸಿ. ಇದು partial update ಅಲ್ಲ, ಸಂಪೂರ್ಣ ಬದಲಾವಣೆ.

| Parameter | Type  | Required | Description                 |
| --------- | ----- | -------- | --------------------------- |
| `todos`   | array | yes      | Todo items ನ ಸಂಪೂರ್ಣ ಪಟ್ಟಿ |

ಪ್ರತಿ todo item ಹೊಂದಿರುತ್ತದೆ:

| Field        | Type   | Values                                |
| ------------ | ------ | ------------------------------------- |
| `id`         | string | ಅನನ್ಯ identifier                     |
| `content`    | string | Task ವಿವರಣೆ                          |
| `status`     | string | `pending`, `in_progress`, `completed` |
| `priority`   | string | `high`, `medium`, `low`               |
| `created_at` | string | ISO timestamp                         |
| `updated_at` | string | ISO timestamp                         |

### ನಡವಳಿಕೆ

- Todos per-agent scope ಮಾಡಲ್ಪಡುತ್ತವೆ (per-session ಅಲ್ಲ) -- ಇವು sessions,
  trigger wakeups, ಮತ್ತು restarts ನಾದ್ಯಂತ persist ಮಾಡುತ್ತವೆ
- Agent ನಿಜವಾಗಿ ಸಂಕೀರ್ಣ ಕಾರ್ಯಗಳಿಗೆ (3+ ವಿಭಿನ್ನ steps) ಮಾತ್ರ todos ಬಳಸುತ್ತದೆ
- ಒಂದು ಸಮಯದಲ್ಲಿ ಒಂದು task `in_progress`; completed items ತಕ್ಷಣ mark ಮಾಡಲ್ಪಡುತ್ತವೆ
- Agent ಹಿಂದೆ ಉಳಿಸಿದ items ಬಿಟ್ಟ ಹೊಸ ಪಟ್ಟಿ ಬರೆದಾಗ, ಆ items ಸ್ವಯಂಚಾಲಿತವಾಗಿ
  `completed` ಆಗಿ ಸಂರಕ್ಷಿಸಲ್ಪಡುತ್ತವೆ
- ಎಲ್ಲ items `completed` ಆದಾಗ, ಹಳೆ items ಸಂರಕ್ಷಿಸಲ್ಪಡುವುದಿಲ್ಲ (clean slate)

### ಪ್ರದರ್ಶನ

Todos CLI ಮತ್ತು Tidepool ಎರಡರಲ್ಲೂ render ಮಾಡಲ್ಪಡುತ್ತವೆ:

- **CLI** -- Status icons ಜೊತೆ styled ANSI box: `✓` (completed, strikethrough),
  `▶` (in progress, bold), `○` (pending)
- **Tidepool** -- ಪ್ರತಿ status ಗಾಗಿ CSS classes ಜೊತೆ HTML list
