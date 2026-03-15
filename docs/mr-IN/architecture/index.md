# आर्किटेक्चर आढावा

Triggerfish हे एक सुरक्षित, बहु-चॅनेल AI एजंट प्लॅटफॉर्म आहे ज्यात एक मुख्य
invariant आहे:

::: warning SECURITY **सुरक्षा निश्चायक आणि sub-LLM आहे.** प्रत्येक सुरक्षा
निर्णय शुद्ध कोडद्वारे केला जातो जो LLM bypass, override किंवा प्रभावित
करू शकत नाही. LLM ला शून्य authority आहे -- ते क्रिया request करते; धोरण
स्तर ठरवतो. :::

हे पृष्ठ Triggerfish कसे कार्य करते याचे मोठे चित्र प्रदान करते. प्रत्येक मुख्य
component एका समर्पित deep-dive पृष्ठाशी link करतो.

## सिस्टम आर्किटेक्चर

<img src="/diagrams/system-architecture.svg" alt="System architecture: channels flow through the Channel Router to the Gateway, which coordinates Session Manager, Policy Engine, and Agent Loop" style="max-width: 100%;" />

### Data Flow

प्रत्येक संदेश सिस्टमद्वारे हा मार्ग follow करतो:

<img src="/diagrams/data-flow-9-steps.svg" alt="Data flow: 9-step pipeline from inbound message through policy hooks to outbound delivery" style="max-width: 100%;" />

प्रत्येक enforcement point वर, निर्णय निश्चायक असतो -- समान input नेहमी समान
परिणाम देतो. Hooks मध्ये कोणत्याही LLM calls नाहीत, यादृच्छिकता नाही आणि LLM
साठी outcome प्रभावित करण्याचा कोणताही मार्ग नाही.

## मुख्य Components

### वर्गीकरण प्रणाली

डेटा चार ordered levels मधून वाहतो:
`RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. मुख्य नियम **no write-down**
आहे: डेटा फक्त समान किंवा उच्च वर्गीकरणाकडे वाहू शकतो. `CONFIDENTIAL` session
`PUBLIC` channel ला डेटा पाठवू शकत नाही. कोणते अपवाद नाहीत. कोणता LLM override नाही.

[वर्गीकरण प्रणाली बद्दल अधिक वाचा.](./classification)

### धोरण Engine आणि Hooks

आठ निश्चायक enforcement hooks डेटा flow मधील critical points वर प्रत्येक action
intercept करतात. Hooks शुद्ध functions आहेत: synchronous, logged आणि unforgeable.
धोरण engine निश्चित नियम (कधीही configurable नाही), admin-tunable नियम आणि
enterprise साठी declarative YAML escape hatches समर्थन करतो.

[धोरण Engine बद्दल अधिक वाचा.](./policy-engine)

### Sessions आणि Taint

प्रत्येक संवाद स्वतंत्र taint tracking सह एक session आहे. जेव्हा session classified
data access करतो, त्याचे taint त्या स्तरावर escalates होते आणि session मध्ये कधीही
कमी होऊ शकत नाही. Full reset taint आणि conversation history दोन्ही साफ करते.
प्रत्येक डेटा element lineage tracking system द्वारे provenance metadata वाहतो.

[Sessions आणि Taint बद्दल अधिक वाचा.](./taint-and-sessions)

### Gateway

Gateway हे central control plane आहे -- एक long-running local service जे
WebSocket JSON-RPC endpoint द्वारे sessions, channels, tools, events आणि agent
processes व्यवस्थापित करते. हे notification service, cron scheduler, webhook
ingestion आणि channel routing coordinate करते.

[Gateway बद्दल अधिक वाचा.](./gateway)

### Storage

सर्व stateful data एकीकृत `StorageProvider` abstraction द्वारे वाहतो. Namespaced
keys (`sessions:`, `taint:`, `lineage:`, `audit:`) business logic ला स्पर्श न
करता backends swap करण्याची परवानगी देत चिंता वेगळ्या ठेवतात.

[Storage बद्दल अधिक वाचा.](./storage)

### संरक्षण-in-Depth

Triggerfish 13 overlapping सुरक्षा स्तरांमध्ये सुरक्षा implement करतो. कोणताही
एकल स्तर पुरेसा नाही. एकत्रितपणे, ते एक असे संरक्षण तयार करतात जे gracefully
degrades होते.

[संरक्षण-in-Depth बद्दल अधिक वाचा.](./defense-in-depth)
