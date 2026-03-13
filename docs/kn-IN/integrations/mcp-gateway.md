# MCP Gateway

> ಯಾವುದೇ MCP server ಬಳಸಿ. ನಾವು boundary ಸುರಕ್ಷಿತಗೊಳಿಸುತ್ತೇವೆ.

Model Context Protocol (MCP) agent-to-tool ಸಂವಾದದ ಹೊರಹೊಮ್ಮುತ್ತಿರುವ ಮಾನದಂಡ.
Triggerfish ಸುರಕ್ಷಿತ MCP Gateway ಒದಗಿಸುತ್ತದೆ -- ಯಾವುದೇ MCP-ಹೊಂದಾಣಿಕೆಯ server ಗೆ
ಸಂಪರ್ಕ ಮಾಡಿ, classification controls, tool-level permissions, taint tracking, ಮತ್ತು
ಸಂಪೂರ್ಣ audit logging ಜಾರಿಗೊಳಿಸುತ್ತದೆ.

MCP servers ತರುವುದು ನಿಮ್ಮ ಕೆಲಸ. Boundary ದಾಟುವ ಪ್ರತಿ request ಮತ್ತು response
Triggerfish ಸುರಕ್ಷಿತಗೊಳಿಸುತ್ತದೆ.

## ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ

MCP Gateway ನಿಮ್ಮ agent ಮತ್ತು ಯಾವುದೇ MCP server ನಡುವೆ ನೆಲೆಸಿದೆ. ಪ್ರತಿ tool call
ಬಾಹ್ಯ server ತಲುಪುವ ಮೊದಲು policy enforcement layer ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತದೆ, ಮತ್ತು
ಪ್ರತಿ response agent context ಪ್ರವೇಶಿಸುವ ಮೊದಲು classify ಮಾಡಲ್ಪಡುತ್ತದೆ.

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway flow: Agent → MCP Gateway → Policy Layer → MCP Server, with deny path to BLOCKED" style="max-width: 100%;" />

Gateway ಐದು ಮೂಲ ಕಾರ್ಯಗಳನ್ನು ಒದಗಿಸುತ್ತದೆ:

1. **Server authentication ಮತ್ತು classification** -- MCP servers ಬಳಕೆಗೆ ಮೊದಲು
   review ಮತ್ತು classify ಮಾಡಲ್ಪಡಬೇಕು
2. **Tool-level permission enforcement** -- ಪ್ರತ್ಯೇಕ tools ಅನ್ನು permit, restrict,
   ಅಥವಾ block ಮಾಡಬಹುದು
3. **Request/response taint tracking** -- Session taint server classification
   ಆಧರಿಸಿ escalate ಆಗುತ್ತದೆ
4. **Schema validation** -- ಎಲ್ಲ requests ಮತ್ತು responses declared schemas ವಿರುದ್ಧ
   validate ಮಾಡಲ್ಪಡುತ್ತವೆ
5. **Audit logging** -- ಪ್ರತಿ tool call, ನಿರ್ಧಾರ, ಮತ್ತು taint ಬದಲಾವಣೆ ದಾಖಲಿಸಲ್ಪಡುತ್ತದೆ

## MCP Server States

ಎಲ್ಲ MCP servers `UNTRUSTED` ಗೆ default ಆಗುತ್ತವೆ. Agent ಅವುಗಳನ್ನು invoke ಮಾಡಲು
ಸ್ಪಷ್ಟವಾಗಿ classify ಮಾಡಲ್ಪಡಬೇಕು.

| State        | ವಿವರಣೆ                                                                    | Agent Invoke ಮಾಡಬಹುದೇ? |
| ------------ | -------------------------------------------------------------------------- | :--------------------: |
| `UNTRUSTED`  | ಹೊಸ servers ಗೆ default. ಪರಿಶೀಲನೆ ಬಾಕಿ.                                   |          ಇಲ್ಲ          |
| `CLASSIFIED` | ಪರಿಶೀಲಿಸಲ್ಪಟ್ಟ ಮತ್ತು per-tool permissions ಜೊತೆ classification level ನಿಯೋಜಿತ | ಹೌದು (policy ಒಳಗಡೆ)   |
| `BLOCKED`    | Admin ಸ್ಪಷ್ಟವಾಗಿ ನಿಷೇಧಿಸಿದ.                                               |          ಇಲ್ಲ          |

<img src="/diagrams/state-machine.svg" alt="MCP server state machine: UNTRUSTED → CLASSIFIED or BLOCKED" style="max-width: 100%;" />

::: warning SECURITY `UNTRUSTED` MCP server ಅನ್ನು ಯಾವುದೇ ಸಂದರ್ಭದಲ್ಲಿ agent invoke
ಮಾಡಲಾಗದು. LLM unclassified server ಬಳಸಲು request ಮಾಡಲು, convince ಮಾಡಲು, ಅಥವಾ
ವ್ಯವಸ್ಥೆಯನ್ನು ತಪ್ಪು ದಾರಿ ಹಿಡಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. Classification code-level gate -- LLM
ನಿರ್ಧಾರ ಅಲ್ಲ. :::

## ಸಂರಚನೆ

MCP servers `triggerfish.yaml` ನಲ್ಲಿ server ID key ಆಗಿ map ಆಗಿ configure ಮಾಡಲ್ಪಡುತ್ತವೆ.
ಪ್ರತಿ server local subprocess (stdio transport) ಅಥವಾ remote endpoint (SSE transport)
ಬಳಸುತ್ತದೆ.

### Local Servers (Stdio)

Local servers subprocesses ಆಗಿ spawn ಮಾಡಲ್ಪಡುತ್ತವೆ. Triggerfish stdin/stdout
ಮೂಲಕ ಸಂವಹಿಸುತ್ತದೆ.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### Remote Servers (SSE)

Remote servers ಬೇರೆಡೆ ಚಲಿಸುತ್ತವೆ ಮತ್ತು HTTP Server-Sent Events ಮೂಲಕ ಪ್ರವೇಶಿಸಲ್ಪಡುತ್ತವೆ.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Configuration Keys

| Key              | Type     | Required      | ವಿವರಣೆ                                                                          |
| ---------------- | -------- | ------------- | -------------------------------------------------------------------------------- |
| `command`        | string   | ಹೌದು (stdio)  | Spawn ಮಾಡಬೇಕಾದ binary (ಉದಾ., `npx`, `deno`, `node`)                             |
| `args`           | string[] | ಇಲ್ಲ          | Command ಗೆ pass ಮಾಡಲಾದ arguments                                                |
| `env`            | map      | ಇಲ್ಲ          | Subprocess ಗಾಗಿ environment variables                                            |
| `url`            | string   | ಹೌದು (SSE)    | Remote servers ಗಾಗಿ HTTP endpoint                                               |
| `classification` | string   | **ಹೌದು**      | Data sensitivity level: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, ಅಥವಾ `RESTRICTED` |
| `enabled`        | boolean  | ಇಲ್ಲ          | Default: `true`. Config ತೆಗೆಯದೆ skip ಮಾಡಲು `false` ಮಾಡಿ.                       |

ಪ್ರತಿ server ಗೆ `command` (local) ಅಥವಾ `url` (remote) ಇರಬೇಕು. ಯಾವುದೂ ಇಲ್ಲದ servers
skip ಆಗುತ್ತವೆ.

### Lazy Connection

MCP servers startup ನಂತರ background ನಲ್ಲಿ connect ಆಗುತ್ತವೆ. ಎಲ್ಲ servers ready
ಆಗುವ ತನಕ ಕಾಯದೆ agent ಬಳಸಬಹುದು.

- Servers exponential backoff ಜೊತೆ retry ಮಾಡುತ್ತವೆ: 2s → 4s → 8s → 30s max
- ಹೊಸ servers connect ಆದಾಗ agent ಗೆ ಲಭ್ಯವಾಗುತ್ತವೆ -- session restart ಬೇಡ
- Server ಎಲ್ಲ retries ನಂತರ connect ಆಗದಿದ್ದರೆ `failed` state ಪ್ರವೇಶಿಸುತ್ತದೆ,
  ಮತ್ತು ಮುಂದಿನ daemon restart ನಲ್ಲಿ retry ಮಾಡಬಹುದು

CLI ಮತ್ತು Tidepool interfaces real-time MCP connection status ತೋರಿಸುತ್ತವೆ.
[CLI Channel](/kn-IN/channels/cli#mcp-server-status) ನೋಡಿ.

### Server Disable ಮಾಡುವುದು

MCP server ಅನ್ನು ತಾತ್ಕಾಲಿಕವಾಗಿ disable ಮಾಡಲು config ತೆಗೆಯದೆ:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Startup ಸಮಯದಲ್ಲಿ skip ಮಾಡಲ್ಪಡುತ್ತದೆ
```

### Environment Variables ಮತ್ತು Secrets

`keychain:` prefix ಇರುವ env values startup ನಲ್ಲಿ OS keychain ನಿಂದ resolve ಮಾಡಲ್ಪಡುತ್ತವೆ:

```yaml
env:
  API_KEY: "keychain:my-secret-name" # OS keychain ನಿಂದ resolve
  PLAIN_VAR: "literal-value" # ಯಥಾರೂಪ pass ಆಗುತ್ತದೆ
```

Host environment ನಿಂದ `PATH` ಮಾತ್ರ inherit ಮಾಡಲ್ಪಡುತ್ತದೆ (ಹೀಗಾಗಿ `npx`, `node`,
`deno` ಸರಿಯಾಗಿ resolve ಆಗುತ್ತವೆ). ಇತರ host environment variables MCP server
subprocesses ಗೆ leak ಆಗುವುದಿಲ್ಲ.

::: tip `triggerfish config set-secret <name> <value>` ಜೊತೆ secrets store ಮಾಡಿ.
ನಂತರ MCP server env config ನಲ್ಲಿ `keychain:<name>` ಆಗಿ reference ಮಾಡಿ. :::

### Tool Naming

MCP servers ನ tools built-in tools ಜೊತೆ collision ತಪ್ಪಿಸಲು `mcp_<serverId>_<toolName>`
ಆಗಿ namespace ಮಾಡಲ್ಪಡುತ್ತವೆ. ಉದಾಹರಣೆಗೆ, `github` ಹೆಸರಿನ server `list_repos` tool
ಒದಗಿಸಿದರೆ, agent ಅದನ್ನು `mcp_github_list_repos` ಎಂದು ನೋಡುತ್ತದೆ.

### Classification ಮತ್ತು Default Deny

`classification` ಬಿಟ್ಟರೆ, server **UNTRUSTED** ಆಗಿ register ಆಗುತ್ತದೆ ಮತ್ತು gateway
ಎಲ್ಲ tool calls reject ಮಾಡುತ್ತದೆ. Classification level ಸ್ಪಷ್ಟವಾಗಿ ಆಯ್ಕೆ ಮಾಡಲೇಬೇಕು.
ಸರಿಯಾದ level ಆಯ್ಕೆ ಮಾಡಲು [Classification Guide](/kn-IN/guide/classification-guide) ನೋಡಿ.

## Tool Call Flow

Agent MCP tool call ಕೋರಿದಾಗ, gateway request forward ಮಾಡುವ ಮೊದಲು deterministic
checks sequence execute ಮಾಡುತ್ತದೆ.

### 1. Pre-Flight Checks

ಎಲ್ಲ checks deterministic -- LLM calls ಇಲ್ಲ, randomness ಇಲ್ಲ.

| Check                                                 | Failure Result                        |
| ----------------------------------------------------- | ------------------------------------- |
| Server status `CLASSIFIED` ಆಗಿದೆಯೇ?                  | Block: "Server not approved"          |
| Tool ಈ server ಗಾಗಿ permitted ಆಗಿದೆಯೇ?                | Block: "Tool not permitted"           |
| User ಗೆ ಅಗತ್ಯ permissions ಇದೆಯೇ?                      | Block: "Permission denied"            |
| Session taint server classification ಜೊತೆ compatible? | Block: "Would violate write-down"     |
| Schema validation pass ಆಗಿದೆಯೇ?                      | Block: "Invalid parameters"           |

::: info Session taint server classification ಗಿಂತ ಹೆಚ್ಚಿದ್ದರೆ, write-down ತಡೆಯಲು
call block ಆಗುತ್ತದೆ. `CONFIDENTIAL` ಗೆ taint ಆದ session `PUBLIC` MCP server ಗೆ
data ಕಳಿಸಲಾಗದು. :::

### 2. Execute

ಎಲ್ಲ pre-flight checks pass ಆದರೆ, gateway request MCP server ಗೆ forward ಮಾಡುತ್ತದೆ.

### 3. Response Processing

MCP server response ಹಿಂದಿರುಗಿಸಿದಾಗ:

- Response declared schema ವಿರುದ್ಧ validate ಮಾಡಿ
- Response data server classification level ನಲ್ಲಿ classify ಮಾಡಿ
- Session taint update: `taint = max(current_taint, server_classification)`
- Data origin ಟ್ರ್ಯಾಕ್ ಮಾಡಲು lineage record ತಯಾರಿಸಿ

### 4. Audit

ಪ್ರತಿ tool call ಜೊತೆ log ಮಾಡಲ್ಪಡುತ್ತದೆ: server identity, tool name, user identity,
policy ನಿರ್ಧಾರ, taint ಬದಲಾವಣೆ, ಮತ್ತು timestamp.

## Response Taint Rules

MCP server responses server classification level inherit ಮಾಡುತ್ತವೆ. Session taint
ಕೇವಲ escalate ಆಗಬಹುದು.

| Server Classification | Response Taint | Session Impact                              |
| --------------------- | -------------- | ------------------------------------------- |
| `PUBLIC`              | `PUBLIC`       | Taint ಬದಲಾವಣೆ ಇಲ್ಲ                         |
| `INTERNAL`            | `INTERNAL`     | Taint ಕನಿಷ್ಠ `INTERNAL` ಗೆ escalate ಆಗುತ್ತದೆ |
| `CONFIDENTIAL`        | `CONFIDENTIAL` | Taint ಕನಿಷ್ಠ `CONFIDENTIAL` ಗೆ escalate     |
| `RESTRICTED`          | `RESTRICTED`   | Taint `RESTRICTED` ಗೆ escalate ಆಗುತ್ತದೆ    |

Session ಒಂದು ನಿರ್ದಿಷ್ಟ level ಗೆ taint ಆದ ನಂತರ, session ಉಳಿದ ಅವಧಿಯಲ್ಲಿ ಆ level
ಅಥವಾ ಹೆಚ್ಚಿನದರಲ್ಲಿ ಉಳಿಯುತ್ತದೆ. Taint ಕಡಿಮೆ ಮಾಡಲು ಸಂಪೂರ್ಣ session reset ಅಗತ್ಯ
(conversation history ತೆರವು ಮಾಡುತ್ತದೆ).

## User Authentication Passthrough

User-level authentication ಬೆಂಬಲಿಸುವ MCP servers ಗಾಗಿ, gateway system credentials
ಬದಲಾಗಿ user ನ delegated credentials pass ಮಾಡುತ್ತದೆ.

Tool `requires_user_auth: true` ಜೊತೆ configure ಮಾಡಿದಾಗ:

1. Gateway user ಈ MCP server connect ಮಾಡಿದ್ದಾರೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸುತ್ತದೆ
2. Secure credential store ನಿಂದ user ನ delegated credential ಪಡೆಯುತ್ತದೆ
3. MCP request headers ಗೆ user authentication ಸೇರಿಸುತ್ತದೆ
4. MCP server user-level permissions ಜಾರಿಗೊಳಿಸುತ್ತದೆ

ಫಲಿತಾಂಶ: MCP server system identity ಬದಲಾಗಿ **user ನ identity** ನೋಡುತ್ತದೆ.
Permission inheritance MCP boundary ಮೂಲಕ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ -- agent user
ಪ್ರವೇಶಿಸಬಹುದಾದ್ದನ್ನು ಮಾತ್ರ ಪ್ರವೇಶಿಸಬಹುದು.

::: tip Access control ನಿರ್ವಹಿಸುವ ಯಾವುದೇ MCP server ಗಾಗಿ user auth passthrough
ಆದ್ಯತೆಯ pattern. Agent blanket system access ಬದಲಾಗಿ user ಪರವಾನಿಗೆ inherit
ಮಾಡುತ್ತದೆ ಎಂದರ್ಥ. :::

## Schema Validation

Gateway forwarding ಮೊದಲು declared schemas ವಿರುದ್ಧ ಎಲ್ಲ MCP requests ಮತ್ತು responses
validate ಮಾಡುತ್ತದೆ:

```typescript
// Request validation (simplified)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // Validate params against JSON schema
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // Check for injection patterns in string params
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

Schema validation malformed requests ಬಾಹ್ಯ server ತಲುಪುವ ಮೊದಲು catch ಮಾಡುತ್ತದೆ
ಮತ್ತು string parameters ನಲ್ಲಿ potential injection patterns flag ಮಾಡುತ್ತದೆ.

## Enterprise Controls

Enterprise deployments ಗೆ MCP server management ಗಾಗಿ ಹೆಚ್ಚುವರಿ controls ಇವೆ:

- **Admin-managed server registry** -- Admin-approved MCP servers ಮಾತ್ರ classify
  ಮಾಡಬಹುದು
- **Per-department tool permissions** -- ವಿಭಿನ್ನ teams ಭಿನ್ನ tool access ಹೊಂದಬಹುದು
- **Compliance logging** -- ಎಲ್ಲ MCP interactions compliance dashboards ನಲ್ಲಿ ಲಭ್ಯ
- **Rate limiting** -- Per-server ಮತ್ತು per-tool rate limits
- **Server health monitoring** -- Gateway server availability ಮತ್ತು response times
  ಟ್ರ್ಯಾಕ್ ಮಾಡುತ್ತದೆ
