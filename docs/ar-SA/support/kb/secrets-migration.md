# قاعدة المعرفة: ترحيل الأسرار

يغطي هذا المقال ترحيل الأسرار من تخزين النص العادي إلى التنسيق المشفر، ومن قيم التكوين المضمّنة إلى مراجع سلسلة المفاتيح.

## الخلفية

خزّنت الإصدارات المبكرة من Triggerfish الأسرار كنص عادي JSON. يستخدم الإصدار الحالي تشفير AES-256-GCM لمخازن الأسرار المدعومة بالملفات (Windows، Docker) وسلاسل المفاتيح الأصلية لنظام التشغيل (macOS Keychain، Linux Secret Service).

## الترحيل التلقائي (من نص عادي إلى مشفر)

عندما يفتح Triggerfish ملف أسرار ويكتشف التنسيق القديم بالنص العادي (كائن JSON مسطح بدون حقل `v`)، يُرحّل تلقائياً:

1. **الاكتشاف.** يُفحص الملف بحثاً عن بنية `{v: 1, entries: {...}}`. إذا كان `Record<string, string>` عادي، فهو تنسيق قديم.

2. **الترحيل.** كل قيمة بنص عادي تُشفَّر بـ AES-256-GCM باستخدام مفتاح جهاز مشتق عبر PBKDF2. يُنشأ IV فريد لكل قيمة.

3. **الكتابة الذرية.** تُكتب البيانات المشفرة في ملف مؤقت أولاً، ثم تُعاد التسمية ذرياً لاستبدال الأصل. يمنع هذا فقدان البيانات إذا أُوقفت العملية.

4. **التسجيل.** يُنشأ إدخالا سجل:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **التعامل مع الأجهزة المتعددة.** إذا فشلت إعادة التسمية الذرية (مثلاً الملف المؤقت وملف الأسرار على أنظمة ملفات مختلفة)، يعود الترحيل إلى نسخ-ثم-حذف.

### ما يجب عليك فعله

لا شيء. الترحيل تلقائي بالكامل ويحدث عند أول وصول. لكن بعد الترحيل:

- **دوّر أسرارك.** قد تكون نسخ النص العادي نُسخت احتياطياً أو خُزّنت مؤقتاً أو سُجّلت. أنشئ مفاتيح API جديدة وحدّثها:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **احذف النسخ الاحتياطية القديمة.** إذا كانت لديك نسخ احتياطية من ملف الأسرار القديم بالنص العادي، احذفها بشكل آمن.

## الترحيل اليدوي (من تكوين مضمّن إلى سلسلة المفاتيح)

إذا كان `triggerfish.yaml` يحتوي على قيم أسرار خام بدلاً من مراجع `secret:`:

```yaml
# قبل (غير آمن)
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

هذا الأمر:

1. يمسح التكوين بحثاً عن حقول الأسرار المعروفة (مفاتيح API، رموز البوت، كلمات المرور)
2. يخزّن كل قيمة في سلسلة مفاتيح نظام التشغيل تحت اسم مفتاحها القياسي
3. يستبدل القيمة المضمّنة بمرجع `secret:`

```yaml
# بعد (آمن)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### حقول الأسرار المعروفة

يعرف أمر الترحيل هذه الحقول:

| مسار التكوين | مفتاح سلسلة المفاتيح |
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

يشتق مخزن الملفات المشفر مفتاح التشفير الخاص به من مفتاح جهاز مخزّن في `secrets.key`. يُنشأ هذا المفتاح تلقائياً عند أول استخدام.

### أذونات ملف المفتاح

على أنظمة Unix، يجب أن يكون لملف المفتاح أذونات `0600` (قراءة/كتابة المالك فقط). يتحقق Triggerfish من هذا عند بدء التشغيل ويسجّل تحذيراً إذا كانت الأذونات مفتوحة جداً:

```
Machine key file permissions too open
```

الحل:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### فقدان ملف المفتاح

إذا حُذف ملف مفتاح الجهاز أو تلف، تصبح جميع الأسرار المشفرة به غير قابلة للاسترداد. ستحتاج إلى إعادة تخزين كل سر:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... إلخ
```

انسخ ملف `secrets.key` احتياطياً في موقع آمن.

### مسار مفتاح مخصص

تجاوز موقع ملف المفتاح بـ:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

هذا مفيد بشكل أساسي لعمليات نشر Docker مع تخطيطات وحدات تخزين غير قياسية.
