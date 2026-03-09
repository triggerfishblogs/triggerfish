# Obsidian

Connectez votre agent Triggerfish a un ou plusieurs coffres
[Obsidian](https://obsidian.md/) pour qu'il puisse lire, creer et rechercher vos
notes. L'integration accede aux coffres directement sur le systeme de fichiers --
aucune application Obsidian ni plugin n'est requis.

## Fonctionnalites

L'integration Obsidian donne a votre agent ces outils :

| Outil             | Description                                      |
| ----------------- | ------------------------------------------------ |
| `obsidian_read`   | Lire le contenu et le frontmatter d'une note     |
| `obsidian_write`  | Creer ou mettre a jour une note                  |
| `obsidian_list`   | Lister les notes dans un dossier                 |
| `obsidian_search` | Rechercher dans le contenu des notes             |
| `obsidian_daily`  | Lire ou creer la note quotidienne du jour        |
| `obsidian_links`  | Resoudre les wikilinks et trouver les backlinks  |
| `obsidian_delete` | Supprimer une note                               |

## Configuration

### Etape 1 : Connecter votre coffre

```bash
triggerfish connect obsidian
```

Cela vous demande le chemin de votre coffre et ecrit la configuration. Vous
pouvez aussi le configurer manuellement.

### Etape 2 : Configurer dans triggerfish.yaml

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

| Option                  | Type     | Requis | Description                                                      |
| ----------------------- | -------- | ------ | ---------------------------------------------------------------- |
| `vaultPath`             | string   | Oui    | Chemin absolu vers la racine du coffre Obsidian                  |
| `defaultClassification` | string   | Non    | Classification par defaut pour les notes (defaut : `INTERNAL`)   |
| `excludeFolders`        | string[] | Non    | Dossiers a ignorer (defaut : `.obsidian`, `.trash`)              |
| `folderClassifications` | object   | Non    | Mapper les chemins de dossiers aux niveaux de classification     |

### Coffres multiples

Vous pouvez connecter plusieurs coffres avec differents niveaux de
classification :

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

## Classification basee sur les dossiers

Les notes heritent de la classification de leur dossier. Le dossier correspondant
le plus specifique l'emporte :

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

Avec cette configuration :

- `Private/todo.md` est `CONFIDENTIAL`
- `Private/Health/records.md` est `RESTRICTED`
- `Work/project.md` est `INTERNAL`
- `notes.md` (racine du coffre) utilise `defaultClassification`

Le controle de classification s'applique : l'agent ne peut lire que les notes dont
le niveau de classification est compatible avec le taint actuel de la session.
Une session avec un taint `PUBLIC` ne peut pas acceder aux notes `CONFIDENTIAL`.

## Securite

### Confinement de chemin

Toutes les operations sur les fichiers sont confinees a la racine du coffre.
L'adaptateur utilise `Deno.realPath` pour resoudre les liens symboliques et
empecher les attaques par traversee de chemin. Toute tentative de lire
`../../etc/passwd` ou similaire est bloquee avant que le systeme de fichiers ne
soit touche.

### Verification du coffre

L'adaptateur verifie qu'un repertoire `.obsidian/` existe a la racine du coffre
avant d'accepter le chemin. Cela garantit que vous pointez vers un veritable
coffre Obsidian, pas un repertoire arbitraire.

### Application de la classification

- Les notes portent la classification de leur mappage de dossier
- Lire une note `CONFIDENTIAL` escalade le taint de session a `CONFIDENTIAL`
- La regle de non ecriture descendante empeche l'ecriture de contenu classifie
  dans des dossiers de classification inferieure
- Toutes les operations sur les notes passent par les hooks de politique standard

## Wikilinks

L'adaptateur comprend la syntaxe `[[wikilink]]` d'Obsidian. L'outil
`obsidian_links` resout les wikilinks en chemins de fichiers reels et trouve
toutes les notes qui pointent vers une note donnee (backlinks).

## Notes quotidiennes

L'outil `obsidian_daily` lit ou cree la note quotidienne du jour en utilisant la
convention de dossier de notes quotidiennes de votre coffre. Si la note n'existe
pas, il en cree une avec un modele par defaut.

## Frontmatter

Les notes avec un frontmatter YAML sont analysees automatiquement. Les champs du
frontmatter sont disponibles comme metadonnees lors de la lecture des notes.
L'adaptateur preserve le frontmatter lors de l'ecriture ou de la mise a jour
des notes.
