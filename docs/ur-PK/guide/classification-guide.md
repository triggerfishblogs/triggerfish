# Classification سطحیں منتخب کرنا

Triggerfish میں ہر چینل، MCP server، integration، اور plugin کے پاس ایک classification
سطح ہونی چاہیے۔ یہ صفحہ آپ کو صحیح سطح منتخب کرنے میں مدد کرتا ہے۔

## چار سطحیں

| سطح              | اس کا مطلب                                             | ڈیٹا کا بہاؤ...                    |
| ---------------- | ------------------------------------------------------- | ---------------------------------- |
| **PUBLIC**       | سب کے دیکھنے کے لیے محفوظ                              | کہیں بھی                           |
| **INTERNAL**     | صرف آپ کی آنکھوں کے لیے — کچھ حساس نہیں، لیکن عوامی نہیں | INTERNAL، CONFIDENTIAL، RESTRICTED |
| **CONFIDENTIAL** | حساس ڈیٹا جو آپ کبھی leak نہیں چاہتے                  | CONFIDENTIAL، RESTRICTED           |
| **RESTRICTED**   | سب سے حساس — قانونی، طبی، مالی، PII                   | صرف RESTRICTED                     |

ڈیٹا صرف **اوپر یا برابر** بہہ سکتا ہے، کبھی نیچے نہیں۔ یہ
[no-write-down قاعدہ](/ur-PK/security/no-write-down) ہے اور اسے override نہیں کیا جا سکتا۔

## دو سوالات پوچھیں

کسی بھی integration کو ترتیب دیتے وقت پوچھیں:

**1. یہ ذریعہ سب سے زیادہ حساس ڈیٹا کیا واپس کر سکتا ہے؟**

یہ **کم از کم** classification سطح متعین کرتا ہے۔ اگر کوئی MCP server مالی ڈیٹا واپس
کر سکتا ہے، تو اسے کم از کم CONFIDENTIAL ہونا چاہیے — چاہے اس کے زیادہ تر tools
بے ضرر metadata واپس کریں۔

**2. کیا میں آرام دہ ہوں گا اگر session ڈیٹا اس منزل کی _طرف_ بہے؟**

یہ وہ **زیادہ سے زیادہ** classification سطح متعین کرتا ہے جو آپ تفویض کرنا چاہیں گے۔
زیادہ سطح کا مطلب ہے کہ جب آپ اسے استعمال کرتے ہیں تو session taint escalate ہوتا ہے،
جو بعد میں ڈیٹا کے بہاؤ کو محدود کر دیتا ہے۔

## ڈیٹا کی قسم کے مطابق Classification

| ڈیٹا کی قسم                                     | تجویز کردہ سطح  | کیوں                                       |
| ----------------------------------------------- | --------------- | ------------------------------------------ |
| موسم، عوامی ویب صفحات، time zones               | **PUBLIC**      | کسی کے لیے بھی آزادانہ دستیاب             |
| آپ کے ذاتی نوٹس، bookmarks، task lists          | **INTERNAL**    | نجی لیکن expose ہونے پر نقصاندہ نہیں      |
| اندرونی wikis، team docs، project boards        | **INTERNAL**    | تنظیم کی اندرونی معلومات                  |
| Email، calendar events، contacts                | **CONFIDENTIAL** | نام، schedules، رشتے شامل ہیں             |
| CRM ڈیٹا، sales pipeline، customer records      | **CONFIDENTIAL** | کاروباری حساسیت، customer ڈیٹا            |
| مالی ریکارڈز، بینک accounts، invoices           | **CONFIDENTIAL** | مالیاتی معلومات                            |
| Source code repositories (نجی)                 | **CONFIDENTIAL** | Intellectual property                      |
| طبی یا صحت کے ریکارڈز                          | **RESTRICTED**  | قانوناً محفوظ (HIPAA، وغیرہ)             |
| حکومتی ID نمبر، SSNs، passports                | **RESTRICTED**  | شناختی چوری کا خطرہ                       |
| قانونی دستاویزات، NDA کے تحت contracts          | **RESTRICTED**  | قانونی نمائش                              |
| Encryption کلیدیں، credentials، secrets        | **RESTRICTED**  | سسٹم سمجھوتے کا خطرہ                      |

## MCP Servers

`triggerfish.yaml` میں MCP server شامل کرتے وقت، classification دو چیزیں متعین کرتا ہے:

1. **Session taint** — اس server پر کوئی بھی tool کال session کو اس سطح تک escalate کرتی ہے
2. **Write-down prevention** — اس سطح سے اوپر تک tainted session اس server کو ڈیٹا
   _بھیج_ نہیں سکتا

```yaml
mcp_servers:
  # PUBLIC — کھلا ڈیٹا، کوئی حساسیت نہیں
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — آپ کا اپنا filesystem، نجی لیکن secrets نہیں
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — نجی repos، customer issues تک رسائی
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — PII، طبی ریکارڈز، قانونی دستاویزات والا database
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning ڈیفالٹ انکار اگر آپ `classification` چھوڑتے ہیں، تو server **UNTRUSTED**
کے طور پر register ہوتا ہے اور gateway تمام tool calls رد کر دیتا ہے۔ آپ کو صراحتاً
ایک سطح منتخب کرنی ہوگی۔ :::

### عام MCP Server Classifications

| MCP Server                       | تجویز کردہ سطح | وجہ                                              |
| -------------------------------- | --------------- | ------------------------------------------------ |
| Filesystem (عوامی docs)         | PUBLIC          | صرف عوامی فائلیں expose کرتا ہے                |
| Filesystem (home directory)      | INTERNAL        | ذاتی فائلیں، کچھ خفیہ نہیں                      |
| Filesystem (کام کے projects)    | CONFIDENTIAL    | proprietary code یا ڈیٹا ہو سکتا ہے             |
| GitHub (صرف عوامی repos)        | INTERNAL        | کوڈ عوامی ہے لیکن استعمال کے patterns نجی ہیں  |
| GitHub (نجی repos)              | CONFIDENTIAL    | Proprietary source code                          |
| Slack                            | CONFIDENTIAL    | کام کی گفتگوئیں، ممکنہ طور پر حساس              |
| Database (analytics/reporting)   | CONFIDENTIAL    | مجموعی کاروباری ڈیٹا                             |
| Database (production with PII)   | RESTRICTED      | ذاتی شناختی معلومات شامل ہیں                    |
| Weather / time / calculator      | PUBLIC          | کوئی حساس ڈیٹا نہیں                             |
| Web search                       | PUBLIC          | عوامی طور پر دستیاب معلومات واپس کرتا ہے        |
| Email                            | CONFIDENTIAL    | نام، گفتگوئیں، attachments                      |
| Google Drive                     | CONFIDENTIAL    | دستاویزات میں حساس کاروباری ڈیٹا ہو سکتا ہے    |

## Channels

Channel classification **ceiling** متعین کرتا ہے — اس ڈیٹا کی زیادہ سے زیادہ حساسیت
جو اس چینل تک پہنچائی جا سکتی ہے۔

```yaml
channels:
  cli:
    classification: INTERNAL # آپ کا مقامی terminal — اندرونی ڈیٹا کے لیے محفوظ
  telegram:
    classification: INTERNAL # آپ کا نجی bot — مالک کے لیے CLI جیسا
  webchat:
    classification: PUBLIC # گمنام زائرین — صرف عوامی ڈیٹا
  email:
    classification: CONFIDENTIAL # Email نجی ہے لیکن forward ہو سکتا ہے
```

::: tip مالک بمقابلہ غیر مالک **مالک** کے لیے، تمام channels کا ایک ہی trust
level ہے — آپ آپ ہیں، چاہے کوئی بھی app استعمال کریں۔ Channel classification سب سے زیادہ
**غیر مالک صارفین** (webchat پر زائرین، Slack channel کے ممبران، وغیرہ) کے لیے اہم ہے
جہاں یہ gate کرتا ہے کہ انہیں کیا ڈیٹا بہہ سکتا ہے۔ :::

### Channel Classification منتخب کرنا

| سوال                                                                        | اگر ہاں...               | اگر نہیں...               |
| --------------------------------------------------------------------------- | ------------------------ | ------------------------- |
| کیا اس چینل پر پیغامات کوئی اجنبی دیکھ سکتا ہے؟                           | **PUBLIC**               | پڑھتے رہیں               |
| کیا یہ چینل صرف آپ کے لیے ہے؟                                              | **INTERNAL** یا اونچا    | پڑھتے رہیں               |
| کیا پیغامات کسی تیسری پارٹی کی طرف forward، screenshot، یا log ہو سکتے ہیں؟ | **CONFIDENTIAL** تک محدود | **RESTRICTED** ہو سکتا ہے |
| کیا چینل end-to-end encrypted اور آپ کے مکمل کنٹرول میں ہے؟               | **RESTRICTED** ہو سکتا ہے | **CONFIDENTIAL** تک محدود  |

## جب آپ غلطی کریں تو کیا ہوتا ہے

**بہت کم (مثلاً CONFIDENTIAL server کو PUBLIC mark کریں):**

- اس server سے ڈیٹا session taint کو escalate نہیں کرے گا
- Session classified ڈیٹا کو public channels تک بھیج سکتا ہے — **ڈیٹا leak کا خطرہ**
- یہ خطرناک سمت ہے

**بہت زیادہ (مثلاً PUBLIC server کو CONFIDENTIAL mark کریں):**

- اس server کو استعمال کرتے وقت session taint غیر ضروری escalate ہوتا ہے
- بعد میں کم classified channels کو بھیجنے سے blocked ہو جائیں گے
- پریشان کن لیکن **محفوظ** — زیادہ اونچی طرف غلطی کریں

::: danger جب شک ہو، **زیادہ اونچا classify کریں**۔ آپ اسے بعد میں کم کر سکتے ہیں
جب review کریں کہ server اصل میں کیا ڈیٹا واپس کرتا ہے۔ Under-classifying سیکیورٹی خطرہ ہے؛
over-classifying صرف ایک تکلیف ہے۔ :::

## Taint Cascade

عملی اثر سمجھنا آپ کو دانشمندی سے منتخب کرنے میں مدد کرتا ہے۔ ایک session میں کیا ہوتا ہے:

```
1. Session PUBLIC پر شروع ہوتا ہے
2. آپ موسم پوچھتے ہیں (PUBLIC server)          → taint PUBLIC رہتا ہے
3. آپ اپنے نوٹس چیک کرتے ہیں (INTERNAL filesystem) → taint INTERNAL تک escalate
4. آپ GitHub issues query کرتے ہیں (CONFIDENTIAL)  → taint CONFIDENTIAL تک escalate
5. آپ webchat (PUBLIC channel) پر post کرنے کی کوشش → BLOCKED (write-down violation)
6. آپ session reset کرتے ہیں                    → taint PUBLIC پر واپس
7. آپ webchat پر post کرتے ہیں                  → اجازت ہے
```

اگر آپ اکثر CONFIDENTIAL tool کے بعد PUBLIC channel استعمال کرتے ہیں، تو آپ کو کثرت سے
reset کرنا پڑے گا۔ غور کریں کہ آیا tool کو واقعی CONFIDENTIAL کی ضرورت ہے، یا چینل کو
reclassify کیا جا سکتا ہے۔

## Filesystem Paths

آپ انفرادی filesystem paths کو بھی classify کر سکتے ہیں، جو مفید ہے جب آپ کے
ایجنٹ کے پاس مختلف حساسیت والی directories تک رسائی ہو:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## جائزہ Checklist

کسی نئے integration کے ساتھ live جانے سے پہلے:

- [ ] یہ ذریعہ کس بدترین ڈیٹا کو واپس کر سکتا ہے؟ اس سطح پر classify کریں۔
- [ ] کیا classification کم از کم ڈیٹا کی قسم کی جدول کے مطابق ہے؟
- [ ] اگر یہ ایک چینل ہے، تو کیا classification تمام ممکنہ recipients کے لیے مناسب ہے؟
- [ ] کیا آپ نے test کیا ہے کہ taint cascade آپ کے معمول کے workflow کے لیے کام کرتا ہے؟
- [ ] شک میں، کیا آپ نے کم کی بجائے زیادہ اونچا classify کیا؟

## متعلقہ صفحات

- [No Write-Down قاعدہ](/ur-PK/security/no-write-down) — مقررہ ڈیٹا بہاؤ قاعدہ
- [ترتیب](/ur-PK/guide/configuration) — مکمل YAML حوالہ
- [MCP Gateway](/ur-PK/integrations/mcp-gateway) — MCP server سیکیورٹی ماڈل
