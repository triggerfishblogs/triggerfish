# البداية السريعة

يرشدك هذا الدليل خلال أول 5 دقائق مع Triggerfish -- من تشغيل معالج الإعداد إلى
الحصول على وكيل ذكاء اصطناعي يعمل يمكنك التحدث معه.

## تشغيل معالج الإعداد

إذا استخدمت مُثبت الأمر الواحد، فقد عمل المعالج بالفعل أثناء التثبيت. لتشغيله
مرة أخرى أو البدء من جديد:

```bash
triggerfish dive
```

يرشدك المعالج خلال ثماني خطوات:

### الخطوة 1: اختر مزود LLM

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

اختر مزوداً وأدخل بيانات اعتمادك. يدعم Triggerfish مزودين متعددين مع تجاوز
فشل تلقائي. **Triggerfish Gateway** هو الخيار الأسهل — اشترك في [خطة Pro أو
Power](/ar-SA/pricing)، ويتصل وكيلك ببنية LLM والبحث المُدارة بدون مفاتيح API
للتكوين.

### الخطوة 2: سمِّ وكيلك

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

يُنشئ هذا ملف `SPINE.md` -- أساس prompt النظام لوكيلك. يمكنك تحريره في أي وقت
في `~/.triggerfish/SPINE.md`.

### الخطوة 3: اتصل بقناة

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

اختر منصة مراسلة أو تخطَّ هذه الخطوة للبدء بـ CLI فقط. يمكنك إضافة قنوات
لاحقاً في `triggerfish.yaml`.

### الخطوة 4: إضافات اختيارية

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

اتصل بتكاملات اختيارية مثل Obsidian لتدوين الملاحظات.

### الخطوة 5: اتصال Google Workspace (اختياري)

اتصل بحساب Google لـ Gmail و Calendar و Tasks و Drive و Sheets عبر OAuth2.
يمكنك التخطي والاتصال لاحقاً بـ `triggerfish connect google`.

### الخطوة 6: اتصال GitHub (اختياري)

اتصل بـ GitHub بلصق Personal Access Token. يمنح الوكيل أدوات للمستودعات وطلبات
السحب والمشكلات و Actions. يمكنك التخطي والاتصال لاحقاً بـ
`triggerfish connect github`.

### الخطوة 7: إعداد البحث على الويب

اختر محرك بحث (Brave Search أو SearXNG مُستضاف ذاتياً) لاستخدام وكيلك، أو تخطَّ
الآن.

### الخطوة 8: بدء Daemon

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

اختر نعم لجعل وكيلك يعمل كلما كان جهازك مُشغلاً.

## ابدأ المحادثة

بعد اكتمال المعالج، يمكنك بدء المحادثة فوراً عبر CLI:

```bash
triggerfish chat
```

أو، إذا اتصلت بقناة مراسلة، أرسل رسالة لوكيلك هناك.

### مثال محادثة

```
أنت: بماذا يمكنك مساعدتي؟

Reef: يمكنني مساعدتك في مجموعة واسعة من المهام. إليك بعض
الأشياء التي أنا مُعد لها:

  - الإجابة على الأسئلة وإجراء المحادثات
  - إدارة تقويمك وجدولك
  - تلخيص رسائل البريد الإلكتروني والرسائل
  - كتابة وتحرير المستندات
  - تشغيل الكود في بيئة معزولة
  - البحث على الويب للمعلومات
  - أتمتة المهام المتكررة بمهام cron

من أين تريد أن نبدأ؟

أنت: أعد تقريراً صباحياً يومياً الساعة 7 صباحاً

Reef: لقد أنشأت مهمة cron لتقريرك الصباحي:

  الجدول: كل يوم الساعة 7:00 صباحاً
  المهمة: إعداد تقرير بأحداث التقويم والبريد غير المقروء
        وتوقعات الطقس
  التسليم: CLI (أضف قناة في التكوين للحصول عليه على Telegram/Slack)

ستتلقى أول تقرير صباحي غداً. يمكنك إدارة مهام cron
في أي وقت بـ /cron list.
```

## تحقق من إعدادك

شغل فحص الصحة للتأكد من أن كل شيء يعمل:

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 2m)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  1 channel active (CLI)
  Policy engine loaded (4 rules)
  3 skills installed (3 bundled)

Overall: HEALTHY
```

## ماذا بعد

- **خصص وكيلك** -- حرر `~/.triggerfish/SPINE.md` لتحسين شخصية وكيلك وقدراته.
  انظر [SPINE و Triggers](./spine-and-triggers).
- **أضف المزيد من القنوات** -- اتصل بـ Telegram, Slack, Discord, أو WhatsApp في
  `triggerfish.yaml`. انظر [التكوين](./configuration).
- **اتصل بالتكاملات** -- `triggerfish connect google` لـ Google Workspace,
  `triggerfish connect github` لـ GitHub. انظر
  [التكاملات](/ar-SA/integrations/).
- **أعد السلوك الاستباقي** -- أنشئ `~/.triggerfish/TRIGGER.md` لتخبر وكيلك ماذا
  يراقب. انظر [SPINE و Triggers](./spine-and-triggers).
- **استكشف الأوامر** -- تعلم جميع أوامر CLI والمحادثة المتاحة. انظر
  [أوامر CLI](./commands).
