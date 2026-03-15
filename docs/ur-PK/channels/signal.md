# Signal

اپنے Triggerfish ایجنٹ کو Signal سے جوڑیں تاکہ لوگ Signal app سے اسے پیغام کر
سکیں۔ Adapter آپ کے linked Signal phone number کا استعمال کرتے ہوئے JSON-RPC کے ذریعے
[signal-cli](https://github.com/AsamK/signal-cli) daemon سے communicate کرتا ہے۔

## Signal کیسے مختلف ہے

Signal adapter **آپ کا** phone number ہے۔ Telegram یا Slack کے برعکس جہاں ایک الگ
bot account ہوتا ہے، Signal پیغامات دوسرے لوگ آپ کے number پر بھیجتے ہیں۔ اس کا مطلب:

- تمام inbound پیغامات کا `isOwner: false` ہوتا ہے — یہ ہمیشہ کسی اور کی طرف سے ہوتے ہیں
- Adapter آپ کے phone number کے طور پر reply کرتا ہے
- دوسرے channels کی طرح کوئی per-message owner check نہیں ہوتا

یہ Signal کو ان contacts سے پیغامات receive کرنے کے لیے مثالی بناتا ہے جو آپ کے
number کو پیغام کرتے ہیں، ایجنٹ آپ کی طرف سے respond کرتا ہے۔

## ڈیفالٹ Classification

Signal ڈیفالٹ `PUBLIC` classification پر ہے۔ چونکہ تمام inbound پیغامات external
contacts سے آتے ہیں، `PUBLIC` محفوظ ڈیفالٹ ہے۔

## Setup

### قدم 1: signal-cli انسٹال کریں

signal-cli Signal کا ایک third-party command-line client ہے۔ Triggerfish TCP یا Unix
socket کے ذریعے اس سے communicate کرتا ہے۔

**Linux (native build — کوئی Java ضروری نہیں):**

[signal-cli releases](https://github.com/AsamK/signal-cli/releases) page سے latest
native build download کریں، یا setup کے دوران Triggerfish کو یہ کرنے دیں۔

**macOS / دیگر platforms (JVM build):**

Java 21+ درکار ہے۔ Triggerfish اگر Java install نہیں تو setup کے دوران automatically
portable JRE download کر سکتا ہے۔

آپ guided setup بھی چلا سکتے ہیں:

```bash
triggerfish config add-channel signal
```

یہ signal-cli چیک کرتا ہے، نہ ہونے پر download کرنے کی پیشکش کرتا ہے، اور آپ کو
linking میں رہنمائی کرتا ہے۔

### قدم 2: اپنا Device Link کریں

signal-cli کو آپ کے existing Signal account سے linked ہونا چاہیے (جیسے desktop app
link کرنا):

```bash
signal-cli link -n "Triggerfish"
```

یہ ایک `tsdevice:` URI print کرتا ہے۔ QR code کو اپنی Signal mobile app سے scan کریں
(Settings > Linked Devices > Link New Device)۔

### قدم 3: Daemon شروع کریں

signal-cli ایک background daemon کے طور پر چلتا ہے جس سے Triggerfish connect ہوتا ہے:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

`+14155552671` کو اپنے E.164 format میں phone number سے replace کریں۔

### قدم 4: Triggerfish Configure کریں

اپنی `triggerfish.yaml` میں Signal شامل کریں:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Option             | Type    | ضروری   | تفصیل                                                                                         |
| ------------------ | ------- | ------- | --------------------------------------------------------------------------------------------- |
| `endpoint`         | string  | ہاں     | signal-cli daemon address (`tcp://host:port` یا `unix:///path/to/socket`)                    |
| `account`          | string  | ہاں     | آپ کا Signal phone number (E.164 format)                                                      |
| `classification`   | string  | نہیں    | Classification ceiling (ڈیفالٹ: `PUBLIC`)                                                    |
| `defaultGroupMode` | string  | نہیں    | Group message handling: `always`، `mentioned-only`، `owner-only` (ڈیفالٹ: `always`)         |
| `groups`           | object  | نہیں    | Per-group configuration overrides                                                             |
| `ownerPhone`       | string  | نہیں    | مستقبل کے استعمال کے لیے محفوظ                                                               |
| `pairing`          | boolean | نہیں    | Setup کے دوران pairing mode فعال کریں                                                         |

### قدم 5: Triggerfish شروع کریں

```bash
triggerfish stop && triggerfish start
```

Connection confirm کرنے کے لیے کسی دوسرے Signal user سے اپنے phone number کو پیغام
بھیجیں۔

## Group Messages

Signal group chats support کرتا ہے۔ آپ control کر سکتے ہیں کہ ایجنٹ group messages کا
کیسے جواب دے:

| Mode             | رویہ                                                         |
| ---------------- | ------------------------------------------------------------ |
| `always`         | تمام group messages پر respond کریں (ڈیفالٹ)               |
| `mentioned-only` | صرف تب respond کریں جب phone number یا @mention سے mention ہوں |
| `owner-only`     | Groups میں کبھی respond نہ کریں                              |

Globally یا per-group configure کریں:

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

Group IDs base64-encoded identifiers ہیں۔ انہیں تلاش کرنے کے لیے `triggerfish signal list-groups`
استعمال کریں یا signal-cli documentation چیک کریں۔

## Message Chunking

Signal کی 4,000-character message limit ہے۔ اس سے لمبی responses خود بخود متعدد
messages میں split ہوتی ہیں، readability کے لیے newlines یا spaces پر break کرتی ہیں۔

## Typing Indicators

Adapter request process کرتے وقت typing indicators بھیجتا ہے۔ Reply بھیجنے پر
Typing state صاف ہو جاتی ہے۔

## Extended Tools

Signal adapter اضافی tools expose کرتا ہے:

- `sendTyping` / `stopTyping` — Manual typing indicator control
- `listGroups` — تمام Signal groups فہرست کریں جن کا account member ہے
- `listContacts` — تمام Signal contacts فہرست کریں

## Classification تبدیل کرنا

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Valid levels: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`۔

تبدیلی کے بعد daemon restart کریں: `triggerfish stop && triggerfish start`

## Reliability خصوصیات

Signal adapter میں کئی reliability mechanisms ہیں:

### Auto-Reconnection

اگر signal-cli سے connection ڈراپ ہو (network interruption، daemon restart)، adapter
exponential backoff کے ساتھ automatically reconnect کرتا ہے۔ کوئی manual intervention
ضروری نہیں۔

### Health Checking

Startup پر، Triggerfish JSON-RPC ping probe استعمال کر کے چیک کرتا ہے کہ existing
signal-cli daemon healthy ہے یا نہیں۔ اگر daemon unresponsive ہو، تو اسے kill کر کے
automatically restart کیا جاتا ہے۔

### Version Tracking

Triggerfish known-good signal-cli version (فی الحال 0.13.0) track کرتا ہے اور startup
پر warn کرتا ہے اگر آپ کی installed version پرانی ہو۔ ہر کامیاب connection پر
signal-cli version logged ہوتی ہے۔

### Unix Socket Support

TCP endpoints کے علاوہ، adapter Unix domain sockets support کرتا ہے:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Troubleshooting

**signal-cli daemon قابل رسائی نہیں:**

- Verify کریں کہ daemon چل رہا ہے: process چیک کریں یا `nc -z 127.0.0.1 7583` آزمائیں
- signal-cli صرف IPv4 bind کرتا ہے — `localhost` نہیں، `127.0.0.1` استعمال کریں
- TCP ڈیفالٹ port 7583 ہے
- Triggerfish unhealthy process detect ہونے پر daemon auto-restart کرے گا

**پیغامات نہیں آ رہے:**

- Confirm کریں کہ device linked ہے: Signal mobile app میں Linked Devices چیک کریں
- signal-cli کو linking کے بعد کم از کم ایک sync receive کرنی چاہیے تھی
- Connection errors کے لیے logs چیک کریں: `triggerfish logs --tail`

**Java errors (صرف JVM build):**

- signal-cli JVM build کے لیے Java 21+ ضروری ہے
- `java -version` چلائیں چیک کرنے کے لیے
- Triggerfish setup کے دوران ضرورت پڑنے پر portable JRE download کر سکتا ہے

**Reconnection loops:**

- اگر آپ logs میں بار بار reconnection کوششیں دیکھیں، signal-cli daemon crash ہو رہا ہو گا
- signal-cli کی اپنی stderr output errors کے لیے چیک کریں
- تازہ daemon کے ساتھ restart آزمائیں: Triggerfish بند کریں، signal-cli بند کریں،
  دونوں restart کریں
