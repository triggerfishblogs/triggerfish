---
title: Ingestie van ongestructureerde data
description: Hoe Triggerfish factuurverwerking, documentinname en e-mailanalyse afhandelt zonder te breken als invoerformaten veranderen.
---

# Ingestie van ongestructureerde en semi-gestructureerde data

Factuurverwerking zou inmiddels een opgelost probleem moeten zijn. Een document komt binnen, velden worden geëxtraheerd, gegevens worden gevalideerd tegen bestaande records en het resultaat wordt doorgestuurd naar het juiste systeem. De realiteit is dat factuurverwerking alleen al ondernemingen jaarlijks miljarden kost aan handmatige arbeid, en de automatiseringsprojecten die dit moeten oplossen breken voortdurend.

De reden is formaatvariantie. Facturen komen binnen als pdf's, e-mailbijlagen, gescande afbeeldingen, spreadsheetexports en af en toe faxen. Elke leverancier gebruikt een ander lay-out. Regelitems verschijnen in tabellen, in vrije tekst of in een combinatie van beide. Belastingberekeningen volgen verschillende regels per jurisdictie. Valutaformaten variëren. Datumformaten variëren. Zelfs dezelfde leverancier verandert zijn factuurtemplate zonder voorafgaande kennisgeving.

Traditionele RPA verwerkt dit met templatematching. Definieer de coördinaten waar het factuurnummer verschijnt, waar de regelitems beginnen, waar het totaal staat. Het werkt voor het huidige template van één leverancier. Dan werkt de leverancier zijn systeem bij, verschuift een kolom, voegt een koprij toe of wijzigt zijn pdf-generator, en de bot mislukt volledig of extraheert onbruikbare gegevens die downstream verspreiden totdat iemand ze handmatig opmerkt.

Hetzelfde patroon herhaalt zich in elke workflow met ongestructureerde data. Verwerking van verzekeringsEOB's breekt wanneer een betaler zijn formulierlay-out wijzigt. Inname van voorafgaande machtigingen breekt wanneer een nieuw documenttype aan het proces wordt toegevoegd. Analyse van klant-e-mails breekt wanneer iemand een iets ander onderwerpformaat gebruikt. De onderhoudskosten voor het operationeel houden van deze automatiseringen overschrijden vaak de kosten van het handmatig uitvoeren van het werk.

## Hoe Triggerfish dit oplost

Triggerfish vervangt positionele veldextractie door LLM-gebaseerd documentbegrip. De AI leest het document zoals een mens dat zou doen: context begrijpen, relaties tussen velden afleiden en automatisch aanpassen aan lay-outwijzigingen. Gecombineerd met de workflowengine voor pijplijnorkestratie en het classificatiesysteem voor gegevensbeveiliging, creëert dit ingestiepijplijnen die niet breken als de wereld verandert.

### LLM-gestuurde documentanalyse

Wanneer een document een Triggerfish-workflow binnenkomt, leest een LLM-subagent het volledige document en extraheert gestructureerde gegevens op basis van wat het document betekent, niet waar specifieke pixels zijn. Een factuurnummer is een factuurnummer, of het nu in de rechterbovenhoek staat met het label "Invoice #", in het midden van de pagina met het label "Factura No." of ingebed in een alinea tekst. Het LLM begrijpt dat "Net 30" betalingsvoorwaarden betekent, dat "Qty", "Quantity" en "Units" hetzelfde betekenen en dat een tabel met kolommen voor beschrijving, tarief en bedrag een lijst met regelitems is, ongeacht de kolomvolgorde.

Dit is geen generieke aanpak van "stuur het document naar ChatGPT en hoop het beste". De workflowdefinitie specificeert precies welke gestructureerde uitvoer het LLM moet produceren, welke validatieregels van toepassing zijn en wat er gebeurt als de extractiebetrouwbaarheid laag is. De taakomschrijving van de subagent definieert het verwachte schema, en de volgende workflowstappen valideren de geëxtraheerde gegevens tegen bedrijfsregels voordat ze een downstream systeem binnengaan.

### Browserautomatisering voor documentophaling

Veel documentinnameworkflows beginnen met het ophalen van het document. Verzekeringseo's staan in betalersportalen. Leveranciersfacturen staan in leveranciersplatforms. Overheidsformulieren staan op websites van staatsinstellingen. Traditionele automatisering gebruikt Selenium-scripts of API-aanroepen om deze documenten op te halen, en die scripts breken wanneer het portaal verandert.

Triggerfish's browserautomatisering gebruikt CDP-bestuurd Chromium met een LLM dat paginasnapshots leest om te navigeren. De agent ziet de pagina zoals een mens hem ziet en klikt, typt en scrolt op basis van wat hij ziet in plaats van hardgecodeerde CSS-selectors. Wanneer een betalersportaal zijn inlogpagina opnieuw ontwerpt, past de agent zich aan omdat hij nog steeds het gebruikersnaamveld, het wachtwoordveld en de verzendknop kan identificeren vanuit visuele context. Wanneer een navigatiemenu verandert, vindt de agent het nieuwe pad naar de documentdownloadsectie.

Dit is niet volledig betrouwbaar. CAPTCHA's, meerstapsverificatiestromen en zwaar JavaScript-afhankelijke portalen veroorzaken nog steeds problemen. Maar de faalwijze is fundamenteel anders dan bij traditionele scripts. Een Selenium-script faalt stil wanneer een CSS-selector niet meer overeenkomt. Een Triggerfish-agent rapporteert wat hij ziet, wat hij heeft geprobeerd en waar hij vastliep, waardoor de operator voldoende context heeft om in te grijpen of de workflow aan te passen.

### Classificatiegegrendelde verwerking

Documenten hebben verschillende gevoeligheidsniveaus en het classificatiesysteem verwerkt dit automatisch. Een factuur met prijsafspraken kan CONFIDENTIAL zijn. Een openbaar RFP-antwoord kan INTERNAL zijn. Een document met PHI is RESTRICTED. Wanneer de LLM-subagent een document leest en gegevens extraheert, classificeert de POST_TOOL_RESPONSE-hook de geëxtraheerde inhoud en escaleert de sessietaint dienovereenkomstig.

Dit is van belang voor downstream routering. Geëxtraheerde factuurgegevens die zijn geclassificeerd als CONFIDENTIAL kunnen niet naar een Slack-kanaal geclassificeerd als PUBLIC worden gestuurd. Een workflow die verzekeringsdocumenten met PHI verwerkt, beperkt automatisch waar de geëxtraheerde gegevens naartoe kunnen stromen. De write-downpreventieregel handhaaft dit bij elke grens en het LLM heeft geen enkele autoriteit om dit te omzeilen.

Voor gezondheidszorg en financiële dienstverlening specifiek betekent dit dat de complianceoverhead van geautomatiseerde documentverwerking drastisch daalt. In plaats van aangepaste toegangscontroles te bouwen bij elke stap van elke pijplijn, verwerkt het classificatiesysteem dit uniform. Een auditor kan precies traceren welke documenten zijn verwerkt, welke gegevens zijn geëxtraheerd, waarheen ze zijn gestuurd en bevestigen dat geen gegevens naar een ongeschikte bestemming zijn gestroomd, allemaal uit de lineagerecords die bij elke stap automatisch worden aangemaakt.

### Zelfhelend formaataanpassing

Wanneer een leverancier zijn factuurtemplate wijzigt, breekt traditionele automatisering en blijft het gebroken totdat iemand handmatig de extractieregels bijwerkt. In Triggerfish past de LLM-subagent zich aan bij de volgende uitvoering. Het vindt nog steeds het factuurnummer, de regelitems en het totaal, omdat het leest voor betekenis in plaats van positie. De extractie slaagt, de gegevens worden gevalideerd tegen dezelfde bedrijfsregels en de workflow is voltooid.

Na verloop van tijd kan de agent cross-sessiegeheugen gebruiken om patronen te leren. Als leverancier A altijd een herstelvergoeding bevat die andere leveranciers niet hebben, onthoudt de agent dat van vorige extracties en weet dat hij ernaar moet zoeken. Als een bepaald EOB-formaat van een betaler altijd aanpassingscodes op een ongebruikelijke locatie plaatst, maakt het geheugen van de agent van eerdere succesvolle extracties toekomstige extracties betrouwbaarder.

Wanneer een formaatwijziging significant genoeg is dat de extractiebetrouwbaarheid van het LLM onder de drempel zakt die in de workflow is gedefinieerd, stuurt de workflow het document naar een menselijke beoordelingswachtrij in plaats van te gokken. De correcties van de mens worden teruggevoerd via de workflow en het geheugen van de agent slaat het nieuwe patroon op voor toekomstige referentie. Het systeem wordt met de tijd slimmer zonder dat iemand extractieregels hoeft te herschrijven.

### Pijplijnorkestratie

Documentinname is zelden alleen maar "extraheer en sla op". Een volledige pijplijn haalt het document op, extraheert gestructureerde gegevens, valideert ze tegen bestaande records, verrijkt ze met gegevens uit andere systemen, routeert uitzonderingen voor menselijke beoordeling en laadt de gevalideerde gegevens in het doelsysteem. De workflowengine verwerkt dit allemaal in één YAML-definitie.

Een pijplijn voor voorafgaande machtiging in de gezondheidszorg kan er zo uitzien: browserautomatisering haalt de faxafbeelding op uit het leveranciersportaal, een LLM-subagent extraheert patiëntidentificatoren en procedurencodes, een HTTP-aanroep valideert de patiënt tegen het EHR, een andere subagent beoordeelt of de machtiging voldoet aan medische noodzakelijkheidscriteria op basis van de klinische documentatie, en het resultaat wordt doorgestuurd naar automatische goedkeuring of naar een klinische beoordelingswachtrij. Elke stap wordt bijgehouden per classificatie. Elk PHI-stuk is getaint gemarkeerd. De volledige audittrail bestaat automatisch.

## Hoe dit er in de praktijk uitziet

Een regionaal gezondheidssysteem verwerkt aanvragen voor voorafgaande machtiging van veertig verschillende zorgverlenersstudio's, elk met hun eigen formulierindeling, sommige gefaxt, sommige gemaild, sommige geüpload naar een portaal. De traditionele aanpak vereiste een team van acht mensen om elke aanvraag handmatig te beoordelen en in te voeren, omdat geen enkel automatiseringstool de formaatvariantie betrouwbaar kon verwerken.

Met Triggerfish verwerkt een workflow de volledige pijplijn. Browserautomatisering of e-mailparsing haalt de documenten op. LLM-subagenten extraheren de gestructureerde gegevens ongeacht het formaat. Validatiestappen controleren de geëxtraheerde gegevens tegen het EHR en formulariumdatabases. Een classification ceiling van RESTRICTED zorgt ervoor dat PHI de pijplijngrens nooit verlaat. Documenten die het LLM niet met hoge betrouwbaarheid kan analyseren, worden doorgestuurd naar een menselijke beoordelaar, maar dat volume neemt in de loop van de tijd af naarmate het geheugen van de agent een bibliotheek van formaatpatronen opbouwt.

Het team van acht wordt twee mensen die de door het systeem gemarkeerde uitzonderingen afhandelen, plus periodieke kwaliteitscontroles van de geautomatiseerde extracties. Formaatwijzigingen van zorgverlenersstudio's worden automatisch verwerkt. Nieuwe formulierlay-outs worden bij de eerste ontmoeting afgehandeld. De onderhoudskosten die het grootste deel van het traditionele automatiseringsbudget consumeerden, dalen tot bijna nul.
