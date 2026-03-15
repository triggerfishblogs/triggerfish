# Telegram

اپنے Triggerfish ایجنٹ کو Telegram سے جوڑیں تاکہ آپ اسے کسی بھی device سے interact
کر سکیں جہاں آپ Telegram استعمال کرتے ہیں۔ Adapter Telegram Bot API سے communicate
کرنے کے لیے [grammY](https://grammy.dev/) framework استعمال کرتا ہے۔

## Setup

### قدم 1: Bot بنائیں

1. Telegram کھولیں اور [@BotFather](https://t.me/BotFather) تلاش کریں
2. `/newbot` بھیجیں
3. اپنے bot کے لیے display name منتخب کریں (مثلاً، "My Triggerfish")
4. اپنے bot کے لیے username منتخب کریں (`bot` پر ختم ہونا چاہیے، مثلاً،
   `my_triggerfish_bot`)
5. BotFather آپ کا **bot token** reply میں دے گا — اسے copy کریں

::: warning اپنا Token خفیہ رکھیں آپ کا bot token آپ کے bot پر مکمل control دیتا
ہے۔ اسے کبھی source control میں commit نہ کریں یا عوامی طور پر share نہ کریں۔
Triggerfish اسے آپ کے OS keychain میں محفوظ کرتا ہے۔ :::

### قدم 2: اپنا Telegram User ID حاصل کریں

Triggerfish کو آپ کے numeric user ID کی ضرورت ہے تاکہ verify کرے کہ پیغامات آپ کی
طرف سے ہیں۔ Telegram usernames تبدیل کیے جا سکتے ہیں اور شناخت کے لیے قابل اعتماد
نہیں — numeric ID مستقل ہے اور Telegram کے servers تفویض کرتے ہیں، اس لیے اسے
spoof نہیں کیا جا سکتا۔

1. Telegram پر [@getmyid_bot](https://t.me/getmyid_bot) تلاش کریں
2. اسے کوئی بھی پیغام بھیجیں
3. یہ آپ کا user ID reply کرتا ہے (`8019881968` جیسا نمبر)

### قدم 3: Channel شامل کریں

Interactive setup چلائیں:

```bash
triggerfish config add-channel telegram
```

یہ آپ کا bot token، user ID، اور classification level پوچھتا ہے، پھر `triggerfish.yaml`
میں config لکھتا ہے اور daemon restart کرنے کی پیشکش کرتا ہے۔

آپ یہ manually بھی شامل کر سکتے ہیں:

```yaml
channels:
  telegram:
    # botToken OS keychain میں محفوظ
    ownerId: 8019881968
    classification: INTERNAL
```

| Option           | Type   | ضروری    | تفصیل                                          |
| ---------------- | ------ | -------- | ----------------------------------------------- |
| `botToken`       | string | ہاں      | @BotFather سے Bot API token                     |
| `ownerId`        | number | ہاں      | آپ کا numeric Telegram user ID                  |
| `classification` | string | نہیں     | Classification ceiling (ڈیفالٹ: `INTERNAL`)     |

### قدم 4: Chat شروع کریں

Daemon restart کے بعد، Telegram میں اپنا bot کھولیں اور `/start` بھیجیں۔ Bot confirm
کرنے کے لیے سلام کرے گا کہ connection live ہے۔ آپ پھر براہ راست اپنے ایجنٹ سے chat
کر سکتے ہیں۔

## Classification Behavior

`classification` setting ایک **ceiling** ہے — یہ **owner** conversations کے لیے اس
channel سے بہنے والے ڈیٹا کی زیادہ سے زیادہ sensitivity control کرتی ہے۔ یہ تمام
users پر یکساں لاگو نہیں ہوتی۔

**فی پیغام کیسے کام کرتا ہے:**

- **آپ bot کو پیغام کرتے ہیں** (آپ کا user ID `ownerId` سے match کرتا ہے): Session
  channel ceiling استعمال کرتا ہے۔ ڈیفالٹ `INTERNAL` کے ساتھ، آپ کا ایجنٹ آپ کے
  ساتھ internal-level ڈیٹا share کر سکتا ہے۔
- **کوئی اور bot کو پیغام کرتا ہے**: ان کی session خود بخود channel classification کے
  باوجود `PUBLIC` tainted ہوتی ہے۔ No-write-down قاعدہ کسی بھی internal ڈیٹا کو
  ان کی session تک پہنچنے سے روکتا ہے۔

اس کا مطلب ہے ایک Telegram bot محفوظ طریقے سے owner اور non-owner دونوں conversations
سنبھال سکتا ہے۔ Identity check LLM کے پیغام دیکھنے سے پہلے کوڈ میں ہوتی ہے — LLM
اسے متاثر نہیں کر سکتا۔

| Channel Classification |   Owner Messages     | Non-Owner Messages |
| ---------------------- | :------------------: | :----------------: |
| `PUBLIC`               |       PUBLIC         |       PUBLIC       |
| `INTERNAL` (ڈیفالٹ)   | INTERNAL تک          |       PUBLIC       |
| `CONFIDENTIAL`         | CONFIDENTIAL تک      |       PUBLIC       |
| `RESTRICTED`           | RESTRICTED تک        |       PUBLIC       |

مکمل model کے لیے [Classification System](/ur-PK/architecture/classification) اور taint
escalation کیسے کام کرتی ہے اس کے لیے [Sessions & Taint](/ur-PK/architecture/taint-and-sessions)
دیکھیں۔

## Owner Identity

Triggerfish owner status sender کے numeric Telegram user ID کو configured `ownerId`
سے compare کر کے تعین کرتا ہے۔ یہ check LLM کے پیغام دیکھنے سے **پہلے** کوڈ میں ہوتا ہے:

- **Match** — پیغام owner tagged ہوتا ہے اور channel کی classification ceiling تک ڈیٹا
  access کر سکتا ہے
- **No match** — پیغام `PUBLIC` taint کے ساتھ tagged ہوتا ہے، اور no-write-down قاعدہ
  کسی بھی classified ڈیٹا کو اس session تک بہنے سے روکتا ہے

::: danger ہمیشہ اپنا Owner ID سیٹ کریں `ownerId` کے بغیر، Triggerfish **تمام** senders
کو owner سمجھتا ہے۔ جو بھی آپ کا bot تلاش کرے channel کی classification سطح تک آپ کا
ڈیٹا access کر سکتا ہے۔ اس وجہ سے یہ field setup کے دوران ضروری ہے۔ :::

## Message Chunking

Telegram کی 4,096-character message limit ہے۔ جب آپ کا ایجنٹ اس سے لمبی response
generate کرتا ہے، Triggerfish خود بخود اسے متعدد پیغامات میں split کرتا ہے۔ Chunker
پڑھنے کے لیے newlines یا spaces پر split کرتا ہے — یہ words یا sentences کو بیچ میں
کاٹنے سے گریز کرتا ہے۔

## Support کردہ Message Types

Telegram adapter فی الحال handle کرتا ہے:

- **Text messages** — مکمل send اور receive support
- **Long responses** — Telegram کی limits میں fit ہونے کے لیے خود بخود chunked

## Typing Indicators

جب آپ کا ایجنٹ request process کر رہا ہو، bot Telegram chat میں "typing..." دکھاتا
ہے۔ Indicator اس وقت تک چلتا ہے جب LLM response generate کر رہا ہو اور reply بھیجنے
پر صاف ہو جاتا ہے۔

## Classification تبدیل کرنا

Classification ceiling بڑھانے یا کم کرنے کے لیے:

```bash
triggerfish config add-channel telegram
# Prompt ہونے پر موجودہ config overwrite منتخب کریں
```

یا `triggerfish.yaml` براہ راست edit کریں:

```yaml
channels:
  telegram:
    # botToken OS keychain میں محفوظ
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Valid levels: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`۔

تبدیلی کے بعد daemon restart کریں: `triggerfish stop && triggerfish start`
