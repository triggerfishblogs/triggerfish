# أوامر CLI

يوفر Triggerfish CLI لإدارة وكيلك و daemon والقنوات والجلسات. تغطي هذه الصفحة
كل أمر متاح واختصارات المحادثة.

## الأوامر الأساسية

### `triggerfish dive`

شغل معالج الإعداد التفاعلي. هذا أول أمر تُشغله بعد التثبيت ويمكن إعادة تشغيله
في أي وقت لإعادة التكوين.

```bash
triggerfish dive
```

### `triggerfish chat`

ابدأ جلسة محادثة تفاعلية في الطرفية. هذا الأمر الافتراضي عند تشغيل `triggerfish`
بدون وسيطات.

```bash
triggerfish chat
```

ميزات واجهة المحادثة:

- شريط إدخال بعرض كامل أسفل الطرفية
- بث الاستجابات مع عرض الرموز في الوقت الفعلي
- عرض مُضغط لاستدعاءات الأدوات (تبديل بـ Ctrl+O)
- سجل الإدخال (يستمر عبر الجلسات)
- ESC لمقاطعة استجابة جارية
- ضغط المحادثة لإدارة الجلسات الطويلة

### `triggerfish run`

ابدأ خادم gateway في المقدمة. مفيد للتطوير وتصحيح الأخطاء.

```bash
triggerfish run
```

### `triggerfish start`

ثبت وابدأ Triggerfish كـ daemon خلفية باستخدام مدير خدمات نظام التشغيل.

```bash
triggerfish start
```

### `triggerfish stop`

أوقف daemon العامل.

```bash
triggerfish stop
```

### `triggerfish status`

تحقق مما إذا كان daemon يعمل حالياً واعرض معلومات الحالة الأساسية.

```bash
triggerfish status
```

### `triggerfish logs`

اعرض مخرجات سجل daemon.

```bash
# عرض السجلات الأخيرة
triggerfish logs

# بث السجلات في الوقت الفعلي
triggerfish logs --tail
```

### `triggerfish patrol`

شغل فحص صحة لتثبيت Triggerfish.

```bash
triggerfish patrol
```

### `triggerfish config`

أدر ملف التكوين. يستخدم مسارات منقطة في `triggerfish.yaml`.

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
triggerfish config validate
triggerfish config add-channel [type]
```

#### `triggerfish config migrate-secrets`

انقل بيانات الاعتماد النصية من `triggerfish.yaml` إلى سلسلة مفاتيح نظام التشغيل.

```bash
triggerfish config migrate-secrets
```

انظر [إدارة الأسرار](/ar-SA/security/secrets) للتفاصيل.

### `triggerfish connect`

اتصل بخدمة خارجية مع Triggerfish.

```bash
triggerfish connect google    # Google Workspace (تدفق OAuth2)
triggerfish connect github    # GitHub (Personal Access Token)
```

### `triggerfish disconnect`

أزل المصادقة لخدمة خارجية.

```bash
triggerfish disconnect google
triggerfish disconnect github
```

### `triggerfish update`

تحقق من التحديثات المتاحة وثبتها.

```bash
triggerfish update
```

### `triggerfish version`

اعرض إصدار Triggerfish الحالي.

```bash
triggerfish version
```

## أوامر المهارات

أدر المهارات من سوق The Reef ومساحة عملك المحلية.

```bash
triggerfish skill search "calendar"
triggerfish skill install google-cal
triggerfish skill list
triggerfish skill update --all
triggerfish skill publish
triggerfish skill create
```

## أوامر الجلسات

افحص وأدر الجلسات النشطة.

```bash
triggerfish session list
triggerfish session history
triggerfish session spawn
```

## أوامر Buoy <ComingSoon :inline="true" />

أدر اتصالات الأجهزة المرافقة. Buoy غير متاح بعد.

```bash
triggerfish buoys list
triggerfish buoys pair
```

## أوامر داخل المحادثة

هذه الأوامر متاحة أثناء جلسة محادثة تفاعلية (عبر `triggerfish chat` أو أي قناة
متصلة). هي للمالك فقط.

| الأمر                   | الوصف                                                         |
| ----------------------- | ------------------------------------------------------------- |
| `/help`                 | عرض الأوامر المتاحة داخل المحادثة                              |
| `/status`               | عرض حالة الجلسة: النموذج، عدد الرموز، التكلفة، مستوى taint    |
| `/reset`                | إعادة تعيين taint الجلسة وسجل المحادثة                         |
| `/compact`              | ضغط سجل المحادثة باستخدام تلخيص LLM                           |
| `/model <name>`         | تبديل نموذج LLM للجلسة الحالية                                |
| `/skill install <name>` | تثبيت مهارة من The Reef                                       |
| `/cron list`            | سرد مهام cron المجدولة                                        |

## اختصارات لوحة المفاتيح

| الاختصار | الإجراء                                                                         |
| -------- | ------------------------------------------------------------------------------- |
| ESC      | مقاطعة استجابة LLM الحالية                                                      |
| Ctrl+V   | لصق صورة من الحافظة (انظر [الصورة والرؤية](/ar-SA/features/image-vision))       |
| Ctrl+O   | تبديل عرض استدعاءات الأدوات المُضغط/الموسع                                     |
| Ctrl+C   | الخروج من جلسة المحادثة                                                         |
| أعلى/أسفل | التنقل في سجل الإدخال                                                          |

::: tip مقاطعة ESC ترسل إشارة إلغاء عبر السلسلة بالكامل -- من المنسق إلى مزود
LLM. تتوقف الاستجابة بشكل نظيف ويمكنك متابعة المحادثة. :::

## مخرجات التصحيح

يتضمن Triggerfish تسجيل تصحيح تفصيلي لتشخيص مشكلات مزود LLM، وتحليل استدعاءات
الأدوات، وسلوك حلقة الوكيل. فعّله بتعيين متغير البيئة `TRIGGERFISH_DEBUG` إلى
`1`.

::: tip الطريقة المفضلة للتحكم في تفصيل السجل هي عبر `triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose, أو debug
```

انظر [التسجيل المُهيكل](/ar-SA/features/logging) للتفاصيل الكاملة. :::

## مرجع سريع

```bash
# الإعداد والإدارة
triggerfish dive              # معالج الإعداد
triggerfish start             # بدء daemon
triggerfish stop              # إيقاف daemon
triggerfish status            # فحص الحالة
triggerfish logs --tail       # بث السجلات
triggerfish patrol            # فحص الصحة
triggerfish config set <k> <v> # تعيين قيمة تكوين
triggerfish update            # التحقق من التحديثات
triggerfish version           # عرض الإصدار

# الاستخدام اليومي
triggerfish chat              # محادثة تفاعلية
triggerfish run               # وضع المقدمة

# المهارات
triggerfish skill search      # بحث The Reef
triggerfish skill install     # تثبيت مهارة
triggerfish skill list        # سرد المُثبتة

# الجلسات
triggerfish session list      # سرد الجلسات
triggerfish session history   # عرض النص
```
