# Plan Mode at Task Tracking

Nagbibigay ang Triggerfish ng dalawang complementary tools para sa structured work: **plan mode** para sa complex implementation planning, at **todo tracking** para sa task management sa mga sessions.

## Plan Mode

Kinokonstrain ng plan mode ang agent sa read-only exploration at structured planning bago gumawa ng mga pagbabago. Pinipigilan nito ang agent na tumalon agad sa implementation bago maunawaan ang problema.

### Mga Tool

#### `plan_enter`

Pumasok sa plan mode. Bina-block ang write operations (`write_file`, `cron_create`, `cron_delete`) hangga't hindi na-approve ang plan.

| Parameter | Type   | Required | Paglalarawan                                                    |
| --------- | ------ | -------- | --------------------------------------------------------------- |
| `goal`    | string | yes      | Ano ang pine-plan ng agent na buuin/baguhin                     |
| `scope`   | string | no       | I-constrain ang exploration sa specific directories o modules   |

#### `plan_exit`

Lumabas sa plan mode at ipresenta ang implementation plan para sa user approval. **Hindi** awtomatikong nagsisimula ng execution.

| Parameter | Type   | Required | Paglalarawan                                                                    |
| --------- | ------ | -------- | ------------------------------------------------------------------------------- |
| `plan`    | object | yes      | Ang implementation plan (summary, approach, steps, risks, files, tests)         |

Kasama sa plan object ang:

- `summary` -- Ano ang nagagawa ng plan
- `approach` -- Paano ito gagawin
- `alternatives_considered` -- Anong ibang approaches ang na-evaluate
- `steps` -- Ordered list ng implementation steps, bawat isa ay may files, dependencies, at verification
- `risks` -- Mga known risks at mitigations
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Nagbabalik ng kasalukuyang plan mode state: active mode, goal, at plan progress.

#### `plan_approve`

I-approve ang pending plan at simulan ang execution. Tinatawag kapag ina-approve ng user.

#### `plan_reject`

I-reject ang pending plan at bumalik sa normal mode.

#### `plan_step_complete`

I-mark ang isang plan step bilang complete sa panahon ng execution.

| Parameter             | Type   | Required | Paglalarawan                              |
| --------------------- | ------ | -------- | ----------------------------------------- |
| `step_id`             | number | yes      | Ang step ID na ima-mark bilang complete   |
| `verification_result` | string | yes      | Output mula sa verification command       |

#### `plan_complete`

I-mark ang buong plan bilang complete.

| Parameter    | Type   | Required | Paglalarawan                                 |
| ------------ | ------ | -------- | -------------------------------------------- |
| `summary`    | string | yes      | Ano ang natapos                              |
| `deviations` | array  | no       | Anumang pagbabago mula sa original plan      |

#### `plan_modify`

Mag-request ng modification sa isang approved plan step. Nangangailangan ng user approval.

| Parameter          | Type   | Required | Paglalarawan                       |
| ------------------ | ------ | -------- | ---------------------------------- |
| `step_id`          | number | yes      | Aling step ang kailangang baguhin  |
| `reason`           | string | yes      | Bakit kailangan ang pagbabago      |
| `new_description`  | string | yes      | Updated na step description        |
| `new_files`        | array  | no       | Updated na file list               |
| `new_verification` | string | no       | Updated na verification command    |

### Workflow

```
1. Humiling ang user ng isang bagay na complex
2. Tumatawag ang agent ng plan_enter({ goal: "..." })
3. Nag-explore ang agent ng codebase (read-only tools lang)
4. Tumatawag ang agent ng plan_exit({ plan: { ... } })
5. Nire-review ng user ang plan
6. Ina-approve ng user → tumatawag ang agent ng plan_approve
   (o nirereject → tumatawag ang agent ng plan_reject)
7. Nag-execute ang agent nang step by step, tumatawag ng plan_step_complete pagkatapos ng bawat isa
8. Tumatawag ang agent ng plan_complete kapag tapos na
```

### Kailan Gamitin ang Plan Mode

Pumapasok ang agent sa plan mode para sa complex tasks: pagbuo ng features, pag-refactor ng systems, pag-implement ng multi-file changes. Para sa simpleng tasks (pag-fix ng typo, pag-rename ng variable), lulaktawan nito ang plan mode at direktang kumikilos.

## Todo Tracking

May persistent todo list ang agent para sa pagsubaybay ng multi-step work sa mga sessions.

### Mga Tool

#### `todo_read`

Basahin ang kasalukuyang todo list. Ibinabalik ang lahat ng items na may ID, content, status, priority, at timestamps.

#### `todo_write`

Palitan ang buong todo list. Ito ay complete replacement, hindi partial update.

| Parameter | Type  | Required | Paglalarawan                        |
| --------- | ----- | -------- | ----------------------------------- |
| `todos`   | array | yes      | Kumpletong list ng mga todo items   |

Bawat todo item ay may:

| Field        | Type   | Mga Value                             |
| ------------ | ------ | ------------------------------------- |
| `id`         | string | Unique identifier                     |
| `content`    | string | Paglalarawan ng task                  |
| `status`     | string | `pending`, `in_progress`, `completed` |
| `priority`   | string | `high`, `medium`, `low`               |
| `created_at` | string | ISO timestamp                         |
| `updated_at` | string | ISO timestamp                         |

### Behavior

- Ang mga todo ay naka-scope per-agent (hindi per-session) -- persistent sila sa mga sessions, trigger wakeups, at restarts
- Gumagamit lang ng todos ang agent para sa totohanang complex tasks (3+ distinct steps)
- Isang task lang ang `in_progress` sa isang pagkakataon; agad na mina-mark ang completed items
- Kapag sumulat ang agent ng bagong list na nag-omit ng dati nang stored items, awtomatikong pinapanatili ang mga item na iyon bilang `completed`
- Kapag lahat ng items ay `completed`, hindi pinapanatili ang lumang items (clean slate)

### Display

Nire-render ang todos sa parehong CLI at Tidepool:

- **CLI** -- Styled ANSI box na may status icons: `✓` (completed, strikethrough), `▶` (in progress, bold), `○` (pending)
- **Tidepool** -- HTML list na may CSS classes para sa bawat status
