# ביקורת ותאימות

כל החלטת מדיניות ב-Triggerfish נרשמת עם הקשר מלא. אין חריגים, אין
"מצב דיבוג" שמשבית תיעוד, ואין דרך ל-LLM לדכא רשומות ביקורת. זה
מספק רשומה שלמה וחסינת-שיבוש של כל החלטת אבטחה שהמערכת קיבלה.

## מה נרשם

תיעוד ביקורת הוא **כלל קבוע** -- הוא תמיד פעיל ואינו ניתן לביטול.
כל הפעלת וו אכיפה מייצרת רשומת ביקורת המכילה:

| שדה               | תיאור                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`       | מתי התקבלה ההחלטה (ISO 8601, UTC)                                                                                                                                                  |
| `hook_type`       | איזה וו אכיפה רץ (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`)             |
| `session_id`      | הסשן שבו התרחשה הפעולה                                                                                                                                                             |
| `decision`        | `ALLOW`, `BLOCK`, או `REDACT`                                                                                                                                                       |
| `reason`          | הסבר קריא לאדם של ההחלטה                                                                                                                                                            |
| `input`           | הנתונים או הפעולה שהפעילו את הוו                                                                                                                                                    |
| `rules_evaluated` | אילו כללי מדיניות נבדקו כדי להגיע להחלטה                                                                                                                                           |
| `taint_before`    | רמת זיהום הסשן לפני הפעולה                                                                                                                                                         |
| `taint_after`     | רמת זיהום הסשן אחרי הפעולה (אם השתנתה)                                                                                                                                            |
| `metadata`        | הקשר נוסף ספציפי לסוג הוו                                                                                                                                                           |

## דוגמאות לרשומות ביקורת

### פלט מורשה

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Classification check passed",
  "input": {
    "target_channel": "telegram",
    "recipient": "owner"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification"
  ],
  "taint_before": "INTERNAL",
  "taint_after": "INTERNAL"
}
```

### כתיבה-למטה חסומה

```json
{
  "timestamp": "2025-01-29T10:24:12Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Session taint (CONFIDENTIAL) exceeds effective classification (PUBLIC)",
  "input": {
    "target_channel": "whatsapp",
    "recipient": "external_user_789",
    "effective_classification": "PUBLIC"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification",
    "recipient_classification"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

### קריאת כלי עם הסלמת זיהום

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "POST_TOOL_RESPONSE",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Tool response classified and taint updated",
  "input": {
    "tool_name": "salesforce.query_opportunities",
    "response_classification": "CONFIDENTIAL"
  },
  "rules_evaluated": [
    "tool_response_classification",
    "taint_escalation"
  ],
  "taint_before": "PUBLIC",
  "taint_after": "CONFIDENTIAL",
  "metadata": {
    "lineage_id": "lin_789xyz",
    "records_returned": 3
  }
}
```

### האצלת סוכנים חסומה

```json
{
  "timestamp": "2025-01-29T10:25:00Z",
  "hook_type": "AGENT_INVOCATION",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Agent ceiling (INTERNAL) below session taint (CONFIDENTIAL)",
  "input": {
    "caller_agent_id": "agent_abc",
    "callee_agent_id": "agent_def",
    "callee_ceiling": "INTERNAL",
    "task": "Generate public summary"
  },
  "rules_evaluated": [
    "delegation_ceiling_check",
    "delegation_allowlist",
    "delegation_depth"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

## יכולות מעקב ביקורת

<img src="/diagrams/audit-trace-flow.svg" alt="זרימת מעקב ביקורת: מעקב קדימה, מעקב אחורה והצדקת סיווג מזינים ייצוא תאימות" style="max-width: 100%;" />

ניתן לשאול רשומות ביקורת בארבע דרכים, כל אחת משרתת צורך תאימות
ופורנזי שונה.

### מעקב קדימה

**שאלה:** "מה קרה לנתונים מרשומת Salesforce `opp_00123ABC`?"

מעקב קדימה עוקב אחר אלמנט נתונים מנקודת המקור דרך כל טרנספורמציה,
סשן ופלט. הוא עונה: לאן הלכו הנתונים, מי ראה אותם, והאם נשלחו מחוץ
לארגון?

```
מקור: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> סיווג: CONFIDENTIAL
  --> סשן: sess_456

טרנספורמציות:
  --> שדות שחולצו: name, amount, stage
  --> ה-LLM סיכם 3 רשומות לסקירת צינור

פלטים:
  --> נשלח לבעלים דרך Telegram (מורשה)
  --> נחסם מאיש קשר חיצוני ב-WhatsApp (חסום)
```

### מעקב אחורה

**שאלה:** "אילו מקורות תרמו להודעה שנשלחה ב-10:24 UTC?"

מעקב אחורה מתחיל מפלט וחוזר לאורך שרשרת השושלת כדי לזהות כל
מקור נתונים שהשפיע על הפלט. זה חיוני להבנה האם נתונים מסווגים נכללו
בתגובה.

```
פלט: הודעה שנשלחה ל-Telegram ב-10:24:00Z
  --> סשן: sess_456
  --> מקורות שושלת:
      --> lin_789xyz: הזדמנות Salesforce (CONFIDENTIAL)
      --> lin_790xyz: הזדמנות Salesforce (CONFIDENTIAL)
      --> lin_791xyz: הזדמנות Salesforce (CONFIDENTIAL)
      --> lin_792xyz: API מזג אוויר (PUBLIC)
```

### הצדקת סיווג

**שאלה:** "מדוע נתונים אלו מסומנים כ-CONFIDENTIAL?"

הצדקת סיווג עוקבת חזרה לכלל או למדיניות שהקצו את רמת הסיווג:

```
נתונים: סיכום צינור (lin_789xyz)
סיווג: CONFIDENTIAL
סיבה: source_system_default
  --> סיווג ברירת מחדל של אינטגרציית Salesforce: CONFIDENTIAL
  --> הוגדר על ידי: admin_001 ב-2025-01-10T08:00:00Z
  --> כלל מדיניות: "כל נתוני Salesforce מסווגים כ-CONFIDENTIAL"
```

### ייצוא תאימות

לצורכי סקירה משפטית, רגולטורית או פנימית, Triggerfish יכול לייצא את
שרשרת המשמורת המלאה לכל אלמנט נתונים או טווח זמן:

```
בקשת ייצוא:
  --> טווח זמן: 2025-01-29T00:00:00Z עד 2025-01-29T23:59:59Z
  --> היקף: כל הסשנים של user_456
  --> פורמט: JSON

הייצוא כולל:
  --> כל רשומות הביקורת בטווח הזמן
  --> כל רשומות השושלת שרשומות הביקורת מפנות אליהן
  --> כל מעברי מצב הסשנים
  --> כל החלטות המדיניות (ALLOW, BLOCK, REDACT)
  --> כל שינויי הזיהום
  --> כל רשומות שרשרת ההאצלה
```

::: tip ייצואי תאימות הם קובצי JSON מובנים שניתן לקלוט במערכות SIEM,
לוחות מחוונים לתאימות, או כלי סקירה משפטית. פורמט הייצוא יציב ומגורסן.
:::

## שושלת נתונים

תיעוד ביקורת עובד בשילוב עם מערכת שושלת הנתונים של Triggerfish. כל
אלמנט נתונים שמעובד על ידי Triggerfish נושא מטא-נתוני מקור:

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

רשומות שושלת נוצרות ב-`POST_TOOL_RESPONSE` (כאשר נתונים נכנסים למערכת)
ומתעדכנות ככל שנתונים מותמרים. נתונים מצטברים יורשים
`max(input classifications)` -- אם קלט כלשהו הוא CONFIDENTIAL, הפלט הוא
לפחות CONFIDENTIAL.

| אירוע                                 | פעולת שושלת                              |
| ------------------------------------- | ---------------------------------------- |
| נתונים נקראים מאינטגרציה              | יצירת רשומת שושלת עם מקור               |
| נתונים מותמרים על ידי LLM             | הוספת טרנספורמציה, קישור שושלות קלט     |
| נתונים מצטברים ממקורות מרובים         | מיזוג שושלת, סיווג = max(קלטים)          |
| נתונים נשלחים לערוץ                   | רישום יעד, אימות סיווג                   |
| איפוס סשן                            | ארכוב רשומות שושלת, ניקוי מהקשר          |

## אחסון ושימור

יומני ביקורת נשמרים דרך הפשטת `StorageProvider` תחת מרחב השמות
`audit:`. רשומות שושלת מאוחסנות תחת מרחב השמות `lineage:`.

| סוג נתונים      | מרחב שמות   | שימור ברירת מחדל          |
| --------------- | ----------- | ------------------------- |
| יומני ביקורת    | `audit:`    | שנה אחת                   |
| רשומות שושלת    | `lineage:`  | 90 יום                    |
| מצב סשן        | `sessions:` | 30 יום                    |
| היסטוריית זיהום | `taint:`    | תואם שימור סשן             |

::: warning אבטחה תקופות שימור ניתנות להגדרה, אך יומני ביקורת מוגדרים
כברירת מחדל לשנה אחת לתמיכה בדרישות תאימות (SOC 2, GDPR, HIPAA).
הפחתת תקופת השימור מתחת לדרישה הרגולטורית של ארגונכם היא באחריות
המנהל. :::

### שכבות אחסון

| רמה            | שכבת אחסון | פרטים                                                                                                                                                     |
| -------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **אישית**      | SQLite     | בסיס נתונים במצב WAL ב-`~/.triggerfish/data/triggerfish.db`. רשומות ביקורת מאוחסנות כ-JSON מובנה באותו בסיס נתונים עם כל מצב Triggerfish האחר.            |
| **ארגונית**    | ניתן לחיבור| שכבות אחסון ארגוניות (Postgres, S3, וכו') ניתנות לשימוש דרך ממשק `StorageProvider`. זה מאפשר אינטגרציה עם תשתית צבירת יומנים קיימת.                      |

## אי-שינוי ותקינות

רשומות ביקורת הן הוספה בלבד. ברגע שנכתבו, לא ניתן לשנות או למחוק
אותן על ידי שום רכיב במערכת -- כולל ה-LLM, הסוכן, או תוספים. מחיקה
מתרחשת רק דרך פקיעת מדיניות שימור.

כל רשומת ביקורת כוללת hash תוכן שניתן להשתמש בו לאימות תקינות. אם
רשומות מיוצאות לסקירת תאימות, ניתן לאמת את ה-hash מול הרשומות
השמורות כדי לזהות שיבוש.

## תכונות תאימות ארגוניות

פריסות ארגוניות יכולות להרחיב את תיעוד הביקורת עם:

| תכונה                   | תיאור                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------- |
| **הקפאה משפטית**         | השהיית מחיקה מבוססת-שימור למשתמשים, סשנים, או טווחי זמן מסוימים                        |
| **אינטגרציית SIEM**      | הזרמת אירועי ביקורת ל-Splunk, Datadog, או מערכות SIEM אחרות בזמן אמת                  |
| **לוחות מחוונים תאימות** | סקירה חזותית של החלטות מדיניות, פעולות חסומות, ודפוסי זיהום                             |
| **ייצואים מתוזמנים**     | ייצואים תקופתיים אוטומטיים לסקירה רגולטורית                                            |
| **כללי התראה**           | הפעלת התראות כאשר מתרחשים דפוסי ביקורת מסוימים (למשל, כתיבות-למטה חסומות חוזרות)       |

## עמודים קשורים

- [עיצוב מונחה-אבטחה](/he-IL/security/) -- סקירה כללית של ארכיטקטורת האבטחה
- [כלל אין-כתיבה-למטה](/he-IL/security/no-write-down) -- כלל זרימת הסיווג
  שאכיפתו מתועדת
- [זהות ואימות](/he-IL/security/identity) -- כיצד החלטות זהות נרשמות
- [האצלת סוכנים](/he-IL/security/agent-delegation) -- כיצד שרשראות האצלה
  מופיעות ברשומות הביקורת
- [ניהול סודות](/he-IL/security/secrets) -- כיצד גישה לאישורים מתועדת
