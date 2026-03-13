# Email

اپنے Triggerfish ایجنٹ کو email سے جوڑیں تاکہ یہ IMAP کے ذریعے پیغامات receive کر سکے
اور SMTP relay service کے ذریعے replies بھیج سکے۔ Adapter outbound email کے لیے
SendGrid، Mailgun، اور Amazon SES جیسی services support کرتا ہے، اور inbound messages
کے لیے کسی بھی IMAP server کو poll کرتا ہے۔

## ڈیفالٹ Classification

Email ڈیفالٹ `CONFIDENTIAL` classification پر ہے۔ Email میں اکثر حساس مواد ہوتا ہے
(contracts، account notifications، ذاتی خط و کتابت)، اس لیے `CONFIDENTIAL` محفوظ
ڈیفالٹ ہے۔

## Setup

### قدم 1: SMTP Relay منتخب کریں

Triggerfish outbound email HTTP-based SMTP relay API کے ذریعے بھیجتا ہے۔ Support کردہ
services:

| Service    | API Endpoint                                                     |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

ان میں سے ایک service کے لیے sign up کریں اور API key حاصل کریں۔

### قدم 2: Receiving کے لیے IMAP Configure کریں

Email receive کرنے کے لیے آپ کو IMAP credentials چاہیے۔ زیادہ تر email providers IMAP
support کرتے ہیں:

| Provider | IMAP Host               | Port |
| -------- | ----------------------- | ---- |
| Gmail    | `imap.gmail.com`        | 993  |
| Outlook  | `outlook.office365.com` | 993  |
| Fastmail | `imap.fastmail.com`     | 993  |
| Custom   | آپ کا mail server       | 993  |

::: info Gmail App Passwords اگر آپ 2-factor authentication کے ساتھ Gmail استعمال
کرتے ہیں، تو آپ کو IMAP access کے لیے
[App Password](https://myaccount.google.com/apppasswords) generate کرنی ہوگی۔ آپ کا
باقاعدہ Gmail password کام نہیں کرے گا۔ :::

### قدم 3: Triggerfish Configure کریں

اپنی `triggerfish.yaml` میں Email channel شامل کریں:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "triggerfish@yourdomain.com"
    ownerEmail: "you@gmail.com"
```

Secrets (SMTP API key، IMAP password) `triggerfish config add-channel email` کے دوران
درج کیے جاتے ہیں اور OS keychain میں محفوظ ہوتے ہیں۔

| Option           | Type   | ضروری       | تفصیل                                                        |
| ---------------- | ------ | ----------- | ------------------------------------------------------------ |
| `smtpApiUrl`     | string | ہاں         | SMTP relay API endpoint URL                                  |
| `imapHost`       | string | ہاں         | IMAP server hostname                                         |
| `imapPort`       | number | نہیں        | IMAP server port (ڈیفالٹ: `993`)                            |
| `imapUser`       | string | ہاں         | IMAP username (عموماً آپ کا email address)                   |
| `fromAddress`    | string | ہاں         | Outgoing emails کے لیے From address                          |
| `pollInterval`   | number | نہیں        | نئے emails کتنی بار چیک کریں، ms میں (ڈیفالٹ: `30000`)     |
| `classification` | string | نہیں        | Classification level (ڈیفالٹ: `CONFIDENTIAL`)               |
| `ownerEmail`     | string | تجویز کردہ  | Owner verification کے لیے آپ کا email address               |

::: warning Credentials SMTP API key اور IMAP password OS keychain میں محفوظ ہوتے ہیں
(Linux: GNOME Keyring، macOS: Keychain Access)۔ یہ کبھی `triggerfish.yaml` میں نظر
نہیں آتے۔ :::

### قدم 4: Triggerfish شروع کریں

```bash
triggerfish stop && triggerfish start
```

Connection confirm کرنے کے لیے configured address پر email بھیجیں۔

## Owner Identity

Triggerfish owner status sender کے email address کو configured `ownerEmail` سے compare
کر کے تعین کرتا ہے:

- **Match** — پیغام ایک owner command ہے
- **No match** — پیغام `PUBLIC` taint کے ساتھ external input ہے

اگر کوئی `ownerEmail` configure نہیں کیا گیا، تمام پیغامات owner کی طرف سے سمجھے
جاتے ہیں۔

## Domain-Based Classification

زیادہ granular control کے لیے، email domain-based recipient classification support کرتا
ہے۔ یہ enterprise environments میں خاص طور پر مفید ہے:

- `@yourcompany.com` سے emails `INTERNAL` classified کی جا سکتی ہیں
- نامعلوم domains سے emails ڈیفالٹ `EXTERNAL` ہوتی ہیں
- Admin internal domains کی list configure کر سکتا ہے

```yaml
channels:
  email:
    # ... دیگر config
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

اس کا مطلب ہے policy engine email کہاں سے آئی اس کی بنیاد پر مختلف قواعد لاگو کرتی ہے:

| Sender Domain              | Classification |
| -------------------------- | :------------: |
| Configured internal domain |   `INTERNAL`   |
| نامعلوم domain             |   `EXTERNAL`   |

## یہ کیسے کام کرتا ہے

### Inbound Messages

Adapter configured interval پر IMAP server کو نئے، unread پیغامات کے لیے poll کرتا
ہے (ڈیفالٹ: ہر 30 سیکنڈ)۔ جب نئی email آتی ہے:

1. Sender address extract ہوتا ہے
2. Owner status `ownerEmail` کے خلاف چیک ہوتا ہے
3. Email body message handler کو forward ہوتا ہے
4. ہر email thread کو sender address کی بنیاد پر ایک session ID سے map کیا جاتا ہے
   (`email-sender@example.com`)

### Outbound Messages

جب ایجنٹ respond کرتا ہے، adapter configured SMTP relay HTTP API کے ذریعے reply بھیجتا
ہے۔ Reply میں شامل ہیں:

- **From** — Configured `fromAddress`
- **To** — اصل sender کا email address
- **Subject** — "Triggerfish" (ڈیفالٹ)
- **Body** — ایجنٹ کی response بطور plain text

## Poll Interval

ڈیفالٹ poll interval 30 سیکنڈ ہے۔ آپ اسے اپنی ضروریات کے مطابق adjust کر سکتے ہیں:

```yaml
channels:
  email:
    # ... دیگر config
    pollInterval: 10000 # ہر 10 سیکنڈ چیک کریں
```

::: tip Responsiveness اور Resources میں توازن ایک مختصر poll interval کا مطلب ہے
incoming email کا تیز جواب، لیکن زیادہ بار IMAP connections۔ زیادہ تر ذاتی استعمال
کے لیے، 30 سیکنڈ ایک اچھا توازن ہے۔ :::

## Classification تبدیل کرنا

```yaml
channels:
  email:
    # ... دیگر config
    classification: CONFIDENTIAL
```

Valid levels: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`۔
