# Webhooks

يقبل Triggerfish أحداث webhook الواردة من خدمات خارجية ويوجهها لجلسات وكيل
لمعالجتها.

## التكوين

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

## كيف يعمل

1. يُستلم طلب HTTP POST في `POST /webhooks/:sourceId`
2. يطابق Gateway المعرف المصدر مع نقطة نهاية مُكوّنة
3. تُصنف البيانات الواردة حسب تصنيف نقطة النهاية
4. تُنشأ جلسة خلفية بـ taint `PUBLIC` جديد
5. الوكيل يعالج الحدث وفق الإجراءات المُكوّنة

## الأمان

- أحداث webhook تُصنف عند الاستيعاب
- كل webhook يعمل في جلسة خلفية معزولة
- hooks السياسات تنطبق على جميع إجراءات webhook
- التحقق من HMAC مدعوم لتأكيد أصالة الأحداث
