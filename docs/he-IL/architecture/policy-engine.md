# מנוע מדיניות ו-Hook-ים

מנוע המדיניות הוא שכבת האכיפה שיושבת בין ה-LLM לעולם החיצוני. הוא מיירט כל
פעולה בנקודות קריטיות בזרימת הנתונים ומקבל החלטות דטרמיניסטיות של ALLOW, BLOCK
או REDACT. ה-LLM לא יכול לעקוף, לשנות או להשפיע על החלטות אלו.

## עיקרון ליבה: אכיפה מתחת ל-LLM

<img src="/diagrams/policy-enforcement-layers.svg" alt="שכבות אכיפת מדיניות: ה-LLM יושב מעל שכבת המדיניות, שיושבת מעל שכבת הביצוע" style="max-width: 100%;" />

::: warning אבטחה ה-LLM יושב מעל שכבת המדיניות. הוא יכול לעבור prompt injection,
jailbreak או מניפולציה -- וזה לא משנה. שכבת המדיניות היא קוד טהור שרץ מתחת
ל-LLM, בוחן בקשות פעולה מובנות ומקבל החלטות בינאריות בהתבסס על כללי סיווג.
אין נתיב מפלט ה-LLM לעקיפת Hook. :::

## סוגי Hook-ים

שמונה Hook-י אכיפה מיירטים פעולות בכל נקודה קריטית בזרימת הנתונים.

### ארכיטקטורת Hook-ים

<img src="/diagrams/hook-chain-flow.svg" alt="זרימת שרשרת Hook-ים: PRE_CONTEXT_INJECTION → הקשר LLM → PRE_TOOL_CALL → הרצת כלי → POST_TOOL_RESPONSE → תגובת LLM → PRE_OUTPUT → ערוץ פלט" style="max-width: 100%;" />

### כל סוגי ה-Hook-ים

| Hook                    | טריגר                          | פעולות מפתח                                                          | מצב כשל             |
| ----------------------- | ------------------------------ | -------------------------------------------------------------------- | -------------------- |
| `PRE_CONTEXT_INJECTION` | קלט חיצוני נכנס להקשר          | סיווג קלט, הקצאת Taint, יצירת שושלת, סריקת הזרקות                   | דחיית קלט            |
| `PRE_TOOL_CALL`         | LLM מבקש הרצת כלי              | בדיקת הרשאות, הגבלת קצב, אימות פרמטרים                              | חסימת קריאת כלי      |
| `POST_TOOL_RESPONSE`    | כלי מחזיר נתונים               | סיווג תגובה, עדכון Taint של סשן, יצירת/עדכון שושלת                  | הסתרה או חסימה       |
| `PRE_OUTPUT`            | תגובה עומדת לצאת מהמערכת       | בדיקת סיווג סופית מול יעד, סריקת PII                                | חסימת פלט            |
| `SECRET_ACCESS`         | תוסף מבקש פרטי הזדהות          | תיעוד גישה, אימות הרשאה מול היקף מוצהר                              | דחיית פרטי הזדהות    |
| `SESSION_RESET`         | משתמש מבקש איפוס Taint         | ארכוב שושלת, ניקוי הקשר, אימות אישור                                | דרישת אישור          |
| `AGENT_INVOCATION`      | סוכן קורא לסוכן אחר            | אימות שרשרת האצלה, אכיפת תקרת Taint                                | חסימת קריאה          |
| `MCP_TOOL_CALL`         | הפעלת כלי שרת MCP              | בדיקת מדיניות Gateway (סטטוס שרת, הרשאות כלי, סכמה)                | חסימת קריאת MCP      |

## ממשק Hook

כל Hook מקבל הקשר ומחזיר תוצאה. המטפל הוא פונקציה סינכרונית טהורה.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // מטען ספציפי ל-Hook משתנה לפי סוג
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` הוא סינכרוני ומחזיר `HookResult` ישירות -- לא Promise.
זה בכוונה. Hook-ים חייבים להסתיים לפני שהפעולה ממשיכה, והפיכתם לסינכרוניים
מבטלת כל אפשרות של עקיפה אסינכרונית. אם Hook חורג מזמן, הפעולה נדחית. :::

## ערבויות Hook

כל הרצת Hook נושאת ארבעה עקרונות קבועים:

| ערבות              | מה זה אומר                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **דטרמיניסטי**     | אותו קלט תמיד מייצר את אותה החלטה. ללא אקראיות. ללא קריאות LLM בתוך Hook-ים. ללא קריאות API חיצוניות שמשפיעות על החלטות.            |
| **סינכרוני**       | Hook-ים מסתיימים לפני שהפעולה ממשיכה. עקיפה אסינכרונית בלתי אפשרית. חריגת זמן שווה לדחייה.                                         |
| **מתועד**          | כל הרצת Hook מתועדת: פרמטרי קלט, החלטה שהתקבלה, חותמת זמן וכללי מדיניות שהוערכו.                                                    |
| **בלתי ניתן לזיוף** | פלט LLM לא יכול להכיל הוראות לעקיפת Hook. לשכבת ה-Hook-ים אין לוגיקה של "ניתוח פלט LLM בחיפוש פקודות".                             |

## היררכיית כללי מדיניות

כללי מדיניות מאורגנים בשלוש רמות. רמות גבוהות יותר לא יכולות לדרוס רמות נמוכות
יותר.

### כללים קבועים (תמיד נאכפים, לא ניתנים להגדרה)

כללים אלו קבועים בקוד ולא ניתנים להשבתה על ידי שום מנהל, משתמש או הגדרה:

- **אי-כתיבה למטה**: זרימת סיווג היא חד-כיוונית. נתונים לא יכולים לזרום לרמה
  נמוכה יותר.
- **ערוצים UNTRUSTED**: ללא נתונים פנימה או החוצה. נקודה.
- **Taint של סשן**: ברגע שעלה, נשאר מורם למשך חיי הסשן.
- **רישום ביקורת**: כל הפעולות מתועדות. ללא חריגות. ללא אפשרות השבתה.

### כללים ניתנים להגדרה (כווננים על ידי מנהל)

מנהלים יכולים לכוונן אלו דרך ממשק המשתמש או קבצי הגדרות:

- סיווגי ברירת מחדל לאינטגרציות (למשל, Salesforce כברירת מחדל `CONFIDENTIAL`)
- סיווגי ערוצים
- רשימות אפשר/חסום של פעולות לכל אינטגרציה
- רשימות דומיינים מותרים לתקשורת חיצונית
- הגבלות קצב לכל כלי, משתמש או סשן

### Escape Hatch הצהרתי (ארגוני)

פריסות ארגוניות יכולות להגדיר כללי מדיניות מותאמים אישית ב-YAML מובנה לתרחישים
מתקדמים:

```yaml
# חסימת כל שאילתת Salesforce המכילה דפוסי SSN
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDACTED]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# דרישת אישור לעסקאות בערך גבוה
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# הגבלה מבוססת זמן: ללא שליחות חיצוניות מחוץ לשעות עבודה
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "תקשורת חיצונית מוגבלת מחוץ לשעות העבודה"
```

::: tip כללי YAML מותאמים אישית חייבים לעבור אימות לפני הפעלה. כללים לא תקינים
נדחים בזמן הגדרה, לא בזמן ריצה. זה מונע מהגדרה שגויה ליצור פערי אבטחה. :::

## חוויית משתמש בעת דחייה

כאשר מנוע המדיניות חוסם פעולה, המשתמש רואה הסבר ברור -- לא שגיאה גנרית.

**ברירת מחדל (ספציפי):**

```
I can't send confidential data to a public channel.

  -> Reset session and send message
  -> Cancel
```

**מצב חינוכי (הרשמה):**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  -> Reset session and send message
  -> Ask your admin to reclassify the WhatsApp channel
  -> Learn more: [docs link]
```

המצב החינוכי הוא בהרשמה ועוזר למשתמשים להבין _למה_ פעולה נחסמה, כולל איזה
מקור נתונים גרם להסלמת ה-Taint ומהי חוסר ההתאמה בסיווג. שני המצבים מציעים
צעדים הבאים ניתנים לפעולה במקום שגיאות ללא מוצא.

## כיצד Hook-ים משתרשרים

במחזור בקשה/תגובה טיפוסי, מספר Hook-ים מופעלים ברצף. לכל Hook יש נראות מלאה
להחלטות שהתקבלו על ידי Hook-ים מוקדמים יותר בשרשרת.

```
המשתמש שולח: "Check my Salesforce pipeline and message my wife"

1. PRE_CONTEXT_INJECTION
   - קלט מהבעלים, מסווג כ-PUBLIC
   - Taint של סשן: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - כלי מותר? כן
   - למשתמש יש חיבור Salesforce? כן
   - הגבלת קצב? בסדר
   - החלטה: ALLOW

3. POST_TOOL_RESPONSE (תוצאות salesforce)
   - נתונים מסווגים: CONFIDENTIAL
   - Taint של סשן עולה: PUBLIC -> CONFIDENTIAL
   - רשומת שושלת נוצרת

4. PRE_TOOL_CALL (whatsapp.send_message)
   - כלי מותר? כן
   - החלטה: ALLOW (בדיקה ברמת כלי עוברת)

5. PRE_OUTPUT (הודעה לאשתו דרך WhatsApp)
   - Taint של סשן: CONFIDENTIAL
   - סיווג אפקטיבי של יעד: PUBLIC (נמען חיצוני)
   - CONFIDENTIAL -> PUBLIC: חסום
   - החלטה: BLOCK
   - סיבה: "classification_violation"

6. הסוכן מציג למשתמש אפשרות איפוס
```
