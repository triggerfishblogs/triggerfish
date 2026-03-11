# אינדקס שגיאות

אינדקס חיפושי של הודעות שגיאה. השתמשו בחיפוש הדפדפן (Ctrl+F / Cmd+F) כדי לחפש את טקסט השגיאה המדויק שאתם רואים בלוגים.

## הפעלה ו-Daemon

| שגיאה | סיבה | תיקון |
|--------|-------|--------|
| `Fatal startup error` | חריגה לא מטופלת במהלך אתחול gateway | בדקו stack trace מלא בלוגים |
| `Daemon start failed` | מנהל שירות לא הצליח להפעיל את ה-daemon | בדקו `triggerfish logs` או יומן מערכת |
| `Daemon stop failed` | מנהל שירות לא הצליח לעצור את ה-daemon | הרגו את התהליך ידנית |
| `Failed to load configuration` | קובץ תצורה לא קריא או פגום | הריצו `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | חסר חלק `models` או לא הוגדר ספק | הגדירו לפחות ספק אחד |
| `Configuration file not found` | `triggerfish.yaml` אינו קיים בנתיב הצפוי | הריצו `triggerfish dive` או צרו ידנית |
| `Configuration parse failed` | שגיאת תחביר YAML | תקנו תחביר YAML (בדקו הזחה, נקודתיים, מרכאות) |
| `Configuration file did not parse to an object` | YAML נותח אך התוצאה אינה mapping | ודאו שהרמה העליונה היא mapping של YAML, לא רשימה או סקלר |
| `Configuration validation failed` | שדות נדרשים חסרים או ערכים לא תקפים | בדקו את הודעת האימות הספציפית |
| `Triggerfish is already running` | קובץ לוג נעול על ידי מופע אחר | עצרו קודם את המופע הרץ |
| `Linger enable failed` | `loginctl enable-linger` לא הצליח | הריצו `sudo loginctl enable-linger $USER` |

## ניהול סודות

| שגיאה | סיבה | תיקון |
|--------|-------|--------|
| `Secret store failed` | לא ניתן לאתחל את backend הסודות | בדקו זמינות keychain/libsecret |
| `Secret not found` | מפתח סוד מופנה אינו קיים | אחסנו: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | לקובץ מפתח הרשאות רחבות מ-0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | קובץ מפתח לא קריא או חתוך | מחקו ואחסנו מחדש כל הסודות |
| `Machine key chmod failed` | לא ניתן להגדיר הרשאות על קובץ מפתח | בדקו שמערכת הקבצים תומכת ב-chmod |
| `Secret file permissions too open` | לקובץ סודות הרשאות פתוחות מדי | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | לא ניתן להגדיר הרשאות על קובץ סודות | בדקו סוג מערכת קבצים |
| `Secret backend selection failed` | מערכת הפעלה לא נתמכת או אין keychain זמין | השתמשו ב-Docker או הפעילו חלופת זיכרון |
| `Migrating legacy plaintext secrets to encrypted format` | זוהה קובץ סודות בפורמט ישן (INFO, לא שגיאה) | אין פעולה נדרשת; המיגרציה אוטומטית |

## ספקי LLM

| שגיאה | סיבה | תיקון |
|--------|-------|--------|
| `Primary provider not found in registry` | שם ספק ב-`models.primary.provider` אינו ב-`models.providers` | תקנו את שם הספק |
| `Classification model provider not configured` | `classification_models` מפנה לספק לא ידוע | הוסיפו את הספק ל-`models.providers` |
| `All providers exhausted` | כל ספק בשרשרת failover נכשל | בדקו כל מפתחות API וסטטוס ספקים |
| `Provider request failed with retryable error, retrying` | שגיאה חולפת, ניסיון חוזר בתהליך | המתינו; זהו שחזור אוטומטי |
| `Provider stream connection failed, retrying` | חיבור streaming נותק | המתינו; זהו שחזור אוטומטי |
| `Local LLM request failed (status): text` | Ollama/LM Studio החזיר שגיאה | בדקו שהשרת המקומי רץ והמודל טעון |
| `No response body for streaming` | ספק החזיר תגובת streaming ריקה | נסו שוב; ייתכן שזו בעיית ספק חולפת |
| `Unknown provider name in createProviderByName` | קוד מפנה לסוג ספק שאינו קיים | בדקו איות שם ספק |

## ערוצים

| שגיאה | סיבה | תיקון |
|--------|-------|--------|
| `Channel send failed` | הנתב לא הצליח למסור הודעה | בדקו שגיאות ספציפיות לערוץ בלוגים |
| `WebSocket connection failed` | צ'אט CLI אינו מגיע ל-gateway | בדקו שה-daemon רץ |
| `Message parse failed` | התקבל JSON פגום מהערוץ | בדקו שהלקוח שולח JSON תקף |
| `WebSocket upgrade rejected` | חיבור נדחה על ידי ה-gateway | בדקו טוקן אימות וכותרות origin |
| `Chat WebSocket message rejected: exceeds size limit` | גוף הודעה חורג מ-1 MB | שלחו הודעות קטנות יותר |
| `Discord channel configured but botToken is missing` | תצורת Discord קיימת אך טוקן ריק | הגדירו את טוקן הבוט |
| `WhatsApp send failed (status): error` | Meta API דחה את בקשת השליחה | בדקו תקפות טוקן גישה |
| `Signal connect failed` | לא ניתן להגיע ל-daemon של signal-cli | בדקו ש-signal-cli רץ |
| `Signal ping failed after retries` | signal-cli רץ אך אינו מגיב | אתחלו מחדש signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli לא התחיל בזמן | בדקו התקנת Java והגדרת signal-cli |
| `IMAP LOGIN failed` | אישורי IMAP שגויים | בדקו שם משתמש וסיסמה |
| `IMAP connection not established` | לא ניתן להגיע לשרת IMAP | בדקו שם מארח שרת ופורט 993 |
| `Google Chat PubSub poll failed` | לא ניתן למשוך ממנוי Pub/Sub | בדקו אישורי Google Cloud |
| `Clipboard image rejected: exceeds size limit` | תמונה שהודבקה גדולה מדי למאגר הקלט | השתמשו בתמונה קטנה יותר |

## אינטגרציות

| שגיאה | סיבה | תיקון |
|--------|-------|--------|
| `Google OAuth token exchange failed` | החלפת קוד OAuth החזירה שגיאה | אמתו מחדש: `triggerfish connect google` |
| `GitHub token verification failed` | PAT לא תקף או פג תוקף | אחסנו מחדש: `triggerfish connect github` |
| `GitHub API request failed` | API של GitHub החזיר שגיאה | בדקו scopes טוקן ומגבלות קצב |
| `Clone failed` | git clone נכשל | בדקו טוקן, גישה למאגר ורשת |
| `Notion enabled but token not found in keychain` | טוקן אינטגרציית Notion לא מאוחסן | הריצו `triggerfish connect notion` |
| `Notion API rate limited` | חרגתם מ-3 בקשות/שנייה | המתינו לניסיון חוזר אוטומטי (עד 3 ניסיונות) |
| `Notion API network request failed` | לא ניתן להגיע ל-api.notion.com | בדקו קישוריות רשת |
| `CalDAV credential resolution failed` | חסר שם משתמש או סיסמה של CalDAV | הגדירו אישורים בתצורה וב-keychain |
| `CalDAV principal discovery failed` | לא ניתן למצוא URL ראשי CalDAV | בדקו פורמט URL שרת |
| `MCP server 'name' not found` | שרת MCP מופנה אינו בתצורה | הוסיפו אותו ל-`mcp_servers` בתצורה |
| `MCP SSE connection blocked by SSRF policy` | URL MCP SSE מצביע על IP פרטי | השתמשו בתעבורת stdio במקום |
| `Vault path does not exist` | נתיב vault של Obsidian שגוי | תקנו `plugins.obsidian.vault_path` |
| `Path traversal rejected` | נתיב הערה ניסה לחמוק מספריית vault | השתמשו בנתיבים בתוך ה-vault |

## אבטחה ומדיניות

| שגיאה | סיבה | תיקון |
|--------|-------|--------|
| `Write-down blocked` | נתונים זורמים מסיווג גבוה לנמוך | השתמשו בערוץ/כלי ברמת סיווג מתאימה |
| `SSRF blocked: hostname resolves to private IP` | בקשה יוצאת מכוונת לרשת פנימית | לא ניתן לכבות; השתמשו ב-URL ציבורי |
| `Hook evaluation failed, defaulting to BLOCK` | hook מדיניות זרק חריגה | בדקו כללי מדיניות מותאמים |
| `Policy rule blocked action` | כלל מדיניות דחה את הפעולה | סקרו `policy.rules` בתצורה |
| `Tool floor violation` | כלי דורש סיווג גבוה מהסשן | הסלימו סשן או השתמשו בכלי אחר |
| `Plugin network access blocked` | plugin ניסה לגשת ל-URL לא מורשה | plugin חייב להצהיר על נקודות קצה במניפסט |
| `Plugin SSRF blocked` | URL של plugin מפוענח ל-IP פרטי | plugin אינו יכול לגשת לרשתות פרטיות |
| `Skill activation blocked by classification ceiling` | זיהום סשן חורג מתקרת מיומנות | לא ניתן להשתמש במיומנות זו ברמת זיהום נוכחית |
| `Skill content integrity check failed` | קבצי מיומנות שונו לאחר התקנה | התקינו מחדש את המיומנות |
| `Skill install rejected by scanner` | סורק אבטחה מצא תוכן חשוד | סקרו את אזהרות הסריקה |
| `Delegation certificate signature invalid` | שרשרת האצלה עם חתימה לא תקפה | הנפיקו מחדש את ההאצלה |
| `Delegation certificate expired` | האצלה פגה תוקף | הנפיקו מחדש עם TTL ארוך יותר |
| `Webhook HMAC verification failed` | חתימת webhook אינה תואמת | בדקו תצורת סוד משותף |
| `Webhook replay detected` | payload webhook כפול התקבל | לא שגיאה אם צפוי; אחרת חקרו |
| `Webhook rate limit exceeded` | יותר מדי קריאות webhook ממקור אחד | הפחיתו תדירות webhook |

## דפדפן

| שגיאה | סיבה | תיקון |
|--------|-------|--------|
| `Browser launch failed` | לא ניתן להפעיל Chrome/Chromium | התקינו דפדפן מבוסס Chromium |
| `Direct Chrome process launch failed` | בינארי Chrome נכשל בביצוע | בדקו הרשאות בינארי ותלויות |
| `Flatpak Chrome launch failed` | עטיפת Flatpak Chrome נכשלה | בדקו התקנת Flatpak |
| `CDP endpoint not ready after Xms` | Chrome לא פתח פורט debug בזמן | ייתכן שהמערכת מוגבלת במשאבים |
| `Navigation blocked by domain policy` | URL מכוון לדומיין חסום או IP פרטי | השתמשו ב-URL ציבורי |
| `Navigation failed` | שגיאת טעינת דף או חריגת זמן | בדקו URL ורשת |
| `Click/Type/Select failed on "selector"` | סלקטור CSS לא תאם אלמנט | בדקו את הסלקטור מול DOM הדף |
| `Snapshot failed` | לא ניתן ללכוד מצב דף | ייתכן שהדף ריק או JavaScript שגה |

## ביצוע וארגז חול

| שגיאה | סיבה | תיקון |
|--------|-------|--------|
| `Working directory path escapes workspace jail` | ניסיון חציית נתיב בסביבת ביצוע | השתמשו בנתיבים בתוך מרחב העבודה |
| `Working directory does not exist` | ספריית עבודה מצוינת לא נמצאה | צרו את הספרייה קודם |
| `Workspace access denied for PUBLIC session` | סשנים PUBLIC אינם יכולים להשתמש במרחבי עבודה | מרחב עבודה דורש סיווג INTERNAL+ |
| `Workspace path traversal attempt blocked` | נתיב ניסה לחמוק מגבול מרחב עבודה | השתמשו בנתיבים יחסיים בתוך מרחב עבודה |
| `Workspace agentId rejected: empty after sanitization` | מזהה סוכן מכיל רק תווים לא תקפים | בדקו תצורת סוכן |
| `Sandbox worker unhandled error` | worker ארגז חול של plugin קרס | בדקו קוד plugin לשגיאות |
| `Sandbox has been shut down` | פעולה נוסתה על ארגז חול שנהרס | אתחלו מחדש את ה-daemon |

## מתזמן

| שגיאה | סיבה | תיקון |
|--------|-------|--------|
| `Trigger callback failed` | מטפל טריגר זרק חריגה | בדקו TRIGGER.md לבעיות |
| `Trigger store persist failed` | לא ניתן לשמור תוצאות טריגר | בדקו קישוריות אחסון |
| `Notification delivery failed` | לא ניתן לשלוח התראת טריגר | בדקו קישוריות ערוץ |
| `Cron expression parse error` | ביטוי cron לא תקף | תקנו את הביטוי ב-`scheduler.cron.jobs` |

## עדכון עצמי

| שגיאה | סיבה | תיקון |
|--------|-------|--------|
| `Triggerfish self-update failed` | תהליך עדכון נתקל בשגיאה | בדקו שגיאה ספציפית בלוגים |
| `Binary replacement failed` | לא ניתן להחליף בינארי ישן בחדש | בדקו הרשאות קובץ; עצרו daemon קודם |
| `Checksum file download failed` | לא ניתן להוריד SHA256SUMS.txt | בדקו קישוריות רשת |
| `Asset not found in SHA256SUMS.txt` | גרסה חסרת checksum לפלטפורמה שלכם | דווחו על GitHub issue |
| `Checksum verification exception` | hash בינארי שהורד אינו תואם | נסו שוב; ההורדה עשויה להיות מושחתת |
