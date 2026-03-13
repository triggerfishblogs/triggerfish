# Plugins

Triggerfish-plugins breiden de agent uit met aangepaste tools. Een plugin is een TypeScript-module die een manifest, tooltefinities en een executorfunctie exporteert. De agent kan zelf plugins bouwen, ze scannen op beveiligingsproblemen en ze tijdens uitvoering laden — alles binnen één conversatie.

## Hoe plugins werken

Een plugin bevindt zich in een map met een `mod.ts`-ingangspunt:

```
~/.triggerfish/plugins/my-plugin/
  mod.ts    # exports: manifest, toolDefinitions, createExecutor
```

Wanneer geladen worden de tools van de plugin beschikbaar voor de agent als `plugin_<name>_<toolName>`. Classificatie, taint en beleidshooks gelden precies zoals voor ingebouwde tools — plugins zijn gewoon een andere toolbron in de verzendingsketen.

## Een plugin schrijven

Een minimale plugin die een REST API bevraagt:

```typescript
export const manifest = {
  name: "weather",
  version: "1.0.0",
  description: "Weather forecast lookups",
  classification: "PUBLIC" as const,
  trust: "sandboxed" as const,
  declaredEndpoints: ["https://api.weather.com"],
};

export const toolDefinitions = [
  {
    name: "forecast",
    description: "Get the weather forecast for a city.",
    parameters: {
      city: {
        type: "string",
        description: "City name",
        required: true,
      },
    },
  },
];

export const systemPrompt = "Use `forecast` to look up weather for any city.";

export function createExecutor(context) {
  return async (name, input) => {
    if (name !== "forecast") return null;
    const city = input.city;
    context.log.info("Fetching forecast", { city });
    const resp = await fetch(
      `https://api.weather.com/v1/forecast?city=${encodeURIComponent(city)}`,
    );
    return await resp.text();
  };
}
```

### Vereiste exports

| Export             | Type                                | Beschrijving                                            |
| ------------------ | ----------------------------------- | ------------------------------------------------------- |
| `manifest`         | `PluginManifest`                    | Plugin-identiteit, classificatie, vertrouwen, eindpunten |
| `toolDefinitions`  | `ToolDefinition[]`                  | Tools die de plugin biedt                               |
| `createExecutor`   | `(context) => (name, input) => ...` | Fabriekspatroon dat de toolhandler retourneert          |
| `systemPrompt`     | `string` (optioneel)                | Wordt ingespoten in de agentsysteemprompt               |

### Manifestvelden

| Veld                | Type       | Beschrijving                                                         |
| ------------------- | ---------- | -------------------------------------------------------------------- |
| `name`              | `string`   | Moet overeenkomen met mapnaam. Alleen kleine letters + koppeltekens  |
| `version`           | `string`   | Semantische versie (bijv. `"1.0.0"`)                                 |
| `description`       | `string`   | Leesbare beschrijving                                                |
| `classification`    | `string`   | `"PUBLIC"`, `"INTERNAL"`, `"CONFIDENTIAL"` of `"RESTRICTED"`        |
| `trust`             | `string`   | `"sandboxed"` (standaard) of `"trusted"`                             |
| `declaredEndpoints` | `string[]` | Netwerk-toestaan-lijst voor gesandboxede plugins                     |

### De executorfunctie

`createExecutor(context)` ontvangt een `PluginContext` met:

- `pluginName` — de naam van de plugin
- `getSessionTaint()` — huidig sessieclassificatieniveau
- `escalateTaint(level)` — sessietaint verhogen (kan niet worden verlaagd)
- `log` — gestructureerde logger beperkt tot de plugin (`debug`, `info`, `warn`, `error`)
- `config` — plugin-specifieke configuratie uit `triggerfish.yaml`

De geretourneerde functie neemt `(name: string, input: Record<string, unknown>)` en retourneert `string | null`. Retourneer `null` voor niet-herkende toolnamen.

## Agent Bouwen→Laden-flow

De primaire plugin-workflow: de agent schrijft een plugin, valideert hem en laadt hem — alles tijdens uitvoering.

```
1. Agent writes mod.ts     →  exec_write("my-plugin/mod.ts", code)
2. Agent scans the plugin  →  plugin_scan({ path: "/workspace/my-plugin" })
3. Agent loads the plugin  →  plugin_install({ name: "my-plugin", path: "/workspace/my-plugin" })
4. Plugin tools are live   →  plugin_my-plugin_forecast({ city: "Austin" })
```

Er is geen `triggerfish.yaml`-vermelding nodig. De beveiligingsscanner is de poortwachter — plugins die zonder configuratie worden geladen, zijn standaard **gesandboxed** en gebruiken de classificatie uit hun manifest.

### Agent-plugintools

De agent heeft vier ingebouwde tools voor het beheren van plugins:

| Tool             | Parameters                  | Beschrijving                                           |
| ---------------- | --------------------------- | ------------------------------------------------------ |
| `plugin_scan`    | `path` (vereist)            | Een pluginmap beveiligingscannen vóór laden            |
| `plugin_install` | `name` (vereist), `path`    | Een plugin laden op naam of pad                        |
| `plugin_reload`  | `name` (vereist)            | Een actieve plugin hot-swappen vanuit het bronpad      |
| `plugin_list`    | (geen)                      | Alle geregistreerde plugins met metadata weergeven     |

**`plugin_install`-details:**

- `name` — gebruikt als toolnaamruimte-prefix (`plugin_<name>_`)
- `path` — absoluut pad naar de pluginmap. Indien opgegeven, laden vanuit dat pad (bijv. de werkruimte van de agent). Indien weggelaten, laden vanuit `~/.triggerfish/plugins/<name>/`
- Beveiligingsscanning is verplicht bij elke installatie. Als de scan mislukt, wordt de plugin geweigerd.
- Er is geen configuratievermelding vereist. Als er een bestaat, worden de vertrouwen/classificatie-instellingen gerespecteerd; anders is de standaard gesandboxed.

**`plugin_reload`-details:**

Verwijdert de registratie van de oude plugin, scant opnieuw en importeert opnieuw vanuit het oorspronkelijke bronpad, vervolgens opnieuw registreren. Als een stap mislukt, wordt de oude versie hersteld. De agent ziet bijgewerkte tools bij zijn volgende beurt.

## Beveiligingsscanning

Elke plugin wordt gescand op gevaarlijke patronen vóór het laden. De scanner draait bij **opstarten** (voor vooraf geconfigureerde plugins) en bij **runtime** (bij elke `plugin_install` en `plugin_reload`).

### Wat er wordt gescand

De scanner controleert alle `.ts`-bestanden in de pluginmap op:

| Categorie          | Voorbeelden                                   | Ernst     |
| ------------------ | --------------------------------------------- | --------- |
| Code-uitvoering    | `eval()`, `new Function()`, `atob`            | Kritiek   |
| Prompt-injectie    | "ignore previous instructions"               | Kritiek   |
| Subproces-toegang  | `Deno.command`, `Deno.run`                    | Kritiek   |
| Steganografie      | Unicode-tekens met nulbreedte                 | Kritiek   |
| Netwerk-luisteraars | `Deno.listen`, `Deno.serve`                  | Kritiek   |
| Omgevingstoegang   | `Deno.env.get()`                              | Matig     |
| Bestandssysteem    | `Deno.readTextFile`, `Deno.writeFile`         | Matig     |
| Dynamische imports | `import("https://...")`                       | Matig     |
| Verduistering      | ROT13-codering, base64-manipulatie            | Matig     |

### Scoremodel

Elk patroon heeft een gewicht (1–3). Een plugin wordt geweigerd als:

- Een **kritiek patroon** (gewicht >= 3) wordt gedetecteerd, OF
- De **cumulatieve score** de drempel bereikt (>= 4)

Dit betekent dat `eval()` alleen al tot weigering leidt (gewicht 3, kritiek), terwijl `Deno.env`-toegang (gewicht 2) alleen mislukt als gecombineerd met een ander matig patroon.

### Vooraf controleren met `plugin_scan`

De agent moet `plugin_scan` aanroepen vóór `plugin_install` om problemen op te sporen:

```
plugin_scan({ path: "/workspace/my-plugin" })
→ { "ok": true, "scannedFiles": ["mod.ts"] }

plugin_scan({ path: "/workspace/bad-plugin" })
→ { "ok": false, "warnings": ["eval() detected in mod.ts:3"], "scannedFiles": ["mod.ts"] }
```

Als de scan mislukt, kan de agent de code repareren en opnieuw scannen vóór een laadpoging.

## Vertrouwensmodel

Vertrouwen vereist dat beide zijden het eens zijn:

```
effectiefVertrouwen = (manifest.trust === "trusted" EN config.trust === "trusted")
                      ? "trusted" : "sandboxed"
```

- **Gesandboxed** (standaard): Executorfouten worden opgevangen en als toolresultaten geretourneerd. Netwerk beperkt tot `declaredEndpoints`. Gebruik voor niet-vertrouwde of door agents gebouwde plugins.
- **Vertrouwd**: Executor draait met normale Deno-machtigingen. Gebruik voor plugins die systeem-API's nodig hebben zoals `Deno.hostname()` of `Deno.memoryUsage()`.

Een plugin gebouwd door de agent draait altijd gesandboxed (geen configuratievermelding betekent geen `trust: "trusted"`-verlening). Een plugin in `~/.triggerfish/plugins/` kan vertrouwde status krijgen via configuratie.

## Configuratie (optioneel)

Plugins werken zonder configuratie. Voeg een configuratievermelding toe in `triggerfish.yaml` alleen wanneer u dat nodig heeft om:

- `trusted`-machtigingen te verlenen
- Het classificatieniveau te overschrijven
- Plugin-specifieke instellingen door te geven

```yaml
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: ${WEATHER_API_KEY}    # available as context.config.api_key
```

Plugins geladen door de agent zonder configuratievermelding gebruiken de classificatie van hun manifest en zijn standaard gesandboxed.

## Tool-naamgeving

Tools worden automatisch van een prefix voorzien om botsingen te voorkomen:

- Plugin-tool `forecast` in plugin `weather` wordt `plugin_weather_forecast`
- De executor decodeert de prefix (langste-overeenkomst-eerst) en delegeert aan de juiste plugin met de oorspronkelijke toolnaam

## Classificatie en taint

Plugin-tools volgen dezelfde classificatieregels als alle andere tools:

- Het `classification`-niveau van het manifest wordt geregistreerd voor alle tools met de `plugin_<name>_`-prefix
- Sessietaint escaleert wanneer plugin-tools gegevens op een hoger niveau retourneren
- No-write-down-preventie geldt: gegevens van een CONFIDENTIAL-plugin kunnen niet stromen naar een PUBLIC-kanaal
- Alle hook-handhaving (PRE_TOOL_CALL, POST_TOOL_RESPONSE) blijft van toepassing

## The Reef: Plugin-marktplaats

Plugins kunnen worden gepubliceerd naar en geïnstalleerd vanuit The Reef, dezelfde marktplaats die voor skills wordt gebruikt.

### CLI-opdrachten

```bash
triggerfish plugin search "weather"     # Search for plugins
triggerfish plugin install weather      # Install from The Reef
triggerfish plugin update               # Check for updates
triggerfish plugin publish ./my-plugin  # Prepare for publishing
triggerfish plugin scan ./my-plugin     # Security scan
triggerfish plugin list                 # List installed plugins
```

### Installeren vanuit The Reef

Reef-installaties worden geverifieerd met SHA-256-controlesommen en beveiligingsgescand vóór activering:

```
1. Fetch catalog.json (cached 1 hour)
2. Find latest version of the plugin
3. Download mod.ts
4. Verify SHA-256 checksum matches catalog entry
5. Write to ~/.triggerfish/plugins/<name>/mod.ts
6. Security scan -- remove if scan fails
7. Record integrity hash in .plugin-hash.json
```

### Publiceren

De publiceeroprdacht valideert de plugin (manifest, exports, beveiligingsscan), berekent de SHA-256-controlsom en genereert een mapstructuur klaar voor indiening bij de Reef-repository.

## Opstartladen

Vooraf geïnstalleerde plugins in `~/.triggerfish/plugins/` worden bij opstarten geladen:

1. Lader scant op submappen met `mod.ts`
2. Elk module wordt dynamisch `import()`ed en gevalideerd
3. Alleen plugins met `enabled: true` in configuratie worden bij opstarten geïnitialiseerd
4. Beveiligingsscanner draait vóór laden
5. Vertrouwen wordt bepaald, executors worden gemaakt, tools worden geregistreerd
6. Plugin-tools verschijnen direct naast ingebouwde tools

Plugins die door de agent tijdens uitvoering worden geladen (via `plugin_install`) slaan de configuratiecontrole over — de beveiligingsscanner dient als poortwachter.

## Inline Plugin SDK (legacy)

De `Sandbox`- en `PluginSdk`-interfaces in `src/plugin/sandbox.ts` en `src/plugin/sdk.ts` ondersteunen inline code-uitvoering (TypeScript via `new Function` of Python via Pyodide WASM). Dit model wordt gebruikt voor ingebedde/beheerde plugins die codefragmenten uitvoeren in plaats van volledige pluginmodules.

### Runtime-omgeving

- **TypeScript-plugins** draaien direct in de Deno-sandbox
- **Python-plugins** draaien binnen Pyodide (een Python-interpreter gecompileerd naar WebAssembly), die zelf binnen de Deno-sandbox draait

### SDK-methoden

```typescript
// Get the user's delegated credential for a service
const credential = await sdk.get_user_credential("salesforce");

// Query an external system using the user's permissions
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Emit data back to the agent -- classification label is REQUIRED
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

### Beperkingen

| Beperking                                       | Hoe het wordt gehandhaafd                                           |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| Toegang tot niet-gedeclareerde netwerkeindpunten | Sandbox blokkeert alle netwerkaanroepen niet op de toestaan-lijst   |
| Gegevens uitzenden zonder classificatielabel    | SDK weigert niet-geclassificeerde gegevens                          |
| Gegevens lezen zonder taint-propagatie          | SDK taamt de sessie automatisch bij toegang tot gegevens            |
| Gegevens buiten Triggerfish opslaan             | Geen bestandssysteemtoegang vanuit de sandbox                       |
| Exfiltreren via zijkanalen                      | Resourcelimieten gehandhaafd, geen raw socket-toegang               |
| Systeeminloggegevens gebruiken                  | SDK blokkeert `get_system_credential()`; alleen gebruikersinloggegevens |

::: warning BEVEILIGING `sdk.get_system_credential()` is **opzettelijk geblokkeerd**. Plugins moeten altijd gedelegeerde gebruikersinloggegevens gebruiken via `sdk.get_user_credential()`. :::

### Databaseconnectiviteit

Native databasedrivers werken niet binnen de WASM-sandbox. Gebruik in plaats daarvan op HTTP gebaseerde API's:

| Database   | Op HTTP gebaseerde optie          |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST, Supabase SDK, Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK (HTTP)                    |
