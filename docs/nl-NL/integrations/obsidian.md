# Obsidian

Verbind uw Triggerfish-agent met een of meer [Obsidian](https://obsidian.md/)-kluizen zodat hij uw notities kan lezen, aanmaken en doorzoeken. De integratie heeft direct toegang tot kluizen via het bestandssysteem — de Obsidian-app of een plugin is niet vereist.

## Wat het doet

De Obsidian-integratie geeft uw agent deze tools:

| Tool              | Beschrijving                                 |
| ----------------- | -------------------------------------------- |
| `obsidian_read`   | De inhoud en frontmatter van een notitie lezen |
| `obsidian_write`  | Een notitie aanmaken of bijwerken            |
| `obsidian_list`   | Notities weergeven in een map                |
| `obsidian_search` | Notitie-inhoud doorzoeken                    |
| `obsidian_daily`  | De dagelijkse notitie van vandaag lezen of aanmaken |
| `obsidian_links`  | Wikilinks oplossen en backlinks vinden       |
| `obsidian_delete` | Een notitie verwijderen                      |

## Installatie

### Stap 1: Verbind uw kluis

```bash
triggerfish connect obsidian
```

Dit vraagt naar uw kluispad en schrijft de configuratie. U kunt het ook handmatig configureren.

### Stap 2: Configureer in triggerfish.yaml

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

| Optie                   | Type     | Vereist | Beschrijving                                            |
| ----------------------- | -------- | ------- | ------------------------------------------------------- |
| `vaultPath`             | string   | Ja      | Absoluut pad naar de root van de Obsidian-kluis         |
| `defaultClassification` | string   | Nee     | Standaardclassificatie voor notities (standaard: `INTERNAL`) |
| `excludeFolders`        | string[] | Nee     | Te negeren mappen (standaard: `.obsidian`, `.trash`)    |
| `folderClassifications` | object   | Nee     | Mappen koppelen aan classificatieniveaus                |

### Meerdere kluizen

U kunt meerdere kluizen verbinden met verschillende classificatieniveaus:

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

## Op mappen gebaseerde classificatie

Notities erven de classificatie van hun map. De meest specifieke overeenkomende map wint:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

Met deze configuratie:

- `Private/todo.md` is `CONFIDENTIAL`
- `Private/Health/records.md` is `RESTRICTED`
- `Work/project.md` is `INTERNAL`
- `notes.md` (kluisroot) gebruikt `defaultClassification`

Classificatiebeheersing is van toepassing: de agent kan alleen notities lezen waarvan het classificatieniveau stroomt naar de huidige sessietaint. Een `PUBLIC`-besmette sessie heeft geen toegang tot `CONFIDENTIAL`-notities.

## Beveiliging

### Padbegrenzing

Alle bestandsbewerkingen zijn beperkt tot de kluisroot. De adapter gebruikt `Deno.realPath` om symlinks op te lossen en padtraversal-aanvallen te voorkomen. Elke poging om `../../etc/passwd` of iets dergelijks te lezen wordt geblokkeerd voordat het bestandssysteem wordt aangeraakt.

### Kluisverificatie

De adapter verifieert dat er een `.obsidian/`-map bestaat aan de kluisroot voordat het pad wordt geaccepteerd. Dit zorgt ervoor dat u naar een echte Obsidian-kluis wijst, niet naar een willekeurige map.

### Classificatiehandhaving

- Notities dragen classificatie uit hun mappingconfiguratie
- Het lezen van een `CONFIDENTIAL`-notitie escaleert de sessietaint naar `CONFIDENTIAL`
- De no-write-down-regel voorkomt het schrijven van geclassificeerde inhoud naar lager-geclassificeerde mappen
- Alle notitiebewerkingen doorlopen de standaard beleidshooks

## Wikilinks

De adapter begrijpt de `[[wikilink]]`-syntaxis van Obsidian. De `obsidian_links`-tool lost wikilinks op naar werkelijke bestandspaden en vindt alle notities die teruglinken naar een bepaalde notitie (backlinks).

## Dagelijkse notities

De `obsidian_daily`-tool leest of maakt de dagelijkse notitie van vandaag met behulp van de dagelijkse notitiemapconfiguratie van uw kluis. Als de notitie niet bestaat, wordt er een aangemaakt met een standaardsjabloon.

## Frontmatter

Notities met YAML-frontmatter worden automatisch geparsed. Frontmatter-velden zijn beschikbaar als metadata bij het lezen van notities. De adapter bewaart frontmatter bij het schrijven of bijwerken van notities.
