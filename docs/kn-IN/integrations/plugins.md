# Plugins

Triggerfish plugins custom tools ಜೊತೆ agent ವಿಸ್ತರಿಸುತ್ತವೆ. Plugin ಒಂದು TypeScript
module -- manifest, tool definitions, ಮತ್ತು executor function export ಮಾಡುತ್ತದೆ. Agent
ತಾನೇ plugins build ಮಾಡಬಹುದು, security issues ಗಾಗಿ scan ಮಾಡಬಹುದು, ಮತ್ತು runtime
ನಲ್ಲಿ load ಮಾಡಬಹುದು -- ಎಲ್ಲ ಒಂದೇ conversation ನಲ್ಲಿ.

## Plugins ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತವೆ

Plugin `mod.ts` entry point ಜೊತೆ directory ನಲ್ಲಿ ನೆಲೆಸಿರುತ್ತದೆ:

```
~/.triggerfish/plugins/my-plugin/
  mod.ts    # exports: manifest, toolDefinitions, createExecutor
```

Load ಆದಾಗ, plugin ನ tools agent ಗೆ `plugin_<name>_<toolName>` ಆಗಿ ಲಭ್ಯವಾಗುತ್ತವೆ.
Classification, taint, ಮತ್ತು policy hooks built-in tools ಗೆ ಅನ್ವಯಿಸುವಂತೆಯೇ
ಅನ್ವಯಿಸುತ್ತವೆ -- plugins dispatch chain ನಲ್ಲಿ ಮತ್ತೊಂದು tool source ಅಷ್ಟೆ.

## Plugin ಬರೆಯುವುದು

REST API query ಮಾಡುವ minimal plugin:

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

### Required Exports

| Export             | Type                                | ವಿವರಣೆ                                    |
| ------------------ | ----------------------------------- | ------------------------------------------ |
| `manifest`         | `PluginManifest`                    | Plugin identity, classification, trust, endpoints |
| `toolDefinitions`  | `ToolDefinition[]`                  | Plugin ಒದಗಿಸುವ tools                      |
| `createExecutor`   | `(context) => (name, input) => ...` | Tool handler ಹಿಂದಿರುಗಿಸುವ factory         |
| `systemPrompt`     | `string` (optional)                 | Agent system prompt ಗೆ inject ಮಾಡಲ್ಪಡುತ್ತದೆ |

### Manifest Fields

| Field                | Type       | ವಿವರಣೆ                                                           |
| -------------------- | ---------- | ----------------------------------------------------------------- |
| `name`               | `string`   | Directory name ಜೊತೆ ಹೊಂದಾಣಿಕೆಯಾಗಬೇಕು. Lowercase + hyphens ಮಾತ್ರ |
| `version`            | `string`   | Semantic version (ಉದಾ. `"1.0.0"`)                                |
| `description`        | `string`   | Human-readable ವಿವರಣೆ                                            |
| `classification`     | `string`   | `"PUBLIC"`, `"INTERNAL"`, `"CONFIDENTIAL"`, ಅಥವಾ `"RESTRICTED"` |
| `trust`              | `string`   | `"sandboxed"` (default) ಅಥವಾ `"trusted"`                         |
| `declaredEndpoints`  | `string[]` | Sandboxed plugins ಗಾಗಿ network allowlist                          |

### Executor Function

`createExecutor(context)` ಒಂದು `PluginContext` ಜೊತೆ receive ಮಾಡುತ್ತದೆ:

- `pluginName` -- plugin ನ ಹೆಸರು
- `getSessionTaint()` -- ಪ್ರಸ್ತುತ session classification level
- `escalateTaint(level)` -- session taint raise ಮಾಡಿ (ಕಡಿಮೆ ಮಾಡಲಾಗದು)
- `log` -- plugin ಗೆ scoped structured logger (`debug`, `info`, `warn`, `error`)
- `config` -- `triggerfish.yaml` ನಿಂದ plugin-specific config

Return ಮಾಡಿದ function `(name: string, input: Record<string, unknown>)` ತೆಗೆದುಕೊಂಡು
`string | null` ಹಿಂದಿರುಗಿಸುತ್ತದೆ. ಗುರುತಿಸಲ್ಪಡದ tool names ಗಾಗಿ `null` return ಮಾಡಿ.

## Agent Build→Load Flow

ಪ್ರಾಥಮಿಕ plugin workflow: agent plugin ಬರೆಯುತ್ತದೆ, validate ಮಾಡುತ್ತದೆ, ಮತ್ತು
load ಮಾಡುತ್ತದೆ -- ಎಲ್ಲ runtime ನಲ್ಲಿ.

```
1. Agent writes mod.ts     →  exec_write("my-plugin/mod.ts", code)
2. Agent scans the plugin  →  plugin_scan({ path: "/workspace/my-plugin" })
3. Agent loads the plugin  →  plugin_install({ name: "my-plugin", path: "/workspace/my-plugin" })
4. Plugin tools are live   →  plugin_my-plugin_forecast({ city: "Austin" })
```

`triggerfish.yaml` entry ಬೇಡ. Security scanner gatekeeper -- config ಇಲ್ಲದೆ load
ಆದ plugins default ಆಗಿ **sandboxed** trust ಮತ್ತು manifest ನ classification
ಬಳಸುತ್ತವೆ.

### Agent Plugin Tools

Agent ಗೆ plugins ನಿರ್ವಹಿಸಲು ನಾಲ್ಕು built-in tools ಇವೆ:

| Tool             | Parameters                   | ವಿವರಣೆ                                           |
| -------------------------------------------------------------------------------- |
| `plugin_scan`    | `path` (required)            | Loading ಮೊದಲು plugin directory security-scan ಮಾಡಿ |
| `plugin_install` | `name` (required), `path`    | Name ಅಥವಾ path ಮೂಲಕ plugin load ಮಾಡಿ             |
| `plugin_reload`  | `name` (required)            | Source path ನಿಂದ running plugin hot-swap ಮಾಡಿ    |
| `plugin_list`    | (none)                       | Metadata ಜೊತೆ ಎಲ್ಲ registered plugins list ಮಾಡಿ  |

**`plugin_install` ವಿವರಗಳು:**

- `name` -- tool namespace prefix ಆಗಿ ಬಳಕೆ (`plugin_<name>_`)
- `path` -- plugin directory ಗೆ absolute path. ನೀಡಿದರೆ, ಆ path ನಿಂದ load ಮಾಡುತ್ತದೆ
  (ಉದಾ. agent workspace). ಬಿಟ್ಟರೆ, `~/.triggerfish/plugins/<name>/` ನಿಂದ load ಮಾಡುತ್ತದೆ
- ಪ್ರತಿ install ನಲ್ಲಿ security scanning ಕಡ್ಡಾಯ. Scan ವಿಫಲವಾದರೆ plugin reject.
- Config entry ಅಗತ್ಯವಿಲ್ಲ. ಇದ್ದರೆ, ಅದರ trust/classification settings ಗೌರವಿಸಲ್ಪಡುತ್ತವೆ;
  ಇಲ್ಲದಿದ್ದರೆ sandboxed default.

**`plugin_reload` ವಿವರಗಳು:**

ಹಳೆ plugin unregister ಮಾಡಿ, original source path ನಿಂದ re-scan ಮತ್ತು re-import
ಮಾಡಿ, ನಂತರ re-register ಮಾಡುತ್ತದೆ. ಯಾವುದೇ step ವಿಫಲವಾದರೆ ಹಳೆ version restore
ಮಾಡಲ್ಪಡುತ್ತದೆ. Agent ಮುಂದಿನ turn ನಲ್ಲಿ updated tools ನೋಡುತ್ತದೆ.

## Security Scanning

ಪ್ರತಿ plugin load ಮಾಡುವ ಮೊದಲು dangerous patterns ಗಾಗಿ scan ಮಾಡಲ್ಪಡುತ್ತದೆ. Scanner
**startup** ನಲ್ಲಿ (pre-configured plugins ಗಾಗಿ) ಮತ್ತು **runtime** ನಲ್ಲಿ (ಪ್ರತಿ
`plugin_install` ಮತ್ತು `plugin_reload` ನಲ್ಲಿ) ಚಲಿಸುತ್ತದೆ.

### ಏನನ್ನು Scan ಮಾಡಲ್ಪಡುತ್ತದೆ

Scanner plugin directory ನ ಎಲ್ಲ `.ts` files ಪರಿಶೀಲಿಸುತ್ತದೆ:

| Category           | Examples                                 | Severity  |
| ------------------ | ---------------------------------------- | --------- |
| Code execution     | `eval()`, `new Function()`, `atob`       | Critical  |
| Prompt injection   | "ignore previous instructions"           | Critical  |
| Subprocess access  | `Deno.command`, `Deno.run`               | Critical  |
| Steganography      | Zero-width Unicode characters            | Critical  |
| Network listeners  | `Deno.listen`, `Deno.serve`              | Critical  |
| Environment access | `Deno.env.get()`                         | Moderate  |
| Filesystem access  | `Deno.readTextFile`, `Deno.writeFile`    | Moderate  |
| Dynamic imports    | `import("https://...")`                  | Moderate  |
| Obfuscation        | ROT13 encoding, base64 manipulation      | Moderate  |

### Scoring Model

ಪ್ರತಿ pattern ಗೆ weight (1--3) ಇದೆ. Plugin reject ಆಗುತ್ತದೆ ಅಗರ:

- ಯಾವುದೇ **critical pattern** (weight >= 3) ಕಂಡುಬಂದರೆ, ಅಥವಾ
- **cumulative score** threshold ತಲುಪಿದರೆ (>= 4)

ಅಂದರೆ `eval()` ಒಂದೇ rejection ತರುತ್ತದೆ (weight 3, critical), ಆದರೆ `Deno.env`
access (weight 2) ಮತ್ತೊಂದು moderate pattern ಜೊತೆ ಸೇರಿದರೆ ಮಾತ್ರ fail ಆಗುತ್ತದೆ.

### `plugin_scan` ಜೊತೆ Pre-Checking

Agent `plugin_install` ಮೊದಲು issues catch ಮಾಡಲು `plugin_scan` call ಮಾಡಬೇಕು:

```
plugin_scan({ path: "/workspace/my-plugin" })
→ { "ok": true, "scannedFiles": ["mod.ts"] }

plugin_scan({ path: "/workspace/bad-plugin" })
→ { "ok": false, "warnings": ["eval() detected in mod.ts:3"], "scannedFiles": ["mod.ts"] }
```

Scan ವಿಫಲವಾದರೆ, agent code fix ಮಾಡಿ load ಮಾಡಲು ಯತ್ನಿಸುವ ಮೊದಲು re-scan ಮಾಡಬಹುದು.

## Trust Model

Trust ಎರಡೂ ಕಡೆಯ ಒಪ್ಪಿಗೆ ಅಗತ್ಯ:

```
effectiveTrust = (manifest.trust === "trusted" AND config.trust === "trusted")
                 ? "trusted" : "sandboxed"
```

- **Sandboxed** (default): Executor errors catch ಮಾಡಿ tool results ಆಗಿ return.
  Network `declaredEndpoints` ಗೆ restrict. Untrusted ಅಥವಾ agent-built plugins
  ಗಾಗಿ ಬಳಸಿ.
- **Trusted**: Executor normal Deno permissions ಜೊತೆ ಚಲಿಸುತ್ತದೆ. `Deno.hostname()`
  ಅಥವಾ `Deno.memoryUsage()` ನಂತಹ system APIs ಬೇಕಾದ plugins ಗಾಗಿ ಬಳಸಿ.

Agent build ಮಾಡಿದ plugin ಯಾವಾಗಲೂ sandboxed ಚಲಿಸುತ್ತದೆ (config entry ಇಲ್ಲ ಅಂದರೆ
`trust: "trusted"` grant ಇಲ್ಲ). `~/.triggerfish/plugins/` ನ plugin config ಮೂಲಕ
trusted status grant ಮಾಡಬಹುದು.

## ಸಂರಚನೆ (Optional)

Plugins configuration ಇಲ್ಲದೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತವೆ. `triggerfish.yaml` ನಲ್ಲಿ config
entry ಸೇರಿಸಿ ಕೇವಲ ಇವು ಬೇಕಾದಾಗ:

- `trusted` permissions grant ಮಾಡಲು
- Classification level override ಮಾಡಲು
- Plugin-specific settings pass ಮಾಡಲು

```yaml
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: ${WEATHER_API_KEY}    # context.config.api_key ಆಗಿ ಲಭ್ಯ
```

Config entry ಇಲ್ಲದೆ agent load ಮಾಡಿದ plugins ತಮ್ಮ manifest ನ classification
ಬಳಸುತ್ತವೆ ಮತ್ತು default ಆಗಿ sandboxed trust.

## Tool Namespacing

Collision ತಡೆಯಲು tools ಸ್ವಯಂಚಾಲಿತವಾಗಿ prefixed:

- Plugin `weather` ನ tool `forecast` `plugin_weather_forecast` ಆಗುತ್ತದೆ
- Executor prefix decode ಮಾಡಿ (longest-match-first) original tool name ಜೊತೆ
  ಸರಿಯಾದ plugin ಗೆ delegate ಮಾಡುತ್ತದೆ

## Classification ಮತ್ತು Taint

Plugin tools ಇತರ tools ಅನ್ನುಸರಿಸಿ ಅದೇ classification rules ಪಾಲಿಸುತ್ತವೆ:

- Manifest ನ `classification` level ಎಲ್ಲ tools ಗಾಗಿ `plugin_<name>_` prefix ಜೊತೆ
  register ಮಾಡಲ್ಪಡುತ್ತದೆ
- Plugin tools ಹೆಚ್ಚಿನ level ನಲ್ಲಿ data return ಮಾಡಿದಾಗ session taint escalate ಆಗುತ್ತದೆ
- Write-down prevention ಅನ್ವಯಿಸುತ್ತದೆ: CONFIDENTIAL plugin ನ data PUBLIC channel
  ತಲುಪಲಾಗದು
- ಎಲ್ಲ hook enforcement (PRE_TOOL_CALL, POST_TOOL_RESPONSE) ಬದಲಾಗದೆ ಅನ್ವಯಿಸುತ್ತದೆ

## The Reef: Plugin Marketplace

Plugins skills ಗಾಗಿ ಬಳಸಲ್ಪಡುವ ಅದೇ marketplace The Reef ನಿಂದ publish ಮತ್ತು install
ಮಾಡಬಹುದು.

### CLI Commands

```bash
triggerfish plugin search "weather"     # Plugins ಹುಡುಕಿ
triggerfish plugin install weather      # The Reef ನಿಂದ install ಮಾಡಿ
triggerfish plugin update               # Updates ಪರಿಶೀಲಿಸಿ
triggerfish plugin publish ./my-plugin  # Publishing ಗಾಗಿ ಸಿದ್ಧಪಡಿಸಿ
triggerfish plugin scan ./my-plugin     # Security scan
triggerfish plugin list                 # Install ಆದ plugins list ಮಾಡಿ
```

### The Reef ನಿಂದ Install

Reef installs SHA-256 checksums ಜೊತೆ verify ಮತ್ತು activation ಮೊದಲು security-scan
ಮಾಡಲ್ಪಡುತ್ತವೆ:

```
1. catalog.json fetch (1 ಗಂಟೆ cache)
2. Plugin ನ latest version ಹುಡುಕಿ
3. mod.ts ಡೌನ್ಲೋಡ್
4. catalog entry ಜೊತೆ SHA-256 checksum verify
5. ~/.triggerfish/plugins/<name>/mod.ts ಗೆ write
6. Security scan -- scan ವಿಫಲವಾದರೆ ತೆಗೆದುಹಾಕಿ
7. .plugin-hash.json ನಲ್ಲಿ integrity hash record ಮಾಡಿ
```

### Publishing

Publish command plugin validate ಮಾಡುತ್ತದೆ (manifest, exports, security scan),
SHA-256 checksum compute ಮಾಡುತ್ತದೆ, ಮತ್ತು Reef repository ಗೆ submission ಗಾಗಿ
ready directory structure generate ಮಾಡುತ್ತದೆ.

## Startup Loading

`~/.triggerfish/plugins/` ನಲ್ಲಿ pre-installed plugins startup ನಲ್ಲಿ load ಮಾಡಲ್ಪಡುತ್ತವೆ:

1. Loader `mod.ts` ಜೊತೆ subdirectories scan ಮಾಡುತ್ತದೆ
2. ಪ್ರತಿ module dynamically `import()` ಮಾಡಿ validate ಮಾಡಲ್ಪಡುತ್ತದೆ
3. Config ನಲ್ಲಿ `enabled: true` ಇರುವ plugins ಮಾತ್ರ startup ನಲ್ಲಿ initialize
4. Security scanner loading ಮೊದಲು ಚಲಿಸುತ್ತದೆ
5. Trust resolve ಮಾಡಿ, executors create ಮಾಡಿ, tools register ಮಾಡಲ್ಪಡುತ್ತವೆ
6. Plugin tools built-in tools ಜೊತೆ ತಕ್ಷಣ ಕಾಣಿಸುತ್ತವೆ

Agent runtime ನಲ್ಲಿ (`plugin_install` ಮೂಲಕ) load ಮಾಡಿದ plugins config check skip
ಮಾಡುತ್ತವೆ -- security scanner gatekeeper ಆಗಿ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ.

## Inline Plugin SDK (Legacy)

`src/plugin/sandbox.ts` ಮತ್ತು `src/plugin/sdk.ts` ನ `Sandbox` ಮತ್ತು `PluginSdk`
interfaces inline code execution ಬೆಂಬಲಿಸುತ್ತವೆ (TypeScript `new Function` ಮೂಲಕ
ಅಥವಾ Python Pyodide WASM ಮೂಲಕ). ಈ model full plugin modules ಬದಲಾಗಿ code snippets
ಚಲಾಯಿಸುವ embedded/managed plugins ಗಾಗಿ.

### Runtime Environment

- **TypeScript plugins** Deno sandbox ನಲ್ಲಿ ನೇರ ಚಲಿಸುತ್ತವೆ
- **Python plugins** Pyodide (WebAssembly ಗೆ compile ಮಾಡಿದ Python interpreter)
  ನಲ್ಲಿ ಚಲಿಸುತ್ತವೆ, ಅದು ತಾನೇ Deno sandbox ನಲ್ಲಿ ಚಲಿಸುತ್ತದೆ

### SDK Methods

```typescript
// Service ಗಾಗಿ user ನ delegated credential ಪಡೆಯಿರಿ
const credential = await sdk.get_user_credential("salesforce");

// User ನ permissions ಬಳಸಿ external system query ಮಾಡಿ
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Agent ಗೆ data emit ಮಾಡಿ -- classification label ಕಡ್ಡಾಯ
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

### Constraints

| Constraint                                      | ಜಾರಿ ಹೇಗೆ                                            |
| ----------------------------------------------- | ----------------------------------------------------- |
| Undeclared network endpoints ಪ್ರವೇಶಿಸಲು          | Sandbox allowlist ನಲ್ಲಿ ಇಲ್ಲದ network calls block     |
| Classification label ಇಲ್ಲದೆ data emit ಮಾಡಲು      | SDK unclassified data reject                          |
| Taint propagation ಇಲ್ಲದೆ data read ಮಾಡಲು          | SDK data access ನಲ್ಲಿ session auto-taint              |
| Triggerfish ಹೊರಗೆ data persist ಮಾಡಲು              | Sandbox ಒಳಗಿಂದ filesystem access ಇಲ್ಲ                 |
| Side channels ಮೂಲಕ exfiltrate ಮಾಡಲು               | Resource limits, raw socket access ಇಲ್ಲ               |
| System credentials ಬಳಸಲು                         | SDK `get_system_credential()` block; user creds ಮಾತ್ರ |

::: warning SECURITY `sdk.get_system_credential()` ಉದ್ದೇಶಪೂರ್ವಕ **block** ಮಾಡಲ್ಪಟ್ಟಿದೆ.
Plugins ಯಾವಾಗಲೂ `sdk.get_user_credential()` ಮೂಲಕ delegated user credentials ಬಳಸಬೇಕು. :::

### Database Connectivity

Native database drivers WASM sandbox ಒಳಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುವುದಿಲ್ಲ. HTTP-based APIs
ಬಳಸಿ:

| Database   | HTTP-Based Option                 |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST, Supabase SDK, Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK (HTTP)                    |
