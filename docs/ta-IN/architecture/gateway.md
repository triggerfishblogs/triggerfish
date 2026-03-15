# Gateway

Gateway என்பது Triggerfish இன் மத்திய control plane -- ஒரே WebSocket endpoint மூலம் sessions, channels, tools, events மற்றும் agent processes ஐ ஒருங்கிணைக்கும் நீண்ட நேரம் இயங்கும் உள்ளூர் service. Triggerfish இல் நடக்கும் எல்லாமே Gateway வழியாக ஓடுகிறது.

## Architecture

<img src="/diagrams/gateway-architecture.svg" alt="Gateway architecture: channels on the left connect through the central Gateway to services on the right" style="max-width: 100%;" />

Gateway கட்டமைக்கக்கூடிய port இல் கேட்கிறது (இயல்புநிலை `18789`) மற்றும் channel adapters, CLI கட்டளைகள், companion apps மற்றும் உள் services இலிருந்து connections ஏற்கிறது. அனைத்து communication ம் WebSocket மூலம் JSON-RPC பயன்படுத்துகிறது.

## Gateway Services

Gateway அதன் WebSocket மற்றும் HTTP endpoints மூலம் இந்த services வழங்குகிறது:

| Service           | விளக்கம்                                                                            | பாதுகாப்பு Integration              |
| ----------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| **Sessions**      | உருவாக்கு, பட்டியலிடு, வரலாறு பெறு, sessions இடையே அனுப்பு, background tasks spawn | Session taint per-session கண்காணிக்கப்படுகிறது |
| **Channels**      | செய்திகளை route செய், connections நிர்வகி, தோல்வியடைந்த deliveries மீண்டும் முயற்சி | அனைத்து output இல் வகைப்படுத்தல் சரிபார்ப்பு |
| **Cron**          | மீண்டும் வரும் tasks திட்டமிட்டு `TRIGGER.md` இலிருந்து trigger wakeups            | Cron செயல்கள் policy hooks வழியாக செல்கின்றன |
| **Webhooks**      | `POST /webhooks/:sourceId` மூலம் வெளிப்புற services இலிருந்து inbound events ஏற்கு | Inbound தரவு ingestion இல் வகைப்படுத்தப்படுகிறது |
| **Ripple**        | Channels முழுவதும் online நிலை மற்றும் typing indicators கண்காணி                  | முக்கியமான தரவு வெளிப்படுத்தப்படவில்லை |
| **Config**        | Restart இல்லாமல் settings hot-reload                                               | Enterprise இல் Admin-only            |
| **Control UI**    | Gateway health மற்றும் management க்கான web dashboard                              | Token-authenticated                  |
| **Tide Pool**     | Agent-driven A2UI visual workspace host செய்                                        | உள்ளடக்கம் output hooks க்கு உட்பட்டது |
| **Notifications** | Priority routing உடன் cross-channel notification delivery                           | வகைப்படுத்தல் விதிகள் பொருந்தும்   |

## WebSocket JSON-RPC Protocol

Clients Gateway உடன் WebSocket மூலம் இணைந்து JSON-RPC 2.0 செய்திகளை பரிமாறுகின்றன. ஒவ்வொரு செய்தியும் typed parameters மற்றும் typed response உடன் method அழைப்பு.

```typescript
// Client அனுப்புகிறது:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway பதில் அனுப்புகிறது:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

Gateway webhook ingestion க்காக HTTP endpoints ம் serve செய்கிறது. `SchedulerService` இணைக்கப்பட்டிருக்கும்போது, inbound webhook events க்காக `POST /webhooks/:sourceId` routes கிடைக்கும்.

## Authentication

Gateway connections ஒரு token உடன் authenticated ஆகின்றன. Token setup போது உருவாக்கப்படுகிறது (`triggerfish dive`) மற்றும் உள்ளூரில் சேமிக்கப்படுகிறது.

::: warning SECURITY Gateway இயல்பாக `127.0.0.1` க்கு bind ஆகிறது மற்றும் network க்கு வெளிப்படுத்தப்படவில்லை. Remote அணுகல் வெளிப்படையான tunnel கட்டமைப்பு தேவைப்படுகிறது. authentication இல்லாமல் Gateway WebSocket ஐ ஒருபோதும் public internet க்கு வெளிப்படுத்தாதீர்கள். :::

## Session நிர்வாகம்

Gateway sessions இன் முழு lifecycle ஐ நிர்வகிக்கிறது. Sessions என்பது உரையாடல் நிலையின் அடிப்படை அலகு, ஒவ்வொன்றும் சுயாதீன taint கண்காணிப்புடன்.

### Session வகைகள்

| வகை        | விசை Pattern                  | விளக்கம்                                                                     |
| ---------- | ----------------------------- | ---------------------------------------------------------------------------- |
| Main       | `main`                        | Owner உடன் முதன்மை நேரடி உரையாடல். Restarts முழுவதும் நிலைத்திருக்கும்.    |
| Channel    | `channel:<type>:<id>`         | இணைக்கப்பட்ட சேனலுக்கு ஒன்று. சேனலுக்கு per தனிமைப்படுத்தப்பட்ட taint.   |
| Background | `bg:<task_id>`                | Cron jobs மற்றும் webhook-triggered tasks க்கு spawn. `PUBLIC` taint இல் தொடங்கும். |
| Agent      | `agent:<agent_id>`            | Multi-agent routing க்கான Per-agent sessions.                               |
| Group      | `group:<channel>:<group_id>`  | Group chat sessions.                                                         |

## Notification Service

Gateway ஒரு first-class notification service ஐ ஒருங்கிணைக்கிறது, இது தளம் முழுவதும் ad-hoc "notify owner" patterns ஐ மாற்றுகிறது. அனைத்து notifications ம் ஒரே `NotificationService` மூலம் ஓடுகின்றன.

### Priority Routing

| Priority   | நடத்தை                                                           |
| ---------- | ----------------------------------------------------------------- |
| `CRITICAL` | Quiet hours bypass செய், உடனடியாக அனைத்து connected channels க்கும் deliver |
| `HIGH`     | Preferred channel க்கு உடனடியாக deliver, offline என்றால் queue  |
| `NORMAL`   | Active session க்கு deliver, அல்லது அடுத்த session start க்காக queue |
| `LOW`      | Queue செய், active sessions போது batches இல் deliver             |

### Notification மூலங்கள்

| மூலம்                      | வகை        | இயல்புநிலை Priority |
| -------------------------- | ---------- | ------------------- |
| Policy violations          | `security` | `CRITICAL`          |
| Threat intelligence alerts | `security` | `CRITICAL`          |
| Skill approval requests    | `approval` | `HIGH`              |
| Cron job failures          | `system`   | `HIGH`              |
| System health warnings     | `system`   | `HIGH`              |
| Webhook event triggers     | `info`     | `NORMAL`            |
| The Reef updates available | `info`     | `LOW`               |

## Scheduler Integration

Gateway scheduler service ஐ host செய்கிறது, இது நிர்வகிக்கிறது:

- **Cron tick loop**: திட்டமிட்ட tasks இன் periodic மதிப்பீடு
- **Trigger wakeups**: `TRIGGER.md` இல் வரையறுக்கப்பட்ட agent wakeups
- **Webhook HTTP endpoints**: Inbound events க்காக `POST /webhooks/:sourceId`
- **Orchestrator தனிமைப்படுத்தல்**: ஒவ்வொரு திட்டமிட்ட task அதன் சொந்த `OrchestratorFactory` இல் தனிமைப்படுத்தப்பட்ட session நிலையுடன் இயங்குகிறது

::: tip Cron-triggered மற்றும் webhook-triggered tasks புதிய `PUBLIC` taint உடன் background sessions spawn செய்கின்றன. அவை ஏதோ ஒரு session இன் taint ஐ வாரிசாக பெறுவதில்லை, சுயாதீன tasks சுத்தமான வகைப்படுத்தல் நிலையில் தொடங்குவதை உறுதிப்படுத்துகிறது. :::

## Health மற்றும் Diagnostics

`triggerfish patrol` கட்டளை Gateway உடன் இணைந்து diagnostic health checks இயக்குகிறது, சரிபார்க்கிறது:

- Gateway இயங்குகிறது மற்றும் பதில் அளிக்கிறது
- அனைத்து கட்டமைக்கப்பட்ட channels இணைக்கப்பட்டுள்ளன
- Storage அணுக்கூடியது
- திட்டமிட்ட tasks நேரத்தில் செயல்படுகின்றன
- Deliver செய்யப்படாத critical notifications queue இல் சிக்கவில்லை
