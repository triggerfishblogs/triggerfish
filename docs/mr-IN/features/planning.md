# Plan Mode आणि Task Tracking

Triggerfish structured work साठी दोन complementary tools प्रदान करतो:
complex implementation planning साठी **plan mode**, आणि sessions मध्ये task
management साठी **todo tracking**.

## Plan Mode

Plan mode एजंटला changes करण्यापूर्वी read-only exploration आणि structured
planning पर्यंत constrain करतो. हे एजंटला problem समजण्यापूर्वी implementation
मध्ये उडी मारण्यापासून रोखते.

### Tools

#### `plan_enter`

Plan mode मध्ये प्रवेश करा. Plan approve होईपर्यंत write operations
(`write_file`, `cron_create`, `cron_delete`) block करतो.

| Parameter | Type   | Required | वर्णन                                                        |
| --------- | ------ | -------- | ------------------------------------------------------------ |
| `goal`    | string | हो       | एजंट काय build/change करण्याचे planning करत आहे              |
| `scope`   | string | नाही     | Specific directories किंवा modules पर्यंत exploration constrain करा |

#### `plan_exit`

Plan mode मधून बाहेर पडा आणि user approval साठी implementation plan present
करा. Execution **आपोआप** सुरू होत नाही.

| Parameter | Type   | Required | वर्णन                                                                     |
| --------- | ------ | -------- | ------------------------------------------------------------------------- |
| `plan`    | object | हो       | Implementation plan (summary, approach, steps, risks, files, tests)       |

Plan object मध्ये समाविष्ट:

- `summary` -- Plan काय accomplish करतो
- `approach` -- ते कसे केले जाईल
- `alternatives_considered` -- इतर कोणते approaches evaluate केले गेले
- `steps` -- Implementation steps ची ordered list, प्रत्येकात files,
  dependencies, आणि verification
- `risks` -- Known risks आणि mitigations
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Current plan mode state return करतो: active mode, goal, आणि plan progress.

#### `plan_approve`

Pending plan approve करा आणि execution सुरू करा. User approve करताना called.

#### `plan_reject`

Pending plan reject करा आणि normal mode ला परत या.

#### `plan_step_complete`

Execution दरम्यान plan step complete म्हणून mark करा.

| Parameter             | Type   | Required | वर्णन                                    |
| --------------------- | ------ | -------- | ---------------------------------------- |
| `step_id`             | number | हो       | Complete म्हणून mark करायचा step ID      |
| `verification_result` | string | हो       | Verification command चा output           |

#### `plan_complete`

संपूर्ण plan complete म्हणून mark करा.

| Parameter    | Type   | Required | वर्णन                                  |
| ------------ | ------ | -------- | -------------------------------------- |
| `summary`    | string | हो       | काय accomplish केले गेले               |
| `deviations` | array  | नाही     | Original plan पासून कोणतेही बदल         |

#### `plan_modify`

Approved plan step मध्ये modification request करा. User approval आवश्यक आहे.

| Parameter          | Type   | Required | वर्णन                          |
| ------------------ | ------ | -------- | ------------------------------ |
| `step_id`          | number | हो       | कोणत्या step ला बदल आवश्यक आहे |
| `reason`           | string | हो       | बदल का आवश्यक आहे              |
| `new_description`  | string | हो       | Updated step description       |
| `new_files`        | array  | नाही     | Updated file list               |
| `new_verification` | string | नाही     | Updated verification command   |

### Workflow

```
1. User complex कशासाठी विचारतो
2. Agent plan_enter({ goal: "..." }) calls करतो
3. Agent codebase explore करतो (read-only tools फक्त)
4. Agent plan_exit({ plan: { ... } }) calls करतो
5. User plan review करतो
6. User approve करतो → agent plan_approve calls करतो
   (किंवा reject करतो → agent plan_reject calls करतो)
7. Agent step by step execute करतो, प्रत्येकानंतर plan_step_complete calls करतो
8. Agent plan_complete calls करतो
```

### Plan Mode केव्हा वापरायचे

एजंट complex tasks साठी plan mode मध्ये प्रवेश करतो: features building, systems
refactoring, multi-file changes implement करणे. Simple tasks साठी (typo fix करणे,
variable rename करणे), ते plan mode skip करते आणि थेट act करते.

## Todo Tracking

एजंटकडे sessions मध्ये multi-step काम track करण्यासाठी persistent todo list आहे.

### Tools

#### `todo_read`

Current todo list वाचा. सर्व items त्यांच्या ID, content, status, priority,
आणि timestamps सह return करतो.

#### `todo_write`

संपूर्ण todo list replace करा. हे complete replacement आहे, partial update नाही.

| Parameter | Type  | Required | वर्णन                        |
| --------- | ----- | -------- | ---------------------------- |
| `todos`   | array | हो       | Todo items ची complete list  |

प्रत्येक todo item मध्ये:

| Field        | Type   | Values                                |
| ------------ | ------ | ------------------------------------- |
| `id`         | string | Unique identifier                     |
| `content`    | string | Task description                      |
| `status`     | string | `pending`, `in_progress`, `completed` |
| `priority`   | string | `high`, `medium`, `low`               |
| `created_at` | string | ISO timestamp                         |
| `updated_at` | string | ISO timestamp                         |

### वर्तन

- Todos per-agent scoped आहेत (per-session नाही) -- ते sessions, trigger wakeups,
  आणि restarts मध्ये persist होतात
- एजंट फक्त genuinely complex tasks साठी todos वापरतो (3+ distinct steps)
- एका वेळी एक task `in_progress` असतो; completed items लगेच marked केले जातात
- जेव्हा एजंट नवीन list लिहितो जी previously stored items omit करते, ते items
  आपोआप `completed` म्हणून preserved होतात
- सर्व items `completed` असताना, जुने items preserved होत नाहीत (clean slate)

### Display

Todos CLI आणि Tidepool दोन्हीमध्ये rendered आहेत:

- **CLI** -- Status icons सह styled ANSI box: `✓` (completed, strikethrough),
  `▶` (in progress, bold), `○` (pending)
- **Tidepool** -- प्रत्येक status साठी CSS classes सह HTML list
