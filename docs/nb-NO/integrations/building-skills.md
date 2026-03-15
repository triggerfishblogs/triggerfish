# Bygge ferdigheter

Denne veiledningen går gjennom å lage en Triggerfish-ferdighet fra bunnen av — fra å skrive `SKILL.md`-filen til å teste den og få den godkjent.

## Hva du vil bygge

En ferdighet er en mappe som inneholder en `SKILL.md`-fil som lærer agenten hvordan den skal gjøre noe. Innen slutten av denne veiledningen vil du ha en fungerende ferdighet som agenten kan oppdage og bruke.

## Ferdighetens anatomi

Alle ferdigheter er en mappe med en `SKILL.md` ved roten:

```
min-ferdighet/
  SKILL.md           # Påkrevd: frontmatter + instruksjoner
  template.md        # Valgfritt: maler som ferdigheten refererer
  helper.ts          # Valgfritt: støttekode
```

`SKILL.md`-filen har to deler:

1. **YAML-frontmatter** (mellom `---`-avgrensere) — metadata om ferdigheten
2. **Markdown-kropp** — instruksjonene agenten leser

## Trinn 1: Skriv frontmatteren

Frontmatteren deklarerer hva ferdigheten gjør, hva den trenger og hvilke sikkerhetsbegrensninger som gjelder.

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, and flag PRs needing review.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---
```

### Nødvendige felter

| Felt          | Beskrivelse                                                      | Eksempel         |
| ------------- | ---------------------------------------------------------------- | ---------------- |
| `name`        | Unik identifikator. Små bokstaver, bindestreker for mellomrom.   | `github-triage`  |
| `description` | Hva ferdigheten gjør og når den skal brukes. 1-3 setninger.      | Se ovenfor       |

### Valgfrie felter

| Felt                     | Beskrivelse                              | Standard |
| ------------------------ | ---------------------------------------- | -------- |
| `classification_ceiling` | Maksimalt datasensitivitetsnivå          | `PUBLIC` |
| `requires_tools`         | Verktøy ferdigheten trenger tilgang til  | `[]`     |
| `network_domains`        | Eksterne domener ferdigheten aksesserer  | `[]`     |

### Velge et klassifiseringstak

Klassifiseringstake er den maksimale datasensitiviteten ferdigheten din vil håndtere. Velg det laveste nivået som fungerer:

| Nivå           | Når det brukes                            | Eksempler                                                  |
| -------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `PUBLIC`       | Bruker bare offentlig tilgjengelige data  | Nettsøk, offentlig API-dokumentasjon, vær                  |
| `INTERNAL`     | Arbeider med interne prosjektdata         | Kodeanalyse, konfigurasjonsgjennomgang, interne dokumenter |
| `CONFIDENTIAL` | Håndterer personlige eller private data   | E-postsammendrag, GitHub-varsler, CRM-spørringer           |
| `RESTRICTED`   | Aksesserer svært sensitive data           | Nøkkelbehandling, sikkerhetsrevisjoner, samsvar            |

::: warning Hvis ferdighetens tak overstiger brukerens konfigurerte tak, vil ferdighetsforfatters-API-en avvise det. Bruk alltid det laveste nødvendige nivået. :::

## Trinn 2: Skriv instruksjonene

Markdown-kroppen er det agenten leser for å lære å utføre ferdigheten. Gjør det handlingsrettet og spesifikt.

### Strukturmal

```markdown
# Ferdighetsnavn

Enlinjesformålssetning.

## Når du skal bruke

- Betingelse 1 (bruker spør om X)
- Betingelse 2 (utløst av cron)
- Betingelse 3 (relatert nøkkelord oppdaget)

## Trinn

1. Første handling med spesifikke detaljer
2. Andre handling med spesifikke detaljer
3. Behandle og formatere resultatene
4. Lever til den konfigurerte kanalen

## Utdataformat

Beskriv hvordan resultater skal formateres.

## Vanlige feil

- Ikke gjør X fordi Y
- Sjekk alltid Z før du fortsetter
```

### Beste praksis

- **Start med formål**: En setning som forklarer hva ferdigheten gjør
- **Inkluder «Når du skal bruke»**: Hjelper agenten med å bestemme når ferdigheten skal aktiveres
- **Vær spesifikk**: «Hent de siste 24 timers uleste e-poster» er bedre enn «Hent e-poster»
- **Bruk kodeeksempler**: Vis nøyaktige API-kall, dataformater, kommandomønstre
- **Legg til tabeller**: Hurtigreferanse for alternativer, endepunkter, parametere
- **Inkluder feilhåndtering**: Hva du gjør når et API-kall mislykkes eller data mangler
- **Avslutt med «Vanlige feil»**: Forhindrer agenten fra å gjenta kjente problemer

## Trinn 3: Test oppdagelse

Verifiser at ferdigheten kan oppdages av ferdighetslasten. Hvis du plasserte den i bundlet-mappen:

```typescript
import { createSkillLoader } from "../src/skills/loader.ts";

const loader = createSkillLoader({
  directories: ["skills/bundled"],
  dirTypes: { "skills/bundled": "bundled" },
});

const skills = await loader.discover();
const mySkill = skills.find((s) => s.name === "github-triage");
console.log(mySkill);
// { name: "github-triage", classificationCeiling: "CONFIDENTIAL", ... }
```

## Agent selvforfatning

Agenten kan opprette ferdigheter programmatisk ved hjelp av `SkillAuthor`-API-en.

### Arbeidsflyt

```
1. Bruker:  «Jeg trenger at du sjekker Notion for nye oppgaver hver morgen»
2. Agent:   Bruker SkillAuthor til å opprette en ferdighet i arbeidsområdet
3. Ferdighet: Går inn i PENDING_APPROVAL-status
4. Bruker:  Mottar varsel, gjennomgår ferdigheten
5. Bruker:  Godkjenner → ferdighet blir aktiv
6. Agent:   Kobler ferdigheten inn i morgen-cron-planen
```

::: warning SIKKERHET Agenten kan ikke godkjenne egne ferdigheter. Dette håndheves på API-nivå. Alle agent-forfattede ferdigheter krever eksplisitt eierbekreftelse før aktivering. :::

## Sikkerhetsskanning

Før aktivering passerer ferdigheter gjennom en sikkerhetsscanner som sjekker for prompt-injeksjonsmønstre:

- «Ignore all previous instructions» — prompt-injeksjon
- «You are now a...» — identitetsredefinisjon
- «Reveal secrets/credentials» — dataeksfirasjonsforsøk
- «Bypass security/policy» — sikkerhetsomgåelse
- «Sudo/admin/god mode» — privilegieeskalering

Ferdigheter flagget av skanneren inkluderer advarsler som eieren må gjennomgå før godkjenning.

## Triggers

Ferdigheter kan definere automatiske triggers i frontmatteren:

```yaml
triggers:
  - cron: "0 7 * * *" # Hver dag kl. 7
  - cron: "*/30 * * * *" # Hvert 30. minutt
```

Planleggeren leser disse definisjonene og vekker agenten på de angitte tidspunktene for å utføre ferdigheten.

## Komplett eksempel

Her er en komplett ferdighet for triagering av GitHub-varsler:

```
github-triage/
  SKILL.md
```

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, flag PRs needing review. Use when the user
  asks about GitHub activity or on the hourly cron.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---

# GitHub Triage

Review and categorize GitHub notifications, issues, and pull requests.

## When to Use

- User asks "what's happening on GitHub?"
- Hourly cron trigger
- User asks about specific repo activity

## Steps

1. Fetch notifications from GitHub API using the user's token
2. Categorize: PRs needing review, new issues, mentions, CI failures
3. Prioritize by label: bug > security > feature > question
4. Summarize top items with direct links
5. Flag anything assigned to the user

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- Don't fetch all notifications — filter by `since` parameter for the last hour
- Always check rate limits before making multiple API calls
- Include direct links to every item for quick action
```

## Sjekkliste for ferdigheter

Før en ferdighet anses som komplett:

- [ ] Mappenavn samsvarer med `name` i frontmatter
- [ ] Beskrivelse forklarer **hva** og **når** den skal brukes
- [ ] Klassifiseringstak er det laveste nivået som fungerer
- [ ] Alle nødvendige verktøy er oppgitt i `requires_tools`
- [ ] Alle eksterne domener er oppgitt i `network_domains`
- [ ] Instruksjoner er konkrete og steg-for-steg
- [ ] Utdataformat er spesifisert
- [ ] Seksjon for vanlige feil er inkludert
- [ ] Ferdigheten kan oppdages av lasteren (testet)
