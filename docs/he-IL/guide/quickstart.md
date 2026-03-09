# התחלה מהירה

מדריך זה מלווה אתכם בחמש הדקות הראשונות עם Triggerfish -- מהרצת אשף
ההגדרה ועד לסוכן AI עובד שאפשר לשוחח איתו.

## הרצת אשף ההגדרה

אם השתמשתם בתוכנית ההתקנה בפקודה אחת, האשף כבר רץ במהלך ההתקנה. כדי
להריץ אותו שוב או להתחיל מחדש:

```bash
triggerfish dive
```

האשף מנחה אתכם בשמונה שלבים:

### שלב 1: בחרו ספק LLM

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

בחרו ספק והזינו את פרטי ההזדהות שלכם. Triggerfish תומכת במספר ספקים עם
failover אוטומטי. **Triggerfish Gateway** היא האפשרות הקלה ביותר — הירשמו
ל[תוכנית Pro או Power](/he-IL/pricing), והסוכן שלכם מתחבר לתשתית LLM וחיפוש
מנוהלת ללא צורך בהגדרת מפתחות API.

### שלב 2: תנו שם לסוכן

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

זה מייצר את קובץ ה-`SPINE.md` שלכם -- הבסיס של ה-system prompt של הסוכן.
תוכלו לערוך אותו בכל עת ב-`~/.triggerfish/SPINE.md`.

### שלב 3: חברו ערוץ

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

בחרו פלטפורמת הודעות או דלגו על שלב זה כדי להתחיל רק עם CLI. תוכלו
להוסיף ערוצים מאוחר יותר ב-`triggerfish.yaml`.

### שלב 4: תוספים אופציונליים

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

חברו אינטגרציות אופציונליות כמו Obsidian לרישום הערות.

### שלב 5: חיבור Google Workspace (אופציונלי)

חברו את חשבון Google שלכם עבור Gmail, Calendar, Tasks, Drive ו-Sheets
דרך OAuth2. ניתן לדלג ולהתחבר מאוחר יותר עם `triggerfish connect google`.

### שלב 6: חיבור GitHub (אופציונלי)

חברו GitHub על ידי הדבקת Personal Access Token. נותן לסוכן כלים עבור
מאגרים, PRs, issues ו-Actions. ניתן לדלג ולהתחבר מאוחר יותר עם
`triggerfish connect github`.

### שלב 7: הגדרת חיפוש אינטרנט

בחרו מנוע חיפוש (Brave Search או SearXNG באירוח עצמי) לשימוש הסוכן,
או דלגו כרגע.

### שלב 8: הפעלת ה-Daemon

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

בחרו כן כדי שהסוכן שלכם יפעל בכל פעם שהמחשב דלוק.

## התחילו לשוחח

לאחר סיום האשף, תוכלו להתחיל לשוחח מיד דרך ה-CLI:

```bash
triggerfish chat
```

או, אם חיברתם ערוץ הודעות, שלחו לסוכן שלכם הודעה שם.

### שיחה לדוגמה

```
You: What can you help me with?

Reef: I can help you with a wide range of tasks. Here are some things
I'm set up for:

  - Answer questions and have conversations
  - Manage your calendar and schedule
  - Summarize emails and messages
  - Write and edit documents
  - Run code in a sandboxed environment
  - Search the web for information
  - Automate recurring tasks with cron jobs

What would you like to start with?

You: Set up a morning briefing every day at 7am

Reef: I've created a cron job for your morning briefing:

  Schedule: Every day at 7:00 AM
  Task: Prepare briefing with calendar events, unread emails,
        and weather forecast
  Delivery: CLI (add a channel in config to get it on Telegram/Slack)

You'll receive your first briefing tomorrow morning. You can manage
cron jobs anytime with /cron list.
```

## אמתו את ההגדרה

הריצו בדיקת בריאות כדי לוודא שהכול עובד:

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 2m)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  1 channel active (CLI)
  Policy engine loaded (4 rules)
  3 skills installed (3 bundled)

Overall: HEALTHY
```

## מה לעשות הלאה

- **התאימו את הסוכן** -- ערכו את `~/.triggerfish/SPINE.md` כדי לשפר את
  האישיות והיכולות של הסוכן. ראו
  [SPINE וטריגרים](./spine-and-triggers).
- **הוסיפו ערוצים נוספים** -- חברו Telegram, Slack, Discord או WhatsApp
  ב-`triggerfish.yaml`. ראו [הגדרות](./configuration).
- **חברו אינטגרציות** -- `triggerfish connect google` עבור Google Workspace,
  `triggerfish connect github` עבור GitHub. ראו [אינטגרציות](/he-IL/integrations/).
- **הגדירו התנהגות פרואקטיבית** -- צרו `~/.triggerfish/TRIGGER.md` כדי לומר
  לסוכן מה לנטר. ראו [SPINE וטריגרים](./spine-and-triggers).
- **חקרו פקודות** -- למדו את כל פקודות ה-CLI ופקודות הצ'אט הזמינות. ראו
  [פקודות CLI](./commands).
