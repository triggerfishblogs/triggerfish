# Google Workspace

חברו את חשבון Google שלכם כדי לתת לסוכן גישה ל-Gmail, Calendar, Tasks,
Drive ו-Sheets.

## דרישות מוקדמות

- חשבון Google
- פרויקט Google Cloud עם אישורי OAuth

## הגדרה

### שלב 1: יצירת פרויקט Google Cloud

1. לכו ל-[Google Cloud Console](https://console.cloud.google.com/)
2. לחצו על התפריט הנפתח של הפרויקט בחלק העליון ובחרו **New Project**
3. תנו שם "Triggerfish" (או כל שם שתרצו) ולחצו **Create**

### שלב 2: הפעלת APIs

הפעילו כל אחד מה-APIs הבאים בפרויקט שלכם:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

לחצו **Enable** בכל דף. זה צריך להיעשות רק פעם אחת לכל פרויקט.

### שלב 3: הגדרת מסך ההסכמה OAuth

לפני שתוכלו ליצור אישורים, Google דורש מסך הסכמה OAuth. זהו המסך שמשתמשים
רואים כאשר מעניקים גישה.

1. לכו ל-
   [מסך הסכמה OAuth](https://console.cloud.google.com/apis/credentials/consent)
2. סוג משתמש: בחרו **External** (או **Internal** אם אתם בארגון Google
   Workspace ורוצים רק משתמשי ארגון)
3. לחצו **Create**
4. מלאו את השדות הנדרשים:
   - **App name**: "Triggerfish" (או כל שם שתרצו)
   - **User support email**: כתובת הדוא"ל שלכם
   - **Developer contact email**: כתובת הדוא"ל שלכם
5. לחצו **Save and Continue**
6. במסך **Scopes**, לחצו **Add or Remove Scopes** והוסיפו:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. לחצו **Update**, ואז **Save and Continue**
8. לכו לדף **Audience** (בסרגל הצד השמאלי תחת "OAuth consent screen") --
   כאן תמצאו את מקטע **Test users**
9. לחצו **+ Add Users** והוסיפו את כתובת הדוא"ל שלכם ב-Google
10. לחצו **Save and Continue**, ואז **Back to Dashboard**

::: warning כאשר האפליקציה שלכם במצב "Testing", רק משתמשי בדיקה שהוספתם
יכולים לאשר. זה בסדר לשימוש אישי. פרסום האפליקציה מסיר את מגבלת משתמש
הבדיקה אך דורש אימות Google. :::

### שלב 4: יצירת אישורי OAuth

1. לכו ל-[Credentials](https://console.cloud.google.com/apis/credentials)
2. לחצו **+ CREATE CREDENTIALS** בחלק העליון
3. בחרו **OAuth client ID**
4. סוג אפליקציה: **Desktop app**
5. שם: "Triggerfish" (או כל שם שתרצו)
6. לחצו **Create**
7. העתיקו את **Client ID** ואת **Client Secret**

### שלב 5: חיבור

```bash
triggerfish connect google
```

תתבקשו להזין:

1. את ה-**Client ID** שלכם
2. את ה-**Client Secret** שלכם

חלון דפדפן ייפתח כדי שתעניקו גישה. לאחר ההרשאה, אסימונים מאוחסנים
באופן מאובטח ב-OS keychain שלכם (macOS Keychain או Linux libsecret). שום
אישורים אינם מאוחסנים בקובצי תצורה או משתני סביבה.

### ניתוק

```bash
triggerfish disconnect google
```

מסיר את כל אסימוני Google מה-keychain שלכם. ניתן להתחבר מחדש בכל עת
על ידי הרצת `connect` שוב.

## כלים זמינים

לאחר החיבור, לסוכן שלכם יש גישה ל-14 כלים:

| כלי               | תיאור                                                    |
| ----------------- | -------------------------------------------------------- |
| `gmail_search`    | חיפוש דוא"ל לפי שאילתה (תומך בתחביר חיפוש Gmail)        |
| `gmail_read`      | קריאת דוא"ל ספציפי לפי מזהה                              |
| `gmail_send`      | חיבור ושליחת דוא"ל                                       |
| `gmail_label`     | הוספה או הסרה של תוויות מהודעה                            |
| `calendar_list`   | רשימת אירועי לוח שנה קרובים                              |
| `calendar_create` | יצירת אירוע לוח שנה חדש                                  |
| `calendar_update` | עדכון אירוע קיים                                         |
| `tasks_list`      | רשימת משימות מ-Google Tasks                               |
| `tasks_create`    | יצירת משימה חדשה                                         |
| `tasks_complete`  | סימון משימה כהושלמה                                       |
| `drive_search`    | חיפוש קבצים ב-Google Drive                               |
| `drive_read`      | קריאת תוכן קובץ (מייצא Google Docs כטקסט)                |
| `sheets_read`     | קריאת טווח מגיליון אלקטרוני                               |
| `sheets_write`    | כתיבת ערכים לטווח בגיליון אלקטרוני                        |

## דוגמאות אינטראקציה

שאלו את הסוכן שלכם דברים כמו:

- "מה יש לי בלוח השנה היום?"
- "חפש בדוא"ל שלי הודעות מ-alice@example.com"
- "שלח דוא"ל ל-bob@example.com עם הנושא 'הערות פגישה'"
- "מצא את גיליון תקציב Q4 ב-Drive"
- "הוסף 'לקנות מצרכים' לרשימת המשימות שלי"
- "קרא תאים A1:D10 מגיליון המכירות"

## הרשאות OAuth

Triggerfish מבקש הרשאות אלו במהלך ההרשאה:

| הרשאה           | רמת גישה                                  |
| ---------------- | ----------------------------------------- |
| `gmail.modify`   | קריאה, שליחה וניהול דוא"ל ותוויות         |
| `calendar`       | גישת קריאה/כתיבה מלאה ל-Google Calendar   |
| `tasks`          | גישת קריאה/כתיבה מלאה ל-Google Tasks      |
| `drive.readonly` | גישת קריאה בלבד לקובצי Google Drive       |
| `spreadsheets`   | גישת קריאה וכתיבה ל-Google Sheets         |

::: tip גישת Drive היא קריאה בלבד. Triggerfish יכול לחפש ולקרוא את
הקבצים שלכם אך אינו יכול ליצור, לשנות או למחוק אותם. ל-Sheets יש
גישת כתיבה נפרדת לעדכוני תאים בגיליונות אלקטרוניים. :::

## אבטחה

- כל נתוני Google Workspace מסווגים לפחות כ-**INTERNAL**
- תוכן דוא"ל, פרטי לוח שנה ותוכן מסמכים הם בדרך כלל **CONFIDENTIAL**
- אסימונים מאוחסנים ב-OS keychain (macOS Keychain / Linux libsecret)
- אישורי לקוח מאוחסנים לצד אסימונים ב-keychain, לעולם לא במשתני סביבה
  או קובצי תצורה
- [כלל אין-כתיבה-למטה](/he-IL/security/no-write-down) חל: נתוני Google
  בסיווג CONFIDENTIAL אינם יכולים לזרום לערוצים PUBLIC
- כל קריאות הכלים מתועדות במסלול הביקורת עם הקשר סיווג מלא

## פתרון בעיות

### "No Google tokens found"

הריצו `triggerfish connect google` לאימות.

### "Google refresh token revoked or expired"

אסימון הרענון שלכם בוטל (למשל, ביטלתם גישה בהגדרות חשבון Google). הריצו
`triggerfish connect google` להתחברות מחדש.

### "Access blocked: has not completed the Google verification process"

משמעות הדבר שחשבון Google שלכם אינו רשום כמשתמש בדיקה לאפליקציה. כאשר
האפליקציה במצב "Testing" (ברירת המחדל), רק חשבונות שנוספו במפורש כמשתמשי
בדיקה יכולים לאשר.

1. לכו ל-
   [מסך הסכמה OAuth](https://console.cloud.google.com/apis/credentials/consent)
2. לכו לדף **Audience** (בסרגל הצד השמאלי)
3. במקטע **Test users**, לחצו **+ Add Users** והוסיפו את כתובת הדוא"ל
   שלכם ב-Google
4. שמרו ונסו `triggerfish connect google` שוב

### "Token exchange failed"

בדקו שוב את Client ID ו-Client Secret שלכם. ודאו ש:

- סוג לקוח ה-OAuth הוא "Desktop app"
- כל ה-APIs הנדרשים מופעלים בפרויקט Google Cloud שלכם
- חשבון Google שלכם רשום כמשתמש בדיקה (אם האפליקציה במצב בדיקה)

### APIs לא מופעלים

אם אתם רואים שגיאות 403 לשירותים ספציפיים, ודאו שה-API המתאים מופעל
ב[ספריית ה-API של Google Cloud Console](https://console.cloud.google.com/apis/library)
שלכם.
