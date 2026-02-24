---
name: skill-builder
version: 1.0.0
description: >
  How to author Triggerfish skills. Covers SKILL.md format, frontmatter
  fields, security metadata, the three-tier hierarchy, approval workflow,
  triggers, and best practices. Use when creating new skills for an agent.
classification_ceiling: INTERNAL
requires_tools: []
network_domains: []
---

# Building Triggerfish Skills

A skill is a folder with a `SKILL.md` file that teaches the agent how to do something. Skills are how the agent learns new capabilities without writing plugins or custom code.

## Skill Structure

A skill is a directory containing `SKILL.md` at its root. Optional supporting files can live alongside it:

```
morning-briefing/
  SKILL.md           # Required: frontmatter + instructions
  template.md        # Optional: templates the skill references
  briefing.ts        # Optional: supporting code
```

The folder name should match the `name` field in the frontmatter.

## SKILL.md Format

The file has two parts: YAML frontmatter (between `---` delimiters) and a markdown body.

### Frontmatter

```yaml
---
name: morning-briefing
description: >
  Prepare a daily morning briefing with calendar, email, and weather.
  Use when the user asks for their morning summary or on the 7 AM cron.
classification_ceiling: INTERNAL
requires_tools:
  - browser
  - exec
network_domains:
  - api.openweathermap.org
  - www.googleapis.com
---
```

### Frontmatter Fields

| Field | Required | Description |
|-------|:--------:|-------------|
| `name` | Yes | Unique identifier. Lowercase with hyphens: `my-skill-name` |
| `description` | Yes | What the skill does and when to activate it. 1-3 sentences. |
| `classification_ceiling` | No | Maximum data sensitivity level. Default: `PUBLIC` |
| `requires_tools` | No | Tools the skill needs (e.g., `browser`, `exec`, `read_file`) |
| `network_domains` | No | External domains the skill accesses |

The skill loader (`src/skills/loader.ts`) parses these exact fields. Unknown fields are silently ignored, so you can add `version`, `category`, `tags`, or `triggers` for documentation purposes.

### Markdown Body

The body after the closing `---` contains the instructions the agent reads. This is the actual "skill" -- the knowledge that teaches the agent what to do.

## Classification Ceiling

Every skill declares the maximum data sensitivity it can handle:

| Level | When to Use |
|-------|-------------|
| `PUBLIC` | Skill works only with publicly available data (web search, public APIs, open-source docs) |
| `INTERNAL` | Skill works with internal project code, configs, documentation. Most development skills use this. |
| `CONFIDENTIAL` | Skill handles user PII, private messages, API credentials, personal data |
| `RESTRICTED` | Skill accesses highly sensitive data (encryption keys, security audit results, compliance data) |

If omitted, defaults to `PUBLIC`. Choose the lowest level that covers what the skill actually does.

## Three-Tier Skill Hierarchy

Skills come from three sources, with a strict priority order:

```
Priority:  Workspace (highest)  >  Managed  >  Bundled (lowest)
```

### Bundled Skills

Ship with Triggerfish. Located in `skills/bundled/`. Cannot be modified by the agent. Always available.

### Managed Skills

Installed from The Reef marketplace. Downloaded to `~/.triggerfish/skills/`. Updated via `triggerfish skill update`.

### Workspace Skills

Created by the user or authored by the agent. Located in the agent's workspace: `~/.triggerfish/workspace/<agent-id>/skills/`.

**Priority matters**: If a workspace skill has the same `name` as a bundled skill, the workspace version wins. This lets agents customize or replace any skill.

## Self-Authoring Workflow

The agent can create new skills using the `SkillAuthor` API:

### Step 1: Create the author

```typescript
import { createSkillAuthor } from "../skills/mod.ts";

const author = createSkillAuthor({
  skillsDir: workspace.skillsPath,  // e.g., ~/.triggerfish/workspace/agent-1/skills
  userCeiling: "CONFIDENTIAL",      // max classification the user allows
});
```

### Step 2: Author the skill

```typescript
const result = await author.create({
  name: "notion-tasks",
  description: "Check Notion for new tasks and summarize them",
  classificationCeiling: "INTERNAL",
  requiresTools: ["browser"],
  networkDomains: ["api.notion.com"],
  content: `# Notion Task Checker\n\nWhen triggered or asked...\n`,
});

if (result.ok) {
  // result.value is AuthoredSkill with status: "PENDING_APPROVAL"
  console.log(`Skill created at: ${result.value.path}`);
}
```

### Step 3: Owner approval

The skill starts in `PENDING_APPROVAL` status. It cannot be used until the owner reviews and approves it. The agent cannot self-approve.

Approval statuses:
- `PENDING_APPROVAL` -- Created, waiting for review
- `APPROVED` -- Owner approved, skill is active
- `REJECTED` -- Owner rejected, skill is inactive

### Constraints enforced by the author

- Classification ceiling cannot exceed the user's configured ceiling
- If you request `RESTRICTED` but the user ceiling is `CONFIDENTIAL`, creation fails with an error Result
- Skills directory is created automatically if it doesn't exist

## Security Scanning

Before activation, skills are scanned for malicious patterns. The scanner (`src/skills/scanner.ts`) checks for:

1. "ignore all previous instructions" -- prompt injection
2. "system prompt override" -- identity hijacking
3. "disregard prior context" -- context manipulation
4. "you are now a..." -- identity redefinition
5. "reveal secrets/credentials/keys" -- data exfiltration
6. "forget rules/instructions" -- guardrail removal
7. "bypass security/policy/classification" -- security circumvention
8. "sudo/admin/god mode" -- privilege escalation

A clean scan returns `{ ok: true, warnings: [] }`. Flagged content returns warnings that the owner must review.

## Tool and Network Gating

Skills declare what they need, but the policy engine enforces it:

- `requires_tools: [browser]` -- The skill needs the browser tool. If browser access is blocked by policy, the skill cannot use it regardless of what it declares.
- `network_domains: [api.example.com]` -- The skill declares it will access this domain. If the domain is not in the allow list, the request is blocked.

Declarations are honest advertisements of intent. Policy enforcement is the actual gate.

## Trigger-Aware Skills

Skills can be wired to automatic triggers. Add trigger information to the frontmatter (not parsed by the current loader, but used by the scheduler):

```yaml
---
name: morning-briefing
description: Daily morning summary
classification_ceiling: INTERNAL
requires_tools:
  - browser
triggers:
  - cron: "0 7 * * *"
---
```

Trigger types:
- **Cron**: Periodic execution on a schedule (uses standard cron syntax)
- **Event**: Reactive execution when something happens (new message, webhook, etc.)

The scheduler reads trigger definitions and wakes the agent at the appropriate time.

## Writing Effective Skill Instructions

The markdown body is what the agent reads to learn. Make it actionable:

### Start with purpose

```markdown
# Morning Briefing

Compile a concise daily summary of calendar events, unread emails, and weather.
```

### Include "When to Use" section

```markdown
## When to Use

- User asks for their morning summary
- Triggered by 7 AM cron schedule
- User asks "what's on my calendar today?"
```

### Provide concrete steps

```markdown
## Steps

1. Fetch today's calendar events from Google Calendar API
2. Summarize unread emails from the last 12 hours
3. Get weather forecast for the user's configured location
4. Compile briefing with sections: Calendar, Email, Weather
5. Deliver to the configured channel
```

### Use code examples

```markdown
## API Call Pattern

\```typescript
const events = await fetch("https://www.googleapis.com/calendar/v3/...", {
  headers: { Authorization: `Bearer ${token}` },
});
\```
```

### Include tables for quick reference

```markdown
| Source | API Endpoint | Data Needed |
|--------|-------------|-------------|
| Calendar | googleapis.com/calendar/v3 | Today's events |
| Email | gmail API | Unread from last 12h |
| Weather | openweathermap.org | Forecast for location |
```

### Add a "Common Mistakes" section

```markdown
## Common Mistakes

- Don't fetch all emails, only unread from last 12 hours
- Always check if calendar access token is still valid
- Keep the briefing scannable: bullet points, not paragraphs
```

## End-to-End Example: Creating a GitHub Triage Skill

**1. Create the skill directory:**

The agent creates `~/.triggerfish/workspace/agent-1/skills/github-triage/SKILL.md`

**2. Write the SKILL.md:**

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

1. Fetch notifications from GitHub API
2. Categorize: PRs needing review, new issues, mentions
3. Prioritize by label (bug > feature > question)
4. Summarize top items with links
5. Flag anything assigned to the user

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) - assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) - bug, high priority

### Mentions
- @you mentioned in #789 discussion
```

**3. Skill enters PENDING_APPROVAL status.**

**4. Owner receives notification, reviews the skill, approves it.**

**5. Skill becomes active and is wired into the hourly cron.**

## Checklist for New Skills

```
- [ ] Folder name matches `name` in frontmatter
- [ ] Description explains what AND when to use
- [ ] Classification ceiling is the lowest level that works
- [ ] All required tools are listed
- [ ] All network domains are declared
- [ ] Instructions are concrete and step-by-step
- [ ] Code examples use Triggerfish patterns (Result, factory functions)
- [ ] Common mistakes section included
```
