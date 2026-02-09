# Email

Connect your Triggerfish agent to email so it can receive messages via IMAP and send replies via an SMTP relay service. The adapter supports services like SendGrid, Mailgun, and Amazon SES for outbound email, and polls any IMAP server for inbound messages.

## Default Classification

Email defaults to `PUBLIC` classification. Email is inherently open -- anyone with your address can send you a message -- so `PUBLIC` is the safe default.

## Setup

### Step 1: Choose an SMTP Relay

Triggerfish sends outbound email through an HTTP-based SMTP relay API. Supported services include:

| Service | API Endpoint |
|---------|-------------|
| SendGrid | `https://api.sendgrid.com/v3/mail/send` |
| Mailgun | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages` |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Sign up for one of these services and obtain an API key.

### Step 2: Configure IMAP for Receiving

You need IMAP credentials for receiving email. Most email providers support IMAP:

| Provider | IMAP Host | Port |
|----------|-----------|------|
| Gmail | `imap.gmail.com` | 993 |
| Outlook | `outlook.office365.com` | 993 |
| Fastmail | `imap.fastmail.com` | 993 |
| Custom | Your mail server | 993 |

::: info Gmail App Passwords
If you use Gmail with 2-factor authentication, you will need to generate an [App Password](https://myaccount.google.com/apppasswords) for IMAP access. Your regular Gmail password will not work.
:::

### Step 3: Configure Triggerfish

Add the Email channel to your `triggerfish.yaml`:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    smtpApiKey: "your-sendgrid-api-key"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    imapPassword: "your-app-password"
    fromAddress: "triggerfish@yourdomain.com"
    ownerEmail: "you@gmail.com"
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `smtpApiUrl` | string | Yes | SMTP relay API endpoint URL |
| `smtpApiKey` | string | Yes | API key for the SMTP relay service |
| `imapHost` | string | Yes | IMAP server hostname |
| `imapPort` | number | No | IMAP server port (default: `993`) |
| `imapUser` | string | Yes | IMAP username (usually your email address) |
| `imapPassword` | string | Yes | IMAP password or app-specific password |
| `fromAddress` | string | Yes | From address for outgoing emails |
| `pollInterval` | number | No | How often to check for new emails, in ms (default: `30000`) |
| `classification` | string | No | Classification level (default: `PUBLIC`) |
| `ownerEmail` | string | Recommended | Your email address for owner verification |

::: warning Store Credentials Securely
Email credentials include passwords and API keys. Never commit them to source control. Use environment variables or your OS keychain.
:::

### Step 4: Start Triggerfish

```bash
triggerfish stop && triggerfish start
```

Send an email to the configured address to confirm the connection.

## Owner Identity

Triggerfish determines owner status by comparing the sender's email address against the configured `ownerEmail`:

- **Match** -- The message is an owner command
- **No match** -- The message is external input with `PUBLIC` taint

If no `ownerEmail` is configured, all messages are treated as coming from the owner.

## Domain-Based Classification

For more granular control, email supports domain-based recipient classification. This is especially useful in enterprise environments:

- Emails from `@yourcompany.com` can be classified as `INTERNAL`
- Emails from unknown domains default to `EXTERNAL`
- Admin can configure a list of internal domains

```yaml
channels:
  email:
    # ... other config
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

This means the policy engine applies different rules based on where an email comes from:

| Sender Domain | Classification |
|---------------|:--------------:|
| Configured internal domain | `INTERNAL` |
| Unknown domain | `EXTERNAL` |

## How It Works

### Inbound Messages

The adapter polls the IMAP server at the configured interval (default: every 30 seconds) for new, unread messages. When a new email arrives:

1. The sender address is extracted
2. Owner status is checked against `ownerEmail`
3. The email body is forwarded to the message handler
4. Each email thread is mapped to a session ID based on the sender address (`email-sender@example.com`)

### Outbound Messages

When the agent responds, the adapter sends the reply via the configured SMTP relay HTTP API. The reply includes:

- **From** -- The configured `fromAddress`
- **To** -- The original sender's email address
- **Subject** -- "Triggerfish" (default)
- **Body** -- The agent's response as plain text

## Poll Interval

The default poll interval is 30 seconds. You can adjust this based on your needs:

```yaml
channels:
  email:
    # ... other config
    pollInterval: 10000   # Check every 10 seconds
```

::: tip Balance Responsiveness and Resources
A shorter poll interval means faster response to incoming email, but more frequent IMAP connections. For most personal use cases, 30 seconds is a good balance.
:::

## Changing Classification

```yaml
channels:
  email:
    # ... other config
    classification: CONFIDENTIAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
