# مرجع الأخطاء

فهرس قابل للبحث لرسائل الخطأ. استخدم بحث متصفحك (Ctrl+F / Cmd+F) للبحث عن نص الخطأ الدقيق الذي تراه في سجلاتك.

## بدء التشغيل والخدمة الخلفية

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Fatal startup error` | استثناء غير معالج أثناء تمهيد البوابة | تحقق من تتبع المكدس الكامل في السجلات |
| `Daemon start failed` | مدير الخدمة لم يستطع بدء الخدمة الخلفية | تحقق من `triggerfish logs` أو دفتر يومية النظام |
| `Daemon stop failed` | مدير الخدمة لم يستطع إيقاف الخدمة الخلفية | اقتل العملية يدوياً |
| `Failed to load configuration` | ملف التكوين غير قابل للقراءة أو مشوّه | شغّل `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | قسم `models` مفقود أو لا يوجد مزود محدد | كوّن مزوداً واحداً على الأقل |
| `Configuration file not found` | `triggerfish.yaml` غير موجود في المسار المتوقع | شغّل `triggerfish dive` أو أنشئه يدوياً |
| `Configuration parse failed` | خطأ في صيغة YAML | أصلح صيغة YAML (تحقق من المسافات البادئة والنقطتين والاقتباسات) |
| `Configuration file did not parse to an object` | YAML تم تحليله لكن النتيجة ليست تعييناً | تأكد من أن المستوى الأعلى هو تعيين YAML وليس قائمة أو مفردة |
| `Configuration validation failed` | حقول مطلوبة مفقودة أو قيم غير صالحة | تحقق من رسالة التحقق المحددة |
| `Triggerfish is already running` | ملف السجل مقفل بنسخة أخرى | أوقف النسخة العاملة أولاً |
| `Linger enable failed` | `loginctl enable-linger` لم ينجح | شغّل `sudo loginctl enable-linger $USER` |

## إدارة الأسرار

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Secret store failed` | لم يمكن تهيئة واجهة الأسرار الخلفية | تحقق من توفر keychain/libsecret |
| `Secret not found` | مفتاح السر المُشار إليه غير موجود | خزّنه: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | أذونات ملف المفتاح أوسع من 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | ملف المفتاح غير قابل للقراءة أو مقتطع | احذفه وأعد تخزين جميع الأسرار |
| `Machine key chmod failed` | لا يمكن ضبط الأذونات على ملف المفتاح | تحقق من دعم نظام الملفات لـ chmod |
| `Secret file permissions too open` | ملف الأسرار لديه أذونات مفتوحة جداً | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | لا يمكن ضبط الأذونات على ملف الأسرار | تحقق من نوع نظام الملفات |
| `Secret backend selection failed` | نظام تشغيل غير مدعوم أو لا توجد سلسلة مفاتيح | استخدم Docker أو فعّل البديل في الذاكرة |
| `Migrating legacy plaintext secrets to encrypted format` | اكتُشف ملف أسرار بتنسيق قديم (INFO وليس خطأ) | لا يلزم إجراء؛ الترحيل تلقائي |

## مزودو LLM

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Primary provider not found in registry` | اسم المزود في `models.primary.provider` غير موجود في `models.providers` | أصلح اسم المزود |
| `Classification model provider not configured` | `classification_models` يشير إلى مزود غير معروف | أضف المزود إلى `models.providers` |
| `All providers exhausted` | فشل كل مزود في سلسلة التبديل | تحقق من جميع مفاتيح API وحالة المزودين |
| `Provider request failed with retryable error, retrying` | خطأ مؤقت، إعادة المحاولة جارية | انتظر؛ هذا استرداد تلقائي |
| `Provider stream connection failed, retrying` | انقطع اتصال البث | انتظر؛ هذا استرداد تلقائي |
| `Local LLM request failed (status): text` | أرجع Ollama/LM Studio خطأ | تحقق من أن الخادم المحلي يعمل والنموذج محمّل |
| `No response body for streaming` | أرجع المزود استجابة بث فارغة | أعد المحاولة؛ قد تكون مشكلة مؤقتة في المزود |
| `Unknown provider name in createProviderByName` | الكود يشير إلى نوع مزود غير موجود | تحقق من كتابة اسم المزود |

## القنوات

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Channel send failed` | الموجّه لم يستطع تسليم رسالة | تحقق من أخطاء القناة المحددة في السجلات |
| `WebSocket connection failed` | محادثة CLI لا تستطيع الوصول إلى البوابة | تحقق من أن الخدمة الخلفية تعمل |
| `Message parse failed` | استُقبل JSON مشوّه من القناة | تحقق من أن العميل يرسل JSON صالح |
| `WebSocket upgrade rejected` | رُفض الاتصال من البوابة | تحقق من رمز المصادقة ورؤوس الأصل |
| `Chat WebSocket message rejected: exceeds size limit` | جسم الرسالة يتجاوز 1 ميغابايت | أرسل رسائل أصغر |
| `Discord channel configured but botToken is missing` | تكوين Discord موجود لكن الرمز فارغ | اضبط رمز البوت |
| `WhatsApp send failed (status): error` | رفض Meta API طلب الإرسال | تحقق من صلاحية رمز الوصول |
| `Signal connect failed` | لا يمكن الوصول إلى خدمة signal-cli | تحقق من أن signal-cli يعمل |
| `Signal ping failed after retries` | signal-cli يعمل لكنه لا يستجيب | أعد تشغيل signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli لم يبدأ في الوقت المحدد | تحقق من تثبيت Java وإعداد signal-cli |
| `IMAP LOGIN failed` | بيانات اعتماد IMAP خاطئة | تحقق من اسم المستخدم وكلمة المرور |
| `IMAP connection not established` | لا يمكن الوصول إلى خادم IMAP | تحقق من اسم المضيف والمنفذ 993 |
| `Google Chat PubSub poll failed` | لا يمكن السحب من اشتراك Pub/Sub | تحقق من بيانات اعتماد Google Cloud |
| `Clipboard image rejected: exceeds size limit` | الصورة الملصقة كبيرة جداً لمخزن الإدخال | استخدم صورة أصغر |

## التكاملات

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Google OAuth token exchange failed` | فشل تبادل كود OAuth | أعد المصادقة: `triggerfish connect google` |
| `GitHub token verification failed` | PAT غير صالح أو منتهي الصلاحية | أعد التخزين: `triggerfish connect github` |
| `GitHub API request failed` | أرجع GitHub API خطأ | تحقق من نطاقات الرمز وحدود المعدل |
| `Clone failed` | فشل git clone | تحقق من الرمز والوصول للمستودع والشبكة |
| `Notion enabled but token not found in keychain` | رمز تكامل Notion غير مخزّن | شغّل `triggerfish connect notion` |
| `Notion API rate limited` | تجاوز 3 طلبات/ثانية | انتظر إعادة المحاولة التلقائية (حتى 3 محاولات) |
| `Notion API network request failed` | لا يمكن الوصول إلى api.notion.com | تحقق من اتصال الشبكة |
| `CalDAV credential resolution failed` | اسم مستخدم أو كلمة مرور CalDAV مفقودة | اضبط بيانات الاعتماد في التكوين وسلسلة المفاتيح |
| `CalDAV principal discovery failed` | لا يمكن العثور على عنوان URL الرئيسي لـ CalDAV | تحقق من تنسيق عنوان URL للخادم |
| `MCP server 'name' not found` | خادم MCP المُشار إليه غير موجود في التكوين | أضفه إلى `mcp_servers` في التكوين |
| `MCP SSE connection blocked by SSRF policy` | عنوان URL لـ MCP SSE يشير إلى IP خاص | استخدم نقل stdio بدلاً من ذلك |
| `Vault path does not exist` | مسار قبو Obsidian خاطئ | أصلح `plugins.obsidian.vault_path` |
| `Path traversal rejected` | مسار الملاحظة حاول الخروج من مجلد القبو | استخدم مسارات داخل القبو |

## الأمان والسياسة

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Write-down blocked` | بيانات تتدفق من تصنيف عالٍ إلى منخفض | استخدم قناة/أداة بمستوى التصنيف المناسب |
| `SSRF blocked: hostname resolves to private IP` | طلب صادر يستهدف الشبكة الداخلية | لا يمكن تعطيله؛ استخدم عنوان URL عام |
| `Hook evaluation failed, defaulting to BLOCK` | رمى خطاف سياسة استثناءً | تحقق من قواعد السياسة المخصصة |
| `Policy rule blocked action` | رفضت قاعدة سياسة الإجراء | راجع `policy.rules` في التكوين |
| `Tool floor violation` | الأداة تتطلب تصنيفاً أعلى مما لدى الجلسة | صعّد الجلسة أو استخدم أداة مختلفة |
| `Plugin network access blocked` | حاولت الإضافة الوصول إلى عنوان URL غير مُصرَّح | يجب أن تُعلن الإضافة عن نقاط النهاية في بيانها |
| `Plugin SSRF blocked` | عنوان URL للإضافة يحل إلى IP خاص | لا تستطيع الإضافة الوصول إلى الشبكات الخاصة |
| `Skill activation blocked by classification ceiling` | تلوث الجلسة يتجاوز سقف المهارة | لا يمكن استخدام هذه المهارة عند مستوى التلوث الحالي |
| `Skill content integrity check failed` | عُدّلت ملفات المهارة بعد التثبيت | أعد تثبيت المهارة |
| `Skill install rejected by scanner` | وجد الماسح الأمني محتوى مشبوهاً | راجع تحذيرات الفحص |
| `Delegation certificate signature invalid` | سلسلة التفويض لها توقيع غير صالح | أعد إصدار التفويض |
| `Delegation certificate expired` | انتهت صلاحية التفويض | أعد الإصدار بمدة أطول |
| `Webhook HMAC verification failed` | توقيع webhook لا يتطابق | تحقق من تكوين السر المشترك |
| `Webhook replay detected` | استُقبلت حمولة webhook مكررة | ليس خطأ إذا كان متوقعاً؛ وإلا حقق |
| `Webhook rate limit exceeded` | عدد كبير جداً من استدعاءات webhook من مصدر واحد | قلل تكرار webhook |

## المتصفح

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Browser launch failed` | لم يمكن بدء Chrome/Chromium | ثبّت متصفحاً مبنياً على Chromium |
| `Direct Chrome process launch failed` | فشل تنفيذ Chrome | تحقق من أذونات الملف التنفيذي والتبعيات |
| `Flatpak Chrome launch failed` | فشل مغلّف Flatpak Chrome | تحقق من تثبيت Flatpak |
| `CDP endpoint not ready after Xms` | Chrome لم يفتح منفذ التصحيح في الوقت المحدد | النظام قد يكون محدود الموارد |
| `Navigation blocked by domain policy` | عنوان URL يستهدف نطاقاً محظوراً أو IP خاص | استخدم عنوان URL عام |
| `Navigation failed` | خطأ تحميل الصفحة أو مهلة | تحقق من عنوان URL والشبكة |
| `Click/Type/Select failed on "selector"` | محدد CSS لم يطابق أي عنصر | تحقق من المحدد مقابل DOM الصفحة |
| `Snapshot failed` | لم يمكن التقاط حالة الصفحة | الصفحة قد تكون فارغة أو JavaScript أخطأ |

## التنفيذ وبيئة العزل

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | محاولة اجتياز المسار في بيئة التنفيذ | استخدم مسارات داخل مساحة العمل |
| `Working directory does not exist` | مجلد العمل المحدد غير موجود | أنشئ المجلد أولاً |
| `Workspace access denied for PUBLIC session` | الجلسات PUBLIC لا تستطيع استخدام مساحات العمل | مساحة العمل تتطلب تصنيف INTERNAL+ |
| `Workspace path traversal attempt blocked` | المسار حاول الخروج من حدود مساحة العمل | استخدم مسارات نسبية داخل مساحة العمل |
| `Workspace agentId rejected: empty after sanitization` | معرّف الوكيل يحتوي فقط على أحرف غير صالحة | تحقق من تكوين الوكيل |
| `Sandbox worker unhandled error` | عامل بيئة العزل للإضافة تعطّل | تحقق من كود الإضافة بحثاً عن أخطاء |
| `Sandbox has been shut down` | عملية على بيئة عزل مدمّرة | أعد تشغيل الخدمة الخلفية |

## المُجدوِل

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Trigger callback failed` | معالج المُنشّط رمى استثناءً | تحقق من TRIGGER.md بحثاً عن مشاكل |
| `Trigger store persist failed` | لا يمكن حفظ نتائج المُنشّط | تحقق من اتصال التخزين |
| `Notification delivery failed` | لم يمكن إرسال إشعار المُنشّط | تحقق من اتصال القناة |
| `Cron expression parse error` | تعبير cron غير صالح | أصلح التعبير في `scheduler.cron.jobs` |

## التحديث الذاتي

| الخطأ | السبب | الحل |
|-------|-------|-----|
| `Triggerfish self-update failed` | عملية التحديث واجهت خطأ | تحقق من الخطأ المحدد في السجلات |
| `Binary replacement failed` | لم يمكن استبدال الملف التنفيذي القديم بالجديد | تحقق من أذونات الملفات؛ أوقف الخدمة الخلفية أولاً |
| `Checksum file download failed` | لم يمكن تنزيل SHA256SUMS.txt | تحقق من اتصال الشبكة |
| `Asset not found in SHA256SUMS.txt` | الإصدار يفتقد مجموعاً اختبارياً لمنصتك | قدّم بلاغاً على GitHub |
| `Checksum verification exception` | تجزئة الملف التنفيذي المُنزَّل لا تتطابق | أعد المحاولة؛ التنزيل قد يكون تلف |
