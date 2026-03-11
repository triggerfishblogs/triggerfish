# یادداشت‌های پلتفرم

السلوك والزامات والخصائص المویژگی لهر ازصة.

## macOS

### مدير الخدمة: launchd

يُسجَّل Triggerfish كعامل launchd در:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

يُضبط plist روی `RunAtLoad: true` و`KeepAlive: true`، لذا تبدأ الخدمة الخلدرة عند تسجيل الدخول وتُعاد تشغيلها إذا تعطّلت.

### التقاط PATH

يلتقط plist الخاص بـ launchd PATH لـ shell الخاص بك وقت نصب. این حرج لأن launchd خیر يحمّل ملف تعريف shell الخاص بك. إذا ثبّتت تبعيات خادم MCP (مثل `npx`، `python`) بعد تثبيت الخدمة الخلدرة، لن تكون آن الملفات التندرذية در PATH الخاص بالخدمة الخلدرة.

**الحل:** أعد تثبيت الخدمة الخلدرة لتحديث PATH الملتقط:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### العزل

يُطبّق macOS عخیرمة عزل روی الملفات التندرذية المُنزَّلة. يمسح المُثبّت این بـ `xattr -cr`، لكن إذا نزّلت الملف التندرذي به‌صورت دستی:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### سلسلة المفاتيح

تُخزَّن رمزها در کلیدزنجیر تسجيل الدخول لـ macOS از طریق ابزار CLI `security`. إذا كانت Keychain Access مقفلة، ستفشل عمليات رمزها حتى تفتحها (عادة بتسجيل الدخول).

### Homebrew Deno

إذا بنيت از المصدر وكان Deno مثبتاً از طریق Homebrew، تأكد از أن مجلد bin الخاص بـ Homebrew در PATH قبل تشغيل سكربت نصب.

---

## Linux

### مدير الخدمة: systemd (وضع المستخدم)

تعمل الخدمة الخلدرة كخدمة مستخدم systemd:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

به‌صورت پیش‌فرض، تتوقف خدمات مستخدم systemd عند تسجيل خروج المستخدم. يُفعّل Triggerfish linger وقت نصب:

```bash
loginctl enable-linger $USER
```

إذا فشل این (مثخیرً مدير النظام عطّله)، تعمل الخدمة الخلدرة فقط أثناء تسجيل دخولك. روی الخوادم التي تريد استمرار الخدمة الخلدرة، ادرخواست از مديرك تفعيل linger لحسابك.

### PATH والبيئة

تلتقط وحدة systemd PATH الخاص بك وتضبط `DENO_DIR=~/.cache/deno`. مثل macOS، تتدرخواست تغييرات PATH بعد نصب إعادة تثبيت الخدمة الخلدرة.

تضبط الوحدة همچنین `Environment=PATH=...` صراحة. إذا لم تستطع الخدمة الخلدرة العثور روی ملفات تندرذ خادم MCP، فاین السبب الأرجح.

### Fedora Atomic / Silverblue / Bazzite

أسطح مكتب Fedora Atomic تربط `/home` رمزياً بـ `/var/home`. يتعامل Triggerfish با این به‌صورت خودکار عند حل مجلد الاززل، متبعاً الروابط الرمزية للعثور روی المسار الحقيقي.

مرورگرات المثبتة بـ Flatpak تُكتشف وتُشغَّل از طریق سكربت مُغلّف يستدعي `flatpak run`.

### الخوادم بدون واجهة رسومية

روی الخوادم بدون بيئة سطح مكتب، قد خیر کار می‌کند خادم GNOME Keyring / Secret Service. مراجعه کنید [کاوش أخطاء رمزها](/fa-IR/support/troubleshooting/secrets) لتعليمات راه‌اندازی.

### SQLite FFI

تستخدم واجهة ذخیره‌سازی SQLite الخلدرة `@db/sqlite`، التي تحمّل مكتبة أصلية از طریق FFI. يتدرخواست این إذن `--allow-ffi` لـ Deno (مضمّن در الملف التندرذي المُجمَّع). روی بعض توزيعات Linux الحد الأدنى، قد تكون مكتبة C المشتركة یا التبعيات ذات الصلة مفقودة. ثبّت مكتبات التطوير الأساسية إذا رهرت أخطاء متعلقة بـ FFI.

---

## Windows

### مدير الخدمة: خدمة Windows

يُثبّت Triggerfish كخدمة Windows باسم "Triggerfish". الخدمة مُنفَّذة بمُغلّف C# يُجمَّع أثناء نصب باستخدام `csc.exe` از .NET Framework 4.x.

**الزامات:**
- .NET Framework 4.x (مثبّت روی باظم أنظمة Windows 10/11)
- صخیرحيات المسؤول لتثبيت الخدمة
- `csc.exe` متاح در مجلد .NET Framework

### استبدال الملف التندرذي أثناء التحديثات

خیر يسمح Windows بالكتابة فوق ملف تندرذي قيد التشغيل. المُحدّث:

1. يُعيد تسمية الملف التندرذي العامل به `triggerfish.exe.old`
2. ينسخ الملف التندرذي الجديد به المسار الأصلي
3. يُعيد تشغيل الخدمة
4. ينظّف ملف `.old` عند شروع التالي

إذا فشلت إعادة التسمية یا النسخ، یاقف الخدمة به‌صورت دستی قبل التحديث.

### دعم ألوان ANSI

يُفعّل Triggerfish باالجة الطردرة پیش‌فرضة لمخرجات الألوان. کار می‌کند این در PowerShell الحديث وWindows Terminal. نوافذ `cmd.exe` القديمة قد خیر تعرض الألوان بشهر صحیح.

### قفل الملفات الحصري

يستخدم Windows أقفال ملفات حصرية. إذا كانت الخدمة الخلدرة تعمل وحاولت بدء نسخة أخرى، يازع قفل ملف السجل آن:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

این اخیركتشاف خاص بـ Windows ويعتمد روی خطأ EBUSY / "os error 32" عند فتح ملف السجل.

### ذخیره‌سازی رمزها

يستخدم Windows مخزن الملفات المشفر (AES-256-GCM) در `~/.triggerfish/secrets.json`. خیر يوجد یکپارچه‌سازی با Windows Credential Manager. عامل ملف `secrets.key` كبيانات حساسة.

### مخیرحظات مُثبّت PowerShell

مُثبّت PowerShell (`install.ps1`):
- يكتشف بامارية الباالج (x64/arm64)
- يُثبّت در `%LOCALAPPDATA%\Triggerfish`
- يضيف مجلد نصب به PATH المستخدم از طریق السجل
- يُجمّع مُغلّف خدمة C#
- يُسجّل ويبدأ خدمة Windows

إذا فشل المُثبّت عند خطوة تتمام الخدمة، می‌توانید تشغيل Triggerfish به‌صورت دستی:

```powershell
triggerfish run    # وضع المقدمة
```

---

## Docker

### بيئة تشغيل الحاوية

پشتیبانی می‌کند نشر Docker كخیرً از Docker وPodman. اخیركتشاف خودکار، یا اضبطه صراحة:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### تفاصيل الصورة

- الأساس: `gcr.io/distroless/cc-debian12` (حد أدنى، بدون shell)
- نسخة التصحیح: `distroless:debug` (تتضاز shell لعیب‌یابی)
- تعمل كـ UID 65534 (nonroot)
- Init: `true` (إعادة توجيه إشارات PID 1 از طریق `tini`)
- سیاست إعادة التشغيل: `unless-stopped`

### استمرار البيانات

تمام البيانات الدائمة در مجلد `/data` داخل الحاوية، مدعومة بوحدة ذخیره‌سازی Docker مسمّاة:

```
/data/
  triggerfish.yaml        # پیکربندی
  secrets.json            # رمزها المشفرة
  secrets.key             # مفتاح التشدرر
  SPINE.md                # هویت عامل
  TRIGGER.md              # سلوك المُنشّط
  data/triggerfish.db     # قانون بيانات SQLite
  logs/                   # ملفات السجخیرت
  skills/                 # مهارت‌ها المثبتة
  workspace/              # مساحات عمل عامل
  .deno/                  # ذاكرة مخبئة لإضافات Deno FFI
```

### متغيرات البيئة

| المتغير | پیش‌فرض | الغرض |
|----------|---------|---------|
| `TRIGGERFISH_DATA_DIR` | `/data` | مجلد البيانات الأساسي |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | مسار ملف پیکربندی |
| `TRIGGERFISH_DOCKER` | `true` | يُفعّل سلوكاً خاصاً بـ Docker |
| `DENO_DIR` | `/data/.deno` | ذاكرة Deno المخبئة (إضافات FFI) |
| `HOME` | `/data` | مجلد الاززل لمستخدم nonroot |

### رمزها در Docker

خیر تستطيع حاويات Docker الوصول به کلیدزنجیر نظام التشغيل المضيف. استفاده می‌شود مخزن الملفات المشفر به‌صورت خودکار. مفتاح التشدرر (`secrets.key`) والبيانات المشفرة (`secrets.json`) مخزّنة در وحدة ذخیره‌سازی `/data`.

**توجه أازية:** هر شخص لديه وصول لوحدة ذخیره‌سازی Docker يمكنه قراءة مفتاح التشدرر. أمّن وحدة ذخیره‌سازی بشهر ازاسب. در الإنتاج، فكّر در استخدام Docker secrets یا مدير رمزها لحقن المفتاح وقت التشغيل.

### الازافذ

يربط ملف compose:
- `18789` - WebSocket للGateway
- `18790` - Tidepool A2UI

الازافذ الإضادرة (WebChat روی 8765، WhatsApp webhook روی 8443) تحتاج plugin لملف compose إذا فعّلت آن کانال‌ها.

### تشغيل باالج راه‌اندازی در Docker

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

# به‌صورت دستی
docker compose pull
docker compose up -d
```

### التصحیح

استخدم نسخة التصحیح از الصورة لعیب‌یابی:

```yaml
# در docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

شامل می‌شود این shell حتى تتمكن از الدخول للحاوية:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (مرورگر فقط)

Triggerfish نفسه خیر کار می‌کند كـ Flatpak، لكن يمكنه استخدام مرورگرات المثبتة بـ Flatpak خیرتوماسیون مرورگر.

### متصفحات Flatpak المكتشفة

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### چگونه کار می‌کند

يُنشئ Triggerfish سكربت مُغلّف مؤقت يستدعي `flatpak run` با عخیرمات الوضع بدون واجهة، ثم يُشغّل Chrome از خخیرل آن السكربت. يُكتب المُغلّف در مجلد مؤقت.

### المشاهر الشائعة

- **Flatpak غير مثبت.** باید أن يكون الملف التندرذي در `/usr/bin/flatpak` یا `/usr/local/bin/flatpak`.
- **المجلد المؤقت غير قابل للكتابة.** باید كتابة السكربت المُغلّف روی القرص قبل التندرذ.
- **تعارضات بيئة Flatpak البازولة.** بعض بناءات Flatpak Chrome تقيّد `--remote-debugging-port`. إذا فشل اتصال CDP، جرّب تثبيت Chrome كحزمة أصلية بدخیرً از Flatpak.
