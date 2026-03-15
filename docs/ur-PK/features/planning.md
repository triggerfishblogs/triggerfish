# Plan Mode اور Task Tracking

Triggerfish structured work کے لیے دو complementary tools فراہم کرتا ہے: **plan
mode** complex implementation planning کے لیے، اور **todo tracking** sessions کے
پار task management کے لیے۔

## Plan Mode

Plan mode ایجنٹ کو changes کرنے سے پہلے read-only exploration اور structured
planning تک constrain کرتا ہے۔ یہ ایجنٹ کو problem سمجھنے سے پہلے implementation
میں کودنے سے روکتا ہے۔

### Tools

#### `plan_enter`

Plan mode میں داخل ہوں۔ Write operations block ہوتی ہیں (`write_file`،
`cron_create`، `cron_delete`) جب تک plan approve نہ ہو۔

| Parameter | Type   | ضروری | تفصیل                                                     |
| --------- | ------ | :---: | ---------------------------------------------------------- |
| `goal`    | string | ہاں   | ایجنٹ کیا build/change کرنے کی planning کر رہا ہے         |
| `scope`   | string | نہیں  | Exploration کو مخصوص directories یا modules تک constrain کریں |

#### `plan_exit`

Plan mode سے نکلیں اور user approval کے لیے implementation plan present کریں۔
**Automatically** execution شروع نہیں کرتا۔

| Parameter | Type   | ضروری | تفصیل                                                                    |
| --------- | ------ | :---: | ------------------------------------------------------------------------- |
| `plan`    | object | ہاں   | Implementation plan (summary، approach، steps، risks، files، tests)      |

Plan object میں شامل ہے:

- `summary` -- Plan کیا accomplish کرتا ہے
- `approach` -- یہ کیسے ہوگا
- `alternatives_considered` -- کون سے دوسرے approaches evaluate کیے گئے
- `steps` -- Ordered list of implementation steps، ہر ایک files، dependencies،
  اور verification کے ساتھ
- `risks` -- Known risks اور mitigations
- `files_to_create`، `files_to_modify`، `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Current plan mode state واپس کرتا ہے: active mode، goal، اور plan progress۔

#### `plan_approve`

Pending plan approve کریں اور execution شروع کریں۔ User کے approve کرنے پر call
ہوتا ہے۔

#### `plan_reject`

Pending plan reject کریں اور normal mode پر واپس آئیں۔

#### `plan_step_complete`

Execution کے دوران plan step complete mark کریں۔

| Parameter             | Type   | ضروری | تفصیل                              |
| --------------------- | ------ | :---: | ----------------------------------- |
| `step_id`             | number | ہاں   | Complete mark کرنے کا step ID      |
| `verification_result` | string | ہاں   | Verification command کا output     |

#### `plan_complete`

پورا plan complete mark کریں۔

| Parameter    | Type   | ضروری | تفصیل                           |
| ------------ | ------ | :---: | -------------------------------- |
| `summary`    | string | ہاں   | کیا accomplish ہوا               |
| `deviations` | array  | نہیں  | Original plan سے کوئی تبدیلیاں  |

#### `plan_modify`

Approved plan step میں modification request کریں۔ User approval درکار ہے۔

| Parameter          | Type   | ضروری | تفصیل                     |
| ------------------ | ------ | :---: | -------------------------- |
| `step_id`          | number | ہاں   | کون سا step تبدیلی چاہتا ہے |
| `reason`           | string | ہاں   | تبدیلی کیوں ضروری ہے       |
| `new_description`  | string | ہاں   | Updated step description   |
| `new_files`        | array  | نہیں  | Updated file list          |
| `new_verification` | string | نہیں  | Updated verification command |

### Workflow

```
1. User کچھ complex request کرتا ہے
2. Agent plan_enter({ goal: "..." }) call کرتا ہے
3. Agent codebase explore کرتا ہے (صرف read-only tools)
4. Agent plan_exit({ plan: { ... } }) call کرتا ہے
5. User plan review کرتا ہے
6. User approve کرتا ہے → agent plan_approve call کرتا ہے
   (یا reject کرتا ہے → agent plan_reject call کرتا ہے)
7. Agent step by step execute کرتا ہے، ہر کے بعد plan_step_complete call کرتا ہے
8. Agent plan_complete call کرتا ہے جب done ہو
```

### Plan Mode کب استعمال کریں

ایجنٹ complex tasks کے لیے plan mode میں داخل ہوتا ہے: features build کرنا،
systems refactor کرنا، multi-file changes implement کرنا۔ Simple tasks کے لیے
(typo fix، variable rename)، plan mode skip کر کے directly act کرتا ہے۔

## Todo Tracking

ایجنٹ کے پاس sessions کے پار multi-step work track کرنے کے لیے persistent todo
list ہے۔

### Tools

#### `todo_read`

Current todo list پڑھیں۔ تمام items ان کے ID، content، status، priority، اور
timestamps کے ساتھ واپس کرتا ہے۔

#### `todo_write`

پوری todo list replace کریں۔ یہ complete replacement ہے، partial update نہیں۔

| Parameter | Type  | ضروری | تفصیل                     |
| --------- | ----- | :---: | -------------------------- |
| `todos`   | array | ہاں   | Todo items کی مکمل list   |

ہر todo item میں:

| Field        | Type   | Values                                |
| ------------ | ------ | ------------------------------------- |
| `id`         | string | Unique identifier                     |
| `content`    | string | Task description                      |
| `status`     | string | `pending`، `in_progress`، `completed` |
| `priority`   | string | `high`، `medium`، `low`               |
| `created_at` | string | ISO timestamp                         |
| `updated_at` | string | ISO timestamp                         |

### Behavior

- Todos per-agent scoped ہیں (per-session نہیں) — sessions، trigger wakeups، اور
  restarts کے پار persist ہوتے ہیں
- ایجنٹ صرف genuinely complex tasks (3+ مختلف steps) کے لیے todos استعمال کرتا ہے
- ایک وقت میں ایک task `in_progress` ہوتی ہے؛ completed items فوری mark ہوتے ہیں
- جب ایجنٹ نئی list لکھتا ہے جو previously stored items omit کرے، وہ items
  automatically `completed` کے طور پر preserve ہوتے ہیں
- جب تمام items `completed` ہوں، پرانے items preserve نہیں ہوتے (clean slate)

### Display

Todos CLI اور Tidepool دونوں میں render ہوتے ہیں:

- **CLI** -- Status icons کے ساتھ styled ANSI box: `✓` (completed، strikethrough)،
  `▶` (in progress، bold)، `○` (pending)
- **Tidepool** -- ہر status کے لیے CSS classes کے ساتھ HTML list
