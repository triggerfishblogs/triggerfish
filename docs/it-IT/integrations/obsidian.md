# Obsidian

Connettere l'agent Triggerfish a uno o più vault
[Obsidian](https://obsidian.md/) per poter leggere, creare e cercare note.
L'integrazione accede ai vault direttamente sul filesystem -- non è richiesta
l'app Obsidian né alcun plugin.

## Cosa Fa

L'integrazione Obsidian fornisce all'agent questi tool:

| Tool              | Descrizione                                   |
| ----------------- | --------------------------------------------- |
| `obsidian_read`   | Leggere il contenuto e il frontmatter di una nota |
| `obsidian_write`  | Creare o aggiornare una nota                  |
| `obsidian_list`   | Elencare le note in una cartella              |
| `obsidian_search` | Cercare nei contenuti delle note              |
| `obsidian_daily`  | Leggere o creare la nota giornaliera di oggi  |
| `obsidian_links`  | Risolvere wikilink e trovare backlink         |
| `obsidian_delete` | Eliminare una nota                            |

## Configurazione

### Passo 1: Connettere il Vault

```bash
triggerfish connect obsidian
```

Questo richiede il percorso del vault e scrive la configurazione. È possibile
anche configurarlo manualmente.

### Passo 2: Configurare in triggerfish.yaml

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

| Opzione                 | Tipo     | Obbligatorio | Descrizione                                             |
| ----------------------- | -------- | ------------ | ------------------------------------------------------- |
| `vaultPath`             | string   | Sì           | Percorso assoluto alla radice del vault Obsidian        |
| `defaultClassification` | string   | No           | Classificazione predefinita per le note (predefinito: `INTERNAL`) |
| `excludeFolders`        | string[] | No           | Cartelle da ignorare (predefinito: `.obsidian`, `.trash`) |
| `folderClassifications` | object   | No           | Mappare percorsi cartella a livelli di classificazione  |

### Vault Multipli

È possibile connettere vault multipli con livelli di classificazione diversi:

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

## Classificazione Basata sulle Cartelle

Le note ereditano la classificazione dalla loro cartella. La cartella
corrispondente più specifica vince:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

Con questa configurazione:

- `Private/todo.md` è `CONFIDENTIAL`
- `Private/Health/records.md` è `RESTRICTED`
- `Work/project.md` è `INTERNAL`
- `notes.md` (radice del vault) usa `defaultClassification`

Il gating della classificazione si applica: l'agent può leggere solo le note il
cui livello di classificazione fluisce verso il taint della sessione corrente.
Una sessione con taint `PUBLIC` non può accedere a note `CONFIDENTIAL`.

## Sicurezza

### Confinamento del Percorso

Tutte le operazioni sui file sono confinate alla radice del vault. L'adattatore
usa `Deno.realPath` per risolvere i symlink e prevenire attacchi di path
traversal. Qualsiasi tentativo di leggere `../../etc/passwd` o simile viene
bloccato prima che il filesystem venga toccato.

### Verifica del Vault

L'adattatore verifica che una directory `.obsidian/` esista alla radice del vault
prima di accettare il percorso. Questo garantisce che si stia puntando a un
vault Obsidian reale, non a una directory arbitraria.

### Applicazione della Classificazione

- Le note portano la classificazione dalla loro mappatura di cartella
- Leggere una nota `CONFIDENTIAL` aumenta il taint della sessione a
  `CONFIDENTIAL`
- La regola no write-down impedisce di scrivere contenuto classificato in
  cartelle a classificazione inferiore
- Tutte le operazioni sulle note passano attraverso gli hook di policy standard

## Wikilink

L'adattatore comprende la sintassi `[[wikilink]]` di Obsidian. Il tool
`obsidian_links` risolve i wikilink in percorsi file reali e trova tutte le note
che linkano a una determinata nota (backlink).

## Note Giornaliere

Il tool `obsidian_daily` legge o crea la nota giornaliera di oggi usando la
convenzione della cartella delle note giornaliere del vault. Se la nota non
esiste, ne crea una con un template predefinito.

## Frontmatter

Le note con frontmatter YAML vengono analizzate automaticamente. I campi del
frontmatter sono disponibili come metadati durante la lettura delle note.
L'adattatore preserva il frontmatter durante la scrittura o l'aggiornamento
delle note.
