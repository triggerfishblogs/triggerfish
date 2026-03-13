# Signal

ನಿಮ್ಮ Triggerfish agent ಅನ್ನು Signal ಗೆ ಸಂಪರ್ಕಿಸಿ ಜನರು Signal app ನಿಂದ message ಮಾಡಲು
ಅನುಮತಿಸಿ. Adapter ನಿಮ್ಮ linked Signal phone number ಬಳಸಿ JSON-RPC ಮೂಲಕ
[signal-cli](https://github.com/AsamK/signal-cli) daemon ನೊಂದಿಗೆ ಸಂವಾದಿಸುತ್ತದೆ.

## Signal ಹೇಗೆ ಭಿನ್ನ

Signal adapter **ನಿಮ್ಮ phone number**. Telegram ಅಥವಾ Slack ನಲ್ಲಿ ಪ್ರತ್ಯೇಕ bot account
ಇರುವಂತೆ ಅಲ್ಲ, Signal messages ಇತರ ಜನರಿಂದ ನಿಮ್ಮ number ಗೆ ಬರುತ್ತವೆ. ಇದರರ್ಥ:

- ಎಲ್ಲ inbound messages `isOwner: false` ಹೊಂದಿರುತ್ತವೆ -- ಅವು ಯಾವಾಗಲೂ ಬೇರೆ ಯಾರಿಂದಲೋ
- Adapter ನಿಮ್ಮ phone number ಮೂಲಕ reply ಮಾಡುತ್ತದೆ
- ಇತರ channels ತರಹ per-message owner check ಇಲ್ಲ

ಇದು Signal ಅನ್ನು ನಿಮ್ಮ number ಗೆ message ಮಾಡುವ contacts ನಿಂದ messages ಸ್ವೀಕರಿಸಲು ideal
ಮಾಡುತ್ತದೆ, agent ನಿಮ್ಮ ಪರವಾಗಿ respond ಮಾಡುತ್ತದೆ.

## Default Classification

Signal `PUBLIC` classification ಗೆ default ಆಗುತ್ತದೆ. ಎಲ್ಲ inbound messages external contacts
ನಿಂದ ಬರುವ ಕಾರಣ, `PUBLIC` ಸುರಕ್ಷಿತ default.

## Setup

### Step 1: signal-cli Install ಮಾಡಿ

signal-cli Signal ಗಾಗಿ third-party command-line client. Triggerfish TCP ಅಥವಾ Unix socket
ಮೂಲಕ ಅದರೊಂದಿಗೆ ಸಂವಾದಿಸುತ್ತದೆ.

**Linux (native build -- Java ಅಗತ್ಯವಿಲ್ಲ):**

[signal-cli releases](https://github.com/AsamK/signal-cli/releases) page ನಿಂದ latest
native build download ಮಾಡಿ, ಅಥವಾ setup ಸಮಯದಲ್ಲಿ Triggerfish download ಮಾಡಲಿ.

**macOS / ಇತರ platforms (JVM build):**

Java 21+ ಅಗತ್ಯ. Java install ಆಗಿಲ್ಲದಿದ್ದರೆ Triggerfish ಸ್ವಯಂಚಾಲಿತವಾಗಿ portable JRE
download ಮಾಡಬಹುದು.

ನೀವು guided setup ಕೂಡ ಚಲಿಸಬಹುದು:

```bash
triggerfish config add-channel signal
```

ಇದು signal-cli check ಮಾಡಿ, missing ಆಗಿದ್ದರೆ download ಮಾಡಲು offer ಮಾಡಿ, linking ಮೂಲಕ
ನಡೆಯುತ್ತದೆ.

### Step 2: ನಿಮ್ಮ Device Link ಮಾಡಿ

signal-cli ನಿಮ್ಮ ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ Signal account ಗೆ linked ಆಗಬೇಕು (desktop app link
ಮಾಡಿದಂತೆ):

```bash
signal-cli link -n "Triggerfish"
```

ಇದು `tsdevice:` URI print ಮಾಡುತ್ತದೆ. QR code ಅನ್ನು Signal mobile app ನಿಂದ scan ಮಾಡಿ
(Settings > Linked Devices > Link New Device).

### Step 3: Daemon ಪ್ರಾರಂಭಿಸಿ

Triggerfish ಸಂಪರ್ಕಿಸುವ background daemon ಆಗಿ signal-cli ಚಲಿಸುತ್ತದೆ:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

`+14155552671` ಅನ್ನು E.164 format ನಲ್ಲಿ ನಿಮ್ಮ phone number ನೊಂದಿಗೆ replace ಮಾಡಿ.

### Step 4: Triggerfish Configure ಮಾಡಿ

ನಿಮ್ಮ `triggerfish.yaml` ಗೆ Signal ಸೇರಿಸಿ:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Option             | Type    | Required | ವಿವರಣೆ                                                                                     |
| ------------------ | ------- | -------- | ------------------------------------------------------------------------------------------- |
| `endpoint`         | string  | ಹೌದು      | signal-cli daemon address (`tcp://host:port` ಅಥವಾ `unix:///path/to/socket`)                |
| `account`          | string  | ಹೌದು      | ನಿಮ್ಮ Signal phone number (E.164 format)                                                    |
| `classification`   | string  | ಇಲ್ಲ      | Classification ceiling (default: `PUBLIC`)                                                  |
| `defaultGroupMode` | string  | ಇಲ್ಲ      | Group message handling: `always`, `mentioned-only`, `owner-only` (default: `always`)        |
| `groups`           | object  | ಇಲ್ಲ      | Per-group configuration overrides                                                           |

### Step 5: Triggerfish ಪ್ರಾರಂಭಿಸಿ

```bash
triggerfish stop && triggerfish start
```

Connection confirm ಮಾಡಲು ಬೇರೆ Signal user ನಿಂದ ನಿಮ್ಮ phone number ಗೆ message ಕಳುಹಿಸಿ.

## Group Messages

Signal group chats ಬೆಂಬಲಿಸುತ್ತದೆ. Group messages ಗೆ agent ಹೇಗೆ respond ಮಾಡುತ್ತದೆ ಎಂದು
control ಮಾಡಬಹುದು:

| Mode             | ನಡವಳಿಕೆ                                                    |
| ---------------- | ---------------------------------------------------------- |
| `always`         | ಎಲ್ಲ group messages ಗೆ respond ಮಾಡಿ (default)              |
| `mentioned-only` | Phone number ಅಥವಾ @mention ಮೂಲಕ mentioned ಆದಾಗ ಮಾತ್ರ respond |
| `owner-only`     | Groups ನಲ್ಲಿ ಎಂದಿಗೂ respond ಮಾಡಬೇಡ                         |

Globally ಅಥವಾ per-group configure ಮಾಡಿ:

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

Group IDs base64-encoded identifiers. ಅವನ್ನು ಕಂಡುಹಿಡಿಯಲು `triggerfish signal list-groups`
ಬಳಸಿ ಅಥವಾ signal-cli documentation ನೋಡಿ.

## Message Chunking

Signal ಗೆ 4,000-character message limit ಇದೆ. ಇದಕ್ಕಿಂತ ಉದ್ದ responses ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಅನೇಕ
messages ಗೆ split ಮಾಡಲ್ಪಡುತ್ತವೆ, ಓದಲು newlines ಅಥವಾ spaces ನಲ್ಲಿ break ಮಾಡಿ.

## Typing Indicators

Agent request ಸಂಸ್ಕರಿಸುತ್ತಿರುವಾಗ adapter typing indicators ಕಳುಹಿಸುತ್ತದೆ. Reply ಕಳುಹಿಸಿದಾಗ
Typing state clear ಆಗುತ್ತದೆ.

## Extended Tools

Signal adapter ಹೆಚ್ಚುವರಿ tools expose ಮಾಡುತ್ತದೆ:

- `sendTyping` / `stopTyping` -- Manual typing indicator control
- `listGroups` -- Account member ಆಗಿರುವ ಎಲ್ಲ Signal groups ಪಟ್ಟಿ
- `listContacts` -- ಎಲ್ಲ Signal contacts ಪಟ್ಟಿ

## Classification ಬದಲಾಯಿಸಿ

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

ಬದಲಾಯಿಸಿದ ನಂತರ daemon restart ಮಾಡಿ: `triggerfish stop && triggerfish start`

## Reliability ವೈಶಿಷ್ಟ್ಯಗಳು

Signal adapter ಹಲವು reliability mechanisms ಒಳಗೊಳ್ಳುತ್ತದೆ:

### Auto-Reconnection

signal-cli ಗೆ connection drop ಆದರೆ (network interruption, daemon restart), adapter
exponential backoff ನೊಂದಿಗೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ reconnect ಮಾಡುತ್ತದೆ. Manual intervention
ಅಗತ್ಯವಿಲ್ಲ.

### Health Checking

Startup ನಲ್ಲಿ, JSON-RPC ping probe ಬಳಸಿ ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ signal-cli daemon healthy ಎಂದು
Triggerfish check ಮಾಡುತ್ತದೆ. Daemon unresponsive ಆಗಿದ್ದರೆ, ಸ್ವಯಂಚಾಲಿತವಾಗಿ kill ಮತ್ತು
restart ಮಾಡಲ್ಪಡುತ್ತದೆ.

### Version Tracking

Triggerfish known-good signal-cli version (ಪ್ರಸ್ತುತ 0.13.0) track ಮಾಡುತ್ತದೆ ಮತ್ತು
install ಆದ version ಹಳೆಯದಾಗಿದ್ದರೆ startup ನಲ್ಲಿ warn ಮಾಡುತ್ತದೆ.

### Unix Socket Support

TCP endpoints ಜೊತೆಗೆ, adapter Unix domain sockets ಬೆಂಬಲಿಸುತ್ತದೆ:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Troubleshooting

**signal-cli daemon reach ಆಗುತ್ತಿಲ್ಲ:**

- Daemon ಚಲಿಸುತ್ತಿದೆ ಎಂದು verify ಮಾಡಿ: process ಗಾಗಿ check ಮಾಡಿ ಅಥವಾ `nc -z 127.0.0.1 7583` try ಮಾಡಿ
- signal-cli IPv4 ಮಾತ್ರ bind ಮಾಡುತ್ತದೆ -- `localhost` ಅಲ್ಲ, `127.0.0.1` ಬಳಸಿ
- TCP default port 7583
- Unhealthy process ಪತ್ತೆ ಮಾಡಿದರೆ Triggerfish daemon auto-restart ಮಾಡುತ್ತದೆ

**Messages ಬರುತ್ತಿಲ್ಲ:**

- Device linked ಎಂದು confirm ಮಾಡಿ: Signal mobile app ನ Linked Devices ಅಡಿ check ಮಾಡಿ
- Linking ನಂತರ signal-cli ಕನಿಷ್ಟ ಒಂದು sync ಸ್ವೀಕರಿಸಿರಬೇಕು
- Connection errors ಗಾಗಿ logs check ಮಾಡಿ: `triggerfish logs --tail`

**Java errors (JVM build ಮಾತ್ರ):**

- signal-cli JVM build Java 21+ ಅಗತ್ಯ
- Check ಮಾಡಲು `java -version` ಚಲಿಸಿ
- Setup ಸಮಯದಲ್ಲಿ Java ಅಗತ್ಯವಿದ್ದರೆ Triggerfish portable JRE download ಮಾಡಬಹುದು
