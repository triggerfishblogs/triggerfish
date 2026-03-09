# Obsidian

I-connect ang iyong Triggerfish agent sa isa o higit pang [Obsidian](https://obsidian.md/) vaults para makapagbasa, makagawa, at makahanap ng notes. Dina-directly access ng integration ang vaults sa filesystem -- hindi kailangan ng Obsidian app o plugin.

## Ano ang Ginagawa Nito

Binibigyan ng Obsidian integration ang iyong agent ng mga tools na ito:

| Tool              | Paglalarawan                                 |
| ----------------- | -------------------------------------------- |
| `obsidian_read`   | Basahin ang content at frontmatter ng note   |
| `obsidian_write`  | Gumawa o mag-update ng note                  |
| `obsidian_list`   | Ilista ang notes sa isang folder             |
| `obsidian_search` | Maghanap sa note contents                    |
| `obsidian_daily`  | Basahin o gumawa ng daily note ngayon        |
| `obsidian_links`  | I-resolve ang wikilinks at maghanap ng backlinks |
| `obsidian_delete` | Mag-delete ng note                           |

## Setup

### Step 1: I-connect ang Iyong Vault

```bash
triggerfish connect obsidian
```

Nagpo-prompt ito para sa iyong vault path at isinusulat ang config. Maaari mo ring manual na i-configure.

### Step 2: I-configure sa triggerfish.yaml

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

| Option                  | Type     | Required | Paglalarawan                                              |
| ----------------------- | -------- | -------- | --------------------------------------------------------- |
| `vaultPath`             | string   | Oo       | Absolute path sa Obsidian vault root                      |
| `defaultClassification` | string   | Hindi    | Default classification para sa notes (default: `INTERNAL`) |
| `excludeFolders`        | string[] | Hindi    | Mga folders na iignore (default: `.obsidian`, `.trash`)   |
| `folderClassifications` | object   | Hindi    | I-map ang folder paths sa classification levels           |

### Maramihang Vault

Maaari kang mag-connect ng maramihang vaults na may iba't ibang classification levels:

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

Nag-i-inherit ng classification ang notes mula sa kanilang folder. Ang pinaka-specific na tumutugmang folder ang nananaig:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

Sa config na ito:

- `Private/todo.md` ay `CONFIDENTIAL`
- `Private/Health/records.md` ay `RESTRICTED`
- `Work/project.md` ay `INTERNAL`
- `notes.md` (vault root) ay gumagamit ng `defaultClassification`

Naa-apply ang classification gating: mababasa lang ng agent ang notes na ang classification level ay dumadaloy sa kasalukuyang session taint. Hindi maaaring mag-access ng `CONFIDENTIAL` notes ang `PUBLIC`-tainted session.

## Security

### Path Confinement

Lahat ng file operations ay nakakulong sa vault root. Gumagamit ang adapter ng `Deno.realPath` para i-resolve ang symlinks at pigilan ang path traversal attacks. Anumang pagtatangkang basahin ang `../../etc/passwd` o katulad ay bina-block bago mahawakan ang filesystem.

### Vault Verification

Bine-verify ng adapter na may `.obsidian/` directory sa vault root bago tanggapin ang path. Sinisiguro nito na nakaturo ka sa aktwal na Obsidian vault, hindi sa arbitrary directory.

### Classification Enforcement

- Nagdadala ng classification ang notes mula sa kanilang folder mapping
- Ang pagbasa ng `CONFIDENTIAL` note ay nag-e-escalate ng session taint sa `CONFIDENTIAL`
- Pinipigilan ng no-write-down rule ang pagsulat ng classified content sa lower-classified folders
- Lahat ng note operations ay dumadaan sa standard policy hooks

## Mga Wikilink

Naiintindihan ng adapter ang `[[wikilink]]` syntax ng Obsidian. Nire-resolve ng `obsidian_links` tool ang wikilinks sa aktwal na file paths at hinahanap ang lahat ng notes na nagli-link pabalik sa isang partikular na note (backlinks).

## Mga Daily Note

Binabasa o ginagawa ng `obsidian_daily` tool ang daily note ngayon gamit ang daily note folder convention ng iyong vault. Kung wala ang note, gumagawa ito ng isa na may default template.

## Frontmatter

Ang notes na may YAML frontmatter ay awtomatikong pina-parse. Available ang frontmatter fields bilang metadata kapag nagbabasa ng notes. Pini-preserve ng adapter ang frontmatter kapag nagsusulat o nag-a-update ng notes.
