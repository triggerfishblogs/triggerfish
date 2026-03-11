# Email

חברו את סוכן ה-Triggerfish שלכם לדוא"ל כדי שיוכל לקבל הודעות דרך IMAP
ולשלוח תשובות דרך שירות SMTP relay. המתאם תומך בשירותים כמו SendGrid,
Mailgun ו-Amazon SES לדוא"ל יוצא, וסוקר כל שרת IMAP עבור הודעות
נכנסות.

## סיווג ברירת מחדל

Email מוגדר כברירת מחדל לסיווג `CONFIDENTIAL`. דוא"ל מכיל לעיתים
קרובות תוכן רגיש (חוזים, הודעות חשבון, התכתבות אישית), כך
ש-`CONFIDENTIAL` הוא ברירת המחדל הבטוחה.

## הגדרה

### שלב 1: בחירת SMTP Relay

Triggerfish שולח דוא"ל יוצא דרך API של SMTP relay מבוסס HTTP. שירותים
נתמכים כוללים:

| שירות      | נקודת קצה API                                                    |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

הירשמו לאחד מהשירותים הללו וקבלו מפתח API.

### שלב 2: הגדרת IMAP לקבלה

אתם צריכים אישורי IMAP לקבלת דוא"ל. רוב ספקי הדוא"ל תומכים ב-IMAP:

| ספק      | שרת IMAP                | פורט |
| -------- | ----------------------- | ---- |
| Gmail    | `imap.gmail.com`        | 993  |
| Outlook  | `outlook.office365.com` | 993  |
| Fastmail | `imap.fastmail.com`     | 993  |
| מותאם    | שרת הדוא"ל שלכם        | 993  |

::: info סיסמאות אפליקציה ב-Gmail אם אתם משתמשים ב-Gmail עם אימות
דו-שלבי, תצטרכו ליצור
[סיסמת אפליקציה](https://myaccount.google.com/apppasswords) לגישת IMAP.
סיסמת Gmail הרגילה לא תעבוד. :::

### שלב 3: הגדרת Triggerfish

הוסיפו את ערוץ ה-Email ל-`triggerfish.yaml`:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "triggerfish@yourdomain.com"
    ownerEmail: "you@gmail.com"
```

סודות (מפתח API SMTP, סיסמת IMAP) מוזנים במהלך
`triggerfish config add-channel email` ומאוחסנים ב-OS keychain.

| אפשרות           | סוג    | נדרש      | תיאור                                                   |
| ---------------- | ------ | --------- | ------------------------------------------------------- |
| `smtpApiUrl`     | string | כן        | כתובת נקודת קצה API של SMTP relay                        |
| `imapHost`       | string | כן        | שם מארח שרת IMAP                                        |
| `imapPort`       | number | לא        | פורט שרת IMAP (ברירת מחדל: `993`)                       |
| `imapUser`       | string | כן        | שם משתמש IMAP (בדרך כלל כתובת הדוא"ל)                  |
| `fromAddress`    | string | כן        | כתובת שולח לדוא"ל יוצא                                  |
| `pollInterval`   | number | לא        | תדירות בדיקת דוא"ל חדש, במילישניות (ברירת מחדל: `30000`)|
| `classification` | string | לא        | רמת סיווג (ברירת מחדל: `CONFIDENTIAL`)                  |
| `ownerEmail`     | string | מומלץ     | כתובת הדוא"ל שלכם לאימות בעלים                          |

::: warning אישורים מפתח API של SMTP וסיסמת IMAP מאוחסנים ב-OS keychain
(Linux: GNOME Keyring, macOS: Keychain Access). הם לעולם אינם מופיעים
ב-`triggerfish.yaml`. :::

### שלב 4: הפעלת Triggerfish

```bash
triggerfish stop && triggerfish start
```

שלחו דוא"ל לכתובת המוגדרת לאישור החיבור.

## זהות בעלים

Triggerfish קובע סטטוס בעלים על ידי השוואת כתובת הדוא"ל של השולח מול
ה-`ownerEmail` המוגדר:

- **התאמה** -- ההודעה היא פקודת בעלים
- **ללא התאמה** -- ההודעה היא קלט חיצוני עם זיהום `PUBLIC`

אם לא הוגדר `ownerEmail`, כל ההודעות מטופלות כאילו הגיעו מהבעלים.

## סיווג מבוסס דומיין

לשליטה מפורטת יותר, דוא"ל תומך בסיווג נמענים מבוסס דומיין. זה שימושי
במיוחד בסביבות ארגוניות:

- דוא"ל מ-`@yourcompany.com` ניתן לסווג כ-`INTERNAL`
- דוא"ל מדומיינים לא ידועים מוגדר כברירת מחדל כ-`EXTERNAL`
- מנהל יכול להגדיר רשימת דומיינים פנימיים

```yaml
channels:
  email:
    # ... תצורה נוספת
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

משמעות הדבר שמנוע המדיניות מחיל כללים שונים בהתבסס על מאיפה דוא"ל
מגיע:

| דומיין שולח                    | סיווג        |
| ------------------------------ | :----------: |
| דומיין פנימי מוגדר              |  `INTERNAL`  |
| דומיין לא ידוע                  |  `EXTERNAL`  |

## כיצד זה עובד

### הודעות נכנסות

המתאם סוקר את שרת ה-IMAP במרווח המוגדר (ברירת מחדל: כל 30 שניות)
לאיתור הודעות חדשות שלא נקראו. כאשר דוא"ל חדש מגיע:

1. כתובת השולח מחולצת
2. סטטוס בעלים נבדק מול `ownerEmail`
3. גוף הדוא"ל מועבר למטפל ההודעות
4. כל שרשור דוא"ל ממופה למזהה סשן בהתבסס על כתובת השולח
   (`email-sender@example.com`)

### הודעות יוצאות

כאשר הסוכן מגיב, המתאם שולח את התשובה דרך API ה-HTTP של SMTP relay
המוגדר. התשובה כוללת:

- **From** -- ה-`fromAddress` המוגדר
- **To** -- כתובת הדוא"ל של השולח המקורי
- **Subject** -- "Triggerfish" (ברירת מחדל)
- **Body** -- תגובת הסוכן כטקסט רגיל

## מרווח סקירה

מרווח הסקירה ברירת המחדל הוא 30 שניות. ניתן לכוונן זאת בהתאם לצרכים:

```yaml
channels:
  email:
    # ... תצורה נוספת
    pollInterval: 10000 # בדקו כל 10 שניות
```

::: tip אזנו בין תגובתיות ומשאבים מרווח סקירה קצר יותר משמעו תגובה
מהירה יותר לדוא"ל נכנס, אך חיבורי IMAP תכופים יותר. לרוב מקרי
השימוש האישיים, 30 שניות הם איזון טוב. :::

## שינוי סיווג

```yaml
channels:
  email:
    # ... תצורה נוספת
    classification: CONFIDENTIAL
```

רמות תקפות: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
