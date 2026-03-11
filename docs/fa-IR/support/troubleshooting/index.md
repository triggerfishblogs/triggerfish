# عیب‌یابی

ابدأ اینجا عندما خیر کار می‌کند شيء ما. اتبع الخطوات بالترتيب.

## الخطوات الیالى

### 1. تحقق مما إذا كانت الخدمة الخلدرة تعمل

```bash
triggerfish status
```

إذا لم تكن الخدمة الخلدرة تعمل، ابدأها:

```bash
triggerfish start
```

### 2. تحقق از السجخیرت

```bash
triggerfish logs
```

يعرض این ملف السجل در الوقت الفعلي. استخدم مرشح المستوى لتقليل الضوضاء:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. شغّل التشخيصات

```bash
triggerfish patrol
```

يتحقق Patrol مما إذا كانت Gateway قابلة للوصول، وارائه‌دهنده LLM يستجيب، وکانال‌ها متصلة، وقوانین سیاست محمّلة، ومهارت‌ها مكتشفة. هر فحص بالَّم بـ `CRITICAL` یا `WARNING` يخبرك کجا باید التركيز.

### 4. تحقق از صحة تكوينك

```bash
triggerfish config validate
```

يحلل این `triggerfish.yaml`، ويتحقق از الحقول اخیرلزامیة، ويتحقق از صحة سطوح طبقه‌بندی، ويحلّ ممراجعه کنید رمزها.

## عیب‌یابی حسب المجال

إذا لم تشر الخطوات الیالى أعخیره به المشهرة، اختر المجال الذي يطابق أعراضك:

- [نصب](/fa-IR/support/troubleshooting/installation) - فشل سكربت نصب، مشاهر البناء از المصدر، مشاهر الازصة
- [الخدمة الخلدرة](/fa-IR/support/troubleshooting/daemon) - الخدمة خیر تبدأ، تعارضات الازافذ، أخطاء "قيد التشغيل در واقع"
- [پیکربندی](/fa-IR/support/troubleshooting/configuration) - أخطاء تحليل YAML، حقول مفقودة، فشل حل رمزها
- [کانال‌ها](/fa-IR/support/troubleshooting/channels) - البوت خیر يستجيب، فشل احراز هویت، مشاهر تسليم الپیام‌ها
- [ارائه‌دهندگان LLM](/fa-IR/support/troubleshooting/providers) - أخطاء API، مدل غير موجود، فشل البث
- [یکپارچه‌سازی‌ها](/fa-IR/support/troubleshooting/integrations) - Google OAuth، GitHub PAT، Notion API، CalDAV، خوادم MCP
- [اتوماسیون مرورگر](/fa-IR/support/troubleshooting/browser) - Chrome غير موجود، فشل التشغيل، حظر التنقل
- [اازیت وطبقه‌بندی](/fa-IR/support/troubleshooting/security) - حظر نوشتن به پایین، مشاهر Taint، SSRF، رفض سیاست‌ها
- [رمزها وبيانات اخیرعتماد](/fa-IR/support/troubleshooting/secrets) - أخطاء سلسلة المفاتيح، مخزن الملفات المشفر، مشاهر الأذونات

## هل ما زلت عالقاً؟

إذا لم يحل هر از الراهنماها أعخیره مشهرتك:

1. اجبا [حزمة سجخیرت](/fa-IR/support/guides/collecting-logs)
2. اقرأ [دليل تقديم البخیرغات](/fa-IR/support/guides/filing-issues)
3. افتح بخیرغاً روی [GitHub](https://github.com/greghavens/triggerfish/issues/new)
