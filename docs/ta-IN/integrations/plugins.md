# Plugins

Triggerfish plugins custom tools உடன் agent extend செய்கின்றன. ஒரு plugin என்பது manifest, tool definitions, மற்றும் executor function export செய்யும் ஒரு TypeScript module. Agent plugins தன்னே build செய்யலாம், security issues க்கு scan செய்யலாம், மற்றும் runtime இல் load செய்யலாம் -- அனைத்தும் ஒரே conversation இல்.

## Plugins எவ்வாறு செயல்படுகின்றன

ஒரு plugin ஒரு `mod.ts` entry point உடன் ஒரு directory இல் இருக்கிறது:

```
~/.triggerfish/plugins/my-plugin/
  mod.ts    # exports: manifest, toolDefinitions, createExecutor
```

Load ஆகும்போது, plugin இன் tools agent க்கு `plugin_<name>_<toolName>` ஆக available ஆகின்றன. Classification, taint, மற்றும் policy hooks built-in tools க்கு பொருந்துவது போலவே பொருந்துகின்றன -- plugins dispatch chain இல் ஒரு tool source மட்டுமே.

## Plugin எழுதுவது

REST API query செய்யும் ஒரு minimal plugin:

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

| Export             | Type                                | விளக்கம்                                          |
| ------------------ | ----------------------------------- | --------------------------------------------------- |
| `manifest`         | `PluginManifest`                    | Plugin identity, classification, trust, endpoints   |
| `toolDefinitions`  | `ToolDefinition[]`                  | Plugin வழங்கும் Tools                              |
| `createExecutor`   | `(context) => (name, input) => ...` | Tool handler return செய்யும் Factory               |
| `systemPrompt`     | `string` (optional)                 | Agent system prompt இல் inject ஆகிறது            |

### Manifest Fields

| Field                | Type       | விளக்கம்                                                         |
| -------------------- | ---------- | ------------------------------------------------------------------- |
| `name`               | `string`   | Directory name உடன் match ஆக வேண்டும். Lowercase + hyphens மட்டும் |
| `version`            | `string`   | Semantic version (உதா. `"1.0.0"`)                                 |
| `description`        | `string`   | Human-readable description                                          |
| `classification`     | `string`   | `"PUBLIC"`, `"INTERNAL"`, `"CONFIDENTIAL"`, அல்லது `"RESTRICTED"` |
| `trust`              | `string`   | `"sandboxed"` (default) அல்லது `"trusted"`                        |
| `declaredEndpoints`  | `string[]` | Sandboxed plugins க்கான Network allowlist                          |

### Executor Function

`createExecutor(context)` ஒரு `PluginContext` உடன் receive செய்கிறது:

- `pluginName` -- plugin இன் பெயர்
- `getSessionTaint()` -- current session classification level
- `escalateTaint(level)` -- session taint raise செய்யவும் (குறைக்க முடியாது)
- `log` -- plugin க்கு scoped structured logger (`debug`, `info`, `warn`, `error`)
- `config` -- `triggerfish.yaml` இலிருந்து plugin-specific config

Return ஆகும் function `(name: string, input: Record<string, unknown>)` எடுத்து `string | null` return செய்கிறது. Unrecognized tool names க்கு `null` return செய்யவும்.

## Agent Build→Load Flow

Primary plugin workflow: agent ஒரு plugin எழுதுகிறது, validate செய்கிறது, மற்றும் load செய்கிறது -- அனைத்தும் runtime இல்.

```
1. Agent mod.ts எழுதுகிறது     →  exec_write("my-plugin/mod.ts", code)
2. Agent plugin scan செய்கிறது  →  plugin_scan({ path: "/workspace/my-plugin" })
3. Agent plugin load செய்கிறது  →  plugin_install({ name: "my-plugin", path: "/workspace/my-plugin" })
4. Plugin tools live ஆகின்றன   →  plugin_my-plugin_forecast({ city: "Austin" })
```

`triggerfish.yaml` entry தேவையில்லை. Security scanner gatekeeper -- config இல்லாமல் load ஆகும் plugins default ஆக **sandboxed** trust மற்றும் manifest இலிருந்து classification பயன்படுத்துகின்றன.

### Agent Plugin Tools

Agent plugins manage செய்ய நான்கு built-in tools கொண்டுள்ளது:

| Tool             | Parameters                  | விளக்கம்                                               |
| ---------------- | --------------------------- | -------------------------------------------------------- |
| `plugin_scan`    | `path` (required)           | Load செய்வதற்கு முன்பு plugin directory security-scan  |
| `plugin_install` | `name` (required), `path`   | Name அல்லது path மூலம் plugin load செய்யவும்           |
| `plugin_reload`  | `name` (required)           | Running plugin ஐ source path இலிருந்து hot-swap        |
| `plugin_list`    | (none)                      | Metadata உடன் registered plugins அனைத்தும் பட்டியலிடவும் |

**`plugin_install` விவரங்கள்:**

- `name` -- tool namespace prefix ஆக பயன்படுத்தப்படுகிறது (`plugin_<name>_`)
- `path` -- plugin directory க்கான absolute path. Provided ஆகும்போது, அந்த path இலிருந்து load செய்கிறது (உதா. agent இன் workspace). Omitted ஆகும்போது, `~/.triggerfish/plugins/<name>/` இலிருந்து load செய்கிறது
- Security scanning ஒவ்வொரு install இலும் mandatory. Scan fail ஆனால், plugin rejected.
- Config entry தேவையில்லை. ஒன்று exist ஆனால், அதன் trust/classification settings respected; இல்லையென்றால் sandboxed default.

**`plugin_reload` விவரங்கள்:**

Old plugin unregister செய்கிறது, original source path இலிருந்து re-scan மற்றும் re-import செய்கிறது, பின்னர் re-register செய்கிறது. எந்த step fail ஆனாலும், old version restore ஆகிறது. Agent அடுத்த turn இல் updated tools பார்க்கிறது.

## Security Scanning

ஒவ்வொரு plugin உம் load செய்வதற்கு முன்பு dangerous patterns க்காக scanned ஆகிறது. Scanner **startup** இல் (pre-configured plugins க்கு) மற்றும் **runtime** இல் (ஒவ்வொரு `plugin_install` மற்றும் `plugin_reload` இல்) இயங்குகிறது.

### என்ன Scanned ஆகிறது

Scanner plugin directory இல் அனைத்து `.ts` files ஐயும் check செய்கிறது:

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

ஒவ்வொரு pattern உம் ஒரு weight (1--3) கொண்டுள்ளது. Plugin rejected ஆகிறது:

- எந்த **critical pattern** உம் (weight >= 3) detected ஆனால், அல்லது
- **cumulative score** threshold (>= 4) அடைந்தால்

`eval()` மட்டுமே rejection cause ஆகிறது (weight 3, critical), ஆனால் `Deno.env` access (weight 2) மற்றொரு moderate pattern உடன் combine ஆனால் மட்டுமே fail ஆகும்.

### `plugin_scan` உடன் Pre-Checking

Load செய்வதற்கு முன்பு issues catch செய்ய agent `plugin_scan` call செய்ய வேண்டும்:

```
plugin_scan({ path: "/workspace/my-plugin" })
→ { "ok": true, "scannedFiles": ["mod.ts"] }

plugin_scan({ path: "/workspace/bad-plugin" })
→ { "ok": false, "warnings": ["eval() detected in mod.ts:3"], "scannedFiles": ["mod.ts"] }
```

Scan fail ஆனால், load செய்ய முயற்சிக்கும் முன்பு agent code fix செய்து re-scan செய்யலாம்.

## Trust Model

Trust இரண்டு sides ஒப்புக்கொள்ள வேண்டும்:

```
effectiveTrust = (manifest.trust === "trusted" AND config.trust === "trusted")
                 ? "trusted" : "sandboxed"
```

- **Sandboxed** (default): Executor errors catch ஆகி tool results ஆக return ஆகின்றன. Network `declaredEndpoints` க்கு restricted. Untrusted அல்லது agent-built plugins க்கு பயன்படுத்தவும்.
- **Trusted**: Executor normal Deno permissions உடன் இயங்குகிறது. `Deno.hostname()` அல்லது `Deno.memoryUsage()` போன்ற system APIs தேவைப்படும் plugins க்கு பயன்படுத்தவும்.

Agent build செய்த ஒரு plugin எப்போதும் sandboxed ஆக இயங்குகிறது (config entry இல்லை என்றால் `trust: "trusted"` grant இல்லை). `~/.triggerfish/plugins/` இல் ஒரு plugin config மூலம் trusted status granted ஆகலாம்.

## Configuration (Optional)

Plugins configuration இல்லாமல் வேலை செய்கின்றன. `triggerfish.yaml` இல் config entry சேர்க்கவும் மட்டுமே:

- `trusted` permissions grant செய்ய
- Classification level override செய்ய
- Plugin-specific settings pass செய்ய

```yaml
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: ${WEATHER_API_KEY}    # context.config.api_key ஆக available
```

Config entry இல்லாமல் agent load செய்த plugins தங்கள் manifest இன் classification பயன்படுத்தி sandboxed trust default ஆக பயன்படுத்துகின்றன.

## Tool Namespacing

Collisions தடுக்க Tools தானாக prefixed ஆகின்றன:

- Plugin `weather` இல் Plugin tool `forecast` `plugin_weather_forecast` ஆகிறது
- Executor prefix decode செய்கிறது (longest-match-first) மற்றும் original tool name உடன் correct plugin க்கு delegate செய்கிறது

## Classification மற்றும் Taint

Plugin tools மற்ற அனைத்து tools போல் அதே classification rules பின்பற்றுகின்றன:

- Manifest இன் `classification` level அனைத்து tools க்கும் `plugin_<name>_` prefix உடன் registered ஆகிறது
- Plugin tools higher level இல் data return செய்யும்போது session taint escalate ஆகிறது
- Write-down prevention பொருந்துகிறது: CONFIDENTIAL plugin இன் data PUBLIC channel க்கு flow ஆக முடியாது
- அனைத்து hook enforcement உம் (PRE_TOOL_CALL, POST_TOOL_RESPONSE) unchanged பொருந்துகிறது

## The Reef: Plugin Marketplace

Plugins The Reef க்கு publish செய்யலாம் மற்றும் install செய்யலாம் -- skills க்கு பயன்படுத்தும் அதே marketplace.

### CLI Commands

```bash
triggerfish plugin search "weather"     # Plugins தேடவும்
triggerfish plugin install weather      # The Reef இலிருந்து Install செய்யவும்
triggerfish plugin update               # Updates சரிபார்க்கவும்
triggerfish plugin publish ./my-plugin  # Publishing க்கு தயார் செய்யவும்
triggerfish plugin scan ./my-plugin     # Security scan
triggerfish plugin list                 # Installed plugins பட்டியலிடவும்
```

### The Reef இலிருந்து Install செய்யவும்

Reef installs SHA-256 checksums மூலம் verified மற்றும் activation க்கு முன்பு security-scanned:

```
1. catalog.json fetch செய்யவும் (1 மணிநேரம் cached)
2. Plugin இன் latest version கண்டுபிடிக்கவும்
3. mod.ts download செய்யவும்
4. Catalog entry உடன் SHA-256 checksum verify செய்யவும்
5. ~/.triggerfish/plugins/<name>/mod.ts க்கு Write செய்யவும்
6. Security scan -- scan fail ஆனால் remove செய்யவும்
7. .plugin-hash.json இல் integrity hash பதிவு செய்யவும்
```

### Publishing

Publish command plugin validate செய்கிறது (manifest, exports, security scan), SHA-256 checksum compute செய்கிறது, மற்றும் Reef repository க்கு submission க்கு ready ஒரு directory structure generate செய்கிறது.

## Startup Loading

`~/.triggerfish/plugins/` இல் Pre-installed plugins startup போது loaded ஆகின்றன:

1. Loader `mod.ts` உடன் subdirectories scan செய்கிறது
2. ஒவ்வொரு module உம் dynamically `import()` செய்யப்பட்டு validated
3. Config இல் `enabled: true` உடைய plugins மட்டுமே startup போது initialized
4. Load செய்வதற்கு முன்பு security scanner இயங்குகிறது
5. Trust resolved, executors created, tools registered
6. Plugin tools உடனடியாக built-in tools உடன் appear ஆகின்றன

Runtime இல் agent load செய்த plugins (`plugin_install` மூலம்) config check skip செய்கின்றன -- security scanner gatekeeper ஆக serve செய்கிறது.

## Inline Plugin SDK (Legacy)

`src/plugin/sandbox.ts` மற்றும் `src/plugin/sdk.ts` இல் `Sandbox` மற்றும் `PluginSdk` interfaces inline code execution support செய்கின்றன (TypeScript `new Function` மூலம் அல்லது Python Pyodide WASM மூலம்). Full plugin modules க்கு பதிலாக code snippets இயக்கும் embedded/managed plugins க்கு இந்த model பயன்படுத்தப்படுகிறது.

### Runtime Environment

- **TypeScript plugins** Deno sandbox இல் நேரடியாக இயங்குகின்றன
- **Python plugins** Pyodide (WebAssembly க்கு compile செய்யப்பட்ட Python interpreter) இல் இயங்குகின்றன, இது Deno sandbox இல் இயங்குகிறது

### SDK Methods

```typescript
// ஒரு service க்கான user இன் delegated credential பெறவும்
const credential = await sdk.get_user_credential("salesforce");

// User இன் permissions பயன்படுத்தி external system query செய்யவும்
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Agent க்கு data emit செய்யவும் -- classification label REQUIRED
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

### Constraints

| Constraint                                  | எவ்வாறு Enforced ஆகிறது                                     |
| ------------------------------------------- | ------------------------------------------------------------ |
| Undeclared network endpoints access         | Sandbox allowlist இல் இல்லாத அனைத்து network calls block   |
| Classification label இல்லாமல் data emit    | SDK unclassified data reject செய்கிறது                       |
| Taint propagation இல்லாமல் data read       | Data access ஆகும்போது SDK session auto-taint செய்கிறது      |
| Triggerfish வெளியே data persist            | Sandbox இலிருந்து filesystem access இல்லை                   |
| Side channels மூலம் Exfiltrate             | Resource limits enforced, raw socket access இல்லை           |
| System credentials பயன்படுத்துவது          | SDK `get_system_credential()` block செய்கிறது; user credentials மட்டும் |

::: warning SECURITY `sdk.get_system_credential()` design ஆல் **blocked**. Plugins எப்போதும் `sdk.get_user_credential()` மூலம் delegated user credentials பயன்படுத்த வேண்டும். :::

### Database Connectivity

Native database drivers WASM sandbox இல் வேலை செய்வதில்லை. HTTP-based APIs பயன்படுத்தவும்:

| Database   | HTTP-Based Option                 |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST, Supabase SDK, Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK (HTTP)                    |
