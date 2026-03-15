# No Write-Down قاعدہ

No-write-down قاعدہ Triggerfish کے ڈیٹا تحفظ ماڈل کی بنیاد ہے۔ یہ ایک مقررہ،
غیر قابل ترتیب قاعدہ ہے جو ہر session، ہر channel، اور ہر agent پر لاگو ہوتا ہے —
بغیر کسی استثناء اور کوئی LLM override کیے بغیر۔

**قاعدہ:** ڈیٹا صرف **برابر یا اونچی** classification سطح والے channels اور recipients
کی طرف بہہ سکتا ہے۔

یہ واحد قاعدہ ڈیٹا leakage کے پوری ایک class کے scenarios کو روکتا ہے، غیر ارادی
oversharing سے لے کر حساس معلومات exfiltrate کرنے کے لیے design کیے گئے sophisticated
prompt injection attacks تک۔

## Classification کا بہاؤ

Triggerfish چار classification سطحیں استعمال کرتا ہے (سب سے اونچی سے سب سے کم تک):

<img src="/diagrams/write-down-rules.svg" alt="Write-down rules: data flows only to equal or higher classification levels" style="max-width: 100%;" />

کسی دی گئی سطح پر classified ڈیٹا اس سطح یا اس سے اوپر کسی بھی سطح کی طرف بہہ سکتا
ہے۔ یہ کبھی نیچے نہیں بہہ سکتا۔ یہ no-write-down قاعدہ ہے۔

::: danger No-write-down قاعدہ **مقررہ اور غیر قابل ترتیب** ہے۔ اسے administrators
نرم نہیں کر سکتے، policy قواعد override نہیں کر سکتے، اور LLM bypass نہیں کر سکتا۔
یہ وہ architectural بنیاد ہے جس پر تمام دیگر سیکیورٹی کنٹرولز قائم ہیں۔ :::

## Effective Classification

جب ڈیٹا سسٹم چھوڑنے والا ہو، Triggerfish منزل کی **effective classification** compute
کرتا ہے:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

Channel اور recipient دونوں کو ڈیٹا کی classification سطح پر یا اس سے اوپر ہونا چاہیے۔
اگر کوئی ایک بھی نیچے ہو، تو output blocked ہو جاتا ہے۔

| Channel              | Recipient                    | Effective Classification |
| -------------------- | ---------------------------- | ------------------------ |
| INTERNAL (Slack)     | INTERNAL (coworker)          | INTERNAL                 |
| INTERNAL (Slack)     | EXTERNAL (vendor)            | PUBLIC                   |
| CONFIDENTIAL (Slack) | INTERNAL (coworker)          | INTERNAL                 |
| CONFIDENTIAL (Email) | EXTERNAL (personal contact)  | PUBLIC                   |

::: info ایک EXTERNAL recipient والے CONFIDENTIAL channel کی effective classification
PUBLIC ہے۔ اگر session نے PUBLIC سے اوپر کوئی ڈیٹا access کیا ہو، تو output blocked ہو
جاتا ہے۔ :::

## حقیقی دنیا کی مثال

یہاں ایک ٹھوس منظر ہے جو no-write-down قاعدے کو عمل میں دکھاتا ہے۔

```
User: "Check my Salesforce pipeline"

Agent: [accesses Salesforce via user's delegated token]
       [Salesforce data classified as CONFIDENTIAL]
       [session taint escalates to CONFIDENTIAL]

       "You have 3 deals closing this week totaling $2.1M..."

User: "Send a message to my wife that I'll be late tonight"

Policy layer: BLOCKED
  - Session taint: CONFIDENTIAL
  - Recipient (wife): EXTERNAL
  - Effective classification: PUBLIC
  - CONFIDENTIAL > PUBLIC --> write-down violation

Agent: "I can't send to external contacts in this session
        because we accessed confidential data.

        -> Reset session and send message
        -> Cancel"
```

User نے Salesforce ڈیٹا access کیا (CONFIDENTIAL classified)، جس نے پوری session کو
taint کر دیا۔ جب انہوں نے پھر ایک بیرونی contact کو پیغام بھیجنے کی کوشش کی (effective
classification PUBLIC)، تو policy layer نے output blocked کر دیا کیونکہ CONFIDENTIAL
ڈیٹا PUBLIC منزل کی طرف نہیں بہہ سکتا۔

::: tip بیوی کو ایجنٹ کا پیغام ("I'll be late tonight") خود Salesforce ڈیٹا نہیں
رکھتا۔ لیکن session پہلے Salesforce access سے tainted ہو چکا ہے، اور پوری session context
— بشمول Salesforce response سے LLM نے جو کچھ retain کیا ہو — output کو متاثر کر سکتا
ہے۔ No-write-down قاعدہ context leakage کی اس پوری class کو روکتا ہے۔ :::

## User کو کیا نظر آتا ہے

جب no-write-down قاعدہ کوئی عمل block کرتا ہے، تو user کو واضح، قابل عمل پیغام ملتا ہے۔
Triggerfish دو response modes پیش کرتا ہے:

**ڈیفالٹ (مخصوص):**

```
I can't send confidential data to a public channel.

-> Reset session and send message
-> Cancel
```

**تعلیمی (ترتیب کے ذریعے opt-in):**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  - Reset session and send message
  - Ask your admin to reclassify the WhatsApp channel
  - Learn more: https://trigger.fish/security/no-write-down
```

دونوں صورتوں میں، user کو واضح اختیارات دیے جاتے ہیں۔ انہیں کبھی الجھن میں نہیں چھوڑا
جاتا کہ کیا ہوا یا اس کے بارے میں کیا کریں۔

## Session Reset

جب user "Reset session and send message" منتخب کرتا ہے، Triggerfish ایک **مکمل reset**
کرتا ہے:

1. Session taint PUBLIC پر واپس صاف ہو جاتا ہے
2. پوری conversation history صاف ہو جاتی ہے (context leakage روکنا)
3. درخواست کردہ عمل پھر تازہ session کے خلاف re-evaluate ہوتا ہے
4. اگر عمل اب اجازت یافتہ ہو (PUBLIC ڈیٹا PUBLIC channel کو)، تو آگے بڑھتا ہے

::: warning سیکیورٹی Session reset taint **اور** conversation history دونوں صاف کرتا
ہے۔ یہ اختیاری نہیں ہے۔ اگر صرف taint label صاف کیا جائے جبکہ conversation context
رہے، تو LLM پھر بھی پہلے کے پیغامات سے classified معلومات کا حوالہ دے سکتا ہے، reset
کے مقصد کو ناکام بناتا ہے۔ :::

## نافذ کاری کیسے کام کرتی ہے

No-write-down قاعدہ `PRE_OUTPUT` hook پر نافذ ہوتا ہے — کوئی ڈیٹا سسٹم چھوڑنے سے
پہلے آخری enforcement نقطہ۔ Hook synchronous، یقینی کوڈ کے طور پر چلتا ہے:

```typescript
// آسان نافذ کاری logic
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Session taint (${sessionTaint}) exceeds effective ` +
        `classification (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Classification check passed" };
}
```

یہ کوڈ:

- **یقینی** ہے — ایک ہی inputs ہمیشہ ایک ہی فیصلہ دیتے ہیں
- **Synchronous** ہے — کوئی output بھیجنے سے پہلے hook مکمل ہو جاتا ہے
- **Unforgeable** ہے — LLM hook کے فیصلے کو متاثر نہیں کر سکتا
- **Logged** ہے — ہر execution مکمل context کے ساتھ recorded ہوتا ہے

## Session Taint اور Escalation

Session taint session کے دوران access کیے گئے ڈیٹا کی سب سے زیادہ classification سطح
track کرتا ہے۔ یہ دو سخت قواعد پر عمل کرتا ہے:

1. **صرف Escalation** — taint session میں بڑھ سکتا ہے، کبھی کم نہیں ہو سکتا
2. **خودکار** — taint `POST_TOOL_RESPONSE` hook کے ذریعے اپ ڈیٹ ہوتا ہے جب بھی
   ڈیٹا session میں داخل ہو

| عمل                                | Taint پہلے | Taint بعد                |
| ---------------------------------- | ---------- | ------------------------ |
| Weather API access (PUBLIC)        | PUBLIC     | PUBLIC                   |
| اندرونی wiki access (INTERNAL)     | PUBLIC     | INTERNAL                 |
| Salesforce access (CONFIDENTIAL)   | INTERNAL   | CONFIDENTIAL             |
| Weather API دوبارہ access (PUBLIC) | CONFIDENTIAL | CONFIDENTIAL (بدلا نہیں) |

ایک بار session CONFIDENTIAL پہنچنے پر، یہ CONFIDENTIAL رہتا ہے جب تک user صراحتاً
reset نہ کرے۔ کوئی خودکار decay نہیں، کوئی timeout نہیں، اور LLM taint کم کرنے کا
کوئی طریقہ نہیں۔

## یہ قاعدہ مقررہ کیوں ہے

No-write-down قاعدہ قابل ترتیب نہیں ہے کیونکہ اسے قابل ترتیب بنانا پوری سیکیورٹی
ماڈل کو کمزور کر دے گا۔ اگر کوئی administrator ایک استثناء بنا سکے — "اس ایک integration
کے لیے CONFIDENTIAL ڈیٹا PUBLIC channels تک بہنے دیں" — تو وہ استثناء ایک attack surface
بن جاتا ہے۔

Triggerfish میں ہر دوسرا سیکیورٹی کنٹرول اس مفروضے پر بنا ہے کہ no-write-down قاعدہ
مطلق ہے۔ Session taint، data lineage، agent delegation ceilings، اور audit logging سب
اس پر منحصر ہیں۔ اسے قابل ترتیب بنانے کے لیے پوری architecture پر نظر ثانی درکار ہوگی۔

::: info Administrators channels، recipients، اور integrations کو تفویض کردہ classification
سطحیں **configure** کر سکتے ہیں۔ ڈیٹا بہاؤ کو adjust کرنے کا یہ صحیح طریقہ ہے: اگر
کوئی channel زیادہ classified ڈیٹا receive کرنا چاہیے، تو channel کو اونچی سطح پر
classify کریں۔ قاعدہ خود مقررہ رہتا ہے؛ قاعدے کے inputs قابل ترتیب ہیں۔ :::

## متعلقہ صفحات

- [سیکیورٹی-اول ڈیزائن](./) — سیکیورٹی architecture کا جائزہ
- [Identity اور Auth](./identity) — channel identity کیسے قائم ہوتی ہے
- [Audit اور Compliance](./audit-logging) — blocked actions کیسے recorded ہوتے ہیں
- [Architecture: Taint اور Sessions](/ur-PK/architecture/taint-and-sessions) — session taint mechanics کی تفصیل
