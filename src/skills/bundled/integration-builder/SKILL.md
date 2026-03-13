---
name: integration-builder
version: 1.0.0
description: >
  How to build Triggerfish integrations. Covers the six integration patterns:
  channel adapters, LLM providers, MCP servers, storage providers, exec
  tools, and plugins (TypeScript and Python via Pyodide WASM). Includes
  interfaces, factory patterns, registration, and security requirements.
  Use when building new integrations or extending existing ones.
classification_ceiling: INTERNAL
---

# Building Triggerfish Integrations

Triggerfish has six integration patterns. All share the same principles:

- **Factory functions** (not classes) -- `create<Name>(config): Interface`
- **Result<T, E>** error handling -- never throw for expected failures
- **Readonly interfaces** -- all properties and arrays are `readonly`
- **Classification awareness** -- data carries sensitivity metadata
- **Policy hook integration** -- sensitive operations fire hooks for enforcement
- **Barrel exports** -- each module has a `mod.ts` re-exporting public API

## Pattern 1: Channel Adapter

A channel adapter connects Triggerfish to a messaging platform (Telegram, Slack,
Discord, WhatsApp, Email, WebChat, CLI).

### Interface

Defined in `src/channels/types.ts`:

```typescript
interface ChannelAdapter {
  readonly classification: ClassificationLevel;
  readonly isOwner: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: ChannelMessage): Promise<void>;
  onMessage(handler: MessageHandler): void;
  status(): ChannelStatus;
}

interface ChannelMessage {
  readonly content: string;
  readonly sessionId?: string;
  readonly sessionTaint?: ClassificationLevel;
}

interface ChannelStatus {
  readonly connected: boolean;
  readonly channelType: string;
}

type MessageHandler = (message: ChannelMessage) => void;
```

### How to Build One

**1. Define a config interface:**

```typescript
export interface MatrixConfig {
  readonly homeserverUrl: string;
  readonly accessToken: string;
  readonly classification?: ClassificationLevel;
  readonly ownerId?: string;
}
```

**2. Write the factory function:**

```typescript
export function createMatrixChannel(config: MatrixConfig): ChannelAdapter {
  const classification =
    (config.classification ?? "INTERNAL") as ClassificationLevel;
  let connected = false;
  let handler: MessageHandler | null = null;

  return {
    classification,
    isOwner: true,

    async connect() {
      // Initialize Matrix SDK client, start syncing
      connected = true;
    },

    async disconnect() {
      // Stop sync, cleanup
      connected = false;
    },

    async send(message: ChannelMessage) {
      // Send message via Matrix SDK
      // Chunk if message exceeds platform limit
    },

    onMessage(msgHandler: MessageHandler) {
      handler = msgHandler;
    },

    status() {
      return { connected, channelType: "matrix" };
    },
  };
}
```

**3. Key implementation details:**

- **Session ID derivation**: Create from platform-specific identifiers:
  `matrix-${roomId}`
- **Owner detection**: Check per-message, not just at connect time. Compare
  sender ID to `config.ownerId`
- **Message chunking**: Platforms have message length limits. Split long
  messages. Reference `chunkMessage()` in `src/channels/telegram/adapter.ts`
- **Classification**: Non-owner messages should set `sessionTaint: "PUBLIC"` to
  prevent taint escalation from untrusted senders

### Registration

Register with the channel router (`src/channels/router.ts`):

```typescript
const router = createChannelRouter();
router.register("matrix-main", createMatrixChannel(config));
await router.connectAll();
```

The router provides `sendWithRetry()` with exponential backoff.

### File organization

```
src/channels/matrix/
  adapter.ts    # createMatrixChannel factory
src/channels/mod.ts  # add: export { createMatrixChannel } from "./matrix/adapter.ts"
tests/channels/matrix_test.ts
```

---

## Pattern 2: LLM Provider

An LLM provider connects to an AI model API (Anthropic, OpenAI, Google,
Local/Ollama, OpenRouter).

### Interface

Defined in `src/agent/llm.ts`:

```typescript
interface LlmProvider {
  readonly name: string;
  readonly supportsStreaming: boolean;
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}

interface LlmMessage {
  readonly role: string;
  readonly content: string | unknown;
}

interface LlmCompletionResult {
  readonly content: string;
  readonly toolCalls: readonly unknown[];
  readonly usage: LlmUsage;
}

interface LlmUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}
```

### How to Build One

```typescript
export interface MistralConfig {
  readonly apiKey?: string;
  readonly model?: string;
  readonly maxTokens?: number;
}

export function createMistralProvider(config: MistralConfig = {}): LlmProvider {
  const model = config.model ?? "mistral-large-latest";
  const maxTokens = config.maxTokens ?? 4096;
  let client: MistralClient | undefined;

  // Deferred initialization -- don't create client until first use
  function getClient(): MistralClient {
    if (!client) {
      const apiKey = config.apiKey ?? Deno.env.get("MISTRAL_API_KEY");
      if (!apiKey) throw new Error("No Mistral API key found");
      client = new MistralClient({ apiKey });
    }
    return client;
  }

  return {
    name: "mistral",
    supportsStreaming: true,

    async complete(messages, _tools, _options) {
      const c = getClient();

      // Normalize messages to Mistral format
      const mistralMessages = messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string"
          ? m.content
          : JSON.stringify(m.content),
      }));

      const response = await c.chat({
        model,
        messages: mistralMessages,
        maxTokens,
      });

      return {
        content: response.choices[0].message.content,
        toolCalls: [],
        usage: {
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
        },
      };
    },
  };
}
```

**Key details:**

- **Deferred client creation**: Don't throw during registration. Resolve
  credentials on first `complete()` call
- **Environment variable fallback**:
  `config.apiKey ?? Deno.env.get("MISTRAL_API_KEY")`
- **Message normalization**: Each API has its own format. Normalize from
  `LlmMessage` on every call
- **Usage tracking**: Always return token counts for cost tracking

### Registration

```typescript
const registry = createProviderRegistry();
registry.register(createMistralProvider(config));
registry.setDefault("mistral");
```

### File organization

```
src/agent/providers/mistral.ts  # createMistralProvider factory
src/agent/providers/mod.ts      # add export
tests/agent/providers_test.ts   # add test cases
```

---

## Pattern 3: MCP Server

An MCP server exposes tools to the agent through the Model Context Protocol. The
MCP Gateway enforces policy before tool calls reach the server.

### Interface

Defined in `src/mcp/gateway/gateway.ts`:

```typescript
interface McpServer {
  callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<Result<McpServerToolResult, string>>;
}

interface McpServerToolResult {
  readonly content: string;
  readonly classification: ClassificationLevel;
}
```

### How to Build One

```typescript
export interface DatabaseServerOptions {
  readonly connectionString: string;
  readonly classification: ClassificationLevel;
}

export function createDatabaseServer(
  options: DatabaseServerOptions,
): McpServer {
  const { connectionString, classification } = options;

  return {
    async callTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<Result<McpServerToolResult, string>> {
      switch (name) {
        case "query": {
          const sql = args.sql as string | undefined;
          if (!sql) {
            return { ok: false, error: "Missing required argument: sql" };
          }
          // Validate SQL is read-only (SELECT only)
          if (!sql.trim().toUpperCase().startsWith("SELECT")) {
            return { ok: false, error: "Only SELECT queries are allowed" };
          }
          try {
            const result = await executeQuery(connectionString, sql);
            return {
              ok: true,
              value: { content: JSON.stringify(result), classification },
            };
          } catch (err) {
            return {
              ok: false,
              error: `Query failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            };
          }
        }
        default:
          return { ok: false, error: `Unknown tool: ${name}` };
      }
    },
  };
}
```

**Key details:**

- **Classification on every response**: The `McpServerToolResult` always carries
  a `classification` field. The gateway uses this to escalate session taint
- **Input validation**: Validate all arguments. Return error Results, never
  throw
- **Tool routing**: Use a `switch` on the tool name. Return error for unknown
  tools
- **Path sandboxing**: If the server accesses the filesystem, use `resolve()`
  and check that paths don't escape the allowed directory (see
  `src/exec/tools.ts` for the pattern)

### Gateway Registration

MCP servers are registered with the gateway, not called directly:

```typescript
const gateway = createMcpGateway({ hookRunner });
gateway.registerServer({
  uri: "database://main",
  name: "main-database",
  status: "CLASSIFIED",
  classification: "CONFIDENTIAL",
});

// Tool calls go through the gateway
const result = await gateway.callTool({
  serverUri: "database://main",
  toolName: "query",
  arguments: { sql: "SELECT * FROM users LIMIT 10" },
  session,
  mcpServer: createDatabaseServer(dbOptions),
});
```

The gateway fires `MCP_TOOL_CALL` hooks before executing, rejects
UNTRUSTED/BLOCKED servers, and tracks lineage.

---

## Pattern 4: Storage Provider

A storage provider is a key-value persistence interface. All Triggerfish state
flows through it.

### Interface

Defined in `src/core/storage/provider.ts`:

```typescript
interface StorageProvider {
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  close(): Promise<void>;
}
```

### How to Build One

```typescript
export function createRedisStorage(redisUrl: string): StorageProvider {
  let client: RedisClient | undefined;

  async function getClient(): Promise<RedisClient> {
    if (!client) {
      client = await connect(redisUrl);
    }
    return client;
  }

  return {
    async set(key: string, value: string): Promise<void> {
      const c = await getClient();
      await c.set(key, value);
    },

    async get(key: string): Promise<string | null> {
      const c = await getClient();
      return await c.get(key) ?? null;
    },

    async delete(key: string): Promise<void> {
      const c = await getClient();
      await c.del(key);
    },

    async list(prefix?: string): Promise<string[]> {
      const c = await getClient();
      if (!prefix) return await c.keys("*");
      return await c.keys(`${prefix}*`);
    },

    async close(): Promise<void> {
      if (client) {
        await client.quit();
        client = undefined;
      }
    },
  };
}
```

**Key details:**

- **String keys, string values**: Everything is serialized as strings. Complex
  data is JSON-stringified
- **Key namespacing**: Keys are namespaced by convention: `sessions:sess_123`,
  `taint:sess_123`, `lineage:rec_456`
- **Null for missing**: `get()` returns `null` when the key doesn't exist, not
  `undefined`
- **Close releases resources**: Database handles, file descriptors, network
  connections
- **Existing implementations**: `createMemoryStorage()` (tests) and
  `createSqliteStorage()` (production) in `src/core/storage/`

---

## Pattern 5: Exec Tools

Exec tools provide file I/O and command execution within the agent's isolated
workspace.

### Interface

Defined in `src/exec/tools.ts`:

```typescript
interface ExecTools {
  write(path: string, content: string): Promise<Result<WriteResult, string>>;
  read(path: string): Promise<Result<string, string>>;
  run(command: string): Promise<Result<RunResult, string>>;
  ls(path?: string): Promise<Result<readonly FileEntry[], string>>;
}

interface WriteResult {
  readonly path: string;
  readonly bytesWritten: number;
}

interface RunResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly duration: number;
}

interface FileEntry {
  readonly name: string;
  readonly size: number;
  readonly isDirectory: boolean;
}
```

### How It Works

Exec tools are created from a `Workspace`:

```typescript
const workspace = await createWorkspace({
  agentId: "agent-1",
  basePath: "~/.triggerfish/workspace",
});
const tools = createExecTools(workspace);

const writeResult = await tools.write("hello.ts", 'console.log("hello");');
const runResult = await tools.run("deno run hello.ts");
```

**Key details:**

- **Path sandboxing**: All paths are resolved relative to the workspace root.
  Traversal attempts (`../../etc/passwd`) return error Results
- **Workspace isolation**: Each agent gets its own workspace with `scratch/`,
  `integrations/`, and `skills/` subdirectories
- **Commands run in workspace dir**: `run()` executes shell commands with `cwd`
  set to the workspace path

---

## Pattern 6: Dynamic Plugin

Plugins are external tool providers loaded from `~/.triggerfish/plugins/<name>/`
at startup. Each plugin exports a manifest, tool definitions, and an executor
factory from its `mod.ts` entry point. Tools are namespaced as
`plugin_<name>_<toolName>` (like MCP's `mcp_<serverId>_<toolName>`) and routed
through the same hook/classification/taint enforcement as built-in tools.

### Interfaces

Defined in `src/plugin/types.ts`:

```typescript
/** Plugin manifest declaring identity, capabilities, and security properties. */
interface PluginManifest {
  readonly name: string;              // alphanumeric + hyphens, matches directory name
  readonly version: string;           // semantic version
  readonly description: string;
  readonly classification: ClassificationLevel;  // classification for all tools
  readonly trust: "sandboxed" | "trusted";       // requested trust level
  readonly declaredEndpoints: readonly string[]; // network allowlist (for sandbox)
}

/** Context provided to plugin executor factories at initialization. */
interface PluginContext {
  readonly pluginName: string;
  readonly getSessionTaint: () => ClassificationLevel;
  readonly escalateTaint: (level: ClassificationLevel) => void;
  readonly log: PluginLogger;        // structured logger scoped to the plugin
  readonly config: Readonly<Record<string, unknown>>;  // from triggerfish.yaml
}

/** Shape of a plugin's mod.ts exports. */
interface PluginExports {
  readonly manifest: PluginManifest;
  readonly toolDefinitions: readonly ToolDefinition[];
  readonly createExecutor: (
    context: PluginContext,
  ) => SubsystemExecutor | Promise<SubsystemExecutor>;
  readonly systemPrompt?: string;    // optional agent prompt section
}
```

### How to Build a Plugin

**1. Create the plugin directory:**

```
~/.triggerfish/plugins/my-plugin/
  mod.ts    # entry point — must export manifest, toolDefinitions, createExecutor
```

**2. Write mod.ts:**

```typescript
import type { PluginContext } from "triggerfish/plugin/types.ts";

export const manifest = {
  name: "my-plugin",
  version: "1.0.0",
  description: "Does useful things",
  classification: "INTERNAL" as const,
  trust: "sandboxed" as const,
  declaredEndpoints: ["https://api.example.com"],
};

export const toolDefinitions = [
  {
    name: "fetch_data",
    description: "Fetches data from the example API.",
    parameters: {
      query: {
        type: "string",
        description: "Search query",
        required: true,
      },
    },
  },
];

export const systemPrompt = "## My Plugin\nUse `fetch_data` to query the example API.";

export function createExecutor(context: PluginContext) {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      case "fetch_data": {
        const query = input.query as string;
        context.log.info("Fetching data", { query });
        const resp = await fetch(
          `https://api.example.com/search?q=${encodeURIComponent(query)}`,
        );
        return await resp.text();
      }
      default:
        return null;
    }
  };
}
```

**3. Enable in triggerfish.yaml:**

```yaml
plugins:
  my-plugin:
    enabled: true
    classification: INTERNAL
    trust: sandboxed        # or "trusted" to grant full Deno permissions
    # any additional keys are passed as context.config to the plugin
    api_key: ${MY_PLUGIN_API_KEY}
```

### Trust Model

Trust requires both sides to agree:

```
effectiveTrust = (manifest.trust === "trusted" AND config.trust === "trusted")
                 ? "trusted" : "sandboxed"
```

- **Sandboxed** (default): Executor errors are caught and returned as tool
  results. Network is restricted to `declaredEndpoints`. Use this for untrusted
  or third-party plugins.
- **Trusted**: Executor runs with normal Deno permissions. Use this for plugins
  that need system APIs like `Deno.hostname()` or `Deno.memoryUsage()`.

A plugin declaring `trust: "sandboxed"` always runs sandboxed regardless of
config. A plugin declaring `trust: "trusted"` runs sandboxed unless the user
explicitly grants `trust: "trusted"` in config.

### How It Works at Startup

1. Loader scans `~/.triggerfish/plugins/` for subdirectories with `mod.ts`
2. Each module is dynamically `import()`ed and validated
3. Only plugins listed as `enabled: true` in config are initialized
4. Trust level is resolved (both manifest and config must agree on "trusted")
5. `createExecutor(context)` is called to build the tool handler
6. Tools are namespaced as `plugin_<name>_<toolName>` and registered
7. Classifications are injected into the tool classification maps
8. The composite plugin executor is added to the subsystem dispatch chain

### Tool Namespacing

Tools are automatically prefixed to prevent collisions:

- Plugin tool `fetch_data` in plugin `my-plugin` becomes `plugin_my_plugin_fetch_data`
- The executor decodes the prefix (longest-match-first) and delegates to the
  correct plugin with the original tool name

### Classification and Taint

Plugin tools follow the same classification rules as all other tools:

- The manifest's `classification` level is registered as a tool prefix
  classification (`plugin_<name>_` → level)
- Session taint escalates when plugin tools return data at a higher level
- Write-down prevention applies: a plugin classified CONFIDENTIAL cannot have
  its data flow to a PUBLIC channel
- All hook enforcement (PRE_TOOL_CALL, POST_TOOL_RESPONSE) applies unchanged

### Reference Plugin

See `examples/plugins/system-info/mod.ts` for a complete working example with
two tools (`system_info` and `system_time`), trust declaration, and system
prompt.

### File Organization (Plugin Author)

```
~/.triggerfish/plugins/my-plugin/
  mod.ts           # entry point: manifest, toolDefinitions, createExecutor
  helpers.ts       # optional helper modules
  README.md        # optional documentation
```

### File Organization (Loader Infrastructure)

```
src/plugin/
  types.ts              # PluginManifest, PluginContext, PluginExports, etc.
  namespace.ts          # encode/decode plugin tool names
  loader.ts             # scan, import, validate plugins
  registry.ts           # runtime plugin registry
  executor.ts           # composite dispatcher
  sandboxed_executor.ts # trust resolution and sandbox wrapping
  sandbox.ts            # low-level sandbox (code execution)
  sdk.ts                # plugin SDK (data emission/query)
  mod.ts                # barrel exports
```

### Legacy: Inline Plugin Execution

The `Sandbox` and `PluginSdk` interfaces in `src/plugin/sandbox.ts` and
`src/plugin/sdk.ts` support inline code execution (TypeScript via `new Function`
or Python via Pyodide WASM). This is used for embedded/managed plugins. Dynamic
plugins loaded from `~/.triggerfish/plugins/` use the `createExecutor` factory
pattern instead.

---

## Cross-Cutting: Policy Hook Integration

All integrations that handle data flow interact with the hook system.

### Hook Types

| Hook                    | When It Fires                               | Used By                              |
| ----------------------- | ------------------------------------------- | ------------------------------------ |
| `PRE_CONTEXT_INJECTION` | Before user input enters the LLM context    | Channel adapters (inbound messages)  |
| `PRE_TOOL_CALL`         | Before a tool is called                     | Exec tools, generic tool calls       |
| `POST_TOOL_RESPONSE`    | After a tool returns data                   | Tool result processing               |
| `PRE_OUTPUT`            | Before the LLM response is sent to the user | Channel adapters (outbound messages) |
| `MCP_TOOL_CALL`         | Before an MCP server tool is called         | MCP Gateway                          |
| `SECRET_ACCESS`         | When a secret/credential is accessed        | Credential retrieval                 |
| `SESSION_RESET`         | When a session is reset                     | Session manager                      |
| `AGENT_INVOCATION`      | When a sub-agent is spawned                 | Orchestrator                         |

### Policy Actions

Hooks return one of:

| Action             | Effect                              |
| ------------------ | ----------------------------------- |
| `ALLOW`            | Operation proceeds normally         |
| `BLOCK`            | Operation is rejected with a reason |
| `REDACT`           | Data is sanitized before proceeding |
| `REQUIRE_APPROVAL` | Operation pauses for owner approval |

### Example: Hook integration in a channel adapter

The router fires hooks on message flow:

- Inbound: `PRE_CONTEXT_INJECTION` checks if the message classification is
  compatible with the session
- Outbound: `PRE_OUTPUT` enforces the no-write-down rule (CONFIDENTIAL data
  cannot flow to a PUBLIC channel)

---

## Cross-Cutting: Classification and Taint

Every integration must carry classification metadata:

- **Channel adapters** have a `classification` property (the channel's
  sensitivity level)
- **MCP server results** include `classification` on every response
- **Session taint** escalates automatically when classified data is accessed
  (taint only goes up, never down)

```
RESTRICTED (4) > CONFIDENTIAL (3) > INTERNAL (2) > PUBLIC (1)
```

The no-write-down rule: `canFlowTo(source, target)` returns `true` only if
`target >= source`.

---

## Barrel Export Pattern

Every integration module needs a `mod.ts`:

```typescript
// src/channels/matrix/mod.ts (if the adapter has multiple files)
export type { MatrixConfig } from "./adapter.ts";
export { createMatrixChannel } from "./adapter.ts";
```

The parent module's `mod.ts` aggregates:

```typescript
// src/channels/mod.ts
export { createTelegramChannel } from "./telegram/adapter.ts";
export { createSlackChannel } from "./slack/adapter.ts";
export { createMatrixChannel } from "./matrix/adapter.ts";
// ...
```

Consumers import from barrels, not individual files.

---

## Testing Integrations

### Mock channel adapter

```typescript
function createMockAdapter(
  channelType = "mock",
): ChannelAdapter {
  return {
    classification: "INTERNAL" as ClassificationLevel,
    isOwner: true,
    async connect() {},
    async disconnect() {},
    async send(_msg: ChannelMessage) {},
    onMessage(_handler: MessageHandler) {},
    status() {
      return { connected: true, channelType };
    },
  };
}
```

### Mock LLM provider

```typescript
function createMockProvider(
  name: string,
  response = "mock response",
): LlmProvider {
  return {
    name,
    supportsStreaming: false,
    async complete(_messages, _tools, _options) {
      return {
        content: response,
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };
}
```

### Test with temp directories

```typescript
Deno.test("MatrixAdapter: sends message to channel", async () => {
  const adapter = createMatrixChannel({
    homeserverUrl: "https://matrix.test",
    accessToken: "test-token",
  });
  assertEquals(adapter.status().channelType, "matrix");
  assertEquals(adapter.status().connected, false);
});
```

For integrations that write to disk, use `Deno.makeTempDir()` with try/finally
cleanup.

---

## Complete Walkthrough: New Channel Adapter

Building a hypothetical Signal adapter from scratch:

**1. Create files:**

```
src/channels/signal/adapter.ts
tests/channels/signal_test.ts
```

**2. Define config interface** (`src/channels/signal/adapter.ts`):

```typescript
import type {
  ChannelAdapter,
  ChannelMessage,
  ChannelStatus,
  MessageHandler,
} from "../types.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";

export interface SignalConfig {
  readonly phoneNumber: string;
  readonly signalCliPath?: string;
  readonly classification?: ClassificationLevel;
  readonly ownerNumber?: string;
}
```

**3. Write factory function:**

```typescript
export function createSignalChannel(config: SignalConfig): ChannelAdapter {
  const classification =
    (config.classification ?? "CONFIDENTIAL") as ClassificationLevel;
  let connected = false;
  let handler: MessageHandler | null = null;

  return {
    classification,
    isOwner: true,

    async connect() {
      // Start signal-cli daemon, begin listening for messages
      connected = true;
    },

    async disconnect() {
      // Stop signal-cli daemon
      connected = false;
    },

    async send(message: ChannelMessage) {
      // Use signal-cli to send message
      // Chunk at 2000 chars (Signal limit)
    },

    onMessage(msgHandler: MessageHandler) {
      handler = msgHandler;
      // Wire up signal-cli message events to call handler
    },

    status(): ChannelStatus {
      return { connected, channelType: "signal" };
    },
  };
}
```

**4. Write tests** (`tests/channels/signal_test.ts`):

```typescript
import { assertEquals } from "jsr:@std/assert";
import { createSignalChannel } from "../../src/channels/signal/adapter.ts";

Deno.test("SignalAdapter: factory creates adapter with correct type", () => {
  const adapter = createSignalChannel({ phoneNumber: "+1234567890" });
  assertEquals(adapter.status().channelType, "signal");
  assertEquals(adapter.status().connected, false);
  assertEquals(adapter.classification, "CONFIDENTIAL");
});

Deno.test("SignalAdapter: defaults to CONFIDENTIAL classification", () => {
  const adapter = createSignalChannel({ phoneNumber: "+1234567890" });
  assertEquals(adapter.classification, "CONFIDENTIAL");
});

Deno.test("SignalAdapter: respects custom classification", () => {
  const adapter = createSignalChannel({
    phoneNumber: "+1234567890",
    classification: "RESTRICTED",
  });
  assertEquals(adapter.classification, "RESTRICTED");
});
```

**5. Add barrel export** (`src/channels/mod.ts`):

```typescript
export { createSignalChannel } from "./signal/adapter.ts";
```

**6. Run tests:**

```bash
deno task test tests/channels/signal_test.ts
```

**7. Register in the application:**

```typescript
router.register("signal-main", createSignalChannel(signalConfig));
```
