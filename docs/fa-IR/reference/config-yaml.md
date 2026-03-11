# شمای پیکربندی

يُكوّن Triggerfish از خخیرل `triggerfish.yaml`، الموجود در
`~/.triggerfish/triggerfish.yaml` بعد تشغيل `triggerfish dive`. تُوثق این الصفحة
هر قسم تكوين.

::: info ممراجعه کنید رمزها هر قيمة سلسلة در این الملف يمكنها استخدام بادئة `secret:`
للإشارة لبيانات اعتماد مخزنة در کلیدزنجیر نظام التشغيل. مثخیرً
`apiKey: "secret:provider:anthropic:apiKey"` تحل القيمة از السلسلة عند شروع. ببینید
[مدیریت رمزها](/fa-IR/security/secrets) للتفاصيل. :::

## الأقسام

### models

تكوين ارائه‌دهندهي LLM وتجاوز الفشل. ببینید [پیکربندی](/fa-IR/guide/configuration)
للمثال‌ها الكاملة.

### channels

تكوين کانال‌ها. هر کانال تتدرخواست `enabled` و `classification`.

### classification

```yaml
classification:
  mode: personal # یا enterprise
```

### policy

قوانین سياسات مخصصة فوق الحمايات الثابتة.

### mcp_servers

خوادم MCP المتصلة. هر خادم يتدرخواست `classification`.

### scheduler

تكوين Cron و triggers.

```yaml
scheduler:
  cron:
    jobs: [...]
  trigger:
    enabled: true
    interval_minutes: 30
    classification_ceiling: CONFIDENTIAL
    quiet_hours:
      start: 22
      end: 7
```

### web

تكوين جستجوی وب والجلب.

### notifications

تفضيخیرت تسليم اعخیرن‌ها.

### logging

```yaml
logging:
  level: normal # quiet, normal, verbose, debug
```

### webhooks

نقاط نهاية webhook الواردة.

### integrations

یکپارچه‌سازیات خارجية (Google, GitHub, CalDAV, Obsidian).
