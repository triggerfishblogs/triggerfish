# Slack

חברו את סוכן ה-Triggerfish שלכם ל-Slack כדי שהסוכן יוכל להשתתף בשיחות
מרחב העבודה. המתאם משתמש בפריימוורק [Bolt](https://slack.dev/bolt-js/)
עם Socket Mode, מה שמשמעו שלא נדרש URL ציבורי או נקודת webhook.

## סיווג ברירת מחדל

Slack מוגדר כברירת מחדל לסיווג `PUBLIC`. זה משקף את המציאות שמרחבי
עבודה של Slack כוללים לעיתים קרובות אורחים חיצוניים, משתמשי Slack
Connect וערוצים משותפים. ניתן להעלות זאת ל-`INTERNAL` או גבוה יותר אם
מרחב העבודה שלכם פנימי לחלוטין.

## הגדרה

### שלב 1: יצירת אפליקציית Slack

1. גשו ל-[api.slack.com/apps](https://api.slack.com/apps)
2. לחצו **Create New App**
3. בחרו **From scratch**
4. תנו שם לאפליקציה (למשל, "Triggerfish") ובחרו את מרחב העבודה
5. לחצו **Create App**

### שלב 2: הגדרת הרשאות טוקן בוט

נווטו ל-**OAuth & Permissions** בסרגל הצד והוסיפו את **Bot Token
Scopes** הבאים:

| הרשאה             | מטרה                              |
| ------------------ | --------------------------------- |
| `chat:write`       | שליחת הודעות                     |
| `channels:history` | קריאת הודעות בערוצים ציבוריים    |
| `groups:history`   | קריאת הודעות בערוצים פרטיים      |
| `im:history`       | קריאת הודעות ישירות              |
| `mpim:history`     | קריאת הודעות ישירות קבוצתיות     |
| `channels:read`    | רשימת ערוצים ציבוריים             |
| `groups:read`      | רשימת ערוצים פרטיים               |
| `im:read`          | רשימת שיחות הודעות ישירות        |
| `users:read`       | חיפוש מידע משתמשים               |

### שלב 3: הפעלת Socket Mode

1. נווטו ל-**Socket Mode** בסרגל הצד
2. העבירו את **Enable Socket Mode** למצב פעיל
3. תתבקשו ליצור **App-Level Token** -- תנו לו שם (למשל,
   "triggerfish-socket") והוסיפו את ההרשאה `connections:write`
4. העתיקו את **App Token** שנוצר (מתחיל ב-`xapp-`)

### שלב 4: הפעלת אירועים

1. נווטו ל-**Event Subscriptions** בסרגל הצד
2. העבירו את **Enable Events** למצב פעיל
3. תחת **Subscribe to bot events**, הוסיפו:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### שלב 5: קבלת האישורים

אתם צריכים שלושה ערכים:

- **Bot Token** -- גשו ל-**OAuth & Permissions**, לחצו **Install to
  Workspace**, ואז העתיקו את **Bot User OAuth Token** (מתחיל ב-`xoxb-`)
- **App Token** -- הטוקן שיצרתם בשלב 3 (מתחיל ב-`xapp-`)
- **Signing Secret** -- גשו ל-**Basic Information**, גללו ל-**App
  Credentials**, והעתיקו את **Signing Secret**

### שלב 6: קבלת מזהה המשתמש שלכם ב-Slack

להגדרת זהות הבעלים:

1. פתחו את Slack
2. לחצו על תמונת הפרופיל שלכם בפינה העליונה
3. לחצו **Profile**
4. לחצו על תפריט שלוש הנקודות ובחרו **Copy member ID**

### שלב 7: הגדרת Triggerfish

הוסיפו את ערוץ ה-Slack ל-`triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret מאוחסנים ב-OS keychain
    ownerId: "U01234ABC"
```

סודות (טוקן בוט, טוקן אפליקציה, signing secret) מוזנים במהלך
`triggerfish config add-channel slack` ומאוחסנים ב-OS keychain.

| אפשרות           | סוג    | נדרש      | תיאור                                      |
| ---------------- | ------ | --------- | ------------------------------------------ |
| `ownerId`        | string | מומלץ     | מזהה החבר שלכם ב-Slack לאימות בעלים        |
| `classification` | string | לא        | רמת סיווג (ברירת מחדל: `PUBLIC`)           |

::: warning אחסנו סודות בבטחה לעולם אל תכניסו טוקנים או סודות לניהול
גרסאות. השתמשו במשתני סביבה או ב-OS keychain. ראו
[ניהול סודות](/he-IL/security/secrets) לפרטים. :::

### שלב 8: הזמנת הבוט

לפני שהבוט יכול לקרוא או לשלוח הודעות בערוץ, עליכם להזמין אותו:

1. פתחו את ערוץ ה-Slack שבו אתם רוצים את הבוט
2. הקלידו `/invite @Triggerfish` (או השם שנתתם לאפליקציה)

הבוט יכול גם לקבל הודעות ישירות ללא הזמנה לערוץ.

### שלב 9: הפעלת Triggerfish

```bash
triggerfish stop && triggerfish start
```

שלחו הודעה בערוץ שבו הבוט נמצא, או שלחו לו הודעה ישירה, לאישור
החיבור.

## זהות בעלים

Triggerfish משתמש בזרימת ה-OAuth של Slack לאימות בעלים. כאשר הודעה
מגיעה, המתאם משווה את מזהה המשתמש ב-Slack של השולח מול ה-`ownerId`
המוגדר:

- **התאמה** -- פקודת בעלים
- **ללא התאמה** -- קלט חיצוני עם זיהום `PUBLIC`

### חברות מרחב עבודה

לסיווג נמענים, חברות במרחב העבודה של Slack קובעת אם משתמש הוא
`INTERNAL` או `EXTERNAL`:

- חברי מרחב עבודה רגילים הם `INTERNAL`
- משתמשי Slack Connect חיצוניים הם `EXTERNAL`
- משתמשי אורח הם `EXTERNAL`

## מגבלות הודעות

Slack תומך בהודעות עד 40,000 תווים. הודעות החורגות ממגבלה זו נחתכות.
לרוב תגובות הסוכן, מגבלה זו לעולם אינה מושגת.

## מחווני הקלדה

Triggerfish שולח מחווני הקלדה ל-Slack כאשר הסוכן מעבד בקשה. Slack
אינו חושף אירועי הקלדה נכנסים לבוטים, כך שזה שליחה בלבד.

## צ'אט קבוצתי

הבוט יכול להשתתף בערוצים קבוצתיים. הגדירו התנהגות קבוצתית ב-
`triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| התנהגות          | תיאור                                   |
| ---------------- | --------------------------------------- |
| `mentioned-only` | הגיבו רק כשהבוט מוזכר עם @              |
| `always`         | הגיבו לכל ההודעות בערוץ                  |

## שינוי סיווג

```yaml
channels:
  slack:
    classification: INTERNAL
```

רמות תקפות: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
