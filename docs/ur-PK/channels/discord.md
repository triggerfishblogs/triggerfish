# Discord

اپنے Triggerfish ایجنٹ کو Discord سے جوڑیں تاکہ یہ server channels اور direct messages
میں respond کر سکے۔ Adapter Discord Gateway سے connect ہونے کے لیے
[discord.js](https://discord.js.org/) استعمال کرتا ہے۔

## ڈیفالٹ Classification

Discord ڈیفالٹ `PUBLIC` classification پر ہے۔ Discord servers میں اکثر trusted members
اور public visitors کا مرکب ہوتا ہے، اس لیے `PUBLIC` محفوظ ڈیفالٹ ہے۔ اگر آپ کا
server private اور trusted ہو تو آپ اسے بڑھا سکتے ہیں۔

## Setup

### قدم 1: Discord Application بنائیں

1. [Discord Developer Portal](https://discord.com/developers/applications) پر جائیں
2. **New Application** کلک کریں
3. اپنی application کا نام دیں (مثلاً، "Triggerfish")
4. **Create** کلک کریں

### قدم 2: Bot User بنائیں

1. اپنی application میں، sidebar میں **Bot** navigate کریں
2. **Add Bot** کلک کریں (اگر پہلے سے نہیں بنا)
3. Bot کے username کے نیچے، نیا token generate کرنے کے لیے **Reset Token** کلک کریں
4. **bot token** copy کریں

::: warning اپنا Token خفیہ رکھیں آپ کا bot token آپ کے bot پر مکمل control دیتا
ہے۔ اسے کبھی source control میں commit نہ کریں یا عوامی طور پر share نہ کریں۔ :::

### قدم 3: Privileged Intents Configure کریں

ابھی **Bot** page پر، یہ privileged gateway intents فعال کریں:

- **Message Content Intent** — پیغام کا مواد پڑھنے کے لیے ضروری
- **Server Members Intent** — اختیاری، member lookup کے لیے

### قدم 4: اپنا Discord User ID حاصل کریں

1. Discord کھولیں
2. **Settings** > **Advanced** پر جائیں اور **Developer Mode** فعال کریں
3. Discord میں کہیں بھی اپنا username کلک کریں
4. **Copy User ID** کلک کریں

یہ وہ snowflake ID ہے جو Triggerfish owner identity verify کرنے کے لیے استعمال کرتا ہے۔

### قدم 5: Invite Link بنائیں

1. Developer Portal میں، **OAuth2** > **URL Generator** navigate کریں
2. **Scopes** کے تحت، `bot` منتخب کریں
3. **Bot Permissions** کے تحت، منتخب کریں:
   - Send Messages
   - Read Message History
   - View Channels
4. Generated URL copy کریں اور اسے browser میں کھولیں
5. وہ server منتخب کریں جس میں bot شامل کرنا ہے اور **Authorize** کلک کریں

### قدم 6: Triggerfish Configure کریں

اپنی `triggerfish.yaml` میں Discord channel شامل کریں:

```yaml
channels:
  discord:
    # botToken OS keychain میں محفوظ
    ownerId: "123456789012345678"
```

| Option           | Type   | ضروری       | تفصیل                                                        |
| ---------------- | ------ | ----------- | ------------------------------------------------------------ |
| `botToken`       | string | ہاں         | Discord bot token                                            |
| `ownerId`        | string | تجویز کردہ  | Owner verification کے لیے آپ کی Discord user ID (snowflake) |
| `classification` | string | نہیں        | Classification level (ڈیفالٹ: `PUBLIC`)                     |

### قدم 7: Triggerfish شروع کریں

```bash
triggerfish stop && triggerfish start
```

Connection confirm کرنے کے لیے کسی channel میں پیغام بھیجیں جہاں bot موجود ہو، یا
اسے directly DM کریں۔

## Owner Identity

Triggerfish owner status sender کی Discord user ID کو configured `ownerId` سے compare
کر کے تعین کرتا ہے۔ یہ check LLM کے پیغام دیکھنے سے پہلے کوڈ میں ہوتا ہے:

- **Match** — پیغام ایک owner command ہے
- **No match** — پیغام `PUBLIC` taint کے ساتھ external input ہے

اگر کوئی `ownerId` configure نہیں کیا گیا، تمام پیغامات owner کی طرف سے سمجھے جاتے
ہیں۔

::: danger ہمیشہ Owner ID سیٹ کریں اگر آپ کا bot دوسرے members والے server میں ہو،
تو ہمیشہ `ownerId` configure کریں۔ اس کے بغیر، کوئی بھی server member آپ کے ایجنٹ
کو commands دے سکتا ہے۔ :::

## Message Chunking

Discord کی 2,000-character message limit ہے۔ جب ایجنٹ اس سے لمبی response generate
کرتا ہے، Triggerfish خود بخود اسے متعدد پیغامات میں split کرتا ہے۔ Chunker readability
برقرار رکھنے کے لیے newlines یا spaces پر split کرتا ہے۔

## Bot Behavior

Discord adapter:

- **اپنے پیغامات نظرانداز کرتا ہے** — Bot ان پیغامات پر respond نہیں کرتا جو یہ بھیجتا ہے
- **تمام accessible channels سنتا ہے** — Guild channels، group DMs، اور direct messages
- **Message Content Intent ضروری ہے** — اس کے بغیر، bot خالی message events receive
  کرتا ہے

## Typing Indicators

Triggerfish Discord کو typing indicators بھیجتا ہے جب ایجنٹ request process کر رہا
ہو۔ Discord bots کو users کے typing events قابل اعتماد طریقے سے expose نہیں کرتا،
اس لیے یہ صرف send ہے۔

## Group Chat

Bot server channels میں حصہ لے سکتا ہے۔ Group behavior configure کریں:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Behavior         | تفصیل                                           |
| ---------------- | ------------------------------------------------ |
| `mentioned-only` | صرف tab پر respond کریں جب bot کو @mention کیا جائے |
| `always`         | Channel میں تمام پیغامات پر respond کریں         |

## Classification تبدیل کرنا

```yaml
channels:
  discord:
    # botToken OS keychain میں محفوظ
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Valid levels: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`۔
