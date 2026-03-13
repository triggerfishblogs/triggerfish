# Discord

ನಿಮ್ಮ Triggerfish agent ಅನ್ನು Discord ಗೆ ಸಂಪರ್ಕಿಸಿ server channels ಮತ್ತು direct messages
ನಲ್ಲಿ respond ಮಾಡಲು. Adapter Discord Gateway ಗೆ ಸಂಪರ್ಕಿಸಲು [discord.js](https://discord.js.org/)
ಬಳಸುತ್ತದೆ.

## Default Classification

Discord `PUBLIC` classification ಗೆ default ಆಗುತ್ತದೆ. Discord servers ಸಾಮಾನ್ಯವಾಗಿ trusted
members ಮತ್ತು public visitors ಮಿಶ್ರಣ ಒಳಗೊಳ್ಳುತ್ತವೆ, ಆದ್ದರಿಂದ `PUBLIC` ಸುರಕ್ಷಿತ default.
ನಿಮ್ಮ server private ಮತ್ತು trusted ಆಗಿದ್ದರೆ ಇದನ್ನು raise ಮಾಡಬಹುದು.

## Setup

### Step 1: Discord Application ರಚಿಸಿ

1. [Discord Developer Portal](https://discord.com/developers/applications) ಗೆ ಹೋಗಿ
2. **New Application** ಕ್ಲಿಕ್ ಮಾಡಿ
3. ನಿಮ್ಮ application ಹೆಸರಿಸಿ (ಉದಾ., "Triggerfish")
4. **Create** ಕ್ಲಿಕ್ ಮಾಡಿ

### Step 2: Bot User ರಚಿಸಿ

1. ನಿಮ್ಮ application ನಲ್ಲಿ sidebar ನ **Bot** ಗೆ navigate ಮಾಡಿ
2. **Add Bot** ಕ್ಲಿಕ್ ಮಾಡಿ (ಈಗಾಗಲೇ ರಚಿಸಿಲ್ಲದಿದ್ದರೆ)
3. Bot ನ username ಅಡಿ, ಹೊಸ token generate ಮಾಡಲು **Reset Token** ಕ್ಲಿಕ್ ಮಾಡಿ
4. **bot token** copy ಮಾಡಿ

::: warning ನಿಮ್ಮ Token ರಹಸ್ಯವಾಗಿ ಇಡಿ ನಿಮ್ಮ bot token ನಿಮ್ಮ bot ನ ಸಂಪೂರ್ಣ control ನೀಡುತ್ತದೆ.
ಇದನ್ನು source control ಗೆ commit ಮಾಡಬೇಡಿ ಅಥವಾ publicly ಹಂಚಿಕೊಳ್ಳಬೇಡಿ. :::

### Step 3: Privileged Intents Configure ಮಾಡಿ

**Bot** page ನಲ್ಲಿ, ಈ privileged gateway intents enable ಮಾಡಿ:

- **Message Content Intent** -- Message content ಓದಲು required
- **Server Members Intent** -- ಐಚ್ಛಿಕ, member lookup ಗಾಗಿ

### Step 4: ನಿಮ್ಮ Discord User ID ಪಡೆಯಿರಿ

1. Discord ತೆರೆಯಿರಿ
2. **Settings** > **Advanced** ಗೆ ಹೋಗಿ ಮತ್ತು **Developer Mode** enable ಮಾಡಿ
3. Discord ನ ಎಲ್ಲೆಡೆ ನಿಮ್ಮ username ಕ್ಲಿಕ್ ಮಾಡಿ
4. **Copy User ID** ಕ್ಲಿಕ್ ಮಾಡಿ

ಇದು Triggerfish owner identity verify ಮಾಡಲು ಬಳಸುವ snowflake ID.

### Step 5: Invite Link Generate ಮಾಡಿ

1. Developer Portal ನಲ್ಲಿ **OAuth2** > **URL Generator** ಗೆ navigate ಮಾಡಿ
2. **Scopes** ಅಡಿ `bot` ಆಯ್ಕೆ ಮಾಡಿ
3. **Bot Permissions** ಅಡಿ ಆಯ್ಕೆ ಮಾಡಿ:
   - Send Messages
   - Read Message History
   - View Channels
4. Generate ಆದ URL copy ಮಾಡಿ ಮತ್ತು ನಿಮ್ಮ browser ನಲ್ಲಿ ತೆರೆಯಿರಿ
5. ನೀವು bot ಸೇರಿಸಲು ಬಯಸುವ server ಆಯ್ಕೆ ಮಾಡಿ ಮತ್ತು **Authorize** ಕ್ಲಿಕ್ ಮಾಡಿ

### Step 6: Triggerfish Configure ಮಾಡಿ

ನಿಮ್ಮ `triggerfish.yaml` ಗೆ Discord channel ಸೇರಿಸಿ:

```yaml
channels:
  discord:
    # botToken OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟಿದೆ
    ownerId: "123456789012345678"
```

| Option           | Type   | Required      | ವಿವರಣೆ                                                         |
| ---------------- | ------ | ------------- | --------------------------------------------------------------- |
| `botToken`       | string | ಹೌದು           | Discord bot token                                               |
| `ownerId`        | string | ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ | Owner verification ಗಾಗಿ ನಿಮ್ಮ Discord user ID (snowflake)       |
| `classification` | string | ಇಲ್ಲ           | Classification level (default: `PUBLIC`)                        |

### Step 7: Triggerfish ಪ್ರಾರಂಭಿಸಿ

```bash
triggerfish stop && triggerfish start
```

Connection confirm ಮಾಡಲು bot ಇರುವ channel ನಲ್ಲಿ message ಕಳುಹಿಸಿ, ಅಥವಾ ನೇರವಾಗಿ DM ಮಾಡಿ.

## Owner Identity

Triggerfish ಕಳುಹಿಸುವವರ Discord user ID ಅನ್ನು configured `ownerId` ವಿರುದ್ಧ ಹೋಲಿಸಿ owner
status ನಿರ್ಧರಿಸುತ್ತದೆ. ಈ check LLM message ನೋಡುವ ಮೊದಲು ಕೋಡ್‌ನಲ್ಲಿ ಆಗುತ್ತದೆ:

- **ಹೊಂದಾಣಿಕೆ** -- Message owner command
- **ಹೊಂದಾಣಿಕೆ ಇಲ್ಲ** -- Message `PUBLIC` taint ನೊಂದಿಗೆ external input

`ownerId` configure ಮಾಡಿಲ್ಲದಿದ್ದರೆ, ಎಲ್ಲ messages owner ನಿಂದ ಎಂದು ಪರಿಗಣಿಸಲ್ಪಡುತ್ತವೆ.

::: danger ಯಾವಾಗಲೂ Owner ID ಹೊಂದಿಸಿ ನಿಮ್ಮ bot ಇತರ members ಇರುವ server ನಲ್ಲಿ ಇದ್ದರೆ,
ಯಾವಾಗಲೂ `ownerId` configure ಮಾಡಿ. ಇದಿಲ್ಲದೆ, ಯಾವ server member ನಿಮ್ಮ agent ಗೆ commands
ಕಳುಹಿಸಬಹುದು. :::

## Message Chunking

Discord ಗೆ 2,000-character message limit ಇದೆ. Agent ಇದಕ್ಕಿಂತ ಉದ್ದ response generate
ಮಾಡಿದಾಗ, Triggerfish ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಅದನ್ನು ಅನೇಕ messages ಗೆ split ಮಾಡುತ್ತದೆ.
Chunker ಓದಲು newlines ಅಥವಾ spaces ನಲ್ಲಿ split ಮಾಡುತ್ತದೆ.

## Bot ನಡವಳಿಕೆ

Discord adapter:

- **ತನ್ನ ಸ್ವಂತ messages ignore ಮಾಡುತ್ತದೆ** -- Bot ತಾನು ಕಳುಹಿಸಿದ messages ಗೆ respond
  ಮಾಡುವುದಿಲ್ಲ
- **ಎಲ್ಲ accessible channels ನಲ್ಲಿ ಕೇಳುತ್ತದೆ** -- Guild channels, group DMs, ಮತ್ತು
  direct messages
- **Message Content Intent ಅಗತ್ಯ** -- ಇದಿಲ್ಲದೆ, bot ಖಾಲಿ message events ಸ್ವೀಕರಿಸುತ್ತದೆ

## Typing Indicators

Agent request ಸಂಸ್ಕರಿಸುತ್ತಿರುವಾಗ Triggerfish Discord ಗೆ typing indicators ಕಳುಹಿಸುತ್ತದೆ.
Discord bots ಗೆ users ನ typing events ವಿಶ್ವಾಸಾರ್ಹ ರೀತಿಯಲ್ಲಿ expose ಮಾಡುವುದಿಲ್ಲ, ಆದ್ದರಿಂದ
ಇದು send-only.

## Group Chat

Bot server channels ನಲ್ಲಿ participate ಮಾಡಬಹುದು. Group behavior configure ಮಾಡಿ:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Behavior         | ವಿವರಣೆ                                      |
| ---------------- | --------------------------------------------- |
| `mentioned-only` | Bot @mentioned ಆದಾಗ ಮಾತ್ರ respond ಮಾಡಿ       |
| `always`         | Channel ನ ಎಲ್ಲ messages ಗೆ respond ಮಾಡಿ       |

## Classification ಬದಲಾಯಿಸಿ

```yaml
channels:
  discord:
    # botToken OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟಿದೆ
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
