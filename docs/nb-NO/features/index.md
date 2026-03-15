# Funksjonsoversikt

Utover [sikkerhetsmodellen](/nb-NO/security/) og [kanalstøtten](/nb-NO/channels/)
tilbyr Triggerfish funksjoner som utvider AI-agenten din utover spørsmål-og-svar:
planlagte oppgaver, vedvarende minne, nettilgang, stemmeinput og multi-modell failover.

## Proaktiv atferd

### [Cron og Triggers](./cron-and-triggers)

Planlegg gjentakende oppgaver med standard cron-uttrykk og definer proaktiv
overvåkingsatferd gjennom `TRIGGER.md`. Agenten kan levere morgenbriefinger,
sjekke pipelines, overvåke uleste meldinger og handle autonomt etter en
konfigurerbar plan — alt med klassifiseringshåndhevelse og isolerte sesjoner.

### [Varsler](./notifications)

En varslingslevert jeneste som ruter meldinger på tvers av alle tilkoblede
kanaler med prioritetsnivåer, frakoblet køing og deduplicering. Erstatter
ad-hoc varslingmønstre med en samlet abstraksjon.

## Agentverktøy

### [Nettsøk og -henting](./web-search)

Søk på nettet og hent sideinnhold. Agenten bruker `web_search` til å finne
informasjon og `web_fetch` til å lese nettsider, med SSRF-beskyttelse og
policy-håndhevelse på alle utgående forespørsler.

### [Vedvarende minne](./memory)

Kryssesjonelt minne med klassifiseringsgating. Agenten lagrer og gjenkaller
fakta, preferanser og kontekst på tvers av samtaler. Minneklassifisering
tvinges til session taint — LLM-en kan ikke velge nivået.

### [Bildeanalyse og vision](./image-vision)

Lim inn bilder fra utklippstavlen (Ctrl+V i CLI, nettleserlim i Tidepool) og
analyser bildefiler på disk. Konfigurer en separat visjonsmodell for å
automatisk beskrive bilder når primærmodellen ikke støtter vision.

### [Kodebaseutforskning](./explore)

Strukturert kodebaseforståelse via parallelle sub-agenter. `explore`-verktøyet
kartlegger katalogtrær, oppdager kodningsmønstre, sporer importerer og
analyserer git-historikk — alt parallelt.

### [Sesjonsadministrasjon](./sessions)

Inspiser, kommuniser med og spawn sesjoner. Agenten kan delegere bakgrunnsoppgaver,
sende kryssesjonsmeldinger og nå ut på tvers av kanaler — alt under
no-write-down-håndhevelse.

### [Planmodus og oppgavesporing](./planning)

Strukturert planlegging før implementasjon (planmodus) og vedvarende
oppgavesporing (todos) på tvers av sesjoner. Planmodus begrenser agenten til
skrivebeskyttet utforskning inntil brukeren godkjenner planen.

### [Filsystem og shell](./filesystem)

Les, skriv, søk og kjør kommandoer. De grunnleggende verktøyene for filoperasjoner,
med workspace-scoping og kommando-denylist-håndhevelse.

### [Sub-agenter og LLM-oppgaver](./subagents)

Deleger arbeid til autonome sub-agenter eller kjør isolerte LLM-prompter for
oppsummering, klassifisering og fokusert resonnering uten å forurense
hovedsamtalen.

### [Agentteam](./agent-teams)

Spawn vedvarende team av samarbeidende agenter med spesialiserte roller. En leder
koordinerer medlemmer som kommuniserer autonomt via inter-sesjonsmeldinger.
Inkluderer livssyklusovervåking med inaktivitetslimitter, levetidsgrenser og
helsesjekker. Best for komplekse oppgaver som drar nytte av flere perspektiver
som itererer på hverandres arbeid.

## Rik interaksjon

### [Stemmerørledning](./voice)

Full talestøtte med konfigurerbare STT- og TTS-leverandører. Bruk Whisper for
lokal transkripsjon, Deepgram eller OpenAI for sky-STT, og ElevenLabs eller
OpenAI for tekst-til-tale. Stemmeinput passerer gjennom den samme klassifiserings-
og policy-håndhevelsen som tekst.

### [Tide Pool / A2UI](./tidepool)

Et agentdrevet visuelt arbeidsområde der Triggerfish gjengir interaktivt innhold
— dashbord, diagrammer, skjemaer og kodeforhåndsvisninger. A2UI (Agent-to-UI)-protokollen
sender sanntidsoppdateringer fra agenten til tilkoblede klienter.

## Multi-agent og multi-modell

### [Multi-agent ruting](./multi-agent)

Rut forskjellige kanaler, kontoer eller kontakter til separate isolerte agenter,
hver med sin egen SPINE.md, arbeidsområde, ferdigheter og klassifiseringstak.
Jobb-Slack-en din går til én agent; din personlige WhatsApp går til en annen.

### [LLM-leverandører og failover](./model-failover)

Koble til Anthropic, OpenAI, Google, lokale modeller (Ollama) eller OpenRouter.
Konfigurer failover-kjeder slik at agenten automatisk faller tilbake til en
alternativ leverandør når én er utilgjengelig. Hver agent kan bruke en
forskjellig modell.

### [Hastighetsbegrensning](./rate-limiting)

Glidende-vindu hastighetsbegrenser som forhindrer å treffe LLM-leverandørens
API-grenser. Sporer tokens-per-minutt og forespørsler-per-minutt, forsinker kall
når kapasiteten er oppbrukt, og integreres med failover-kjeden.

## Drift

### [Strukturert logging](./logging)

Samlet strukturert logging med alvorlighetsnivåer, filrotasjon og dobbelt utdata
til stderr og fil. Komponentmerkte loggrader, automatisk 1 MB rotasjon og et
`log_read`-verktøy for tilgang til logghistorikk.

::: info Alle funksjoner integreres med kjernes sikkerhetsmodell. Cron-jobber
respekterer klassifiseringstak. Stemmeinput bærer taint. Tide Pool-innhold
passerer gjennom PRE_OUTPUT-hooken. Multi-agent ruting håndhever sesjons-
isolasjon. Ingen funksjon omgår policy-laget. :::
