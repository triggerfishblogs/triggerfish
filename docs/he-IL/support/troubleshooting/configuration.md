# פתרון בעיות: תצורה

## שגיאות ניתוח YAML

### "Configuration parse failed"

לקובץ ה-YAML יש שגיאת תחביר. סיבות נפוצות:

- **אי-התאמת הזחה.** YAML רגיש לרווחים. השתמשו ברווחים, לא ב-tabs. כל רמת קינון צריכה להיות בדיוק 2 רווחים.
- **תווים מיוחדים לא מצוטטים.** ערכים המכילים `:`, `#`, `{`, `}`, `[`, `]` או `&` חייבים להיות במרכאות.
- **נקודתיים חסרה אחרי מפתח.** כל מפתח צריך `: ` (נקודתיים ואחריהם רווח).

אמתו את ה-YAML שלכם:

```bash
triggerfish config validate
```

או השתמשו במאמת YAML מקוון כדי למצוא את השורה המדויקת.

### "Configuration file did not parse to an object"

קובץ ה-YAML נותח בהצלחה אך התוצאה אינה mapping של YAML (אובייקט). זה קורה אם הקובץ שלכם מכיל רק ערך סקלרי, רשימה או ריק.

ה-`triggerfish.yaml` שלכם חייב שיהיה לו mapping ברמה העליונה. לכל הפחות:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### "Configuration file not found"

Triggerfish מחפש תצורה בנתיבים הבאים, לפי סדר:

1. משתנה סביבה `$TRIGGERFISH_CONFIG` (אם הוגדר)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (אם `TRIGGERFISH_DATA_DIR` הוגדר)
3. `/data/triggerfish.yaml` (סביבות Docker)
4. `~/.triggerfish/triggerfish.yaml` (ברירת מחדל)

הריצו את אשף ההגדרה ליצירת אחד:

```bash
triggerfish dive
```

---

## שגיאות אימות

### "Configuration validation failed"

זה אומר שה-YAML נותח אך נכשל באימות מבני. הודעות ספציפיות:

**"models is required"** או **"models.primary is required"**

חלק `models` הוא חובה. אתם צריכים לפחות ספק ראשי ומודל:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** או **"primary.model must be non-empty"**

לשדה `primary` חייבים להיות גם `provider` וגם `model` מוגדרים למחרוזות לא ריקות.

**"Invalid classification level"** ב-`classification_models`

רמות תקפות הן: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. אלו רגישים לאותיות גדולות/קטנות. בדקו את מפתחות `classification_models` שלכם.

---

## שגיאות הפניה לסודות

### סוד לא פוענח בעת הפעלה

אם התצורה שלכם מכילה `secret:some-key` ואותו מפתח אינו קיים ב-keychain, ה-daemon יוצא עם שגיאה כמו:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**תיקון:**

```bash
# רשימת סודות קיימים
triggerfish config get-secret --list

# אחסון הסוד החסר
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### backend סודות אינו זמין

על Linux, אחסון הסודות משתמש ב-`secret-tool` (libsecret / GNOME Keyring). אם ממשק Secret Service D-Bus אינו זמין (שרתים ללא ממשק גרפי, קונטיינרים מינימליים), תראו שגיאות בעת אחסון או אחזור סודות.

**עקיפה ל-Linux ללא ממשק גרפי:**

1. התקינו `gnome-keyring` ו-`libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. הפעילו את שרת ה-keyring:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. או השתמשו בחלופת הזיכרון באמצעות הגדרה:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   הערה: חלופת זיכרון פירושה שסודות אובדים באתחול מחדש. מתאים רק לבדיקות.

---

## בעיות ערכי תצורה

### המרה בוליאנית

בעת שימוש ב-`triggerfish config set`, ערכי מחרוזת `"true"` ו-`"false"` מומרים אוטומטית לבוליאנים של YAML. אם אתם באמת צריכים את המחרוזת הליטרלית `"true"`, ערכו ישירות את קובץ ה-YAML.

באופן דומה, מחרוזות שנראות כמספרים שלמים (`"8080"`) מומרות למספרים.

### תחביר נתיב מנוקד

פקודות `config set` ו-`config get` משתמשות בנתיבים מנוקדים לניווט ב-YAML מקונן:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

אם מקטע נתיב מכיל נקודה, אין תחביר בריחה. ערכו ישירות את קובץ ה-YAML.

### מיסוך סודות ב-`config get`

כאשר מריצים `triggerfish config get` על מפתח המכיל "key", "secret" או "token", הפלט ממוסך: `****...****` עם רק 4 התווים הראשונים והאחרונים גלויים. זה מכוון. השתמשו ב-`triggerfish config get-secret <key>` לאחזור הערך הממשי.

---

## גיבויי תצורה

Triggerfish יוצר גיבוי עם חותמת זמן ב-`~/.triggerfish/backups/` לפני כל פעולת `config set`, `config add-channel` או `config add-plugin`. עד 10 גיבויים נשמרים.

לשחזור גיבוי:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## אימות ספקים

אשף ההגדרה מאמת מפתחות API על ידי קריאה לנקודת הקצה של רשימת המודלים של כל ספק (שאינה צורכת טוקנים). נקודות קצה האימות הן:

| ספק | נקודת קצה |
|------|-----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

אם האימות נכשל, בדקו שוב:
- מפתח ה-API נכון ולא פג תוקף
- נקודת הקצה נגישה מהרשת שלכם
- לספקים מקומיים (Ollama, LM Studio), השרת אכן רץ

### מודל לא נמצא

אם האימות מצליח אך המודל לא נמצא, האשף מזהיר. זה בדרך כלל אומר:

- **שגיאת כתיב בשם המודל.** בדקו את התיעוד של הספק למזהי מודל מדויקים.
- **מודל Ollama לא נמשך.** הריצו `ollama pull <model>` קודם.
- **הספק אינו מפרט את המודל.** ספקים מסוימים (Fireworks) משתמשים בפורמטי שמות שונים. האשף מנרמל תבניות נפוצות, אך מזהי מודל חריגים עשויים לא להתאים.
