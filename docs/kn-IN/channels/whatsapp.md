# WhatsApp

ನಿಮ್ಮ Triggerfish agent ಅನ್ನು WhatsApp ಗೆ ಸಂಪರ್ಕಿಸಿ ನಿಮ್ಮ phone ನಿಂದ ಅದರೊಂದಿಗೆ ಸಂವಾದಿಸಿ.
Adapter **WhatsApp Business Cloud API** (Meta ನ official HTTP API) ಬಳಸುತ್ತದೆ, webhook
ಮೂಲಕ messages ಸ್ವೀಕರಿಸಿ REST ಮೂಲಕ ಕಳುಹಿಸುತ್ತದೆ.

## Default Classification

WhatsApp `PUBLIC` classification ಗೆ default ಆಗುತ್ತದೆ. WhatsApp contacts ನಿಮ್ಮ phone
number ಹೊಂದಿರುವ ಯಾರಾದರೂ ಒಳಗೊಳ್ಳಬಹುದು, ಆದ್ದರಿಂದ `PUBLIC` ಸುರಕ್ಷಿತ default.

## Setup

### Step 1: Meta Business Account ರಚಿಸಿ

1. [Meta for Developers](https://developers.facebook.com/) portal ಗೆ ಹೋಗಿ
2. Developer account ಇಲ್ಲದಿದ್ದರೆ ರಚಿಸಿ
3. ಹೊಸ app ರಚಿಸಿ ಮತ್ತು app type ಆಗಿ **Business** ಆಯ್ಕೆ ಮಾಡಿ
4. ನಿಮ್ಮ app dashboard ನಲ್ಲಿ **WhatsApp** product ಸೇರಿಸಿ

### Step 2: ನಿಮ್ಮ Credentials ಪಡೆಯಿರಿ

ನಿಮ್ಮ app dashboard ನ WhatsApp section ನಿಂದ ಈ values collect ಮಾಡಿ:

- **Access Token** -- Permanent access token (ಅಥವಾ testing ಗಾಗಿ temporary one generate ಮಾಡಿ)
- **Phone Number ID** -- WhatsApp Business ನಲ್ಲಿ registered phone number ನ ID
- **Verify Token** -- ನೀವು ಆಯ್ಕೆ ಮಾಡುವ string, webhook registration verify ಮಾಡಲು ಬಳಸಲ್ಪಡುತ್ತದೆ

### Step 3: Webhooks Configure ಮಾಡಿ

1. WhatsApp product settings ನಲ್ಲಿ **Webhooks** ಗೆ navigate ಮಾಡಿ
2. ನಿಮ್ಮ server ನ public address ಗೆ callback URL ಹೊಂದಿಸಿ (ಉದಾ., `https://your-server.com:8443/webhook`)
3. **Verify Token** ಅನ್ನು ನಿಮ್ಮ Triggerfish config ನಲ್ಲಿ ಬಳಸುವ ಮೌಲ್ಯಕ್ಕೆ ಹೊಂದಿಸಿ
4. `messages` webhook field ಗೆ subscribe ಮಾಡಿ

::: info Public URL Required WhatsApp webhooks publicly accessible HTTPS endpoint ಅಗತ್ಯ.
ನೀವು Triggerfish locally ಚಲಿಸುತ್ತಿದ್ದರೆ, tunnel service (ಉದಾ., ngrok, Cloudflare Tunnel)
ಅಥವಾ public IP ಹೊಂದಿರುವ server ಅಗತ್ಯ. :::

### Step 4: Triggerfish Configure ಮಾಡಿ

ನಿಮ್ಮ `triggerfish.yaml` ಗೆ WhatsApp channel ಸೇರಿಸಿ:

```yaml
channels:
  whatsapp:
    # accessToken OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟಿದೆ
    phoneNumberId: "your-phone-number-id"
    # verifyToken OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟಿದೆ
    ownerPhone: "15551234567"
```

| Option           | Type   | Required      | ವಿವರಣೆ                                                       |
| ---------------- | ------ | ------------- | --------------------------------------------------------------- |
| `accessToken`    | string | ಹೌದು           | WhatsApp Business API access token                              |
| `phoneNumberId`  | string | ಹೌದು           | Meta Business Dashboard ನಿಂದ Phone Number ID                   |
| `verifyToken`    | string | ಹೌದು           | Webhook verification ಗಾಗಿ token (ನೀವು ಆಯ್ಕೆ ಮಾಡುತ್ತೀರಿ)       |
| `webhookPort`    | number | ಇಲ್ಲ           | Webhooks ಕೇಳಲು port (default: `8443`)                          |
| `ownerPhone`     | string | ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ | Owner verification ಗಾಗಿ ನಿಮ್ಮ phone number (ಉದಾ., `"15551234567"`) |
| `classification` | string | ಇಲ್ಲ           | Classification level (default: `PUBLIC`)                        |

::: warning Secrets ಸುರಕ್ಷಿತವಾಗಿ ಸಂಗ್ರಹಿಸಿ Access tokens ಅನ್ನು source control ಗೆ ಎಂದಿಗೂ
commit ಮಾಡಬೇಡಿ. Environment variables ಅಥವಾ OS keychain ಬಳಸಿ. :::

### Step 5: Triggerfish ಪ್ರಾರಂಭಿಸಿ

```bash
triggerfish stop && triggerfish start
```

Connection confirm ಮಾಡಲು ನಿಮ್ಮ phone ನಿಂದ WhatsApp Business number ಗೆ message ಕಳುಹಿಸಿ.

## Owner Identity

Triggerfish ಕಳುಹಿಸುವವರ phone number ಅನ್ನು configured `ownerPhone` ವಿರುದ್ಧ ಹೋಲಿಸಿ owner
status ನಿರ್ಧರಿಸುತ್ತದೆ. ಈ check LLM message ನೋಡುವ ಮೊದಲು ಕೋಡ್‌ನಲ್ಲಿ ಆಗುತ್ತದೆ:

- **ಹೊಂದಾಣಿಕೆ** -- Message owner command
- **ಹೊಂದಾಣಿಕೆ ಇಲ್ಲ** -- Message `PUBLIC` taint ನೊಂದಿಗೆ external input

`ownerPhone` configure ಮಾಡಿಲ್ಲದಿದ್ದರೆ, ಎಲ್ಲ messages owner ನಿಂದ ಎಂದು ಪರಿಗಣಿಸಲ್ಪಡುತ್ತವೆ.

::: tip ಯಾವಾಗಲೂ Owner Phone ಹೊಂದಿಸಿ ಇತರರು ನಿಮ್ಮ WhatsApp Business number ಗೆ message
ಮಾಡಬಹುದಾದರೆ, ಅನಧಿಕೃತ command execution ತಡೆಯಲು ಯಾವಾಗಲೂ `ownerPhone` configure ಮಾಡಿ. :::

## Webhook ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

Adapter configured port ನಲ್ಲಿ (default `8443`) HTTP server ಪ್ರಾರಂಭಿಸುತ್ತದೆ, ಎರಡು ರೀತಿಯ
requests ನಿರ್ವಹಿಸುತ್ತದೆ:

1. **GET /webhook** -- ನಿಮ್ಮ webhook endpoint verify ಮಾಡಲು Meta ಇದನ್ನು ಕಳುಹಿಸುತ್ತದೆ.
   Verify token ಹೊಂದಾಣಿಕೆಯಾದರೆ Triggerfish challenge token ನೊಂದಿಗೆ respond ಮಾಡುತ್ತದೆ.
2. **POST /webhook** -- Incoming messages ಇಲ್ಲಿ Meta ಕಳುಹಿಸುತ್ತದೆ. Triggerfish Cloud API
   webhook payload parse ಮಾಡಿ, text messages extract ಮಾಡಿ, message handler ಗೆ forward
   ಮಾಡುತ್ತದೆ.

## Message Limits

WhatsApp 4,096 characters ತನಕ messages ಬೆಂಬಲಿಸುತ್ತದೆ. ಈ limit ಮೀರಿದ messages ಕಳುಹಿಸುವ
ಮೊದಲು ಅನೇಕ messages ಗೆ chunked ಆಗುತ್ತವೆ.

## Typing Indicators

Triggerfish WhatsApp ನಲ್ಲಿ typing indicators ಕಳುಹಿಸುತ್ತದೆ ಮತ್ತು ಸ್ವೀಕರಿಸುತ್ತದೆ. ನಿಮ್ಮ
agent request ಸಂಸ್ಕರಿಸುತ್ತಿರುವಾಗ, chat typing indicator ತೋರಿಸುತ್ತದೆ. Read receipts ಕೂಡ
ಬೆಂಬಲಿತ.

## Classification ಬದಲಾಯಿಸಿ

```yaml
channels:
  whatsapp:
    # accessToken OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟಿದೆ
    phoneNumberId: "your-phone-number-id"
    # verifyToken OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟಿದೆ
    classification: INTERNAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
