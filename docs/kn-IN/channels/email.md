# Email

ನಿಮ್ಮ Triggerfish agent ಅನ್ನು email ಗೆ ಸಂಪರ್ಕಿಸಿ IMAP ಮೂಲಕ messages ಸ್ವೀಕರಿಸಲು ಮತ್ತು
SMTP relay service ಮೂಲಕ replies ಕಳುಹಿಸಲು. Adapter outbound email ಗಾಗಿ SendGrid, Mailgun,
ಮತ್ತು Amazon SES ತರಹದ services ಬೆಂಬಲಿಸುತ್ತದೆ, ಮತ್ತು inbound messages ಗಾಗಿ ಯಾವ IMAP
server ಕೂಡ poll ಮಾಡುತ್ತದೆ.

## Default Classification

Email `CONFIDENTIAL` classification ಗೆ default ಆಗುತ್ತದೆ. Email ಸಾಮಾನ್ಯವಾಗಿ sensitive
content (contracts, account notifications, personal correspondence) ಒಳಗೊಳ್ಳುತ್ತದೆ,
ಆದ್ದರಿಂದ `CONFIDENTIAL` ಸುರಕ್ಷಿತ default.

## Setup

### Step 1: SMTP Relay ಆಯ್ಕೆ ಮಾಡಿ

Triggerfish HTTP-based SMTP relay API ಮೂಲಕ outbound email ಕಳುಹಿಸುತ್ತದೆ. ಬೆಂಬಲಿತ services:

| Service    | API Endpoint                                                     |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

ಈ services ಒಂದಕ್ಕೆ sign up ಮಾಡಿ ಮತ್ತು API key ಪಡೆಯಿರಿ.

### Step 2: Receiving ಗಾಗಿ IMAP Configure ಮಾಡಿ

Email ಸ್ವೀಕರಿಸಲು IMAP credentials ಅಗತ್ಯ. ಹೆಚ್ಚಿನ email providers IMAP ಬೆಂಬಲಿಸುತ್ತವೆ:

| Provider | IMAP Host               | Port |
| -------- | ----------------------- | ---- |
| Gmail    | `imap.gmail.com`        | 993  |
| Outlook  | `outlook.office365.com` | 993  |
| Fastmail | `imap.fastmail.com`     | 993  |
| Custom   | ನಿಮ್ಮ mail server        | 993  |

::: info Gmail App Passwords 2-factor authentication ನೊಂದಿಗೆ Gmail ಬಳಸುತ್ತಿದ್ದರೆ, IMAP
ಪ್ರವೇಶಕ್ಕಾಗಿ [App Password](https://myaccount.google.com/apppasswords) generate ಮಾಡಬೇಕು.
ನಿಮ್ಮ regular Gmail password ಕೆಲಸ ಮಾಡುವುದಿಲ್ಲ. :::

### Step 3: Triggerfish Configure ಮಾಡಿ

ನಿಮ್ಮ `triggerfish.yaml` ಗೆ Email channel ಸೇರಿಸಿ:

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

Secrets (SMTP API key, IMAP password) `triggerfish config add-channel email` ಸಮಯದಲ್ಲಿ
ನಮೂದಿಸಲ್ಪಡುತ್ತವೆ ಮತ್ತು OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಡುತ್ತವೆ.

| Option           | Type   | Required      | ವಿವರಣೆ                                                    |
| ---------------- | ------ | ------------- | ----------------------------------------------------------- |
| `smtpApiUrl`     | string | ಹೌದು           | SMTP relay API endpoint URL                                 |
| `imapHost`       | string | ಹೌದು           | IMAP server hostname                                        |
| `imapPort`       | number | ಇಲ್ಲ           | IMAP server port (default: `993`)                           |
| `imapUser`       | string | ಹೌದು           | IMAP username (ಸಾಮಾನ್ಯವಾಗಿ ನಿಮ್ಮ email address)           |
| `fromAddress`    | string | ಹೌದು           | Outgoing emails ಗಾಗಿ From address                          |
| `pollInterval`   | number | ಇಲ್ಲ           | ಹೊಸ emails ಎಷ್ಟು ಆಗಾಗ check ಮಾಡಬೇಕು, ms ನಲ್ಲಿ (default: `30000`) |
| `classification` | string | ಇಲ್ಲ           | Classification level (default: `CONFIDENTIAL`)              |
| `ownerEmail`     | string | ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ | Owner verification ಗಾಗಿ ನಿಮ್ಮ email address               |

::: warning Credentials SMTP API key ಮತ್ತು IMAP password OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಡುತ್ತವೆ
(Linux: GNOME Keyring, macOS: Keychain Access). ಅವು `triggerfish.yaml` ನಲ್ಲಿ ಎಂದಿಗೂ
ಕಾಣಿಸಿಕೊಳ್ಳುವುದಿಲ್ಲ. :::

### Step 4: Triggerfish ಪ್ರಾರಂಭಿಸಿ

```bash
triggerfish stop && triggerfish start
```

Connection confirm ಮಾಡಲು configured address ಗೆ email ಕಳುಹಿಸಿ.

## Owner Identity

Triggerfish ಕಳುಹಿಸುವವರ email address ಅನ್ನು configured `ownerEmail` ವಿರುದ್ಧ ಹೋಲಿಸಿ
owner status ನಿರ್ಧರಿಸುತ್ತದೆ:

- **ಹೊಂದಾಣಿಕೆ** -- Message owner command
- **ಹೊಂದಾಣಿಕೆ ಇಲ್ಲ** -- Message `PUBLIC` taint ನೊಂದಿಗೆ external input

`ownerEmail` configure ಮಾಡಿಲ್ಲದಿದ್ದರೆ, ಎಲ್ಲ messages owner ನಿಂದ ಎಂದು ಪರಿಗಣಿಸಲ್ಪಡುತ್ತವೆ.

## Domain-Based Classification

ಹೆಚ್ಚು granular control ಗಾಗಿ, email domain-based recipient classification ಬೆಂಬಲಿಸುತ್ತದೆ.
ಇದು enterprise environments ನಲ್ಲಿ ವಿಶೇಷ useful:

- `@yourcompany.com` ನಿಂದ emails `INTERNAL` ಎಂದು classified ಆಗಬಹುದು
- ಅಜ್ಞಾತ domains ನಿಂದ emails default `EXTERNAL`
- Admin per-contact ಅಥವಾ per-domain internal domains list configure ಮಾಡಬಹುದು

```yaml
channels:
  email:
    # ... other config
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

ಇದರರ್ಥ policy engine email ಎಲ್ಲಿಂದ ಬಂದಿದೆ ಎಂಬುದರ ಆಧಾರದ ಮೇಲೆ ವಿಭಿನ್ನ rules ಅನ್ವಯಿಸುತ್ತದೆ:

| Sender Domain              | Classification |
| -------------------------- | :------------: |
| Configure ಮಾಡಿದ internal domain | `INTERNAL`  |
| ಅಜ್ಞಾತ domain              | `EXTERNAL`     |

## ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

### Inbound Messages

Adapter configured interval ನಲ್ಲಿ (default: ಪ್ರತಿ 30 ಸೆಕೆಂಡ್) ಹೊಸ, unread messages ಗಾಗಿ
IMAP server poll ಮಾಡುತ್ತದೆ. ಹೊಸ email ಬಂದಾಗ:

1. Sender address extract ಮಾಡಲ್ಪಡುತ್ತದೆ
2. `ownerEmail` ವಿರುದ್ಧ owner status check ಮಾಡಲ್ಪಡುತ್ತದೆ
3. Email body message handler ಗೆ forward ಮಾಡಲ್ಪಡುತ್ತದೆ
4. ಪ್ರತಿ email thread sender address ಆಧಾರದ ಮೇಲೆ session ID ಗೆ mapped ಆಗುತ್ತದೆ
   (`email-sender@example.com`)

### Outbound Messages

Agent respond ಮಾಡಿದಾಗ, adapter configured SMTP relay HTTP API ಮೂಲಕ reply ಕಳುಹಿಸುತ್ತದೆ.
Reply ಒಳಗೊಳ್ಳುತ್ತದೆ:

- **From** -- Configured `fromAddress`
- **To** -- ಮೂಲ sender ನ email address
- **Subject** -- "Triggerfish" (default)
- **Body** -- Agent ನ response plain text ಆಗಿ

## Poll Interval

Default poll interval 30 ಸೆಕೆಂಡ್. ನಿಮ್ಮ ಅಗತ್ಯಗಳ ಆಧಾರದ ಮೇಲೆ ಇದನ್ನು adjust ಮಾಡಬಹುದು:

```yaml
channels:
  email:
    # ... other config
    pollInterval: 10000 # ಪ್ರತಿ 10 ಸೆಕೆಂಡ್ check ಮಾಡಿ
```

::: tip Responsiveness ಮತ್ತು Resources ಸಮತೋಲನ ಕಡಿಮೆ poll interval ಎಂದರೆ incoming email ಗೆ
ವೇಗ response, ಆದರೆ ಹೆಚ್ಚು ಆಗಾಗ IMAP connections. ಹೆಚ್ಚಿನ personal use cases ಗಾಗಿ 30 ಸೆಕೆಂಡ್
ಉತ್ತಮ ಸಮತೋಲನ. :::

## Classification ಬದಲಾಯಿಸಿ

```yaml
channels:
  email:
    # ... other config
    classification: CONFIDENTIAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
