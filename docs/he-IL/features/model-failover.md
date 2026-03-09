# ספקי LLM ומעבר אוטומטי

Triggerfish תומך בספקי LLM מרובים עם מעבר אוטומטי, בחירת מודל לכל סוכן
והחלפת מודל ברמת סשן. ללא נעילה לספק יחיד.

## ספקים נתמכים

| ספק        | אימות  | מודלים                      | הערות                                |
| ---------- | ------- | -------------------------- | ----------------------------------- |
| Anthropic  | מפתח API | Claude Opus, Sonnet, Haiku | API סטנדרטי של Anthropic             |
| OpenAI     | מפתח API | GPT-4o, o1, o3             | API סטנדרטי של OpenAI                |
| Google     | מפתח API | Gemini Pro, Flash          | API של Google AI Studio              |
| Local      | ללא     | Llama, Mistral, וכו'      | תואם Ollama, פורמט OpenAI           |
| OpenRouter | מפתח API | כל מודל ב-OpenRouter       | גישה מאוחדת לספקים רבים             |
| Z.AI       | מפתח API | GLM-4.7, GLM-4.5, GLM-5   | תוכנית Z.AI Coding, תואם OpenAI     |

## ממשק LlmProvider

כל הספקים מיישמים את אותו ממשק:

```typescript
interface LlmProvider {
  /** יצירת השלמה מהיסטוריית הודעות. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** הזרמת השלמה token-by-token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** האם ספק זה תומך בקריאת כלים/פונקציות. */
  supportsTools: boolean;

  /** מזהה המודל (למשל, "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

משמעות הדבר שניתן להחליף ספקים ללא שינוי לוגיקת אפליקציה. לולאת הסוכן
וכל תיאום הכלים עובדים באופן זהה ללא קשר לספק הפעיל.

## תצורה

### הגדרה בסיסית

הגדירו את המודל הראשי ואישורי ספק ב-`triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5
    openai:
      model: gpt-4o
    google:
      model: gemini-pro
    ollama:
      model: llama3
      baseUrl: "http://localhost:11434/v1" # ברירת מחדל של Ollama
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### שרשרת מעבר

FailoverChain מספק מעבר אוטומטי כאשר ספק אינו זמין. הגדירו רשימה
מסודרת של מודלים חלופיים:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # חלופה ראשונה
    - gpt-4o # חלופה שנייה
    - ollama/llama3 # חלופה מקומית (ללא צורך באינטרנט)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

כאשר המודל הראשי נכשל עקב תנאי מוגדר (הגבלת קצב, שגיאת שרת או
timeout), Triggerfish מנסה אוטומטית את הספק הבא בשרשרת. זה קורה באופן
שקוף -- השיחה ממשיכה ללא הפרעה.

### תנאי מעבר

| תנאי           | תיאור                                       |
| -------------- | ------------------------------------------- |
| `rate_limited` | הספק מחזיר תגובת 429 הגבלת קצב              |
| `server_error` | הספק מחזיר שגיאת שרת 5xx                     |
| `timeout`      | הבקשה חורגת מה-timeout המוגדר                |

## בחירת מודל לכל סוכן

ב[הגדרה רב-סוכנית](./multi-agent), כל סוכן יכול להשתמש במודל שונה
המותאם לתפקידו:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # היסק הטוב ביותר למחקר
    - id: quick-tasks
      model: claude-haiku-4-5 # מהיר וזול למשימות פשוטות
    - id: coding
      model: claude-sonnet-4-5 # איזון טוב לקוד
```

## החלפת מודל ברמת סשן

הסוכן יכול להחליף מודלים באמצע סשן לאופטימיזציית עלויות. השתמשו במודל
מהיר לשאילתות פשוטות והסלימו למודל יכול יותר להיסק מורכב. זה זמין דרך
כלי `session_status`.

## הגבלת קצב

Triggerfish כולל מגביל קצב בחלון נע מובנה שמונע פגיעה במגבלות API של
ספקים. המגביל עוטף כל ספק באופן שקוף -- הוא עוקב אחר tokens-per-minute
(TPM) ו-requests-per-minute (RPM) בחלון נע ומשהה קריאות כאשר מתקרבים
למגבלות.

הגבלת קצב עובדת לצד מעבר: אם מגבלת הקצב של ספק אוזלת והמגביל אינו
יכול לחכות בתוך ה-timeout, שרשרת המעבר מופעלת ומנסה את הספק הבא.

ראו [הגבלת קצב](/he-IL/features/rate-limiting) לפרטים מלאים כולל מגבלות
שכבות OpenAI.

::: info מפתחות API לעולם אינם מאוחסנים בקובצי תצורה. השתמשו ב-OS keychain
שלכם דרך `triggerfish config set-secret`. ראו את [מודל האבטחה](/he-IL/security/)
לפרטים על ניהול סודות. :::
