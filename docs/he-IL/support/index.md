# מרכז תמיכה

קבלו עזרה בהתקנה, הגדרה ותפעול שוטף של Triggerfish.

## קישורים מהירים

- **משהו שבור כרגע?** התחילו עם [מדריך פתרון בעיות](/he-IL/support/troubleshooting/)
- **צריכים לחפש שגיאה?** ראו את [אינדקס השגיאות](/he-IL/support/troubleshooting/error-reference)
- **רוצים לדווח על באג?** קראו קודם את [כיצד לדווח על בעיה טובה](/he-IL/support/guides/filing-issues)
- **משדרגים או מעבירים?** בדקו את [בסיס הידע](#בסיס-ידע)

## משאבי שירות עצמי

### פתרון בעיות

מדריכים שלב-אחר-שלב לאבחון ותיקון בעיות נפוצות, מאורגנים לפי תחום:

| תחום | מכסה |
|------|-------|
| [התקנה](/he-IL/support/troubleshooting/installation) | כשלי התקנה, שגיאות הרשאות, הגדרה ספציפית לפלטפורמה |
| [Daemon](/he-IL/support/troubleshooting/daemon) | בעיות הפעלה/עצירה, ניהול שירות, התנגשויות פורטים |
| [תצורה](/he-IL/support/troubleshooting/configuration) | ניתוח YAML, שגיאות אימות, הפניות לסודות |
| [ערוצים](/he-IL/support/troubleshooting/channels) | Telegram, Slack, Discord, WhatsApp, Signal, Email, WebChat |
| [ספקי LLM](/he-IL/support/troubleshooting/providers) | שגיאות מפתח API, מודל לא נמצא, כשלי streaming, failover |
| [אינטגרציות](/he-IL/support/troubleshooting/integrations) | Google, GitHub, Notion, CalDAV, שרתי MCP |
| [אוטומציית דפדפן](/he-IL/support/troubleshooting/browser) | זיהוי Chrome, כשלי הפעלה, Flatpak, ניווט |
| [אבטחה וסיווג](/he-IL/support/troubleshooting/security) | הסלמת זיהום, חסימות כתיבה-למטה, SSRF, דחיות מדיניות |
| [סודות ואישורים](/he-IL/support/troubleshooting/secrets) | backends של keychain, שגיאות הרשאות, אחסון קובץ מוצפן |
| [אינדקס שגיאות](/he-IL/support/troubleshooting/error-reference) | אינדקס חיפושי של כל הודעת שגיאה |

### מדריכי כיצד-לעשות

| מדריך | תיאור |
|-------|--------|
| [איסוף לוגים](/he-IL/support/guides/collecting-logs) | כיצד לאסוף חבילות לוג לדיווחי באגים |
| [הרצת אבחון](/he-IL/support/guides/diagnostics) | שימוש ב-`triggerfish patrol` וכלי healthcheck |
| [דיווח על בעיות](/he-IL/support/guides/filing-issues) | מה לכלול כדי שהבעיה שלכם תיפתר מהר |
| [הערות פלטפורמה](/he-IL/support/guides/platform-notes) | פרטים ספציפיים ל-macOS, Linux, Windows, Docker ו-Flatpak |

### בסיס ידע

| מאמר | תיאור |
|------|--------|
| [מיגרציית סודות](/he-IL/support/kb/secrets-migration) | מעבר מאחסון טקסט גלוי לאחסון סודות מוצפן |
| [תהליך עדכון עצמי](/he-IL/support/kb/self-update) | כיצד `triggerfish update` עובד ומה יכול להשתבש |
| [שינויים שוברים](/he-IL/support/kb/breaking-changes) | רשימת שינויים שוברים לפי גרסה |
| [בעיות ידועות](/he-IL/support/kb/known-issues) | בעיות ידועות נוכחיות ועקיפות שלהן |

## עדיין תקועים?

אם התיעוד למעלה לא פתר את הבעיה שלכם:

1. **חפשו בעיות קיימות** ב-[GitHub Issues](https://github.com/greghavens/triggerfish/issues) כדי לראות אם מישהו כבר דיווח על זה
2. **שאלו את הקהילה** ב-[GitHub Discussions](https://github.com/greghavens/triggerfish/discussions)
3. **דווחו על בעיה חדשה** בעקבות [מדריך דיווח הבעיות](/he-IL/support/guides/filing-issues)
