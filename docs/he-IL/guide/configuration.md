# הגדרות

Triggerfish מוגדרת דרך קובץ YAML יחיד ב-`~/.triggerfish/triggerfish.yaml`.
אשף ההגדרה (`triggerfish dive`) יוצר קובץ זה עבורכם, אך תוכלו לערוך אותו
ידנית בכל עת.

## מיקום קובץ ההגדרות

```
~/.triggerfish/triggerfish.yaml
```

ניתן להגדיר ערכים בודדים משורת הפקודה באמצעות נתיבים מופרדים בנקודות:

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

ערכים בוליאניים ומספרים שלמים מומרים אוטומטית. סודות מוסתרים בפלט.

אמתו את ההגדרות עם:

```bash
triggerfish config validate
```

## מודלים

קטע ה-`models` מגדיר את ספקי ה-LLM והתנהגות ה-failover.

```yaml
models:
  # איזה ספק ומודל להשתמש כברירת מחדל
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # אופציונלי: מודל ראייה לתיאור תמונות אוטומטי כאשר למודל
  # הראשי אין תמיכה בראייה
  # vision: gemini-2.0-flash

  # תגובות בזרימה (ברירת מחדל: true)
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # ברירת מחדל של Ollama

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # ברירת מחדל של LM Studio

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # שרשרת failover: אם הראשי נכשל, נסו אלה לפי הסדר
  failover:
    - openai
    - google
```

מפתחות API מאוחסנים ב-keychain של מערכת ההפעלה, לא בקובץ זה. אשף ההגדרה
(`triggerfish dive`) מבקש את מפתח ה-API ומאחסן אותו באופן מאובטח. Ollama
ו-LM Studio הם מקומיים ואינם דורשים אימות.

## ערוצים

קטע ה-`channels` מגדיר לאילו פלטפורמות הודעות הסוכן שלכם מתחבר ואת רמת
הסיווג עבור כל אחת.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  signal:
    enabled: true
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "your-phone-number-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL
```

טוקנים, סיסמאות ומפתחות API לכל ערוץ מאוחסנים ב-keychain של מערכת ההפעלה.
הריצו `triggerfish config add-channel <name>` להזנת פרטי הזדהות באופן
אינטראקטיבי -- הם נשמרים ב-keychain, לעולם לא בקובץ זה.

### מפתחות הגדרת ערוץ

הגדרות שאינן סודיות ב-`triggerfish.yaml`:

| ערוץ     | מפתחות הגדרה                                                  | מפתחות אופציונליים                                                      |
| -------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                               | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                      | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                     | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`, `port`, `allowedOrigins`                              |
| Email    | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

סודות (טוקני בוט, מפתחות API, סיסמאות, סודות חתימה) מוזנים במהלך הגדרת
הערוץ ומאוחסנים ב-keychain של מערכת ההפעלה.

### רמות סיווג ברירת מחדל

| ערוץ     | ברירת מחדל     |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

כל ברירות המחדל ניתנות להתאמה. הגדירו כל ערוץ לכל רמת סיווג.

## שרתי MCP

חברו שרתי MCP חיצוניים כדי לתת לסוכן גישה לכלים נוספים. ראו
[MCP Gateway](/he-IL/integrations/mcp-gateway) למודל האבטחה המלא.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL
```

כל שרת חייב לכלול רמת `classification` או שיידחה (דחייה כברירת מחדל).
השתמשו ב-`command` + `args` לשרתים מקומיים (מורצים כתהליכי משנה) או `url`
לשרתים מרוחקים (HTTP SSE). ערכי סביבה עם קידומת `keychain:` מאוחזרים
מה-keychain של מערכת ההפעלה.

לעזרה בבחירת רמות סיווג, ראו [מדריך סיווג](./classification-guide).

## סיווג

קטע ה-`classification` שולט כיצד Triggerfish מסווגת ומגנה על נתונים.

```yaml
classification:
  mode: personal # "personal" או "enterprise" (בקרוב)
```

**רמות סיווג:**

| רמה            | תיאור           | דוגמאות                                                       |
| -------------- | --------------- | ------------------------------------------------------------- |
| `RESTRICTED`   | הרגיש ביותר     | מסמכי M&A, PII, חשבונות בנק, רשומות רפואיות                   |
| `CONFIDENTIAL` | רגיש            | נתוני CRM, פיננסיים, חוזים, רשומות מס                          |
| `INTERNAL`     | פנימי בלבד      | ויקי פנימי, הערות אישיות, אנשי קשר                             |
| `PUBLIC`       | בטוח לכולם      | חומרי שיווק, מידע ציבורי, תוכן אינטרנט כללי                    |

להנחיות מפורטות לגבי בחירת הרמה הנכונה לאינטגרציות, ערוצים ושרתי MCP שלכם,
ראו [מדריך סיווג](./classification-guide).

## מדיניות

קטע ה-`policy` מגדיר כללי אכיפה מותאמים אישית מעבר להגנות המובנות.

```yaml
policy:
  # פעולת ברירת מחדל כשאין כלל תואם
  default_action: ALLOW

  # כללים מותאמים אישית
  rules:
    # חסימת תגובות כלים המכילות דפוסי SSN
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # הגבלת קצב קריאות API חיצוניות
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info כללי האבטחה הליבתיים -- אי-כתיבה למטה, הסלמת Taint של סשן, רישום
ביקורת -- תמיד נאכפים ולא ניתנים להשבתה. כללי מדיניות מותאמים אישית מוסיפים
בקרות נוספות על גבי הגנות קבועות אלו. :::

## חיפוש ושליפת אינטרנט

קטע ה-`web` מגדיר חיפוש אינטרנט ושליפת תוכן, כולל בקרות אבטחת דומיינים.

```yaml
web:
  search:
    provider: brave # תשתית חיפוש (brave נתמך כעת)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # בקשות לדקה
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability או raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # ריק = אפשר הכול (פחות denylist)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

הגדירו חיפוש משורת הפקודה:

```bash
triggerfish config set web.search.provider brave
```

מפתח ה-API של Brave מוזן במהלך `triggerfish dive` ומאוחסן ב-keychain של
מערכת ההפעלה.

::: tip קבלו מפתח API של Brave Search ב-[brave.com/search/api](https://brave.com/search/api/).
רמה חינמית כוללת 2,000 שאילתות/חודש. :::

## משימות Cron

תזמנו משימות חוזרות עבור הסוכן שלכם:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # 7 בבוקר יומית
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # לאן לשלוח תוצאות
      classification: INTERNAL # תקרת Taint מקסימלית למשימה זו

    - id: pipeline-check
      schedule: "0 */4 * * *" # כל 4 שעות
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

כל משימת cron רצה בסשן מבודד משלה עם תקרת סיווג. כל פעולות ה-cron עוברות
דרך ה-Hook-ים הרגילים של המדיניות.

## תזמון טריגרים

הגדירו כמה פעמים הסוכן שלכם מבצע בדיקות פרואקטיביות:

```yaml
trigger:
  interval: 30m # בדיקה כל 30 דקות
  classification: INTERNAL # תקרת Taint מקסימלית לסשנים של טריגרים
  quiet_hours: "22:00-07:00" # ללא הפעלה בשעות שקטות
```

מערכת הטריגרים קוראת את קובץ ה-`~/.triggerfish/TRIGGER.md` שלכם כדי להחליט
מה לבדוק בכל התעוררות. ראו [SPINE וטריגרים](./spine-and-triggers) לפרטים
על כתיבת ה-TRIGGER.md שלכם.

## Webhooks

קבלו אירועים נכנסים משירותים חיצוניים:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"
```

## דוגמה מלאה

הנה הגדרה מלאה לדוגמה עם הערות:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- ספקי LLM ---
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929
  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
    openai:
      model: gpt-4o
  failover:
    - openai

# --- ערוצים ---
channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL
  signal:
    enabled: false
  slack:
    enabled: false

# --- סיווג ---
classification:
  mode: personal

# --- מדיניות ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Prepare morning briefing"
      channel: telegram
      classification: INTERNAL

# --- טריגרים ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## צעדים הבאים

- הגדירו את זהות הסוכן ב-[SPINE.md](./spine-and-triggers)
- הגדירו ניטור פרואקטיבי עם [TRIGGER.md](./spine-and-triggers)
- למדו את כל פקודות ה-CLI ב[מדריך הפקודות](./commands)
