---
title: مرجع DSL گردش کار
description: مرجع کامل CNCF Serverless Workflow DSL 1.0 همان‌طور که در Triggerfish پیاده‌سازی شده است.
---

# مرجع DSL گردش کار

مرجع کامل CNCF Serverless Workflow DSL 1.0 همان‌طور که در موتور گردش کار
Triggerfish پیاده‌سازی شده است. برای راهنمای استفاده و مثال‌ها،
[گردش کار](/fa-IR/features/workflows) را ببینید.

## ساختار سند

هر YAML گردش کار باید دارای فیلد `document` در سطح بالا و بلوک `do` باشد.

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

### فراداده سند

| Field         | Type   | Required | Description                                    |
| ------------- | ------ | -------- | ---------------------------------------------- |
| `dsl`         | string | yes      | نسخه DSL. باید `"1.0"` باشد                    |
| `namespace`   | string | yes      | گروه‌بندی منطقی (مثلاً `ops`، `reports`)       |
| `name`        | string | yes      | نام یکتای گردش کار در namespace                |
| `version`     | string | no       | رشته نسخه معنایی                               |
| `description` | string | no       | توصیف قابل خواندن برای انسان                   |

### فیلدهای سطح بالا

| Field                     | Type         | Required | Description                                        |
| ------------------------- | ------------ | -------- | -------------------------------------------------- |
| `document`                | object       | yes      | فراداده سند (بالا را ببینید)                        |
| `do`                      | array        | yes      | لیست مرتب ورودی‌های وظیفه                          |
| `classification_ceiling`  | string       | no       | حداکثر taint نشست مجاز در طول اجرا                 |
| `input`                   | transform    | no       | تبدیل اعمال‌شده روی ورودی گردش کار                 |
| `output`                  | transform    | no       | تبدیل اعمال‌شده روی خروجی گردش کار                 |
| `timeout`                 | object       | no       | timeout سطح گردش کار (`after: <ISO 8601>`)         |
| `metadata`                | object       | no       | فراداده دلخواه کلید-مقدار                          |

---

## قالب ورودی وظیفه

هر ورودی در بلوک `do` یک شیء تک‌کلیدی است. کلید نام وظیفه و مقدار تعریف
وظیفه است.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

نام وظایف باید در همان بلوک `do` یکتا باشند. نتیجه وظیفه در زمینه داده زیر
نام وظیفه ذخیره می‌شود.

---

## فیلدهای مشترک وظیفه

همه انواع وظیفه این فیلدهای اختیاری مشترک را دارند:

| Field      | Type      | Description                                                  |
| ---------- | --------- | ------------------------------------------------------------ |
| `if`       | string    | شرط عبارت. وظیفه وقتی falsy باشد نادیده گرفته می‌شود.       |
| `input`    | transform | تبدیل اعمال‌شده قبل از اجرای وظیفه                          |
| `output`   | transform | تبدیل اعمال‌شده بعد از اجرای وظیفه                          |
| `timeout`  | object    | timeout وظیفه: `after: <ISO 8601 duration>`                  |
| `then`     | string    | دستورالعمل جریان: `continue`، `end` یا نام وظیفه            |
| `metadata` | object    | فراداده دلخواه کلید-مقدار. وقتی خوددرمانی فعال باشد، نیاز به `description`، `expects`، `produces` دارد. |

---

## پیکربندی خوددرمانی

بلوک `metadata.triggerfish.self_healing` یک عامل درمان‌گر مستقل برای گردش کار
فعال می‌کند. برای راهنمای کامل
[خوددرمانی](/fa-IR/features/workflows#خوددرمانی) را ببینید.

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

| Field                   | Type    | Required | Default              | Description |
| ----------------------- | ------- | -------- | -------------------- | ----------- |
| `enabled`               | boolean | yes      | —                    | فعال‌سازی عامل درمان‌گر |
| `retry_budget`          | number  | no       | `3`                  | حداکثر تلاش‌های مداخله |
| `approval_required`     | boolean | no       | `true`               | نیاز به تأیید انسانی برای اصلاحات |
| `pause_on_intervention` | string  | no       | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | no       | `300`                | ثانیه‌ها قبل از فعال شدن سیاست timeout |
| `pause_timeout_policy`  | string  | no       | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | no       | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### فراداده مرحله (الزامی وقتی خوددرمانی فعال باشد)

وقتی `self_healing.enabled` روی `true` باشد، هر وظیفه باید شامل این فیلدهای
فراداده باشد. تجزیه‌کننده گردش کارهایی را که هر کدام را نداشته باشند رد
می‌کند.

| Field         | Type   | Description                                  |
| ------------- | ------ | -------------------------------------------- |
| `description` | string | مرحله چه کاری انجام می‌دهد و چرا             |
| `expects`     | string | شکل ورودی یا پیش‌شرط‌های مورد نیاز           |
| `produces`    | string | شکل خروجی تولیدشده                           |

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

## انواع وظیفه

### `call`

ارسال به HTTP endpoint یا سرویس Triggerfish.

| Field  | Type   | Required | Description                                         |
| ------ | ------ | -------- | --------------------------------------------------- |
| `call` | string | yes      | نوع فراخوانی (جدول dispatch زیر را ببینید)           |
| `with` | object | no       | آرگومان‌های ارسالی به ابزار هدف                      |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

اجرای دستور shell، اسکریپت درون‌خطی یا زیرگردش کار. فیلد `run` باید دقیقاً
یکی از `shell`، `script` یا `workflow` را داشته باشد.

**Shell:**

| Field                  | Type   | Required | Description                    |
| ---------------------- | ------ | -------- | ------------------------------ |
| `run.shell.command`    | string | yes      | دستور shell برای اجرا          |
| `run.shell.arguments`  | object | no       | آرگومان‌های نام‌دار             |
| `run.shell.environment`| object | no       | متغیرهای محیطی                 |

**Script:**

| Field                  | Type   | Required | Description              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | زبان اسکریپت             |
| `run.script.code`      | string | yes      | کد اسکریپت درون‌خطی      |
| `run.script.arguments` | object | no       | آرگومان‌های نام‌دار       |

**زیرگردش کار:**

| Field                | Type   | Required | Description                       |
| -------------------- | ------ | -------- | --------------------------------- |
| `run.workflow.name`  | string | yes      | نام گردش کار ذخیره‌شده            |
| `run.workflow.version` | string | no     | محدودیت نسخه                      |
| `run.workflow.input` | object | no       | داده ورودی برای زیرگردش کار       |

### `set`

تخصیص مقادیر به زمینه داده.

| Field | Type   | Required | Description                                            |
| ----- | ------ | -------- | ------------------------------------------------------ |
| `set` | object | yes      | جفت‌های کلید-مقدار برای تخصیص. مقادیر می‌توانند عبارت باشند. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

انشعاب شرطی. فیلد `switch` آرایه‌ای از ورودی‌های مورد است. هر مورد یک شیء
تک‌کلیدی است که کلید آن نام مورد است.

| Case field | Type   | Required | Description                                              |
| ---------- | ------ | -------- | -------------------------------------------------------- |
| `when`     | string | no       | شرط عبارت. برای مورد پیش‌فرض حذف کنید.                   |
| `then`     | string | yes      | دستورالعمل جریان: `continue`، `end` یا نام وظیفه        |

موردها به ترتیب ارزیابی می‌شوند. اولین مورد با `when` صحیح (یا بدون `when`)
انتخاب می‌شود.

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

تکرار روی مجموعه.

| Field      | Type   | Required | Description                                  |
| ---------- | ------ | -------- | -------------------------------------------- |
| `for.each` | string | yes      | نام متغیر برای آیتم فعلی                     |
| `for.in`   | string | yes      | عبارت ارجاع‌دهنده به مجموعه                  |
| `for.at`   | string | no       | نام متغیر برای اندیس فعلی                    |
| `do`       | array  | yes      | لیست وظایف تودرتو اجراشده در هر تکرار        |

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

توقف گردش کار با خطای ساختاریافته.

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `raise.error.status` | number | yes      | کد وضعیت سبک HTTP     |
| `raise.error.type`   | string | yes      | URI/رشته نوع خطا      |
| `raise.error.title`  | string | yes      | عنوان قابل خواندن      |
| `raise.error.detail` | string | no       | پیام خطای مفصل         |

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

ثبت رویداد گردش کار. رویدادها در نتیجه اجرا ذخیره می‌شوند.

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `emit.event.type`    | string | yes      | شناسه نوع رویداد       |
| `emit.event.source`  | string | no       | URI منبع رویداد        |
| `emit.event.data`    | object | no       | بار رویداد             |

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

توقف اجرا برای مدت زمانی.

| Field  | Type   | Required | Description                        |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | مدت زمان ISO 8601 (مثلاً `PT5S`)   |

مدت‌زمان‌های رایج: `PT1S` (۱ ثانیه)، `PT30S` (۳۰ ثانیه)، `PT1M` (۱ دقیقه)،
`PT5M` (۵ دقیقه).

---

## جدول Call Dispatch

مقدار فیلد `call` را به ابزار Triggerfish که واقعاً فراخوانی می‌شود نگاشت
می‌کند.

| مقدار `call`           | ابزار فراخوانی‌شده | فیلدهای `with:` مورد نیاز                      |
| ---------------------- | ---------------- | ---------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` یا `url`؛ اختیاری `method`، `headers`، `body` |
| `triggerfish:llm`      | `llm_task`       | `prompt` یا `task`؛ اختیاری `tools`، `max_iterations`    |
| `triggerfish:agent`    | `subagent`       | `prompt` یا `task`؛ اختیاری `tools`، `agent`             |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + فیلدهای عملیات |
| `triggerfish:web_search` | `web_search`   | `query`؛ اختیاری `max_results`                 |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`؛ اختیاری `method`، `headers`، `body`     |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`، `tool`؛ اختیاری `arguments` |
| `triggerfish:message`  | `send_message`   | `channel`، `text`؛ اختیاری `recipient`         |

انواع فراخوانی CNCF پشتیبانی‌نشده (`grpc`، `openapi`، `asyncapi`) خطا
برمی‌گردانند.

---

## نحو عبارات

عبارات با `${ }` محصور شده و در برابر زمینه داده گردش کار تفکیک می‌شوند.

### تفکیک Dot-Path

| نحو                    | Description                         | نتیجه نمونه            |
| ----------------------- | ----------------------------------- | ---------------------- |
| `${ . }`                | کل زمینه داده                       | `{...}`                |
| `${ .key }`             | کلید سطح بالا                       | `"value"`              |
| `${ .a.b.c }`           | کلید تودرتو                         | `"deep value"`         |
| `${ .items[0] }`        | اندیس آرایه                         | `{...آیتم اول...}`     |
| `${ .items[0].name }`   | اندیس آرایه سپس کلید               | `"first"`              |

نقطه ابتدایی (یا `$.`) مسیر را در ریشه زمینه لنگر می‌اندازد. مسیرهایی که به
`undefined` تفکیک می‌شوند هنگام درج رشته خالی تولید می‌کنند، یا `undefined`
هنگام استفاده به عنوان مقدار مستقل.

### عملگرها

| نوع        | عملگرها                       | مثال                           |
| ---------- | ----------------------------- | ------------------------------ |
| مقایسه     | `==`، `!=`، `>`، `<`، `>=`، `<=` | `${ .count > 0 }`          |
| حسابی      | `+`، `-`، `*`، `/`، `%`      | `${ .price * .quantity }`      |

عبارات مقایسه `true` یا `false` برمی‌گردانند. عبارات حسابی number
برمی‌گردانند (`undefined` اگر هر عملوند عددی نباشد یا تقسیم بر صفر).

### مقادیر ثابت

| نوع     | مثال‌ها                  |
| ------- | ------------------------ |
| String  | `"hello"`، `'hello'`     |
| Number  | `42`، `3.14`، `-1`       |
| Boolean | `true`، `false`          |
| Null    | `null`                   |

### حالت‌های درج

**عبارت تکی (مقدار خام):** وقتی کل رشته یک عبارت `${ }` باشد، مقدار خام
نوع‌دار برگردانده می‌شود (number، boolean، object، array).

```yaml
count: "${ .items.length }"  # number برمی‌گرداند، نه string
```

**ترکیبی / عبارات متعدد (string):** وقتی عبارات `${ }` با متن ترکیب شوند یا
عبارات متعدد باشند، نتیجه همیشه string است.

```yaml
message: "Found ${ .count } items in ${ .category }"  # string برمی‌گرداند
```

### صحت (Truthiness)

برای شرایط `if:` و عبارات `when:` در `switch`، مقادیر با استفاده از صحت
سبک JavaScript ارزیابی می‌شوند:

| مقدار                         | صحیح؟ |
| ----------------------------- | ----- |
| `true`                        | بله   |
| عدد غیرصفر                    | بله   |
| رشته غیرخالی                  | بله   |
| آرایه غیرخالی                 | بله   |
| Object                        | بله   |
| `false`، `0`، `""`، `null`، `undefined`، آرایه خالی | خیر |

---

## تبدیل‌های ورودی/خروجی

تبدیل‌ها داده‌های جاری به داخل و خارج وظایف را بازشکل‌دهی می‌کنند.

### `input`

قبل از اجرای وظیفه اعمال می‌شود. دید وظیفه از زمینه داده را جایگزین می‌کند.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # وظیفه فقط شیء config را می‌بیند
    with:
      endpoint: "${ .api_url }"  # در برابر شیء config تفکیک می‌شود
```

**`from` به عنوان رشته:** عبارتی که کل زمینه ورودی را جایگزین می‌کند.

**`from` به عنوان شیء:** کلیدهای جدید را به عبارات نگاشت می‌کند:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

بعد از اجرای وظیفه اعمال می‌شود. نتیجه را قبل از ذخیره در زمینه زیر نام
وظیفه بازشکل‌دهی می‌کند.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## دستورالعمل‌های جریان

فیلد `then` روی هر وظیفه جریان اجرا را پس از تکمیل وظیفه کنترل می‌کند.

| مقدار        | رفتار                                                       |
| ------------ | ----------------------------------------------------------- |
| `continue`   | ادامه به وظیفه بعدی در توالی (پیش‌فرض)                      |
| `end`        | توقف گردش کار. وضعیت: `completed`.                          |
| `<نام وظیفه>`| پرش به وظیفه نام‌دار. وظیفه باید در همان بلوک `do` وجود داشته باشد. |

موردهای switch نیز از دستورالعمل‌های جریان در فیلد `then` خود استفاده
می‌کنند.

---

## سقف طبقه‌بندی

فیلد اختیاری که حداکثر taint نشست را در طول اجرا محدود می‌کند.

```yaml
classification_ceiling: INTERNAL
```

| مقدار          | معنی                                                      |
| -------------- | --------------------------------------------------------- |
| `PUBLIC`       | گردش کار متوقف می‌شود اگر به داده‌های طبقه‌بندی‌شده دسترسی یابد |
| `INTERNAL`     | داده‌های `PUBLIC` و `INTERNAL` مجاز                       |
| `CONFIDENTIAL` | تا داده‌های `CONFIDENTIAL` مجاز                           |
| `RESTRICTED`   | همه سطوح طبقه‌بندی مجاز                                  |
| *(حذف‌شده)*    | سقفی اعمال نمی‌شود                                       |

سقف قبل از هر وظیفه بررسی می‌شود. اگر taint نشست از سقف فراتر رفته باشد
(مثلاً چون وظیفه قبلی به داده‌های طبقه‌بندی‌شده دسترسی پیدا کرد)، گردش کار
با وضعیت `failed` و خطای `Workflow classification ceiling breached` متوقف
می‌شود.

---

## ذخیره‌سازی

### تعاریف گردش کار

با پیشوند کلید `workflows:{name}` ذخیره می‌شوند. هر رکورد ذخیره‌شده شامل:

| Field            | Type   | Description                                |
| ---------------- | ------ | ------------------------------------------ |
| `name`           | string | نام گردش کار                                |
| `yaml`           | string | تعریف YAML خام                              |
| `classification` | string | سطح طبقه‌بندی در زمان ذخیره                  |
| `savedAt`        | string | مُهر زمان ISO 8601                           |
| `description`    | string | توصیف اختیاری                               |

### تاریخچه اجرا

با پیشوند کلید `workflow-runs:{runId}` ذخیره می‌شود. هر رکورد اجرا شامل:

| Field            | Type   | Description                                |
| ---------------- | ------ | ------------------------------------------ |
| `runId`          | string | UUID برای این اجرا                          |
| `workflowName`   | string | نام گردش کاری که اجرا شد                    |
| `status`         | string | `completed`، `failed` یا `cancelled`       |
| `output`         | object | زمینه داده نهایی (کلیدهای داخلی فیلتر شده) |
| `events`         | array  | رویدادهای منتشرشده در طول اجرا              |
| `error`          | string | پیام خطا (اگر وضعیت `failed` باشد)        |
| `startedAt`      | string | مُهر زمان ISO 8601                          |
| `completedAt`    | string | مُهر زمان ISO 8601                          |
| `taskCount`      | number | تعداد وظایف در گردش کار                     |
| `classification` | string | taint نشست در تکمیل                         |

---

## محدودیت‌ها

| محدودیت                    | مقدار | Description                                   |
| ------------------------- | ----- | --------------------------------------------- |
| حداکثر عمق زیرگردش کار    | ۵     | حداکثر تودرتویی فراخوانی‌های `run.workflow`    |
| محدودیت پیش‌فرض تاریخچه   | ۱۰    | `limit` پیش‌فرض برای `workflow_history`        |

---

## وضعیت‌های اجرا

| Status      | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `pending`   | گردش کار ایجاد شده اما شروع نشده                              |
| `running`   | گردش کار در حال اجرا است                                      |
| `completed` | همه وظایف با موفقیت تمام شدند (یا `then: end`)                |
| `failed`    | وظیفه‌ای شکست خورد، `raise` فعال شد یا سقف نقض شد            |
| `cancelled` | اجرا از خارج لغو شد                                           |
