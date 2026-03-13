---
title: Workflow-probleemoplossing
description: Veelvoorkomende problemen en oplossingen bij het werken met Triggerfish-workflows.
---

# Probleemoplossing: Workflows

## "Workflow not found or not accessible"

De workflow bestaat maar is opgeslagen op een hoger classificatieniveau dan
uw huidige sessie-taint.

Workflows opgeslagen tijdens een `CONFIDENTIAL`-sessie zijn onzichtbaar voor `PUBLIC`-
of `INTERNAL`-sessies. De opslag gebruikt `canFlowTo`-controles bij elk laden en
geeft `null` terug (weergegeven als "not found") wanneer de classificatie van de workflow
de sessie-taint overschrijdt.

**Oplossing:** Escaleer uw sessie-taint door eerst geclassificeerde gegevens te benaderen, of
sla de workflow opnieuw op vanuit een lager-classificerende sessie als de inhoud dat
toestaat.

**Verifieer:** Voer `workflow_list` uit om te zien welke workflows zichtbaar zijn op uw
huidig classificatieniveau. Als de workflow die u verwacht ontbreekt, is deze opgeslagen
op een hoger niveau.

---

## "Workflow classification ceiling breached"

Het taint-niveau van de sessie overschrijdt de `classification_ceiling` van de workflow. Deze
controle wordt uitgevoerd vóór elke taak, dus kan halverwege de uitvoering worden geactiveerd als een
eerdere taak de sessie-taint heeft geëscaleerd.

Bijvoorbeeld, een workflow met `classification_ceiling: INTERNAL` stopt als een
`triggerfish:memory`-aanroep `CONFIDENTIAL`-gegevens ophaalt die de sessie-taint escaleren.

**Oplossing:**

- Verhoog de `classification_ceiling` van de workflow om de verwachte gegevensgevoeligheid te matchen.
- Of herstructureer de workflow zodat geclassificeerde gegevens niet worden benaderd. Gebruik invoerparameters in plaats van geclassificeerd geheugen te lezen.

---

## YAML-parseerfouten

### "YAML parse error: ..."

Veelvoorkomende YAML-syntaxisfouten:

**Inspringing.** YAML is gevoelig voor witruimte. Gebruik spaties, geen tabs. Elk
nestniveau moet precies 2 spaties zijn.

```yaml
# Verkeerd — tabs of inconsistente inspringing
do:
- fetch:
      call: http

# Correct
do:
  - fetch:
      call: http
```

**Ontbrekende aanhalingstekens rondom expressies.** Expressietekenreeksen met `${ }` moeten
worden geciteerd, anders interpreteert YAML `{` als een inline-mapping.

```yaml
# Verkeerd — YAML-parseeerfout
endpoint: ${ .config.url }

# Correct
endpoint: "${ .config.url }"
```

**Ontbrekend `document`-blok.** Elke workflow moet een `document`-veld hebben met
`dsl`, `namespace` en `name`:

```yaml
document:
  dsl: "1.0"
  namespace: mijn-workflows
  name: mijn-workflow
```

### "Workflow YAML must be an object"

De YAML is succesvol geparseerd maar het resultaat is een scalaire waarde of array, geen object.
Controleer of uw YAML sleutels op het hoogste niveau heeft (`document`, `do`).

### "Task has no recognized type"

Elke taakvermeling moet precies één typesleutel bevatten: `call`, `run`, `set`,
`switch`, `for`, `raise`, `emit` of `wait`. Als de parser geen van
deze sleutels vindt, rapporteert het een niet-herkend type.

Veelvoorkomende oorzaak: een typfout in de taaknaam (bijv. `calls` in plaats van `call`).

---

## Expressie-evaluatiefouten

### Verkeerde of lege waarden

Expressies gebruiken de syntaxis `${ .pad.naar.waarde }`. De beginpunt is verplicht —
deze ankert het pad aan de datacontextroot van de workflow.

```yaml
# Verkeerd — ontbrekende beginpunt
value: "${ result.name }"

# Correct
value: "${ .result.name }"
```

### "undefined" in uitvoer

Het puntpad heeft niets opgelost. Veelvoorkomende oorzaken:

- **Verkeerde taaknaam.** Elke taak slaat zijn resultaat op onder zijn eigen naam. Als uw
  taak `fetch_data` heet, verwijs naar zijn resultaat als `${ .fetch_data }`, niet
  `${ .data }` of `${ .result }`.
- **Verkeerde nesting.** Als de HTTP-aanroep `{"data": {"items": [...]}}` teruggeeft, zijn
  de items op `${ .fetch_data.data.items }`.
- **Array-indexering.** Gebruik haakjes-syntaxis: `${ .items[0].name }`. Puntpaden alleen
  ondersteunen geen numerieke indices.

### Booleaanse voorwaarden werken niet

Expressievergelijkingen zijn strict (`===`). Zorg dat typen overeenkomen:

```yaml
# Dit mislukt als .count een tekenreeks "0" is
if: "${ .count == 0 }"

# Werkt wanneer .count een getal is
if: "${ .count == 0 }"
```

Controleer of bovenstrooms taken tekenreeksen of getallen teruggeven. HTTP-reacties geven
vaak tekenreekswaarden terug — vergelijk gewoon met de tekenreeksvorm.

---

## HTTP-aanroepfouten

### Time-outs

HTTP-aanroepen gaan via de `web_fetch`-tool. Als de doelserver traag is,
kan het verzoek een time-out krijgen. Er is geen per-taak time-out-overschrijving voor HTTP-aanroepen
in de workflow DSL — de standaard time-out van de `web_fetch`-tool is van toepassing.

### SSRF-blokkades

Alle uitgaande HTTP in Triggerfish lost DNS eerst op en controleert het opgeloste IP
tegen een hardgecodeerde blokkeerlijst. Privé- en gereserveerde IP-bereiken worden altijd geblokkeerd.

Als uw workflow een interne service aanroept op een privé-IP (bijv.
`http://192.168.1.100/api`), wordt dit geblokkeerd door SSRF-preventie. Dit is
ontwerp en kan niet worden geconfigureerd.

**Oplossing:** Gebruik een publieke hostnaam die wordt omgezet naar een publiek IP, of gebruik
`triggerfish:mcp` om via een MCP-server te routeren die directe toegang heeft.

### Ontbrekende headers

Het aanroeptype `http` mapt `with.headers` direct naar de verzoekheaders. Als
uw API authenticatie vereist, voeg dan de header toe:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Zorg dat de tokenwaarde wordt geleverd in de workflowinvoer of is ingesteld door een eerdere
taak.

---

## Sub-workflow recursielimiet

### "Workflow recursion depth exceeded maximum of 5"

Sub-workflows kunnen tot 5 niveaus diep nesten. Deze limiet voorkomt oneindige
recursie wanneer workflow A workflow B aanroept die workflow A aanroept.

**Oplossing:**

- Verflak de workflowketen. Combineer stappen in minder workflows.
- Controleer op circulaire verwijzingen waarbij twee workflows elkaar aanroepen.

---

## Shell-uitvoering uitgeschakeld

### "Shell execution failed" of leeg resultaat van run-taken

De vlag `allowShellExecution` in de workflowtoolcontext bepaalt of
`run`-taken met `shell`- of `script`-doelen zijn toegestaan. Wanneer uitgeschakeld,
mislukken deze taken.

**Oplossing:** Controleer of shell-uitvoering is ingeschakeld in uw Triggerfish-configuratie. In productieomgevingen kan shell-uitvoering opzettelijk zijn uitgeschakeld om beveiligingsredenen.

---

## Workflow wordt uitgevoerd maar produceert verkeerde uitvoer

### Foutopsporing met `workflow_history`

Gebruik `workflow_history` om vroegere uitvoeringen te inspecteren:

```
workflow_history with workflow_name: "mijn-workflow" and limit: "5"
```

Elke historievermeling bevat:

- **status** — `completed` of `failed`
- **error** — foutmelding als mislukt
- **taskCount** — aantal taken in de workflow
- **startedAt / completedAt** — timinginformatie

### Contextdoorstroom controleren

Elke taak slaat zijn resultaat op in de datacontext onder de naam van de taak. Als uw
workflow taken heeft genaamd `fetch`, `transform` en `save`, ziet de datacontext
na alle drie taken er als volgt uit:

```json
{
  "fetch": { "...http-reactie..." },
  "transform": { "...getransformeerde gegevens..." },
  "save": { "...opslagresultaat..." }
}
```

Veelgemaakte fouten:

- **Context overschrijven.** Een `set`-taak die toewijst aan een sleutel die al bestaat
  vervangt de vorige waarde.
- **Verkeerde taakreferentie.** Verwijzen naar `${ .stap1 }` terwijl de taak is genaamd
  `stap_1`.
- **Invoertransformatie vervangt context.** Een `input.from`-instructie vervangt de
  invoercontext van de taak volledig. Als u `input.from: "${ .config }"` gebruikt, ziet de
  taak alleen het `config`-object, niet de volledige context.

### Ontbrekende uitvoer

Als de workflow voltooit maar een lege uitvoer teruggeeft, controleer dan of het resultaat van de laatste
taak is wat u verwacht. De workflowuitvoer is de volledige datacontext
bij voltooiing, waarbij interne sleutels worden gefilterd.

---

## "Permission denied" bij workflow_delete

De `workflow_delete`-tool laadt de workflow eerst met het huidige taint-niveau van de sessie. Als de workflow is opgeslagen op een classificatieniveau dat uw sessie-taint overschrijdt, geeft het laden null terug en rapporteert `workflow_delete` "not found" in plaats van "permission denied."

Dit is opzettelijk — het bestaan van geclassificeerde workflows wordt niet bekendgemaakt aan lager-classificerende sessies.

**Oplossing:** Escaleer uw sessie-taint om te matchen of overstijgen met het classificatieniveau van de workflow vóór verwijdering. Of verwijder hem vanuit hetzelfde sessietype waar hij oorspronkelijk is opgeslagen.

---

## Zelfhelende workflows

### "Step metadata missing on task 'X': self-healing requires description, expects, produces"

Wanneer `self_healing.enabled` `true` is, moet elke taak alle drie de metagegevensvelden hebben. De parser weigert de workflow bij het opslaan als een ervan ontbreekt.

**Oplossing:** Voeg `description`, `expects` en `produces` toe aan het `metadata`-blok van elke taak:

```yaml
- mijn-taak:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "Wat deze stap doet en waarom"
      expects: "Wat deze stap als invoer nodig heeft"
      produces: "Wat deze stap uitvoert"
```

---

### "Self-healing config mutation rejected in version proposal"

De herstellende agent heeft een nieuwe workflowversie voorgesteld die het
`self_healing`-configuratieblok wijzigt. Dit is verboden — de agent kan zijn
eigen herstelconfiguratie niet wijzigen.

Dit werkt zoals bedoeld. Alleen mensen kunnen de `self_healing`-configuratie wijzigen
door direct een nieuwe versie van de workflow op te slaan via `workflow_save`.

---

### Herstellende agent spawnt niet

De workflow wordt uitgevoerd maar er verschijnt geen herstellende agent. Controleer:

1. **`enabled` is `true`** in `metadata.triggerfish.self_healing`.
2. **Configuratie staat op de juiste locatie** — moet zijn genest onder
   `metadata.triggerfish.self_healing`, niet op het hoogste niveau.
3. **Alle stappen hebben metagegevens** — als validatie mislukt bij het opslaan, is de workflow
   opgeslagen zonder zelfherstel ingeschakeld.

---

### Voorgestelde oplossingen blijven in afwachting

Als `approval_required` `true` is (de standaard), wachten voorgestelde versies op
menselijke beoordeling. Gebruik `workflow_version_list` om hangende voorstellen te zien en
`workflow_version_approve` of `workflow_version_reject` om er actie op te ondernemen.

---

### "Retry budget exhausted" / Onoplosbare escalatie

De herstellende agent heeft al zijn interventiepogingin gebruikt (standaard 3) zonder
het probleem op te lossen. De agent escaleert als `unresolvable` en stopt met het proberen van oplossingen.

**Oplossing:**

- Controleer `workflow_healing_status` om te zien welke interventies zijn geprobeerd.
- Bekijk en los het onderliggende probleem handmatig op.
- Om meer pogingen toe te staan, verhoog `retry_budget` in de zelfhelende configuratie
  en sla de workflow opnieuw op.
