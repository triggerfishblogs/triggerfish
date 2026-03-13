# Obsidian

உங்கள் notes படிக்கவும், உருவாக்கவும், மற்றும் தேடவும் உங்கள் Triggerfish agent ஐ ஒன்று அல்லது அதிக [Obsidian](https://obsidian.md/) vaults உடன் connect செய்யவும். Integration filesystem இல் நேரடியாக vaults access செய்கிறது -- Obsidian app அல்லது plugin தேவையில்லை.

## என்ன செய்கிறது

Obsidian integration உங்கள் agent க்கு இந்த tools கொடுக்கிறது:

| Tool              | விளக்கம்                                        |
| ----------------- | ------------------------------------------------- |
| `obsidian_read`   | ஒரு note இன் content மற்றும் frontmatter படிக்கவும் |
| `obsidian_write`  | ஒரு note உருவாக்கவும் அல்லது update செய்யவும்  |
| `obsidian_list`   | ஒரு folder இல் notes பட்டியலிடவும்              |
| `obsidian_search` | Note contents தேடவும்                            |
| `obsidian_daily`  | இன்றைய daily note படிக்கவும் அல்லது உருவாக்கவும் |
| `obsidian_links`  | Wikilinks resolve செய்யவும் மற்றும் backlinks கண்டுபிடிக்கவும் |
| `obsidian_delete` | ஒரு note delete செய்யவும்                       |

## Setup

### படி 1: Vault Connect செய்யவும்

```bash
triggerfish connect obsidian
```

இது vault path க்கு prompt செய்து config எழுதுகிறது. Manually கட்டமைக்கவும் செய்யலாம்.

### படி 2: triggerfish.yaml இல் கட்டமைக்கவும்

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

| Option                  | Type     | Required | விளக்கம்                                                        |
| ----------------------- | -------- | -------- | ----------------------------------------------------------------- |
| `vaultPath`             | string   | ஆம்      | Obsidian vault root க்கான Absolute path                          |
| `defaultClassification` | string   | இல்லை   | Notes க்கான Default classification (default: `INTERNAL`)        |
| `excludeFolders`        | string[] | இல்லை   | Ignore செய்ய Folders (default: `.obsidian`, `.trash`)           |
| `folderClassifications` | object   | இல்லை   | Folder paths ஐ classification levels க்கு map செய்யவும்         |

### Multiple Vaults

வேவ்வேறு classification levels உடன் multiple vaults connect செய்யலாம்:

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

Notes தங்கள் folder இலிருந்து classification inherit செய்கின்றன. Most specific matching folder wins:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

இந்த config உடன்:

- `Private/todo.md` `CONFIDENTIAL`
- `Private/Health/records.md` `RESTRICTED`
- `Work/project.md` `INTERNAL`
- `notes.md` (vault root) `defaultClassification` பயன்படுத்துகிறது

Classification gating பொருந்துகிறது: agent current session taint க்கு flow ஆகக்கூடிய classification level உடைய notes மட்டுமே படிக்க முடியும். `PUBLIC`-tainted session `CONFIDENTIAL` notes access செய்ய முடியாது.

## Security

### Path Confinement

அனைத்து file operations உம் vault root க்கு confined. Adapter symlinks resolve செய்ய மற்றும் path traversal attacks தடுக்க `Deno.realPath` பயன்படுத்துகிறது. `../../etc/passwd` அல்லது similar read செய்ய எந்த attempt உம் filesystem touch செய்வதற்கு முன்பு blocked.

### Vault Verification

Adapter path accept செய்வதற்கு முன்பு vault root இல் `.obsidian/` directory exist என்று verify செய்கிறது. நீங்கள் arbitrary directory அல்ல, actual Obsidian vault ஐ point செய்கிறீர்கள் என்று இது உறுதிப்படுத்துகிறது.

### Classification Enforcement

- Notes தங்கள் folder mapping இலிருந்து classification carry செய்கின்றன
- `CONFIDENTIAL` note படிப்பது session taint ஐ `CONFIDENTIAL` க்கு escalate செய்கிறது
- No-write-down விதி classified content ஐ lower-classified folders க்கு write செய்வதை தடுக்கிறது
- அனைத்து note operations உம் standard policy hooks மூலம் செல்கின்றன

## Wikilinks

Adapter Obsidian இன் `[[wikilink]]` syntax புரிந்துகொள்கிறது. `obsidian_links` tool wikilinks ஐ actual file paths க்கு resolve செய்கிறது மற்றும் given note க்கு link back செய்யும் அனைத்து notes (backlinks) கண்டுபிடிக்கிறது.

## Daily Notes

`obsidian_daily` tool உங்கள் vault இன் daily note folder convention பயன்படுத்தி இன்றைய daily note படிக்கிறது அல்லது உருவாக்குகிறது. Note exist இல்லையென்றால், default template உடன் ஒன்று உருவாக்குகிறது.

## Frontmatter

YAML frontmatter உடன் Notes தானாக parsed ஆகின்றன. Frontmatter fields notes படிக்கும்போது metadata ஆக available. Notes write அல்லது update செய்யும்போது adapter frontmatter preserve செய்கிறது.
