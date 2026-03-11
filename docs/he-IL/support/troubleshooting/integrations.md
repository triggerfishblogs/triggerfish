# פתרון בעיות: אינטגרציות

## Google Workspace

### טוקן OAuth פג תוקף או בוטל

טוקני רענון OAuth של Google יכולים להיות מבוטלים (על ידי המשתמש, על ידי Google או על ידי חוסר פעילות). כאשר זה קורה:

```
Google OAuth token exchange failed
```

או שתראו שגיאות 401 בקריאות API של Google.

**תיקון:** אמתו מחדש:

```bash
triggerfish connect google
```

זה פותח דפדפן לזרימת הסכמת OAuth. לאחר מתן גישה, הטוקנים החדשים מאוחסנים ב-keychain.

### "No refresh token"

זרימת ה-OAuth החזירה access token אך ללא refresh token. זה קורה כאשר:

- כבר אישרתם את האפליקציה בעבר (Google שולח refresh token רק באישור הראשון)
- מסך הסכמת OAuth לא ביקש גישה לא-מקוונת

**תיקון:** בטלו את גישת האפליקציה ב-[הגדרות חשבון Google](https://myaccount.google.com/permissions), ואז הריצו שוב `triggerfish connect google`. הפעם Google ישלח refresh token חדש.

### מניעת רענון מקבילי

אם מספר בקשות מפעילות רענון טוקן בו-זמנית, Triggerfish מסדר אותן כך שרק בקשת רענון אחת נשלחת. אם אתם רואים חריגות זמן במהלך רענון טוקן, ייתכן שהרענון הראשון לוקח יותר מדי זמן.

---

## GitHub

### "GitHub token not found in keychain"

אינטגרציית GitHub מאחסנת את Personal Access Token ב-keychain של מערכת ההפעלה תחת המפתח `github-pat`.

**תיקון:**

```bash
triggerfish connect github
# או ידנית:
triggerfish config set-secret github-pat ghp_...
```

### פורמט טוקן

GitHub תומך בשני פורמטי טוקן:
- PATs קלאסיים: `ghp_...`
- PATs מפורטים: `github_pat_...`

שניהם עובדים. אשף ההגדרה מאמת את הטוקן על ידי קריאה ל-API של GitHub. אם האימות נכשל:

```
GitHub token verification failed
GitHub API request failed
```

בדקו שוב שלטוקן יש את ה-scopes הנדרשים. לפונקציונליות מלאה, אתם צריכים: `repo`, `read:org`, `read:user`.

### כשלי שכפול

לכלי שכפול GitHub יש לוגיקת ניסיון חוזר אוטומטית:

1. ניסיון ראשון: שכפול עם `--branch` המצוין
2. אם הענף אינו קיים: ניסיון חוזר ללא `--branch` (משתמש בענף ברירת המחדל)

אם שני הניסיונות נכשלים:

```
Clone failed on retry
Clone failed
```

בדקו:
- לטוקן יש scope של `repo`
- המאגר קיים ולטוקן יש גישה
- קישוריות רשת ל-github.com

### מגבלת קצב

מגבלת קצב API של GitHub היא 5,000 בקשות/שעה לבקשות מאומתות. ספירת מגבלת הקצב הנותרת וזמן האיפוס מחולצים מכותרות התגובה ומוכלים בהודעות שגיאה:

```
Rate limit: X remaining, resets at HH:MM:SS
```

אין backoff אוטומטי. המתינו לאיפוס חלון מגבלת הקצב.

---

## Notion

### "Notion enabled but token not found in keychain"

אינטגרציית Notion דורשת טוקן אינטגרציה פנימי המאוחסן ב-keychain.

**תיקון:**

```bash
triggerfish connect notion
```

זה מבקש את הטוקן ומאחסן אותו ב-keychain לאחר אימותו עם ה-API של Notion.

### פורמט טוקן

Notion משתמש בשני פורמטי טוקן:
- טוקני אינטגרציה פנימיים: `ntn_...`
- טוקנים מדור קודם: `secret_...`

שניהם מתקבלים. אשף החיבור מאמת את הפורמט לפני אחסון.

### מגבלת קצב (429)

ה-API של Notion מוגבל לכ-3 בקשות לשנייה. ל-Triggerfish יש מגבלת קצב מובנית (ניתנת להגדרה) ולוגיקת ניסיון חוזר:

- קצב ברירת מחדל: 3 בקשות/שנייה
- ניסיונות חוזרים: עד 3 פעמים על 429
- Backoff: אקספוננציאלי עם jitter, מתחיל ב-1 שנייה
- מכבד את כותרת `Retry-After` מתגובת Notion

אם אתם עדיין נתקלים במגבלות קצב:

```
Notion API rate limited, retrying
```

הפחיתו פעולות מקבילות או הורידו את מגבלת הקצב בתצורה.

### 404 Not Found

```
Notion: 404 Not Found
```

המשאב קיים אך אינו משותף עם האינטגרציה שלכם. ב-Notion:

1. פתחו את הדף או מסד הנתונים
2. לחצו על תפריט "..." > "Connections"
3. הוסיפו את אינטגרציית Triggerfish שלכם

### "client_secret removed" (שינוי שובר)

בעדכון אבטחה, שדה `client_secret` הוסר מתצורת Notion. אם יש לכם שדה זה ב-`triggerfish.yaml` שלכם, הסירו אותו. Notion משתמש כעת רק בטוקן OAuth המאוחסן ב-keychain.

### שגיאות רשת

```
Notion API network request failed
Notion API network error: <message>
```

ה-API אינו נגיש. בדקו את חיבור הרשת שלכם. אם אתם מאחורי proxy ארגוני, ה-API של Notion (`api.notion.com`) חייב להיות נגיש.

---

## CalDAV (יומן)

### פענוח אישורים נכשל

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

אינטגרציית CalDAV צריכה שם משתמש וסיסמה:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

אחסנו את הסיסמה:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### כשלי גילוי

CalDAV משתמש בתהליך גילוי רב-שלבי:
1. מציאת URL הראשי (PROPFIND על נקודת קצה well-known)
2. מציאת calendar-home-set
3. רשימת יומנים זמינים

אם שלב כלשהו נכשל:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

סיבות נפוצות:
- URL שרת שגוי (שרתים מסוימים צריכים `/dav/principals/` או `/remote.php/dav/`)
- אישורים נדחו (שם משתמש/סיסמה שגויים)
- השרת אינו תומך ב-CalDAV (שרתים מסוימים מפרסמים WebDAV אך לא CalDAV)

### אי-התאמת ETag בעדכון/מחיקה

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV משתמש ב-ETags לבקרת מקביליות אופטימיסטית. אם לקוח אחר (טלפון, רשת) שינה את האירוע בין הקריאה לעדכון שלכם, ה-ETag לא יתאים.

**תיקון:** הסוכן צריך לשלוף את האירוע שוב כדי לקבל את ה-ETag הנוכחי, ואז לנסות שוב את הפעולה. זה מטופל אוטומטית ברוב המקרים.

### "CalDAV credentials not available, executor deferred"

מבצע CalDAV מתחיל במצב דחוי אם אישורים לא יכולים להיות מפוענחים בעת ההפעלה. זה לא קריטי; המבצע ידווח שגיאות אם תנסו להשתמש בכלי CalDAV.

---

## שרתי MCP (Model Context Protocol)

### שרת לא נמצא

```
MCP server '<name>' not found
```

קריאת הכלי מפנה לשרת MCP שאינו מוגדר. בדקו את חלק `mcp_servers` שלכם ב-`triggerfish.yaml`.

### בינארי שרת אינו ב-PATH

שרתי MCP מורצים כתת-תהליכים. אם הבינארי אינו נמצא:

```
MCP server '<name>': <validation error>
```

בעיות נפוצות:
- הפקודה (למשל `npx`, `python`, `node`) אינה ב-PATH של ה-daemon
- **בעיית PATH של systemd/launchd:** ה-daemon לוכד את ה-PATH שלכם בזמן ההתקנה. אם התקנתם את כלי שרת MCP לאחר התקנת ה-daemon, התקינו מחדש את ה-daemon כדי לעדכן PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### שרת קורס

אם תהליך שרת MCP קורס, לולאת הקריאה יוצאת והשרת הופך ללא-זמין. אין חיבור מחדש אוטומטי.

**תיקון:** אתחלו מחדש את ה-daemon כדי ליצור מחדש את כל שרתי MCP.

### תעבורת SSE חסומה

שרתי MCP שמשתמשים בתעבורת SSE (Server-Sent Events) כפופים לבדיקות SSRF:

```
MCP SSE connection blocked by SSRF policy
```

כתובות URL של SSE המצביעות על כתובות IP פרטיות חסומות. זה מכוון. השתמשו בתעבורת stdio עבור שרתי MCP מקומיים במקום.

### שגיאות קריאת כלים

```
tools/list failed: <message>
tools/call failed: <message>
```

שרת MCP הגיב עם שגיאה. זו שגיאת השרת, לא של Triggerfish. בדקו את הלוגים של שרת MCP עצמו לפרטים.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

נתיב ה-vault המוגדר ב-`plugins.obsidian.vault_path` אינו קיים. ודאו שהנתיב נכון ונגיש.

### חציית נתיב חסומה

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

נתיב הערה ניסה לחמוק מספריית ה-vault (למשל באמצעות `../`). זו בדיקת אבטחה. כל פעולות הערות מוגבלות לספריית ה-vault.

### תיקיות מוחרגות

```
Path is excluded: <path>
```

הערה נמצאת בתיקייה הרשומה ב-`exclude_folders`. כדי לגשת אליה, הסירו את התיקייה מרשימת ההחרגות.

### אכיפת סיווג

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

ל-vault או לתיקייה ספציפית יש רמת סיווג שמתנגשת עם זיהום הסשן. ראו [פתרון בעיות אבטחה](/he-IL/support/troubleshooting/security) לפרטים על כללי כתיבה-למטה.
