# פקודות CLI

Triggerfish מספקת CLI לניהול הסוכן, ה-daemon, הערוצים והסשנים. עמוד זה
מכסה כל פקודה זמינה וקיצור דרך בצ'אט.

## פקודות ליבה

### `triggerfish dive`

הריצו את אשף ההגדרה האינטראקטיבי. זוהי הפקודה הראשונה שאתם מריצים לאחר
ההתקנה וניתן להריץ אותה שוב בכל עת להגדרה מחדש.

```bash
triggerfish dive
```

האשף עובר 8 שלבים: ספק LLM, שם/אישיות הסוכן, הגדרת ערוץ, תוספים
אופציונליים, חיבור Google Workspace, חיבור GitHub, ספק חיפוש והתקנת daemon.
ראו [התחלה מהירה](./quickstart) להדרכה מלאה.

### `triggerfish chat`

התחילו סשן צ'אט אינטראקטיבי בטרמינל. זוהי פקודת ברירת המחדל כאשר מריצים
`triggerfish` ללא ארגומנטים.

```bash
triggerfish chat
```

ממשק הצ'אט כולל:

- סרגל קלט ברוחב מלא בתחתית הטרמינל
- תגובות בזרימה עם הצגת טוקנים בזמן אמת
- תצוגה קומפקטית של קריאות כלים (מתג עם Ctrl+O)
- היסטוריית קלט (נשמרת בין סשנים)
- ESC להפסקת תגובה רצה
- דחיסת שיחה לניהול סשנים ארוכים

### `triggerfish run`

הפעילו את שרת ה-Gateway בחזית. שימושי לפיתוח ואיתור באגים.

```bash
triggerfish run
```

ה-Gateway מנהל חיבורי WebSocket, מתאמי ערוצים, מנוע המדיניות ומצב הסשן.
בייצור, השתמשו ב-`triggerfish start` להרצה כ-daemon במקום.

### `triggerfish start`

התקינו והפעילו את Triggerfish כ-daemon ברקע באמצעות מנהל השירותים של מערכת
ההפעלה.

```bash
triggerfish start
```

| פלטפורמה | מנהל שירותים                     |
| --------- | -------------------------------- |
| macOS     | launchd                          |
| Linux     | systemd                          |
| Windows   | Windows Service / Task Scheduler |

ה-daemon מופעל אוטומטית בכניסה ושומר על הסוכן שלכם פעיל ברקע.

### `triggerfish stop`

עצרו את ה-daemon הרץ.

```bash
triggerfish stop
```

### `triggerfish status`

בדקו אם ה-daemon רץ כעת והציגו מידע מצב בסיסי.

```bash
triggerfish status
```

פלט לדוגמה:

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

צפו בפלט יומני ה-daemon.

```bash
# הצגת יומנים אחרונים
triggerfish logs

# הזרמת יומנים בזמן אמת
triggerfish logs --tail
```

### `triggerfish patrol`

הריצו בדיקת בריאות של התקנת Triggerfish.

```bash
triggerfish patrol
```

פלט לדוגמה:

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 3d 2h)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  3 channels active (CLI, Telegram, Slack)
  Policy engine loaded (12 rules, 3 custom)
  5 skills installed (2 bundled, 1 managed, 2 workspace)
  Secrets stored securely (macOS Keychain)
  2 cron jobs scheduled
  Webhook endpoints configured (2 active)

Overall: HEALTHY
```

Patrol בודק:

- מצב תהליך Gateway וזמן פעילות
- קישוריות ספק LLM
- בריאות מתאמי ערוץ
- טעינת כללי מנוע המדיניות
- מיומנויות מותקנות
- אחסון סודות
- תזמון משימות cron
- הגדרת נקודות קצה webhook
- זיהוי פורטים חשופים

### `triggerfish config`

נהלו את קובץ ההגדרות. משתמש בנתיבים מופרדים בנקודות ל-`triggerfish.yaml`.

```bash
# הגדרת כל ערך הגדרה
triggerfish config set <key> <value>

# קריאת כל ערך הגדרה
triggerfish config get <key>

# אימות תחביר ומבנה ההגדרות
triggerfish config validate

# הוספת ערוץ באופן אינטראקטיבי
triggerfish config add-channel [type]
```

דוגמאות:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

העבירו פרטי הזדהות בטקסט רגיל מ-`triggerfish.yaml` ל-keychain של מערכת ההפעלה.

```bash
triggerfish config migrate-secrets
```

זה סורק את ההגדרות שלכם למפתחות API, טוקנים וסיסמאות בטקסט רגיל, מאחסן
אותם ב-keychain של מערכת ההפעלה, ומחליף את ערכי הטקסט הרגיל בהפניות `secret:`.
גיבוי של הקובץ המקורי נוצר לפני כל שינוי.

ראו [ניהול סודות](/he-IL/security/secrets) לפרטים.

### `triggerfish connect`

חברו שירות חיצוני ל-Triggerfish.

```bash
triggerfish connect google    # Google Workspace (זרימת OAuth2)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** -- מתחיל את זרימת OAuth2. מבקש את OAuth Client ID
ו-Client Secret של Google Cloud, פותח דפדפן לאישור ומאחסן טוקנים באופן
מאובטח ב-keychain של מערכת ההפעלה. ראו
[Google Workspace](/he-IL/integrations/google-workspace) להוראות הגדרה מלאות
כולל כיצד ליצור פרטי הזדהות.

**GitHub** -- מנחה אתכם ביצירת Personal Access Token מפורט, מאמת אותו
מול API של GitHub ומאחסן אותו ב-keychain של מערכת ההפעלה. ראו
[GitHub](/he-IL/integrations/github) לפרטים.

### `triggerfish disconnect`

הסירו אימות עבור שירות חיצוני.

```bash
triggerfish disconnect google    # הסרת טוקני Google
triggerfish disconnect github    # הסרת טוקן GitHub
```

מסיר את כל הטוקנים המאוחסנים מה-keychain. ניתן להתחבר מחדש בכל עת.

### `triggerfish healthcheck`

הריצו בדיקת קישוריות מהירה מול ספק ה-LLM המוגדר. מחזיר הצלחה אם הספק
מגיב, או שגיאה עם פרטים.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

הציגו הערות שחרור לגרסה הנוכחית או לגרסה מוגדרת.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

בדקו עדכונים זמינים והתקינו אותם.

```bash
triggerfish update
```

### `triggerfish version`

הציגו את גרסת Triggerfish הנוכחית.

```bash
triggerfish version
```

## פקודות Skills

נהלו מיומנויות משוק The Reef ומסביבת העבודה המקומית.

```bash
triggerfish skill search "calendar"     # חיפוש מיומנויות ב-The Reef
triggerfish skill install google-cal    # התקנת מיומנות
triggerfish skill list                  # רשימת מיומנויות מותקנות
triggerfish skill update --all          # עדכון כל המיומנויות המותקנות
triggerfish skill publish               # פרסום מיומנות ב-The Reef
triggerfish skill create                # יצירת תבנית מיומנות חדשה
```

## פקודות סשן

בדקו ונהלו סשנים פעילים.

```bash
triggerfish session list                # רשימת סשנים פעילים
triggerfish session history             # צפייה בתמליל סשן
triggerfish session spawn               # יצירת סשן רקע
```

## פקודות Buoy <ComingSoon :inline="true" />

נהלו חיבורי מכשירים נלווים. Buoy עדיין אינו זמין.

```bash
triggerfish buoys list                  # רשימת buoys מחוברים
triggerfish buoys pair                  # התאמת מכשיר buoy חדש
```

## פקודות בתוך הצ'אט

פקודות אלו זמינות במהלך סשן צ'אט אינטראקטיבי (דרך `triggerfish chat` או
כל ערוץ מחובר). הן זמינות לבעלים בלבד.

| פקודה                   | תיאור                                                         |
| ----------------------- | ------------------------------------------------------------- |
| `/help`                 | הצגת פקודות בתוך הצ'אט הזמינות                                |
| `/status`               | הצגת מצב סשן: מודל, ספירת טוקנים, עלות, רמת Taint             |
| `/reset`                | איפוס Taint של הסשן והיסטוריית שיחה                            |
| `/compact`              | דחיסת היסטוריית שיחה באמצעות סיכום LLM                         |
| `/model <name>`         | החלפת מודל ה-LLM עבור הסשן הנוכחי                              |
| `/skill install <name>` | התקנת מיומנות מ-The Reef                                       |
| `/cron list`            | רשימת משימות cron מתוזמנות                                     |

## קיצורי מקלדת

קיצורי דרך אלו עובדים בממשק צ'אט ה-CLI:

| קיצור    | פעולה                                                                       |
| -------- | --------------------------------------------------------------------------- |
| ESC      | הפסקת תגובת ה-LLM הנוכחית                                                   |
| Ctrl+V   | הדבקת תמונה מלוח ההעתקה (ראו [תמונה וראייה](/he-IL/features/image-vision))  |
| Ctrl+O   | מתג תצוגת קריאות כלים קומפקטית/מורחבת                                       |
| Ctrl+C   | יציאה מסשן הצ'אט                                                            |
| Up/Down  | ניווט בהיסטוריית קלט                                                         |

::: tip הפסקת ESC שולחת אות ביטול דרך כל השרשרת -- מה-orchestrator דרך ספק
ה-LLM. התגובה נעצרת בצורה נקייה ותוכלו להמשיך את השיחה. :::

## פלט ניפוי באגים

Triggerfish כוללת רישום ניפוי באגים מפורט לאבחון בעיות ספק LLM, ניתוח קריאות
כלים והתנהגות לולאת הסוכן. הפעילו אותו על ידי הגדרת משתנה הסביבה
`TRIGGERFISH_DEBUG` ל-`1`.

::: tip הדרך המועדפת לשלוט ברמת פירוט היומנים היא דרך `triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose, או debug
```

משתנה הסביבה `TRIGGERFISH_DEBUG=1` עדיין נתמך לתאימות לאחור. ראו
[רישום מובנה](/he-IL/features/logging) לפרטים מלאים. :::

### מצב חזית

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

או עבור סשן צ'אט:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### מצב Daemon (systemd)

הוסיפו את משתנה הסביבה ליחידת שירות systemd שלכם:

```bash
systemctl --user edit triggerfish.service
```

הוסיפו תחת `[Service]`:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

אז הפעילו מחדש:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

צפו בפלט ניפוי באגים עם:

```bash
journalctl --user -u triggerfish.service -f
```

### מה נרשם

כאשר מצב ניפוי באגים מופעל, הבאים נכתבים ל-stderr:

| רכיב            | קידומת יומן    | פרטים                                                                                                                       |
| --------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator    | `[orch]`       | כל איטרציה: אורך system prompt, ספירת רשומות היסטוריה, תפקידים/גדלים של הודעות, ספירת קריאות כלים מנותחות, טקסט תגובה סופי  |
| OpenRouter      | `[openrouter]` | פיילוד בקשה מלא (מודל, ספירת הודעות, ספירת כלים), גוף תגובה גולמי, אורך תוכן, סיבת סיום, שימוש בטוקנים                     |
| ספקים אחרים     | `[provider]`   | סיכומי בקשה/תגובה (משתנה לפי ספק)                                                                                          |

פלט ניפוי באגים לדוגמה:

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning פלט ניפוי באגים כולל פיילודי בקשה ותגובה מלאים של LLM. אל
תשאירו אותו מופעל בייצור מכיוון שהוא עלול לרשום תוכן שיחה רגיש ל-stderr/journal. :::

## מדריך מהיר

```bash
# הגדרה וניהול
triggerfish dive              # אשף הגדרה
triggerfish start             # הפעלת daemon
triggerfish stop              # עצירת daemon
triggerfish status            # בדיקת מצב
triggerfish logs --tail       # הזרמת יומנים
triggerfish patrol            # בדיקת בריאות
triggerfish config set <k> <v> # הגדרת ערך הגדרה
triggerfish config get <key>  # קריאת ערך הגדרה
triggerfish config add-channel # הוספת ערוץ
triggerfish config migrate-secrets  # העברת סודות ל-keychain
triggerfish update            # בדיקת עדכונים
triggerfish version           # הצגת גרסה

# שימוש יומיומי
triggerfish chat              # צ'אט אינטראקטיבי
triggerfish run               # מצב חזית

# מיומנויות
triggerfish skill search      # חיפוש ב-The Reef
triggerfish skill install     # התקנת מיומנות
triggerfish skill list        # רשימת מותקנות
triggerfish skill create      # יצירת מיומנות חדשה

# סשנים
triggerfish session list      # רשימת סשנים
triggerfish session history   # צפייה בתמליל
```
