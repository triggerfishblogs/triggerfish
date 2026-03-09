# استكشاف الأخطاء: التكاملات

## Google Workspace

### انتهت صلاحية رمز OAuth أو أُلغي

يمكن إلغاء رموز تحديث Google OAuth (من قبل المستخدم أو Google أو بسبب عدم النشاط). عندما يحدث هذا:

```
Google OAuth token exchange failed
```

أو سترى أخطاء 401 في استدعاءات Google API.

**الحل:** أعد المصادقة:

```bash
triggerfish connect google
```

يفتح هذا متصفحاً لتدفق موافقة OAuth. بعد منح الوصول، تُخزَّن الرموز الجديدة في سلسلة المفاتيح.

### "No refresh token"

أرجع تدفق OAuth رمز وصول لكن بدون رمز تحديث. يحدث هذا عندما:

- سبق أن أذنت للتطبيق (Google يرسل رمز التحديث فقط عند أول تفويض)
- شاشة موافقة OAuth لم تطلب الوصول غير المتصل

**الحل:** ألغِ وصول التطبيق في [إعدادات حساب Google](https://myaccount.google.com/permissions)، ثم شغّل `triggerfish connect google` مرة أخرى. هذه المرة سيرسل Google رمز تحديث جديد.

### منع التحديث المتزامن

إذا أطلقت عدة طلبات تحديث رمز في نفس الوقت، يُسلسلها Triggerfish بحيث يُرسل طلب تحديث واحد فقط. إذا رأيت مهلات أثناء تحديث الرمز، قد يكون التحديث الأول يستغرق وقتاً طويلاً.

---

## GitHub

### "GitHub token not found in keychain"

يخزّن تكامل GitHub رمز الوصول الشخصي في سلسلة مفاتيح نظام التشغيل تحت المفتاح `github-pat`.

**الحل:**

```bash
triggerfish connect github
# أو يدوياً:
triggerfish config set-secret github-pat ghp_...
```

### تنسيق الرمز

يدعم GitHub تنسيقين للرمز:
- PATs كلاسيكية: `ghp_...`
- PATs دقيقة: `github_pat_...`

كلاهما يعمل. يتحقق معالج الإعداد من الرمز عن طريق استدعاء GitHub API. إذا فشل التحقق:

```
GitHub token verification failed
GitHub API request failed
```

تحقق مرة أخرى من أن الرمز يحتوي على النطاقات المطلوبة. للوظائف الكاملة، تحتاج: `repo`، `read:org`، `read:user`.

### فشل الاستنساخ

أداة استنساخ GitHub تحتوي على منطق إعادة محاولة تلقائي:

1. المحاولة الأولى: الاستنساخ مع `--branch` المحدد
2. إذا لم يكن الفرع موجوداً: إعادة المحاولة بدون `--branch` (يستخدم الفرع الافتراضي)

إذا فشلت كلتا المحاولتين:

```
Clone failed on retry
Clone failed
```

تحقق من:
- الرمز لديه نطاق `repo`
- المستودع موجود والرمز لديه وصول
- اتصال الشبكة بـ github.com

### تحديد المعدل

حد معدل GitHub API هو 5,000 طلب/ساعة للطلبات المُصادَق عليها. يُستخرج عدد المعدل المتبقي ووقت إعادة الضبط من رؤوس الاستجابة ويُضمَّن في رسائل الخطأ:

```
Rate limit: X remaining, resets at HH:MM:SS
```

لا يوجد تراجع تلقائي. انتظر حتى تُعاد ضبط نافذة حد المعدل.

---

## Notion

### "Notion enabled but token not found in keychain"

يتطلب تكامل Notion رمز تكامل داخلي مخزّن في سلسلة المفاتيح.

**الحل:**

```bash
triggerfish connect notion
```

يطلب الرمز ويخزّنه في سلسلة المفاتيح بعد التحقق منه مع Notion API.

### تنسيق الرمز

يستخدم Notion تنسيقين للرمز:
- رموز التكامل الداخلية: `ntn_...`
- الرموز القديمة: `secret_...`

كلاهما مقبول. يتحقق معالج الاتصال من التنسيق قبل التخزين.

### تحديد المعدل (429)

واجهة Notion API محدودة المعدل بحوالي 3 طلبات في الثانية. يحتوي Triggerfish على تحديد معدل مدمج (قابل للتكوين) ومنطق إعادة محاولة:

- المعدل الافتراضي: 3 طلبات/ثانية
- المحاولات: حتى 3 مرات عند 429
- التراجع: أسي مع عشوائية، يبدأ من ثانية واحدة
- يحترم رأس `Retry-After` من استجابة Notion

إذا كنت لا تزال تصل لحدود المعدل:

```
Notion API rate limited, retrying
```

قلل العمليات المتزامنة أو خفّض حد المعدل في التكوين.

### 404 Not Found

```
Notion: 404 Not Found
```

المورد موجود لكنه غير مشترك مع تكاملك. في Notion:

1. افتح الصفحة أو قاعدة البيانات
2. انقر على قائمة "..." > "Connections"
3. أضف تكامل Triggerfish الخاص بك

### "client_secret removed" (تغيير غير متوافق)

في تحديث أمني، أُزيل حقل `client_secret` من تكوين Notion. إذا كان لديك هذا الحقل في `triggerfish.yaml`، أزله. يستخدم Notion الآن فقط رمز OAuth المخزّن في سلسلة المفاتيح.

### أخطاء الشبكة

```
Notion API network request failed
Notion API network error: <message>
```

واجهة API غير قابلة للوصول. تحقق من اتصال شبكتك. إذا كنت خلف وكيل مؤسسي، يجب أن تكون واجهة Notion API (`api.notion.com`) قابلة للوصول.

---

## CalDAV (التقويم)

### فشل حل بيانات الاعتماد

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

يحتاج تكامل CalDAV إلى اسم مستخدم وكلمة مرور:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

خزّن كلمة المرور:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### فشل الاكتشاف

يستخدم CalDAV عملية اكتشاف متعددة الخطوات:
1. العثور على عنوان URL الرئيسي (PROPFIND على نقطة النهاية المعروفة)
2. العثور على calendar-home-set
3. عرض التقويمات المتاحة

إذا فشلت أي خطوة:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

الأسباب الشائعة:
- عنوان URL للخادم خاطئ (بعض الخوادم تحتاج `/dav/principals/` أو `/remote.php/dav/`)
- بيانات الاعتماد مرفوضة (اسم مستخدم/كلمة مرور خاطئة)
- الخادم لا يدعم CalDAV (بعض الخوادم تُعلن عن WebDAV لكن ليس CalDAV)

### عدم تطابق ETag عند التحديث/الحذف

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

يستخدم CalDAV علامات ETag للتحكم في التزامن المتفائل. إذا عدّل عميل آخر (هاتف، ويب) الحدث بين قراءتك وتحديثك، لن تتطابق علامة ETag.

**الحل:** يجب على الوكيل جلب الحدث مرة أخرى للحصول على علامة ETag الحالية، ثم إعادة محاولة العملية. يُعالج هذا تلقائياً في معظم الحالات.

### "CalDAV credentials not available, executor deferred"

يبدأ منفّذ CalDAV في حالة مؤجلة إذا لم يمكن حل بيانات الاعتماد عند بدء التشغيل. هذا غير مُعطِّل؛ سيبلّغ المنفّذ عن أخطاء إذا حاولت استخدام أدوات CalDAV.

---

## خوادم MCP (Model Context Protocol)

### الخادم غير موجود

```
MCP server '<name>' not found
```

استدعاء الأداة يشير إلى خادم MCP غير مكوّن. تحقق من قسم `mcp_servers` في `triggerfish.yaml`.

### ملف خادم التنفيذ غير موجود في PATH

تُنشأ خوادم MCP كعمليات فرعية. إذا لم يُعثر على الملف التنفيذي:

```
MCP server '<name>': <validation error>
```

المشاكل الشائعة:
- الأمر (مثل `npx`، `python`، `node`) غير موجود في PATH الخاص بالخدمة الخلفية
- **مشكلة PATH في systemd/launchd:** تلتقط الخدمة الخلفية PATH الخاص بك وقت التثبيت. إذا ثبّتت أداة خادم MCP بعد تثبيت الخدمة الخلفية، أعد تثبيت الخدمة الخلفية لتحديث PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### تعطّل الخادم

إذا تعطّلت عملية خادم MCP، تخرج حلقة القراءة ويصبح الخادم غير متوفر. لا يوجد إعادة اتصال تلقائية.

**الحل:** أعد تشغيل الخدمة الخلفية لإعادة إنشاء جميع خوادم MCP.

### حُظر نقل SSE

خوادم MCP التي تستخدم نقل SSE (Server-Sent Events) تخضع لفحوصات SSRF:

```
MCP SSE connection blocked by SSRF policy
```

عناوين URL الخاصة بـ SSE التي تشير إلى عناوين IP خاصة محظورة. هذا بالتصميم. استخدم نقل stdio لخوادم MCP المحلية بدلاً من ذلك.

### أخطاء استدعاء الأدوات

```
tools/list failed: <message>
tools/call failed: <message>
```

استجاب خادم MCP بخطأ. هذا خطأ الخادم وليس خطأ Triggerfish. تحقق من سجلات خادم MCP الخاصة للتفاصيل.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

مسار القبو المكوّن في `plugins.obsidian.vault_path` غير موجود. تأكد من أن المسار صحيح وقابل للوصول.

### حُظر اجتياز المسار

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

حاول مسار ملاحظة الخروج من مجلد القبو (مثل استخدام `../`). هذا فحص أمني. جميع عمليات الملاحظات محصورة في مجلد القبو.

### المجلدات المستبعدة

```
Path is excluded: <path>
```

الملاحظة في مجلد مدرج في `exclude_folders`. للوصول إليها، أزل المجلد من قائمة الاستبعاد.

### تطبيق التصنيف

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

القبو أو المجلد المحدد لديه مستوى تصنيف يتعارض مع تلوث الجلسة. راجع [استكشاف أخطاء الأمان](/ar-SA/support/troubleshooting/security) لتفاصيل قواعد الكتابة للأسفل.
