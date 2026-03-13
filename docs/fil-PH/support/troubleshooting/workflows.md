---
title: Troubleshooting ng mga Workflow
description: Mga karaniwang problema at solusyon kapag nagtatrabaho sa mga Triggerfish workflow.
---

# Troubleshooting: Mga Workflow

## "Workflow not found or not accessible"

Umiiral ang workflow pero naka-store sa mas mataas na classification level
kaysa sa kasalukuyang session taint mo.

Ang mga workflow na na-save habang nasa `CONFIDENTIAL` session ay hindi makikita
ng mga `PUBLIC` o `INTERNAL` session. Gumagamit ng `canFlowTo` check ang store
sa bawat load, at nagbabalik ng `null` (lumilitaw bilang "not found") kapag
lumampas ang classification ng workflow sa session taint.

**Solusyon:** I-escalate ang iyong session taint sa pamamagitan ng pag-access ng
classified data muna, o i-re-save ang workflow mula sa isang mas mababang
classification session kung pinapayagan ng nilalaman nito.

**Pag-verify:** Patakbuhin ang `workflow_list` para makita kung aling mga
workflow ang visible sa iyong kasalukuyang classification level. Kung nawawala
ang inaasahan mong workflow, na-save ito sa mas mataas na level.

---

## "Workflow classification ceiling breached"

Lumampas na ang taint level ng session sa `classification_ceiling` ng workflow.
Tumatakbo ang check na ito bago ang bawat task, kaya puwede itong mag-trigger
sa gitna ng execution kung nag-escalate ng session taint ang naunang task.

Halimbawa, ang isang workflow na may `classification_ceiling: INTERNAL` ay
hihinto kung ang isang `triggerfish:memory` call ay kumukuha ng `CONFIDENTIAL`
data na nag-e-escalate ng session taint.

**Solusyon:**

- Itaas ang `classification_ceiling` ng workflow para tumugma sa inaasahang
  sensitivity ng data.
- O i-restructure ang workflow para hindi ma-access ang classified data.
  Gamitin ang mga input parameter sa halip na magbasa ng classified memory.

---

## Mga YAML Parse Error

### "YAML parse error: ..."

Mga karaniwang YAML syntax mistake:

**Indentation.** Sensitive sa whitespace ang YAML. Gamitin ang mga space, hindi
tab. Bawat nesting level ay kailangang eksaktong 2 space.

```yaml
# Mali — mga tab o hindi consistent na indent
do:
- fetch:
      call: http

# Tama
do:
  - fetch:
      call: http
```

**Nawawalang mga quote sa mga expression.** Kailangang naka-quote ang mga
expression string na may `${ }`, kung hindi ay iinterpretahin ng YAML ang `{`
bilang inline mapping.

```yaml
# Mali — YAML parse error
endpoint: ${ .config.url }

# Tama
endpoint: "${ .config.url }"
```

**Nawawalang `document` block.** Bawat workflow ay kailangang may `document`
field na may `dsl`, `namespace`, at `name`:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

Matagumpay ang pag-parse ng YAML pero ang resulta ay scalar o array, hindi
object. I-check na may mga top-level key (`document`, `do`) ang iyong YAML.

### "Task has no recognized type"

Bawat task entry ay kailangang may eksaktong isang type key: `call`, `run`,
`set`, `switch`, `for`, `raise`, `emit`, o `wait`. Kapag walang nakitang alinman
sa mga key na ito ang parser, nagre-report ito ng unrecognized type.

Karaniwang dahilan: typo sa pangalan ng task type (hal., `calls` sa halip na
`call`).

---

## Mga Problema sa Expression Evaluation

### Mga mali o walang laman na value

Gumagamit ang mga expression ng `${ .path.to.value }` syntax. Kailangan ang
leading dot -- ini-anchor nito ang path sa root ng data context ng workflow.

```yaml
# Mali — nawawalang leading dot
value: "${ result.name }"

# Tama
value: "${ .result.name }"
```

### "undefined" sa output

Walang na-resolve ang dot-path. Mga karaniwang dahilan:

- **Maling pangalan ng task.** Sine-store ng bawat task ang resulta nito sa
  ilalim ng sarili nitong pangalan. Kung ang task mo ay pinangalanang
  `fetch_data`, i-reference ang resulta nito bilang `${ .fetch_data }`, hindi
  `${ .data }` o `${ .result }`.
- **Maling nesting.** Kung ang HTTP call ay nagbabalik ng
  `{"data": {"items": [...]}}`, ang mga item ay nasa
  `${ .fetch_data.data.items }`.
- **Array indexing.** Gamitin ang bracket syntax: `${ .items[0].name }`. Hindi
  sumusuporta ang dot-only path sa numeric index.

### Hindi gumagana ang boolean condition

Strict (`===`) ang expression comparison. Siguraduhing tugma ang mga type:

```yaml
# Magfa-fail ito kung string na "0" ang .count
if: "${ .count == 0 }"

# Gumagana kapag number ang .count
if: "${ .count == 0 }"
```

I-check kung string o number ang ibinabalik ng mga upstream task. Madalas na
nagbabalik ng string value ang mga HTTP response na hindi na kailangang
i-convert para sa comparison -- i-compare lang laban sa string form.

---

## Mga HTTP Call Failure

### Mga Timeout

Dumadaan ang mga HTTP call sa `web_fetch` tool. Kapag mabagal ang target server,
puwedeng mag-timeout ang request. Walang per-task timeout override para sa mga
HTTP call sa workflow DSL -- ang default timeout ng `web_fetch` tool ang
ina-apply.

### Mga SSRF block

Lahat ng outbound HTTP sa Triggerfish ay nagre-resolve ng DNS muna at
chine-check ang resolved IP laban sa isang hardcoded denylist. Palaging
bina-block ang mga private at reserved IP range.

Kapag tinatawag ng iyong workflow ang isang internal service sa private IP (hal.,
`http://192.168.1.100/api`), maba-block ito ng SSRF prevention. Sadyang ganito
at hindi puwedeng i-configure.

**Solusyon:** Gumamit ng public hostname na nagre-resolve sa public IP, o
gumamit ng `triggerfish:mcp` para mag-route sa isang MCP server na may
direktang access.

### Nawawalang mga header

Ang `http` call type ay direktang mina-map ang `with.headers` sa request header.
Kung kailangan ng iyong API ng authentication, isama ang header:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Siguraduhing ibinigay ang token value sa workflow input o na-set ng naunang
task.

---

## Recursion Limit ng Sub-Workflow

### "Workflow recursion depth exceeded maximum of 5"

Puwedeng mag-nest ang mga sub-workflow ng hanggang 5 level ang lalim.
Pinipigilan ng limit na ito ang infinite recursion kapag tinatawag ng workflow A
ang workflow B na tinatawag ang workflow A.

**Solusyon:**

- I-flatten ang workflow chain. Pagsamahin ang mga step sa mas kaunting workflow.
- I-check ang mga circular reference kung saan dalawang workflow ang
  nagtatawagan.

---

## Naka-disable ang Shell Execution

### "Shell execution failed" o walang laman na resulta mula sa run task

Kinokontrol ng `allowShellExecution` flag sa workflow tool context kung
pinapayagan ang mga `run` task na may `shell` o `script` target. Kapag
naka-disable, magfa-fail ang mga task na ito.

**Solusyon:** I-check kung naka-enable ang shell execution sa iyong Triggerfish
configuration. Sa mga production environment, puwedeng sadyang naka-disable ang
shell execution para sa seguridad.

---

## Tumatakbo ang Workflow pero Mali ang Output

### Pag-debug gamit ang `workflow_history`

Gamitin ang `workflow_history` para siyasatin ang mga nakaraang run:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

Bawat history entry ay naglalaman ng:

- **status** -- `completed` o `failed`
- **error** -- error message kung nabigo
- **taskCount** -- bilang ng mga task sa workflow
- **startedAt / completedAt** -- impormasyon tungkol sa timing

### Pag-check ng context flow

Sine-store ng bawat task ang resulta nito sa data context sa ilalim ng pangalan
ng task. Kung ang iyong workflow ay may mga task na pinangalanang `fetch`,
`transform`, at `save`, ang data context pagkatapos ng lahat ng tatlong task
ay ganito:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

Mga karaniwang pagkakamali:

- **Pag-overwrite ng context.** Ang isang `set` task na nag-a-assign sa isang
  key na umiiral na ay papalitan ang nakaraang value.
- **Maling task reference.** Nagre-reference ng `${ .step1 }` kung ang task ay
  pinangalanang `step_1`.
- **Input transform na pinapalitan ang context.** Ang isang `input.from`
  directive ay pinapalitan ang buong input context ng task. Kung gagamit ka ng
  `input.from: "${ .config }"`, ang task ay ang `config` object lang ang
  nakikita, hindi ang buong context.

### Nawawalang output

Kung natapos ang workflow pero walang laman ang output, i-check kung ang resulta
ng huling task ay ang inaasahan mo. Ang workflow output ay ang buong data
context sa pagkumpleto, na may mga internal key na na-filter out.

---

## "Permission denied" sa workflow_delete

Lino-load muna ng `workflow_delete` tool ang workflow gamit ang kasalukuyang
taint level ng session. Kung na-save ang workflow sa classification level na
lumampas sa iyong session taint, magbabalik ng null ang load at magre-report ang
`workflow_delete` ng "not found" sa halip na "permission denied."

Sadya ito -- hindi ibinibunyag ang pag-iral ng classified workflow sa mga
mas mababang classification session.

**Solusyon:** I-escalate ang iyong session taint para tumugma o lumampas sa
classification level ng workflow bago ito i-delete. O i-delete ito mula sa
parehong uri ng session kung saan ito orihinal na na-save.

---

## Self-Healing

### "Step metadata missing on task 'X': self-healing requires description, expects, produces"

Kapag `true` ang `self_healing.enabled`, kailangang may tatlong metadata field
ang bawat task. Rini-reject ng parser ang workflow sa oras ng pag-save kapag
kulang ang alinman.

**Solusyon:** Idagdag ang `description`, `expects`, at `produces` sa `metadata`
block ng bawat task:

```yaml
- my-task:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "What this step does and why"
      expects: "What this step needs as input"
      produces: "What this step outputs"
```

---

### "Self-healing config mutation rejected in version proposal"

Nag-propose ang healing agent ng bagong workflow version na nagbabago ng
`self_healing` config block. Ipinagbabawal ito — hindi puwedeng baguhin ng
agent ang sarili nitong healing configuration.

Gumagana ito ayon sa intensyon. Mga tao lang ang puwedeng magbago ng
`self_healing` config sa pamamagitan ng direktang pag-save ng bagong version ng
workflow gamit ang `workflow_save`.

---

### Hindi nag-i-spawn ang healing agent

Tumatakbo ang workflow pero walang lumalabas na healing agent. I-check ang mga
sumusunod:

1. **`enabled` ay `true`** sa `metadata.triggerfish.self_healing`.
2. **Nasa tamang lokasyon ang config** — kailangang naka-nest sa ilalim ng
   `metadata.triggerfish.self_healing`, hindi sa top level.
3. **Lahat ng step ay may metadata** — kung nabigo ang validation sa oras ng
   pag-save, na-save ang workflow nang walang naka-enable na self-healing.

---

### Mga proposed fix na natigil sa pending

Kung `true` ang `approval_required` (ang default), naghihintay ang mga proposed
version ng human review. Gamitin ang `workflow_version_list` para makita ang mga
pending proposal at `workflow_version_approve` o `workflow_version_reject` para
kumilos sa mga ito.

---

### "Retry budget exhausted" / Escalation bilang unresolvable

Nagamit na ng healing agent ang lahat ng intervention attempt nito (default 3)
nang hindi nareresolba ang isyu. Ine-escalate ito bilang `unresolvable` at
humihinto sa pag-attempt ng mga fix.

**Solusyon:**

- I-check ang `workflow_healing_status` para makita kung anong mga intervention
  ang sinubukan.
- Suriin at ayusin ang pinagmumulang isyu nang manu-mano.
- Para payagan ang mas maraming attempt, dagdagan ang `retry_budget` sa
  self-healing config at i-re-save ang workflow.
