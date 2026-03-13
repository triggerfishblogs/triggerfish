# Agent-utførelsesmiljø

Agent-utførelsesmiljøet er Triggerfish sin selvutviklingsevne — et førsteklasses kodearbeidsområde der agenten kan skrive kode, kjøre den, observere utdata og feil, fikse problemer og iterere til noe fungerer. Dette er det som gjør det mulig for agenten å bygge integrasjoner, teste ideer og lage nye verktøy på egenhånd.

## Ikke Plugin-sandkassen

Utførelsesmiljøet er fundamentalt forskjellig fra [Plugin-sandkassen](./plugins). Å forstå distinksjonen er viktig:

- **Plugin-sandkassen** beskytter systemet **FRA** ikke-betrodd tredjeparts kode
- **Exec-miljøet** bemyndiger agenten **TIL** å skrive, kjøre og feilsøke sin egen kode

Plugin-sandkassen er defensiv. Exec-miljøet er produktivt. De tjener motsatte formål og har forskjellige sikkerhetsprofiler.

| Aspekt              | Plugin-sandkasse                      | Agent Exec-miljø                       |
| ------------------- | ------------------------------------- | -------------------------------------- |
| **Formål**          | Beskytt system FRA ikke-betrodd kode  | Bemyndig agent TIL å bygge ting        |
| **Filsystem**       | Ingen (fullstendig sandkasse)         | Kun arbeidsområdemappe                 |
| **Nettverk**        | Kun deklarerte endepunkter            | Policy-styrt tillat/avvis-lister       |
| **Pakkinstallasjon**| Ikke tillatt                          | Tillatt (npm, pip, deno add)           |
| **Utførelsestid**   | Streng tidsavbrudd                    | Generøs tidsavbrudd (konfigurerbar)    |
| **Iterasjon**       | Enkelt kjøring                        | Ubegrenset skriv/kjør/fiks-looper      |
| **Persistens**      | Flyktig                               | Arbeidsområde vedvarer på tvers av sesjoner |

## Tilbakemeldingsloopen

Den sentrale kvalitetsdifferensiatoren. Dette er det samme mønsteret som gjør verktøy som Claude Code effektive — en tett skriv/kjør/fiks-syklus der agenten ser nøyaktig hva en menneskelig utvikler ville se.

### Trinn 1: Skriv

Agenten oppretter eller endrer filer i arbeidsområdet ved hjelp av `write_file`. Arbeidsområdet er en ekte filsystemmapp scoped til den gjeldende agenten.

### Trinn 2: Kjør

Agenten kjører koden via `run_command`, og mottar fullstendig stdout, stderr og avslutningskode. Ingen utdata skjules eller oppsummeres. Agenten ser nøyaktig hva du ville sett i en terminal.

### Trinn 3: Observere

Agenten leser det fulle utdataet. Hvis feil oppstod, ser den den fulle stacksporet, feilmeldinger og diagnostisk utdata. Hvis tester mislyktes, ser den hvilke tester som mislyktes og hvorfor.

### Trinn 4: Fikse

Agenten redigerer koden basert på hva den observerte, ved hjelp av `write_file` eller `edit_file` for å oppdatere spesifikke filer.

### Trinn 5: Gjenta

Agenten kjører igjen. Denne loopen fortsetter til koden fungerer — bestå tester, produsere riktig utdata eller oppnå det uttalte målet.

### Trinn 6: Lagre

Når den fungerer, kan agenten lagre arbeidet som en [ferdighet](./skills) (SKILL.md + støttefiler), registrere det som en integrasjon, koble det inn i en cron-jobb eller gjøre det tilgjengelig som et verktøy.

::: tip Lagringstrinnet er det som gjør exec-miljøet til mer enn et skrapeblokk. Fungerende kode forsvinner ikke bare — agenten kan pakke det inn i en gjenbrukbar ferdighet som kjøres etter plan, svarer på triggers eller kalles etter behov. :::

## Tilgjengelige verktøy

| Verktøy          | Beskrivelse                                        | Utdata                                      |
| ---------------- | -------------------------------------------------- | ------------------------------------------- |
| `write_file`     | Skriv eller overskriv en fil i arbeidsområdet      | Filsti, bytes skrevet                       |
| `read_file`      | Les filinnhold fra arbeidsområdet                  | Filinnhold som streng                       |
| `edit_file`      | Anvend målrettede redigeringer på en fil           | Oppdatert filinnhold                        |
| `run_command`    | Utfør en skallakommando i arbeidsområdet           | stdout, stderr, avslutningskode, varighet   |
| `list_directory` | List filer i arbeidsområdet (rekursivt valgfritt)  | Filopplistning med størrelser               |
| `search_files`   | Søk i filinnhold (grep-lignende)                   | Samsvarende linjer med fil:linje-referanser |

## Arbeidsområdestruktur

Hver agent får et isolert arbeidsområdemappe som vedvarer på tvers av sesjoner:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Per-agent arbeidsområde
    scratch/                      # Midlertidige arbeidsfiler
    integrations/                 # Integrasjonskode under utvikling
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Ferdigheter under forfatning
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Utførelseslogg for revisjon
  background/
    <session-id>/                 # Midlertidig arbeidsområde for bakgrunnsoppgaver
```

Arbeidsområder er isolert mellom agenter. Én agent kan ikke aksessere en annen agents arbeidsområde. Bakgrunnsoppgaver (cron-jobber, triggers) får sitt eget midlertidige arbeidsområde scoped til sesjonen.

## Integrasjonsutviklingsflyt

Når du ber agenten bygge en ny integrasjon (for eksempel «koble til Notion og synkroniser oppgaver»), følger agenten en naturlig utviklingsarbeidsflyt:

1. **Utforsk** — Bruker `run_command` for å teste API-endepunkter, sjekke autentisering, forstå responsformer
2. **Stillas** — Skriver integrasjonskode med `write_file`, oppretter en testfil ved siden av
3. **Test** — Kjører tester med `run_command`, ser feil, itererer
4. **Installer avhengigheter** — Bruker `run_command` for å legge til nødvendige pakker (npm, pip, deno add)
5. **Iterer** — Skriv, kjør, fiks-loop til tester bestås og integrasjonen fungerer end-to-end
6. **Lagre** — Lagrer som en ferdighet (skriver SKILL.md med metadata) eller kobler inn i en cron-jobb
7. **Godkjenning** — Selvforfattet ferdighet går inn i `PENDING_APPROVAL`-tilstanden; du gjennomgår og godkjenner

## Språk og kjøretidsstøtte

Utførelsesmiljøet kjøres på vertssystemet (ikke i WASM), med tilgang til flere kjøretider:

| Kjøretid | Tilgjengelig via                    | Brukstilfelle                        |
| -------- | ----------------------------------- | ------------------------------------ |
| Deno     | Direkte utføring                    | TypeScript/JavaScript (førsteklasse) |
| Node.js  | `run_command node`                  | npm-økosystemtilgang                 |
| Python   | `run_command python`                | Datavitenskap, ML, skripting         |
| Skall    | `run_command sh` / `run_command bash` | Systemautomatisering, limsrkript   |

Agenten kan oppdage tilgjengelige kjøretider og velge den beste for oppgaven. Pakkinstallasjon fungerer via standardverktøykjeden for hver kjøretid.

## Sikkerhetsgrenser

Exec-miljøet er mer tillatende enn plugin-sandkassen, men fortsatt policy-kontrollert ved hvert trinn.

### Policy-integrasjon

- Hvert `run_command`-kall utløser `PRE_TOOL_CALL`-hooken med kommandoen som kontekst
- Kommandotillatelsesliste/avvisningsliste sjekkes før utføring
- Utdata fanges og sendes gjennom `POST_TOOL_RESPONSE`-hooken
- Nettverksendepunkter aksessert under utføring spores via lineage
- Hvis kode aksesserer klassifiserte data (for eksempel leser fra en CRM-API), eskalerer session taint
- Utførelseshistorikk logges til `.exec_history` for revisjon

### Harde grenser

Disse grensene krysses aldri, uavhengig av konfigurasjon:

- Kan ikke skrive utenfor arbeidsområdemappen
- Kan ikke utføre kommandoer på avvisningslisten (`rm -rf /`, `sudo` osv.)
- Kan ikke aksessere andre agenters arbeidsområder
- Alle nettverkskall styres av policy-hooks
- Alle utdata klassifiseres og bidrar til session taint
- Ressursbegrensninger håndheves: diskplass, CPU-tid per utføring, minne

::: warning SIKKERHET Alle kommandoer agenten kjører passerer gjennom `PRE_TOOL_CALL`-hooken. Policy-motoren sjekker dem mot kommandotillatelseslisten/avvisningslisten før utføring begynner. Farlige kommandoer blokkeres deterministisk — LLM-en kan ikke påvirke denne beslutningen. :::

### Bedriftskontroller

Bedriftsadministratorer har ytterligere kontroller over exec-miljøet:

- **Deaktiver exec helt** for spesifikke agenter eller roller
- **Begrens tilgjengelige kjøretider** (for eksempel tillat bare Deno, blokker Python og skall)
- **Angi ressursbegrensninger** per agent (diskkvote, CPU-tid, minnetak)
- **Krev godkjenning** for alle exec-operasjoner over en klassifiseringsterskel
- **Egendefinert kommandoavvisningsliste** utover den standard farlige-kommando-listen
