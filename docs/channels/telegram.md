# Telegram

Connect your Triggerfish agent to Telegram so you can interact with it from any device where you use Telegram. The adapter uses the [grammY](https://grammy.dev/) framework to communicate with the Telegram Bot API.

## Setup

### Step 1: Create a Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Choose a display name for your bot (e.g., "My Triggerfish")
4. Choose a username for your bot (must end in `bot`, e.g., `my_triggerfish_bot`)
5. BotFather will reply with your **bot token** -- copy it

::: warning Keep Your Token Secret
Your bot token grants full control of your bot. Never commit it to source control or share it publicly. Triggerfish stores it in your `triggerfish.yaml` config file.
:::

### Step 2: Get Your Telegram User ID

Triggerfish needs your numeric user ID to verify that messages are from you. Telegram usernames can be changed and are not reliable for identity -- the numeric ID is permanent and assigned by Telegram's servers, so it cannot be spoofed.

1. Search for [@getmyid_bot](https://t.me/getmyid_bot) on Telegram
2. Send it any message
3. It replies with your user ID (a number like `8019881968`)

### Step 3: Add the Channel

Run the interactive setup:

```bash
triggerfish config add-channel telegram
```

This prompts for your bot token, user ID, and classification level, then writes the config to `triggerfish.yaml` and offers to restart the daemon.

You can also add it manually:

```yaml
channels:
  telegram:
    botToken: "your-bot-token-from-botfather"
    ownerId: 8019881968
    classification: INTERNAL
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `botToken` | string | Yes | Bot API token from @BotFather |
| `ownerId` | number | Yes | Your numeric Telegram user ID |
| `classification` | string | No | Classification ceiling (default: `INTERNAL`) |

### Step 4: Start Chatting

After the daemon restarts, open your bot in Telegram and send `/start`. The bot will greet you to confirm the connection is live. You can then chat with your agent directly.

## Classification Behavior

The `classification` setting is a **ceiling** -- it controls the maximum sensitivity of data that can flow through this channel for **owner** conversations. It does not apply uniformly to all users.

**How it works per message:**

- **You message the bot** (your user ID matches `ownerId`): The session uses the channel ceiling. With the default `INTERNAL`, your agent can share internal-level data with you.
- **Someone else messages the bot**: Their session is automatically tainted `PUBLIC` regardless of the channel classification. The no-write-down rule prevents any internal data from reaching their session.

This means a single Telegram bot safely handles both owner and non-owner conversations. The identity check happens in code before the LLM sees the message -- the LLM cannot influence it.

| Channel Classification | Owner Messages | Non-Owner Messages |
|------------------------|:--------------:|:------------------:|
| `PUBLIC` | PUBLIC | PUBLIC |
| `INTERNAL` (default) | Up to INTERNAL | PUBLIC |
| `CONFIDENTIAL` | Up to CONFIDENTIAL | PUBLIC |
| `RESTRICTED` | Up to RESTRICTED | PUBLIC |

See [Classification System](/architecture/classification) for the full model and [Sessions & Taint](/architecture/taint-and-sessions) for how taint escalation works.

## Owner Identity

Triggerfish determines owner status by comparing the sender's numeric Telegram user ID against the configured `ownerId`. This check happens in code **before** the LLM sees the message:

- **Match** -- The message is tagged as owner and can access data up to the channel's classification ceiling
- **No match** -- The message is tagged with `PUBLIC` taint, and the no-write-down rule prevents any classified data from flowing to that session

::: danger Always Set Your Owner ID
Without `ownerId`, Triggerfish treats **all** senders as the owner. Anyone who finds your bot can access your data up to the channel's classification level. This field is required during setup for this reason.
:::

## Message Chunking

Telegram has a 4,096-character message limit. When your agent generates a response longer than this, Triggerfish automatically splits it into multiple messages. The chunker splits on newlines or spaces for readability -- it avoids cutting words or sentences in half.

## Supported Message Types

The Telegram adapter currently handles:

- **Text messages** -- Full send and receive support
- **Long responses** -- Automatically chunked to fit Telegram's limits

## Typing Indicators

When your agent is processing a request, the bot shows "typing..." in the Telegram chat. The indicator runs while the LLM is generating a response and clears when the reply is sent.

## Changing Classification

To raise or lower the classification ceiling:

```bash
triggerfish config add-channel telegram
# Select to overwrite existing config when prompted
```

Or edit `triggerfish.yaml` directly:

```yaml
channels:
  telegram:
    botToken: "your-bot-token"
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Restart the daemon after changing: `triggerfish stop && triggerfish start`
