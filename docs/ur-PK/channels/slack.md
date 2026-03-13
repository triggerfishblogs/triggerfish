# Slack

اپنے Triggerfish ایجنٹ کو Slack سے جوڑیں تاکہ آپ کا ایجنٹ workspace conversations میں
حصہ لے سکے۔ Adapter Socket Mode کے ساتھ [Bolt](https://slack.dev/bolt-js/) framework
استعمال کرتا ہے، جس کا مطلب ہے کوئی public URL یا webhook endpoint ضروری نہیں۔

## ڈیفالٹ Classification

Slack ڈیفالٹ `PUBLIC` classification پر ہے۔ یہ اس حقیقت کی عکاسی کرتا ہے کہ Slack
workspaces میں اکثر external guests، Slack Connect users، اور shared channels شامل
ہوتے ہیں۔ اگر آپ کا workspace سختی سے internal ہو تو آپ اسے `INTERNAL` یا اونچا کر
سکتے ہیں۔

## Setup

### قدم 1: Slack App بنائیں

1. [api.slack.com/apps](https://api.slack.com/apps) پر جائیں
2. **Create New App** کلک کریں
3. **From scratch** منتخب کریں
4. اپنی app کا نام دیں (مثلاً، "Triggerfish") اور اپنا workspace منتخب کریں
5. **Create App** کلک کریں

### قدم 2: Bot Token Scopes Configure کریں

Sidebar میں **OAuth & Permissions** navigate کریں اور مندرجہ ذیل **Bot Token Scopes**
شامل کریں:

| Scope              | مقصد                             |
| ------------------ | --------------------------------- |
| `chat:write`       | پیغامات بھیجنا                    |
| `channels:history` | Public channels میں پیغامات پڑھنا |
| `groups:history`   | Private channels میں پیغامات پڑھنا |
| `im:history`       | Direct messages پڑھنا             |
| `mpim:history`     | Group direct messages پڑھنا       |
| `channels:read`    | Public channels فہرست کرنا        |
| `groups:read`      | Private channels فہرست کرنا       |
| `im:read`          | Direct message conversations فہرست |
| `users:read`       | User information تلاش کرنا        |

### قدم 3: Socket Mode فعال کریں

1. Sidebar میں **Socket Mode** navigate کریں
2. **Enable Socket Mode** toggle کو on کریں
3. آپ سے **App-Level Token** بنانے کو کہا جائے گا — اسے نام دیں (مثلاً،
   "triggerfish-socket") اور `connections:write` scope شامل کریں
4. Generated **App Token** copy کریں (`xapp-` سے شروع)

### قدم 4: Events فعال کریں

1. Sidebar میں **Event Subscriptions** navigate کریں
2. **Enable Events** toggle کو on کریں
3. **Subscribe to bot events** کے تحت، شامل کریں:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### قدم 5: اپنے Credentials حاصل کریں

آپ کو تین values چاہیے:

- **Bot Token** — **OAuth & Permissions** پر جائیں، **Install to Workspace** کلک کریں،
  پھر **Bot User OAuth Token** copy کریں (`xoxb-` سے شروع)
- **App Token** — قدم 3 میں بنایا ہوا token (`xapp-` سے شروع)
- **Signing Secret** — **Basic Information** پر جائیں، **App Credentials** تک scroll کریں،
  **Signing Secret** copy کریں

### قدم 6: اپنا Slack User ID حاصل کریں

Owner identity configure کرنے کے لیے:

1. Slack کھولیں
2. اوپر دائیں میں اپنی profile picture کلک کریں
3. **Profile** کلک کریں
4. تین dots menu کلک کریں اور **Copy member ID** منتخب کریں

### قدم 7: Triggerfish Configure کریں

اپنی `triggerfish.yaml` میں Slack channel شامل کریں:

```yaml
channels:
  slack:
    # botToken، appToken، signingSecret OS keychain میں محفوظ
    ownerId: "U01234ABC"
```

Secrets (bot token، app token، signing secret) `triggerfish config add-channel slack`
کے دوران درج کیے جاتے ہیں اور OS keychain میں محفوظ ہوتے ہیں۔

| Option           | Type   | ضروری       | تفصیل                                           |
| ---------------- | ------ | ----------- | ------------------------------------------------- |
| `ownerId`        | string | تجویز کردہ  | Owner verification کے لیے آپ کی Slack member ID   |
| `classification` | string | نہیں        | Classification level (ڈیفالٹ: `PUBLIC`)           |

::: warning Secrets محفوظ طریقے سے Store کریں Tokens یا secrets کو کبھی source control
میں commit نہ کریں۔ Environment variables یا OS keychain استعمال کریں۔ تفصیلات کے
لیے [Secrets Management](/ur-PK/security/secrets) دیکھیں۔ :::

### قدم 8: Bot کو Invite کریں

Bot کسی channel میں پیغامات پڑھنے یا بھیجنے سے پہلے، آپ کو اسے invite کرنا ہوگا:

1. وہ Slack channel کھولیں جس میں bot چاہیے
2. `/invite @Triggerfish` (یا جو بھی آپ نے app کا نام رکھا) ٹائپ کریں

Bot کسی channel میں invite کیے بغیر بھی direct messages receive کر سکتا ہے۔

### قدم 9: Triggerfish شروع کریں

```bash
triggerfish stop && triggerfish start
```

Connection confirm کرنے کے لیے کسی channel میں پیغام بھیجیں جہاں bot موجود ہو، یا
اسے directly DM کریں۔

## Owner Identity

Triggerfish owner verification کے لیے Slack OAuth flow استعمال کرتا ہے۔ جب پیغام آتا
ہے، adapter sender کی Slack user ID کو configured `ownerId` سے compare کرتا ہے:

- **Match** — Owner command
- **No match** — `PUBLIC` taint کے ساتھ External input

### Workspace Membership

Recipient classification کے لیے، Slack workspace membership طے کرتی ہے کہ user
`INTERNAL` ہے یا `EXTERNAL`:

- باقاعدہ workspace members `INTERNAL` ہیں
- Slack Connect external users `EXTERNAL` ہیں
- Guest users `EXTERNAL` ہیں

## Message Limits

Slack 40,000 characters تک کے پیغامات support کرتا ہے۔ اس limit سے زیادہ پیغامات
truncate ہوتے ہیں۔ زیادہ تر agent responses کے لیے یہ limit کبھی نہیں پہنچتی۔

## Typing Indicators

Triggerfish Slack کو typing indicators بھیجتا ہے جب ایجنٹ request process کر رہا ہو۔
Slack bots کو incoming typing events expose نہیں کرتا، اس لیے یہ صرف send ہے۔

## Group Chat

Bot group channels میں حصہ لے سکتا ہے۔ اپنی `triggerfish.yaml` میں group behavior
configure کریں:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Behavior         | تفصیل                                   |
| ---------------- | ---------------------------------------- |
| `mentioned-only` | صرف tab پر respond کریں جب bot کو @mention کیا جائے |
| `always`         | Channel میں تمام پیغامات پر respond کریں |

## Classification تبدیل کرنا

```yaml
channels:
  slack:
    classification: INTERNAL
```

Valid levels: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`۔
