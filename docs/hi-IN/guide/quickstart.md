# त्वरित शुरुआत

यह गाइड आपको Triggerfish के साथ आपके पहले 5 मिनट में ले जाती है -- सेटअप विज़ार्ड
चलाने से लेकर एक कार्यशील AI एजेंट होने तक जिससे आप चैट कर सकते हैं।

## सेटअप विज़ार्ड चलाएँ

यदि आपने एक-कमांड इंस्टॉलर का उपयोग किया है, तो विज़ार्ड इंस्टॉलेशन के दौरान
पहले ही चल चुका है। इसे फिर से चलाने या नए सिरे से शुरू करने के लिए:

```bash
triggerfish dive
```

विज़ार्ड आपको आठ चरणों से ले जाता है:

### चरण 1: अपना LLM प्रदाता चुनें

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

एक प्रदाता चुनें और अपने क्रेडेंशियल दर्ज करें। Triggerfish स्वचालित फ़ेलओवर के साथ
कई प्रदाताओं का समर्थन करता है। **Triggerfish Gateway** सबसे आसान विकल्प है —
[Pro या Power योजना](/hi-IN/pricing) की सदस्यता लें, और आपका एजेंट बिना किसी API
कुंजी कॉन्फ़िगर किए प्रबंधित LLM और सर्च इंफ्रास्ट्रक्चर से कनेक्ट होता है।

### चरण 2: अपने एजेंट का नाम रखें

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

यह आपकी `SPINE.md` फ़ाइल उत्पन्न करता है -- आपके एजेंट के सिस्टम प्रॉम्प्ट की
नींव। आप इसे कभी भी `~/.triggerfish/SPINE.md` पर संपादित कर सकते हैं।

### चरण 3: एक चैनल कनेक्ट करें

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

एक मैसेजिंग प्लेटफ़ॉर्म चुनें या केवल CLI से शुरू करने के लिए इस चरण को छोड़ दें।

### चरण 4: वैकल्पिक Plugin

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

नोट-लेने के लिए Obsidian जैसे वैकल्पिक इंटीग्रेशन कनेक्ट करें।

### चरण 5: Google Workspace कनेक्ट करें (वैकल्पिक)

Gmail, Calendar, Tasks, Drive, और Sheets के लिए OAuth2 के माध्यम से अपना Google
खाता कनेक्ट करें।

### चरण 6: GitHub कनेक्ट करें (वैकल्पिक)

Personal Access Token पेस्ट करके GitHub कनेक्ट करें।

### चरण 7: वेब सर्च सेट अप करें

अपने एजेंट के उपयोग के लिए एक सर्च इंजन (Brave Search या स्व-होस्टेड SearXNG) चुनें।

### चरण 8: डेमन शुरू करें

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

जब भी आपकी मशीन चालू हो तब अपना एजेंट चालू रखने के लिए हाँ चुनें।

## चैटिंग शुरू करें

विज़ार्ड पूरा होने के बाद, आप तुरंत CLI के माध्यम से चैटिंग शुरू कर सकते हैं:

```bash
triggerfish chat
```

या, यदि आपने कोई मैसेजिंग चैनल कनेक्ट किया है, तो वहाँ अपने एजेंट को संदेश भेजें।

### उदाहरण वार्तालाप

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

## अपने सेटअप की पुष्टि करें

यह सुनिश्चित करने के लिए कि सब कुछ काम कर रहा है, स्वास्थ्य जाँच चलाएँ:

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

## आगे क्या करें

- **अपने एजेंट को अनुकूलित करें** -- अपने एजेंट के व्यक्तित्व और क्षमताओं को
  परिष्कृत करने के लिए `~/.triggerfish/SPINE.md` संपादित करें।
  [SPINE और ट्रिगर](./spine-and-triggers) देखें।
- **और चैनल जोड़ें** -- अपने `triggerfish.yaml` में Telegram, Slack, Discord, या
  WhatsApp कनेक्ट करें। [कॉन्फ़िगरेशन](./configuration) देखें।
- **इंटीग्रेशन कनेक्ट करें** -- Google Workspace के लिए `triggerfish connect google`,
  GitHub के लिए `triggerfish connect github`।
- **सक्रिय व्यवहार सेट करें** -- अपने एजेंट को बताने के लिए `~/.triggerfish/TRIGGER.md`
  बनाएँ कि क्या निगरानी करनी है। [SPINE और ट्रिगर](./spine-and-triggers) देखें।
- **कमांड एक्सप्लोर करें** -- सभी उपलब्ध CLI और इन-चैट कमांड सीखें।
  [CLI कमांड](./commands) देखें।
