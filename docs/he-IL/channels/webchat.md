# WebChat

ערוץ ה-WebChat מספק ווידג'ט צ'אט מובנה וניתן להטמעה המתחבר לסוכן
Triggerfish דרך WebSocket. הוא מיועד לאינטראקציות מול לקוחות, ווידג'טי
תמיכה, או כל תרחיש שבו אתם רוצים להציע חוויית צ'אט מבוססת רשת.

## סיווג ברירת מחדל

WebChat מוגדר כברירת מחדל לסיווג `PUBLIC`. זוהי ברירת מחדל נוקשה
מסיבה: **מבקרי רשת לעולם אינם מטופלים כבעלים**. כל הודעה מסשן
WebChat נושאת זיהום `PUBLIC` ללא קשר לתצורה.

::: warning מבקרים לעולם אינם בעלים בניגוד לערוצים אחרים בהם זהות
הבעלים מאומתת לפי מזהה משתמש או מספר טלפון, WebChat מגדיר
`isOwner: false` לכל החיבורים. משמעות הדבר שהסוכן לעולם לא יבצע
פקודות ברמת בעלים מסשן WebChat. זוהי החלטת אבטחה מכוונת -- לא ניתן
לאמת את זהותו של מבקר רשת אנונימי. :::

## הגדרה

### שלב 1: הגדרת Triggerfish

הוסיפו את ערוץ ה-WebChat ל-`triggerfish.yaml`:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| אפשרות           | סוג      | נדרש | תיאור                                    |
| ---------------- | -------- | ---- | ---------------------------------------- |
| `port`           | number   | לא   | פורט שרת WebSocket (ברירת מחדל: `8765`)  |
| `classification` | string   | לא   | רמת סיווג (ברירת מחדל: `PUBLIC`)         |
| `allowedOrigins` | string[] | לא   | מקורות CORS מותרים (ברירת מחדל: `["*"]`) |

### שלב 2: הפעלת Triggerfish

```bash
triggerfish stop && triggerfish start
```

שרת ה-WebSocket מתחיל להאזין על הפורט המוגדר.

### שלב 3: חיבור ווידג'ט צ'אט

התחברו לנקודת הקצה של ה-WebSocket מיישום הרשת שלכם:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // השרת הקצה מזהה סשן
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // תגובת הסוכן
    console.log("Agent:", frame.content);
  }
};

// שליחת הודעה
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## כיצד זה עובד

### זרימת חיבור

1. לקוח דפדפן פותח חיבור WebSocket לפורט המוגדר
2. Triggerfish משדרג את בקשת ה-HTTP ל-WebSocket
3. מזהה סשן ייחודי נוצר (`webchat-<uuid>`)
4. השרת שולח את מזהה הסשן ללקוח בפריים `session`
5. הלקוח שולח ומקבל פריימי `message` כ-JSON

### פורמט פריים הודעה

כל ההודעות הן אובייקטי JSON במבנה זה:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

סוגי פריימים:

| סוג       | כיוון            | תיאור                                     |
| --------- | ---------------- | ----------------------------------------- |
| `session` | שרת ללקוח        | נשלח בחיבור עם מזהה הסשן שהוקצה          |
| `message` | שניהם            | הודעת צ'אט עם תוכן טקסט                  |
| `ping`    | שניהם            | שמירת חיים                                 |
| `pong`    | שניהם            | תגובת שמירת חיים                           |

### ניהול סשנים

כל חיבור WebSocket מקבל סשן משלו. כאשר החיבור נסגר, הסשן מוסר
ממפת החיבורים הפעילים. אין חידוש סשן -- אם החיבור נפסק, מזהה סשן
חדש מוקצה בחיבור מחדש.

## בדיקת תקינות

שרת ה-WebSocket גם מגיב לבקשות HTTP רגילות עם בדיקת תקינות:

```bash
curl http://localhost:8765
# תגובה: "WebChat OK"
```

זה שימושי לבדיקות תקינות של מאזן עומסים וניטור.

## מחווני הקלדה

Triggerfish שולח ומקבל מחווני הקלדה דרך WebChat. כאשר הסוכן מעבד,
פריים מחוון הקלדה נשלח ללקוח. הווידג'ט יכול להציג זאת כדי להראות
שהסוכן חושב.

## שיקולי אבטחה

- **כל המבקרים הם חיצוניים** -- `isOwner` תמיד `false`. הסוכן לא
  יבצע פקודות בעלים מ-WebChat.
- **זיהום PUBLIC** -- כל הודעה מזוהמת כ-`PUBLIC` ברמת הסשן. הסוכן
  אינו יכול לגשת או להחזיר נתונים מעל סיווג `PUBLIC` בסשן WebChat.
- **CORS** -- הגדירו `allowedOrigins` להגבלת אילו דומיינים יכולים
  להתחבר. ברירת המחדל `["*"]` מאפשרת כל מקור, מה שמתאים לפיתוח אך
  צריך להיות מוגבל בייצור.

::: tip הגבילו מקורות בייצור לפריסות ייצור, ציינו תמיד את המקורות
המותרים באופן מפורש:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## שינוי סיווג

בעוד WebChat מוגדר כברירת מחדל ל-`PUBLIC`, ניתן טכנית להגדיר אותו
לרמה אחרת. אולם, מכיוון ש-`isOwner` תמיד `false`, הסיווג האפקטיבי
לכל ההודעות נשאר `PUBLIC` עקב כלל הסיווג האפקטיבי
(`min(channel, recipient)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # מותר, אבל isOwner עדיין false
```

רמות תקפות: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
