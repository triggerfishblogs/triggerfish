# Kodbasutforskning

Verktyget `explore` ger agenten snabb, strukturerad förståelse av kodbasers och kataloger. Istället för att manuellt anropa `read_file`, `list_directory` och `search_files` i följd anropar agenten `explore` en gång och får tillbaka en strukturerad rapport producerad av parallella underagenter.

## Verktyg

### `explore`

Utforska en katalog eller kodbas för att förstå struktur, mönster och konventioner. Skrivskyddat.

| Parameter | Typ    | Obligatorisk | Beskrivning                                                           |
| --------- | ------ | ------------ | --------------------------------------------------------------------- |
| `path`    | string | Ja           | Katalog eller fil att utforska                                        |
| `focus`   | string | Nej          | Vad man ska leta efter (t.ex. "autentiseringsmönster", "teststruktur") |
| `depth`   | string | Nej          | Hur grundlig: `shallow`, `standard` (standard) eller `deep`           |

## Djupnivåer

| Djup       | Agenter skapade | Vad som analyseras                                                        |
| ---------- | --------------- | ------------------------------------------------------------------------- |
| `shallow`  | 2               | Katalogträd + beroendemanifest                                            |
| `standard` | 3-4             | Träd + manifest + kodmönster + fokus (om angivet)                         |
| `deep`     | 5-6             | Allt ovan + importgrafspårning + git-historik                             |

## Hur det fungerar

Utforskningsverktyget skapar parallella underagenter, var och en fokuserad på en annan aspekt:

1. **Trädagent** — Kartlägger katalogstruktur (3 nivåer djupt), identifierar nyckelfiler enligt konvention (`mod.ts`, `main.ts`, `deno.json`, `README.md`, etc.)
2. **Manifestagent** — Läser beroendefiler (`deno.json`, `package.json`, `tsconfig.json`), listar beroenden, skript och ingångspunkter
3. **Mönsteragent** — Samplar källfiler för att identifiera kodmönster: modulstruktur, felhantering, typkonventioner, importstil, namngivning, testning
4. **Fokusagent** — Söker efter filer och mönster relaterade till fokusförfrågan
5. **Importagent** (bara deep) — Spårar importgrafer från ingångspunkter, identifierar cirkulära beroenden
6. **Git-agent** (bara deep) — Analyserar nyliga commits, aktuell gren, ogenomförda ändringar

Alla agenter körs parallellt. Resultaten sätts ihop till ett strukturerat `ExploreResult`:

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Klassificeringsnivåer" }
  ],
  "patterns": [
    { "name": "Result-mönster", "description": "Använder Result<T,E> för felhantering", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Kärnmodul med klassificeringstyper, policymotor och sessionshantering."
}
```

## När agenten använder det

Agenten instrueras att använda `explore` i dessa situationer:

- Innan okänd kod ändras
- När du frågar "vad gör det här" eller "hur är det här strukturerat"
- I början av en icke-trivial uppgift som involverar befintlig kod
- När den behöver hitta rätt fil eller mönster att följa

Efter utforskning refererar agenten de mönster och konventioner den hittade när den skriver ny kod och säkerställer konsekvens med den befintliga kodbasen.

## Exempel

```
# Snabb översikt av en katalog
explore({ path: "src/auth" })

# Fokuserad sökning efter specifika mönster
explore({ path: "src/auth", focus: "hur tokens valideras" })

# Djup analys inklusive git-historik och importgrafer
explore({ path: "src/core", depth: "deep" })

# Förstå testkonventioner innan tester skrivs
explore({ path: "tests/", focus: "testmönster och påståenden" })
```
