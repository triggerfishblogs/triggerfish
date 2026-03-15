# Obsidian

اپنے Triggerfish ایجنٹ کو ایک یا زیادہ [Obsidian](https://obsidian.md/) vaults سے
جوڑیں تاکہ یہ آپ کے notes پڑھ، بنا، اور تلاش کر سکے۔ یہ integration vaults کو
directly filesystem پر access کرتا ہے — کوئی Obsidian app یا plugin ضروری نہیں۔

## یہ کیا کرتا ہے

Obsidian integration آپ کے ایجنٹ کو یہ tools دیتا ہے:

| Tool              | تفصیل                                        |
| ----------------- | --------------------------------------------- |
| `obsidian_read`   | Note کا content اور frontmatter پڑھیں         |
| `obsidian_write`  | Note بنائیں یا اپ ڈیٹ کریں                   |
| `obsidian_list`   | کسی folder میں notes list کریں                |
| `obsidian_search` | Note contents تلاش کریں                       |
| `obsidian_daily`  | آج کی daily note پڑھیں یا بنائیں             |
| `obsidian_links`  | Wikilinks resolve کریں اور backlinks تلاش کریں |
| `obsidian_delete` | Note delete کریں                              |

## Setup

### قدم 1: اپنا Vault Connect کریں

```bash
triggerfish connect obsidian
```

یہ آپ کے vault path کے لیے پوچھتا ہے اور config لکھتا ہے۔ آپ اسے manually بھی
configure کر سکتے ہیں۔

### قدم 2: triggerfish.yaml میں Configure کریں

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

| Option                  | Type     | ضروری | تفصیل                                                         |
| ----------------------- | -------- | :---: | -------------------------------------------------------------- |
| `vaultPath`             | string   | ہاں   | Obsidian vault root کا absolute path                          |
| `defaultClassification` | string   | نہیں  | Notes کا default classification (ڈیفالٹ: `INTERNAL`)          |
| `excludeFolders`        | string[] | نہیں  | نظرانداز کرنے والے folders (ڈیفالٹ: `.obsidian`، `.trash`)   |
| `folderClassifications` | object   | نہیں  | Folder paths کو classification levels سے map کریں             |

### Multiple Vaults

آپ مختلف classification levels کے ساتھ multiple vaults connect کر سکتے ہیں:

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

Notes اپنے folder سے classification inherit کرتے ہیں۔ سب سے مخصوص matching folder
جیتتا ہے:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

اس config کے ساتھ:

- `Private/todo.md` کی classification `CONFIDENTIAL` ہے
- `Private/Health/records.md` کی classification `RESTRICTED` ہے
- `Work/project.md` کی classification `INTERNAL` ہے
- `notes.md` (vault root) `defaultClassification` استعمال کرتا ہے

Classification gating لاگو ہوتی ہے: ایجنٹ صرف وہی notes پڑھ سکتا ہے جن کا
classification level موجودہ session taint تک flow کر سکے۔ `PUBLIC`-tainted session
`CONFIDENTIAL` notes access نہیں کر سکتی۔

## Security

### Path Confinement

تمام file operations vault root تک محدود ہیں۔ Adapter symlinks resolve کرنے اور
path traversal attacks روکنے کے لیے `Deno.realPath` استعمال کرتا ہے۔ `../../etc/passwd`
یا اس جیسی کوئی بھی کوشش filesystem کو touch ہونے سے پہلے block ہو جاتی ہے۔

### Vault Verification

Adapter path accept کرنے سے پہلے verify کرتا ہے کہ vault root میں `.obsidian/`
directory موجود ہے۔ یہ یقینی بناتا ہے کہ آپ کسی actual Obsidian vault کی طرف point
کر رہے ہیں، نہ کہ کسی arbitrary directory کی طرف۔

### Classification Enforcement

- Notes اپنے folder mapping سے classification carry کرتے ہیں
- `CONFIDENTIAL` note پڑھنے سے session taint `CONFIDENTIAL` تک escalate ہو جاتا ہے
- No-write-down rule classified content کو lower-classified folders میں لکھنے سے
  روکتا ہے
- تمام note operations standard policy hooks سے گزرتے ہیں

## Wikilinks

Adapter Obsidian کا `[[wikilink]]` syntax سمجھتا ہے۔ `obsidian_links` tool
wikilinks کو actual file paths پر resolve کرتا ہے اور کسی note کو link back کرنے
والے تمام notes (backlinks) تلاش کرتا ہے۔

## Daily Notes

`obsidian_daily` tool آپ کے vault کے daily note folder convention کا استعمال
کرتے ہوئے آج کی daily note پڑھتا یا بناتا ہے۔ اگر note موجود نہ ہو، تو یہ default
template کے ساتھ ایک بناتا ہے۔

## Frontmatter

YAML frontmatter والے notes automatically parse ہوتے ہیں۔ Notes پڑھتے وقت
frontmatter fields metadata کے طور پر دستیاب ہوتی ہیں۔ Adapter notes لکھتے یا
اپ ڈیٹ کرتے وقت frontmatter preserve کرتا ہے۔
