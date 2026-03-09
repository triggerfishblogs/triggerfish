# مرجع خطاها

فهرس قابل للبحث لپیام‌ها الخطأ. استخدم بحث متصفحك (Ctrl+F / Cmd+F) للبحث عن نص الخطأ الدقيق الذي تراه در سجخیرتك.

## بدء التشغيل والخدمة الخلدرة

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Fatal startup error` | استثناء غير باالج أثناء تمهيد Gateway | تحقق از تتبع المكدس الكامل در السجخیرت |
| `Daemon start failed` | مدير الخدمة لم يستطع بدء الخدمة الخلدرة | تحقق از `triggerfish logs` یا دفتر يومية النظام |
| `Daemon stop failed` | مدير الخدمة لم يستطع إيقاف الخدمة الخلدرة | اقتل العملية به‌صورت دستی |
| `Failed to load configuration` | ملف پیکربندی غير قابل للقراءة یا مشوّه | شغّل `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | قسم `models` مفقود یا خیر يوجد ارائه‌دهنده محدد | كوّن ارائه‌دهندهاً واحداً روی الأقل |
| `Configuration file not found` | `triggerfish.yaml` غير موجود در المسار المتوقع | شغّل `triggerfish dive` یا أنشئه به‌صورت دستی |
| `Configuration parse failed` | خطأ در صيغة YAML | أصلح صيغة YAML (تحقق از المسافات البادئة والنقطتين واخیرقتباسات) |
| `Configuration file did not parse to an object` | YAML تم تحليله لكن النتيجة ليست تعييناً | تأكد از أن المستوى الأروی هو تعيين YAML وليس قائمة یا مفردة |
| `Configuration validation failed` | حقول الزامیة مفقودة یا قيم غير صالحة | تحقق از پیام التحقق المحددة |
| `Triggerfish is already running` | ملف السجل مقفل بنسخة أخرى | یاقف النسخة العاملة یاخیرً |
| `Linger enable failed` | `loginctl enable-linger` لم ينجح | شغّل `sudo loginctl enable-linger $USER` |

## مدیریت رمزها

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Secret store failed` | لم يمكن تهيئة واجهة رمزها الخلدرة | تحقق از توفر keychain/libsecret |
| `Secret not found` | مفتاح السر المُشار إليه غير موجود | خزّنه: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | أذونات ملف المفتاح یاسع از 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | ملف المفتاح غير قابل للقراءة یا مقتطع | احذفه وأعد ذخیره‌سازی تمام رمزها |
| `Machine key chmod failed` | نمی‌توان ضبط الأذونات روی ملف المفتاح | تحقق از دعم سیستم فایل لـ chmod |
| `Secret file permissions too open` | ملف رمزها لديه أذونات مفتوحة جداً | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | نمی‌توان ضبط الأذونات روی ملف رمزها | تحقق از نوع سیستم فایل |
| `Secret backend selection failed` | نظام تشغيل غير مدعوم یا خیر توجد کلیدزنجیر | استخدم Docker یا فعّل البديل در حافظه |
| `Migrating legacy plaintext secrets to encrypted format` | اكتُشف ملف رمزها بتنسيق قديم (INFO وليس خطأ) | خیر يلزم إجراء؛ الترحيل خودکار |

## ارائه‌دهندگان LLM

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Primary provider not found in registry` | اسم ارائه‌دهنده در `models.primary.provider` غير موجود در `models.providers` | أصلح اسم ارائه‌دهنده |
| `Classification model provider not configured` | `classification_models` يشير به ارائه‌دهنده غير باروف | أضف ارائه‌دهنده به `models.providers` |
| `All providers exhausted` | فشل هر ارائه‌دهنده در سلسلة التبديل | تحقق از تمام مفاتيح API وحالة ارائه‌دهندهين |
| `Provider request failed with retryable error, retrying` | خطأ مؤقت، إعادة المحاولة جارية | انتظر؛ این استرداد خودکار |
| `Provider stream connection failed, retrying` | انقطع اتصال البث | انتظر؛ این استرداد خودکار |
| `Local LLM request failed (status): text` | أرجع Ollama/LM Studio خطأ | تحقق از أن الخادم المحلی کار می‌کند ومدل محمّل |
| `No response body for streaming` | أرجع ارائه‌دهنده پاسخ بث فارغة | أعد المحاولة؛ قد تكون مشهرة مؤقتة در ارائه‌دهنده |
| `Unknown provider name in createProviderByName` | الكود يشير به نوع ارائه‌دهنده غير موجود | تحقق از كتابة اسم ارائه‌دهنده |

## کانال‌ها

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Channel send failed` | الموجّه لم يستطع تسليم پیام | تحقق از أخطاء کانال المحددة در السجخیرت |
| `WebSocket connection failed` | مکالمه CLI خیر تستطيع الوصول به Gateway | تحقق از أن الخدمة الخلدرة تعمل |
| `Message parse failed` | استُقبل JSON مشوّه از کانال | تحقق از أن العميل يرسل JSON صالح |
| `WebSocket upgrade rejected` | رُفض اخیرتصال از Gateway | تحقق از رمز احراز هویت ورؤوس الأصل |
| `Chat WebSocket message rejected: exceeds size limit` | جسم پیام يتجاوز 1 ميغابايت | أرسل پیام‌ها أصغر |
| `Discord channel configured but botToken is missing` | تكوين Discord موجود لكن الرمز فارغ | اضبط رمز البوت |
| `WhatsApp send failed (status): error` | رفض Meta API درخواست الإرسال | تحقق از صخیرحية رمز الوصول |
| `Signal connect failed` | نمی‌توان الوصول به خدمة signal-cli | تحقق از أن signal-cli کار می‌کند |
| `Signal ping failed after retries` | signal-cli کار می‌کند لكنه خیر يستجيب | أعد تشغيل signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli لم يبدأ در الوقت المحدد | تحقق از تثبيت Java وإعداد signal-cli |
| `IMAP LOGIN failed` | بيانات اعتماد IMAP نادرستة | تحقق از اسم المستخدم وهرمة المرور |
| `IMAP connection not established` | نمی‌توان الوصول به خادم IMAP | تحقق از اسم المضيف والازفذ 993 |
| `Google Chat PubSub poll failed` | نمی‌توان السحب از اشتراك Pub/Sub | تحقق از بيانات اعتماد Google Cloud |
| `Clipboard image rejected: exceeds size limit` | الصورة الملصقة كبيرة جداً لمخزن الإدخال | استخدم صورة أصغر |

## یکپارچه‌سازی‌ها

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Google OAuth token exchange failed` | فشل تبادل كود OAuth | أعد احراز هویت: `triggerfish connect google` |
| `GitHub token verification failed` | PAT غير صالح یا ازتهي الصخیرحية | أعد ذخیره‌سازی: `triggerfish connect github` |
| `GitHub API request failed` | أرجع GitHub API خطأ | تحقق از نطاقات الرمز وحدود البادل |
| `Clone failed` | فشل git clone | تحقق از الرمز والوصول للمستودع والشبكة |
| `Notion enabled but token not found in keychain` | رمز یکپارچه‌سازی Notion غير مخزّن | شغّل `triggerfish connect notion` |
| `Notion API rate limited` | تجاوز 3 درخواستات/ثانية | انتظر إعادة المحاولة الخودکارة (حتى 3 محاوخیرت) |
| `Notion API network request failed` | نمی‌توان الوصول به api.notion.com | تحقق از اتصال الشبكة |
| `CalDAV credential resolution failed` | اسم مستخدم یا هرمة مرور CalDAV مفقودة | اضبط بيانات اخیرعتماد در پیکربندی وسلسلة المفاتيح |
| `CalDAV principal discovery failed` | نمی‌توان العثور روی عنوان URL الرئيسي لـ CalDAV | تحقق از تنسيق عنوان URL للخادم |
| `MCP server 'name' not found` | خادم MCP المُشار إليه غير موجود در پیکربندی | أضفه به `mcp_servers` در پیکربندی |
| `MCP SSE connection blocked by SSRF policy` | عنوان URL لـ MCP SSE يشير به IP خاص | استخدم نقل stdio بدخیرً از آن |
| `Vault path does not exist` | مسار قبو Obsidian نادرست | أصلح `plugins.obsidian.vault_path` |
| `Path traversal rejected` | مسار التوجه حاول الخروج از مجلد القبو | استخدم مسارات داخل القبو |

## اازیت وسیاست

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Write-down blocked` | بيانات تتدفق از طبقه‌بندی عالٍ به ازخفض | استخدم کانال/ابزار بسطح طبقه‌بندی الازاسب |
| `SSRF blocked: hostname resolves to private IP` | درخواست صادر يستهدف الشبكة الداخلية | نمی‌توان تعطيله؛ استخدم عنوان URL عام |
| `Hook evaluation failed, defaulting to BLOCK` | رمى Hook سیاست استثناءً | تحقق از قوانین سیاست المخصصة |
| `Policy rule blocked action` | رفضت قانون سیاست الإجراء | مراجعه کنید `policy.rules` در پیکربندی |
| `Tool floor violation` | اخیربزار تتدرخواست طبقه‌بندیاً أروی مما لدى نشست | صعّد نشست یا استخدم ابزار مختلفة |
| `Plugin network access blocked` | حاولت الplugin الوصول به عنوان URL غير مُصرَّح | باید أن تُعلن الplugin عن نقاط النهاية در بيانها |
| `Plugin SSRF blocked` | عنوان URL للplugin يحل به IP خاص | خیر تستطيع الplugin الوصول به الشبكات الخاصة |
| `Skill activation blocked by classification ceiling` | Taint نشست يتجاوز سقف المهارت | نمی‌توان استخدام این المهارت عند مستوى Taint الحالي |
| `Skill content integrity check failed` | عُدّلت ملفات المهارت بعد نصب | أعد تثبيت المهارت |
| `Skill install rejected by scanner` | وجد الماسح الأازي محتوى مشبوهاً | مراجعه کنید هشدارات الفحص |
| `Delegation certificate signature invalid` | سلسلة تفویض لها توقيع غير صالح | أعد إصدار تفویض |
| `Delegation certificate expired` | انتهت صخیرحية تفویض | أعد الإصدار بمدة أطول |
| `Webhook HMAC verification failed` | توقيع webhook خیر يتطابق | تحقق از تكوين السر المشترك |
| `Webhook replay detected` | استُقبلت حمولة webhook مكررة | ليس خطأ إذا كان متوقعاً؛ وإخیر حقق |
| `Webhook rate limit exceeded` | عدد كبير جداً از فراخوانیات webhook از مصدر واحد | قلل تكرار webhook |

## مرورگر

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Browser launch failed` | لم يمكن بدء Chrome/Chromium | ثبّت متصفحاً مبنياً روی Chromium |
| `Direct Chrome process launch failed` | فشل تندرذ Chrome | تحقق از أذونات الملف التندرذي والتبعيات |
| `Flatpak Chrome launch failed` | فشل مغلّف Flatpak Chrome | تحقق از تثبيت Flatpak |
| `CDP endpoint not ready after Xms` | Chrome لم يفتح ازفذ التصحیح در الوقت المحدد | النظام قد يكون محدود الموارد |
| `Navigation blocked by domain policy` | عنوان URL يستهدف نطاقاً محظوراً یا IP خاص | استخدم عنوان URL عام |
| `Navigation failed` | خطأ تحميل الصفحة یا مهلة | تحقق از عنوان URL والشبكة |
| `Click/Type/Select failed on "selector"` | محدد CSS لم يطابق هر عنصر | تحقق از المحدد مقابل DOM الصفحة |
| `Snapshot failed` | لم يمكن التقاط حالة الصفحة | الصفحة قد تكون فارغة یا JavaScript أخطأ |

## التندرذ وبيئة العزل

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | محاولة اجتياز المسار در بيئة التندرذ | استخدم مسارات داخل مساحة العمل |
| `Working directory does not exist` | مجلد العمل المحدد غير موجود | أنشئ المجلد یاخیرً |
| `Workspace access denied for PUBLIC session` | نشست‌ها PUBLIC خیر تستطيع استخدام مساحات العمل | مساحة العمل تتدرخواست طبقه‌بندی INTERNAL+ |
| `Workspace path traversal attempt blocked` | المسار حاول الخروج از حدود مساحة العمل | استخدم مسارات نسبية داخل مساحة العمل |
| `Workspace agentId rejected: empty after sanitization` | بارّف عامل يحتوي فقط روی أحرف غير صالحة | تحقق از تكوين عامل |
| `Sandbox worker unhandled error` | عامل بيئة العزل للplugin تعطّل | تحقق از كود الplugin بحثاً عن أخطاء |
| `Sandbox has been shut down` | عملية روی بيئة عزل مدمّرة | أعد تشغيل الخدمة الخلدرة |

## المُجدوِل

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Trigger callback failed` | باالج المُنشّط رمى استثناءً | تحقق از TRIGGER.md بحثاً عن مشاهر |
| `Trigger store persist failed` | نمی‌توان حفظ نتائج المُنشّط | تحقق از اتصال ذخیره‌سازی |
| `Notification delivery failed` | لم يمكن إرسال إشعار المُنشّط | تحقق از اتصال کانال |
| `Cron expression parse error` | تعبير cron غير صالح | أصلح التعبير در `scheduler.cron.jobs` |

## به‌روزرسانی خودکار

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Triggerfish self-update failed` | عملية التحديث واجهت خطأ | تحقق از الخطأ المحدد در السجخیرت |
| `Binary replacement failed` | لم يمكن استبدال الملف التندرذي القديم بالجديد | تحقق از أذونات الملفات؛ یاقف الخدمة الخلدرة یاخیرً |
| `Checksum file download failed` | لم يمكن تنزيل SHA256SUMS.txt | تحقق از اتصال الشبكة |
| `Asset not found in SHA256SUMS.txt` | الإصدار يفتقد مجموعاً اختبارياً لازصتك | قدّم بخیرغاً روی GitHub |
| `Checksum verification exception` | تجزئة الملف التندرذي المُنزَّل خیر تتطابق | أعد المحاولة؛ التنزيل قد يكون تلف |
