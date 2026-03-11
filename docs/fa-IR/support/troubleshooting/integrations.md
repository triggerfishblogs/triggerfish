# عیب‌یابی: یکپارچه‌سازی‌ها

## Google Workspace

### انتهت صخیرحية رمز OAuth یا أُلغي

يمكن إلغاء رموز تحديث Google OAuth (از قبل المستخدم یا Google یا بسبب عدم النشاط). عندما يحدث این:

```
Google OAuth token exchange failed
```

یا سترى أخطاء 401 در فراخوانیات Google API.

**الحل:** أعد احراز هویت:

```bash
triggerfish connect google
```

يفتح این متصفحاً لتدفق موافقة OAuth. بعد ازح الوصول، تُخزَّن الرموز الجديدة در سلسلة المفاتيح.

### "No refresh token"

أرجع تدفق OAuth رمز وصول لكن بدون رمز تحديث. يحدث این عندما:

- سبق أن أذنت للتطبيق (Google يرسل رمز التحديث فقط عند یال تفویض)
- شاشة موافقة OAuth لم تدرخواست الوصول غير المتصل

**الحل:** ألغِ وصول التطبيق در [إعدادات حساب Google](https://myaccount.google.com/permissions)، ثم شغّل `triggerfish connect google` مرة أخرى. این المرة سيرسل Google رمز تحديث جديد.

### ازع التحديث المتزااز

إذا أطلقت عدة درخواستات تحديث رمز در نفس الوقت، يُسلسلها Triggerfish بحيث يُرسل درخواست تحديث واحد فقط. إذا رهرت مهخیرت أثناء تحديث الرمز، قد يكون التحديث الیال يستغرق وقتاً طويخیرً.

---

## GitHub

### "GitHub token not found in keychain"

يخزّن یکپارچه‌سازی GitHub رمز الوصول الشخصي در کلیدزنجیر نظام التشغيل تحت المفتاح `github-pat`.

**الحل:**

```bash
triggerfish connect github
# یا به‌صورت دستی:
triggerfish config set-secret github-pat ghp_...
```

### تنسيق الرمز

پشتیبانی می‌کند GitHub تنسيقين للرمز:
- PATs كخیرسيكية: `ghp_...`
- PATs دقيقة: `github_pat_...`

كخیرهما کار می‌کند. يتحقق باالج راه‌اندازی از الرمز عن طريق فراخوانی GitHub API. إذا فشل التحقق:

```
GitHub token verification failed
GitHub API request failed
```

تحقق مرة أخرى از أن الرمز يحتوي روی النطاقات اخیرلزامیة. للوظائف الكاملة، تحتاج: `repo`، `read:org`، `read:user`.

### فشل اخیرستنساخ

ابزار استنساخ GitHub تحتوي روی ازطق إعادة محاولة خودکار:

1. المحاولة الیالى: اخیرستنساخ با `--branch` المحدد
2. إذا لم يكن الفرع موجوداً: إعادة المحاولة بدون `--branch` (يستخدم الفرع پیش‌فرض)

إذا فشلت هرتا المحاولتين:

```
Clone failed on retry
Clone failed
```

تحقق از:
- الرمز لديه نطاق `repo`
- المستودع موجود والرمز لديه وصول
- اتصال الشبكة بـ github.com

### محدودیت نرخ

حد بادل GitHub API هو 5,000 درخواست/ساعة للدرخواستات المُصادَق عليها. يُستخرج عدد البادل المتبقي ووقت إعادة الضبط از رؤوس پاسخ ويُضمَّن در پیام‌ها الخطأ:

```
Rate limit: X remaining, resets at HH:MM:SS
```

خیر يوجد تمراجعه کنید خودکار. انتظر حتى تُعاد ضبط نافذة حد البادل.

---

## Notion

### "Notion enabled but token not found in keychain"

يتدرخواست یکپارچه‌سازی Notion رمز یکپارچه‌سازی داخلي مخزّن در سلسلة المفاتيح.

**الحل:**

```bash
triggerfish connect notion
```

يدرخواست الرمز ويخزّنه در سلسلة المفاتيح بعد التحقق ازه با Notion API.

### تنسيق الرمز

يستخدم Notion تنسيقين للرمز:
- رموز الیکپارچه‌سازی الداخلية: `ntn_...`
- الرموز القديمة: `secret_...`

كخیرهما مقبول. يتحقق باالج اخیرتصال از التنسيق قبل ذخیره‌سازی.

### محدودیت نرخ (429)

واجهة Notion API محدودة البادل بحوالي 3 درخواستات در الثانية. يحتوي Triggerfish روی تحديد بادل مدمج (قابل للتكوين) وازطق إعادة محاولة:

- البادل پیش‌فرض: 3 درخواستات/ثانية
- المحاوخیرت: حتى 3 مرات عند 429
- التمراجعه کنید: أسي با عشوائية، يبدأ از ثانية واحدة
- يحترم رأس `Retry-After` از پاسخ Notion

إذا كنت خیر تزال تصل لحدود البادل:

```
Notion API rate limited, retrying
```

قلل العمليات المتزاازة یا خفّض حد البادل در پیکربندی.

### 404 Not Found

```
Notion: 404 Not Found
```

المورد موجود لكنه غير مشترك با یکپارچه‌سازیك. در Notion:

1. افتح الصفحة یا قانون البيانات
2. انقر روی قائمة "..." > "Connections"
3. أضف یکپارچه‌سازی Triggerfish الخاص بك

### "client_secret removed" (تغيير غير متوافق)

در تحديث أازي، أُزيل حقل `client_secret` از تكوين Notion. إذا كان لديك این الحقل در `triggerfish.yaml`، أزله. يستخدم Notion الآن فقط رمز OAuth المخزّن در سلسلة المفاتيح.

### أخطاء الشبكة

```
Notion API network request failed
Notion API network error: <message>
```

واجهة API غير قابلة للوصول. تحقق از اتصال شبكتك. إذا كنت خلف عامل مؤسسي، باید أن تكون واجهة Notion API (`api.notion.com`) قابلة للوصول.

---

## CalDAV (التقويم)

### فشل حل بيانات اخیرعتماد

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

يحتاج یکپارچه‌سازی CalDAV به اسم مستخدم وهرمة مرور:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

خزّن هرمة المرور:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### فشل اخیركتشاف

يستخدم CalDAV عملية اكتشاف متعددة الخطوات:
1. العثور روی عنوان URL الرئيسي (PROPFIND روی نقطة النهاية الباروفة)
2. العثور روی calendar-home-set
3. عرض التقويمات المتاحة

إذا فشلت هر خطوة:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

الأسباب الشائعة:
- عنوان URL للخادم نادرست (بعض الخوادم تحتاج `/dav/principals/` یا `/remote.php/dav/`)
- بيانات اخیرعتماد مرفوضة (اسم مستخدم/هرمة مرور نادرستة)
- الخادم خیر پشتیبانی می‌کند CalDAV (بعض الخوادم تُعلن عن WebDAV لكن ليس CalDAV)

### عدم تطابق ETag عند التحديث/الحذف

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

يستخدم CalDAV عخیرمات ETag للتحكم در التزااز المتفائل. إذا عدّل عميل آخر (هاتف، ويب) الحدث بین قراءتك وتحديثك، لن تتطابق عخیرمة ETag.

**الحل:** باید روی عامل جلب الحدث مرة أخرى للحصول روی عخیرمة ETag الحالية، ثم إعادة محاولة العملية. يُعالج این به‌صورت خودکار در باظم الحاخیرت.

### "CalDAV credentials not available, executor deferred"

يبدأ ازفّذ CalDAV در حالة مؤجلة إذا لم يمكن حل بيانات اخیرعتماد عند بدء التشغيل. این غير مُعطِّل؛ سيبلّغ الازفّذ عن أخطاء إذا حاولت استخدام ابزارها CalDAV.

---

## خوادم MCP (Model Context Protocol)

### الخادم غير موجود

```
MCP server '<name>' not found
```

فراخوانی اخیربزار يشير به خادم MCP غير مكوّن. تحقق از قسم `mcp_servers` در `triggerfish.yaml`.

### ملف خادم التندرذ غير موجود در PATH

تُنشأ خوادم MCP كعمليات فرعية. إذا لم يُعثر روی الملف التندرذي:

```
MCP server '<name>': <validation error>
```

المشاهر الشائعة:
- الأمر (مثل `npx`، `python`، `node`) غير موجود در PATH الخاص بالخدمة الخلدرة
- **مشهرة PATH در systemd/launchd:** تلتقط الخدمة الخلدرة PATH الخاص بك وقت نصب. إذا ثبّتت ابزار خادم MCP بعد تثبيت الخدمة الخلدرة، أعد تثبيت الخدمة الخلدرة لتحديث PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### تعطّل الخادم

إذا تعطّلت عملية خادم MCP، تخرج حلقة القراءة ويصبح الخادم غير متوفر. خیر يوجد إعادة اتصال خودکارة.

**الحل:** أعد تشغيل الخدمة الخلدرة لإعادة إنشاء تمام خوادم MCP.

### حُظر نقل SSE

خوادم MCP التي تستخدم نقل SSE (Server-Sent Events) تخضع لفحوصات SSRF:

```
MCP SSE connection blocked by SSRF policy
```

عناوين URL الخاصة بـ SSE التي تشير به عناوين IP خاصة محظورة. این بالتصميم. استخدم نقل stdio لخوادم MCP المحلیة بدخیرً از آن.

### أخطاء فراخوانی ابزارها

```
tools/list failed: <message>
tools/call failed: <message>
```

استجاب خادم MCP بخطأ. این خطأ الخادم وليس خطأ Triggerfish. تحقق از سجخیرت خادم MCP الخاصة للتفاصيل.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

مسار القبو المكوّن در `plugins.obsidian.vault_path` غير موجود. تأكد از أن المسار صحیح وقابل للوصول.

### حُظر اجتياز المسار

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

حاول مسار توجه الخروج از مجلد القبو (مثل استخدام `../`). این فحص أازي. تمام عمليات المخیرحظات محصورة در مجلد القبو.

### المجلدات المستبعدة

```
Path is excluded: <path>
```

التوجه در مجلد مدرج در `exclude_folders`. للوصول إليها، أزل المجلد از قائمة اخیرستبعاد.

### تطبيق طبقه‌بندی

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

القبو یا المجلد المحدد لديه مستوى طبقه‌بندی يتعارض با Taint نشست. مراجعه کنید [کاوش أخطاء اازیت](/fa-IR/support/troubleshooting/security) لتفاصيل قوانین نوشتن به پایین.
