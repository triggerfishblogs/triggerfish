# SDK תוספים וארגז חול

תוספי Triggerfish מאפשרים לכם להרחיב את הסוכן עם קוד מותאם המתקשר
עם מערכות חיצוניות -- שאילתות CRM, פעולות בסיס נתונים, אינטגרציות API,
זרימות עבודה רב-שלביות -- תוך הרצה בתוך ארגז חול כפול שמונע מהקוד
לבצע כל דבר שלא הורשה לו באופן מפורש.

## סביבת ריצה

תוספים רצים על Deno + Pyodide (WASM). ללא Docker. ללא מכולות. ללא
דרישות מוקדמות מעבר להתקנת Triggerfish עצמה.

- **תוספי TypeScript** רצים ישירות בארגז החול של Deno
- **תוספי Python** רצים בתוך Pyodide (מפרש Python שקומפל ל-WebAssembly),
  שעצמו רץ בתוך ארגז החול של Deno

<img src="/diagrams/plugin-sandbox.svg" alt="ארגז חול לתוספים: ארגז חול Deno עוטף ארגז חול WASM, קוד התוסף רץ בשכבה הפנימית ביותר" style="max-width: 100%;" />

ארכיטקטורת ארגז חול כפול זו מבטיחה שגם אם תוסף מכיל קוד זדוני, הוא
אינו יכול לגשת למערכת הקבצים, לבצע קריאות רשת לא מוצהרות, או לברוח
למערכת המארחת.

## מה תוספים יכולים לעשות

לתוספים יש פנים גמיש בתוך גבולות מחמירים. בתוך ארגז החול, התוסף יכול:

- לבצע פעולות CRUD מלאות במערכות יעד (באמצעות הרשאות המשתמש)
- לבצע שאילתות וטרנספורמציות נתונים מורכבות
- לתזמר זרימות עבודה רב-שלביות
- לעבד ולנתח נתונים
- לשמור מצב תוסף בין הפעלות
- לקרוא לכל נקודת קצה API חיצונית מוצהרת

## מה תוספים אינם יכולים לעשות

| מגבלה                                     | כיצד נאכפת                                                     |
| ---------------------------------------- | -------------------------------------------------------------- |
| גישה לנקודות רשת לא מוצהרות              | ארגז החול חוסם כל קריאות רשת שאינן ברשימת ההיתר               |
| פליטת נתונים ללא תווית סיווג              | ה-SDK דוחה נתונים לא מסווגים                                   |
| קריאת נתונים ללא הפצת זיהום               | ה-SDK מזהם אוטומטית את הסשן כאשר ניגשים לנתונים               |
| שמירת נתונים מחוץ ל-Triggerfish           | ללא גישה למערכת קבצים מתוך ארגז החול                           |
| חילוץ דרך ערוצים צדדיים                   | מגבלות משאבים נאכפות, ללא גישה ל-socket גולמי                  |
| שימוש באישורי מערכת                       | ה-SDK חוסם `get_system_credential()`; אישורי משתמש בלבד       |

::: warning אבטחה `sdk.get_system_credential()` **חסום** בתכנון.
תוספים חייבים תמיד להשתמש באישורי משתמש מואצלים דרך
`sdk.get_user_credential()`. זה מבטיח שהסוכן יכול לגשת רק למה שהמשתמש
יכול לגשת -- לעולם לא יותר. :::

## שיטות SDK לתוספים

ה-SDK מספק ממשק מבוקר לתוספים לתקשורת עם מערכות חיצוניות ופלטפורמת
Triggerfish.

### גישה לאישורים

```typescript
// קבלת אישור מואצל של המשתמש לשירות
const credential = await sdk.get_user_credential("salesforce");

// בדיקה אם המשתמש חיבר שירות
const connected = await sdk.has_user_connection("notion");
```

### פעולות נתונים

```typescript
// שאילתת מערכת חיצונית באמצעות הרשאות המשתמש
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// פליטת נתונים חזרה לסוכן — תווית סיווג נדרשת
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info כל קריאה ל-`sdk.emitData()` דורשת תווית `classification`. אם
משמיטים אותה, ה-SDK דוחה את הקריאה. זה מבטיח שכל הנתונים הזורמים
מתוספים להקשר הסוכן מסווגים כראוי. :::

## מחזור חיי תוסף

כל תוסף עוקב אחר מחזור חיים שמבטיח סקירת אבטחה לפני הפעלה.

```
1. תוסף נוצר (על ידי משתמש, סוכן או צד שלישי)
       |
       v
2. תוסף נבנה באמצעות Plugin SDK
   - חייב ליישם ממשקים נדרשים
   - חייב להצהיר על נקודות קצה ויכולות
   - חייב לעבור אימות
       |
       v
3. תוסף נכנס למצב UNTRUSTED
   - הסוכן אינו יכול להשתמש בו
   - הבעלים/מנהל מקבל הודעה: "ממתין לסיווג"
       |
       v
4. בעלים (אישי) או מנהל (ארגוני) סוקר:
   - לאילו נתונים תוסף זה ניגש?
   - אילו פעולות הוא יכול לבצע?
   - מקצה רמת סיווג
       |
       v
5. תוסף פעיל בסיווג שהוקצה
   - הסוכן יכול להפעיל בתוך מגבלות מדיניות
   - כל ההפעלות עוברות דרך ווי מדיניות
```

::: tip ברמה האישית, אתם הבעלים -- אתם סוקרים ומסווגים את התוספים שלכם.
ברמה הארגונית, מנהל מנהל את רישום התוספים ומקצה רמות סיווג. :::

## חיבוריות בסיס נתונים

דרייברים מקומיים לבסיסי נתונים (psycopg2, mysqlclient, וכו') אינם
עובדים בתוך ארגז החול WASM. תוספים מתחברים לבסיסי נתונים דרך API
מבוססי HTTP במקום.

| בסיס נתונים | אפשרות מבוססת HTTP             |
| ----------- | ------------------------------ |
| PostgreSQL  | PostgREST, Supabase SDK, Neon API |
| MySQL       | PlanetScale API                |
| MongoDB     | Atlas Data API                 |
| Snowflake   | REST API                       |
| BigQuery    | REST API                       |
| DynamoDB    | AWS SDK (HTTP)                 |

זהו יתרון אבטחה, לא מגבלה. כל גישה לבסיס נתונים זורמת דרך בקשות HTTP
הניתנות לבדיקה ולשליטה שארגז החול יכול לאכוף ומערכת הביקורת יכולה
לתעד.

## כתיבת תוסף TypeScript

תוסף TypeScript מינימלי השואל REST API:

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // בדיקה אם המשתמש חיבר את השירות
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // שאילתה באמצעות אישורי המשתמש
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // פליטת נתונים מסווגים חזרה לסוכן
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## כתיבת תוסף Python

תוסף Python מינימלי:

```python
async def execute(sdk):
    # בדיקת חיבור
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # שאילתה באמצעות אישורי המשתמש
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # פליטה עם סיווג
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

תוספי Python רצים בתוך סביבת ריצה Pyodide WASM. מודולי ספרייה
סטנדרטית זמינים, אך הרחבות C מקומיות אינן. השתמשו ב-API מבוססי HTTP
לקישוריות חיצונית.

## סיכום אבטחת תוספים

- תוספים רצים בארגז חול כפול (Deno + WASM) עם בידוד מחמיר
- כל גישת רשת חייבת להיות מוצהרת במניפסט התוסף
- כל נתונים שנפלטים חייבים לשאת תווית סיווג
- אישורי מערכת חסומים -- רק אישורי משתמש מואצלים זמינים
- כל תוסף נכנס למערכת כ-`UNTRUSTED` וחייב להיות מסווג לפני שימוש
- כל הפעלות תוסף עוברות דרך ווי מדיניות ומבוקרות במלואן
