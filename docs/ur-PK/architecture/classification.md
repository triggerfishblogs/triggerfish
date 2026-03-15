# Classification سسٹم

ڈیٹا classification سسٹم Triggerfish کے سیکیورٹی ماڈل کی بنیاد ہے۔ سسٹم میں داخل
ہونے، اس سے گزرنے، یا باہر جانے والا ہر ڈیٹا classification label لے جاتا ہے۔ یہ labels
طے کرتے ہیں کہ ڈیٹا کہاں بہہ سکتا ہے — اور سب سے اہم بات، کہاں نہیں بہہ سکتا۔

## Classification سطحیں

Triggerfish تمام deployments کے لیے ایک واحد چار درجاتی ترتیب شدہ hierarchy استعمال کرتا ہے۔

| سطح            | درجہ         | وضاحت                                               | مثالیں                                                               |
| -------------- | ------------ | --------------------------------------------------- | -------------------------------------------------------------------- |
| `RESTRICTED`   | 4 (سب سے اونچا) | سب سے حساس ڈیٹا جس کے لیے زیادہ سے زیادہ تحفظ درکار | M&A دستاویزات، board materials، PII، بینک accounts، طبی ریکارڈز    |
| `CONFIDENTIAL` | 3            | کاروباری یا ذاتی طور پر حساس معلومات               | CRM ڈیٹا، مالیات، HR ریکارڈز، contracts، ٹیکس ریکارڈز             |
| `INTERNAL`     | 2            | بیرونی شراکت کے لیے نہیں                           | اندرونی wikis، team دستاویزات، ذاتی نوٹس، contacts                 |
| `PUBLIC`       | 1 (سب سے کم) | سب کے دیکھنے کے لیے محفوظ                          | مارکیٹنگ مواد، عوامی documentation، عام ویب مواد                   |

## No Write-Down قاعدہ

Triggerfish میں سب سے اہم سیکیورٹی invariant:

::: danger ڈیٹا صرف **برابر یا اونچی** classification والے channels یا recipients کی
طرف بہہ سکتا ہے۔ یہ ایک **مقررہ قاعدہ** ہے — اسے configure، override، یا disable نہیں
کیا جا سکتا۔ LLM اس فیصلے کو متاثر نہیں کر سکتا۔ :::

<img src="/diagrams/classification-hierarchy.svg" alt="Classification hierarchy: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Data flows upward only." style="max-width: 100%;" />

اس کا مطلب ہے:

- `CONFIDENTIAL` ڈیٹا پر مشتمل response `PUBLIC` چینل کو نہیں بھیجی جا سکتی
- `RESTRICTED` تک tainted session `RESTRICTED` سے نیچے کسی بھی channel کو output نہیں
  کر سکتا
- کوئی admin override نہیں، کوئی enterprise escape hatch نہیں، اور کوئی LLM workaround نہیں

## Effective Classification

Channels اور recipients دونوں classification سطحیں لے جاتے ہیں۔ جب ڈیٹا سسٹم چھوڑنے
والا ہو، تو منزل کی **effective classification** طے کرتی ہے کہ کیا بھیجا جا سکتا ہے:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

Effective classification دونوں میں سے _کم_ ہے۔ اس کا مطلب ہے کہ low-classification
recipient والا high-classification channel پھر بھی low-classification سمجھا جاتا ہے۔

| Channel        | Recipient  | Effective      | CONFIDENTIAL ڈیٹا مل سکتا ہے؟    |
| -------------- | ---------- | -------------- | ---------------------------------- |
| `INTERNAL`     | `INTERNAL` | `INTERNAL`     | نہیں (CONFIDENTIAL > INTERNAL)    |
| `INTERNAL`     | `EXTERNAL` | `PUBLIC`       | نہیں                               |
| `CONFIDENTIAL` | `INTERNAL` | `INTERNAL`     | نہیں (CONFIDENTIAL > INTERNAL)    |
| `CONFIDENTIAL` | `EXTERNAL` | `PUBLIC`       | نہیں                               |
| `RESTRICTED`   | `INTERNAL` | `INTERNAL`     | نہیں (CONFIDENTIAL > INTERNAL)    |

## Channel Classification قواعد

ہر channel type اپنی classification سطح طے کرنے کے لیے مخصوص قواعد رکھتی ہے۔

### Email

- **Domain matching**: `@company.com` پیغامات `INTERNAL` classify ہوتے ہیں
- Admin ترتیب دیتا ہے کہ کون سے domains اندرونی ہیں
- نامعلوم یا بیرونی domains `EXTERNAL` پر ڈیفالٹ کرتے ہیں
- بیرونی recipients effective classification کو `PUBLIC` تک کم کرتے ہیں

### Slack / Teams

- **Workspace membership**: ایک ہی workspace/tenant کے ممبران `INTERNAL` ہیں
- Slack Connect بیرونی users `EXTERNAL` classify ہوتے ہیں
- Guest users `EXTERNAL` classify ہوتے ہیں
- Classification platform API سے derived، LLM interpretation سے نہیں

### WhatsApp / Telegram / iMessage

- **Enterprise**: HR directory sync کے خلاف match کیے گئے phone numbers اندرونی بمقابلہ
  بیرونی طے کرتے ہیں
- **Personal**: تمام recipients ڈیفالٹ `EXTERNAL`
- Users قابل اعتماد contacts mark کر سکتے ہیں، لیکن یہ classification math نہیں بدلتا —
  یہ recipient classification بدلتا ہے

### WebChat

- WebChat زائرین ہمیشہ `PUBLIC` classify ہوتے ہیں (زائرین مالک کے طور پر کبھی
  verified نہیں ہوتے)
- WebChat عوامی تعاملات کے لیے ہے

### CLI

- CLI channel مقامی طور پر چلتا ہے اور authenticated user کی بنیاد پر classify ہوتا ہے
- Direct terminal access عام طور پر `INTERNAL` یا اونچا ہوتا ہے

## Recipient Classification کے ذرائع

### Enterprise

- **Directory sync** (Okta، Azure AD، Google Workspace) خود بخود recipient classifications
  populate کرتا ہے
- تمام directory members `INTERNAL` classify ہوتے ہیں
- بیرونی guests اور vendors `EXTERNAL` classify ہوتے ہیں
- Admins فی contact یا فی domain override کر سکتے ہیں

### Personal

- **ڈیفالٹ**: تمام recipients `EXTERNAL`
- Users in-flow prompts یا companion app کے ذریعے قابل اعتماد contacts reclassify کرتے ہیں
- Reclassification واضح اور logged ہے

## Channel States

ڈیٹا لے جانے سے پہلے ہر channel ایک state machine سے گزرتی ہے:

<img src="/diagrams/state-machine.svg" alt="Channel state machine: UNTRUSTED → CLASSIFIED or BLOCKED" style="max-width: 100%;" />

| State        | ڈیٹا مل سکتا ہے؟ | Agent context میں ڈیٹا بھیج سکتا ہے؟ | وضاحت                                                         |
| ------------ | :--------------: | :-----------------------------------: | ------------------------------------------------------------- |
| `UNTRUSTED`  | نہیں             | نہیں                                  | نئے/نامعلوم channels کے لیے ڈیفالٹ۔ مکمل isolated۔           |
| `CLASSIFIED` | ہاں (پالیسی کے اندر) | ہاں (classification کے ساتھ)       | Review کیا گیا اور classification سطح تفویض کی گئی۔          |
| `BLOCKED`    | نہیں             | نہیں                                  | Admin یا user نے واضح طور پر ممنوع قرار دیا۔                |

::: warning سیکیورٹی نئے channels ہمیشہ `UNTRUSTED` state میں آتے ہیں۔ یہ ایجنٹ سے
کوئی ڈیٹا نہیں مل سکتا اور ایجنٹ context میں ڈیٹا نہیں بھیج سکتا۔ Channel مکمل
isolated رہتا ہے جب تک کوئی admin (enterprise) یا user (personal) صراحتاً اسے classify نہ کرے۔ :::

## Classification دیگر سسٹمز کے ساتھ کیسے تعامل کرتا ہے

Classification ایک standalone feature نہیں — یہ پوری پلیٹ فارم میں فیصلوں کو چلاتا ہے:

| سسٹم                 | Classification کیسے استعمال ہوتا ہے                                     |
| -------------------- | ----------------------------------------------------------------------- |
| **Session taint**    | Classified ڈیٹا تک رسائی session کو اس سطح تک escalate کرتی ہے        |
| **Policy hooks**     | PRE_OUTPUT session taint کا منزل classification سے موازنہ کرتا ہے      |
| **MCP Gateway**      | MCP server responses classification لے جاتے ہیں جو session کو taint کرتے ہیں |
| **Data lineage**     | ہر lineage record classification سطح اور وجہ شامل کرتا ہے              |
| **Notifications**    | Notification مواد ایک ہی classification قواعد کے تحت ہے                |
| **Agent delegation** | Callee agent کی classification ceiling caller کے taint سے ملنی چاہیے   |
| **Plugin sandbox**   | Plugin SDK تمام emitted ڈیٹا کو خود بخود classify کرتا ہے              |
