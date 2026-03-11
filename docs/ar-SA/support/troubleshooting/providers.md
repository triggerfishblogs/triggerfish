# استكشاف الأخطاء: مزودو LLM

## أخطاء المزودين الشائعة

### 401 Unauthorized / 403 Forbidden

مفتاح API الخاص بك غير صالح أو منتهي الصلاحية أو لا يملك أذونات كافية.

**الحل:**

```bash
# أعد تخزين مفتاح API
triggerfish config set-secret provider:<name>:apiKey <your-key>

# أعد تشغيل الخدمة الخلفية
triggerfish stop && triggerfish start
```

ملاحظات خاصة بالمزودين:

| المزود | تنسيق المفتاح | أين تحصل عليه |
|----------|-----------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

لقد تجاوزت حد معدل المزود. لا يُعيد Triggerfish المحاولة تلقائياً عند 429 لمعظم المزودين (باستثناء Notion الذي يحتوي على تراجع مدمج).

**الحل:** انتظر وحاول مرة أخرى. إذا وصلت لحدود المعدل باستمرار، فكّر في:
- ترقية خطة API الخاصة بك لحدود أعلى
- إضافة مزود احتياطي ليمرّر الطلبات عند تقييد المزود الأساسي
- تقليل تكرار المُنشّطات إذا كانت المهام المجدولة هي السبب

### 500 / 502 / 503 خطأ خادم

خوادم المزود تواجه مشاكل. هذه عادة مؤقتة.

إذا كان لديك سلسلة تبديل تلقائي مكوّنة، يحاول Triggerfish المزود التالي تلقائياً. بدون تبديل تلقائي، ينتقل الخطأ إلى المستخدم.

### "No response body for streaming"

قبل المزود الطلب لكنه أرجع جسم استجابة فارغ لاستدعاء بث. يمكن أن يحدث هذا عندما:

- بنية المزود التحتية محمّلة بشكل زائد
- وكيل أو جدار حماية يزيل جسم الاستجابة
- النموذج غير متوفر مؤقتاً

يؤثر هذا على: OpenRouter، Local (Ollama/LM Studio)، ZenMux، Z.AI، Fireworks.

---

## مشاكل خاصة بالمزودين

### Anthropic

**تحويل تنسيق الأدوات.** يحوّل Triggerfish بين تنسيق الأدوات الداخلي وتنسيق أدوات Anthropic الأصلي. إذا رأيت أخطاء متعلقة بالأدوات، تحقق من أن تعريفات أدواتك تحتوي على JSON Schema صالح.

**معالجة موجّه النظام.** يتطلب Anthropic موجّه النظام كحقل منفصل وليس كرسالة. هذا التحويل تلقائي، لكن إذا رأيت رسائل "system" تظهر في المحادثة، هناك خطأ في تنسيق الرسائل.

### OpenAI

**عقوبة التكرار.** يطبّق Triggerfish عقوبة تكرار 0.3 على جميع طلبات OpenAI لتثبيط المخرجات المتكررة. هذا مُثبّت في الكود ولا يمكن تغييره عبر التكوين.

**دعم الصور.** يدعم OpenAI الصور المشفرة بـ base64 في محتوى الرسالة. إذا لم يعمل الرؤية، تأكد من أن لديك نموذجاً يدعم الرؤية مكوّناً (مثل `gpt-4o`، وليس `gpt-4o-mini`).

### Google Gemini

**المفتاح في سلسلة الاستعلام.** على عكس المزودين الآخرين، يستخدم Google مفتاح API كمعامل استعلام وليس رأساً. يُعالج هذا تلقائياً، لكنه يعني أن المفتاح قد يظهر في سجلات الوكيل/الوصول إذا وجّهت عبر وكيل مؤسسي.

### Ollama / LM Studio (محلي)

**يجب أن يكون الخادم يعمل.** تتطلب المزودات المحلية أن يكون خادم النموذج يعمل قبل بدء Triggerfish. إذا لم يكن Ollama أو LM Studio يعمل:

```
Local LLM request failed (connection refused)
```

**ابدأ الخادم:**

```bash
# Ollama
ollama serve

# LM Studio
# افتح LM Studio وابدأ الخادم المحلي
```

**النموذج غير محمّل.** مع Ollama، يجب سحب النموذج أولاً:

```bash
ollama pull llama3.3:70b
```

**تجاوز نقطة النهاية.** إذا لم يكن خادمك المحلي على المنفذ الافتراضي:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # افتراضي Ollama
      # endpoint: "http://localhost:1234"  # افتراضي LM Studio
```

### Fireworks

**API أصلي.** يستخدم Triggerfish واجهة API الأصلية لـ Fireworks، وليس نقطة النهاية المتوافقة مع OpenAI. قد تختلف معرّفات النماذج عما تراه في وثائق التوافقية مع OpenAI.

**تنسيقات معرّف النموذج.** يقبل Fireworks عدة أنماط لمعرّف النموذج. يُعادل المعالج التنسيقات الشائعة، لكن إذا فشل التحقق، تحقق من [مكتبة نماذج Fireworks](https://fireworks.ai/models) للمعرّف الدقيق.

### OpenRouter

**توجيه النموذج.** يوجّه OpenRouter الطلبات إلى مزودين متعددين. تُغلَّف الأخطاء من المزود الأساسي بتنسيق خطأ OpenRouter. يُستخرج رسالة الخطأ الفعلية وتُعرض.

**تنسيق خطأ API.** يُرجع OpenRouter الأخطاء ككائنات JSON. إذا بدت رسالة الخطأ عامة، يُسجَّل الخطأ الخام على مستوى DEBUG.

### ZenMux / Z.AI

**دعم البث.** كلا المزودين يدعمان البث. إذا فشل البث:

```
ZenMux stream failed (status): error text
```

تحقق من أن مفتاح API الخاص بك لديه أذونات البث (بعض طبقات API تقيّد الوصول للبث).

---

## التبديل التلقائي

### كيف يعمل التبديل التلقائي

عندما يفشل المزود الأساسي، يحاول Triggerfish كل نموذج في قائمة `failover` بالترتيب:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

إذا نجح مزود احتياطي، تُسجَّل الاستجابة مع المزود الذي استُخدم. إذا فشل جميع المزودين، يُرجع الخطأ الأخير للمستخدم.

### "All providers exhausted"

فشل كل مزود في السلسلة. تحقق من:

1. هل جميع مفاتيح API صالحة؟ اختبر كل مزود على حدة.
2. هل جميع المزودين يعانون من انقطاعات؟ تحقق من صفحات حالتهم.
3. هل شبكتك تحظر HTTPS الصادر لأي من نقاط نهاية المزودين؟

### تكوين التبديل التلقائي

```yaml
models:
  failover_config:
    max_retries: 3          # المحاولات لكل مزود قبل الانتقال للتالي
    retry_delay_ms: 1000    # التأخير الأساسي بين المحاولات
    conditions:             # ظروف الخطأ التي تُفعّل التبديل
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

اسم المزود في `models.primary.provider` لا يطابق أي مزود مكوّن في `models.providers`. تحقق من الأخطاء المطبعية.

### "Classification model provider not configured"

ضبطت تجاوز `classification_models` يشير إلى مزود غير موجود في `models.providers`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # يجب أن يكون هذا المزود موجوداً في models.providers
      model: llama3.3:70b
  providers:
    # يجب تعريف "local" هنا
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## سلوك إعادة المحاولة

يُعيد Triggerfish محاولة طلبات المزود عند الأخطاء المؤقتة (مهلات الشبكة، استجابات 5xx). منطق إعادة المحاولة:

1. ينتظر بتراجع أسي بين المحاولات
2. يسجّل كل محاولة إعادة على مستوى WARN
3. بعد استنفاد المحاولات لمزود واحد، ينتقل إلى التالي في سلسلة التبديل
4. اتصالات البث لها منطق إعادة محاولة منفصل لإنشاء الاتصال مقابل الفشل أثناء البث

يمكنك رؤية محاولات إعادة المحاولة في السجلات:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
