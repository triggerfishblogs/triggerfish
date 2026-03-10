---
title: הפניה ל-Workflow DSL
description: הפניה מלאה ל-CNCF Serverless Workflow DSL 1.0 כפי שמיושם ב-Triggerfish.
---

# הפניה ל-Workflow DSL

הפניה מלאה ל-CNCF Serverless Workflow DSL 1.0 כפי שמיושם במנוע תהליכי
העבודה של Triggerfish. למדריך שימוש ודוגמאות, ראה
[תהליכי עבודה](/he-IL/features/workflows).

## מבנה מסמך

כל YAML של תהליך עבודה חייב לכלול שדה `document` ברמה העליונה ובלוק `do`.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # optional
  description: "What it does"  # optional
classification_ceiling: INTERNAL  # optional
input:                            # optional
  from: "${ . }"
output:                           # optional
  from:
    result: "${ .final_step }"
timeout:                          # optional
  after: PT5M
do:
  - task_name:
      # task definition
```

### מטא-נתוני מסמך

| Field         | Type   | Required | Description                                    |
| ------------- | ------ | -------- | ---------------------------------------------- |
| `dsl`         | string | yes      | גרסת DSL. חייב להיות `"1.0"`                  |
| `namespace`   | string | yes      | קיבוץ לוגי (למשל, `ops`, `reports`)           |
| `name`        | string | yes      | שם ייחודי לתהליך עבודה בתוך ה-namespace       |
| `version`     | string | no       | מחרוזת גרסה סמנטית                            |
| `description` | string | no       | תיאור קריא לאדם                               |

### שדות ברמה העליונה

| Field                     | Type         | Required | Description                                        |
| ------------------------- | ------------ | -------- | -------------------------------------------------- |
| `document`                | object       | yes      | מטא-נתוני מסמך (ראה למעלה)                         |
| `do`                      | array        | yes      | רשימה מסודרת של רשומות משימות                       |
| `classification_ceiling`  | string       | no       | taint סשן מקסימלי מותר במהלך ההרצה                 |
| `input`                   | transform    | no       | טרנספורמציה המיושמת על קלט תהליך העבודה            |
| `output`                  | transform    | no       | טרנספורמציה המיושמת על פלט תהליך העבודה            |
| `timeout`                 | object       | no       | timeout ברמת תהליך עבודה (`after: <ISO 8601>`)     |
| `metadata`                | object       | no       | מטא-נתונים שרירותיים של מפתח-ערך                   |

---

## פורמט רשומת משימה

כל רשומה בבלוק `do` היא אובייקט עם מפתח יחיד. המפתח הוא שם המשימה,
הערך הוא הגדרת המשימה.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

שמות משימות חייבים להיות ייחודיים בתוך אותו בלוק `do`. תוצאת המשימה נשמרת
בהקשר הנתונים תחת שם המשימה.

---

## שדות משימה משותפים

לכל סוגי המשימות יש שדות אופציונליים משותפים אלה:

| Field      | Type      | Description                                              |
| ---------- | --------- | -------------------------------------------------------- |
| `if`       | string    | תנאי ביטוי. המשימה מדולגת כאשר falsy.                   |
| `input`    | transform | טרנספורמציה המיושמת לפני הרצת המשימה                    |
| `output`   | transform | טרנספורמציה המיושמת לאחר הרצת המשימה                    |
| `timeout`  | object    | timeout משימה: `after: <ISO 8601 duration>`              |
| `then`     | string    | הנחיית זרימה: `continue`, `end` או שם משימה              |
| `metadata` | object    | מטא-נתונים שרירותיים (לא בשימוש המנוע)                  |

---

## סוגי משימות

### `call`

שליחה ל-HTTP endpoint או שירות Triggerfish.

| Field  | Type   | Required | Description                                         |
| ------ | ------ | -------- | --------------------------------------------------- |
| `call` | string | yes      | סוג קריאה (ראה טבלת dispatch למטה)                  |
| `with` | object | no       | ארגומנטים המועברים לכלי היעד                         |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

הרצת פקודת shell, סקריפט מוטבע או תת-תהליך עבודה. שדה `run` חייב לכלול
בדיוק אחד מ-`shell`, `script` או `workflow`.

**Shell:**

| Field                  | Type   | Required | Description                    |
| ---------------------- | ------ | -------- | ------------------------------ |
| `run.shell.command`    | string | yes      | פקודת shell להרצה              |
| `run.shell.arguments`  | object | no       | ארגומנטים בעלי שם              |
| `run.shell.environment`| object | no       | משתני סביבה                    |

**Script:**

| Field                  | Type   | Required | Description              |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | שפת סקריפט               |
| `run.script.code`      | string | yes      | קוד סקריפט מוטבע         |
| `run.script.arguments` | object | no       | ארגומנטים בעלי שם         |

**תת-תהליך עבודה:**

| Field                | Type   | Required | Description                       |
| -------------------- | ------ | -------- | --------------------------------- |
| `run.workflow.name`  | string | yes      | שם תהליך העבודה השמור             |
| `run.workflow.version` | string | no     | אילוץ גרסה                       |
| `run.workflow.input` | object | no       | נתוני קלט לתת-תהליך עבודה        |

### `set`

הקצאת ערכים להקשר הנתונים.

| Field | Type   | Required | Description                                            |
| ----- | ------ | -------- | ------------------------------------------------------ |
| `set` | object | yes      | זוגות מפתח-ערך להקצאה. ערכים יכולים להיות ביטויים.    |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

הסתעפות מותנית. שדה `switch` הוא מערך של רשומות מקרה. כל מקרה הוא אובייקט
עם מפתח יחיד שבו המפתח הוא שם המקרה.

| Case field | Type   | Required | Description                                              |
| ---------- | ------ | -------- | -------------------------------------------------------- |
| `when`     | string | no       | תנאי ביטוי. השמט למקרה ברירת מחדל.                       |
| `then`     | string | yes      | הנחיית זרימה: `continue`, `end` או שם משימה              |

המקרים מוערכים לפי הסדר. המקרה הראשון עם `when` אמיתי (או ללא `when`) נבחר.

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

איטרציה על אוסף.

| Field      | Type   | Required | Description                                  |
| ---------- | ------ | -------- | -------------------------------------------- |
| `for.each` | string | yes      | שם משתנה עבור הפריט הנוכחי                   |
| `for.in`   | string | yes      | ביטוי המפנה לאוסף                            |
| `for.at`   | string | no       | שם משתנה עבור האינדקס הנוכחי                  |
| `do`       | array  | yes      | רשימת משימות מקוננת המורצת בכל איטרציה       |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Process item ${ .idx }: ${ .item.name }"
```

### `raise`

עצירת תהליך העבודה עם שגיאה מובנית.

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `raise.error.status` | number | yes      | קוד סטטוס בסגנון HTTP |
| `raise.error.type`   | string | yes      | URI/מחרוזת סוג שגיאה  |
| `raise.error.title`  | string | yes      | כותרת קריאה לאדם       |
| `raise.error.detail` | string | no       | הודעת שגיאה מפורטת     |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Invalid input"
        detail: "Field 'email' is required"
```

### `emit`

רישום אירוע תהליך עבודה. אירועים נשמרים בתוצאת ההרצה.

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `emit.event.type`    | string | yes      | מזהה סוג אירוע         |
| `emit.event.source`  | string | no       | URI מקור אירוע         |
| `emit.event.data`    | object | no       | מטען אירוע             |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

השהיית ההרצה למשך זמן.

| Field  | Type   | Required | Description                        |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | משך ISO 8601 (למשל, `PT5S`)       |

משכים נפוצים: `PT1S` (שנייה אחת), `PT30S` (30 שניות), `PT1M` (דקה אחת),
`PT5M` (5 דקות).

---

## טבלת Call Dispatch

ממפה את ערך שדה `call` לכלי Triggerfish שמופעל בפועל.

| ערך `call`             | כלי שמופעל    | שדות `with:` נדרשים                                    |
| ---------------------- | ---------------- | ---------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` או `url`; אופציונלי `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`       | `prompt` או `task`; אופציונלי `tools`, `max_iterations`    |
| `triggerfish:agent`    | `subagent`       | `prompt` או `task`; אופציונלי `tools`, `agent`             |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + שדות פעולה |
| `triggerfish:web_search` | `web_search`   | `query`; אופציונלי `max_results`               |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`; אופציונלי `method`, `headers`, `body`   |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; אופציונלי `arguments` |
| `triggerfish:message`  | `send_message`   | `channel`, `text`; אופציונלי `recipient`       |

סוגי קריאה CNCF שאינם נתמכים (`grpc`, `openapi`, `asyncapi`) מחזירים שגיאה.

---

## תחביר ביטויים

ביטויים מתוחמים ב-`${ }` ומתפרשים מול הקשר הנתונים של תהליך העבודה.

### רזולוציית Dot-Path

| תחביר                   | Description                         | תוצאה לדוגמה          |
| ----------------------- | ----------------------------------- | ---------------------- |
| `${ . }`                | הקשר נתונים שלם                     | `{...}`                |
| `${ .key }`             | מפתח ברמה עליונה                    | `"value"`              |
| `${ .a.b.c }`           | מפתח מקונן                          | `"deep value"`         |
| `${ .items[0] }`        | אינדקס מערך                         | `{...פריט ראשון...}`   |
| `${ .items[0].name }`   | אינדקס מערך ואז מפתח               | `"first"`              |

הנקודה המובילה (או `$.`) מעגנת את הנתיב בשורש ההקשר. נתיבים שמתפרשים
ל-`undefined` מייצרים מחרוזת ריקה כשמוטמעים, או `undefined` כשמשמשים כערך
עצמאי.

### אופרטורים

| סוג        | אופרטורים                     | דוגמה                          |
| ---------- | ----------------------------- | ------------------------------ |
| השוואה     | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`          |
| אריתמטיקה | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

ביטויי השוואה מחזירים `true` או `false`. ביטויי אריתמטיקה מחזירים number
(`undefined` אם אחד האופרנדים אינו מספרי או חלוקה באפס).

### ליטרלים

| סוג     | דוגמאות                  |
| ------- | ------------------------ |
| String  | `"hello"`, `'hello'`     |
| Number  | `42`, `3.14`, `-1`       |
| Boolean | `true`, `false`          |
| Null    | `null`                   |

### מצבי הטמעה

**ביטוי יחיד (ערך גולמי):** כאשר המחרוזת כולה היא ביטוי `${ }` אחד, הערך
הגולמי המוקלד מוחזר (number, boolean, object, array).

```yaml
count: "${ .items.length }"  # מחזיר number, לא string
```

**מעורב / ביטויים מרובים (string):** כאשר ביטויי `${ }` מעורבים עם טקסט או
יש ביטויים מרובים, התוצאה היא תמיד string.

```yaml
message: "Found ${ .count } items in ${ .category }"  # מחזיר string
```

### אמיתיות (Truthiness)

עבור תנאי `if:` וביטויי `when:` ב-`switch`, ערכים מוערכים באמצעות אמיתיות
בסגנון JavaScript:

| ערך                           | אמיתי? |
| ----------------------------- | ------ |
| `true`                        | כן     |
| מספר שאינו אפס               | כן     |
| מחרוזת לא ריקה               | כן     |
| מערך לא ריק                  | כן     |
| Object                        | כן     |
| `false`, `0`, `""`, `null`, `undefined`, מערך ריק | לא |

---

## טרנספורמציות קלט/פלט

טרנספורמציות מעצבות מחדש נתונים הזורמים לתוך ומחוץ למשימות.

### `input`

מיושם לפני הרצת המשימה. מחליף את תצוגת המשימה של הקשר הנתונים.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # המשימה רואה רק את אובייקט ה-config
    with:
      endpoint: "${ .api_url }"  # מתפרש מול אובייקט ה-config
```

**`from` כמחרוזת:** ביטוי שמחליף את הקשר הקלט כולו.

**`from` כאובייקט:** ממפה מפתחות חדשים לביטויים:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

מיושם לאחר הרצת המשימה. מעצב מחדש את התוצאה לפני שמירתה בהקשר תחת שם
המשימה.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## הנחיות זרימה

שדה `then` בכל משימה שולט בזרימת ההרצה לאחר השלמת המשימה.

| ערך          | התנהגות                                                     |
| ------------ | ----------------------------------------------------------- |
| `continue`   | המשך למשימה הבאה ברצף (ברירת מחדל)                         |
| `end`        | עצור את תהליך העבודה. סטטוס: `completed`.                   |
| `<שם משימה>` | קפוץ למשימה בעלת שם. המשימה חייבת להתקיים באותו בלוק `do`. |

מקרי switch גם משתמשים בהנחיות זרימה בשדה `then` שלהם.

---

## תקרת סיווג

שדה אופציונלי המגביל את taint הסשן המקסימלי במהלך ההרצה.

```yaml
classification_ceiling: INTERNAL
```

| ערך            | משמעות                                                    |
| -------------- | --------------------------------------------------------- |
| `PUBLIC`       | תהליך העבודה נעצר אם נגישים נתונים מסווגים               |
| `INTERNAL`     | מאפשר נתוני `PUBLIC` ו-`INTERNAL`                        |
| `CONFIDENTIAL` | מאפשר עד נתוני `CONFIDENTIAL`                            |
| `RESTRICTED`   | מאפשר את כל רמות הסיווג                                  |
| *(הושמט)*      | לא נאכפת תקרה                                            |

התקרה נבדקת לפני כל משימה. אם taint הסשן הסלים מעבר לתקרה (למשל, כי משימה
קודמת גישה לנתונים מסווגים), תהליך העבודה נעצר עם סטטוס `failed` ושגיאה
`Workflow classification ceiling breached`.

---

## אחסון

### הגדרות תהליכי עבודה

נשמרות עם קידומת מפתח `workflows:{name}`. כל רשומה שמורה מכילה:

| Field            | Type   | Description                                |
| ---------------- | ------ | ------------------------------------------ |
| `name`           | string | שם תהליך העבודה                             |
| `yaml`           | string | הגדרת YAML גולמית                           |
| `classification` | string | רמת סיווג בזמן השמירה                       |
| `savedAt`        | string | חותמת זמן ISO 8601                          |
| `description`    | string | תיאור אופציונלי                             |

### היסטוריית הרצות

נשמרת עם קידומת מפתח `workflow-runs:{runId}`. כל רשומת הרצה מכילה:

| Field            | Type   | Description                                |
| ---------------- | ------ | ------------------------------------------ |
| `runId`          | string | UUID עבור הרצה זו                           |
| `workflowName`   | string | שם תהליך העבודה שהורץ                       |
| `status`         | string | `completed`, `failed` או `cancelled`       |
| `output`         | object | הקשר נתונים סופי (מפתחות פנימיים מסוננים)  |
| `events`         | array  | אירועים שהופקו במהלך ההרצה                  |
| `error`          | string | הודעת שגיאה (אם הסטטוס `failed`)           |
| `startedAt`      | string | חותמת זמן ISO 8601                          |
| `completedAt`    | string | חותמת זמן ISO 8601                          |
| `taskCount`      | number | מספר המשימות בתהליך העבודה                   |
| `classification` | string | taint סשן בהשלמה                            |

---

## מגבלות

| מגבלה                     | ערך   | Description                                   |
| ------------------------- | ----- | --------------------------------------------- |
| עומק מקסימלי של תת-תהליך | 5     | קינון מקסימלי של קריאות `run.workflow`         |
| מגבלת ברירת מחדל להיסטוריה| 10    | `limit` ברירת מחדל עבור `workflow_history`     |

---

## סטטוסי הרצה

| Status      | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `pending`   | תהליך העבודה נוצר אך לא התחיל                                 |
| `running`   | תהליך העבודה פועל כעת                                          |
| `completed` | כל המשימות הסתיימו בהצלחה (או `then: end`)                     |
| `failed`    | משימה נכשלה, הופעל `raise` או חריגה מתקרה                      |
| `cancelled` | ההרצה בוטלה חיצונית                                            |
