---
title: Workflow Troubleshooting
description: Triggerfish workflows உடன் வேலை செய்யும்போது பொதுவான issues மற்றும் solutions.
---

# Troubleshooting: Workflows

## "Workflow not found or not accessible"

Workflow exist ஆகிறது, ஆனால் உங்கள் current session taint விட higher classification level இல் stored.

`CONFIDENTIAL` session போது saved workflows `PUBLIC` அல்லது `INTERNAL` sessions க்கு invisible. Store ஒவ்வொரு load போதும் `canFlowTo` checks பயன்படுத்துகிறது, மற்றும் workflow இன் classification session taint exceed செய்யும்போது `null` (surfaced as "not found") return செய்கிறது.

**Fix:** முதலில் classified data access செய்து session taint escalate செய்யவும், அல்லது content allow செய்தால் lower-classification session இலிருந்து workflow மீண்டும் save செய்யவும்.

**Verify:** உங்கள் current classification level இல் எந்த workflows visible என்று பார்க்க `workflow_list` இயக்கவும். Expect செய்த workflow missing ஆனால், higher level இல் saved ஆகியது.

---

## "Workflow classification ceiling breached"

Session இன் taint level workflow இன் `classification_ceiling` exceed செய்கிறது. இந்த check ஒவ்வொரு task க்கும் முன்பு run ஆவதால், earlier task session taint escalate செய்தால் mid-execution trigger ஆகலாம்.

உதாரணமாக, `classification_ceiling: INTERNAL` உள்ள workflow, ஒரு `triggerfish:memory` call session taint escalate செய்யும் `CONFIDENTIAL` data retrieve செய்தால் halt ஆகும்.

**Fix:**

- Expected data sensitivity match ஆக workflow இன் `classification_ceiling` raise செய்யவும்.
- அல்லது classified data access செய்யாதவாறு workflow restructure செய்யவும். Classified memory read செய்வதற்கு பதிலாக input parameters பயன்படுத்தவும்.

---

## YAML Parse Errors

### "YAML parse error: ..."

பொதுவான YAML syntax mistakes:

**Indentation.** YAML whitespace-sensitive. Tabs க்கு பதிலாக spaces பயன்படுத்தவும். ஒவ்வொரு nesting level உம் exactly 2 spaces.

```yaml
# Wrong — tabs அல்லது inconsistent indent
do:
- fetch:
      call: http

# Correct
do:
  - fetch:
      call: http
```

**Expressions க்கு missing quotes.** `${ }` உடன் Expression strings quote செய்யப்பட வேண்டும், இல்லையென்றால் YAML `{` ஐ inline mapping ஆக interpret செய்யும்.

```yaml
# Wrong — YAML parse error
endpoint: ${ .config.url }

# Correct
endpoint: "${ .config.url }"
```

**Missing `document` block.** ஒவ்வொரு workflow உம் `dsl`, `namespace`, மற்றும் `name` உடன் `document` field வைத்திருக்க வேண்டும்:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

YAML successfully parsed ஆனது, ஆனால் result object இல்லாமல் scalar அல்லது array. YAML இல் top-level keys (`document`, `do`) இருக்கின்றனவா என்று சரிபார்க்கவும்.

### "Task has no recognized type"

ஒவ்வொரு task entry உம் exactly ஒரு type key contain செய்ய வேண்டும்: `call`, `run`, `set`, `switch`, `for`, `raise`, `emit`, அல்லது `wait`. Parser இவற்றில் எதுவும் கண்டுபிடிக்காவிட்டால், unrecognized type report செய்கிறது.

பொதுவான cause: task type name இல் typo (உதா., `call` க்கு பதிலாக `calls`).

---

## Expression Evaluation Failures

### Wrong அல்லது empty values

Expressions `${ .path.to.value }` syntax பயன்படுத்துகின்றன. Leading dot required — workflow இன் data context root க்கு path anchor செய்கிறது.

```yaml
# Wrong — missing leading dot
value: "${ result.name }"

# Correct
value: "${ .result.name }"
```

### Output இல் "undefined"

Dot-path எதுவும் resolve செய்யவில்லை. பொதுவான காரணங்கள்:

- **Wrong task name.** ஒவ்வொரு task உம் own name இல் result store செய்கிறது. Task `fetch_data` என்று named ஆனால், `${ .data }` அல்லது `${ .result }` இல்லாமல் `${ .fetch_data }` ஆக reference செய்யவும்.
- **Wrong nesting.** HTTP call `{"data": {"items": [...]}}` return செய்தால், items `${ .fetch_data.data.items }` இல் இருக்கும்.
- **Array indexing.** Bracket syntax பயன்படுத்தவும்: `${ .items[0].name }`. Dot-only paths numeric indices support செய்வதில்லை.

### Boolean conditions வேலை செய்வதில்லை

Expression comparisons strict (`===`). Types match ஆவதை உறுதிப்படுத்தவும்:

```yaml
# .count string "0" ஆனால் இது fail
if: "${ .count == 0 }"

# .count number ஆனால் வேலை செய்கிறது
if: "${ .count == 0 }"
```

Upstream tasks strings அல்லது numbers return செய்கின்றனவா என்று சரிபார்க்கவும். HTTP responses often string values return செய்கின்றன — comparison க்கு string form உடன் compare செய்யவும்.

---

## HTTP Call Failures

### Timeouts

HTTP calls `web_fetch` tool மூலம் செல்கின்றன. Target server slow ஆனால், request timeout ஆகலாம். Workflow DSL இல் HTTP calls க்கு per-task timeout override இல்லை — `web_fetch` tool இன் default timeout apply ஆகும்.

### SSRF blocks

Triggerfish இல் அனைத்து outbound HTTP உம் முதலில் DNS resolve செய்கிறது மற்றும் resolved IP ஐ hardcoded denylist உடன் check செய்கிறது. Private மற்றும் reserved IP ranges எப்போதும் blocked.

Workflow private IP இல் internal service call செய்தால் (உதா., `http://192.168.1.100/api`), SSRF prevention மூலம் blocked. இது by design மற்றும் configure செய்ய முடியாது.

**Fix:** Public IP க்கு resolve ஆகும் public hostname பயன்படுத்தவும், அல்லது direct access உள்ள MCP server மூலம் route செய்ய `triggerfish:mcp` பயன்படுத்தவும்.

### Missing headers

`http` call type `with.headers` ஐ request headers க்கு directly map செய்கிறது. API க்கு authentication தேவையென்றால், header include செய்யவும்:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Token value workflow input இல் provide ஆகிறதா அல்லது prior task set செய்கிறதா என்று உறுதிப்படுத்தவும்.

---

## Sub-Workflow Recursion Limit

### "Workflow recursion depth exceeded maximum of 5"

Sub-workflows 5 levels deep வரை nest ஆகலாம். Workflow A workflow B call செய்து B workflow A call செய்யும்போது infinite recursion prevent செய்கிறது.

**Fix:**

- Workflow chain flatten செய்யவும். Steps ஐ fewer workflows ஆக combine செய்யவும்.
- Circular references சரிபார்க்கவும், இரண்டு workflows ஒன்றை ஒன்று call செய்யும்போது.

---

## Shell Execution Disabled

### "Shell execution failed" அல்லது run tasks இலிருந்து empty result

Workflow tool context இல் `allowShellExecution` flag `shell` அல்லது `script` targets உடன் `run` tasks permitted ஆ என்று control செய்கிறது. Disabled ஆனால், இந்த tasks fail ஆகும்.

**Fix:** Triggerfish configuration இல் shell execution enabled ஆகிருக்கிறதா என்று சரிபார்க்கவும். Production environments இல், shell execution security காரணமாக intentionally disabled ஆகலாம்.

---

## Workflow Runs ஆகிறது, ஆனால் Wrong Output Produce செய்கிறது

### `workflow_history` உடன் Debugging

Past runs inspect செய்ய `workflow_history` பயன்படுத்தவும்:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

ஒவ்வொரு history entry உம் include செய்கிறது:

- **status** — `completed` அல்லது `failed`
- **error** — failed ஆனால் error message
- **taskCount** — workflow இல் tasks எண்ணிக்கை
- **startedAt / completedAt** — timing information

### Context flow சரிபார்ப்பது

ஒவ்வொரு task உம் task இன் name இல் data context இல் result store செய்கிறது. `fetch`, `transform`, மற்றும் `save` tasks உடன் workflow இருந்தால், அனைத்து மூன்று tasks க்கும் பிறகு data context இப்படி இருக்கும்:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

பொதுவான mistakes:

- **Overwriting context.** Already exist ஆகும் key க்கு assign செய்யும் `set` task previous value replace செய்யும்.
- **Wrong task reference.** Task `step_1` என்று named ஆகும்போது `${ .step1 }` reference செய்வது.
- **Input transform replacing context.** `input.from` directive task இன் input context முழுவதும் replace செய்கிறது. `input.from: "${ .config }"` பயன்படுத்தினால், task full context இல்லாமல் `config` object மட்டும் பார்க்கிறது.

### Missing output

Workflow complete ஆகிறது, ஆனால் empty output return ஆனால், final task இன் result என்ன என்று சரிபார்க்கவும். Workflow output completion போது full data context, internal keys filtered out.

---

## `workflow_delete` இல் "Permission denied"

`workflow_delete` tool முதலில் session இன் current taint level பயன்படுத்தி workflow load செய்கிறது. Workflow session taint exceed செய்யும் classification level இல் saved ஆனால், load null return செய்கிறது மற்றும் `workflow_delete` "permission denied" க்கு பதிலாக "not found" report செய்கிறது.

இது intentional — classified workflows இன் existence lower-classification sessions க்கு disclosed ஆவதில்லை.

**Fix:** Delete செய்வதற்கு முன்பு workflow இன் classification level match ஆக அல்லது exceed செய்ய session taint escalate செய்யவும். அல்லது originally saved ஆன same session type இலிருந்து delete செய்யவும்.

---

## Self-Healing

### "Step metadata missing on task 'X': self-healing requires description, expects, produces"

`self_healing.enabled` `true` ஆனால், ஒவ்வொரு task உம் மூன்று metadata fields வைத்திருக்க வேண்டும். ஏதாவது missing ஆனால் parser save time இல் workflow reject செய்கிறது.

**Fix:** ஒவ்வொரு task இன் `metadata` block இல் `description`, `expects`, மற்றும் `produces` சேர்க்கவும்:

```yaml
- my-task:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "இந்த step என்ன செய்கிறது மற்றும் ஏன்"
      expects: "இந்த step input ஆக என்ன தேவை"
      produces: "இந்த step என்ன output செய்கிறது"
```

---

### "Self-healing config mutation rejected in version proposal"

Healing agent `self_healing` config block modify செய்யும் புதிய workflow version propose செய்தது. இது prohibited — agent own healing configuration மாற்ற முடியாது.

இது intended ஆக வேலை செய்கிறது. Humans மட்டும் `workflow_save` மூலம் directly workflow இன் புதிய version save செய்து `self_healing` config modify செய்யலாம்.

---

### Healing agent spawn ஆவதில்லை

Workflow runs ஆகிறது, ஆனால் healing agent தோன்றவில்லை. சரிபார்க்கவும்:

1. `metadata.triggerfish.self_healing` இல் **`enabled` `true`** ஆகிருக்கிறதா.
2. **Config correct location இல்** — `metadata.triggerfish.self_healing` இல் nested ஆக இருக்க வேண்டும், top level இல் இல்லை.
3. **அனைத்து steps உம் metadata வைத்திருக்கின்றன** — Save time இல் validation fail ஆனால், self-healing enabled இல்லாமல் workflow saved ஆகியது.

---

### Proposed fixes pending இல் stuck

`approval_required` `true` (default) ஆனால், proposed versions human review க்காக காத்திருக்கின்றன. Pending proposals பார்க்க `workflow_version_list` பயன்படுத்தவும்; act செய்ய `workflow_version_approve` அல்லது `workflow_version_reject` பயன்படுத்தவும்.

---

### "Retry budget exhausted" / Unresolvable escalation

Healing agent all intervention attempts (default 3) பயன்படுத்திய பிறகும் issue resolve செய்யவில்லை. `unresolvable` ஆக escalate செய்கிறது மற்றும் fixes attempt செய்வதை நிறுத்துகிறது.

**Fix:**

- என்ன interventions try செய்யப்பட்டன என்று பார்க்க `workflow_healing_status` சரிபார்க்கவும்.
- Underlying issue manually review செய்து fix செய்யவும்.
- More attempts allow செய்ய self-healing config இல் `retry_budget` increase செய்து workflow மீண்டும் save செய்யவும்.
