# הערות פלטפורמה

התנהגות, דרישות ומוזרויות ספציפיות לפלטפורמה.

## macOS

### מנהל שירות: launchd

Triggerfish נרשם כסוכן launchd ב:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

ה-plist מוגדר עם `RunAtLoad: true` ו-`KeepAlive: true`, כך שה-daemon מתחיל בהתחברות ומתאתחל אם הוא קורס.

### לכידת PATH

ה-plist של launchd לוכד את PATH של ה-shell שלכם בזמן ההתקנה. זה קריטי כי launchd אינו טוען את פרופיל ה-shell שלכם. אם אתם מתקינים תלויות שרת MCP (כמו `npx`, `python`) לאחר התקנת ה-daemon, בינאריים אלו לא יהיו ב-PATH של ה-daemon.

**תיקון:** התקינו מחדש את ה-daemon כדי לעדכן את ה-PATH הנלכד:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### הסגר

macOS מחיל דגל הסגר על בינאריים שהורדו. המתקין מנקה זאת עם `xattr -cr`, אבל אם הורדתם את הבינארי ידנית:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

סודות מאוחסנים ב-login keychain של macOS דרך CLI של `security`. אם Keychain Access נעול, פעולות סוד יכשלו עד שתפתחו אותו (בדרך כלל על ידי התחברות).

### Homebrew Deno

אם אתם בונים מקוד מקור ו-Deno הותקן דרך Homebrew, ודאו שספריית bin של Homebrew נמצאת ב-PATH שלכם לפני הרצת סקריפט ההתקנה.

---

## Linux

### מנהל שירות: systemd (מצב משתמש)

ה-daemon רץ כשירות משתמש של systemd:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

כברירת מחדל, שירותי משתמש של systemd נעצרים כאשר המשתמש מתנתק. Triggerfish מפעיל linger בזמן ההתקנה:

```bash
loginctl enable-linger $USER
```

אם זה נכשל (למשל מנהל המערכת שלכם השבית זאת), ה-daemon רץ רק כשאתם מחוברים. בשרתים שבהם אתם רוצים שה-daemon יתמיד, בקשו ממנהל המערכת להפעיל linger לחשבון שלכם.

### PATH וסביבה

יחידת systemd לוכדת את ה-PATH שלכם ומגדירה `DENO_DIR=~/.cache/deno`. כמו macOS, שינויים ב-PATH לאחר ההתקנה דורשים התקנה מחדש של ה-daemon.

היחידה גם מגדירה `Environment=PATH=...` במפורש. אם ה-daemon לא מוצא בינאריים של שרתי MCP, זו הסיבה הסבירה ביותר.

### Fedora Atomic / Silverblue / Bazzite

לשולחנות עבודה Fedora Atomic יש `/home` המקושר כ-symlink ל-`/var/home`. Triggerfish מטפל בזה אוטומטית בעת פענוח ספריית הבית, עוקב אחר symlinks כדי למצוא את הנתיב האמיתי.

דפדפנים שהותקנו ב-Flatpak מזוהים ומופעלים דרך סקריפט עטיפה שקורא ל-`flatpak run`.

### שרתים ללא ממשק גרפי

בשרתים ללא סביבת שולחן עבודה, ייתכן ש-daemon GNOME Keyring / Secret Service אינו רץ. ראו [פתרון בעיות סודות](/he-IL/support/troubleshooting/secrets) להוראות הגדרה.

### SQLite FFI

ה-backend של אחסון SQLite משתמש ב-`@db/sqlite`, שטוען ספרייה מקורית דרך FFI. זה דורש הרשאת `--allow-ffi` של Deno (כלולה בבינארי המקומפל). בהפצות Linux מינימליות מסוימות, ספריית C המשותפת או תלויות קשורות עשויות להיות חסרות. התקינו את ספריות הפיתוח הבסיסיות אם אתם רואים שגיאות הקשורות ל-FFI.

---

## Windows

### מנהל שירות: Windows Service

Triggerfish מתקין כ-Windows Service בשם "Triggerfish". השירות ממומש על ידי עטיפת C# שמקומפלת במהלך ההתקנה באמצעות `csc.exe` מ-.NET Framework 4.x.

**דרישות:**
- .NET Framework 4.x (מותקן ברוב מערכות Windows 10/11)
- הרשאות מנהל מערכת להתקנת שירות
- `csc.exe` נגיש בספריית .NET Framework

### החלפת בינארי במהלך עדכונים

Windows אינו מאפשר דריסת קובץ הרצה שרץ כרגע. המעדכן:

1. משנה שם הבינארי הרץ ל-`triggerfish.exe.old`
2. מעתיק את הבינארי החדש לנתיב המקורי
3. מאתחל מחדש את השירות
4. מנקה את קובץ `.old` בהפעלה הבאה

אם שינוי השם או ההעתקה נכשלים, עצרו את השירות ידנית לפני העדכון.

### תמיכת צבעי ANSI

Triggerfish מפעיל Virtual Terminal Processing לפלט קונסולה צבעוני. זה עובד ב-PowerShell מודרני וב-Windows Terminal. חלונות `cmd.exe` ישנים עשויים לא לרנדר צבעים נכון.

### נעילת קבצים בלעדית

Windows משתמש בנעילות קבצים בלעדיות. אם ה-daemon רץ ואתם מנסים להפעיל מופע נוסף, נעילת קובץ הלוג מונעת זאת:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

זיהוי זה ספציפי ל-Windows ומבוסס על EBUSY / "os error 32" בעת פתיחת קובץ הלוג.

### אחסון סודות

Windows משתמש באחסון הקובץ המוצפן (AES-256-GCM) ב-`~/.triggerfish/secrets.json`. אין אינטגרציה עם Windows Credential Manager. התייחסו לקובץ `secrets.key` כרגיש.

### הערות מתקין PowerShell

מתקין PowerShell (`install.ps1`):
- מזהה ארכיטקטורת מעבד (x64/arm64)
- מתקין ב-`%LOCALAPPDATA%\Triggerfish`
- מוסיף את ספריית ההתקנה ל-PATH משתמש דרך registry
- מקמפל את עטיפת שירות C#
- רושם ומפעיל את Windows Service

אם המתקין נכשל בשלב קומפילציית השירות, עדיין ניתן להריץ Triggerfish ידנית:

```powershell
triggerfish run    # מצב חזית
```

---

## Docker

### runtime קונטיינר

פריסת Docker תומכת גם ב-Docker וגם ב-Podman. הזיהוי אוטומטי, או הגדירו במפורש:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### פרטי תמונה

- בסיס: `gcr.io/distroless/cc-debian12` (מינימלי, ללא shell)
- גרסת debug: `distroless:debug` (כולל shell לפתרון בעיות)
- רץ כ-UID 65534 (nonroot)
- Init: `true` (העברת אותות PID 1 דרך `tini`)
- מדיניות אתחול: `unless-stopped`

### שמירת נתונים

כל הנתונים העמידים נמצאים בספריית `/data` בתוך הקונטיינר, מגובים על ידי Docker named volume:

```
/data/
  triggerfish.yaml        # תצורה
  secrets.json            # סודות מוצפנים
  secrets.key             # מפתח הצפנה
  SPINE.md                # זהות סוכן
  TRIGGER.md              # התנהגות טריגר
  data/triggerfish.db     # מסד נתונים SQLite
  logs/                   # קבצי לוג
  skills/                 # מיומנויות מותקנות
  workspace/              # מרחבי עבודה של סוכנים
  .deno/                  # מטמון plugin FFI של Deno
```

### משתני סביבה

| משתנה | ברירת מחדל | מטרה |
|--------|-----------|--------|
| `TRIGGERFISH_DATA_DIR` | `/data` | ספריית נתונים בסיסית |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | נתיב קובץ תצורה |
| `TRIGGERFISH_DOCKER` | `true` | מפעיל התנהגות ספציפית ל-Docker |
| `DENO_DIR` | `/data/.deno` | מטמון Deno (plugins FFI) |
| `HOME` | `/data` | ספריית בית למשתמש nonroot |

### סודות ב-Docker

קונטיינרים של Docker אינם יכולים לגשת ל-keychain של מערכת ההפעלה המארחת. אחסון הקובץ המוצפן משמש אוטומטית. מפתח ההצפנה (`secrets.key`) והנתונים המוצפנים (`secrets.json`) מאוחסנים ב-volume `/data`.

**הערת אבטחה:** כל מי שיש לו גישה ל-Docker volume יכול לקרוא את מפתח ההצפנה. אבטחו את ה-volume בהתאם. בייצור, שקלו שימוש ב-Docker secrets או מנהל סודות להזרקת המפתח בזמן ריצה.

### פורטים

קובץ compose ממפה:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

פורטים נוספים (WebChat על 8765, WhatsApp webhook על 8443) צריכים להתווסף לקובץ compose אם אתם מפעילים ערוצים אלו.

### הרצת אשף ההגדרה ב-Docker

```bash
# אם הקונטיינר רץ
docker exec -it triggerfish triggerfish dive

# אם הקונטיינר לא רץ (חד-פעמי)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### עדכון

```bash
# באמצעות סקריפט העטיפה
triggerfish update

# ידנית
docker compose pull
docker compose up -d
```

### ניפוי באגים

השתמשו בגרסת debug של התמונה לפתרון בעיות:

```yaml
# ב-docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

זה כולל shell כדי שתוכלו להיכנס לקונטיינר:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (דפדפן בלבד)

Triggerfish עצמו אינו רץ כ-Flatpak, אבל הוא יכול להשתמש בדפדפנים שהותקנו ב-Flatpak לאוטומציית דפדפן.

### דפדפני Flatpak מזוהים

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### כיצד זה עובד

Triggerfish יוצר סקריפט עטיפה זמני שקורא ל-`flatpak run` עם דגלי מצב headless, ואז מפעיל Chrome דרך הסקריפט. העטיפה נכתבת לספריית temp.

### בעיות נפוצות

- **Flatpak לא מותקן.** הבינארי חייב להיות ב-`/usr/bin/flatpak` או `/usr/local/bin/flatpak`.
- **ספריית temp אינה ניתנת לכתיבה.** סקריפט העטיפה צריך להיכתב לדיסק לפני ביצוע.
- **התנגשויות ארגז חול Flatpak.** חלק מבניות Flatpak Chrome מגבילות `--remote-debugging-port`. אם חיבור CDP נכשל, נסו התקנת Chrome מקומית במקום Flatpak.
