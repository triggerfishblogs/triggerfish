# Bygge integrasjoner

Triggerfish er designet for å utvides. Enten du vil koble til en ny datakilde, automatisere en arbeidsflyt, gi agenten din nye ferdigheter eller reagere på eksterne hendelser, finnes det en veldefinert integrasjonsvei — og alle veier respekterer den samme sikkerhetsmodellen.

## Integrasjonsveier

Triggerfish tilbyr fem distinkte måter å utvide plattformen på. Hver tjener et annet formål, men alle deler de samme sikkerhetsgarantiene: klassifiseringshåndhevelse, taint-sporing, policy-hooks og full revisjonslogging.

| Vei                                             | Formål                                               | Best for                                                                              |
| ----------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [MCP Gateway](./mcp-gateway)                    | Koble til eksterne verktøyservere                    | Standardisert agent-til-verktøy-kommunikasjon via Model Context Protocol              |
| [Plugins](./plugins)                            | Utvid agenten med tilpassede verktøy                 | Agent-bygde integrasjoner, API-koblinger, eksterne systemspørringer, arbeidsflyter    |
| [Exec-miljø](./exec-environment)                | Agent skriver og kjører sin egen kode                | Bygge integrasjoner, prototype, teste og iterere i en tilbakemeldingsloop             |
| [Ferdigheter](./skills)                         | Gi agenten nye evner via instruksjoner               | Gjenbrukbare atferder, fellesskapets markedsplass, agent selvforfatning               |
| [Nettleserautomatisering](./browser)            | Kontroller en nettleserinstans via CDP               | Nettforskning, utfylling av skjemaer, skraping, automatiserte nettarbeidsflyter       |
| [Webhooks](./webhooks)                          | Motta innkommende hendelser fra eksterne tjenester   | Sanntidsreaksjoner på e-poster, varsler, CI/CD-hendelser, kalenderendringer           |
| [GitHub](./github)                              | Full GitHub-arbeidsflytintegrasjon                   | PR-gjennomgangslooper, problemtriagering, grenbehandling via webhooks + exec + ferdigheter |
| [Google Workspace](./google-workspace)          | Koble Gmail, Kalender, Oppgaver, Drive, Sheets       | Innebygd OAuth2-integrasjon med 14 verktøy for Google Workspace                      |
| [Obsidian](./obsidian)                          | Les, skriv og søk i Obsidian-hvelv-notater           | Klassifiseringsgated notatilgang med mappekartlegging, wikilinks, daglige notater     |

## Sikkerhetsmodell

Alle integrasjoner — uavhengig av vei — opererer under de samme sikkerhetsbegrensningene.

### Alt starter som UNTRUSTED

Nye MCP-servere, plugins, kanaler og webhook-kilder er alle som standard i `UNTRUSTED`-tilstanden. De kan ikke utveksle data med agenten til de eksplisitt klassifiseres av eieren (personlig nivå) eller admin (bedriftsnivå).

```
UNTRUSTED  -->  CLASSIFIED  (etter gjennomgang, tildelt et klassifiseringsnivå)
UNTRUSTED  -->  BLOCKED     (eksplisitt forbudt)
```

### Klassifisering flyter gjennom

Når en integrasjon returnerer data, bærer disse dataene et klassifiseringsnivå. Å aksessere klassifiserte data eskalerer session taint til å samsvare. Når den er taintet, kan sesjonen ikke sende til en destinasjon med lavere klassifisering. Dette er [No-Write-Down-regelen](/nb-NO/security/no-write-down) — den er fast og kan ikke overstyres.

### Policy-hooks håndhever ved hver grense

Alle integrasjonshandlinger passerer gjennom deterministiske policy-hooks:

| Hook                    | Når den utløses                                                       |
| ----------------------- | --------------------------------------------------------------------- |
| `PRE_CONTEXT_INJECTION` | Eksterne data kommer inn i agentens kontekst (webhooks, plugin-svar)  |
| `PRE_TOOL_CALL`         | Agenten ber om et verktøykall (MCP, exec, nettleser)                  |
| `POST_TOOL_RESPONSE`    | Verktøy returnerer data (klassifiser svar, oppdater taint)            |
| `PRE_OUTPUT`            | Svar forlater systemet (endelig klassifiseringssjekk)                 |

Disse hookene er rene funksjoner — ingen LLM-kall, ingen tilfeldighet, ingen omgåelse. Samme inndata gir alltid samme beslutning.

### Revisjonsrekke

Alle integrasjonshandlinger logges: hva ble kalt, hvem som kalte det, hva policy-beslutningen var og hvordan session taint endret seg. Denne revisjonsrekken er uforanderlig og tilgjengelig for samsvarsgransking.

::: warning SIKKERHET LLM-en kan ikke omgå, endre eller påvirke policy-hook-beslutninger. Hooks kjøres i kode under LLM-laget. KI-en ber om handlinger — policy-laget bestemmer. :::

## Velge riktig vei

Bruk denne beslutningsveiledningen for å velge integrasjonsveien som passer ditt brukstilfelle:

- **Du vil koble til en standard verktøyserver** — Bruk [MCP Gateway](./mcp-gateway). Hvis et verktøy snakker MCP, er dette veien.
- **Du trenger å kjøre egendefinert kode mot en ekstern API** — Bruk [Plugins](./plugins). Agenten kan bygge, skanne og laste plugins ved kjøretid. Plugins kjøres i sandkasse med sikkerhetsskanning.
- **Du vil at agenten skal bygge og iterere på kode** — Bruk [Exec-miljøet](./exec-environment). Agenten får et arbeidsområde med en full skriv/kjør/fiks-loop.
- **Du vil lære agenten en ny atferd** — Bruk [Ferdigheter](./skills). Skriv en `SKILL.md` med instruksjoner, eller la agenten forfatte sin egen.
- **Du trenger å automatisere nettinteraksjoner** — Bruk [Nettleserautomatisering](./browser). CDP-kontrollert Chromium med domenepolicy-håndhevelse.
- **Du trenger å reagere på eksterne hendelser i sanntid** — Bruk [Webhooks](./webhooks). Innkommende hendelser verifisert, klassifisert og rutet til agenten.

::: tip Disse veiene er ikke gjensidig utelukkende. En ferdighet kan bruke nettleserautomatisering internt. En plugin kan utløses av en webhook. En agent-forfattet integrasjon i exec-miljøet kan lagres som en ferdighet. De komponeres naturlig. :::
