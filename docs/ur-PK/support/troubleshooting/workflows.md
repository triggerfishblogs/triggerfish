---
title: Workflow Troubleshooting
description: Triggerfish workflows کے ساتھ کام کرتے وقت عام issues اور solutions۔
---

# Troubleshooting: Workflows

## "Workflow not found or not accessible"

Workflow موجود ہے لیکن آپ کے موجودہ session taint سے higher classification level پر stored ہے۔

`CONFIDENTIAL` session کے دوران save کیے گئے workflows `PUBLIC` یا `INTERNAL` sessions کو visible نہیں ہوتے۔ Store ہر load پر `canFlowTo` checks استعمال کرتا ہے، اور `null` return کرتا ہے ("not found" کے طور پر surfaced) جب workflow کی classification session taint سے زیادہ ہو۔

**Fix:** پہلے classified data access کر کے اپنا session taint escalate کریں، یا اگر content permit کرے تو workflow کو lower-classification session سے دوبارہ save کریں۔

**Verify:** `workflow_list` چلائیں یہ دیکھنے کے لیے کہ آپ کے موجودہ classification level پر کون سے workflows visible ہیں۔ اگر expected workflow missing ہو تو یہ higher level پر save ہوئی تھی۔

---

## "Workflow classification ceiling breached"

Session کا taint level workflow کی `classification_ceiling` سے زیادہ ہے۔ یہ check ہر task سے پہلے چلتا ہے، اس لیے یہ mid-execution trigger ہو سکتا ہے اگر کسی earlier task نے session taint escalate کیا ہو۔

مثلاً، `classification_ceiling: INTERNAL` والی workflow halt ہو جائے گی اگر `triggerfish:memory` call `CONFIDENTIAL` data retrieve کرے جو session taint escalate کرے۔

**Fix:**

- Workflow کی `classification_ceiling` expected data sensitivity کے مطابق بڑھائیں۔
- یا workflow کو restructure کریں تاکہ classified data access نہ ہو۔ Classified memory پڑھنے کی بجائے input parameters استعمال کریں۔

---

## YAML Parse Errors

### "YAML parse error: ..."

عام YAML syntax mistakes:

**Indentation۔** YAML whitespace-sensitive ہے۔ Spaces استعمال کریں، tabs نہیں۔ ہر nesting level بالکل 2 spaces ہونے چاہئیں۔

```yaml
# غلط — tabs یا inconsistent indent
do:
- fetch:
      call: http

# درست
do:
  - fetch:
      call: http
```

**Expressions کے گرد missing quotes۔** `${ }` والی expression strings کو quote کرنا ضروری ہے، ورنہ YAML `{` کو inline mapping سمجھتا ہے۔

```yaml
# غلط — YAML parse error
endpoint: ${ .config.url }

# درست
endpoint: "${ .config.url }"
```

**Missing `document` block۔** ہر workflow میں `dsl`، `namespace`، اور `name` کے ساتھ `document` field ہونی چاہیے:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

YAML successfully parse ہوئی لیکن result object کی بجائے scalar یا array ہے۔ Check کریں کہ آپ کی YAML میں top-level keys (`document`، `do`) ہیں۔

### "Task has no recognized type"

ہر task entry میں بالکل ایک type key ہونی چاہیے: `call`، `run`، `set`، `switch`، `for`، `raise`، `emit`، یا `wait`۔ اگر parser ان میں سے کوئی نہ ڈھونڈے تو unrecognized type report کرتا ہے۔

عام وجہ: task type name میں typo (مثلاً `call` کی بجائے `calls`)۔

---

## Expression Evaluation Failures

### غلط یا empty values

Expressions `${ .path.to.value }` syntax استعمال کرتے ہیں۔ Leading dot ضروری ہے -- یہ path کو workflow کے data context root سے anchor کرتا ہے۔

```yaml
# غلط — missing leading dot
value: "${ result.name }"

# درست
value: "${ .result.name }"
```

### Output میں "undefined"

Dot-path کچھ نہیں resolve ہوا۔ عام وجوہات:

- **غلط task name۔** ہر task اپنا result اپنے نام کے تحت store کرتا ہے۔ اگر آپ کا task `fetch_data` نامی ہے تو اس کے result کو `${ .fetch_data }` سے reference کریں، `${ .data }` یا `${ .result }` سے نہیں۔
- **غلط nesting۔** اگر HTTP call `{"data": {"items": [...]}}` return کرے تو items `${ .fetch_data.data.items }` پر ہیں۔
- **Array indexing۔** Bracket syntax استعمال کریں: `${ .items[0].name }`۔ Dot-only paths numeric indices support نہیں کرتے۔

### Boolean conditions کام نہیں کر رہیں

Expression comparisons strict (`===`) ہیں۔ یقینی بنائیں کہ types match کریں:

```yaml
# یہ fail ہوتا ہے اگر .count string "0" ہو
if: "${ .count == 0 }"

# کام کرتا ہے جب .count number ہو
if: "${ .count == 0 }"
```

Check کریں کہ upstream tasks strings یا numbers return کرتے ہیں۔ HTTP responses اکثر string values return کرتی ہیں جن کے لیے comparison کے لیے کوئی conversion نہیں چاہیے -- صرف string form کے خلاف compare کریں۔

---

## HTTP Call Failures

### Timeouts

HTTP calls `web_fetch` tool کے ذریعے جاتی ہیں۔ اگر target server slow ہو تو request timeout ہو سکتی ہے۔ Workflow DSL میں HTTP calls کے لیے per-task timeout override نہیں ہے -- `web_fetch` tool کا ڈیفالٹ timeout apply ہوتا ہے۔

### SSRF blocks

Triggerfish میں تمام outbound HTTP پہلے DNS resolve کرتا ہے اور resolved IP کو hardcoded denylist کے خلاف check کرتا ہے۔ Private اور reserved IP ranges ہمیشہ block ہیں۔

اگر آپ کی workflow private IP پر internal service call کرے (مثلاً `http://192.168.1.100/api`) تو SSRF prevention سے block ہوگی۔ یہ design کے مطابق ہے اور configure نہیں کیا جا سکتا۔

**Fix:** Public hostname استعمال کریں جو public IP پر resolve ہو، یا `triggerfish:mcp` استعمال کریں MCP server کے ذریعے route کرنے کے لیے جس کا direct access ہو۔

### Missing headers

`http` call type `with.headers` کو request headers پر directly map کرتا ہے۔ اگر آپ کی API کو authentication چاہیے تو header شامل کریں:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

یقینی بنائیں کہ token value workflow input میں فراہم ہے یا کسی prior task نے set کی ہے۔

---

## Sub-Workflow Recursion Limit

### "Workflow recursion depth exceeded maximum of 5"

Sub-workflows 5 levels deep تک nest ہو سکتے ہیں۔ یہ limit infinite recursion روکتی ہے جب workflow A، workflow B کو call کرے جو workflow A کو call کرے۔

**Fix:**

- Workflow chain flatten کریں۔ Steps کو fewer workflows میں combine کریں۔
- Circular references check کریں جہاں دو workflows ایک دوسرے کو call کریں۔

---

## Shell Execution Disabled

### "Shell execution failed" یا run tasks سے empty result

Workflow tool context میں `allowShellExecution` flag control کرتا ہے کہ آیا `shell` یا `script` targets والے `run` tasks permitted ہیں۔ Disabled ہونے پر، یہ tasks fail ہوتے ہیں۔

**Fix:** Check کریں کہ آپ کی Triggerfish configuration میں shell execution enabled ہے یا نہیں۔ Production environments میں، shell execution security کے لیے جان بوجھ کر disabled ہو سکتی ہے۔

---

## Workflow چلتی ہے لیکن غلط Output دیتی ہے

### `workflow_history` سے Debugging

Past runs inspect کرنے کے لیے `workflow_history` استعمال کریں:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

ہر history entry شامل کرتی ہے:

- **status** — `completed` یا `failed`
- **error** — fail ہونے پر error message
- **taskCount** — workflow میں tasks کی تعداد
- **startedAt / completedAt** — timing information

### Context flow check کرنا

ہر task اپنا result data context میں task کے نام کے تحت store کرتا ہے۔ اگر آپ کی workflow میں tasks `fetch`، `transform`، اور `save` نامی ہوں تو تمام تین tasks کے بعد data context یہ ہے:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

عام غلطیاں:

- **Context overwrite کرنا۔** ایک `set` task جو پہلے سے موجود key کو assign کرے پچھلی value replace کرے گا۔
- **غلط task reference۔** `${ .step1 }` reference کرنا جب task `step_1` نامی ہو۔
- **Input transform context replace کرنا۔** `input.from` directive task کا input context پوری طرح replace کرتا ہے۔ اگر `input.from: "${ .config }"` استعمال کریں تو task صرف `config` object دیکھتا ہے، پورا context نہیں۔

### Missing output

اگر workflow complete ہو لیکن empty output return کرے تو check کریں کہ آیا آخری task کا result وہی ہے جس کی توقع ہے۔ Workflow output completion پر پورا data context ہے، internal keys filter ہو کر۔

---

## `workflow_delete` پر "Permission denied"

`workflow_delete` tool پہلے session کے موجودہ taint level استعمال کر کے workflow load کرتا ہے۔ اگر workflow ایسے classification level پر save ہوئی جو آپ کے session taint سے زیادہ ہے تو load null return کرتا ہے اور `workflow_delete` "permission denied" کی بجائے "not found" report کرتا ہے۔

یہ intentional ہے -- classified workflows کا وجود lower-classification sessions کو نہیں بتایا جاتا۔

**Fix:** Delete سے پہلے اپنا session taint workflow کی classification level کے برابر یا زیادہ escalate کریں۔ یا اسے اسی session type سے delete کریں جہاں اصل میں save کیا گیا تھا۔

---

## Self-Healing

### "Step metadata missing on task 'X': self-healing requires description, expects, produces"

جب `self_healing.enabled` `true` ہو تو ہر task میں تینوں metadata fields ہونی چاہئیں۔ Parser workflow کو save کے وقت reject کرتا ہے اگر کوئی missing ہو۔

**Fix:** ہر task کے `metadata` block میں `description`، `expects`، اور `produces` add کریں:

```yaml
- my-task:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "یہ step کیا کرتی ہے اور کیوں"
      expects: "اس step کو input کے طور پر کیا چاہیے"
      produces: "یہ step کیا output کرتی ہے"
```

---

### "Self-healing config mutation rejected in version proposal"

Healing agent نے ایک نئی workflow version propose کی جو `self_healing` config block modify کرتی ہے۔ یہ ممنوع ہے — agent اپنی healing configuration خود نہیں بدل سکتا۔

یہ intended کے مطابق کام کر رہا ہے۔ صرف humans براہ راست `workflow_save` کے ذریعے workflow کا نیا version save کر کے `self_healing` config modify کر سکتے ہیں۔

---

### Healing agent spawn نہیں ہو رہا

Workflow چلتی ہے لیکن healing agent نظر نہیں آتا۔ Check کریں:

1. **`enabled` `true` ہے** `metadata.triggerfish.self_healing` میں۔
2. **Config صحیح location پر ہے** — `metadata.triggerfish.self_healing` کے نیچے nested ہونا چاہیے، top level پر نہیں۔
3. **تمام steps کی metadata ہے** — اگر save کے وقت validation fail ہو تو workflow بغیر self-healing enabled کے save ہوئی۔

---

### Proposed fixes pending میں پھنسے ہیں

اگر `approval_required` `true` ہو (ڈیفالٹ) تو proposed versions human review کا انتظار کرتے ہیں۔ Pending proposals دیکھنے کے لیے `workflow_version_list` استعمال کریں اور ان پر act کرنے کے لیے `workflow_version_approve` یا `workflow_version_reject`۔

---

### "Retry budget exhausted" / Unresolvable escalation

Healing agent نے اپنی تمام intervention attempts (ڈیفالٹ 3) بغیر issue resolve کیے استعمال کر لی ہیں۔ یہ `unresolvable` کے طور پر escalate کرتا ہے اور fixes attempt کرنا بند کر دیتا ہے۔

**Fix:**

- کیا interventions try ہوئے یہ دیکھنے کے لیے `workflow_healing_status` check کریں۔
- Underlying issue manually review اور fix کریں۔
- مزید attempts allow کرنے کے لیے، self-healing config میں `retry_budget` بڑھائیں اور workflow دوبارہ save کریں۔
