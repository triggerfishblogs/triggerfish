# פתרון בעיות: סודות ואישורים

## backends של Keychain לפי פלטפורמה

| פלטפורמה | Backend | פרטים |
|-----------|---------|--------|
| macOS | Keychain (מקורי) | משתמש ב-CLI של `security` לגישה ל-Keychain Access |
| Linux | Secret Service (D-Bus) | משתמש ב-CLI של `secret-tool` (libsecret / GNOME Keyring) |
| Windows | אחסון קובץ מוצפן | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | אחסון קובץ מוצפן | `/data/secrets.json` + `/data/secrets.key` |

ה-backend נבחר אוטומטית בעת ההפעלה. לא ניתן לשנות איזה backend משמש לפלטפורמה שלכם.

---

## בעיות macOS

### דיאלוגי גישה ל-Keychain

macOS עשוי לבקש מכם להתיר ל-`triggerfish` לגשת ל-keychain. לחצו "Always Allow" כדי למנוע דיאלוגים חוזרים. אם לחצתם בטעות "Deny", פתחו Keychain Access, מצאו את הערך והסירו אותו. הגישה הבאה תציג דיאלוג שוב.

### Keychain נעול

אם ה-keychain של macOS נעול (למשל לאחר שינה), פעולות סוד יכשלו. שחררו את הנעילה:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

או פשוט שחררו את נעילת ה-Mac (ה-keychain נפתח בהתחברות).

---

## בעיות Linux

### "secret-tool" לא נמצא

ה-backend של keychain ב-Linux משתמש ב-`secret-tool`, שהוא חלק מחבילת `libsecret-tools`.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### אין שרת Secret Service רץ

בשרתים ללא ממשק גרפי או סביבות שולחן עבודה מינימליות, ייתכן שאין שרת Secret Service. סימפטומים:

- פקודות `secret-tool` תלויות או נכשלות
- הודעות שגיאה על חיבור D-Bus

**אפשרויות:**

1. **התקינו והפעילו GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **השתמשו בחלופת הקובץ המוצפן:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   אזהרה: חלופת הזיכרון אינה משמרת סודות בין אתחולים. מתאימה רק לבדיקות.

3. **לשרתים, שקלו Docker.** פריסת Docker משתמשת באחסון קובץ מוצפן שאינו דורש שרת keyring.

### KDE / KWallet

אם אתם משתמשים ב-KDE עם KWallet במקום GNOME Keyring, `secret-tool` עדיין אמור לעבוד דרך ממשק Secret Service D-Bus ש-KWallet מממש. אם לא, התקינו `gnome-keyring` לצד KWallet.

---

## אחסון קובץ מוצפן ב-Windows / Docker

### כיצד זה עובד

אחסון הקובץ המוצפן משתמש בהצפנת AES-256-GCM:

1. מפתח מכונה נגזר באמצעות PBKDF2 ומאוחסן ב-`secrets.key`
2. כל ערך סוד מוצפן בנפרד עם IV ייחודי
3. נתונים מוצפנים מאוחסנים ב-`secrets.json` בפורמט מגרסה (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

במערכות מבוססות Unix (Linux ב-Docker), לקובץ המפתח חייבות להיות הרשאות `0600` (קריאה/כתיבה לבעלים בלבד). אם ההרשאות פתוחות מדי:

```
Machine key file permissions too open
```

**תיקון:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# או ב-Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

קובץ המפתח קיים אך לא ניתן לנתחו. ייתכן שנחתך או נדרס.

**תיקון:** מחקו את קובץ המפתח ויצרו מחדש:

```bash
rm ~/.triggerfish/secrets.key
```

בהפעלה הבאה, מפתח חדש נוצר. עם זאת, כל הסודות הקיימים שהוצפנו עם המפתח הישן יהיו בלתי קריאים. תצטרכו לאחסן מחדש את כל הסודות:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# חזרו על כל הסודות
```

### "Secret file permissions too open"

כמו קובץ המפתח, לקובץ הסודות צריכות להיות הרשאות מגבילות:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

המערכת לא הצליחה להגדיר הרשאות קובץ. זה יכול לקרות במערכות קבצים שאינן תומכות בהרשאות Unix (הרכבות רשת מסוימות, volumes FAT/exFAT). ודאו שמערכת הקבצים תומכת בשינויי הרשאות.

---

## מיגרציית סודות מדור קודם

### מיגרציה אוטומטית

אם Triggerfish מזהה קובץ סודות בטקסט גלוי (פורמט ישן ללא הצפנה), הוא מעביר אוטומטית לפורמט המוצפן בטעינה הראשונה:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

המיגרציה:
1. קוראת את קובץ ה-JSON בטקסט גלוי
2. מצפינה כל ערך עם AES-256-GCM
3. כותבת לקובץ זמני, ואז משנה שם אטומית
4. מתעדת אזהרה המליצה על סיבוב סודות

### מיגרציה ידנית

אם יש לכם סודות בקובץ `triggerfish.yaml` שלכם (לא באמצעות הפניות `secret:`), העבירו אותם ל-keychain:

```bash
triggerfish config migrate-secrets
```

זה סורק את התצורה עבור שדות סוד ידועים (מפתחות API, טוקני בוט וכו'), מאחסן אותם ב-keychain ומחליף את הערכים בקובץ התצורה בהפניות `secret:`.

### בעיות העברה בין מכשירים

אם המיגרציה כוללת העברת קבצים בין גבולות מערכת קבצים (נקודות הרכבה שונות, NFS), שינוי השם האטומי עשוי להיכשל. המיגרציה חוזרת להעתקה-ואז-הסרה, שעדיין בטוחה אך לזמן קצר יש שני קבצים על הדיסק.

---

## פענוח סודות

### כיצד הפניות `secret:` עובדות

ערכי תצורה עם קידומת `secret:` מפוענחים בעת ההפעלה:

```yaml
# ב-triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# בעת הפעלה, מפוענח ל:
apiKey: "sk-ant-api03-actual-key-value..."
```

הערך המפוענח חי רק בזיכרון. קובץ התצורה על הדיסק תמיד מכיל את הפניית ה-`secret:`.

### "Secret not found"

```
Secret not found: <key>
```

המפתח המופנה אינו קיים ב-keychain.

**תיקון:**

```bash
triggerfish config set-secret <key> <value>
```

### רשימת סודות

```bash
# רשימת כל מפתחות הסודות המאוחסנים (ערכים אינם מוצגים)
triggerfish config get-secret --list
```

### מחיקת סודות

```bash
triggerfish config set-secret <key> ""
# או דרך הסוכן:
# הסוכן יכול לבקש מחיקת סוד דרך כלי הסודות
```

---

## דריסת משתנה סביבה

ניתן לדרוס את נתיב קובץ המפתח עם `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

זה שימושי בעיקר לפריסות Docker עם פריסות volume לא-סטנדרטיות.

---

## שמות מפתחות סוד נפוצים

אלו מפתחות ה-keychain הסטנדרטיים בשימוש Triggerfish:

| מפתח | שימוש |
|-------|--------|
| `provider:<name>:apiKey` | מפתח API של ספק LLM |
| `telegram:botToken` | טוקן בוט Telegram |
| `slack:botToken` | טוקן בוט Slack |
| `slack:appToken` | טוקן ברמת אפליקציה של Slack |
| `slack:signingSecret` | סוד חתימה של Slack |
| `discord:botToken` | טוקן בוט Discord |
| `whatsapp:accessToken` | טוקן גישה ל-WhatsApp Cloud API |
| `whatsapp:webhookVerifyToken` | טוקן אימות webhook של WhatsApp |
| `email:smtpPassword` | סיסמת relay SMTP |
| `email:imapPassword` | סיסמת שרת IMAP |
| `web:search:apiKey` | מפתח API של Brave Search |
| `github-pat` | Personal Access Token של GitHub |
| `notion:token` | טוקן אינטגרציית Notion |
| `caldav:password` | סיסמת שרת CalDAV |
| `google:clientId` | מזהה לקוח OAuth של Google |
| `google:clientSecret` | סוד לקוח OAuth של Google |
| `google:refreshToken` | טוקן רענון OAuth של Google |
