---
title: Automatisering van externe portalen
description: Hoe Triggerfish interacties met leveranciersportalen, overheidssites en betalerssystemen automatiseert zonder te breken als de UI verandert.
---

# UI-afhankelijke automatisering tegen externe portalen

Elke onderneming heeft een lijst van portalen waar medewerkers dagelijks handmatig op inloggen om werk te doen dat geautomatiseerd zou moeten zijn maar dat niet is. Leveranciersportalen voor het controleren van de orderstatus. Overheidssites voor het indienen van regelgevende documenten. Verzekeringsbetalersportalen voor het verifiëren van dekking en het controleren van claimstatus. Staatslicentieraden voor credentiëringverificatie. Portalen van belastingdiensten voor nalevingsaangiftes.

Deze portalen hebben geen API's. Of ze hebben API's die ongedocumenteerd zijn, snelheidsgelimiteerd of beperkt zijn tot "voorkeurpartners" die voor toegang betalen. De gegevens staan achter een inlogpagina, weergegeven in HTML, en de enige manier om ze eruit te halen is inloggen en de UI navigeren.

Traditionele automatisering gebruikt browserscripts. Selenium-, Playwright- of Puppeteer-scripts die inloggen, naar de juiste pagina navigeren, elementen vinden via CSS-selector of XPath, de gegevens extraheren en uitloggen. Deze scripts werken totdat ze dat niet meer doen. Een portalherontwerp wijzigt de CSS-klassenamen. Een nieuwe CAPTCHA wordt toegevoegd aan de inlogstroom. Het navigatiemenu verplaatst van een zijbalk naar een hamburgermenuveld. Een cookiebanner begint de verzendknop te bedekken. Het script breekt stil en niemand merkt het totdat het downstream-proces dat afhankelijk is van de gegevens fouten begint te produceren.

Staatsmedische raden zijn een bijzonder wreed voorbeeld. Er zijn er vijftig, elk met een andere website, verschillende lay-outs, verschillende authenticatiemethoden en verschillende gegevensformaten. Ze herontwerpen op hun eigen schema's zonder kennisgeving. Een credentiëlingsverificatieservice die vertrouwt op het scrapen van deze sites kan op elk moment vijf of tien van zijn vijftig scripts gebroken hebben, elk een ontwikkelaar nodig hebbend om de nieuwe lay-out te inspecteren en de selectors te herschrijven.

## Hoe Triggerfish dit oplost

Triggerfish's browserautomatisering combineert CDP-bestuurd Chromium met LLM-gebaseerde visuele navigatie. De agent ziet de pagina als weergegeven pixels en toegankelijkheidssnapshots, niet als een DOM-boom. Hij identificeert elementen op basis van hoe ze eruitzien en wat ze doen, niet op basis van hun CSS-klassenamen. Wanneer een portaal wordt herontworpen, past de agent zich aan omdat inlogformulieren nog steeds eruitzien als inlogformulieren, navigatiemenu's nog steeds eruitzien als navigatiemenu's en datatabellen nog steeds eruitzien als datatabellen.

### Visuele navigatie in plaats van selectorscripts

De browserautomatiseringstools werken via zeven bewerkingen: navigate, snapshot, click, type, select, scroll en wait. De agent navigeert naar een URL, maakt een snapshot van de weergegeven pagina, redeneert over wat hij ziet en beslist welke actie hij moet ondernemen. Er is geen `evaluate`-tool die willekeurige JavaScript in de paginacontext uitvoert. Dit is een bewuste beveiligingsbeslissing. De agent interageert met de pagina op dezelfde manier als een mens zou doen, via de UI, en kan geen code uitvoeren die door een kwaadaardige pagina zou kunnen worden misbruikt.

Wanneer de agent een inlogformulier tegenkomt, identificeert hij het gebruikersnaamveld, het wachtwoordveld en de verzendknop op basis van visuele lay-out, tijdelijke tekst, labels en paginastructuur. Hij hoeft niet te weten dat het gebruikersnaamveld `id="auth-input-email"` of `class="login-form__email-field"` heeft. Wanneer die identificatoren veranderen bij een herontwerp, merkt de agent het niet omdat hij er nooit op heeft vertrouwd.

### Gedeelde domeinbeveiliging

Browsernavigatie deelt dezelfde domeinbeveiligingsconfiguratie als webophaalbewerkingen. Eén configuratieblok in `triggerfish.yaml` definieert SSRF-denylists, domeinallowlists, domeindenylists en domein-naar-classificatietoewijzingen. Wanneer de agent navigeert naar een leveranciersportaal geclassificeerd als CONFIDENTIAL, escaleert de sessietaint automatisch naar CONFIDENTIAL en zijn alle volgende acties in die workflow onderworpen aan CONFIDENTIAL-niveau beperkingen.

De SSRF-denylist is hardgecodeerd en niet-overschrijfbaar. Privé-IP-bereiken, link-local adressen en cloudmetagegevenseindpunten zijn altijd geblokkeerd. DNS-resolutie wordt gecontroleerd vóór het verzoek, waardoor DNS-rebinding-aanvallen worden voorkomen. Dit is van belang omdat browserautomatisering het grootste risicoaanvalsoppervlak is in elk agentsysteem. Een kwaadaardige pagina die de agent probeert te omleiden naar een interne service wordt geblokkeerd voordat het verzoek het systeem verlaat.

### Browserprofiel-watermerking

Elke agent behoudt zijn eigen browserprofiel, dat cookies, lokale opslag en sessiegegevens accumuleert naarmate het in de loop van de tijd met portalen interageert. Het profiel draagt een classificatiewatermerk dat het hoogste classificatieniveau registreert waarop het is gebruikt. Dit watermerk kan alleen escaleren, nooit dalen.

Als een agent zijn browserprofiel gebruikt om in te loggen bij een CONFIDENTIAL-leveranciersportaal, wordt het profiel gemarkeerd als CONFIDENTIAL. Een volgende sessie die op PUBLIC-classificatie draait, kan dat profiel niet gebruiken, waardoor gegevenslekken via gecachede inloggegevens, cookies of sessietokens die gevoelige informatie kunnen bevatten, worden voorkomen. De profielisolatie is per agent en watermerkshandhaving is automatisch.

Dit lost een subtiel maar belangrijk probleem op bij portalautomatisering. Browserprofielen accumuleren staat die de gegevens weerspiegelt die ze hebben benaderd. Zonder watermerking zou een profiel dat heeft ingelogd bij een gevoelig portaal informatie kunnen lekken via autocomplete-suggesties, gecachede paginagegevens of persistente cookies naar een lager-geclassificeerde sessie.

### Referentiebeheer

Portaalinloggegevens worden opgeslagen in de sleutelhanger van het besturingssysteem (persoonlijke laag) of enterprise vault (enterprise laag), nooit in configuratiebestanden of omgevingsvariabelen. De SECRET_ACCESS-hook registreert elke inloggegevensophaling. Inloggegevens worden opgelost tijdens uitvoering door de workflowengine en geïnjecteerd in browsersessies via de typinterface, niet door formulierwaarden programmatisch in te stellen. Dit betekent dat inloggegevens via dezelfde beveiligingslaag stromen als elke andere gevoelige bewerking.

### Veerkracht bij veelvoorkomende portalwijzigingen

Dit is wat er gebeurt als veelvoorkomende portalwijzigingen optreden:

**Herontwerp van inlogpagina.** De agent maakt een nieuwe snapshot, identificeert de bijgewerkte lay-out en vindt de formuliervelden via visuele context. Tenzij het portaal is overgeschakeld op een volledig andere authenticatiemethode (SAML, OAuth, hardwaretoken), blijft de inlog werken zonder enige configuratiewijziging.

**Navigatieherstructurering.** De agent leest de pagina na het inloggen en navigeert naar de doelsectie op basis van linktekst, menulabels en paginakoppen in plaats van URL-patronen. Als het leveranciersportaal "Orderstatus" van de linker zijbalk naar een bovenste navigatiedropdown heeft verplaatst, vindt de agent het daar.

**Nieuwe cookietoestemmingsbanner.** De agent ziet de banner, identificeert de accepteer/sluit-knop, klikt erop en gaat verder met de oorspronkelijke taak. Dit wordt afgehandeld door het algemene paginabegrip van het LLM, niet door een speciale cookie-handler.

**Toegevoegde CAPTCHA.** Dit is waar de aanpak eerlijke beperkingen heeft. Eenvoudige afbeeldings-CAPTCHA's kunnen oplosbaar zijn afhankelijk van de visiecapaciteiten van het LLM, maar reCAPTCHA v3 en vergelijkbare gedragsanalysesystemen kunnen geautomatiseerde browsers blokkeren. De workflow stuurt deze door naar een menselijke interventiewachtrij in plaats van stil te falen.

**Prompts voor meerstapsverificatie.** Als het portaal MFA vereist dat eerder niet vereist was, detecteert de agent de onverwachte pagina, meldt de situatie via het notificatiesysteem en pauzeert de workflow totdat een mens de MFA-stap voltooit. De workflow kan worden geconfigureerd om te wachten op de MFA-voltooiing en vervolgens verder te gaan vanaf waar hij was gebleven.

### Batchverwerking over meerdere portalen

De `for`-lusondersteuning van de workflowengine betekent dat één workflow over meerdere portaaldoelen kan itereren. Een credentiëlingsverificatieservice kan een workflow definiëren die de licentiestatus controleert bij alle vijftig staatsmedische raden in één batchrun. Elke portaalinteractie wordt uitgevoerd als een afzonderlijke substap met zijn eigen browsersessie, zijn eigen classificatietracking en zijn eigen foutafhandeling. Als drie van vijftig portalen mislukken, voltooit de workflow de andere zevenenveertig en stuurt de drie mislukkingen naar een beoordelingswachtrij met gedetailleerde foutcontext.

## Hoe dit er in de praktijk uitziet

Een credentiëlingsorganisatie verifieert licenties van zorgverleners bij staatsmedische raden als onderdeel van het inschrijvingsproces voor zorgverleners. Traditioneel loggen verificatiemedewerkers handmatig in op de website van elke raad, zoeken naar de zorgverlener, maken een screenshot van de licentiestatus en voeren de gegevens in het credentiëleringssysteem in. Elke verificatie duurt vijf tot vijftien minuten en de organisatie verwerkt er honderden per week.

Met Triggerfish verwerkt een workflow de volledige verificatiecyclus. De workflow ontvangt een batch zorgverleners met hun licentienummers en doelstaten. Voor elke zorgverlener navigeert de browserautomatisering naar het relevante staatsraadsportaal, logt in met opgeslagen inloggegevens, zoekt naar de zorgverlener, extraheert de licentiestatus en vervaldatum en slaat het resultaat op. De geëxtraheerde gegevens worden geclassificeerd als CONFIDENTIAL omdat ze PII van de zorgverlener bevatten en de write-downregels voorkomen dat ze naar een kanaal onder dat classificatieniveau worden gestuurd.

Wanneer een staatsraad zijn portaal herontwerpt, past de agent zich aan bij de volgende verificatiepoging. Wanneer een raad een CAPTCHA toevoegt die geautomatiseerde toegang blokkeert, markeert de workflow die staat voor handmatige verificatie en gaat door met het verwerken van de rest van de batch. De verificatiemedewerkers gaan van alle verificaties handmatig uitvoeren naar alleen de uitzonderingen afhandelen die de automatisering niet kan oplossen.
