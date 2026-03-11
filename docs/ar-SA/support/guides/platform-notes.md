# ملاحظات المنصة

السلوك والمتطلبات والخصائص المميزة لكل منصة.

## macOS

### مدير الخدمة: launchd

يُسجَّل Triggerfish كوكيل launchd في:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

يُضبط plist على `RunAtLoad: true` و`KeepAlive: true`، لذا تبدأ الخدمة الخلفية عند تسجيل الدخول وتُعاد تشغيلها إذا تعطّلت.

### التقاط PATH

يلتقط plist الخاص بـ launchd PATH لـ shell الخاص بك وقت التثبيت. هذا حرج لأن launchd لا يحمّل ملف تعريف shell الخاص بك. إذا ثبّتت تبعيات خادم MCP (مثل `npx`، `python`) بعد تثبيت الخدمة الخلفية، لن تكون تلك الملفات التنفيذية في PATH الخاص بالخدمة الخلفية.

**الحل:** أعد تثبيت الخدمة الخلفية لتحديث PATH الملتقط:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### العزل

يُطبّق macOS علامة عزل على الملفات التنفيذية المُنزَّلة. يمسح المُثبّت هذا بـ `xattr -cr`، لكن إذا نزّلت الملف التنفيذي يدوياً:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### سلسلة المفاتيح

تُخزَّن الأسرار في سلسلة مفاتيح تسجيل الدخول لـ macOS عبر أداة CLI `security`. إذا كانت Keychain Access مقفلة، ستفشل عمليات الأسرار حتى تفتحها (عادة بتسجيل الدخول).

### Homebrew Deno

إذا بنيت من المصدر وكان Deno مثبتاً عبر Homebrew، تأكد من أن مجلد bin الخاص بـ Homebrew في PATH قبل تشغيل سكربت التثبيت.

---

## Linux

### مدير الخدمة: systemd (وضع المستخدم)

تعمل الخدمة الخلفية كخدمة مستخدم systemd:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

افتراضياً، تتوقف خدمات مستخدم systemd عند تسجيل خروج المستخدم. يُفعّل Triggerfish linger وقت التثبيت:

```bash
loginctl enable-linger $USER
```

إذا فشل هذا (مثلاً مدير النظام عطّله)، تعمل الخدمة الخلفية فقط أثناء تسجيل دخولك. على الخوادم التي تريد استمرار الخدمة الخلفية، اطلب من مديرك تفعيل linger لحسابك.

### PATH والبيئة

تلتقط وحدة systemd PATH الخاص بك وتضبط `DENO_DIR=~/.cache/deno`. مثل macOS، تتطلب تغييرات PATH بعد التثبيت إعادة تثبيت الخدمة الخلفية.

تضبط الوحدة أيضاً `Environment=PATH=...` صراحة. إذا لم تستطع الخدمة الخلفية العثور على ملفات تنفيذ خادم MCP، فهذا السبب الأرجح.

### Fedora Atomic / Silverblue / Bazzite

أسطح مكتب Fedora Atomic تربط `/home` رمزياً بـ `/var/home`. يتعامل Triggerfish مع هذا تلقائياً عند حل مجلد المنزل، متبعاً الروابط الرمزية للعثور على المسار الحقيقي.

المتصفحات المثبتة بـ Flatpak تُكتشف وتُشغَّل عبر سكربت مُغلّف يستدعي `flatpak run`.

### الخوادم بدون واجهة رسومية

على الخوادم بدون بيئة سطح مكتب، قد لا يعمل خادم GNOME Keyring / Secret Service. راجع [استكشاف أخطاء الأسرار](/ar-SA/support/troubleshooting/secrets) لتعليمات الإعداد.

### SQLite FFI

تستخدم واجهة تخزين SQLite الخلفية `@db/sqlite`، التي تحمّل مكتبة أصلية عبر FFI. يتطلب هذا إذن `--allow-ffi` لـ Deno (مضمّن في الملف التنفيذي المُجمَّع). على بعض توزيعات Linux الحد الأدنى، قد تكون مكتبة C المشتركة أو التبعيات ذات الصلة مفقودة. ثبّت مكتبات التطوير الأساسية إذا رأيت أخطاء متعلقة بـ FFI.

---

## Windows

### مدير الخدمة: خدمة Windows

يُثبّت Triggerfish كخدمة Windows باسم "Triggerfish". الخدمة مُنفَّذة بمُغلّف C# يُجمَّع أثناء التثبيت باستخدام `csc.exe` من .NET Framework 4.x.

**المتطلبات:**
- .NET Framework 4.x (مثبّت على معظم أنظمة Windows 10/11)
- صلاحيات المسؤول لتثبيت الخدمة
- `csc.exe` متاح في مجلد .NET Framework

### استبدال الملف التنفيذي أثناء التحديثات

لا يسمح Windows بالكتابة فوق ملف تنفيذي قيد التشغيل. المُحدّث:

1. يُعيد تسمية الملف التنفيذي العامل إلى `triggerfish.exe.old`
2. ينسخ الملف التنفيذي الجديد إلى المسار الأصلي
3. يُعيد تشغيل الخدمة
4. ينظّف ملف `.old` عند البدء التالي

إذا فشلت إعادة التسمية أو النسخ، أوقف الخدمة يدوياً قبل التحديث.

### دعم ألوان ANSI

يُفعّل Triggerfish معالجة الطرفية الافتراضية لمخرجات الألوان. يعمل هذا في PowerShell الحديث وWindows Terminal. نوافذ `cmd.exe` القديمة قد لا تعرض الألوان بشكل صحيح.

### قفل الملفات الحصري

يستخدم Windows أقفال ملفات حصرية. إذا كانت الخدمة الخلفية تعمل وحاولت بدء نسخة أخرى، يمنع قفل ملف السجل ذلك:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

هذا الاكتشاف خاص بـ Windows ويعتمد على خطأ EBUSY / "os error 32" عند فتح ملف السجل.

### تخزين الأسرار

يستخدم Windows مخزن الملفات المشفر (AES-256-GCM) في `~/.triggerfish/secrets.json`. لا يوجد تكامل مع Windows Credential Manager. عامل ملف `secrets.key` كبيانات حساسة.

### ملاحظات مُثبّت PowerShell

مُثبّت PowerShell (`install.ps1`):
- يكتشف معمارية المعالج (x64/arm64)
- يُثبّت في `%LOCALAPPDATA%\Triggerfish`
- يضيف مجلد التثبيت إلى PATH المستخدم عبر السجل
- يُجمّع مُغلّف خدمة C#
- يُسجّل ويبدأ خدمة Windows

إذا فشل المُثبّت عند خطوة تجميع الخدمة، يمكنك تشغيل Triggerfish يدوياً:

```powershell
triggerfish run    # وضع المقدمة
```

---

## Docker

### بيئة تشغيل الحاوية

يدعم نشر Docker كلاً من Docker وPodman. الاكتشاف تلقائي، أو اضبطه صراحة:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### تفاصيل الصورة

- الأساس: `gcr.io/distroless/cc-debian12` (حد أدنى، بدون shell)
- نسخة التصحيح: `distroless:debug` (تتضمن shell لاستكشاف الأخطاء)
- تعمل كـ UID 65534 (nonroot)
- Init: `true` (إعادة توجيه إشارات PID 1 عبر `tini`)
- سياسة إعادة التشغيل: `unless-stopped`

### استمرار البيانات

جميع البيانات الدائمة في مجلد `/data` داخل الحاوية، مدعومة بوحدة تخزين Docker مسمّاة:

```
/data/
  triggerfish.yaml        # التكوين
  secrets.json            # الأسرار المشفرة
  secrets.key             # مفتاح التشفير
  SPINE.md                # هوية الوكيل
  TRIGGER.md              # سلوك المُنشّط
  data/triggerfish.db     # قاعدة بيانات SQLite
  logs/                   # ملفات السجلات
  skills/                 # المهارات المثبتة
  workspace/              # مساحات عمل الوكيل
  .deno/                  # ذاكرة مخبئة لإضافات Deno FFI
```

### متغيرات البيئة

| المتغير | الافتراضي | الغرض |
|----------|---------|---------|
| `TRIGGERFISH_DATA_DIR` | `/data` | مجلد البيانات الأساسي |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | مسار ملف التكوين |
| `TRIGGERFISH_DOCKER` | `true` | يُفعّل سلوكاً خاصاً بـ Docker |
| `DENO_DIR` | `/data/.deno` | ذاكرة Deno المخبئة (إضافات FFI) |
| `HOME` | `/data` | مجلد المنزل لمستخدم nonroot |

### الأسرار في Docker

لا تستطيع حاويات Docker الوصول إلى سلسلة مفاتيح نظام التشغيل المضيف. يُستخدم مخزن الملفات المشفر تلقائياً. مفتاح التشفير (`secrets.key`) والبيانات المشفرة (`secrets.json`) مخزّنة في وحدة التخزين `/data`.

**ملاحظة أمنية:** أي شخص لديه وصول لوحدة تخزين Docker يمكنه قراءة مفتاح التشفير. أمّن وحدة التخزين بشكل مناسب. في الإنتاج، فكّر في استخدام Docker secrets أو مدير أسرار لحقن المفتاح وقت التشغيل.

### المنافذ

يربط ملف compose:
- `18789` - WebSocket للبوابة
- `18790` - Tidepool A2UI

المنافذ الإضافية (WebChat على 8765، WhatsApp webhook على 8443) تحتاج إضافة لملف compose إذا فعّلت تلك القنوات.

### تشغيل معالج الإعداد في Docker

```bash
# إذا كانت الحاوية تعمل
docker exec -it triggerfish triggerfish dive

# إذا لم تكن الحاوية تعمل (تشغيل لمرة واحدة)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### التحديث

```bash
# باستخدام السكربت المُغلّف
triggerfish update

# يدوياً
docker compose pull
docker compose up -d
```

### التصحيح

استخدم نسخة التصحيح من الصورة لاستكشاف الأخطاء:

```yaml
# في docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

يتضمن هذا shell حتى تتمكن من الدخول للحاوية:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (المتصفح فقط)

Triggerfish نفسه لا يعمل كـ Flatpak، لكن يمكنه استخدام المتصفحات المثبتة بـ Flatpak لأتمتة المتصفح.

### متصفحات Flatpak المكتشفة

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### كيف يعمل

يُنشئ Triggerfish سكربت مُغلّف مؤقت يستدعي `flatpak run` مع علامات الوضع بدون واجهة، ثم يُشغّل Chrome من خلال ذلك السكربت. يُكتب المُغلّف في مجلد مؤقت.

### المشاكل الشائعة

- **Flatpak غير مثبت.** يجب أن يكون الملف التنفيذي في `/usr/bin/flatpak` أو `/usr/local/bin/flatpak`.
- **المجلد المؤقت غير قابل للكتابة.** يجب كتابة السكربت المُغلّف على القرص قبل التنفيذ.
- **تعارضات بيئة Flatpak المعزولة.** بعض بناءات Flatpak Chrome تقيّد `--remote-debugging-port`. إذا فشل اتصال CDP، جرّب تثبيت Chrome كحزمة أصلية بدلاً من Flatpak.
