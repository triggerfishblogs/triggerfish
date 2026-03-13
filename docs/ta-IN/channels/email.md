# Email

IMAP மூலம் செய்திகள் பெறவும் SMTP relay service மூலம் replies அனுப்பவும் உங்கள் Triggerfish agent ஐ email உடன் இணைக்கவும். Adapter outbound email க்கு SendGrid, Mailgun, மற்றும் Amazon SES போன்ற services ஐ support செய்கிறது, மற்றும் inbound செய்திகளுக்கு எந்த IMAP server ஐயும் poll செய்கிறது.

## Default Classification

Email `CONFIDENTIAL` classification க்கு default ஆகும். Email பெரும்பாலும் sensitive content (contracts, account notifications, personal correspondence) கொண்டிருக்கும், எனவே `CONFIDENTIAL` பாதுகாப்பான default.

## Setup

### படி 1: ஒரு SMTP Relay தேர்வு செய்யவும்

Triggerfish outbound email ஐ HTTP-based SMTP relay API மூலம் அனுப்புகிறது. ஆதரிக்கப்படும் services:

| Service    | API Endpoint                                                     |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

இந்த services ஒன்றில் sign up செய்து ஒரு API key பெறவும்.

### படி 2: பெறுவதற்கு IMAP கட்டமைக்கவும்

Email பெறுவதற்கு IMAP credentials தேவை. பெரும்பாலான email providers IMAP support செய்கின்றன:

| Provider | IMAP Host               | Port |
| -------- | ----------------------- | ---- |
| Gmail    | `imap.gmail.com`        | 993  |
| Outlook  | `outlook.office365.com` | 993  |
| Fastmail | `imap.fastmail.com`     | 993  |
| Custom   | உங்கள் mail server      | 993  |

::: info Gmail App Passwords 2-factor authentication உடன் Gmail பயன்படுத்தினால், IMAP அணுகலுக்கு ஒரு [App Password](https://myaccount.google.com/apppasswords) generate செய்ய வேண்டும். உங்கள் regular Gmail password வேலை செய்யாது. :::

### படி 3: Triggerfish கட்டமைக்கவும்

உங்கள் `triggerfish.yaml` இல் Email சேனல் சேர்க்கவும்:

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

Secrets (SMTP API key, IMAP password) `triggerfish config add-channel email` போது உள்ளிடப்படுகின்றன மற்றும் OS keychain இல் சேமிக்கப்படுகின்றன.

| Option           | Type   | Required         | விளக்கம்                                                     |
| ---------------- | ------ | ---------------- | ------------------------------------------------------------- |
| `smtpApiUrl`     | string | ஆம்              | SMTP relay API endpoint URL                                   |
| `imapHost`       | string | ஆம்              | IMAP server hostname                                          |
| `imapPort`       | number | இல்லை            | IMAP server port (default: `993`)                            |
| `imapUser`       | string | ஆம்              | IMAP username (பொதுவாக உங்கள் email address)                 |
| `fromAddress`    | string | ஆம்              | Outgoing emails க்கான From address                           |
| `pollInterval`   | number | இல்லை            | புதிய emails எவ்வளவு அடிக்கடி சரிபார்க்க வேண்டும், ms இல் (default: `30000`) |
| `classification` | string | இல்லை            | Classification நிலை (default: `CONFIDENTIAL`)                |
| `ownerEmail`     | string | பரிந்துரைக்கப்பட்டது | Owner verification க்கான உங்கள் email address              |

::: warning Credentials SMTP API key மற்றும் IMAP password OS keychain இல் சேமிக்கப்படுகின்றன (Linux: GNOME Keyring, macOS: Keychain Access). அவை `triggerfish.yaml` இல் ஒருபோதும் தோன்றுவதில்லை. :::

### படி 4: Triggerfish தொடங்கவும்

```bash
triggerfish stop && triggerfish start
```

Connection ஐ உறுதிப்படுத்த கட்டமைக்கப்பட்ட address க்கு ஒரு email அனுப்பவும்.

## Owner அடையாளம்

Triggerfish அனுப்புனரின் email address ஐ கட்டமைக்கப்பட்ட `ownerEmail` க்கு எதிராக ஒப்பிட்டு owner நிலையை தீர்மானிக்கிறது:

- **பொருந்துகிறது** -- செய்தி ஒரு owner command
- **பொருந்தவில்லை** -- `PUBLIC` taint உடன் செய்தி external input

`ownerEmail` கட்டமைக்கப்படவில்லையென்றால், அனைத்து செய்திகளும் owner இடமிருந்து வருவதாக கருதப்படுகின்றன.

## Domain அடிப்படையிலான Classification

அதிக granular கட்டுப்பாட்டிற்கு, email domain-based recipient classification ஐ support செய்கிறது. இது enterprise சூழல்களில் மிகவும் பயனுள்ளது:

- `@yourcompany.com` இலிருந்து emails `INTERNAL` என்று classify ஆகலாம்
- தெரியாத domains இலிருந்து emails default ஆக `EXTERNAL`
- Admin ஒரு internal domains பட்டியலை கட்டமைக்கலாம்

```yaml
channels:
  email:
    # ... other config
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

இதன் பொருள் policy engine ஒரு email எங்கிருந்து வருகிறது என்பதை அடிப்படையாக கொண்டு வெவ்வேறு விதிகளை பயன்படுத்துகிறது:

| Sender Domain                | Classification |
| ---------------------------- | :------------: |
| கட்டமைக்கப்பட்ட internal domain | `INTERNAL`    |
| தெரியாத domain               | `EXTERNAL`    |

## எவ்வாறு செயல்படுகிறது

### Inbound செய்திகள்

Adapter கட்டமைக்கப்பட்ட interval இல் (default: ஒவ்வொரு 30 வினாடிகளுக்கும்) புதிய, படிக்கப்படாத செய்திகளுக்காக IMAP server ஐ poll செய்கிறது. புதிய email வரும்போது:

1. Sender address extract ஆகிறது
2. Owner நிலை `ownerEmail` க்கு எதிராக சரிபார்க்கப்படுகிறது
3. Email body message handler க்கு forward ஆகிறது
4. ஒவ்வொரு email thread உம் sender address அடிப்படையில் ஒரு session ID க்கு map ஆகிறது (`email-sender@example.com`)

### Outbound செய்திகள்

Agent respond செய்யும்போது, adapter கட்டமைக்கப்பட்ட SMTP relay HTTP API மூலம் reply அனுப்புகிறது. Reply சேர்க்கிறது:

- **From** -- கட்டமைக்கப்பட்ட `fromAddress`
- **To** -- அசல் அனுப்புனரின் email address
- **Subject** -- "Triggerfish" (default)
- **Body** -- Agent இன் response plain text ஆக

## Poll Interval

Default poll interval 30 வினாடிகள். உங்கள் தேவைகளுக்கு இணங்க இதை சரிசெய்யலாம்:

```yaml
channels:
  email:
    # ... other config
    pollInterval: 10000 # ஒவ்வொரு 10 வினாடிகளுக்கும் சரிபார்க்கவும்
```

::: tip Responsiveness மற்றும் Resources சமன்படுத்துங்கள் குறைந்த poll interval இன்கமிங் email க்கு வேகமான response பொருள்படுகிறது, ஆனால் அதிக அடிக்கடி IMAP connections. பெரும்பாலான personal பயன்பாட்டிற்கு, 30 வினாடிகள் நல்ல சமன்பாடு. :::

## Classification மாற்றுதல்

```yaml
channels:
  email:
    # ... other config
    classification: CONFIDENTIAL
```

Valid நிலைகள்: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
