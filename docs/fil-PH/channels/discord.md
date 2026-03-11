# Discord

Ikonekta ang iyong Triggerfish agent sa Discord para makatugon ito sa server
channels at direct messages. Gumagamit ang adapter ng
[discord.js](https://discord.js.org/) para kumonekta sa Discord Gateway.

## Default Classification

Naka-default ang Discord sa `PUBLIC` classification. Ang mga Discord servers ay
madalas may halo ng trusted members at public visitors, kaya `PUBLIC` ang ligtas
na default. Pwede mo itong itaas kung private at trusted ang iyong server.

## Setup

### Step 1: Gumawa ng Discord Application

1. Pumunta sa
   [Discord Developer Portal](https://discord.com/developers/applications)
2. I-click ang **New Application**
3. Pangalanan ang iyong application (hal., "Triggerfish")
4. I-click ang **Create**

### Step 2: Gumawa ng Bot User

1. Sa iyong application, mag-navigate sa **Bot** sa sidebar
2. I-click ang **Add Bot** (kung hindi pa nagagawa)
3. Sa ilalim ng username ng bot, i-click ang **Reset Token** para mag-generate
   ng bagong token
4. Kopyahin ang **bot token**

::: warning Panatilihing Lihim ang Iyong Token Ang iyong bot token ay
nagbibigay ng full control sa iyong bot. Huwag itong i-commit sa source control
o i-share nang publiko. :::

### Step 3: I-configure ang Privileged Intents

Sa **Bot** page pa rin, i-enable ang mga privileged gateway intents na ito:

- **Message Content Intent** -- Kailangan para mabasa ang message content
- **Server Members Intent** -- Optional, para sa member lookup

### Step 4: Kunin ang Iyong Discord User ID

1. Buksan ang Discord
2. Pumunta sa **Settings** > **Advanced** at i-enable ang **Developer Mode**
3. I-click ang iyong username kahit saan sa Discord
4. I-click ang **Copy User ID**

Ito ang snowflake ID na ginagamit ng Triggerfish para ma-verify ang owner
identity.

### Step 5: Mag-generate ng Invite Link

1. Sa Developer Portal, mag-navigate sa **OAuth2** > **URL Generator**
2. Sa ilalim ng **Scopes**, piliin ang `bot`
3. Sa ilalim ng **Bot Permissions**, piliin ang:
   - Send Messages
   - Read Message History
   - View Channels
4. Kopyahin ang na-generate na URL at buksan ito sa iyong browser
5. Piliin ang server kung saan mo gustong idagdag ang bot at i-click ang
   **Authorize**

### Step 6: I-configure ang Triggerfish

Idagdag ang Discord channel sa iyong `triggerfish.yaml`:

```yaml
channels:
  discord:
    # botToken na naka-store sa OS keychain
    ownerId: "123456789012345678"
```

| Option           | Type   | Required    | Description                                                      |
| ---------------- | ------ | ----------- | ---------------------------------------------------------------- |
| `botToken`       | string | Oo          | Discord bot token                                                |
| `ownerId`        | string | Recommended | Ang iyong Discord user ID (snowflake) para sa owner verification |
| `classification` | string | Hindi       | Classification level (default: `PUBLIC`)                         |

### Step 7: I-start ang Triggerfish

```bash
triggerfish stop && triggerfish start
```

Magpadala ng message sa channel kung saan present ang bot, o mag-DM dito nang
direkta, para kumpirmahin ang connection.

## Owner Identity

Dine-determine ng Triggerfish ang owner status sa pamamagitan ng pagkukumpara ng
Discord user ID ng sender laban sa na-configure na `ownerId`. Ang check na ito
ay nangyayari sa code bago makita ng LLM ang message:

- **Match** -- Ang message ay isang owner command
- **Walang match** -- Ang message ay external input na may `PUBLIC` taint

Kung walang na-configure na `ownerId`, lahat ng messages ay tina-treat bilang
galing sa owner.

::: danger Palaging I-set ang Owner ID Kung ang iyong bot ay nasa server na may
ibang members, palaging i-configure ang `ownerId`. Kung wala ito, kahit sinong
server member ay pwedeng mag-issue ng commands sa iyong agent. :::

## Message Chunking

Ang Discord ay may 2,000-character message limit. Kapag ang agent ay
nag-generate ng response na mas mahaba dito, automatic itong hina-hatiin ng
Triggerfish sa maraming messages. Ang chunker ay nag-split sa newlines o spaces
para mapanatili ang readability.

## Bot Behavior

Ang Discord adapter ay:

- **Nag-iignore ng sariling messages** -- Hindi tutugon ang bot sa mga messages
  na siya mismo ang nagpadala
- **Nakikinig sa lahat ng accessible channels** -- Guild channels, group DMs, at
  direct messages
- **Nangangailangan ng Message Content Intent** -- Kung wala ito, tumatanggap
  ang bot ng empty message events

## Typing Indicators

Nagpapadala ang Triggerfish ng typing indicators sa Discord kapag nagpo-process
ng request ang agent. Hindi reliable na ipinapakita ng Discord ang typing events
mula sa users sa mga bots, kaya send-only ito.

## Group Chat

Pwedeng mag-participate ang bot sa server channels. I-configure ang group
behavior:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Behavior         | Description                                     |
| ---------------- | ----------------------------------------------- |
| `mentioned-only` | Tumugon lang kapag @mentioned ang bot           |
| `always`         | Tumugon sa lahat ng messages sa channel          |

## Pagpapalit ng Classification

```yaml
channels:
  discord:
    # botToken na naka-store sa OS keychain
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Mga valid na levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
