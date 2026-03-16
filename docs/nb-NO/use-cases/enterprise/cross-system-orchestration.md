---
title: Cross-System Orchestration
description: Hvordan Triggerfish håndterer arbeidsflyter som spenner over 12+ systemer med kontekstuell vurdering på hvert trinn, uten skjørheten som ødelegger tradisjonell automatisering.
---

# Cross-System Orchestration med skjønnsmessige beslutninger

En typisk procure-to-pay-arbeidsflyt berører et titalls systemer. En innkjøpsforespørsel starter i én plattform, rutes til en godkjenningskjede i en annen, utløser et leverandøroppslag i en tredje, oppretter en innkjøpsordre i en fjerde, starter en mottaksprosess i en femte, matcher fakturaer i en sjette, planlegger betaling i en syvende og registrerer alt i en åttende. Hvert system har sitt eget API, sin egen oppdateringsplan, sin egen autentiseringsmodell og sine egne feilmodi.

Tradisjonell automatisering håndterer dette med stive pipelines. Trinn én kaller API A, parser svaret og sender et felt til trinn to, som kaller API B. Det fungerer inntil det ikke gjør det. En leverandørpost har et litt annet format enn forventet. En godkjenning kommer tilbake med en statuskode pipelinen ikke var designet for. Et nytt obligatorisk felt dukker opp i en API-oppdatering. Ett ødelagt trinn ødelegger hele kjeden, og ingen vet om det før en nedstrømsprosess feiler dager senere.

Det egentlige problemet er ikke teknisk skjørhet. Det er at reelle forretningsprosesser krever skjønn. Skal denne fakturaavviket eskaleres eller løses automatisk? Berettiger leverandørens mønster med sene leveringer en kontraktgjennomgang? Er denne godkjenningsforespørselen urgent nok til å hoppe over standardrutingen? Disse beslutningene lever for øyeblikket i folks hoder, noe som betyr at automatiseringen bare kan håndtere det lykkelige tilfellet.

## Hvordan Triggerfish løser dette

Triggerfish sin workflow-motor kjører YAML-baserte workflow-definisjoner som blander deterministisk automatisering med AI-resonnering i én enkelt pipeline. Hvert trinn i arbeidsflyten passerer gjennom det samme sikkerhetsoverhåndhevingslaget som styrer alle Triggerfish-operasjoner, slik at klassifiseringssporing og revisjonsspor holder seg gjennom hele kjeden uavhengig av hvor mange systemer som er involvert.

### Deterministiske trinn for deterministisk arbeid

Når et workflowtrinn har en kjent inndata og en kjent utdata, kjøres det som et standard HTTP-kall, en shell-kommando eller en MCP-verktøyanrop. Ingen LLM-involvering, ingen latensstraff, ingen inferenskostnad. Workflow-motoren støtter `call: http` for REST API-er, `call: triggerfish:mcp` for alle tilkoblede MCP-servere, og `run: shell` for kommandolinjeverktøy. Disse trinnene kjøres nøyaktig som tradisjonell automatisering, fordi for forutsigbart arbeid er tradisjonell automatisering riktig tilnærming.

### LLM-subagenter for skjønnsmessige beslutninger

Når et workflowtrinn krever kontekstuell resonnering, starter motoren en ekte LLM-subagentsesjon med `call: triggerfish:llm`. Dette er ikke ett enkelt prompt/svar. Subagenten har tilgang til alle verktøy som er registrert i Triggerfish, inkludert nettsøk, minne, nettleserautomatisering og alle tilkoblede integrasjoner. Den kan lese dokumenter, spørre databaser, sammenligne poster og ta en beslutning basert på alt den finner.

Subagentens output mates direkte inn i neste trinn i arbeidsflyten. Hvis den aksesserte klassifiserte data under resonnering, eskalerer sesjons-tainet automatisk og forplanter seg tilbake til overordnet arbeidsflyt. Workflow-motoren sporer dette, slik at en arbeidsflyt som startet på PUBLIC men traff CONFIDENTIAL-data under en skjønnsmessig beslutning, får sin komplette kjøringshistorikk lagret på CONFIDENTIAL-nivå. En lavere klassifisert sesjon kan ikke engang se at arbeidsflyten kjørte.

### Betinget forgreining basert på reell kontekst

Workflow-DSL-en støtter `switch`-blokker for betinget ruting, `for`-løkker for batchbehandling og `set`-operasjoner for å oppdatere workflowtilstand. Kombinert med LLM-subagenttrinn som kan evaluere komplekse betingelser, betyr dette at arbeidsflyten kan forgrene seg basert på faktisk forretningskontekst i stedet for bare feltverdier.

En anskaffelsesarbeidsflyt kan rute ulikt basert på subagentens vurdering av leverandørrisiko. En onboarding-arbeidsflyt kan hoppe over trinn som ikke er relevante for en bestemt rolle. En hendelseshåndteringsarbeidsflyt kan eskalere til ulike team basert på subagentens rotårsaksanalyse. Forgreningslogikken lever i workflowdefinisjonen, men beslutningsinputene kommer fra AI-resonnering.

### Selvhelbredelse når systemer endres

Når et deterministisk trinn feiler fordi et API endret sitt svarformat eller et system returnerte en uventet feil, stopper ikke arbeidsflyten bare. Motoren kan delegere det mislykkede trinnet til en LLM-subagent som leser feilen, inspiserer svaret og forsøker en alternativ tilnærming. Et API som la til et nytt obligatorisk felt, håndteres av subagenten som leser feilmeldingen og justerer forespørselen. Et system som endret autentiseringsflyten sin, navigeres av nettleserautomatiseringsverktøyene.

Dette betyr ikke at alle feil løses magisk. Men det betyr at arbeidsflyten degraderes gracefully i stedet for å feile lydløst. Subagenten finner enten en vei fremover eller produserer en tydelig forklaring på hva som endret seg og hvorfor manuell intervensjon er nødvendig, i stedet for en kryptisk feilkode begravd i en loggfil ingen sjekker.

### Sikkerhet gjennom hele kjeden

Hvert trinn i en Triggerfish-arbeidsflyt passerer gjennom de samme policyhåndhevelses-hookene som ethvert direkte verktøykall. PRE_TOOL_CALL validerer tillatelser og sjekker hastighetsbegrensninger før kjøring. POST_TOOL_RESPONSE klassifiserer returnerte data og oppdaterer sesjons-taint. PRE_OUTPUT sikrer at ingenting forlater systemet på et klassifiseringsnivå høyere enn målet tillater.

Dette betyr at en arbeidsflyt som leser fra CRM-en din (CONFIDENTIAL), behandler dataene gjennom en LLM og sender et sammendrag til Slack, ikke ved uhell lekker konfidensielle detaljer inn i en offentlig kanal. Write-down-forebyggingsregelen fanger det ved PRE_OUTPUT-hooken, uavhengig av hvor mange mellomliggende trinn dataene passerte gjennom. Klassifiseringen reiser med dataene gjennom hele arbeidsflyten.

Selve workflowdefinisjonen kan sette en `classification_ceiling` som hindrer arbeidsflyten i å berøre data over et angitt nivå. En ukentlig sammendragsarbeidsflyt klassifisert på INTERNAL kan ikke aksessere CONFIDENTIAL-data selv om den har legitimasjonen til å gjøre det. Taket håndheves i kode, ikke ved å håpe at LLM-en respekterer en promptinstruksjon.

### Cron- og webhook-triggere

Arbeidsflyter krever ikke at noen starter dem manuelt. Planleggeren støtter cron-baserte triggere for tilbakevendende arbeidsflyter og webhook-triggere for hendelsesdrevet kjøring. En morgenbriefing-arbeidsflyt kjøres kl. 7. En PR-gjennomgangsarbeidsflyt avfyres når GitHub sender en webhook. En fakturabehandlingsarbeidsflyt utløses når en ny fil dukker opp i en delt stasjon.

Webhook-hendelser bærer sitt eget klassifiseringsnivå. En GitHub-webhook for et privat repositorium klassifiseres automatisk som CONFIDENTIAL basert på domaineklassifiseringsoppslagene i sikkerhetskonfigurasjonen. Arbeidsflyten arver den klassifiseringen og all nedstrøms overhåndheving gjelder.

## Slik ser det ut i praksis

Et mellomstort selskap som kjører procure-to-pay på tvers av NetSuite, Coupa, DocuSign og Slack definerer en Triggerfish-arbeidsflyt som håndterer hele syklusen. Deterministiske trinn håndterer API-kallene for å opprette innkjøpsordrer, rute godkjenninger og matche fakturaer. LLM-subagenttrinn håndterer unntakene: fakturaer med linjeposer som ikke samsvarer med innkjøpsordren, leverandører som sendte inn dokumentasjon i et uventet format, godkjenningsforespørsler som trenger kontekst om søkerens historikk.

Arbeidsflyten kjører på en selvhostet Triggerfish-instans. Ingen data forlater selskapets infrastruktur. Klassifiseringssystemet sikrer at finansdata fra NetSuite forblir CONFIDENTIAL og ikke kan sendes til en Slack-kanal klassifisert som INTERNAL. Revisjonssporet fanger opp hver beslutning LLM-subagenten tok, hvert verktøy den kalte og hvert dataelement den aksesserte, lagret med full lineage-sporing for samsvarsgjennomgang.

Når Coupa oppdaterer API-en sin og endrer et feltnavn, feiler workflowens deterministiske HTTP-trinn. Motoren delegerer til en subagent som leser feilen, identifiserer det endrede feltet og gjenforsøker med riktig parameter. Arbeidsflyten fullføres uten menneskelig intervensjon, og hendelsen logges slik at en ingeniør kan oppdatere workflowdefinisjonen for å håndtere det nye formatet fremover.
