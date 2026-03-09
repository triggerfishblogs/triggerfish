# Signal

חברו את סוכן ה-Triggerfish שלכם ל-Signal כדי שאנשים יוכלו לשלוח לו
הודעות מאפליקציית Signal. המתאם מתקשר עם daemon של
[signal-cli](https://github.com/AsamK/signal-cli) דרך JSON-RPC,
באמצעות מספר הטלפון המקושר שלכם ב-Signal.

## כיצד Signal שונה

מתאם ה-Signal **הוא** מספר הטלפון שלכם. בניגוד ל-Telegram או Slack
שבהם קיים חשבון בוט נפרד, הודעות Signal מגיעות מאנשים אחרים למספר
שלכם. משמעות הדבר:

- לכל ההודעות הנכנסות `isOwner: false` -- הן תמיד ממישהו אחר
- המתאם משיב כמספר הטלפון שלכם
- אין בדיקת בעלים לכל הודעה כמו בערוצים אחרים

זה הופך את Signal לאידיאלי לקבלת הודעות מאנשי קשר ששולחים למספר
שלכם, כאשר הסוכן מגיב בשמכם.

## סיווג ברירת מחדל

Signal מוגדר כברירת מחדל לסיווג `PUBLIC`. מכיוון שכל ההודעות הנכנסות
מגיעות מאנשי קשר חיצוניים, `PUBLIC` הוא ברירת המחדל הבטוחה.

## הגדרה

### שלב 1: התקנת signal-cli

signal-cli הוא לקוח שורת פקודה של צד שלישי ל-Signal. Triggerfish
מתקשר איתו דרך TCP או Unix socket.

**Linux (בנייה מקומית -- ללא צורך ב-Java):**

הורידו את הבנייה המקומית העדכנית מעמוד
[שחרורי signal-cli](https://github.com/AsamK/signal-cli/releases), או
תנו ל-Triggerfish להוריד עבורכם במהלך ההגדרה.

**macOS / פלטפורמות אחרות (בניית JVM):**

דורש Java 21+. Triggerfish יכול להוריד JRE נייד אוטומטית אם Java אינו
מותקן.

ניתן גם להריץ את ההגדרה המודרכת:

```bash
triggerfish config add-channel signal
```

זה בודק את signal-cli, מציע להוריד אם חסר, ומלווה אתכם בקישור.

### שלב 2: קישור המכשיר

signal-cli חייב להיות מקושר לחשבון ה-Signal הקיים (כמו קישור
אפליקציית שולחן עבודה):

```bash
signal-cli link -n "Triggerfish"
```

זה מדפיס URI של `tsdevice:`. סרקו את קוד ה-QR עם אפליקציית Signal
בנייד (הגדרות > מכשירים מקושרים > קשר מכשיר חדש).

### שלב 3: הפעלת ה-Daemon

signal-cli רץ כ-daemon ברקע ש-Triggerfish מתחבר אליו:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

החליפו `+14155552671` במספר הטלפון שלכם בפורמט E.164.

### שלב 4: הגדרת Triggerfish

הוסיפו Signal ל-`triggerfish.yaml`:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| אפשרות             | סוג     | נדרש | תיאור                                                                           |
| ------------------- | ------- | ---- | ------------------------------------------------------------------------------- |
| `endpoint`          | string  | כן   | כתובת daemon של signal-cli (`tcp://host:port` או `unix:///path/to/socket`)      |
| `account`           | string  | כן   | מספר הטלפון שלכם ב-Signal (פורמט E.164)                                        |
| `classification`    | string  | לא   | תקרת סיווג (ברירת מחדל: `PUBLIC`)                                              |
| `defaultGroupMode`  | string  | לא   | טיפול בהודעות קבוצתיות: `always`, `mentioned-only`, `owner-only` (ברירת מחדל: `always`) |
| `groups`            | object  | לא   | דריסות תצורה לכל קבוצה                                                         |
| `ownerPhone`        | string  | לא   | שמור לשימוש עתידי                                                               |
| `pairing`           | boolean | לא   | הפעלת מצב צימוד במהלך ההגדרה                                                    |

### שלב 5: הפעלת Triggerfish

```bash
triggerfish stop && triggerfish start
```

שלחו הודעה למספר הטלפון שלכם ממשתמש Signal אחר לאישור החיבור.

## הודעות קבוצתיות

Signal תומך בצ'אטים קבוצתיים. ניתן לשלוט כיצד הסוכן מגיב להודעות
קבוצתיות:

| מצב              | התנהגות                                               |
| ---------------- | ----------------------------------------------------- |
| `always`         | הגיבו לכל ההודעות הקבוצתיות (ברירת מחדל)             |
| `mentioned-only` | הגיבו רק כשמוזכרים לפי מספר טלפון או @mention        |
| `owner-only`     | לעולם אל תגיבו בקבוצות                               |

הגדירו באופן גלובלי או לכל קבוצה:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

מזהי קבוצות הם מזהים מקודדים ב-base64. השתמשו ב-
`triggerfish signal list-groups` או בדקו את תיעוד signal-cli למציאתם.

## חלוקת הודעות

ל-Signal מגבלת הודעה של 4,000 תווים. תגובות ארוכות מזה מחולקות
אוטומטית למספר הודעות, עם חלוקה על שורות חדשות או רווחים לצורך קריאות.

## מחווני הקלדה

המתאם שולח מחווני הקלדה בזמן שהסוכן מעבד בקשה. מצב ההקלדה מתנקה
כאשר התשובה נשלחת.

## כלים מורחבים

מתאם ה-Signal חושף כלים נוספים:

- `sendTyping` / `stopTyping` -- שליטה ידנית במחווני הקלדה
- `listGroups` -- רשימת כל קבוצות Signal שהחשבון חבר בהן
- `listContacts` -- רשימת כל אנשי הקשר ב-Signal

## שינוי סיווג

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

רמות תקפות: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

הפעילו מחדש את ה-daemon לאחר שינוי: `triggerfish stop && triggerfish start`

## תכונות אמינות

מתאם ה-Signal כולל מספר מנגנוני אמינות:

### חיבור מחדש אוטומטי

אם החיבור ל-signal-cli נופל (הפרעת רשת, הפעלה מחדש של daemon), המתאם
מתחבר מחדש אוטומטית עם backoff מעריכי. ללא צורך בהתערבות ידנית.

### בדיקת תקינות

באתחול, Triggerfish בודק אם daemon signal-cli קיים תקין באמצעות בדיקת
JSON-RPC ping. אם ה-daemon אינו מגיב, הוא נהרג ומופעל מחדש אוטומטית.

### מעקב גרסאות

Triggerfish עוקב אחר גרסת signal-cli ידועה-כתקינה (כרגע 0.13.0) ומזהיר
באתחול אם הגרסה המותקנת ישנה יותר. גרסת signal-cli נרשמת בכל חיבור
מוצלח.

### תמיכה ב-Unix Socket

בנוסף לנקודות קצה TCP, המתאם תומך ב-Unix domain sockets:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## פתרון בעיות

**daemon של signal-cli אינו נגיש:**

- וודאו שה-daemon רץ: בדקו את התהליך או נסו
  `nc -z 127.0.0.1 7583`
- signal-cli נקשר ל-IPv4 בלבד -- השתמשו ב-`127.0.0.1`, לא ב-`localhost`
- פורט TCP ברירת מחדל הוא 7583
- Triggerfish יפעיל מחדש את ה-daemon אוטומטית אם הוא מזהה תהליך לא תקין

**הודעות אינן מגיעות:**

- אשרו שהמכשיר מקושר: בדקו באפליקציית Signal בנייד תחת מכשירים מקושרים
- signal-cli חייב לקבל לפחות סנכרון אחד לאחר הקישור
- בדקו יומנים לשגיאות חיבור: `triggerfish logs --tail`

**שגיאות Java (בניית JVM בלבד):**

- בניית JVM של signal-cli דורשת Java 21+
- הריצו `java -version` לבדיקה
- Triggerfish יכול להוריד JRE נייד במהלך ההגדרה אם נדרש

**לולאות חיבור מחדש:**

- אם אתם רואים ניסיונות חיבור מחדש חוזרים ביומנים, ה-daemon של
  signal-cli עשוי לקרוס
- בדקו את פלט stderr של signal-cli עצמו לשגיאות
- נסו להפעיל מחדש עם daemon חדש: עצרו Triggerfish, הרגו signal-cli,
  הפעילו מחדש את שניהם
