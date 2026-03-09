# استكشاف الأخطاء: الخدمة الخلفية

## الخدمة الخلفية لا تبدأ

### "Triggerfish is already running"

تظهر هذه الرسالة عندما يكون ملف السجل مقفلاً بواسطة عملية أخرى. على Windows، يُكتشف هذا عبر خطأ `EBUSY` / "os error 32" عندما يحاول كاتب الملف فتح ملف السجل.

**الحل:**

```bash
triggerfish status    # تحقق مما إذا كانت هناك نسخة تعمل فعلاً
triggerfish stop      # أوقف النسخة الموجودة
triggerfish start     # ابدأ من جديد
```

إذا أبلغ `triggerfish status` أن الخدمة الخلفية لا تعمل لكنك لا تزال تحصل على هذا الخطأ، فإن عملية أخرى تحتفظ بملف السجل مفتوحاً. تحقق من العمليات المتبقية:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

اقتل أي عمليات قديمة، ثم حاول مرة أخرى.

### المنفذ 18789 أو 18790 قيد الاستخدام بالفعل

تستمع البوابة على المنفذ 18789 (WebSocket) وTidepool على 18790 (A2UI). إذا شغل تطبيق آخر هذه المنافذ، ستفشل الخدمة الخلفية في البدء.

**اعثر على ما يستخدم المنفذ:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### لا يوجد مزود LLM مكوَّن

إذا كان `triggerfish.yaml` يفتقد قسم `models` أو كان المزود الأساسي بدون مفتاح API، تسجّل البوابة:

```
No LLM provider configured. Check triggerfish.yaml.
```

**الحل:** شغّل معالج الإعداد أو كوّن يدوياً:

```bash
triggerfish dive                    # إعداد تفاعلي
# أو
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### ملف التكوين غير موجود

تخرج الخدمة الخلفية إذا لم يكن `triggerfish.yaml` موجوداً في المسار المتوقع. تختلف رسالة الخطأ حسب البيئة:

- **تثبيت أصلي:** يقترح تشغيل `triggerfish dive`
- **Docker:** يقترح تركيب ملف التكوين بـ `-v ./triggerfish.yaml:/data/triggerfish.yaml`

تحقق من المسار:

```bash
ls ~/.triggerfish/triggerfish.yaml      # أصلي
docker exec triggerfish ls /data/       # Docker
```

### فشل حل الأسرار

إذا كان تكوينك يشير إلى سر (`secret:provider:anthropic:apiKey`) غير موجود في سلسلة المفاتيح، تخرج الخدمة الخلفية بخطأ يسمّي السر المفقود.

**الحل:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## إدارة الخدمة

### systemd: الخدمة الخلفية تتوقف بعد تسجيل الخروج

افتراضياً، تتوقف خدمات systemd الخاصة بالمستخدم عند تسجيل خروج المستخدم. يُفعّل Triggerfish `loginctl enable-linger` أثناء التثبيت لمنع هذا. إذا فشل تفعيل linger:

```bash
# تحقق من حالة linger
loginctl show-user $USER | grep Linger

# فعّله (قد يتطلب sudo)
sudo loginctl enable-linger $USER
```

بدون linger، تعمل الخدمة الخلفية فقط أثناء تسجيل دخولك.

### systemd: فشل بدء الخدمة

تحقق من حالة الخدمة ودفتر اليومية:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

الأسباب الشائعة:
- **نُقل الملف التنفيذي أو حُذف.** يحتوي ملف الوحدة على مسار ثابت للملف التنفيذي. أعد تثبيت الخدمة الخلفية: `triggerfish dive --install-daemon`
- **مشاكل PATH.** تلتقط وحدة systemd PATH الخاص بك وقت التثبيت. إذا ثبّتت أدوات جديدة (مثل خوادم MCP) بعد تثبيت الخدمة الخلفية، أعد تثبيت الخدمة الخلفية لتحديث PATH.
- **DENO_DIR غير مضبوط.** تضبط وحدة systemd `DENO_DIR=~/.cache/deno`. إذا لم يكن هذا المجلد قابلاً للكتابة، ستفشل إضافات SQLite FFI في التحميل.

### launchd: الخدمة الخلفية لا تبدأ عند تسجيل الدخول

تحقق من حالة plist:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

إذا لم يكن plist محمَّلاً:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

الأسباب الشائعة:
- **أُزيل plist أو تلف.** أعد التثبيت: `triggerfish dive --install-daemon`
- **نُقل الملف التنفيذي.** يحتوي plist على مسار ثابت. أعد التثبيت بعد نقل الملف التنفيذي.
- **PATH وقت التثبيت.** مثل systemd، يلتقط launchd PATH عند إنشاء plist. أعد التثبيت إذا أضفت أدوات جديدة إلى PATH.

### Windows: الخدمة لا تبدأ

تحقق من حالة الخدمة:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

الأسباب الشائعة:
- **الخدمة غير مُثبّتة.** أعد التثبيت: شغّل المُثبّت كمسؤول.
- **تغيّر مسار الملف التنفيذي.** يحتوي مغلّف الخدمة على مسار ثابت. أعد التثبيت.
- **فشل تجميع .NET أثناء التثبيت.** يتطلب مغلّف خدمة C# `csc.exe` من .NET Framework 4.x.

### الترقية تعطّل الخدمة الخلفية

بعد تشغيل `triggerfish update`، تُعاد الخدمة الخلفية تلقائياً. إذا لم تُعد:

1. قد يكون الملف التنفيذي القديم لا يزال يعمل. أوقفه يدوياً: `triggerfish stop`
2. على Windows، يُعاد تسمية الملف التنفيذي القديم إلى `.old`. إذا فشلت إعادة التسمية، سيخطئ التحديث. أوقف الخدمة أولاً، ثم حدّث.

---

## مشاكل ملف السجل

### ملف السجل فارغ

تكتب الخدمة الخلفية في `~/.triggerfish/logs/triggerfish.log`. إذا كان الملف موجوداً لكنه فارغ:

- قد تكون الخدمة الخلفية بدأت للتو. انتظر لحظة.
- مستوى السجل مضبوط على `quiet`، الذي يسجّل فقط رسائل مستوى ERROR. اضبطه على `normal` أو `verbose`:

```bash
triggerfish config set logging.level normal
```

### السجلات مزعجة جداً

اضبط مستوى السجل على `quiet` لرؤية الأخطاء فقط:

```bash
triggerfish config set logging.level quiet
```

خريطة المستويات:

| قيمة التكوين | الحد الأدنى للمستوى المسجَّل |
|-------------|---------------------|
| `quiet` | ERROR فقط |
| `normal` | INFO وما فوق |
| `verbose` | DEBUG وما فوق |
| `debug` | TRACE وما فوق (كل شيء) |

### تدوير السجلات

تُدوَّر السجلات تلقائياً عندما يتجاوز الملف الحالي 1 ميغابايت. يُحتفظ بما يصل إلى 10 ملفات مُدوَّرة:

```
triggerfish.log        # الحالي
triggerfish.1.log      # أحدث نسخة احتياطية
triggerfish.2.log      # ثاني أحدث
...
triggerfish.10.log     # الأقدم (يُحذف عند حدوث تدوير جديد)
```

لا يوجد تدوير على أساس الوقت، فقط على أساس الحجم.
