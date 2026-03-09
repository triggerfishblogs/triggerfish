# پیکربندی

Triggerfish از طریق یک فایل YAML واحد در مسیر
`~/.triggerfish/triggerfish.yaml` پیکربندی می‌شود. جادوگر راه‌اندازی
(`triggerfish dive`) این فایل را برای شما ایجاد می‌کند، اما می‌توانید آن را
در هر زمان به‌صورت دستی ویرایش کنید.

## مکان فایل پیکربندی

```
~/.triggerfish/triggerfish.yaml
```

می‌توانید مقادیر فردی را از خط فرمان با استفاده از مسیرهای نقطه‌ای تنظیم کنید:

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

پیکربندی خود را با دستور زیر اعتبارسنجی کنید:

```bash
triggerfish config validate
```

## مدل‌ها

بخش `models` ارائه‌دهندگان LLM و رفتار جایگزینی شما را پیکربندی می‌کند.

```yaml
models:
  # ارائه‌دهنده و مدل پیش‌فرض
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    openrouter:
      model: anthropic/claude-sonnet-4-5

  # زنجیره جایگزینی: اگر اصلی ناموفق باشد، اینها را به ترتیب امتحان کنید
  failover:
    - openai
    - google
```

کلیدهای API در کلیدزنجیر سیستم‌عامل ذخیره می‌شوند، نه در این فایل.

## کانال‌ها

بخش `channels` تعریف می‌کند که عامل شما به کدام پلتفرم‌های پیام‌رسانی متصل
می‌شود و سطح طبقه‌بندی هر کدام.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    classification: CONFIDENTIAL
```

### سطوح طبقه‌بندی پیش‌فرض

| کانال    | پیش‌فرض        |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

## سرورهای MCP

سرورهای MCP خارجی را متصل کنید تا به عامل خود دسترسی به ابزارهای اضافی بدهید.
[MCP Gateway](/fa-IR/integrations/mcp-gateway) را برای مدل امنیتی کامل ببینید.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL
```

هر سرور باید یک سطح `classification` داشته باشد وگرنه رد خواهد شد (رد پیش‌فرض).

برای کمک در انتخاب سطوح طبقه‌بندی، [راهنمای طبقه‌بندی](./classification-guide) را ببینید.

## طبقه‌بندی

```yaml
classification:
  mode: personal # "personal" یا "enterprise" (به‌زودی)
```

**سطوح طبقه‌بندی:**

| سطح            | توضیحات         | نمونه‌ها                                              |
| -------------- | --------------- | ----------------------------------------------------- |
| `RESTRICTED`   | حساس‌ترین       | اسناد M&A، PII، حساب‌های بانکی، سوابق پزشکی           |
| `CONFIDENTIAL` | حساس            | داده‌های CRM، مالی، قراردادها، سوابق مالیاتی           |
| `INTERNAL`     | فقط داخلی       | ویکی‌های داخلی، یادداشت‌های شخصی، مخاطبین              |
| `PUBLIC`       | برای همه امن    | مواد بازاریابی، اطلاعات عمومی                          |

## سیاست

```yaml
policy:
  default_action: ALLOW

  rules:
    # مسدود کردن پاسخ‌های ابزار حاوی الگوهای SSN
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
```

::: info قوانین امنیتی اصلی — عدم نوشتن به پایین، افزایش Taint نشست، ثبت بازرسی — همیشه اعمال می‌شوند و نمی‌توان آن‌ها را غیرفعال کرد. :::

## جستجو و واکشی وب

```yaml
web:
  search:
    provider: brave
    max_results: 10
    safe_search: moderate
  fetch:
    rate_limit: 10
    max_content_length: 50000
    timeout: 30000
    default_mode: readability
```

## وظایف Cron

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram
      classification: INTERNAL
```

## زمان‌بندی محرک

```yaml
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Webhook‌ها

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
```

## مراحل بعدی

- هویت عامل خود را در [SPINE.md](./spine-and-triggers) تعریف کنید
- نظارت فعالانه را با [TRIGGER.md](./spine-and-triggers) تنظیم کنید
- تمام دستورات CLI را در [مرجع دستورات](./commands) بیاموزید
