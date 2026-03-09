# Cron و Triggers

وكلاء Triggerfish ليسوا محدودين بالسؤال والجواب التفاعلي. نظام cron و trigger
يمكّن السلوك الاستباقي: المهام المجدولة، والفحوصات الدورية، والتقارير الصباحية،
والمراقبة في الخلفية.

## مهام Cron

مهام cron هي مهام مجدولة بتعليمات ثابتة وقناة تسليم وسقف تصنيف. تستخدم صيغة
تعبير cron القياسية.

### التكوين

```yaml
scheduler:
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

### كيف يعمل

1. **CronManager** يحلل تعبيرات cron القياسية ويحتفظ بسجل مهام دائم
2. عند إطلاق المهمة، ينشئ **OrchestratorFactory** منسقاً وجلسة معزولة
3. المهمة تعمل في **مساحة عمل جلسة خلفية** بتتبع taint خاص بها
4. يُسلم المخرج للقناة المُكوّنة، خاضعاً لقواعد تصنيف تلك القناة

### إدارة Cron من CLI

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

## نظام Triggers

Triggers هي حلقات "فحص" دورية حيث يستيقظ الوكيل لتقييم ما إذا كان هناك إجراء
استباقي مطلوب.

### TRIGGER.md

`TRIGGER.md` يحدد ما يجب على الوكيل فحصه خلال كل إيقاظ. يعيش في
`~/.triggerfish/config/TRIGGER.md`.

### تكوين Trigger

```yaml
scheduler:
  trigger:
    enabled: true
    interval_minutes: 30
    classification_ceiling: CONFIDENTIAL
    quiet_hours:
      start: 22
      end: 7
```

### أداة سياق Trigger

يمكن للوكيل تحميل نتائج trigger في محادثته الحالية باستخدام أداة
`trigger_add_to_context`.

## تكامل الأمان

جميع التنفيذ المجدول يتكامل مع نموذج الأمان الأساسي:

- **جلسات معزولة** -- كل مهمة cron وإيقاظ trigger تعمل في جلسة خاصة بها
- **سقف التصنيف** -- المهام الخلفية لا يمكنها تجاوز مستوى التصنيف المُكوّن
- **hooks السياسات** -- جميع الإجراءات تمر عبر نفس hooks التنفيذ
- **مسار التدقيق** -- كل تنفيذ مجدول يُسجل بسياق كامل
