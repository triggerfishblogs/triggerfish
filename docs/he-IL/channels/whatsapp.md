# WhatsApp

חברו את סוכן ה-Triggerfish שלכם ל-WhatsApp כדי שתוכלו לתקשר איתו
מהטלפון. המתאם משתמש ב-**WhatsApp Business Cloud API** (ה-API הרשמי
של Meta המתארח ב-HTTP), מקבל הודעות דרך webhook ושולח דרך REST.

## סיווג ברירת מחדל

WhatsApp מוגדר כברירת מחדל לסיווג `PUBLIC`. אנשי קשר ב-WhatsApp
יכולים לכלול כל אחד עם מספר הטלפון שלכם, כך ש-`PUBLIC` הוא ברירת
המחדל הבטוחה.

## הגדרה

### שלב 1: יצירת חשבון Meta Business

1. גשו לפורטל [Meta for Developers](https://developers.facebook.com/)
2. צרו חשבון מפתח אם אין לכם
3. צרו אפליקציה חדשה ובחרו **Business** כסוג האפליקציה
4. בלוח הבקרה של האפליקציה, הוסיפו את מוצר **WhatsApp**

### שלב 2: קבלת האישורים

ממקטע ה-WhatsApp בלוח הבקרה של האפליקציה, אספו ערכים אלו:

- **Access Token** -- טוקן גישה קבוע (או צרו טוקן זמני לבדיקות)
- **Phone Number ID** -- מזהה מספר הטלפון הרשום עם WhatsApp Business
- **Verify Token** -- מחרוזת שאתם בוחרים, המשמשת לאימות רישום webhook

### שלב 3: הגדרת Webhooks

1. בהגדרות מוצר ה-WhatsApp, נווטו ל-**Webhooks**
2. הגדירו את כתובת ה-callback לכתובת הציבורית של השרת (למשל,
   `https://your-server.com:8443/webhook`)
3. הגדירו את **Verify Token** לאותו ערך שתשתמשו בתצורת Triggerfish
4. הירשמו לשדה ה-webhook `messages`

::: info נדרש URL ציבורי webhooks של WhatsApp דורשים נקודת קצה HTTPS
נגישה ציבורית. אם אתם מריצים Triggerfish מקומית, תצטרכו שירות מנהור
(למשל, ngrok, Cloudflare Tunnel) או שרת עם IP ציבורי. :::

### שלב 4: הגדרת Triggerfish

הוסיפו את ערוץ ה-WhatsApp ל-`triggerfish.yaml`:

```yaml
channels:
  whatsapp:
    # accessToken מאוחסן ב-OS keychain
    phoneNumberId: "your-phone-number-id"
    # verifyToken מאוחסן ב-OS keychain
    ownerPhone: "15551234567"
```

| אפשרות           | סוג    | נדרש      | תיאור                                                          |
| ---------------- | ------ | --------- | -------------------------------------------------------------- |
| `accessToken`    | string | כן        | טוקן גישה WhatsApp Business API                               |
| `phoneNumberId`  | string | כן        | מזהה מספר טלפון מלוח הבקרה של Meta Business                    |
| `verifyToken`    | string | כן        | טוקן לאימות webhook (אתם בוחרים)                              |
| `webhookPort`    | number | לא        | פורט להאזנה ל-webhooks (ברירת מחדל: `8443`)                    |
| `ownerPhone`     | string | מומלץ     | מספר הטלפון שלכם לאימות בעלים (למשל, `"15551234567"`)          |
| `classification` | string | לא        | רמת סיווג (ברירת מחדל: `PUBLIC`)                               |

::: warning אחסנו סודות בבטחה לעולם אל תכניסו טוקני גישה לניהול
גרסאות. השתמשו במשתני סביבה או ב-OS keychain. :::

### שלב 5: הפעלת Triggerfish

```bash
triggerfish stop && triggerfish start
```

שלחו הודעה מהטלפון למספר ה-WhatsApp Business לאישור החיבור.

## זהות בעלים

Triggerfish קובע סטטוס בעלים על ידי השוואת מספר הטלפון של השולח מול
ה-`ownerPhone` המוגדר. בדיקה זו מתרחשת בקוד לפני שה-LLM רואה את
ההודעה:

- **התאמה** -- ההודעה היא פקודת בעלים
- **ללא התאמה** -- ההודעה היא קלט חיצוני עם זיהום `PUBLIC`

אם לא הוגדר `ownerPhone`, כל ההודעות מטופלות כאילו הגיעו מהבעלים.

::: tip הגדירו תמיד מספר טלפון בעלים אם אחרים עלולים לשלוח הודעות
למספר ה-WhatsApp Business שלכם, הגדירו תמיד `ownerPhone` כדי למנוע
ביצוע פקודות בלתי מורשה. :::

## כיצד ה-Webhook עובד

המתאם מפעיל שרת HTTP על הפורט המוגדר (ברירת מחדל `8443`) שמטפל בשני
סוגי בקשות:

1. **GET /webhook** -- Meta שולחת זאת לאימות נקודת ה-webhook. Triggerfish
   מגיב עם טוקן האתגר אם טוקן האימות תואם.
2. **POST /webhook** -- Meta שולחת הודעות נכנסות לכאן. Triggerfish מנתח
   את payload ה-webhook של Cloud API, מחלץ הודעות טקסט ומעביר אותן
   למטפל ההודעות.

## מגבלות הודעות

WhatsApp תומך בהודעות עד 4,096 תווים. הודעות החורגות ממגבלה זו מחולקות
למספר הודעות לפני שליחה.

## מחווני הקלדה

Triggerfish שולח ומקבל מחווני הקלדה ב-WhatsApp. כאשר הסוכן מעבד
בקשה, הצ'אט מציג מחוון הקלדה. אישורי קריאה נתמכים גם כן.

## שינוי סיווג

```yaml
channels:
  whatsapp:
    # accessToken מאוחסן ב-OS keychain
    phoneNumberId: "your-phone-number-id"
    # verifyToken מאוחסן ב-OS keychain
    classification: INTERNAL
```

רמות תקפות: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
