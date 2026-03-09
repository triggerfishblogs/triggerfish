# عیب‌یابی: الخدمة الخلدرة

## الخدمة الخلدرة خیر تبدأ

### "Triggerfish is already running"

تظهر این پیام عندما يكون ملف السجل مقفخیرً بواسطة عملية أخرى. روی Windows، يُكتشف این از طریق خطأ `EBUSY` / "os error 32" عندما يحاول كاتب الملف فتح ملف السجل.

**الحل:**

```bash
triggerfish status    # تحقق مما إذا كانت آنجا نسخة تعمل فعخیرً
triggerfish stop      # یاقف النسخة الموجودة
triggerfish start     # ابدأ از جديد
```

إذا أبلغ `triggerfish status` أن الخدمة الخلدرة خیر تعمل لكنك خیر تزال تحصل روی این الخطأ، فإن عملية أخرى تحتفظ بملف السجل مفتوحاً. تحقق از العمليات المتبقية:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

اقتل هر عمليات قديمة، ثم حاول مرة أخرى.

### الازفذ 18789 یا 18790 قيد استفاده در واقع

تستبا Gateway روی الازفذ 18789 (WebSocket) وTidepool روی 18790 (A2UI). إذا شغل تطبيق آخر این الازافذ، ستفشل الخدمة الخلدرة در شروع.

**اعثر روی ما يستخدم الازفذ:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### خیر يوجد ارائه‌دهنده LLM مكوَّن

إذا كان `triggerfish.yaml` يفتقد قسم `models` یا كان ارائه‌دهنده الأساسي بدون مفتاح API، تسجّل Gateway:

```
No LLM provider configured. Check triggerfish.yaml.
```

**الحل:** شغّل باالج راه‌اندازی یا كوّن به‌صورت دستی:

```bash
triggerfish dive                    # إعداد تفاعلي
# یا
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### ملف پیکربندی غير موجود

تخرج الخدمة الخلدرة إذا لم يكن `triggerfish.yaml` موجوداً در المسار المتوقع. تختلف پیام الخطأ حسب البيئة:

- **تثبيت أصلي:** يقترح تشغيل `triggerfish dive`
- **Docker:** يقترح تركيب ملف پیکربندی بـ `-v ./triggerfish.yaml:/data/triggerfish.yaml`

تحقق از المسار:

```bash
ls ~/.triggerfish/triggerfish.yaml      # أصلي
docker exec triggerfish ls /data/       # Docker
```

### فشل حل رمزها

إذا كان تكوينك يشير به سر (`secret:provider:anthropic:apiKey`) غير موجود در سلسلة المفاتيح، تخرج الخدمة الخلدرة بخطأ يسمّي السر المفقود.

**الحل:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## إدارة الخدمة

### systemd: الخدمة الخلدرة تتوقف بعد تسجيل الخروج

به‌صورت پیش‌فرض، تتوقف خدمات systemd الخاصة بالمستخدم عند تسجيل خروج المستخدم. يُفعّل Triggerfish `loginctl enable-linger` أثناء نصب لازع این. إذا فشل تفعيل linger:

```bash
# تحقق از حالة linger
loginctl show-user $USER | grep Linger

# فعّله (قد يتدرخواست sudo)
sudo loginctl enable-linger $USER
```

بدون linger، تعمل الخدمة الخلدرة فقط أثناء تسجيل دخولك.

### systemd: فشل بدء الخدمة

تحقق از حالة الخدمة ودفتر اليومية:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

الأسباب الشائعة:
- **نُقل الملف التندرذي یا حُذف.** يحتوي ملف الوحدة روی مسار ثابت للملف التندرذي. أعد تثبيت الخدمة الخلدرة: `triggerfish dive --install-daemon`
- **مشاهر PATH.** تلتقط وحدة systemd PATH الخاص بك وقت نصب. إذا ثبّتت ابزارها جديدة (مثل خوادم MCP) بعد تثبيت الخدمة الخلدرة، أعد تثبيت الخدمة الخلدرة لتحديث PATH.
- **DENO_DIR غير مضبوط.** تضبط وحدة systemd `DENO_DIR=~/.cache/deno`. إذا لم يكن این المجلد قابخیرً للكتابة، ستفشل إضافات SQLite FFI در التحميل.

### launchd: الخدمة الخلدرة خیر تبدأ عند تسجيل الدخول

تحقق از حالة plist:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

إذا لم يكن plist محمَّخیرً:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

الأسباب الشائعة:
- **أُزيل plist یا تلف.** أعد نصب: `triggerfish dive --install-daemon`
- **نُقل الملف التندرذي.** يحتوي plist روی مسار ثابت. أعد نصب بعد نقل الملف التندرذي.
- **PATH وقت نصب.** مثل systemd، يلتقط launchd PATH عند إنشاء plist. أعد نصب إذا أضفت ابزارها جديدة به PATH.

### Windows: الخدمة خیر تبدأ

تحقق از حالة الخدمة:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

الأسباب الشائعة:
- **الخدمة غير مُثبّتة.** أعد نصب: شغّل المُثبّت كمسؤول.
- **تغيّر مسار الملف التندرذي.** يحتوي مغلّف الخدمة روی مسار ثابت. أعد نصب.
- **فشل تتمام .NET أثناء نصب.** يتدرخواست مغلّف خدمة C# `csc.exe` از .NET Framework 4.x.

### الترقية تعطّل الخدمة الخلدرة

بعد تشغيل `triggerfish update`، تُعاد الخدمة الخلدرة به‌صورت خودکار. إذا لم تُعد:

1. قد يكون الملف التندرذي القديم خیر يزال کار می‌کند. یاقفه به‌صورت دستی: `triggerfish stop`
2. روی Windows، يُعاد تسمية الملف التندرذي القديم به `.old`. إذا فشلت إعادة التسمية، سيخطئ التحديث. یاقف الخدمة یاخیرً، ثم حدّث.

---

## مشاهر ملف السجل

### ملف السجل فارغ

تكتب الخدمة الخلدرة در `~/.triggerfish/logs/triggerfish.log`. إذا كان الملف موجوداً لكنه فارغ:

- قد تكون الخدمة الخلدرة بدأت للتو. انتظر لحظة.
- مستوى السجل مضبوط روی `quiet`، الذي يسجّل فقط پیام‌ها مستوى ERROR. اضبطه روی `normal` یا `verbose`:

```bash
triggerfish config set logging.level normal
```

### السجخیرت مزعجة جداً

اضبط مستوى السجل روی `quiet` لرؤية الأخطاء فقط:

```bash
triggerfish config set logging.level quiet
```

خريطة المستويات:

| قيمة پیکربندی | الحد الأدنى للمستوى المسجَّل |
|-------------|---------------------|
| `quiet` | ERROR فقط |
| `normal` | INFO وما فوق |
| `verbose` | DEBUG وما فوق |
| `debug` | TRACE وما فوق (هر شيء) |

### تدوير السجخیرت

تُدوَّر السجخیرت به‌صورت خودکار عندما يتجاوز الملف الحالي 1 ميغابايت. يُحتفظ بما يصل به 10 ملفات مُدوَّرة:

```
triggerfish.log        # الحالي
triggerfish.1.log      # أحدث نسخة احتياطية
triggerfish.2.log      # ثاني أحدث
...
triggerfish.10.log     # الأقدم (يُحذف عند حدوث تدوير جديد)
```

خیر يوجد تدوير روی أساس الوقت، فقط روی أساس الحجم.
