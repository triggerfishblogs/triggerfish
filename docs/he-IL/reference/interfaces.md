# ממשקים מרכזיים

עמוד זה מתעד את ממשקי TypeScript המגדירים את נקודות ההרחבה של Triggerfish.
אם אתם בונים מתאם ערוץ מותאם, ספק LLM, backend אחסון או אינטגרציית
מדיניות, אלו החוזים שהקוד שלכם חייב לקיים.

## Result\<T, E\>

Triggerfish משתמש בסוג תוצאה מבוסס union מזוהה במקום חריגות נזרקות לכל
הכשלים הצפויים.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**שימוש:**

```typescript
function parseConfig(raw: string): Result<Config, string> {
  try {
    const config = JSON.parse(raw);
    return { ok: true, value: config };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

const result = parseConfig(input);
if (result.ok) {
  // result.value הוא Config
} else {
  // result.error הוא string
}
```

::: warning לעולם אל תזרקו חריגות לכשלים צפויים. השתמשו ב-`Result<T, E>`
בכל מקום. חריגות נזרקות שמורות לשגיאות בלתי צפויות ובלתי ניתנות לשחזור
(באגים). :::

## ClassificationLevel

מערכת הסיווג בארבע רמות המשמשת לכל החלטות זרימת הנתונים.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

מסודר מהגבוה לנמוך: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. נתונים
יכולים לזרום רק לרמות שוות או גבוהות יותר (אין כתיבה-למטה).

## StorageProvider

הפשטת האחסון המאוחדת. כל הנתונים בעלי מצב ב-Triggerfish זורמים דרך ממשק זה.

```typescript
interface StorageProvider {
  /** אחסון ערך תחת המפתח הנתון. דורס כל ערך קיים. */
  set(key: string, value: string): Promise<void>;

  /** אחזור ערך לפי מפתח. מחזיר null כאשר המפתח אינו קיים. */
  get(key: string): Promise<string | null>;

  /** מחיקת מפתח. ללא פעולה כאשר המפתח אינו קיים. */
  delete(key: string): Promise<void>;

  /** רשימת כל המפתחות התואמים קידומת אופציונלית. מחזיר את כל המפתחות כאשר לא סופקה קידומת. */
  list(prefix?: string): Promise<string[]>;

  /** שחרור משאבים המוחזקים על ידי ספק זה (למשל, סגירת ידיות מסד נתונים). */
  close(): Promise<void>;
}
```

**מימושים:**

| Backend                 | מקרה שימוש                                                                     |
| ----------------------- | ------------------------------------------------------------------------------ |
| `MemoryStorageProvider` | בדיקות, סשנים ארעיים                                                           |
| `SqliteStorageProvider` | ברירת מחדל לשכבה אישית (SQLite WAL ב-`~/.triggerfish/data/triggerfish.db`)      |
| backends ארגוניים       | מנוהלים על ידי הלקוח (Postgres, S3 וכו')                                       |

**מרחבי שמות מפתחות:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`,
`notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

הממשק המשותף לכל מתאמי ערוצי ההודעות (CLI, Telegram, Slack, Discord,
WhatsApp, WebChat, Email).

```typescript
interface ChannelAdapter {
  /** רמת הסיווג המוקצית לערוץ זה. */
  readonly classification: ClassificationLevel;

  /** האם המשתמש הנוכחי הוא הבעלים. */
  readonly isOwner: boolean;

  /** התחברות לערוץ. */
  connect(): Promise<void>;

  /** התנתקות מהערוץ. */
  disconnect(): Promise<void>;

  /** שליחת הודעה לערוץ. */
  send(message: ChannelMessage): Promise<void>;

  /** רישום מטפל להודעות נכנסות. */
  onMessage(handler: MessageHandler): void;

  /** קבלת סטטוס הערוץ הנוכחי. */
  status(): ChannelStatus;
}
```

**סוגים תומכים:**

```typescript
interface ChannelMessage {
  readonly content: string;
  readonly sessionId?: string;
  readonly sessionTaint?: ClassificationLevel;
}

interface ChannelStatus {
  readonly connected: boolean;
  readonly channelType: string;
}

type MessageHandler = (message: ChannelMessage) => void;
```

## LlmProvider

הממשק להשלמות LLM. כל ספק (Anthropic, OpenAI, Google, Local, OpenRouter)
מממש ממשק זה.

```typescript
interface LlmProvider {
  /** מזהה שם הספק. */
  readonly name: string;

  /** האם ספק זה תומך בתגובות streaming. */
  readonly supportsStreaming: boolean;

  /** שליחת הודעות ל-LLM וקבלת תגובת השלמה. */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}
```

**רישום ספקים:**

```typescript
interface LlmProviderRegistry {
  /** רישום ספק. מחליף כל ספק קיים עם אותו שם. */
  register(provider: LlmProvider): void;

  /** קבלת ספק לפי שם, או undefined אם אינו רשום. */
  get(name: string): LlmProvider | undefined;

  /** הגדרת ספק ברירת המחדל לפי שם. חייב להיות כבר רשום. */
  setDefault(name: string): void;

  /** קבלת ספק ברירת המחדל, או undefined אם לא הוגדר. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

הפשטת מסירת ההתראות. ראו [התראות](/he-IL/features/notifications) לפרטי
שימוש.

```typescript
type NotificationPriority = "critical" | "normal" | "low";

interface Notification {
  readonly id: string;
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly createdAt: Date;
}

interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority;
}

interface NotificationService {
  /** מסירה או תור של התראה למשתמש. */
  deliver(options: DeliverOptions): Promise<void>;

  /** קבלת התראות ממתינות (שלא נמסרו) למשתמש. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** אישור קבלת התראה כנמסרה. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## סוגי Hooks

ווי אכיפת מדיניות מיירטים פעולות בנקודות קריטיות בזרימת הנתונים. כל
ה-hooks הם דטרמיניסטיים, סינכרוניים, מתועדים ובלתי ניתנים לזיוף.

### HookType

```typescript
type HookType =
  | "PRE_CONTEXT_INJECTION"
  | "PRE_TOOL_CALL"
  | "POST_TOOL_RESPONSE"
  | "PRE_OUTPUT"
  | "SECRET_ACCESS";
```

### PolicyAction

```typescript
type PolicyAction = "ALLOW" | "BLOCK" | "REDACT" | "REQUIRE_APPROVAL";
```

### HookContext ו-HookResult

```typescript
interface HookContext {
  readonly session: SessionState;
  readonly input: Record<string, unknown>;
}

interface HookResult {
  readonly allowed: boolean;
  readonly action: PolicyAction;
  readonly ruleId: string | null;
  readonly message?: string;
  readonly duration: number;
}
```

## SessionState

יחידת מצב השיחה הבסיסית עם מעקב זיהום עצמאי.

```typescript
interface SessionState {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly channelId: ChannelId;
  readonly taint: ClassificationLevel;
  readonly createdAt: Date;
  readonly history: readonly TaintEvent[];
}
```

**סוגי מזהים ממותגים:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

סוגים ממותגים מונעים שימוש שגוי במזהים -- אינכם יכולים להעביר `UserId`
במקום שנדרש `SessionId`.

::: info כל פעולות הסשן הן אי-משתנות (immutable). פונקציות מחזירות אובייקטי
`SessionState` חדשים במקום לשנות קיימים. זה מבטיח שקיפות הפניות ומפשט
בדיקות. :::
