# פתרון בעיות: התקנה

## בעיות מתקין בינארי

### אימות checksum נכשל

המתקין מוריד קובץ `SHA256SUMS.txt` לצד הבינארי ומאמת את ה-hash לפני ההתקנה. אם זה נכשל:

- **הרשת הפריעה להורדה.** מחקו את ההורדה החלקית ונסו שוב.
- **Mirror או CDN הגישו תוכן ישן.** המתינו מספר דקות ונסו שוב. המתקין מביא מ-GitHub Releases.
- **נכס לא נמצא ב-SHA256SUMS.txt.** משמעותו שהגרסה פורסמה ללא checksum לפלטפורמה שלכם. דווחו על [GitHub issue](https://github.com/greghavens/triggerfish/issues).

המתקין משתמש ב-`sha256sum` על Linux וב-`shasum -a 256` על macOS. אם אף אחד מהם אינו זמין, לא ניתן לאמת את ההורדה.

### הרשאה נדחתה בכתיבה ל-`/usr/local/bin`

המתקין מנסה קודם `/usr/local/bin`, ואז חוזר ל-`~/.local/bin`. אם אף אחד לא עובד:

```bash
# אפשרות 1: הריצו עם sudo להתקנה ברמת המערכת
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# אפשרות 2: צרו ~/.local/bin והוסיפו ל-PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# ואז הריצו מחדש את המתקין
```

### אזהרת הסגר ב-macOS

macOS חוסם בינאריים שהורדו מהאינטרנט. המתקין מריץ `xattr -cr` כדי לנקות את תכונת ההסגר, אבל אם הורדתם את הבינארי ידנית, הריצו:

```bash
xattr -cr /usr/local/bin/triggerfish
```

או לחצו ימני על הבינארי ב-Finder, בחרו "Open" ואשרו את דיאלוג האבטחה.

### PATH לא עודכן לאחר ההתקנה

המתקין מוסיף את ספריית ההתקנה לפרופיל ה-shell שלכם (`.zshrc`, `.bashrc` או `.bash_profile`). אם פקודת `triggerfish` לא נמצאה לאחר ההתקנה:

1. פתחו חלון טרמינל חדש (ה-shell הנוכחי לא יקלוט שינויי פרופיל)
2. או טענו את הפרופיל ידנית: `source ~/.zshrc` (או כל קובץ פרופיל שה-shell שלכם משתמש בו)

אם המתקין דילג על עדכון ה-PATH, זה אומר שספריית ההתקנה כבר הייתה ב-PATH שלכם.

---

## בנייה מקוד מקור

### Deno לא נמצא

מתקין קוד המקור (`deploy/scripts/install-from-source.sh`) מתקין Deno אוטומטית אם הוא אינו קיים. אם זה נכשל:

```bash
# התקינו Deno ידנית
curl -fsSL https://deno.land/install.sh | sh

# ודאו
deno --version   # צריך להיות 2.x
```

### קומפילציה נכשלת עם שגיאות הרשאה

פקודת `deno compile` צריכה `--allow-all` כי הבינארי המקומפל דורש גישה מלאה למערכת (רשת, מערכת קבצים, FFI עבור SQLite, הרצת תהליכים). אם אתם רואים שגיאות הרשאה במהלך הקומפילציה, ודאו שאתם מריצים את סקריפט ההתקנה כמשתמש עם גישת כתיבה לספריית היעד.

### ענף או גרסה ספציפיים

הגדירו `TRIGGERFISH_BRANCH` כדי לשכפל ענף ספציפי:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

למתקין הבינארי, הגדירו `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## בעיות ספציפיות ל-Windows

### מדיניות ביצוע של PowerShell חוסמת את המתקין

הריצו PowerShell כמנהל מערכת והתירו ביצוע סקריפטים:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

ואז הריצו מחדש את המתקין.

### קומפילציית שירות Windows נכשלת

מתקין Windows מקמפל עטיפת שירות C# בזמן אמת באמצעות `csc.exe` מ-.NET Framework 4.x. אם הקומפילציה נכשלת:

1. **ודאו ש-.NET Framework מותקן.** הריצו `where csc.exe` ב-command prompt. המתקין מחפש בספריית .NET Framework תחת `%WINDIR%\Microsoft.NET\Framework64\`.
2. **הריצו כמנהל מערכת.** התקנת שירות דורשת הרשאות מוגברות.
3. **חלופה.** אם קומפילציית השירות נכשלת, ניתן עדיין להריץ Triggerfish ידנית: `triggerfish run` (מצב חזית). תצטרכו להשאיר את הטרמינל פתוח.

### `Move-Item` נכשל במהלך שדרוג

גרסאות ישנות יותר של מתקין Windows השתמשו ב-`Move-Item -Force` שנכשל כאשר הבינארי היעד בשימוש. זה תוקן בגרסה 0.3.4+. אם נתקלתם בזה בגרסה ישנה, עצרו את השירות ידנית קודם:

```powershell
Stop-Service Triggerfish
# ואז הריצו מחדש את המתקין
```

---

## בעיות Docker

### הקונטיינר יוצא מיד

בדקו את לוגי הקונטיינר:

```bash
docker logs triggerfish
```

סיבות נפוצות:

- **קובץ תצורה חסר.** הרכיבו את `triggerfish.yaml` שלכם לתוך `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **התנגשות פורטים.** אם פורט 18789 או 18790 בשימוש, ה-gateway לא יכול להתחיל.
- **הרשאה נדחתה ב-volume.** הקונטיינר רץ כ-UID 65534 (nonroot). ודאו שה-volume ניתן לכתיבה על ידי משתמש זה.

### לא ניתן לגשת ל-Triggerfish מהמארח

ה-gateway מתקשר ל-`127.0.0.1` בתוך הקונטיינר כברירת מחדל. לגישה מהמארח, קובץ Docker compose ממפה פורטים `18789` ו-`18790`. אם אתם משתמשים ב-`docker run` ישירות, הוסיפו:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman במקום Docker

סקריפט התקנת Docker מזהה אוטומטית `podman` כ-runtime הקונטיינר. ניתן גם להגדיר במפורש:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

סקריפט העטיפה `triggerfish` (שמותקן על ידי מתקין Docker) גם מזהה אוטומטית podman.

### תמונה או registry מותאמים

דרסו את התמונה עם `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## לאחר ההתקנה

### אשף ההגדרה לא מתחיל

לאחר התקנת בינארי, המתקין מריץ `triggerfish dive --install-daemon` כדי להפעיל את אשף ההגדרה. אם הוא לא מתחיל:

1. הריצו ידנית: `triggerfish dive`
2. אם אתם רואים "Terminal requirement not met", האשף דורש TTY אינטראקטיבי. סשני SSH, צינורות CI וקלט צנור לא יעבדו. הגדירו את `triggerfish.yaml` ידנית במקום.

### התקנה אוטומטית של ערוץ Signal נכשלת

Signal דורש `signal-cli`, שהוא אפליקציית Java. המתקין האוטומטי מוריד בינארי `signal-cli` מובנה מראש ו-runtime JRE 25. כשלים יכולים לקרות אם:

- **אין גישת כתיבה לספריית ההתקנה.** בדקו הרשאות על `~/.triggerfish/signal-cli/`.
- **הורדת JRE נכשלת.** המתקין מביא מ-Adoptium. הגבלות רשת או proxies ארגוניים יכולים לחסום זאת.
- **ארכיטקטורה לא נתמכת.** התקנה אוטומטית של JRE תומכת ב-x64 ו-aarch64 בלבד.

אם ההתקנה האוטומטית נכשלת, התקינו `signal-cli` ידנית וודאו שהוא ב-PATH שלכם. ראו את [תיעוד ערוץ Signal](/he-IL/channels/signal) לצעדי הגדרה ידניים.
