---
title: Mga Workflow
description: I-automate ang mga multi-step na gawain gamit ang CNCF Serverless Workflow DSL engine na built-in sa Triggerfish.
---

# Mga Workflow

May built-in execution engine ang Triggerfish para sa
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
Pinapayagan ka ng mga workflow na mag-define ng deterministic, multi-step na mga
automation sa YAML na tumatakbo **nang walang LLM sa loop** habang nag-e-execute.
Ang agent ang gumagawa at nagti-trigger ng mga workflow, pero ang engine ang
nag-ha-handle ng actual na task dispatch, branching, looping, at data flow.

## Kailan Gagamitin ang mga Workflow

**Gamitin ang mga workflow** para sa mga repeatable, deterministic na sequence
kung saan alam mo na ang mga step: mag-fetch ng data mula sa isang API,
i-transform ito, i-save sa memory, magpadala ng notification. Palaging parehong
output para sa parehong input.

**Gamitin ang agent nang direkta** para sa open-ended na reasoning, exploration,
o mga gawain kung saan ang susunod na step ay depende sa judgment: pag-research
ng isang topic, pagsulat ng code, pag-troubleshoot ng isang problema.

Magandang rule of thumb: kung paulit-ulit mong pinapagawa sa agent ang parehong
multi-step na sequence, gawing workflow na lang ito.

::: info Availability
Available ang mga workflow sa lahat ng plan. Ang mga open source user na
gumagamit ng sarili nilang API key ay may full access sa workflow engine --
bawat `triggerfish:llm` o `triggerfish:agent` na call sa loob ng isang workflow
ay kumukuha ng inference mula sa iyong configured provider.
:::

## Mga Tool

### `workflow_save`

I-parse, i-validate, at i-store ang isang workflow definition. Sine-save ang
workflow sa classification level ng kasalukuyang session.

| Parameter     | Type   | Required | Description                        |
| ------------- | ------ | -------- | ---------------------------------- |
| `name`        | string | yes      | Pangalan ng workflow               |
| `yaml`        | string | yes      | YAML workflow definition           |
| `description` | string | no       | Ano ang ginagawa ng workflow       |

### `workflow_run`

I-execute ang isang workflow gamit ang pangalan o mula sa inline YAML. Ibinabalik
ang execution output at status.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `name`    | string | no       | Pangalan ng naka-save na workflow na ie-execute             |
| `yaml`    | string | no       | Inline YAML definition (kapag hindi gumagamit ng naka-save) |
| `input`   | string | no       | JSON string ng input data para sa workflow                  |

Kailangan ang isa sa `name` o `yaml`.

### `workflow_list`

I-list ang lahat ng naka-save na workflow na accessible sa kasalukuyang
classification level. Walang parameter.

### `workflow_get`

Kunin ang isang naka-save na workflow definition gamit ang pangalan.

| Parameter | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| `name`    | string | yes      | Pangalan ng workflow na kukunin      |

### `workflow_delete`

I-delete ang isang naka-save na workflow gamit ang pangalan. Kailangang
accessible ang workflow sa classification level ng kasalukuyang session.

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| `name`    | string | yes      | Pangalan ng workflow na ide-delete     |

### `workflow_history`

Tingnan ang mga nakaraang workflow execution result, opsyonal na nafi-filter
gamit ang pangalan ng workflow.

| Parameter       | Type   | Required | Description                                  |
| --------------- | ------ | -------- | -------------------------------------------- |
| `workflow_name` | string | no       | I-filter ang mga resulta gamit ang pangalan ng workflow |
| `limit`         | string | no       | Maximum na bilang ng mga resulta (default 10) |

## Mga Uri ng Task

Binubuo ang mga workflow ng mga task sa isang `do:` block. Bawat task ay isang
named entry na may type-specific na body. Sumusuporta ang Triggerfish sa 8 uri
ng task.

### `call` — Mga External Call

Mag-dispatch sa HTTP endpoint o Triggerfish service.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

Ang `call` field ang nagde-determine ng dispatch target. Tingnan ang
[Call Dispatch](#call-dispatch) para sa buong mapping.

### `run` — Shell, Script, o Sub-Workflow

Mag-execute ng shell command, inline script, o isa pang naka-save na workflow.

**Shell command:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Sub-workflow:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
Kailangan ng `allowShellExecution` flag na naka-enable sa workflow tool context
para sa shell at script execution. Kapag naka-disable, magfa-fail ang mga run
task na may `shell` o `script` target.
:::

### `set` — Mga Data Context Mutation

Mag-assign ng mga value sa data context ng workflow. Sumusuporta sa mga
expression.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Conditional Branching

Mag-branch batay sa mga condition. Bawat case ay may `when` expression at isang
`then` flow directive. Ang case na walang `when` ang nagsisilbing default.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — Pag-iterate

Mag-loop sa isang collection, ine-execute ang isang nested `do:` block para sa
bawat item.

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

Ang `each` field ang nagbibigay ng pangalan sa loop variable, `in` ang
nagre-reference sa collection, at ang opsyonal na `at` field ang nagbibigay ng
kasalukuyang index.

### `raise` — Huminto na may Error

Ihinto ang execution na may structured error.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — Mag-record ng mga Event

Mag-record ng workflow event. Nakukuha ang mga event sa run result at
mare-review gamit ang `workflow_history`.

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — Mag-sleep

I-pause ang execution para sa isang ISO 8601 duration.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Call Dispatch

Ang `call` field sa isang call task ang nagde-determine kung aling Triggerfish
tool ang ini-invoke.

| Call type              | Triggerfish tool | Mga kailangang `with:` field           |
| ---------------------- | ---------------- | -------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` (o `url`), `method`         |
| `triggerfish:llm`      | `llm_task`       | `prompt` (o `task`)                    |
| `triggerfish:agent`    | `subagent`       | `prompt` (o `task`)                    |
| `triggerfish:memory`   | `memory_*`       | `operation` + operation-specific field |
| `triggerfish:web_search` | `web_search`   | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`   |
| `triggerfish:message`  | `send_message`   | `channel`, `text`                      |

**Mga memory operation:** Kailangan ng `triggerfish:memory` call type ang isang
`operation` field na naka-set sa isa sa `save`, `search`, `get`, `list`, o
`delete`. Ang mga natitirang `with:` field ay direktang pinapasa sa
kaukulang memory tool.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**Mga MCP call:** Ang `triggerfish:mcp` call type ay nagro-route sa kahit anong
connected MCP server tool. I-specify ang `server` name, `tool` name, at
`arguments` object.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Mga Expression

Gumagamit ang mga workflow expression ng `${ }` syntax na may dot-path
resolution laban sa data context ng workflow.

```yaml
# Simple value reference
url: "${ .config.api_url }"

# Array indexing
first_item: "${ .results[0].name }"

# String interpolation (maraming expression sa isang string)
message: "Found ${ .count } issues in ${ .repo }"

# Comparison (nagbabalik ng boolean)
if: "${ .status == 'open' }"

# Arithmetic
total: "${ .price * .quantity }"
```

**Mga suportadong operator:**

- Comparison: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Arithmetic: `+`, `-`, `*`, `/`, `%`

**Mga literal:** String (`"value"` o `'value'`), number (`42`, `3.14`), boolean
(`true`, `false`), null (`null`).

Kapag ang isang `${ }` expression ang buong value, pinapanatili ang raw type
(number, boolean, object). Kapag hinaluan ng text, palaging string ang resulta.

## Kumpletong Halimbawa

Kinukuha ng workflow na ito ang isang GitHub issue, sinusummarize gamit ang LLM,
sine-save ang summary sa memory, at nagpapadala ng notification.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**Patakbuhin ito:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Mga Input at Output Transform

Kaya ng mga task na i-transform ang kanilang input bago ang execution at ang
kanilang output bago i-store ang mga resulta.

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — Expression o object mapping na pinapalitan ang input
  context ng task bago ang execution.
- **`output.from`** — Expression o object mapping na binabago ang anyo ng task
  result bago i-store sa data context.

## Flow Control

Puwedeng may kasamang `then` directive ang bawat task na kumokontrol kung ano
ang mangyayari pagkatapos:

- **`continue`** (default) — tumuloy sa susunod na task sa sequence
- **`end`** — ihinto agad ang workflow (status: completed)
- **Named task** — tumalon sa isang specific na task gamit ang pangalan

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## Conditional Execution

Puwedeng may kasamang `if` field ang kahit anong task. Nai-skip ang task kapag
ang condition ay nag-e-evaluate sa falsy.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Mga Sub-Workflow

Ang isang `run` task na may `workflow` target ay nag-e-execute ng isa pang
naka-save na workflow. Tumatakbo ang sub-workflow sa sarili nitong context at
ibinabalik ang output nito sa parent.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Puwedeng mag-nest ang mga sub-workflow ng hanggang **5 level ang lalim**.
Kapag lumampas sa limit na ito, magkakaroon ng error at hihinto ang execution.

## Classification at Seguridad

Bahagi ang mga workflow ng parehong classification system tulad ng lahat ng iba
pang data sa Triggerfish.

**Storage classification.** Kapag nag-save ka ng workflow gamit ang
`workflow_save`, sine-store ito sa taint level ng kasalukuyang session. Ang
workflow na na-save sa isang `CONFIDENTIAL` session ay maaari lamang i-load ng
mga session na `CONFIDENTIAL` o mas mataas.

**Classification ceiling.** Puwedeng mag-declare ang mga workflow ng
`classification_ceiling` sa kanilang YAML. Bago mag-execute ang bawat task,
chine-check ng engine na ang kasalukuyang taint ng session ay hindi lumalampas
sa ceiling. Kapag nag-escalate ang session taint na lampas sa ceiling habang
nag-e-execute (hal., sa pag-access ng classified data sa pamamagitan ng tool
call), hihinto ang workflow na may ceiling breach error.

```yaml
classification_ceiling: INTERNAL
```

Mga valid na value: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Run history.** Naka-store ang mga execution result kasama ang classification ng
session sa oras ng pagkumpleto. Nafi-filter ng `workflow_history` ang mga
resulta gamit ang `canFlowTo`, kaya makikita mo lang ang mga run na nasa o
mas mababa sa iyong kasalukuyang session taint.

::: danger SEGURIDAD
Kailangan ng workflow deletion na accessible ang workflow sa classification level
ng iyong kasalukuyang session. Hindi mo puwedeng i-delete ang isang workflow na
naka-store sa `CONFIDENTIAL` mula sa isang `PUBLIC` session. Lino-load muna ng
`workflow_delete` tool ang workflow at nagbabalik ng "not found" kapag nabigo ang
classification check.
:::

## Self-Healing

Puwedeng magkaroon ang mga workflow ng opsyonal na autonomous healing agent na
nagmo-monitor ng execution sa real time, nagdi-diagnose ng mga failure, at
nagpo-propose ng mga fix. Kapag naka-enable ang self-healing, isang lead agent
ang sine-spawn kasabay ng workflow run. Ino-observe nito ang bawat step event,
tini-triage ang mga failure, at kino-coordinate ang mga specialist team para
resolbahin ang mga isyu.

### Pag-enable ng Self-Healing

Magdagdag ng `self_healing` block sa `metadata.triggerfish` section ng workflow:

```yaml
document:
  dsl: "1.0"
  namespace: ops
  name: data-pipeline
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
do:
  - fetch-data:
      call: http
      with:
        endpoint: "https://api.example.com/data"
      metadata:
        description: "Fetch raw invoice data from billing API"
        expects: "API returns JSON array of invoice objects"
        produces: "Array of {id, amount, status, date} objects"
```

Kapag `enabled: true`, bawat step ay **kailangang** may tatlong metadata field:

| Field         | Description                                    |
| ------------- | ---------------------------------------------- |
| `description` | Ano ang ginagawa ng step at bakit ito umiiral  |
| `expects`     | Anyo ng input o mga precondition na kailangan ng step |
| `produces`    | Anyo ng output na ginagawa ng step             |

Rini-reject ng parser ang mga workflow kung saan may step na kulang sa mga field na ito.

### Mga Configuration Option

| Option                    | Type    | Default              | Description |
| ------------------------- | ------- | -------------------- | ----------- |
| `enabled`                 | boolean | —                    | Kailangan. Ine-enable ang healing agent. |
| `retry_budget`            | number  | `3`                  | Maximum na intervention attempt bago i-escalate bilang unresolvable. |
| `approval_required`       | boolean | `true`               | Kung kailangan ba ng human approval ang mga proposed workflow fix. |
| `pause_on_intervention`   | string  | `"blocking_only"`    | Kailan i-pause ang mga downstream task: `always`, `never`, o `blocking_only`. |
| `pause_timeout_seconds`   | number  | `300`                | Mga segundo ng paghihintay habang naka-pause bago mag-trigger ang timeout policy. |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| Ano ang mangyayari kapag nag-timeout: `escalate_and_halt`, `escalate_and_skip`, o `escalate_and_fail`. |
| `notify_on`               | array   | `[]`                 | Mga event na nagti-trigger ng notification: `intervention`, `escalation`, `approval_required`. |

### Paano Ito Gumagana

1. **Pag-observe.** Tumatanggap ang healing lead agent ng real-time stream ng
   mga step event (started, completed, failed, skipped) habang nag-e-execute
   ang workflow.

2. **Pag-triage.** Kapag nabigo ang isang step, tini-triage ng lead ang failure
   sa isa sa limang kategorya:

   | Kategorya             | Kahulugan                                        |
   | --------------------- | ------------------------------------------------ |
   | `transient_retry`     | Pansamantalang isyu (network error, rate limit, 503) |
   | `runtime_workaround`  | Unang beses na unknown error, puwedeng may workaround |
   | `structural_fix`      | Paulit-ulit na failure na nangangailangan ng pagbabago sa workflow definition |
   | `plugin_gap`          | Isyu sa auth/credential na nangangailangan ng bagong integration |
   | `unresolvable`        | Naubos na ang retry budget o fundamentally sira  |

3. **Mga specialist team.** Batay sa kategorya ng triage, sine-spawn ng lead ang
   isang team ng mga specialist agent (diagnostician, retry coordinator,
   definition fixer, plugin author, atbp.) para mag-imbestiga at resolbahin ang
   isyu.

4. **Mga version proposal.** Kapag kailangan ng structural fix, nagpo-propose
   ang team ng bagong workflow version. Kung `approval_required` ay true, ang
   proposal ay naghihintay ng human review sa pamamagitan ng
   `workflow_version_approve` o `workflow_version_reject`.

5. **Scoped pause.** Kapag naka-enable ang `pause_on_intervention`, ang mga
   downstream task lang ang napa-pause — patuloy na nag-e-execute ang mga
   independent branch.

### Mga Healing Tool

Apat na karagdagang tool ang available para sa pamamahala ng healing state:

| Tool                       | Description                                |
| -------------------------- | ------------------------------------------ |
| `workflow_version_list`    | I-list ang mga proposed/approved/rejected na version |
| `workflow_version_approve` | I-approve ang isang proposed version       |
| `workflow_version_reject`  | I-reject ang isang proposed version na may dahilan |
| `workflow_healing_status`  | Kasalukuyang healing status para sa isang workflow run |

### Seguridad

- Ang healing agent ay **hindi puwedeng baguhin ang sarili nitong `self_healing` config**. Rini-reject ang mga proposed version na nagbabago ng config block.
- Ang lead agent at lahat ng team member ay nag-i-inherit ng taint level ng workflow at nag-e-escalate nang sabay-sabay.
- Lahat ng agent action ay dumadaan sa standard policy hook chain — walang bypass.
- Ang mga proposed version ay naka-store sa classification level ng workflow.
