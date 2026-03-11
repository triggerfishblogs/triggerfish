# סכמת תצורה

Triggerfish מוגדר באמצעות `triggerfish.yaml`, הממוקם ב-
`~/.triggerfish/triggerfish.yaml` לאחר הרצת `triggerfish dive`. עמוד זה מתעד
כל חלק תצורה.

::: info הפניות לסודות כל ערך מחרוזת בקובץ זה יכול להשתמש בקידומת `secret:`
להפניה לאישור מאוחסן ב-keychain של מערכת ההפעלה. לדוגמה,
`apiKey: "secret:provider:anthropic:apiKey"` מפענח את הערך מה-keychain
בעת ההפעלה. ראו
[ניהול סודות](/he-IL/security/secrets#secret-references-in-configuration)
לפרטים. :::

## דוגמה מוערת מלאה

```yaml
# =============================================================================
# triggerfish.yaml -- עיון מלא בתצורה
# =============================================================================

# ---------------------------------------------------------------------------
# Models: הגדרת ספקי LLM ו-failover
# ---------------------------------------------------------------------------
models:
  # המודל הראשי המשמש להשלמות הסוכן
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # אופציונלי: מודל ראייה נפרד לתיאור תמונות
  # כאשר המודל הראשי אינו תומך בראייה, תמונות מתוארות
  # אוטומטית על ידי מודל זה לפני שהן מגיעות לראשי.
  # vision: glm-4.5v

  # תגובות streaming (ברירת מחדל: true)
  # streaming: true

  # תצורה ספציפית לספק
  # מפתחות API מופנים באמצעות תחביר secret: ומפוענחים מ-keychain של מערכת ההפעלה.
  # הריצו `triggerfish dive` או `triggerfish config migrate-secrets` להגדרה.
  providers:
    anthropic:
      model: claude-sonnet-4-5
      # apiKey: "secret:provider:anthropic:apiKey"

    openai:
      model: gpt-4o

    google:
      model: gemini-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234"

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # שרשרת failover מסודרת -- נבדקים ברצף כשהראשי נכשל
  failover:
    - claude-haiku-4-5 # חלופה ראשונה
    - gpt-4o # חלופה שנייה
    - ollama/llama3 # חלופה מקומית (לא דורש אינטרנט)

  # התנהגות failover
  failover_config:
    max_retries: 3 # ניסיונות חוזרים לכל ספק לפני מעבר לבא
    retry_delay_ms: 1000 # השהיה בין ניסיונות חוזרים
    conditions: # מה מפעיל failover
      - rate_limited # הספק החזיר 429
      - server_error # הספק החזיר 5xx
      - timeout # הבקשה חרגה מהזמן הקצוב

# ---------------------------------------------------------------------------
# Logging: פלט לוג מובנה
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: חיבורי פלטפורמות הודעות
# ---------------------------------------------------------------------------
# סודות (טוקנים, מפתחות API, סיסמאות) מאוחסנים ב-keychain של מערכת ההפעלה.
# הריצו `triggerfish config add-channel <name>` להזנתם באופן מאובטח.
# רק תצורה שאינה סודית מופיעה כאן.
channels:
  telegram:
    ownerId: 123456789 # מזהה המשתמש המספרי שלכם ב-Telegram
    classification: INTERNAL # ברירת מחדל: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # נקודת קצה של שרת signal-cli
    account: "+14155552671" # מספר הטלפון שלכם ב-Signal (E.164)
    classification: PUBLIC # ברירת מחדל: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # ברירת מחדל: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # מזהה המשתמש שלכם ב-Discord
    classification: PUBLIC # ברירת מחדל: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # מלוח הבקרה של Meta Business
    classification: PUBLIC # ברירת מחדל: PUBLIC

  webchat:
    port: 8765 # פורט WebSocket ללקוח רשת
    classification: PUBLIC # ברירת מחדל: PUBLIC (מבקרים)

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # ברירת מחדל: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: מודל רגישות נתונים
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" או "enterprise" (בקרוב)
# רמות: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

# ---------------------------------------------------------------------------
# Policy: כללי אכיפה מותאמים (פתח מילוט ארגוני)
# ---------------------------------------------------------------------------
policy:
  rules:
    - id: block-external-pii
      hook: PRE_OUTPUT
      priority: 100
      conditions:
        - type: recipient_is
          value: EXTERNAL
        - type: content_matches
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" # תבנית SSN
      action: REDACT
      message: "PII redacted for external recipient"

    - id: rate-limit-browser
      hook: PRE_TOOL_CALL
      priority: 50
      conditions:
        - type: tool_name
          value: browser
        - type: rate_exceeds
          value: 10/minute
      action: BLOCK
      message: "Browser tool rate limit exceeded"

# ---------------------------------------------------------------------------
# MCP Servers: שרתי כלים חיצוניים
# ---------------------------------------------------------------------------
mcp_servers:
  filesystem:
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL

  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Scheduler: משימות cron וטריגרים
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 בבוקר יומי
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # כל 4 שעות
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # כל 15 דקות
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m # בדיקה כל 30 דקות
    classification: INTERNAL # תקרת זיהום מקסימלית לטריגרים
    quiet_hours: "22:00-07:00" # השתקה בשעות אלו

# ---------------------------------------------------------------------------
# Notifications: העדפות מסירה
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # ערוץ מסירה ברירת מחדל
  quiet_hours: "22:00-07:00" # השתקת עדיפות רגילה/נמוכה
  batch_interval: 15m # קיבוץ התראות בעדיפות נמוכה

# ---------------------------------------------------------------------------
# Agents: ניתוב רב-סוכני (אופציונלי)
# ---------------------------------------------------------------------------
agents:
  default: personal # סוכן חלופי
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp, telegram]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: INTERNAL

    - id: work
      name: "Work Assistant"
      channels: [slack, email]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Voice: תצורת דיבור (אופציונלי)
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # גודל מודל Whisper
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice-id"
  wake_word: "triggerfish"
  push_to_talk:
    shortcut: "Ctrl+Space"

# ---------------------------------------------------------------------------
# Webhooks: נקודות קצה לאירועים נכנסים (אופציונלי)
# ---------------------------------------------------------------------------
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # סוד webhook מאוחסן ב-keychain של מערכת ההפעלה
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "pull_request_review"
          task: "A PR review was submitted. Read tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read tracking file, address comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address feedback."
        - event: "pull_request.closed"
          task: "PR closed or merged. Clean up branches and archive tracking file."
        - event: "issues.opened"
          task: "Triage new issue"

# ---------------------------------------------------------------------------
# GitHub: הגדרות אינטגרציית GitHub (אופציונלי)
# ---------------------------------------------------------------------------
github:
  auto_merge: false # ברירת מחדל: false. הגדירו true למיזוג אוטומטי של PRs מאושרים.

# ---------------------------------------------------------------------------
# Groups: התנהגות צ'אט קבוצתי (אופציונלי)
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Remote: גישה מרחוק (אופציונלי)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Web: תצורת חיפוש ושליפה
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # backend חיפוש (brave הוא ברירת המחדל)
# מפתח API מאוחסן ב-keychain של מערכת ההפעלה

# ---------------------------------------------------------------------------
# Remote: גישה מרחוק (אופציונלי)
# ---------------------------------------------------------------------------
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
# טוקן אימות מאוחסן ב-keychain של מערכת ההפעלה
```

## עיון בחלקים

### `models`

| מפתח                             | סוג      | תיאור                                                                                                          |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `primary`                        | object   | הפניית מודל ראשי עם שדות `provider` ו-`model`                                                                   |
| `primary.provider`               | string   | שם ספק (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)                   |
| `primary.model`                  | string   | מזהה מודל המשמש להשלמות הסוכן                                                                                  |
| `vision`                         | string   | מודל ראייה אופציונלי לתיאור תמונות אוטומטי (ראו [תמונה וראייה](/he-IL/features/image-vision))                   |
| `streaming`                      | boolean  | הפעלת תגובות streaming (ברירת מחדל: `true`)                                                                     |
| `providers`                      | object   | תצורה ספציפית לספק (ראו להלן)                                                                                  |
| `failover`                       | string[] | רשימה מסודרת של מודלים חלופיים                                                                                  |
| `failover_config.max_retries`    | number   | ניסיונות חוזרים לכל ספק לפני failover                                                                           |
| `failover_config.retry_delay_ms` | number   | השהיה בין ניסיונות חוזרים באלפיות שנייה                                                                         |
| `failover_config.conditions`     | string[] | תנאים המפעילים failover                                                                                         |

### `channels`

כל מפתח ערוץ הוא סוג הערוץ. כל סוגי הערוצים תומכים בשדה `classification`
לדריסת רמת הסיווג המוגדרת כברירת מחדל.

::: info כל הסודות (טוקנים, מפתחות API, סיסמאות) מאוחסנים ב-keychain של מערכת
ההפעלה, לא בקובץ זה. הריצו `triggerfish config add-channel <name>` להזנת
אישורים באופן מאובטח. :::

### `classification`

| מפתח   | סוג                            | תיאור                                                                        |
| ------ | ------------------------------ | ---------------------------------------------------------------------------- |
| `mode` | `"personal"` או `"enterprise"` | מצב פריסה (בקרוב -- כעת שניהם משתמשים באותן רמות סיווג)                      |

### `policy`

כללים מותאמים המוערכים במהלך ביצוע hooks. כל כלל מציין סוג hook, עדיפות,
תנאים ופעולה. מספרי עדיפות גבוהים יותר מוערכים ראשונים.

### `mcp_servers`

שרתי כלים חיצוניים מסוג MCP. כל שרת מציין פקודה להפעלתו, משתני סביבה
אופציונליים, רמת סיווג והרשאות לכל כלי.

### `scheduler`

הגדרות משימות cron ותזמון טריגרים. ראו
[Cron וטריגרים](/he-IL/features/cron-and-triggers) לפרטים.

### `notifications`

העדפות מסירת התראות. ראו [התראות](/he-IL/features/notifications) לפרטים.

### `web`

| מפתח                  | סוג    | תיאור                                                       |
| --------------------- | ------ | ----------------------------------------------------------- |
| `web.search.provider` | string | backend חיפוש לכלי `web_search` (כעת: `brave`)              |

ראו [חיפוש רשת ושליפה](/he-IL/features/web-search) לפרטים.

### `logging`

| מפתח    | סוג    | ברירת מחדל  | תיאור                                                                                        |
| ------- | ------ | ---------- | -------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | מילוליות לוג: `quiet` (שגיאות בלבד), `normal` (מידע), `verbose` (ניפוי), `debug` (מעקב)       |

ראו [לוגים מובנים](/he-IL/features/logging) לפרטים על פלט לוג וסיבוב קבצים.

### `github`

| מפתח         | סוג     | ברירת מחדל | תיאור                                                                                                                                                                        |
| ------------ | ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false`    | כאשר `true`, הסוכן ממזג אוטומטית PRs לאחר קבלת ביקורת מאשרת. כאשר `false` (ברירת מחדל), הסוכן מודיע לבעלים וממתין להוראת מיזוג מפורשת.                                        |

ראו את מדריך [אינטגרציית GitHub](/he-IL/integrations/github) להוראות הגדרה
מלאות.
