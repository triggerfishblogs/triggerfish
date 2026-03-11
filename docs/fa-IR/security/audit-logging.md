# بازرسی و انطباق

هر تصمیم سیاست در Triggerfish با زمینه کامل ثبت می‌شود. هیچ استثنایی وجود ندارد، هیچ «حالت اشکال‌زدایی» که ثبت را غیرفعال کند وجود ندارد، و هیچ راهی برای LLM برای سرکوب رکوردهای بازرسی وجود ندارد. این یک رکورد کامل و مقاوم در برابر دستکاری از هر تصمیم امنیتی که سیستم اتخاذ کرده فراهم می‌کند.

## چه چیزی ثبت می‌شود

ثبت بازرسی یک **قانون ثابت** است — همیشه فعال است و قابل غیرفعال‌سازی نیست. هر اجرای Hook اجرایی یک رکورد بازرسی شامل موارد زیر تولید می‌کند:

| فیلد | توضیحات |
|------|---------|
| `timestamp` | زمان اتخاذ تصمیم (ISO 8601، UTC) |
| `hook_type` | کدام Hook اجرایی اجرا شد (`PRE_CONTEXT_INJECTION`، `PRE_TOOL_CALL`، `POST_TOOL_RESPONSE`، `PRE_OUTPUT`، `SECRET_ACCESS`، `SESSION_RESET`، `AGENT_INVOCATION`، `MCP_TOOL_CALL`) |
| `session_id` | نشستی که اقدام در آن رخ داد |
| `decision` | `ALLOW`، `BLOCK` یا `REDACT` |
| `reason` | توضیح قابل‌فهم تصمیم |
| `input` | داده یا اقدامی که Hook را فعال کرد |
| `rules_evaluated` | کدام قوانین سیاست برای رسیدن به تصمیم بررسی شدند |
| `taint_before` | سطح Taint نشست قبل از اقدام |
| `taint_after` | سطح Taint نشست بعد از اقدام (در صورت تغییر) |
| `metadata` | زمینه اضافی مختص نوع Hook |

## نمونه‌های رکورد بازرسی

### خروجی مجاز

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Classification check passed",
  "input": {
    "target_channel": "telegram",
    "recipient": "owner"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification"
  ],
  "taint_before": "INTERNAL",
  "taint_after": "INTERNAL"
}
```

### نوشتن به پایین مسدودشده

```json
{
  "timestamp": "2025-01-29T10:24:12Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Session taint (CONFIDENTIAL) exceeds effective classification (PUBLIC)",
  "input": {
    "target_channel": "whatsapp",
    "recipient": "external_user_789",
    "effective_classification": "PUBLIC"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification",
    "recipient_classification"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

### فراخوانی ابزار با افزایش Taint

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "POST_TOOL_RESPONSE",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Tool response classified and taint updated",
  "input": {
    "tool_name": "salesforce.query_opportunities",
    "response_classification": "CONFIDENTIAL"
  },
  "rules_evaluated": [
    "tool_response_classification",
    "taint_escalation"
  ],
  "taint_before": "PUBLIC",
  "taint_after": "CONFIDENTIAL",
  "metadata": {
    "lineage_id": "lin_789xyz",
    "records_returned": 3
  }
}
```

### تفویض عامل مسدودشده

```json
{
  "timestamp": "2025-01-29T10:25:00Z",
  "hook_type": "AGENT_INVOCATION",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Agent ceiling (INTERNAL) below session taint (CONFIDENTIAL)",
  "input": {
    "caller_agent_id": "agent_abc",
    "callee_agent_id": "agent_def",
    "callee_ceiling": "INTERNAL",
    "task": "Generate public summary"
  },
  "rules_evaluated": [
    "delegation_ceiling_check",
    "delegation_allowlist",
    "delegation_depth"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

## قابلیت‌های ردیابی بازرسی

<img src="/diagrams/audit-trace-flow.svg" alt="جریان ردیابی بازرسی: ردیابی رو به جلو، ردیابی رو به عقب و توجیه طبقه‌بندی به صادرات انطباق می‌رسند" style="max-width: 100%;" />

رکوردهای بازرسی به چهار روش قابل جستجو هستند که هر یک نیاز انطباقی و بررسی قانونی متفاوتی را برآورده می‌کند.

### ردیابی رو به جلو

**پرسش:** «چه اتفاقی برای داده‌های رکورد Salesforce `opp_00123ABC` افتاد؟»

ردیابی رو به جلو یک عنصر داده را از نقطه مبدأ از طریق هر تبدیل، نشست و خروجی دنبال می‌کند. پاسخ می‌دهد: این داده کجا رفت، چه کسی آن را دید و آیا خارج از سازمان فرستاده شد؟

```
مبدأ: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> طبقه‌بندی: CONFIDENTIAL
  --> نشست: sess_456

تبدیل‌ها:
  --> فیلدهای استخراج‌شده: name, amount, stage
  --> LLM ۳ رکورد را در نمای کلی پایپ‌لاین خلاصه کرد

خروجی‌ها:
  --> ارسال به مالک از طریق Telegram (مجاز)
  --> مسدود از مخاطب خارجی واتس‌اپ (مسدود شد)
```

### ردیابی رو به عقب

**پرسش:** «چه منابعی در پیام ارسال‌شده در ساعت ۱۰:۲۴ UTC نقش داشتند؟»

ردیابی رو به عقب از یک خروجی شروع می‌کند و از زنجیره نسب به عقب حرکت می‌کند تا هر منبع داده‌ای که بر خروجی تأثیر گذاشته شناسایی شود. این برای درک اینکه آیا داده‌های طبقه‌بندی‌شده در پاسخ گنجانده شده‌اند ضروری است.

```
خروجی: پیام ارسال‌شده به Telegram در ۱۰:۲۴:۰۰Z
  --> نشست: sess_456
  --> منابع نسب:
      --> lin_789xyz: فرصت Salesforce (CONFIDENTIAL)
      --> lin_790xyz: فرصت Salesforce (CONFIDENTIAL)
      --> lin_791xyz: فرصت Salesforce (CONFIDENTIAL)
      --> lin_792xyz: API آب‌وهوا (PUBLIC)
```

### توجیه طبقه‌بندی

**پرسش:** «چرا این داده CONFIDENTIAL علامت‌گذاری شده؟»

توجیه طبقه‌بندی به قانون یا سیاستی که سطح طبقه‌بندی را تعیین کرده بازمی‌گردد:

```
داده: خلاصه پایپ‌لاین (lin_789xyz)
طبقه‌بندی: CONFIDENTIAL
دلیل: source_system_default
  --> طبقه‌بندی پیش‌فرض یکپارچه‌سازی Salesforce: CONFIDENTIAL
  --> پیکربندی‌شده توسط: admin_001 در ۲۰۲۵-۰۱-۱۰T08:00:00Z
  --> قانون سیاست: «تمام داده‌های Salesforce با طبقه‌بندی CONFIDENTIAL»
```

### صادرات انطباق

برای بررسی حقوقی، نظارتی یا داخلی، Triggerfish می‌تواند کل زنجیره نگهبانی را برای هر عنصر داده یا بازه زمانی صادر کند:

```
درخواست صادرات:
  --> بازه زمانی: 2025-01-29T00:00:00Z تا 2025-01-29T23:59:59Z
  --> محدوده: تمام نشست‌های user_456
  --> قالب: JSON

صادرات شامل:
  --> تمام رکوردهای بازرسی در بازه زمانی
  --> تمام رکوردهای نسب ارجاع‌شده توسط رکوردهای بازرسی
  --> تمام انتقال‌های وضعیت نشست
  --> تمام تصمیمات سیاست (ALLOW، BLOCK، REDACT)
  --> تمام تغییرات Taint
  --> تمام رکوردهای زنجیره تفویض
```

::: tip صادرات‌های انطباق فایل‌های JSON ساختاریافته هستند که می‌توانند توسط سیستم‌های SIEM، داشبوردهای انطباق یا ابزارهای بررسی حقوقی مصرف شوند. قالب صادرات پایدار و نسخه‌بندی‌شده است. :::

## نسب داده

ثبت بازرسی در ارتباط با سیستم نسب داده Triggerfish کار می‌کند. هر عنصر داده پردازش‌شده توسط Triggerfish متادیتای منشأ حمل می‌کند:

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

رکوردهای نسب در `POST_TOOL_RESPONSE` (وقتی داده وارد سیستم می‌شود) ایجاد و با تبدیل داده‌ها به‌روز می‌شوند. داده‌های تجمیع‌شده `max(طبقه‌بندی‌های ورودی)` را به ارث می‌برند — اگر هر ورودی CONFIDENTIAL باشد، خروجی حداقل CONFIDENTIAL است.

| رویداد | اقدام نسب |
|--------|-----------|
| خواندن داده از یکپارچه‌سازی | ایجاد رکورد نسب با مبدأ |
| تبدیل داده توسط LLM | افزودن تبدیل، پیوند نسب‌های ورودی |
| تجمیع داده از منابع متعدد | ادغام نسب، طبقه‌بندی = max(ورودی‌ها) |
| ارسال داده به کانال | ثبت مقصد، تأیید طبقه‌بندی |
| بازنشانی نشست | بایگانی رکوردهای نسب، پاک‌سازی از زمینه |

## ذخیره‌سازی و نگهداری

گزارش‌های بازرسی از طریق تجرید `StorageProvider` تحت فضای نام `audit:` پایدار می‌شوند. رکوردهای نسب تحت فضای نام `lineage:` ذخیره می‌شوند.

| نوع داده | فضای نام | نگهداری پیش‌فرض |
|----------|-----------|-----------------|
| گزارش‌های بازرسی | `audit:` | ۱ سال |
| رکوردهای نسب | `lineage:` | ۹۰ روز |
| وضعیت نشست | `sessions:` | ۳۰ روز |
| تاریخچه Taint | `taint:` | مطابق نگهداری نشست |

::: warning امنیت دوره‌های نگهداری قابل پیکربندی هستند، اما گزارش‌های بازرسی به‌صورت پیش‌فرض ۱ سال هستند تا الزامات انطباق (SOC 2، GDPR، HIPAA) را پشتیبانی کنند. کاهش دوره نگهداری به زیر الزام نظارتی سازمان شما مسئولیت مدیر است. :::

### بک‌اندهای ذخیره‌سازی

| سطح | بک‌اند | جزئیات |
|------|--------|--------|
| **شخصی** | SQLite | پایگاه‌داده حالت WAL در `~/.triggerfish/data/triggerfish.db`. رکوردهای بازرسی به‌عنوان JSON ساختاریافته در همان پایگاه‌داده با سایر وضعیت‌های Triggerfish ذخیره می‌شوند. |
| **سازمانی** | قابل اتصال | بک‌اندهای سازمانی (Postgres، S3 و غیره) می‌توانند از طریق رابط `StorageProvider` استفاده شوند. این امکان یکپارچه‌سازی با زیرساخت تجمیع گزارش موجود را فراهم می‌کند. |

## تغییرناپذیری و یکپارچگی

رکوردهای بازرسی فقط افزودنی هستند. پس از نوشتن، توسط هیچ مؤلفه‌ای از سیستم — از جمله LLM، عامل یا Plugin‌ها — قابل تغییر یا حذف نیستند. حذف فقط از طریق انقضای سیاست نگهداری رخ می‌دهد.

هر رکورد بازرسی شامل یک هَش محتوا است که می‌تواند برای تأیید یکپارچگی استفاده شود. اگر رکوردها برای بررسی انطباق صادر شوند، هَش‌ها می‌توانند در برابر رکوردهای ذخیره‌شده اعتبارسنجی شوند تا دستکاری شناسایی شود.

## ویژگی‌های انطباق سازمانی

استقرارهای سازمانی می‌توانند ثبت بازرسی را با موارد زیر گسترش دهند:

| ویژگی | توضیحات |
|-------|---------|
| **نگهداری حقوقی** | تعلیق حذف مبتنی بر نگهداری برای کاربران، نشست‌ها یا بازه‌های زمانی مشخص |
| **یکپارچه‌سازی SIEM** | پخش رویدادهای بازرسی به Splunk، Datadog یا سایر سیستم‌های SIEM به‌صورت بلادرنگ |
| **داشبوردهای انطباق** | نمای کلی بصری تصمیمات سیاست، اقدامات مسدودشده و الگوهای Taint |
| **صادرات زمان‌بندی‌شده** | صادرات دوره‌ای خودکار برای بررسی نظارتی |
| **قوانین هشدار** | ایجاد اعلان وقتی الگوهای بازرسی خاصی رخ دهند (مثلاً نوشتن‌های به پایین مکرر مسدودشده) |

## صفحات مرتبط

- [طراحی امنیت‌محور](./) — مروری بر معماری امنیتی
- [قانون عدم نوشتن به پایین](./no-write-down) — قانون جریان طبقه‌بندی که اجرای آن ثبت می‌شود
- [هویت و احراز هویت](./identity) — نحوه ثبت تصمیمات هویت
- [تفویض عامل](./agent-delegation) — نحوه ظاهر شدن زنجیره‌های تفویض در رکوردهای بازرسی
- [مدیریت رمزها](./secrets) — نحوه ثبت دسترسی به بیانات اعتبار
