# Obsidian

ನಿಮ್ಮ notes read, create, ಮತ್ತು search ಮಾಡಲು Triggerfish agent ಅನ್ನು ಒಂದು ಅಥವಾ
ಹೆಚ್ಚಿನ [Obsidian](https://obsidian.md/) vaults ಗೆ ಸಂಪರ್ಕಿಸಿ. Integration filesystem
ನಲ್ಲಿ vaults ಪ್ರವೇಶಿಸುತ್ತದೆ -- Obsidian app ಅಥವಾ plugin ಅಗತ್ಯವಿಲ್ಲ.

## ಏನು ಮಾಡುತ್ತದೆ

Obsidian integration agent ಗೆ ಈ tools ನೀಡುತ್ತದೆ:

| Tool              | ವಿವರಣೆ                              |
| ----------------- | ------------------------------------|
| `obsidian_read`   | Note ನ content ಮತ್ತು frontmatter ಓದಿ |
| `obsidian_write`  | Note ತಯಾರಿಸಿ ಅಥವಾ update ಮಾಡಿ       |
| `obsidian_list`   | Folder ನಲ್ಲಿ notes list ಮಾಡಿ         |
| `obsidian_search` | Note contents ಹುಡುಕಿ                 |
| `obsidian_daily`  | ಇಂದಿನ daily note ಓದಿ ಅಥವಾ ತಯಾರಿಸಿ   |
| `obsidian_links`  | Wikilinks resolve ಮತ್ತು backlinks ಹುಡುಕಿ |
| `obsidian_delete` | Note delete ಮಾಡಿ                     |

## Setup

### Step 1: Vault Connect ಮಾಡಿ

```bash
triggerfish connect obsidian
```

ಇದು vault path ಕೇಳಿ config write ಮಾಡುತ್ತದೆ. Manually configure ಸಹ ಮಾಡಬಹುದು.

### Step 2: triggerfish.yaml ನಲ್ಲಿ Configure ಮಾಡಿ

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

| Option                  | Type     | Required | ವಿವರಣೆ                                                        |
| ----------------------- | -------- | -------- | ------------------------------------------------------------- |
| `vaultPath`             | string   | ಹೌದು     | Obsidian vault root ಗೆ absolute path                          |
| `defaultClassification` | string   | ಇಲ್ಲ     | Notes ಗಾಗಿ default classification (default: `INTERNAL`)       |
| `excludeFolders`        | string[] | ಇಲ್ಲ     | Ignore ಮಾಡಬೇಕಾದ folders (default: `.obsidian`, `.trash`)      |
| `folderClassifications` | object   | ಇಲ್ಲ     | Folder paths ಅನ್ನು classification levels ಗೆ map ಮಾಡಿ         |

### Multiple Vaults

ವಿಭಿನ್ನ classification levels ಜೊತೆ multiple vaults connect ಮಾಡಬಹುದು:

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

Notes ತಮ್ಮ folder ನಿಂದ classification inherit ಮಾಡುತ್ತವೆ. ಅತ್ಯಂತ specific matching
folder win ಮಾಡುತ್ತದೆ:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

ಈ config ಜೊತೆ:

- `Private/todo.md` `CONFIDENTIAL`
- `Private/Health/records.md` `RESTRICTED`
- `Work/project.md` `INTERNAL`
- `notes.md` (vault root) `defaultClassification` ಬಳಸುತ್ತದೆ

Classification gating ಅನ್ವಯಿಸುತ್ತದೆ: agent ಪ್ರಸ್ತುತ session taint ಗೆ flow ಮಾಡಬಹುದಾದ
classification level ನ notes ಮಾತ್ರ read ಮಾಡಬಹುದು. `PUBLIC`-tainted session
`CONFIDENTIAL` notes ಪ್ರವೇಶಿಸಲಾಗದು.

## Security

### Path Confinement

ಎಲ್ಲ file operations vault root ಗೆ confined. Adapter symlinks resolve ಮಾಡಲು
ಮತ್ತು path traversal attacks ತಡೆಯಲು `Deno.realPath` ಬಳಸುತ್ತದೆ. `../../etc/passwd`
ಅಥವಾ ಇದೇ ರೀತಿಯ ಪ್ರಯತ್ನ filesystem touch ಮಾಡುವ ಮೊದಲೇ block ಮಾಡಲ್ಪಡುತ್ತದೆ.

### Vault Verification

Adapter path accept ಮಾಡುವ ಮೊದಲು vault root ನಲ್ಲಿ `.obsidian/` directory exist
ಆಗುತ್ತಿದೆಯೇ verify ಮಾಡುತ್ತದೆ. ನೀವು actual Obsidian vault ಗೆ point ಮಾಡುತ್ತಿದ್ದೀರಿ,
arbitrary directory ಗೆ ಅಲ್ಲ ಎಂದು ಖಾತರಿ ಮಾಡುತ್ತದೆ.

### Classification Enforcement

- Notes ತಮ್ಮ folder mapping ನಿಂದ classification ಒಯ್ಯುತ್ತವೆ
- `CONFIDENTIAL` note read ಮಾಡಿದರೆ session taint `CONFIDENTIAL` ಗೆ escalate ಆಗುತ್ತದೆ
- No-write-down rule lower-classified folders ಗೆ classified content write ಮಾಡದಂತೆ ತಡೆಯುತ್ತದೆ
- ಎಲ್ಲ note operations standard policy hooks ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತವೆ

## Wikilinks

Adapter Obsidian ನ `[[wikilink]]` syntax ಅರ್ಥ ಮಾಡಿಕೊಳ್ಳುತ್ತದೆ. `obsidian_links` tool
wikilinks ಅನ್ನು actual file paths ಗೆ resolve ಮಾಡುತ್ತದೆ ಮತ್ತು given note ಗೆ link
ಮಾಡುವ ಎಲ್ಲ notes (backlinks) ಕಂಡುಹಿಡಿಯುತ್ತದೆ.

## Daily Notes

`obsidian_daily` tool ನಿಮ್ಮ vault ನ daily note folder convention ಬಳಸಿ ಇಂದಿನ daily
note read ಅಥವಾ create ಮಾಡುತ್ತದೆ. Note exist ಮಾಡದಿದ್ದರೆ, default template ಜೊತೆ
ಒಂದು ತಯಾರಿಸುತ್ತದೆ.

## Frontmatter

YAML frontmatter ಜೊತೆ notes ಸ್ವಯಂಚಾಲಿತವಾಗಿ parse ಮಾಡಲ್ಪಡುತ್ತವೆ. Notes read
ಮಾಡುವಾಗ frontmatter fields metadata ಆಗಿ ಲಭ್ಯ. Notes write ಅಥವಾ update ಮಾಡುವಾಗ
adapter frontmatter preserve ಮಾಡುತ್ತದೆ.
