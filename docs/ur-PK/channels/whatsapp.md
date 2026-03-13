# WhatsApp

اپنے Triggerfish ایجنٹ کو WhatsApp سے جوڑیں تاکہ آپ اپنے فون سے اس سے interact کر
سکیں۔ Adapter **WhatsApp Business Cloud API** (سرکاری Meta-hosted HTTP API) استعمال
کرتا ہے، webhook کے ذریعے پیغامات receive کرتا ہے اور REST کے ذریعے بھیجتا ہے۔

## ڈیفالٹ Classification

WhatsApp ڈیفالٹ `PUBLIC` classification پر ہے۔ WhatsApp contacts میں آپ کے phone
number والا کوئی بھی شامل ہو سکتا ہے، اس لیے `PUBLIC` محفوظ ڈیفالٹ ہے۔

## Setup

### قدم 1: Meta Business Account بنائیں

1. [Meta for Developers](https://developers.facebook.com/) portal پر جائیں
2. اگر account نہیں ہے تو developer account بنائیں
3. نئی app بنائیں اور app type کے طور پر **Business** منتخب کریں
4. اپنے app dashboard میں، **WhatsApp** product شامل کریں

### قدم 2: اپنے Credentials حاصل کریں

اپنے app dashboard کے WhatsApp section سے یہ values جمع کریں:

- **Access Token** — ایک permanent access token (یا testing کے لیے temporary بنائیں)
- **Phone Number ID** — WhatsApp Business کے ساتھ registered phone number کی ID
- **Verify Token** — آپ کا منتخب کردہ string، webhook registration verify کرنے کے لیے

### قدم 3: Webhooks Configure کریں

1. WhatsApp product settings میں، **Webhooks** navigate کریں
2. Callback URL کو اپنے server کے public address پر set کریں (مثلاً،
   `https://your-server.com:8443/webhook`)
3. **Verify Token** کو وہی value پر set کریں جو آپ Triggerfish config میں استعمال کریں گے
4. `messages` webhook field کو subscribe کریں

::: info Public URL ضروری WhatsApp webhooks کو publicly accessible HTTPS endpoint
چاہیے۔ اگر آپ Triggerfish مقامی طور پر چلا رہے ہیں، تو آپ کو tunnel service (مثلاً،
ngrok، Cloudflare Tunnel) یا public IP والا server درکار ہوگا۔ :::

### قدم 4: Triggerfish Configure کریں

اپنی `triggerfish.yaml` میں WhatsApp channel شامل کریں:

```yaml
channels:
  whatsapp:
    # accessToken OS keychain میں محفوظ
    phoneNumberId: "your-phone-number-id"
    # verifyToken OS keychain میں محفوظ
    ownerPhone: "15551234567"
```

| Option           | Type   | ضروری       | تفصیل                                                              |
| ---------------- | ------ | ----------- | ------------------------------------------------------------------ |
| `accessToken`    | string | ہاں         | WhatsApp Business API access token                                 |
| `phoneNumberId`  | string | ہاں         | Meta Business Dashboard سے Phone Number ID                         |
| `verifyToken`    | string | ہاں         | Webhook verification کے لیے token (آپ منتخب کرتے ہیں)             |
| `webhookPort`    | number | نہیں        | Webhooks سننے کا port (ڈیفالٹ: `8443`)                            |
| `ownerPhone`     | string | تجویز کردہ  | Owner verification کے لیے آپ کا phone number (مثلاً، `"15551234567"`) |
| `classification` | string | نہیں        | Classification level (ڈیفالٹ: `PUBLIC`)                            |

::: warning Secrets محفوظ طریقے سے Store کریں Access tokens کو کبھی source control میں
commit نہ کریں۔ Environment variables یا OS keychain استعمال کریں۔ :::

### قدم 5: Triggerfish شروع کریں

```bash
triggerfish stop && triggerfish start
```

Connection confirm کرنے کے لیے اپنے فون سے WhatsApp Business number کو پیغام بھیجیں۔

## Owner Identity

Triggerfish owner status sender کے phone number کو configured `ownerPhone` سے compare
کر کے تعین کرتا ہے۔ یہ check LLM کے پیغام دیکھنے سے پہلے کوڈ میں ہوتا ہے:

- **Match** — پیغام ایک owner command ہے
- **No match** — پیغام `PUBLIC` taint کے ساتھ external input ہے

اگر کوئی `ownerPhone` configure نہیں کیا گیا، تمام پیغامات owner کی طرف سے سمجھے
جاتے ہیں۔

::: tip ہمیشہ Owner Phone سیٹ کریں اگر دوسرے آپ کے WhatsApp Business number کو
پیغام کر سکتے ہیں، تو unauthorized command execution روکنے کے لیے ہمیشہ `ownerPhone`
configure کریں۔ :::

## Webhook کیسے کام کرتا ہے

Adapter configured port (ڈیفالٹ `8443`) پر ایک HTTP server شروع کرتا ہے جو دو قسم
کی requests handle کرتا ہے:

1. **GET /webhook** — Meta آپ کے webhook endpoint verify کرنے کے لیے یہ بھیجتا ہے۔
   Triggerfish challenge token سے respond کرتا ہے اگر verify token match کرے۔
2. **POST /webhook** — Meta یہاں incoming messages بھیجتا ہے۔ Triggerfish Cloud API
   webhook payload parse کرتا ہے، text messages extract کرتا ہے، اور انہیں message
   handler کو forward کرتا ہے۔

## Message Limits

WhatsApp 4,096 characters تک کے پیغامات support کرتا ہے۔ اس limit سے زیادہ پیغامات
بھیجنے سے پہلے متعدد messages میں chunk کیے جاتے ہیں۔

## Typing Indicators

Triggerfish WhatsApp پر typing indicators send اور receive کرتا ہے۔ جب آپ کا ایجنٹ
request process کر رہا ہو، chat ایک typing indicator دکھاتا ہے۔ Read receipts بھی
support کیے جاتے ہیں۔

## Classification تبدیل کرنا

```yaml
channels:
  whatsapp:
    # accessToken OS keychain میں محفوظ
    phoneNumberId: "your-phone-number-id"
    # verifyToken OS keychain میں محفوظ
    classification: INTERNAL
```

Valid levels: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`۔
