# Skills बनाना

यह गाइड शुरू से एक Triggerfish skill बनाने का मार्गदर्शन करती है -- `SKILL.md`
फ़ाइल लिखने से लेकर इसका परीक्षण करने और स्वीकृति प्राप्त करने तक।

## आप क्या बनाएँगे

Skill एक folder है जिसमें `SKILL.md` फ़ाइल होती है जो agent को कुछ करना सिखाती
है। इस गाइड के अंत तक, आपके पास एक कार्यशील skill होगी जिसे agent खोज और
उपयोग कर सकता है।

## Skill Anatomy

प्रत्येक skill अपनी root में `SKILL.md` के साथ एक directory है:

```
my-skill/
  SKILL.md           # आवश्यक: frontmatter + निर्देश
  template.md        # वैकल्पिक: skill द्वारा संदर्भित templates
  helper.ts          # वैकल्पिक: सहायक कोड
```

`SKILL.md` फ़ाइल के दो भाग हैं:

1. **YAML frontmatter** (`---` delimiters के बीच) -- skill के बारे में metadata
2. **Markdown body** -- वे निर्देश जो agent पढ़ता है

## चरण 1: Frontmatter लिखें

Frontmatter घोषित करता है कि skill क्या करती है, इसे क्या चाहिए, और कौन सी
सुरक्षा बाधाएँ लागू होती हैं।

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, and flag PRs needing review.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---
```

### आवश्यक Fields

| Field         | विवरण                                                | उदाहरण         |
| ------------- | ---------------------------------------------------- | --------------- |
| `name`        | अद्वितीय पहचानकर्ता। Lowercase, spaces के लिए hyphens। | `github-triage` |
| `description` | Skill क्या करती है और कब उपयोग करनी है। 1-3 वाक्य।     | ऊपर देखें       |

### वैकल्पिक Fields

| Field                    | विवरण                                   | डिफ़ॉल्ट   |
| ------------------------ | --------------------------------------- | --------- |
| `classification_ceiling` | अधिकतम डेटा संवेदनशीलता स्तर             | `PUBLIC`   |
| `requires_tools`         | Skill को किन tools तक पहुँच चाहिए         | `[]`       |
| `network_domains`        | Skill जिन बाहरी domains तक पहुँचती है     | `[]`       |

`version`, `category`, `tags`, और `triggers` जैसे अतिरिक्त fields दस्तावेज़ और
भविष्य उपयोग के लिए शामिल किए जा सकते हैं। Skill loader उन fields को चुपचाप
अनदेखा करता है जिन्हें वह नहीं पहचानता।

### Classification Ceiling चुनना

Classification ceiling वह अधिकतम डेटा संवेदनशीलता है जो आपकी skill संभालेगी।
सबसे निम्न स्तर चुनें जो काम करे:

| स्तर           | कब उपयोग करें                       | उदाहरण                                                |
| -------------- | ----------------------------------- | ----------------------------------------------------- |
| `PUBLIC`       | केवल सार्वजनिक रूप से उपलब्ध डेटा    | वेब खोज, public API docs, मौसम                         |
| `INTERNAL`     | आंतरिक परियोजना डेटा के साथ काम      | Code विश्लेषण, config समीक्षा, आंतरिक docs              |
| `CONFIDENTIAL` | व्यक्तिगत या निजी डेटा संभालता है    | Email सारांश, GitHub notifications, CRM queries         |
| `RESTRICTED`   | अत्यधिक संवेदनशील डेटा तक पहुँचता है | Key प्रबंधन, सुरक्षा ऑडिट, अनुपालन                     |

::: warning यदि आपकी skill की ceiling उपयोगकर्ता की कॉन्फ़िगर की गई ceiling से
अधिक है, skill author API इसे अस्वीकार करेगी। हमेशा आवश्यक न्यूनतम स्तर उपयोग
करें। :::

## चरण 2: निर्देश लिखें

Markdown body वह है जो agent skill निष्पादित करना सीखने के लिए पढ़ता है। इसे
कार्य-योग्य और विशिष्ट बनाएँ।

### संरचना Template

```markdown
# Skill Name

एक-पंक्ति उद्देश्य कथन।

## कब उपयोग करें

- स्थिति 1 (उपयोगकर्ता X माँगता है)
- स्थिति 2 (cron द्वारा ट्रिगर)
- स्थिति 3 (संबंधित keyword पता चला)

## चरण

1. विशिष्ट विवरण के साथ पहली क्रिया
2. विशिष्ट विवरण के साथ दूसरी क्रिया
3. परिणाम संसाधित और format करें
4. कॉन्फ़िगर किए गए चैनल पर डिलीवर करें

## आउटपुट Format

परिणाम कैसे format होने चाहिए इसका वर्णन करें।

## सामान्य गलतियाँ

- Y के कारण X न करें
- आगे बढ़ने से पहले हमेशा Z जाँचें
```

### सर्वोत्तम प्रथाएँ

- **उद्देश्य से शुरू करें**: एक वाक्य में बताएँ कि skill क्या करती है
- **"कब उपयोग करें" शामिल करें**: Agent को तय करने में मदद करता है कि skill कब
  सक्रिय करनी है
- **विशिष्ट रहें**: "अंतिम 24 घंटों के अपठित emails fetch करें" "Emails प्राप्त
  करें" से बेहतर है
- **Code उदाहरण उपयोग करें**: सटीक API calls, data formats, command patterns दिखाएँ
- **Tables जोड़ें**: विकल्पों, endpoints, parameters के लिए त्वरित संदर्भ
- **Error handling शामिल करें**: जब API call विफल हो या डेटा गायब हो तो क्या करें
- **"सामान्य गलतियाँ" से समाप्त करें**: Agent को ज्ञात समस्याएँ दोहराने से रोकता है

## चरण 3: Discovery परीक्षण

सत्यापित करें कि आपकी skill skill loader द्वारा खोजी जा सकती है। यदि आपने इसे
bundled directory में रखा है:

```typescript
import { createSkillLoader } from "../src/skills/loader.ts";

const loader = createSkillLoader({
  directories: ["skills/bundled"],
  dirTypes: { "skills/bundled": "bundled" },
});

const skills = await loader.discover();
const mySkill = skills.find((s) => s.name === "github-triage");
console.log(mySkill);
// { name: "github-triage", classificationCeiling: "CONFIDENTIAL", ... }
```

जाँचें कि:

- Skill discovered सूची में दिखाई देती है
- `name` frontmatter से मेल खाता है
- `classificationCeiling` सही है
- `requiresTools` और `networkDomains` भरे हैं

## Agent Self-Authoring

Agent `SkillAuthor` API का उपयोग करके programmatically skills बना सकता है। इस
तरह agent कुछ नया करने के लिए कहे जाने पर स्वयं को विस्तारित करता है।

### Workflow

```
1. User:  "मुझे हर सुबह Notion में नए tasks जाँचने हैं"
2. Agent: अपने workspace में skill बनाने के लिए SkillAuthor उपयोग करता है
3. Skill: PENDING_APPROVAL स्थिति में प्रवेश करती है
4. User:  Notification प्राप्त करता है, skill की समीक्षा करता है
5. User:  स्वीकृत → skill सक्रिय हो जाती है
6. Agent: Skill को morning cron schedule में wire करता है
```

### SkillAuthor API उपयोग

```typescript
import { createSkillAuthor } from "triggerfish/skills";

const author = createSkillAuthor({
  skillsDir: workspace.skillsPath,
  userCeiling: "CONFIDENTIAL",
});

const result = await author.create({
  name: "notion-tasks",
  description: "Check Notion for new tasks and summarize them daily",
  classificationCeiling: "INTERNAL",
  requiresTools: ["browser"],
  networkDomains: ["api.notion.com"],
  content: `# Notion Task Checker

## When to Use

- Morning cron trigger
- User asks about pending tasks

## Steps

1. Fetch tasks from Notion API using the user's integration token
2. Filter for tasks created or updated in the last 24 hours
3. Categorize by priority (P0, P1, P2)
4. Format as a concise bullet-point summary
5. Deliver to the configured channel
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### स्वीकृति स्थितियाँ

| स्थिति             | अर्थ                                  |
| ------------------ | -------------------------------------- |
| `PENDING_APPROVAL` | बनाई गई, owner समीक्षा की प्रतीक्षा में |
| `APPROVED`         | Owner स्वीकृत, skill सक्रिय है           |
| `REJECTED`         | Owner अस्वीकृत, skill निष्क्रिय है       |

::: warning सुरक्षा Agent अपनी स्वयं की skills स्वीकृत नहीं कर सकता। यह API
स्तर पर प्रवर्तित है। सभी agent-लिखित skills को सक्रियण से पहले स्पष्ट owner
पुष्टि की आवश्यकता है। :::

## सुरक्षा स्कैनिंग

सक्रियण से पहले, skills prompt injection patterns के लिए सुरक्षा scanner से
गुज़रती हैं:

- "Ignore all previous instructions" -- prompt injection
- "You are now a..." -- identity redefinition
- "Reveal secrets/credentials" -- data exfiltration प्रयास
- "Bypass security/policy" -- सुरक्षा circumvention
- "Sudo/admin/god mode" -- privilege escalation

Scanner द्वारा flagged skills में चेतावनियाँ शामिल होती हैं जिनकी owner को
स्वीकृति से पहले समीक्षा करनी चाहिए।

## Triggers

Skills अपने frontmatter में स्वचालित triggers परिभाषित कर सकती हैं:

```yaml
triggers:
  - cron: "0 7 * * *" # प्रतिदिन सुबह 7 बजे
  - cron: "*/30 * * * *" # हर 30 मिनट
```

Scheduler इन परिभाषाओं को पढ़ता है और skill निष्पादित करने के लिए agent को
निर्दिष्ट समय पर जगाता है। आप कुछ अवधियों के दौरान निष्पादन रोकने के लिए
`triggerfish.yaml` में quiet hours के साथ triggers जोड़ सकते हैं।

## Skill Checklist

Skill को पूर्ण मानने से पहले:

- [ ] Folder नाम frontmatter में `name` से मेल खाता है
- [ ] Description बताता है **क्या** और **कब** उपयोग करना है
- [ ] Classification ceiling सबसे निम्न स्तर है जो काम करता है
- [ ] सभी आवश्यक tools `requires_tools` में सूचीबद्ध हैं
- [ ] सभी बाहरी domains `network_domains` में सूचीबद्ध हैं
- [ ] निर्देश ठोस और चरण-दर-चरण हैं
- [ ] Code उदाहरण Triggerfish patterns (Result types, factory functions) उपयोग करते हैं
- [ ] आउटपुट format निर्दिष्ट है
- [ ] सामान्य गलतियाँ अनुभाग शामिल है
- [ ] Skill loader द्वारा discoverable है (परीक्षित)
