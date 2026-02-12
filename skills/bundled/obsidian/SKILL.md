---
name: obsidian
description: >
  Obsidian vault integration for reading, writing, searching, and navigating
  markdown notes with wikilinks. Filesystem-based — no network access needed.
  Supports daily notes, frontmatter, backlinks, and classification-gated access.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - obsidian.read
  - obsidian.write
  - obsidian.search
  - obsidian.list
  - obsidian.daily
  - obsidian.links
network_domains: []
---

# Obsidian Vault Integration

You have access to the user's Obsidian vault through 6 tools. Use them to read, create, and connect notes.

## Tools

| Tool | Purpose |
|------|---------|
| `obsidian.read` | Read a note by name or path |
| `obsidian.write` | Create or update a note |
| `obsidian.search` | Search notes by content |
| `obsidian.list` | List notes, optionally filtered |
| `obsidian.daily` | Get/create today's daily note |
| `obsidian.links` | Explore backlinks and outlinks |

## Wikilink Syntax

Obsidian uses `[[wikilinks]]` to connect notes:

- `[[Note Name]]` — link to a note by name
- `[[Note Name|display text]]` — link with custom display text
- `![[Note Name]]` — embed (transclude) a note's content
- `[[folder/Note Name]]` — link with explicit path

When writing note content, always use wikilinks to reference other notes. This builds the knowledge graph.

## Frontmatter

Notes can have YAML frontmatter between `---` delimiters:

```markdown
---
tags:
  - project
  - meeting
date: 2025-01-15
status: active
---

# Note Title

Content here...
```

Use `obsidian.write` with the `frontmatter` parameter to set metadata without touching the body.

## Daily Notes

Use `obsidian.daily` for journal entries, meeting notes, and daily logs. The tool creates the note from a template if it doesn't exist yet. Append to daily notes with `obsidian.write` using the `append` parameter.

## Best Practices

1. **Search before creating** — Check if a note exists with `obsidian.search` before creating a duplicate
2. **Use tags consistently** — Add tags in frontmatter, not just inline, for reliable filtering
3. **Link generously** — Use `[[wikilinks]]` in note content to build connections
4. **Respect folder structure** — Create notes in appropriate folders, don't dump everything at root
5. **Use daily notes for temporal content** — Meeting notes, logs, and journal entries belong in daily notes
6. **Check backlinks** — Use `obsidian.links` to understand how notes connect before reorganizing
