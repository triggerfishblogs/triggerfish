# MCP Gateway

> کوئی بھی MCP server استعمال کریں۔ ہم حد محفوظ کرتے ہیں۔

Model Context Protocol (MCP) agent-to-tool communication کا emerging standard ہے۔
Triggerfish ایک secure MCP Gateway فراہم کرتا ہے جو آپ کو کسی بھی MCP-compatible server
سے connect کرنے دیتا ہے جبکہ classification controls، tool-level permissions، taint
tracking، اور مکمل audit logging نافذ کرتا ہے۔

آپ MCP servers لاتے ہیں۔ Triggerfish حد سے گزرنے والی ہر request اور response محفوظ
کرتا ہے۔

## یہ کیسے کام کرتا ہے

MCP Gateway آپ کے ایجنٹ اور کسی بھی MCP server کے درمیان ہوتا ہے۔ ہر tool call
external server تک پہنچنے سے پہلے policy enforcement layer سے گزرتی ہے، اور ہر
response agent context میں داخل ہونے سے پہلے classified ہوتی ہے۔

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway flow: Agent → MCP Gateway → Policy Layer → MCP Server, with deny path to BLOCKED" style="max-width: 100%;" />

Gateway پانچ بنیادی functions فراہم کرتا ہے:

1. **Server authentication اور classification** — MCP servers کو استعمال سے پہلے
   review اور classify کیا جانا چاہیے
2. **Tool-level permission enforcement** — Individual tools کو permitted، restricted،
   یا blocked کیا جا سکتا ہے
3. **Request/response taint tracking** — Session taint server classification کی بنیاد
   پر escalate کرتا ہے
4. **Schema validation** — تمام requests اور responses declared schemas کے خلاف validated
5. **Audit logging** — ہر tool call، فیصلہ، اور taint تبدیلی recorded

## MCP Server States

تمام MCP servers ڈیفالٹ `UNTRUSTED` ہوتے ہیں۔ ایجنٹ انہیں invoke کر سکے اس سے پہلے
انہیں صراحتاً classify کیا جانا چاہیے۔

| State        | تفصیل                                                               | ایجنٹ Invoke کر سکتا ہے؟ |
| ------------ | -------------------------------------------------------------------- | :----------------------: |
| `UNTRUSTED`  | نئے servers کے لیے ڈیفالٹ۔ Review pending۔                         |           نہیں           |
| `CLASSIFIED` | Review کیا گیا اور per-tool permissions کے ساتھ classification level تفویض۔ | ہاں (policy کے اندر)     |
| `BLOCKED`    | Admin نے صراحتاً ممنوع قرار دیا۔                                    |           نہیں           |

<img src="/diagrams/state-machine.svg" alt="MCP server state machine: UNTRUSTED → CLASSIFIED or BLOCKED" style="max-width: 100%;" />

::: warning سیکیورٹی ایک `UNTRUSTED` MCP server کسی بھی حالت میں ایجنٹ invoke نہیں
کر سکتا۔ LLM سسٹم کو unclassified server استعمال کرنے کے لیے request، convince، یا
trick نہیں کر سکتا۔ Classification ایک code-level gate ہے، LLM فیصلہ نہیں۔ :::

## Configuration

MCP servers `triggerfish.yaml` میں server ID سے keyed map کے طور پر configure کیے
جاتے ہیں۔ ہر server یا تو local subprocess (stdio transport) یا remote endpoint (SSE
transport) استعمال کرتا ہے۔

### Local Servers (Stdio)

Local servers subprocesses کے طور پر spawn ہوتے ہیں۔ Triggerfish stdin/stdout کے
ذریعے ان سے communicate کرتا ہے۔

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

Remote servers کہیں اور چلتے ہیں اور HTTP Server-Sent Events کے ذریعے access کیے
جاتے ہیں۔

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Configuration Keys

| Key              | Type     | ضروری       | تفصیل                                                                                |
| ---------------- | -------- | ----------- | ------------------------------------------------------------------------------------- |
| `command`        | string   | ہاں (stdio) | Spawn کرنے کا binary (مثلاً، `npx`، `deno`، `node`)                                 |
| `args`           | string[] | نہیں        | Command کو دیے جانے والے arguments                                                   |
| `env`            | map      | نہیں        | Subprocess کے لیے environment variables                                               |
| `url`            | string   | ہاں (SSE)   | Remote servers کے لیے HTTP endpoint                                                  |
| `classification` | string   | **ہاں**     | ڈیٹا sensitivity level: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، یا `RESTRICTED`        |
| `enabled`        | boolean  | نہیں        | ڈیفالٹ: `true`۔ Config ہٹائے بغیر skip کرنے کے لیے `false` پر set کریں۔             |

ہر server کے پاس یا `command` (local) یا `url` (remote) ہونا چاہیے۔ دونوں کے بغیر
servers skip کیے جاتے ہیں۔

### Lazy Connection

MCP servers startup کے بعد background میں connect ہوتے ہیں۔ آپ کو اپنا ایجنٹ استعمال
شروع کرنے سے پہلے تمام servers کے تیار ہونے کا انتظار نہیں کرنا۔

- Servers exponential backoff کے ساتھ retry کرتے ہیں: 2s → 4s → 8s → 30s max
- نئے servers connect ہوتے ہی ایجنٹ کے لیے دستیاب ہو جاتے ہیں — کوئی session restart
  ضروری نہیں
- اگر server تمام retries کے بعد connect نہ ہو، یہ `failed` state میں داخل ہوتا ہے
  اور اگلے daemon restart پر retry کیا جا سکتا ہے

CLI اور Tidepool interfaces real-time MCP connection status display کرتے ہیں۔ تفصیلات
کے لیے [CLI Channel](/ur-PK/channels/cli#mcp-server-status) دیکھیں۔

### Server Disable کرنا

Config ہٹائے بغیر MCP server عارضی طور پر disable کرنے کے لیے:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Startup کے دوران skip
```

### Environment Variables اور Secrets

`keychain:` prefix والی Env values startup پر OS keychain سے resolve ہوتی ہیں:

```yaml
env:
  API_KEY: "keychain:my-secret-name" # OS keychain سے resolve
  PLAIN_VAR: "literal-value" # جیسا ہے ویسے pass
```

صرف `PATH` host environment سے inherited ہوتا ہے (تاکہ `npx`، `node`، `deno`، وغیرہ
صحیح طریقے سے resolve ہوں)۔ کوئی اور host environment variables MCP server subprocesses
میں leak نہیں ہوتے۔

::: tip Secrets `triggerfish config set-secret <name> <value>` سے store کریں۔ پھر
انہیں اپنی MCP server env config میں `keychain:<name>` کے طور پر reference کریں۔ :::

### Tool Naming

MCP servers کے tools built-in tools سے collision سے بچنے کے لیے `mcp_<serverId>_<toolName>`
کے طور پر namespaced ہیں۔ مثلاً، اگر `github` نامی server `list_repos` نامی tool expose
کرے، ایجنٹ اسے `mcp_github_list_repos` کے طور پر دیکھتا ہے۔

### Classification اور Default Deny

اگر آپ `classification` چھوڑ دیں، تو server **UNTRUSTED** کے طور پر registered ہوتا
ہے اور gateway تمام tool calls reject کرتی ہے۔ آپ کو صراحتاً ایک classification level
منتخب کرنا ہوگا۔ صحیح level منتخب کرنے میں مدد کے لیے [Classification Guide](/ur-PK/guide/classification-guide)
دیکھیں۔

## Tool Call Flow

جب ایجنٹ MCP tool call request کرتا ہے، gateway request forward کرنے سے پہلے checks
کی ایک یقینی sequence execute کرتی ہے۔

### 1. Pre-Flight Checks

تمام checks یقینی ہیں — کوئی LLM calls نہیں، کوئی randomness نہیں۔

| Check                                                  | ناکامی کا نتیجہ                   |
| ------------------------------------------------------ | ----------------------------------- |
| Server status `CLASSIFIED` ہے؟                         | Block: "Server not approved"        |
| Tool اس server کے لیے permitted ہے؟                   | Block: "Tool not permitted"         |
| User کو required permissions ہیں؟                     | Block: "Permission denied"          |
| Session taint server classification سے compatible ہے؟ | Block: "Would violate write-down"   |
| Schema validation pass ہوئی؟                          | Block: "Invalid parameters"         |

::: info اگر session taint server classification سے زیادہ ہو، تو write-down روکنے
کے لیے call block ہو جاتی ہے۔ `CONFIDENTIAL` tainted session `PUBLIC` MCP server کو
ڈیٹا نہیں بھیج سکتا۔ :::

### 2. Execute

اگر تمام pre-flight checks pass ہوں، gateway request MCP server کو forward کرتی ہے۔

### 3. Response Processing

جب MCP server response واپس کرے:

- Response declared schema کے خلاف validate کریں
- Response data کو server کی classification level پر classify کریں
- Session taint اپ ڈیٹ کریں: `taint = max(current_taint, server_classification)`
- ڈیٹا origin track کرتا lineage record بنائیں

### 4. Audit

ہر tool call logged ہوتی ہے: server identity، tool name، user identity، policy فیصلہ،
taint تبدیلی، اور timestamp۔

## Response Taint Rules

MCP server responses server کی classification level inherit کرتے ہیں۔ Session taint
صرف escalate ہو سکتا ہے۔

| Server Classification | Response Taint | Session Impact                                 |
| --------------------- | -------------- | ---------------------------------------------- |
| `PUBLIC`              | `PUBLIC`       | کوئی taint تبدیلی نہیں                         |
| `INTERNAL`            | `INTERNAL`     | Taint کم از کم `INTERNAL` تک escalate ہوتا ہے |
| `CONFIDENTIAL`        | `CONFIDENTIAL` | Taint کم از کم `CONFIDENTIAL` تک escalate     |
| `RESTRICTED`          | `RESTRICTED`   | Taint `RESTRICTED` تک escalate ہوتا ہے         |

ایک بار session ایک دی گئی سطح پر tainted ہو، یہ session کے باقی حصے میں اس سطح یا
اونچی پر رہتا ہے۔ Taint کم کرنے کے لیے مکمل session reset (جو conversation history
صاف کرتا ہے) ضروری ہے۔

## User Authentication Passthrough

ان MCP servers کے لیے جو user-level authentication support کرتے ہیں، gateway user کے
delegated credentials pass through کرتی ہے نہ کہ system credentials۔

جب tool `requires_user_auth: true` کے ساتھ configure ہو:

1. Gateway چیک کرتی ہے آیا user نے یہ MCP server connect کیا ہے
2. Secure credential store سے user کا delegated credential retrieve کرتی ہے
3. User authentication کو MCP request headers میں شامل کرتی ہے
4. MCP server user-level permissions نافذ کرتا ہے

نتیجہ: MCP server **user کی identity** دیکھتا ہے، system identity نہیں۔ Permission
inheritance MCP حد سے گزر کر کام کرتی ہے — ایجنٹ صرف وہی access کر سکتا ہے جو user
access کر سکتا ہے۔

::: tip User auth passthrough کسی بھی MCP server کے لیے preferred pattern ہے جو access
control manage کرتا ہے۔ اس کا مطلب ہے ایجنٹ user کی permissions inherit کرتا ہے بجائے
blanket system access کے۔ :::

## Schema Validation

Gateway forward کرنے سے پہلے تمام MCP requests اور responses declared schemas کے
خلاف validate کرتی ہے:

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

Schema validation malformed requests کو external server تک پہنچنے سے پہلے پکڑتی ہے
اور string parameters میں potential injection patterns flag کرتی ہے۔

## Enterprise Controls

Enterprise deployments میں MCP server management کے لیے اضافی controls ہیں:

- **Admin-managed server registry** — صرف admin-approved MCP servers classify کیے جا
  سکتے ہیں
- **Per-department tool permissions** — مختلف teams کے پاس مختلف tool access ہو سکتی ہے
- **Compliance logging** — تمام MCP interactions compliance dashboards میں دستیاب
- **Rate limiting** — Per-server اور per-tool rate limits
- **Server health monitoring** — Gateway server availability اور response times track کرتی ہے
