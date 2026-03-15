# Signal

Signal app இலிருந்து மக்கள் அதற்கு செய்தி அனுப்ப உங்கள் Triggerfish agent ஐ Signal உடன் இணைக்கவும். Adapter உங்கள் linked Signal phone number பயன்படுத்தி JSON-RPC மூலம் [signal-cli](https://github.com/AsamK/signal-cli) daemon உடன் தொடர்பு கொள்கிறது.

## Signal எவ்வாறு வேறுபட்டது

Signal adapter **உங்கள் phone number ஆகும்**. தனி bot account இருக்கும் Telegram அல்லது Slack போல் இல்லாமல், Signal செய்திகள் மற்றவர்களிடமிருந்து உங்கள் number க்கு வருகின்றன. இதன் பொருள்:

- அனைத்து inbound செய்திகளுக்கும் `isOwner: false` -- அவை எப்போதும் வேறு யாரோடமிருந்து
- Adapter உங்கள் phone number ஆக reply செய்கிறது
- மற்ற சேனல்கள் போல் per-message owner சரிபார்ப்பு இல்லை

இது உங்கள் number க்கு செய்தி அனுப்பும் contacts இடமிருந்து செய்திகள் பெறவும், agent உங்கள் சார்பாக respond செய்யவும் Signal ஐ சிறந்ததாக்குகிறது.

## Default Classification

Signal `PUBLIC` classification க்கு default ஆகும். அனைத்து inbound செய்திகளும் external contacts இடமிருந்து வருவதால், `PUBLIC` பாதுகாப்பான default.

## Setup

### படி 1: signal-cli நிறுவுவும்

signal-cli ஒரு third-party command-line client. Triggerfish TCP அல்லது Unix socket மூலம் அதனுடன் தொடர்பு கொள்கிறது.

**Linux (native build -- Java தேவையில்லை):**

[signal-cli releases](https://github.com/AsamK/signal-cli/releases) page இலிருந்து latest native build download செய்யவும், அல்லது setup போது Triggerfish அதை download செய்யட்டும்.

**macOS / other platforms (JVM build):**

Java 21+ தேவை. Java நிறுவப்படவில்லையென்றால் Triggerfish தானாக ஒரு portable JRE download செய்யலாம்.

Guided setup இயக்கலாம்:

```bash
triggerfish config add-channel signal
```

இது signal-cli சரிபார்க்கிறது, இல்லையென்றால் download செய்ய offer செய்கிறது, மற்றும் linking மூலம் உங்களை guide செய்கிறது.

### படி 2: உங்கள் Device Link செய்யவும்

signal-cli உங்கள் existing Signal account உடன் linked ஆக வேண்டும் (desktop app link செய்வது போல்):

```bash
signal-cli link -n "Triggerfish"
```

இது ஒரு `tsdevice:` URI print செய்கிறது. உங்கள் Signal mobile app உடன் QR code scan செய்யவும் (Settings > Linked Devices > Link New Device).

### படி 3: Daemon தொடங்கவும்

signal-cli Triggerfish இணைக்கும் ஒரு background daemon ஆக இயங்குகிறது:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

`+14155552671` ஐ E.164 format இல் உங்கள் phone number உடன் மாற்றவும்.

### படி 4: Triggerfish கட்டமைக்கவும்

உங்கள் `triggerfish.yaml` இல் Signal சேர்க்கவும்:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Option             | Type    | Required | விளக்கம்                                                                              |
| ------------------ | ------- | -------- | -------------------------------------------------------------------------------------- |
| `endpoint`         | string  | ஆம்      | signal-cli daemon address (`tcp://host:port` அல்லது `unix:///path/to/socket`)         |
| `account`          | string  | ஆம்      | உங்கள் Signal phone number (E.164 format)                                             |
| `classification`   | string  | இல்லை   | Classification ceiling (default: `PUBLIC`)                                             |
| `defaultGroupMode` | string  | இல்லை   | Group message கையாளுதல்: `always`, `mentioned-only`, `owner-only` (default: `always`) |
| `groups`           | object  | இல்லை   | Per-group configuration overrides                                                      |
| `ownerPhone`       | string  | இல்லை   | எதிர்கால பயன்பாட்டிற்கு reserved                                                      |
| `pairing`          | boolean | இல்லை   | Setup போது pairing mode enable செய்யவும்                                              |

### படி 5: Triggerfish தொடங்கவும்

```bash
triggerfish stop && triggerfish start
```

Connection ஐ உறுதிப்படுத்த மற்றொரு Signal பயனரிடமிருந்து உங்கள் phone number க்கு ஒரு செய்தி அனுப்பவும்.

## Group Messages

Signal group chats ஐ support செய்கிறது. Group செய்திகளுக்கு agent எவ்வாறு respond செய்கிறது என்பதை கட்டுப்படுத்தலாம்:

| Mode             | நடத்தை                                                     |
| ---------------- | ------------------------------------------------------------ |
| `always`         | அனைத்து group செய்திகளுக்கும் respond செய்யவும் (default)  |
| `mentioned-only` | Phone number அல்லது @mention மூலம் குறிப்பிடப்பட்டபோது மட்டும் respond செய்யவும் |
| `owner-only`     | Groups இல் ஒருபோதும் respond செய்யாதீர்கள்                |

Globally அல்லது per-group கட்டமைக்கவும்:

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

Group IDs base64-encoded identifiers. அவற்றை கண்டுபிடிக்க `triggerfish signal list-groups` பயன்படுத்தவும் அல்லது signal-cli documentation பாருங்கள்.

## Message Chunking

Signal க்கு 4,000-character message வரம்பு உள்ளது. இதை விட நீண்ட responses தானாக பல செய்திகளாக பிரிக்கப்படுகின்றன, படிக்கும் தன்மைக்கு newlines அல்லது spaces இல் பிரிக்கப்படுகின்றன.

## Typing Indicators

Adapter agent ஒரு request செயலாக்கும்போது typing indicators அனுப்புகிறது. Reply அனுப்பப்படும்போது Typing state clear ஆகிறது.

## Extended Tools

Signal adapter கூடுதல் tools expose செய்கிறது:

- `sendTyping` / `stopTyping` -- Manual typing indicator control
- `listGroups` -- Account member ஆக உள்ள அனைத்து Signal groups பட்டியலிடவும்
- `listContacts` -- அனைத்து Signal contacts பட்டியலிடவும்

## Classification மாற்றுதல்

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Valid நிலைகள்: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

மாற்றிய பிறகு daemon restart செய்யவும்: `triggerfish stop && triggerfish start`

## Reliability Features

Signal adapter பல reliability mechanisms சேர்க்கிறது:

### Auto-Reconnection

signal-cli உடனான connection குறைந்தால் (network interruption, daemon restart), adapter exponential backoff உடன் தானாக reconnect செய்கிறது. Manual intervention தேவையில்லை.

### Health Checking

Startup போது, Triggerfish JSON-RPC ping probe பயன்படுத்தி existing signal-cli daemon healthy ஆக உள்ளதா என்று சரிபார்க்கிறது. Daemon respond செய்யவில்லையென்றால், அது kill ஆகிறது மற்றும் தானாக restart ஆகிறது.

### Version Tracking

Triggerfish known-good signal-cli version ஐ track செய்கிறது (தற்போது 0.13.0) மற்றும் உங்கள் நிறுவப்பட்ட version பழையதென்றால் startup போது எச்சரிக்கிறது. ஒவ்வொரு வெற்றிகரமான connection இலும் signal-cli version log ஆகிறது.

### Unix Socket Support

TCP endpoints கூடுதலாக, adapter Unix domain sockets ஐ support செய்கிறது:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Troubleshooting

**signal-cli daemon அடையக்கூடியதில்லை:**

- Daemon இயங்குகிறதா என்று verify செய்யவும்: process சரிபார்க்கவும் அல்லது `nc -z 127.0.0.1 7583` முயற்சிக்கவும்
- signal-cli IPv4 மட்டும் bind செய்கிறது -- `localhost` அல்ல, `127.0.0.1` பயன்படுத்தவும்
- TCP default port 7583
- Triggerfish unhealthy process கண்டறிந்தால் daemon ஐ auto-restart செய்கிறது

**செய்திகள் வரவில்லை:**

- Device linked என்று உறுதிப்படுத்தவும்: Linked Devices இல் Signal mobile app சரிபார்க்கவும்
- signal-cli linking க்கு பிறகு குறைந்தது ஒரு sync பெற்றிருக்க வேண்டும்
- Connection errors க்காக logs சரிபார்க்கவும்: `triggerfish logs --tail`

**Java errors (JVM build மட்டும்):**

- signal-cli JVM build க்கு Java 21+ தேவை
- சரிபார்க்க `java -version` இயக்கவும்
- தேவைப்பட்டால் Triggerfish setup போது ஒரு portable JRE download செய்யலாம்

**Reconnection loops:**

- Logs இல் repeated reconnection attempts பார்த்தால், signal-cli daemon crash ஆகலாம்
- Errors க்காக signal-cli இன் சொந்த stderr output சரிபார்க்கவும்
- Fresh daemon உடன் restart முயற்சிக்கவும்: Triggerfish நிறுத்தவும், signal-cli kill செய்யவும், இரண்டையும் restart செய்யவும்
