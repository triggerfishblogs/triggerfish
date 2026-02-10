# Building Skills

This guide walks through creating a Triggerfish skill from scratch -- from writing the `SKILL.md` file to testing it and getting it approved.

## What You Will Build

A skill is a folder containing a `SKILL.md` file that teaches the agent how to do something. By the end of this guide, you will have a working skill that the agent can discover and use.

## Skill Anatomy

Every skill is a directory with a `SKILL.md` at its root:

```
my-skill/
  SKILL.md           # Required: frontmatter + instructions
  template.md        # Optional: templates the skill references
  helper.ts          # Optional: supporting code
```

The `SKILL.md` file has two parts:

1. **YAML frontmatter** (between `---` delimiters) -- metadata about the skill
2. **Markdown body** -- the instructions the agent reads

## Step 1: Write the Frontmatter

The frontmatter declares what the skill does, what it needs, and what security constraints apply.

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

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Unique identifier. Lowercase, hyphens for spaces. | `github-triage` |
| `description` | What the skill does and when to use it. 1-3 sentences. | See above |

### Optional Fields

| Field | Description | Default |
|-------|-------------|---------|
| `classification_ceiling` | Maximum data sensitivity level | `PUBLIC` |
| `requires_tools` | Tools the skill needs access to | `[]` |
| `network_domains` | External domains the skill accesses | `[]` |

Additional fields like `version`, `category`, `tags`, and `triggers` can be included for documentation and future use. The skill loader will silently ignore fields it does not recognize.

### Choosing a Classification Ceiling

The classification ceiling is the maximum data sensitivity your skill will handle. Choose the lowest level that works:

| Level | When to Use | Examples |
|-------|-------------|---------|
| `PUBLIC` | Only uses publicly available data | Web search, public API docs, weather |
| `INTERNAL` | Works with internal project data | Code analysis, config review, internal docs |
| `CONFIDENTIAL` | Handles personal or private data | Email summary, GitHub notifications, CRM queries |
| `RESTRICTED` | Accesses highly sensitive data | Key management, security audits, compliance |

::: warning
If your skill's ceiling exceeds the user's configured ceiling, the skill author API will reject it. Always use the minimum level necessary.
:::

## Step 2: Write the Instructions

The markdown body is what the agent reads to learn how to execute the skill. Make it actionable and specific.

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

### Best Practices

- **Start with purpose**: One sentence explaining what the skill does
- **Include "When to Use"**: Helps the agent decide when to activate the skill
- **Be specific**: "Fetch the last 24 hours of unread emails" is better than "Get emails"
- **Use code examples**: Show exact API calls, data formats, command patterns
- **Add tables**: Quick reference for options, endpoints, parameters
- **Include error handling**: What to do when an API call fails or data is missing
- **End with "Common Mistakes"**: Prevents the agent from repeating known issues

## Step 3: Test Discovery

Verify your skill is discoverable by the skill loader. If you placed it in the bundled directory:

```typescript
import { createSkillLoader } from "../src/skills/loader.ts";

const loader = createSkillLoader({
  directories: ["skills/bundled"],
  dirTypes: { "skills/bundled": "bundled" },
});

const skills = await loader.discover();
const mySkill = skills.find(s => s.name === "github-triage");
console.log(mySkill);
// { name: "github-triage", classificationCeiling: "CONFIDENTIAL", ... }
```

Check that:
- The skill appears in the discovered list
- `name` matches the frontmatter
- `classificationCeiling` is correct
- `requiresTools` and `networkDomains` are populated

## Agent Self-Authoring

The agent can create skills programmatically using the `SkillAuthor` API. This is how the agent extends itself when asked to do something new.

### The Workflow

```
1. User:  "I need you to check Notion for new tasks every morning"
2. Agent: Uses SkillAuthor to create a skill in its workspace
3. Skill: Enters PENDING_APPROVAL status
4. User:  Receives notification, reviews the skill
5. User:  Approves → skill becomes active
6. Agent: Wires skill into the morning cron schedule
```

### Using the SkillAuthor API

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

| Status | Meaning |
|--------|---------|
| `PENDING_APPROVAL` | Created, waiting for owner review |
| `APPROVED` | Owner approved, skill is active |
| `REJECTED` | Owner rejected, skill is inactive |

::: warning SECURITY
The agent cannot approve its own skills. This is enforced at the API level. All agent-authored skills require explicit owner confirmation before activation.
:::

## Security Scanning

Before activation, skills pass through a security scanner that checks for prompt injection patterns:

- "Ignore all previous instructions" -- prompt injection
- "You are now a..." -- identity redefinition
- "Reveal secrets/credentials" -- data exfiltration attempts
- "Bypass security/policy" -- security circumvention
- "Sudo/admin/god mode" -- privilege escalation

Skills flagged by the scanner include warnings that the owner must review before approval.

## Triggers

Skills can define automatic triggers in their frontmatter:

```yaml
triggers:
  - cron: "0 7 * * *"      # Every day at 7 AM
  - cron: "*/30 * * * *"   # Every 30 minutes
```

The scheduler reads these definitions and wakes the agent at the specified times to execute the skill. You can combine triggers with quiet hours in `triggerfish.yaml` to prevent execution during certain periods.

## Complete Example

Here is a full skill for triaging GitHub notifications:

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

Before considering a skill complete:

- [ ] Folder name matches `name` in frontmatter
- [ ] Description explains **what** and **when** to use
- [ ] Classification ceiling is the lowest level that works
- [ ] All required tools are listed in `requires_tools`
- [ ] All external domains are listed in `network_domains`
- [ ] Instructions are concrete and step-by-step
- [ ] Code examples use Triggerfish patterns (Result types, factory functions)
- [ ] Output format is specified
- [ ] Common mistakes section is included
- [ ] Skill is discoverable by the loader (tested)
