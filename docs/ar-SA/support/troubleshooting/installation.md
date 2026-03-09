# استكشاف الأخطاء: التثبيت

## مشاكل المُثبّت التنفيذي

### فشل التحقق من المجموع الاختباري

يقوم المُثبّت بتنزيل ملف `SHA256SUMS.txt` إلى جانب الملف التنفيذي ويتحقق من التجزئة قبل التثبيت. إذا فشل هذا:

- **انقطع الاتصال أثناء التنزيل.** احذف التنزيل الجزئي وحاول مرة أخرى.
- **قدّم المرآة أو CDN محتوى قديماً.** انتظر بضع دقائق وأعد المحاولة. يجلب المُثبّت من GitHub Releases.
- **الأصل غير موجود في SHA256SUMS.txt.** هذا يعني أن الإصدار نُشر بدون مجموع اختباري لمنصتك. قدّم بلاغاً على [GitHub](https://github.com/greghavens/triggerfish/issues).

يستخدم المُثبّت `sha256sum` على Linux و`shasum -a 256` على macOS. إذا لم يكن أي منهما متاحاً، لا يمكنه التحقق من التنزيل.

### رُفض الإذن للكتابة إلى `/usr/local/bin`

يحاول المُثبّت `/usr/local/bin` أولاً، ثم يعود إلى `~/.local/bin`. إذا لم ينجح أي منهما:

```bash
# الخيار 1: التشغيل بـ sudo للتثبيت على مستوى النظام
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# الخيار 2: إنشاء ~/.local/bin وإضافته إلى PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# ثم أعد تشغيل المُثبّت
```

### تحذير العزل في macOS

يحظر macOS الملفات التنفيذية المُنزَّلة من الإنترنت. يشغّل المُثبّت `xattr -cr` لمسح سمة العزل، لكن إذا نزّلت الملف التنفيذي يدوياً، شغّل:

```bash
xattr -cr /usr/local/bin/triggerfish
```

أو انقر بزر الماوس الأيمن على الملف التنفيذي في Finder، واختر "Open"، وأكّد موجّه الأمان.

### لم يُحدَّث PATH بعد التثبيت

يضيف المُثبّت مجلد التثبيت إلى ملف تعريف shell الخاص بك (`.zshrc`، `.bashrc`، أو `.bash_profile`). إذا لم يُعثر على أمر `triggerfish` بعد التثبيت:

1. افتح نافذة طرفية جديدة (لن يلتقط shell الحالي تغييرات الملف التعريفي)
2. أو حمّل ملف التعريف يدوياً: `source ~/.zshrc` (أو أي ملف تعريف يستخدمه shell الخاص بك)

إذا تخطّى المُثبّت تحديث PATH، فهذا يعني أن مجلد التثبيت كان بالفعل في PATH الخاص بك.

---

## البناء من المصدر

### Deno غير موجود

يُثبّت مُثبّت المصدر (`deploy/scripts/install-from-source.sh`) Deno تلقائياً إذا لم يكن موجوداً. إذا فشل ذلك:

```bash
# تثبيت Deno يدوياً
curl -fsSL https://deno.land/install.sh | sh

# التحقق
deno --version   # يجب أن يكون 2.x
```

### فشل التجميع بأخطاء أذونات

يحتاج أمر `deno compile` إلى `--allow-all` لأن الملف التنفيذي المُجمَّع يتطلب وصولاً كاملاً للنظام (الشبكة، نظام الملفات، FFI لـ SQLite، إنشاء عمليات فرعية). إذا رأيت أخطاء أذونات أثناء التجميع، تأكد من تشغيل سكربت التثبيت كمستخدم لديه حق الكتابة في المجلد المستهدف.

### فرع أو إصدار محدد

اضبط `TRIGGERFISH_BRANCH` لاستنساخ فرع محدد:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

للمُثبّت التنفيذي، اضبط `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## مشاكل خاصة بـ Windows

### سياسة تنفيذ PowerShell تحظر المُثبّت

شغّل PowerShell كمسؤول واسمح بتنفيذ السكربتات:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

ثم أعد تشغيل المُثبّت.

### فشل تجميع خدمة Windows

يُجمّع مُثبّت Windows مغلّف خدمة C# أثناء التشغيل باستخدام `csc.exe` من .NET Framework 4.x. إذا فشل التجميع:

1. **تحقق من تثبيت .NET Framework.** شغّل `where csc.exe` في موجه الأوامر. يبحث المُثبّت في مجلد .NET Framework تحت `%WINDIR%\Microsoft.NET\Framework64\`.
2. **شغّل كمسؤول.** يتطلب تثبيت الخدمة صلاحيات مرتفعة.
3. **الحل البديل.** إذا فشل تجميع الخدمة، يمكنك تشغيل Triggerfish يدوياً: `triggerfish run` (وضع المقدمة). ستحتاج إلى إبقاء الطرفية مفتوحة.

### فشل `Move-Item` أثناء الترقية

استخدمت الإصدارات القديمة من مُثبّت Windows `Move-Item -Force` الذي يفشل عندما يكون الملف التنفيذي المستهدف قيد الاستخدام. تم إصلاح هذا في الإصدار 0.3.4+. إذا واجهت هذا على إصدار أقدم، أوقف الخدمة يدوياً أولاً:

```powershell
Stop-Service Triggerfish
# ثم أعد تشغيل المُثبّت
```

---

## مشاكل Docker

### الحاوية تخرج فوراً

تحقق من سجلات الحاوية:

```bash
docker logs triggerfish
```

الأسباب الشائعة:

- **ملف تكوين مفقود.** ركّب `triggerfish.yaml` في `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **تعارض منافذ.** إذا كان المنفذ 18789 أو 18790 قيد الاستخدام، لا يمكن للبوابة البدء.
- **رُفض الإذن على وحدة التخزين.** تعمل الحاوية كـ UID 65534 (nonroot). تأكد من أن وحدة التخزين قابلة للكتابة بواسطة هذا المستخدم.

### لا يمكن الوصول إلى Triggerfish من المضيف

ترتبط البوابة بـ `127.0.0.1` داخل الحاوية افتراضياً. للوصول إليها من المضيف، يربط ملف Docker compose المنافذ `18789` و`18790`. إذا كنت تستخدم `docker run` مباشرة، أضف:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman بدلاً من Docker

يكتشف سكربت تثبيت Docker تلقائياً `podman` كبيئة تشغيل الحاوية. يمكنك أيضاً تعيينه صراحة:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

يكتشف سكربت `triggerfish` المُغلّف (المُثبّت بواسطة مُثبّت Docker) أيضاً podman تلقائياً.

### صورة أو سجل مخصص

تجاوز الصورة بـ `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## ما بعد التثبيت

### معالج الإعداد لا يبدأ

بعد التثبيت التنفيذي، يشغّل المُثبّت `triggerfish dive --install-daemon` لإطلاق معالج الإعداد. إذا لم يبدأ:

1. شغّله يدوياً: `triggerfish dive`
2. إذا رأيت "Terminal requirement not met"، يتطلب المعالج طرفية تفاعلية TTY. لن تعمل جلسات SSH وأنابيب CI والإدخال المُوجَّه. كوّن `triggerfish.yaml` يدوياً بدلاً من ذلك.

### فشل التثبيت التلقائي لقناة Signal

يتطلب Signal تطبيق `signal-cli`، وهو تطبيق Java. يقوم المُثبّت التلقائي بتنزيل ملف `signal-cli` تنفيذي مُعدّ مسبقاً وبيئة تشغيل JRE 25. يمكن أن يفشل إذا:

- **لا يوجد حق كتابة لمجلد التثبيت.** تحقق من الأذونات على `~/.triggerfish/signal-cli/`.
- **فشل تنزيل JRE.** يجلب المُثبّت من Adoptium. قد تحظر قيود الشبكة أو الوكلاء المؤسسيون هذا.
- **المعمارية غير مدعومة.** يدعم التثبيت التلقائي لـ JRE معمارية x64 وaarch64 فقط.

إذا فشل التثبيت التلقائي، ثبّت `signal-cli` يدوياً وتأكد من وجوده في PATH الخاص بك. راجع [وثائق قناة Signal](/ar-SA/channels/signal) لخطوات الإعداد اليدوي.
