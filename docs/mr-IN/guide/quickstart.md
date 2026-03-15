# जलद सुरुवात

हे मार्गदर्शक तुम्हाला Triggerfish सोबतच्या पहिल्या 5 मिनिटांमधून नेते -- सेटअप
विझार्ड चालवण्यापासून ते एक कार्यरत AI एजंटशी chat करण्यापर्यंत.

## सेटअप विझार्ड चालवा

जर तुम्ही one-command installer वापरला असेल, तर इंस्टॉलेशन दरम्यान विझार्ड आधीच
चालला. पुन्हा चालवण्यासाठी किंवा नव्याने सुरू करण्यासाठी:

```bash
triggerfish dive
```

विझार्ड आठ पायऱ्यांमधून मार्गदर्शन करतो:

### पायरी 1: तुमचा LLM प्रदाता निवडा

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

एक प्रदाता निवडा आणि तुमचे credentials प्रविष्ट करा. Triggerfish स्वयंचलित
failover सह अनेक प्रदात्यांना समर्थन करतो. **Triggerfish Gateway** सर्वात सोपा
पर्याय आहे — [Pro किंवा Power plan](/mr-IN/pricing) ला subscribe करा, आणि तुमचा
एजंट कोणत्याही API keys शिवाय व्यवस्थापित LLM आणि search इन्फ्रास्ट्रक्चरशी जोडतो.

### पायरी 2: तुमच्या एजंटचे नाव द्या

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

हे तुमची `SPINE.md` फाइल तयार करते -- तुमच्या एजंटच्या system prompt चा आधार.
तुम्ही ते कधीही `~/.triggerfish/SPINE.md` येथे संपादित करू शकता.

### पायरी 3: एक Channel जोडा

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

एक मेसेजिंग प्लॅटफॉर्म निवडा किंवा फक्त CLI सह सुरू करण्यासाठी ही पायरी वगळा.
तुम्ही नंतर `triggerfish.yaml` मध्ये channels जोडू शकता.

### पायरी 4: ऐच्छिक Plugins

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

नोट-टेकिंगसाठी Obsidian सारखे ऐच्छिक integrations जोडा.

### पायरी 5: Google Workspace जोडा (ऐच्छिक)

Gmail, Calendar, Tasks, Drive आणि Sheets साठी OAuth2 द्वारे तुमचे Google खाते
जोडा. तुम्ही हे वगळू शकता आणि नंतर `triggerfish connect google` सह जोडू शकता.

### पायरी 6: GitHub जोडा (ऐच्छिक)

Personal Access Token पेस्ट करून GitHub जोडा. एजंटला repos, PRs, issues आणि
Actions साठी साधने देतो. तुम्ही हे वगळू शकता आणि नंतर `triggerfish connect github`
सह जोडू शकता.

### पायरी 7: Web Search सेट करा

तुमच्या एजंटसाठी search engine (Brave Search किंवा self-hosted SearXNG) निवडा,
किंवा आत्तासाठी वगळा.

### पायरी 8: Daemon सुरू करा

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

तुमच्या मशीन चालू असताना एजंट चालण्यासाठी हो निवडा.

## Chat सुरू करा

विझार्ड पूर्ण झाल्यावर, तुम्ही CLI द्वारे त्वरित chat सुरू करू शकता:

```bash
triggerfish chat
```

किंवा, जर तुम्ही मेसेजिंग channel जोडले असेल, तर तिथे तुमच्या एजंटला संदेश पाठवा.

### उदाहरण संवाद

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

## तुमचे सेटअप सत्यापित करा

सर्व काही कार्यरत आहे याची खात्री करण्यासाठी health check चालवा:

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

## पुढे काय करावे

- **तुमचा एजंट सानुकूलित करा** -- तुमच्या एजंटचे व्यक्तिमत्व आणि क्षमता परिष्कृत
  करण्यासाठी `~/.triggerfish/SPINE.md` संपादित करा. [SPINE आणि Triggers](./spine-and-triggers) पाहा.
- **अधिक channels जोडा** -- तुमच्या `triggerfish.yaml` मध्ये Telegram, Slack,
  Discord किंवा WhatsApp जोडा. [कॉन्फिगरेशन](./configuration) पाहा.
- **Integrations जोडा** -- Google Workspace साठी `triggerfish connect google`,
  GitHub साठी `triggerfish connect github`. [Integrations](/mr-IN/integrations/) पाहा.
- **सक्रिय वर्तन सेट करा** -- तुमच्या एजंटला काय देखरेख करायची ते सांगण्यासाठी
  `~/.triggerfish/TRIGGER.md` तयार करा. [SPINE आणि Triggers](./spine-and-triggers) पाहा.
- **कमांड्स एक्सप्लोर करा** -- सर्व उपलब्ध CLI आणि in-chat कमांड्स शिका.
  [CLI कमांड्स](./commands) पाहा.
