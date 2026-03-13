# Slack

உங்கள் agent workspace conversations இல் பங்கேற்க உங்கள் Triggerfish agent ஐ Slack உடன் இணைக்கவும். Adapter Socket Mode உடன் [Bolt](https://slack.dev/bolt-js/) framework பயன்படுத்துகிறது, அதாவது public URL அல்லது webhook endpoint தேவையில்லை.

## Default Classification

Slack `PUBLIC` classification க்கு default ஆகும். இது Slack workspaces பெரும்பாலும் external guests, Slack Connect பயனர்கள், மற்றும் shared channels சேர்க்கிறது என்ற உண்மையை பிரதிபலிக்கிறது. உங்கள் workspace கண்டிப்பாக internal ஆக இருந்தால் இதை `INTERNAL` அல்லது அதிகமாக உயர்த்தலாம்.

## Setup

### படி 1: ஒரு Slack App உருவாக்கவும்

1. [api.slack.com/apps](https://api.slack.com/apps) க்கு செல்லவும்
2. **Create New App** click செய்யவும்
3. **From scratch** தேர்வு செய்யவும்
4. உங்கள் app க்கு பெயரிடுங்கள் (உதா., "Triggerfish") மற்றும் உங்கள் workspace தேர்வு செய்யவும்
5. **Create App** click செய்யவும்

### படி 2: Bot Token Scopes கட்டமைக்கவும்

Sidebar இல் **OAuth & Permissions** க்கு navigate செய்யவும் மற்றும் பின்வரும் **Bot Token Scopes** சேர்க்கவும்:

| Scope              | நோக்கம்                              |
| ------------------ | ------------------------------------- |
| `chat:write`       | செய்திகள் அனுப்பவும்                |
| `channels:history` | Public channels இல் செய்திகள் படிக்கவும் |
| `groups:history`   | Private channels இல் செய்திகள் படிக்கவும் |
| `im:history`       | Direct messages படிக்கவும்           |
| `mpim:history`     | Group direct messages படிக்கவும்     |
| `channels:read`    | Public channels பட்டியலிடவும்       |
| `groups:read`      | Private channels பட்டியலிடவும்      |
| `im:read`          | Direct message conversations பட்டியலிடவும் |
| `users:read`       | பயனர் தகவல்களை தேடவும்             |

### படி 3: Socket Mode Enable செய்யவும்

1. Sidebar இல் **Socket Mode** க்கு navigate செய்யவும்
2. **Enable Socket Mode** ஐ on க்கு toggle செய்யவும்
3. ஒரு **App-Level Token** உருவாக்க prompt செய்யப்படுவீர்கள் -- அதற்கு பெயரிடுங்கள் (உதா., "triggerfish-socket") மற்றும் `connections:write` scope சேர்க்கவும்
4. Generate ஆன **App Token** copy செய்யவும் (`xapp-` இல் தொடங்குகிறது)

### படி 4: Events Enable செய்யவும்

1. Sidebar இல் **Event Subscriptions** க்கு navigate செய்யவும்
2. **Enable Events** ஐ on க்கு toggle செய்யவும்
3. **Subscribe to bot events** இல் சேர்க்கவும்:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### படி 5: உங்கள் Credentials பெறவும்

மூன்று மதிப்புகள் தேவை:

- **Bot Token** -- **OAuth & Permissions** க்கு செல்லவும், **Install to Workspace** click செய்யவும், பின்னர் **Bot User OAuth Token** copy செய்யவும் (`xoxb-` இல் தொடங்குகிறது)
- **App Token** -- படி 3 இல் நீங்கள் உருவாக்கிய token (`xapp-` இல் தொடங்குகிறது)
- **Signing Secret** -- **Basic Information** க்கு செல்லவும், **App Credentials** க்கு scroll செய்யவும், மற்றும் **Signing Secret** copy செய்யவும்

### படி 6: உங்கள் Slack User ID பெறவும்

Owner அடையாளத்தை கட்டமைக்க:

1. Slack திறக்கவும்
2. Top-right இல் உங்கள் profile picture click செய்யவும்
3. **Profile** click செய்யவும்
4. Three dots menu click செய்து **Copy member ID** தேர்வு செய்யவும்

### படி 7: Triggerfish கட்டமைக்கவும்

உங்கள் `triggerfish.yaml` இல் Slack சேனல் சேர்க்கவும்:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret OS keychain இல் சேமிக்கப்பட்டுள்ளது
    ownerId: "U01234ABC"
```

Secrets (bot token, app token, signing secret) `triggerfish config add-channel slack` போது உள்ளிடப்படுகின்றன மற்றும் OS keychain இல் சேமிக்கப்படுகின்றன.

| Option           | Type   | Required         | விளக்கம்                                      |
| ---------------- | ------ | ---------------- | ---------------------------------------------- |
| `ownerId`        | string | பரிந்துரைக்கப்பட்டது | Owner verification க்கான உங்கள் Slack member ID |
| `classification` | string | இல்லை            | Classification நிலை (default: `PUBLIC`)       |

::: warning Secrets பாதுகாப்பாக சேமிக்கவும் Tokens அல்லது secrets ஐ source control க்கு commit செய்யவேண்டாம். Environment variables அல்லது உங்கள் OS keychain பயன்படுத்தவும். விவரங்களுக்கு [Secrets Management](/ta-IN/security/secrets) பாருங்கள். :::

### படி 8: Bot ஐ Invite செய்யவும்

Bot ஒரு channel இல் செய்திகளை படிக்கவோ அனுப்பவோ முன்பு, நீங்கள் அதை invite செய்ய வேண்டும்:

1. Bot நீங்கள் விரும்பும் Slack channel திறக்கவும்
2. `/invite @Triggerfish` தட்டச்சு செய்யவும் (அல்லது நீங்கள் உங்கள் app க்கு என்ன பெயரிட்டீர்களோ அது)

Bot ஒரு channel க்கு invite செய்யப்படாமலே direct messages பெறலாம்.

### படி 9: Triggerfish தொடங்கவும்

```bash
triggerfish stop && triggerfish start
```

Bot present உள்ள ஒரு channel இல் ஒரு செய்தி அனுப்பவும், அல்லது connection ஐ உறுதிப்படுத்த நேரடியாக DM செய்யவும்.

## Owner அடையாளம்

Triggerfish owner verification க்கு Slack OAuth flow பயன்படுத்துகிறது. ஒரு செய்தி வரும்போது, adapter அனுப்புனரின் Slack user ID ஐ கட்டமைக்கப்பட்ட `ownerId` க்கு எதிராக ஒப்பிடுகிறது:

- **பொருந்துகிறது** -- Owner command
- **பொருந்தவில்லை** -- `PUBLIC` taint உடன் External input

### Workspace Membership

பெறுநர் classification க்கு, Slack workspace membership ஒரு பயனர் `INTERNAL` அல்லது `EXTERNAL` என்பதை தீர்மானிக்கிறது:

- Regular workspace members `INTERNAL`
- Slack Connect external பயனர்கள் `EXTERNAL`
- Guest பயனர்கள் `EXTERNAL`

## Message வரம்புகள்

Slack 40,000 characters வரை செய்திகளை support செய்கிறது. இந்த வரம்பை மீறும் செய்திகள் truncate ஆகின்றன. பெரும்பாலான agent responses க்கு, இந்த வரம்பை ஒருபோதும் அடைவதில்லை.

## Typing Indicators

Agent ஒரு request செயலாக்கும்போது Triggerfish Slack க்கு typing indicators அனுப்புகிறது. Slack bots க்கு நம்பகமான வழியில் பயனர்களிடமிருந்து typing events ஐ expose செய்வதில்லை, எனவே இது send-only.

## Group Chat

Bot server channels இல் பங்கேற்கலாம். உங்கள் `triggerfish.yaml` இல் group நடத்தையை கட்டமைக்கவும்:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| நடத்தை           | விளக்கம்                                      |
| ---------------- | ---------------------------------------------- |
| `mentioned-only` | Bot @mentioned ஆகும்போது மட்டும் respond செய்யவும் |
| `always`         | Channel இல் அனைத்து செய்திகளுக்கும் respond செய்யவும் |

## Classification மாற்றுதல்

```yaml
channels:
  slack:
    classification: INTERNAL
```

Valid நிலைகள்: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
