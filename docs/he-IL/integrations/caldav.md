# אינטגרציית CalDAV

חברו את סוכן ה-Triggerfish שלכם לכל שרת לוח שנה תואם CalDAV. זה מאפשר
פעולות לוח שנה בין ספקים התומכים בתקן CalDAV, כולל iCloud, Fastmail,
Nextcloud, Radicale וכל שרת CalDAV באירוח עצמי.

## ספקים נתמכים

| ספק        | כתובת CalDAV                                     | הערות                         |
| ---------- | ----------------------------------------------- | ----------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | דורש סיסמה ייעודית לאפליקציה  |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | CalDAV סטנדרטי                |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | אירוח עצמי                    |
| Radicale   | `https://your-server.com`                       | אירוח עצמי קל-משקל            |
| Baikal     | `https://your-server.com/dav.php`               | אירוח עצמי                    |

::: info עבור Google Calendar, השתמשו באינטגרציית
[Google Workspace](/he-IL/integrations/google-workspace) במקום, המשתמשת
ב-API המקורי של Google עם OAuth2. CalDAV מיועד לספקי לוח שנה שאינם
Google. :::

## הגדרה

### שלב 1: קבלת אישורי CalDAV

אתם צריכים שלושה פרטי מידע מספק לוח השנה שלכם:

- **כתובת CalDAV** -- כתובת URL הבסיסית של שרת ה-CalDAV
- **שם משתמש** -- שם המשתמש או הדוא"ל שלכם
- **סיסמה** -- סיסמת החשבון או סיסמה ייעודית לאפליקציה

::: warning סיסמאות ייעודיות לאפליקציה רוב הספקים דורשים סיסמה ייעודית
לאפליקציה במקום סיסמת החשבון הראשית. בדקו בתיעוד הספק שלכם כיצד ליצור
אחת. :::

### שלב 2: הגדרת Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # סיסמה מאוחסנת ב-OS keychain
    classification: CONFIDENTIAL
```

| אפשרות           | סוג    | נדרש | תיאור                                               |
| ---------------- | ------ | ---- | --------------------------------------------------- |
| `url`            | string | כן   | כתובת URL בסיסית של שרת CalDAV                       |
| `username`       | string | כן   | שם משתמש או דוא"ל של החשבון                          |
| `password`       | string | כן   | סיסמת חשבון (מאוחסנת ב-OS keychain)                  |
| `classification` | string | לא   | רמת סיווג (ברירת מחדל: `CONFIDENTIAL`)               |

### שלב 3: גילוי לוחות שנה

בחיבור הראשון, הסוכן מריץ גילוי CalDAV למציאת כל לוחות השנה הזמינים.
לוחות השנה שנמצאו נשמרים במטמון מקומי.

```bash
triggerfish connect caldav
```

## כלים זמינים

| כלי                 | תיאור                                                    |
| ------------------- | -------------------------------------------------------- |
| `caldav_list`       | רשימת כל לוחות השנה בחשבון                                |
| `caldav_events`     | שליפת אירועים לטווח תאריכים מלוח שנה אחד או מכולם        |
| `caldav_create`     | יצירת אירוע לוח שנה חדש                                  |
| `caldav_update`     | עדכון אירוע קיים                                         |
| `caldav_delete`     | מחיקת אירוע                                              |
| `caldav_search`     | חיפוש אירועים לפי שאילתת טקסט                             |
| `caldav_freebusy`   | בדיקת מצב פנוי/תפוס לטווח זמן                            |

## סיווג

נתוני לוח שנה מוגדרים כברירת מחדל ל-`CONFIDENTIAL` כיוון שהם מכילים שמות,
לוחות זמנים, מיקומים ופרטי פגישות. גישה לכל כלי CalDAV מעלה את זיהום הסשן
לרמת הסיווג המוגדרת.

## אימות

CalDAV משתמש ב-HTTP Basic Auth מעל TLS. אישורים מאוחסנים ב-OS keychain
ומוזרקים בשכבת ה-HTTP מתחת להקשר ה-LLM -- הסוכן לעולם אינו רואה את
הסיסמה הגולמית.

## דפים קשורים

- [Google Workspace](/he-IL/integrations/google-workspace) -- עבור Google
  Calendar (משתמש ב-API המקורי)
- [Cron וטריגרים](/he-IL/features/cron-and-triggers) -- תזמון פעולות סוכן
  מבוססות לוח שנה
- [מדריך סיווג](/he-IL/guide/classification-guide) -- בחירת רמת הסיווג
  הנכונה
