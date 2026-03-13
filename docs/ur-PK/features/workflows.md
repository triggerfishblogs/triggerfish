---
title: Workflows
description: Triggerfish میں built-in CNCF Serverless Workflow DSL engine کے ساتھ multi-step tasks automate کریں۔
---

# Workflows

Triggerfish میں [CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification)
کے لیے built-in execution engine شامل ہے۔ Workflows آپ کو YAML میں deterministic،
multi-step automations define کرنے دیتے ہیں جو execution کے دوران **LLM کے بغیر**
چلتے ہیں۔ ایجنٹ workflows بناتا اور trigger کرتا ہے، لیکن engine actual task
dispatch، branching، looping، اور data flow handle کرتا ہے۔

## Workflows کب استعمال کریں

**Workflows** repeatable، deterministic sequences کے لیے استعمال کریں جہاں آپ
advance میں steps جانتے ہوں: API سے data fetch کریں، transform کریں، memory میں
save کریں، notification بھیجیں۔ ایک ہی input ہمیشہ ایک ہی output produce کرتا ہے۔

**Agent directly** open-ended reasoning، exploration، یا ایسے tasks کے لیے
استعمال کریں جہاں اگلا step judgment پر depend کرے: topic research، code لکھنا،
problem troubleshoot کرنا۔

ایک اچھا rule of thumb: اگر آپ خود کو ایجنٹ سے ایک ہی multi-step sequence
بار بار کروانے کا پوچھتے ہوئے پائیں، اسے workflow میں turn کریں۔

::: info Availability
Workflows تمام plans پر available ہیں۔ اپنی API keys چلانے والے open source users
کو workflow engine تک مکمل رسائی ہے — workflow کے اندر ہر `triggerfish:llm` یا
`triggerfish:agent` call آپ کے configured provider سے inference consume کرتی ہے۔
:::

## Tools

### `workflow_save`

Workflow definition parse، validate، اور store کریں۔ Workflow موجودہ session کی
classification level پر save ہوتا ہے۔

| Parameter     | Type   | ضروری | تفصیل                       |
| ------------- | ------ | :---: | ---------------------------- |
| `name`        | string | ہاں   | Workflow کا name             |
| `yaml`        | string | ہاں   | YAML workflow definition     |
| `description` | string | نہیں  | Workflow کیا کرتا ہے        |

### `workflow_run`

Name یا inline YAML سے workflow execute کریں۔ Execution output اور status واپس
کرتا ہے۔

| Parameter | Type   | ضروری | تفصیل                                               |
| --------- | ------ | :---: | ---------------------------------------------------- |
| `name`    | string | نہیں  | Execute کرنے کے لیے saved workflow کا name          |
| `yaml`    | string | نہیں  | Inline YAML definition (saved استعمال نہ کرتے وقت) |
| `input`   | string | نہیں  | Workflow کے لیے input data کی JSON string           |

`name` یا `yaml` میں سے ایک ضروری ہے۔

### `workflow_list`

موجودہ classification level پر accessible تمام saved workflows list کریں۔ کوئی
parameters نہیں۔

### `workflow_get`

Name سے saved workflow definition retrieve کریں۔

| Parameter | Type   | ضروری | تفصیل                           |
| --------- | ------ | :---: | -------------------------------- |
| `name`    | string | ہاں   | Retrieve کرنے والے workflow کا name |

### `workflow_delete`

Name سے saved workflow delete کریں۔ Workflow موجودہ session کی classification
level پر accessible ہونی چاہیے۔

| Parameter | Type   | ضروری | تفصیل                         |
| --------- | ------ | :---: | ------------------------------ |
| `name`    | string | ہاں   | Delete کرنے والے workflow کا name |

### `workflow_history`

گزشتہ workflow execution results دیکھیں، اختیاری طور پر workflow name سے filter
کریں۔

| Parameter       | Type   | ضروری | تفصیل                                    |
| --------------- | ------ | :---: | ----------------------------------------- |
| `workflow_name` | string | نہیں  | Workflow name سے results filter کریں     |
| `limit`         | string | نہیں  | زیادہ سے زیادہ نتائج کی تعداد (ڈیفالٹ 10) |

## Task Types

Workflows `do:` block میں tasks سے composed ہیں۔ ہر task type-specific body کے
ساتھ ایک named entry ہے۔ Triggerfish 8 task types support کرتا ہے۔

### `call` — External Calls

HTTP endpoints یا Triggerfish services کو dispatch کریں۔

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

`call` field dispatch target determine کرتا ہے۔ مکمل mapping کے لیے
[Call Dispatch](#call-dispatch) دیکھیں۔

### `run` — Shell, Script, یا Sub-Workflow

Shell command، inline script، یا دوسرا saved workflow execute کریں۔

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
Shell اور script execution کے لیے workflow tool context میں `allowShellExecution`
flag enable ہونا ضروری ہے۔ Disabled ہونے پر، `shell` یا `script` targets والے run
tasks fail ہو جائیں گے۔
:::

### `set` — Data Context Mutations

Workflow کے data context کو values assign کریں۔ Expressions support کرتا ہے۔

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Conditional Branching

Conditions کی بنیاد پر branch کریں۔ ہر case میں `when` expression اور `then`
flow directive ہوتی ہے۔ بغیر `when` والا case default کا کام کرتا ہے۔

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — Iteration

Collection پر loop کریں، ہر item کے لیے nested `do:` block execute کریں۔

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

`each` field loop variable name کرتا ہے، `in` collection reference کرتا ہے، اور
optional `at` field current index فراہم کرتا ہے۔

### `raise` — Halt with Error

Structured error کے ساتھ execution stop کریں۔

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

### `emit` — Record Events

Workflow event record کریں۔ Events run result میں capture ہوتے ہیں اور
`workflow_history` کے ذریعے review کیے جا سکتے ہیں۔

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

### `wait` — Sleep

ISO 8601 duration کے لیے execution pause کریں۔

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Call Dispatch

Call task میں `call` field determine کرتا ہے کہ کون سا Triggerfish tool invoke
ہوگا۔

| Call type              | Triggerfish tool | ضروری `with:` fields                       |
| ---------------------- | ---------------- | ------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` (یا `url`)، `method`            |
| `triggerfish:llm`      | `llm_task`       | `prompt` (یا `task`)                       |
| `triggerfish:agent`    | `subagent`       | `prompt` (یا `task`)                       |
| `triggerfish:memory`   | `memory_*`       | `operation` + operation-specific fields    |
| `triggerfish:web_search` | `web_search`   | `query`                                     |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`                                       |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`، `tool`، `arguments`    |
| `triggerfish:message`  | `send_message`   | `channel`، `text`                          |

**Memory operations:** `triggerfish:memory` call type کو `operation` field
`save`، `search`، `get`، `list`، یا `delete` میں سے ایک پر set ہونا ضروری ہے۔
باقی `with:` fields directly corresponding memory tool کو pass ہوتی ہیں۔

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**MCP calls:** `triggerfish:mcp` call type کسی بھی connected MCP server tool کو
route کرتا ہے۔ `server` name، `tool` name، اور `arguments` object specify کریں۔

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Expressions

Workflow expressions workflow کے data context کے خلاف dot-path resolution کے ساتھ
`${ }` syntax استعمال کرتے ہیں۔

```yaml
# Simple value reference
url: "${ .config.api_url }"

# Array indexing
first_item: "${ .results[0].name }"

# String interpolation (ایک string میں multiple expressions)
message: "Found ${ .count } issues in ${ .repo }"

# Comparison (boolean واپس کرتا ہے)
if: "${ .status == 'open' }"

# Arithmetic
total: "${ .price * .quantity }"
```

**Support کردہ operators:**

- Comparison: `==`، `!=`، `>`، `<`، `>=`، `<=`
- Arithmetic: `+`، `-`، `*`، `/`، `%`

**Literals:** String (`"value"` یا `'value'`)، number (`42`، `3.14`)، boolean
(`true`، `false`)، null (`null`)۔

جب `${ }` expression پوری value ہو، raw type preserve ہوتا ہے (number، boolean،
object)۔ Text کے ساتھ mixed ہونے پر، نتیجہ ہمیشہ string ہوتا ہے۔

## Complete Example

یہ workflow GitHub issue fetch کرتا ہے، LLM سے summarize کرتا ہے، summary memory
میں save کرتا ہے، اور notification بھیجتا ہے۔

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

**چلائیں:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Input اور Output Transforms

Tasks execution سے پہلے اپنا input اور results store ہونے سے پہلے اپنا output
transform کر سکتے ہیں۔

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

- **`input.from`** — Expression یا object mapping جو execution سے پہلے task کا
  input context replace کرتا ہے۔
- **`output.from`** — Expression یا object mapping جو data context میں store ہونے
  سے پہلے task result reshape کرتا ہے۔

## Flow Control

ہر task ایک `then` directive شامل کر سکتا ہے جو control کرے کہ آگے کیا ہوگا:

- **`continue`** (ڈیفالٹ) — sequence میں اگلے task پر آگے بڑھیں
- **`end`** — فوری workflow stop کریں (status: completed)
- **Named task** — نام سے مخصوص task پر jump کریں

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

کوئی بھی task `if` field شامل کر سکتا ہے۔ جب condition falsy evaluate ہو تو task
skip ہو جاتا ہے۔

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Sub-Workflows

`workflow` target والا `run` task دوسرا saved workflow execute کرتا ہے۔ Sub-workflow
اپنے context کے ساتھ چلتا ہے اور parent کو اپنا output واپس کرتا ہے۔

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Sub-workflows **5 levels deep** تک nest کر سکتے ہیں۔ اس limit سے تجاوز کرنا error
produce کرتا ہے اور execution halt کرتا ہے۔

## Classification اور Security

Workflows Triggerfish کے تمام دوسرے data کی طرح classification system میں
participate کرتے ہیں۔

**Storage classification۔** جب آپ `workflow_save` سے workflow save کریں، یہ
موجودہ session کے taint level پر store ہوتا ہے۔ `CONFIDENTIAL` session کے دوران
save ہونے والا workflow صرف `CONFIDENTIAL` یا اوپر کی sessions load کر سکتی ہیں۔

**Classification ceiling۔** Workflows اپنے YAML میں `classification_ceiling` declare
کر سکتے ہیں۔ ہر task execute ہونے سے پہلے، engine check کرتا ہے کہ session کا
موجودہ taint ceiling سے تجاوز نہ کرے۔ اگر execution کے دوران session taint ceiling
سے آگے escalate ہو (مثلاً، tool call کے ذریعے classified data access کر کے)، تو
workflow ceiling breach error کے ساتھ halt ہو جاتا ہے۔

```yaml
classification_ceiling: INTERNAL
```

Valid values: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`۔

**Run history۔** Execution results completion کے وقت session کی classification کے
ساتھ store ہوتے ہیں۔ `workflow_history` `canFlowTo` سے results filter کرتا ہے،
اس لیے آپ صرف وہی runs دیکھتے ہیں جو آپ کے موجودہ session taint پر یا نیچے ہیں۔

::: danger SECURITY
Workflow deletion کے لیے ضروری ہے کہ workflow آپ کی موجودہ session کی classification
level پر accessible ہو۔ آپ `PUBLIC` session سے `CONFIDENTIAL` پر store workflow
delete نہیں کر سکتے۔ `workflow_delete` tool پہلے workflow load کرتا ہے اور
classification check fail ہونے پر "not found" واپس کرتا ہے۔
:::

## Self-Healing

Workflows کے پاس اختیاری autonomous healing agent ہو سکتا ہے جو real time میں
execution observe کرتا ہے، failures diagnose کرتا ہے، اور fixes propose کرتا ہے۔
Self-healing enable ہونے پر، workflow run کے ساتھ lead agent spawn ہوتا ہے۔ یہ
ہر step event observe کرتا ہے، failures triage کرتا ہے، اور issues resolve کرنے
کے لیے specialist teams coordinate کرتا ہے۔

### Self-Healing Enable کرنا

Workflow کے `metadata.triggerfish` section میں `self_healing` block شامل کریں:

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

`enabled: true` ہونے پر، ہر step کو **تین** metadata fields **لازمی** ہونی
چاہیے:

| Field         | تفصیل                                              |
| ------------- | --------------------------------------------------- |
| `description` | Step کیا کرتا ہے اور کیوں موجود ہے                |
| `expects`     | Input shape یا preconditions جو step کو چاہیے      |
| `produces`    | Output shape جو step generate کرتا ہے              |

Parser ان workflows کو reject کرتا ہے جہاں کسی step میں یہ fields missing ہوں۔

### Configuration Options

| Option                    | Type    | ڈیفالٹ              | تفصیل |
| ------------------------- | ------- | -------------------- | ------ |
| `enabled`                 | boolean | —                    | ضروری۔ Healing agent enable کرتا ہے |
| `retry_budget`            | number  | `3`                  | Unresolvable کے طور پر escalate ہونے سے پہلے intervention attempts کی زیادہ سے زیادہ تعداد |
| `approval_required`       | boolean | `true`               | آیا proposed workflow fixes کو human approval درکار ہے |
| `pause_on_intervention`   | string  | `"blocking_only"`    | Downstream tasks کب pause کریں: `always`، `never`، یا `blocking_only` |
| `pause_timeout_seconds`   | number  | `300`                | Timeout policy trigger ہونے سے پہلے pause کے دوران wait کرنے کے سیکنڈ |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| Timeout پر کیا ہو: `escalate_and_halt`، `escalate_and_skip`، یا `escalate_and_fail` |
| `notify_on`               | array   | `[]`                 | Notifications trigger کرنے والے events: `intervention`، `escalation`، `approval_required` |

### یہ کیسے کام کرتا ہے

1. **Observation۔** Healing lead agent workflow execute ہوتے وقت real-time stream
   of step events (started، completed، failed، skipped) receive کرتا ہے۔

2. **Triage۔** جب step fail ہو، lead failure کو پانچ categories میں triage کرتا ہے:

   | Category              | مطلب                                                     |
   | --------------------- | --------------------------------------------------------- |
   | `transient_retry`     | Temporary issue (network error، rate limit، 503)         |
   | `runtime_workaround`  | پہلی بار unknown error، workaround ممکن ہو                |
   | `structural_fix`      | Recurring failure جسے workflow definition change چاہیے   |
   | `plugin_gap`          | Auth/credential issue جسے نئی integration چاہیے          |
   | `unresolvable`        | Retry budget ختم یا fundamentally broken                 |

3. **Specialist teams۔** Triage category کی بنیاد پر، lead specialist agents کی
   team spawn کرتا ہے (diagnostician، retry coordinator، definition fixer، plugin
   author، وغیرہ) issue investigate اور resolve کرنے کے لیے۔

4. **Version proposals۔** جب structural fix درکار ہو، team نیا workflow version
   propose کرتی ہے۔ اگر `approval_required` true ہو، proposal `workflow_version_approve`
   یا `workflow_version_reject` کے ذریعے human review کا انتظار کرتی ہے۔

5. **Scoped pause۔** `pause_on_intervention` enable ہونے پر، صرف downstream tasks
   pause ہوتے ہیں — independent branches execute ہوتی رہتی ہیں۔

### Healing Tools

Healing state manage کرنے کے لیے چار additional tools available ہیں:

| Tool                       | تفصیل                                              |
| -------------------------- | --------------------------------------------------- |
| `workflow_version_list`    | Proposed/approved/rejected versions list کریں      |
| `workflow_version_approve` | Proposed version approve کریں                      |
| `workflow_version_reject`  | Proposed version reason کے ساتھ reject کریں       |
| `workflow_healing_status`  | Workflow run کے لیے current healing status         |

### Security

- Healing agent **اپنا `self_healing` config modify نہیں کر سکتا**۔ Config block
  alter کرنے والے proposed versions reject ہوتے ہیں۔
- Lead agent اور تمام team members workflow کے taint level inherit کرتے ہیں اور
  lockstep میں escalate ہوتے ہیں۔
- تمام agent actions standard policy hook chain سے گزرتے ہیں — کوئی bypass نہیں۔
- Proposed versions workflow کی classification level پر store ہوتے ہیں۔
