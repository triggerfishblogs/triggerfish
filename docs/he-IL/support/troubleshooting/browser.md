# פתרון בעיות: אוטומציית דפדפן

## Chrome / Chromium לא נמצא

Triggerfish משתמש ב-puppeteer-core (לא Chromium מצורף) ומזהה אוטומטית Chrome או Chromium במערכת שלכם. אם לא נמצא דפדפן, כלי הדפדפן יכשלו עם שגיאת הפעלה.

### נתיבי זיהוי לפי פלטפורמה

**Linux:**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak: `com.google.Chrome`, `org.chromium.Chromium`, `com.brave.Browser`

**macOS:**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows:**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### התקנת דפדפן

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# או התקינו Brave, שגם מזוהה
```

### דריסת נתיב ידנית

אם הדפדפן שלכם מותקן במיקום לא-סטנדרטי, ניתן להגדיר את הנתיב. צרו קשר עם הפרויקט למפתח התצורה המדויק (זה כרגע מוגדר דרך תצורת מנהל הדפדפן).

---

## כשלי הפעלה

### "Direct Chrome process launch failed"

Triggerfish מפעיל Chrome במצב headless דרך `Deno.Command`. אם התהליך נכשל בהתחלה:

1. **הבינארי אינו ניתן להרצה.** בדקו הרשאות קובץ.
2. **ספריות משותפות חסרות.** בהתקנות Linux מינימליות (קונטיינרים, WSL), Chrome עשוי לצריך ספריות נוספות:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **אין שרת תצוגה.** Chrome headless אינו צריך X11/Wayland, אבל גרסאות Chrome מסוימות עדיין מנסות לטעון ספריות הקשורות לתצוגה.

### Flatpak Chrome

אם Chrome מותקן כחבילת Flatpak, Triggerfish יוצר סקריפט עטיפה שקורא ל-`flatpak run` עם הארגומנטים המתאימים.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

אם סקריפט העטיפה נכשל:
- בדקו ש-`/usr/bin/flatpak` או `/usr/local/bin/flatpak` קיים
- בדקו שמזהה אפליקציית Flatpak נכון (הריצו `flatpak list` כדי לראות אפליקציות מותקנות)
- סקריפט העטיפה נכתב לספריית temp. אם ספריית temp אינה ניתנת לכתיבה, הכתיבה נכשלת.

### נקודת קצה CDP אינה מוכנה

לאחר הפעלת Chrome, Triggerfish סורק את נקודת קצה Chrome DevTools Protocol (CDP) כדי ליצור חיבור. זמן קצוב ברירת מחדל הוא 30 שניות עם מרווח סריקה של 200ms.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

זה אומר ש-Chrome התחיל אבל לא פתח את פורט CDP בזמן. סיבות:
- Chrome טוען לאט (מערכת עם משאבים מוגבלים)
- מופע Chrome אחר משתמש באותו פורט debugging
- Chrome קרס במהלך ההפעלה (בדקו את פלט Chrome עצמו)

---

## בעיות ניווט

### "Navigation blocked by domain policy"

כלי הדפדפן מחילים את אותה הגנת SSRF כמו web_fetch. כתובות URL המצביעות על כתובות IP פרטיות חסומות:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

זו אכיפת אבטחה מכוונת. הדפדפן אינו יכול לגשת ל:
- `localhost` / `127.0.0.1`
- רשתות פרטיות (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- כתובות link-local (`169.254.x.x`)

אין דרך לכבות בדיקה זו.

### "Invalid URL"

ה-URL פגום. ניווט דפדפן דורש URL מלא עם פרוטוקול:

```
# שגוי
browser_navigate google.com

# נכון
browser_navigate https://google.com
```

### חריגת זמן ניווט

```
Navigation failed: Timeout
```

הדף לקח יותר מדי זמן להיטען. זה בדרך כלל שרת איטי או דף שלעולם לא מסיים להיטען (הפניות אינסופיות, JavaScript תקוע).

---

## בעיות אינטראקציה עם דף

### "Click failed", "Type failed", "Select failed"

שגיאות אלו כוללות את סלקטור CSS שנכשל:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

הסלקטור לא תאם אלמנט כלשהו בדף. סיבות נפוצות:
- הדף טרם סיים להיטען
- האלמנט נמצא בתוך iframe (סלקטורים אינם חוצים גבולות iframe)
- הסלקטור שגוי (שמות מחלקות דינמיים, Shadow DOM)

### "Snapshot failed"

תמונת המצב של הדף (חילוץ DOM להקשר) נכשלה. זה יכול לקרות אם:
- לדף אין תוכן (דף ריק)
- שגיאות JavaScript מונעות גישת DOM
- הדף ניווט למקום אחר במהלך לכידת תמונת המצב

### "Scroll failed"

קורה בדרך כלל בדפים עם מיכלי גלילה מותאמים. פקודת הגלילה מכוונת ל-viewport של המסמך הראשי.

---

## בידוד פרופיל

פרופילי דפדפן מבודדים לכל סוכן. כל סוכן מקבל ספריית פרופיל Chrome משלו תחת ספריית בסיס הפרופילים. זה אומר:

- סשני התחברות אינם משותפים בין סוכנים
- cookies, אחסון מקומי ומטמון הם לכל סוכן
- בקרות גישה מודעות-סיווג מונעות זיהום צולב

אם אתם רואים התנהגות פרופיל בלתי צפויה, ספריית הפרופיל עשויה להיות מושחתת. מחקו אותה ואפשרו ל-Triggerfish ליצור אחת חדשה בהפעלת הדפדפן הבאה.
