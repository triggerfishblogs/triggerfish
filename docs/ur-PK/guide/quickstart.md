# فوری شروعات

یہ گائیڈ آپ کو Triggerfish کے ساتھ پہلے 5 منٹ میں چلنے میں مدد کرتی ہے — setup wizard
چلانے سے لے کر ایک کام کرنے والے AI ایجنٹ تک جس سے آپ بات کر سکتے ہیں۔

## Setup Wizard چلائیں

اگر آپ نے one-command installer استعمال کیا، تو wizard انسٹالیشن کے دوران پہلے ہی چل چکا ہے۔
دوبارہ چلانے یا نئے سرے سے شروع کرنے کے لیے:

```bash
triggerfish dive
```

Wizard آٹھ مراحل سے گزرتا ہے:

### مرحلہ 1: اپنا LLM فراہم کنندہ منتخب کریں

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

ایک فراہم کنندہ منتخب کریں اور اپنی credentials درج کریں۔ Triggerfish خودکار failover کے ساتھ
متعدد فراہم کنندگان کی حمایت کرتا ہے۔ **Triggerfish Gateway** سب سے آسان آپشن ہے —
[Pro یا Power پلان](/ur-PK/pricing) سبسکرائب کریں، اور آپ کا ایجنٹ کنفیگر کرنے کے لیے
کوئی API کلیدوں کے بغیر managed LLM اور سرچ انفراسٹرکچر سے جڑ جاتا ہے۔

### مرحلہ 2: اپنے ایجنٹ کا نام دیں

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

یہ آپ کی `SPINE.md` فائل بناتا ہے — آپ کے ایجنٹ کے system prompt کی بنیاد۔ آپ
اسے `~/.triggerfish/SPINE.md` پر کسی بھی وقت ترمیم کر سکتے ہیں۔

### مرحلہ 3: ایک چینل جوڑیں

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

ایک پیغام رسانی پلیٹ فارم منتخب کریں یا صرف CLI سے شروع کرنے کے لیے یہ مرحلہ چھوڑیں۔
بعد میں آپ اپنے `triggerfish.yaml` میں channels شامل کر سکتے ہیں۔

### مرحلہ 4: اختیاری Plugins

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

نوٹ لینے کے لیے Obsidian جیسے اختیاری integrations سے جوڑیں۔

### مرحلہ 5: Google Workspace جوڑیں (اختیاری)

OAuth2 کے ذریعے Gmail، Calendar، Tasks، Drive، اور Sheets کے لیے اپنا Google account
جوڑیں۔ آپ یہ چھوڑ کر بعد میں `triggerfish connect google` سے جوڑ سکتے ہیں۔

### مرحلہ 6: GitHub جوڑیں (اختیاری)

Personal Access Token پیسٹ کر کے GitHub جوڑیں۔ ایجنٹ کو repos، PRs، issues، اور
Actions کے لیے tools دیتا ہے۔ آپ یہ چھوڑ کر بعد میں `triggerfish connect github` سے
جوڑ سکتے ہیں۔

### مرحلہ 7: ویب سرچ ترتیب دیں

اپنے ایجنٹ کے استعمال کے لیے ایک سرچ انجن (Brave Search یا self-hosted SearXNG) منتخب
کریں، یا ابھی کے لیے چھوڑیں۔

### مرحلہ 8: Daemon شروع کریں

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

ہاں منتخب کریں تاکہ آپ کا ایجنٹ آپ کی مشین آن ہونے پر ہمیشہ چلتا رہے۔

## Chat شروع کریں

Wizard مکمل ہونے کے بعد، آپ CLI کے ذریعے فوری طور پر chat شروع کر سکتے ہیں:

```bash
triggerfish chat
```

یا، اگر آپ نے کوئی پیغام رسانی چینل جوڑا ہے، تو وہاں اپنے ایجنٹ کو پیغام بھیجیں۔

### نمونہ گفتگو

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

You: Set up a morning briefing every day at 7am

Reef: I've created a cron job for your morning briefing:

  Schedule: Every day at 7:00 AM
  Task: Prepare briefing with calendar events, unread emails,
        and weather forecast
  Delivery: CLI (add a channel in config to get it on Telegram/Slack)

You'll receive your first briefing tomorrow morning. You can manage
cron jobs anytime with /cron list.
```

## اپنی ترتیب کی تصدیق کریں

یہ یقینی بنانے کے لیے کہ سب کچھ کام کر رہا ہے health check چلائیں:

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

## آگے کیا کریں

- **اپنا ایجنٹ کسٹمائز کریں** — اپنے ایجنٹ کی شخصیت اور صلاحیتوں کو بہتر بنانے کے لیے
  `~/.triggerfish/SPINE.md` ترمیم کریں۔ [SPINE اور Triggers](./spine-and-triggers) دیکھیں۔
- **مزید channels شامل کریں** — اپنے `triggerfish.yaml` میں Telegram، Slack، Discord،
  یا WhatsApp جوڑیں۔ [ترتیب](./configuration) دیکھیں۔
- **Integrations جوڑیں** — Google Workspace کے لیے `triggerfish connect google`،
  GitHub کے لیے `triggerfish connect github`۔ [Integrations](/ur-PK/integrations/) دیکھیں۔
- **فعال رویہ ترتیب دیں** — اپنے ایجنٹ کو کیا نگرانی کرنی ہے یہ بتانے کے لیے
  `~/.triggerfish/TRIGGER.md` بنائیں۔ [SPINE اور Triggers](./spine-and-triggers) دیکھیں۔
- **کمانڈز دریافت کریں** — تمام دستیاب CLI اور in-chat کمانڈز سیکھیں۔
  [CLI کمانڈز](./commands) دیکھیں۔
