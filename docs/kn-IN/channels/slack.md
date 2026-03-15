# Slack

ನಿಮ್ಮ Triggerfish agent ಅನ್ನು Slack ಗೆ ಸಂಪರ್ಕಿಸಿ workspace conversations ನಲ್ಲಿ participate
ಮಾಡಲು. Adapter Socket Mode ನೊಂದಿಗೆ [Bolt](https://slack.dev/bolt-js/) framework ಬಳಸುತ್ತದೆ,
ಅಂದರೆ public URL ಅಥವಾ webhook endpoint ಅಗತ್ಯವಿಲ್ಲ.

## Default Classification

Slack `PUBLIC` classification ಗೆ default ಆಗುತ್ತದೆ. Slack workspaces ಸಾಮಾನ್ಯವಾಗಿ external
guests, Slack Connect users, ಮತ್ತು shared channels ಒಳಗೊಳ್ಳುತ್ತವೆ ಎಂಬ ವಾಸ್ತವವನ್ನು ಇದು
ಪ್ರತಿಬಿಂಬಿಸುತ್ತದೆ. ನಿಮ್ಮ workspace ಕಟ್ಟುನಿಟ್ಟಾಗಿ internal ಆಗಿದ್ದರೆ ಇದನ್ನು `INTERNAL` ಅಥವಾ
ಹೆಚ್ಚಿಗೆ raise ಮಾಡಬಹುದು.

## Setup

### Step 1: Slack App ರಚಿಸಿ

1. [api.slack.com/apps](https://api.slack.com/apps) ಗೆ ಹೋಗಿ
2. **Create New App** ಕ್ಲಿಕ್ ಮಾಡಿ
3. **From scratch** ಆಯ್ಕೆ ಮಾಡಿ
4. ನಿಮ್ಮ app ಹೆಸರಿಸಿ (ಉದಾ., "Triggerfish") ಮತ್ತು ನಿಮ್ಮ workspace ಆಯ್ಕೆ ಮಾಡಿ
5. **Create App** ಕ್ಲಿಕ್ ಮಾಡಿ

### Step 2: Bot Token Scopes Configure ಮಾಡಿ

Sidebar ನಲ್ಲಿ **OAuth & Permissions** ಗೆ navigate ಮಾಡಿ ಮತ್ತು ಈ **Bot Token Scopes** ಸೇರಿಸಿ:

| Scope              | ಉದ್ದೇಶ                             |
| ------------------ | ----------------------------------- |
| `chat:write`       | Messages ಕಳುಹಿಸಿ                    |
| `channels:history` | Public channels ನಲ್ಲಿ messages ಓದಿ  |
| `groups:history`   | Private channels ನಲ್ಲಿ messages ಓದಿ |
| `im:history`       | Direct messages ಓದಿ                 |
| `mpim:history`     | Group direct messages ಓದಿ           |
| `channels:read`    | Public channels ಪಟ್ಟಿ ಮಾಡಿ          |
| `groups:read`      | Private channels ಪಟ್ಟಿ ಮಾಡಿ         |
| `im:read`          | Direct message conversations ಪಟ್ಟಿ  |
| `users:read`       | User ಮಾಹಿತಿ lookup ಮಾಡಿ            |

### Step 3: Socket Mode Enable ಮಾಡಿ

1. Sidebar ನಲ್ಲಿ **Socket Mode** ಗೆ navigate ಮಾಡಿ
2. **Enable Socket Mode** toggle on ಮಾಡಿ
3. **App-Level Token** ರಚಿಸಲು prompt ಆಗುತ್ತೀರಿ -- ಹೆಸರಿಸಿ (ಉದಾ., "triggerfish-socket")
   ಮತ್ತು `connections:write` scope ಸೇರಿಸಿ
4. Generate ಆದ **App Token** copy ಮಾಡಿ (`xapp-` ನಿಂದ ಪ್ರಾರಂಭ)

### Step 4: Events Enable ಮಾಡಿ

1. Sidebar ನಲ್ಲಿ **Event Subscriptions** ಗೆ navigate ಮಾಡಿ
2. **Enable Events** toggle on ಮಾಡಿ
3. **Subscribe to bot events** ಅಡಿ ಸೇರಿಸಿ:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Step 5: ನಿಮ್ಮ Credentials ಪಡೆಯಿರಿ

ನಿಮಗೆ ಮೂರು values ಅಗತ್ಯ:

- **Bot Token** -- **OAuth & Permissions** ಗೆ ಹೋಗಿ, **Install to Workspace** ಕ್ಲಿಕ್ ಮಾಡಿ,
  ನಂತರ **Bot User OAuth Token** copy ಮಾಡಿ (`xoxb-` ನಿಂದ ಪ್ರಾರಂಭ)
- **App Token** -- Step 3 ನಲ್ಲಿ ರಚಿಸಿದ token (`xapp-` ನಿಂದ ಪ್ರಾರಂಭ)
- **Signing Secret** -- **Basic Information** ಗೆ ಹೋಗಿ, **App Credentials** ಗೆ scroll ಮಾಡಿ,
  ಮತ್ತು **Signing Secret** copy ಮಾಡಿ

### Step 6: ನಿಮ್ಮ Slack User ID ಪಡೆಯಿರಿ

Owner identity configure ಮಾಡಲು:

1. Slack ತೆರೆಯಿರಿ
2. Top-right ನಲ್ಲಿ ನಿಮ್ಮ profile picture ಕ್ಲಿಕ್ ಮಾಡಿ
3. **Profile** ಕ್ಲಿಕ್ ಮಾಡಿ
4. Three dots menu ಕ್ಲಿಕ್ ಮಾಡಿ ಮತ್ತು **Copy member ID** ಆಯ್ಕೆ ಮಾಡಿ

### Step 7: Triggerfish Configure ಮಾಡಿ

ನಿಮ್ಮ `triggerfish.yaml` ಗೆ Slack channel ಸೇರಿಸಿ:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟಿವೆ
    ownerId: "U01234ABC"
```

Secrets (bot token, app token, signing secret) `triggerfish config add-channel slack` ಸಮಯದಲ್ಲಿ
ನಮೂದಿಸಲ್ಪಡುತ್ತವೆ ಮತ್ತು OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಡುತ್ತವೆ.

| Option           | Type   | Required      | ವಿವರಣೆ                                       |
| ---------------- | ------ | ------------- | --------------------------------------------- |
| `ownerId`        | string | ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ | Owner verification ಗಾಗಿ ನಿಮ್ಮ Slack member ID |
| `classification` | string | ಇಲ್ಲ           | Classification level (default: `PUBLIC`)       |

::: warning Secrets ಸುರಕ್ಷಿತವಾಗಿ ಸಂಗ್ರಹಿಸಿ Tokens ಅಥವಾ secrets ಅನ್ನು source control ಗೆ
ಎಂದಿಗೂ commit ಮಾಡಬೇಡಿ. Environment variables ಅಥವಾ OS keychain ಬಳಸಿ. ವಿವರಗಳಿಗಾಗಿ
[Secrets Management](/kn-IN/security/secrets) ನೋಡಿ. :::

### Step 8: Bot Invite ಮಾಡಿ

Bot channel ನಲ್ಲಿ messages ಓದಲು ಅಥವಾ ಕಳುಹಿಸಲು ಮೊದಲು ಅದನ್ನು invite ಮಾಡಬೇಕು:

1. ಬೇಕಾದ Slack channel ತೆರೆಯಿರಿ
2. `/invite @Triggerfish` type ಮಾಡಿ (ಅಥವಾ ನಿಮ್ಮ app ಹೆಸರು)

Bot channel ಗೆ invite ಇಲ್ಲದೆ direct messages ಕೂಡ ಸ್ವೀಕರಿಸಬಹುದು.

### Step 9: Triggerfish ಪ್ರಾರಂಭಿಸಿ

```bash
triggerfish stop && triggerfish start
```

Connection confirm ಮಾಡಲು bot ಇರುವ channel ನಲ್ಲಿ message ಕಳುಹಿಸಿ, ಅಥವಾ ನೇರವಾಗಿ DM ಮಾಡಿ.

## Owner Identity

Triggerfish owner verification ಗಾಗಿ Slack OAuth flow ಬಳಸುತ್ತದೆ. Message ಬಂದಾಗ, adapter
ಕಳುಹಿಸುವವರ Slack user ID ಅನ್ನು configured `ownerId` ವಿರುದ್ಧ ಹೋಲಿಸುತ್ತದೆ:

- **ಹೊಂದಾಣಿಕೆ** -- Owner command
- **ಹೊಂದಾಣಿಕೆ ಇಲ್ಲ** -- `PUBLIC` taint ನೊಂದಿಗೆ External input

### Workspace Membership

Recipient classification ಗಾಗಿ, Slack workspace membership ಬಳಕೆದಾರ `INTERNAL` ಅಥವಾ
`EXTERNAL` ಎಂದು ನಿರ್ಧರಿಸುತ್ತದೆ:

- ನಿಯಮಿತ workspace members `INTERNAL`
- Slack Connect external users `EXTERNAL`
- Guest users `EXTERNAL`

## Message Limits

Slack 40,000 characters ತನಕ messages ಬೆಂಬಲಿಸುತ್ತದೆ. ಈ limit ಮೀರಿದ messages truncate
ಆಗುತ್ತವೆ. ಹೆಚ್ಚಿನ agent responses ಗಾಗಿ ಈ limit ಎಂದಿಗೂ ತಲುಪುವುದಿಲ್ಲ.

## Typing Indicators

Agent request ಸಂಸ್ಕರಿಸುತ್ತಿರುವಾಗ Triggerfish Slack ಗೆ typing indicators ಕಳುಹಿಸುತ್ತದೆ.
Slack bots ಗೆ incoming typing events expose ಮಾಡುವುದಿಲ್ಲ, ಆದ್ದರಿಂದ ಇದು send-only.

## Group Chat

Bot group channels ನಲ್ಲಿ participate ಮಾಡಬಹುದು. ನಿಮ್ಮ `triggerfish.yaml` ನಲ್ಲಿ group
behavior configure ಮಾಡಿ:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Behavior         | ವಿವರಣೆ                                              |
| ---------------- | ----------------------------------------------------- |
| `mentioned-only` | Bot @mentioned ಆದಾಗ ಮಾತ್ರ respond ಮಾಡಿ               |
| `always`         | Channel ನ ಎಲ್ಲ messages ಗೆ respond ಮಾಡಿ               |

## Classification ಬದಲಾಯಿಸಿ

```yaml
channels:
  slack:
    classification: INTERNAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
