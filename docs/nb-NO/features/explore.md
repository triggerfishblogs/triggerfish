# Kodebaseutforskning

`explore`-verktøyet gir agenten rask, strukturert forståelse av kodebaser og
kataloger. I stedet for å manuelt kalle `read_file`, `list_directory` og
`search_files` i rekkefølge, kaller agenten `explore` én gang og får tilbake
en strukturert rapport produsert av parallelle sub-agenter.

## Verktøy

### `explore`

Utforsk en katalog eller kodebase for å forstå struktur, mønstre og konvensjoner.
Skrivebeskyttet.

| Parameter | Type   | Påkrevd | Beskrivelse                                                               |
| --------- | ------ | ------- | ------------------------------------------------------------------------- |
| `path`    | string | Ja      | Katalog eller fil som skal utforskes                                      |
| `focus`   | string | Nei     | Hva man skal se etter (f.eks. «auth patterns», «test structure»)          |
| `depth`   | string | Nei     | Hvor grundig: `shallow`, `standard` (standard), eller `deep`              |

## Dybdenivåer

| Dybde      | Agenter spawnet | Hva analyseres                                              |
| ---------- | --------------- | ----------------------------------------------------------- |
| `shallow`  | 2               | Katalogtre + avhengighetsmanifester                         |
| `standard` | 3–4             | Tre + manifester + kodeingsmønstre + fokus (hvis angitt)    |
| `deep`     | 5–6             | Alt ovenfor + import-grafsporing + git-historikk            |

## Slik fungerer det

Explore-verktøyet spawner parallelle sub-agenter, hver fokusert på et
forskjellig aspekt:

1. **Tre-agent** — Kartlegger katalogstrukturen (3 nivåer dypt), identifiserer
   nøkkelfiler etter konvensjon (`mod.ts`, `main.ts`, `deno.json`, `README.md` osv.)
2. **Manifest-agent** — Leser avhengighetsfiler (`deno.json`, `package.json`,
   `tsconfig.json`), lister avhengigheter, skript og inngangspunkter
3. **Mønster-agent** — Tar stikkprøver av kildefiler for å oppdage kodningsmønstre:
   modulstruktur, feilhåndtering, typekonvensjoner, importstil, navngivning, testing
4. **Fokus-agent** — Søker etter filer og mønstre relatert til fokus-spørringen
5. **Import-agent** (bare deep) — Sporer import-grafer fra inngangspunkter,
   oppdager sirkulære avhengigheter
6. **Git-agent** (bare deep) — Analyserer nylige commits, gjeldende gren,
   ucommittede endringer

Alle agenter kjøres parallelt. Resultater settes sammen til et strukturert
`ExploreResult`:

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

## Når agenten bruker det

Agenten er instruert til å bruke `explore` i disse situasjonene:

- Før endring av ukjent kode
- Når man spør «hva gjør dette» eller «hvordan er dette strukturert»
- Ved starten av enhver ikke-triviell oppgave som involverer eksisterende kode
- Når den trenger å finne riktig fil eller mønster å følge

Etter utforskning refererer agenten til mønstrene og konvensjonene den fant
når den skriver ny kode, noe som sikrer konsistens med den eksisterende kodebasen.

## Eksempler

```
# Rask oversikt over en katalog
explore({ path: "src/auth" })

# Fokusert søk etter spesifikke mønstre
explore({ path: "src/auth", focus: "how tokens are validated" })

# Dyp analyse inkludert git-historikk og import-grafer
explore({ path: "src/core", depth: "deep" })

# Forstå testkonvensjoner før skriving av tester
explore({ path: "tests/", focus: "test patterns and assertions" })
```
