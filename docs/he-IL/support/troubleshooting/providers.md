# פתרון בעיות: ספקי LLM

## שגיאות ספק נפוצות

### 401 Unauthorized / 403 Forbidden

מפתח ה-API שלכם לא תקף, פג תוקפו או שאין לו הרשאות מספיקות.

**תיקון:**

```bash
# אחסנו מחדש את מפתח ה-API
triggerfish config set-secret provider:<name>:apiKey <your-key>

# אתחלו מחדש את ה-daemon
triggerfish stop && triggerfish start
```

הערות ספציפיות לספק:

| ספק | פורמט מפתח | היכן להשיג |
|------|------------|-------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

חרגתם ממגבלת הקצב של הספק. Triggerfish אינו מנסה מחדש אוטומטית על 429 לרוב הספקים (למעט Notion, שיש לו backoff מובנה).

**תיקון:** המתינו ונסו שוב. אם אתם נתקלים במגבלות קצב באופן עקבי, שקלו:
- שדרוג תוכנית ה-API שלכם למגבלות גבוהות יותר
- הוספת ספק failover כך שבקשות יעברו כאשר הראשי מוגבל
- הפחתת תדירות טריגרים אם משימות מתוזמנות הן הסיבה

### 500 / 502 / 503 שגיאת שרת

שרתי הספק חווים בעיות. אלו בדרך כלל חולפות.

אם יש לכם שרשרת failover מוגדרת, Triggerfish מנסה את הספק הבא אוטומטית. ללא failover, השגיאה מועברת למשתמש.

### "No response body for streaming"

הספק קיבל את הבקשה אך החזיר גוף תגובה ריק לקריאת streaming. זה יכול לקרות כאשר:

- תשתית הספק עמוסה
- proxy או firewall מסירים את גוף התגובה
- המודל אינו זמין זמנית

משפיע על: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## בעיות ספציפיות לספק

### Anthropic

**המרת פורמט כלים.** Triggerfish ממיר בין פורמט כלים פנימי לפורמט הכלים המקורי של Anthropic. אם אתם רואים שגיאות הקשורות לכלים, בדקו שהגדרות הכלים שלכם מכילות JSON Schema תקף.

**טיפול ב-system prompt.** Anthropic דורש את ה-system prompt כשדה נפרד, לא כהודעה. המרה זו אוטומטית, אבל אם אתם רואים הודעות "system" מופיעות בשיחה, משהו שגוי בעיצוב ההודעות.

### OpenAI

**Frequency penalty.** Triggerfish מחיל frequency penalty של 0.3 לכל בקשות OpenAI כדי למנוע פלט חוזר. זה קשיח ולא ניתן לשינוי דרך תצורה.

**תמיכה בתמונות.** OpenAI תומך בתמונות מקודדות base64 בתוכן הודעות. אם ראייה לא עובדת, ודאו שמודל עם יכולת ראייה מוגדר (למשל `gpt-4o`, לא `gpt-4o-mini`).

### Google Gemini

**מפתח בשאילתת URL.** בניגוד לספקים אחרים, Google משתמש במפתח ה-API כפרמטר שאילתה, לא ככותרת. זה מטופל אוטומטית, אבל זה אומר שהמפתח עשוי להופיע בלוגי proxy/גישה אם אתם מנתבים דרך proxy ארגוני.

### Ollama / LM Studio (מקומי)

**השרת חייב לרוץ.** ספקים מקומיים דורשים ששרת המודל ירוץ לפני ש-Triggerfish מתחיל. אם Ollama או LM Studio אינם רצים:

```
Local LLM request failed (connection refused)
```

**הפעילו את השרת:**

```bash
# Ollama
ollama serve

# LM Studio
# פתחו LM Studio והפעילו את השרת המקומי
```

**מודל לא טעון.** עם Ollama, יש למשוך את המודל קודם:

```bash
ollama pull llama3.3:70b
```

**דריסת נקודת קצה.** אם השרת המקומי שלכם אינו בפורט ברירת המחדל:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # ברירת מחדל של Ollama
      # endpoint: "http://localhost:1234"  # ברירת מחדל של LM Studio
```

### Fireworks

**API מקורי.** Triggerfish משתמש ב-API המקורי של Fireworks, לא בנקודת הקצה התואמת OpenAI שלהם. מזהי מודל עשויים להיות שונים ממה שאתם רואים בתיעוד תואם-OpenAI.

**פורמטי מזהה מודל.** Fireworks מקבל מספר תבניות מזהה מודל. האשף מנרמל פורמטים נפוצים, אבל אם האימות נכשל, בדקו את [ספריית המודלים של Fireworks](https://fireworks.ai/models) למזהה המדויק.

### OpenRouter

**ניתוב מודלים.** OpenRouter מנתב בקשות לספקים שונים. שגיאות מהספק הבסיסי עטופות בפורמט השגיאה של OpenRouter. הודעת השגיאה הממשית מחולצת ומוצגת.

**פורמט שגיאת API.** OpenRouter מחזיר שגיאות כאובייקטי JSON. אם הודעת השגיאה נראית כללית, השגיאה הגולמית מתועדת ברמת DEBUG.

### ZenMux / Z.AI

**תמיכת streaming.** שני הספקים תומכים ב-streaming. אם streaming נכשל:

```
ZenMux stream failed (status): error text
```

בדקו שלמפתח ה-API שלכם יש הרשאות streaming (שכבות API מסוימות מגבילות גישת streaming).

---

## Failover

### כיצד failover עובד

כאשר הספק הראשי נכשל, Triggerfish מנסה כל מודל ברשימת `failover` לפי הסדר:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

אם ספק failover מצליח, התגובה מתועדת עם איזה ספק שימש. אם כל הספקים נכשלים, השגיאה האחרונה מוחזרת למשתמש.

### "All providers exhausted"

כל ספק בשרשרת נכשל. בדקו:

1. האם כל מפתחות ה-API תקפים? בדקו כל ספק בנפרד.
2. האם כל הספקים חווים השבתות? בדקו את דפי הסטטוס שלהם.
3. האם הרשת שלכם חוסמת HTTPS יוצא לאחת מנקודות הקצה של הספקים?

### תצורת failover

```yaml
models:
  failover_config:
    max_retries: 3          # ניסיונות חוזרים לכל ספק לפני מעבר לבא
    retry_delay_ms: 1000    # השהיית בסיס בין ניסיונות חוזרים
    conditions:             # אילו שגיאות מפעילות failover
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

שם הספק ב-`models.primary.provider` אינו תואם לאף ספק מוגדר ב-`models.providers`. בדקו שגיאות כתיב.

### "Classification model provider not configured"

הגדרתם דריסת `classification_models` שמפנה לספק שאינו קיים ב-`models.providers`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # ספק זה חייב להיות קיים ב-models.providers
      model: llama3.3:70b
  providers:
    # "local" חייב להיות מוגדר כאן
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## התנהגות ניסיון חוזר

Triggerfish מנסה מחדש בקשות ספק על שגיאות חולפות (חריגות זמן רשת, תגובות 5xx). לוגיקת הניסיון החוזר:

1. ממתינה עם backoff אקספוננציאלי בין ניסיונות
2. מתעדת כל ניסיון חוזר ברמת WARN
3. לאחר מיצוי ניסיונות חוזרים לספק אחד, עוברת לבא בשרשרת failover
4. לחיבורי streaming יש לוגיקת ניסיון חוזר נפרדת ליצירת חיבור מול כשלים באמצע stream

ניתן לראות ניסיונות חוזרים בלוגים:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
