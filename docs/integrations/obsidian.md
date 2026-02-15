# Obsidian

Connect your Triggerfish agent to one or more [Obsidian](https://obsidian.md/) vaults so it can read, create, and search your notes. The integration accesses vaults directly on the filesystem -- no Obsidian app or plugin is required.

## What It Does

The Obsidian integration gives your agent these tools:

| Tool | Description |
|------|-------------|
| `obsidian_read` | Read a note's content and frontmatter |
| `obsidian_write` | Create or update a note |
| `obsidian_list` | List notes in a folder |
| `obsidian_search` | Search note contents |
| `obsidian_daily` | Read or create today's daily note |
| `obsidian_links` | Resolve wikilinks and find backlinks |
| `obsidian_delete` | Delete a note |

## Setup

### Step 1: Connect Your Vault

```bash
triggerfish connect obsidian
```

This prompts for your vault path and writes the config. You can also configure it manually.

### Step 2: Configure in triggerfish.yaml

```yaml
obsidian:
  vaults:
    main:
      vaultPath: ~/Obsidian/MainVault
      defaultClassification: INTERNAL
      excludeFolders:
        - .obsidian
        - .trash
      folderClassifications:
        "Private/Health": CONFIDENTIAL
        "Private/Finance": RESTRICTED
        "Work": INTERNAL
        "Public": PUBLIC
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `vaultPath` | string | Yes | Absolute path to the Obsidian vault root |
| `defaultClassification` | string | No | Default classification for notes (default: `INTERNAL`) |
| `excludeFolders` | string[] | No | Folders to ignore (default: `.obsidian`, `.trash`) |
| `folderClassifications` | object | No | Map folder paths to classification levels |

### Multiple Vaults

You can connect multiple vaults with different classification levels:

```yaml
obsidian:
  vaults:
    personal:
      vaultPath: ~/Obsidian/Personal
      defaultClassification: CONFIDENTIAL
    work:
      vaultPath: ~/Obsidian/Work
      defaultClassification: INTERNAL
    public:
      vaultPath: ~/Obsidian/PublicNotes
      defaultClassification: PUBLIC
```

## Folder-Based Classification

Notes inherit classification from their folder. The most specific matching folder wins:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

With this config:
- `Private/todo.md` is `CONFIDENTIAL`
- `Private/Health/records.md` is `RESTRICTED`
- `Work/project.md` is `INTERNAL`
- `notes.md` (vault root) uses `defaultClassification`

Classification gating applies: the agent can only read notes whose classification level flows to the current session taint. A `PUBLIC`-tainted session cannot access `CONFIDENTIAL` notes.

## Security

### Path Confinement

All file operations are confined to the vault root. The adapter uses `Deno.realPath` to resolve symlinks and prevent path traversal attacks. Any attempt to read `../../etc/passwd` or similar is blocked before the filesystem is touched.

### Vault Verification

The adapter verifies that a `.obsidian/` directory exists at the vault root before accepting the path. This ensures you are pointing at an actual Obsidian vault, not an arbitrary directory.

### Classification Enforcement

- Notes carry classification from their folder mapping
- Reading a `CONFIDENTIAL` note escalates session taint to `CONFIDENTIAL`
- The no-write-down rule prevents writing classified content to lower-classified folders
- All note operations pass through the standard policy hooks

## Wikilinks

The adapter understands Obsidian's `[[wikilink]]` syntax. The `obsidian_links` tool resolves wikilinks to actual file paths and finds all notes that link back to a given note (backlinks).

## Daily Notes

The `obsidian_daily` tool reads or creates today's daily note using your vault's daily note folder convention. If the note doesn't exist, it creates one with a default template.

## Frontmatter

Notes with YAML frontmatter are parsed automatically. Frontmatter fields are available as metadata when reading notes. The adapter preserves frontmatter when writing or updating notes.
