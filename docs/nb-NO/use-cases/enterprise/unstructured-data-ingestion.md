---
title: Ustrukturert dataingest
description: Hvordan Triggerfish håndterer fakturabehandling, dokumentmottak og e-postparsing uten å bryte ned når inndataformater endres.
---

# Ingest av ustrukturerte og semi-strukturerte data

Fakturabehandling burde vært et løst problem innen nå. Et dokument ankommer, felt ekstraheres, data valideres mot eksisterende poster, og resultatet rutes til riktig system. Virkeligheten er at fakturabehandling alene koster enterprise-virksomheter milliarder i manuelt arbeid hvert år, og automatiseringsprosjektene som skulle fikse det, bryter stadig ned.

Årsaken er formatvariasjon. Fakturaer ankommer som PDF-er, e-postvedlegg, skannede bilder, regnearkeksporter og av og til fakser. Hver leverandør bruker et annet oppsett. Linjeposer vises i tabeller, i fritekst eller en kombinasjon av begge. Skatteberegninger følger ulike regler etter jurisdiksjon. Valutaformater varierer. Datoformater varierer. Til og med den samme leverandøren endrer fakturamalene sine uten varsel.

Tradisjonell RPA håndterer dette med malmatching. Definer koordinatene der fakturanummeret vises, der linjepostene starter, der totalen befinner seg. Det fungerer for én leverandørs gjeldende mal. Så oppdaterer leverandøren systemet sitt, forskyver en kolonne, legger til en overskriftsrad eller endrer PDF-generatoren sin, og boten feiler enten fullstendig eller ekstraherer søppeldata som forplanter seg nedstrøms til noen fanger det manuelt.

Det samme mønsteret gjentar seg på tvers av alle ustrukturerte data-arbeidsflyter. Forsikrings-EOB-behandling bryter ned når en betaler endrer skjemaoppsettet sitt. Mottaket av forhåndsgodkjenning bryter ned når en ny dokumenttype legges til prosessen. E-postparsing av kunder bryter ned når noen bruker et litt annet emnelinjeformat. Vedlikeholdskostnadene for å holde disse automatiseringene i gang overstiger ofte kostnadene ved å gjøre arbeidet manuelt.

## Hvordan Triggerfish løser dette

Triggerfish erstatter posisjonsbasert feltekstraksjon med LLM-basert dokumentforståelse. AI-en leser dokumentet slik et menneske ville: forstår kontekst, utleder relasjoner mellom felt og tilpasser seg automatisk til layoutendringer. Kombinert med workflow-motoren for pipeline-orkestrering og klassifiseringssystemet for datasikkerhet, skaper dette ingest-pipelines som ikke bryter ned når verden endrer seg.

### LLM-drevet dokumentparsing

Når et dokument går inn i en Triggerfish-arbeidsflyt, leser en LLM-subagent hele dokumentet og ekstraherer strukturerte data basert på hva dokumentet betyr, ikke hvor bestemte piksler befinner seg. Et fakturanummer er et fakturanummer enten det er i øvre høyre hjørne merket "Invoice #" eller midt på siden merket "Factura No." eller innebygd i et avsnitt med tekst. LLM-en forstår at "Net 30" betyr betalingsbetingelser, at "Qty" og "Quantity" og "Units" betyr det samme, og at en tabell med kolonner for beskrivelse, sats og beløp er en liste med linjeposer uavhengig av kolonneordren.

Dette er ikke en generisk "send dokumentet til ChatGPT og håp på det beste"-tilnærming. Workflowdefinisjonen spesifiserer nøyaktig hvilken strukturert output LLM-en skal produsere, hvilke valideringsregler som gjelder, og hva som skjer når ekstraksjons-tilliten er lav. Subagentens oppgavebeskrivelse definerer forventet skjema, og workflowens etterfølgende trinn validerer de ekstraherte dataene mot forretningsregler før de går inn i noe nedstrøms system.

### Nettleserautomatisering for dokumenthenting

Mange dokumentingest-arbeidsflyter starter med å skaffe selve dokumentet. Forsikrings-EOB-er finnes i betalerportaler. Leverandørfakturaer finnes i leverandørplattformer. Offentlige skjemaer finnes på statlige nettstedskjemaer. Tradisjonell automatisering bruker Selenium-skript eller API-kall for å hente disse dokumentene, og de skriptene bryter ned når portalen endres.

Triggerfish sin nettleserautomatisering bruker CDP-kontrollert Chromium med en LLM som leser sidesnappshot for å navigere. Agenten ser siden slik et menneske gjør og klikker, skriver og ruller basert på hva den ser i stedet for hardkodede CSS-selektorer. Når en betalerportal redesigner påloggingssiden sin, tilpasser agenten seg fordi den fortsatt kan identifisere brukernavnfeltet, passordfeltet og send-knappen fra visuell kontekst. Når en navigasjonsmeny endres, finner agenten den nye veien til dokumentnedlastingsseksjonen.

Dette er ikke perfekt pålitelig. CAPTCHA-er, flerfaktorautentiseringsflyter og sterkt JavaScript-avhengige portaler forårsaker fortsatt problemer. Men feilmoden er fundamentalt forskjellig fra tradisjonelle skript. Et Selenium-skript feiler lydløst når en CSS-selektor slutter å matche. En Triggerfish-agent rapporterer hva den ser, hva den prøvde og hvor den satt fast, og gir operatøren nok kontekst til å gripe inn eller justere arbeidsflyten.

### Klassifiseringsutlukt behandling

Dokumenter bærer ulike følsomhetsnivåer, og klassifiseringssystemet håndterer dette automatisk. En faktura som inneholder prisvilkår kan være CONFIDENTIAL. Et offentlig RFP-svar kan være INTERNAL. Et dokument som inneholder PHI er RESTRICTED. Når LLM-subagenten leser et dokument og ekstraherer data, klassifiserer POST_TOOL_RESPONSE-hooken det ekstraherte innholdet, og sesjons-tainet eskalerer tilsvarende.

Dette er viktig for nedstrøms ruting. Ekstraherte fakturedata klassifisert som CONFIDENTIAL kan ikke sendes til en Slack-kanal klassifisert som PUBLIC. En arbeidsflyt som behandler forsikringsdokumenter som inneholder PHI, begrenser automatisk hvor de ekstraherte dataene kan flyte. Write-down-forebyggingsregelen håndhever dette ved hvert grensesnitt, og LLM-en har ingen autoritet til å overstyre det.

For helse- og finanstjenester spesifikt betyr dette at samsvarsomkostningene ved automatisert dokumentbehandling faller dramatisk. I stedet for å bygge tilpassede tilgangskontroller i hvert trinn av hver pipeline, håndteres det jevnt av klassifiseringssystemet. En revisor kan spore nøyaktig hvilke dokumenter som ble behandlet, hvilke data som ble ekstrahert, hvor de ble sendt, og bekrefte at ingen data flommet til et upassende mål – alt fra lineage-postene som opprettes automatisk i hvert trinn.

### Selvhelbredende formattilpasning

Når en leverandør endrer fakturamal, bryter tradisjonell automatisering ned og forblir ødelagt til noen manuelt oppdaterer eksraksjonsreglene. I Triggerfish tilpasser LLM-subagenten seg ved neste kjøring. Den finner fortsatt fakturanummeret, linjepostene og totalen, fordi den leser for mening i stedet for posisjon. Ekstraksjonen lykkes, dataene valideres mot de samme forretningsreglene, og arbeidsflyten fullføres.

Over tid kan agenten bruke krysssesjonsminne til å lære mønstre. Hvis leverandør A alltid inkluderer et restocking-gebyr som andre leverandører ikke gjør, husker agenten det fra tidligere eksraksjoner og vet å se etter det. Hvis en bestemt betalers EOB-format alltid plasserer justeringskodene på et uvanlig sted, gjør agentens minne om tidligere vellykkede eksraksjoner fremtidige mer pålitelige.

Når en formatendring er betydelig nok til at LLM-ens ekstraksjonstillit faller under terskelen definert i arbeidsflyten, ruter arbeidsflyten dokumentet til en menneskelig gjennomgangskø i stedet for å gjette. Menneskets korreksjoner mates tilbake gjennom arbeidsflyten, og agentens minne lagrer det nye mønsteret for fremtidig referanse. Systemet blir smartere over tid uten at noen omskriver eksraksjonsregler.

### Pipeline-orkestrering

Dokumentingest er sjelden bare "ekstraher og lagre". En komplett pipeline henter dokumentet, ekstraherer strukturerte data, validerer dem mot eksisterende poster, beriker dem med data fra andre systemer, ruter unntak for menneskelig gjennomgang og laster de validerte dataene inn i målsystemet. Workflow-motoren håndterer alt dette i én enkelt YAML-definisjon.

En forhåndsgodkjenningspipeline for helsevesen kan se slik ut: nettleserautomatisering henter faksbildet fra leverandørportalen, en LLM-subagent ekstraherer pasientidentifikatorer og prosedyrekoder, et HTTP-kall validerer pasienten mot EHR, en annen subagent vurderer om godkjenningen oppfyller medisinske nødvendighetskriterier basert på den kliniske dokumentasjonen, og resultatet rutes enten til automatisk godkjenning eller til en klinisk gjennomgangskø. Hvert trinn klassifiseringsspores. Hvert PHI-element er taint-merket. Det komplette revisjonssporet eksisterer automatisk.

## Slik ser det ut i praksis

Et regionalt helsesystem behandler forhåndsgodkjenningsforespørsler fra førti forskjellige leverandørkontorer, hvert med sitt eget skjemaoppsett, noen fakset, noen sendt på e-post, noen lastet opp til en portal. Den tradisjonelle tilnærmingen krevde et team på åtte personer til manuelt å gjennomgå og registrere hver forespørsel, fordi intet automatiseringsverktøy kunne håndtere formatvariasjonen pålitelig.

Med Triggerfish håndterer én arbeidsflyt den komplette pipelinen. Nettleserautomatisering eller e-postparsing henter dokumentene. LLM-subagenter ekstraherer strukturerte data uavhengig av format. Valideringstrinn sjekker de ekstraherte dataene mot EHR og formulardatabaser. En klassifiserings-ceiling på RESTRICTED sikrer at PHI aldri forlater pipeline-grensen. Dokumenter som LLM-en ikke kan parse med høy tillit, rutes til en menneskelig gjennomganger, men det volumet synker over tid ettersom agentens minne bygger et bibliotek med formatmønstre.

Teamet på åtte blir to personer som håndterer unntakene som systemet flagger, pluss periodiske kvalitetsrevisjoner av de automatiserte ekstraksjonsresultatene. Formatendringer fra leverandørkontorer absorberes automatisk. Nye skjemaoppsett håndteres ved første møte. Vedlikeholdskostnadene som forbrukte det meste av det tradisjonelle automatiseringsbudsjettet, faller til nær null.
