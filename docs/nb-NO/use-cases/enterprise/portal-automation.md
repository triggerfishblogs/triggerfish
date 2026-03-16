---
title: Tredjeparts portalautomatisering
description: Hvordan Triggerfish automatiserer interaksjoner med leverandørportaler, offentlige nettsteder og betalersystemer uten å bryte ned når UI-en endres.
---

# UI-avhengig automatisering mot tredjeparts portaler

Enhver enterprise har en liste over portaler som ansatte logger inn på manuelt, hver dag, for å gjøre arbeid som burde vært automatisert, men ikke er det. Leverandørportaler for å sjekke ordrestatus. Offentlige nettsteder for å sende inn regulatoriske innleveringer. Forsikringsbetalerportaler for å bekrefte berettigelse og sjekke kravstatus. Statlige lisensnemnder for verifisering av legitimasjon. Skattemyndigheters portaler for samsvarsinnleveringer.

Disse portalene har ikke API-er. Eller de har API-er som er udokumenterte, hastighetsbegrenset eller begrenset til "foretrukne partnere" som betaler for tilgang. Dataene befinner seg bak en innloggingsside, gjengitt i HTML, og den eneste måten å hente dem ut på er å logge inn og navigere i UI-en.

Tradisjonell automatisering bruker nettleser-skript. Selenium-, Playwright- eller Puppeteer-skript som logger inn, navigerer til riktig side, finner elementer ved CSS-selektor eller XPath, ekstraherer dataene og logger ut. Disse skriptene fungerer inntil de ikke gjør det. En portalredesign endrer CSS-klassenavnene. Et nytt CAPTCHA legges til påloggingsflyten. Navigasjonsmenyen flyttes fra en sidepanel til en hamburgermeny. Et informasjonskapsel-samtykkebanner begynner å dekke send-knappen. Skriptet feiler lydløst, og ingen vet om det før den nedstrøms prosessen som er avhengig av dataene begynner å produsere feil.

Statlige medisinske nemnder er et spesielt brutalt eksempel. Det er femti av dem, hver med et annet nettsted, annet oppsett, annen autentiseringsmetode og annet dataformat. De redesigner på sine egne planer uten varsel. En legitimasjonsverifiseringstjeneste som er avhengig av å skrape disse nettstedene, kan ha fem eller ti av femti skript som er ødelagte på et gitt tidspunkt, hvert av dem krever at en utvikler inspiserer det nye oppsettet og omskriver selektorene.

## Hvordan Triggerfish løser dette

Triggerfish sin nettleserautomatisering kombinerer CDP-kontrollert Chromium med LLM-basert visuell navigasjon. Agenten ser siden som gjengitte piksler og tilgjengelighetssnapshots, ikke som et DOM-tre. Den identifiserer elementer basert på hva de ser ut som og hva de gjør, ikke basert på CSS-klassenavnene. Når en portal redesignes, tilpasser agenten seg fordi påloggingsskjemaer fortsatt ser ut som påloggingsskjemaer, navigasjonsmenyer fortsatt ser ut som navigasjonsmenyer og datatabeller fortsatt ser ut som datatabeller.

### Visuell navigasjon i stedet for selektorskript

Nettleserautomatiseringsverktøyene fungerer gjennom sju operasjoner: navigate, snapshot, click, type, select, scroll og wait. Agenten navigerer til en URL, tar et snapshot av den gjengitte siden, resonerer om hva den ser, og bestemmer hvilken handling som skal tas. Det finnes ikke noe `evaluate`-verktøy som kjører vilkårlig JavaScript i sidekonteksten. Dette er en bevisst sikkerhetsbeslutning. Agenten samhandler med siden slik et menneske ville — gjennom UI-en — og kan ikke kjøre kode som kan utnyttes av en ondsinnet side.

Når agenten møter et påloggingsskjema, identifiserer den brukernavnfeltet, passordfeltet og send-knappen basert på visuelt oppsett, plassholdertekst, etiketter og sidestruktur. Den trenger ikke å vite at brukernavnfeltet har `id="auth-input-email"` eller `class="login-form__email-field"`. Når disse identifikatorene endres i en redesign, merker ikke agenten det fordi den aldri stolte på dem.

### Delt domene-sikkerhetskonfigurasjon

Nettlesernavigasjon deler den samme domene-sikkerhetskonfigurasjonen som web-fetch-operasjoner. En enkelt konfigurasjonblokk i `triggerfish.yaml` definerer SSRF-nekterlister, domene-tillatt-lister, domene-nekterlister og domene-til-klassifisering-tilordninger. Når agenten navigerer til en leverandørportal klassifisert som CONFIDENTIAL, eskalerer sesjons-tainet automatisk til CONFIDENTIAL, og alle etterfølgende handlinger i den arbeidsflyten er underlagt CONFIDENTIAL-nivå-restriksjoner.

SSRF-nekterlisten er hardkodet og kan ikke overstyres. Private IP-adresseområder, link-lokale adresser og sky-metadata-endepunkter er alltid blokkert. DNS-resolusjon sjekkes før forespørselen, og forhindrer DNS-rebinding-angrep. Dette er viktig fordi nettleserautomatisering er den høyeste risiko-angrepsflaten i ethvert agentsystem. En ondsinnet side som prøver å omdirigere agenten til en intern tjeneste, blir blokkert før forespørselen forlater systemet.

### Nettleserprofilmerking

Hver agent opprettholder sin egen nettleserprofil, som akkumulerer informasjonskapsler, lokal lagring og sesjonsdata etter hvert som den samhandler med portaler over tid. Profilen bærer et klassifiseringsmerke som registrerer det høyeste klassifiseringsnivået den har blitt brukt på. Dette merket kan bare eskalere, aldri reduseres.

Hvis en agent bruker nettleserprofilen sin til å logge inn på en CONFIDENTIAL leverandørportal, er profilen merket som CONFIDENTIAL. En etterfølgende sesjon som kjører på PUBLIC-klassifisering, kan ikke bruke den profilen, og forhindrer datalekkasje gjennom bufrede legitimasjoner, informasjonskapsler eller sesjonstokens som kan inneholde sensitiv informasjon. Profilisolasjonen er per-agent, og merkehåndhevelse er automatisk.

Dette løser et subtilt, men viktig problem i portalautomatisering. Nettleserprofiler akkumulerer tilstand som gjenspeiler dataene de har aksessert. Uten merking kan en profil som logget inn på en sensitiv portal, lekke informasjon gjennom autofullstendige forslag, bufrede sidedata eller vedvarende informasjonskapsler til en lavere klassifisert sesjon.

### Legitimasjonshåndtering

Portallegitimasjon lagres i OS-nøkkelringen (personlig nivå) eller enterprise-vault (enterprise-nivå), aldri i konfigurasjonsfiler eller miljøvariabler. SECRET_ACCESS-hooken logger hvert legitimasjonsoppslag. Legitimasjon løses opp på kjøringstidspunktet av workflow-motoren og injiseres i nettlesersesjoner gjennom skrivegrensesnittet, ikke ved å sette skjemaverdier programmatisk. Dette betyr at legitimasjon flommer gjennom det samme sikkerhetslaget som alle andre sensitive operasjoner.

### Motstandsdyktighet mot vanlige portalendringer

Her er hva som skjer når vanlige portalendringer oppstår:

**Redesign av innloggingsside.** Agenten tar et nytt snapshot, identifiserer det oppdaterte oppsettet og finner skjemafeltene via visuell kontekst. Med mindre portalen byttet til en helt annen autentiseringsmetode (SAML, OAuth, maskinvaretoken), fortsetter innloggingen å fungere uten noen konfigurasjonendring.

**Navigasjonsomstrukturering.** Agenten leser siden etter innlogging og navigerer til målseksjonen basert på lenketekst, menyetiketter og sideoverskrifter i stedet for URL-mønstre. Hvis leverandørportalen flyttet "Order Status" fra venstre sidepanel til en toppnavigasjonsdropdown, finner agenten den der.

**Nytt informasjonskapsel-samtykkebanner.** Agenten ser banneret, identifiserer godta/avvis-knappen, klikker på den og fortsetter med den opprinnelige oppgaven. Dette håndteres av LLM-ens generelle sideforståelse, ikke av en spesiell informasjonskapsel-håndterer.

**Lagt til CAPTCHA.** Dette er der tilnærmingen har ærlige begrensninger. Enkle bilde-CAPTCHA-er kan være løsbare avhengig av LLM-ens synsevner, men reCAPTCHA v3 og lignende atferdsanalysesystemer kan blokkere automatiserte nettlesere. Arbeidsflyten ruter disse til en menneskelig intervensjonskø i stedet for å feile lydløst.

**Flerfaktorautentiserings-forespørsler.** Hvis portalen begynner å kreve MFA som ikke tidligere var nødvendig, oppdager agenten den uventede siden, rapporterer situasjonen gjennom varslingssystemet og setter arbeidsflyten på pause til et menneske fullfører MFA-trinnet. Arbeidsflyten kan konfigureres til å vente på MFA-fullføringen og deretter fortsette fra der den slapp.

### Batchbehandling på tvers av flere portaler

Workflow-motorens `for`-løkkestøtte betyr at én enkelt arbeidsflyt kan iterere på tvers av flere portalmål. En legitimasjonsverifiseringstjeneste kan definere en arbeidsflyt som sjekker lisensstatus på tvers av alle femti statlige medisinske nemnder i én batch-kjøring. Hvert portalinteraksjon kjøres som et separat deltrinn med sin egen nettlesersesjon, sin egen klassifiseringssporing og sin egen feilhåndtering. Hvis tre av femti portaler feiler, fullfører arbeidsflyten de andre førtisju og ruter de tre feilene til en gjennomgangskø med detaljert feilkontekst.

## Slik ser det ut i praksis

En godkjenningsorganisasjon verifiserer helsefagarbeider-lisenser på tvers av statlige medisinske nemnder som en del av leverandørregistreringsprosessen. Tradisjonelt logger verifiseringsassistenter manuelt inn på hvert nemnds nettsted, søker etter leverandøren, tar screenshot av lisensstatus og registrerer dataene i godkjenningssystemet. Hver verifisering tar fem til femten minutter, og organisasjonen behandler hundrevis per uke.

Med Triggerfish håndterer én arbeidsflyt den komplette verifiseringssyklusen. Arbeidsflyten mottar en batch med leverandører med lisensnumrene og målstatene sine. For hver leverandør navigerer nettleserautomatiseringen til den relevante statlige nemndsportalen, logger inn med lagrede legitimasjoner, søker etter leverandøren, ekstraherer lisensstatusens og utløpsdato, og lagrer resultatet. De ekstraherte dataene klassifiseres som CONFIDENTIAL fordi de inneholder leverandørens PII, og write-down-reglene hindrer at de sendes til noen kanal under det klassifiseringsnivået.

Når en statlig nemnd redesigner portalen sin, tilpasser agenten seg ved neste verifiseringsforsøk. Når en nemnd legger til et CAPTCHA som blokkerer automatisert tilgang, flagger arbeidsflyten den staten for manuell verifisering og fortsetter å behandle resten av batchen. Verifiseringsassistentene skifter fra å gjøre alle verifiseringer manuelt til bare å håndtere unntakene som automatiseringen ikke kan løse.
