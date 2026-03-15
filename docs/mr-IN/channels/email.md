# Email

तुमच्या Triggerfish एजंटला email शी जोडा जेणेकरून ते IMAP द्वारे messages प्राप्त
करू शकेल आणि SMTP relay service द्वारे replies पाठवू शकेल. Adapter SendGrid,
Mailgun, आणि Amazon SES सारख्या services ला outbound email साठी support करतो,
आणि inbound messages साठी कोणत्याही IMAP server ला poll करतो.

## Default वर्गीकरण

Email default वर `CONFIDENTIAL` वर्गीकरण आहे. Email मध्ये अनेकदा sensitive
content असतो (contracts, account notifications, personal correspondence), त्यामुळे
`CONFIDENTIAL` हा safe default आहे.

## सेटअप

### पायरी 1: SMTP Relay निवडा

Triggerfish outbound email HTTP-based SMTP relay API द्वारे पाठवतो. Supported
services:

| Service    | API Endpoint                                                     |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

यापैकी एका service साठी sign up करा आणि API key मिळवा.

### पायरी 2: Receiving साठी IMAP कॉन्फिगर करा

Email प्राप्त करण्यासाठी तुम्हाला IMAP credentials आवश्यक आहेत. बहुतेक email
providers IMAP support करतात:

| Provider | IMAP Host               | Port |
| -------- | ----------------------- | ---- |
| Gmail    | `imap.gmail.com`        | 993  |
| Outlook  | `outlook.office365.com` | 993  |
| Fastmail | `imap.fastmail.com`     | 993  |
| Custom   | Your mail server        | 993  |

::: info Gmail App Passwords जर तुम्ही Gmail 2-factor authentication सह वापरत
असाल, तर तुम्हाला IMAP access साठी
[App Password](https://myaccount.google.com/apppasswords) generate करावे लागेल.
तुमचा regular Gmail password काम करणार नाही. :::

### पायरी 3: Triggerfish कॉन्फिगर करा

तुमच्या `triggerfish.yaml` मध्ये Email channel जोडा:

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

Secrets (SMTP API key, IMAP password) `triggerfish config add-channel email`
दरम्यान enter केले जातात आणि OS keychain मध्ये stored असतात.

| Option           | Type   | Required    | वर्णन                                                        |
| ---------------- | ------ | ----------- | ------------------------------------------------------------ |
| `smtpApiUrl`     | string | हो          | SMTP relay API endpoint URL                                  |
| `imapHost`       | string | हो          | IMAP server hostname                                         |
| `imapPort`       | number | नाही        | IMAP server port (default: `993`)                            |
| `imapUser`       | string | हो          | IMAP username (सहसा तुमचा email address)                     |
| `fromAddress`    | string | हो          | Outgoing emails साठी From address                           |
| `pollInterval`   | number | नाही        | नवीन emails किती वेळाने तपासायचे, ms मध्ये (default: `30000`) |
| `classification` | string | नाही        | वर्गीकरण स्तर (default: `CONFIDENTIAL`)                      |
| `ownerEmail`     | string | शिफारस केलेले | Owner verification साठी तुमचा email address                  |

::: warning Credentials SMTP API key आणि IMAP password OS keychain मध्ये stored
आहेत (Linux: GNOME Keyring, macOS: Keychain Access). ते कधीही `triggerfish.yaml`
मध्ये दिसत नाहीत. :::

### पायरी 4: Triggerfish सुरू करा

```bash
triggerfish stop && triggerfish start
```

Connection confirm करण्यासाठी configured address वर email पाठवा.

## Owner Identity

Triggerfish sender चा email address configured `ownerEmail` शी compare करून
owner status निश्चित करतो:

- **Match** -- Message एक owner command आहे
- **No match** -- Message `PUBLIC` taint सह external input आहे

जर कोणताही `ownerEmail` configured नसेल, तर सर्व messages owner कडून येत असल्याचे
treat केले जाते.

## Domain-Based वर्गीकरण

अधिक granular control साठी, email domain-based recipient classification support
करतो. हे enterprise environments मध्ये विशेषतः उपयुक्त आहे:

- `@yourcompany.com` कडील emails `INTERNAL` म्हणून classify केले जाऊ शकतात
- Unknown domains कडील emails default वर `EXTERNAL` असतात
- Admin internal domains ची list configure करू शकतो

```yaml
channels:
  email:
    # ... other config
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

याचा अर्थ policy engine email कुठून येतो यावर आधारित वेगवेगळे नियम लागू करतो:

| Sender Domain              | वर्गीकरण   |
| -------------------------- | :--------: |
| Configured internal domain | `INTERNAL` |
| Unknown domain             | `EXTERNAL` |

## हे कसे काम करते

### Inbound Messages

Adapter configured interval वर (default: दर 30 seconds) IMAP server ला नवीन,
unread messages साठी poll करतो. नवीन email येतो तेव्हा:

1. Sender address काढला जातो
2. Owner status `ownerEmail` विरुद्ध check केला जातो
3. Email body message handler ला forward केला जातो
4. प्रत्येक email thread sender address वर आधारित session ID ला map केला जातो
   (`email-sender@example.com`)

### Outbound Messages

एजंट respond करताना, adapter configured SMTP relay HTTP API द्वारे reply पाठवतो.
Reply मध्ये समाविष्ट:

- **From** -- Configured `fromAddress`
- **To** -- Original sender चा email address
- **Subject** -- "Triggerfish" (default)
- **Body** -- एजंटचा response plain text म्हणून

## Poll Interval

Default poll interval 30 seconds आहे. तुम्ही हे तुमच्या गरजेनुसार adjust करू
शकता:

```yaml
channels:
  email:
    # ... other config
    pollInterval: 10000 # Check every 10 seconds
```

::: tip Responsiveness आणि Resources Balance करा कमी poll interval म्हणजे incoming
email ला जलद response, पण अधिक वारंवार IMAP connections. बहुतेक personal use
cases साठी, 30 seconds एक चांगला balance आहे. :::

## वर्गीकरण बदलणे

```yaml
channels:
  email:
    # ... other config
    classification: CONFIDENTIAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
