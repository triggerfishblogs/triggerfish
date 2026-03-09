# מאגר ידע: בעיות ידועות

בעיות ידועות נוכחיות ועקיפות שלהן. דף זה מתעדכן כאשר בעיות מתגלות ונפתרות.

---

## Email: אין חיבור מחדש IMAP

**סטטוס:** פתוח

מתאם ערוץ האימייל סורק הודעות חדשות כל 30 שניות דרך IMAP. אם חיבור ה-IMAP נופל (הפרעת רשת, אתחול שרת, חריגת זמן חוסר פעילות), לולאת הסריקה נכשלת בשקט ואינה מנסה להתחבר מחדש.

**סימפטומים:**
- ערוץ אימייל מפסיק לקבל הודעות חדשות
- `IMAP unseen email poll failed` מופיע בלוגים
- אין שחזור אוטומטי

**עקיפה:** אתחלו מחדש את ה-daemon:

```bash
triggerfish stop && triggerfish start
```

**סיבת שורש:** לולאת סריקת IMAP אינה כוללת לוגיקת חיבור מחדש. ה-`setInterval` ממשיך להיפעל אבל כל סריקה נכשלת כי החיבור מת.

---

## Slack/Discord SDK: דליפות פעולות אסינכרוניות

**סטטוס:** בעיה ידועה ב-upstream

ה-SDKs של Slack (`@slack/bolt`) ו-Discord (`discord.js`) מדליפים פעולות אסינכרוניות בעת ייבוא. זה משפיע על בדיקות (דורש `sanitizeOps: false`) אך אינו משפיע על שימוש בייצור.

**סימפטומים:**
- כשלי בדיקה עם "leaking async ops" בעת בדיקת מתאמי ערוצים
- אין השפעה על ייצור

**עקיפה:** קבצי בדיקה שמייבאים מתאמי Slack או Discord חייבים להגדיר:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: חיתוך הודעות במקום חלוקה

**סטטוס:** לפי תכנון

הודעות Slack נחתכות ב-40,000 תווים במקום להתפצל למספר הודעות (כמו ש-Telegram ו-Discord עושים). תגובות סוכן ארוכות מאוד מאבדות תוכן בסוף.

**עקיפה:** בקשו מהסוכן לייצר תגובות קצרות יותר, או השתמשו בערוץ אחר למשימות שמייצרות פלט גדול.

---

## WhatsApp: כל המשתמשים מטופלים כבעלים כאשר ownerPhone חסר

**סטטוס:** לפי תכנון (עם אזהרה)

אם שדה `ownerPhone` אינו מוגדר עבור ערוץ WhatsApp, כל שולחי ההודעות מטופלים כבעלים, מה שמעניק להם גישה מלאה לכל הכלים.

**סימפטומים:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (אזהרת הלוג מטעה בפועל; ההתנהגות מעניקה גישת בעלים)
- כל משתמש WhatsApp יכול לגשת לכל הכלים

**עקיפה:** תמיד הגדירו `ownerPhone`:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: PATH לא מתעדכן לאחר התקנת כלים

**סטטוס:** לפי תכנון

קובץ יחידת systemd לוכד את PATH של ה-shell שלכם בזמן התקנת ה-daemon. אם אתם מתקינים כלים חדשים (בינאריים של שרתי MCP, `npx` וכו') לאחר התקנת ה-daemon, ה-daemon לא ימצא אותם.

**סימפטומים:**
- שרתי MCP נכשלים בהרצה
- בינאריים של כלים "לא נמצאים" למרות שהם עובדים בטרמינל שלכם

**עקיפה:** התקינו מחדש את ה-daemon כדי לעדכן את ה-PATH הנלכד:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

זה חל גם על launchd (macOS).

---

## דפדפן: הגבלות CDP ב-Flatpak Chrome

**סטטוס:** מגבלת פלטפורמה

חלק מבניות Flatpak של Chrome או Chromium מגבילות את דגל `--remote-debugging-port`, מה שמונע מ-Triggerfish להתחבר דרך Chrome DevTools Protocol.

**סימפטומים:**
- `CDP endpoint on port X not ready after Yms`
- הדפדפן מופעל אך Triggerfish אינו יכול לשלוט בו

**עקיפה:** התקינו Chrome או Chromium כחבילה מקומית במקום Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: הרשאות Volume עם Podman

**סטטוס:** ספציפי לפלטפורמה

בעת שימוש ב-Podman עם קונטיינרים ללא root, מיפוי UID עשוי למנוע מהקונטיינר (רץ כ-UID 65534) לכתוב ל-data volume.

**סימפטומים:**
- שגיאות `Permission denied` בהפעלה
- לא ניתן ליצור קובץ תצורה, מסד נתונים או לוגים

**עקיפה:** השתמשו בדגל הרכבת volume `:Z` לסימון מחדש של SELinux, וודאו שספריית ה-volume ניתנת לכתיבה:

```bash
podman run -v triggerfish-data:/data:Z ...
```

או צרו את ה-volume עם בעלות נכונה. קודם, מצאו את נתיב הרכבת ה-volume, ואז שנו בעלות:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # שימו לב לנתיב "Mountpoint"
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: csc.exe של .NET Framework לא נמצא

**סטטוס:** ספציפי לפלטפורמה

מתקין Windows מקמפל עטיפת שירות C# בזמן ההתקנה. אם `csc.exe` אינו נמצא (.NET Framework חסר, או נתיב התקנה לא-סטנדרטי), התקנת השירות נכשלת.

**סימפטומים:**
- המתקין מסתיים אך השירות אינו רשום
- `triggerfish status` מראה שהשירות אינו קיים

**עקיפה:** התקינו .NET Framework 4.x, או הריצו Triggerfish במצב חזית:

```powershell
triggerfish run
```

השאירו את הטרמינל פתוח. ה-daemon רץ עד שתסגרו אותו.

---

## CalDAV: התנגשויות ETag עם לקוחות מקבילים

**סטטוס:** לפי תכנון (מפרט CalDAV)

בעת עדכון או מחיקת אירועי יומן, CalDAV משתמש ב-ETags לבקרת מקביליות אופטימיסטית. אם לקוח אחר (אפליקציית טלפון, ממשק רשת) שינה את האירוע בין הקריאה לכתיבה שלכם, הפעולה נכשלת:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**עקיפה:** הסוכן צריך לנסות מחדש אוטומטית על ידי שליפת גרסת האירוע האחרונה. אם לא, בקשו ממנו "קבל את הגרסה האחרונה של האירוע ונסה שוב."

---

## חלופת זיכרון: סודות אובדים באתחול

**סטטוס:** לפי תכנון

בעת שימוש ב-`TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true`, סודות מאוחסנים בזיכרון בלבד ואובדים כאשר ה-daemon מתאתחל. מצב זה מיועד רק לבדיקות.

**סימפטומים:**
- סודות עובדים עד אתחול daemon
- לאחר אתחול: שגיאות `Secret not found`

**עקיפה:** הגדירו backend סודות תקין. ב-Linux ללא ממשק גרפי, התקינו `gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Refresh Token לא מונפק באישור מחדש

**סטטוס:** התנהגות API של Google

Google מנפיק refresh token רק באישור הראשון. אם כבר אישרתם את האפליקציה בעבר ומריצים מחדש `triggerfish connect google`, אתם מקבלים access token אך ללא refresh token.

**סימפטומים:**
- Google API עובד בהתחלה אך נכשל לאחר שה-access token פג (שעה)
- שגיאת `No refresh token`

**עקיפה:** בטלו קודם את גישת האפליקציה, ואז אשרו מחדש:

1. היכנסו ל-[הרשאות חשבון Google](https://myaccount.google.com/permissions)
2. מצאו את Triggerfish ולחצו "Remove Access"
3. הריצו שוב `triggerfish connect google`
4. Google כעת ינפיק refresh token חדש

---

## דיווח על בעיות חדשות

אם אתם נתקלים בבעיה שאינה מופיעה כאן, בדקו את דף [GitHub Issues](https://github.com/greghavens/triggerfish/issues). אם היא אינה מדווחת עדיין, דווחו על בעיה חדשה בעקבות [מדריך הדיווח](/he-IL/support/guides/filing-issues).
