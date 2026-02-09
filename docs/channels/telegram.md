# Telegram

Connect your Triggerfish agent to Telegram so you can interact with it from any device where you use Telegram. The adapter uses the [grammY](https://grammy.dev/) framework to communicate with the Telegram Bot API.

## Default Classification

Telegram defaults to `INTERNAL` classification. This means your agent can share internal-level data through Telegram when you are the verified owner.

## Setup

### Step 1: Create a Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Choose a display name for your bot (e.g., "My Triggerfish")
4. Choose a username for your bot (must end in `bot`, e.g., `my_triggerfish_bot`)
5. BotFather will reply with your **bot token** -- copy it

::: warning Keep Your Token Secret
Your bot token grants full control of your bot. Never commit it to source control or share it publicly. Store it as an environment variable or in your OS keychain.
:::

### Step 2: Get Your Telegram User ID

You need your numeric Telegram user ID so Triggerfish can verify that messages from you are owner commands. To find it:

1. Search for [@userinfobot](https://t.me/userinfobot) on Telegram
2. Send it any message
3. It replies with your user ID (a number like `483291057`)

### Step 3: Configure Triggerfish

Add the Telegram channel to your `triggerfish.yaml`:

```yaml
channels:
  telegram:
    botToken: "your-bot-token-from-botfather"
    ownerId: 483291057
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `botToken` | string | Yes | Bot API token from @BotFather |
| `ownerId` | number | Recommended | Your Telegram user ID for owner verification |
| `classification` | string | No | Classification level (default: `INTERNAL`) |

### Step 4: Start Triggerfish

Restart the daemon or run in foreground:

```bash
triggerfish stop && triggerfish start
# or
triggerfish run
```

Your bot is now live. Send it a message on Telegram to confirm the connection.

## Pairing Flow

For additional security, Triggerfish supports a one-time pairing code flow:

1. Open the Triggerfish app or CLI
2. Select "Add Telegram channel"
3. A short code is displayed (e.g., `A7X9`)
4. Send that code to your bot on Telegram
5. The code matches -- your Telegram user ID is linked to your account
6. All future messages from that ID are treated as owner commands

The pairing code expires after 5 minutes and can only be used once.

## Owner Identity

Triggerfish determines owner status by comparing the sender's Telegram user ID against the configured `ownerId`. This check happens in code **before** the LLM sees the message:

- **Match** -- The message is tagged as `source: "owner"` and can be treated as a command
- **No match** -- The message is tagged as `source: "external"` with `PUBLIC` taint, and treated as input only

If no `ownerId` is configured, all messages are treated as coming from the owner. This is convenient for personal use but not recommended if others may message your bot.

::: tip Set Your Owner ID
Always configure `ownerId` if your bot username is discoverable. Without it, anyone who finds your bot can issue commands.
:::

## Message Chunking

Telegram has a 4,096-character message limit. When your agent generates a response longer than this, Triggerfish automatically splits it into multiple messages. The chunker splits on newlines or spaces to preserve readability -- it avoids cutting words or sentences in half.

## Supported Message Types

The Telegram adapter currently handles:

- **Text messages** -- Full send and receive support
- **Long responses** -- Automatically chunked to fit Telegram's limits

## Typing Indicators

Triggerfish sends and receives typing indicators on Telegram. When your agent is processing a request, the bot shows "typing..." in the chat. When you are typing, the agent is aware of it.

## Changing Classification

To change the Telegram channel's classification level:

```yaml
channels:
  telegram:
    botToken: "your-bot-token"
    ownerId: 483291057
    classification: CONFIDENTIAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
