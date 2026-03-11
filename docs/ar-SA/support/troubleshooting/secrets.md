# استكشاف الأخطاء: الأسرار وبيانات الاعتماد

## واجهات سلسلة المفاتيح حسب المنصة

| المنصة | الواجهة الخلفية | التفاصيل |
|----------|---------|---------|
| macOS | Keychain (أصلي) | يستخدم أداة CLI `security` للوصول إلى Keychain Access |
| Linux | Secret Service (D-Bus) | يستخدم أداة CLI `secret-tool` (libsecret / GNOME Keyring) |
| Windows | مخزن ملفات مشفر | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | مخزن ملفات مشفر | `/data/secrets.json` + `/data/secrets.key` |

تُختار الواجهة الخلفية تلقائياً عند بدء التشغيل. لا يمكنك تغيير الواجهة الخلفية المستخدمة لمنصتك.

---

## مشاكل macOS

### مطالبات الوصول لسلسلة المفاتيح

قد يطالبك macOS بالسماح لـ `triggerfish` بالوصول إلى سلسلة المفاتيح. انقر "Always Allow" لتجنب المطالبات المتكررة. إذا نقرت "Deny" بالخطأ، افتح Keychain Access، واعثر على الإدخال، واحذفه. سيطالب الوصول التالي مرة أخرى.

### سلسلة المفاتيح مقفلة

إذا كانت سلسلة مفاتيح macOS مقفلة (مثلاً بعد وضع السكون)، ستفشل عمليات الأسرار. افتحها:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

أو فقط افتح قفل Mac الخاص بك (تُفتح سلسلة المفاتيح عند تسجيل الدخول).

---

## مشاكل Linux

### "secret-tool" غير موجود

تستخدم واجهة سلسلة المفاتيح على Linux أداة `secret-tool`، وهي جزء من حزمة `libsecret-tools`.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### لا يوجد خادم Secret Service يعمل

على الخوادم بدون واجهة رسومية أو بيئات سطح مكتب حد أدنى، قد لا يكون هناك خادم Secret Service يعمل. الأعراض:

- أوامر `secret-tool` تتوقف أو تفشل
- رسائل خطأ حول اتصال D-Bus

**الخيارات:**

1. **ثبّت وابدأ GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **استخدم البديل المشفر في الملف:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   تحذير: البديل في الذاكرة لا يحتفظ بالأسرار عبر إعادات التشغيل. مناسب فقط للاختبار.

3. **للخوادم، فكّر في Docker.** نشر Docker يستخدم مخزن ملفات مشفر لا يتطلب خادم سلسلة مفاتيح.

### KDE / KWallet

إذا كنت تستخدم KDE مع KWallet بدلاً من GNOME Keyring، يجب أن تعمل `secret-tool` عبر واجهة Secret Service D-Bus API التي ينفّذها KWallet. إذا لم تعمل، ثبّت `gnome-keyring` بجانب KWallet.

---

## مخزن الملفات المشفر لـ Windows / Docker

### كيف يعمل

يستخدم مخزن الملفات المشفر تشفير AES-256-GCM:

1. يُشتق مفتاح الجهاز باستخدام PBKDF2 ويُخزَّن في `secrets.key`
2. كل قيمة سر تُشفَّر فردياً بـ IV فريد
3. البيانات المشفرة تُخزَّن في `secrets.json` بتنسيق مُصدَّر (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

على الأنظمة المبنية على Unix (Linux في Docker)، يجب أن يكون لملف المفتاح أذونات `0600` (قراءة/كتابة المالك فقط). إذا كانت الأذونات مفتوحة جداً:

```
Machine key file permissions too open
```

**الحل:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# أو في Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

ملف المفتاح موجود لكن لا يمكن تحليله. قد يكون اقتُطع أو كُتب فوقه.

**الحل:** احذف ملف المفتاح وأعد الإنشاء:

```bash
rm ~/.triggerfish/secrets.key
```

عند بدء التشغيل التالي، يُنشأ مفتاح جديد. لكن جميع الأسرار المشفرة بالمفتاح القديم ستصبح غير قابلة للقراءة. ستحتاج إلى إعادة تخزين جميع الأسرار:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# كرر لجميع الأسرار
```

### "Secret file permissions too open"

مثل ملف المفتاح، يجب أن يكون لملف الأسرار أذونات مقيّدة:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

لم يستطع النظام ضبط أذونات الملف. يمكن أن يحدث هذا على أنظمة ملفات لا تدعم أذونات Unix (بعض التركيبات الشبكية، أقسام FAT/exFAT). تحقق من أن نظام الملفات يدعم تغييرات الأذونات.

---

## ترحيل الأسرار القديمة

### الترحيل التلقائي

إذا اكتشف Triggerfish ملف أسرار بنص عادي (التنسيق القديم بدون تشفير)، يُرحّل تلقائياً إلى التنسيق المشفر عند أول تحميل:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

الترحيل:
1. يقرأ ملف JSON بالنص العادي
2. يشفّر كل قيمة بـ AES-256-GCM
3. يكتب في ملف مؤقت، ثم يُعيد التسمية ذرياً
4. يسجّل تحذيراً يوصي بتدوير الأسرار

### الترحيل اليدوي

إذا كانت لديك أسرار في ملف `triggerfish.yaml` (لا تستخدم مراجع `secret:`)، رحّلها إلى سلسلة المفاتيح:

```bash
triggerfish config migrate-secrets
```

يمسح هذا تكوينك بحثاً عن حقول الأسرار المعروفة (مفاتيح API، رموز البوت، إلخ)، ويخزّنها في سلسلة المفاتيح، ويستبدل القيم في ملف التكوين بمراجع `secret:`.

### مشاكل النقل عبر الأجهزة

إذا تضمّن الترحيل نقل ملفات عبر حدود أنظمة الملفات (نقاط تركيب مختلفة، NFS)، قد تفشل إعادة التسمية الذرية. يعود الترحيل إلى نسخ-ثم-حذف، وهو آمن لكنه يحتفظ بكلا الملفين على القرص لفترة وجيزة.

---

## حل الأسرار

### كيف تعمل مراجع `secret:`

تُحل قيم التكوين المسبوقة بـ `secret:` عند بدء التشغيل:

```yaml
# في triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# عند بدء التشغيل، تُحل إلى:
apiKey: "sk-ant-api03-actual-key-value..."
```

القيمة المحلولة موجودة فقط في الذاكرة. ملف التكوين على القرص يحتوي دائماً على مرجع `secret:`.

### "Secret not found"

```
Secret not found: <key>
```

المفتاح المُشار إليه غير موجود في سلسلة المفاتيح.

**الحل:**

```bash
triggerfish config set-secret <key> <value>
```

### عرض الأسرار

```bash
# عرض جميع مفاتيح الأسرار المخزّنة (لا تُعرض القيم)
triggerfish config get-secret --list
```

### حذف الأسرار

```bash
triggerfish config set-secret <key> ""
# أو عبر الوكيل:
# يمكن للوكيل طلب حذف الأسرار عبر أداة الأسرار
```

---

## تجاوز متغير البيئة

يمكن تجاوز مسار ملف المفتاح بـ `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

هذا مفيد بشكل أساسي لعمليات نشر Docker مع تخطيطات وحدات تخزين مخصصة.

---

## أسماء مفاتيح الأسرار الشائعة

هذه هي مفاتيح سلسلة المفاتيح القياسية المستخدمة بواسطة Triggerfish:

| المفتاح | الاستخدام |
|-----|-------|
| `provider:<name>:apiKey` | مفتاح API لمزود LLM |
| `telegram:botToken` | رمز بوت Telegram |
| `slack:botToken` | رمز بوت Slack |
| `slack:appToken` | رمز مستوى تطبيق Slack |
| `slack:signingSecret` | سر التوقيع لـ Slack |
| `discord:botToken` | رمز بوت Discord |
| `whatsapp:accessToken` | رمز وصول WhatsApp Cloud API |
| `whatsapp:webhookVerifyToken` | رمز التحقق من webhook لـ WhatsApp |
| `email:smtpPassword` | كلمة مرور SMTP relay |
| `email:imapPassword` | كلمة مرور خادم IMAP |
| `web:search:apiKey` | مفتاح Brave Search API |
| `github-pat` | رمز الوصول الشخصي لـ GitHub |
| `notion:token` | رمز تكامل Notion |
| `caldav:password` | كلمة مرور خادم CalDAV |
| `google:clientId` | معرّف عميل Google OAuth |
| `google:clientSecret` | سر عميل Google OAuth |
| `google:refreshToken` | رمز تحديث Google OAuth |
