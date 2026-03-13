# Plugins

Triggerfish plugins एजंटला custom tools सह extend करतात. एक plugin एक TypeScript
module आहे जो manifest, tool definitions, आणि executor function export करतो. एजंट
plugins स्वतः build करू शकतो, security issues साठी scan करू शकतो, आणि runtime
वर load करू शकतो -- सर्व single conversation मध्ये.

## Plugins कसे काम करतात

एक plugin `mod.ts` entry point असलेल्या directory मध्ये राहतो:

```
~/.triggerfish/plugins/my-plugin/
  mod.ts    # exports: manifest, toolDefinitions, createExecutor
```

Load झाल्यावर, plugin चे tools एजंटला `plugin_<name>_<toolName>` म्हणून available
होतात. Classification, taint, आणि policy hooks तंतोतंत त्याच प्रकारे apply होतात
जसे built-in tools ला -- plugins dispatch chain मधील फक्त आणखी एक tool source आहेत.

## Plugin लिहिणे

एक minimal plugin जो REST API query करतो:

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

### आवश्यक Exports

| Export             | Type                                | वर्णन                                               |
| ------------------ | ----------------------------------- | --------------------------------------------------- |
| `manifest`         | `PluginManifest`                    | Plugin identity, classification, trust, endpoints   |
| `toolDefinitions`  | `ToolDefinition[]`                  | Plugin provide करणारे tools                         |
| `createExecutor`   | `(context) => (name, input) => ...` | Tool handler return करणारी factory                  |
| `systemPrompt`     | `string` (optional)                 | Agent system prompt मध्ये inject केले जाते          |

### Manifest Fields

| Field                | Type       | वर्णन                                                         |
| -------------------- | ---------- | ------------------------------------------------------------- |
| `name`               | `string`   | Directory name शी match करणे आवश्यक. Lowercase + hyphens only |
| `version`            | `string`   | Semantic version (उदा. `"1.0.0"`)                             |
| `description`        | `string`   | Human-readable description                                    |
| `classification`     | `string`   | `"PUBLIC"`, `"INTERNAL"`, `"CONFIDENTIAL"`, किंवा `"RESTRICTED"` |
| `trust`              | `string`   | `"sandboxed"` (default) किंवा `"trusted"`                     |
| `declaredEndpoints`  | `string[]` | Sandboxed plugins साठी Network allowlist                      |

### Executor Function

`createExecutor(context)` एक `PluginContext` receive करतो ज्यात आहे:

- `pluginName` -- plugin चे नाव
- `getSessionTaint()` -- current session classification level
- `escalateTaint(level)` -- session taint raise करा (lower करता येत नाही)
- `log` -- plugin ला scoped structured logger (`debug`, `info`, `warn`, `error`)
- `config` -- `triggerfish.yaml` मधील plugin-specific config

Return केलेली function `(name: string, input: Record<string, unknown>)` घेते आणि
`string | null` return करते. Unrecognized tool names साठी `null` return करा.

## Agent Build→Load Flow

Primary plugin workflow: एजंट plugin लिहितो, validate करतो, आणि load करतो --
सर्व runtime वर.

```
1. Agent writes mod.ts     →  exec_write("my-plugin/mod.ts", code)
2. Agent scans the plugin  →  plugin_scan({ path: "/workspace/my-plugin" })
3. Agent loads the plugin  →  plugin_install({ name: "my-plugin", path: "/workspace/my-plugin" })
4. Plugin tools are live   →  plugin_my-plugin_forecast({ city: "Austin" })
```

`triggerfish.yaml` entry आवश्यक नाही. Security scanner gatekeeper आहे --
config शिवाय loaded plugins default **sandboxed** trust ला आणि त्यांच्या manifest
मधील classification वापरतात.

### Agent Plugin Tools

एजंटकडे plugins manage करण्यासाठी चार built-in tools आहेत:

| Tool             | Parameters                  | वर्णन                                                    |
| ---------------- | --------------------------- | -------------------------------------------------------- |
| `plugin_scan`    | `path` (required)           | Loading पूर्वी plugin directory security-scan करा        |
| `plugin_install` | `name` (required), `path`   | Name किंवा path द्वारे plugin load करा                   |
| `plugin_reload`  | `name` (required)           | Running plugin ला त्याच्या source path मधून hot-swap करा |
| `plugin_list`    | (none)                      | Metadata सह सर्व registered plugins list करा             |

**`plugin_install` details:**

- `name` -- tool namespace prefix म्हणून वापरला जातो (`plugin_<name>_`)
- `path` -- plugin directory चा absolute path. Provided असल्यास, त्या path मधून
  load करतो (उदा. एजंटचे workspace). Omitted असल्यास, `~/.triggerfish/plugins/<name>/`
  मधून load करतो
- Security scanning प्रत्येक install वर mandatory आहे. Scan fail झाल्यास, plugin
  rejected आहे.
- Config entry आवश्यक नाही. एक exist असल्यास, त्याचे trust/classification settings
  respected होतात; अन्यथा sandboxed ला default होते.

**`plugin_reload` details:**

जुना plugin unregister करतो, original source path मधून re-scan आणि re-import
करतो, नंतर re-register करतो. कोणताही step fail झाल्यास, जुनी version restored होते.
एजंट त्याच्या पुढील turn वर updated tools पाहतो.

## Security Scanning

प्रत्येक plugin loading पूर्वी dangerous patterns साठी scanned होतो. Scanner
**startup** वर (pre-configured plugins साठी) आणि **runtime** वर (प्रत्येक
`plugin_install` आणि `plugin_reload` वर) run होतो.

### काय Scanned होते

Scanner plugin directory मधील सर्व `.ts` files या गोष्टींसाठी check करतो:

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

प्रत्येक pattern ला weight (1--3) आहे. Plugin rejected आहे जर:

- कोणताही **critical pattern** (weight >= 3) detected झाल्यास, किंवा
- **Cumulative score** threshold ला पोहोचल्यास (>= 4)

याचा अर्थ `eval()` एकटा rejection cause करतो (weight 3, critical), तर
`Deno.env` access (weight 2) फक्त दुसऱ्या moderate pattern सह combine झाल्यास fail होते.

### `plugin_scan` सह Pre-Checking

एजंटने issues catch करण्यासाठी `plugin_install` पूर्वी `plugin_scan` call करावे:

```
plugin_scan({ path: "/workspace/my-plugin" })
→ { "ok": true, "scannedFiles": ["mod.ts"] }

plugin_scan({ path: "/workspace/bad-plugin" })
→ { "ok": false, "warnings": ["eval() detected in mod.ts:3"], "scannedFiles": ["mod.ts"] }
```

Scan fail झाल्यास, एजंट load attempt करण्यापूर्वी code fix करू शकतो आणि re-scan
करू शकतो.

## Trust Model

Trust साठी दोन्ही sides agree करणे आवश्यक आहे:

```
effectiveTrust = (manifest.trust === "trusted" AND config.trust === "trusted")
                 ? "trusted" : "sandboxed"
```

- **Sandboxed** (default): Executor errors caught आणि tool results म्हणून returned
  आहेत. Network `declaredEndpoints` ला restricted. Untrusted किंवा agent-built
  plugins साठी वापरा.
- **Trusted**: Executor normal Deno permissions सह run होतो. `Deno.hostname()` किंवा
  `Deno.memoryUsage()` सारख्या system APIs ला आवश्यक plugins साठी वापरा.

एजंटने built केलेला plugin नेहमी sandboxed run होतो (config entry नसणे म्हणजे
`trust: "trusted"` grant नाही). `~/.triggerfish/plugins/` मधील plugin ला config
द्वारे trusted status grant केला जाऊ शकतो.

## Configuration (Optional)

Plugins configuration शिवाय काम करतात. `triggerfish.yaml` मध्ये config entry
फक्त तेव्हाच जोडा जेव्हा तुम्हाला:

- `trusted` permissions grant करायचे असतील
- Classification level override करायचे असेल
- Plugin-specific settings pass करायचे असतील

```yaml
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: ${WEATHER_API_KEY}    # context.config.api_key म्हणून available
```

Config entry शिवाय agent द्वारे loaded plugins त्यांच्या manifest चे classification
वापरतात आणि sandboxed trust ला default होतात.

## Tool Namespacing

Collisions रोखण्यासाठी Tools automatically prefixed आहेत:

- Plugin `weather` मधील plugin tool `forecast` `plugin_weather_forecast` बनते
- Executor prefix decode करतो (longest-match-first) आणि original tool name सह
  correct plugin ला delegate करतो

## Classification आणि Taint

Plugin tools इतर सर्व tools प्रमाणेच classification rules follow करतात:

- Manifest चे `classification` level सर्व tools साठी `plugin_<name>_` prefix सह
  registered आहे
- Plugin tools higher level वर data return केल्यास session taint escalates होते
- Write-down prevention applies: CONFIDENTIAL plugin चा data PUBLIC channel ला
  flow करू शकत नाही
- सर्व hook enforcement (PRE_TOOL_CALL, POST_TOOL_RESPONSE) unchanged applies

## The Reef: Plugin Marketplace

Plugins The Reef ला publish केले जाऊ शकतात आणि तेथून install केले जाऊ शकतात,
skills साठी वापरल्या जाणाऱ्या त्याच marketplace द्वारे.

### CLI Commands

```bash
triggerfish plugin search "weather"     # Plugins search करा
triggerfish plugin install weather      # The Reef मधून install करा
triggerfish plugin update               # Updates check करा
triggerfish plugin publish ./my-plugin  # Publishing साठी prepare करा
triggerfish plugin scan ./my-plugin     # Security scan
triggerfish plugin list                 # Installed plugins list करा
```

### The Reef मधून Install करा

Reef installs SHA-256 checksums सह verified आणि activation पूर्वी security-scanned आहेत:

```
1. Fetch catalog.json (cached 1 hour)
2. Plugin ची latest version शोधा
3. mod.ts download करा
4. SHA-256 checksum catalog entry शी match verify करा
5. ~/.triggerfish/plugins/<name>/mod.ts ला लिहा
6. Security scan -- scan fail झाल्यास remove करा
7. .plugin-hash.json मध्ये integrity hash record करा
```

### Publishing

Publish command plugin validate करतो (manifest, exports, security scan),
SHA-256 checksum compute करतो, आणि Reef repository ला submission साठी ready
directory structure generate करतो.

## Startup Loading

`~/.triggerfish/plugins/` मधील Pre-installed plugins startup वर load होतात:

1. Loader `mod.ts` असलेल्या subdirectories साठी scan करतो
2. प्रत्येक module dynamically `import()` आणि validated केले जाते
3. Startup वर फक्त config मध्ये `enabled: true` असलेले plugins initialized होतात
4. Loading पूर्वी security scanner run होतो
5. Trust resolved होतो, executors created होतात, tools registered होतात
6. Plugin tools लगेच built-in tools सोबत appear होतात

Runtime वर एजंटने loaded plugins (`plugin_install` द्वारे) config check skip
करतात -- security scanner gatekeeper म्हणून serve करतो.

## Inline Plugin SDK (Legacy)

`src/plugin/sandbox.ts` आणि `src/plugin/sdk.ts` मधील `Sandbox` आणि `PluginSdk`
interfaces inline code execution (TypeScript `new Function` द्वारे किंवा Python
Pyodide WASM द्वारे) support करतात. हे model embedded/managed plugins साठी वापरले
जाते जे full plugin modules ऐवजी code snippets run करतात.

### Runtime Environment

- **TypeScript plugins** Deno sandbox मध्ये directly run होतात
- **Python plugins** Pyodide (WebAssembly ला compile केलेला Python interpreter)
  च्या आत run होतात, जे स्वतः Deno sandbox च्या आत run होते

### SDK Methods

```typescript
// Service साठी user चे delegated credential मिळवा
const credential = await sdk.get_user_credential("salesforce");

// User च्या permissions वापरून external system query करा
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Agent ला data emit करा -- classification label आवश्यक आहे
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

### Constraints

| Constraint                               | कसे Enforced केले जाते                                         |
| ---------------------------------------- | --------------------------------------------------------------- |
| Undeclared network endpoints access      | Sandbox allowlist वर नसलेल्या सर्व network calls block करतो    |
| Classification label शिवाय data emit     | SDK unclassified data reject करतो                               |
| Taint propagation शिवाय data read        | SDK data access झाल्यावर session auto-taint करतो               |
| Triggerfish च्या बाहेर data persist      | Sandbox मधून कोणताही filesystem access नाही                     |
| Side channels द्वारे Exfiltrate          | Resource limits enforced, raw socket access नाही               |
| System credentials वापरणे               | SDK `get_system_credential()` block करतो; फक्त user credentials |

::: warning SECURITY `sdk.get_system_credential()` design द्वारे **blocked** आहे.
Plugins नेहमी `sdk.get_user_credential()` द्वारे delegated user credentials वापरणे
आवश्यक आहे. :::

### Database Connectivity

Native database drivers WASM sandbox मध्ये काम करत नाहीत. त्याऐवजी HTTP-based
APIs वापरा:

| Database   | HTTP-Based Option                 |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST, Supabase SDK, Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK (HTTP)                    |
