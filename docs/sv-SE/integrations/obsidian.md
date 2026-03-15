# Obsidian

Anslut din Triggerfish-agent till ett eller flera [Obsidian](https://obsidian.md/)-valv så att den kan läsa, skapa och söka i dina anteckningar. Integrationen kommer åt valv direkt i filsystemet — ingen Obsidian-app eller plugin krävs.

## Vad den gör

Obsidian-integrationen ger din agent dessa verktyg:

| Verktyg           | Beskrivning                                 |
| ----------------- | ------------------------------------------- |
| `obsidian_read`   | Läs en antecknings innehåll och frontmatter |
| `obsidian_write`  | Skapa eller uppdatera en anteckning         |
| `obsidian_list`   | Lista anteckningar i en mapp                |
| `obsidian_search` | Sök anteckningsinnehåll                     |
| `obsidian_daily`  | Läs eller skapa dagens dagliga anteckning   |
| `obsidian_links`  | Lös upp wikilinks och hitta bakåtlänkar     |
| `obsidian_delete` | Ta bort en anteckning                       |

## Installation

### Steg 1: Anslut ditt valv

```bash
triggerfish connect obsidian
```

Det frågar efter din valvsökväg och skriver konfigurationen. Du kan också konfigurera det manuellt.

### Steg 2: Konfigurera i triggerfish.yaml

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

| Alternativ              | Typ      | Obligatorisk | Beskrivning                                                         |
| ----------------------- | -------- | :----------: | ------------------------------------------------------------------- |
| `vaultPath`             | string   |     Ja       | Absolut sökväg till Obsidian-valvroten                              |
| `defaultClassification` | string   |     Nej      | Standardklassificering för anteckningar (standard: `INTERNAL`)     |
| `excludeFolders`        | string[] |     Nej      | Mappar att ignorera (standard: `.obsidian`, `.trash`)               |
| `folderClassifications` | object   |     Nej      | Mappa mappsökvägar till klassificeringsnivåer                       |

### Flera valv

Du kan ansluta flera valv med olika klassificeringsnivåer:

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

## Mappbaserad klassificering

Anteckningar ärver klassificering från sin mapp. Den mest specifika matchande mappen vinner:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

Med den här konfigurationen:

- `Private/todo.md` är `CONFIDENTIAL`
- `Private/Health/records.md` är `RESTRICTED`
- `Work/project.md` är `INTERNAL`
- `notes.md` (valvrot) använder `defaultClassification`

Klassificeringsgrindning gäller: agenten kan bara läsa anteckningar vars klassificeringsnivå kan flöda till den aktuella sessions-tainten. En `PUBLIC`-märkt session kan inte komma åt `CONFIDENTIAL`-anteckningar.

## Säkerhet

### Sökvägsbegränsning

Alla filoperationer är begränsade till valvroten. Adaptern använder `Deno.realPath` för att lösa upp symboliska länkar och förhindra sökvägstraverseringsattacker. Alla försök att läsa `../../etc/passwd` eller liknande blockeras innan filsystemet berörs.

### Valvverifiering

Adaptern verifierar att en `.obsidian/`-katalog finns vid valvroten innan sökvägen accepteras. Det säkerställer att du pekar på ett faktiskt Obsidian-valv, inte en godtycklig katalog.

### Klassificeringstillämpning

- Anteckningar bär klassificering från sin mappmappning
- Att läsa en `CONFIDENTIAL`-anteckning eskalerar sessions-taint till `CONFIDENTIAL`
- Nedskrivningsregeln förhindrar att klassificerat innehåll skrivs till lägre klassificerade mappar
- Alla anteckningsoperationer passerar genom standardpolicykrokarna

## Wikilinks

Adaptern förstår Obsidians `[[wikilink]]`-syntax. Verktyget `obsidian_links` löser upp wikilinks till faktiska filsökvägar och hittar alla anteckningar som länkar tillbaka till en given anteckning (bakåtlänkar).

## Dagliga anteckningar

Verktyget `obsidian_daily` läser eller skapar dagens dagliga anteckning med hjälp av ditt valvs konvention för dagliga anteckningsmapar. Om anteckningen inte finns skapas en med en standardmall.

## Frontmatter

Anteckningar med YAML-frontmatter tolkas automatiskt. Frontmatterfält är tillgängliga som metadata när anteckningar läses. Adaptern bevarar frontmatter vid skrivning eller uppdatering av anteckningar.
