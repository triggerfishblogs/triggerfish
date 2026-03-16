---
paths:
  - src/skills/**
---

# Bundled Skills

`src/skills/bundled/` contains first-party SKILL.md definitions shipped with
Triggerfish. Each subdirectory is a single skill (e.g., `tdd/SKILL.md`).

## Rules

- Every skill directory must contain exactly one `SKILL.md` file.
- SKILL.md must start with YAML frontmatter delimited by `---`.
- Required frontmatter fields: `name`, `version`, `description`, `author`,
  `tags`, `category`, `classification_ceiling`.
- `classification_ceiling` must be a valid ClassificationLevel
  (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED).
- No executable code in bundled skills — SKILL.md is a prompt document, not a
  script. Tool declarations and network domain lists are metadata only.
- Skill names must match their directory name (lowercase alphanumeric + hyphens).
- Security scanner (`src/tools/skills/scanner.ts`) must pass on all bundled
  skills — no prompt injection patterns, obfuscation, or zero-width characters.
