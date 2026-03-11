---
title: سير العمل
description: أتمتة المهام متعددة الخطوات باستخدام محرك CNCF Serverless Workflow DSL المدمج في Triggerfish.
---

# سير العمل

يتضمن Triggerfish محرك تنفيذ مدمج لـ [CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
تتيح لك سير العمل تعريف عمليات أتمتة حتمية ومتعددة الخطوات بلغة YAML تعمل **بدون تدخل LLM** أثناء التنفيذ. يقوم الوكيل بإنشاء سير العمل وتشغيلها، لكن المحرك يتولى إرسال المهام الفعلية والتفرع والتكرار وتدفق البيانات.

## متى تستخدم سير العمل

**استخدم سير العمل** — للتسلسلات القابلة للتكرار والحتمية حيث تعرف الخطوات مسبقاً: جلب البيانات من API، وتحويلها، وحفظها في الذاكرة، وإرسال إشعار. نفس المدخلات تنتج دائماً نفس المخرجات.

**استخدم الوكيل مباشرة** — للاستدلال المفتوح أو الاستكشاف أو المهام التي تعتمد فيها الخطوة التالية على الحكم: البحث في موضوع ما، كتابة الكود، استكشاف الأخطاء وإصلاحها.

قاعدة جيدة: إذا وجدت نفسك تطلب من الوكيل تنفيذ نفس التسلسل متعدد الخطوات بشكل متكرر، حوّله إلى سير عمل.

::: info التوفر
سير العمل متاحة في جميع الخطط. المستخدمون مفتوحو المصدر الذين يستخدمون مفاتيح API الخاصة بهم لديهم وصول كامل إلى محرك سير العمل — كل استدعاء `triggerfish:llm` أو `triggerfish:agent` داخل سير العمل يستهلك الاستدلال من مزودك المُعدّ.
:::

## الأدوات

### `workflow_save`

يحلل ويتحقق من صحة ويخزن تعريف سير العمل. يتم حفظ سير العمل عند مستوى تصنيف الجلسة الحالية.

| Parameter     | Type   | Required | الوصف                              |
| ------------- | ------ | -------- | ---------------------------------- |
| `name`        | string | yes      | اسم سير العمل                     |
| `yaml`        | string | yes      | تعريف سير العمل بلغة YAML         |
| `description` | string | no       | ما يفعله سير العمل                |

### `workflow_run`

ينفذ سير عمل بالاسم أو من YAML مضمّن. يُرجع مخرجات التنفيذ والحالة.

| Parameter | Type   | Required | الوصف                                              |
| --------- | ------ | -------- | -------------------------------------------------- |
| `name`    | string | no       | اسم سير العمل المحفوظ للتنفيذ                     |
| `yaml`    | string | no       | تعريف YAML مضمّن (عند عدم استخدام واحد محفوظ)     |
| `input`   | string | no       | سلسلة JSON لبيانات الإدخال لسير العمل             |

أحد `name` أو `yaml` مطلوب.

### `workflow_list`

يسرد جميع سير العمل المحفوظة المتاحة عند مستوى التصنيف الحالي. لا يأخذ أي معاملات.

### `workflow_get`

يسترجع تعريف سير عمل محفوظ بالاسم.

| Parameter | Type   | Required | الوصف                             |
| --------- | ------ | -------- | --------------------------------- |
| `name`    | string | yes      | اسم سير العمل المراد استرجاعه    |

### `workflow_delete`

يحذف سير عمل محفوظ بالاسم. يجب أن يكون سير العمل متاحاً عند مستوى تصنيف الجلسة الحالية.

| Parameter | Type   | Required | الوصف                            |
| --------- | ------ | -------- | -------------------------------- |
| `name`    | string | yes      | اسم سير العمل المراد حذفه       |

### `workflow_history`

عرض نتائج تنفيذ سير العمل السابقة، مع إمكانية التصفية حسب اسم سير العمل.

| Parameter       | Type   | Required | الوصف                                  |
| --------------- | ------ | -------- | -------------------------------------- |
| `workflow_name` | string | no       | تصفية النتائج حسب اسم سير العمل       |
| `limit`         | string | no       | الحد الأقصى لعدد النتائج (الافتراضي 10) |

## أنواع المهام

تتكون سير العمل من مهام في كتلة `do:`. كل مهمة هي إدخال مسمى بجسم خاص بالنوع. يدعم Triggerfish 8 أنواع من المهام.

### `call` — الاستدعاءات الخارجية

الإرسال إلى نقاط نهاية HTTP أو خدمات Triggerfish.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

يحدد حقل `call` هدف الإرسال. راجع [إرسال الاستدعاءات](#إرسال-الاستدعاءات) للحصول على الخريطة الكاملة.

### `run` — الصدفة أو النص البرمجي أو سير عمل فرعي

تنفيذ أمر صدفة أو نص برمجي مضمّن أو سير عمل محفوظ آخر.

**أمر صدفة:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**سير عمل فرعي:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
يتطلب تنفيذ الصدفة والنصوص البرمجية تمكين علامة `allowShellExecution` في سياق أداة سير العمل. عند التعطيل، ستفشل مهام run ذات أهداف `shell` أو `script`.
:::

### `set` — تعديلات سياق البيانات

تعيين قيم في سياق بيانات سير العمل. يدعم التعبيرات.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — التفرع الشرطي

التفرع بناءً على الشروط. كل حالة لها تعبير `when` وتوجيه تدفق `then`. الحالة بدون `when` تعمل كافتراضية.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — التكرار

التكرار على مجموعة، مع تنفيذ كتلة `do:` متداخلة لكل عنصر.

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

يسمي حقل `each` متغير الحلقة، ويشير `in` إلى المجموعة، ويوفر حقل `at` الاختياري الفهرس الحالي.

### `raise` — التوقف مع خطأ

إيقاف التنفيذ مع خطأ منظم.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — تسجيل الأحداث

تسجيل حدث سير عمل. يتم التقاط الأحداث في نتيجة التشغيل ويمكن مراجعتها عبر `workflow_history`.

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — الانتظار

إيقاف التنفيذ مؤقتاً لمدة ISO 8601.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## إرسال الاستدعاءات

يحدد حقل `call` في مهمة الاستدعاء أداة Triggerfish التي يتم استدعاؤها.

| نوع الاستدعاء          | أداة Triggerfish | حقول `with:` المطلوبة                  |
| ---------------------- | ---------------- | -------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` (أو `url`)، `method`        |
| `triggerfish:llm`      | `llm_task`       | `prompt` (أو `task`)                   |
| `triggerfish:agent`    | `subagent`       | `prompt` (أو `task`)                   |
| `triggerfish:memory`   | `memory_*`       | `operation` + حقول خاصة بالعملية       |
| `triggerfish:web_search` | `web_search`   | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`، `tool`، `arguments`   |
| `triggerfish:message`  | `send_message`   | `channel`، `text`                      |

**عمليات الذاكرة:** يتطلب نوع استدعاء `triggerfish:memory` حقل `operation` مضبوطاً على `save` أو `search` أو `get` أو `list` أو `delete`. تُمرر حقول `with:` المتبقية مباشرة إلى أداة الذاكرة المقابلة.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**استدعاءات MCP:** يوجه نوع استدعاء `triggerfish:mcp` إلى أي أداة خادم MCP متصل. حدد اسم `server` واسم `tool` وكائن `arguments`.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## التعبيرات

تستخدم تعبيرات سير العمل صيغة `${ }` مع حل المسار النقطي مقابل سياق بيانات سير العمل.

```yaml
# مرجع قيمة بسيط
url: "${ .config.api_url }"

# فهرسة المصفوفة
first_item: "${ .results[0].name }"

# إقحام السلاسل (تعبيرات متعددة في سلسلة واحدة)
message: "Found ${ .count } issues in ${ .repo }"

# مقارنة (تُرجع قيمة منطقية)
if: "${ .status == 'open' }"

# حسابي
total: "${ .price * .quantity }"
```

**المعاملات المدعومة:**

- المقارنة: `==`، `!=`، `>`، `<`، `>=`، `<=`
- الحسابية: `+`، `-`، `*`، `/`، `%`

**القيم الحرفية:** سلسلة (`"value"` أو `'value'`)، رقم (`42`، `3.14`)، منطقي (`true`، `false`)، null (`null`).

عندما يكون تعبير `${ }` هو القيمة بأكملها، يتم الحفاظ على النوع الخام (رقم، منطقي، كائن). عند المزج مع نص، تكون النتيجة دائماً سلسلة.

## مثال كامل

يجلب سير العمل هذا مشكلة GitHub، ويلخصها باستخدام LLM، ويحفظ الملخص في الذاكرة، ويرسل إشعاراً.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**تشغيله:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## تحويلات الإدخال والإخراج

يمكن للمهام تحويل مدخلاتها قبل التنفيذ ومخرجاتها قبل تخزين النتائج.

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — تعبير أو تعيين كائن يستبدل سياق إدخال المهمة قبل التنفيذ.
- **`output.from`** — تعبير أو تعيين كائن يعيد تشكيل نتيجة المهمة قبل تخزينها في سياق البيانات.

## التحكم في التدفق

يمكن لكل مهمة تضمين توجيه `then` يتحكم في ما يحدث بعد ذلك:

- **`continue`** (الافتراضي) — المتابعة إلى المهمة التالية في التسلسل
- **`end`** — إيقاف سير العمل فوراً (الحالة: completed)
- **مهمة مسماة** — الانتقال إلى مهمة محددة بالاسم

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## التنفيذ الشرطي

يمكن لأي مهمة تضمين حقل `if`. يتم تخطي المهمة عندما يُقيّم الشرط بقيمة زائفة.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## سير العمل الفرعية

مهمة `run` مع هدف `workflow` تنفذ سير عمل محفوظ آخر. يعمل سير العمل الفرعي بسياقه الخاص ويعيد مخرجاته إلى الأصل.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

يمكن لسير العمل الفرعية التداخل حتى **5 مستويات** عمقاً. تجاوز هذا الحد ينتج خطأ ويوقف التنفيذ.

## التصنيف والأمان

تشارك سير العمل في نفس نظام التصنيف مثل جميع بيانات Triggerfish الأخرى.

**تصنيف التخزين.** عند حفظ سير عمل باستخدام `workflow_save`، يتم تخزينه عند مستوى taint الجلسة الحالية. سير العمل المحفوظ أثناء جلسة `CONFIDENTIAL` لا يمكن تحميله إلا من جلسات بمستوى `CONFIDENTIAL` أو أعلى.

**سقف التصنيف.** يمكن لسير العمل الإعلان عن `classification_ceiling` في YAML الخاص به. قبل تنفيذ كل مهمة، يتحقق المحرك من أن taint الجلسة الحالية لا يتجاوز السقف. إذا تصاعد taint الجلسة متجاوزاً السقف أثناء التنفيذ (مثل الوصول إلى بيانات مصنفة عبر استدعاء أداة)، يتوقف سير العمل بخطأ انتهاك السقف.

```yaml
classification_ceiling: INTERNAL
```

القيم الصالحة: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`.

**سجل التشغيل.** تُخزن نتائج التنفيذ مع تصنيف الجلسة في وقت الاكتمال. يقوم `workflow_history` بتصفية النتائج بواسطة `canFlowTo`، لذا لا ترى إلا عمليات التشغيل التي هي عند أو أقل من taint جلستك الحالية.

::: danger الأمان
يتطلب حذف سير العمل أن يكون سير العمل متاحاً عند مستوى تصنيف جلستك الحالية. لا يمكنك حذف سير عمل مخزن عند `CONFIDENTIAL` من جلسة `PUBLIC`. تقوم أداة `workflow_delete` بتحميل سير العمل أولاً وتُرجع "غير موجود" إذا فشل فحص التصنيف.
:::
