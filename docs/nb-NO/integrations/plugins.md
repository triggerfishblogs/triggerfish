# Plugins

Triggerfish-plugins utvider agenten med tilpassede verktøy. En plugin er en TypeScript-modul som eksporterer et manifest, verktøydefinisjoner og en executor-funksjon. Agenten kan bygge plugins selv, skanne dem for sikkerhetsproblemer og laste dem ved kjøretid — alt innenfor en enkelt samtale.

## Hvordan plugins fungerer

En plugin befinner seg i en mappe med et `mod.ts`-inngangspunkt:

```
~/.triggerfish/plugins/min-plugin/
  mod.ts    # eksporterer: manifest, toolDefinitions, createExecutor
```

Når den lastes, blir pluginens verktøy tilgjengelige for agenten som `plugin_<navn>_<verktøynavn>`. Klassifisering, taint og policy-hooks gjelder nøyaktig som for innebygde verktøy — plugins er bare en annen verktøykilde i utsendingskjeden.

## Skrive en plugin

En minimal plugin som spørrer en REST-API:

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

### Nødvendige eksporter

| Eksport            | Type                                | Beskrivelse                                        |
| ------------------ | ----------------------------------- | -------------------------------------------------- |
| `manifest`         | `PluginManifest`                    | Pluginidentitet, klassifisering, tillit, endepunkter|
| `toolDefinitions`  | `ToolDefinition[]`                  | Verktøy pluginen tilbyr                            |
| `createExecutor`   | `(context) => (name, input) => ...` | Fabrikk som returnerer verktøyhåndtereren          |
| `systemPrompt`     | `string` (valgfritt)                | Injiseres i agentens systemprompt                  |

### Manifestfelter

| Felt                 | Type       | Beskrivelse                                                      |
| -------------------- | ---------- | ---------------------------------------------------------------- |
| `name`               | `string`   | Må samsvare med mappenavn. Bare små bokstaver og bindestreker    |
| `version`            | `string`   | Semantisk versjon (f.eks. `"1.0.0"`)                            |
| `description`        | `string`   | Menneskelig lesbar beskrivelse                                   |
| `classification`     | `string`   | `"PUBLIC"`, `"INTERNAL"`, `"CONFIDENTIAL"` eller `"RESTRICTED"` |
| `trust`              | `string`   | `"sandboxed"` (standard) eller `"trusted"`                      |
| `declaredEndpoints`  | `string[]` | Nettverkstillatelsesliste for sandkasseplugins                   |

### Executor-funksjonen

`createExecutor(context)` mottar en `PluginContext` med:

- `pluginName` — pluginens navn
- `getSessionTaint()` — gjeldende session klassifiseringsnivå
- `escalateTaint(level)` — hev session taint (kan ikke senke)
- `log` — strukturert logger scoped til pluginen (`debug`, `info`, `warn`, `error`)
- `config` — plugin-spesifikk konfigurasjon fra `triggerfish.yaml`

Den returnerte funksjonen tar `(name: string, input: Record<string, unknown>)` og returnerer `string | null`. Returner `null` for ukjente verktøynavn.

## Agent Bygg→Last-flyt

Den primære plugin-arbeidsflyten: agenten skriver en plugin, validerer den og laster den — alt ved kjøretid.

```
1. Agent skriver mod.ts    →  exec_write("min-plugin/mod.ts", kode)
2. Agent skanner pluginen  →  plugin_scan({ path: "/workspace/min-plugin" })
3. Agent laster pluginen   →  plugin_install({ name: "min-plugin", path: "/workspace/min-plugin" })
4. Plugin-verktøy er live  →  plugin_min-plugin_forecast({ city: "Oslo" })
```

Ingen `triggerfish.yaml`-oppføring er nødvendig. Sikkerhetsskanneren er portvakten — plugins lastet uten konfigurasjon er som standard **sandkasse** og bruker klassifiseringen fra manifestet.

### Agent plugin-verktøy

Agenten har fire innebygde verktøy for å administrere plugins:

| Verktøy          | Parametere                  | Beskrivelse                                               |
| ---------------- | --------------------------- | --------------------------------------------------------- |
| `plugin_scan`    | `path` (påkrevd)            | Sikkerhetsskann en plugin-mappe før lasting               |
| `plugin_install` | `name` (påkrevd), `path`    | Last en plugin etter navn eller sti                       |
| `plugin_reload`  | `name` (påkrevd)            | Hot-swap en kjørende plugin fra kildesiten                |
| `plugin_list`    | (ingen)                     | List alle registrerte plugins med metadata                |

**`plugin_install`-detaljer:**

- `name` — brukt som verktøynavneromsprefiks (`plugin_<navn>_`)
- `path` — absolutt sti til plugin-mappen. Når gitt, lastes fra den stien (f.eks. agentens arbeidsområde). Når utelatt, lastes fra `~/.triggerfish/plugins/<navn>/`
- Sikkerhetsskanning er obligatorisk ved hver installasjon. Hvis skanningen mislykkes, avvises pluginen.
- Ingen konfigurasjonsoppføring er nødvendig.

**`plugin_reload`-detaljer:**

Avregistrerer den gamle pluginen, skanner og importerer på nytt fra den originale kildesien, deretter registreres den på nytt. Hvis et trinn mislykkes, gjenopprettes den gamle versjonen. Agenten ser oppdaterte verktøy i neste omgang.

## Sikkerhetsskanning

Alle plugins skannes for farlige mønstre før lasting. Skanneren kjøres ved **oppstart** (for forhåndskonfigurerte plugins) og ved **kjøretid** (ved hver `plugin_install` og `plugin_reload`).

### Hva som skannes

Skanneren sjekker alle `.ts`-filer i plugin-mappen for:

| Kategori           | Eksempler                                | Alvorlighet |
| ------------------ | ---------------------------------------- | ----------- |
| Kodeutføring       | `eval()`, `new Function()`, `atob`       | Kritisk     |
| Prompt-injeksjon   | «ignore previous instructions»          | Kritisk     |
| Underprosess-tilgang | `Deno.command`, `Deno.run`             | Kritisk     |
| Steganografi       | Zero-width Unicode-tegn                  | Kritisk     |
| Nettverkslyttere   | `Deno.listen`, `Deno.serve`              | Kritisk     |
| Miljøtilgang       | `Deno.env.get()`                         | Moderat     |
| Filsystemtilgang   | `Deno.readTextFile`, `Deno.writeFile`    | Moderat     |
| Dynamiske importer | `import("https://...")`                  | Moderat     |
| Obfuskering        | ROT13-koding, base64-manipulering        | Moderat     |

### Poengsummodell

Hvert mønster har en vekt (1–3). En plugin avvises hvis:

- Et **kritisk mønster** (vekt >= 3) oppdages, ELLER
- Den **kumulative poengsummen** når terskelen (>= 4)

Dette betyr at `eval()` alene forårsaker avvisning (vekt 3, kritisk), mens `Deno.env`-tilgang (vekt 2) bare feiler hvis kombinert med et annet moderat mønster.

### Forhåndssjekk med `plugin_scan`

Agenten bør kalle `plugin_scan` før `plugin_install` for å fange problemer:

```
plugin_scan({ path: "/workspace/min-plugin" })
→ { "ok": true, "scannedFiles": ["mod.ts"] }

plugin_scan({ path: "/workspace/dårlig-plugin" })
→ { "ok": false, "warnings": ["eval() detected in mod.ts:3"], "scannedFiles": ["mod.ts"] }
```

Hvis skanningen mislykkes, kan agenten fikse koden og skanne på nytt før forsøk på lasting.

## Tillitsmodell

Tillit krever at begge sider er enige:

```
effektivTillit = (manifest.trust === "trusted" OG config.trust === "trusted")
                 ? "trusted" : "sandboxed"
```

- **Sandkasse** (standard): Executor-feil fanges og returneres som verktøyresultater. Nettverk begrenset til `declaredEndpoints`. Bruk for ikke-betrodde eller agent-bygde plugins.
- **Betrodd**: Executor kjøres med normale Deno-tillatelser. Bruk for plugins som trenger system-API-er som `Deno.hostname()` eller `Deno.memoryUsage()`.

En plugin bygget av agenten kjøres alltid i sandkasse. En plugin i `~/.triggerfish/plugins/` kan gis betrodd status via konfigurasjon.

## Konfigurasjon (valgfritt)

Plugins fungerer uten konfigurasjon. Legg til en konfigurasjonsoppføring i `triggerfish.yaml` bare når du trenger å:

- Gi `trusted`-tillatelser
- Overstyre klassifiseringsnivået
- Gi plugin-spesifikke innstillinger

```yaml
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: ${WEATHER_API_KEY}    # tilgjengelig som context.config.api_key
```

## Verktøynavngiving

Verktøy prefikses automatisk for å forhindre konflikter:

- Plugin-verktøy `forecast` i plugin `weather` blir `plugin_weather_forecast`
- Executor dekoder prefikset (lengste-samsvar-først) og delegerer til riktig plugin med det opprinnelige verktøynavnet

## Klassifisering og taint

Plugin-verktøy følger de samme klassifiseringsreglene som alle andre verktøy:

- Manifestets `classification`-nivå registreres for alle verktøy med `plugin_<navn>_`-prefikset
- Session taint eskalerer når plugin-verktøy returnerer data på et høyere nivå
- Write-down-forebygging gjelder: en CONFIDENTIAL-plugin kan ikke ha sine data flyte til en PUBLIC-kanal
- All hook-håndhevelse (PRE_TOOL_CALL, POST_TOOL_RESPONSE) gjelder uendret

## The Reef: Plugin-markedsplass

Plugins kan publiseres til og installeres fra The Reef, den samme markedsplassen som brukes for ferdigheter.

### CLI-kommandoer

```bash
triggerfish plugin search "weather"     # Søk etter plugins
triggerfish plugin install weather      # Installer fra The Reef
triggerfish plugin update               # Sjekk for oppdateringer
triggerfish plugin publish ./min-plugin # Forbered for publisering
triggerfish plugin scan ./min-plugin    # Sikkerhetsskann
triggerfish plugin list                 # List installerte plugins
```

### Installer fra The Reef

Reef-installasjoner verifiseres med SHA-256-sjekksummer og sikkerhetsskannes før aktivering:

```
1. Hent catalog.json (bufret 1 time)
2. Finn siste versjon av pluginen
3. Last ned mod.ts
4. Verifiser SHA-256-sjekksummen mot katalogoppføring
5. Skriv til ~/.triggerfish/plugins/<navn>/mod.ts
6. Sikkerhetsskann — fjern hvis skanningen mislykkes
7. Registrer integritets-hash i .plugin-hash.json
```

## Oppstartslasting

Forhåndsinstallerte plugins i `~/.triggerfish/plugins/` lastes ved oppstart:

1. Laster skanner etter undermapper med `mod.ts`
2. Hvert modul importeres dynamisk og valideres
3. Bare plugins med `enabled: true` i konfigurasjon initialiseres ved oppstart
4. Sikkerhetsskanner kjøres før lasting
5. Tillit løses, executorer opprettes, verktøy registreres
6. Plugin-verktøy vises ved siden av innebygde verktøy umiddelbart
