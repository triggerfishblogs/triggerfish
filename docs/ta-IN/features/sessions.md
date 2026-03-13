# Session Management

Agent sessions ஐ inspect செய்யலாம், தொடர்பு கொள்ளலாம், மற்றும் spawn செய்யலாம். இந்த tools cross-session workflows, background task delegation, மற்றும் cross-channel messaging enable செய்கின்றன -- அனைத்தும் write-down enforcement இல்.

## Tools

### `sessions_list`

தற்போதைய session க்கு visible ஆன அனைத்து active sessions பட்டியலிடவும்.

Parameters இல்லை. Results taint நிலையால் filtered -- ஒரு `PUBLIC` session `CONFIDENTIAL` session metadata பார்க்க முடியாது.

### `sessions_history`

ID மூலம் ஒரு session இன் message history பெறவும்.

| Parameter    | Type   | Required | விளக்கம்                                   |
| ------------ | ------ | -------- | -------------------------------------------- |
| `session_id` | string | ஆம்      | History retrieve செய்ய session ID           |

Target session இன் taint caller இன் taint ஐ விட அதிகமென்றால் access denied.

### `sessions_send`

தற்போதைய session இலிருந்து மற்றொரு session க்கு content அனுப்பவும். Write-down enforcement க்கு உட்பட்டது.

| Parameter    | Type   | Required | விளக்கம்                         |
| ------------ | ------ | -------- | ---------------------------------- |
| `session_id` | string | ஆம்      | Target session ID                  |
| `content`    | string | ஆம்      | அனுப்ப வேண்டிய message content    |

**Write-down check:** Caller இன் taint target session இன் classification நிலைக்கு flow ஆக வேண்டும். ஒரு `CONFIDENTIAL` session ஒரு `PUBLIC` session க்கு data அனுப்ப முடியாது.

### `sessions_spawn`

ஒரு autonomous task க்காக ஒரு புதிய background session spawn செய்யவும்.

| Parameter | Type   | Required | விளக்கம்                                             |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `task`    | string | ஆம்      | Background session என்ன செய்ய வேண்டும் என்ற விளக்கம் |

Spawned session independent `PUBLIC` taint மற்றும் அதன் சொந்த isolated workspace உடன் தொடங்குகிறது. தன்னிச்சையாக இயங்குகிறது மற்றும் complete ஆகும்போது results return செய்கிறது.

### `session_status`

ஒரு specific session க்கான metadata மற்றும் status பெறவும்.

| Parameter    | Type   | Required | விளக்கம்              |
| ------------ | ------ | -------- | ----------------------- |
| `session_id` | string | ஆம்      | சரிபார்க்க session ID |

Session ID, channel, user, taint நிலை, மற்றும் creation time return செய்கிறது. அணுகல் taint-gated.

### `message`

ஒரு channel மற்றும் recipient க்கு ஒரு செய்தி அனுப்பவும். Policy hooks மூலம் write-down enforcement க்கு உட்பட்டது.

| Parameter   | Type   | Required | விளக்கம்                                    |
| ----------- | ------ | -------- | --------------------------------------------- |
| `channel`   | string | ஆம்      | Target channel (உதா. `telegram`, `slack`)    |
| `recipient` | string | ஆம்      | Channel க்குள் recipient identifier           |
| `text`      | string | ஆம்      | அனுப்ப message text                          |

### `summarize`

தற்போதைய conversation இன் concise summary generate செய்யவும். Handoff notes உருவாக்க, context compress செய்ய, அல்லது மற்றொரு channel க்கு deliver செய்ய ஒரு recap உருவாக்க பயனுள்ளது.

| Parameter | Type   | Required | விளக்கம்                                              |
| --------- | ------ | -------- | ------------------------------------------------------- |
| `scope`   | string | இல்லை   | என்ன summarize செய்வது: `session` (default), `topic`  |

### `simulate_tool_call`

Tool execute செய்யாமல் policy engine இன் முடிவை preview செய்ய ஒரு tool call simulate செய்யவும். Hook evaluation result (ALLOW, BLOCK, அல்லது REDACT) மற்றும் evaluate செய்யப்பட்ட rules return செய்கிறது.

| Parameter   | Type   | Required | விளக்கம்                                           |
| ----------- | ------ | -------- | ---------------------------------------------------- |
| `tool_name` | string | ஆம்      | Simulate செய்ய tool                                |
| `args`      | object | இல்லை   | Simulation இல் சேர்க்க arguments                  |

::: tip ஒரு tool call allowed ஆகுமா என்று execute செய்வதற்கு முன்பு சரிபார்க்க `simulate_tool_call` பயன்படுத்தவும். இது side effects இல்லாமல் policy நடத்தையை புரிந்துகொள்ள பயனுள்ளது. :::

## பயன்பாட்டு வழிகள்

### Background Task Delegation

Agent தற்போதைய conversation block செய்யாமல் ஒரு long-running task கையாள ஒரு background session spawn செய்யலாம்:

```
User: "Research competitor pricing and put together a summary"
Agent: [calls sessions_spawn with the task]
Agent: "I've started a background session to research that. I'll have results shortly."
```

### Cross-Session Communication

Sessions ஒன்றிலிருந்து மற்றொன்றுக்கு data அனுப்பலாம், ஒரு session data produce செய்து மற்றொன்று consume செய்யும் workflows enable செய்கிறது:

```
Background session completes research → sessions_send to parent → parent notifies user
```

### Cross-Channel Messaging

`message` tool agent ஐ எந்த connected channel இலும் proactively reach out செய்ய அனுமதிக்கிறது:

```
Agent detects an urgent event → message({ channel: "telegram", recipient: "owner", text: "Alert: ..." })
```

## பாதுகாப்பு

- அனைத்து session operations உம் taint-gated: உங்கள் taint நிலைக்கு மேல் sessions ஐ பார்க்கவோ, படிக்கவோ, அல்லது அனுப்பவோ முடியாது
- `sessions_send` write-down prevention enforce செய்கிறது: data குறைந்த classification க்கு flow ஆக முடியாது
- Spawned sessions independent taint tracking உடன் `PUBLIC` taint இல் தொடங்குகின்றன
- `message` tool delivery க்கு முன்பு `PRE_OUTPUT` policy hooks மூலம் செல்கிறது
- Session IDs runtime context இலிருந்து inject ஆகின்றன, LLM arguments இலிருந்தல்ல -- agent மற்றொரு session ஐ impersonate செய்ய முடியாது

::: warning SECURITY Write-down prevention அனைத்து cross-session communication இலும் enforce ஆகிறது. `CONFIDENTIAL` இல் tainted ஒரு session ஒரு `PUBLIC` session அல்லது channel க்கு data அனுப்ப முடியாது. இது policy layer மூலம் enforce ஆகும் ஒரு hard boundary. :::
