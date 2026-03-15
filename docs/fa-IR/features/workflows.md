---
title: گردش کار
description: خودکارسازی وظایف چندمرحله‌ای با موتور CNCF Serverless Workflow DSL داخلی Triggerfish.
---

# گردش کار

Triggerfish شامل یک موتور اجرای داخلی برای
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification)
است. گردش کارها به شما اجازه می‌دهند اتوماسیون‌های قطعی و چندمرحله‌ای را در
YAML تعریف کنید که **بدون LLM در حلقه** در طول اجرا کار می‌کنند. عامل گردش
کارها را ایجاد و فعال می‌کند، اما موتور ارسال واقعی وظایف، انشعاب، حلقه‌زنی
و جریان داده را مدیریت می‌کند.

## چه زمانی از گردش کار استفاده کنیم

**از گردش کار استفاده کنید** برای توالی‌های تکرارپذیر و قطعی که مراحل آن را
از قبل می‌دانید: واکشی داده از یک API، تبدیل آن، ذخیره در حافظه، ارسال اعلان.
همان ورودی همیشه همان خروجی را تولید می‌کند.

**مستقیماً از عامل استفاده کنید** برای استدلال باز، کاوش یا وظایفی که مرحله
بعدی به قضاوت بستگی دارد: تحقیق درباره یک موضوع، نوشتن کد، عیب‌یابی یک
مشکل.

یک قاعده کلی خوب: اگر متوجه می‌شوید که بارها و بارها از عامل می‌خواهید
همان توالی چندمرحله‌ای را انجام دهد، آن را به یک گردش کار تبدیل کنید.

::: info دسترسی
گردش کارها در همه طرح‌ها در دسترس هستند. کاربران متن‌باز که از کلیدهای API
خود استفاده می‌کنند دسترسی کامل به موتور گردش کار دارند -- هر فراخوانی
`triggerfish:llm` یا `triggerfish:agent` در یک گردش کار از ارائه‌دهنده
پیکربندی‌شده شما inference مصرف می‌کند.
:::

## ابزارها

### `workflow_save`

تجزیه، اعتبارسنجی و ذخیره تعریف گردش کار. گردش کار در سطح طبقه‌بندی نشست
فعلی ذخیره می‌شود.

| Parameter     | Type   | Required | Description                          |
| ------------- | ------ | -------- | ------------------------------------ |
| `name`        | string | yes      | نام گردش کار                         |
| `yaml`        | string | yes      | تعریف گردش کار YAML                  |
| `description` | string | no       | گردش کار چه کاری انجام می‌دهد        |

### `workflow_run`

اجرای یک گردش کار با نام یا از YAML درون‌خطی. خروجی اجرا و وضعیت را
برمی‌گرداند.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `name`    | string | no       | نام گردش کار ذخیره‌شده برای اجرا                       |
| `yaml`    | string | no       | تعریف YAML درون‌خطی (وقتی از ذخیره‌شده استفاده نمی‌شود) |
| `input`   | string | no       | رشته JSON داده‌های ورودی برای گردش کار                  |

یکی از `name` یا `yaml` مورد نیاز است.

### `workflow_list`

فهرست همه گردش کارهای ذخیره‌شده قابل دسترسی در سطح طبقه‌بندی فعلی. بدون
پارامتر.

### `workflow_get`

بازیابی تعریف گردش کار ذخیره‌شده با نام.

| Parameter | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| `name`    | string | yes      | نام گردش کار برای بازیابی            |

### `workflow_delete`

حذف یک گردش کار ذخیره‌شده با نام. گردش کار باید در سطح طبقه‌بندی نشست
فعلی قابل دسترسی باشد.

| Parameter | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| `name`    | string | yes      | نام گردش کار برای حذف                |

### `workflow_history`

مشاهده نتایج اجرای گذشته گردش کار، با فیلتر اختیاری بر اساس نام.

| Parameter       | Type   | Required | Description                                  |
| --------------- | ------ | -------- | -------------------------------------------- |
| `workflow_name` | string | no       | فیلتر نتایج بر اساس نام گردش کار            |
| `limit`         | string | no       | حداکثر تعداد نتایج (پیش‌فرض ۱۰)             |

## انواع وظایف

گردش کارها از وظایفی در بلوک `do:` تشکیل شده‌اند. هر وظیفه یک ورودی دارای
نام با بدنه مختص نوع است. Triggerfish از ۸ نوع وظیفه پشتیبانی می‌کند.

### `call` — فراخوانی‌های خارجی

ارسال به HTTP endpoint یا سرویس Triggerfish.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

فیلد `call` هدف ارسال را تعیین می‌کند. برای نگاشت کامل
[Call Dispatch](#call-dispatch) را ببینید.

### `run` — Shell، اسکریپت یا زیرگردش کار

اجرای دستور shell، اسکریپت درون‌خطی یا گردش کار ذخیره‌شده دیگر.

**دستور shell:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**زیرگردش کار:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
اجرای shell و اسکریپت نیاز به فعال بودن پرچم `allowShellExecution` در
زمینه ابزار گردش کار دارد. وقتی غیرفعال باشد، وظایف run با اهداف `shell` یا
`script` با شکست مواجه می‌شوند.
:::

### `set` — تغییرات زمینه داده

تخصیص مقادیر به زمینه داده گردش کار. از عبارات پشتیبانی می‌کند.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — انشعاب شرطی

انشعاب بر اساس شرایط. هر مورد یک عبارت `when` و یک دستورالعمل جریان `then`
دارد. موردی بدون `when` به عنوان پیش‌فرض عمل می‌کند.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — تکرار

حلقه‌زنی روی یک مجموعه، اجرای بلوک تودرتوی `do:` برای هر آیتم.

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

فیلد `each` متغیر حلقه را نام‌گذاری می‌کند، `in` به مجموعه ارجاع می‌دهد و
فیلد اختیاری `at` اندیس فعلی را فراهم می‌کند.

### `raise` — توقف با خطا

توقف اجرا با خطای ساختاریافته.

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

### `emit` — ثبت رویدادها

ثبت یک رویداد گردش کار. رویدادها در نتیجه اجرا ثبت شده و از طریق
`workflow_history` قابل بررسی هستند.

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

### `wait` — توقف موقت

توقف اجرا برای مدت زمان ISO 8601.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Call Dispatch

فیلد `call` در یک وظیفه call تعیین می‌کند کدام ابزار Triggerfish فراخوانی
شود.

| Call type              | Triggerfish tool | فیلدهای `with:` مورد نیاز               |
| ---------------------- | ---------------- | -------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` (یا `url`)، `method`        |
| `triggerfish:llm`      | `llm_task`       | `prompt` (یا `task`)                   |
| `triggerfish:agent`    | `subagent`       | `prompt` (یا `task`)                   |
| `triggerfish:memory`   | `memory_*`       | `operation` + فیلدهای مختص عملیات      |
| `triggerfish:web_search` | `web_search`   | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`، `tool`، `arguments`   |
| `triggerfish:message`  | `send_message`   | `channel`، `text`                      |

**عملیات حافظه:** نوع فراخوانی `triggerfish:memory` نیاز به فیلد `operation`
دارد که به یکی از `save`، `search`، `get`، `list` یا `delete` تنظیم شده باشد.
فیلدهای باقی‌مانده `with:` مستقیماً به ابزار حافظه مربوطه ارسال می‌شوند.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**فراخوانی‌های MCP:** نوع فراخوانی `triggerfish:mcp` به هر ابزار سرور MCP
متصل مسیریابی می‌کند. نام `server`، نام `tool` و شیء `arguments` را مشخص
کنید.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## عبارات

عبارات گردش کار از نحو `${ }` با تفکیک dot-path در برابر زمینه داده گردش کار
استفاده می‌کنند.

```yaml
# Simple value reference
url: "${ .config.api_url }"

# Array indexing
first_item: "${ .results[0].name }"

# String interpolation (عبارات متعدد در یک رشته)
message: "Found ${ .count } issues in ${ .repo }"

# Comparison (boolean برمی‌گرداند)
if: "${ .status == 'open' }"

# Arithmetic
total: "${ .price * .quantity }"
```

**عملگرهای پشتیبانی‌شده:**

- مقایسه: `==`، `!=`، `>`، `<`، `>=`، `<=`
- حسابی: `+`، `-`، `*`، `/`، `%`

**مقادیر ثابت:** String (`"value"` یا `'value'`)، number (`42`، `3.14`)،
boolean (`true`، `false`)، null (`null`).

وقتی یک عبارت `${ }` تمام مقدار باشد، نوع خام حفظ می‌شود (number، boolean،
object). وقتی با متن ترکیب شود، نتیجه همیشه string است.

## مثال کامل

این گردش کار یک issue از GitHub واکشی می‌کند، آن را با LLM خلاصه می‌کند،
خلاصه را در حافظه ذخیره می‌کند و اعلان ارسال می‌کند.

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

**اجرا کنید:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## تبدیل‌های ورودی و خروجی

وظایف می‌توانند ورودی خود را قبل از اجرا و خروجی خود را قبل از ذخیره نتایج
تبدیل کنند.

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

- **`input.from`** — عبارت یا نگاشت شیء که زمینه ورودی وظیفه را قبل از اجرا
  جایگزین می‌کند.
- **`output.from`** — عبارت یا نگاشت شیء که نتیجه وظیفه را قبل از ذخیره در
  زمینه داده بازشکل‌دهی می‌کند.

## کنترل جریان

هر وظیفه می‌تواند شامل دستورالعمل `then` باشد که کنترل می‌کند چه اتفاقی
بعداً می‌افتد:

- **`continue`** (پیش‌فرض) — ادامه به وظیفه بعدی در توالی
- **`end`** — توقف فوری گردش کار (وضعیت: completed)
- **نام وظیفه** — پرش به وظیفه خاص با نام

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

## اجرای شرطی

هر وظیفه می‌تواند شامل فیلد `if` باشد. وظیفه زمانی که شرط به falsy ارزیابی
شود نادیده گرفته می‌شود.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## زیرگردش کارها

یک وظیفه `run` با هدف `workflow` گردش کار ذخیره‌شده دیگری را اجرا می‌کند.
زیرگردش کار با زمینه خود اجرا شده و خروجی خود را به والد برمی‌گرداند.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

زیرگردش کارها تا **۵ سطح عمق** می‌توانند تودرتو شوند. تجاوز از این محدودیت
خطا تولید کرده و اجرا را متوقف می‌کند.

## طبقه‌بندی و امنیت

گردش کارها در همان سیستم طبقه‌بندی مانند همه داده‌های دیگر Triggerfish شرکت
می‌کنند.

**طبقه‌بندی ذخیره‌سازی.** وقتی گردش کاری را با `workflow_save` ذخیره
می‌کنید، در سطح taint نشست فعلی ذخیره می‌شود. گردش کاری که در طول نشست
`CONFIDENTIAL` ذخیره شده فقط توسط نشست‌های `CONFIDENTIAL` یا بالاتر قابل
بارگذاری است.

**سقف طبقه‌بندی.** گردش کارها می‌توانند `classification_ceiling` را در YAML
خود اعلام کنند. قبل از اجرای هر وظیفه، موتور بررسی می‌کند که taint فعلی نشست
از سقف تجاوز نمی‌کند. اگر taint نشست در طول اجرا از سقف فراتر رود (مثلاً با
دسترسی به داده‌های طبقه‌بندی‌شده از طریق فراخوانی ابزار)، گردش کار با خطای
نقض سقف متوقف می‌شود.

```yaml
classification_ceiling: INTERNAL
```

مقادیر معتبر: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`.

**تاریخچه اجرا.** نتایج اجرا با طبقه‌بندی نشست در زمان تکمیل ذخیره
می‌شوند. `workflow_history` نتایج را با `canFlowTo` فیلتر می‌کند، بنابراین
فقط اجراهایی را می‌بینید که در سطح taint فعلی نشست شما یا پایین‌تر هستند.

::: danger امنیت
حذف گردش کار نیاز دارد که گردش کار در سطح طبقه‌بندی نشست فعلی شما قابل
دسترسی باشد. نمی‌توانید گردش کاری را که در سطح `CONFIDENTIAL` ذخیره شده از
نشست `PUBLIC` حذف کنید. ابزار `workflow_delete` ابتدا گردش کار را بارگذاری
می‌کند و در صورت شکست بررسی طبقه‌بندی "not found" برمی‌گرداند.
:::

## خوددرمانی

گردش کارها می‌توانند به صورت اختیاری یک عامل درمان‌گر مستقل داشته باشند که
اجرا را در زمان واقعی نظارت می‌کند، خرابی‌ها را تشخیص می‌دهد و اصلاحات
پیشنهاد می‌کند. وقتی خوددرمانی فعال باشد، یک عامل سرپرست در کنار اجرای
گردش کار ایجاد می‌شود. این عامل هر رویداد مرحله را مشاهده می‌کند، خرابی‌ها
را طبقه‌بندی می‌کند و تیم‌های متخصص را برای حل مشکلات هماهنگ می‌کند.

### فعال‌سازی خوددرمانی

یک بلوک `self_healing` به بخش `metadata.triggerfish` گردش کار اضافه کنید:

```yaml
document:
  dsl: "1.0"
  namespace: ops
  name: data-pipeline
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
do:
  - fetch-data:
      call: http
      with:
        endpoint: "https://api.example.com/data"
      metadata:
        description: "Fetch raw invoice data from billing API"
        expects: "API returns JSON array of invoice objects"
        produces: "Array of {id, amount, status, date} objects"
```

وقتی `enabled: true` باشد، هر مرحله **باید** شامل سه فیلد metadata باشد:

| Field         | Description                                    |
| ------------- | ---------------------------------------------- |
| `description` | مرحله چه کاری انجام می‌دهد و چرا وجود دارد   |
| `expects`     | شکل ورودی یا پیش‌شرط‌هایی که مرحله نیاز دارد  |
| `produces`    | شکل خروجی که مرحله تولید می‌کند                |

تجزیه‌کننده گردش کارهایی را که هر مرحله‌ای فاقد این فیلدها باشد رد می‌کند.

### گزینه‌های پیکربندی

| Option                    | Type    | Default              | Description |
| ------------------------- | ------- | -------------------- | ----------- |
| `enabled`                 | boolean | —                    | الزامی. عامل درمان‌گر را فعال می‌کند. |
| `retry_budget`            | number  | `3`                  | حداکثر تلاش‌های مداخله قبل از تشدید به عنوان غیرقابل حل. |
| `approval_required`       | boolean | `true`               | آیا اصلاحات پیشنهادی گردش کار نیاز به تأیید انسانی دارند. |
| `pause_on_intervention`   | string  | `"blocking_only"`    | چه زمانی وظایف پایین‌دستی متوقف شوند: `always`، `never` یا `blocking_only`. |
| `pause_timeout_seconds`   | number  | `300`                | ثانیه‌های انتظار در حین توقف قبل از فعال شدن سیاست timeout. |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| چه اتفاقی در timeout می‌افتد: `escalate_and_halt`، `escalate_and_skip` یا `escalate_and_fail`. |
| `notify_on`               | array   | `[]`                 | رویدادهایی که اعلان‌ها را فعال می‌کنند: `intervention`، `escalation`، `approval_required`. |

### نحوه عملکرد

1. **مشاهده.** عامل سرپرست درمان‌گر جریانی بلادرنگ از رویدادهای مرحله
   (شروع‌شده، تکمیل‌شده، شکست‌خورده، نادیده‌گرفته‌شده) را در حین اجرای
   گردش کار دریافت می‌کند.

2. **طبقه‌بندی.** وقتی مرحله‌ای شکست بخورد، سرپرست خرابی را در یکی از پنج
   دسته طبقه‌بندی می‌کند:

   | دسته                  | معنی                                             |
   | --------------------- | ------------------------------------------------ |
   | `transient_retry`     | مشکل موقت (خطای شبکه، محدودیت نرخ، 503)         |
   | `runtime_workaround`  | خطای ناشناخته اولین بار، ممکن است قابل حل باشد   |
   | `structural_fix`      | خرابی تکراری نیازمند تغییر تعریف گردش کار        |
   | `plugin_gap`          | مشکل احراز هویت/اعتبارنامه نیازمند یکپارچه‌سازی جدید |
   | `unresolvable`        | بودجه تلاش مجدد تمام شده یا اساساً خراب          |

3. **تیم‌های متخصص.** بر اساس دسته طبقه‌بندی، سرپرست تیمی از عوامل متخصص
   (تشخیص‌دهنده، هماهنگ‌کننده تلاش مجدد، اصلاح‌کننده تعریف، نویسنده plugin و
   غیره) را برای بررسی و حل مشکل ایجاد می‌کند.

4. **پیشنهاد نسخه.** وقتی اصلاح ساختاری لازم باشد، تیم نسخه جدیدی از
   گردش کار پیشنهاد می‌دهد. اگر `approval_required` روی true تنظیم باشد،
   پیشنهاد منتظر بررسی انسانی از طریق `workflow_version_approve` یا
   `workflow_version_reject` می‌ماند.

5. **توقف محدود.** وقتی `pause_on_intervention` فعال باشد، فقط وظایف
   پایین‌دستی متوقف می‌شوند — شاخه‌های مستقل به اجرا ادامه می‌دهند.

### ابزارهای درمان

چهار ابزار اضافی برای مدیریت وضعیت درمان در دسترس هستند:

| ابزار                      | Description                                |
| -------------------------- | ------------------------------------------ |
| `workflow_version_list`    | فهرست نسخه‌های پیشنهادی/تأییدشده/ردشده    |
| `workflow_version_approve` | تأیید نسخه پیشنهادی                        |
| `workflow_version_reject`  | رد نسخه پیشنهادی با دلیل                   |
| `workflow_healing_status`  | وضعیت فعلی درمان برای اجرای گردش کار      |

### امنیت

- عامل درمان‌گر **نمی‌تواند پیکربندی `self_healing` خود را تغییر دهد**. نسخه‌های
  پیشنهادی که بلوک پیکربندی را تغییر دهند رد می‌شوند.
- عامل سرپرست و همه اعضای تیم سطح taint گردش کار را به ارث می‌برند و
  به صورت هم‌گام تشدید می‌کنند.
- همه اقدامات عوامل از زنجیره hook سیاست استاندارد عبور می‌کنند — بدون
  دورزدن.
- نسخه‌های پیشنهادی در سطح طبقه‌بندی گردش کار ذخیره می‌شوند.
