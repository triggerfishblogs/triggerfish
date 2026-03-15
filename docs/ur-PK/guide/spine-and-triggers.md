# SPINE اور Triggers

Triggerfish آپ کے ایجنٹ کے رویے کی وضاحت کے لیے دو markdown فائلیں استعمال کرتا ہے:
**SPINE.md** کنٹرول کرتا ہے کہ آپ کا ایجنٹ کون ہے، اور **TRIGGER.md** کنٹرول کرتا ہے
کہ آپ کا ایجنٹ فعال طور پر کیا کرتا ہے۔ دونوں آزاد markdown ہیں — آپ انہیں سادہ اردو
یا انگریزی میں لکھتے ہیں۔

## SPINE.md — ایجنٹ کی شناخت

`SPINE.md` آپ کے ایجنٹ کے system prompt کی بنیاد ہے۔ یہ ایجنٹ کا نام، شخصیت،
مشن، علمی شعبوں، اور حدود کی وضاحت کرتا ہے۔ Triggerfish ہر پیغام پروسیس کرتے وقت یہ
فائل load کرتا ہے، اس لیے تبدیلیاں فوری طور پر نافذ ہو جاتی ہیں۔

### فائل کا مقام

```
~/.triggerfish/SPINE.md
```

Multi-agent setups کے لیے، ہر ایجنٹ کا اپنا SPINE.md ہوتا ہے:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### شروع کیسے کریں

setup wizard (`triggerfish dive`) آپ کے جوابات کی بنیاد پر ابتدائی SPINE.md بناتا ہے۔
آپ اسے کسی بھی وقت آزادانہ طور پر ترمیم کر سکتے ہیں — یہ صرف markdown ہے۔

### موثر SPINE.md لکھنا

ایک اچھا SPINE.md مخصوص ہوتا ہے۔ جتنا آپ اپنے ایجنٹ کے کردار کے بارے میں ٹھوس ہوں گے،
اتنا ہی بہتر وہ کام کرے گا۔ یہاں ایک تجویز کردہ ساخت ہے:

```markdown
# Identity

You are Reef, a personal AI assistant for Sarah.

# Mission

Help Sarah stay organized, informed, and productive. Prioritize calendar
management, email triage, and task tracking.

# Communication Style

- Be concise and direct. No filler.
- Use bullet points for lists of 3+ items.
- When uncertain, say so rather than guessing.
- Match the formality of the channel: casual on WhatsApp, professional on Slack.

# Domain Knowledge

- Sarah is a product manager at Acme Corp.
- Key tools: Linear for tasks, Google Calendar, Gmail, Slack.
- VIP contacts: @boss (David Chen), @skip (Maria Lopez).
- Current priorities: Q2 roadmap, mobile app launch.

# Boundaries

- Never send messages to external contacts without explicit approval.
- Never make financial transactions.
- Always confirm before deleting or modifying calendar events.
- When discussing work topics on personal channels, remind Sarah about
  classification boundaries.

# Response Preferences

- Default to short responses (2-3 sentences).
- Use longer responses only when the question requires detail.
- For code, include brief comments explaining key decisions.
```

### بہترین طریقے

::: tip **شخصیت کے بارے میں مخصوص ہوں۔** "مددگار ہوں" لکھنے کی بجائے، لکھیں "مختصر، براہ راست
ہوں، اور وضاحت کے لیے bullet points استعمال کریں۔" :::

::: tip **مالک کے بارے میں context شامل کریں۔** ایجنٹ بہتر کام کرتا ہے جب وہ
آپ کا کردار، tools، اور ترجیحات جانتا ہے۔ :::

::: tip **واضح حدود مقرر کریں۔** وضاحت کریں کہ ایجنٹ کو کیا کبھی نہیں کرنا چاہیے۔ یہ
policy engine کی یقینی نافذ کاری کو supplement کرتا ہے (لیکن replace نہیں کرتا)۔ :::

::: warning SPINE.md ہدایات LLM کے رویے کی رہنمائی کرتی ہیں لیکن سیکیورٹی
کنٹرولز نہیں ہیں۔ قابل نافذ پابندیوں کے لیے، `triggerfish.yaml` میں policy engine
استعمال کریں۔ Policy engine یقینی ہے اور اسے bypass نہیں کیا جا سکتا —
SPINE.md ہدایات کو bypass کیا جا سکتا ہے۔ :::

## TRIGGER.md — فعال رویہ

`TRIGGER.md` طے کرتا ہے کہ آپ کے ایجنٹ کو وقتاً فوقتاً wakeups کے دوران کیا چیک،
نگرانی، اور کارروائی کرنی چاہیے۔ cron jobs کے برعکس (جو schedule پر مقررہ کام کرتے ہیں)،
triggers ایجنٹ کو شرائط کا جائزہ لینے اور فیصلہ کرنے کی صوابدید دیتے ہیں کہ آیا
کارروائی درکار ہے۔

### فائل کا مقام

```
~/.triggerfish/TRIGGER.md
```

Multi-agent setups کے لیے:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Triggers کیسے کام کرتے ہیں

1. trigger loop ایجنٹ کو ایک ترتیب شدہ وقفے پر جگاتا ہے (`triggerfish.yaml` میں سیٹ)
2. Triggerfish آپ کا TRIGGER.md لوڈ کرتا اور ایجنٹ کو پیش کرتا ہے
3. ایجنٹ ہر item کا جائزہ لیتا ہے اور ضرورت پڑنے پر کارروائی کرتا ہے
4. تمام trigger اقدامات عام پالیسی hooks سے گزرتے ہیں
5. trigger session ایک classification ceiling کے ساتھ چلتا ہے (YAML میں بھی ترتیب)
6. quiet hours کا احترام کیا جاتا ہے — ان اوقات میں کوئی triggers نہیں چلتے

### YAML میں Trigger Configuration

اپنے `triggerfish.yaml` میں timing اور constraints سیٹ کریں:

```yaml
trigger:
  interval: 30m # ہر 30 منٹ چیک کریں
  classification: INTERNAL # trigger sessions کے لیے زیادہ سے زیادہ taint ceiling
  quiet_hours: "22:00-07:00" # ان اوقات میں کوئی wakeups نہیں
```

### TRIGGER.md لکھنا

اپنے triggers کو ترجیح کے مطابق ترتیب دیں۔ اس بارے میں مخصوص ہوں کہ کیا قابل عمل شمار ہوتا ہے
اور ایجنٹ کو اس کے بارے میں کیا کرنا چاہیے۔

```markdown
# Priority Checks

- Unread messages across all channels older than 1 hour -- summarize and notify
  on primary channel.
- Calendar conflicts in the next 24 hours -- flag and suggest resolution.
- Overdue tasks in Linear -- list them with days overdue.

# Monitoring

- GitHub: PRs awaiting my review -- notify if older than 4 hours.
- Email: anything from VIP contacts (David Chen, Maria Lopez) -- flag for
  immediate notification regardless of quiet hours.
- Slack: mentions in #incidents channel -- summarize and escalate if unresolved.

# Proactive

- If morning (7-9am), prepare daily briefing with calendar, weather, and top 3
  priorities.
- If Friday afternoon, draft weekly summary of completed tasks and open items.
- If inbox count exceeds 50 unread, offer to batch-triage.
```

### مثال: کم از کم TRIGGER.md

اگر آپ ایک سادہ شروعاتی نقطہ چاہتے ہیں:

```markdown
# Check on each wakeup

- Any unread messages older than 1 hour
- Calendar events in the next 4 hours
- Anything urgent in email
```

### مثال: Developer-Focused TRIGGER.md

```markdown
# High Priority

- CI failures on main branch -- investigate and notify.
- PRs awaiting my review older than 2 hours.
- Sentry errors with "critical" severity in the last hour.

# Monitoring

- Dependabot PRs -- auto-approve patch updates, flag minor/major.
- Build times trending above 10 minutes -- report weekly.
- Open issues assigned to me with no updates in 3 days.

# Daily

- Morning: summarize overnight CI runs and deploy status.
- End of day: list PRs I opened that are still pending review.
```

### Triggers اور Policy Engine

تمام trigger اقدامات انٹرایکٹو گفتگو جیسی پالیسی نافذ کاری کے تحت ہیں:

- ہر trigger wakeup اپنے taint ٹریکنگ کے ساتھ ایک isolated session spawn کرتا ہے
- آپ کے YAML config میں classification ceiling اس بات کو محدود کرتا ہے کہ trigger
  کون سا ڈیٹا access کر سکتا ہے
- no write-down قاعدہ لاگو ہوتا ہے — اگر کوئی trigger confidential ڈیٹا access کرتا ہے،
  تو وہ نتائج public چینل کو نہیں بھیج سکتا
- تمام trigger اقدامات audit trail میں لاگ ہوتے ہیں

::: info اگر TRIGGER.md موجود نہ ہو، trigger wakeups ترتیب شدہ وقفے پر پھر بھی ہوتے ہیں۔
ایجنٹ اپنے عام علم اور SPINE.md سے فیصلہ کرتا ہے کہ کس چیز پر توجہ درکار ہے۔ بہترین نتائج
کے لیے TRIGGER.md لکھیں۔ :::

## SPINE.md بمقابلہ TRIGGER.md

| پہلو       | SPINE.md                          | TRIGGER.md                        |
| ---------- | --------------------------------- | --------------------------------- |
| مقصد       | ایجنٹ کون ہے وضاحت کریں          | ایجنٹ کیا نگرانی کرتا ہے وضاحت کریں |
| Load ہونا  | ہر پیغام پر                       | ہر trigger wakeup پر              |
| دائرہ کار  | تمام گفتگوئیں                    | صرف trigger sessions              |
| اثرات      | شخصیت، علم، حدود                  | فعال چیک اور اقدامات              |
| ضروری      | ہاں (dive wizard سے بنتا ہے)      | نہیں (لیکن تجویز کردہ)           |

## اگلے اقدامات

- اپنے [triggerfish.yaml](./configuration) میں trigger timing اور cron jobs ترتیب دیں
- [کمانڈز حوالہ](./commands) میں تمام دستیاب CLI کمانڈز سیکھیں
