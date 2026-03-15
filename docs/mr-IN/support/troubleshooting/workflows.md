---
title: Workflow Troubleshooting
description: Triggerfish workflows सह काम करताना common issues आणि solutions.
---

# Troubleshooting: Workflows

## "Workflow not found or not accessible"

Workflow exist करतो पण तुमच्या current session taint पेक्षा higher classification level वर stored आहे.

`CONFIDENTIAL` session दरम्यान saved workflows `PUBLIC` किंवा `INTERNAL` sessions ला invisible असतात. Store प्रत्येक load वर `canFlowTo` checks वापरतो, आणि workflow चे classification session taint exceed केल्यास `null` returns (जे "not found" म्हणून surfaced होते).

**Fix:** Classified data access करून आधी session taint escalate करा, किंवा content allow करत असल्यास lower-classification session मधून workflow re-save करा.

**Verify:** तुमच्या current classification level वर कोणते workflows visible आहेत ते पाहण्यासाठी `workflow_list` run करा. Expected workflow missing असल्यास, ते higher level वर saved झाले होते.

---

## "Workflow classification ceiling breached"

Session चे taint level workflow च्या `classification_ceiling` पेक्षा जास्त आहे. हे check प्रत्येक task पूर्वी run होतो, त्यामुळे earlier task ने session taint escalate केल्यास ते mid-execution trigger होऊ शकते.

उदाहरणार्थ, `classification_ceiling: INTERNAL` असलेला workflow halt होईल जर `triggerfish:memory` call ने `CONFIDENTIAL` data retrieve केला ज्याने session taint escalate केली.

**Fix:**

- Workflow चे `classification_ceiling` expected data sensitivity शी match करण्यासाठी raise करा.
- किंवा workflow restructure करा जेणेकरून classified data access नाही केला जाईल. त्याऐवजी classified memory read करण्याऐवजी input parameters वापरा.

---

## YAML Parse Errors

### "YAML parse error: ..."

Common YAML syntax mistakes:

**Indentation.** YAML whitespace-sensitive आहे. Spaces वापरा, tabs नाही. प्रत्येक nesting level exactly 2 spaces असायला हवे.

```yaml
# चुकीचे — tabs किंवा inconsistent indent
do:
- fetch:
      call: http

# बरोबर
do:
  - fetch:
      call: http
```

**Expressions भोवती missing quotes.** `${ }` असलेल्या expression strings quoted असणे आवश्यक आहे, अन्यथा YAML `{` ला inline mapping म्हणून interpret करतो.

```yaml
# चुकीचे — YAML parse error
endpoint: ${ .config.url }

# बरोबर
endpoint: "${ .config.url }"
```

**Missing `document` block.** प्रत्येक workflow ला `dsl`, `namespace`, आणि `name` सह `document` field असणे आवश्यक आहे:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

YAML successfully parsed पण result scalar किंवा array आहे, object नाही. तुमच्या YAML ला top-level keys (`document`, `do`) असल्याची खात्री करा.

### "Task has no recognized type"

प्रत्येक task entry मध्ये exactly एक type key असणे आवश्यक आहे: `call`, `run`, `set`, `switch`, `for`, `raise`, `emit`, किंवा `wait`. Parser यापैकी कोणतेही सापडत नसल्यास, unrecognized type report करतो.

Common cause: task type name मध्ये typo (उदा. `call` ऐवजी `calls`).

---

## Expression Evaluation Failures

### चुकीचे किंवा empty values

Expressions `${ .path.to.value }` syntax वापरतात. Leading dot required आहे -- ते workflow च्या data context root ला path anchor करतो.

```yaml
# चुकीचे — leading dot missing
value: "${ result.name }"

# बरोबर
value: "${ .result.name }"
```

### Output मध्ये "undefined"

Dot-path काहीही resolve नाही झाला. Common causes:

- **चुकीचे task name.** प्रत्येक task आपला result स्वतःच्या नावाखाली store करतो. तुमचा task `fetch_data` नाव असल्यास, result `${ .fetch_data }` म्हणून reference करा, `${ .data }` किंवा `${ .result }` नाही.
- **चुकीचे nesting.** HTTP call `{"data": {"items": [...]}}` return करत असल्यास, items `${ .fetch_data.data.items }` वर आहेत.
- **Array indexing.** Bracket syntax वापरा: `${ .items[0].name }`. Dot-only paths numeric indices support करत नाहीत.

### Boolean conditions काम करत नाहीत

Expression comparisons strict (`===`) आहेत. Types match असल्याची खात्री करा:

```yaml
# .count string "0" असल्यास हे fail होते
if: "${ .count == 0 }"

# .count number असल्यावर काम करते
if: "${ .count == 0 }"
```

Upstream tasks strings किंवा numbers return करतात का check करा. HTTP responses अनेकदा string values return करतात ज्यांना comparison साठी conversion आवश्यक नसते -- फक्त string form विरुद्ध compare करा.

---

## HTTP Call Failures

### Timeouts

HTTP calls `web_fetch` tool मधून जातात. Target server slow असल्यास, request time out होऊ शकतो. Workflow DSL मध्ये HTTP calls साठी per-task timeout override नाही -- `web_fetch` tool चा default timeout apply होतो.

### SSRF blocks

Triggerfish मधील सर्व outbound HTTP आधी DNS resolve करतो आणि resolved IP hardcoded denylist विरुद्ध check करतो. Private आणि reserved IP ranges नेहमी blocked असतात.

Workflow private IP वरील internal service call करत असल्यास (उदा. `http://192.168.1.100/api`), SSRF prevention ने blocked होईल. हे by design आहे आणि configure करता येत नाही.

**Fix:** Public IP ला resolve होणारा public hostname वापरा, किंवा direct access असलेल्या MCP server द्वारे route करण्यासाठी `triggerfish:mcp` वापरा.

### Missing headers

`http` call type `with.headers` request headers ला directly map करतो. API ला authentication आवश्यक असल्यास, header include करा:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Token value workflow input मध्ये provided आहे किंवा prior task ने set केले आहे याची खात्री करा.

---

## Sub-Workflow Recursion Limit

### "Workflow recursion depth exceeded maximum of 5"

Sub-workflows 5 levels deep पर्यंत nest होऊ शकतात. Workflow A, workflow B call करतो जे workflow A call करतो त्यामुळे infinite recursion prevent करतो.

**Fix:**

- Workflow chain flatten करा. Steps कमी workflows मध्ये combine करा.
- दोन workflows एकमेकांना call करणाऱ्या circular references check करा.

---

## Shell Execution Disabled

### "Shell execution failed" किंवा run tasks मधून empty result

Workflow tool context मधील `allowShellExecution` flag `shell` किंवा `script` targets असलेले `run` tasks permitted आहेत का ते control करतो. Disabled असल्यास, हे tasks fail होतात.

**Fix:** तुमच्या Triggerfish configuration मध्ये shell execution enabled आहे का check करा. Production environments मध्ये, shell execution security साठी intentionally disabled असू शकतो.

---

## Workflow Run होतो पण चुकीचा Output Produce करतो

### `workflow_history` सह Debugging

Past runs inspect करण्यासाठी `workflow_history` वापरा:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

प्रत्येक history entry include करतो:

- **status** — `completed` किंवा `failed`
- **error** — failed असल्यास error message
- **taskCount** — workflow मधील tasks ची संख्या
- **startedAt / completedAt** — timing information

### Context flow check करणे

प्रत्येक task आपला result data context मध्ये task च्या नावाखाली store करतो. Workflow ला `fetch`, `transform`, आणि `save` नावाचे tasks असल्यास, सर्व तीन tasks नंतर data context असे दिसते:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

Common mistakes:

- **Context overwriting.** आधीच exist करणाऱ्या key ला assign करणारा `set` task previous value replace करेल.
- **चुकीचा task reference.** Task `step_1` नाव असताना `${ .step1 }` reference करणे.
- **Input transform context replace करतो.** `input.from` directive task चे input context entirely replace करतो. `input.from: "${ .config }"` वापरल्यास, task फक्त `config` object पाहतो, full context नाही.

### Missing output

Workflow complete होतो पण empty output return करतो, final task चे result expected आहे का check करा. Workflow output completion वर full data context आहे, internal keys filtered out सह.

---

## "Permission denied" on workflow_delete

`workflow_delete` tool आधी session च्या current taint level वापरून workflow load करतो. Workflow तुमच्या session taint exceed करणाऱ्या classification level वर saved असल्यास, load null return करतो आणि `workflow_delete` "permission denied" ऐवजी "not found" report करतो.

हे intentional आहे -- classified workflows चे existence lower-classification sessions ला disclosed नाही.

**Fix:** Delete करण्यापूर्वी workflow च्या classification level शी match किंवा exceed करण्यासाठी session taint escalate करा. किंवा जेथे originally saved होते त्याच session type मधून delete करा.

---

## Self-Healing

### "Step metadata missing on task 'X': self-healing requires description, expects, produces"

`self_healing.enabled` `true` असल्यावर, प्रत्येक task ला तिन्ही metadata fields असणे आवश्यक आहे. कोणते missing असल्यास parser save वेळी workflow reject करतो.

**Fix:** प्रत्येक task च्या `metadata` block मध्ये `description`, `expects`, आणि `produces` add करा:

```yaml
- my-task:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "हे step काय करतो आणि का"
      expects: "या step ला input म्हणून काय आवश्यक आहे"
      produces: "हे step काय output करतो"
```

---

### "Self-healing config mutation rejected in version proposal"

Healing agent ने नवीन workflow version propose केला जो `self_healing` config block modify करतो. हे prohibited आहे — agent स्वतःची healing configuration बदलू शकत नाही.

हे intended behavior आहे. फक्त humans `self_healing` config modify करू शकतात `workflow_save` द्वारे directly नवीन version save करून.

---

### Healing agent spawning नाही होत

Workflow run होतो पण healing agent दिसत नाही. Check करा:

1. **`enabled` `true` आहे** `metadata.triggerfish.self_healing` मध्ये.
2. **Config correct location मध्ये आहे** — `metadata.triggerfish.self_healing` खाली nested असणे आवश्यक आहे, top level वर नाही.
3. **सर्व steps ला metadata आहे** — save वेळी validation fail झाल्यास, workflow self-healing enabled शिवाय saved झाला.

---

### Proposed fixes pending मध्ये stuck

`approval_required` `true` असल्यास (default), proposed versions human review ची wait करतात. Pending proposals पाहण्यासाठी `workflow_version_list` वापरा आणि `workflow_version_approve` किंवा `workflow_version_reject` वापरून त्यांवर act करा.

---

### "Retry budget exhausted" / Unresolvable escalation

Healing agent ने issue resolve न करता सर्व intervention attempts (default 3) वापरले. ते `unresolvable` म्हणून escalate करते आणि fixes attempt करणे बंद करते.

**Fix:**

- काय interventions try केले ते पाहण्यासाठी `workflow_healing_status` check करा.
- Underlying issue manually review आणि fix करा.
- More attempts allow करण्यासाठी, self-healing config मध्ये `retry_budget` वाढवा आणि workflow re-save करा.
