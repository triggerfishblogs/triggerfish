# Skills ನಿರ್ಮಿಸುವುದು

ಈ guide `SKILL.md` ಫೈಲ್ ಬರೆಯುವುದರಿಂದ ಹಿಡಿದು test ಮಾಡಿ approve ಗಳಿಸುವ ತನಕ
scratch ನಿಂದ Triggerfish skill ರಚಿಸುವ ಪ್ರಕ್ರಿಯೆ ವಿವರಿಸುತ್ತದೆ.

## ನೀವು ಏನು Build ಮಾಡುತ್ತೀರಿ

Skill ಎಂಬುದು agent ಗೆ ಏನಾದರೊಂದು ಮಾಡಲು ಕಲಿಸುವ `SKILL.md` ಫೈಲ್ ಒಳಗೊಂಡ folder.
ಈ guide ಮುಗಿಯುವ ಹೊತ್ತಿಗೆ, agent discover ಮಾಡಿ ಬಳಸಬಹುದಾದ working skill ಹೊಂದಿರುತ್ತೀರಿ.

## Skill Anatomy

ಪ್ರತಿ skill root ನಲ್ಲಿ `SKILL.md` ಇರುವ directory:

```
my-skill/
  SKILL.md           # Required: frontmatter + instructions
  template.md        # Optional: templates the skill references
  helper.ts          # Optional: supporting code
```

`SKILL.md` ಫೈಲ್ ಎರಡು ಭಾಗ ಹೊಂದಿರುತ್ತದೆ:

1. **YAML frontmatter** (`---` delimiters ನಡುವೆ) -- skill ಬಗ್ಗೆ metadata
2. **Markdown body** -- agent ಓದುವ ಸೂಚನೆಗಳು

## Step 1: Frontmatter ಬರೆಯಿರಿ

Frontmatter skill ಏನು ಮಾಡುತ್ತದೆ, ಏನು ಅಗತ್ಯ, ಮತ್ತು ಯಾವ security ನಿರ್ಬಂಧಗಳು
ಅನ್ವಯಿಸುತ್ತವೆ ಎಂದು declare ಮಾಡುತ್ತದೆ.

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

| Field         | Description                                            | Example         |
| ------------- | ------------------------------------------------------ | --------------- |
| `name`        | ಅನನ್ಯ identifier. Lowercase, spaces ಗೆ hyphens.        | `github-triage` |
| `description` | Skill ಏನು ಮಾಡುತ್ತದೆ ಮತ್ತು ಯಾವಾಗ ಬಳಸಬೇಕು. 1-3 ವಾಕ್ಯಗಳು. | ಮೇಲೆ ನೋಡಿ    |

### Optional Fields

| Field                    | Description                         | Default  |
| ------------------------ | ----------------------------------- | -------- |
| `classification_ceiling` | ಗರಿಷ್ಠ data sensitivity ಮಟ್ಟ       | `PUBLIC` |
| `requires_tools`         | Skill ಗೆ ಅಗತ್ಯವಿರುವ tools          | `[]`     |
| `network_domains`        | Skill ಪ್ರವೇಶಿಸುವ ಬಾಹ್ಯ domains    | `[]`     |

`version`, `category`, `tags`, ಮತ್ತು `triggers` ನಂತಹ ಹೆಚ್ಚುವರಿ fields documentation
ಮತ್ತು ಭವಿಷ್ಯದ ಬಳಕೆಗಾಗಿ ಸೇರಿಸಬಹುದು. Skill loader ತಿಳಿಯದ fields ಸದ್ದಿಲ್ಲದೆ
ignore ಮಾಡುತ್ತದೆ.

### Classification Ceiling ಆಯ್ಕೆ ಮಾಡಿ

Classification ceiling ನಿಮ್ಮ skill ನಿರ್ವಹಿಸಬಹುದಾದ ಗರಿಷ್ಠ data sensitivity.
ಕೆಲಸ ಮಾಡುವ ಕಡಿಮೆ ಮಟ್ಟ ಆಯ್ಕೆ ಮಾಡಿ:

| Level          | ಯಾವಾಗ ಬಳಸಬೇಕು                     | Examples                                         |
| -------------- | --------------------------------- | ------------------------------------------------ |
| `PUBLIC`       | ಸಾರ್ವಜನಿಕ ಡೇಟಾ ಮಾತ್ರ ಬಳಸುತ್ತದೆ  | Web search, public API docs, weather             |
| `INTERNAL`     | Internal project ಡೇಟಾ ಜೊತೆ ಕೆಲಸ | Code analysis, config review, internal docs      |
| `CONFIDENTIAL` | Personal ಅಥವಾ private ಡೇಟಾ ನಿರ್ವಹಿಸುತ್ತದೆ | Email summary, GitHub notifications, CRM queries |
| `RESTRICTED`   | ಹೆಚ್ಚು sensitive ಡೇಟಾ ಪ್ರವೇಶಿಸುತ್ತದೆ | Key management, security audits, compliance      |

::: warning ನಿಮ್ಮ skill ನ ceiling ಬಳಕೆದಾರನ configure ಮಾಡಿದ ceiling ಮೀರಿದ್ದರೆ,
skill author API reject ಮಾಡುತ್ತದೆ. ಯಾವಾಗಲೂ ಅಗತ್ಯವಿರುವ ಕನಿಷ್ಠ ಮಟ್ಟ ಬಳಸಿ. :::

## Step 2: ಸೂಚನೆಗಳು ಬರೆಯಿರಿ

Markdown body skill execute ಮಾಡಲು agent ಓದುವ ಸೂಚನೆಗಳು. Actionable ಮತ್ತು ನಿರ್ದಿಷ್ಟವಾಗಿ ಮಾಡಿ.

### Structure Template

```markdown
# Skill Name

ಒಂದು-ಸಾಲಿನ purpose ಹೇಳಿಕೆ.

## When to Use

- Condition 1 (user asks for X)
- Condition 2 (triggered by cron)
- Condition 3 (related keyword detected)

## Steps

1. ನಿರ್ದಿಷ್ಟ ವಿವರಗಳ ಜೊತೆ ಮೊದಲ ಕ್ರಿಯೆ
2. ನಿರ್ದಿಷ್ಟ ವಿವರಗಳ ಜೊತೆ ಎರಡನೇ ಕ್ರಿಯೆ
3. ಫಲಿತಾಂಶಗಳನ್ನು Process ಮಾಡಿ format ಮಾಡಿ
4. Configure ಮಾಡಿದ channel ಗೆ ತಲುಪಿಸಿ

## Output Format

ಫಲಿತಾಂಶಗಳನ್ನು ಹೇಗೆ format ಮಾಡಬೇಕು ವಿವರಿಸಿ.

## Common Mistakes

- Y ಕಾರಣ X ಮಾಡಬೇಡಿ
- ಮುಂದುವರೆಯುವ ಮೊದಲು ಯಾವಾಗಲೂ Z ತಪಾಸಿಸಿ
```

### ಉತ್ತಮ ಅಭ್ಯಾಸಗಳು

- **ಉದ್ದೇಶದಿಂದ ಪ್ರಾರಂಭಿಸಿ**: Skill ಏನು ಮಾಡುತ್ತದೆ ಎಂದು ವಿವರಿಸುವ ಒಂದು ವಾಕ್ಯ
- **"When to Use" ಸೇರಿಸಿ**: Skill ಯಾವಾಗ activate ಮಾಡಬೇಕೆಂದು agent ನಿರ್ಧರಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ
- **ನಿರ್ದಿಷ್ಟವಾಗಿರಿ**: "ಕೊನೆಯ 24 ಗಂಟೆಗಳ ಓದದ emails fetch ಮಾಡಿ" "emails ತರಿಸಿ" ಗಿಂತ ಉತ್ತಮ
- **Code examples ಬಳಸಿ**: ನಿಖರ API calls, data formats, command patterns ತೋರಿಸಿ
- **Tables ಸೇರಿಸಿ**: Options, endpoints, parameters ಗೆ quick reference
- **Error handling ಸೇರಿಸಿ**: API call ವಿಫಲವಾದಾಗ ಅಥವಾ data ಇಲ್ಲದಿದ್ದರೆ ಏನು ಮಾಡಬೇಕು
- **"Common Mistakes" ನಿಂದ ಮುಗಿಸಿ**: Agent ತಿಳಿದ ಸಮಸ್ಯೆಗಳನ್ನು ಪುನರಾವರ್ತಿಸುವುದನ್ನು ತಡೆಯುತ್ತದೆ

## Step 3: Discovery Test ಮಾಡಿ

Skill ಅನ್ನು skill loader discover ಮಾಡಬಹುದೆಂದು verify ಮಾಡಿ. Bundled directory
ನಲ್ಲಿ ಇರಿಸಿದ್ದರೆ:

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

ಇವನ್ನು ತಪಾಸಿಸಿ:

- Skill discovered list ನಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ
- `name` frontmatter ಹೊಂದಾಣಿಕೆಯಾಗುತ್ತದೆ
- `classificationCeiling` ಸರಿಯಾಗಿದೆ
- `requiresTools` ಮತ್ತು `networkDomains` ತುಂಬಿಸಲ್ಪಟ್ಟಿವೆ

## Agent Self-Authoring

Agent `SkillAuthor` API ಬಳಸಿ programmatically skills ರಚಿಸಬಹುದು. ಏನಾದರೂ ಹೊಸದು
ಮಾಡಲು ಕೇಳಿದಾಗ agent ತನ್ನನ್ನು ತಾನೇ ಹೇಗೆ ವಿಸ್ತರಿಸುತ್ತದೆ ಇಲ್ಲಿ.

### Workflow

```
1. User:  "I need you to check Notion for new tasks every morning"
2. Agent: Workspace ನಲ್ಲಿ skill ರಚಿಸಲು SkillAuthor ಬಳಸುತ್ತದೆ
3. Skill: PENDING_APPROVAL status ಗೆ ಪ್ರವೇಶಿಸುತ್ತದೆ
4. User:  Notification ಸ್ವೀಕರಿಸಿ, skill ಪರಿಶೀಲಿಸುತ್ತಾರೆ
5. User:  Approve → skill active ಆಗುತ್ತದೆ
6. Agent: Skill ಅನ್ನು morning cron schedule ಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ
```

### SkillAuthor API ಬಳಸಿ

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

### Approval Statuses

| Status             | Meaning                           |
| ------------------ | --------------------------------- |
| `PENDING_APPROVAL` | ರಚಿಸಲ್ಪಟ್ಟಿದೆ, owner ಪರಿಶೀಲನೆ ಕಾಯುತ್ತಿದೆ |
| `APPROVED`         | Owner approved, skill active      |
| `REJECTED`         | Owner rejected, skill inactive    |

::: warning SECURITY Agent ತನ್ನ ಸ್ವಂತ skills approve ಮಾಡಲಾಗದು. ಇದನ್ನು API
ಮಟ್ಟದಲ್ಲಿ ಜಾರಿಗೊಳಿಸಲ್ಪಡುತ್ತದೆ. ಎಲ್ಲ agent-authored skills activate ಆಗುವ ಮೊದಲು
ಸ್ಪಷ್ಟ owner confirmation ಅಗತ್ಯ. :::

## Security Scanning

Activation ಮೊದಲು, skills prompt injection patterns ಗಾಗಿ security scanner ಮೂಲಕ
ಹಾದು ಹೋಗುತ್ತವೆ:

- "Ignore all previous instructions" -- prompt injection
- "You are now a..." -- identity redefinition
- "Reveal secrets/credentials" -- data exfiltration attempts
- "Bypass security/policy" -- security circumvention
- "Sudo/admin/god mode" -- privilege escalation

Scanner flag ಮಾಡಿದ Skills owner approval ಮೊದಲು review ಮಾಡಬೇಕಾದ warnings
ಒಳಗೊಂಡಿರುತ್ತವೆ.

## Triggers

Skills frontmatter ನಲ್ಲಿ ಸ್ವಯಂಚಾಲಿತ triggers ನಿರ್ಧರಿಸಬಹುದು:

```yaml
triggers:
  - cron: "0 7 * * *" # Every day at 7 AM
  - cron: "*/30 * * * *" # Every 30 minutes
```

Scheduler ಈ definitions ಓದಿ skill execute ಮಾಡಲು agent ಅನ್ನು ನಿರ್ದಿಷ್ಟ ಸಮಯಗಳಲ್ಲಿ
ಎಚ್ಚರಗೊಳಿಸುತ್ತದೆ. `triggerfish.yaml` ನಲ್ಲಿ quiet hours ಜೊತೆ triggers combine
ಮಾಡಿ ಕೆಲವು ಅವಧಿಗಳಲ್ಲಿ execution ತಡೆಯಬಹುದು.

## ಸಂಪೂರ್ಣ ಉದಾಹರಣೆ

GitHub notifications triage ಮಾಡಲು ಪೂರ್ಣ skill:

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

Review and categorize GitHub notifications, issues, and pull requests.

## When to Use

- User asks "what's happening on GitHub?"
- Hourly cron trigger
- User asks about specific repo activity

## Steps

1. Fetch notifications from GitHub API using the user's token
2. Categorize: PRs needing review, new issues, mentions, CI failures
3. Prioritize by label: bug > security > feature > question
4. Summarize top items with direct links
5. Flag anything assigned to the user

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- Don't fetch all notifications — filter by `since` parameter for the last hour
- Always check rate limits before making multiple API calls
- Include direct links to every item for quick action
```

## Skill Checklist

Skill ಪೂರ್ಣ ಎಂದು ಪರಿಗಣಿಸುವ ಮೊದಲು:

- [ ] Folder ಹೆಸರು frontmatter ನ `name` ಹೊಂದಾಣಿಕೆಯಾಗುತ್ತದೆ
- [ ] Description **ಏನನ್ನು** ಮತ್ತು **ಯಾವಾಗ** ಬಳಸಬೇಕು ಎಂದು ವಿವರಿಸುತ್ತದೆ
- [ ] Classification ceiling ಕಾರ್ಯ ಮಾಡುವ ಅತ್ಯಂತ ಕಡಿಮೆ ಮಟ್ಟ
- [ ] ಎಲ್ಲ ಅಗತ್ಯ tools `requires_tools` ನಲ್ಲಿ ಪಟ್ಟಿ ಮಾಡಲ್ಪಟ್ಟಿವೆ
- [ ] ಎಲ್ಲ ಬಾಹ್ಯ domains `network_domains` ನಲ್ಲಿ ಪಟ್ಟಿ ಮಾಡಲ್ಪಟ್ಟಿವೆ
- [ ] ಸೂಚನೆಗಳು concrete ಮತ್ತು step-by-step
- [ ] Code examples Triggerfish patterns (Result types, factory functions) ಬಳಸುತ್ತವೆ
- [ ] Output format ನಿರ್ಧರಿಸಲ್ಪಟ್ಟಿದೆ
- [ ] Common mistakes ವಿಭಾಗ ಸೇರಿಸಲ್ಪಟ್ಟಿದೆ
- [ ] Skill loader ನಿಂದ discoverable (test ಮಾಡಲ್ಪಟ್ಟಿದೆ)
