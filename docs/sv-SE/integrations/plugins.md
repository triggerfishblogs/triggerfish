# Plugins

Triggerfish-plugins utökar agenten med anpassade verktyg. Ett plugin är en TypeScript-modul som exporterar ett manifest, verktygsdefinitioner och en exekveringsfunktion. Agenten kan bygga plugins själv, skanna dem för säkerhetsproblem och ladda dem under körtid — allt inom en enda konversation.

## Hur plugins fungerar

Ett plugin bor i en katalog med en `mod.ts`-ingångspunkt:

```
~/.triggerfish/plugins/mitt-plugin/
  mod.ts    # exporterar: manifest, toolDefinitions, createExecutor
```

När det laddas blir pluginets verktyg tillgängliga för agenten som `plugin_<namn>_<toolName>`. Klassificering, taint och policykrokar gäller precis som de gör för inbyggda verktyg — plugins är bara en annan verktygskälla i utskickskedjan.

## Skriva ett plugin

Ett minimalt plugin som frågar ett REST API:

```typescript
export const manifest = {
  name: "weather",
  version: "1.0.0",
  description: "Väderprognosfrågor",
  classification: "PUBLIC" as const,
  trust: "sandboxed" as const,
  declaredEndpoints: ["https://api.weather.com"],
};

export const toolDefinitions = [
  {
    name: "forecast",
    description: "Hämta väderprognosen för en stad.",
    parameters: {
      city: {
        type: "string",
        description: "Stadsnamn",
        required: true,
      },
    },
  },
];

export const systemPrompt = "Använd `forecast` för att hämta väder för valfri stad.";

export function createExecutor(context) {
  return async (name, input) => {
    if (name !== "forecast") return null;
    const city = input.city;
    context.log.info("Hämtar prognos", { city });
    const resp = await fetch(
      `https://api.weather.com/v1/forecast?city=${encodeURIComponent(city)}`,
    );
    return await resp.text();
  };
}
```

### Obligatoriska exporter

| Export            | Typ                                  | Beskrivning                                             |
| ----------------- | ------------------------------------ | ------------------------------------------------------- |
| `manifest`        | `PluginManifest`                     | Pluginets identitet, klassificering, förtroende, endpoints |
| `toolDefinitions` | `ToolDefinition[]`                   | Verktyg pluginet tillhandahåller                        |
| `createExecutor`  | `(context) => (name, input) => ...`  | Fabrik som returnerar verktygshanteraren                |
| `systemPrompt`    | `string` (valfri)                    | Injiceras i agentens systemprompt                       |

### Manifestfält

| Fält                 | Typ        | Beskrivning                                                         |
| -------------------- | ---------- | ------------------------------------------------------------------- |
| `name`               | `string`   | Måste matcha katalognamnet. Bara gemener + bindestreck              |
| `version`            | `string`   | Semantisk version (t.ex. `"1.0.0"`)                                 |
| `description`        | `string`   | Mänskligt läsbar beskrivning                                        |
| `classification`     | `string`   | `"PUBLIC"`, `"INTERNAL"`, `"CONFIDENTIAL"` eller `"RESTRICTED"`    |
| `trust`              | `string`   | `"sandboxed"` (standard) eller `"trusted"`                         |
| `declaredEndpoints`  | `string[]` | Nätverksvitstlista för sandboxade plugins                           |

### Exekveringsfunktionen

`createExecutor(context)` tar emot en `PluginContext` med:

- `pluginName` — pluginets namn
- `getSessionTaint()` — aktuell sessionsklassificeringsnivå
- `escalateTaint(level)` — höj sessions-taint (kan inte sänkas)
- `log` — strukturerad loggare scoped till pluginet (`debug`, `info`, `warn`, `error`)
- `config` — pluginspecifik konfiguration från `triggerfish.yaml`

Den returnerade funktionen tar `(name: string, input: Record<string, unknown>)` och returnerar `string | null`. Returnera `null` för okända verktygsnamn.

## Agent Bygg→Ladda-flöde

Det primära plugin-arbetsflödet: agenten skriver ett plugin, validerar det och laddar det — allt under körtid.

```
1. Agent skriver mod.ts     →  exec_write("mitt-plugin/mod.ts", kod)
2. Agent skannar pluginet   →  plugin_scan({ path: "/workspace/mitt-plugin" })
3. Agent laddar pluginet    →  plugin_install({ name: "mitt-plugin", path: "/workspace/mitt-plugin" })
4. Pluginverktyg är live    →  plugin_mitt-plugin_forecast({ city: "Stockholm" })
```

Ingen `triggerfish.yaml`-post krävs. Säkerhetsskannern är grindvakten — plugins laddade utan konfiguration standard till **sandboxat** förtroende och använder klassificeringen från deras manifest.

### Agent plugin-verktyg

Agenten har fyra inbyggda verktyg för att hantera plugins:

| Verktyg          | Parametrar                  | Beskrivning                                          |
| ---------------- | --------------------------- | ---------------------------------------------------- |
| `plugin_scan`    | `path` (obligatorisk)       | Säkerhetsskanna en pluginkatalog innan laddning      |
| `plugin_install` | `name` (obligatorisk), `path` | Ladda ett plugin med namn eller sökväg             |
| `plugin_reload`  | `name` (obligatorisk)       | Byt ut ett körande plugin från dess källsökväg       |
| `plugin_list`    | (ingen)                     | Lista alla registrerade plugins med metadata         |

**`plugin_install`-detaljer:**

- `name` — används som verktygets namnrymdsprefix (`plugin_<namn>_`)
- `path` — absolut sökväg till pluginkatalogen. När den tillhandahålls laddas från den sökvägen (t.ex. agentens arbetsyta). När den utelämnas laddas från `~/.triggerfish/plugins/<name>/`
- Säkerhetsskanning är obligatorisk vid varje installation. Om skanningen misslyckas avvisas pluginet.
- Ingen konfigurationspost krävs. Om en finns respekteras dess förtroende-/klassificeringsinställningar; annars standard till sandboxat.

**`plugin_reload`-detaljer:**

Avregistrerar det gamla pluginet, återskannar och reimporterar från den ursprungliga källsökvägen, och registrerar sedan om. Om något steg misslyckas återställs den gamla versionen. Agenten ser uppdaterade verktyg vid sin nästa tur.

## Säkerhetsskanning

Varje plugin skannas för farliga mönster innan laddning. Skannern körs vid **uppstart** (för förkonfigurerade plugins) och under **körtid** (vid varje `plugin_install` och `plugin_reload`).

### Vad som skannas

Skannern kontrollerar alla `.ts`-filer i pluginkatalogen för:

| Kategori             | Exempel                                    | Allvarlighet |
| -------------------- | ------------------------------------------ | ------------ |
| Kodexekvering        | `eval()`, `new Function()`, `atob`         | Kritisk      |
| Promptinjektion      | "ignorera föregående instruktioner"        | Kritisk      |
| Underprocessåtkomst  | `Deno.command`, `Deno.run`                 | Kritisk      |
| Steganografi         | Nollbredd-Unicode-tecken                   | Kritisk      |
| Nätverkslyssnare     | `Deno.listen`, `Deno.serve`                | Kritisk      |
| Miljöåtkomst         | `Deno.env.get()`                           | Måttlig      |
| Filsystemåtkomst     | `Deno.readTextFile`, `Deno.writeFile`      | Måttlig      |
| Dynamiska importer   | `import("https://...")`                    | Måttlig      |
| Fördunkling          | ROT13-kodning, base64-manipulation         | Måttlig      |

### Poängsättningsmodell

Varje mönster har en vikt (1-3). Ett plugin avvisas om:

- Något **kritiskt mönster** (vikt >= 3) identifieras, ELLER
- Den **kumulativa poängen** når tröskeln (>= 4)

Det innebär att `eval()` ensam orsakar avvisning (vikt 3, kritisk), medan `Deno.env`-åtkomst (vikt 2) bara misslyckas om den kombineras med ett annat måttligt mönster.

### Förkontroll med `plugin_scan`

Agenten bör anropa `plugin_scan` innan `plugin_install` för att fånga problem:

```
plugin_scan({ path: "/workspace/mitt-plugin" })
→ { "ok": true, "scannedFiles": ["mod.ts"] }

plugin_scan({ path: "/workspace/dåligt-plugin" })
→ { "ok": false, "warnings": ["eval() identifierad i mod.ts:3"], "scannedFiles": ["mod.ts"] }
```

Om skanningen misslyckas kan agenten fixa koden och skannas om innan den försöker ladda.

## Förtroendemodell

Förtroende kräver att båda sidor är överens:

```
effectiveTrust = (manifest.trust === "trusted" OCH config.trust === "trusted")
                 ? "trusted" : "sandboxed"
```

- **Sandboxat** (standard): Exekveringsfel fångas och returneras som verktygsresultat. Nätverk begränsat till `declaredEndpoints`. Använd för opålitliga eller agentbyggda plugins.
- **Betrodd**: Executor körs med normala Deno-behörigheter. Använd för plugins som behöver system-API:er som `Deno.hostname()` eller `Deno.memoryUsage()`.

Ett plugin byggt av agenten körs alltid sandboxat (ingen konfigurationspost innebär inget `trust: "trusted"`-beviljande). Ett plugin i `~/.triggerfish/plugins/` kan beviljas betrodd status via konfiguration.

## Konfiguration (valfri)

Plugins fungerar utan konfiguration. Lägg till en konfigurationspost i `triggerfish.yaml` bara när du behöver:

- Bevilja `trusted`-behörigheter
- Åsidosätta klassificeringsnivån
- Skicka pluginspecifika inställningar

```yaml
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: ${WEATHER_API_KEY}    # tillgänglig som context.config.api_key
```

Plugins laddade av agenten utan en konfigurationspost använder sina manifests klassificering och standard till sandboxat förtroende.

## Verktygnamnrymd

Verktyg prefixas automatiskt för att förhindra kollisioner:

- Plugin-verktyg `forecast` i plugin `weather` blir `plugin_weather_forecast`
- Exekutören avkodar prefixet (längst-match-först) och delegerar till rätt plugin med det ursprungliga verktygsnamnet

## Klassificering och taint

Plugin-verktyg följer samma klassificeringsregler som alla andra verktyg:

- Manifestets `classification`-nivå registreras för alla verktyg med `plugin_<namn>_`-prefixet
- Sessions-taint eskalerar när pluginverktyg returnerar data på en högre nivå
- Nedskrivningsskydd gäller: ett CONFIDENTIAL-plugin kan inte ha sina data flöda till en PUBLIC-kanal
- All krokstillämpning (PRE_TOOL_CALL, POST_TOOL_RESPONSE) gäller oförändrat

## Revet: Plugin-marknadsplatsen

Plugins kan publiceras till och installeras från Revet, samma marknadsplats som används för kunskaper.

### CLI-kommandon

```bash
triggerfish plugin search "weather"     # Sök efter plugins
triggerfish plugin install weather      # Installera från Revet
triggerfish plugin update               # Kontrollera uppdateringar
triggerfish plugin publish ./mitt-plugin  # Förbered för publicering
triggerfish plugin scan ./mitt-plugin     # Säkerhetsskanning
triggerfish plugin list                 # Lista installerade plugins
```

### Installera från Revet

Revet-installationer verifieras med SHA-256-checksummor och säkerhetsskannas innan aktivering:

```
1. Hämta catalog.json (cachat 1 timme)
2. Hitta senaste versionen av pluginet
3. Ladda ner mod.ts
4. Verifiera SHA-256-checksumman matchar katalogposten
5. Skriv till ~/.triggerfish/plugins/<namn>/mod.ts
6. Säkerhetsskanning — ta bort om skanning misslyckas
7. Registrera integritetshash i .plugin-hash.json
```

### Publicering

Publiceringskommandot validerar pluginet (manifest, exporter, säkerhetsskanning), beräknar SHA-256-checksumman och genererar en katalogstruktur klar för inlämning till Revet-repositoriet.

## Uppstartsladdning

Förinstallerade plugins i `~/.triggerfish/plugins/` laddas vid uppstart:

1. Laddaren skannar underkataloger med `mod.ts`
2. Varje modul importeras dynamiskt och valideras
3. Bara plugins med `enabled: true` i konfigurationen initialiseras vid uppstart
4. Säkerhetsskannern körs innan laddning
5. Förtroende löses upp, exekutörer skapas, verktyg registreras
6. Plugin-verktyg visas tillsammans med inbyggda verktyg omedelbart

Plugins laddade av agenten under körtid (via `plugin_install`) hoppar över konfigurationskontrollen — säkerhetsskannern fungerar som grindvakten.
