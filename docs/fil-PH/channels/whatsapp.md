# WhatsApp

Ikonekta ang iyong Triggerfish agent sa WhatsApp para maka-interact ka dito mula
sa iyong phone. Gumagamit ang adapter ng **WhatsApp Business Cloud API** (ang
opisyal na Meta-hosted HTTP API), tumatanggap ng messages via webhook at
nagpapadala via REST.

## Default Classification

Naka-default ang WhatsApp sa `PUBLIC` classification. Ang mga WhatsApp contacts
ay pwedeng kahit sino na may iyong phone number, kaya `PUBLIC` ang ligtas na
default.

## Setup

### Step 1: Gumawa ng Meta Business Account

1. Pumunta sa [Meta for Developers](https://developers.facebook.com/) portal
2. Gumawa ng developer account kung wala ka pa
3. Gumawa ng bagong app at piliin ang **Business** bilang app type
4. Sa iyong app dashboard, idagdag ang **WhatsApp** product

### Step 2: Kunin ang Iyong Credentials

Mula sa WhatsApp section ng iyong app dashboard, kolektahin ang mga values na
ito:

- **Access Token** -- Isang permanent access token (o mag-generate ng temporary
  para sa testing)
- **Phone Number ID** -- Ang ID ng phone number na nakaregistro sa WhatsApp
  Business
- **Verify Token** -- Isang string na pipiliin mo, ginagamit para i-verify ang
  webhook registration

### Step 3: I-configure ang Webhooks

1. Sa WhatsApp product settings, mag-navigate sa **Webhooks**
2. I-set ang callback URL sa public address ng iyong server (hal.,
   `https://your-server.com:8443/webhook`)
3. I-set ang **Verify Token** sa parehong value na gagamitin mo sa iyong
   Triggerfish config
4. Mag-subscribe sa `messages` webhook field

::: info Kailangan ng Public URL Ang WhatsApp webhooks ay nangangailangan ng
publicly accessible HTTPS endpoint. Kung lokal mo lang ito nire-run, kailangan
mo ng tunnel service (hal., ngrok, Cloudflare Tunnel) o server na may public
IP. :::

### Step 4: I-configure ang Triggerfish

Idagdag ang WhatsApp channel sa iyong `triggerfish.yaml`:

```yaml
channels:
  whatsapp:
    # accessToken na naka-store sa OS keychain
    phoneNumberId: "your-phone-number-id"
    # verifyToken na naka-store sa OS keychain
    ownerPhone: "15551234567"
```

| Option           | Type   | Required    | Description                                                           |
| ---------------- | ------ | ----------- | --------------------------------------------------------------------- |
| `accessToken`    | string | Oo          | WhatsApp Business API access token                                    |
| `phoneNumberId`  | string | Oo          | Phone Number ID mula sa Meta Business Dashboard                       |
| `verifyToken`    | string | Oo          | Token para sa webhook verification (ikaw ang pipili nito)             |
| `webhookPort`    | number | Hindi       | Port para mag-listen ng webhooks (default: `8443`)                    |
| `ownerPhone`     | string | Recommended | Ang iyong phone number para sa owner verification (hal., `"15551234567"`) |
| `classification` | string | Hindi       | Classification level (default: `PUBLIC`)                              |

::: warning I-store ang mga Secrets nang Ligtas Huwag kailanman mag-commit ng
access tokens sa source control. Gamitin ang environment variables o iyong OS
keychain. :::

### Step 5: I-start ang Triggerfish

```bash
triggerfish stop && triggerfish start
```

Magpadala ng message mula sa iyong phone sa WhatsApp Business number para
kumpirmahin ang connection.

## Owner Identity

Dine-determine ng Triggerfish ang owner status sa pamamagitan ng pagkukumpara ng
phone number ng sender laban sa na-configure na `ownerPhone`. Ang check na ito
ay nangyayari sa code bago makita ng LLM ang message:

- **Match** -- Ang message ay isang owner command
- **Walang match** -- Ang message ay external input na may `PUBLIC` taint

Kung walang na-configure na `ownerPhone`, lahat ng messages ay tina-treat bilang
galing sa owner.

::: tip Palaging I-set ang Owner Phone Kung may ibang tao na pwedeng
mag-message sa iyong WhatsApp Business number, palaging i-configure ang
`ownerPhone` para maiwasan ang unauthorized command execution. :::

## Paano Gumagana ang Webhook

Ang adapter ay nagsisimula ng HTTP server sa na-configure na port (default
`8443`) na humahawak ng dalawang uri ng requests:

1. **GET /webhook** -- Ipinapadala ito ng Meta para i-verify ang iyong webhook
   endpoint. Tumutugon ang Triggerfish ng challenge token kung tugma ang verify
   token.
2. **POST /webhook** -- Dito ipinapadala ng Meta ang incoming messages.
   Pina-parse ng Triggerfish ang Cloud API webhook payload, kine-extract ang text
   messages, at ifinino-forward ang mga ito sa message handler.

## Message Limits

Sumusuporta ang WhatsApp ng messages hanggang 4,096 characters. Ang mga messages
na lumampas sa limit na ito ay chinu-chunk sa maraming messages bago ipadala.

## Typing Indicators

Nagpapadala at tumatanggap ang Triggerfish ng typing indicators sa WhatsApp.
Kapag nagpo-process ng request ang iyong agent, nagpapakita ng typing indicator
ang chat. Suportado rin ang read receipts.

## Pagpapalit ng Classification

```yaml
channels:
  whatsapp:
    # accessToken na naka-store sa OS keychain
    phoneNumberId: "your-phone-number-id"
    # verifyToken na naka-store sa OS keychain
    classification: INTERNAL
```

Mga valid na levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
