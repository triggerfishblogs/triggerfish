# פתרון בעיות

התחילו כאן כאשר משהו לא עובד. עקבו אחר הצעדים לפי הסדר.

## צעדים ראשונים

### 1. בדקו אם ה-daemon רץ

```bash
triggerfish status
```

אם ה-daemon לא רץ, הפעילו אותו:

```bash
triggerfish start
```

### 2. בדקו את הלוגים

```bash
triggerfish logs
```

זה עוקב אחר קובץ הלוג בזמן אמת. השתמשו בסינון רמה כדי לחתוך דרך הרעש:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. הריצו אבחון

```bash
triggerfish patrol
```

Patrol בודק האם ה-gateway נגיש, האם ספק ה-LLM מגיב, האם ערוצים מחוברים, האם כללי מדיניות טעונים והאם מיומנויות התגלו. כל בדיקה המסומנת `CRITICAL` או `WARNING` אומרת לכם היכן להתמקד.

### 4. אמתו את התצורה

```bash
triggerfish config validate
```

זה מנתח את `triggerfish.yaml`, בודק שדות נדרשים, מאמת רמות סיווג ומפענח הפניות לסודות.

## פתרון בעיות לפי תחום

אם הצעדים הראשונים למעלה לא הצביעו על הבעיה, בחרו את התחום שתואם את הסימפטומים שלכם:

- [התקנה](/he-IL/support/troubleshooting/installation) - כשלי סקריפט התקנה, בעיות בנייה מקוד מקור, בעיות פלטפורמה
- [Daemon](/he-IL/support/troubleshooting/daemon) - שירות לא מתחיל, התנגשויות פורטים, שגיאות "כבר רץ"
- [תצורה](/he-IL/support/troubleshooting/configuration) - שגיאות ניתוח YAML, שדות חסרים, כשלי פענוח סודות
- [ערוצים](/he-IL/support/troubleshooting/channels) - בוט לא מגיב, כשלי אימות, בעיות מסירת הודעות
- [ספקי LLM](/he-IL/support/troubleshooting/providers) - שגיאות API, מודל לא נמצא, כשלי streaming
- [אינטגרציות](/he-IL/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, שרתי MCP
- [אוטומציית דפדפן](/he-IL/support/troubleshooting/browser) - Chrome לא נמצא, כשלי הפעלה, ניווט חסום
- [אבטחה וסיווג](/he-IL/support/troubleshooting/security) - חסימות כתיבה-למטה, בעיות זיהום, SSRF, דחיות מדיניות
- [סודות ואישורים](/he-IL/support/troubleshooting/secrets) - שגיאות keychain, אחסון קובץ מוצפן, בעיות הרשאות

## עדיין תקועים?

אם אף מדריך למעלה לא פתר את הבעיה:

1. אספו [חבילת לוג](/he-IL/support/guides/collecting-logs)
2. קראו את [מדריך דיווח הבעיות](/he-IL/support/guides/filing-issues)
3. פתחו issue ב-[GitHub](https://github.com/greghavens/triggerfish/issues/new)
