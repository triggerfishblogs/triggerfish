# عیب‌یابی: رمزها وبيانات اخیرعتماد

## واجهات سلسلة المفاتيح حسب الازصة

| الازصة | الواجهة الخلدرة | التفاصيل |
|----------|---------|---------|
| macOS | Keychain (أصلي) | يستخدم ابزار CLI `security` للوصول به Keychain Access |
| Linux | Secret Service (D-Bus) | يستخدم ابزار CLI `secret-tool` (libsecret / GNOME Keyring) |
| Windows | مخزن ملفات مشفر | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | مخزن ملفات مشفر | `/data/secrets.json` + `/data/secrets.key` |

تُختار الواجهة الخلدرة به‌صورت خودکار عند بدء التشغيل. نمی‌توانك تغيير الواجهة الخلدرة المستخدمة لازصتك.

---

## مشاهر macOS

### مطالبات الوصول لسلسلة المفاتيح

قد يطالبك macOS بالسماح لـ `triggerfish` بالوصول به سلسلة المفاتيح. انقر "Always Allow" لتجنب المطالبات المتكررة. إذا نقرت "Deny" بالخطأ، افتح Keychain Access، واعثر روی الإدخال، واحذفه. سيطالب الوصول التالي مرة أخرى.

### سلسلة المفاتيح مقفلة

إذا كانت کلیدزنجیر macOS مقفلة (مثخیرً بعد وضع السكون)، ستفشل عمليات رمزها. افتحها:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

یا فقط افتح قفل Mac الخاص بك (تُفتح سلسلة المفاتيح عند تسجيل الدخول).

---

## مشاهر Linux

### "secret-tool" غير موجود

تستخدم واجهة سلسلة المفاتيح روی Linux ابزار `secret-tool`، وهي جزء از حزمة `libsecret-tools`.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### خیر يوجد خادم Secret Service کار می‌کند

روی الخوادم بدون واجهة رسومية یا بيئات سطح مكتب حد أدنى، قد خیر يكون آنجا خادم Secret Service کار می‌کند. الأعراض:

- یاامر `secret-tool` تتوقف یا تفشل
- پیام‌ها خطأ حول اتصال D-Bus

**الخيارات:**

1. **ثبّت وابدأ GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **استخدم البديل المشفر در الملف:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   هشدار: البديل در حافظه خیر يحتفظ برمزها از طریق إعادات التشغيل. ازاسب فقط لخیرختبار.

3. **للخوادم، فكّر در Docker.** نشر Docker يستخدم مخزن ملفات مشفر خیر يتدرخواست خادم کلیدزنجیر.

### KDE / KWallet

إذا كنت تستخدم KDE با KWallet بدخیرً از GNOME Keyring، باید أن تعمل `secret-tool` از طریق واجهة Secret Service D-Bus API التي ينفّذها KWallet. إذا لم تعمل، ثبّت `gnome-keyring` بجانب KWallet.

---

## مخزن الملفات المشفر لـ Windows / Docker

### چگونه کار می‌کند

يستخدم مخزن الملفات المشفر تشدرر AES-256-GCM:

1. يُشتق مفتاح الجهاز باستخدام PBKDF2 ويُخزَّن در `secrets.key`
2. هر قيمة سر تُشفَّر فردياً بـ IV فريد
3. البيانات المشفرة تُخزَّن در `secrets.json` بتنسيق مُصدَّر (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

روی الأنظمة المبنية روی Unix (Linux در Docker)، باید أن يكون لملف المفتاح أذونات `0600` (قراءة/كتابة المالك فقط). إذا كانت الأذونات مفتوحة جداً:

```
Machine key file permissions too open
```

**الحل:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# یا در Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

ملف المفتاح موجود لكن نمی‌توان تحليله. قد يكون اقتُطع یا كُتب فوقه.

**الحل:** احذف ملف المفتاح وأعد الإنشاء:

```bash
rm ~/.triggerfish/secrets.key
```

عند بدء التشغيل التالي، يُنشأ مفتاح جديد. لكن تمام رمزها المشفرة بالمفتاح القديم ستصبح غير قابلة للقراءة. ستحتاج به إعادة ذخیره‌سازی تمام رمزها:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# كرر لتمام رمزها
```

### "Secret file permissions too open"

مثل ملف المفتاح، باید أن يكون لملف رمزها أذونات مقيّدة:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

لم يستطع النظام ضبط أذونات الملف. يمكن أن يحدث این روی أنظمة ملفات خیر تدعم أذونات Unix (بعض التركيبات الشبكية، أقسام FAT/exFAT). تحقق از أن سیستم فایل پشتیبانی می‌کند تغييرات الأذونات.

---

## مهاجرت رمزها القديمة

### الترحيل الخودکار

إذا اكتشف Triggerfish ملف رمزها بنص عادي (التنسيق القديم بدون تشدرر)، يُرحّل به‌صورت خودکار به التنسيق المشفر عند یال تحميل:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

الترحيل:
1. يقرأ ملف JSON بالنص العادي
2. يشفّر هر قيمة بـ AES-256-GCM
3. يكتب در ملف مؤقت، ثم يُعيد التسمية ذرياً
4. يسجّل هشداراً يوصي بتدوير رمزها

### الترحيل الدستی

إذا كانت لديك رمزها در ملف `triggerfish.yaml` (خیر تستخدم ممراجعه کنید `secret:`)، رحّلها به سلسلة المفاتيح:

```bash
triggerfish config migrate-secrets
```

يمسح این تكوينك بحثاً عن حقول رمزها الباروفة (مفاتيح API، رموز البوت، إلخ)، ويخزّنها در سلسلة المفاتيح، ويستبدل القيم در ملف پیکربندی بممراجعه کنید `secret:`.

### مشاهر النقل از طریق الأجهزة

إذا تضمّن الترحيل نقل ملفات از طریق حدود أنظمة الملفات (نقاط تركيب مختلفة، NFS)، قد تفشل إعادة التسمية الذرية. يعود الترحيل به نسخ-ثم-حذف، وهو آاز لكنه يحتفظ بكخیر الملدرن روی القرص لفترة وجيزة.

---

## حل رمزها

### چگونه تعمل ممراجعه کنید `secret:`

تُحل قيم پیکربندی المسبوقة بـ `secret:` عند بدء التشغيل:

```yaml
# در triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# عند بدء التشغيل، تُحل به:
apiKey: "sk-ant-api03-actual-key-value..."
```

القيمة المحلولة موجودة فقط در حافظه. ملف پیکربندی روی القرص يحتوي همیشه روی مرجع `secret:`.

### "Secret not found"

```
Secret not found: <key>
```

المفتاح المُشار إليه غير موجود در سلسلة المفاتيح.

**الحل:**

```bash
triggerfish config set-secret <key> <value>
```

### عرض رمزها

```bash
# عرض تمام مفاتيح رمزها المخزّنة (خیر تُعرض القيم)
triggerfish config get-secret --list
```

### حذف رمزها

```bash
triggerfish config set-secret <key> ""
# یا از طریق عامل:
# يمكن للعامل درخواست حذف رمزها از طریق ابزار رمزها
```

---

## تجاوز متغير البيئة

يمكن تجاوز مسار ملف المفتاح بـ `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

این مدرد بشهر أساسي لعمليات نشر Docker با تخطيطات وحدات ذخیره‌سازی مخصصة.

---

## أسماء مفاتيح رمزها الشائعة

این هي مفاتيح سلسلة المفاتيح القياسية المستخدمة بواسطة Triggerfish:

| المفتاح | استفاده |
|-----|-------|
| `provider:<name>:apiKey` | مفتاح API خیررائه‌دهنده LLM |
| `telegram:botToken` | رمز بوت Telegram |
| `slack:botToken` | رمز بوت Slack |
| `slack:appToken` | رمز مستوى تطبيق Slack |
| `slack:signingSecret` | سر التوقيع لـ Slack |
| `discord:botToken` | رمز بوت Discord |
| `whatsapp:accessToken` | رمز وصول WhatsApp Cloud API |
| `whatsapp:webhookVerifyToken` | رمز التحقق از webhook لـ WhatsApp |
| `email:smtpPassword` | هرمة مرور SMTP relay |
| `email:imapPassword` | هرمة مرور خادم IMAP |
| `web:search:apiKey` | مفتاح Brave Search API |
| `github-pat` | رمز الوصول الشخصي لـ GitHub |
| `notion:token` | رمز یکپارچه‌سازی Notion |
| `caldav:password` | هرمة مرور خادم CalDAV |
| `google:clientId` | بارّف عميل Google OAuth |
| `google:clientSecret` | سر عميل Google OAuth |
| `google:refreshToken` | رمز تحديث Google OAuth |
