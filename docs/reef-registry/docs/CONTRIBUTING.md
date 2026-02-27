# Contributing to The Reef

The Reef is the skill marketplace for Triggerfish agents. Skills are submitted
as pull requests and validated by CI before merge.

## How to Submit a Skill

### 1. Prepare Your Skill

Create a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: my-skill
version: 1.0.0
description: >
  One-line description of what the skill does.
author: your-github-username
tags:
  - relevant
  - tags
category: utilities
classification_ceiling: PUBLIC
requires_tools:
  - web_fetch
network_domains:
  - api.example.com
---

# My Skill

Instructions for the agent go here...
```

### 2. Validate Locally

```bash
triggerfish skill publish path/to/SKILL.md
```

This runs the security scanner and validates all required fields.

### 3. Submit a Pull Request

Create the following directory structure in your fork:

```
skills/
  my-skill/
    1.0.0/
      SKILL.md
```

Open a PR against the `main` branch of `greghavens/reef-registry`.

### 4. CI Validation

The PR pipeline will automatically:
- Parse your SKILL.md frontmatter
- Validate all required fields
- Run the security scanner
- Post results as a PR comment

### 5. Review and Merge

A maintainer will review your skill against the criteria in REVIEW.md.
After merge, the index rebuilds automatically and your skill becomes
available via `triggerfish skill install my-skill`.

## Required Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique skill identifier (lowercase, hyphens) |
| `version` | string | Semver version (e.g., `1.0.0`) |
| `description` | string | Brief description |
| `author` | string | Your GitHub username |
| `tags` | string[] | Searchable tags |
| `category` | string | Skill category |
| `classification_ceiling` | string | `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, or `RESTRICTED` |

## Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `requires_tools` | string[] | Tools the skill needs (null = unrestricted) |
| `network_domains` | string[] | Domains the skill accesses (null = unrestricted) |

## Naming Conventions

- Skill names: lowercase with hyphens (`deep-research`, not `DeepResearch`)
- Version directories match the `version` field in frontmatter
- One SKILL.md per version directory

## Publishing Updates

To publish a new version:
1. Create a new version directory: `skills/my-skill/1.1.0/SKILL.md`
2. Update the `version` field in frontmatter
3. Submit a PR

The catalog serves the latest version by default.
