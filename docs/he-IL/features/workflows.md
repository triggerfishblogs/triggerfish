---
title: תהליכי עבודה
description: אוטומציה של משימות רב-שלביות באמצעות מנוע CNCF Serverless Workflow DSL המובנה ב-Triggerfish.
---

# תהליכי עבודה

Triggerfish כולל מנוע הרצה מובנה עבור
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
תהליכי עבודה מאפשרים לך להגדיר אוטומציות דטרמיניסטיות ורב-שלביות ב-YAML
שרצות **ללא ה-LLM בלולאה** במהלך ההרצה. הסוכן יוצר ומפעיל תהליכי עבודה, אך
המנוע מטפל בשליחת משימות בפועל, הסתעפות, לולאות וזרימת נתונים.

## מתי להשתמש בתהליכי עבודה

**השתמש בתהליכי עבודה** עבור רצפים חוזרים ודטרמיניסטיים שבהם אתה יודע את
השלבים מראש: שליפת נתונים מ-API, המרתם, שמירה בזיכרון, שליחת התראה. אותו
קלט תמיד מייצר את אותה פלט.

**השתמש בסוכן ישירות** עבור חשיבה פתוחה, חקירה או משימות שבהן השלב הבא תלוי
בשיקול דעת: מחקר נושא, כתיבת קוד, פתרון בעיות.

כלל אצבע טוב: אם אתה מוצא את עצמך מבקש מהסוכן לבצע את אותו רצף רב-שלבי
שוב ושוב, הפוך אותו לתהליך עבודה.

::: info זמינות
תהליכי עבודה זמינים בכל התוכניות. למשתמשי קוד פתוח המשתמשים במפתחות API
משלהם יש גישה מלאה למנוע תהליכי העבודה -- כל קריאת `triggerfish:llm` או
`triggerfish:agent` בתוך תהליך עבודה צורכת inference מהספק המוגדר שלך.
:::

## כלים

### `workflow_save`

ניתוח, אימות ושמירת הגדרת תהליך עבודה. תהליך העבודה נשמר ברמת הסיווג של
הסשן הנוכחי.

| Parameter     | Type   | Required | Description                          |
| ------------- | ------ | -------- | ------------------------------------ |
| `name`        | string | yes      | שם תהליך העבודה                      |
| `yaml`        | string | yes      | הגדרת תהליך עבודה ב-YAML            |
| `description` | string | no       | מה תהליך העבודה עושה                 |

### `workflow_run`

הרצת תהליך עבודה לפי שם או מ-YAML מוטבע. מחזיר את פלט ההרצה והסטטוס.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `name`    | string | no       | שם של תהליך עבודה שמור להרצה                           |
| `yaml`    | string | no       | הגדרת YAML מוטבעת (כשלא משתמשים בשמור)                 |
| `input`   | string | no       | מחרוזת JSON של נתוני קלט עבור תהליך העבודה             |

נדרש אחד מ-`name` או `yaml`.

### `workflow_list`

הצגת כל תהליכי העבודה השמורים הנגישים ברמת הסיווג הנוכחית. ללא פרמטרים.

### `workflow_get`

שליפת הגדרת תהליך עבודה שמור לפי שם.

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| `name`    | string | yes      | שם תהליך העבודה לשליפה                 |

### `workflow_delete`

מחיקת תהליך עבודה שמור לפי שם. תהליך העבודה חייב להיות נגיש ברמת הסיווג של
הסשן הנוכחי.

| Parameter | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| `name`    | string | yes      | שם תהליך העבודה למחיקה               |

### `workflow_history`

צפייה בתוצאות הרצה קודמות של תהליכי עבודה, עם אפשרות סינון לפי שם.

| Parameter       | Type   | Required | Description                                |
| --------------- | ------ | -------- | ------------------------------------------ |
| `workflow_name` | string | no       | סינון תוצאות לפי שם תהליך עבודה            |
| `limit`         | string | no       | מספר מקסימלי של תוצאות (ברירת מחדל 10)     |

## סוגי משימות

תהליכי עבודה מורכבים ממשימות בבלוק `do:`. כל משימה היא רשומה בעלת שם עם
גוף ייחודי לסוג. Triggerfish תומך ב-8 סוגי משימות.

### `call` — קריאות חיצוניות

שליחה ל-HTTP endpoint או שירות Triggerfish.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

שדה ה-`call` קובע את יעד השליחה. ראה
[Call Dispatch](#call-dispatch) למיפוי המלא.

### `run` — Shell, סקריפט או תת-תהליך עבודה

הרצת פקודת shell, סקריפט מוטבע או תהליך עבודה שמור אחר.

**פקודת shell:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**תת-תהליך עבודה:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
הרצת shell וסקריפט דורשת שדגל `allowShellExecution` יהיה מופעל בהקשר כלי
תהליך העבודה. כאשר מושבת, משימות run עם יעדי `shell` או `script` ייכשלו.
:::

### `set` — שינויי הקשר נתונים

הקצאת ערכים להקשר הנתונים של תהליך העבודה. תומך בביטויים.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — הסתעפות מותנית

הסתעפות על סמך תנאים. לכל מקרה יש ביטוי `when` והנחיית זרימה `then`. מקרה
ללא `when` משמש כברירת מחדל.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — איטרציה

לולאה על אוסף, הרצת בלוק `do:` מקונן עבור כל פריט.

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

שדה `each` נותן שם למשתנה הלולאה, `in` מפנה לאוסף, ושדה `at` האופציונלי
מספק את האינדקס הנוכחי.

### `raise` — עצירה עם שגיאה

עצירת ההרצה עם שגיאה מובנית.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — רישום אירועים

רישום אירוע תהליך עבודה. אירועים נלכדים בתוצאת ההרצה וניתנים לצפייה דרך
`workflow_history`.

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — השהיה

השהיית ההרצה למשך זמן ISO 8601.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Call Dispatch

שדה ה-`call` במשימת call קובע איזה כלי Triggerfish מופעל.

| Call type              | Triggerfish tool | שדות `with:` נדרשים                    |
| ---------------------- | ---------------- | -------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` (או `url`), `method`        |
| `triggerfish:llm`      | `llm_task`       | `prompt` (או `task`)                   |
| `triggerfish:agent`    | `subagent`       | `prompt` (או `task`)                   |
| `triggerfish:memory`   | `memory_*`       | `operation` + שדות ייחודיים לפעולה     |
| `triggerfish:web_search` | `web_search`   | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`   |
| `triggerfish:message`  | `send_message`   | `channel`, `text`                      |

**פעולות זיכרון:** סוג הקריאה `triggerfish:memory` דורש שדה `operation`
שמוגדר לאחד מ-`save`, `search`, `get`, `list` או `delete`. שאר שדות ה-`with:`
מועברים ישירות לכלי הזיכרון המתאים.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**קריאות MCP:** סוג הקריאה `triggerfish:mcp` מנתב לכל כלי שרת MCP מחובר.
ציין את שם ה-`server`, שם ה-`tool` ואובייקט ה-`arguments`.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## ביטויים

ביטויי תהליך עבודה משתמשים בתחביר `${ }` עם רזולוציית dot-path מול הקשר
הנתונים של תהליך העבודה.

```yaml
# Simple value reference
url: "${ .config.api_url }"

# Array indexing
first_item: "${ .results[0].name }"

# String interpolation (ביטויים מרובים במחרוזת אחת)
message: "Found ${ .count } issues in ${ .repo }"

# Comparison (מחזיר boolean)
if: "${ .status == 'open' }"

# Arithmetic
total: "${ .price * .quantity }"
```

**אופרטורים נתמכים:**

- השוואה: `==`, `!=`, `>`, `<`, `>=`, `<=`
- אריתמטיקה: `+`, `-`, `*`, `/`, `%`

**ליטרלים:** String (`"value"` או `'value'`), number (`42`, `3.14`), boolean
(`true`, `false`), null (`null`).

כאשר ביטוי `${ }` הוא הערך כולו, הסוג הגולמי נשמר (number, boolean, object).
כאשר מעורב עם טקסט, התוצאה היא תמיד string.

## דוגמה מלאה

תהליך עבודה זה שולף issue מ-GitHub, מסכם אותו עם ה-LLM, שומר את הסיכום
בזיכרון ושולח התראה.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**הרץ את זה:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## טרנספורמציות קלט ופלט

משימות יכולות להמיר את הקלט שלהן לפני ההרצה ואת הפלט שלהן לפני שמירת
התוצאות.

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — ביטוי או מיפוי אובייקט שמחליף את הקשר הקלט של המשימה
  לפני ההרצה.
- **`output.from`** — ביטוי או מיפוי אובייקט שמעצב מחדש את תוצאת המשימה
  לפני שמירתה בהקשר הנתונים.

## בקרת זרימה

כל משימה יכולה לכלול הנחיית `then` השולטת במה שקורה לאחר מכן:

- **`continue`** (ברירת מחדל) — המשך למשימה הבאה ברצף
- **`end`** — עצור את תהליך העבודה מיד (סטטוס: completed)
- **שם משימה** — קפוץ למשימה ספציפית לפי שם

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## הרצה מותנית

כל משימה יכולה לכלול שדה `if`. המשימה מדולגת כאשר התנאי מוערך כ-falsy.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## תת-תהליכי עבודה

משימת `run` עם יעד `workflow` מריצה תהליך עבודה שמור אחר. תת-תהליך העבודה
רץ עם הקשר משלו ומחזיר את הפלט שלו להורה.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

תת-תהליכי עבודה יכולים להיות מקוננים עד **5 רמות עומק**. חריגה ממגבלה זו
מייצרת שגיאה ועוצרת את ההרצה.

## סיווג ואבטחה

תהליכי עבודה משתתפים באותה מערכת סיווג כמו כל שאר הנתונים ב-Triggerfish.

**סיווג אחסון.** כאשר אתה שומר תהליך עבודה עם `workflow_save`, הוא נשמר
ברמת ה-taint של הסשן הנוכחי. תהליך עבודה שנשמר במהלך סשן `CONFIDENTIAL`
ניתן לטעינה רק על ידי סשנים ברמת `CONFIDENTIAL` ומעלה.

**תקרת סיווג.** תהליכי עבודה יכולים להצהיר על `classification_ceiling`
ב-YAML שלהם. לפני הרצת כל משימה, המנוע בודק שה-taint הנוכחי של הסשן אינו
חורג מהתקרה. אם ה-taint של הסשן מסלים מעבר לתקרה במהלך ההרצה (למשל, על
ידי גישה לנתונים מסווגים דרך קריאת כלי), תהליך העבודה נעצר עם שגיאת חריגה
מתקרה.

```yaml
classification_ceiling: INTERNAL
```

ערכים חוקיים: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**היסטוריית הרצות.** תוצאות הרצה נשמרות עם סיווג הסשן בזמן ההשלמה.
`workflow_history` מסנן תוצאות לפי `canFlowTo`, כך שתראה רק הרצות שהן ברמת
ה-taint הנוכחי של הסשן שלך או מתחתיו.

::: danger אבטחה
מחיקת תהליך עבודה דורשת שתהליך העבודה יהיה נגיש ברמת הסיווג של הסשן הנוכחי
שלך. אינך יכול למחוק תהליך עבודה השמור ברמת `CONFIDENTIAL` מסשן `PUBLIC`.
כלי `workflow_delete` טוען את תהליך העבודה תחילה ומחזיר "not found" אם בדיקת
הסיווג נכשלת.
:::

## ריפוי עצמי

תהליכי עבודה יכולים לכלול באופן אופציונלי סוכן ריפוי אוטונומי שצופה בהרצה
בזמן אמת, מאבחן כשלונות ומציע תיקונים. כאשר ריפוי עצמי מופעל, סוכן מוביל
נוצר לצד הרצת תהליך העבודה. הוא צופה בכל אירוע שלב, ממיין כשלונות ומתאם
צוותות מומחים לפתרון בעיות.

### הפעלת ריפוי עצמי

הוסף בלוק `self_healing` לסעיף `metadata.triggerfish` של תהליך העבודה:

```yaml
document:
  dsl: "1.0"
  namespace: ops
  name: data-pipeline
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
do:
  - fetch-data:
      call: http
      with:
        endpoint: "https://api.example.com/data"
      metadata:
        description: "Fetch raw invoice data from billing API"
        expects: "API returns JSON array of invoice objects"
        produces: "Array of {id, amount, status, date} objects"
```

כאשר `enabled: true`, כל שלב **חייב** לכלול שלושה שדות metadata:

| Field         | Description                                    |
| ------------- | ---------------------------------------------- |
| `description` | מה השלב עושה ולמה הוא קיים                    |
| `expects`     | צורת הקלט או תנאים מוקדמים שהשלב צריך         |
| `produces`    | צורת הפלט שהשלב מייצר                          |

המנתח דוחה תהליכי עבודה שבהם חסרים שדות אלה בכל שלב.

### אפשרויות תצורה

| Option                    | Type    | Default              | Description |
| ------------------------- | ------- | -------------------- | ----------- |
| `enabled`                 | boolean | —                    | נדרש. מפעיל את סוכן הריפוי. |
| `retry_budget`            | number  | `3`                  | מספר מקסימלי של ניסיונות התערבות לפני הסלמה כבלתי ניתן לפתרון. |
| `approval_required`       | boolean | `true`               | האם תיקוני תהליך עבודה מוצעים דורשים אישור אנושי. |
| `pause_on_intervention`   | string  | `"blocking_only"`    | מתי להשהות משימות downstream: `always`, `never` או `blocking_only`. |
| `pause_timeout_seconds`   | number  | `300`                | שניות המתנה במהלך השהיה לפני שמדיניות ה-timeout מופעלת. |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| מה קורה ב-timeout: `escalate_and_halt`, `escalate_and_skip` או `escalate_and_fail`. |
| `notify_on`               | array   | `[]`                 | אירועים שמפעילים התראות: `intervention`, `escalation`, `approval_required`. |

### כיצד זה עובד

1. **תצפית.** סוכן הריפוי המוביל מקבל זרם בזמן אמת של אירועי שלבים
   (התחיל, הושלם, נכשל, דולג) בזמן שתהליך העבודה מתבצע.

2. **מיון.** כאשר שלב נכשל, המוביל ממיין את הכשל לאחת מחמש קטגוריות:

   | קטגוריה              | משמעות                                           |
   | --------------------- | ------------------------------------------------ |
   | `transient_retry`     | בעיה זמנית (שגיאת רשת, הגבלת קצב, 503)          |
   | `runtime_workaround`  | שגיאה לא מוכרת בפעם הראשונה, ייתכן שניתן לעקוף  |
   | `structural_fix`      | כשל חוזר הדורש שינוי בהגדרת תהליך העבודה         |
   | `plugin_gap`          | בעיית אימות/הרשאות הדורשת אינטגרציה חדשה        |
   | `unresolvable`        | תקציב ניסיונות חוזרים מוצה או שבור מיסודו        |

3. **צוותות מומחים.** על סמך קטגוריית המיון, המוביל יוצר צוות של סוכנים
   מומחים (מאבחן, מתאם ניסיונות חוזרים, מתקן הגדרות, מחבר plugin וכו')
   לחקירה ופתרון הבעיה.

4. **הצעות גרסה.** כאשר נדרש תיקון מבני, הצוות מציע גרסה חדשה של תהליך
   העבודה. אם `approval_required` מוגדר כ-true, ההצעה ממתינה לסקירה אנושית
   דרך `workflow_version_approve` או `workflow_version_reject`.

5. **השהיה ממוקדת.** כאשר `pause_on_intervention` מופעל, רק משימות downstream
   מושהות -- ענפים עצמאיים ממשיכים לפעול.

### כלי ריפוי

ארבעה כלים נוספים זמינים לניהול מצב הריפוי:

| כלי                        | Description                                |
| -------------------------- | ------------------------------------------ |
| `workflow_version_list`    | הצגת גרסאות מוצעות/מאושרות/נדחות          |
| `workflow_version_approve` | אישור גרסה מוצעת                           |
| `workflow_version_reject`  | דחיית גרסה מוצעת עם סיבה                   |
| `workflow_healing_status`  | מצב ריפוי נוכחי עבור הרצת תהליך עבודה     |

### אבטחה

- סוכן הריפוי **אינו יכול לשנות את תצורת `self_healing` שלו**. גרסאות מוצעות
  שמשנות את בלוק התצורה נדחות.
- הסוכן המוביל וכל חברי הצוות יורשים את רמת ה-taint של תהליך העבודה ומסלימים
  בצעד נעילה.
- כל פעולות הסוכנים עוברות דרך שרשרת ה-policy hook הסטנדרטית -- ללא עקיפות.
- גרסאות מוצעות נשמרות ברמת הסיווג של תהליך העבודה.
