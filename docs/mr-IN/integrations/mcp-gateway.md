# MCP Gateway

> कोणताही MCP server वापरा. आम्ही boundary secure करतो.

Model Context Protocol (MCP) हा agent-to-tool communication साठी emerging
standard आहे. Triggerfish एक secure MCP Gateway प्रदान करतो जो तुम्हाला
classification controls, tool-level permissions, taint tracking, आणि full audit
logging enforce करताना कोणत्याही MCP-compatible server शी connect करण्यास परवानगी
देतो.

तुम्ही MCP servers आणता. Triggerfish boundary cross करणाऱ्या प्रत्येक request
आणि response secure करतो.

## हे कसे काम करते

MCP Gateway तुमच्या एजंट आणि कोणत्याही MCP server दरम्यान बसतो. प्रत्येक tool
call external server ला पोहोचण्यापूर्वी policy enforcement layer मधून जातो,
आणि प्रत्येक response एजंट context मध्ये enter होण्यापूर्वी classified केला
जातो.

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway flow: Agent → MCP Gateway → Policy Layer → MCP Server, with deny path to BLOCKED" style="max-width: 100%;" />

Gateway पाच core functions प्रदान करतो:

1. **Server authentication आणि classification** -- MCP servers वापरण्यापूर्वी
   reviewed आणि classified असणे आवश्यक आहे
2. **Tool-level permission enforcement** -- Individual tools permitted, restricted,
   किंवा blocked केले जाऊ शकतात
3. **Request/response taint tracking** -- Server classification वर आधारित Session
   taint escalate होतो
4. **Schema validation** -- Declared schemas विरुद्ध सर्व requests आणि responses
   validated
5. **Audit logging** -- प्रत्येक tool call, decision, आणि taint change recorded

## MCP Server States

सर्व MCP servers `UNTRUSTED` ला default करतात. एजंट त्यांना invoke करण्यापूर्वी
explicitly classified असणे आवश्यक आहे.

| State        | वर्णन                                                                      | एजंट Invoke करू शकतो? |
| ------------ | -------------------------------------------------------------------------- | :-------------------: |
| `UNTRUSTED`  | नवीन servers साठी default. Review pending.                                 |          नाही         |
| `CLASSIFIED` | Reviewed आणि per-tool permissions सह classification level assigned.         | हो (policy च्या आत)  |
| `BLOCKED`    | Admin द्वारे explicitly prohibited.                                         |          नाही         |

<img src="/diagrams/state-machine.svg" alt="MCP server state machine: UNTRUSTED → CLASSIFIED or BLOCKED" style="max-width: 100%;" />

::: warning SECURITY `UNTRUSTED` MCP server कोणत्याही circumstances मध्ये
एजंटद्वारे invoke केला जाऊ शकत नाही. LLM unclassified server वापरण्यासाठी
system ला request, convince, किंवा trick करू शकत नाही. Classification एक
code-level gate आहे, LLM decision नाही. :::

## Configuration

MCP servers `triggerfish.yaml` मध्ये server ID नुसार keyed map म्हणून configured
आहेत. प्रत्येक server एकतर local subprocess (stdio transport) किंवा remote
endpoint (SSE transport) वापरतो.

### Local Servers (Stdio)

Local servers subprocesses म्हणून spawn केले जातात. Triggerfish stdin/stdout
द्वारे त्यांच्याशी communicate करतो.

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

Remote servers इतरत्र run होतात आणि HTTP Server-Sent Events द्वारे accessed
केले जातात.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Configuration Keys

| Key              | Type     | Required      | वर्णन                                                                      |
| ---------------- | -------- | ------------- | -------------------------------------------------------------------------- |
| `command`        | string   | हो (stdio)    | Spawn करायचे binary (उदा., `npx`, `deno`, `node`)                         |
| `args`           | string[] | नाही          | Command ला passed arguments                                                |
| `env`            | map      | नाही          | Subprocess साठी environment variables                                      |
| `url`            | string   | हो (SSE)      | Remote servers साठी HTTP endpoint                                          |
| `classification` | string   | **हो**        | Data sensitivity level: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, किंवा `RESTRICTED` |
| `enabled`        | boolean  | नाही          | Default: `true`. Config remove न करता skip करण्यासाठी `false` वर set करा. |

प्रत्येक server ला एकतर `command` (local) किंवा `url` (remote) असणे आवश्यक आहे.
दोन्ही नसलेले servers skipped आहेत.

### Lazy Connection

MCP servers startup नंतर background मध्ये connect होतात. तुमचा एजंट वापरण्यापूर्वी
सर्व servers ready होण्याची wait करण्याची आवश्यकता नाही.

- Servers exponential backoff सह retry करतात: 2s → 4s → 8s → 30s max
- नवीन servers connect होतात तसे एजंटला available होतात -- session restart
  आवश्यक नाही
- Server सर्व retries नंतर connect होण्यास fail झाल्यास, ते `failed` state मध्ये
  enter होते आणि पुढच्या daemon restart वर retried होऊ शकते

CLI आणि Tidepool interfaces real-time MCP connection status display करतात.

### Server Disable करणे

MCP server configuration remove न करता तात्पुरते disable करण्यासाठी:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Startup दरम्यान Skipped
```

### Environment Variables आणि Secrets

`keychain:` prefix असलेल्या Env values startup वर OS keychain मधून resolve
केल्या जातात:

```yaml
env:
  API_KEY: "keychain:my-secret-name" # OS keychain मधून Resolved
  PLAIN_VAR: "literal-value" # As-is passed
```

Host environment मधून फक्त `PATH` inherited आहे (त्यामुळे `npx`, `node`, `deno`,
इ. correctly resolve होतात). इतर कोणतेही host environment variables MCP server
subprocesses मध्ये leak होत नाहीत.

::: tip `triggerfish config set-secret <name> <value>` सह secrets store करा.
नंतर त्यांना MCP server env config मध्ये `keychain:<name>` म्हणून reference करा. :::

### Tool Naming

MCP servers कडील Tools built-in tools शी collision टाळण्यासाठी
`mcp_<serverId>_<toolName>` म्हणून namespaced आहेत. उदाहरणार्थ, `github` नावाचा
server `list_repos` नावाचा tool expose करत असल्यास, एजंट ते
`mcp_github_list_repos` म्हणून पाहतो.

### Classification आणि Default Deny

`classification` omit केल्यास, server **UNTRUSTED** म्हणून registered आहे आणि
gateway सर्व tool calls reject करतो. तुम्ही explicitly classification level
निवडणे आवश्यक आहे. योग्य level निवडण्यास मदतीसाठी
[Classification Guide](/mr-IN/guide/classification-guide) पहा.

## Tool Call Flow

एजंट MCP tool call request करतो तेव्हा, gateway request forward करण्यापूर्वी
deterministic sequence of checks execute करतो.

### 1. Pre-Flight Checks

सर्व checks deterministic आहेत -- कोणतेही LLM calls नाहीत, कोणताही randomness
नाही.

| Check                                              | Failure Result                    |
| -------------------------------------------------- | --------------------------------- |
| Server status `CLASSIFIED` आहे का?                 | Block: "Server not approved"      |
| या server साठी Tool permitted आहे का?              | Block: "Tool not permitted"       |
| User ला required permissions आहेत का?              | Block: "Permission denied"        |
| Session taint server classification शी compatible? | Block: "Would violate write-down" |
| Schema validation passes?                          | Block: "Invalid parameters"       |

::: info Session taint server classification पेक्षा जास्त असल्यास, write-down
रोखण्यासाठी call blocked आहे. `CONFIDENTIAL` tainted session `PUBLIC` MCP server
ला data पाठवू शकत नाही. :::

### 2. Execute

सर्व pre-flight checks pass झाल्यास, gateway MCP server ला request forward करतो.

### 3. Response Processing

MCP server response return करतो तेव्हा:

- Response declared schema विरुद्ध validate करा
- Server च्या classification level वर response data classify करा
- Session taint update करा: `taint = max(current_taint, server_classification)`
- Data origin track करणारा lineage record तयार करा

### 4. Audit

प्रत्येक tool call logged आहे: server identity, tool name, user identity, policy
decision, taint change, आणि timestamp.

## Response Taint Rules

MCP server responses server चा classification level inherit करतात. Session taint
फक्त escalate होऊ शकतो.

| Server Classification | Response Taint | Session Impact                                |
| --------------------- | -------------- | --------------------------------------------- |
| `PUBLIC`              | `PUBLIC`       | Taint बदल नाही                               |
| `INTERNAL`            | `INTERNAL`     | Taint कमीत कमी `INTERNAL` पर्यंत escalates   |
| `CONFIDENTIAL`        | `CONFIDENTIAL` | Taint कमीत कमी `CONFIDENTIAL` पर्यंत escalates |
| `RESTRICTED`          | `RESTRICTED`   | Taint `RESTRICTED` पर्यंत escalates           |

Session दिलेल्या level वर tainted झाल्यावर, session च्या उर्वरित भागात त्या
level वर किंवा त्याहून अधिक राहतो. Taint कमी करण्यासाठी full session reset
(जे conversation history clear करतो) आवश्यक आहे.

## User Authentication Passthrough

User-level authentication support करणाऱ्या MCP servers साठी, gateway system
credentials ऐवजी user चे delegated credentials pass करतो.

Tool `requires_user_auth: true` सह configured असताना:

1. Gateway check करतो user ने हा MCP server connect केला आहे का
2. Secure credential store मधून user चे delegated credential retrieve करतो
3. MCP request headers मध्ये user authentication जोडतो
4. MCP server user-level permissions enforce करतो

Result: MCP server system identity नाही तर **user चे identity** पाहतो. Permission
inheritance MCP boundary मधून काम करतो -- एजंट फक्त user जे access करू शकतो
ते access करू शकतो.

::: tip User auth passthrough हा access control manage करणाऱ्या कोणत्याही MCP
server साठी preferred pattern आहे. याचा अर्थ एजंट blanket system access ऐवजी
user चे permissions inherit करतो. :::

## Enterprise Controls

Enterprise deployments मध्ये MCP server management साठी additional controls आहेत:

- **Admin-managed server registry** -- फक्त admin-approved MCP servers classified
  होऊ शकतात
- **Per-department tool permissions** -- वेगवेगळ्या teams ला वेगळे tool access
  असू शकते
- **Compliance logging** -- सर्व MCP interactions compliance dashboards मध्ये
  available
- **Rate limiting** -- Per-server आणि per-tool rate limits
- **Server health monitoring** -- Gateway server availability आणि response
  times track करतो
