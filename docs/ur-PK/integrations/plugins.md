# Plugins

Triggerfish plugins ایجنٹ کو custom tools سے بڑھاتے ہیں۔ ایک plugin ایک TypeScript
module ہے جو manifest، tool definitions، اور executor function export کرتا ہے۔ ایجنٹ
خود plugins build کر سکتا ہے، انہیں سیکیورٹی issues کے لیے scan کر سکتا ہے، اور
runtime پر load کر سکتا ہے — سب ایک ہی conversation میں۔

## Plugins کیسے کام کرتے ہیں

ایک plugin ایک `mod.ts` entry point کے ساتھ ایک directory میں رہتا ہے:

```
~/.triggerfish/plugins/my-plugin/
  mod.ts    # exports: manifest, toolDefinitions, createExecutor
```

Load ہونے پر، plugin کے tools ایجنٹ کو `plugin_<name>_<toolName>` کے طور پر دستیاب
ہو جاتے ہیں۔ Classification، taint، اور policy hooks بالکل ویسے ہی لاگو ہوتے ہیں
جیسے built-in tools پر — plugins dispatch chain میں صرف ایک اور tool source ہیں۔

## Plugin لکھنا

REST API query کرنے والا ایک minimal plugin:

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

| Export             | Type                                | تفصیل                                               |
| ------------------ | ----------------------------------- | ---------------------------------------------------- |
| `manifest`         | `PluginManifest`                    | Plugin identity، classification، trust، endpoints   |
| `toolDefinitions`  | `ToolDefinition[]`                  | Plugin کے فراہم کردہ Tools                           |
| `createExecutor`   | `(context) => (name, input) => ...` | Tool handler واپس کرنے والا Factory                  |
| `systemPrompt`     | `string` (optional)                 | Agent system prompt میں inject                       |

### Manifest Fields

| Field                | Type       | تفصیل                                                              |
| -------------------- | ---------- | ------------------------------------------------------------------- |
| `name`               | `string`   | Directory name سے match کرنا ضروری۔ Lowercase + hyphens only       |
| `version`            | `string`   | Semantic version (مثلاً `"1.0.0"`)                                 |
| `description`        | `string`   | Human-readable description                                         |
| `classification`     | `string`   | `"PUBLIC"`، `"INTERNAL"`، `"CONFIDENTIAL"`، یا `"RESTRICTED"`      |
| `trust`              | `string`   | `"sandboxed"` (ڈیفالٹ) یا `"trusted"`                              |
| `declaredEndpoints`  | `string[]` | Sandboxed plugins کے لیے network allowlist                          |

### Executor Function

`createExecutor(context)` ایک `PluginContext` receive کرتا ہے جس میں:

- `pluginName` — plugin کا نام
- `getSessionTaint()` — موجودہ session classification level
- `escalateTaint(level)` — session taint بڑھائیں (کم نہیں کر سکتے)
- `log` — plugin تک scoped structured logger (`debug`، `info`، `warn`، `error`)
- `config` — `triggerfish.yaml` سے plugin-specific config

واپس کردہ function `(name: string, input: Record<string, unknown>)` لیتا ہے اور
`string | null` واپس کرتا ہے۔ پہچانے نہ جانے والے tool names کے لیے `null` واپس کریں۔

## Agent Build→Load Flow

بنیادی plugin workflow: ایجنٹ plugin لکھتا ہے، validate کرتا ہے، اور load کرتا ہے —
سب runtime پر۔

```
1. Agent mod.ts لکھتا ہے     →  exec_write("my-plugin/mod.ts", code)
2. Agent plugin scan کرتا ہے  →  plugin_scan({ path: "/workspace/my-plugin" })
3. Agent plugin load کرتا ہے  →  plugin_install({ name: "my-plugin", path: "/workspace/my-plugin" })
4. Plugin tools live ہیں      →  plugin_my-plugin_forecast({ city: "Austin" })
```

کوئی `triggerfish.yaml` entry ضروری نہیں۔ Security scanner gatekeeper ہے — config کے
بغیر loaded plugins ڈیفالٹ **sandboxed** trust پر ہوتے ہیں اور اپنے manifest سے
classification استعمال کرتے ہیں۔

### Agent Plugin Tools

ایجنٹ کے پاس plugins manage کرنے کے لیے چار built-in tools ہیں:

| Tool             | Parameters                | تفصیل                                                    |
| ---------------- | ------------------------- | --------------------------------------------------------- |
| `plugin_scan`    | `path` (ضروری)            | Load سے پہلے plugin directory کو security-scan کریں      |
| `plugin_install` | `name` (ضروری)، `path`    | نام یا path سے plugin load کریں                           |
| `plugin_reload`  | `name` (ضروری)            | چلتے plugin کو source path سے hot-swap کریں              |
| `plugin_list`    | (کوئی نہیں)               | تمام registered plugins metadata کے ساتھ list کریں      |

## Security Scanning

ہر plugin load ہونے سے پہلے dangerous patterns کے لیے scan کیا جاتا ہے۔ Scanner
**startup** پر (pre-configured plugins کے لیے) اور **runtime** پر (ہر `plugin_install`
اور `plugin_reload` پر) چلتا ہے۔

### کیا Scan ہوتا ہے

Scanner plugin directory میں تمام `.ts` files چیک کرتا ہے:

| Category           | مثالیں                                    | Severity  |
| ------------------ | ------------------------------------------ | --------- |
| Code execution     | `eval()`، `new Function()`، `atob`         | Critical  |
| Prompt injection   | "ignore previous instructions"             | Critical  |
| Subprocess access  | `Deno.command`، `Deno.run`                 | Critical  |
| Steganography      | Zero-width Unicode characters              | Critical  |
| Network listeners  | `Deno.listen`، `Deno.serve`                | Critical  |
| Environment access | `Deno.env.get()`                           | Moderate  |
| Filesystem access  | `Deno.readTextFile`، `Deno.writeFile`      | Moderate  |
| Dynamic imports    | `import("https://...")`                    | Moderate  |
| Obfuscation        | ROT13 encoding، base64 manipulation        | Moderate  |

### Scoring Model

ہر pattern کا ایک weight (1–3) ہے۔ Plugin reject ہوتا ہے اگر:

- کوئی بھی **critical pattern** (weight >= 3) detect ہو، یا
- **cumulative score** threshold تک پہنچے (>= 4)

## Trust Model

Trust دونوں sides کو متفق ہونا ضروری ہے:

```
effectiveTrust = (manifest.trust === "trusted" AND config.trust === "trusted")
                 ? "trusted" : "sandboxed"
```

- **Sandboxed** (ڈیفالٹ): Executor errors catch ہوتے ہیں اور tool results کے طور پر
  واپس آتے ہیں۔ Network `declaredEndpoints` تک restricted۔ Untrusted یا agent-built
  plugins کے لیے استعمال کریں۔
- **Trusted**: Executor normal Deno permissions کے ساتھ چلتا ہے۔ ایسے plugins کے
  لیے استعمال کریں جنہیں `Deno.hostname()` یا `Deno.memoryUsage()` جیسے system APIs
  چاہیے۔

## Configuration (اختیاری)

Plugins بغیر configuration کے کام کرتے ہیں۔ `triggerfish.yaml` میں config entry صرف
اس وقت شامل کریں جب آپ کو:

- `trusted` permissions grant کرنا ہو
- Classification level override کرنا ہو
- Plugin-specific settings pass کرنی ہوں

```yaml
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: ${WEATHER_API_KEY}    # context.config.api_key کے طور پر دستیاب
```

## The Reef: Plugin Marketplace

Plugins کو The Reef سے publish اور install کیا جا سکتا ہے، وہی marketplace جو skills
کے لیے استعمال ہوتا ہے۔

### CLI Commands

```bash
triggerfish plugin search "weather"     # Plugins تلاش کریں
triggerfish plugin install weather      # The Reef سے install کریں
triggerfish plugin update               # Updates چیک کریں
triggerfish plugin publish ./my-plugin  # Publishing کے لیے تیار کریں
triggerfish plugin scan ./my-plugin     # Security scan
triggerfish plugin list                 # Installed plugins list کریں
```
