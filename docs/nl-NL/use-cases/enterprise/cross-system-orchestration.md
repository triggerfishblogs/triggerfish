---
title: Cross-systeemorkestrtatie
description: Hoe Triggerfish workflows afhandelt die 12+ systemen omspannen met contextuele beslissingen bij elke stap, zonder de breekbaarheid die traditionele automatisering fataal wordt.
---

# Cross-systeemorkestrtatie met contextuele beslissingen

Een typische procure-to-payworkflow raakt een dozijn systemen. Een inkoopverzoek begint in één platform, wordt doorgestuurd naar een goedkeuringsreeks in een ander, activeert een leveranciersopzoeking in een derde, maakt een inkooporder aan in een vierde, start een ontvangstproces in een vijfde, matcht facturen in een zesde, plant betaling in een zevende en registreert alles in een achtste. Elk systeem heeft zijn eigen API, zijn eigen updateschema, zijn eigen authenticatiemodel en zijn eigen manieren van falen.

Traditionele automatisering handelt dit af met rigide pijplijnen. Stap één roept API A aan, parseert de reactie, geeft een veld door aan stap twee, die API B aanroept. Het werkt totdat het niet meer werkt. Een leveranciersrecord heeft een iets ander formaat dan verwacht. Een goedkeuring komt terug met een statuscode waarvoor de pijplijn niet is ontworpen. Een nieuw verplicht veld verschijnt in een API-update. Één kapotte stap breekt de hele keten, en niemand weet het totdat een downstream-proces dagen later mislukt.

Het diepere probleem is niet technische breekbaarheid. Het is dat echte bedrijfsprocessen oordeel vereisen. Moet deze factuurdiscrepantie worden geëscaleerd of automatisch worden opgelost? Rechtvaardigt het patroon van te late leveringen van deze leverancier een contractbeoordeling? Is dit goedkeuringsverzoek dringend genoeg om de standaardroutering over te slaan? Deze beslissingen leven momenteel in de hoofden van mensen, wat betekent dat de automatisering alleen het happy path aankan.

## Hoe Triggerfish dit oplost

De workflowengine van Triggerfish voert YAML-gebaseerde workflowdefinities uit die deterministische automatisering combineren met AI-redeneren in één pijplijn. Elke stap in de workflow doorloopt dezelfde beveiligingshandhavingslaag die alle Triggerfish-operaties bestuurt, zodat classificatietracking en audittrails over de hele keten standhouden ongeacht hoeveel systemen betrokken zijn.

### Deterministische stappen voor deterministisch werk

Wanneer een workflowstap een bekende invoer en een bekende uitvoer heeft, wordt deze uitgevoerd als een standaard HTTP-aanroep, shellcommando of MCP-toolaanroep. Geen LLM-betrokkenheid, geen latentiestraf, geen inferentiekosten. De workflowengine ondersteunt `call: http` voor REST API's, `call: triggerfish:mcp` voor elke verbonden MCP-server en `run: shell` voor commandoregeltools. Deze stappen worden precies uitgevoerd zoals traditionele automatisering, want voor voorspelbaar werk is traditionele automatisering de juiste aanpak.

### LLM-subagenten voor contextuele beslissingen

Wanneer een workflowstap contextueel redeneren vereist, spawnt de engine een echte LLM-subagentsessie met `call: triggerfish:llm`. Dit is geen enkele prompt/antwoord-uitwisseling. De subagent heeft toegang tot elke tool die in Triggerfish is geregistreerd, inclusief webzoekopdrachten, geheugen, browserautomatisering en alle verbonden integraties. Hij kan documenten lezen, databases bevragen, records vergelijken en een beslissing nemen op basis van alles wat hij vindt.

De uitvoer van de subagent gaat rechtstreeks naar de volgende workflowstap. Als hij geclassificeerde gegevens heeft benaderd tijdens zijn redeneren, escaleert de sessietaint automatisch en plant zich terug naar de bovenliggende workflow. De workflowengine houdt dit bij, zodat een workflow die begon bij PUBLIC maar CONFIDENTIAL-gegevens raakte tijdens een contextuele beslissing zijn volledige uitvoeringsgeschiedenis opslaat op het CONFIDENTIAL-niveau. Een lager-geclassificeerde sessie kan niet eens zien dat de workflow is uitgevoerd.

### Conditionele vertakking op basis van echte context

De workflow-DSL ondersteunt `switch`-blokken voor conditionele routering, `for`-lussen voor batchverwerking en `set`-bewerkingen voor het bijwerken van de workflowstatus. Gecombineerd met LLM-subagent-stappen die complexe condities kunnen evalueren, betekent dit dat de workflow kan vertakken op basis van werkelijke bedrijfscontext in plaats van alleen veldwaarden.

Een inkoopworkflow kan anders routeren op basis van de risicobeoordeling van de leverancier door de subagent. Een onboardingworkflow kan stappen overslaan die niet relevant zijn voor een bepaalde rol. Een incidentresponseworkflow kan escalen naar verschillende teams op basis van de oorzaakanalyse van de subagent. De vertakkingslogica leeft in de workflowdefinitie, maar de beslissingsinputs komen van AI-redeneren.

### Zelfherstellend bij systeemwijzigingen

Wanneer een deterministische stap mislukt omdat een API zijn responsformaat heeft gewijzigd of een systeem een onverwachte fout heeft geretourneerd, stopt de workflow niet zomaar. De engine kan de mislukte stap delegeren aan een LLM-subagent die de fout leest, de reactie inspecteert en een alternatieve aanpak probeert. Een API die een nieuw verplicht veld heeft toegevoegd, wordt afgehandeld door de subagent die het foutbericht leest en het verzoek aanpast. Een systeem dat zijn authenticatiestroom heeft gewijzigd, wordt genavigeerd door de browserautomatiseringstools.

Dit betekent niet dat elke mislukking magisch wordt opgelost. Maar het betekent dat de workflow netjes degradeert in plaats van stil te falen. De subagent vindt ofwel een weg vooruit of produceert een duidelijke uitleg van wat er is veranderd en waarom handmatige interventie nodig is, in plaats van een cryptische foutcode begraven in een logbestand dat niemand controleert.

### Beveiliging over de hele keten

Elke stap in een Triggerfish-workflow doorloopt dezelfde beleidshandhavingshooks als elke directe toolaanroep. PRE_TOOL_CALL valideert machtigingen en controleert snelheidslimieten vóór uitvoering. POST_TOOL_RESPONSE classificeert de geretourneerde gegevens en werkt de sessietaint bij. PRE_OUTPUT zorgt ervoor dat niets het systeem verlaat op een classificatieniveau dat hoger is dan de doelstelling toestaat.

Dit betekent dat een workflow die leest uit uw CRM (CONFIDENTIAL), de gegevens verwerkt via een LLM en een samenvatting naar Slack stuurt, niet per ongeluk vertrouwelijke details in een openbaar kanaal lekt. De write-downpreventieregel vangt dit op bij de PRE_OUTPUT-hook, ongeacht hoeveel tussenliggende stappen de gegevens zijn doorgegaan. De classificatie reist mee met de gegevens door de hele workflow.

De workflowdefinitie zelf kan een `classification_ceiling` instellen dat voorkomt dat de workflow ooit gegevens boven een opgegeven niveau raakt. Een wekelijkse samenvattingsworkflow die op INTERNAL is geclassificeerd, heeft geen toegang tot CONFIDENTIAL-gegevens, zelfs als hij de inloggegevens heeft om dat te doen. Het plafond wordt afgedwongen in code, niet door erop te vertrouwen dat het LLM een promptinstructie respecteert.

### Cron- en webhooktriggers

Workflows vereisen niet dat iemand ze handmatig start. De planner ondersteunt cron-gebaseerde triggers voor terugkerende workflows en webhooktriggers voor gebeurtenisgestuurde uitvoering. Een ochtendbriefieworkflow wordt om 7 uur uitgevoerd. Een PR-reviewworkflow wordt geactiveerd wanneer GitHub een webhook stuurt. Een factuurverwerkingsworkflow wordt gestart wanneer een nieuw bestand verschijnt op een gedeeld station.

Webhookgebeurtenissen dragen hun eigen classificatieniveau. Een GitHub-webhook voor een privérepository wordt automatisch geclassificeerd als CONFIDENTIAL op basis van de domeinclassificatietoewijzingen in de beveiligingsconfiguratie. De workflow erft die classificatie en alle downstream-handhaving is van toepassing.

## Hoe dit er in de praktijk uitziet

Een middelgroot bedrijf dat procure-to-pay uitvoert via NetSuite, Coupa, DocuSign en Slack definieert een Triggerfish-workflow die de volledige cyclus afhandelt. Deterministische stappen verwerken de API-aanroepen om inkooporders te maken, goedkeuringen te routeren en facturen te matchen. LLM-subagent-stappen verwerken de uitzonderingen: facturen met regelitems die niet overeenkomen met de PO, leveranciers die documentatie in een onverwacht formaat hebben ingediend, goedkeuringsverzoeken die context nodig hebben over de geschiedenis van de aanvrager.

De workflow wordt uitgevoerd op een zelf-gehoste Triggerfish-instantie. Er verlaat geen gegevens de infrastructuur van het bedrijf. Het classificatiesysteem zorgt ervoor dat financiële gegevens van NetSuite op CONFIDENTIAL blijven en niet naar een Slack-kanaal geclassificeerd als INTERNAL kunnen worden gestuurd. De audittrail legt elke beslissing vast die de LLM-subagent heeft genomen, elke tool die hij heeft aangeroepen en elk gegevensstuk dat hij heeft benaderd, opgeslagen met volledige lineage-tracking voor nalevingsbeoordeling.

Wanneer Coupa zijn API bijwerkt en een veldnaam wijzigt, mislukt de deterministische HTTP-stap van de workflow. De engine delegeert naar een subagent die de fout leest, het gewijzigde veld identificeert en het opnieuw probeert met de juiste parameter. De workflow wordt voltooid zonder menselijke tussenkomst, en het incident wordt geregistreerd zodat een engineer de workflowdefinitie kan bijwerken om het nieuwe formaat in de toekomst te verwerken.
