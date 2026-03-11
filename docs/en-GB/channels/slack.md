# Slack

Connect your Triggerfish agent to Slack so your agent can participate in
workspace conversations. The adapter uses the [Bolt](https://slack.dev/bolt-js/)
framework with Socket Mode, which means no public URL or webhook endpoint is
required.

## Default Classification

Slack defaults to `PUBLIC` classification. This reflects the reality that Slack
workspaces often include external guests, Slack Connect users, and shared
channels. You can raise this to `INTERNAL` or higher if your workspace is
strictly internal.

## Setup

### Step 1: Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App**
3. Choose **From scratch**
4. Name your app (e.g., "Triggerfish") and select your workspace
5. Click **Create App**

### Step 2: Configure Bot Token Scopes

Navigate to **OAuth & Permissions** in the sidebar and add the following **Bot
Token Scopes**:

| Scope              | Purpose                           |
| ------------------ | --------------------------------- |
| `chat:write`       | Send messages                     |
| `channels:history` | Read messages in public channels  |
| `groups:history`   | Read messages in private channels |
| `im:history`       | Read direct messages              |
| `mpim:history`     | Read group direct messages        |
| `channels:read`    | List public channels              |
| `groups:read`      | List private channels             |
| `im:read`          | List direct message conversations |
| `users:read`       | Look up user information          |

### Step 3: Enable Socket Mode

1. Navigate to **Socket Mode** in the sidebar
2. Toggle **Enable Socket Mode** to on
3. You will be prompted to create an **App-Level Token** -- name it (e.g.,
   "triggerfish-socket") and add the `connections:write` scope
4. Copy the generated **App Token** (starts with `xapp-`)

### Step 4: Enable Events

1. Navigate to **Event Subscriptions** in the sidebar
2. Toggle **Enable Events** to on
3. Under **Subscribe to bot events**, add:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Step 5: Get Your Credentials

You need three values:

- **Bot Token** -- Go to **OAuth & Permissions**, click **Install to
  Workspace**, then copy the **Bot User OAuth Token** (starts with `xoxb-`)
- **App Token** -- The token you created in Step 3 (starts with `xapp-`)
- **Signing Secret** -- Go to **Basic Information**, scroll to **App
  Credentials**, and copy the **Signing Secret**

### Step 6: Get Your Slack User ID

To configure owner identity:

1. Open Slack
2. Click your profile picture in the top-right
3. Click **Profile**
4. Click the three dots menu and select **Copy member ID**

### Step 7: Configure Triggerfish

Add the Slack channel to your `triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret stored in OS keychain
    ownerId: "U01234ABC"
```

Secrets (bot token, app token, signing secret) are entered during
`triggerfish config add-channel slack` and stored in the OS keychain.

| Option           | Type   | Required    | Description                                 |
| ---------------- | ------ | ----------- | ------------------------------------------- |
| `ownerId`        | string | Recommended | Your Slack member ID for owner verification |
| `classification` | string | No          | Classification level (default: `PUBLIC`)    |

::: warning Store Secrets Securely Never commit tokens or secrets to source
control. Use environment variables or your OS keychain. See
[Secrets Management](/en-GB/security/secrets) for details. :::

### Step 8: Invite the Bot

Before the bot can read or send messages in a channel, you need to invite it:

1. Open the Slack channel you want the bot in
2. Type `/invite @Triggerfish` (or whatever you named your app)

The bot can also receive direct messages without being invited to a channel.

### Step 9: Start Triggerfish

```bash
triggerfish stop && triggerfish start
```

Send a message in a channel where the bot is present, or DM it directly, to
confirm the connection.

## Owner Identity

Triggerfish uses the Slack OAuth flow for owner verification. When a message
arrives, the adapter compares the sender's Slack user ID against the configured
`ownerId`:

- **Match** -- Owner command
- **No match** -- External input with `PUBLIC` taint

### Workspace Membership

For recipient classification, Slack workspace membership determines whether a
user is `INTERNAL` or `EXTERNAL`:

- Regular workspace members are `INTERNAL`
- Slack Connect external users are `EXTERNAL`
- Guest users are `EXTERNAL`

## Message Limits

Slack supports messages up to 40,000 characters. Messages exceeding this limit
are truncated. For most agent responses, this limit is never reached.

## Typing Indicators

Triggerfish sends typing indicators to Slack when the agent is processing a
request. Slack does not expose incoming typing events to bots, so this is
send-only.

## Group Chat

The bot can participate in group channels. Configure group behaviour in your
`triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Behaviour        | Description                             |
| ---------------- | --------------------------------------- |
| `mentioned-only` | Only respond when the bot is @mentioned |
| `always`         | Respond to all messages in the channel  |

## Changing Classification

```yaml
channels:
  slack:
    classification: INTERNAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
