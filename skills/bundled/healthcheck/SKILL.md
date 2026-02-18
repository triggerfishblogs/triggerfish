---
name: healthcheck
description: >
  Inspect Triggerfish runtime health. Reports status of LLM providers, storage,
  skills, and configuration. Use when diagnosing issues or confirming the
  platform is working correctly.
classification_ceiling: INTERNAL
requires_tools:
  - healthcheck
network_domains: []
---

# Healthcheck

Inspect the health of Triggerfish's own runtime components.

## Tool

| Tool | Purpose |
|------|---------|
| `healthcheck` | Check status of one or more components |

## Components

| Component | What It Checks |
|-----------|---------------|
| `providers` | LLM provider registry — is a default provider configured and reachable? |
| `storage` | SQLite storage — can it read/write? |
| `skills` | Skill loader — how many skills were discovered? |
| `config` | Configuration — is triggerfish.yaml valid and loaded? |
| `all` | Run all checks (default) |

## Usage

When the user asks "is everything working?", "check status", "what's broken?",
or is diagnosing issues, call `healthcheck` with the relevant components:

```
healthcheck(components: ["all"])
healthcheck(components: ["providers", "storage"])
```

## Status Levels

- **healthy** — component is fully operational
- **degraded** — component is partially working (e.g. no default provider set)
- **error** — component is unavailable or misconfigured

## Classification

Healthcheck output reveals system internals (provider names, storage paths,
skill counts). Minimum classification is INTERNAL — never share healthcheck
results on PUBLIC channels.
