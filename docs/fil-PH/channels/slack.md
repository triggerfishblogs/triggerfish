# Slack

Ikonekta ang iyong Triggerfish agent sa Slack para makapag-participate ang iyong
agent sa workspace conversations. Gumagamit ang adapter ng
[Bolt](https://slack.dev/bolt-js/) framework na may Socket Mode, ibig sabihin
walang public URL o webhook endpoint na kailangan.

## Default Classification

Naka-default ang Slack sa `PUBLIC` classification. Nire-reflect nito ang
katotohanan na ang mga Slack workspaces ay madalas may external guests, Slack
Connect users, at shared channels. Pwede mo itong itaas sa `INTERNAL` o mas
mataas kung strictly internal ang iyong workspace.

## Setup

### Step 1: Gumawa ng Slack App

1. Pumunta sa [api.slack.com/apps](https://api.slack.com/apps)
2. I-click ang **Create New App**
3. Piliin ang **From scratch**
4. Pangalanan ang iyong app (hal., "Triggerfish") at piliin ang iyong workspace
5. I-click ang **Create App**

### Step 2: I-configure ang Bot Token Scopes

Mag-navigate sa **OAuth & Permissions** sa sidebar at idagdag ang sumusunod na
**Bot Token Scopes**:

| Scope              | Layunin                                 |
| ------------------ | --------------------------------------- |
| `chat:write`       | Magpadala ng messages                   |
| `channels:history` | Magbasa ng messages sa public channels  |
| `groups:history`   | Magbasa ng messages sa private channels |
| `im:history`       | Magbasa ng direct messages              |
| `mpim:history`     | Magbasa ng group direct messages        |
| `channels:read`    | Mag-list ng public channels             |
| `groups:read`      | Mag-list ng private channels            |
| `im:read`          | Mag-list ng direct message conversations |
| `users:read`       | Mag-look up ng user information         |

### Step 3: I-enable ang Socket Mode

1. Mag-navigate sa **Socket Mode** sa sidebar
2. I-toggle ang **Enable Socket Mode** sa on
3. Magpo-prompt na gumawa ng **App-Level Token** -- pangalanan ito (hal.,
   "triggerfish-socket") at idagdag ang `connections:write` scope
4. Kopyahin ang na-generate na **App Token** (nagsisimula sa `xapp-`)

### Step 4: I-enable ang Events

1. Mag-navigate sa **Event Subscriptions** sa sidebar
2. I-toggle ang **Enable Events** sa on
3. Sa ilalim ng **Subscribe to bot events**, idagdag ang:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Step 5: Kunin ang Iyong Credentials

Kailangan mo ng tatlong values:

- **Bot Token** -- Pumunta sa **OAuth & Permissions**, i-click ang **Install to
  Workspace**, saka kopyahin ang **Bot User OAuth Token** (nagsisimula sa `xoxb-`)
- **App Token** -- Ang token na ginawa mo sa Step 3 (nagsisimula sa `xapp-`)
- **Signing Secret** -- Pumunta sa **Basic Information**, mag-scroll sa **App
  Credentials**, at kopyahin ang **Signing Secret**

### Step 6: Kunin ang Iyong Slack User ID

Para i-configure ang owner identity:

1. Buksan ang Slack
2. I-click ang iyong profile picture sa upper-right
3. I-click ang **Profile**
4. I-click ang three dots menu at piliin ang **Copy member ID**

### Step 7: I-configure ang Triggerfish

Idagdag ang Slack channel sa iyong `triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret na naka-store sa OS keychain
    ownerId: "U01234ABC"
```

Ang mga secrets (bot token, app token, signing secret) ay ini-enter habang
gumagamit ng `triggerfish config add-channel slack` at sino-store sa OS keychain.

| Option           | Type   | Required     | Description                                      |
| ---------------- | ------ | ------------ | ------------------------------------------------ |
| `ownerId`        | string | Recommended  | Ang iyong Slack member ID para sa owner verification |
| `classification` | string | Hindi        | Classification level (default: `PUBLIC`)         |

::: warning I-store ang mga Secrets nang Ligtas Huwag kailanman mag-commit ng
tokens o secrets sa source control. Gamitin ang environment variables o iyong OS
keychain. Tingnan ang [Secrets Management](/security/secrets) para sa mga
detalye. :::

### Step 8: I-invite ang Bot

Bago makabasa o makapagpadala ng messages ang bot sa isang channel, kailangan mo
muna itong i-invite:

1. Buksan ang Slack channel kung saan mo gustong i-lagay ang bot
2. Mag-type ng `/invite @Triggerfish` (o kung ano man ang pangalan ng iyong app)

Pwede ring tumanggap ang bot ng direct messages nang hindi ito ina-invite sa
isang channel.

### Step 9: I-start ang Triggerfish

```bash
triggerfish stop && triggerfish start
```

Magpadala ng message sa channel kung saan present ang bot, o mag-DM dito nang
direkta, para kumpirmahin ang connection.

## Owner Identity

Gumagamit ang Triggerfish ng Slack OAuth flow para sa owner verification. Kapag
dumating ang message, kinukumpara ng adapter ang Slack user ID ng sender laban
sa na-configure na `ownerId`:

- **Match** -- Owner command
- **Walang match** -- External input na may `PUBLIC` taint

### Workspace Membership

Para sa recipient classification, dine-determine ng Slack workspace membership
kung ang isang user ay `INTERNAL` o `EXTERNAL`:

- Regular workspace members ay `INTERNAL`
- Slack Connect external users ay `EXTERNAL`
- Guest users ay `EXTERNAL`

## Message Limits

Sumusuporta ang Slack ng messages hanggang 40,000 characters. Ang mga messages
na lumampas dito ay tina-truncate. Para sa karamihan ng agent responses, hindi
nare-reach ang limit na ito.

## Typing Indicators

Nagpapadala ang Triggerfish ng typing indicators sa Slack kapag nagpo-process ng
request ang agent. Hindi ipinapakita ng Slack ang incoming typing events sa mga
bots, kaya send-only ito.

## Group Chat

Pwedeng mag-participate ang bot sa group channels. I-configure ang group
behavior sa iyong `triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Behavior         | Description                                     |
| ---------------- | ----------------------------------------------- |
| `mentioned-only` | Tumugon lang kapag @mentioned ang bot           |
| `always`         | Tumugon sa lahat ng messages sa channel          |

## Pagpapalit ng Classification

```yaml
channels:
  slack:
    classification: INTERNAL
```

Mga valid na levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
