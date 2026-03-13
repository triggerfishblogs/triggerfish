# वर्गीकरण प्रणाली

डेटा वर्गीकरण प्रणाली Triggerfish च्या सुरक्षा मॉडेलचा आधार आहे. सिस्टममध्ये
प्रवेश करणारा, हलणारा किंवा बाहेर पडणारा प्रत्येक डेटा तुकडा वर्गीकरण लेबल
वाहतो. हे लेबल ठरवतात की डेटा कुठे वाहू शकतो -- आणि अधिक महत्त्वाचे, कुठे
वाहू शकत नाही.

## वर्गीकरण स्तर

Triggerfish सर्व deployments साठी एकच चार-स्तरीय ordered hierarchy वापरतो.

| स्तर           | क्रमांक      | वर्णन                                                   | उदाहरणे                                                              |
| -------------- | ----------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| `RESTRICTED`   | 4 (सर्वोच्च) | कमाल संरक्षण आवश्यक असलेला सर्वात संवेदनशील डेटा       | M&A दस्तऐवज, board materials, PII, बँक खाती, वैद्यकीय नोंदी         |
| `CONFIDENTIAL` | 3           | व्यवसाय-संवेदनशील किंवा वैयक्तिक-संवेदनशील माहिती      | CRM डेटा, आर्थिक, HR नोंदी, करार, कर नोंदी                           |
| `INTERNAL`     | 2           | बाह्य सामायिकरणासाठी नाही                                | अंतर्गत wikis, team दस्तऐवज, वैयक्तिक नोट्स, संपर्क                  |
| `PUBLIC`       | 1 (सर्वात कमी) | कोणालाही पाहण्यासाठी सुरक्षित                          | Marketing सामग्री, सार्वजनिक दस्तऐवजीकरण, सामान्य वेब सामग्री       |

## No Write-Down नियम

Triggerfish मधील सर्वात महत्त्वाचा security invariant:

::: danger डेटा फक्त **समान किंवा उच्च** वर्गीकरणाच्या channels किंवा प्राप्तकर्त्यांकडे
वाहू शकतो. हा एक **निश्चित नियम** आहे -- तो कॉन्फिगर, override किंवा अक्षम केला
जाऊ शकत नाही. LLM हा निर्णय प्रभावित करू शकत नाही. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Classification hierarchy: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Data flows upward only." style="max-width: 100%;" />

याचा अर्थ:

- `CONFIDENTIAL` डेटा असलेला response `PUBLIC` channel ला पाठवला जाऊ शकत नाही
- `RESTRICTED` वर tainted session `RESTRICTED` पेक्षा कमी कोणत्याही channel ला
  output करू शकत नाही
- कोणताही admin override नाही, enterprise escape hatch नाही आणि LLM workaround नाही

## प्रभावी वर्गीकरण

Channels आणि प्राप्तकर्ते दोघेही वर्गीकरण स्तर वाहतात. डेटा सिस्टम सोडण्याच्या
आधी, गंतव्यस्थानाचे **प्रभावी वर्गीकरण** काय पाठवले जाऊ शकते ते ठरवते:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

प्रभावी वर्गीकरण दोघांपैकी _कमी_ आहे. याचा अर्थ कमी-वर्गीकरण प्राप्तकर्त्यासह
उच्च-वर्गीकरण channel अजूनही कमी-वर्गीकरण म्हणून treat केला जातो.

| Channel        | प्राप्तकर्ता | प्रभावी        | CONFIDENTIAL डेटा मिळू शकतो का? |
| -------------- | ----------- | -------------- | -------------------------------- |
| `INTERNAL`     | `INTERNAL`  | `INTERNAL`     | नाही (CONFIDENTIAL > INTERNAL)   |
| `INTERNAL`     | `EXTERNAL`  | `PUBLIC`       | नाही                             |
| `CONFIDENTIAL` | `INTERNAL`  | `INTERNAL`     | नाही (CONFIDENTIAL > INTERNAL)   |
| `CONFIDENTIAL` | `EXTERNAL`  | `PUBLIC`       | नाही                             |
| `RESTRICTED`   | `INTERNAL`  | `INTERNAL`     | नाही (CONFIDENTIAL > INTERNAL)   |

## Channel वर्गीकरण नियम

प्रत्येक channel type च्या वर्गीकरण स्तर निश्चित करण्यासाठी विशिष्ट नियम आहेत.

### Email

- **Domain matching**: `@company.com` messages `INTERNAL` म्हणून वर्गीकृत आहेत
- Admin कोणते domains internal आहेत ते कॉन्फिगर करतो
- अज्ञात किंवा बाह्य domains `EXTERNAL` ला default होतात
- बाह्य प्राप्तकर्ते प्रभावी वर्गीकरण `PUBLIC` ला कमी करतात

### Slack / Teams

- **Workspace membership**: त्याच workspace/tenant च्या सदस्य `INTERNAL` आहेत
- Slack Connect बाह्य वापरकर्ते `EXTERNAL` म्हणून वर्गीकृत आहेत
- Guest वापरकर्ते `EXTERNAL` म्हणून वर्गीकृत आहेत
- वर्गीकरण platform API मधून derived आहे, LLM interpretation मधून नाही

### WhatsApp / Telegram / iMessage

- **Enterprise**: HR directory sync विरुद्ध matched phone numbers internal
  विरुद्ध external ठरवतात
- **Personal**: सर्व प्राप्तकर्ते `EXTERNAL` ला default होतात
- वापरकर्ते trusted contacts चिन्हांकित करू शकतात, परंतु हे वर्गीकरण गणित
  बदलत नाही -- ते recipient classification बदलते

### WebChat

- WebChat अभ्यागत नेहमी `PUBLIC` म्हणून वर्गीकृत आहेत (अभ्यागत कधीही owner
  म्हणून verified नाहीत)
- WebChat सार्वजनिक-facing interactions साठी आहे

### CLI

- CLI channel स्थानिकरित्या चालते आणि authenticated वापरकर्त्यावर आधारित वर्गीकृत आहे
- Direct terminal access सामान्यतः `INTERNAL` किंवा उच्च आहे

## प्राप्तकर्ता वर्गीकरण स्रोत

### Enterprise

- **Directory sync** (Okta, Azure AD, Google Workspace) स्वयंचलितपणे प्राप्तकर्ता
  वर्गीकरण populate करतो
- सर्व directory सदस्य `INTERNAL` म्हणून वर्गीकृत आहेत
- बाह्य guests आणि vendors `EXTERNAL` म्हणून वर्गीकृत आहेत
- Admins per-contact किंवा per-domain override करू शकतात

### Personal

- **Default**: सर्व प्राप्तकर्ते `EXTERNAL` आहेत
- वापरकर्ते in-flow prompts किंवा companion app द्वारे trusted contacts reclassify करतात
- Reclassification explicit आणि logged आहे

## Channel States

प्रत्येक channel डेटा वाहण्यापूर्वी state machine मधून प्रगती करतो:

<img src="/diagrams/state-machine.svg" alt="Channel state machine: UNTRUSTED → CLASSIFIED or BLOCKED" style="max-width: 100%;" />

| State        | डेटा मिळू शकतो का? | एजंट context मध्ये डेटा पाठवू शकतो का? | वर्णन                                              |
| ------------ | :-----------------: | :--------------------------------------: | -------------------------------------------------- |
| `UNTRUSTED`  |         नाही        |                  नाही                   | नवीन/अज्ञात channels साठी default. पूर्णपणे isolated. |
| `CLASSIFIED` | हो (धोरणात)         |     हो (वर्गीकरणासह)                    | Reviewed आणि वर्गीकरण स्तर assigned.               |
| `BLOCKED`    |         नाही        |                  नाही                   | Admin किंवा वापरकर्त्याने स्पष्टपणे prohibited.    |

::: warning SECURITY नवीन channels नेहमी `UNTRUSTED` state मध्ये येतात. ते
एजंटकडून कोणताही डेटा प्राप्त करू शकत नाहीत आणि एजंट context मध्ये डेटा पाठवू
शकत नाहीत. Channel पूर्णपणे isolated राहतो जोपर्यंत admin (enterprise) किंवा
वापरकर्ता (personal) ते स्पष्टपणे classify करत नाही. :::

## वर्गीकरण इतर सिस्टमशी कसे संवाद साधते

वर्गीकरण एक standalone feature नाही -- ते संपूर्ण प्लॅटफॉर्मवर निर्णय चालवते:

| सिस्टम               | वर्गीकरण कसे वापरले जाते                                              |
| -------------------- | --------------------------------------------------------------------- |
| **Session taint**    | Classified डेटा access केल्याने session त्या स्तरावर escalates होते  |
| **Policy hooks**     | PRE_OUTPUT session taint विरुद्ध destination वर्गीकरण compare करतो   |
| **MCP Gateway**      | MCP server responses वर्गीकरण वाहतात जे session ला taint करतात       |
| **Data lineage**     | प्रत्येक lineage record मध्ये वर्गीकरण स्तर आणि कारण समाविष्ट आहे    |
| **Notifications**    | Notification सामग्री त्याच वर्गीकरण नियमांच्या अधीन आहे              |
| **Agent delegation** | Callee एजंटचे classification ceiling caller च्या taint ला पूर्ण करणे आवश्यक |
| **Plugin sandbox**   | Plugin SDK सर्व emitted डेटा auto-classifies करतो                    |
