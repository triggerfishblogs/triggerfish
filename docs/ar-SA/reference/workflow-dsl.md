---
title: مرجع DSL سير العمل
description: المرجع الكامل لـ CNCF Serverless Workflow DSL 1.0 كما هو مُنفّذ في Triggerfish.
---

# مرجع DSL سير العمل

المرجع الكامل لـ CNCF Serverless Workflow DSL 1.0 كما هو مُنفّذ في محرك سير العمل الخاص بـ Triggerfish. للاطلاع على دليل الاستخدام والأمثلة، راجع [سير العمل](/ar-SA/features/workflows).

## هيكل المستند

يجب أن يحتوي كل ملف YAML لسير العمل على حقل `document` على المستوى الأعلى وكتلة `do`.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # optional
  description: "What it does"  # optional
classification_ceiling: INTERNAL  # optional
input:                            # optional
  from: "${ . }"
output:                           # optional
  from:
    result: "${ .final_step }"
timeout:                          # optional
  after: PT5M
do:
  - task_name:
      # task definition
```

### بيانات المستند الوصفية

| Field         | Type   | Required | الوصف                                        |
| ------------- | ------ | -------- | -------------------------------------------- |
| `dsl`         | string | yes      | إصدار DSL. يجب أن يكون `"1.0"`              |
| `namespace`   | string | yes      | تجميع منطقي (مثل `ops`، `reports`)            |
| `name`        | string | yes      | اسم سير عمل فريد ضمن مساحة الاسم             |
| `version`     | string | no       | سلسلة إصدار دلالي                            |
| `description` | string | no       | وصف مقروء للبشر                              |

### الحقول على المستوى الأعلى

| Field                     | Type         | Required | الوصف                                       |
| ------------------------- | ------------ | -------- | ------------------------------------------- |
| `document`                | object       | yes      | بيانات المستند الوصفية (انظر أعلاه)          |
| `do`                      | array        | yes      | قائمة مرتبة من إدخالات المهام                |
| `classification_ceiling`  | string       | no       | أقصى taint مسموح به للجلسة أثناء التنفيذ     |
| `input`                   | transform    | no       | تحويل مطبق على مدخلات سير العمل              |
| `output`                  | transform    | no       | تحويل مطبق على مخرجات سير العمل              |
| `timeout`                 | object       | no       | مهلة على مستوى سير العمل (`after: <ISO 8601>`) |
| `metadata`                | object       | no       | بيانات وصفية عشوائية بنمط مفتاح-قيمة         |

---

## تنسيق إدخال المهمة

كل إدخال في كتلة `do` هو كائن بمفتاح واحد. المفتاح هو اسم المهمة، والقيمة هي تعريف المهمة.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

يجب أن تكون أسماء المهام فريدة ضمن نفس كتلة `do`. يتم تخزين نتيجة المهمة في سياق البيانات تحت اسم المهمة.

---

## حقول المهام المشتركة

تشترك جميع أنواع المهام في هذه الحقول الاختيارية:

| Field      | Type      | الوصف                                               |
| ---------- | --------- | --------------------------------------------------- |
| `if`       | string    | شرط تعبيري. يتم تخطي المهمة عندما يكون زائفاً.     |
| `input`    | transform | تحويل مطبق قبل تنفيذ المهمة                         |
| `output`   | transform | تحويل مطبق بعد تنفيذ المهمة                         |
| `timeout`  | object    | مهلة المهمة: `after: <مدة ISO 8601>`                 |
| `then`     | string    | توجيه التدفق: `continue`، `end`، أو اسم مهمة        |
| `metadata` | object    | بيانات وصفية عشوائية بنمط مفتاح-قيمة. عند تمكين الإصلاح الذاتي، تتطلب `description` و `expects` و `produces`. |

---

## تكوين الإصلاح الذاتي

تمكّن كتلة `metadata.triggerfish.self_healing` وكيل إصلاح مستقل لسير العمل.
راجع [الإصلاح الذاتي](/ar-SA/features/workflows#الإصلاح-الذاتي) للدليل الكامل.

```yaml
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
      pause_timeout_seconds: 300
      pause_timeout_policy: escalate_and_halt
      notify_on: [intervention, escalation, approval_required]
```

| Field                   | Type    | Required | Default              | الوصف |
| ----------------------- | ------- | -------- | -------------------- | ----- |
| `enabled`               | boolean | yes      | —                    | تمكين وكيل الإصلاح |
| `retry_budget`          | number  | no       | `3`                  | الحد الأقصى لمحاولات التدخل |
| `approval_required`     | boolean | no       | `true`               | طلب موافقة بشرية للإصلاحات |
| `pause_on_intervention` | string  | no       | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | no       | `300`                | الثواني قبل تفعيل سياسة المهلة |
| `pause_timeout_policy`  | string  | no       | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | no       | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### بيانات الخطوة الوصفية (مطلوبة عند تمكين الإصلاح الذاتي)

عندما يكون `self_healing.enabled` مضبوطاً على `true`، يجب أن تتضمن كل مهمة
حقول البيانات الوصفية التالية. يرفض المحلل سير العمل التي تفتقد أياً منها.

| Field         | Type   | الوصف                                        |
| ------------- | ------ | -------------------------------------------- |
| `description` | string | ما تفعله الخطوة ولماذا                       |
| `expects`     | string | شكل الإدخال أو الشروط المسبقة المطلوبة       |
| `produces`    | string | شكل الإخراج المُنتج                          |

```yaml
- fetch-invoices:
    call: http
    with:
      endpoint: "https://api.example.com/invoices"
    metadata:
      description: "Fetch open invoices from billing API"
      expects: "API available, returns JSON array"
      produces: "Array of {id, amount, status} objects"
```

---

## أنواع المهام

### `call`

الإرسال إلى نقطة نهاية HTTP أو خدمة Triggerfish.

| Field  | Type   | Required | الوصف                                             |
| ------ | ------ | -------- | ------------------------------------------------- |
| `call` | string | yes      | نوع الاستدعاء (انظر جدول الإرسال أدناه)           |
| `with` | object | no       | الوسيطات الممررة إلى الأداة الهدف                  |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

تنفيذ أمر صدفة أو نص برمجي مضمّن أو سير عمل فرعي. يجب أن يحتوي حقل `run` على واحد بالضبط من `shell` أو `script` أو `workflow`.

**الصدفة:**

| Field                  | Type   | Required | الوصف                    |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.shell.command`    | string | yes      | أمر الصدفة للتنفيذ      |
| `run.shell.arguments`  | object | no       | وسيطات مسماة             |
| `run.shell.environment`| object | no       | متغيرات البيئة           |

**النص البرمجي:**

| Field                  | Type   | Required | الوصف                    |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | لغة النص البرمجي        |
| `run.script.code`      | string | yes      | كود النص البرمجي المضمّن |
| `run.script.arguments` | object | no       | وسيطات مسماة             |

**سير العمل الفرعي:**

| Field                | Type   | Required | الوصف                        |
| -------------------- | ------ | -------- | ---------------------------- |
| `run.workflow.name`  | string | yes      | اسم سير العمل المحفوظ       |
| `run.workflow.version` | string | no     | قيد الإصدار                  |
| `run.workflow.input` | object | no       | بيانات إدخال سير العمل الفرعي |

### `set`

تعيين قيم في سياق البيانات.

| Field | Type   | Required | الوصف                                            |
| ----- | ------ | -------- | ------------------------------------------------ |
| `set` | object | yes      | أزواج مفتاح-قيمة للتعيين. يمكن أن تكون القيم تعبيرات. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

تفرع شرطي. حقل `switch` هو مصفوفة من إدخالات الحالات. كل حالة هي كائن بمفتاح واحد حيث المفتاح هو اسم الحالة.

| Case field | Type   | Required | الوصف                                               |
| ---------- | ------ | -------- | --------------------------------------------------- |
| `when`     | string | no       | شرط تعبيري. احذفه للحالة الافتراضية.                |
| `then`     | string | yes      | توجيه التدفق: `continue`، `end`، أو اسم مهمة        |

يتم تقييم الحالات بالترتيب. أول حالة بشرط `when` صحيح (أو بدون `when`) يتم أخذها.

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

التكرار على مجموعة.

| Field      | Type   | Required | الوصف                                        |
| ---------- | ------ | -------- | -------------------------------------------- |
| `for.each` | string | yes      | اسم المتغير للعنصر الحالي                    |
| `for.in`   | string | yes      | تعبير يشير إلى المجموعة                       |
| `for.at`   | string | no       | اسم المتغير للفهرس الحالي                    |
| `do`       | array  | yes      | قائمة مهام متداخلة تُنفذ لكل تكرار            |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Process item ${ .idx }: ${ .item.name }"
```

### `raise`

إيقاف سير العمل بخطأ منظم.

| Field                | Type   | Required | الوصف                    |
| -------------------- | ------ | -------- | ---------------------- |
| `raise.error.status` | number | yes      | رمز حالة بنمط HTTP      |
| `raise.error.type`   | string | yes      | URI/سلسلة نوع الخطأ     |
| `raise.error.title`  | string | yes      | عنوان مقروء للبشر       |
| `raise.error.detail` | string | no       | رسالة خطأ مفصلة         |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Invalid input"
        detail: "Field 'email' is required"
```

### `emit`

تسجيل حدث سير عمل. تُخزن الأحداث في نتيجة التشغيل.

| Field                | Type   | Required | الوصف                    |
| -------------------- | ------ | -------- | ---------------------- |
| `emit.event.type`    | string | yes      | معرّف نوع الحدث         |
| `emit.event.source`  | string | no       | URI مصدر الحدث           |
| `emit.event.data`    | object | no       | حمولة الحدث              |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

إيقاف التنفيذ مؤقتاً لمدة محددة.

| Field  | Type   | Required | الوصف                                  |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | مدة ISO 8601 (مثل `PT5S`)             |

المدد الشائعة: `PT1S` (ثانية واحدة)، `PT30S` (30 ثانية)، `PT1M` (دقيقة واحدة)، `PT5M` (5 دقائق).

---

## جدول إرسال الاستدعاءات

يربط قيمة حقل `call` بأداة Triggerfish التي يتم استدعاؤها فعلياً.

| قيمة `call`            | الأداة المستدعاة | حقول `with:` المطلوبة                              |
| ---------------------- | ---------------- | ---------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` أو `url`; اختياري `method`، `headers`، `body` |
| `triggerfish:llm`      | `llm_task`       | `prompt` أو `task`; اختياري `tools`، `max_iterations`    |
| `triggerfish:agent`    | `subagent`       | `prompt` أو `task`; اختياري `tools`، `agent`             |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + حقول العملية |
| `triggerfish:web_search` | `web_search`   | `query`; اختياري `max_results`                  |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`; اختياري `method`، `headers`، `body`      |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`، `tool`; اختياري `arguments`    |
| `triggerfish:message`  | `send_message`   | `channel`، `text`; اختياري `recipient`          |

أنواع استدعاءات CNCF غير المدعومة (`grpc`، `openapi`، `asyncapi`) تُرجع خطأ.

---

## صيغة التعبيرات

التعبيرات محددة بـ `${ }` وتُحل مقابل سياق بيانات سير العمل.

### حل المسار النقطي

| الصيغة                  | الوصف                               | نتيجة المثال          |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | سياق البيانات بالكامل               | `{...}`              |
| `${ .key }`             | مفتاح المستوى الأعلى                | `"value"`            |
| `${ .a.b.c }`           | مفتاح متداخل                        | `"deep value"`       |
| `${ .items[0] }`        | فهرس المصفوفة                       | `{...العنصر الأول...}` |
| `${ .items[0].name }`   | فهرس المصفوفة ثم المفتاح            | `"first"`            |

النقطة البادئة (أو `$.`) تثبت المسار في جذر السياق. المسارات التي تحل إلى `undefined` تنتج سلسلة فارغة عند الإقحام، أو `undefined` عند استخدامها كقيمة مستقلة.

### المعاملات

| النوع      | المعاملات                    | مثال                           |
| ---------- | ---------------------------- | ------------------------------ |
| المقارنة   | `==`، `!=`، `>`، `<`، `>=`، `<=` | `${ .count > 0 }`         |
| الحسابية   | `+`، `-`، `*`، `/`، `%`      | `${ .price * .quantity }`      |

تعبيرات المقارنة تُرجع `true` أو `false`. التعبيرات الحسابية تُرجع رقماً (`undefined` إذا لم يكن أي من المعاملين رقمياً أو في حالة القسمة على صفر).

### القيم الحرفية

| النوع   | أمثلة                    |
| ------- | ------------------------ |
| سلسلة   | `"hello"`، `'hello'`     |
| رقم     | `42`، `3.14`، `-1`       |
| منطقي   | `true`، `false`          |
| Null    | `null`                   |

### أوضاع الإقحام

**تعبير واحد (قيمة خام):** عندما تكون السلسلة بأكملها تعبير `${ }` واحد، يتم إرجاع القيمة المكتوبة الخام (رقم، منطقي، كائن، مصفوفة).

```yaml
count: "${ .items.length }"  # returns a number, not a string
```

**مختلط / تعبيرات متعددة (سلسلة):** عندما تُمزج تعبيرات `${ }` مع نص أو توجد تعبيرات متعددة، تكون النتيجة دائماً سلسلة.

```yaml
message: "Found ${ .count } items in ${ .category }"  # returns a string
```

### الصدقية

لشروط `if:` وتعبيرات `when:` في `switch`، يتم تقييم القيم باستخدام صدقية نمط JavaScript:

| القيمة                                | صادق؟ |
| ------------------------------------- | ----- |
| `true`                                | نعم   |
| رقم غير صفري                          | نعم   |
| سلسلة غير فارغة                       | نعم   |
| مصفوفة غير فارغة                      | نعم   |
| كائن                                  | نعم   |
| `false`، `0`، `""`، `null`، `undefined`، مصفوفة فارغة | لا    |

---

## تحويلات الإدخال/الإخراج

تعيد التحويلات تشكيل البيانات المتدفقة إلى ومن المهام.

### `input`

يُطبق قبل تنفيذ المهمة. يستبدل رؤية المهمة لسياق البيانات.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task sees only the config object
    with:
      endpoint: "${ .api_url }"  # resolved against the config object
```

**`from` كسلسلة:** تعبير يستبدل سياق الإدخال بالكامل.

**`from` ككائن:** يربط مفاتيح جديدة بتعبيرات:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

يُطبق بعد تنفيذ المهمة. يعيد تشكيل النتيجة قبل تخزينها في السياق تحت اسم المهمة.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## توجيهات التدفق

يتحكم حقل `then` في أي مهمة في تدفق التنفيذ بعد اكتمال المهمة.

| القيمة       | السلوك                                              |
| ------------ | --------------------------------------------------- |
| `continue`   | المتابعة إلى المهمة التالية في التسلسل (الافتراضي)  |
| `end`        | إيقاف سير العمل. الحالة: `completed`.              |
| `<اسم المهمة>`| الانتقال إلى المهمة المسماة. يجب أن تكون في نفس كتلة `do`. |

تستخدم حالات switch أيضاً توجيهات التدفق في حقل `then` الخاص بها.

---

## سقف التصنيف

حقل اختياري يقيد أقصى taint للجلسة أثناء التنفيذ.

```yaml
classification_ceiling: INTERNAL
```

| القيمة         | المعنى                                               |
| -------------- | ---------------------------------------------------- |
| `PUBLIC`       | يتوقف سير العمل إذا تم الوصول إلى أي بيانات مصنفة   |
| `INTERNAL`     | يسمح ببيانات `PUBLIC` و `INTERNAL`                   |
| `CONFIDENTIAL` | يسمح بالبيانات حتى `CONFIDENTIAL`                   |
| `RESTRICTED`   | يسمح بجميع مستويات التصنيف                           |
| *(محذوف)*      | لا يتم تطبيق أي سقف                                 |

يتم فحص السقف قبل كل مهمة. إذا تجاوز taint الجلسة السقف (مثلاً لأن مهمة سابقة وصلت إلى بيانات مصنفة)، يتوقف سير العمل بحالة `failed` وخطأ `Workflow classification ceiling breached`.

---

## التخزين

### تعريفات سير العمل

تُخزن بسابقة المفتاح `workflows:{name}`. يحتوي كل سجل مخزن على:

| Field            | Type   | الوصف                                    |
| ---------------- | ------ | ---------------------------------------- |
| `name`           | string | اسم سير العمل                            |
| `yaml`           | string | تعريف YAML الخام                         |
| `classification` | string | مستوى التصنيف وقت الحفظ                  |
| `savedAt`        | string | طابع زمني ISO 8601                       |
| `description`    | string | وصف اختياري                              |

### سجل التشغيل

يُخزن بسابقة المفتاح `workflow-runs:{runId}`. يحتوي كل سجل تشغيل على:

| Field            | Type   | الوصف                                    |
| ---------------- | ------ | ---------------------------------------- |
| `runId`          | string | UUID لهذا التنفيذ                        |
| `workflowName`   | string | اسم سير العمل الذي تم تنفيذه            |
| `status`         | string | `completed` أو `failed` أو `cancelled`   |
| `output`         | object | سياق البيانات النهائي (المفاتيح الداخلية مفلترة) |
| `events`         | array  | الأحداث المنبعثة أثناء التنفيذ            |
| `error`          | string | رسالة الخطأ (إذا كانت الحالة `failed`)   |
| `startedAt`      | string | طابع زمني ISO 8601                       |
| `completedAt`    | string | طابع زمني ISO 8601                       |
| `taskCount`      | number | عدد المهام في سير العمل                  |
| `classification` | string | taint الجلسة عند الاكتمال                |

---

## الحدود

| الحد                     | القيمة | الوصف                                    |
| ------------------------ | ----- | ---------------------------------------- |
| أقصى عمق سير عمل فرعي   | 5     | أقصى تداخل لاستدعاءات `run.workflow`     |
| حد سجل التشغيل الافتراضي | 10   | `limit` الافتراضي لـ `workflow_history`   |

---

## حالات التنفيذ

| الحالة      | الوصف                                                |
| ----------- | ---------------------------------------------------- |
| `pending`   | تم إنشاء سير العمل لكن لم يبدأ                      |
| `running`   | سير العمل قيد التنفيذ حالياً                         |
| `completed` | اكتملت جميع المهام بنجاح (أو `then: end`)            |
| `failed`    | فشلت مهمة، أو تم الوصول إلى `raise`، أو انتهاك السقف |
| `cancelled` | تم إلغاء التنفيذ خارجياً                             |
