# استكشاف الأخطاء: التكوين

## أخطاء تحليل YAML

### "Configuration parse failed"

يحتوي ملف YAML على خطأ في الصيغة. الأسباب الشائعة:

- **عدم تطابق المسافات البادئة.** YAML حساس للمسافات البيضاء. استخدم المسافات وليس علامات الجدولة. يجب أن يكون كل مستوى تداخل بالضبط مسافتين.
- **أحرف خاصة غير مقتبسة.** القيم التي تحتوي على `:`, `#`, `{`, `}`, `[`, `]`, أو `&` يجب أن تكون مقتبسة.
- **نقطتان مفقودتان بعد المفتاح.** كل مفتاح يحتاج `: ` (نقطتان متبوعة بمسافة).

تحقق من صحة YAML:

```bash
triggerfish config validate
```

أو استخدم أداة تحقق YAML عبر الإنترنت للعثور على السطر الدقيق.

### "Configuration file did not parse to an object"

تم تحليل ملف YAML بنجاح لكن النتيجة ليست تعيين YAML (كائن). يحدث هذا إذا كان ملفك يحتوي فقط على قيمة مفردة أو قائمة أو فارغ.

يجب أن يكون `triggerfish.yaml` الخاص بك تعييناً على المستوى الأعلى. كحد أدنى:

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

يبحث Triggerfish عن التكوين في هذه المسارات بالترتيب:

1. متغير البيئة `$TRIGGERFISH_CONFIG` (إذا كان مضبوطاً)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (إذا كان `TRIGGERFISH_DATA_DIR` مضبوطاً)
3. `/data/triggerfish.yaml` (بيئات Docker)
4. `~/.triggerfish/triggerfish.yaml` (الافتراضي)

شغّل معالج الإعداد لإنشاء واحد:

```bash
triggerfish dive
```

---

## أخطاء التحقق

### "Configuration validation failed"

هذا يعني أن YAML تم تحليله لكنه فشل في التحقق البنيوي. رسائل محددة:

**"models is required"** أو **"models.primary is required"**

قسم `models` إلزامي. تحتاج على الأقل مزوداً أساسياً ونموذجاً:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** أو **"primary.model must be non-empty"**

يجب أن يحتوي حقل `primary` على كل من `provider` و`model` مضبوطين على سلاسل غير فارغة.

**"Invalid classification level"** في `classification_models`

المستويات الصالحة هي: `RESTRICTED`، `CONFIDENTIAL`، `INTERNAL`، `PUBLIC`. هذه حساسة لحالة الأحرف. تحقق من مفاتيح `classification_models`.

---

## أخطاء مراجع الأسرار

### السر لم يُحل عند بدء التشغيل

إذا كان تكوينك يحتوي على `secret:some-key` وهذا المفتاح غير موجود في سلسلة المفاتيح، تخرج الخدمة الخلفية بخطأ مثل:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**الحل:**

```bash
# اعرض الأسرار الموجودة
triggerfish config get-secret --list

# خزّن السر المفقود
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### واجهة الأسرار الخلفية غير متوفرة

على Linux، يستخدم مخزن الأسرار `secret-tool` (libsecret / GNOME Keyring). إذا لم تكن واجهة Secret Service D-Bus متوفرة (خوادم بدون واجهة رسومية، حاويات حد أدنى)، سترى أخطاء عند تخزين أو استرجاع الأسرار.

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

3. أو استخدم البديل المشفر في الملف بضبط:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   ملاحظة: البديل في الذاكرة يعني فقدان الأسرار عند إعادة التشغيل. مناسب فقط للاختبار.

---

## مشاكل قيم التكوين

### تحويل القيم المنطقية

عند استخدام `triggerfish config set`، تُحوَّل قيم السلسلة `"true"` و`"false"` تلقائياً إلى قيم YAML منطقية. إذا كنت تحتاج فعلاً سلسلة النص `"true"` الحرفية، عدّل ملف YAML مباشرة.

بالمثل، السلاسل التي تبدو كأعداد صحيحة (`"8080"`) تُحوَّل إلى أرقام.

### صيغة المسار المنقّط

يستخدم أمرا `config set` و`config get` المسارات المنقّطة للتنقل في YAML المتداخل:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

إذا كان جزء من المسار يحتوي على نقطة، لا توجد صيغة تهريب. عدّل ملف YAML مباشرة.

### إخفاء الأسرار في `config get`

عند تشغيل `triggerfish config get` على مفتاح يحتوي على "key" أو "secret" أو "token"، يُخفى الناتج: `****...****` مع إظهار أول وآخر 4 أحرف فقط. هذا مقصود. استخدم `triggerfish config get-secret <key>` لاسترجاع القيمة الفعلية.

---

## نسخ التكوين الاحتياطية

يُنشئ Triggerfish نسخة احتياطية مؤرخة في `~/.triggerfish/backups/` قبل كل عملية `config set` أو `config add-channel` أو `config add-plugin`. يُحتفظ بما يصل إلى 10 نسخ احتياطية.

لاستعادة نسخة احتياطية:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## التحقق من المزود

يتحقق معالج الإعداد من مفاتيح API عن طريق استدعاء نقطة نهاية قائمة النماذج لكل مزود (والتي لا تستهلك رموزاً). نقاط نهاية التحقق هي:

| المزود | نقطة النهاية |
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

إذا فشل التحقق، تحقق مرة أخرى من:
- مفتاح API صحيح وغير منتهي الصلاحية
- نقطة النهاية قابلة للوصول من شبكتك
- للمزودين المحليين (Ollama، LM Studio)، الخادم يعمل فعلاً

### النموذج غير موجود

إذا نجح التحقق لكن النموذج غير موجود، يحذّرك المعالج. هذا عادة يعني:

- **خطأ مطبعي في اسم النموذج.** تحقق من وثائق المزود لمعرّفات النماذج الدقيقة.
- **نموذج Ollama لم يُسحب.** شغّل `ollama pull <model>` أولاً.
- **المزود لا يعرض النموذج.** بعض المزودين (Fireworks) يستخدمون تنسيقات تسمية مختلفة. يُعادل المعالج الأنماط الشائعة، لكن معرّفات النماذج غير المعتادة قد لا تتطابق.
