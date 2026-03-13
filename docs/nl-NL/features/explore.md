# Codebase-verkenning

De `explore`-tool geeft de agent snel, gestructureerd begrip van codebases en mappen. In plaats van handmatig `read_file`, `list_directory` en `search_files` achtereenvolgens aan te roepen, roept de agent één keer `explore` aan en krijgt een gestructureerd rapport terug dat is geproduceerd door parallelle sub-agents.

## Tool

### `explore`

Een map of codebase verkennen om structuur, patronen en conventies te begrijpen. Alleen-lezen.

| Parameter | Type   | Vereist | Beschrijving                                                              |
| --------- | ------ | ------- | ------------------------------------------------------------------------- |
| `path`    | string | ja      | Map of bestand om te verkennen                                            |
| `focus`   | string | nee     | Waar naar te zoeken (bijv. "authenticatiepatronen", "teststructuur")      |
| `depth`   | string | nee     | Hoe grondig: `shallow`, `standard` (standaard) of `deep`                  |

## Diepteniveaus

| Diepte     | Gespawnde agents | Wat er wordt geanalyseerd                                               |
| ---------- | :--------------: | ----------------------------------------------------------------------- |
| `shallow`  | 2                | Mappenstructuur + afhankelijkheidsmanifesten                            |
| `standard` | 3-4              | Structuur + manifesten + codepatronen + focus (indien opgegeven)        |
| `deep`     | 5-6              | Alles hierboven + importgrafiek-tracering + git-geschiedenis            |

## Hoe het werkt

De verkenningstool spawnt parallelle sub-agents, elk gericht op een ander aspect:

1. **Structuuragent** — Brengt mappenstructuur in kaart (3 niveaus diep), identificeert sleutelbestanden op conventie (`mod.ts`, `main.ts`, `deno.json`, `README.md`, enz.)
2. **Manifestagent** — Leest afhankelijkheidsbestanden (`deno.json`, `package.json`, `tsconfig.json`), lijst van afhankelijkheden, scripts en ingangspunten
3. **Patroonagent** — Samplet bronbestanden om codeerpatronen te detecteren: modulestructuur, foutafhandeling, typeconventies, importstijl, naamgeving, testen
4. **Focusagent** — Zoekt naar bestanden en patronen gerelateerd aan de focusquery
5. **Importagent** (alleen deep) — Traceert importgrafieken vanuit ingangspunten, detecteert circulaire afhankelijkheden
6. **Git-agent** (alleen deep) — Analyseert recente commits, huidige branch, niet-vastgelegde wijzigingen

Alle agents draaien gelijktijdig. Resultaten worden samengevoegd in een gestructureerd `ExploreResult`:

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Classificatieniveaus" }
  ],
  "patterns": [
    { "name": "Result-patroon", "description": "Gebruikt Result<T,E> voor foutafhandeling", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Kernmodule met classificatietypes, beleidsengine en sessiebeheer."
}
```

## Wanneer de agent het gebruikt

De agent is geïnstrueerd om `explore` in deze situaties te gebruiken:

- Vóór het wijzigen van onbekende code
- Wanneer gevraagd "wat doet dit" of "hoe is dit gestructureerd"
- Aan het begin van elke niet-triviale taak die bestaande code omvat
- Wanneer het het juiste bestand of patroon moet vinden om te volgen

Na verkenning verwijst de agent naar de patronen en conventies die het heeft gevonden bij het schrijven van nieuwe code, wat consistentie met de bestaande codebase garandeert.

## Voorbeelden

```
# Snel overzicht van een map
explore({ path: "src/auth" })

# Gerichte zoektocht naar specifieke patronen
explore({ path: "src/auth", focus: "hoe tokens worden gevalideerd" })

# Diepgaande analyse inclusief git-geschiedenis en importgrafieken
explore({ path: "src/core", depth: "deep" })

# Testconventies begrijpen voordat tests worden geschreven
explore({ path: "tests/", focus: "testpatronen en assertions" })
```
