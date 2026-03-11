# Obsidian

חברו את סוכן ה-Triggerfish שלכם לכספת [Obsidian](https://obsidian.md/)
אחת או יותר כדי שיוכל לקרוא, ליצור ולחפש בהערות שלכם. האינטגרציה ניגשת
לכספות ישירות במערכת הקבצים -- אין צורך באפליקציית Obsidian או תוסף.

## מה זה עושה

אינטגרציית Obsidian נותנת לסוכן שלכם את הכלים הבאים:

| כלי               | תיאור                                    |
| ----------------- | ---------------------------------------- |
| `obsidian_read`   | קריאת תוכן הערה ו-frontmatter           |
| `obsidian_write`  | יצירה או עדכון של הערה                   |
| `obsidian_list`   | רשימת הערות בתיקייה                      |
| `obsidian_search` | חיפוש בתוכן הערות                        |
| `obsidian_daily`  | קריאה או יצירה של הערת היום              |
| `obsidian_links`  | פענוח wikilinks ומציאת backlinks         |
| `obsidian_delete` | מחיקת הערה                               |

## הגדרה

### שלב 1: חיבור הכספת

```bash
triggerfish connect obsidian
```

זה מבקש את נתיב הכספת שלכם וכותב את התצורה. ניתן גם להגדיר ידנית.

### שלב 2: הגדרה ב-triggerfish.yaml

```yaml
obsidian:
  vaults:
    main:
      vaultPath: ~/Obsidian/MainVault
      defaultClassification: INTERNAL
      excludeFolders:
        - .obsidian
        - .trash
      folderClassifications:
        "Private/Health": CONFIDENTIAL
        "Private/Finance": RESTRICTED
        "Work": INTERNAL
        "Public": PUBLIC
```

| אפשרות                 | סוג      | נדרש | תיאור                                                  |
| ----------------------- | -------- | ---- | ------------------------------------------------------ |
| `vaultPath`             | string   | כן   | נתיב מוחלט לשורש כספת Obsidian                          |
| `defaultClassification` | string   | לא   | סיווג ברירת מחדל להערות (ברירת מחדל: `INTERNAL`)        |
| `excludeFolders`        | string[] | לא   | תיקיות להתעלמות (ברירת מחדל: `.obsidian`, `.trash`)     |
| `folderClassifications` | object   | לא   | מיפוי נתיבי תיקיות לרמות סיווג                          |

### כספות מרובות

ניתן לחבר כספות מרובות עם רמות סיווג שונות:

```yaml
obsidian:
  vaults:
    personal:
      vaultPath: ~/Obsidian/Personal
      defaultClassification: CONFIDENTIAL
    work:
      vaultPath: ~/Obsidian/Work
      defaultClassification: INTERNAL
    public:
      vaultPath: ~/Obsidian/PublicNotes
      defaultClassification: PUBLIC
```

## סיווג מבוסס תיקיות

הערות יורשות סיווג מהתיקייה שלהן. התיקייה המתאימה הספציפית ביותר גוברת:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

עם תצורה זו:

- `Private/todo.md` הוא `CONFIDENTIAL`
- `Private/Health/records.md` הוא `RESTRICTED`
- `Work/project.md` הוא `INTERNAL`
- `notes.md` (שורש הכספת) משתמש ב-`defaultClassification`

שערי סיווג חלים: הסוכן יכול לקרוא רק הערות שרמת הסיווג שלהן זורמת
לזיהום הסשן הנוכחי. סשן בזיהום `PUBLIC` אינו יכול לגשת להערות
`CONFIDENTIAL`.

## אבטחה

### תיחום נתיבים

כל פעולות הקבצים מוגבלות לשורש הכספת. המתאם משתמש ב-`Deno.realPath`
לפענוח קישורים סימבוליים ולמניעת מתקפות מעבר נתיב. כל ניסיון לקרוא
`../../etc/passwd` או דומה נחסם לפני שמערכת הקבצים נגעת.

### אימות כספת

המתאם מוודא שספריית `.obsidian/` קיימת בשורש הכספת לפני שמקבל את הנתיב.
זה מבטיח שאתם מצביעים על כספת Obsidian אמיתית, לא על ספרייה שרירותית.

### אכיפת סיווג

- הערות נושאות סיווג ממיפוי התיקיות שלהן
- קריאת הערה `CONFIDENTIAL` מעלה את זיהום הסשן ל-`CONFIDENTIAL`
- כלל אין-כתיבה-למטה מונע כתיבת תוכן מסווג לתיקיות בסיווג נמוך יותר
- כל פעולות ההערות עוברות דרך ווי המדיניות הסטנדרטיים

## Wikilinks

המתאם מבין את תחביר `[[wikilink]]` של Obsidian. כלי `obsidian_links`
מפענח wikilinks לנתיבי קבצים אמיתיים ומוצא את כל ההערות שמקשרות חזרה
להערה נתונה (backlinks).

## הערות יומיות

כלי `obsidian_daily` קורא או יוצר את הערת היום באמצעות מוסכמת תיקיית
ההערות היומיות של הכספת שלכם. אם ההערה אינה קיימת, הוא יוצר אחת עם
תבנית ברירת מחדל.

## Frontmatter

הערות עם frontmatter ב-YAML מנותחות אוטומטית. שדות frontmatter זמינים
כמטא-נתונים בעת קריאת הערות. המתאם משמר frontmatter בעת כתיבה או עדכון
הערות.
