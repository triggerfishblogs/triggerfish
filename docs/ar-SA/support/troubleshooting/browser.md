# استكشاف الأخطاء: أتمتة المتصفح

## Chrome / Chromium غير موجود

يستخدم Triggerfish puppeteer-core (وليس Chromium المُجمَّع) ويكتشف تلقائياً Chrome أو Chromium على نظامك. إذا لم يُعثر على متصفح، ستفشل أدوات المتصفح بخطأ تشغيل.

### مسارات الاكتشاف حسب المنصة

**Linux:**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak: `com.google.Chrome`، `org.chromium.Chromium`، `com.brave.Browser`

**macOS:**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows:**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### تثبيت متصفح

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# أو ثبّت Brave الذي يُكتشف أيضاً
```

### تجاوز المسار يدوياً

إذا كان متصفحك مثبتاً في موقع غير قياسي، يمكنك ضبط المسار. اتصل بالمشروع لمعرفة مفتاح التكوين الدقيق (يُضبط حالياً عبر تكوين مدير المتصفح).

---

## فشل التشغيل

### "Direct Chrome process launch failed"

يشغّل Triggerfish Chrome في الوضع بدون واجهة رسومية عبر `Deno.Command`. إذا فشلت العملية في البدء:

1. **الملف التنفيذي غير قابل للتنفيذ.** تحقق من أذونات الملف.
2. **مكتبات مشتركة مفقودة.** على تثبيتات Linux الحد الأدنى (الحاويات، WSL)، قد يحتاج Chrome مكتبات إضافية:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **لا يوجد خادم عرض.** Chrome في الوضع بدون واجهة لا يحتاج X11/Wayland، لكن بعض إصدارات Chrome لا تزال تحاول تحميل مكتبات متعلقة بالعرض.

### Flatpak Chrome

إذا كان Chrome مثبتاً كحزمة Flatpak، يُنشئ Triggerfish سكربت مُغلّف يستدعي `flatpak run` بالمعاملات المناسبة.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

إذا فشل السكربت المُغلّف:
- تحقق من وجود `/usr/bin/flatpak` أو `/usr/local/bin/flatpak`
- تحقق من صحة معرّف تطبيق Flatpak (شغّل `flatpak list` لرؤية التطبيقات المثبتة)
- يُكتب السكربت المُغلّف في مجلد مؤقت. إذا لم يكن المجلد المؤقت قابلاً للكتابة، تفشل الكتابة.

### نقطة نهاية CDP غير جاهزة

بعد تشغيل Chrome، يستطلع Triggerfish نقطة نهاية Chrome DevTools Protocol (CDP) لإنشاء اتصال. المهلة الافتراضية 30 ثانية مع فاصل استطلاع 200 مللي ثانية.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

هذا يعني أن Chrome بدأ لكنه لم يفتح منفذ CDP في الوقت المحدد. الأسباب:
- Chrome يُحمَّل ببطء (نظام محدود الموارد)
- نسخة Chrome أخرى تستخدم نفس منفذ التصحيح
- تعطّل Chrome أثناء بدء التشغيل (تحقق من مخرجات Chrome)

---

## مشاكل التنقل

### "Navigation blocked by domain policy"

تُطبّق أدوات المتصفح نفس حماية SSRF الخاصة بـ web_fetch. عناوين URL التي تشير إلى عناوين IP خاصة محظورة:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

هذا تطبيق أمني مقصود. لا يستطيع المتصفح الوصول إلى:
- `localhost` / `127.0.0.1`
- الشبكات الخاصة (`10.x.x.x`، `172.16-31.x.x`، `192.168.x.x`)
- عناوين الربط المحلي (`169.254.x.x`)

لا توجد طريقة لتعطيل هذا الفحص.

### "Invalid URL"

عنوان URL مشوّه. يتطلب التنقل في المتصفح عنوان URL كاملاً مع البروتوكول:

```
# خطأ
browser_navigate google.com

# صحيح
browser_navigate https://google.com
```

### مهلة التنقل

```
Navigation failed: Timeout
```

استغرقت الصفحة وقتاً طويلاً في التحميل. هذا عادة خادم بطيء أو صفحة لا تنتهي من التحميل أبداً (إعادات توجيه لا نهائية، JavaScript عالق).

---

## مشاكل التفاعل مع الصفحة

### "Click failed"، "Type failed"، "Select failed"

تتضمن هذه الأخطاء محدد CSS الذي فشل:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

لم يطابق المحدد أي عنصر في الصفحة. الأسباب الشائعة:
- لم تنتهِ الصفحة من التحميل بعد
- العنصر داخل iframe (المحددات لا تعبر حدود iframe)
- المحدد خاطئ (أسماء فئات ديناميكية، Shadow DOM)

### "Snapshot failed"

فشلت لقطة الصفحة (استخراج DOM للسياق). يمكن أن يحدث إذا:
- الصفحة ليس بها محتوى (صفحة فارغة)
- أخطاء JavaScript تمنع الوصول إلى DOM
- تنقلت الصفحة بعيداً أثناء التقاط اللقطة

### "Scroll failed"

يحدث عادة على صفحات بحاويات تمرير مخصصة. يستهدف أمر التمرير منطقة عرض المستند الرئيسية.

---

## عزل الملف الشخصي

ملفات المتصفح الشخصية معزولة لكل وكيل. يحصل كل وكيل على مجلد ملف Chrome شخصي خاص به تحت مجلد قاعدة الملفات الشخصية. هذا يعني:

- جلسات تسجيل الدخول غير مشتركة بين الوكلاء
- ملفات تعريف الارتباط والتخزين المحلي والذاكرة المخبئة لكل وكيل
- ضوابط الوصول الواعية بالتصنيف تمنع التلوث المتبادل

إذا رأيت سلوكاً غير متوقع في الملف الشخصي، قد يكون مجلد الملف الشخصي تالفاً. احذفه واترك Triggerfish يُنشئ واحداً جديداً عند التشغيل التالي للمتصفح.
