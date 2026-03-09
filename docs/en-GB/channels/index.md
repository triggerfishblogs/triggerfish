# Multi-Channel Overview

Triggerfish connects to your existing messaging platforms. You talk to your
agent wherever you already communicate -- terminal, Telegram, Slack, Discord,
WhatsApp, a web widget, or email. Every channel has its own classification level, owner identity checks, and
policy enforcement.

## How Channels Work

Every channel adapter implements the same interface: `connect`, `disconnect`,
`send`, `onMessage`, and `status`. The **channel router** sits above all
adapters and handles message dispatch, classification checks, and retry logic.

<img src="/diagrams/channel-router.svg" alt="Channel router: all channel adapters flow through a central classification gate to the Gateway Server" style="max-width: 100%;" />

When a message arrives on any channel, the router:

1. Identifies the sender (owner or external) using **code-level identity
   checks** -- not LLM interpretation
2. Tags the message with the channel's classification level
3. Forwards it to the policy engine for enforcement
4. Routes the agent's response back through the same channel

## Channel Classification

Each channel has a default classification level that determines what data can
flow through it. The policy engine enforces the **no write-down rule**: data at
a given classification level can never flow to a channel with a lower
classification.

| Channel                                  | Default Classification | Owner Detection                     |
| ---------------------------------------- | :--------------------: | ----------------------------------- |
| [CLI](/en-GB/channels/cli)               |       `INTERNAL`       | Always owner (terminal user)        |
| [Telegram](/en-GB/channels/telegram)     |       `INTERNAL`       | Telegram user ID match              |
| [Signal](/en-GB/channels/signal)         |        `PUBLIC`        | Never owner (adapter IS your phone) |
| [Slack](/en-GB/channels/slack)           |        `PUBLIC`        | Slack user ID via OAuth             |
| [Discord](/en-GB/channels/discord)       |        `PUBLIC`        | Discord user ID match               |
| [WhatsApp](/en-GB/channels/whatsapp)     |        `PUBLIC`        | Phone number match                  |
| [WebChat](/en-GB/channels/webchat)       |        `PUBLIC`        | Never owner (visitors)              |
| [Email](/en-GB/channels/email)           |     `CONFIDENTIAL`     | Email address match                 |

::: tip Fully Configurable All classifications are configurable in your
`triggerfish.yaml`. You can set any channel to any classification level based on
your security requirements.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Effective Classification

The effective classification for any message is the **minimum** of the channel
classification and the recipient classification:

| Channel Level | Recipient Level | Effective Level |
| ------------- | --------------- | --------------- |
| INTERNAL      | INTERNAL        | INTERNAL        |
| INTERNAL      | EXTERNAL        | PUBLIC          |
| CONFIDENTIAL  | INTERNAL        | INTERNAL        |
| CONFIDENTIAL  | EXTERNAL        | PUBLIC          |

This means that even if a channel is classified as `CONFIDENTIAL`, messages to
external recipients on that channel are treated as `PUBLIC`.

## Channel States

Channels move through defined states:

- **UNTRUSTED** -- New or unknown channels start here. No data flows in or out.
  The channel is completely isolated until you classify it.
- **CLASSIFIED** -- The channel has a classification level assigned and is
  active. Messages flow according to policy rules.
- **BLOCKED** -- The channel has been explicitly disabled. No messages are
  processed.

::: warning UNTRUSTED Channels An `UNTRUSTED` channel cannot receive any data
from the agent and cannot send data into the agent's context. This is a hard
security boundary, not a suggestion. :::

## Channel Router

The channel router manages all registered adapters and provides:

- **Adapter registration** -- Register and unregister channel adapters by
  channel ID
- **Message dispatch** -- Route outbound messages to the correct adapter
- **Retry with exponential backoff** -- Failed sends are retried up to 3 times
  with increasing delays (1s, 2s, 4s)
- **Bulk operations** -- `connectAll()` and `disconnectAll()` for lifecycle
  management

```yaml
# Router retry behaviour is configurable
router:
  maxRetries: 3
  baseDelay: 1000 # milliseconds
```

## Ripple: Typing and Presence

Triggerfish relays typing indicators and presence state across channels that
support them. This is called **Ripple**.

| Channel  | Typing Indicators | Read Receipts |
| -------- | :---------------: | :-----------: |
| Telegram | Send and receive  |      Yes      |
| Signal   | Send and receive  |      --       |
| Slack    |     Send only     |      --       |
| Discord  |     Send only     |      --       |
| WhatsApp | Send and receive  |      Yes      |
| WebChat  | Send and receive  |      Yes      |

Agent presence states: `idle`, `online`, `away`, `busy`, `processing`,
`speaking`, `error`.

## Message Chunking

Platforms have message length limits. Triggerfish automatically chunks long
responses to fit within each platform's constraints, splitting on newlines or
spaces for readability:

| Channel  | Max Message Length |
| -------- | :----------------: |
| Telegram |  4,096 characters  |
| Signal   |  4,000 characters  |
| Discord  |  2,000 characters  |
| Slack    | 40,000 characters  |
| WhatsApp |  4,096 characters  |
| WebChat  |     Unlimited      |

## Next Steps

Set up the channels you use:

- [CLI](/en-GB/channels/cli) -- Always available, no setup needed
- [Telegram](/en-GB/channels/telegram) -- Create a bot via @BotFather
- [Signal](/en-GB/channels/signal) -- Link via signal-cli daemon
- [Slack](/en-GB/channels/slack) -- Create a Slack app with Socket Mode
- [Discord](/en-GB/channels/discord) -- Create a Discord bot application
- [WhatsApp](/en-GB/channels/whatsapp) -- Connect via WhatsApp Business Cloud API
- [WebChat](/en-GB/channels/webchat) -- Embed a chat widget on your site
- [Email](/en-GB/channels/email) -- Connect via IMAP and SMTP relay
