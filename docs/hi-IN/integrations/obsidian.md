# Obsidian

अपने Triggerfish agent को एक या अधिक [Obsidian](https://obsidian.md/) vaults से
कनेक्ट करें ताकि यह आपके notes पढ़, बना, और खोज सके। Integration filesystem पर
सीधे vaults तक पहुँचता है -- कोई Obsidian app या plugin आवश्यक नहीं।

## यह क्या करता है

Obsidian integration आपके agent को ये tools देता है:

| Tool              | विवरण                                    |
| ----------------- | ---------------------------------------- |
| `obsidian_read`   | Note की सामग्री और frontmatter पढ़ें        |
| `obsidian_write`  | Note बनाएँ या अपडेट करें                   |
| `obsidian_list`   | Folder में notes सूचीबद्ध करें              |
| `obsidian_search` | Note सामग्री में खोजें                      |
| `obsidian_daily`  | आज का daily note पढ़ें या बनाएँ             |
| `obsidian_links`  | Wikilinks resolve करें और backlinks खोजें   |
| `obsidian_delete` | Note हटाएँ                                |

## सेटअप

### चरण 1: अपना Vault कनेक्ट करें

```bash
triggerfish connect obsidian
```

यह आपके vault path के लिए prompt करता है और config लिखता है। आप मैन्युअल रूप
से भी कॉन्फ़िगर कर सकते हैं।

### चरण 2: triggerfish.yaml में कॉन्फ़िगर करें

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

| विकल्प                  | Type     | आवश्यक | विवरण                                                  |
| ----------------------- | -------- | ------ | ------------------------------------------------------ |
| `vaultPath`             | string   | हाँ    | Obsidian vault root का absolute path                    |
| `defaultClassification` | string   | नहीं   | Notes के लिए डिफ़ॉल्ट classification (डिफ़ॉल्ट: `INTERNAL`) |
| `excludeFolders`        | string[] | नहीं   | अनदेखा करने के लिए folders (डिफ़ॉल्ट: `.obsidian`, `.trash`) |
| `folderClassifications` | object   | नहीं   | Folder paths को classification levels से map करें          |

### कई Vaults

आप अलग-अलग classification levels के साथ कई vaults कनेक्ट कर सकते हैं:

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

Notes अपने folder से classification inherit करते हैं। सबसे विशिष्ट मेल खाने वाला
folder जीतता है:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

इस config के साथ:

- `Private/todo.md` `CONFIDENTIAL` है
- `Private/Health/records.md` `RESTRICTED` है
- `Work/project.md` `INTERNAL` है
- `notes.md` (vault root) `defaultClassification` उपयोग करता है

Classification gating लागू होती है: agent केवल उन notes को पढ़ सकता है जिनका
classification स्तर वर्तमान session taint तक प्रवाहित होता है। `PUBLIC`-tainted
session `CONFIDENTIAL` notes तक नहीं पहुँच सकता।

## सुरक्षा

### Path Confinement

सभी file operations vault root तक सीमित हैं। Adapter symlinks resolve करने और
path traversal हमलों को रोकने के लिए `Deno.realPath` उपयोग करता है। `../../etc/passwd`
या similar पढ़ने का कोई भी प्रयास filesystem को छूने से पहले अवरुद्ध किया जाता है।

### Vault Verification

Adapter path स्वीकार करने से पहले सत्यापित करता है कि vault root पर `.obsidian/`
directory मौजूद है। यह सुनिश्चित करता है कि आप वास्तविक Obsidian vault की ओर
point कर रहे हैं, मनमानी directory की ओर नहीं।

### Classification प्रवर्तन

- Notes अपने folder mapping से classification रखते हैं
- `CONFIDENTIAL` note पढ़ने से session taint `CONFIDENTIAL` तक बढ़ता है
- No-write-down नियम classified सामग्री को निम्न-classified folders में लिखने से
  रोकता है
- सभी note operations मानक policy hooks से गुज़रते हैं

## Wikilinks

Adapter Obsidian के `[[wikilink]]` syntax को समझता है। `obsidian_links` tool
wikilinks को वास्तविक file paths में resolve करता है और किसी दिए गए note की ओर
वापस link करने वाले सभी notes (backlinks) खोजता है।

## Daily Notes

`obsidian_daily` tool आपके vault की daily note folder परंपरा का उपयोग करके आज
का daily note पढ़ता या बनाता है। यदि note मौजूद नहीं है, यह एक डिफ़ॉल्ट template
के साथ बनाता है।

## Frontmatter

YAML frontmatter वाले notes स्वचालित रूप से parse होते हैं। Notes पढ़ते समय
frontmatter fields metadata के रूप में उपलब्ध हैं। Adapter notes लिखते या अपडेट
करते समय frontmatter संरक्षित करता है।
