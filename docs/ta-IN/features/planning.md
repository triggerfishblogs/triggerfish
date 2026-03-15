# Plan Mode மற்றும் Task Tracking

Triggerfish structured work க்கு இரண்டு complementary tools வழங்குகிறது: complex implementation planning க்கு **plan mode**, மற்றும் sessions முழுவதும் task management க்கு **todo tracking**.

## Plan Mode

Plan mode agent ஐ changes செய்வதற்கு முன்பு read-only exploration மற்றும் structured planning க்கு constrain செய்கிறது. இது problem புரிந்துகொள்வதற்கு முன்பே agent implementation க்கு குதிப்பதை தடுக்கிறது.

### Tools

#### `plan_enter`

Plan mode enter செய்யவும். Plan approve ஆகும் வரை write operations (`write_file`, `cron_create`, `cron_delete`) block செய்கிறது.

| Parameter | Type   | Required | விளக்கம்                                                       |
| --------- | ------ | -------- | ---------------------------------------------------------------- |
| `goal`    | string | ஆம்      | Agent என்ன build/change செய்ய திட்டமிடுகிறது                  |
| `scope`   | string | இல்லை   | Exploration ஐ specific directories அல்லது modules க்கு constrain செய்யவும் |

#### `plan_exit`

Plan mode விட்டு வெளியேறி user approval க்கு implementation plan present செய்யவும். Execution **தானாக தொடங்குவதில்லை**.

| Parameter | Type   | Required | விளக்கம்                                                                |
| --------- | ------ | -------- | ------------------------------------------------------------------------ |
| `plan`    | object | ஆம்      | Implementation plan (summary, approach, steps, risks, files, tests)     |

Plan object சேர்க்கிறது:

- `summary` -- Plan என்ன accomplish செய்கிறது
- `approach` -- அது எவ்வாறு செய்யப்படும்
- `alternatives_considered` -- மற்ற approaches என்ன evaluate செய்யப்பட்டன
- `steps` -- Implementation steps இன் ordered list, ஒவ்வொன்றும் files, dependencies, மற்றும் verification உடன்
- `risks` -- Known risks மற்றும் mitigations
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

தற்போதைய plan mode நிலை return செய்கிறது: active mode, goal, மற்றும் plan progress.

#### `plan_approve`

Pending plan ஐ approve செய்து execution தொடங்கவும். பயனர் approve செய்யும்போது அழைக்கப்படுகிறது.

#### `plan_reject`

Pending plan ஐ reject செய்து normal mode க்கு திரும்பவும்.

#### `plan_step_complete`

Execution போது ஒரு plan step ஐ complete என்று mark செய்யவும்.

| Parameter             | Type   | Required | விளக்கம்                             |
| --------------------- | ------ | -------- | -------------------------------------- |
| `step_id`             | number | ஆம்      | Complete என்று mark செய்ய step ID    |
| `verification_result` | string | ஆம்      | Verification command இலிருந்து output |

#### `plan_complete`

முழு plan ஐ complete என்று mark செய்யவும்.

| Parameter    | Type   | Required | விளக்கம்                            |
| ------------ | ------ | -------- | ------------------------------------- |
| `summary`    | string | ஆம்      | என்ன accomplish செய்யப்பட்டது       |
| `deviations` | array  | இல்லை   | Original plan இலிருந்து மாற்றங்கள்  |

#### `plan_modify`

Approved plan step க்கு ஒரு modification request செய்யவும். User approval தேவை.

| Parameter          | Type   | Required | விளக்கம்                      |
| ------------------ | ------ | -------- | ------------------------------- |
| `step_id`          | number | ஆம்      | எந்த step மாற வேண்டும்         |
| `reason`           | string | ஆம்      | மாற்றம் ஏன் தேவை              |
| `new_description`  | string | ஆம்      | Updated step description        |
| `new_files`        | array  | இல்லை   | Updated file list               |
| `new_verification` | string | இல்லை   | Updated verification command    |

### Workflow

```
1. பயனர் complex ஒன்று கேட்கிறார்
2. Agent plan_enter({ goal: "..." }) அழைக்கிறது
3. Agent codebase explore செய்கிறது (read-only tools மட்டும்)
4. Agent plan_exit({ plan: { ... } }) அழைக்கிறது
5. பயனர் plan review செய்கிறார்
6. பயனர் approve செய்கிறார் → agent plan_approve அழைக்கிறது
   (அல்லது reject செய்கிறார் → agent plan_reject அழைக்கிறது)
7. Agent step by step execute செய்கிறது, ஒவ்வொன்றுக்கும் பிறகு plan_step_complete அழைக்கிறது
8. Agent முடிந்தவுடன் plan_complete அழைக்கிறது
```

### Plan Mode எப்போது பயன்படுத்துவது

Agent complex tasks க்கு plan mode enter செய்கிறது: features building செய்வது, systems refactoring செய்வது, multi-file changes implementing செய்வது. Simple tasks க்கு (ஒரு typo சரிசெய்வது, ஒரு variable rename செய்வது), plan mode skip செய்து நேரடியாக செயல்படுகிறது.

## Todo Tracking

Agent sessions முழுவதும் multi-step work track செய்ய ஒரு persistent todo பட்டியல் கொண்டுள்ளது.

### Tools

#### `todo_read`

தற்போதைய todo பட்டியல் படிக்கவும். அவற்றின் ID, content, status, priority, மற்றும் timestamps உடன் அனைத்து items return செய்கிறது.

#### `todo_write`

முழு todo பட்டியலை மாற்றவும். இது ஒரு partial update அல்ல, complete replacement.

| Parameter | Type  | Required | விளக்கம்                   |
| --------- | ----- | -------- | ---------------------------- |
| `todos`   | array | ஆம்      | Todo items இன் Complete list |

ஒவ்வொரு todo item உம் கொண்டிருக்கிறது:

| Field        | Type   | மதிப்புகள்                            |
| ------------ | ------ | --------------------------------------- |
| `id`         | string | Unique identifier                       |
| `content`    | string | Task description                        |
| `status`     | string | `pending`, `in_progress`, `completed`  |
| `priority`   | string | `high`, `medium`, `low`               |
| `created_at` | string | ISO timestamp                           |
| `updated_at` | string | ISO timestamp                           |

### நடத்தை

- Todos per-agent scoped (per-session அல்ல) -- அவை sessions, trigger wakeups, மற்றும் restarts முழுவதும் persist ஆகின்றன
- Agent genuinely complex tasks க்கு மட்டும் todos பயன்படுத்துகிறது (3+ distinct steps)
- ஒரே நேரத்தில் ஒரு task `in_progress`; completed items உடனடியாக marked ஆகின்றன
- Agent முன்பு stored items விட்டுவிட்ட புதிய list எழுதும்போது, அந்த items தானாக `completed` என்று preserved ஆகின்றன
- அனைத்து items உம் `completed` ஆகும்போது, பழைய items preserved ஆவதில்லை (clean slate)

### Display

Todos CLI மற்றும் Tidepool இரண்டிலும் render ஆகின்றன:

- **CLI** -- Status icons உடன் Styled ANSI box: `✓` (completed, strikethrough), `▶` (in progress, bold), `○` (pending)
- **Tidepool** -- ஒவ்வொரு status க்கும் CSS classes உடன் HTML list
