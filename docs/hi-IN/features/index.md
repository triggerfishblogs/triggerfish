# सुविधा अवलोकन

अपने [सुरक्षा मॉडल](/hi-IN/security/) और [चैनल समर्थन](/hi-IN/channels/) के
अलावा, Triggerfish ऐसी क्षमताएँ प्रदान करता है जो आपके AI agent को प्रश्न-और-उत्तर
से आगे बढ़ाती हैं: शेड्यूल किए गए कार्य, स्थायी memory, वेब एक्सेस, वॉइस
इनपुट, और मल्टी-मॉडल failover।

## सक्रिय व्यवहार

### [Cron और Triggers](./cron-and-triggers)

मानक cron expressions के साथ आवर्ती कार्य शेड्यूल करें और `TRIGGER.md` के
माध्यम से सक्रिय निगरानी व्यवहार परिभाषित करें।

### [Notifications](./notifications)

प्राथमिकता स्तरों, ऑफ़लाइन कतार, और डिडुप्लीकेशन के साथ सभी कनेक्टेड चैनलों
में संदेश रूट करने वाली notification डिलीवरी सेवा।

## Agent Tools

### [वेब खोज और Fetch](./web-search)

वेब खोजें और पृष्ठ सामग्री प्राप्त करें। SSRF रोकथाम और policy प्रवर्तन के साथ।

### [स्थायी Memory](./memory)

वर्गीकरण गेटिंग के साथ क्रॉस-session memory।

### [छवि विश्लेषण और Vision](./image-vision)

क्लिपबोर्ड से छवियाँ पेस्ट करें और डिस्क पर छवि फ़ाइलों का विश्लेषण करें।

### [कोडबेस अन्वेषण](./explore)

समानांतर sub-agents के माध्यम से संरचित कोडबेस समझ।

### [Session प्रबंधन](./sessions)

Sessions की निरीक्षण, संचार, और शुरू करें।

### [Plan Mode और कार्य ट्रैकिंग](./planning)

कार्यान्वयन से पहले संरचित योजना (plan mode) और sessions में स्थायी कार्य ट्रैकिंग (todos)।

### [Filesystem और Shell](./filesystem)

पढ़ें, लिखें, खोजें, और कमांड निष्पादित करें।

### [Sub-Agents और LLM Tasks](./subagents)

स्वायत्त sub-agents को कार्य सौंपें या अलग LLM prompts चलाएँ।

### [Agent Teams](./agent-teams)

विशेष भूमिकाओं के साथ सहयोगी agents की स्थायी टीमें शुरू करें।

## समृद्ध इंटरैक्शन

### [Voice Pipeline](./voice)

कॉन्फ़िगर करने योग्य STT और TTS providers के साथ पूर्ण वाक् समर्थन।

### [Tide Pool / A2UI](./tidepool)

Agent-संचालित विज़ुअल कार्यक्षेत्र।

## Multi-Agent और Multi-Model

### [Multi-Agent रूटिंग](./multi-agent)

विभिन्न चैनलों को अलग-अलग अलग agents तक रूट करें।

### [LLM Providers और Failover](./model-failover)

Anthropic, OpenAI, Google, स्थानीय मॉडल, या OpenRouter से जुड़ें। Failover
chains कॉन्फ़िगर करें।

### [Rate Limiting](./rate-limiting)

Sliding-window rate limiter जो LLM provider API सीमाओं से टकराने से रोकता है।

## संचालन

### [संरचित लॉगिंग](./logging)

गंभीरता स्तरों, फ़ाइल रोटेशन, और दोहरे आउटपुट के साथ एकीकृत संरचित लॉगिंग।

::: info सभी सुविधाएँ मूल सुरक्षा मॉडल के साथ एकीकृत हैं। कोई सुविधा policy
परत को बायपास नहीं करती। :::
