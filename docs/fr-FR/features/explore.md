# Exploration de code

L'outil `explore` donne a l'agent une comprehension rapide et structuree des bases de code
et des repertoires. Au lieu d'appeler manuellement `read_file`, `list_directory` et
`search_files` en sequence, l'agent appelle `explore` une seule fois et obtient un
rapport structure produit par des sous-agents paralleles.

## Outil

### `explore`

Explorer un repertoire ou une base de code pour comprendre la structure, les motifs et
les conventions. Lecture seule.

| Parametre | Type   | Requis | Description                                                       |
| --------- | ------ | ------ | ----------------------------------------------------------------- |
| `path`    | string | oui    | Repertoire ou fichier a explorer                                  |
| `focus`   | string | non    | Ce qu'il faut chercher (par ex. « motifs d'auth », « structure de tests ») |
| `depth`   | string | non    | Profondeur d'analyse : `shallow`, `standard` (defaut) ou `deep`  |

## Niveaux de profondeur

| Profondeur | Agents crees | Ce qui est analyse                                              |
| ---------- | ------------ | --------------------------------------------------------------- |
| `shallow`  | 2            | Arborescence + manifestes de dependances                        |
| `standard` | 3-4          | Arborescence + manifestes + motifs de code + focus (si specifie) |
| `deep`     | 5-6          | Tout ce qui precede + tracage du graphe d'imports + historique git |

## Fonctionnement

L'outil explore cree des sous-agents paralleles, chacun concentre sur une facette differente :

1. **Agent arborescence** -- Cartographie la structure du repertoire (3 niveaux de profondeur), identifie les fichiers
   cles par convention (`mod.ts`, `main.ts`, `deno.json`, `README.md`, etc.)
2. **Agent manifeste** -- Lit les fichiers de dependances (`deno.json`, `package.json`,
   `tsconfig.json`), liste les dependances, scripts et points d'entree
3. **Agent motifs** -- Echantillonne les fichiers source pour detecter les motifs de codage : structure des
   modules, gestion des erreurs, conventions de types, style d'import, nommage, tests
4. **Agent focus** -- Recherche des fichiers et motifs lies a la requete de focus
5. **Agent imports** (deep uniquement) -- Trace les graphes d'imports depuis les points d'entree,
   detecte les dependances circulaires
6. **Agent git** (deep uniquement) -- Analyse les commits recents, la branche courante,
   les modifications non commitees

Tous les agents s'executent en parallele. Les resultats sont assembles en un
`ExploreResult` structure :

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n\u251c\u2500\u2500 types/\n\u2502   \u251c\u2500\u2500 classification.ts\n\u2502   ...",
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

## Quand l'agent l'utilise

L'agent est instruit d'utiliser `explore` dans ces situations :

- Avant de modifier du code non familier
- Lorsqu'on lui demande « qu'est-ce que cela fait » ou « comment c'est structure »
- Au debut de toute tache non triviale impliquant du code existant
- Lorsqu'il doit trouver le bon fichier ou motif a suivre

Apres l'exploration, l'agent reference les motifs et conventions trouves lors de
l'ecriture de nouveau code, assurant la coherence avec la base de code existante.

## Exemples

```
# Apercu rapide d'un repertoire
explore({ path: "src/auth" })

# Recherche ciblee de motifs specifiques
explore({ path: "src/auth", focus: "how tokens are validated" })

# Analyse approfondie incluant l'historique git et les graphes d'imports
explore({ path: "src/core", depth: "deep" })

# Comprendre les conventions de test avant d'ecrire des tests
explore({ path: "tests/", focus: "test patterns and assertions" })
```
