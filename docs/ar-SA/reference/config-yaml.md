# مخطط التكوين

يُكوّن Triggerfish من خلال `triggerfish.yaml`، الموجود في
`~/.triggerfish/triggerfish.yaml` بعد تشغيل `triggerfish dive`. تُوثق هذه الصفحة
كل قسم تكوين.

::: info مراجع الأسرار أي قيمة سلسلة في هذا الملف يمكنها استخدام بادئة `secret:`
للإشارة لبيانات اعتماد مخزنة في سلسلة مفاتيح نظام التشغيل. مثلاً
`apiKey: "secret:provider:anthropic:apiKey"` تحل القيمة من السلسلة عند البدء. انظر
[إدارة الأسرار](/ar-SA/security/secrets) للتفاصيل. :::

## الأقسام

### models

تكوين مزودي LLM وتجاوز الفشل. انظر [التكوين](/ar-SA/guide/configuration)
للأمثلة الكاملة.

### channels

تكوين القنوات. كل قناة تتطلب `enabled` و `classification`.

### classification

```yaml
classification:
  mode: personal # أو enterprise
```

### policy

قواعد سياسات مخصصة فوق الحمايات الثابتة.

### mcp_servers

خوادم MCP المتصلة. كل خادم يتطلب `classification`.

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

تكوين البحث على الويب والجلب.

### notifications

تفضيلات تسليم الإشعارات.

### logging

```yaml
logging:
  level: normal # quiet, normal, verbose, debug
```

### webhooks

نقاط نهاية webhook الواردة.

### integrations

تكاملات خارجية (Google, GitHub, CalDAV, Obsidian).
