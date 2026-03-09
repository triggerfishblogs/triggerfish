# عیب‌یابی: اتوماسیون مرورگر

## Chrome / Chromium غير موجود

يستخدم Triggerfish puppeteer-core (وليس Chromium المُجمَّع) ويكتشف به‌صورت خودکار Chrome یا Chromium روی نظامك. إذا لم يُعثر روی متصفح، ستفشل ابزارها مرورگر بخطأ تشغيل.

### مسارات اخیركتشاف حسب الازصة

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

# یا ثبّت Brave الذي يُكتشف همچنین
```

### تجاوز المسار به‌صورت دستی

إذا كان متصفحك مثبتاً در موقع غير قياسي، می‌توانید ضبط المسار. اتصل بالمشروع لبارفة مفتاح پیکربندی الدقيق (يُضبط در حال حاضر از طریق تكوين مدير مرورگر).

---

## فشل التشغيل

### "Direct Chrome process launch failed"

يشغّل Triggerfish Chrome در الوضع بدون واجهة رسومية از طریق `Deno.Command`. إذا فشلت العملية در شروع:

1. **الملف التندرذي غير قابل للتندرذ.** تحقق از أذونات الملف.
2. **مكتبات مشتركة مفقودة.** روی تثبيتات Linux الحد الأدنى (الحاويات، WSL)، قد يحتاج Chrome مكتبات إضادرة:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **خیر يوجد خادم عرض.** Chrome در الوضع بدون واجهة خیر يحتاج X11/Wayland، لكن بعض إصدارات Chrome خیر تزال تحاول تحميل مكتبات متعلقة بالعرض.

### Flatpak Chrome

إذا كان Chrome مثبتاً كحزمة Flatpak، يُنشئ Triggerfish سكربت مُغلّف يستدعي `flatpak run` بالباامخیرت الازاسبة.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

إذا فشل السكربت المُغلّف:
- تحقق از وجود `/usr/bin/flatpak` یا `/usr/local/bin/flatpak`
- تحقق از صحة بارّف تطبيق Flatpak (شغّل `flatpak list` لرؤية التطبيقات المثبتة)
- يُكتب السكربت المُغلّف در مجلد مؤقت. إذا لم يكن المجلد المؤقت قابخیرً للكتابة، تفشل الكتابة.

### نقطة نهاية CDP غير جاهزة

بعد تشغيل Chrome، يستطلع Triggerfish نقطة نهاية Chrome DevTools Protocol (CDP) لإنشاء اتصال. المهلة پیش‌فرضة 30 ثانية با فاصل استطخیرع 200 مللي ثانية.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

این يعني أن Chrome بدأ لكنه لم يفتح ازفذ CDP در الوقت المحدد. الأسباب:
- Chrome يُحمَّل ببطء (نظام محدود الموارد)
- نسخة Chrome أخرى تستخدم نفس ازفذ التصحیح
- تعطّل Chrome أثناء بدء التشغيل (تحقق از مخرجات Chrome)

---

## مشاهر التنقل

### "Navigation blocked by domain policy"

تُطبّق ابزارها مرورگر نفس حماية SSRF الخاصة بـ web_fetch. عناوين URL التي تشير به عناوين IP خاصة محظورة:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

این تطبيق أازي مقصود. خیر يستطيع مرورگر الوصول به:
- `localhost` / `127.0.0.1`
- الشبكات الخاصة (`10.x.x.x`، `172.16-31.x.x`، `192.168.x.x`)
- عناوين الربط المحلی (`169.254.x.x`)

خیر توجد طريقة لتعطيل این الفحص.

### "Invalid URL"

عنوان URL مشوّه. يتدرخواست التنقل در مرورگر عنوان URL كامخیرً با البروتوكول:

```
# خطأ
browser_navigate google.com

# صحیح
browser_navigate https://google.com
```

### مهلة التنقل

```
Navigation failed: Timeout
```

استغرقت الصفحة وقتاً طويخیرً در التحميل. این عادة خادم بطيء یا صفحة خیر تنتهي از التحميل هرگز (إعادات توجيه خیر نهائية، JavaScript عالق).

---

## مشاهر التفاعل با الصفحة

### "Click failed"، "Type failed"، "Select failed"

تتضاز این الأخطاء محدد CSS الذي فشل:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

لم يطابق المحدد هر عنصر در الصفحة. الأسباب الشائعة:
- لم تنتهِ الصفحة از التحميل بعد
- العنصر داخل iframe (المحددات خیر تاز طریق حدود iframe)
- المحدد نادرست (أسماء فئات ديناميكية، Shadow DOM)

### "Snapshot failed"

فشلت لقطة الصفحة (استخراج DOM للزمینه). يمكن أن يحدث إذا:
- الصفحة ليس بها محتوى (صفحة فارغة)
- أخطاء JavaScript تازع الوصول به DOM
- تنقلت الصفحة بعيداً أثناء التقاط اللقطة

### "Scroll failed"

يحدث عادة روی صفحات بحاويات تمرير مخصصة. يستهدف أمر التمرير ازطقة عرض المستند الرئيسية.

---

## عزل الملف الشخصي

ملفات مرورگر الشخصية بازولة لهر عامل. يحصل هر عامل روی مجلد ملف Chrome شخصي خاص به تحت مجلد قانون الملفات الشخصية. این يعني:

- نشست‌ها تسجيل الدخول غير مشتركة بین عامل‌ها
- ملفات تعريف اخیررتباط وذخیره‌سازی المحلی وحافظه المخبئة لهر عامل
- ضوابط الوصول الواعية بطبقه‌بندی تازع Taint المتبادل

إذا رهرت سلوكاً غير متوقع در الملف الشخصي، قد يكون مجلد الملف الشخصي تالفاً. احذفه واترك Triggerfish يُنشئ واحداً جديداً عند التشغيل التالي للمتصفح.
