# SPINE וטריגרים

Triggerfish משתמשת בשני קבצי markdown להגדרת התנהגות הסוכן: **SPINE.md** שולט
מי הסוכן, ו-**TRIGGER.md** שולט במה הסוכן עושה באופן פרואקטיבי. שניהם markdown
חופשי -- אתם כותבים אותם באנגלית פשוטה.

## SPINE.md -- זהות הסוכן

`SPINE.md` הוא הבסיס של ה-system prompt של הסוכן. הוא מגדיר את שם הסוכן,
אישיותו, משימתו, תחומי ידע וגבולותיו. Triggerfish טוענת קובץ זה בכל פעם שהיא
מעבדת הודעה, כך ששינויים נכנסים לתוקף מיד.

### מיקום הקובץ

```
~/.triggerfish/SPINE.md
```

עבור הגדרות רב-סוכניות, לכל סוכן יש SPINE.md משלו:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### צעדים ראשונים

אשף ההגדרה (`triggerfish dive`) מייצר SPINE.md התחלתי על בסיס התשובות שלכם.
תוכלו לערוך אותו בחופשיות בכל עת -- זה רק markdown.

### כתיבת SPINE.md אפקטיבי

SPINE.md טוב הוא ספציפי. ככל שתהיו יותר קונקרטיים לגבי תפקיד הסוכן, כך הוא
יבצע טוב יותר. הנה מבנה מומלץ:

```markdown
# Identity

You are Reef, a personal AI assistant for Sarah.

# Mission

Help Sarah stay organized, informed, and productive. Prioritize calendar
management, email triage, and task tracking.

# Communication Style

- Be concise and direct. No filler.
- Use bullet points for lists of 3+ items.
- When uncertain, say so rather than guessing.
- Match the formality of the channel: casual on WhatsApp, professional on Slack.

# Domain Knowledge

- Sarah is a product manager at Acme Corp.
- Key tools: Linear for tasks, Google Calendar, Gmail, Slack.
- VIP contacts: @boss (David Chen), @skip (Maria Lopez).
- Current priorities: Q2 roadmap, mobile app launch.

# Boundaries

- Never send messages to external contacts without explicit approval.
- Never make financial transactions.
- Always confirm before deleting or modifying calendar events.
- When discussing work topics on personal channels, remind Sarah about
  classification boundaries.

# Response Preferences

- Default to short responses (2-3 sentences).
- Use longer responses only when the question requires detail.
- For code, include brief comments explaining key decisions.
```

### שיטות עבודה מומלצות

::: tip **היו ספציפיים לגבי האישיות.** במקום "היה מועיל", כתבו "היה תמציתי,
ישיר, והשתמש בנקודות תבליט לבהירות." :::

::: tip **כללו הקשר על הבעלים.** הסוכן מבצע טוב יותר כשהוא מכיר את התפקיד,
הכלים וסדרי העדיפויות שלכם. :::

::: tip **הגדירו גבולות מפורשים.** הגדירו מה הסוכן לעולם לא צריך לעשות. זה
משלים (אך לא מחליף) את האכיפה הדטרמיניסטית של מנוע המדיניות. :::

::: warning הוראות SPINE.md מנחות את התנהגות ה-LLM אך אינן בקרות אבטחה.
להגבלות שניתנות לאכיפה, השתמשו במנוע המדיניות ב-`triggerfish.yaml`. מנוע
המדיניות הוא דטרמיניסטי ולא ניתן לעקיפה -- הוראות SPINE.md כן ניתנות. :::

## TRIGGER.md -- התנהגות פרואקטיבית

`TRIGGER.md` מגדיר מה הסוכן צריך לבדוק, לנטר ולפעול לגביו במהלך התעוררויות
תקופתיות. בניגוד למשימות cron (שמבצעות משימות קבועות לפי לוח זמנים), טריגרים
נותנים לסוכן שיקול דעת להעריך תנאים ולהחליט אם נדרשת פעולה.

### מיקום הקובץ

```
~/.triggerfish/TRIGGER.md
```

עבור הגדרות רב-סוכניות:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### כיצד טריגרים עובדים

1. לולאת הטריגר מעירה את הסוכן במרווח מוגדר (מוגדר ב-`triggerfish.yaml`)
2. Triggerfish טוענת את ה-TRIGGER.md שלכם ומציגה אותו לסוכן
3. הסוכן מעריך כל פריט ופועל אם נדרש
4. כל פעולות הטריגר עוברות דרך ה-Hook-ים הרגילים של המדיניות
5. סשן הטריגר רץ עם תקרת סיווג (מוגדרת גם ב-YAML)
6. שעות שקטות מכובדות -- אין טריגרים בזמנים אלו

### הגדרת טריגר ב-YAML

הגדירו את התזמון והמגבלות ב-`triggerfish.yaml`:

```yaml
trigger:
  interval: 30m # בדיקה כל 30 דקות
  classification: INTERNAL # תקרת Taint מקסימלית לסשני טריגר
  quiet_hours: "22:00-07:00" # ללא התעוררויות בשעות אלו
```

### כתיבת TRIGGER.md

ארגנו את הטריגרים לפי עדיפות. היו ספציפיים לגבי מה נחשב לדורש פעולה ומה
הסוכן צריך לעשות לגבי זה.

```markdown
# Priority Checks

- Unread messages across all channels older than 1 hour -- summarize and notify
  on primary channel.
- Calendar conflicts in the next 24 hours -- flag and suggest resolution.
- Overdue tasks in Linear -- list them with days overdue.

# Monitoring

- GitHub: PRs awaiting my review -- notify if older than 4 hours.
- Email: anything from VIP contacts (David Chen, Maria Lopez) -- flag for
  immediate notification regardless of quiet hours.
- Slack: mentions in #incidents channel -- summarize and escalate if unresolved.

# Proactive

- If morning (7-9am), prepare daily briefing with calendar, weather, and top 3
  priorities.
- If Friday afternoon, draft weekly summary of completed tasks and open items.
- If inbox count exceeds 50 unread, offer to batch-triage.
```

### דוגמה: TRIGGER.md מינימלי

אם רוצים נקודת התחלה פשוטה:

```markdown
# Check on each wakeup

- Any unread messages older than 1 hour
- Calendar events in the next 4 hours
- Anything urgent in email
```

### דוגמה: TRIGGER.md מוכוון מפתחים

```markdown
# High Priority

- CI failures on main branch -- investigate and notify.
- PRs awaiting my review older than 2 hours.
- Sentry errors with "critical" severity in the last hour.

# Monitoring

- Dependabot PRs -- auto-approve patch updates, flag minor/major.
- Build times trending above 10 minutes -- report weekly.
- Open issues assigned to me with no updates in 3 days.

# Daily

- Morning: summarize overnight CI runs and deploy status.
- End of day: list PRs I opened that are still pending review.
```

### טריגרים ומנוע המדיניות

כל פעולות הטריגר כפופות לאותה אכיפת מדיניות כמו שיחות אינטראקטיביות:

- כל התעוררות טריגר מייצרת סשן מבודד עם מעקב Taint משלו
- תקרת הסיווג בהגדרות YAML מגבילה לאילו נתונים הטריגר יכול לגשת
- כלל אי-כתיבה למטה חל -- אם טריגר ניגש לנתונים חסויים, הוא לא יכול
  לשלוח תוצאות לערוץ ציבורי
- כל פעולות הטריגר נרשמות בנתיב הביקורת

::: info אם TRIGGER.md נעדר, התעוררויות טריגר עדיין מתרחשות במרווח המוגדר.
הסוכן משתמש בידע הכללי שלו וב-SPINE.md כדי להחליט מה דורש תשומת לב. לתוצאות
מיטביות, כתבו TRIGGER.md. :::

## SPINE.md לעומת TRIGGER.md

| היבט    | SPINE.md                            | TRIGGER.md                      |
| ------- | ----------------------------------- | ------------------------------- |
| מטרה    | הגדרת מי הסוכן                      | הגדרת מה הסוכן מנטר             |
| נטען    | כל הודעה                            | כל התעוררות טריגר                |
| טווח    | כל השיחות                           | סשני טריגר בלבד                  |
| משפיע   | אישיות, ידע, גבולות                 | בדיקות ופעולות פרואקטיביות       |
| נדרש    | כן (נוצר על ידי אשף dive)           | לא (אך מומלץ)                   |

## צעדים הבאים

- הגדירו תזמון טריגרים ומשימות cron ב-[triggerfish.yaml](./configuration) שלכם
- למדו על כל פקודות ה-CLI הזמינות ב[מדריך הפקודות](./commands)
