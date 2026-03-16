---
layout: home

hero:
  name: Triggerfish
  text: محفوظ AI ایجنٹس
  tagline: LLM کی تہہ کے نیچے یقینی پالیسی نافذ کاری۔ ہر چینل۔ کوئی استثناء نہیں۔
  image:
    src: /triggerfish.webp
    alt: Triggerfish — ڈیجیٹل سمندر میں تیرتا ہوا
  actions:
    - theme: brand
      text: شروع کریں
      link: /ur-PK/guide/
    - theme: alt
      text: قیمتیں
      link: /ur-PK/pricing
    - theme: alt
      text: GitHub پر دیکھیں
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "🔒"
    title: LLM کی تہہ کے نیچے سیکیورٹی
    details: یقینی، sub-LLM پالیسی نافذ کاری۔ خالص کوڈ hooks جنہیں AI نہ بائی پاس کر سکتا ہے، نہ اوور رائڈ، نہ متاثر کر سکتا ہے۔ ایک ہی ان پٹ ہمیشہ ایک ہی فیصلہ دیتا ہے۔
  - icon: "💬"
    title: ہر وہ چینل جو آپ استعمال کرتے ہیں
    details: Telegram، Slack، Discord، WhatsApp، Email، WebChat، CLI — سب کے لیے فی چینل classification اور خودکار taint ٹریکنگ کے ساتھ۔
  - icon: "🔨"
    title: کچھ بھی بنائیں
    details: لکھنے/چلانے/ٹھیک کرنے کے feedback loop کے ساتھ ایجنٹ execution ماحول۔ خود تصنیف کردہ skills۔ The Reef مارکیٹ پلیس صلاحیتوں کو دریافت کرنے اور شیئر کرنے کے لیے۔
  - icon: "🤖"
    title: کوئی بھی LLM فراہم کنندہ
    details: Anthropic، OpenAI، Google Gemini، Ollama کے ذریعے مقامی ماڈلز، OpenRouter۔ خودکار failover chains۔ یا Triggerfish Gateway منتخب کریں — کوئی API کلیدیں درکار نہیں۔
  - icon: "🎯"
    title: بطور ڈیفالٹ فعال
    details: Cron jobs، triggers، اور webhooks۔ آپ کا ایجنٹ خود بخود چیک کرتا ہے، نگرانی کرتا ہے، اور کارروائی کرتا ہے — سخت پالیسی حدود کے اندر۔
  - icon: "🌐"
    title: اوپن سورس
    details: Apache 2.0 لائسنس یافتہ۔ سیکیورٹی کے اہم اجزاء آڈٹ کے لیے مکمل طور پر کھلے ہیں۔ ہم پر بھروسہ نہ کریں — کوڈ خود جانچیں۔
---

<LatestRelease />

## ایک کمانڈ میں انسٹال کریں

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

بائنری انسٹالرز ایک پہلے سے تیار ریلیز ڈاؤن لوڈ کرتے ہیں، اس کا checksum تصدیق کرتے ہیں، اور
setup wizard چلاتے ہیں۔ Docker سیٹ اپ، سورس سے بلڈ، اور ریلیز پروسیس کے لیے
[انسٹالیشن گائیڈ](/ur-PK/guide/installation) دیکھیں۔

API کلیدیں منظم نہیں کرنا چاہتے؟ Triggerfish Gateway کے لیے [قیمتیں دیکھیں](/ur-PK/pricing) —
منظم LLM اور سرچ انفراسٹرکچر، منٹوں میں تیار۔

## یہ کیسے کام کرتا ہے

Triggerfish آپ کے AI ایجنٹ اور ہر اس چیز کے درمیان ایک یقینی پالیسی پرت رکھتا ہے جس
سے وہ تعامل کرتا ہے۔ LLM اقدامات تجویز کرتا ہے — خالص کوڈ hooks فیصلہ کرتے ہیں کہ آیا وہ
اجازت یافتہ ہیں یا نہیں۔

- **یقینی پالیسی** — سیکیورٹی فیصلے خالص کوڈ ہیں۔ کوئی بے ترتیبی نہیں،
  LLM کا اثر نہیں، کوئی استثناء نہیں۔ ایک ہی ان پٹ، ایک ہی فیصلہ، ہر بار۔
- **معلومات کے بہاؤ کا کنٹرول** — چار classification سطحیں (PUBLIC، INTERNAL،
  CONFIDENTIAL، RESTRICTED) session taint کے ذریعے خود بخود پھیلتی ہیں۔ ڈیٹا
  کبھی کم محفوظ context میں نیچے نہیں بہہ سکتا۔
- **چھ نافذ کاری Hooks** — ڈیٹا پائپ لائن کا ہر مرحلہ محفوظ ہے: LLM context میں
  کیا داخل ہوتا ہے، کون سے tools بلائے جاتے ہیں، کیا نتائج واپس آتے ہیں، اور
  کیا سسٹم چھوڑتا ہے۔ ہر فیصلہ audit log میں درج ہوتا ہے۔
- **ڈیفالٹ انکار** — کچھ بھی خاموشی سے اجازت یافتہ نہیں۔ غیر classified tools،
  integrations، اور ڈیٹا سورسز کو رد کر دیا جاتا ہے جب تک صراحتاً ترتیب نہ دیے جائیں۔
- **ایجنٹ کی شناخت** — آپ کے ایجنٹ کا مشن SPINE.md میں رہتا ہے، فعال رویے
  TRIGGER.md میں۔ Skills سادہ فولڈر کنونشنز کے ذریعے صلاحیتوں کو بڑھاتی ہیں۔
  The Reef مارکیٹ پلیس آپ کو انہیں دریافت کرنے اور شیئر کرنے دیتا ہے۔

[Architecture کے بارے میں مزید جانیں۔](/ur-PK/architecture/)
