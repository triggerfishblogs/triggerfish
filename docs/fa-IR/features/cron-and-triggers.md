# Cron و Triggers

عامل‌ها Triggerfish ليسوا محدودين بالسؤال والجواب التفاعلي. نظام cron و trigger
يمكّن السلوك اخیرستباقي: وظایف زمان‌بندی‌شده، والفحوصات الدورية، والتقارير الصباحية،
والمراقبة در الخلدرة.

## مهام Cron

مهام cron هي مهام مجدولة بتعليمات ثابتة وکانال تسليم وسقف طبقه‌بندی. تستخدم صيغة
تعبير cron القياسية.

### پیکربندی

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

### چگونه کار می‌کند

1. **CronManager** يحلل تعبيرات cron القياسية ويحتفظ بسجل مهام دائم
2. عند إطخیرق المهمة، ينشئ **OrchestratorFactory** ازسقاً ونشست بازولة
3. المهمة تعمل در **مساحة عمل نشست خلدرة** بتتبع taint خاص بها
4. يُسلم المخرج للکانال المُكوّنة، خاضعاً لقوانین طبقه‌بندی آن کانال

### إدارة Cron از CLI

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

## نظام Triggers

Triggers هي حلقات "فحص" دورية حيث يستيقظ عامل لتقييم ما إذا كان آنجا إجراء
استباقي الزامی.

### TRIGGER.md

`TRIGGER.md` يحدد ما باید روی عامل فحصه خخیرل هر إيقاظ. يعيش در
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

### ابزار زمینه Trigger

يمكن للعامل تحميل نتائج trigger در محادثته الحالية باستخدام ابزار
`trigger_add_to_context`.

## یکپارچه‌سازی اازیت

تمام التندرذ المجدول يیکپارچه‌سازی با مدل اازیت الأساسي:

- **نشست‌ها بازولة** -- هر مهمة cron وإيقاظ trigger تعمل در نشست خاصة بها
- **سقف طبقه‌بندی** -- المهام الخلدرة نمی‌توانها تجاوز سطح طبقه‌بندی المُكوّن
- **hooks سیاست‌ها** -- تمام الإجراءات تمر از طریق نفس hooks التندرذ
- **مسار بازرسی** -- هر تندرذ مجدول يُسجل بزمینه كامل
