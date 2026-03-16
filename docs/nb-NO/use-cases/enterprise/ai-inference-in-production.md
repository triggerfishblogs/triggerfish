---
title: AI-inferens i produksjonsarbeidsflyter
description: Hvordan Triggerfish tetter gapet mellom AI-demoer og varige produksjonsarbeidsflyter med sikkerhetsoverhåndheving, revisjonsspor og workflow-orkestrering.
---

# AI/ML-inferens integrert i produksjonsarbeidsflyter

De fleste enterprise AI-prosjekter dør i gapet mellom demo og produksjon. Et team bygger et proof of concept som bruker GPT-4 til å klassifisere støttehenvendelser, oppsummere juridiske dokumenter eller generere markedsführingstekster. Demoen fungerer. Ledelsen blir begeistret. Så staller prosjektet i måneder mens teamet prøver å besvare spørsmål demoen aldri trengte å ta stilling til: Hvor kommer dataene fra? Hvor havner outputen? Hvem godkjenner AI-ens beslutninger? Hva skjer når modellen hallusinerer? Hvordan reviderer vi hva den gjorde? Hvordan hindrer vi den fra å aksessere data den ikke bør se? Hvordan stopper vi den fra å sende sensitiv informasjon til feil sted?

Dette er ikke hypotetiske bekymringer. 95 % av enterprise generativ AI-pilotprosjekter leverer ikke finansiell avkastning, og årsaken er ikke at teknologien ikke fungerer. Modellene er kapable. Feilen er i rørleggerarbeidet: å få AI-inferens pålitelig integrert i de faktiske forretningsarbeidsflytene der den trenger å operere, med sikkerhetskontrollene, feilhåndteringen og revisjonssporene som produksjonssystemer krever.

Den typiske enterprise-responsen er å bygge et tilpasset integrasjonslag. Et ingeniørteam bruker måneder på å koble AI-modellen til datakildene, bygge pipelinen, legge til autentisering, implementere logging, opprette en godkjenningsarbeidsflyt og bolte på sikkerhetskontroller. Innen integrasjonen er "produksjonsklar", har den opprinnelige modellen blitt erstattet av en nyere, forretningskravene har endret seg, og teamet må starte på nytt.

## Hvordan Triggerfish løser dette

Triggerfish eliminerer integrasjonsgapet ved å gjøre AI-inferens til et førsteklasses trinn i workflow-motoren, styrt av den samme sikkerhetsoverhåndhevingen, revisjonsloggingen og klassifiseringskontrollene som gjelder for alle andre operasjoner i systemet. Et LLM-subagenttrinn i en Triggerfish-arbeidsflyt er ikke en tilleggsmodul. Det er en native operasjon med de samme policyhookene, lineage-sporingen og write-down-forebyggingen som et HTTP-kall eller en databasespørring.

### AI som et workflowtrinn, ikke et eget system

I workflow-DSL-en er et LLM-inferenstrinn definert med `call: triggerfish:llm`. Oppgavebeskrivelsen forteller subagenten hva den skal gjøre på naturlig språk. Subagenten har tilgang til alle verktøy som er registrert i Triggerfish. Den kan søke på nettet, spørre databaser gjennom MCP-verktøy, lese dokumenter, surfe på nettsider og bruke kryssesjonsminner. Når trinnet fullføres, mates outputen direkte inn i neste trinn i arbeidsflyten.

Dette betyr at det ikke er noe eget "AI-system" å integrere. Inferensen skjer inne i arbeidsflyten, ved hjelp av de samme legitimasjonene, de samme datatilkoblingene og den samme sikkerhetsoverhåndhevingen som alt annet. Et ingeniørteam trenger ikke å bygge et tilpasset integrasjonslag fordi integrasjonslaget allerede eksisterer.

### Sikkerhet som ikke krever tilpasset ingeniørarbeid

Den mest tidkrevende delen av å produksjonssette en AI-arbeidsflyt er ikke AI-en. Det er sikkerhets- og samsvarsarbeidet. Hvilke data kan modellen se? Hvor kan den sende outputen sin? Hvordan hindrer vi den fra å lekke sensitiv informasjon? Hvordan logger vi alt for revisjon?

I Triggerfish besvares disse spørsmålene av plattformarkitekturen, ikke av per-prosjektingeniørarbeid. Klassifiseringssystemet sporer datasensitivitet ved hvert grensesnitt. Sesjons-tainet eskalerer når modellen aksesserer klassifiserte data. Write-down-forebyggingen blokkerer output fra å flyte til en kanal klassifisert under sesjonens taint-nivå. Hvert verktøykall, hvert dataaksess og hver outputbeslutning logges med full lineage.

En AI-arbeidsflyt som leser kundeoppføringer (CONFIDENTIAL) og genererer et sammendrag, kan ikke sende det sammendraget til en offentlig Slack-kanal. Dette håndheves ikke av en promptinstruksjon som modellen kan ignorere. Det håndheves av deterministisk kode i PRE_OUTPUT-hooken som modellen ikke kan se, ikke kan endre og ikke kan omgå. Policyhookene kjøres under LLM-laget. LLM-en ber om en handling, og policylaget bestemmer om det skal tillates. Tidsavbrudd er lik avvisning. Det finnes ingen vei fra modellen til omverdenen som ikke passerer gjennom håndhevelse.

### Revisjonsspor som allerede eksisterer

Hver AI-beslutning i en Triggerfish-arbeidsflyt genererer lineage-poster automatisk. Lineage-sporingen sporer hvilke data modellen aksesserte, hvilket klassifiseringsnivå de bar, hvilke transformasjoner som ble brukt og hvor outputen ble sendt. Dette er ikke en loggingsfunksjon som trenger å aktiveres eller konfigureres. Det er en strukturell egenskap ved plattformen. Hvert dataelement bærer provenansmetadata fra opprettelse gjennom hver transformasjon til dets endelige destinasjon.

For regulerte bransjer betyr dette at samsvarsbeviset for en AI-arbeidsflyt eksisterer fra dag én. En revisor kan spore enhver AI-generert output tilbake gjennom den komplette kjeden: hvilken modell som produserte den, hvilke data den var basert på, hvilke verktøy modellen brukte under resonnering, hvilket klassifiseringsnivå som gjaldt i hvert trinn, og om noen policyhåndhevelseshandlinger fant sted. Denne bevisinnsamlingen skjer automatisk fordi den er innebygd i håndhevelses-hookene, ikke boltet på som et rapporteringslag.

### Modellfleksibilitet uten re-arkitektur

Triggerfish støtter flere LLM-leverandører gjennom LlmProvider-grensesnittet: Anthropic, OpenAI, Google, lokale modeller via Ollama og OpenRouter for enhver rutet modell. Leverandørvalg er per-agent konfigurerbart med automatisk failover. Når en bedre modell blir tilgjengelig eller en leverandør endrer prissetting, skjer byttet på konfigurasjonsnivå uten å røre workflowdefinisjonene.

Dette adresserer direkte problemet med "prosjektet er utdatert før det leveres". Workflowdefinisjonene beskriver hva AI-en skal gjøre, ikke hvilken modell som gjør det. Å bytte fra GPT-4 til Claude til en finjustert lokal modell endrer én konfigurasjonsverdi. Arbeidsflyten, sikkerhetskontrollene, revisjonssporene og integrasjonspunktene forblir nøyaktig de samme.

### Cron, webhooks og hendelsesdrevet kjøring

AI-arbeidsflyter som kjøres etter plan eller som respons på hendelser, trenger ikke at et menneske starter dem. Planleggeren støtter fem-felts cron-uttrykk for tilbakevendende arbeidsflyter og webhook-endepunkter for hendelsesdrevne triggere. En daglig rapportgenereringsarbeidsflyt kjøres kl. 6. En dokumentklassifiseringsarbeidsflyt avfyres når en ny fil ankommer via webhook. En sentimentanalysarbeidsflyt utløses på hvert nye støttehenvendelse.

Hver planlagt eller hendelsesutløst kjøring starter en isolert sesjon med frisk taint. Arbeidsflyten kjøres i sin egen sikkerhetskontekst, uavhengig av enhver interaktiv sesjon. Hvis den cron-utløste arbeidsflyten aksesserer CONFIDENTIAL-data, er det bare den kjøringens historikk som klassifiseres som CONFIDENTIAL. Andre planlagte arbeidsflyter som kjøres ved PUBLIC-klassifisering, påvirkes ikke.

### Feilhåndtering og menneske-i-løkken

Produksjons-AI-arbeidsflyter må håndtere feil på en elegant måte. Workflow-DSL-en støtter `raise` for eksplisitte feiltilstander og try/catch-semantikk gjennom feilhåndtering i oppgavedefinisjoner. Når en LLM-subagent produserer lavtillitsoutput eller støter på en situasjon den ikke kan håndtere, kan arbeidsflyten rute til en menneskelig godkjenningskø, sende en varsling gjennom varslingstjenesten eller ta en reservehandling.

Varslingstjenesten leverer varsler på tvers av alle tilkoblede kanaler med prioritet og deduplicering. Hvis en arbeidsflyt trenger menneskelig godkjenning før en AI-generert kontraktsendring sendes, kan godkjenningsforespørselen ankomme på Slack, WhatsApp, e-post eller der godkjenneren befinner seg. Arbeidsflyten settes på pause til godkjenningen kommer inn, og fortsetter deretter fra der den slapp.

## Slik ser det ut i praksis

En juridisk avdeling ønsker å automatisere kontraktgjennomgang. Den tradisjonelle tilnærmingen: seks måneder med tilpasset utvikling for å bygge en pipeline som ekstraherer klausuler fra opplastede kontrakter, klassifiserer risikonivåer, flaggepunkter for ikke-standardvilkår og genererer et sammendrag for den gjennomgående advokaten. Prosjektet krever et dedikert ingeniørteam, en tilpasset sikkerhetsgjennomgang, en samsvarsgodkjenning og løpende vedlikehold.

Med Triggerfish tar workflowdefinisjonen en dag å skrive. Opplasting utløser en webhook. En LLM-subagent leser kontrakten, ekstraherer nøkkelklausuler, klassifiserer risikonivåer og identifiserer ikke-standardvilkår. Et valideringstrinn sjekker ekstraksjonen mot firmaets klausulbibliotek lagret i minne. Sammendraget rutes til den tilordnede advokatens varslingskanal. Hele pipelinen kjøres ved RESTRICTED-klassifisering fordi kontrakter inneholder klientprivilegert informasjon, og write-down-forebygging sikrer at ingen kontraktsdata lekker til en kanal under RESTRICTED.

Når firmaet bytter LLM-leverandør (fordi en ny modell håndterer juridisk språk bedre, eller fordi den nåværende leverandøren hever prisene), er endringen én linje i konfigurasjonen. Workflowdefinisjonen, sikkerhetskontrollene, revisjonssporet og varslingsrutingen fortsetter å fungere uten modifikasjon. Når firmaet legger til en ny klausultype i rammeverket for risiko, plukker LLM-subagenten det opp uten å omskrive eksraksjonsregler fordi den leser for mening, ikke mønstre.

Samsvarsteamet får et komplett revisjonsspor fra dag én. Hver kontrakt behandlet, hver klausul ekstrahert, hvert risikonivå tildelt, hvert varsel sendt og hvert advokattgodkjenning registrert, med full lineage tilbake til kildedokumentet. Bevisinnsamlingen som ville tatt uker med tilpasset rapporteringsarbeid, eksisterer automatisk som en strukturell egenskap ved plattformen.
