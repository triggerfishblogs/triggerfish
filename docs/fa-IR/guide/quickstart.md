# شروع سریع

این راهنما شما را در ۵ دقیقه اول با Triggerfish همراهی می‌کند — از اجرای جادوگر
راه‌اندازی تا داشتن یک عامل هوش مصنوعی کارآمد که می‌توانید با آن گفتگو کنید.

## اجرای جادوگر راه‌اندازی

اگر از نصب‌کننده تک‌دستوری استفاده کردید، جادوگر در حین نصب اجرا شده است. برای
اجرای مجدد یا شروع تازه:

```bash
triggerfish dive
```

جادوگر شما را از هشت مرحله عبور می‌دهد:

### مرحله ۱: انتخاب ارائه‌دهنده LLM

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

یک ارائه‌دهنده انتخاب و اعتبارنامه‌های خود را وارد کنید. Triggerfish از ارائه‌دهندگان
متعدد با جایگزینی خودکار پشتیبانی می‌کند. **Triggerfish Gateway** ساده‌ترین گزینه
است — به طرح [Pro یا Power](/fa-IR/pricing) اشتراک بگیرید و عامل شما بدون نیاز
به پیکربندی کلیدهای API به زیرساخت مدیریت‌شده LLM و جستجو متصل می‌شود.

### مرحله ۲: نامگذاری عامل

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

این فایل `SPINE.md` شما را تولید می‌کند — پایه system prompt عامل شما.
می‌توانید آن را هر زمان در `~/.triggerfish/SPINE.md` ویرایش کنید.

### مرحله ۳: اتصال یک کانال

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

### مرحله ۴: plugin‌های اختیاری

### مرحله ۵: اتصال Google Workspace (اختیاری)

حساب Google خود را برای Gmail، Calendar، Tasks، Drive و Sheets از طریق OAuth2
متصل کنید.

### مرحله ۶: اتصال GitHub (اختیاری)

GitHub را با وارد کردن Personal Access Token متصل کنید.

### مرحله ۷: راه‌اندازی جستجوی وب

یک موتور جستجو (Brave Search یا SearXNG خودمیزبان) برای استفاده عامل انتخاب کنید.

### مرحله ۸: شروع دیمن

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

## شروع گفتگو

پس از تکمیل جادوگر، می‌توانید فوراً از طریق CLI شروع به گفتگو کنید:

```bash
triggerfish chat
```

### مثال مکالمه

```
You: What can you help me with?

Reef: I can help you with a wide range of tasks. Here are some things
I'm set up for:

  - Answer questions and have conversations
  - Manage your calendar and schedule
  - Summarize emails and messages
  - Write and edit documents
  - Run code in a sandboxed environment
  - Search the web for information
  - Automate recurring tasks with cron jobs

What would you like to start with?
```

## تأیید راه‌اندازی

بررسی سلامت را اجرا کنید تا مطمئن شوید همه چیز کار می‌کند:

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 2m)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  1 channel active (CLI)
  Policy engine loaded (4 rules)
  3 skills installed (3 bundled)

Overall: HEALTHY
```

## مراحل بعدی

- **شخصی‌سازی عامل** — فایل `~/.triggerfish/SPINE.md` را ویرایش کنید.
  [SPINE و محرک‌ها](./spine-and-triggers) را ببینید.
- **افزودن کانال‌های بیشتر** — Telegram، Slack، Discord یا WhatsApp را در
  `triggerfish.yaml` متصل کنید. [پیکربندی](./configuration) را ببینید.
- **اتصال یکپارچه‌سازی‌ها** — `triggerfish connect google` برای Google Workspace،
  `triggerfish connect github` برای GitHub. [یکپارچه‌سازی‌ها](/fa-IR/integrations/) را ببینید.
- **راه‌اندازی رفتار فعالانه** — `~/.triggerfish/TRIGGER.md` ایجاد کنید.
  [SPINE و محرک‌ها](./spine-and-triggers) را ببینید.
- **بررسی دستورات** — [دستورات CLI](./commands) را ببینید.
