# מאגר ידע: שינויים שוברים

רשימת שינויים לפי גרסה שעשויים לדרוש פעולה בעת שדרוג.

## Notion: הסרת `client_secret`

**Commit:** 6d876c3

שדה `client_secret` הוסר מתצורת אינטגרציית Notion כצעד הקשחת אבטחה. Notion משתמש כעת רק בטוקן OAuth המאוחסן ב-keychain של מערכת ההפעלה.

**פעולה נדרשת:** אם ב-`triggerfish.yaml` שלכם יש שדה `notion.client_secret`, הסירו אותו. הוא יתעלם אך עשוי לגרום לבלבול.

**זרימת הגדרה חדשה:**

```bash
triggerfish connect notion
```

זה מאחסן את טוקן האינטגרציה ב-keychain. אין צורך ב-client secret.

---

## שמות כלים: נקודות לקווים תחתיים

**Commit:** 505a443

כל שמות הכלים שונו מסימון נקודות (`foo.bar`) לסימון קו תחתי (`foo_bar`). חלק מספקי LLM אינם תומכים בנקודות בשמות כלים, מה שגרם לכשלי קריאות כלים.

**פעולה נדרשת:** אם יש לכם כללי מדיניות מותאמים או הגדרות מיומנויות שמפנות לשמות כלים עם נקודות, עדכנו אותם להשתמש בקווים תחתיים:

```yaml
# לפני
- tool: notion.search

# אחרי
- tool: notion_search
```

---

## מתקין Windows: Move-Item ל-Copy-Item

**Commit:** 5e0370f

מתקין PowerShell של Windows שונה מ-`Move-Item -Force` ל-`Copy-Item -Force` להחלפת בינארי במהלך שדרוגים. `Move-Item` אינו דורס קבצים באופן אמין ב-Windows.

**פעולה נדרשת:** אין אם אתם מתקינים מחדש. אם אתם על גרסה ישנה ו-`triggerfish update` נכשל ב-Windows, עצרו את השירות ידנית לפני העדכון:

```powershell
Stop-Service Triggerfish
# ואז הריצו מחדש את המתקין או triggerfish update
```

---

## חותמת גרסה: מזמן ריצה לזמן בנייה

**Commits:** e8b0c8c, eae3930, 6ce0c25

מידע גרסה הועבר מזיהוי בזמן ריצה (בדיקת `deno.json`) לחותמת בזמן בנייה מ-git tags. באנר ה-CLI אינו מציג עוד מחרוזת גרסה קשיחה.

**פעולה נדרשת:** אין. `triggerfish version` ממשיך לעבוד. בניות פיתוח מציגות `dev` כגרסה.

---

## Signal: JRE 21 ל-JRE 25

**Commit:** e5b1047

המתקין האוטומטי של ערוץ Signal עודכן להוריד JRE 25 (מ-Adoptium) במקום JRE 21. גרסת signal-cli גם נעוצה ב-v0.14.0.

**פעולה נדרשת:** אם יש לכם התקנת signal-cli קיימת עם JRE ישן, הריצו מחדש את הגדרת Signal:

```bash
triggerfish config add-channel signal
```

זה מוריד את ה-JRE ו-signal-cli המעודכנים.

---

## סודות: טקסט גלוי למוצפן

פורמט אחסון הסודות שונה מ-JSON בטקסט גלוי ל-JSON מוצפן AES-256-GCM.

**פעולה נדרשת:** אין. המיגרציה אוטומטית. ראו [מיגרציית סודות](/he-IL/support/kb/secrets-migration) לפרטים.

לאחר המיגרציה, מומלץ לסובב את הסודות שלכם כי גרסאות הטקסט הגלוי אוחסנו קודם על הדיסק.

---

## Tidepool: מ-Callback לפרוטוקול Canvas

ממשק Tidepool (A2UI) עבר ממשק `TidepoolTools` מבוסס-callback לפרוטוקול מבוסס-canvas.

**קבצים מושפעים:**
- `src/tools/tidepool/tools/tools_legacy.ts` (ממשק ישן, נשמר לתאימות)
- `src/tools/tidepool/tools/tools_canvas.ts` (ממשק חדש)

**פעולה נדרשת:** אם יש לכם מיומנויות מותאמות שמשתמשות בממשק Tidepool callback הישן, הן ימשיכו לעבוד דרך שכבת התאימות (legacy shim). מיומנויות חדשות צריכות להשתמש בפרוטוקול canvas.

---

## תצורה: פורמט מחרוזת `primary` מדור קודם

שדה `models.primary` קיבל בעבר מחרוזת פשוטה (`"anthropic/claude-sonnet-4-20250514"`). כעת הוא דורש אובייקט:

```yaml
# מדור קודם (עדיין מתקבל לתאימות אחורה)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# נוכחי (מועדף)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**פעולה נדרשת:** עדכנו לפורמט אובייקט. פורמט המחרוזת עדיין מנותח אך עשוי להיות מוסר בגרסה עתידית.

---

## תיעוד Console: הוסר

**Commit:** 9ce1ce5

כל קריאות `console.log`, `console.warn` ו-`console.error` הגולמיות הועברו ל-logger המובנה (`createLogger()`). מכיוון ש-Triggerfish רץ כ-daemon, פלט stdout/stderr אינו גלוי למשתמשים. כל התיעוד עובר כעת דרך כותב הקבצים.

**פעולה נדרשת:** אין. אם הסתמכתם על פלט console ל-debugging (למשל הפניית stdout), השתמשו ב-`triggerfish logs` במקום.

---

## הערכת השפעה

בעת שדרוג על פני מספר גרסאות, בדקו כל ערך למעלה. רוב השינויים תואמים אחורה עם מיגרציה אוטומטית. השינויים היחידים שדורשים פעולה ידנית הם:

1. **הסרת client_secret של Notion** (הסירו את השדה מהתצורה)
2. **שינוי פורמט שמות כלים** (עדכנו כללי מדיניות מותאמים)
3. **עדכון JRE של Signal** (הריצו מחדש הגדרת Signal אם משתמשים ב-Signal)

כל השאר מטופל אוטומטית.
