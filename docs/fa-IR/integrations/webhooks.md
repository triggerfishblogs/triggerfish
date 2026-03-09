# Webhooks

يقبل Triggerfish أحداث webhook الواردة از خدمات خارجية ويوجهها لنشست‌ها عامل
لباالجتها.

## پیکربندی

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

## چگونه کار می‌کند

1. يُستلم درخواست HTTP POST در `POST /webhooks/:sourceId`
2. يطابق Gateway البارف المصدر با نقطة نهاية مُكوّنة
3. تُصنف البيانات الواردة حسب طبقه‌بندی نقطة النهاية
4. تُنشأ نشست خلدرة بـ taint `PUBLIC` جديد
5. عامل يعالج الحدث وفق الإجراءات المُكوّنة

## اازیت

- أحداث webhook تُصنف عند اخیرستيعاب
- هر webhook کار می‌کند در نشست خلدرة بازولة
- hooks سیاست‌ها تنطبق روی تمام إجراءات webhook
- التحقق از HMAC مدعوم لتأكيد أصالة الأحداث
