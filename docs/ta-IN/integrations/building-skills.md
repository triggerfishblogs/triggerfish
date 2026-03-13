# Skills உருவாக்குதல்

இந்த guide ஒரு Triggerfish skill ஐ scratch இலிருந்து create செய்வதை -- `SKILL.md` file எழுதுவதிலிருந்து test செய்து approve பெறுவது வரை -- விவரிக்கிறது.

## நீங்கள் என்ன Build செய்வீர்கள்

ஒரு skill என்பது agent எவ்வாறு ஏதாவது செய்வது என்று கற்பிக்கும் ஒரு `SKILL.md` file கொண்ட folder. இந்த guide இறுதியில், agent discover செய்து பயன்படுத்தக்கூடிய ஒரு working skill கிடைக்கும்.

## Skill Anatomy

ஒவ்வொரு skill உம் அதன் root இல் ஒரு `SKILL.md` உடன் ஒரு directory:

```
my-skill/
  SKILL.md           # Required: frontmatter + instructions
  template.md        # Optional: skill reference செய்யும் templates
  helper.ts          # Optional: supporting code
```

`SKILL.md` file இரண்டு parts கொண்டுள்ளது:

1. **YAML frontmatter** (`---` delimiters இடையே) -- skill பற்றிய metadata
2. **Markdown body** -- agent படிக்கும் instructions

## படி 1: Frontmatter எழுதவும்

Frontmatter skill என்ன செய்கிறது, என்ன தேவை, மற்றும் எந்த security constraints பொருந்தும் என்று declare செய்கிறது.

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

### Required Fields

| Field         | விளக்கம்                                                      | Example         |
| ------------- | --------------------------------------------------------------- | --------------- |
| `name`        | Unique identifier. Lowercase, spaces க்கு hyphens.           | `github-triage` |
| `description` | Skill என்ன செய்கிறது மற்றும் எப்போது பயன்படுத்துவது. 1-3 sentences. | மேலே பாருங்கள் |

### Optional Fields

| Field                    | விளக்கம்                                        | Default  |
| ------------------------ | ------------------------------------------------- | -------- |
| `classification_ceiling` | Maximum data sensitivity level                    | `PUBLIC` |
| `requires_tools`         | Skill access தேவைப்படும் Tools                  | `[]`     |
| `network_domains`        | Skill access செய்யும் External domains           | `[]`     |

`version`, `category`, `tags`, மற்றும் `triggers` போன்ற கூடுதல் fields documentation மற்றும் future use க்கு include செய்யலாம். Skill loader recognize செய்யாத fields silently ignore செய்கிறது.

### Classification Ceiling தேர்வு செய்யவும்

Classification ceiling உங்கள் skill handle செய்யும் maximum data sensitivity. வேலை செய்யும் lowest level தேர்வு செய்யவும்:

| Level          | எப்போது பயன்படுத்துவது              | Examples                                         |
| -------------- | ------------------------------------ | ------------------------------------------------ |
| `PUBLIC`       | Publicly available data மட்டுமே பயன்படுத்துகிறது | Web search, public API docs, weather |
| `INTERNAL`     | Internal project data உடன் வேலை செய்கிறது | Code analysis, config review, internal docs |
| `CONFIDENTIAL` | Personal அல்லது private data handle செய்கிறது | Email summary, GitHub notifications, CRM queries |
| `RESTRICTED`   | Highly sensitive data access செய்கிறது | Key management, security audits, compliance |

::: warning உங்கள் skill இன் ceiling பயனரின் configured ceiling ஐ விட அதிகமென்றால், skill author API அதை reject செய்யும். எப்போதும் minimum level தேவையான அளவு பயன்படுத்தவும். :::

## படி 2: Instructions எழுதவும்

Markdown body agent skill execute எவ்வாறு செய்வது என்று கற்றுக்கொள்ள படிக்கும் content. Actionable மற்றும் specific ஆக எழுதவும்.

### Structure Template

```markdown
# Skill Name

ஒரு-வரி purpose statement.

## When to Use

- Condition 1 (user X க்காக கேட்கிறார்)
- Condition 2 (cron மூலம் triggered)
- Condition 3 (related keyword detected)

## Steps

1. Specific details உடன் First action
2. Specific details உடன் Second action
3. Results process மற்றும் format செய்யவும்
4. Configured channel க்கு Deliver செய்யவும்

## Output Format

Results எவ்வாறு format செய்ய வேண்டும் என்று விவரிக்கவும்.

## Common Mistakes

- X செய்யாதீர்கள் ஏனெனில் Y
- Proceed செய்வதற்கு முன்பு எப்போதும் Z சரிபார்க்கவும்
```

### Best Practices

- **Purpose உடன் தொடங்கவும்**: Skill என்ன செய்கிறது என்று ஒரு sentence விளக்கவும்
- **"When to Use" சேர்க்கவும்**: Skill எப்போது activate செய்வது என்று agent decide செய்ய உதவுகிறது
- **Specific ஆக இருங்கள்**: "கடந்த 24 மணிநேரத்தின் unread emails fetch செய்யவும்" "emails பெறவும்" ஐ விட சிறந்தது
- **Code examples பயன்படுத்தவும்**: Exact API calls, data formats, command patterns காட்டவும்
- **Tables சேர்க்கவும்**: Options, endpoints, parameters க்கான Quick reference
- **Error handling சேர்க்கவும்**: API call fail ஆகும்போது அல்லது data missing ஆகும்போது என்ன செய்வது
- **"Common Mistakes" உடன் முடிக்கவும்**: Known issues agent மீண்டும் செய்வதை தடுக்கிறது

## படி 3: Discovery Test செய்யவும்

Skill loader மூலம் உங்கள் skill discoverable என்று verify செய்யவும். Bundled directory இல் வைத்திருந்தால்:

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

சரிபார்க்கவும்:

- Skill discovered list இல் appear ஆகிறது
- `name` frontmatter உடன் match ஆகிறது
- `classificationCeiling` சரியாக உள்ளது
- `requiresTools` மற்றும் `networkDomains` populated ஆகின்றன

## Agent Self-Authoring

Agent `SkillAuthor` API பயன்படுத்தி programmatically skills create செய்யலாம். புதிதாக ஏதாவது செய்யுமாறு கேட்கப்படும்போது agent தன்னை extend செய்யும் விதம் இதுதான்.

### Workflow

```
1. User:  "ஒவ்வொரு காலையும் Notion இல் புதிய tasks check செய்ய வேண்டும்"
2. Agent: SkillAuthor பயன்படுத்தி workspace இல் ஒரு skill உருவாக்குகிறது
3. Skill: PENDING_APPROVAL நிலையில் enter செய்கிறது
4. User:  Notification பெறுகிறார், skill review செய்கிறார்
5. User:  Approve செய்கிறார் → skill active ஆகிறது
6. Agent: Skill ஐ morning cron schedule இல் wire செய்கிறது
```

### SkillAuthor API பயன்படுத்துவது

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

1. Notion API இலிருந்து user இன் integration token பயன்படுத்தி tasks fetch செய்யவும்
2. கடந்த 24 மணிநேரத்தில் created அல்லது updated tasks filter செய்யவும்
3. Priority மூலம் categorize செய்யவும் (P0, P1, P2)
4. Concise bullet-point summary ஆக format செய்யவும்
5. Configured channel க்கு deliver செய்யவும்
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### Approval Statuses

| Status             | பொருள்                                |
| ------------------ | --------------------------------------- |
| `PENDING_APPROVAL` | Created, owner review காத்திருக்கிறது |
| `APPROVED`         | Owner approve செய்தார், skill active   |
| `REJECTED`         | Owner reject செய்தார், skill inactive  |

::: warning SECURITY Agent தன்னுடைய skills approve செய்ய முடியாது. இது API level இல் enforce ஆகிறது. அனைத்து agent-authored skills உம் activation க்கு முன்பு explicit owner confirmation தேவை. :::

## Security Scanning

Activation க்கு முன்பு, skills prompt injection patterns க்காக ஒரு security scanner மூலம் செல்கின்றன:

- "Ignore all previous instructions" -- prompt injection
- "You are now a..." -- identity redefinition
- "Reveal secrets/credentials" -- data exfiltration attempts
- "Bypass security/policy" -- security circumvention
- "Sudo/admin/god mode" -- privilege escalation

Scanner flag செய்த skills approval க்கு முன்பு owner review செய்ய வேண்டிய warnings சேர்க்கின்றன.

## Triggers

Skills தங்கள் frontmatter இல் automatic triggers define செய்யலாம்:

```yaml
triggers:
  - cron: "0 7 * * *" # Every day at 7 AM
  - cron: "*/30 * * * *" # Every 30 minutes
```

Scheduler இந்த definitions படிக்கிறது மற்றும் specified times இல் skill execute செய்ய agent ஐ wake up செய்கிறது. Certain periods இல் execution தடுக்க `triggerfish.yaml` இல் quiet hours உடன் triggers combine செய்யலாம்.

## Complete Example

GitHub notifications triage செய்வதற்கான ஒரு full skill:

```
github-triage/
  SKILL.md
```

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, flag PRs needing review. Use when the user
  asks about GitHub activity or on the hourly cron.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---

# GitHub Triage

GitHub notifications, issues, மற்றும் pull requests review மற்றும் categorize செய்யவும்.

## When to Use

- User "GitHub இல் என்ன நடக்கிறது?" என்று கேட்கிறார்
- Hourly cron trigger
- User specific repo activity பற்றி கேட்கிறார்

## Steps

1. User இன் token பயன்படுத்தி GitHub API இலிருந்து notifications fetch செய்யவும்
2. Categorize: PRs needing review, new issues, mentions, CI failures
3. Label மூலம் Prioritize: bug > security > feature > question
4. Direct links உடன் top items summarize செய்யவும்
5. User க்கு assigned எதையாவது flag செய்யவும்

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- அனைத்து notifications fetch செய்யாதீர்கள் — கடந்த மணிநேரத்திற்கு `since` parameter மூலம் filter செய்யவும்
- Multiple API calls செய்வதற்கு முன்பு எப்போதும் rate limits சரிபார்க்கவும்
- Quick action க்கு ஒவ்வொரு item க்கும் direct links சேர்க்கவும்
```

## Skill Checklist

Skill complete என்று கருதுவதற்கு முன்பு:

- [ ] Folder name frontmatter இல் `name` உடன் match ஆகிறது
- [ ] Description **என்ன** மற்றும் **எப்போது** பயன்படுத்துவது என்று விளக்குகிறது
- [ ] Classification ceiling வேலை செய்யும் lowest level
- [ ] அனைத்து required tools `requires_tools` இல் listed
- [ ] அனைத்து external domains `network_domains` இல் listed
- [ ] Instructions concrete மற்றும் step-by-step
- [ ] Code examples Triggerfish patterns பயன்படுத்துகின்றன (Result types, factory functions)
- [ ] Output format specified
- [ ] Common mistakes section included
- [ ] Skill loader மூலம் discoverable (tested)
