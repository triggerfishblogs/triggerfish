# Signal

Connect your Triggerfish agent to Signal so people can message it from the Signal app. The adapter communicates with a [signal-cli](https://github.com/AsamK/signal-cli) daemon over JSON-RPC, using your linked Signal phone number.

## How Signal Is Different

The Signal adapter **is** your phone number. Unlike Telegram or Slack where a separate bot account exists, Signal messages come from other people to your number. This means:

- All inbound messages have `isOwner: false` -- they are always from someone else
- The adapter replies as your phone number
- There is no per-message owner check like other channels

This makes Signal ideal for receiving messages from contacts who message your number, with the agent responding on your behalf.

## Default Classification

Signal defaults to `PUBLIC` classification. Since all inbound messages come from external contacts, `PUBLIC` is the safe default.

## Setup

### Step 1: Install signal-cli

signal-cli is a third-party command-line client for Signal. Triggerfish communicates with it over a TCP or Unix socket.

**Linux (native build -- no Java needed):**

Download the latest native build from the [signal-cli releases](https://github.com/AsamK/signal-cli/releases) page, or let Triggerfish download it for you during setup.

**macOS / other platforms (JVM build):**

Requires Java 21+. Triggerfish can download a portable JRE automatically if Java is not installed.

You can also run the guided setup:

```bash
triggerfish config add-channel signal
```

This checks for signal-cli, offers to download it if missing, and walks you through linking.

### Step 2: Link Your Device

signal-cli must be linked to your existing Signal account (like linking a desktop app):

```bash
signal-cli link -n "Triggerfish"
```

This prints a `tsdevice:` URI. Scan the QR code with your Signal mobile app (Settings > Linked Devices > Link New Device).

### Step 3: Start the Daemon

signal-cli runs as a background daemon that Triggerfish connects to:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Replace `+14155552671` with your phone number in E.164 format.

### Step 4: Configure Triggerfish

Add Signal to your `triggerfish.yaml`:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `endpoint` | string | Yes | signal-cli daemon address (`tcp://host:port` or `unix:///path/to/socket`) |
| `account` | string | Yes | Your Signal phone number (E.164 format) |
| `classification` | string | No | Classification ceiling (default: `PUBLIC`) |
| `defaultGroupMode` | string | No | Group message handling: `always`, `mentioned-only`, `owner-only` (default: `always`) |
| `groups` | object | No | Per-group configuration overrides |
| `ownerPhone` | string | No | Reserved for future use |
| `pairing` | boolean | No | Enable pairing mode during setup |

### Step 5: Start Triggerfish

```bash
triggerfish stop && triggerfish start
```

Send a message to your phone number from another Signal user to confirm the connection.

## Group Messages

Signal supports group chats. You can control how the agent responds to group messages:

| Mode | Behavior |
|------|----------|
| `always` | Respond to all group messages (default) |
| `mentioned-only` | Only respond when mentioned by phone number or @mention |
| `owner-only` | Never respond in groups |

Configure globally or per-group:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

Group IDs are base64-encoded identifiers. Use `triggerfish signal list-groups` or check the signal-cli documentation to find them.

## Message Chunking

Signal has a 4,000-character message limit. Responses longer than this are automatically split into multiple messages, breaking on newlines or spaces for readability.

## Typing Indicators

The adapter sends typing indicators while the agent is processing a request. Typing state clears when the reply is sent.

## Extended Tools

The Signal adapter exposes additional tools:

- `sendTyping` / `stopTyping` -- Manual typing indicator control
- `listGroups` -- List all Signal groups the account is a member of
- `listContacts` -- List all Signal contacts

## Changing Classification

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Restart the daemon after changing: `triggerfish stop && triggerfish start`

## Troubleshooting

**signal-cli daemon not reachable:**
- Verify the daemon is running: check for the process or try `nc -z 127.0.0.1 7583`
- signal-cli binds IPv4 only -- use `127.0.0.1`, not `localhost`
- TCP default port is 7583

**Messages not arriving:**
- Confirm the device is linked: check Signal mobile app under Linked Devices
- signal-cli must have received at least one sync after linking

**Java errors (JVM build only):**
- signal-cli JVM build requires Java 21+
- Run `java -version` to check
- Triggerfish can download a portable JRE during setup if needed
