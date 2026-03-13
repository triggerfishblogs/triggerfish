# Ordliste

| Begrep                       | Definisjon                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**               | En vedvarende gruppe av samarbeidende agentsesjoner med distinkte roller. Én member er lederen som koordinerer arbeidet. Opprettet via `team_create`, overvåket med livssyklussjekker. |
| **A2UI**                     | Agent-to-UI-protokoll for å sende visuelt innhold fra agenten til Tide Pool-arbeidsområdet i sanntid.                                                                       |
| **Background Session**       | En sesjon spawnet for autonome oppgaver (cron, triggers) som starter med frisk PUBLIC taint og kjøres i et isolert arbeidsområde.                                           |
| **Buoy**                     | En ledsagende native app (iOS, Android) som gir enhetsfunksjoner som kamera, plassering, skjermopptak og push-varsler til agenten. (Kommer snart.)                          |
| **Classification**           | En sensitivitetsetikett tildelt data, kanaler og mottakere. Fire nivåer: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                                                         |
| **Cron**                     | En planlagt gjentakende oppgave kjørt av agenten på et angitt tidspunkt ved hjelp av standard cron-uttrykkssyntaks.                                                         |
| **Dive**                     | Den første kjørings-oppsettsveiviseren (`triggerfish dive`) som stillas `triggerfish.yaml`, SPINE.md og opprinnelig konfigurasjon.                                          |
| **Effective Classification** | Klassifiseringsnivået brukt for utdatabeslutninger, beregnet som `min(channel_classification, recipient_classification)`.                                                   |
| **Exec Environment**         | Agentens kodearbeidsområde for skriving, kjøring og feilsøking av kode i en tett skriv-kjør-fiks tilbakemeldingsløkke, adskilt fra Plugin Sandbox.                         |
| **Failover**                 | Automatisk tilbakefall til en alternativ LLM-leverandør når gjeldende leverandør er utilgjengelig på grunn av hastighetsbegrensning, serverfeil eller tidsavbrudd.          |
| **Gateway**                  | Det langvarige lokale kontrollplanet som administrerer sesjoner, kanaler, verktøy, hendelser og agentprosesser via et WebSocket JSON-RPC-endepunkt.                         |
| **Hook**                     | Et deterministisk håndhevingspunkt i dataflyten der policy-motoren evaluerer regler og bestemmer om en handling skal tillates, blokkeres eller redigeres.                   |
| **Lineage**                  | Proveniensmetadata som sporer opprinnelse, transformasjoner og gjeldende plassering for hvert dataelement behandlet av Triggerfish.                                          |
| **LlmProvider**              | Grensesnittet for LLM-fullføringer, implementert av hver støttet leverandør (Anthropic, OpenAI, Google, Lokal, OpenRouter).                                                 |
| **MCP**                      | Model Context Protocol, en standard for agent-verktøykommunikasjon. Triggerfishs MCP Gateway legger til klassifiseringskontroller i enhver MCP-server.                     |
| **No Write-Down**            | Den faste, ikke-konfigurerbare regelen om at data bare kan flyte til kanaler eller mottakere på et likt eller høyere klassifiseringsnivå.                                   |
| **NotificationService**      | Den samlede abstraksjonen for å levere eiervarsler på tvers av alle tilkoblede kanaler med prioritet, køing og deduplicering.                                               |
| **Patrol**                   | Den diagnostiske helsesjekk-kommandoen (`triggerfish patrol`) som verifiserer gateway-en, LLM-leverandørene, kanalene og policy-konfigurasjonen.                            |
| **Reef (The)**               | Fellesskapets ferdighetmarkedsplass for å oppdage, installere, publisere og administrere Triggerfish-ferdigheter.                                                           |
| **Ripple**                   | Sanntids skriveindikartorer og online-statussignaler videresendt på tvers av kanaler der det støttes.                                                                       |
| **Session**                  | Den grunnleggende enheten for samtaletilstand med uavhengig taint-sporing. Hver sesjon har en unik ID, bruker, kanal, taint-nivå og historikk.                              |
| **Skill**                    | En mappe som inneholder en `SKILL.md`-fil og valgfrie støttefiler som gir agenten nye ferdigheter uten å skrive plugins.                                                    |
| **SPINE.md**                 | Agentidentitets- og oppdragsfilen lastet som system-prompt-fundamentet. Definerer personlighet, regler og grenser. Triggerfishs ekvivalent til CLAUDE.md.                  |
| **StorageProvider**          | Den samlede vedvarenhetsabstraksjonen (nøkkelverdi-grensesnitt) som all tilstandsfull data flyter gjennom. Implementasjoner inkluderer Memory, SQLite og enterprise-servere. |
| **Taint**                    | Klassifiseringsnivået knyttet til en sesjon basert på dataene den har aksessert. Taint kan bare eskalere innenfor en sesjon, aldri reduseres.                               |
| **Tide Pool**                | Et agentdrevet visuelt arbeidsområde der Triggerfish gjengir interaktivt innhold (dashbord, diagrammer, skjemaer) ved hjelp av A2UI-protokollen.                            |
| **TRIGGER.md**               | Agentens fil for proaktiv atferdsdefinsjon, som angir hva som skal sjekkes, overvåkes og handles på under periodiske trigger-oppvåkninger.                                 |
| **Webhook**                  | Et innkommende HTTP-endepunkt som aksepterer hendelser fra eksterne tjenester (GitHub, Sentry, osv.) og utløser agenthandlinger.                                            |
| **Team Lead**                | Den utpekte koordinatoren i et agentteam. Mottar teamets mål, dekomponerer arbeid, tildeler oppgaver til membere og bestemmer når teamet er ferdig.                        |
| **Workspace**                | En per-agent filsystemkatalog der agenten skriver og kjører sin egen kode, isolert fra andre agenter.                                                                       |
| **Write-Down**               | Den forbudte flyten av data fra et høyere klassifiseringsnivå til et lavere (f.eks. CONFIDENTIAL-data sendt til en PUBLIC-kanal).                                           |
