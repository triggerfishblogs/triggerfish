---
title: Workflow Troubleshooting
description: Triggerfish workflows ಜೊತೆ ಕೆಲಸ ಮಾಡುವಾಗ ಸಾಮಾನ್ಯ issues ಮತ್ತು solutions.
---

# Troubleshooting: Workflows

## "Workflow not found or not accessible"

Workflow exist ಮಾಡುತ್ತದೆ ಆದರೆ ನಿಮ್ಮ current session taint ಗಿಂತ ಹೆಚ್ಚಿನ classification level ನಲ್ಲಿ store ಮಾಡಲಾಗಿದೆ.

`CONFIDENTIAL` session ಸಮಯದಲ್ಲಿ save ಮಾಡಿದ Workflows `PUBLIC` ಅಥವಾ `INTERNAL` sessions ಗೆ invisible. Store ಪ್ರತಿ load ನಲ್ಲಿ `canFlowTo` checks ಬಳಸುತ್ತದೆ, ಮತ್ತು workflow ನ classification session taint exceed ಮಾಡಿದಾಗ `null` return ಮಾಡುತ್ತದೆ ("not found" ಆಗಿ ತೋರಿಸಲಾಗುತ್ತದೆ).

**Fix:** Classified data ಮೊದಲು access ಮಾಡಿ session taint escalate ಮಾಡಿ, ಅಥವಾ content permit ಮಾಡಿದರೆ lower-classification session ನಿಂದ workflow ಮತ್ತೆ save ಮಾಡಿ.

**Verify:** ನಿಮ್ಮ current classification level ನಲ್ಲಿ ಯಾವ workflows visible ಎಂದು ನೋಡಲು `workflow_list` ಚಲಾಯಿಸಿ. Expect ಮಾಡಿದ workflow missing ಆಗಿದ್ದರೆ, ಅದನ್ನು higher level ನಲ್ಲಿ save ಮಾಡಲಾಗಿದೆ.

---

## "Workflow classification ceiling breached"

Session ನ taint level workflow ನ `classification_ceiling` exceed ಮಾಡಿದೆ. ಈ check ಪ್ರತಿ task ಮೊದಲು ಚಲಿಸುತ್ತದೆ, ಆದ್ದರಿಂದ earlier task session taint escalate ಮಾಡಿದ್ದರೆ mid-execution ಲ್ಲಿ trigger ಮಾಡಬಹುದು.

ಉದಾಹರಣೆಗೆ, `classification_ceiling: INTERNAL` ಹೊಂದಿದ workflow, `triggerfish:memory` call `CONFIDENTIAL` data retrieve ಮಾಡಿ session taint escalate ಮಾಡಿದ್ದರೆ halt ಮಾಡುತ್ತದೆ.

**Fix:**

- Expected data sensitivity match ಮಾಡಲು workflow ನ `classification_ceiling` raise ಮಾಡಿ.
- ಅಥವಾ classified data access ಮಾಡದಂತೆ workflow restructure ಮಾಡಿ. Classified memory read ಮಾಡುವ ಬದಲು input parameters ಬಳಸಿ.

---

## YAML Parse Errors

### "YAML parse error: ..."

ಸಾಮಾನ್ಯ YAML syntax mistakes:

**Indentation.** YAML whitespace-sensitive. Tabs ಅಲ್ಲ, spaces ಬಳಸಿ. ಪ್ರತಿ nesting level ಸಂಪೂರ್ಣ 2 spaces ಇರಬೇಕು.

```yaml
# ತಪ್ಪು — tabs ಅಥವಾ inconsistent indent
do:
- fetch:
      call: http

# ಸರಿ
do:
  - fetch:
      call: http
```

**Expressions ಸುತ್ತ missing quotes.** `${ }` ಒಳಗೊಂಡ Expression strings quote ಮಾಡಬೇಕು, ಇಲ್ಲದಿದ್ದರೆ YAML `{` ಅನ್ನು inline mapping ಎಂದು interpret ಮಾಡುತ್ತದೆ.

```yaml
# ತಪ್ಪು — YAML parse error
endpoint: ${ .config.url }

# ಸರಿ
endpoint: "${ .config.url }"
```

**Missing `document` block.** ಪ್ರತಿ workflow `dsl`, `namespace`, ಮತ್ತು `name` ಜೊತೆ `document` field ಹೊಂದಿರಬೇಕು:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

YAML successfully parse ಆಯಿತು ಆದರೆ result scalar ಅಥವಾ array, object ಅಲ್ಲ. ನಿಮ್ಮ YAML top-level keys (`document`, `do`) ಹೊಂದಿದೆ ಎಂದು check ಮಾಡಿ.

### "Task has no recognized type"

ಪ್ರತಿ task entry ಒಂದೇ type key ಒಳಗೊಂಡಿರಬೇಕು: `call`, `run`, `set`, `switch`, `for`, `raise`, `emit`, ಅಥವಾ `wait`. Parser ಇವ್ಯಾವುದನ್ನೂ ಕಂಡುಹಿಡಿಯದಿದ್ದರೆ unrecognized type ಎಂದು report ಮಾಡುತ್ತದೆ.

ಸಾಮಾನ್ಯ ಕಾರಣ: task type name ನಲ್ಲಿ typo (ಉದಾ., `call` ಬದಲಾಗಿ `calls`).

---

## Expression Evaluation Failures

### ತಪ್ಪಾದ ಅಥವಾ empty values

Expressions `${ .path.to.value }` syntax ಬಳಸುತ್ತವೆ. Leading dot ಅಗತ್ಯ — ಇದು path ಅನ್ನು workflow ನ data context root ಗೆ anchor ಮಾಡುತ್ತದೆ.

```yaml
# ತಪ್ಪು — leading dot missing
value: "${ result.name }"

# ಸರಿ
value: "${ .result.name }"
```

### Output ನಲ್ಲಿ "undefined"

Dot-path ಯಾವುದಕ್ಕೂ resolve ಮಾಡಲಿಲ್ಲ. ಸಾಮಾನ್ಯ ಕಾರಣಗಳು:

- **ತಪ್ಪಾದ task name.** ಪ್ರತಿ task ತನ್ನ result ಅನ್ನು ತನ್ನ ಹೆಸರಿನ ಅಡಿ store ಮಾಡುತ್ತದೆ. Task `fetch_data` ಎಂದು named ಆದರೆ, result `${ .fetch_data }` ಆಗಿ reference ಮಾಡಿ, `${ .data }` ಅಥವಾ `${ .result }` ಅಲ್ಲ.
- **ತಪ್ಪಾದ nesting.** HTTP call `{"data": {"items": [...]}}` return ಮಾಡಿದ್ದರೆ, items `${ .fetch_data.data.items }` ನಲ್ಲಿವೆ.
- **Array indexing.** Bracket syntax ಬಳಸಿ: `${ .items[0].name }`. Dot-only paths numeric indices support ಮಾಡುವುದಿಲ್ಲ.

### Boolean conditions ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ

Expression comparisons strict (`===`). Types match ಆಗುತ್ತವೆ ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ:

```yaml
# .count string "0" ಆದರೆ ಇದು fail ಮಾಡುತ್ತದೆ
if: "${ .count == 0 }"

# .count number ಆದಾಗ ಕೆಲಸ ಮಾಡುತ್ತದೆ
if: "${ .count == 0 }"
```

Upstream tasks strings ಅಥವಾ numbers return ಮಾಡುತ್ತವೆ ಎಂದು check ಮಾಡಿ. HTTP responses ಸಾಮಾನ್ಯವಾಗಿ string values return ಮಾಡುತ್ತವೆ — string form ಜೊತೆ compare ಮಾಡಿ.

---

## HTTP Call Failures

### Timeouts

HTTP calls `web_fetch` tool ಮೂಲಕ ಹೋಗುತ್ತವೆ. Target server ನಿಧಾನ ಆದರೆ request time out ಮಾಡಬಹುದು. Workflow DSL ನಲ್ಲಿ HTTP calls ಗಾಗಿ per-task timeout override ಇಲ್ಲ — `web_fetch` tool ನ default timeout apply ಆಗುತ್ತದೆ.

### SSRF blocks

Triggerfish ನ ಎಲ್ಲ outbound HTTP ಮೊದಲು DNS resolve ಮಾಡಿ resolved IP ಅನ್ನು hardcoded denylist ಜೊತೆ check ಮಾಡುತ್ತದೆ. Private ಮತ್ತು reserved IP ranges ಯಾವಾಗಲೂ block ಮಾಡಲಾಗುತ್ತವೆ.

ನಿಮ್ಮ workflow private IP ನ internal service call ಮಾಡಿದ್ದರೆ (ಉದಾ., `http://192.168.1.100/api`), SSRF prevention ಮೂಲಕ block ಮಾಡಲಾಗುತ್ತದೆ. ಇದು by design ಆಗಿದ್ದು configure ಮಾಡಲಾಗುವುದಿಲ್ಲ.

**Fix:** Public IP ಗೆ resolve ಮಾಡುವ public hostname ಬಳಸಿ, ಅಥವಾ direct access ಇರುವ MCP server ಮೂಲಕ route ಮಾಡಲು `triggerfish:mcp` ಬಳಸಿ.

### Missing headers

`http` call type `with.headers` ಅನ್ನು directly request headers ಗೆ map ಮಾಡುತ್ತದೆ. API ಗೆ authentication ಅಗತ್ಯ ಆದರೆ header include ಮಾಡಿ:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Token value workflow input ನಲ್ಲಿ provide ಮಾಡಲಾಗಿದೆ ಅಥವಾ prior task set ಮಾಡಿದೆ ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ.

---

## Sub-Workflow Recursion Limit

### "Workflow recursion depth exceeded maximum of 5"

Sub-workflows 5 levels deep ತನಕ nest ಮಾಡಬಹುದು. Workflow A, workflow B ಅನ್ನು call ಮಾಡಿ B ಮತ್ತೆ A ಅನ್ನು call ಮಾಡಿದಾಗ infinite recursion ತಡೆಯಲು ಈ limit.

**Fix:**

- Workflow chain flatten ಮಾಡಿ. Steps ಅನ್ನು ಕಡಿಮೆ workflows ನಲ್ಲಿ combine ಮಾಡಿ.
- ಎರಡು workflows ಒಂದನ್ನೊಂದು call ಮಾಡುವ circular references ಗಾಗಿ check ಮಾಡಿ.

---

## Shell Execution Disabled

### "Shell execution failed" ಅಥವಾ run tasks ನಿಂದ empty result

Workflow tool context ನ `allowShellExecution` flag `shell` ಅಥವಾ `script` targets ಜೊತೆ `run` tasks permit ಮಾಡುತ್ತದೆ ಎಂದು control ಮಾಡುತ್ತದೆ. Disabled ಆದಾಗ ಈ tasks fail ಮಾಡುತ್ತವೆ.

**Fix:** ನಿಮ್ಮ Triggerfish configuration ನಲ್ಲಿ shell execution enable ಆಗಿದೆ ಎಂದು check ಮಾಡಿ. Production environments ನಲ್ಲಿ shell execution security ಗಾಗಿ intentionally disabled ಮಾಡಿರಬಹುದು.

---

## Workflow ಚಲಿಸಿದರೂ ತಪ್ಪಾದ Output ಬರುತ್ತದೆ

### `workflow_history` ಜೊತೆ Debugging

Past runs inspect ಮಾಡಲು `workflow_history` ಬಳಸಿ:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

ಪ್ರತಿ history entry ಒಳಗೊಂಡಿದೆ:

- **status** — `completed` ಅಥವಾ `failed`
- **error** — fail ಆದರೆ error message
- **taskCount** — workflow ನ tasks ಸಂಖ್ಯೆ
- **startedAt / completedAt** — timing information

### Context flow ಪರಿಶೀಲಿಸುವುದು

ಪ್ರತಿ task ತನ್ನ result ಅನ್ನು task ನ ಹೆಸರಿನ ಅಡಿ data context ನಲ್ಲಿ store ಮಾಡುತ್ತದೆ. `fetch`, `transform`, ಮತ್ತು `save` ಹೆಸರಿನ tasks ಇದ್ದರೆ, ಮೂರೂ tasks ನಂತರ data context:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

ಸಾಮಾನ್ಯ mistakes:

- **Context overwrite ಮಾಡುವುದು.** ಈಗಾಗಲೇ exist ಮಾಡುವ key ಗೆ assign ಮಾಡುವ `set` task ಹಿಂದಿನ value replace ಮಾಡುತ್ತದೆ.
- **ತಪ್ಪಾದ task reference.** Task `step_1` ಎಂದು named ಆದ್ದನ್ನು `${ .step1 }` ಎಂದು reference ಮಾಡುವುದು.
- **Input transform ಮೂಲಕ context replace ಮಾಡುವುದು.** `input.from` directive task ನ input context ಸಂಪೂರ್ಣ replace ಮಾಡುತ್ತದೆ. `input.from: "${ .config }"` ಬಳಸಿದರೆ, task ಕೇವಲ `config` object ನೋಡುತ್ತದೆ, full context ಅಲ್ಲ.

### Missing output

Workflow complete ಆಯಿತು ಆದರೆ empty output return ಮಾಡಿದರೆ, final task ನ result ಅಪೇಕ್ಷಿತ ಎಂದು check ಮಾಡಿ. Workflow output ಅನ್ನು completion ನಲ್ಲಿ full data context ಆಗಿ return ಮಾಡಲಾಗುತ್ತದೆ, internal keys filter out ಮಾಡಿ.

---

## `workflow_delete` ನಲ್ಲಿ "Permission denied"

`workflow_delete` tool ಮೊದಲು session ನ current taint level ಬಳಸಿ workflow load ಮಾಡುತ್ತದೆ. Workflow ನಿಮ್ಮ session taint exceed ಮಾಡುವ classification level ನಲ್ಲಿ save ಮಾಡಲಾಗಿದ್ದರೆ, load null return ಮಾಡಿ `workflow_delete` "permission denied" ಬದಲಾಗಿ "not found" report ಮಾಡುತ್ತದೆ.

ಇದು intentional — classified workflows ನ existence lower-classification sessions ಗೆ disclose ಮಾಡಲಾಗುವುದಿಲ್ಲ.

**Fix:** Delete ಮಾಡುವ ಮೊದಲು workflow ನ classification level match ಅಥವಾ exceed ಮಾಡಲು session taint escalate ಮಾಡಿ. ಅಥವಾ originally save ಮಾಡಿದ ಅದೇ session type ನಿಂದ delete ಮಾಡಿ.

---

## Self-Healing

### "Step metadata missing on task 'X': self-healing requires description, expects, produces"

`self_healing.enabled` `true` ಆದಾಗ, ಪ್ರತಿ task ಮೂರೂ metadata fields ಹೊಂದಿರಬೇಕು. ಯಾವುದಾದರೂ missing ಆದರೆ parser save ಸಮಯದಲ್ಲಿ workflow reject ಮಾಡುತ್ತದೆ.

**Fix:** ಪ್ರತಿ task ನ `metadata` block ಗೆ `description`, `expects`, ಮತ್ತು `produces` add ಮಾಡಿ:

```yaml
- my-task:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "ಈ step ಏನು ಮಾಡುತ್ತದೆ ಮತ್ತು ಏಕೆ"
      expects: "ಈ step ಗೆ input ಆಗಿ ಏನು ಬೇಕು"
      produces: "ಈ step output ಆಗಿ ಏನು ಕೊಡುತ್ತದೆ"
```

---

### "Self-healing config mutation rejected in version proposal"

Healing agent `self_healing` config block modify ಮಾಡುವ ಹೊಸ workflow version propose ಮಾಡಿದೆ. ಇದು prohibited — agent ತನ್ನ ಸ್ವಂತ healing configuration change ಮಾಡಲಾಗುವುದಿಲ್ಲ.

ಇದು intended ಆಗಿ ಕೆಲಸ ಮಾಡುತ್ತಿದೆ. `self_healing` config ಅನ್ನು ಕೇವಲ humans `workflow_save` ಮೂಲಕ directly ಹೊಸ workflow version save ಮಾಡಿ modify ಮಾಡಬಹುದು.

---

### Healing agent spawn ಆಗುತ್ತಿಲ್ಲ

Workflow ಚಲಿಸುತ್ತದೆ ಆದರೆ healing agent ಕಾಣಿಸುತ್ತಿಲ್ಲ. Check ಮಾಡಿ:

1. `metadata.triggerfish.self_healing` ನಲ್ಲಿ **`enabled` `true` ಆಗಿದೆ**.
2. **Config ಸರಿಯಾದ location ನಲ್ಲಿ ಇದೆ** — `metadata.triggerfish.self_healing` ಅಡಿ nested ಆಗಿರಬೇಕು, top level ನಲ್ಲಿ ಅಲ್ಲ.
3. **ಎಲ್ಲ steps metadata ಹೊಂದಿವೆ** — save ಸಮಯದಲ್ಲಿ validation fail ಆದರೆ, workflow self-healing enable ಇಲ್ಲದೆ save ಮಾಡಲಾಗಿದೆ.

---

### Proposed fixes pending ನಲ್ಲಿ stuck ಆಗಿವೆ

`approval_required` `true` ಆದರೆ (default), proposed versions human review ಗಾಗಿ ಕಾಯುತ್ತವೆ. Pending proposals ನೋಡಲು `workflow_version_list` ಮತ್ತು act ಮಾಡಲು `workflow_version_approve` ಅಥವಾ `workflow_version_reject` ಬಳಸಿ.

---

### "Retry budget exhausted" / Unresolvable escalation

Healing agent ತನ್ನ ಎಲ್ಲ intervention attempts (default 3) ಖರ್ಚು ಮಾಡಿ issue resolve ಮಾಡಲಾಗಲಿಲ್ಲ. `unresolvable` ಆಗಿ escalate ಮಾಡಿ fixes attempt ಮಾಡುವುದನ್ನು ನಿಲ್ಲಿಸುತ್ತದೆ.

**Fix:**

- ಯಾವ interventions try ಮಾಡಲಾಯಿತು ಎಂದು ನೋಡಲು `workflow_healing_status` check ಮಾಡಿ.
- Underlying issue manually review ಮಾಡಿ fix ಮಾಡಿ.
- ಹೆಚ್ಚಿನ attempts allow ಮಾಡಲು, self-healing config ನಲ್ಲಿ `retry_budget` ಹೆಚ್ಚಿಸಿ workflow ಮತ್ತೆ save ಮಾಡಿ.
