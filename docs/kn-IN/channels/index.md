# Multi-Channel ಅವಲೋಕನ

Triggerfish ನಿಮ್ಮ ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ messaging platforms ಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ. ನೀವು ಈಗಾಗಲೇ
ಎಲ್ಲಿ ಸಂವಾದಿಸುತ್ತೀರೋ ಅಲ್ಲೇ ನಿಮ್ಮ agent ನೊಂದಿಗೆ ಮಾತನಾಡಿ -- terminal, Telegram, Slack,
Discord, WhatsApp, web widget, ಅಥವಾ email. ಪ್ರತಿ channel ತನ್ನದೇ classification level,
owner identity checks, ಮತ್ತು policy enforcement ಹೊಂದಿದೆ.

## Channels ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತವೆ

ಪ್ರತಿ channel adapter ಒಂದೇ interface implement ಮಾಡುತ್ತದೆ: `connect`, `disconnect`, `send`,
`onMessage`, ಮತ್ತು `status`. **Channel router** ಎಲ್ಲ adapters ಮೇಲೆ ನಿಂತಿದೆ ಮತ್ತು message
dispatch, classification checks, ಮತ್ತು retry logic ನಿರ್ವಹಿಸುತ್ತದೆ.

<img src="/diagrams/channel-router.svg" alt="Channel router: all channel adapters flow through a central classification gate to the Gateway Server" style="max-width: 100%;" />

ಯಾವ channel ನಲ್ಲಾದರೂ message ಬಂದಾಗ, router:

1. **ಕೋಡ್-ಮಟ್ಟದ identity checks** ಬಳಸಿ ಕಳುಹಿಸುವವರನ್ನು ಗುರುತಿಸುತ್ತದೆ (owner ಅಥವಾ external) --
   LLM ವ್ಯಾಖ್ಯಾನ ಅಲ್ಲ
2. Channel ನ classification level ನೊಂದಿಗೆ message tag ಮಾಡುತ್ತದೆ
3. Enforcement ಗಾಗಿ policy engine ಗೆ forward ಮಾಡುತ್ತದೆ
4. Agent ನ response ಅದೇ channel ಮೂಲಕ ಹಿಂತಿರುಗಿಸುತ್ತದೆ

## Channel Classification

ಪ್ರತಿ channel ನ default classification level ಅದರ ಮೂಲಕ ಯಾವ ಡೇಟಾ ಹರಿಯಬಹುದು ಎಂದು ನಿರ್ಧರಿಸುತ್ತದೆ.
Policy engine **no write-down ನಿಯಮ** ಜಾರಿಗೊಳಿಸುತ್ತದೆ: ನಿರ್ದಿಷ್ಟ classification level ನ ಡೇಟಾ
ಕಡಿಮೆ classification ಹೊಂದಿರುವ channel ಗೆ ಎಂದಿಗೂ ಹರಿಯಲಾಗದು.

| Channel                              | Default Classification | Owner Detection                       |
| ------------------------------------ | :--------------------: | ------------------------------------- |
| [CLI](/kn-IN/channels/cli)           |       `INTERNAL`       | ಯಾವಾಗಲೂ owner (terminal user)         |
| [Telegram](/kn-IN/channels/telegram) |       `INTERNAL`       | Telegram user ID ಹೊಂದಾಣಿಕೆ            |
| [Signal](/kn-IN/channels/signal)     |        `PUBLIC`        | ಎಂದಿಗೂ owner ಅಲ್ಲ (adapter ನಿಮ್ಮ phone) |
| [Slack](/kn-IN/channels/slack)       |        `PUBLIC`        | OAuth ಮೂಲಕ Slack user ID              |
| [Discord](/kn-IN/channels/discord)   |        `PUBLIC`        | Discord user ID ಹೊಂದಾಣಿಕೆ             |
| [WhatsApp](/kn-IN/channels/whatsapp) |        `PUBLIC`        | Phone number ಹೊಂದಾಣಿಕೆ                |
| [WebChat](/kn-IN/channels/webchat)   |        `PUBLIC`        | ಎಂದಿಗೂ owner ಅಲ್ಲ (visitors)          |
| [Email](/kn-IN/channels/email)       |     `CONFIDENTIAL`     | Email address ಹೊಂದಾಣಿಕೆ              |

::: tip ಸಂಪೂರ್ಣ Configurable ಎಲ್ಲ classifications ನಿಮ್ಮ `triggerfish.yaml` ನಲ್ಲಿ configurable.
ನಿಮ್ಮ ಭದ್ರತಾ requirements ಆಧಾರದ ಮೇಲೆ ಯಾವ channel ಅನ್ನಾದರೂ ಯಾವ classification level ಗೆ
ಹೊಂದಿಸಬಹುದು.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Effective Classification

ಯಾವ message ಗಾಗಿ effective classification channel classification ಮತ್ತು recipient
classification ನ **minimum**:

| Channel Level | Recipient Level | Effective Level |
| ------------- | --------------- | --------------- |
| INTERNAL      | INTERNAL        | INTERNAL        |
| INTERNAL      | EXTERNAL        | PUBLIC          |
| CONFIDENTIAL  | INTERNAL        | INTERNAL        |
| CONFIDENTIAL  | EXTERNAL        | PUBLIC          |

ಇದರರ್ಥ channel `CONFIDENTIAL` ಎಂದು classified ಆಗಿದ್ದರೂ, ಆ channel ನ external recipients
ಗೆ messages `PUBLIC` ಎಂದು ಪರಿಗಣಿಸಲ್ಪಡುತ್ತವೆ.

## Channel States

Channels ನಿರ್ಧರಿಸಿದ states ಮೂಲಕ ಚಲಿಸುತ್ತವೆ:

- **UNTRUSTED** -- ಹೊಸ ಅಥವಾ ಅಪರಿಚಿತ channels ಇಲ್ಲಿ ಪ್ರಾರಂಭವಾಗುತ್ತವೆ. ಡೇಟಾ ಒಳಗೆ ಅಥವಾ ಹೊರಗೆ
  ಹರಿಯುವುದಿಲ್ಲ. ನೀವು classify ಮಾಡುವ ತನಕ channel ಸಂಪೂರ್ಣ isolated.
- **CLASSIFIED** -- Channel ಗೆ classification level ನಿಯೋಜಿಸಲ್ಪಟ್ಟಿದೆ ಮತ್ತು active. Messages
  policy rules ಅನುಸಾರ ಹರಿಯುತ್ತವೆ.
- **BLOCKED** -- Channel ಸ್ಪಷ್ಟವಾಗಿ disabled. ಯಾವ messages ಸಂಸ್ಕರಿಸಲ್ಪಡುವುದಿಲ್ಲ.

::: warning UNTRUSTED Channels `UNTRUSTED` channel agent ನಿಂದ ಯಾವ ಡೇಟಾ ಸ್ವೀಕರಿಸಲಾಗದು
ಮತ್ತು agent ನ context ಗೆ ಡೇಟಾ ಕಳುಹಿಸಲಾಗದು. ಇದು ಕಠಿಣ ಭದ್ರತಾ ಮಿತಿ, ಸಲಹೆ ಅಲ್ಲ. :::

## Channel Router

Channel router ನೋಂದಾಯಿಸಲ್ಪಟ್ಟ ಎಲ್ಲ adapters ನಿರ್ವಹಿಸುತ್ತದೆ ಮತ್ತು ಒದಗಿಸುತ್ತದೆ:

- **Adapter registration** -- Channel ID ಮೂಲಕ channel adapters register ಮತ್ತು unregister
- **Message dispatch** -- Outbound messages ಸರಿಯಾದ adapter ಗೆ route ಮಾಡಿ
- **Exponential backoff ನೊಂದಿಗೆ Retry** -- ವಿಫಲ sends ಹೆಚ್ಚುತ್ತಿರುವ delays ನೊಂದಿಗೆ 3 ಬಾರಿ
  ತನಕ retry ಮಾಡಲ್ಪಡುತ್ತವೆ (1s, 2s, 4s)
- **Bulk operations** -- Lifecycle management ಗಾಗಿ `connectAll()` ಮತ್ತು `disconnectAll()`

```yaml
# Router retry behavior configurable
router:
  maxRetries: 3
  baseDelay: 1000 # milliseconds
```

## Ripple: Typing ಮತ್ತು Presence

Triggerfish ಅವುಗಳನ್ನು ಬೆಂಬಲಿಸುವ channels ಅಡ್ಡಲಾಗಿ typing indicators ಮತ್ತು presence state
relay ಮಾಡುತ್ತದೆ. ಇದನ್ನು **Ripple** ಎಂದು ಕರೆಯಲಾಗುತ್ತದೆ.

| Channel  | Typing Indicators   | Read Receipts |
| -------- | :-----------------: | :-----------: |
| Telegram | ಕಳುಹಿಸಿ ಮತ್ತು ಸ್ವೀಕರಿಸಿ |      ಹೌದು     |
| Signal   | ಕಳುಹಿಸಿ ಮತ್ತು ಸ್ವೀಕರಿಸಿ |      --       |
| Slack    |     ಕೇವಲ ಕಳುಹಿಸಿ    |      --       |
| Discord  |     ಕೇವಲ ಕಳುಹಿಸಿ    |      --       |
| WhatsApp | ಕಳುಹಿಸಿ ಮತ್ತು ಸ್ವೀಕರಿಸಿ |      ಹೌದು     |
| WebChat  | ಕಳುಹಿಸಿ ಮತ್ತು ಸ್ವೀಕರಿಸಿ |      ಹೌದು     |

Agent presence states: `idle`, `online`, `away`, `busy`, `processing`, `speaking`, `error`.

## Message Chunking

Platforms ಗೆ message length limits ಇವೆ. Triggerfish ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಉದ್ದವಾದ responses ಅನ್ನು
ಪ್ರತಿ platform ನ constraints ಗೆ ಹೊಂದುವಂತೆ chunk ಮಾಡುತ್ತದೆ, ಓದಲು newlines ಅಥವಾ spaces
ನಲ್ಲಿ split ಮಾಡುತ್ತದೆ:

| Channel  | ಗರಿಷ್ಠ Message ಉದ್ದ |
| -------- | :-------------------: |
| Telegram |   4,096 characters    |
| Signal   |   4,000 characters    |
| Discord  |   2,000 characters    |
| Slack    |  40,000 characters    |
| WhatsApp |   4,096 characters    |
| WebChat  |      ಅಪರಿಮಿತ          |

## ಮುಂದಿನ ಹೆಜ್ಜೆಗಳು

ನೀವು ಬಳಸುವ channels ಹೊಂದಿಸಿ:

- [CLI](/kn-IN/channels/cli) -- ಯಾವಾಗಲೂ ಲಭ್ಯ, setup ಅಗತ್ಯವಿಲ್ಲ
- [Telegram](/kn-IN/channels/telegram) -- @BotFather ಮೂಲಕ bot ರಚಿಸಿ
- [Signal](/kn-IN/channels/signal) -- signal-cli daemon ಮೂಲಕ link ಮಾಡಿ
- [Slack](/kn-IN/channels/slack) -- Socket Mode ನೊಂದಿಗೆ Slack app ರಚಿಸಿ
- [Discord](/kn-IN/channels/discord) -- Discord bot application ರಚಿಸಿ
- [WhatsApp](/kn-IN/channels/whatsapp) -- WhatsApp Business Cloud API ಮೂಲಕ ಸಂಪರ್ಕಿಸಿ
- [WebChat](/kn-IN/channels/webchat) -- ನಿಮ್ಮ site ನಲ್ಲಿ chat widget embed ಮಾಡಿ
- [Email](/kn-IN/channels/email) -- IMAP ಮತ್ತು SMTP relay ಮೂಲಕ ಸಂಪರ್ಕಿಸಿ
