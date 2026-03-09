# פתרון בעיות: Daemon

## Daemon לא מתחיל

### "Triggerfish is already running"

הודעה זו מופיעה כאשר קובץ הלוג נעול על ידי תהליך אחר. ב-Windows, זה מזוהה דרך `EBUSY` / "os error 32" כאשר כותב הקובץ מנסה לפתוח את קובץ הלוג.

**תיקון:**

```bash
triggerfish status    # בדקו אם יש מופע רץ בפועל
triggerfish stop      # עצרו את המופע הקיים
triggerfish start     # הפעילו מחדש
```

אם `triggerfish status` מדווח שה-daemon אינו רץ אך אתם עדיין מקבלים שגיאה זו, תהליך אחר מחזיק את קובץ הלוג פתוח. בדקו תהליכים מתים:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

הרגו תהליכים ישנים ונסו שוב.

### פורט 18789 או 18790 כבר בשימוש

ה-gateway מאזין בפורט 18789 (WebSocket) ו-Tidepool בפורט 18790 (A2UI). אם אפליקציה אחרת תופסת פורטים אלו, ה-daemon לא יצליח להתחיל.

**מצאו מה משתמש בפורט:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### לא הוגדר ספק LLM

אם ב-`triggerfish.yaml` חסר חלק `models` או שלספק הראשי אין מפתח API, ה-gateway מתעד:

```
No LLM provider configured. Check triggerfish.yaml.
```

**תיקון:** הריצו את אשף ההגדרה או הגדירו ידנית:

```bash
triggerfish dive                    # הגדרה אינטראקטיבית
# או
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### קובץ תצורה לא נמצא

ה-daemon יוצא אם `triggerfish.yaml` אינו קיים בנתיב הצפוי. הודעת השגיאה שונה לפי סביבה:

- **התקנה מקומית:** מציע להריץ `triggerfish dive`
- **Docker:** מציע להרכיב את קובץ התצורה עם `-v ./triggerfish.yaml:/data/triggerfish.yaml`

בדקו את הנתיב:

```bash
ls ~/.triggerfish/triggerfish.yaml      # מקומי
docker exec triggerfish ls /data/       # Docker
```

### פענוח סוד נכשל

אם התצורה שלכם מפנה לסוד (`secret:provider:anthropic:apiKey`) שאינו קיים ב-keychain, ה-daemon יוצא עם שגיאה המציינת את הסוד החסר.

**תיקון:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## ניהול שירות

### systemd: daemon נעצר לאחר התנתקות

כברירת מחדל, שירותי משתמש של systemd נעצרים כאשר המשתמש מתנתק. Triggerfish מפעיל `loginctl enable-linger` במהלך ההתקנה כדי למנוע זאת. אם linger לא הופעל:

```bash
# בדקו מצב linger
loginctl show-user $USER | grep Linger

# הפעילו אותו (עשוי לדרוש sudo)
sudo loginctl enable-linger $USER
```

ללא linger, ה-daemon רץ רק כשאתם מחוברים.

### systemd: שירות נכשל בהפעלה

בדקו את מצב השירות והיומן:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

סיבות נפוצות:
- **בינארי הועבר או נמחק.** לקובץ היחידה יש נתיב קשיח לבינארי. התקינו מחדש את ה-daemon: `triggerfish dive --install-daemon`
- **בעיות PATH.** יחידת systemd לוכדת את ה-PATH שלכם בזמן ההתקנה. אם התקנתם כלים חדשים (כמו שרתי MCP) לאחר התקנת ה-daemon, התקינו מחדש את ה-daemon כדי לעדכן את ה-PATH.
- **DENO_DIR לא הוגדר.** יחידת systemd מגדירה `DENO_DIR=~/.cache/deno`. אם ספרייה זו אינה ניתנת לכתיבה, plugins של SQLite FFI לא יצליחו להיטען.

### launchd: daemon לא מתחיל בהתחברות

בדקו את מצב ה-plist:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

אם ה-plist אינו טעון:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

סיבות נפוצות:
- **Plist הוסר או השחית.** התקינו מחדש: `triggerfish dive --install-daemon`
- **בינארי הועבר.** ל-plist יש נתיב קשיח. התקינו מחדש לאחר העברת הבינארי.
- **PATH בזמן ההתקנה.** כמו systemd, launchd לוכד PATH כאשר ה-plist נוצר. התקינו מחדש אם הוספתם כלים חדשים ל-PATH.

### Windows: שירות לא מתחיל

בדקו מצב שירות:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

סיבות נפוצות:
- **שירות לא מותקן.** התקינו מחדש: הריצו את המתקין כמנהל מערכת.
- **נתיב בינארי השתנה.** לעטיפת השירות יש נתיב קשיח. התקינו מחדש.
- **קומפילציית .NET נכשלה בהתקנה.** עטיפת שירות C# דורשת `csc.exe` מ-.NET Framework 4.x.

### שדרוג שובר את ה-daemon

לאחר הרצת `triggerfish update`, ה-daemon מתאתחל אוטומטית. אם לא:

1. הבינארי הישן עשוי עדיין לרוץ. עצרו אותו ידנית: `triggerfish stop`
2. ב-Windows, הבינארי הישן משנה שם ל-`.old`. אם שינוי השם נכשל, העדכון ישגה. עצרו את השירות קודם ואז עדכנו.

---

## בעיות קובץ לוג

### קובץ לוג ריק

ה-daemon כותב ל-`~/.triggerfish/logs/triggerfish.log`. אם הקובץ קיים אך ריק:

- ה-daemon אולי רק התחיל. המתינו רגע.
- רמת הלוג מוגדרת ל-`quiet`, שמתעדת רק הודעות ברמת ERROR. הגדירו ל-`normal` או `verbose`:

```bash
triggerfish config set logging.level normal
```

### לוגים רועשים מדי

הגדירו את רמת הלוג ל-`quiet` כדי לראות רק שגיאות:

```bash
triggerfish config set logging.level quiet
```

מיפוי רמות:

| ערך תצורה | רמה מינימלית מתועדת |
|-----------|----------------------|
| `quiet` | ERROR בלבד |
| `normal` | INFO ומעלה |
| `verbose` | DEBUG ומעלה |
| `debug` | TRACE ומעלה (הכל) |

### סיבוב לוגים

לוגים מסתובבים אוטומטית כאשר הקובץ הנוכחי חורג מ-1 MB. עד 10 קבצים מסובבים נשמרים:

```
triggerfish.log        # נוכחי
triggerfish.1.log      # הגיבוי האחרון
triggerfish.2.log      # השני האחרון
...
triggerfish.10.log     # הישן ביותר (נמחק כאשר סיבוב חדש קורה)
```

אין סיבוב מבוסס-זמן, רק מבוסס-גודל.
