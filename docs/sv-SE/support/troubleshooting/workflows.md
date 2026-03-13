---
title: Felsökning av arbetsflöden
description: Vanliga problem och lösningar när du arbetar med Triggerfish-arbetsflöden.
---

# Felsökning: Arbetsflöden

## "Workflow not found or not accessible"

Arbetsflödet finns men är lagrat på en högre klassificeringsnivå än din nuvarande sessions taint.

Arbetsflöden sparade under en `CONFIDENTIAL`-session är osynliga för `PUBLIC`- eller `INTERNAL`-sessioner. Lagret använder `canFlowTo`-kontroller vid varje laddning och returnerar `null` (visas som "hittades ej") när arbetsflödets klassificering överstiger sessionens taint.

**Åtgärd:** Eskalera din sessions taint genom att komma åt klassificerad data först, eller spara om arbetsflödet från en lägre klassificeringssession om innehållet tillåter det.

**Verifiera:** Kör `workflow_list` för att se vilka arbetsflöden som är synliga vid din nuvarande klassificeringsnivå. Om arbetsflödet du förväntar dig saknas, sparades det på en högre nivå.

---

## "Workflow classification ceiling breached"

Sessionens taintnivå överstiger arbetsflödets `classification_ceiling`. Den här kontrollen körs före varje uppgift, så den kan utlösas mitt i körningen om en tidigare uppgift eskalerade sessionens taint.

Till exempel kommer ett arbetsflöde med `classification_ceiling: INTERNAL` att stanna om ett `triggerfish:memory`-anrop hämtar `CONFIDENTIAL`-data som eskalerar sessionens taint.

**Åtgärd:**

- Höj arbetsflödets `classification_ceiling` för att matcha förväntad datakänslighet.
- Eller omstrukturera arbetsflödet så att klassificerad data inte nås. Använd indataparametrar istället för att läsa klassificerat minne.

---

## YAML-tolkningsfel

### "YAML parse error: ..."

Vanliga YAML-syntaxmisstag:

**Indragning.** YAML är känsligt för blanksteg. Använd mellanslag, inte tabulatorer. Varje kapslingsnivå ska vara exakt 2 mellanslag.

```yaml
# Fel — tabulatorer eller inkonsekvent indragning
do:
- fetch:
      call: http

# Rätt
do:
  - fetch:
      call: http
```

**Saknade citattecken runt uttryck.** Uttryckssträngar med `${ }` måste citeras, annars tolkar YAML `{` som en inline-mappning.

```yaml
# Fel — YAML-tolkningsfel
endpoint: ${ .config.url }

# Rätt
endpoint: "${ .config.url }"
```

**Saknat `document`-block.** Varje arbetsflöde måste ha ett `document`-fält med `dsl`, `namespace` och `name`:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

YAML tolkades korrekt men resultatet är en skalär eller array, inte ett objekt. Kontrollera att din YAML har toppnivånycklar (`document`, `do`).

### "Task has no recognized type"

Varje uppgiftspost måste innehålla exakt en typnyckel: `call`, `run`, `set`, `switch`, `for`, `raise`, `emit` eller `wait`. Om tolkaren inte hittar någon av dessa rapporterar den en oigenkänd typ.

Vanlig orsak: ett stavfel i uppgiftstypsnamnet (t.ex. `calls` istället för `call`).

---

## Uttrycksutvärderingsfel

### Felaktiga eller tomma värden

Uttryck använder `${ .sökväg.till.värde }`-syntax. Den inledande punkten krävs — den förankrar sökvägen till arbetsflödets datakontextrot.

```yaml
# Fel — saknar inledande punkt
value: "${ result.name }"

# Rätt
value: "${ .result.name }"
```

### "undefined" i utdata

Punkt-sökvägen löste upp till ingenting. Vanliga orsaker:

- **Fel uppgiftsnamn.** Varje uppgift lagrar sitt resultat under sitt eget namn. Om din uppgift heter `fetch_data`, referera till dess resultat som `${ .fetch_data }`, inte `${ .data }` eller `${ .result }`.
- **Fel kapsling.** Om HTTP-anropet returnerar `{"data": {"items": [...]}}` finns elementen på `${ .fetch_data.data.items }`.
- **Arrayindexering.** Använd hakparentes-syntax: `${ .items[0].name }`. Punkt-sökvägar stöder inte numeriska index.

### Booleska villkor fungerar inte

Uttrycksjämförelser är strikta (`===`). Se till att typerna matchar:

```yaml
# Det här misslyckas om .count är strängen "0"
if: "${ .count == 0 }"

# Fungerar när .count är ett nummer
if: "${ .count == 0 }"
```

Kontrollera om uppströms uppgifter returnerar strängar eller nummer. HTTP-svar returnerar ofta strängvärden som behöver jämföras mot strängformen.

---

## HTTP-anropsfel

### Timeouts

HTTP-anrop går via `web_fetch`-verktyget. Om målservern är långsam kan förfrågan ta för lång tid. Det finns ingen per-uppgifts timeout-åsidosättning för HTTP-anrop i arbetsflödes-DSL:en — `web_fetch`-verktygets standardtimeout gäller.

### SSRF-block

All utgående HTTP i Triggerfish löser upp DNS först och kontrollerar den lösta IP:en mot en hårdkodad nekalista. Privata och reserverade IP-intervall blockeras alltid.

Om ditt arbetsflöde anropar en intern tjänst på en privat IP (t.ex. `http://192.168.1.100/api`) blockeras det av SSRF-skydd. Det är avsiktligt och kan inte konfigureras.

**Åtgärd:** Använd ett publikt värdnamn som löser upp till en publik IP, eller använd `triggerfish:mcp` för att dirigera via en MCP-server som har direkt åtkomst.

### Saknade headers

Anropstypen `http` mappar `with.headers` direkt till förfrågans headers. Om ditt API kräver autentisering, inkludera headern:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Se till att tokenvärdet tillhandahålls i arbetsflödets indata eller ställs in av en tidigare uppgift.

---

## Rekursionsgräns för underarbetsflöden

### "Workflow recursion depth exceeded maximum of 5"

Underarbetsflöden kan kapslas upp till 5 nivåer djupt. Den här gränsen förhindrar oändlig rekursion när arbetsflöde A anropar arbetsflöde B som anropar arbetsflöde A.

**Åtgärd:**

- Platta ut arbetsflödeskedjan. Kombinera steg i färre arbetsflöden.
- Kontrollera för cirkulära referenser där två arbetsflöden anropar varandra.

---

## Skalexekvering inaktiverad

### "Shell execution failed" eller tomt resultat från körningsuppgifter

Flaggan `allowShellExecution` i arbetsflödets verktygskontext styr om `run`-uppgifter med `shell`- eller `script`-mål är tillåtna. När det är inaktiverat misslyckas dessa uppgifter.

**Åtgärd:** Kontrollera om skalexekvering är aktiverat i din Triggerfish-konfiguration. I produktionsmiljöer kan skalexekvering avsiktligt vara inaktiverat av säkerhetsskäl.

---

## Arbetsflödet körs men producerar fel utdata

### Felsökning med `workflow_history`

Använd `workflow_history` för att inspektera tidigare körningar:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

Varje historikpost inkluderar:

- **status** — `completed` eller `failed`
- **error** — felmeddelande om det misslyckades
- **taskCount** — antal uppgifter i arbetsflödet
- **startedAt / completedAt** — tidinformation

### Kontrollera kontextflöde

Varje uppgift lagrar sitt resultat i datakontexten under uppgiftens namn. Om ditt arbetsflöde har uppgifter namngivna `fetch`, `transform` och `save` ser datakontexten efter alla tre uppgifterna ut så här:

```json
{
  "fetch": { "...HTTP-svar..." },
  "transform": { "...transformerad data..." },
  "save": { "...sparresultat..." }
}
```

Vanliga misstag:

- **Skriver över kontext.** En `set`-uppgift som tilldelar till en nyckel som redan finns ersätter det föregående värdet.
- **Fel uppgiftsreferens.** Refererar till `${ .step1 }` när uppgiften heter `step_1`.
- **Indata-transform ersätter kontext.** Ett `input.from`-direktiv ersätter uppgiftens indatakontext helt. Om du använder `input.from: "${ .config }"` ser uppgiften bara `config`-objektet, inte hela kontexten.

### Saknad utdata

Om arbetsflödet slutförs men returnerar tom utdata, kontrollera om den sista uppgiftens resultat är vad du förväntar dig. Arbetsflödets utdata är hela datakontexten vid slutförande, med interna nycklar filtrerade bort.

---

## "Permission denied" på workflow_delete

Verktyget `workflow_delete` laddar arbetsflödet först med sessionens nuvarande taintnivå. Om arbetsflödet sparades på en klassificeringsnivå som överstiger din sessions taint returnerar laddningen null och `workflow_delete` rapporterar "hittades ej" snarare än "behörighet nekad".

Det är avsiktligt — existensen av klassificerade arbetsflöden röjs inte för lägre klassificeringssessioner.

**Åtgärd:** Eskalera din sessions taint för att matcha eller överstiga arbetsflödets klassificeringsnivå innan du tar bort det. Eller ta bort det från samma sessionstyp där det ursprungligen sparades.

---

## Självläkning

### "Step metadata missing on task 'X': self-healing requires description, expects, produces"

När `self_healing.enabled` är `true` måste varje uppgift ha alla tre metadatafält. Tolkaren avvisar arbetsflödet vid sparning om något saknas.

**Åtgärd:** Lägg till `description`, `expects` och `produces` i varje uppgifts `metadata`-block:

```yaml
- my-task:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "Vad det här steget gör och varför"
      expects: "Vad det här steget behöver som indata"
      produces: "Vad det här steget producerar som utdata"
```

---

### "Self-healing config mutation rejected in version proposal"

Självläkningsagenten föreslog en ny arbetsflödesversion som ändrar `self_healing`-konfigurationsblocket. Det är förbjudet — agenten kan inte ändra sin egen självläkningskonfiguration.

Det här fungerar som avsett. Bara människor kan ändra `self_healing`-konfigurationen genom att spara en ny version av arbetsflödet direkt via `workflow_save`.

---

### Självläkningsagent startar inte

Arbetsflödet körs men ingen självläkningsagent visas. Kontrollera:

1. **`enabled` är `true`** i `metadata.triggerfish.self_healing`.
2. **Konfigurationen är på rätt plats** — måste vara kapslad under `metadata.triggerfish.self_healing`, inte på toppnivå.
3. **Alla steg har metadata** — om validering misslyckas vid sparning sparades arbetsflödet utan självläkning aktiverat.

---

### Föreslagna korrigeringar fastnade i väntetillstånd

Om `approval_required` är `true` (standard) väntar föreslagna versioner på mänsklig granskning. Använd `workflow_version_list` för att se väntande förslag och `workflow_version_approve` eller `workflow_version_reject` för att agera på dem.

---

### "Retry budget exhausted" / Olösbar eskalering

Självläkningsagenten har förbrukat alla sina ingrepp-försök (standard 3) utan att lösa problemet. Den eskalerar som `unresolvable` och slutar försöka korrigera.

**Åtgärd:**

- Kontrollera `workflow_healing_status` för att se vilka ingrepp som prövades.
- Granska och korrigera det underliggande problemet manuellt.
- För att tillåta fler försök, öka `retry_budget` i självläkningskonfigurationen och spara om arbetsflödet.
