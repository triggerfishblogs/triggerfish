# Multi-Channel جائزہ

Triggerfish آپ کے موجودہ messaging platforms سے جڑتا ہے۔ آپ اپنے ایجنٹ سے جہاں بھی
پہلے سے بات کرتے ہیں وہاں بات کریں — terminal، Telegram، Slack، Discord، WhatsApp،
web widget، یا email۔ ہر channel کا اپنا classification level، owner identity checks،
اور policy enforcement ہے۔

## Channels کیسے کام کرتے ہیں

ہر channel adapter وہی interface implement کرتا ہے: `connect`، `disconnect`، `send`،
`onMessage`، اور `status`۔ **Channel router** تمام adapters کے اوپر ہوتا ہے اور
message dispatch، classification checks، اور retry logic سنبھالتا ہے۔

<img src="/diagrams/channel-router.svg" alt="Channel router: all channel adapters flow through a central classification gate to the Gateway Server" style="max-width: 100%;" />

جب کسی channel پر پیغام آتا ہے، router:

1. **Code-level identity checks** کا استعمال کرتے ہوئے sender کی شناخت کرتا ہے (owner
   یا external) — LLM interpretation نہیں
2. پیغام کو channel کی classification level سے tag کرتا ہے
3. نافذ کاری کے لیے policy engine کو forward کرتا ہے
4. ایجنٹ کی response کو اسی channel کے ذریعے واپس route کرتا ہے

## Channel Classification

ہر channel کی ایک ڈیفالٹ classification level ہوتی ہے جو طے کرتی ہے کہ اس سے کیا
ڈیٹا بہہ سکتا ہے۔ Policy engine **no write-down قاعدہ** نافذ کرتی ہے: ایک دی گئی
classification سطح پر ڈیٹا کم classification والے channel کی طرف کبھی نہیں بہہ سکتا۔

| Channel                              | ڈیفالٹ Classification | Owner Detection                        |
| ------------------------------------ | :-------------------: | -------------------------------------- |
| [CLI](/ur-PK/channels/cli)           |       `INTERNAL`      | ہمیشہ owner (terminal user)            |
| [Telegram](/ur-PK/channels/telegram) |       `INTERNAL`      | Telegram user ID match                 |
| [Signal](/ur-PK/channels/signal)     |        `PUBLIC`       | کبھی owner نہیں (adapter آپ کا فون ہے) |
| [Slack](/ur-PK/channels/slack)       |        `PUBLIC`       | Slack user ID بذریعہ OAuth             |
| [Discord](/ur-PK/channels/discord)   |        `PUBLIC`       | Discord user ID match                  |
| [WhatsApp](/ur-PK/channels/whatsapp) |        `PUBLIC`       | Phone number match                     |
| [WebChat](/ur-PK/channels/webchat)   |        `PUBLIC`       | کبھی owner نہیں (زائرین)              |
| [Email](/ur-PK/channels/email)       |     `CONFIDENTIAL`    | Email address match                    |

::: tip مکمل طور پر قابل ترتیب تمام classifications آپ کی `triggerfish.yaml` میں
قابل ترتیب ہیں۔ آپ اپنی سیکیورٹی ضروریات کی بنیاد پر کسی بھی channel کو کوئی بھی
classification level دے سکتے ہیں۔

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Effective Classification

کسی بھی پیغام کی effective classification channel classification اور recipient
classification میں سے **کم** ہوتی ہے:

| Channel Level | Recipient Level | Effective Level |
| ------------- | --------------- | --------------- |
| INTERNAL      | INTERNAL        | INTERNAL        |
| INTERNAL      | EXTERNAL        | PUBLIC          |
| CONFIDENTIAL  | INTERNAL        | INTERNAL        |
| CONFIDENTIAL  | EXTERNAL        | PUBLIC          |

اس کا مطلب ہے کہ یہاں تک کہ اگر channel `CONFIDENTIAL` classified ہو، اس channel پر
external recipients کو پیغامات `PUBLIC` سمجھے جاتے ہیں۔

## Channel States

Channels مقررہ states سے گزرتے ہیں:

- **UNTRUSTED** — نئے یا نامعلوم channels یہاں سے شروع ہوتے ہیں۔ کوئی ڈیٹا اندر یا
  باہر نہیں بہتا۔ Channel مکمل isolated ہے جب تک آپ اسے classify نہ کریں۔
- **CLASSIFIED** — Channel کو classification level تفویض کی گئی ہے اور یہ فعال ہے۔
  پیغامات policy قواعد کے مطابق بہتے ہیں۔
- **BLOCKED** — Channel کو صراحتاً غیر فعال کیا گیا ہے۔ کوئی پیغام process نہیں ہوتے۔

::: warning UNTRUSTED Channels ایک `UNTRUSTED` channel ایجنٹ سے کوئی ڈیٹا receive
نہیں کر سکتا اور ایجنٹ کے context میں ڈیٹا نہیں بھیج سکتا۔ یہ ایک سخت سیکیورٹی حد
ہے، کوئی تجویز نہیں۔ :::

## Channel Router

Channel router تمام registered adapters کا انتظام کرتا ہے اور فراہم کرتا ہے:

- **Adapter registration** — Channel ID کے ذریعے channel adapters register اور
  unregister کریں
- **Message dispatch** — Outbound پیغامات کو صحیح adapter تک route کریں
- **Retry with exponential backoff** — ناکام sends کو بڑھتی ہوئی delays (1s، 2s، 4s)
  کے ساتھ 3 بار retry کیے جاتے ہیں
- **Bulk operations** — Lifecycle management کے لیے `connectAll()` اور `disconnectAll()`

```yaml
# Router retry behavior قابل ترتیب ہے
router:
  maxRetries: 3
  baseDelay: 1000 # milliseconds
```

## Ripple: Typing اور Presence

Triggerfish ان channels پر typing indicators اور presence state relay کرتا ہے جو انہیں
support کرتے ہیں۔ اسے **Ripple** کہتے ہیں۔

| Channel  | Typing Indicators   | Read Receipts |
| -------- | :-----------------: | :-----------: |
| Telegram | Send اور receive    |      ہاں      |
| Signal   | Send اور receive    |      --       |
| Slack    |     صرف Send        |      --       |
| Discord  |     صرف Send        |      --       |
| WhatsApp | Send اور receive    |      ہاں      |
| WebChat  | Send اور receive    |      ہاں      |

Agent presence states: `idle`، `online`، `away`، `busy`، `processing`، `speaking`، `error`۔

## Message Chunking

Platforms کی message length limits ہوتی ہیں۔ Triggerfish خود بخود لمبی responses کو
ہر platform کی constraints میں fit کرنے کے لیے chunk کرتا ہے، پڑھنے کے لیے newlines
یا spaces پر split کرتا ہے:

| Channel  | زیادہ سے زیادہ Message Length |
| -------- | :---------------------------: |
| Telegram |       4,096 حروف              |
| Signal   |       4,000 حروف              |
| Discord  |       2,000 حروف              |
| Slack    |      40,000 حروف              |
| WhatsApp |       4,096 حروف              |
| WebChat  |       لامحدود                 |

## اگلے اقدامات

وہ channels ترتیب دیں جو آپ استعمال کرتے ہیں:

- [CLI](/ur-PK/channels/cli) — ہمیشہ دستیاب، کوئی setup ضروری نہیں
- [Telegram](/ur-PK/channels/telegram) — @BotFather کے ذریعے bot بنائیں
- [Signal](/ur-PK/channels/signal) — signal-cli daemon کے ذریعے link کریں
- [Slack](/ur-PK/channels/slack) — Socket Mode کے ساتھ Slack app بنائیں
- [Discord](/ur-PK/channels/discord) — Discord bot application بنائیں
- [WhatsApp](/ur-PK/channels/whatsapp) — WhatsApp Business Cloud API کے ذریعے جڑیں
- [WebChat](/ur-PK/channels/webchat) — اپنی site پر chat widget embed کریں
- [Email](/ur-PK/channels/email) — IMAP اور SMTP relay کے ذریعے جڑیں
