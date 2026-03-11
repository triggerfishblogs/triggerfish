# מאגר ידע: מיגרציית סודות

מאמר זה מכסה מעבר סודות מאחסון טקסט גלוי לפורמט מוצפן, ומערכי תצורה inline להפניות keychain.

## רקע

גרסאות מוקדמות של Triggerfish אחסנו סודות כ-JSON בטקסט גלוי. הגרסה הנוכחית משתמשת בהצפנת AES-256-GCM לאחסוני סודות מבוססי קבצים (Windows, Docker) וב-keychains מקוריים של מערכת ההפעלה (macOS Keychain, Linux Secret Service).

## מיגרציה אוטומטית (טקסט גלוי למוצפן)

כאשר Triggerfish פותח קובץ סודות ומזהה את הפורמט הישן של טקסט גלוי (אובייקט JSON שטוח ללא שדה `v`), הוא מעביר אוטומטית:

1. **זיהוי.** הקובץ נבדק לנוכחות מבנה `{v: 1, entries: {...}}`. אם זהו `Record<string, string>` פשוט, זהו פורמט מדור קודם.

2. **מיגרציה.** כל ערך טקסט גלוי מוצפן עם AES-256-GCM באמצעות מפתח מכונה שנגזר דרך PBKDF2. IV ייחודי נוצר לכל ערך.

3. **כתיבה אטומית.** הנתונים המוצפנים נכתבים לקובץ זמני קודם, ואז משנים שם אטומית כדי להחליף את המקור. זה מונע אובדן נתונים אם התהליך מופרע.

4. **תיעוד.** שני ערכי לוג נוצרים:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **טיפול בין-מכשירי.** אם שינוי השם האטומי נכשל (למשל קובץ temp וקובץ סודות נמצאים על מערכות קבצים שונות), המיגרציה חוזרת להעתקה-ואז-הסרה.

### מה עליכם לעשות

כלום. המיגרציה אוטומטית לחלוטין ומתרחשת בגישה הראשונה. עם זאת, לאחר המיגרציה:

- **סובבו את הסודות שלכם.** גרסאות הטקסט הגלוי עשויות להיות מגובות, במטמון או מתועדות. צרו מפתחות API חדשים ועדכנו אותם:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **מחקו גיבויים ישנים.** אם יש לכם גיבויים של קובץ הסודות הישן בטקסט גלוי, מחקו אותם באופן מאובטח.

## מיגרציה ידנית (תצורה inline ל-Keychain)

אם ה-`triggerfish.yaml` שלכם מכיל ערכי סוד גולמיים במקום הפניות `secret:`:

```yaml
# לפני (לא מאובטח)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

הריצו את פקודת המיגרציה:

```bash
triggerfish config migrate-secrets
```

פקודה זו:

1. סורקת את התצורה עבור שדות סוד ידועים (מפתחות API, טוקני בוט, סיסמאות)
2. מאחסנת כל ערך ב-keychain של מערכת ההפעלה תחת שם מפתח סטנדרטי
3. מחליפה את הערך ה-inline בהפניית `secret:`

```yaml
# אחרי (מאובטח)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### שדות סוד ידועים

פקודת המיגרציה מכירה שדות אלו:

| נתיב תצורה | מפתח keychain |
|-------------|---------------|
| `models.providers.<name>.apiKey` | `provider:<name>:apiKey` |
| `channels.telegram.botToken` | `telegram:botToken` |
| `channels.slack.botToken` | `slack:botToken` |
| `channels.slack.appToken` | `slack:appToken` |
| `channels.slack.signingSecret` | `slack:signingSecret` |
| `channels.discord.botToken` | `discord:botToken` |
| `channels.whatsapp.accessToken` | `whatsapp:accessToken` |
| `channels.whatsapp.webhookVerifyToken` | `whatsapp:webhookVerifyToken` |
| `channels.email.smtpPassword` | `email:smtpPassword` |
| `channels.email.imapPassword` | `email:imapPassword` |
| `web.search.api_key` | `web:search:apiKey` |

## מפתח מכונה

אחסון הקובץ המוצפן גוזר את מפתח ההצפנה ממפתח מכונה המאוחסן ב-`secrets.key`. מפתח זה נוצר אוטומטית בשימוש הראשון.

### הרשאות קובץ מפתח

במערכות Unix, לקובץ המפתח חייבות להיות הרשאות `0600` (קריאה/כתיבה לבעלים בלבד). Triggerfish בודק זאת בעת ההפעלה ומתעד אזהרה אם ההרשאות פתוחות מדי:

```
Machine key file permissions too open
```

תיקון:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### אובדן קובץ מפתח

אם קובץ מפתח המכונה נמחק או מושחת, כל הסודות שהוצפנו איתו הופכים לבלתי ניתנים לשחזור. תצטרכו לאחסן מחדש כל סוד:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... וכו'
```

גבו את קובץ `secrets.key` שלכם במיקום מאובטח.

### נתיב מפתח מותאם

דרסו את מיקום קובץ המפתח עם:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

זה שימושי בעיקר לפריסות Docker עם פריסות volume לא-סטנדרטיות.
