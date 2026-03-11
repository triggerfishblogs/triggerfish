# Telegram

Ikonekta ang iyong Triggerfish agent sa Telegram para maka-interact ka dito mula
sa kahit anong device kung saan mo ginagamit ang Telegram. Gumagamit ang adapter
ng [grammY](https://grammy.dev/) framework para makipag-communicate sa Telegram
Bot API.

## Setup

### Step 1: Gumawa ng Bot

1. Buksan ang Telegram at hanapin ang [@BotFather](https://t.me/BotFather)
2. Magpadala ng `/newbot`
3. Pumili ng display name para sa iyong bot (hal., "My Triggerfish")
4. Pumili ng username para sa iyong bot (dapat nagtatapos sa `bot`, hal.,
   `my_triggerfish_bot`)
5. Mag-rereply ang BotFather ng iyong **bot token** -- kopyahin ito

::: warning Panatilihing Lihim ang Iyong Token Ang iyong bot token ay
nagbibigay ng full control sa iyong bot. Huwag itong i-commit sa source control
o i-share nang publiko. Sino-store ito ng Triggerfish sa iyong OS keychain. :::

### Step 2: Kunin ang Iyong Telegram User ID

Kailangan ng Triggerfish ang iyong numeric user ID para ma-verify na galing sa
iyo ang mga messages. Pwedeng baguhin ang Telegram usernames at hindi reliable
para sa identity -- ang numeric ID ay permanent at itinalaga ng Telegram
servers, kaya hindi ito pwedeng ma-spoof.

1. Hanapin ang [@getmyid_bot](https://t.me/getmyid_bot) sa Telegram
2. Magpadala ng kahit anong message
3. Mag-rereply ito ng iyong user ID (isang number tulad ng `8019881968`)

### Step 3: I-add ang Channel

I-run ang interactive setup:

```bash
triggerfish config add-channel telegram
```

Mag-prompt ito para sa iyong bot token, user ID, at classification level, saka
isusulat ang config sa `triggerfish.yaml` at mag-ooffer na i-restart ang daemon.

Pwede mo rin itong i-add nang manual:

```yaml
channels:
  telegram:
    # botToken na naka-store sa OS keychain
    ownerId: 8019881968
    classification: INTERNAL
```

| Option           | Type   | Required | Description                                  |
| ---------------- | ------ | -------- | -------------------------------------------- |
| `botToken`       | string | Oo       | Bot API token mula sa @BotFather             |
| `ownerId`        | number | Oo       | Ang iyong numeric Telegram user ID           |
| `classification` | string | Hindi    | Classification ceiling (default: `INTERNAL`) |

### Step 4: Magsimulang Mag-chat

Pagkatapos mag-restart ng daemon, buksan ang iyong bot sa Telegram at magpadala
ng `/start`. Babatiin ka ng bot para kumpirmahin na live ang connection. Pwede
ka nang mag-chat sa iyong agent nang direkta.

## Classification Behavior

Ang `classification` setting ay isang **ceiling** -- kino-control nito ang
maximum sensitivity ng data na pwedeng dumaan sa channel na ito para sa **owner**
conversations. Hindi ito uniformly na-aapply sa lahat ng users.

**Paano ito gumagana per message:**

- **Ikaw ang nagme-message sa bot** (tugma ang iyong user ID sa `ownerId`): Ang
  session ay gumagamit ng channel ceiling. Sa default na `INTERNAL`, pwedeng
  i-share ng iyong agent ang internal-level data sa iyo.
- **Iba ang nagme-message sa bot**: Ang kanilang session ay automatic na
  nata-taint ng `PUBLIC` anuman ang channel classification. Pinipigilan ng
  no-write-down rule na makarating ang kahit anong internal data sa kanilang
  session.

Ibig sabihin, ang isang Telegram bot ay ligtas na nagha-handle ng parehong
owner at non-owner conversations. Nangyayari ang identity check sa code bago
makita ng LLM ang message -- hindi ma-influence ng LLM ito.

| Channel Classification |   Owner Messages   | Non-Owner Messages |
| ---------------------- | :----------------: | :----------------: |
| `PUBLIC`               |       PUBLIC       |       PUBLIC       |
| `INTERNAL` (default)   |  Hanggang INTERNAL |       PUBLIC       |
| `CONFIDENTIAL`         | Hanggang CONFIDENTIAL |    PUBLIC       |
| `RESTRICTED`           | Hanggang RESTRICTED |      PUBLIC       |

Tingnan ang [Classification System](/architecture/classification) para sa
buong model at [Sessions & Taint](/architecture/taint-and-sessions) para sa
kung paano gumagana ang taint escalation.

## Owner Identity

Dine-determine ng Triggerfish ang owner status sa pamamagitan ng pagkukumpara ng
numeric Telegram user ID ng sender laban sa na-configure na `ownerId`. Ang
check na ito ay nangyayari sa code **bago** makita ng LLM ang message:

- **Match** -- Ang message ay nata-tag bilang owner at pwedeng mag-access ng
  data hanggang sa classification ceiling ng channel
- **Walang match** -- Ang message ay nata-tag ng `PUBLIC` taint, at pinipigilan
  ng no-write-down rule na dumaloy ang kahit anong classified data sa session
  na iyon

::: danger Palaging I-set ang Iyong Owner ID Kung walang `ownerId`, lahat ng
senders ay tina-treat ng Triggerfish bilang owner. Kahit sinong makahanap ng
iyong bot ay maka-access ng iyong data hanggang sa classification level ng
channel. Required ang field na ito habang nagse-setup para sa rason na ito. :::

## Message Chunking

Ang Telegram ay may 4,096-character message limit. Kapag ang iyong agent ay
nag-generate ng response na mas mahaba dito, automatic itong hina-hatiin ng
Triggerfish sa maraming messages. Ang chunker ay nag-split sa newlines o spaces
para sa readability -- iniiwasan nitong putulin ang mga salita o pangungusap sa
gitna.

## Mga Suportadong Message Types

Kasalukuyang hina-handle ng Telegram adapter ang:

- **Text messages** -- Full send at receive support
- **Mahabang responses** -- Automatic na chinu-chunk para magkasya sa limits ng
  Telegram

## Typing Indicators

Kapag nagpo-process ng request ang iyong agent, nagpapakita ang bot ng
"typing..." sa Telegram chat. Nare-run ang indicator habang nagge-generate ng
response ang LLM at naci-clear kapag naipadala na ang reply.

## Pagpapalit ng Classification

Para itaas o ibaba ang classification ceiling:

```bash
triggerfish config add-channel telegram
# Piliin ang overwrite existing config kapag na-prompt
```

O direktang i-edit ang `triggerfish.yaml`:

```yaml
channels:
  telegram:
    # botToken na naka-store sa OS keychain
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Mga valid na levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

I-restart ang daemon pagkatapos magbago: `triggerfish stop && triggerfish start`
