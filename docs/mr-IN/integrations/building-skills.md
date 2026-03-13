# Skills Building

हे guide scratch पासून Triggerfish skill create करण्याचे walk through करतो --
`SKILL.md` file लिहिण्यापासून ते test करणे आणि approve मिळवणे पर्यंत.

## तुम्ही काय Build कराल

Skill हे एक folder आहे ज्यात `SKILL.md` file आहे जी एजंटला काहीतरी कसे
करायचे ते शिकवते. या guide च्या शेवटी तुमच्याकडे एक working skill असेल जी
एजंट discover आणि use करू शकतो.

## Skill Anatomy

प्रत्येक skill हे root वर `SKILL.md` असलेले directory आहे:

```
my-skill/
  SKILL.md           # Required: frontmatter + instructions
  template.md        # Optional: skill reference करणारे templates
  helper.ts          # Optional: supporting code
```

`SKILL.md` file चे दोन parts आहेत:

1. **YAML frontmatter** (`---` delimiters दरम्यान) -- skill बद्दल metadata
2. **Markdown body** -- एजंट वाचत असलेल्या instructions

## पायरी 1: Frontmatter लिहा

Frontmatter skill काय करते, त्याला काय लागते, आणि कोणते security constraints
लागू होतात ते declare करतो.

```yaml
---
name: github-triage
description: >
  GitHub notifications आणि issues triage करा. Priority नुसार categorize,
  नवीन issues summarize, आणि review आवश्यक असलेले PRs flag करा.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---
```

### Required Fields

| Field         | वर्णन                                                        | Example         |
| ------------- | ------------------------------------------------------------ | --------------- |
| `name`        | Unique identifier. Lowercase, spaces साठी hyphens.           | `github-triage` |
| `description` | Skill काय करते आणि केव्हा वापरायचे. 1-3 sentences.          | वर पहा          |

### Optional Fields

| Field                    | वर्णन                                    | Default  |
| ------------------------ | ---------------------------------------- | -------- |
| `classification_ceiling` | Maximum data sensitivity level           | `PUBLIC` |
| `requires_tools`         | Skill ला access आवश्यक असलेले tools      | `[]`     |
| `network_domains`        | Skill access करत असलेले external domains | `[]`     |

`version`, `category`, `tags`, आणि `triggers` सारखे additional fields
documentation आणि future use साठी समाविष्ट केले जाऊ शकतात. Skill loader
recognize न होणाऱ्या fields silently ignore करेल.

### Classification Ceiling निवडणे

Classification ceiling तुमचा skill handle करेल त्या maximum data sensitivity
आहे. काम करणारी lowest level निवडा:

| Level          | केव्हा वापरायचे                         | Examples                                            |
| -------------- | --------------------------------------- | --------------------------------------------------- |
| `PUBLIC`       | फक्त publicly available data वापरतो    | Web search, public API docs, weather                |
| `INTERNAL`     | Internal project data सह काम करतो       | Code analysis, config review, internal docs         |
| `CONFIDENTIAL` | Personal किंवा private data handle करतो | Email summary, GitHub notifications, CRM queries    |
| `RESTRICTED`   | Highly sensitive data access करतो       | Key management, security audits, compliance         |

::: warning Skill चे ceiling user च्या configured ceiling exceed करत असल्यास,
skill author API ते reject करेल. नेहमी necessary minimum level वापरा. :::

## पायरी 2: Instructions लिहा

Markdown body एजंट skill कसे execute करायचे ते शिकण्यासाठी वाचतो. Actionable
आणि specific बनवा.

### Structure Template

```markdown
# Skill Name

One-line purpose statement.

## When to Use

- Condition 1 (user X साठी विचारतो)
- Condition 2 (cron द्वारे triggered)
- Condition 3 (related keyword detected)

## Steps

1. Specific details सह first action
2. Specific details सह second action
3. Results process आणि format करा
4. Configured channel ला deliver करा

## Output Format

Results कसे formatted असावेत ते describe करा.

## Common Mistakes

- Y कारणामुळे X करू नका
- Continue करण्यापूर्वी नेहमी Z check करा
```

### Best Practices

- **Purpose ने सुरू करा**: Skill काय करते हे एका sentence मध्ये explain करा
- **"When to Use" समाविष्ट करा**: एजंटला skill कधी activate करायचे ते decide
  करण्यास मदत करते
- **Specific असा**: "Get emails" पेक्षा "Last 24 hours मधील unread emails fetch
  करा" चांगले आहे
- **Code examples वापरा**: Exact API calls, data formats, command patterns दाखवा
- **Tables जोडा**: Options, endpoints, parameters साठी quick reference
- **Error handling समाविष्ट करा**: API call fail होते किंवा data missing असते
  तेव्हा काय करायचे
- **"Common Mistakes" ने संपवा**: एजंटला known issues repeat करण्यापासून रोखते

## पायरी 3: Discovery Test करा

Skill loader द्वारे तुमची skill discoverable आहे का verify करा. Bundled
directory मध्ये placed केल्यास:

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

Check करा:

- Skill discovered list मध्ये appear होते
- `name` frontmatter शी match होते
- `classificationCeiling` correct आहे
- `requiresTools` आणि `networkDomains` populated आहेत

## Agent Self-Authoring

एजंट `SkillAuthor` API वापरून programmatically skills create करू शकतो. नवीन
काहीतरी करण्यास सांगतो तेव्हा एजंट स्वतः कसा extend करतो हे असे आहे.

### The Workflow

```
1. User:  "I need you to check Notion for new tasks every morning"
2. Agent: त्याच्या workspace मध्ये SkillAuthor वापरून skill create करतो
3. Skill: PENDING_APPROVAL status मध्ये enter होते
4. User:  Notification receive करतो, skill review करतो
5. User:  Approve करतो → skill active होते
6. Agent: Morning cron schedule मध्ये skill wire करतो
```

### SkillAuthor API वापरणे

```typescript
import { createSkillAuthor } from "triggerfish/skills";

const author = createSkillAuthor({
  skillsDir: workspace.skillsPath,
  userCeiling: "CONFIDENTIAL",
});

const result = await author.create({
  name: "notion-tasks",
  description: "Notion मध्ये नवीन tasks check करा आणि daily summarize करा",
  classificationCeiling: "INTERNAL",
  requiresTools: ["browser"],
  networkDomains: ["api.notion.com"],
  content: `# Notion Task Checker

## When to Use

- Morning cron trigger
- User pending tasks बद्दल विचारतो

## Steps

1. User च्या integration token वापरून Notion API मधून tasks fetch करा
2. Last 24 hours मध्ये created किंवा updated tasks साठी filter करा
3. Priority नुसार categorize करा (P0, P1, P2)
4. Concise bullet-point summary म्हणून format करा
5. Configured channel ला deliver करा
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### Approval Statuses

| Status             | अर्थ                                |
| ------------------ | ----------------------------------- |
| `PENDING_APPROVAL` | Created, owner review साठी waiting |
| `APPROVED`         | Owner approved, skill active आहे   |
| `REJECTED`         | Owner rejected, skill inactive आहे |

::: warning SECURITY एजंट स्वतःच्या skills approve करू शकत नाही. हे API level
वर enforced आहे. सर्व agent-authored skills ला activation पूर्वी explicit owner
confirmation आवश्यक आहे. :::

## Security Scanning

Activation पूर्वी, skills prompt injection patterns साठी security scanner
मधून जातात:

- "Ignore all previous instructions" -- prompt injection
- "You are now a..." -- identity redefinition
- "Reveal secrets/credentials" -- data exfiltration attempts
- "Bypass security/policy" -- security circumvention
- "Sudo/admin/god mode" -- privilege escalation

Scanner द्वारे flagged skills मध्ये warnings असतात ज्या owner ने approval
पूर्वी review केल्या पाहिजेत.

## Triggers

Skills frontmatter मध्ये automatic triggers define करू शकतात:

```yaml
triggers:
  - cron: "0 7 * * *" # दर दिवशी सकाळी 7 वाजता
  - cron: "*/30 * * * *" # दर 30 minutes
```

Scheduler हे definitions वाचतो आणि skill execute करण्यासाठी specified times वर
एजंटला जागे करतो. Certain periods दरम्यान execution रोखण्यासाठी तुम्ही
`triggerfish.yaml` मध्ये triggers ला quiet hours सह combine करू शकता.

## Complete Example

GitHub notifications triage करण्यासाठी पूर्ण skill:

```
github-triage/
  SKILL.md
```

```yaml
---
name: github-triage
description: >
  GitHub notifications आणि issues triage करा. Priority नुसार categorize,
  नवीन issues summarize, review आवश्यक असलेले PRs flag करा. User GitHub
  activity बद्दल विचारतो किंवा hourly cron वर वापरा.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---

# GitHub Triage

GitHub notifications, issues, आणि pull requests review आणि categorize करा.

## When to Use

- User "GitHub वर काय होतंय?" विचारतो
- Hourly cron trigger
- User specific repo activity बद्दल विचारतो

## Steps

1. User च्या token वापरून GitHub API मधून notifications fetch करा
2. Categorize करा: PRs review आवश्यक, नवीन issues, mentions, CI failures
3. Priority नुसार: bug > security > feature > question
4. Direct links सह top items summarize करा
5. User ला assigned काहीही flag करा

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — तुम्हाला assigned, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- सर्व notifications fetch करू नका — last hour साठी `since` parameter filter करा
- Multiple API calls करण्यापूर्वी नेहमी rate limits check करा
- Quick action साठी प्रत्येक item ला direct links समाविष्ट करा
```

## Skill Checklist

Skill complete मानण्यापूर्वी:

- [ ] Folder name frontmatter मधील `name` शी match होते
- [ ] Description **काय** आणि **केव्हा** वापरायचे explain करते
- [ ] Classification ceiling काम करणारी lowest level आहे
- [ ] सर्व required tools `requires_tools` मध्ये listed आहेत
- [ ] सर्व external domains `network_domains` मध्ये listed आहेत
- [ ] Instructions concrete आणि step-by-step आहेत
- [ ] Code examples Triggerfish patterns वापरतात (Result types, factory functions)
- [ ] Output format specified आहे
- [ ] Common mistakes section समाविष्ट आहे
- [ ] Skill loader द्वारे discoverable आहे (tested)
