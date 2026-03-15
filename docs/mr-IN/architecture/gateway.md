# Gateway

Gateway हे Triggerfish चे central control plane आहे -- एक long-running local
service जे sessions, channels, tools, events आणि agent processes एकाच WebSocket
endpoint द्वारे coordinate करते. Triggerfish मध्ये जे काही होते ते Gateway द्वारे
वाहते.

## आर्किटेक्चर

<img src="/diagrams/gateway-architecture.svg" alt="Gateway architecture: channels on the left connect through the central Gateway to services on the right" style="max-width: 100%;" />

Gateway configurable port (default `18789`) वर listen करते आणि channel adapters,
CLI commands, companion apps आणि internal services कडून connections स्वीकारते.
सर्व communication WebSocket वर JSON-RPC वापरते.

## Gateway Services

Gateway आपल्या WebSocket आणि HTTP endpoints द्वारे हे services प्रदान करते:

| Service           | वर्णन                                                                          | Security Integration                    |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------- |
| **Sessions**      | तयार करा, यादी करा, history retrieve करा, sessions मध्ये पाठवा, background tasks spawn करा | Session taint per-session tracked       |
| **Channels**      | Messages route करा, connections व्यवस्थापित करा, failed deliveries retry करा   | सर्व output वर Classification checks    |
| **Cron**          | आवर्ती tasks schedule करा आणि `TRIGGER.md` मधून trigger wakeups               | Cron actions policy hooks मधून जातात    |
| **Webhooks**      | `POST /webhooks/:sourceId` द्वारे बाह्य services कडून येणारे events स्वीकारा  | Inbound data ingestion वर classified    |
| **Ripple**        | Channels मध्ये online status आणि typing indicators track करा                   | कोणताही संवेदनशील data exposed नाही     |
| **Config**        | Restart शिवाय settings hot-reload करा                                          | Enterprise मध्ये Admin-only             |
| **Control UI**    | Gateway health आणि management साठी Web dashboard                               | Token-authenticated                     |
| **Tide Pool**     | Agent-driven A2UI visual workspace host करा                                    | Content output hooks च्या अधीन          |
| **Notifications** | Priority routing सह cross-channel notification delivery                         | Classification rules लागू होतात         |

## WebSocket JSON-RPC Protocol

Clients WebSocket वर Gateway शी connect होतात आणि JSON-RPC 2.0 messages exchange
करतात.

```typescript
// Client sends:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway responds:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

## Authentication

Gateway connections token सह authenticated आहेत. Token setup (`triggerfish dive`)
दरम्यान तयार केला जातो आणि स्थानिकरित्या संग्रहित केला जातो.

::: warning SECURITY Gateway default वर `127.0.0.1` ला bind होते आणि network ला
exposed नाही. Remote access साठी explicit tunnel configuration आवश्यक आहे.
कधीही Gateway WebSocket authentication शिवाय public internet ला expose करू नका. :::

## Session व्यवस्थापन

Gateway sessions चे पूर्ण lifecycle व्यवस्थापित करते. Sessions हे conversation
state चे fundamental unit आहेत, प्रत्येकात स्वतंत्र taint tracking आहे.

### Session Types

| Type       | Key Pattern                  | वर्णन                                                                      |
| ---------- | ---------------------------- | -------------------------------------------------------------------------- |
| Main       | `main`                       | Owner सह primary direct conversation. Restarts मध्ये persist होते.         |
| Channel    | `channel:<type>:<id>`        | प्रत्येक connected channel साठी एक. Channel नुसार isolated taint.          |
| Background | `bg:<task_id>`               | Cron jobs आणि webhook-triggered tasks साठी spawned. `PUBLIC` taint ने सुरू. |
| Agent      | `agent:<agent_id>`           | Multi-agent routing साठी per-agent sessions.                               |
| Group      | `group:<channel>:<group_id>` | Group chat sessions.                                                       |

### Session Tools

एजंट Gateway द्वारे routed सर्व, या tools द्वारे sessions शी संवाद साधतो:

| Tool               | वर्णन                                     | Taint Implications                          |
| ------------------ | ----------------------------------------- | ------------------------------------------- |
| `sessions_list`    | ऐच्छिक filters सह active sessions यादी करा | Taint बदल नाही                              |
| `sessions_history` | Session साठी transcript retrieve करा      | Referenced session मधून Taint inherit होते  |
| `sessions_send`    | दुसऱ्या session ला message पाठवा           | Write-down check च्या अधीन                  |
| `sessions_spawn`   | Background task session तयार करा          | नवीन session `PUBLIC` taint ने सुरू होते    |
| `session_status`   | वर्तमान session state, model, cost तपासा  | Taint बदल नाही                              |

## Channel Routing

Gateway channel router द्वारे channels आणि sessions मध्ये messages route करते:

- **Classification gate**: प्रत्येक outbound message delivery पूर्वी `PRE_OUTPUT` मधून जातो
- **Retry with backoff**: Failed deliveries `sendWithRetry()` द्वारे exponential backoff सह retry केल्या जातात
- **Message chunking**: मोठे messages platform-appropriate chunks मध्ये split केले जातात
- **Streaming**: Responses channels ला stream होतात जे ते support करतात

## Notification Service

Gateway प्लॅटफॉर्मवर ad-hoc "notify owner" patterns replace करणारी first-class
notification service integrate करते.

### Priority Routing

| Priority   | वर्तन                                                                |
| ---------- | -------------------------------------------------------------------- |
| `CRITICAL` | Quiet hours bypass करा, लगेच सर्व connected channels ला deliver करा |
| `HIGH`     | Preferred channel ला लगेच deliver करा, offline असल्यास queue करा    |
| `NORMAL`   | Active session ला deliver करा, किंवा next session start साठी queue  |
| `LOW`      | Queue करा, active sessions दरम्यान batches मध्ये deliver करा         |

### Notification Sources

| Source                     | Category   | Default Priority |
| -------------------------- | ---------- | ---------------- |
| Policy violations          | `security` | `CRITICAL`       |
| Threat intelligence alerts | `security` | `CRITICAL`       |
| Skill approval requests    | `approval` | `HIGH`           |
| Cron job failures          | `system`   | `HIGH`           |
| System health warnings     | `system`   | `HIGH`           |
| Webhook event triggers     | `info`     | `NORMAL`         |
| The Reef updates available | `info`     | `LOW`            |

### Delivery Preferences

वापरकर्ते per-channel notification preferences configure करतात:

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "America/Chicago"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## Scheduler Integration

Gateway scheduler service host करते, जे व्यवस्थापित करते:

- **Cron tick loop**: Scheduled tasks चे periodic evaluation
- **Trigger wakeups**: `TRIGGER.md` मध्ये defined agent wakeups
- **Webhook HTTP endpoints**: येणाऱ्या events साठी `POST /webhooks/:sourceId`

::: tip Cron-triggered आणि webhook-triggered tasks fresh `PUBLIC` taint सह
background sessions spawn करतात. ते कोणत्याही existing session चे taint inherit
करत नाहीत. :::

## Health आणि Diagnostics

`triggerfish patrol` कमांड Gateway शी connect होते आणि diagnostic health checks
चालवते, verify करते:

- Gateway चालू आहे आणि responsive आहे
- सर्व configured channels connected आहेत
- Storage accessible आहे
- Scheduled tasks वेळेत execute होत आहेत
- Queue मध्ये कोणत्याही undelivered critical notifications stuck नाहीत
