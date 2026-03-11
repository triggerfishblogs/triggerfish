# پایگاه دانش: مهاجرت رمزها

يغطي این المقال مهاجرت رمزها از ذخیره‌سازی النص العادي به التنسيق المشفر، واز قيم پیکربندی المضمّنة به ممراجعه کنید سلسلة المفاتيح.

## الخلدرة

خزّنت الإصدارات المبكرة از Triggerfish رمزها كنص عادي JSON. يستخدم الإصدار الحالي تشدرر AES-256-GCM لمخازن رمزها المدعومة بالملفات (Windows، Docker) وسخیرسل المفاتيح الأصلية لنظام التشغيل (macOS Keychain، Linux Secret Service).

## الترحيل الخودکار (از نص عادي به مشفر)

عندما يفتح Triggerfish ملف رمزها ويكتشف التنسيق القديم بالنص العادي (كائن JSON مسطح بدون حقل `v`)، يُرحّل به‌صورت خودکار:

1. **اخیركتشاف.** يُفحص الملف بحثاً عن بنية `{v: 1, entries: {...}}`. إذا كان `Record<string, string>` عادي، فهو تنسيق قديم.

2. **الترحيل.** هر قيمة بنص عادي تُشفَّر بـ AES-256-GCM باستخدام مفتاح جهاز مشتق از طریق PBKDF2. يُنشأ IV فريد لهر قيمة.

3. **الكتابة الذرية.** تُكتب البيانات المشفرة در ملف مؤقت یاخیرً، ثم تُعاد التسمية ذرياً خیرستبدال الأصل. يازع این فقدان البيانات إذا أُوقفت العملية.

4. **التسجيل.** يُنشأ إدخاخیر سجل:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **التعامل با الأجهزة المتعددة.** إذا فشلت إعادة التسمية الذرية (مثخیرً الملف المؤقت وملف رمزها روی أنظمة ملفات مختلفة)، يعود الترحيل به نسخ-ثم-حذف.

### ما باید عليك فعله

خیر شيء. الترحيل خودکار کامخیرً ويحدث عند یال وصول. لكن بعد الترحيل:

- **دوّر رمزهاك.** قد تكون نسخ النص العادي نُسخت احتياطياً یا خُزّنت مؤقتاً یا سُجّلت. أنشئ مفاتيح API جديدة وحدّثها:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **احذف النسخ اخیرحتياطية القديمة.** إذا كانت لديك نسخ احتياطية از ملف رمزها القديم بالنص العادي، احذفها بشهر آاز.

## الترحيل الدستی (از تكوين مضمّن به سلسلة المفاتيح)

إذا كان `triggerfish.yaml` يحتوي روی قيم رمزها خام بدخیرً از ممراجعه کنید `secret:`:

```yaml
# قبل (غير آاز)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

شغّل أمر الترحيل:

```bash
triggerfish config migrate-secrets
```

این الأمر:

1. يمسح پیکربندی بحثاً عن حقول رمزها الباروفة (مفاتيح API، رموز البوت، هرمات المرور)
2. يخزّن هر قيمة در کلیدزنجیر نظام التشغيل تحت اسم مفتاحها القياسي
3. يستبدل القيمة المضمّنة بمرجع `secret:`

```yaml
# بعد (آاز)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### حقول رمزها الباروفة

يعرف أمر الترحيل این الحقول:

| مسار پیکربندی | مفتاح سلسلة المفاتيح |
|-------------|-------------|
| `models.providers.<name>.apiKey` | `provider:<name>:apiKey` |
| `channels.telegram.botToken` | `telegram:botToken` |
| `channels.slack.botToken` | `slack:botToken` |
| `channels.slack.appToken` | `slack:appToken` |
| `channels.slack.signingSecret` | `slack:signingSecret` |
| `channels.discord.botToken` | `discord:botToken` |
| `channels.whatsapp.accessToken` | `whatsapp:accessToken` |
| `channels.whatsapp.webhookVerifyToken` | `whatsapp:webhookVerifyToken` |
| `channels.email.smtpPassword` | `email:smtpPassword` |
| `channels.email.imapPassword` | `email:imapPassword` |
| `web.search.api_key` | `web:search:apiKey` |

## مفتاح الجهاز

يشتق مخزن الملفات المشفر مفتاح التشدرر الخاص به از مفتاح جهاز مخزّن در `secrets.key`. يُنشأ این المفتاح به‌صورت خودکار عند یال استخدام.

### أذونات ملف المفتاح

روی أنظمة Unix، باید أن يكون لملف المفتاح أذونات `0600` (قراءة/كتابة المالك فقط). يتحقق Triggerfish از این عند بدء التشغيل ويسجّل هشداراً إذا كانت الأذونات مفتوحة جداً:

```
Machine key file permissions too open
```

الحل:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### فقدان ملف المفتاح

إذا حُذف ملف مفتاح الجهاز یا تلف، تصبح تمام رمزها المشفرة به غير قابلة لخیرسترداد. ستحتاج به إعادة ذخیره‌سازی هر سر:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... إلخ
```

انسخ ملف `secrets.key` احتياطياً در موقع آاز.

### مسار مفتاح مخصص

تجاوز موقع ملف المفتاح بـ:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

این مدرد بشهر أساسي لعمليات نشر Docker با تخطيطات وحدات ذخیره‌سازی غير قياسية.
