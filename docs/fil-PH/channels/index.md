# Multi-Channel Overview

Kinokonekta ng Triggerfish ang iyong existing messaging platforms. Makaka-usap ka
sa iyong agent kung saan ka na nagko-communicate -- terminal, Telegram, Slack,
Discord, WhatsApp, web widget, o email. Bawat channel ay may sariling
classification level, owner identity checks, at policy enforcement.

## Paano Gumagana ang Channels

Bawat channel adapter ay nag-iimplement ng parehong interface: `connect`,
`disconnect`, `send`, `onMessage`, at `status`. Ang **channel router** ay nasa
ibabaw ng lahat ng adapters at humahawak ng message dispatch, classification
checks, at retry logic.

<img src="/diagrams/channel-router.svg" alt="Channel router: lahat ng channel adapters ay dumadaan sa isang central classification gate papunta sa Gateway Server" style="max-width: 100%;" />

Kapag may dumating na message sa kahit anong channel, ang router ay:

1. Kini-kilala ang sender (owner o external) gamit ang **code-level identity
   checks** -- hindi LLM interpretation
2. Tina-tag ang message ng classification level ng channel
3. Ipina-forward ito sa policy engine para sa enforcement
4. Niru-route ang response ng agent pabalik sa parehong channel

## Channel Classification

Bawat channel ay may default classification level na nagde-determine kung anong
data ang pwedeng dumaan dito. Ine-enforce ng policy engine ang **no write-down
rule**: ang data sa isang classification level ay hindi pwedeng dumaan sa channel
na may mas mababang classification.

| Channel                                  | Default Classification | Owner Detection                           |
| ---------------------------------------- | :--------------------: | ----------------------------------------- |
| [CLI](/fil-PH/channels/cli)              |       `INTERNAL`       | Palaging owner (terminal user)            |
| [Telegram](/fil-PH/channels/telegram)    |       `INTERNAL`       | Telegram user ID match                    |
| [Signal](/fil-PH/channels/signal)        |        `PUBLIC`        | Hindi kailanman owner (adapter ANG phone mo) |
| [Slack](/fil-PH/channels/slack)          |        `PUBLIC`        | Slack user ID via OAuth                   |
| [Discord](/fil-PH/channels/discord)      |        `PUBLIC`        | Discord user ID match                     |
| [WhatsApp](/fil-PH/channels/whatsapp)    |        `PUBLIC`        | Phone number match                        |
| [WebChat](/fil-PH/channels/webchat)      |        `PUBLIC`        | Hindi kailanman owner (mga bisita)        |
| [Email](/fil-PH/channels/email)          |     `CONFIDENTIAL`     | Email address match                       |

::: tip Fully Configurable Lahat ng classifications ay configurable sa iyong
`triggerfish.yaml`. Pwede mong i-set ang kahit anong channel sa kahit anong
classification level base sa iyong security requirements.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Effective Classification

Ang effective classification para sa kahit anong message ay ang **minimum** ng
channel classification at ng recipient classification:

| Channel Level | Recipient Level | Effective Level |
| ------------- | --------------- | --------------- |
| INTERNAL      | INTERNAL        | INTERNAL        |
| INTERNAL      | EXTERNAL        | PUBLIC          |
| CONFIDENTIAL  | INTERNAL        | INTERNAL        |
| CONFIDENTIAL  | EXTERNAL        | PUBLIC          |

Ibig sabihin, kahit na classified ang isang channel bilang `CONFIDENTIAL`, ang
mga messages sa external recipients sa channel na iyon ay treated pa rin bilang
`PUBLIC`.

## Channel States

Ang mga channels ay dumadaan sa defined states:

- **UNTRUSTED** -- Dito nagsisimula ang mga bago o unknown channels. Walang data
  na dumadaan papasok o palabas. Totally isolated ang channel hanggang hindi mo
  ito cina-classify.
- **CLASSIFIED** -- May assigned na classification level na ang channel at
  active na. Dumadaan ang mga messages ayon sa policy rules.
- **BLOCKED** -- Explicitly na-disable ang channel. Walang messages na
  pino-process.

::: warning UNTRUSTED Channels Ang isang `UNTRUSTED` channel ay hindi pwedeng
tumanggap ng kahit anong data mula sa agent at hindi rin pwedeng magpadala ng
data sa context ng agent. Ito ay isang hard security boundary, hindi suggestion.
:::

## Channel Router

Ang channel router ang nagma-manage ng lahat ng registered adapters at
nagbibigay ng:

- **Adapter registration** -- Pag-register at pag-unregister ng channel adapters
  gamit ang channel ID
- **Message dispatch** -- Pag-route ng outbound messages sa tamang adapter
- **Retry na may exponential backoff** -- Ang failed sends ay nire-retry nang
  hanggang 3 beses na may tumataas na delays (1s, 2s, 4s)
- **Bulk operations** -- `connectAll()` at `disconnectAll()` para sa lifecycle
  management

```yaml
# Router retry behavior ay configurable
router:
  maxRetries: 3
  baseDelay: 1000 # milliseconds
```

## Ripple: Typing at Presence

Nire-relay ng Triggerfish ang typing indicators at presence state sa mga
channels na sumusuporta nito. Tinatawag itong **Ripple**.

| Channel  | Typing Indicators   | Read Receipts |
| -------- | :-----------------: | :-----------: |
| Telegram | Send at receive     |      Oo       |
| Signal   | Send at receive     |      --       |
| Slack    |     Send lang       |      --       |
| Discord  |     Send lang       |      --       |
| WhatsApp | Send at receive     |      Oo       |
| WebChat  | Send at receive     |      Oo       |

Agent presence states: `idle`, `online`, `away`, `busy`, `processing`,
`speaking`, `error`.

## Message Chunking

Ang mga platforms ay may message length limits. Automatic na chinu-chunk ng
Triggerfish ang mga mahabang responses para magkasya sa constraints ng bawat
platform, ini-split sa newlines o spaces para sa readability:

| Channel  | Max Message Length |
| -------- | :----------------: |
| Telegram |  4,096 characters  |
| Signal   |  4,000 characters  |
| Discord  |  2,000 characters  |
| Slack    | 40,000 characters  |
| WhatsApp |  4,096 characters  |
| WebChat  |     Unlimited      |

## Susunod na mga Hakbang

I-set up ang mga channels na ginagamit mo:

- [CLI](/fil-PH/channels/cli) -- Palaging available, walang setup na kailangan
- [Telegram](/fil-PH/channels/telegram) -- Gumawa ng bot via @BotFather
- [Signal](/fil-PH/channels/signal) -- I-link via signal-cli daemon
- [Slack](/fil-PH/channels/slack) -- Gumawa ng Slack app na may Socket Mode
- [Discord](/fil-PH/channels/discord) -- Gumawa ng Discord bot application
- [WhatsApp](/fil-PH/channels/whatsapp) -- Kumonekta via WhatsApp Business Cloud API
- [WebChat](/fil-PH/channels/webchat) -- Mag-embed ng chat widget sa iyong site
- [Email](/fil-PH/channels/email) -- Kumonekta via IMAP at SMTP relay
