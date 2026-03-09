# Email

Ikonekta ang iyong Triggerfish agent sa email para makatanggap ito ng messages
via IMAP at makapadala ng replies via SMTP relay service. Sumusuporta ang
adapter sa mga services tulad ng SendGrid, Mailgun, at Amazon SES para sa
outbound email, at nagpo-poll sa kahit anong IMAP server para sa inbound
messages.

## Default Classification

Naka-default ang Email sa `CONFIDENTIAL` classification. Ang email ay madalas
naglalaman ng sensitive content (contracts, account notifications, personal
correspondence), kaya `CONFIDENTIAL` ang ligtas na default.

## Setup

### Step 1: Pumili ng SMTP Relay

Nagpapadala ang Triggerfish ng outbound email sa pamamagitan ng HTTP-based SMTP
relay API. Kasama sa mga suportadong services ang:

| Service    | API Endpoint                                                     |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Mag-sign up sa isa sa mga services na ito at kumuha ng API key.

### Step 2: I-configure ang IMAP para sa Pagtanggap

Kailangan mo ng IMAP credentials para tumanggap ng email. Karamihan ng email
providers ay sumusuporta ng IMAP:

| Provider | IMAP Host               | Port |
| -------- | ----------------------- | ---- |
| Gmail    | `imap.gmail.com`        | 993  |
| Outlook  | `outlook.office365.com` | 993  |
| Fastmail | `imap.fastmail.com`     | 993  |
| Custom   | Ang iyong mail server   | 993  |

::: info Gmail App Passwords Kung gumagamit ka ng Gmail na may 2-factor
authentication, kailangan mong mag-generate ng
[App Password](https://myaccount.google.com/apppasswords) para sa IMAP access.
Hindi gagana ang regular Gmail password mo. :::

### Step 3: I-configure ang Triggerfish

Idagdag ang Email channel sa iyong `triggerfish.yaml`:

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

Ang mga secrets (SMTP API key, IMAP password) ay ini-enter habang gumagamit ng
`triggerfish config add-channel email` at sino-store sa OS keychain.

| Option           | Type   | Required    | Description                                                    |
| ---------------- | ------ | ----------- | -------------------------------------------------------------- |
| `smtpApiUrl`     | string | Oo          | SMTP relay API endpoint URL                                    |
| `imapHost`       | string | Oo          | IMAP server hostname                                           |
| `imapPort`       | number | Hindi       | IMAP server port (default: `993`)                              |
| `imapUser`       | string | Oo          | IMAP username (karaniwan ang email address mo)                 |
| `fromAddress`    | string | Oo          | From address para sa mga outgoing emails                       |
| `pollInterval`   | number | Hindi       | Gaano kadalas mag-check ng bagong emails, sa ms (default: `30000`) |
| `classification` | string | Hindi       | Classification level (default: `CONFIDENTIAL`)                 |
| `ownerEmail`     | string | Recommended | Ang iyong email address para sa owner verification             |

::: warning Credentials Ang SMTP API key at IMAP password ay sino-store sa OS
keychain (Linux: GNOME Keyring, macOS: Keychain Access). Hindi sila kailanman
lumalabas sa `triggerfish.yaml`. :::

### Step 4: I-start ang Triggerfish

```bash
triggerfish stop && triggerfish start
```

Magpadala ng email sa na-configure na address para kumpirmahin ang connection.

## Owner Identity

Dine-determine ng Triggerfish ang owner status sa pamamagitan ng pagkukumpara ng
email address ng sender laban sa na-configure na `ownerEmail`:

- **Match** -- Ang message ay isang owner command
- **Walang match** -- Ang message ay external input na may `PUBLIC` taint

Kung walang na-configure na `ownerEmail`, lahat ng messages ay tina-treat bilang
galing sa owner.

## Domain-Based Classification

Para sa mas granular na control, sumusuporta ang email ng domain-based recipient
classification. Kapaki-pakinabang ito lalo na sa enterprise environments:

- Ang mga emails mula sa `@yourcompany.com` ay pwedeng i-classify bilang
  `INTERNAL`
- Ang mga emails mula sa unknown domains ay naka-default sa `EXTERNAL`
- Pwedeng i-configure ng admin ang isang list ng internal domains

```yaml
channels:
  email:
    # ... ibang config
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

Ibig sabihin nag-aapply ang policy engine ng iba't ibang rules base sa pinagmulan
ng email:

| Sender Domain              | Classification |
| -------------------------- | :------------: |
| Na-configure na internal domain |  `INTERNAL`  |
| Unknown domain             |   `EXTERNAL`   |

## Paano Ito Gumagana

### Inbound Messages

Nagpo-poll ang adapter sa IMAP server sa na-configure na interval (default:
tuwing 30 seconds) para sa mga bago at unread messages. Kapag may dumating na
bagong email:

1. Kine-extract ang sender address
2. Chine-check ang owner status laban sa `ownerEmail`
3. Ifinino-forward ang email body sa message handler
4. Bawat email thread ay mina-map sa isang session ID base sa sender address
   (`email-sender@example.com`)

### Outbound Messages

Kapag tumugon ang agent, ipinapadala ng adapter ang reply sa pamamagitan ng
na-configure na SMTP relay HTTP API. Kasama sa reply ang:

- **From** -- Ang na-configure na `fromAddress`
- **To** -- Ang email address ng original sender
- **Subject** -- "Triggerfish" (default)
- **Body** -- Ang response ng agent bilang plain text

## Poll Interval

Ang default poll interval ay 30 seconds. Pwede mo itong i-adjust base sa iyong
mga pangangailangan:

```yaml
channels:
  email:
    # ... ibang config
    pollInterval: 10000 # Mag-check tuwing 10 seconds
```

::: tip Balanse sa Responsiveness at Resources Ang mas maikling poll interval
ay nangangahulugan ng mas mabilis na response sa incoming email, pero mas
madalas na IMAP connections. Para sa karamihan ng personal use cases, 30 seconds
ay magandang balanse. :::

## Pagpapalit ng Classification

```yaml
channels:
  email:
    # ... ibang config
    classification: CONFIDENTIAL
```

Mga valid na levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
