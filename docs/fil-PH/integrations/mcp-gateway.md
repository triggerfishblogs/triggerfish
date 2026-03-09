# MCP Gateway

> Gamitin ang kahit anong MCP server. Kami ang bahala sa security ng boundary.

Ang Model Context Protocol (MCP) ang umuusbong na standard para sa
agent-to-tool communication. Nagbibigay ang Triggerfish ng secure MCP Gateway na
nagpapa-connect sa iyo sa kahit anong MCP-compatible server habang ine-enforce
ang classification controls, tool-level permissions, taint tracking, at full
audit logging.

Ikaw ang nagdadala ng MCP servers. Sinise-secure ng Triggerfish ang bawat
request at response na tumatawid sa boundary.

## Paano Ito Gumagana

Ang MCP Gateway ay nasa pagitan ng iyong agent at kahit anong MCP server.
Bawat tool call ay dumadaan sa policy enforcement layer bago makarating sa
external server, at bawat response ay cina-classify bago pumasok sa agent
context.

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway flow: Agent → MCP Gateway → Policy Layer → MCP Server, na may deny path sa BLOCKED" style="max-width: 100%;" />

Nagbibigay ang gateway ng limang core functions:

1. **Server authentication at classification** -- Kailangan muna i-review at
   i-classify ang mga MCP servers bago gamitin
2. **Tool-level permission enforcement** -- Ang mga individual tools ay pwedeng
   permitted, restricted, o blocked
3. **Request/response taint tracking** -- Nag-eescalate ang session taint base
   sa server classification
4. **Schema validation** -- Lahat ng requests at responses ay vina-validate
   laban sa declared schemas
5. **Audit logging** -- Bawat tool call, decision, at taint change ay nire-record

## MCP Server States

Lahat ng MCP servers ay naka-default sa `UNTRUSTED`. Kailangan muna silang
explicitly na i-classify bago sila ma-invoke ng agent.

| State        | Description                                                               | Pwede bang Ma-invoke ng Agent? |
| ------------ | ------------------------------------------------------------------------- | :----------------------------: |
| `UNTRUSTED`  | Default para sa bagong servers. Naghihintay ng review.                    |             Hindi              |
| `CLASSIFIED` | Na-review at may assigned classification level na may per-tool permissions. |     Oo (within policy)        |
| `BLOCKED`    | Explicitly na-prohibit ng admin.                                          |             Hindi              |

<img src="/diagrams/state-machine.svg" alt="MCP server state machine: UNTRUSTED → CLASSIFIED o BLOCKED" style="max-width: 100%;" />

::: warning SECURITY Ang isang `UNTRUSTED` MCP server ay hindi ma-invoke ng
agent sa kahit anong sitwasyon. Hindi pwedeng mag-request, mag-convince, o
mang-trick ng LLM ang system para gumamit ng unclassified server. Ang
classification ay isang code-level gate, hindi LLM decision. :::

## Configuration

Ang mga MCP servers ay configured sa `triggerfish.yaml` bilang map na keyed by
server ID. Bawat server ay gumagamit ng local subprocess (stdio transport) o
remote endpoint (SSE transport).

### Local Servers (Stdio)

Ang mga local servers ay spawned bilang subprocesses. Nakikipag-communicate ang
Triggerfish sa kanila via stdin/stdout.

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

Ang mga remote servers ay nare-run sa ibang lugar at ina-access via HTTP
Server-Sent Events.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Configuration Keys

| Key              | Type     | Required    | Description                                                                    |
| ---------------- | -------- | ----------- | ------------------------------------------------------------------------------ |
| `command`        | string   | Oo (stdio)  | Binary na ispa-spawn (hal., `npx`, `deno`, `node`)                            |
| `args`           | string[] | Hindi       | Arguments na ipapasa sa command                                                |
| `env`            | map      | Hindi       | Environment variables para sa subprocess                                       |
| `url`            | string   | Oo (SSE)    | HTTP endpoint para sa remote servers                                           |
| `classification` | string   | **Oo**      | Data sensitivity level: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, o `RESTRICTED`   |
| `enabled`        | boolean  | Hindi       | Default: `true`. I-set sa `false` para i-skip nang hindi tinatanggal ang config. |

Bawat server ay kailangang may `command` (local) o `url` (remote). Ang mga
servers na walang kahit ano sa dalawa ay nisi-skip.

### Lazy Connection

Nagkokonekta ang mga MCP servers sa background pagkatapos ng startup. Hindi mo
kailangang maghintay na ready lahat ng servers bago gamitin ang iyong agent.

- Nag-rere-retry ang servers na may exponential backoff: 2s → 4s → 8s → 30s max
- Ang mga bagong servers ay nagi-ging available sa agent habang nagkokonekta --
  walang session restart na kailangan
- Kung fail na mag-connect ang isang server pagkatapos ng lahat ng retries,
  papasok ito sa `failed` state at pwedeng i-retry sa susunod na daemon restart

Nagdi-display ang CLI at Tidepool interfaces ng real-time MCP connection status.
Tingnan ang [CLI Channel](/fil-PH/channels/cli#mcp-server-status) para sa mga
detalye.

### Pag-disable ng Server

Para pansamantalang i-disable ang isang MCP server nang hindi tinatanggal ang
configuration nito:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Nisi-skip habang nag-start
```

### Environment Variables at Secrets

Ang mga env values na may prefix na `keychain:` ay nire-resolve mula sa OS
keychain sa startup:

```yaml
env:
  API_KEY: "keychain:my-secret-name" # Nire-resolve mula sa OS keychain
  PLAIN_VAR: "literal-value" # Ipinasa as-is
```

Tanging `PATH` lang ang inherited mula sa host environment (para maayos na
mag-resolve ang `npx`, `node`, `deno`, atbp.). Walang ibang host environment
variables na nale-leak sa MCP server subprocesses.

::: tip I-store ang secrets gamit ang `triggerfish config set-secret <name> <value>`.
Saka i-reference ang mga ito bilang `keychain:<name>` sa iyong MCP server env
config. :::

### Tool Naming

Ang mga tools mula sa MCP servers ay namespaced bilang
`mcp_<serverId>_<toolName>` para maiwasan ang collision sa built-in tools.
Halimbawa, kung ang isang server na pinangalanang `github` ay nag-expose ng
tool na tinatawag na `list_repos`, makikita ito ng agent bilang
`mcp_github_list_repos`.

### Classification at Default Deny

Kung ini-omit mo ang `classification`, ang server ay nare-register bilang
**UNTRUSTED** at nire-reject ng gateway ang lahat ng tool calls. Kailangan mong
explicitly pumili ng classification level. Tingnan ang
[Classification Guide](/guide/classification-guide) para sa tulong sa pagpili
ng tamang level.

## Tool Call Flow

Kapag nagre-request ang agent ng MCP tool call, ine-execute ng gateway ang
isang deterministic sequence ng checks bago i-forward ang request.

### 1. Pre-Flight Checks

Lahat ng checks ay deterministic -- walang LLM calls, walang randomness.

| Check                                                | Failure Result                       |
| ---------------------------------------------------- | ------------------------------------ |
| Ang server status ay `CLASSIFIED`?                   | Block: "Server not approved"         |
| Ang tool ay permitted para sa server na ito?         | Block: "Tool not permitted"          |
| May required permissions ba ang user?                | Block: "Permission denied"           |
| Compatible ba ang session taint sa server classification? | Block: "Would violate write-down" |
| Pumasa ba ang schema validation?                     | Block: "Invalid parameters"          |

::: info Kung ang session taint ay mas mataas kaysa sa server classification,
bina-block ang call para maiwasan ang write-down. Ang isang session na tainted
sa `CONFIDENTIAL` ay hindi pwedeng magpadala ng data sa `PUBLIC` MCP server. :::

### 2. Execute

Kung pumasa lahat ng pre-flight checks, ifinino-forward ng gateway ang request
sa MCP server.

### 3. Response Processing

Kapag nag-return ng response ang MCP server:

- I-validate ang response laban sa declared schema
- I-classify ang response data sa classification level ng server
- I-update ang session taint: `taint = max(current_taint, server_classification)`
- Gumawa ng lineage record na tina-track ang data origin

### 4. Audit

Bawat tool call ay nilo-log kasama ang: server identity, tool name, user
identity, policy decision, taint change, at timestamp.

## Response Taint Rules

Ang mga MCP server responses ay nag-iinherit ng classification level ng server.
Ang session taint ay pwede lang mag-escalate.

| Server Classification | Response Taint | Session Impact                              |
| --------------------- | -------------- | ------------------------------------------- |
| `PUBLIC`              | `PUBLIC`       | Walang taint change                         |
| `INTERNAL`            | `INTERNAL`     | Nag-eescalate ang taint sa kahit `INTERNAL` |
| `CONFIDENTIAL`        | `CONFIDENTIAL` | Nag-eescalate ang taint sa kahit `CONFIDENTIAL` |
| `RESTRICTED`          | `RESTRICTED`   | Nag-eescalate ang taint sa `RESTRICTED`     |

Kapag na-taint na ang isang session sa isang level, nananatili ito sa level na
iyon o mas mataas sa natitirang bahagi ng session. Kailangan ng full session
reset (na nagci-clear ng conversation history) para ibaba ang taint.

## User Authentication Passthrough

Para sa mga MCP servers na sumusuporta ng user-level authentication,
ipina-pass through ng gateway ang delegated credentials ng user sa halip na
system credentials.

Kapag ang isang tool ay configured na may `requires_user_auth: true`:

1. Chine-check ng gateway kung na-connect na ng user ang MCP server na ito
2. Kinukuha ang delegated credential ng user mula sa secure credential store
3. Idinadagdag ang user authentication sa MCP request headers
4. Ine-enforce ng MCP server ang user-level permissions

Ang resulta: nakikita ng MCP server ang **identity ng user**, hindi system
identity. Gumagana ang permission inheritance sa MCP boundary -- ang agent ay
maka-access lang ng kaya ng user na i-access.

::: tip Ang user auth passthrough ang preferred pattern para sa kahit anong MCP
server na nagma-manage ng access control. Ibig sabihin nag-iinherit ang agent ng
permissions ng user sa halip na magkaroon ng blanket system access. :::

## Schema Validation

Vina-validate ng gateway ang lahat ng MCP requests at responses laban sa
declared schemas bago i-forward:

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

  // I-validate ang params laban sa JSON schema
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // Mag-check ng injection patterns sa string params
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

Nahuhu-li ng schema validation ang malformed requests bago sila makarating sa
external server at finaflag ang mga potential injection patterns sa string
parameters.

## Enterprise Controls

Ang mga enterprise deployments ay may karagdagang controls para sa MCP server
management:

- **Admin-managed server registry** -- Tanging admin-approved MCP servers lang
  ang pwedeng ma-classify
- **Per-department tool permissions** -- Iba't ibang teams ang pwedeng magkaroon
  ng iba't ibang tool access
- **Compliance logging** -- Lahat ng MCP interactions ay available sa compliance
  dashboards
- **Rate limiting** -- Per-server at per-tool rate limits
- **Server health monitoring** -- Tina-track ng gateway ang server availability
  at response times
