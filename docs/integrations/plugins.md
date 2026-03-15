# Plugins

Triggerfish plugins extend the agent with custom tools. A plugin is a TypeScript
module that exports a manifest, tool definitions, and an executor function. The
agent can build plugins itself, scan them for security issues, and load them at
runtime -- all within a single conversation.

## How Plugins Work

A plugin lives in a directory with a `mod.ts` entry point:

```
~/.triggerfish/plugins/my-plugin/
  mod.ts    # exports: manifest, toolDefinitions, createExecutor
```

When loaded, the plugin's tools become available to the agent as
`plugin_<name>_<toolName>`. Classification, taint, and policy hooks apply
exactly as they do to built-in tools -- plugins are just another tool source in
the dispatch chain.

## Writing a Plugin

A minimal plugin that queries a REST API:

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

| Export             | Type                                | Description                                 |
| ------------------ | ----------------------------------- | ------------------------------------------- |
| `manifest`         | `PluginManifest`                    | Plugin identity, classification, trust, endpoints |
| `toolDefinitions`  | `ToolDefinition[]`                  | Tools the plugin provides                   |
| `createExecutor`   | `(context) => (name, input) => ...` | Factory that returns the tool handler       |
| `systemPrompt`     | `string` (optional)                 | Injected into the agent system prompt       |

### Manifest Fields

| Field                | Type       | Description                                        |
| -------------------- | ---------- | -------------------------------------------------- |
| `name`               | `string`   | Must match directory name. Lowercase + hyphens only |
| `version`            | `string`   | Semantic version (e.g. `"1.0.0"`)                  |
| `description`        | `string`   | Human-readable description                         |
| `classification`     | `string`   | `"PUBLIC"`, `"INTERNAL"`, `"CONFIDENTIAL"`, or `"RESTRICTED"` |
| `trust`              | `string`   | `"sandboxed"` (default) or `"trusted"`             |
| `declaredEndpoints`  | `string[]` | Network allowlist for sandboxed plugins             |

### The Executor Function

`createExecutor(context)` receives a `PluginContext` with:

- `pluginName` -- the plugin's name
- `getSessionTaint()` -- current session classification level
- `escalateTaint(level)` -- raise session taint (cannot lower)
- `log` -- structured logger scoped to the plugin (`debug`, `info`, `warn`,
  `error`)
- `config` -- plugin-specific config from `triggerfish.yaml`

The returned function takes `(name: string, input: Record<string, unknown>)` and
returns `string | null`. Return `null` for unrecognized tool names.

## Agent Build→Load Flow

The primary plugin workflow: the agent writes a plugin, validates it, and loads
it -- all at runtime.

```
1. Agent writes mod.ts     →  exec_write("my-plugin/mod.ts", code)
2. Agent scans the plugin  →  plugin_scan({ path: "/workspace/my-plugin" })
3. Agent loads the plugin  →  plugin_install({ name: "my-plugin", path: "/workspace/my-plugin" })
4. Plugin tools are live   →  plugin_my-plugin_forecast({ city: "Austin" })
```

No `triggerfish.yaml` entry is needed. The security scanner is the gatekeeper --
plugins loaded without config default to **sandboxed** trust and use the
classification from their manifest.

### Agent Plugin Tools

The agent has four built-in tools for managing plugins:

| Tool             | Parameters                  | Description                                      |
| ---------------- | --------------------------- | ------------------------------------------------ |
| `plugin_scan`    | `path` (required)           | Security-scan a plugin directory before loading   |
| `plugin_install` | `name` (required), `path`   | Load a plugin by name or path                     |
| `plugin_reload`  | `name` (required)           | Hot-swap a running plugin from its source path    |
| `plugin_list`    | (none)                      | List all registered plugins with metadata         |

**`plugin_install` details:**

- `name` -- used as the tool namespace prefix (`plugin_<name>_`)
- `path` -- absolute path to the plugin directory. When provided, loads from
  that path (e.g. the agent's workspace). When omitted, loads from
  `~/.triggerfish/plugins/<name>/`
- Security scanning is mandatory on every install. If the scan fails, the plugin
  is rejected.
- No config entry is required. If one exists, its trust/classification settings
  are respected; otherwise defaults to sandboxed.

**`plugin_reload` details:**

Unregisters the old plugin, re-scans and re-imports from the original source
path, then re-registers. If any step fails, the old version is restored. The
agent sees updated tools on its next turn.

## Security Scanning

Every plugin is scanned for dangerous patterns before loading. The scanner runs
at **startup** (for pre-configured plugins) and at **runtime** (on every
`plugin_install` and `plugin_reload`).

### What Gets Scanned

The scanner checks all `.ts` files in the plugin directory for:

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

Each pattern has a weight (1--3). A plugin is rejected if:

- Any **critical pattern** (weight >= 3) is detected, OR
- The **cumulative score** reaches the threshold (>= 4)

This means `eval()` alone causes rejection (weight 3, critical), while
`Deno.env` access (weight 2) only fails if combined with another moderate
pattern.

### Pre-Checking with `plugin_scan`

The agent should call `plugin_scan` before `plugin_install` to catch issues:

```
plugin_scan({ path: "/workspace/my-plugin" })
→ { "ok": true, "scannedFiles": ["mod.ts"] }

plugin_scan({ path: "/workspace/bad-plugin" })
→ { "ok": false, "warnings": ["eval() detected in mod.ts:3"], "scannedFiles": ["mod.ts"] }
```

If the scan fails, the agent can fix the code and re-scan before attempting to
load.

## Trust Model

Trust requires both sides to agree:

```
effectiveTrust = (manifest.trust === "trusted" AND config.trust === "trusted")
                 ? "trusted" : "sandboxed"
```

- **Sandboxed** (default): Executor errors are caught and returned as tool
  results. Network restricted to `declaredEndpoints`. Use for untrusted or
  agent-built plugins.
- **Trusted**: Executor runs with normal Deno permissions. Use for plugins that
  need system APIs like `Deno.hostname()` or `Deno.memoryUsage()`.

A plugin built by the agent always runs sandboxed (no config entry means no
`trust: "trusted"` grant). A plugin in `~/.triggerfish/plugins/` can be granted
trusted status via config.

## Configuration (Optional)

Plugins work without configuration. Add a config entry in `triggerfish.yaml`
only when you need to:

- Grant `trusted` permissions
- Override the classification level
- Pass plugin-specific settings

```yaml
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: ${WEATHER_API_KEY}    # available as context.config.api_key
```

Plugins loaded by the agent without a config entry use their manifest's
classification and default to sandboxed trust.

## Tool Namespacing

Tools are automatically prefixed to prevent collisions:

- Plugin tool `forecast` in plugin `weather` becomes `plugin_weather_forecast`
- The executor decodes the prefix (longest-match-first) and delegates to the
  correct plugin with the original tool name

## Classification and Taint

Plugin tools follow the same classification rules as all other tools:

- The manifest's `classification` level is registered for all tools with the
  `plugin_<name>_` prefix
- Session taint escalates when plugin tools return data at a higher level
- Write-down prevention applies: a CONFIDENTIAL plugin cannot have its data
  flow to a PUBLIC channel
- All hook enforcement (PRE_TOOL_CALL, POST_TOOL_RESPONSE) applies unchanged

## The Reef: Plugin Marketplace

Plugins can be published to and installed from The Reef, the same marketplace
used for skills.

### CLI Commands

```bash
triggerfish plugin search "weather"     # Search for plugins
triggerfish plugin install weather      # Install from The Reef
triggerfish plugin update               # Check for updates
triggerfish plugin publish ./my-plugin  # Prepare for publishing
triggerfish plugin scan ./my-plugin     # Security scan
triggerfish plugin list                 # List installed plugins
```

### Install from The Reef

Reef installs are verified with SHA-256 checksums and security-scanned before
activation:

```
1. Fetch catalog.json (cached 1 hour)
2. Find latest version of the plugin
3. Download mod.ts
4. Verify SHA-256 checksum matches catalog entry
5. Write to ~/.triggerfish/plugins/<name>/mod.ts
6. Security scan -- remove if scan fails
7. Record integrity hash in .plugin-hash.json
```

### Publishing

The publish command validates the plugin (manifest, exports, security scan),
computes the SHA-256 checksum, and generates a directory structure ready for
submission to the Reef repository.

## Startup Loading

Pre-installed plugins in `~/.triggerfish/plugins/` are loaded at startup:

1. Loader scans for subdirectories with `mod.ts`
2. Each module is dynamically `import()`ed and validated
3. Only plugins with `enabled: true` in config are initialized at startup
4. Security scanner runs before loading
5. Trust is resolved, executors are created, tools are registered
6. Plugin tools appear alongside built-in tools immediately

Plugins loaded by the agent at runtime (via `plugin_install`) skip the config
check -- the security scanner serves as the gatekeeper.

## Inline Plugin SDK (Legacy)

The `Sandbox` and `PluginSdk` interfaces in `src/plugin/sandbox.ts` and
`src/plugin/sdk.ts` support inline code execution (TypeScript via `new Function`
or Python via Pyodide WASM). This model is used for embedded/managed plugins
that run snippets of code rather than full plugin modules.

### Runtime Environment

- **TypeScript plugins** run directly in the Deno sandbox
- **Python plugins** run inside Pyodide (a Python interpreter compiled to
  WebAssembly), which itself runs inside the Deno sandbox

### SDK Methods

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

### Constraints

| Constraint                               | How It Is Enforced                                          |
| ---------------------------------------- | ----------------------------------------------------------- |
| Access undeclared network endpoints      | Sandbox blocks all network calls not on the allowlist       |
| Emit data without a classification label | SDK rejects unclassified data                               |
| Read data without taint propagation      | SDK auto-taints the session when data is accessed           |
| Persist data outside Triggerfish         | No filesystem access from within the sandbox                |
| Exfiltrate via side channels             | Resource limits enforced, no raw socket access              |
| Use system credentials                   | SDK blocks `get_system_credential()`; user credentials only |

::: warning SECURITY `sdk.get_system_credential()` is **blocked** by design.
Plugins must always use delegated user credentials via
`sdk.get_user_credential()`. :::

### Database Connectivity

Native database drivers do not work inside the WASM sandbox. Use HTTP-based
APIs instead:

| Database   | HTTP-Based Option                 |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST, Supabase SDK, Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK (HTTP)                    |
