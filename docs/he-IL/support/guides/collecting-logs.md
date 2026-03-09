# איסוף לוגים

בעת דיווח על באג, חבילת לוג נותנת למתחזקים את המידע הנדרש לאבחון הבעיה ללא תכתובות חוזרות לבקשת פרטים.

## חבילה מהירה

הדרך המהירה ביותר ליצור חבילת לוג:

```bash
triggerfish logs bundle
```

זה יוצר ארכיון המכיל את כל קבצי הלוג מ-`~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

אם יצירת הארכיון נכשלת מכל סיבה, היא חוזרת להעתקת קבצי לוג גולמיים לספרייה שתוכלו לדחוס ידנית.

## מה מכילה החבילה

- `triggerfish.log` (קובץ לוג נוכחי)
- `triggerfish.1.log` עד `triggerfish.10.log` (גיבויים מסובבים, אם קיימים)

החבילה **אינה** מכילה:
- קובץ התצורה `triggerfish.yaml` שלכם
- מפתחות סודיים או אישורים
- מסד הנתונים SQLite
- SPINE.md או TRIGGER.md

## איסוף לוגים ידני

אם פקודת החבילה אינה זמינה (גרסה ישנה, Docker וכו'):

```bash
# מצאו קבצי לוג
ls ~/.triggerfish/logs/

# צרו ארכיון ידנית
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## הגברת פירוט הלוג

כברירת מחדל, לוגים ברמת INFO. ללכידת יותר פרטים לדיווח באג:

1. הגדירו רמת לוג ל-verbose או debug:
   ```bash
   triggerfish config set logging.level verbose
   # או לפירוט מקסימלי:
   triggerfish config set logging.level debug
   ```

2. שחזרו את הבעיה

3. אספו את החבילה:
   ```bash
   triggerfish logs bundle
   ```

4. החזירו את הרמה ל-normal:
   ```bash
   triggerfish config set logging.level normal
   ```

### פירוט רמת לוג

| רמה | מה היא לוכדת |
|------|---------------|
| `quiet` | שגיאות בלבד |
| `normal` | שגיאות, אזהרות, מידע (ברירת מחדל) |
| `verbose` | מוסיפה הודעות debug (קריאות כלים, אינטראקציות ספק, החלטות סיווג) |
| `debug` | הכל כולל הודעות ברמת trace (נתוני פרוטוקול גולמיים, שינויי מצב פנימיים) |

**אזהרה:** רמת `debug` מייצרת הרבה פלט. השתמשו בה רק כשמשחזרים בעיה באופן פעיל, ואז חזרו.

## סינון לוגים בזמן אמת

בזמן שחזור בעיה, ניתן לסנן את זרם הלוג החי:

```bash
# הציגו רק שגיאות
triggerfish logs --level ERROR

# הציגו אזהרות ומעלה
triggerfish logs --level WARN
```

ב-Linux/macOS, זה משתמש ב-`tail -f` מקורי עם סינון. ב-Windows, זה משתמש ב-PowerShell `Get-Content -Wait -Tail`.

## פורמט לוג

כל שורת לוג עוקבת אחר פורמט זה:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **חותמת זמן:** ISO 8601 ב-UTC
- **רמה:** ERROR, WARN, INFO, DEBUG או TRACE
- **רכיב:** איזה מודול יצר את הלוג (למשל `gateway`, `anthropic`, `telegram`, `policy`)
- **הודעה:** הודעת הלוג עם הקשר מובנה

## מה לכלול בדיווח באג

יחד עם חבילת הלוג, כללו:

1. **צעדים לשחזור.** מה עשיתם כשהבעיה קרתה?
2. **התנהגות צפויה.** מה היה אמור לקרות?
3. **התנהגות בפועל.** מה קרה במקום?
4. **מידע פלטפורמה.** מערכת הפעלה, ארכיטקטורה, גרסת Triggerfish (`triggerfish version`)
5. **קטע תצורה.** החלק הרלוונטי של `triggerfish.yaml` שלכם (צנזרו סודות)

ראו [דיווח על בעיות](/he-IL/support/guides/filing-issues) לרשימת הבדיקה המלאה.

## מידע רגיש בלוגים

Triggerfish מנקה נתונים חיצוניים בלוגים על ידי עטיפת ערכים בתוחמי `<<` ו-`>>`. מפתחות API וטוקנים לעולם לא אמורים להופיע בפלט לוג. עם זאת, לפני הגשת חבילת לוג:

1. סרקו כל דבר שאתם לא רוצים לשתף (כתובות אימייל, נתיבי קבצים, תוכן הודעות)
2. צנזרו במידת הצורך
3. ציינו ב-issue שלכם שהחבילה צונזרה

קבצי לוג מכילים תוכן הודעות מהשיחות שלכם. אם השיחות שלכם מכילות מידע רגיש, צנזרו חלקים אלו לפני שיתוף.
