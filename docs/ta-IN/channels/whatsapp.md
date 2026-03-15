# WhatsApp

உங்கள் phone இலிருந்து interact செய்ய உங்கள் Triggerfish agent ஐ WhatsApp உடன் இணைக்கவும். Adapter **WhatsApp Business Cloud API** (official Meta-hosted HTTP API) பயன்படுத்துகிறது, webhook மூலம் செய்திகள் பெறுகிறது மற்றும் REST மூலம் அனுப்புகிறது.

## Default Classification

WhatsApp `PUBLIC` classification க்கு default ஆகும். WhatsApp contacts உங்கள் phone number உள்ள யாரையும் சேர்க்கலாம், எனவே `PUBLIC` பாதுகாப்பான default.

## Setup

### படி 1: ஒரு Meta Business Account உருவாக்கவும்

1. [Meta for Developers](https://developers.facebook.com/) portal க்கு செல்லவும்
2. இல்லையென்றால் ஒரு developer account உருவாக்கவும்
3. ஒரு புதிய app உருவாக்கி app type ஆக **Business** தேர்வு செய்யவும்
4. உங்கள் app dashboard இல், **WhatsApp** product சேர்க்கவும்

### படி 2: உங்கள் Credentials பெறவும்

உங்கள் app dashboard இன் WhatsApp பிரிவிலிருந்து இந்த மதிப்புகளை சேகரிக்கவும்:

- **Access Token** -- ஒரு permanent access token (அல்லது testing க்கு ஒரு temporary ஒன்று generate செய்யவும்)
- **Phone Number ID** -- WhatsApp Business உடன் பதிவு செய்யப்பட்ட phone number இன் ID
- **Verify Token** -- நீங்கள் தேர்வு செய்யும் ஒரு string, webhook பதிவை verify செய்ய பயன்படுகிறது

### படி 3: Webhooks கட்டமைக்கவும்

1. WhatsApp product settings இல், **Webhooks** க்கு navigate செய்யவும்
2. Callback URL ஐ உங்கள் server இன் public address க்கு அமைக்கவும் (உதா., `https://your-server.com:8443/webhook`)
3. **Verify Token** ஐ உங்கள் Triggerfish config இல் நீங்கள் பயன்படுத்தும் அதே மதிப்பிற்கு அமைக்கவும்
4. `messages` webhook field க்கு subscribe செய்யவும்

::: info Public URL தேவை WhatsApp webhooks க்கு publicly accessible HTTPS endpoint தேவை. நீங்கள் Triggerfish locally இயக்குகிறீர்களென்றால், ஒரு tunnel service (உதா., ngrok, Cloudflare Tunnel) அல்லது public IP உடன் ஒரு server தேவைப்படும். :::

### படி 4: Triggerfish கட்டமைக்கவும்

உங்கள் `triggerfish.yaml` இல் WhatsApp சேனல் சேர்க்கவும்:

```yaml
channels:
  whatsapp:
    # accessToken OS keychain இல் சேமிக்கப்பட்டுள்ளது
    phoneNumberId: "your-phone-number-id"
    # verifyToken OS keychain இல் சேமிக்கப்பட்டுள்ளது
    ownerPhone: "15551234567"
```

| Option           | Type   | Required         | விளக்கம்                                                           |
| ---------------- | ------ | ---------------- | ------------------------------------------------------------------- |
| `accessToken`    | string | ஆம்              | WhatsApp Business API access token                                  |
| `phoneNumberId`  | string | ஆம்              | Meta Business Dashboard இலிருந்து Phone Number ID                  |
| `verifyToken`    | string | ஆம்              | Webhook verification க்கான token (நீங்கள் தேர்வு செய்கிறீர்கள்) |
| `webhookPort`    | number | இல்லை            | Webhooks கேட்க port (default: `8443`)                              |
| `ownerPhone`     | string | பரிந்துரைக்கப்பட்டது | Owner verification க்கான உங்கள் phone number (உதா., `"15551234567"`) |
| `classification` | string | இல்லை            | Classification நிலை (default: `PUBLIC`)                            |

::: warning Secrets பாதுகாப்பாக சேமிக்கவும் Access tokens ஐ source control க்கு commit செய்யவேண்டாம். Environment variables அல்லது உங்கள் OS keychain பயன்படுத்தவும். :::

### படி 5: Triggerfish தொடங்கவும்

```bash
triggerfish stop && triggerfish start
```

Connection ஐ உறுதிப்படுத்த உங்கள் phone இலிருந்து WhatsApp Business number க்கு ஒரு செய்தி அனுப்பவும்.

## Owner அடையாளம்

Triggerfish அனுப்புனரின் phone number ஐ கட்டமைக்கப்பட்ட `ownerPhone` க்கு எதிராக ஒப்பிட்டு owner நிலையை தீர்மானிக்கிறது. இந்த சரிபார்ப்பு LLM செய்தியை பார்ப்பதற்கு முன்பே code இல் நடக்கிறது:

- **பொருந்துகிறது** -- செய்தி ஒரு owner command
- **பொருந்தவில்லை** -- செய்தி `PUBLIC` taint உடன் external input

`ownerPhone` கட்டமைக்கப்படவில்லையென்றால், அனைத்து செய்திகளும் owner இடமிருந்து வருவதாக கருதப்படுகின்றன.

::: tip எப்போதும் Owner Phone அமைக்கவும் மற்றவர்கள் உங்கள் WhatsApp Business number க்கு செய்தி அனுப்பலாமென்றால், unauthorized command execution தடுக்க எப்போதும் `ownerPhone` கட்டமைக்கவும்.
:::

## Webhook எவ்வாறு செயல்படுகிறது

Adapter கட்டமைக்கப்பட்ட port இல் (default `8443`) ஒரு HTTP server தொடங்குகிறது, இது இரண்டு வகையான requests கையாளுகிறது:

1. **GET /webhook** -- Meta உங்கள் webhook endpoint ஐ verify செய்ய இதை அனுப்புகிறது. Verify token பொருந்தினால் Triggerfish challenge token உடன் respond செய்கிறது.
2. **POST /webhook** -- Meta incoming செய்திகளை இங்கே அனுப்புகிறது. Triggerfish Cloud API webhook payload parse செய்கிறது, text messages extract செய்கிறது, மற்றும் அவற்றை message handler க்கு forward செய்கிறது.

## Message வரம்புகள்

WhatsApp 4,096 characters வரை செய்திகளை support செய்கிறது. இந்த வரம்பை மீறும் செய்திகள் அனுப்பப்படுவதற்கு முன்பு பல செய்திகளாக chunk ஆகின்றன.

## Typing Indicators

Triggerfish WhatsApp இல் typing indicators அனுப்புகிறது மற்றும் பெறுகிறது. உங்கள் agent ஒரு request செயலாக்கும்போது, chat ஒரு typing indicator காட்டுகிறது. Read receipts உம் support செய்யப்படுகிறது.

## Classification மாற்றுதல்

```yaml
channels:
  whatsapp:
    # accessToken OS keychain இல் சேமிக்கப்பட்டுள்ளது
    phoneNumberId: "your-phone-number-id"
    # verifyToken OS keychain இல் சேமிக்கப்பட்டுள்ளது
    classification: INTERNAL
```

Valid நிலைகள்: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
