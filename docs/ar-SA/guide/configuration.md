# التكوين

يُكوّن Triggerfish من خلال ملف YAML واحد في
`~/.triggerfish/triggerfish.yaml`. معالج الإعداد (`triggerfish dive`) يُنشئ هذا
الملف لك، لكن يمكنك تحريره يدوياً في أي وقت.

## موقع ملف التكوين

```
~/.triggerfish/triggerfish.yaml
```

يمكنك تعيين قيم فردية من سطر الأوامر باستخدام مسارات منقطة:

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

القيم المنطقية والصحيحة تُحول تلقائياً. الأسرار تُخفى في المخرجات.

تحقق من تكوينك بـ:

```bash
triggerfish config validate
```

## النماذج

قسم `models` يُكوّن مزودي LLM وسلوك تجاوز الفشل.

```yaml
models:
  # أي مزود ونموذج يُستخدم افتراضياً
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # اختياري: نموذج رؤية لوصف الصور التلقائي عندما النموذج
  # الرئيسي لا يدعم الرؤية
  # vision: gemini-2.0-flash

  # بث الاستجابات (افتراضي: true)
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # افتراضي Ollama

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # افتراضي LM Studio

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # سلسلة تجاوز الفشل: إذا فشل الرئيسي، جرب هذه بالترتيب
  failover:
    - openai
    - google
```

تُخزن مفاتيح API في سلسلة مفاتيح نظام التشغيل، ليس في هذا الملف. معالج الإعداد
(`triggerfish dive`) يطلب مفتاح API ويخزنه بأمان. Ollama و LM Studio محلية ولا
تتطلب مصادقة.

## القنوات

قسم `channels` يحدد منصات المراسلة التي يتصل بها وكيلك ومستوى التصنيف لكل منها.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  signal:
    enabled: true
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "your-phone-number-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL
```

الرموز وكلمات المرور ومفاتيح API لكل قناة تُخزن في سلسلة مفاتيح نظام التشغيل.
شغل `triggerfish config add-channel <name>` لإدخال بيانات الاعتماد تفاعلياً --
تُحفظ في سلسلة المفاتيح، وليس أبداً في هذا الملف.

### مستويات التصنيف الافتراضية

| القناة   | الافتراضي      |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

جميع الافتراضيات قابلة للتكوين. عيّن أي قناة لأي مستوى تصنيف.

## خوادم MCP

اتصل بخوادم MCP خارجية لمنح وكيلك الوصول لأدوات إضافية. انظر
[MCP Gateway](/ar-SA/integrations/mcp-gateway) لنموذج الأمان الكامل.

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

كل خادم يجب أن يكون لديه مستوى `classification` أو سيُرفض (رفض افتراضي). استخدم
`command` + `args` للخوادم المحلية (تُنشأ كعمليات فرعية) أو `url` للخوادم البعيدة
(HTTP SSE). قيم البيئة المسبوقة بـ `keychain:` تُحل من سلسلة مفاتيح نظام التشغيل.

للمساعدة في اختيار مستويات التصنيف، انظر
[دليل التصنيف](./classification-guide).

## التصنيف

```yaml
classification:
  mode: personal # "personal" أو "enterprise" (قريباً)
```

**مستويات التصنيف:**

| المستوى        | الوصف           | أمثلة                                                 |
| -------------- | --------------- | ----------------------------------------------------- |
| `RESTRICTED`   | الأكثر حساسية   | وثائق الاندماج، PII، الحسابات البنكية، السجلات الطبية |
| `CONFIDENTIAL` | حساس            | بيانات CRM، البيانات المالية، العقود، السجلات الضريبية |
| `INTERNAL`     | داخلي فقط       | الويكي الداخلي، الملاحظات الشخصية، جهات الاتصال       |
| `PUBLIC`       | آمن للجميع      | المواد التسويقية، المعلومات العامة، محتوى الويب العام  |

للحصول على إرشادات تفصيلية لاختيار المستوى المناسب لتكاملاتك وقنواتك وخوادم MCP،
انظر [دليل التصنيف](./classification-guide).

## السياسات

```yaml
policy:
  default_action: ALLOW

  rules:
    # حظر استجابات الأدوات التي تحتوي على أنماط SSN
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # حد معدل استدعاءات API الخارجية
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info قواعد الأمان الأساسية -- منع الكتابة للأسفل، تصعيد taint الجلسة،
تسجيل التدقيق -- مُنفذة دائماً ولا يمكن تعطيلها. قواعد السياسات المخصصة تضيف
ضوابط إضافية فوق هذه الحمايات الثابتة. :::

## البحث على الويب والجلب

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
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: []
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

أعد البحث من سطر الأوامر:

```bash
triggerfish config set web.search.provider brave
```

::: tip احصل على مفتاح API لـ Brave Search في
[brave.com/search/api](https://brave.com/search/api/). المستوى المجاني يشمل 2,000
استعلام/شهر. :::

## مهام Cron

جدول مهام متكررة لوكيلك:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram
      classification: INTERNAL

    - id: pipeline-check
      schedule: "0 */4 * * *"
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

كل مهمة cron تعمل في جلسة معزولة خاصة بها مع سقف تصنيف. جميع إجراءات cron تمر
عبر hooks السياسات العادية.

## توقيت Triggers

```yaml
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

يقرأ نظام triggers ملف `~/.triggerfish/TRIGGER.md` ليقرر ماذا يفحص في كل إيقاظ.
انظر [SPINE و Triggers](./spine-and-triggers) للتفاصيل.

## Webhooks

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"
```

## الخطوات التالية

- عرّف هوية وكيلك في [SPINE.md](./spine-and-triggers)
- أعد المراقبة الاستباقية مع [TRIGGER.md](./spine-and-triggers)
- تعلم جميع أوامر CLI في [مرجع الأوامر](./commands)
