# Esplorazione del Codebase

Lo strumento `explore` fornisce all'agente una comprensione rapida e strutturata
di codebase e directory. Invece di chiamare manualmente `read_file`,
`list_directory` e `search_files` in sequenza, l'agente chiama `explore` una
volta e ottiene un report strutturato prodotto da sub-agenti paralleli.

## Strumento

### `explore`

Esplori una directory o un codebase per comprenderne la struttura, i pattern e le
convenzioni. Sola lettura.

| Parametro | Tipo   | Obbligatorio | Descrizione                                                        |
| --------- | ------ | ------------ | ------------------------------------------------------------------ |
| `path`    | string | sì           | Directory o file da esplorare                                      |
| `focus`   | string | no           | Cosa cercare (es. "auth patterns", "test structure")               |
| `depth`   | string | no           | Quanto approfondire: `shallow`, `standard` (default) o `deep`      |

## Livelli di Profondità

| Profondità | Agenti Generati | Cosa Viene Analizzato                                            |
| ---------- | --------------- | ---------------------------------------------------------------- |
| `shallow`  | 2               | Albero delle directory + manifesti delle dipendenze              |
| `standard` | 3-4             | Albero + manifesti + pattern di codice + focus (se specificato)  |
| `deep`     | 5-6             | Tutto quanto sopra + tracciamento grafo degli import + cronologia git |

## Come Funziona

Lo strumento explore genera sub-agenti paralleli, ciascuno focalizzato su un
aspetto diverso:

1. **Agente albero** -- Mappa la struttura delle directory (3 livelli di
   profondità), identifica i file chiave per convenzione (`mod.ts`, `main.ts`,
   `deno.json`, `README.md`, ecc.)
2. **Agente manifesto** -- Legge i file delle dipendenze (`deno.json`,
   `package.json`, `tsconfig.json`), elenca dipendenze, script e punti di
   ingresso
3. **Agente pattern** -- Campiona i file sorgente per rilevare pattern di
   codifica: struttura dei moduli, gestione errori, convenzioni sui tipi, stile
   degli import, naming, testing
4. **Agente focus** -- Cerca file e pattern relativi alla query di focus
5. **Agente import** (solo deep) -- Traccia i grafi degli import dai punti di
   ingresso, rileva dipendenze circolari
6. **Agente git** (solo deep) -- Analizza i commit recenti, il branch corrente,
   le modifiche non committate

Tutti gli agenti vengono eseguiti in parallelo. I risultati vengono assemblati in
un `ExploreResult` strutturato:

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Classification levels" }
  ],
  "patterns": [
    { "name": "Result pattern", "description": "Uses Result<T,E> for error handling", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Core module with classification types, policy engine, and session management."
}
```

## Quando l'Agente lo Utilizza

L'agente è istruito a usare `explore` in queste situazioni:

- Prima di modificare codice sconosciuto
- Quando viene chiesto "cosa fa questo" o "come è strutturato"
- All'inizio di qualsiasi attività non banale che coinvolge codice esistente
- Quando deve trovare il file giusto o il pattern da seguire

Dopo l'esplorazione, l'agente fa riferimento ai pattern e alle convenzioni
trovate quando scrive nuovo codice, garantendo coerenza con il codebase
esistente.

## Esempi

```
# Panoramica rapida di una directory
explore({ path: "src/auth" })

# Ricerca focalizzata su pattern specifici
explore({ path: "src/auth", focus: "how tokens are validated" })

# Analisi approfondita inclusa cronologia git e grafi degli import
explore({ path: "src/core", depth: "deep" })

# Comprendere le convenzioni di test prima di scrivere test
explore({ path: "tests/", focus: "test patterns and assertions" })
```
