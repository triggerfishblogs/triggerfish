---
layout: home

hero:
  name: Triggerfish
  text: وكلاء ذكاء اصطناعي آمنون
  tagline: تطبيق حتمي للسياسات أسفل طبقة LLM. كل قناة. بدون استثناءات.
  image:
    src: /triggerfish.png
    alt: Triggerfish — يجوب البحر الرقمي
  actions:
    - theme: brand
      text: ابدأ الآن
      link: /ar-SA/guide/
    - theme: alt
      text: الأسعار
      link: /ar-SA/pricing
    - theme: alt
      text: عرض على GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: أمان أسفل طبقة LLM
    details: تطبيق حتمي للسياسات أسفل طبقة LLM. خطّافات كود بحتة لا يستطيع الذكاء الاصطناعي تجاوزها أو التأثير عليها. نفس المدخلات تنتج نفس القرار دائمًا.
  - icon: "\U0001F4AC"
    title: كل قناة تستخدمها
    details: Telegram، Slack، Discord، WhatsApp، البريد الإلكتروني، WebChat، CLI — جميعها مع تصنيف لكل قناة وتتبع تلوث تلقائي.
  - icon: "\U0001F528"
    title: ابنِ أي شيء
    details: بيئة تنفيذ الوكيل مع حلقة كتابة/تشغيل/إصلاح. مهارات ذاتية التأليف. سوق The Reef لاكتشاف ومشاركة القدرات.
  - icon: "\U0001F916"
    title: أي مزوّد LLM
    details: Anthropic، OpenAI، Google Gemini، نماذج محلية عبر Ollama، OpenRouter. سلاسل تجاوز الأعطال التلقائية. أو اختر Triggerfish Gateway — بدون الحاجة لمفاتيح API.
  - icon: "\U0001F3AF"
    title: استباقي افتراضيًا
    details: مهام مجدولة، محفزات، وwebhooks. وكيلك يتحقق ويراقب ويتصرف بشكل مستقل — ضمن حدود سياسات صارمة.
  - icon: "\U0001F310"
    title: مفتوح المصدر
    details: مرخص بموجب Apache 2.0. المكونات الأمنية الحرجة مفتوحة بالكامل للتدقيق. لا تثق بنا — تحقق من الكود.
---

<LatestRelease />

## التثبيت بأمر واحد

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

يقوم مُثبّت الملف التنفيذي بتنزيل إصدار مُعدّ مسبقًا، والتحقق من المجموع الاختباري، وتشغيل
معالج الإعداد. راجع [دليل التثبيت](/ar-SA/guide/installation) لإعداد Docker
والبناء من المصدر وعملية الإصدار.

لا تريد إدارة مفاتيح API؟ [راجع الأسعار](/ar-SA/pricing) لخدمة Triggerfish Gateway —
بنية تحتية مُدارة لـ LLM والبحث، جاهزة في دقائق.

## كيف يعمل

يضع Triggerfish طبقة سياسات حتمية بين وكيل الذكاء الاصطناعي الخاص بك وكل ما
يتفاعل معه. يقترح LLM الإجراءات — وخطّافات الكود البحتة تقرر ما إذا كانت مسموحة.

- **سياسة حتمية** — قرارات الأمان هي كود بحت. لا عشوائية، لا تأثير من
  LLM، لا استثناءات. نفس المدخلات، نفس القرار، في كل مرة.
- **التحكم في تدفق المعلومات** — أربعة مستويات تصنيف (PUBLIC، INTERNAL،
  CONFIDENTIAL، RESTRICTED) تنتشر تلقائيًا عبر تلوث الجلسة. لا يمكن
  للبيانات أبدًا أن تتدفق نزولًا إلى سياق أقل أمانًا.
- **ستة خطّافات تطبيق** — كل مرحلة من مسار البيانات محمية: ما يدخل
  سياق LLM، أي أدوات يتم استدعاؤها، ما النتائج التي تعود، وما يغادر
  النظام. كل قرار يُسجَّل في سجل التدقيق.
- **الرفض الافتراضي** — لا شيء يُسمح به بصمت. الأدوات والتكاملات ومصادر
  البيانات غير المصنفة تُرفض حتى يتم تهيئتها صراحة.
- **هوية الوكيل** — مهمة وكيلك موجودة في SPINE.md، والسلوكيات الاستباقية
  في TRIGGER.md. المهارات توسّع القدرات من خلال اتفاقيات المجلدات البسيطة.
  سوق The Reef يتيح لك اكتشافها ومشاركتها.

[تعرف على المزيد حول البنية المعمارية.](/ar-SA/architecture/)
