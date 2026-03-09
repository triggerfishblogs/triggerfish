# הרצת אבחון

ל-Triggerfish יש שני כלי אבחון מובנים: `patrol` (בדיקת בריאות חיצונית) וכלי `healthcheck` (בדיקת מערכת פנימית).

## Patrol

Patrol היא פקודת CLI הבודקת האם המערכות המרכזיות פעילות:

```bash
triggerfish patrol
```

### מה היא בודקת

| בדיקה | סטטוס | משמעות |
|--------|--------|---------|
| Gateway רץ | CRITICAL אם מושבת | מישור הבקרה WebSocket אינו מגיב |
| LLM מחובר | CRITICAL אם מושבת | לא ניתן להגיע לספק LLM הראשי |
| ערוצים פעילים | WARNING אם 0 | אין מתאמי ערוץ מחוברים |
| כללי מדיניות טעונים | WARNING אם 0 | אין כללי מדיניות טעונים |
| מיומנויות מותקנות | WARNING אם 0 | לא התגלו מיומנויות |

### סטטוס כולל

- **HEALTHY** - כל הבדיקות עוברות
- **WARNING** - בדיקות לא-קריטיות מסומנות (למשל אין מיומנויות מותקנות)
- **CRITICAL** - לפחות בדיקה קריטית אחת נכשלה (gateway או LLM לא נגישים)

### מתי להשתמש ב-patrol

- לאחר התקנה, כדי לוודא שהכל עובד
- לאחר שינויי תצורה, כדי לאשר שה-daemon התאתחל כראוי
- כשהבוט מפסיק להגיב, כדי לצמצם איזה רכיב נכשל
- לפני דיווח על באג, כדי לכלול את פלט patrol

### דוגמת פלט

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## כלי Healthcheck

כלי healthcheck הוא כלי סוכן פנימי הבודק רכיבי מערכת מתוך ה-gateway הרץ. הוא זמין לסוכן במהלך שיחות.

### מה הוא בודק

**ספקים:**
- ספק ברירת מחדל קיים ונגיש
- מחזיר את שם הספק

**אחסון:**
- בדיקת round-trip: כותב מפתח, קורא אותו בחזרה, מוחק אותו
- מוודא שכשבת האחסון פונקציונלית

**מיומנויות:**
- סופר מיומנויות שהתגלו לפי מקור (מצורפות, מותקנות, מרחב עבודה)

**תצורה:**
- אימות תצורה בסיסי

### רמות סטטוס

כל רכיב מדווח אחד מ:
- `healthy` - פעיל במלואו
- `degraded` - פועל חלקית (חלק מהתכונות עשויות לא לעבוד)
- `error` - הרכיב שבור

### דרישת סיווג

כלי healthcheck דורש לפחות סיווג INTERNAL כי הוא חושף פרטים פנימיים של המערכת (שמות ספקים, ספירת מיומנויות, סטטוס אחסון). סשן PUBLIC אינו יכול להשתמש בו.

### שימוש ב-healthcheck

בקשו מהסוכן שלכם:

> הריצו בדיקת בריאות

או אם משתמשים בכלי ישירות:

```
tool: healthcheck
```

התגובה היא דוח מובנה:

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## שילוב אבחונים

לסשן אבחון יסודי:

1. **הריצו patrol** מה-CLI:
   ```bash
   triggerfish patrol
   ```

2. **בדקו את הלוגים** לשגיאות אחרונות:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **בקשו מהסוכן** להריץ healthcheck (אם הסוכן מגיב):
   > הריצו בדיקת בריאות מערכת וספרו לי על בעיות

4. **אספו חבילת לוג** אם צריכים לדווח על בעיה:
   ```bash
   triggerfish logs bundle
   ```

---

## אבחון הפעלה

אם ה-daemon אינו מתחיל בכלל, בדקו אלה לפי הסדר:

1. **תצורה קיימת ותקפה:**
   ```bash
   triggerfish config validate
   ```

2. **ניתן לפענח סודות:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **אין התנגשויות פורטים:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **אין מופע אחר רץ:**
   ```bash
   triggerfish status
   ```

5. **בדקו את יומן המערכת (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **בדקו launchd (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **בדקו יומן אירועי Windows (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
