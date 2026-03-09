# عیب‌یابی: نصب

## مشاهر المُثبّت التندرذي

### فشل التحقق از المجموع اخیرختباري

يقوم المُثبّت بتنزيل ملف `SHA256SUMS.txt` به جانب الملف التندرذي ويتحقق از التجزئة قبل نصب. إذا فشل این:

- **انقطع اخیرتصال أثناء التنزيل.** احذف التنزيل الجزئي وحاول مرة أخرى.
- **قدّم المرآة یا CDN محتوى قديماً.** انتظر بضع دقائق وأعد المحاولة. يجلب المُثبّت از GitHub Releases.
- **الأصل غير موجود در SHA256SUMS.txt.** این يعني أن الإصدار نُشر بدون مجموع اختباري لازصتك. قدّم بخیرغاً روی [GitHub](https://github.com/greghavens/triggerfish/issues).

يستخدم المُثبّت `sha256sum` روی Linux و`shasum -a 256` روی macOS. إذا لم يكن هر ازهما متاحاً، نمی‌توانه التحقق از التنزيل.

### رُفض الإذن للكتابة به `/usr/local/bin`

يحاول المُثبّت `/usr/local/bin` یاخیرً، ثم يعود به `~/.local/bin`. إذا لم ينجح هر ازهما:

```bash
# الخيار 1: التشغيل بـ sudo للتثبيت روی مستوى النظام
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# الخيار 2: إنشاء ~/.local/bin وإضافته به PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# ثم أعد تشغيل المُثبّت
```

### هشدار العزل در macOS

يحظر macOS الملفات التندرذية المُنزَّلة از الإنترنت. يشغّل المُثبّت `xattr -cr` لمسح سمة العزل، لكن إذا نزّلت الملف التندرذي به‌صورت دستی، شغّل:

```bash
xattr -cr /usr/local/bin/triggerfish
```

یا انقر بزر الماوس الهراز روی الملف التندرذي در Finder، واختر "Open"، وأكّد موجّه اازیت.

### لم يُحدَّث PATH بعد نصب

يضيف المُثبّت مجلد نصب به ملف تعريف shell الخاص بك (`.zshrc`، `.bashrc`، یا `.bash_profile`). إذا لم يُعثر روی أمر `triggerfish` بعد نصب:

1. افتح نافذة طردرة جديدة (لن يلتقط shell الحالي تغييرات الملف التعريدر)
2. یا حمّل ملف التعريف به‌صورت دستی: `source ~/.zshrc` (یا هر ملف تعريف يستخدمه shell الخاص بك)

إذا تخطّى المُثبّت تحديث PATH، فاین يعني أن مجلد نصب كان در واقع در PATH الخاص بك.

---

## البناء از المصدر

### Deno غير موجود

يُثبّت مُثبّت المصدر (`deploy/scripts/install-from-source.sh`) Deno به‌صورت خودکار إذا لم يكن موجوداً. إذا فشل آن:

```bash
# تثبيت Deno به‌صورت دستی
curl -fsSL https://deno.land/install.sh | sh

# التحقق
deno --version   # باید أن يكون 2.x
```

### فشل التتمام بأخطاء أذونات

يحتاج أمر `deno compile` به `--allow-all` لأن الملف التندرذي المُجمَّع يتدرخواست وصوخیرً كامخیرً للنظام (الشبكة، سیستم فایل، FFI لـ SQLite، إنشاء عمليات فرعية). إذا رهرت أخطاء أذونات أثناء التتمام، تأكد از تشغيل سكربت نصب كمستخدم لديه حق الكتابة در المجلد المستهدف.

### فرع یا إصدار محدد

اضبط `TRIGGERFISH_BRANCH` خیرستنساخ فرع محدد:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

للمُثبّت التندرذي، اضبط `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## مشاهر خاصة بـ Windows

### سیاست تندرذ PowerShell تحظر المُثبّت

شغّل PowerShell كمسؤول واسمح بتندرذ السكربتات:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

ثم أعد تشغيل المُثبّت.

### فشل تتمام خدمة Windows

يُجمّع مُثبّت Windows مغلّف خدمة C# أثناء التشغيل باستخدام `csc.exe` از .NET Framework 4.x. إذا فشل التتمام:

1. **تحقق از تثبيت .NET Framework.** شغّل `where csc.exe` در موجه الیاامر. يبحث المُثبّت در مجلد .NET Framework تحت `%WINDIR%\Microsoft.NET\Framework64\`.
2. **شغّل كمسؤول.** يتدرخواست تثبيت الخدمة صخیرحيات مرتفعة.
3. **الحل البديل.** إذا فشل تتمام الخدمة، می‌توانید تشغيل Triggerfish به‌صورت دستی: `triggerfish run` (وضع المقدمة). ستحتاج به إبقاء الطردرة مفتوحة.

### فشل `Move-Item` أثناء الترقية

استخدمت الإصدارات القديمة از مُثبّت Windows `Move-Item -Force` الذي يفشل عندما يكون الملف التندرذي المستهدف قيد استفاده. تم إصخیرح این در الإصدار 0.3.4+. إذا واجهت این روی إصدار أقدم، یاقف الخدمة به‌صورت دستی یاخیرً:

```powershell
Stop-Service Triggerfish
# ثم أعد تشغيل المُثبّت
```

---

## مشاهر Docker

### الحاوية تخرج فوراً

تحقق از سجخیرت الحاوية:

```bash
docker logs triggerfish
```

الأسباب الشائعة:

- **ملف تكوين مفقود.** ركّب `triggerfish.yaml` در `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **تعارض ازافذ.** إذا كان الازفذ 18789 یا 18790 قيد استفاده، نمی‌توان للGateway شروع.
- **رُفض الإذن روی وحدة ذخیره‌سازی.** تعمل الحاوية كـ UID 65534 (nonroot). تأكد از أن وحدة ذخیره‌سازی قابلة للكتابة بواسطة این المستخدم.

### نمی‌توان الوصول به Triggerfish از المضيف

ترتبط Gateway بـ `127.0.0.1` داخل الحاوية به‌صورت پیش‌فرض. للوصول إليها از المضيف، يربط ملف Docker compose الازافذ `18789` و`18790`. إذا كنت تستخدم `docker run` مستقیماً، أضف:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman بدخیرً از Docker

يكتشف سكربت تثبيت Docker به‌صورت خودکار `podman` كبيئة تشغيل الحاوية. می‌توانید همچنین تعيينه صراحة:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

يكتشف سكربت `triggerfish` المُغلّف (المُثبّت بواسطة مُثبّت Docker) همچنین podman به‌صورت خودکار.

### صورة یا سجل مخصص

تجاوز الصورة بـ `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## ما بعد نصب

### باالج راه‌اندازی خیر يبدأ

بعد نصب التندرذي، يشغّل المُثبّت `triggerfish dive --install-daemon` لإطخیرق باالج راه‌اندازی. إذا لم يبدأ:

1. شغّله به‌صورت دستی: `triggerfish dive`
2. إذا رهرت "Terminal requirement not met"، يتدرخواست الباالج طردرة تفاعلية TTY. لن تعمل نشست‌ها SSH وأنابيب CI والإدخال المُوجَّه. كوّن `triggerfish.yaml` به‌صورت دستی بدخیرً از آن.

### فشل نصب الخودکار لکانال Signal

يتدرخواست Signal تطبيق `signal-cli`، وهو تطبيق Java. يقوم المُثبّت الخودکار بتنزيل ملف `signal-cli` تندرذي مُعدّ مسبقاً وبيئة تشغيل JRE 25. يمكن أن يفشل إذا:

- **خیر يوجد حق كتابة لمجلد نصب.** تحقق از الأذونات روی `~/.triggerfish/signal-cli/`.
- **فشل تنزيل JRE.** يجلب المُثبّت از Adoptium. قد تحظر قيود الشبكة یا عامل‌ها المؤسسيون این.
- **البامارية غير مدعومة.** پشتیبانی می‌کند نصب الخودکار لـ JRE بامارية x64 وaarch64 فقط.

إذا فشل نصب الخودکار، ثبّت `signal-cli` به‌صورت دستی وتأكد از وجوده در PATH الخاص بك. مراجعه کنید [وثائق کانال Signal](/fa-IR/channels/signal) لخطوات راه‌اندازی الدستی.
