# استكشاف الأخطاء وإصلاحها

ابدأ هنا عندما لا يعمل شيء ما. اتبع الخطوات بالترتيب.

## الخطوات الأولى

### 1. تحقق مما إذا كانت الخدمة الخلفية تعمل

```bash
triggerfish status
```

إذا لم تكن الخدمة الخلفية تعمل، ابدأها:

```bash
triggerfish start
```

### 2. تحقق من السجلات

```bash
triggerfish logs
```

يعرض هذا ملف السجل في الوقت الفعلي. استخدم مرشح المستوى لتقليل الضوضاء:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. شغّل التشخيصات

```bash
triggerfish patrol
```

يتحقق Patrol مما إذا كانت البوابة قابلة للوصول، ومزود LLM يستجيب، والقنوات متصلة، وقواعد السياسة محمّلة، والمهارات مكتشفة. أي فحص معلَّم بـ `CRITICAL` أو `WARNING` يخبرك أين يجب التركيز.

### 4. تحقق من صحة تكوينك

```bash
triggerfish config validate
```

يحلل هذا `triggerfish.yaml`، ويتحقق من الحقول المطلوبة، ويتحقق من صحة مستويات التصنيف، ويحلّ مراجع الأسرار.

## استكشاف الأخطاء حسب المجال

إذا لم تشر الخطوات الأولى أعلاه إلى المشكلة، اختر المجال الذي يطابق أعراضك:

- [التثبيت](/ar-SA/support/troubleshooting/installation) - فشل سكربت التثبيت، مشاكل البناء من المصدر، مشاكل المنصة
- [الخدمة الخلفية](/ar-SA/support/troubleshooting/daemon) - الخدمة لا تبدأ، تعارضات المنافذ، أخطاء "قيد التشغيل بالفعل"
- [التكوين](/ar-SA/support/troubleshooting/configuration) - أخطاء تحليل YAML، حقول مفقودة، فشل حل الأسرار
- [القنوات](/ar-SA/support/troubleshooting/channels) - البوت لا يستجيب، فشل المصادقة، مشاكل تسليم الرسائل
- [مزودو LLM](/ar-SA/support/troubleshooting/providers) - أخطاء API، النموذج غير موجود، فشل البث
- [التكاملات](/ar-SA/support/troubleshooting/integrations) - Google OAuth، GitHub PAT، Notion API، CalDAV، خوادم MCP
- [أتمتة المتصفح](/ar-SA/support/troubleshooting/browser) - Chrome غير موجود، فشل التشغيل، حظر التنقل
- [الأمان والتصنيف](/ar-SA/support/troubleshooting/security) - حظر الكتابة للأسفل، مشاكل التلوث، SSRF، رفض السياسات
- [الأسرار وبيانات الاعتماد](/ar-SA/support/troubleshooting/secrets) - أخطاء سلسلة المفاتيح، مخزن الملفات المشفر، مشاكل الأذونات

## هل ما زلت عالقاً؟

إذا لم يحل أي من الأدلة أعلاه مشكلتك:

1. اجمع [حزمة سجلات](/ar-SA/support/guides/collecting-logs)
2. اقرأ [دليل تقديم البلاغات](/ar-SA/support/guides/filing-issues)
3. افتح بلاغاً على [GitHub](https://github.com/greghavens/triggerfish/issues/new)
