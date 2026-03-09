# פתרון בעיות: אבטחה וסיווג

## חסימות כתיבה-למטה

### "Write-down blocked"

זו שגיאת האבטחה הנפוצה ביותר. משמעותה שנתונים מנסים לזרום מרמת סיווג גבוהה לנמוכה.

**דוגמה:** הסשן שלכם ניגש לנתוני CONFIDENTIAL (קרא קובץ מסווג, שאל מסד נתונים מסווג). זיהום הסשן הוא כעת CONFIDENTIAL. ניסיתם אז לשלוח את התגובה לערוץ PUBLIC של WebChat. מנוע המדיניות חוסם זאת כי נתוני CONFIDENTIAL אינם יכולים לזרום ליעדים PUBLIC.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**כיצד לפתור:**
1. **התחילו סשן חדש.** סשן חדש מתחיל בזיהום PUBLIC. השתמשו בשיחה חדשה.
2. **השתמשו בערוץ בסיווג גבוה יותר.** שלחו את התגובה דרך ערוץ מסווג ב-CONFIDENTIAL ומעלה.
3. **הבינו מה גרם לזיהום.** בדקו את הלוגים עבור ערכי "Taint escalation" כדי לראות איזו קריאת כלי העלתה את סיווג הסשן.

### "Session taint cannot flow to channel"

אותו דבר כמו כתיבה-למטה, אבל ספציפית לגבי סיווג ערוץ:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

קריאות כלים לאינטגרציות מסווגות גם אוכפות כתיבה-למטה:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

רגע, זה נראה הפוך. זיהום הסשן גבוה יותר מסיווג הכלי. זה אומר שהסשן מזוהם מדי כדי להשתמש בכלי בסיווג נמוך יותר. החשש הוא שקריאה לכלי עשויה להדליף הקשר מסווג למערכת פחות מאובטחת.

### "Workspace write-down blocked"

למרחבי עבודה של סוכנים יש סיווג לכל ספרייה. כתיבה לספרייה בסיווג נמוך מסשן בזיהום גבוה חסומה:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## הסלמת זיהום

### "Taint escalation"

זו הודעת מידע, לא שגיאה. משמעותה שרמת הסיווג של הסשן זה עתה עלתה כי הסוכן ניגש לנתונים מסווגים.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

זיהום רק עולה, לעולם לא יורד. ברגע שסשן מזוהם ל-CONFIDENTIAL, הוא נשאר שם לשארית הסשן.

### "Resource-based taint escalation firing"

קריאת כלי ניגשה למשאב עם סיווג גבוה מזיהום הסשן הנוכחי. זיהום הסשן מוסלם אוטומטית בהתאמה.

### "Non-owner taint applied"

משתמשים שאינם בעלים עשויים לקבל זיהום לסשנים שלהם בהתבסס על סיווג הערוץ או הרשאות המשתמש. זה נפרד מזיהום מבוסס-משאב.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

כל בקשות HTTP יוצאות (web_fetch, ניווט דפדפן, חיבורי MCP SSE) עוברות הגנת SSRF. אם שם המארח של היעד מתפענח לכתובת IP פרטית, הבקשה נחסמת.

**טווחים חסומים:**
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (פרטי)
- `172.16.0.0/12` (פרטי)
- `192.168.0.0/16` (פרטי)
- `169.254.0.0/16` (link-local)
- `0.0.0.0/8` (לא מוגדר)
- `::1` (IPv6 loopback)
- `fc00::/7` (IPv6 ULA)
- `fe80::/10` (IPv6 link-local)

הגנה זו קשיחה ולא ניתנת לכיבוי או הגדרה. היא מונעת מסוכן ה-AI להיות מרומה לגשת לשירותים פנימיים.

**IPv4-mapped IPv6:** כתובות כמו `::ffff:127.0.0.1` מזוהות ונחסמות.

### "SSRF check blocked outbound request"

אותו דבר כמו למעלה, אבל מתועד מכלי web_fetch במקום ממודול SSRF.

### כשלי פענוח DNS

```
DNS resolution failed for hostname
No DNS records found for hostname
```

שם המארח לא ניתן לפענוח. בדקו:
- ה-URL מאוית נכון
- שרת ה-DNS שלכם נגיש
- הדומיין אכן קיים

---

## מנוע מדיניות

### "Hook evaluation failed, defaulting to BLOCK"

hook מדיניות זרק חריגה במהלך הערכה. כאשר זה קורה, פעולת ברירת המחדל היא BLOCK (דחיה). זו ברירת מחדל בטוחה.

בדקו את הלוגים לחריגה המלאה. ככל הנראה זה מצביע על באג בכלל מדיניות מותאם.

### "Policy rule blocked action"

כלל מדיניות דחה במפורש את הפעולה. ערך הלוג כולל איזה כלל הופעל ולמה. בדקו את חלק `policy.rules` בתצורה שלכם כדי לראות אילו כללים מוגדרים.

### "Tool floor violation"

כלי נקרא שדורש רמת סיווג מינימלית, אבל הסשן מתחת לרמה זו.

**דוגמה:** כלי healthcheck דורש לפחות סיווג INTERNAL (כי הוא חושף פרטים פנימיים של המערכת). אם סשן PUBLIC מנסה להשתמש בו, הקריאה נחסמת.

---

## אבטחת Plugins ומיומנויות

### "Plugin network access blocked"

plugins רצים בארגז חול עם גישת רשת מוגבלת. הם יכולים לגשת רק ל-URLs בדומיין נקודת הקצה המוצהר שלהם.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

ה-plugin ניסה לגשת ל-URL שאינו בנקודות הקצה המוצהרות שלו, או שה-URL פוענח לכתובת IP פרטית.

### "Skill activation blocked by classification ceiling"

מיומנויות מצהירות על `classification_ceiling` ב-frontmatter של SKILL.md שלהן. אם התקרה נמוכה מרמת הזיהום של הסשן, המיומנות אינה יכולה להיות מופעלת:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

זה מונע ממיומנות בסיווג נמוך להיחשף לנתונים בסיווג גבוה.

### "Skill content integrity check failed"

לאחר ההתקנה, Triggerfish מגבב את תוכן המיומנות. אם ה-hash משתנה (המיומנות שונתה לאחר ההתקנה), בדיקת השלמות נכשלת:

```
Skill content hash mismatch detected
```

זה עשוי להעיד על חבלה. התקינו מחדש את המיומנות ממקור מהימן.

### "Skill install rejected by scanner"

סורק האבטחה מצא תוכן חשוד במיומנות. הסורק בודק תבניות שעשויות להעיד על התנהגות זדונית. האזהרות הספציפיות כלולות בהודעת השגיאה.

---

## אבטחת סשנים

### "Session not found"

```
Session not found: <session-id>
```

הסשן המבוקש אינו קיים במנהל הסשנים. ייתכן שנוקה, או שמזהה הסשן אינו תקף.

### "Session status access denied: taint exceeds caller"

ניסיתם לצפות בסטטוס של סשן, אבל לסשן זה יש רמת זיהום גבוהה מהסשן הנוכחי שלכם. זה מונע מסשנים בסיווג נמוך ללמוד על פעולות בסיווג גבוה.

### "Session history access denied"

אותו רעיון כמו למעלה, אבל לצפייה בהיסטוריית שיחה.

---

## צוותי סוכנים

### "Team message delivery denied: team status is ..."

הצוות אינו במצב `running`. זה קורה כאשר:

- הצוות **פורק** (ידנית או על ידי צג מחזור החיים)
- הצוות **הושהה** כי סשן המוביל נכשל
- **תם זמנו** של הצוות לאחר שחרג ממגבלת תוחלת החיים

בדקו את הסטטוס הנוכחי של הצוות עם `team_status`. אם הצוות הושהה עקב כשל מוביל, ניתן לפרק אותו עם `team_disband` וליצור חדש.

### "Team member not found" / "Team member ... is not active"

חבר היעד או אינו קיים (שם תפקיד שגוי) או הסתיים. חברים מסתיימים כאשר:

- הם חורגים מזמן הקצוב לחוסר פעילות (2x `idle_timeout_seconds`)
- הצוות מפורק
- הסשן שלהם קורס וצג מחזור החיים מזהה זאת

השתמשו ב-`team_status` כדי לראות את כל החברים ומצבם הנוכחי.

### "Team disband denied: only the lead or creating session can disband"

רק שני סשנים יכולים לפרק צוות:

1. הסשן שקרא מלכתחילה ל-`team_create`
2. סשן חבר המוביל

אם אתם מקבלים שגיאה זו מתוך הצוות, החבר הקורא אינו המוביל. אם אתם מקבלים אותה מחוץ לצוות, אתם לא הסשן שיצר אותו.

### מוביל הצוות נכשל מיד לאחר היצירה

סשן הסוכן של המוביל לא הצליח להשלים את הסיבוב הראשון שלו. סיבות נפוצות:

1. **שגיאת ספק LLM:** הספק החזיר שגיאה (מגבלת קצב, כשל אימות, מודל לא נמצא). בדקו `triggerfish logs` לשגיאות ספק.
2. **תקרת סיווג נמוכה מדי:** אם המוביל זקוק לכלים מסווגים מעל תקרתו, הסשן עשוי להיכשל בקריאת הכלי הראשונה.
3. **כלים חסרים:** ייתכן שהמוביל זקוק לכלים ספציפיים כדי לפרק עבודה. ודאו שפרופילי כלים מוגדרים נכון.

### חברי צוות רדומים ולעולם אינם מייצרים פלט

חברים ממתינים שהמוביל ישלח להם עבודה דרך `sessions_send`. אם המוביל אינו מפרק את המשימה:

- ייתכן שמודל המוביל אינו מבין תיאום צוות. נסו מודל מסוגל יותר לתפקיד המוביל.
- תיאור ה-`task` עשוי להיות מעורפל מדי עבור המוביל לפרק לתת-משימות.
- בדקו `team_status` כדי לראות אם המוביל `active` ויש לו פעילות אחרונה.

### "Write-down blocked" בין חברי צוות

חברי צוות עוקבים אחר אותם כללי סיווג כמו כל הסשנים. אם חבר אחד זוהם ל-`CONFIDENTIAL` ומנסה לשלוח נתונים לחבר ב-`PUBLIC`, בדיקת כתיבה-למטה חוסמת זאת. זו התנהגות צפויה -- נתונים מסווגים אינם יכולים לזרום לסשנים בסיווג נמוך, אפילו בתוך צוות.

---

## האצלה ורב-סוכני

### "Delegation certificate signature invalid"

האצלת סוכן משתמשת בתעודות קריפטוגרפיות. אם בדיקת החתימה נכשלת, ההאצלה נדחית. זה מונע שרשראות האצלה מזויפות.

### "Delegation certificate expired"

לתעודת ההאצלה יש זמן-חיים. אם פג תוקפה, הסוכן המואצל אינו יכול עוד לפעול בשם המאציל.

### "Delegation chain linkage broken"

בהאצלות מרובות-דילוגים (A מאציל ל-B, B מאציל ל-C), כל חוליה בשרשרת חייבת להיות תקפה. אם חוליה כלשהי שבורה, השרשרת כולה נדחית.

---

## Webhooks

### "Webhook HMAC verification failed"

webhooks נכנסים דורשים חתימות HMAC לאימות. אם החתימה חסרה, פגומה או אינה תואמת:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

בדקו:
- מקור ה-webhook שולח את כותרת חתימת HMAC הנכונה
- הסוד המשותף בתצורה שלכם תואם לסוד של המקור
- פורמט החתימה תואם (HMAC-SHA256 מקודד hex)

### "Webhook replay detected"

Triggerfish כולל הגנת שידור חוזר. אם payload של webhook מתקבל בפעם השנייה (אותה חתימה), הוא נדחה.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

יותר מדי בקשות webhook מאותו מקור בתקופה קצרה. זה מגן מפני הצפות webhook. המתינו ונסו שוב.

---

## שלמות ביקורת

### "previousHash mismatch"

יומן הביקורת משתמש בשרשור hash. כל ערך כולל את ה-hash של הערך הקודם. אם השרשרת שבורה, זה אומר שיומן הביקורת שובש או הושחת.

### "HMAC mismatch"

חתימת HMAC של ערך הביקורת אינה תואמת. ייתכן שהערך שונה לאחר היצירה.
