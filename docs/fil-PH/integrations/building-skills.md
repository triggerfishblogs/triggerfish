# Pagbuo ng Skills

Ginagabayan ka ng guide na ito sa paggawa ng Triggerfish skill mula sa simula -- mula sa pagsulat ng `SKILL.md` file hanggang sa pag-test nito at pagkuha ng approval.

## Ano ang Gagawin Mo

Ang skill ay isang folder na naglalaman ng `SKILL.md` file na nagtuturo sa agent kung paano gumawa ng isang bagay. Sa dulo ng guide na ito, magkakaroon ka ng gumaganang skill na maaaring ma-discover at magamit ng agent.

## Anatomy ng Skill

Bawat skill ay isang directory na may `SKILL.md` sa root nito:

```
my-skill/
  SKILL.md           # Required: frontmatter + instructions
  template.md        # Optional: templates na nire-reference ng skill
  helper.ts          # Optional: supporting code
```

Ang `SKILL.md` file ay may dalawang bahagi:

1. **YAML frontmatter** (sa pagitan ng `---` delimiters) -- metadata tungkol sa skill
2. **Markdown body** -- ang instructions na binabasa ng agent

## Step 1: Isulat ang Frontmatter

Dine-declare ng frontmatter kung ano ang ginagawa ng skill, kung ano ang kailangan nito, at kung anong security constraints ang naa-apply.

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

### Mga Required Field

| Field         | Paglalarawan                                                    | Halimbawa       |
| ------------- | --------------------------------------------------------------- | --------------- |
| `name`        | Unique identifier. Lowercase, hyphens para sa spaces.           | `github-triage` |
| `description` | Ano ang ginagawa ng skill at kailan ito gamitin. 1-3 sentences. | Tingnan sa itaas |

### Mga Optional Field

| Field                    | Paglalarawan                              | Default  |
| ------------------------ | ----------------------------------------- | -------- |
| `classification_ceiling` | Maximum data sensitivity level            | `PUBLIC` |
| `requires_tools`         | Mga tools na kailangan ng skill           | `[]`     |
| `network_domains`        | External domains na ina-access ng skill   | `[]`     |

Maaaring isama ang karagdagang fields tulad ng `version`, `category`, `tags`, at `triggers` para sa documentation at future use. Tahimik na iignore ng skill loader ang mga fields na hindi nito kinikilala.

### Pagpili ng Classification Ceiling

Ang classification ceiling ang maximum data sensitivity na hahawakan ng iyong skill. Piliin ang pinakamababang level na gumagana:

| Level          | Kailan Gamitin                              | Mga Halimbawa                                            |
| -------------- | ------------------------------------------- | -------------------------------------------------------- |
| `PUBLIC`       | Gumagamit lang ng publicly available data   | Web search, public API docs, weather                     |
| `INTERNAL`     | Gumagana sa internal project data           | Code analysis, config review, internal docs              |
| `CONFIDENTIAL` | Humahawak ng personal o private data        | Email summary, GitHub notifications, CRM queries         |
| `RESTRICTED`   | Nag-a-access ng highly sensitive data       | Key management, security audits, compliance              |

::: warning Kung lumampas ang ceiling ng iyong skill sa configured ceiling ng user, ire-reject ito ng skill author API. Palaging gamitin ang minimum level na kailangan. :::

## Step 2: Isulat ang Instructions

Ang markdown body ang binabasa ng agent para matutunan kung paano i-execute ang skill. Gawin itong actionable at specific.

### Structure Template

```markdown
# Skill Name

One-line purpose statement.

## When to Use

- Condition 1 (user asks for X)
- Condition 2 (triggered by cron)
- Condition 3 (related keyword detected)

## Steps

1. First action with specific details
2. Second action with specific details
3. Process and format the results
4. Deliver to the configured channel

## Output Format

Describe how results should be formatted.

## Common Mistakes

- Don't do X because Y
- Always check Z before proceeding
```

### Mga Best Practice

- **Magsimula sa purpose**: Isang sentence na nagpapaliwanag kung ano ang ginagawa ng skill
- **Isama ang "When to Use"**: Tumutulong sa agent na magpasya kung kailan i-activate ang skill
- **Maging specific**: "Fetch the last 24 hours of unread emails" ay mas mahusay kaysa "Get emails"
- **Gumamit ng code examples**: Ipakita ang exact API calls, data formats, command patterns
- **Magdagdag ng tables**: Quick reference para sa options, endpoints, parameters
- **Isama ang error handling**: Ano ang gagawin kapag nag-fail ang API call o nawawala ang data
- **Magtapos sa "Common Mistakes"**: Pinipigilan ang agent mula sa pag-ulit ng kilalang issues

## Step 3: I-test ang Discovery

I-verify na natutuklasan ng skill loader ang iyong skill. Kung inilagay mo ito sa bundled directory:

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

I-check na:

- Lumilitaw ang skill sa discovered list
- Tumutugma ang `name` sa frontmatter
- Tama ang `classificationCeiling`
- Naka-populate ang `requiresTools` at `networkDomains`

## Agent Self-Authoring

Maaaring gumawa ng skills ang agent nang programmatically gamit ang `SkillAuthor` API. Ito ang paraan ng pag-extend ng agent sa sarili nito kapag hiniling na gumawa ng bago.

### Ang Workflow

```
1. User:  "I need you to check Notion for new tasks every morning"
2. Agent: Ginagamit ang SkillAuthor para gumawa ng skill sa workspace nito
3. Skill: Pumapasok sa PENDING_APPROVAL status
4. User:  Nakakatanggap ng notification, nire-review ang skill
5. User:  Ina-approve → nagiging active ang skill
6. Agent: Iwinaiwire ang skill sa morning cron schedule
```

### Paggamit ng SkillAuthor API

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

### Mga Approval Status

| Status             | Kahulugan                                  |
| ------------------ | ------------------------------------------ |
| `PENDING_APPROVAL` | Ginawa, naghihintay ng owner review        |
| `APPROVED`         | Ina-approve ng owner, active ang skill     |
| `REJECTED`         | Nire-reject ng owner, inactive ang skill   |

::: warning SECURITY Hindi maaaring i-approve ng agent ang sarili nitong skills. Ine-enforce ito sa API level. Lahat ng agent-authored skills ay nangangailangan ng explicit owner confirmation bago mag-activate. :::

## Security Scanning

Bago mag-activate, dumadaan ang skills sa security scanner na nagche-check ng prompt injection patterns:

- "Ignore all previous instructions" -- prompt injection
- "You are now a..." -- identity redefinition
- "Reveal secrets/credentials" -- data exfiltration attempts
- "Bypass security/policy" -- security circumvention
- "Sudo/admin/god mode" -- privilege escalation

Ang mga skills na na-flag ng scanner ay may kasamang warnings na kailangang i-review ng owner bago mag-approve.

## Mga Trigger

Maaaring mag-define ng automatic triggers ang skills sa kanilang frontmatter:

```yaml
triggers:
  - cron: "0 7 * * *" # Araw-araw ng 7 AM
  - cron: "*/30 * * * *" # Tuwing 30 minuto
```

Binabasa ng scheduler ang mga definition na ito at ginigising ang agent sa specified times para i-execute ang skill. Maaari mong pagsamahin ang triggers sa quiet hours sa `triggerfish.yaml` para pigilan ang execution sa ilang panahon.

## Buong Halimbawa

Narito ang buong skill para sa pag-triage ng GitHub notifications:

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

Bago isaalang-alang ang skill na kumpleto:

- [ ] Tumutugma ang folder name sa `name` sa frontmatter
- [ ] Nag-e-explain ang description kung **ano** at **kailan** gamitin
- [ ] Ang classification ceiling ay ang pinakamababang level na gumagana
- [ ] Lahat ng required tools ay nakalista sa `requires_tools`
- [ ] Lahat ng external domains ay nakalista sa `network_domains`
- [ ] Ang instructions ay concrete at step-by-step
- [ ] Gumagamit ang code examples ng Triggerfish patterns (Result types, factory functions)
- [ ] Na-specify ang output format
- [ ] Kasama ang common mistakes section
- [ ] Nadi-discover ng loader ang skill (na-test)
