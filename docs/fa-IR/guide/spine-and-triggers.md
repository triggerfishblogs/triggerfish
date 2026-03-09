# SPINE و محرک‌ها

Triggerfish از دو فایل مارک‌داون برای تعریف رفتار عامل شما استفاده می‌کند:
**SPINE.md** کنترل می‌کند عامل شما چه کسی است، و **TRIGGER.md** کنترل می‌کند
عامل شما به‌صورت فعالانه چه می‌کند. هر دو مارک‌داون آزاد هستند — آن‌ها را به
زبان ساده می‌نویسید.

## SPINE.md — هویت عامل

`SPINE.md` پایه system prompt عامل شما است. نام، شخصیت، مأموریت، حوزه‌های دانش
و مرزهای عامل را تعریف می‌کند. Triggerfish این فایل را هر بار که پیامی پردازش
می‌کند بارگذاری می‌کند، بنابراین تغییرات بلافاصله اعمال می‌شوند.

### مکان فایل

```
~/.triggerfish/SPINE.md
```

### نوشتن SPINE.md مؤثر

یک SPINE.md خوب مشخص است. هرچه در مورد نقش عامل مشخص‌تر باشید، عملکرد بهتری
دارد:

```markdown
# Identity

You are Reef, a personal AI assistant for Sarah.

# Mission

Help Sarah stay organized, informed, and productive.

# Communication Style

- Be concise and direct. No filler.
- Use bullet points for lists of 3+ items.

# Boundaries

- Never send messages to external contacts without explicit approval.
- Never make financial transactions.
```

::: warning دستورالعمل‌های SPINE.md رفتار LLM را هدایت می‌کنند اما کنترل‌های
امنیتی نیستند. برای محدودیت‌های قابل اعمال، از موتور سیاست در `triggerfish.yaml`
استفاده کنید. :::

## TRIGGER.md — رفتار فعالانه

`TRIGGER.md` تعریف می‌کند عامل شما در بیدارباش‌های دوره‌ای چه چیزهایی را بررسی،
نظارت و بر اساس آن عمل کند.

### مکان فایل

```
~/.triggerfish/TRIGGER.md
```

### نحوه کار محرک‌ها

۱. حلقه محرک عامل را در فاصله زمانی پیکربندی‌شده بیدار می‌کند
۲. Triggerfish فایل TRIGGER.md شما را بارگذاری و به عامل ارائه می‌دهد
۳. عامل هر مورد را ارزیابی و در صورت نیاز اقدام می‌کند
۴. تمام اقدامات محرک از Hook‌های سیاست معمول عبور می‌کنند
۵. نشست محرک با سقف طبقه‌بندی اجرا می‌شود
۶. ساعات آرام رعایت می‌شوند

### پیکربندی محرک در YAML

```yaml
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

### نوشتن TRIGGER.md

```markdown
# Priority Checks

- Unread messages across all channels older than 1 hour — summarize and notify.
- Calendar conflicts in the next 24 hours — flag and suggest resolution.

# Monitoring

- GitHub: PRs awaiting my review — notify if older than 4 hours.
- Email: anything from VIP contacts — flag for immediate notification.

# Proactive

- If morning (7-9am), prepare daily briefing.
- If Friday afternoon, draft weekly summary.
```

## SPINE.md در مقابل TRIGGER.md

| جنبه     | SPINE.md                           | TRIGGER.md                         |
| -------- | ---------------------------------- | ---------------------------------- |
| هدف      | تعریف هویت عامل                    | تعریف آنچه عامل نظارت می‌کند       |
| بارگذاری | هر پیام                            | هر بیدارباش محرک                   |
| دامنه    | تمام مکالمات                       | فقط نشست‌های محرک                  |
| تأثیر    | شخصیت، دانش، مرزها                 | بررسی‌ها و اقدامات فعالانه          |
| الزامی   | بله (توسط جادوگر dive تولید می‌شود) | خیر (اما توصیه می‌شود)             |

## مراحل بعدی

- زمان‌بندی محرک و وظایف cron را در [triggerfish.yaml](./configuration) پیکربندی کنید
- تمام دستورات CLI موجود را در [مرجع دستورات](./commands) بیاموزید
