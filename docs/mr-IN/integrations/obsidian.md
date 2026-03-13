# Obsidian

तुमच्या Triggerfish एजंटला एक किंवा अधिक [Obsidian](https://obsidian.md/)
vaults शी connect करा जेणेकरून ते तुमच्या notes वाचू शकेल, create करू शकेल,
आणि search करू शकेल. Integration filesystem वर थेट vaults access करते -- Obsidian
app किंवा plugin आवश्यक नाही.

## हे काय करते

Obsidian integration तुमच्या एजंटला हे tools देते:

| Tool              | वर्णन                                          |
| ----------------- | ---------------------------------------------- |
| `obsidian_read`   | Note चा content आणि frontmatter वाचा           |
| `obsidian_write`  | Note create किंवा update करा                   |
| `obsidian_list`   | Folder मधील notes list करा                     |
| `obsidian_search` | Note contents search करा                       |
| `obsidian_daily`  | आजचा daily note वाचा किंवा create करा          |
| `obsidian_links`  | Wikilinks resolve करा आणि backlinks शोधा       |
| `obsidian_delete` | Note delete करा                                |

## सेटअप

### पायरी 1: Vault Connect करा

```bash
triggerfish connect obsidian
```

Vault path साठी prompt करतो आणि config लिहितो. तुम्ही manually देखील configure
करू शकता.

### पायरी 2: triggerfish.yaml मध्ये Configure करा

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

| Option                  | Type     | Required | वर्णन                                                        |
| ----------------------- | -------- | -------- | ------------------------------------------------------------ |
| `vaultPath`             | string   | हो       | Obsidian vault root चा absolute path                         |
| `defaultClassification` | string   | नाही     | Notes साठी default classification (default: `INTERNAL`)     |
| `excludeFolders`        | string[] | नाही     | Ignore करायचे Folders (default: `.obsidian`, `.trash`)       |
| `folderClassifications` | object   | नाही     | Folder paths ला classification levels ला map करा             |

### Multiple Vaults

तुम्ही वेगवेगळ्या classification levels सह multiple vaults connect करू शकता:

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

Notes त्यांच्या folder कडून classification inherit करतात. सर्वात specific
matching folder जिंकतो:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

या config सह:

- `Private/todo.md` `CONFIDENTIAL` आहे
- `Private/Health/records.md` `RESTRICTED` आहे
- `Work/project.md` `INTERNAL` आहे
- `notes.md` (vault root) `defaultClassification` वापरतो

Classification gating लागू होते: एजंट फक्त त्या notes वाचू शकतो ज्यांची
classification level current session taint ला flow करू शकते. `PUBLIC`-tainted
session `CONFIDENTIAL` notes access करू शकत नाही.

## Security

### Path Confinement

सर्व file operations vault root ला confined आहेत. Adapter symlinks resolve
करण्यासाठी `Deno.realPath` वापरतो आणि path traversal attacks रोखतो. `../../etc/passwd`
किंवा similar वाचण्याचा कोणताही attempt filesystem touch होण्यापूर्वी blocked आहे.

### Vault Verification

Path accept करण्यापूर्वी Adapter vault root वर `.obsidian/` directory exist
आहे का verify करतो. हे तुम्ही actual Obsidian vault ला point करत आहात याची,
arbitrary directory नाही याची खात्री करते.

### Classification Enforcement

- Notes त्यांच्या folder mapping मधून classification वाहतात
- `CONFIDENTIAL` note वाचणे session taint `CONFIDENTIAL` ला escalate करते
- No-write-down rule classified content lower-classified folders ला लिहिण्यापासून
  रोखते
- सर्व note operations standard policy hooks मधून जातात

## Wikilinks

Adapter Obsidian च्या `[[wikilink]]` syntax समजतो. `obsidian_links` tool
wikilinks actual file paths ला resolve करतो आणि दिलेल्या note ला link back
करणाऱ्या सर्व notes शोधतो (backlinks).

## Daily Notes

`obsidian_daily` tool तुमच्या vault च्या daily note folder convention वापरून
आजचे daily note वाचतो किंवा create करतो. Note exist नसल्यास, default template
सह एक create करतो.

## Frontmatter

YAML frontmatter असलेले Notes आपोआप parsed आहेत. Notes वाचताना Frontmatter
fields metadata म्हणून available आहेत. Notes लिहिताना किंवा update करताना
Adapter frontmatter preserve करतो.
