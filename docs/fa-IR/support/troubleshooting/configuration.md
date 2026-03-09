# عیب‌یابی: پیکربندی

## أخطاء تحليل YAML

### "Configuration parse failed"

يحتوي ملف YAML روی خطأ در الصيغة. الأسباب الشائعة:

- **عدم تطابق المسافات البادئة.** YAML حساس للمسافات البيضاء. استخدم المسافات وليس عخیرمات الجدولة. باید أن يكون هر مستوى تداخل دقیقاً مسافتين.
- **أحرف خاصة غير مقتبسة.** القيم التي تحتوي روی `:`, `#`, `{`, `}`, `[`, `]`, یا `&` باید أن تكون مقتبسة.
- **نقطتان مفقودتان بعد المفتاح.** هر مفتاح يحتاج `: ` (نقطتان متبوعة بمسافة).

تحقق از صحة YAML:

```bash
triggerfish config validate
```

یا استخدم ابزار تحقق YAML از طریق الإنترنت للعثور روی السطر الدقيق.

### "Configuration file did not parse to an object"

تم تحليل ملف YAML بنجاح لكن النتيجة ليست تعيين YAML (كائن). يحدث این إذا كان ملفك يحتوي فقط روی قيمة مفردة یا قائمة یا فارغ.

باید أن يكون `triggerfish.yaml` الخاص بك تعييناً روی المستوى الأروی. كحد أدنى:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### "Configuration file not found"

يبحث Triggerfish عن پیکربندی در این المسارات بالترتيب:

1. متغير البيئة `$TRIGGERFISH_CONFIG` (إذا كان مضبوطاً)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (إذا كان `TRIGGERFISH_DATA_DIR` مضبوطاً)
3. `/data/triggerfish.yaml` (بيئات Docker)
4. `~/.triggerfish/triggerfish.yaml` (پیش‌فرض)

شغّل باالج راه‌اندازی لإنشاء واحد:

```bash
triggerfish dive
```

---

## أخطاء التحقق

### "Configuration validation failed"

این يعني أن YAML تم تحليله لكنه فشل در التحقق البنيوي. پیام‌ها محددة:

**"models is required"** یا **"models.primary is required"**

قسم `models` إلزامي. تحتاج روی الأقل ارائه‌دهندهاً أساسياً ومدخیرً:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** یا **"primary.model must be non-empty"**

باید أن يحتوي حقل `primary` روی هر از `provider` و`model` مضبوطين روی سخیرسل غير فارغة.

**"Invalid classification level"** در `classification_models`

المستويات الصالحة هي: `RESTRICTED`، `CONFIDENTIAL`، `INTERNAL`، `PUBLIC`. این حساسة لحالة الأحرف. تحقق از مفاتيح `classification_models`.

---

## أخطاء ممراجعه کنید رمزها

### السر لم يُحل عند بدء التشغيل

إذا كان تكوينك يحتوي روی `secret:some-key` واین المفتاح غير موجود در سلسلة المفاتيح، تخرج الخدمة الخلدرة بخطأ مثل:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**الحل:**

```bash
# اعرض رمزها الموجودة
triggerfish config get-secret --list

# خزّن السر المفقود
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### واجهة رمزها الخلدرة غير متوفرة

روی Linux، يستخدم مخزن رمزها `secret-tool` (libsecret / GNOME Keyring). إذا لم تكن واجهة Secret Service D-Bus متوفرة (خوادم بدون واجهة رسومية، حاويات حد أدنى)، سترى أخطاء عند ذخیره‌سازی یا استرجاع رمزها.

**حل بديل لـ Linux بدون واجهة رسومية:**

1. ثبّت `gnome-keyring` و`libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. ابدأ خدمة سلسلة المفاتيح:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. یا استخدم البديل المشفر در الملف بضبط:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   توجه: البديل در حافظه يعني فقدان رمزها عند إعادة التشغيل. ازاسب فقط لخیرختبار.

---

## مشاهر قيم پیکربندی

### تحويل القيم الازطقية

عند استخدام `triggerfish config set`، تُحوَّل قيم السلسلة `"true"` و`"false"` به‌صورت خودکار به قيم YAML ازطقية. إذا كنت تحتاج فعخیرً سلسلة النص `"true"` الحردرة، عدّل ملف YAML مستقیماً.

بالمثل، السخیرسل التي تبدو كأعداد صحیحة (`"8080"`) تُحوَّل به أرقام.

### صيغة المسار الازقّط

يستخدم أمرا `config set` و`config get` المسارات الازقّطة للتنقل در YAML المتداخل:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

إذا كان جزء از المسار يحتوي روی نقطة، خیر توجد صيغة تهريب. عدّل ملف YAML مستقیماً.

### إخفاء رمزها در `config get`

عند تشغيل `triggerfish config get` روی مفتاح يحتوي روی "key" یا "secret" یا "token"، يُخفى الناتج: `****...****` با إظهار یال وآخر 4 أحرف فقط. این مقصود. استخدم `triggerfish config get-secret <key>` خیرسترجاع القيمة الفعلية.

---

## نسخ پیکربندی اخیرحتياطية

يُنشئ Triggerfish نسخة احتياطية مؤرخة در `~/.triggerfish/backups/` قبل هر عملية `config set` یا `config add-channel` یا `config add-plugin`. يُحتفظ بما يصل به 10 نسخ احتياطية.

خیرستعادة نسخة احتياطية:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## التحقق از ارائه‌دهنده

يتحقق باالج راه‌اندازی از مفاتيح API عن طريق فراخوانی نقطة نهاية قائمة المدل‌ها لهر ارائه‌دهنده (والتي خیر تستهلك رموزاً). نقاط نهاية التحقق هي:

| ارائه‌دهنده | نقطة النهاية |
|----------|----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

إذا فشل التحقق، تحقق مرة أخرى از:
- مفتاح API صحیح وغير ازتهي الصخیرحية
- نقطة النهاية قابلة للوصول از شبكتك
- لخیررائه‌دهندهين المحلیين (Ollama، LM Studio)، الخادم کار می‌کند فعخیرً

### مدل غير موجود

إذا نجح التحقق لكن مدل غير موجود، يحذّرك الباالج. این عادة يعني:

- **خطأ مطبعي در اسم مدل.** تحقق از وثائق ارائه‌دهنده لبارّفات المدل‌ها الدقيقة.
- **مدل Ollama لم يُسحب.** شغّل `ollama pull <model>` یاخیرً.
- **ارائه‌دهنده خیر يعرض مدل.** بعض ارائه‌دهندهين (Fireworks) يستخدمون تنسيقات تسمية مختلفة. يُعادل الباالج الأنماط الشائعة، لكن بارّفات المدل‌ها غير الباتادة قد خیر تتطابق.
