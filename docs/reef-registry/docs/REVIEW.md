# Skill Review Criteria

Reviewers use these criteria when evaluating skill submissions to The Reef.

## Required Checks (Must Pass)

### 1. Frontmatter Completeness

All required fields must be present and valid:

- `name`, `version`, `description`, `author`, `tags`, `category`,
  `classification_ceiling`
- Classification ceiling must be one of: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`,
  `RESTRICTED`

### 2. Security Scanner

The skill must pass the Triggerfish security scanner with no critical findings:

- No prompt injection patterns (identity override, instruction bypass, secret
  extraction)
- No obfuscation techniques (base64 decode calls, zero-width characters, shell
  encoding)
- Cumulative heuristic score below threshold

### 3. Correct Directory Structure

```
skills/{name}/{version}/SKILL.md
```

- Name matches the `name` field in frontmatter
- Version directory matches the `version` field in frontmatter

## Quality Criteria (Reviewer Judgment)

### 4. Classification Ceiling Appropriateness

- PUBLIC: Only accesses public data, no credentials needed
- INTERNAL: Accesses organization-internal data
- CONFIDENTIAL: Handles sensitive business data
- RESTRICTED: Handles highly sensitive / regulated data

The ceiling should be the **minimum** level needed. A weather skill should be
PUBLIC. A skill that reads private repos should be at least INTERNAL.

### 5. Tool and Domain Declarations

- `requires_tools` should list ONLY the tools the skill actually uses
- `network_domains` should list ONLY the domains the skill accesses
- Empty arrays `[]` mean "no access needed" — prefer this over `null`
  (unrestricted)
- Undeclared (`null`) should be rare and well-justified

### 6. Content Quality

- Clear, actionable instructions for the agent
- No ambiguous or contradictory directives
- Reasonable scope (not trying to do everything)
- Well-structured markdown

### 7. Naming

- Descriptive, unique name
- Lowercase with hyphens
- No generic names (`tool`, `helper`, `utility`)
- No Triggerfish-reserved names (`system`, `core`, `admin`)

## Rejection Reasons

- Critical security scanner finding
- Missing required frontmatter fields
- Classification ceiling too low for declared capabilities
- Overly broad tool/domain declarations without justification
- Duplicate functionality of an existing skill (suggest contributing to the
  existing one)
- Content that is harmful, misleading, or violates terms of service
