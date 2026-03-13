# Skills بنانا

یہ guide شروع سے Triggerfish skill بنانے کے بارے میں بتاتی ہے — `SKILL.md` فائل لکھنے
سے testing تک اور approve کروانے تک۔

## آپ کیا بنائیں گے

ایک skill ایک folder ہے جس میں `SKILL.md` فائل ہے جو ایجنٹ کو کوئی کام کرنا سکھاتی
ہے۔ اس guide کے آخر تک آپ کے پاس ایک کام کرنے والی skill ہوگی جسے ایجنٹ دریافت اور
استعمال کر سکتا ہے۔

## Skill Anatomy

ہر skill اپنی root میں `SKILL.md` والی directory ہے:

```
my-skill/
  SKILL.md           # ضروری: frontmatter + ہدایات
  template.md        # اختیاری: skill کی reference کردہ templates
  helper.ts          # اختیاری: supporting code
```

`SKILL.md` فائل کے دو حصے ہیں:

1. **YAML frontmatter** (`---` delimiters کے درمیان) — skill کے بارے میں metadata
2. **Markdown body** — وہ ہدایات جو ایجنٹ پڑھتا ہے

## قدم 1: Frontmatter لکھیں

Frontmatter declare کرتا ہے کہ skill کیا کرتی ہے، اسے کیا چاہیے، اور کون سی سیکیورٹی
constraints لاگو ہیں۔

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

### ضروری Fields

| Field         | تفصیل                                                    | مثال            |
| ------------- | --------------------------------------------------------- | --------------- |
| `name`        | منفرد identifier۔ Lowercase، spaces کے لیے hyphens۔    | `github-triage` |
| `description` | Skill کیا کرتی ہے اور کب استعمال کریں۔ 1-3 جملے۔       | اوپر دیکھیں     |

### اختیاری Fields

| Field                    | تفصیل                                      | ڈیفالٹ  |
| ------------------------ | ------------------------------------------- | -------- |
| `classification_ceiling` | زیادہ سے زیادہ data sensitivity level       | `PUBLIC` |
| `requires_tools`         | Tools جن تک skill کو رسائی چاہیے           | `[]`     |
| `network_domains`        | وہ external domains جن تک skill access کرتی | `[]`     |

### Classification Ceiling منتخب کرنا

Classification ceiling آپ کی skill کی زیادہ سے زیادہ data sensitivity ہے۔ سب سے کم
level منتخب کریں جو کام کرے:

| Level          | کب استعمال کریں                          | مثالیں                                                     |
| -------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `PUBLIC`       | صرف publicly available data استعمال کرے | Web search، public API docs، weather                        |
| `INTERNAL`     | Internal project data سے کام کرے        | Code analysis، config review، internal docs                 |
| `CONFIDENTIAL` | Personal یا private data handle کرے     | Email summary، GitHub notifications، CRM queries            |
| `RESTRICTED`   | انتہائی sensitive data access کرے       | Key management، security audits، compliance                 |

## قدم 2: ہدایات لکھیں

Markdown body وہ ہے جو ایجنٹ skill execute کرنا سیکھنے کے لیے پڑھتا ہے۔ اسے
actionable اور specific بنائیں۔

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

### بہترین طریقے

- **مقصد سے شروع کریں**: ایک جملہ بتائے skill کیا کرتی ہے
- **"When to Use" شامل کریں**: ایجنٹ کو decide کرنے میں مدد کہ skill کب activate کرے
- **مخصوص رہیں**: "Fetch the last 24 hours of unread emails" "Get emails" سے بہتر ہے
- **Code examples استعمال کریں**: exact API calls، data formats، command patterns دکھائیں
- **Tables شامل کریں**: options، endpoints، parameters کا quick reference
- **Error handling شامل کریں**: API call fail ہو یا data missing ہو تو کیا کریں
- **"Common Mistakes" سے ختم کریں**: ایجنٹ کو معلوم issues دہرانے سے روکتا ہے

## قدم 3: Discovery Test کریں

Verify کریں کہ آپ کی skill skill loader سے discoverable ہے:

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

Check کریں کہ:

- Skill discovered list میں ظاہر ہوتی ہے
- `name` frontmatter سے match کرتا ہے
- `classificationCeiling` درست ہے
- `requiresTools` اور `networkDomains` populated ہیں

## Agent Self-Authoring

ایجنٹ `SkillAuthor` API استعمال کر کے programmatically skills بنا سکتا ہے۔ یہ وہ طریقہ
ہے جس سے ایجنٹ خود کو extend کرتا ہے جب کوئی نئی چیز کرنے کو کہا جائے۔

### Approval Statuses

| Status             | مطلب                                          |
| ------------------ | ---------------------------------------------- |
| `PENDING_APPROVAL` | بنایا گیا، owner review کا انتظار             |
| `APPROVED`         | Owner نے approve کیا، skill فعال ہے            |
| `REJECTED`         | Owner نے reject کیا، skill غیر فعال ہے         |

::: warning سیکیورٹی ایجنٹ اپنی skills خود approve نہیں کر سکتا۔ یہ API level پر نافذ
ہے۔ تمام agent-authored skills کے لیے activation سے پہلے explicit owner confirmation
ضروری ہے۔ :::

## Security Scanning

Activation سے پہلے، skills ایک security scanner سے گزرتی ہیں جو prompt injection
patterns چیک کرتا ہے:

- "Ignore all previous instructions" — prompt injection
- "You are now a..." — identity redefinition
- "Reveal secrets/credentials" — data exfiltration attempts
- "Bypass security/policy" — security circumvention
- "Sudo/admin/god mode" — privilege escalation

Scanner کی طرف سے flagged skills میں warnings شامل ہوتی ہیں جو owner کو approval سے
پہلے review کرنی چاہیے۔

## Triggers

Skills اپنے frontmatter میں automatic triggers define کر سکتی ہیں:

```yaml
triggers:
  - cron: "0 7 * * *" # ہر روز صبح 7 بجے
  - cron: "*/30 * * * *" # ہر 30 منٹ
```

## مکمل مثال

GitHub notifications triage کرنے کی مکمل skill:

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

Skill مکمل سمجھنے سے پہلے:

- [ ] Folder کا نام frontmatter میں `name` سے match کرتا ہے
- [ ] Description **کیا** اور **کب** استعمال کریں بتاتی ہے
- [ ] Classification ceiling سب سے کم level ہے جو کام کرتی ہے
- [ ] تمام required tools `requires_tools` میں listed ہیں
- [ ] تمام external domains `network_domains` میں listed ہیں
- [ ] ہدایات concrete اور step-by-step ہیں
- [ ] Output format specified ہے
- [ ] Common mistakes section شامل ہے
- [ ] Skill loader کے ذریعے discoverable ہے (tested)
