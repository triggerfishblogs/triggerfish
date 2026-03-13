# Telegram

ನಿಮ್ಮ Triggerfish agent ಅನ್ನು Telegram ಗೆ ಸಂಪರ್ಕಿಸಿ ನೀವು Telegram ಬಳಸುವ ಯಾವ device
ನಿಂದಲಾದರೂ ಅದರೊಂದಿಗೆ ಸಂವಾದಿಸಿ. Adapter Telegram Bot API ನೊಂದಿಗೆ ಸಂವಾದಿಸಲು
[grammY](https://grammy.dev/) framework ಬಳಸುತ್ತದೆ.

## Setup

### Step 1: Bot ರಚಿಸಿ

1. Telegram ತೆರೆದು [@BotFather](https://t.me/BotFather) ಹುಡುಕಿ
2. `/newbot` ಕಳುಹಿಸಿ
3. ನಿಮ್ಮ bot ಗೆ display name ಆಯ್ಕೆ ಮಾಡಿ (ಉದಾ., "My Triggerfish")
4. ನಿಮ್ಮ bot ಗೆ username ಆಯ್ಕೆ ಮಾಡಿ (`bot` ನಲ್ಲಿ ಮುಗಿಯಬೇಕು, ಉದಾ., `my_triggerfish_bot`)
5. BotFather ನಿಮ್ಮ **bot token** ಉತ್ತರಿಸುತ್ತದೆ -- ಅದನ್ನು copy ಮಾಡಿ

::: warning ನಿಮ್ಮ Token ರಹಸ್ಯವಾಗಿ ಇಡಿ ನಿಮ್ಮ bot token ನಿಮ್ಮ bot ನ ಸಂಪೂರ್ಣ control ನೀಡುತ್ತದೆ.
ಇದನ್ನು source control ಗೆ commit ಮಾಡಬೇಡಿ ಅಥವಾ publicly ಹಂಚಿಕೊಳ್ಳಬೇಡಿ. Triggerfish ಇದನ್ನು
ನಿಮ್ಮ OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸುತ್ತದೆ. :::

### Step 2: ನಿಮ್ಮ Telegram User ID ಪಡೆಯಿರಿ

Messages ನಿಮ್ಮಿಂದ ಎಂದು ಪರಿಶೀಲಿಸಲು Triggerfish ನಿಮ್ಮ numeric user ID ಅಗತ್ಯ. Telegram
usernames ಬದಲಾಯಿಸಬಹುದು ಮತ್ತು identity ಗಾಗಿ ವಿಶ್ವಾಸಾರ್ಹ ಅಲ್ಲ -- numeric ID ಶಾಶ್ವತ ಮತ್ತು
Telegram ನ servers ನಿಂದ ನಿಯೋಜಿಸಲ್ಪಡುತ್ತದೆ, ಆದ್ದರಿಂದ ಇದನ್ನು spoof ಮಾಡಲಾಗದು.

1. Telegram ನಲ್ಲಿ [@getmyid_bot](https://t.me/getmyid_bot) ಹುಡುಕಿ
2. ಯಾವ message ಕಳುಹಿಸಿ
3. ಇದು ನಿಮ್ಮ user ID ಉತ್ತರಿಸುತ್ತದೆ (`8019881968` ತರಹದ number)

### Step 3: Channel ಸೇರಿಸಿ

Interactive setup ಚಲಿಸಿ:

```bash
triggerfish config add-channel telegram
```

ಇದು ನಿಮ್ಮ bot token, user ID, ಮತ್ತು classification level ಕೇಳುತ್ತದೆ, ನಂತರ `triggerfish.yaml`
ಗೆ config ಬರೆಯುತ್ತದೆ ಮತ್ತು daemon restart ಮಾಡಲು offer ಮಾಡುತ್ತದೆ.

ನೀವು manually ಕೂಡ ಸೇರಿಸಬಹುದು:

```yaml
channels:
  telegram:
    # botToken OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟಿದೆ
    ownerId: 8019881968
    classification: INTERNAL
```

| Option           | Type   | Required | ವಿವರಣೆ                                     |
| ---------------- | ------ | -------- | ------------------------------------------- |
| `botToken`       | string | ಹೌದು      | @BotFather ನಿಂದ Bot API token               |
| `ownerId`        | number | ಹೌದು      | ನಿಮ್ಮ numeric Telegram user ID               |
| `classification` | string | ಇಲ್ಲ      | Classification ceiling (default: `INTERNAL`) |

### Step 4: Chat ಪ್ರಾರಂಭಿಸಿ

Daemon restart ನಂತರ, Telegram ನಲ್ಲಿ ನಿಮ್ಮ bot ತೆರೆದು `/start` ಕಳುಹಿಸಿ. Connection live
ಎಂದು confirm ಮಾಡಲು bot ನಿಮ್ಮನ್ನು ಸ್ವಾಗತಿಸುತ್ತದೆ. ನೀವು ನಂತರ ನೇರವಾಗಿ ನಿಮ್ಮ agent ನೊಂದಿಗೆ
chat ಮಾಡಬಹುದು.

## Classification ನಡವಳಿಕೆ

`classification` setting **ceiling** -- ಇದು **owner** conversations ಗಾಗಿ ಈ channel ಮೂಲಕ
ಹರಿಯಬಹುದಾದ ಡೇಟಾದ ಗರಿಷ್ಠ sensitivity ನಿಯಂತ್ರಿಸುತ್ತದೆ. ಇದು ಎಲ್ಲ users ಗೆ ಸಮಾನವಾಗಿ
ಅನ್ವಯಿಸುವುದಿಲ್ಲ.

**ಪ್ರತಿ message ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ:**

- **ನೀವು bot message ಮಾಡುತ್ತೀರಿ** (ನಿಮ್ಮ user ID `ownerId` ಗೆ ಹೊಂದಾಣಿಕೆ): Session channel
  ceiling ಬಳಸುತ್ತದೆ. Default `INTERNAL` ನೊಂದಿಗೆ, ನಿಮ್ಮ agent ನಿಮ್ಮೊಂದಿಗೆ internal-level
  ಡೇಟಾ ಹಂಚಿಕೊಳ್ಳಬಹುದು.
- **ಬೇರೆ ಯಾರಾದರೂ bot message ಮಾಡುತ್ತಾರೆ**: Channel classification ಏನಾದರೂ ಸರಿ ಅವರ session
  ಸ್ವಯಂಚಾಲಿತವಾಗಿ `PUBLIC` tainted. No-write-down ನಿಯಮ ಯಾವ internal ಡೇಟಾ ಅವರ session
  ತಲುಪುವುದನ್ನು ತಡೆಯುತ್ತದೆ.

ಇದರರ್ಥ ಒಂದೇ Telegram bot owner ಮತ್ತು non-owner conversations ಎರಡನ್ನೂ ಸುರಕ್ಷಿತವಾಗಿ
ನಿರ್ವಹಿಸುತ್ತದೆ. Identity check LLM message ನೋಡುವ ಮೊದಲು ಕೋಡ್‌ನಲ್ಲಿ ಆಗುತ್ತದೆ.

| Channel Classification | Owner Messages       | Non-Owner Messages |
| ---------------------- | :------------------: | :----------------: |
| `PUBLIC`               | PUBLIC               | PUBLIC             |
| `INTERNAL` (default)   | INTERNAL ತನಕ         | PUBLIC             |
| `CONFIDENTIAL`         | CONFIDENTIAL ತನಕ     | PUBLIC             |
| `RESTRICTED`           | RESTRICTED ತನಕ       | PUBLIC             |

## Owner Identity

Triggerfish ಕಳುಹಿಸುವವರ numeric Telegram user ID ಅನ್ನು configured `ownerId` ವಿರುದ್ಧ
ಹೋಲಿಸುವ ಮೂಲಕ owner status ನಿರ್ಧರಿಸುತ್ತದೆ. ಈ check LLM message ನೋಡುವ **ಮೊದಲು** ಕೋಡ್‌ನಲ್ಲಿ
ಆಗುತ್ತದೆ:

- **ಹೊಂದಾಣಿಕೆ** -- Message owner ಎಂದು tagged ಮತ್ತು channel ನ classification ceiling ತನಕ
  ಡೇಟಾ ಪ್ರವೇಶಿಸಬಹುದು
- **ಹೊಂದಾಣಿಕೆ ಇಲ್ಲ** -- Message `PUBLIC` taint ನೊಂದಿಗೆ tagged, ಮತ್ತು no-write-down
  ನಿಯಮ ಯಾವ classified ಡೇಟಾ ಆ session ಗೆ ಹರಿಯುವುದನ್ನು ತಡೆಯುತ್ತದೆ

::: danger ಯಾವಾಗಲೂ ನಿಮ್ಮ Owner ID ಹೊಂದಿಸಿ `ownerId` ಇಲ್ಲದೆ, Triggerfish **ಎಲ್ಲ** ಕಳುಹಿಸುವವರನ್ನು
owner ಎಂದು ಪರಿಗಣಿಸುತ್ತದೆ. ನಿಮ್ಮ bot ಕಂಡ ಯಾರಾದರೂ channel ನ classification level ತನಕ
ನಿಮ್ಮ ಡೇಟಾ ಪ್ರವೇಶಿಸಬಹುದು. ಈ ಕಾರಣಕ್ಕೆ setup ಸಮಯದಲ್ಲಿ ಈ field required. :::

## Message Chunking

Telegram ಗೆ 4,096-character message limit ಇದೆ. ನಿಮ್ಮ agent ಇದಕ್ಕಿಂತ ಉದ್ದ response
generate ಮಾಡಿದಾಗ, Triggerfish ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಅದನ್ನು ಅನೇಕ messages ಗೆ split ಮಾಡುತ್ತದೆ.
Chunker ಓದಲು newlines ಅಥವಾ spaces ನಲ್ಲಿ split ಮಾಡುತ್ತದೆ -- ಪದಗಳು ಅಥವಾ ವಾಕ್ಯಗಳನ್ನು
ಮಧ್ಯದಲ್ಲಿ ಕತ್ತರಿಸುವುದನ್ನು ತಪ್ಪಿಸುತ್ತದೆ.

## ಬೆಂಬಲಿತ Message Types

Telegram adapter ಪ್ರಸ್ತುತ ನಿರ್ವಹಿಸುತ್ತದೆ:

- **Text messages** -- ಸಂಪೂರ್ಣ send ಮತ್ತು receive ಬೆಂಬಲ
- **Long responses** -- Telegram ನ limits ಗೆ ಹೊಂದುವಂತೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ chunked

## Typing Indicators

ನಿಮ್ಮ agent request ಸಂಸ್ಕರಿಸುತ್ತಿರುವಾಗ, bot Telegram chat ನಲ್ಲಿ "typing..." ತೋರಿಸುತ್ತದೆ.
LLM response generate ಮಾಡುತ್ತಿರುವಾಗ indicator ಚಲಿಸುತ್ತದೆ ಮತ್ತು reply ಕಳುಹಿಸಿದಾಗ
clear ಆಗುತ್ತದೆ.

## Classification ಬದಲಾಯಿಸಿ

Classification ceiling ಹೆಚ್ಚಿಸಲು ಅಥವಾ ಕಡಿಮೆ ಮಾಡಲು:

```bash
triggerfish config add-channel telegram
# Prompt ನಲ್ಲಿ ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ config overwrite ಮಾಡಲು ಆಯ್ಕೆ ಮಾಡಿ
```

ಅಥವಾ `triggerfish.yaml` ನೇರವಾಗಿ edit ಮಾಡಿ:

```yaml
channels:
  telegram:
    # botToken OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟಿದೆ
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

ಬದಲಾಯಿಸಿದ ನಂತರ daemon restart ಮಾಡಿ: `triggerfish stop && triggerfish start`
