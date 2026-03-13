# Signal

तुमच्या Triggerfish एजंटला Signal शी जोडा जेणेकरून लोक Signal app वरून त्याला
message करू शकतात. Adapter तुमच्या linked Signal phone number वापरून
[signal-cli](https://github.com/AsamK/signal-cli) daemon शी JSON-RPC वर communicate
करतो.

## Signal कसे वेगळे आहे

Signal adapter **तुमचा** phone number आहे. Telegram किंवा Slack च्या विपरीत जिथे
वेगळे bot account असते, Signal messages इतर लोक तुमच्या number वर पाठवतात. याचा
अर्थ:

- सर्व inbound messages मध्ये `isOwner: false` आहे -- ते नेहमी दुसऱ्या कोणाकडून असतात
- Adapter तुमच्या phone number म्हणून reply करतो
- इतर channels सारखी per-message owner check नाही

हे Signal ला त्या contacts कडून messages प्राप्त करण्यासाठी ideal बनवते जे तुमच्या
number वर message करतात, एजंट तुमच्या वतीने respond करतो.

## Default वर्गीकरण

Signal default वर `PUBLIC` वर्गीकरण आहे. सर्व inbound messages external contacts
कडून येत असल्याने, `PUBLIC` हा safe default आहे.

## सेटअप

### पायरी 1: signal-cli इन्स्टॉल करा

signal-cli हा Signal साठी एक third-party command-line client आहे. Triggerfish
TCP किंवा Unix socket वर त्याच्याशी communicate करतो.

**Linux (native build -- Java आवश्यक नाही):**

[signal-cli releases](https://github.com/AsamK/signal-cli/releases) page वरून
latest native build download करा, किंवा setup दरम्यान Triggerfish ते तुमच्यासाठी
download करू द्या.

**macOS / इतर platforms (JVM build):**

Java 21+ आवश्यक आहे. Java install नसल्यास Triggerfish आपोआप portable JRE
download करू शकतो.

तुम्ही guided setup देखील चालवू शकता:

```bash
triggerfish config add-channel signal
```

हे signal-cli साठी तपासते, missing असल्यास download करण्याची offer करते, आणि
linking through walk करते.

### पायरी 2: तुमचे Device Link करा

signal-cli तुमच्या existing Signal account शी linked असणे आवश्यक आहे (desktop
app link केल्यासारखे):

```bash
signal-cli link -n "Triggerfish"
```

हे `tsdevice:` URI print करते. तुमच्या Signal mobile app सह QR code scan करा
(Settings > Linked Devices > Link New Device).

### पायरी 3: Daemon सुरू करा

signal-cli एक background daemon म्हणून चालतो ज्याशी Triggerfish connect होतो:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

`+14155552671` ला E.164 format मध्ये तुमच्या phone number ने replace करा.

### पायरी 4: Triggerfish कॉन्फिगर करा

तुमच्या `triggerfish.yaml` मध्ये Signal जोडा:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Option             | Type    | Required | वर्णन                                                                                   |
| ------------------ | ------- | -------- | --------------------------------------------------------------------------------------- |
| `endpoint`         | string  | हो       | signal-cli daemon address (`tcp://host:port` किंवा `unix:///path/to/socket`)            |
| `account`          | string  | हो       | तुमचा Signal phone number (E.164 format)                                               |
| `classification`   | string  | नाही     | Classification ceiling (default: `PUBLIC`)                                              |
| `defaultGroupMode` | string  | नाही     | Group message handling: `always`, `mentioned-only`, `owner-only` (default: `always`)    |
| `groups`           | object  | नाही     | Per-group configuration overrides                                                       |
| `ownerPhone`       | string  | नाही     | भविष्यातील वापरासाठी reserved                                                           |
| `pairing`          | boolean | नाही     | Setup दरम्यान pairing mode सक्षम करा                                                   |

### पायरी 5: Triggerfish सुरू करा

```bash
triggerfish stop && triggerfish start
```

Connection confirm करण्यासाठी दुसऱ्या Signal user कडून तुमच्या phone number वर
message पाठवा.

## Group Messages

Signal group chats support करतो. तुम्ही एजंट group messages ला कसे respond करतो
ते control करू शकता:

| Mode             | वर्तन                                                          |
| ---------------- | --------------------------------------------------------------- |
| `always`         | सर्व group messages ला respond करा (default)                    |
| `mentioned-only` | फक्त phone number किंवा @mention द्वारे mentioned असताना respond करा |
| `owner-only`     | Groups मध्ये कधीही respond करू नका                              |

Globally किंवा per-group configure करा:

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

Group IDs base64-encoded identifiers आहेत. ते शोधण्यासाठी
`triggerfish signal list-groups` वापरा किंवा signal-cli documentation तपासा.

## Message Chunking

Signal ला 4,000-character message limit आहे. यापेक्षा जास्त responses
आपोआप अनेक messages मध्ये split केले जातात, readability साठी newlines किंवा
spaces वर break करून.

## Typing Indicators

Adapter एजंट request process करत असताना typing indicators पाठवतो. Reply
पाठवल्यावर typing state clear होतो.

## Extended Tools

Signal adapter अतिरिक्त tools expose करतो:

- `sendTyping` / `stopTyping` -- Manual typing indicator control
- `listGroups` -- Account member असलेल्या सर्व Signal groups ची list करा
- `listContacts` -- सर्व Signal contacts ची list करा

## वर्गीकरण बदलणे

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Daemon restart करा: `triggerfish stop && triggerfish start`

## Reliability Features

Signal adapter मध्ये अनेक reliability mechanisms आहेत:

### Auto-Reconnection

जर signal-cli शी connection drop झाले (network interruption, daemon restart),
adapter आपोआप exponential backoff सह reconnect करतो. Manual intervention
आवश्यक नाही.

### Health Checking

Startup वर, Triggerfish JSON-RPC ping probe वापरून existing signal-cli daemon
healthy आहे का ते check करतो. Daemon unresponsive असल्यास, ते kill करून
आपोआप restart केले जाते.

### Version Tracking

Triggerfish known-good signal-cli version (currently 0.13.0) track करतो आणि
तुमची installed version जुनी असल्यास startup वर warn करतो. Signal-cli version
प्रत्येक successful connection वर log केली जाते.

### Unix Socket Support

TCP endpoints व्यतिरिक्त, adapter Unix domain sockets support करतो:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Troubleshooting

**signal-cli daemon reachable नाही:**

- Daemon चालू आहे का ते verify करा: process तपासा किंवा `nc -z 127.0.0.1 7583` try करा
- signal-cli फक्त IPv4 bind करतो -- `localhost` नाही, `127.0.0.1` वापरा
- TCP default port 7583 आहे
- Triggerfish unhealthy process detect केल्यास daemon auto-restart करेल

**Messages येत नाहीत:**

- Device linked आहे का ते confirm करा: Signal mobile app मध्ये Linked Devices तपासा
- Linking नंतर signal-cli ने किमान एक sync receive केलेले असणे आवश्यक आहे
- Connection errors साठी logs तपासा: `triggerfish logs --tail`

**Java errors (JVM build only):**

- signal-cli JVM build साठी Java 21+ आवश्यक आहे
- Check करण्यासाठी `java -version` run करा
- Triggerfish setup दरम्यान portable JRE download करू शकतो

**Reconnection loops:**

- जर logs मध्ये repeated reconnection attempts दिसत असतील, तर signal-cli daemon
  crash होत असेल
- signal-cli च्या स्वतःच्या stderr output मध्ये errors तपासा
- Fresh daemon सह restart try करा: Triggerfish stop करा, signal-cli kill करा, दोन्ही restart करा
