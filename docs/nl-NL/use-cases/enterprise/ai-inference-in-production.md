---
title: AI-inferentie in productieworkflows
description: Hoe Triggerfish de kloof overbrugt tussen AI-demo's en duurzame productieworkflows met beveiligingshandhaving, audittrails en workfloworkestratie.
---

# AI/ML-inferentie-integratie in productieworkflows

De meeste enterprise AI-projecten sterven in de kloof tussen demo en productie. Een team bouwt een proof of concept die GPT-4 gebruikt om supporttickets te classificeren, juridische documenten samen te vatten of marketingteksten te genereren. De demo werkt. Het management raakt enthousiast. Dan stagneert het project maandenlang bij het beantwoorden van vragen die de demo nooit hoefde te beantwoorden: waar komen de gegevens vandaan? Waar gaat de uitvoer naartoe? Wie keurt de beslissingen van de AI goed? Wat gebeurt er als het model hallucineert? Hoe auditen we wat het heeft gedaan? Hoe voorkomen we dat het toegang krijgt tot gegevens die het niet zou mogen zien? Hoe voorkomen we dat het gevoelige informatie naar de verkeerde plek stuurt?

Dit zijn geen hypothetische zorgen. 95% van de enterprise generatieve AI-pilots levert geen financieel rendement op en de reden is niet dat de technologie niet werkt. De modellen zijn capabel. De mislukking zit in het loodgieterswerk: AI-inferentie betrouwbaar integreren in de werkelijke bedrijfsworkflows waar het moet opereren, met de beveiligingscontroles, foutafhandeling en audittrails die productiesystemen vereisen.

De typische enterprise-reactie is het bouwen van een aangepaste integratielaag. Een engineeringteam besteedt maanden aan het verbinden van het AI-model met de gegevensbronnen, het bouwen van de pijplijn, het toevoegen van authenticatie, het implementeren van logging, het maken van een goedkeuringsworkflow en het toevoegen van beveiligingscontroles. Tegen de tijd dat de integratie "productieklaar" is, is het oorspronkelijke model vervangen door een nieuwer, zijn de bedrijfsvereisten verschoven en moet het team opnieuw beginnen.

## Hoe Triggerfish dit oplost

Triggerfish elimineert de integratielek door AI-inferentie een eersteklas stap te maken in de workflowengine, bestuurd door dezelfde beveiligingshandhaving, auditlogging en classificatiecontroles die van toepassing zijn op elke andere bewerking in het systeem. Een LLM-subagent-stap in een Triggerfish-workflow is geen toevoeging achteraf. Het is een native bewerking met dezelfde beleidshooks, lineage-tracking en write-downpreventie als een HTTP-aanroep of een databasequery.

### AI als workflowstap, niet als apart systeem

In de workflow-DSL wordt een LLM-inferentiestap gedefinieerd met `call: triggerfish:llm`. De taakomschrijving vertelt de subagent wat hij in natuurlijke taal moet doen. De subagent heeft toegang tot elke tool die in Triggerfish is geregistreerd. Hij kan het web doorzoeken, databases bevragen via MCP-tools, documenten lezen, websites browsen en cross-sessiegeheugen gebruiken. Wanneer de stap is voltooid, gaat de uitvoer rechtstreeks naar de volgende workflowstap.

Dit betekent dat er geen apart "AI-systeem" is om te integreren. De inferentie vindt plaats binnen de workflow, met dezelfde inloggegevens, dezelfde gegevensverbindingen en dezelfde beveiligingshandhaving als al het andere. Een engineeringteam hoeft geen aangepaste integratielaag te bouwen omdat de integratielaag al bestaat.

### Beveiliging zonder aangepaste engineering

Het meest tijdrovende deel van het productie-klaar maken van een AI-workflow is niet de AI. Het is het beveiligings- en nalevingswerk. Welke gegevens kan het model zien? Waar kan het zijn uitvoer naartoe sturen? Hoe voorkomen we dat het gevoelige informatie lekt? Hoe loggen we alles voor audit?

In Triggerfish worden deze vragen beantwoord door de platformarchitectuur, niet door projectspecifieke engineering. Het classificatiesysteem volgt gegevensgevoeligheid bij elke grens. Sessietaint escaleert wanneer het model geclassificeerde gegevens benadert. Write-downpreventie blokkeert uitvoer van stromen naar een kanaal dat geclassificeerd is onder het taintniveau van de sessie. Elke toolaanroep, elke gegevenstoegang en elke uitvoerbeslissing wordt geregistreerd met volledige lineage.

Een AI-workflow die klantrecords (CONFIDENTIAL) leest en een samenvatting genereert, kan die samenvatting niet naar een openbaar Slack-kanaal sturen. Dit wordt niet afgedwongen door een promptinstructie die het model kan negeren. Het wordt afgedwongen door deterministische code in de PRE_OUTPUT-hook die het model niet kan zien, niet kan aanpassen en niet kan omzeilen. De beleidshooks worden uitgevoerd onder de LLM-laag. Het LLM vraagt een actie aan en de beleidslaag beslist of deze wordt toegestaan. Time-out staat gelijk aan weigering. Er is geen pad van het model naar de buitenwereld dat niet via handhaving loopt.

### Audittrails die er al zijn

Elke AI-beslissing in een Triggerfish-workflow genereert automatisch lineagerecords. De lineage volgt welke gegevens het model heeft benaderd, welk classificatieniveau ze droegen, welke transformaties zijn toegepast en waar de uitvoer naartoe is gestuurd. Dit is geen logfunctie die moet worden ingeschakeld of geconfigureerd. Het is een structurele eigenschap van het platform. Elk gegevenselement draagt herkomstmetadata van aanmaak via elke transformatie naar de uiteindelijke bestemming.

Voor gereguleerde industrieën betekent dit dat het nalevingsbewijsmateriaal voor een AI-workflow vanaf dag één bestaat. Een auditor kan elke AI-gegenereerde uitvoer traceren via de volledige keten: welk model het produceerde, op welke gegevens het was gebaseerd, welke tools het model gebruikte tijdens redeneren, welk classificatieniveau van toepassing was bij elke stap en of er beleidshandhavingsacties hebben plaatsgevonden. Deze bewijsverzameling vindt automatisch plaats omdat het is ingebouwd in de handhavingshooks, niet toegevoegd als een rapportagelaag.

### Modelflexibiliteit zonder re-architectuur

Triggerfish ondersteunt meerdere LLM-providers via de LlmProvider-interface: Anthropic, OpenAI, Google, lokale modellen via Ollama en OpenRouter voor elk gerouteerd model. Providerselectie is per agent configureerbaar met automatische failover. Wanneer een beter model beschikbaar komt of een provider de prijzen wijzigt, vindt de switch plaats op configuratieniveau zonder de workflowdefinities aan te raken.

Dit pakt het probleem "het project is verouderd voordat het wordt geleverd" direct aan. De workflowdefinities beschrijven wat de AI moet doen, niet welk model dat doet. Overschakelen van GPT-4 naar Claude naar een fijnafgestemd lokaal model wijzigt één configuratiewaarde. De workflow, de beveiligingscontroles, de audittrails en de integratiepunten blijven allemaal precies hetzelfde.

### Cron, webhooks en gebeurtenisgestuurde uitvoering

AI-workflows die op schema of als reactie op gebeurtenissen worden uitgevoerd, vereisen geen mens om ze te starten. De planner ondersteunt vijf-veld cron-expressies voor terugkerende workflows en webhookeindpunten voor gebeurtenisgestuurde triggers. Een dagelijkse rapportageworkflow wordt om 6 uur uitgevoerd. Een documentclassificatieworkflow wordt geactiveerd wanneer een nieuw bestand via webhook binnenkomt. Een sentimentanalyseworkflow wordt geactiveerd bij elk nieuw supportticket.

Elke geplande of gebeurtenisgestuurde uitvoering spawnt een geïsoleerde sessie met verse taint. De workflow wordt uitgevoerd in zijn eigen beveiligingscontext, onafhankelijk van interactieve sessies. Als de cron-geactiveerde workflow CONFIDENTIAL-gegevens benadert, wordt alleen de geschiedenis van die uitvoering geclassificeerd als CONFIDENTIAL. Andere geplande workflows die op PUBLIC-classificatie draaien, worden niet beïnvloed.

### Foutafhandeling en menselijk toezicht

Productie-AI-workflows moeten mislukkingen netjes afhandelen. De workflow-DSL ondersteunt `raise` voor expliciete foutcondities en try/catch-semantiek via foutafhandeling in taakdefinities. Wanneer een LLM-subagent uitvoer met lage betrouwbaarheid produceert of een situatie tegenkomt die hij niet aankan, kan de workflow doorsturen naar een menselijke goedkeuringswachtrij, een melding sturen via de notificatieservice of een terugvalactie ondernemen.

De notificatieservice bezorgt meldingen via alle verbonden kanalen met prioriteit en deduplicatie. Als een workflow menselijke goedkeuring nodig heeft voordat een AI-gegenereerde contractwijziging wordt verstuurd, kan het goedkeuringsverzoek aankomen op Slack, WhatsApp, e-mail of waar de goedkeurder ook is. De workflow pauzeert totdat de goedkeuring binnenkomt en gaat dan verder vanaf waar hij was gebleven.

## Hoe dit er in de praktijk uitziet

Een juridische afdeling wil contractbeoordeling automatiseren. De traditionele aanpak: zes maanden maatwerkontwikkeling om een pijplijn te bouwen die clausules extraheert uit geüploade contracten, risiconiveaus classificeert, niet-standaard voorwaarden markeert en een samenvatting genereert voor de beoordelende advocaat. Het project vereist een toegewijd engineeringteam, een aangepaste beveiligingsbeoordeling, een nalevingsgoedkeuring en doorlopend onderhoud.

Met Triggerfish kost het schrijven van de workflowdefinitie één dag. Upload activeert een webhook. Een LLM-subagent leest het contract, extraheert sleutelclausules, classificeert risiconiveaus en identificeert niet-standaard voorwaarden. Een validatiestap controleert de extractie tegen de clausulebibliotheek van het kantoor die in het geheugen is opgeslagen. De samenvatting wordt doorgestuurd naar het notificatiekanaal van de toegewezen advocaat. De volledige pijplijn draait op RESTRICTED-classificatie omdat contracten geprivilegieerde cliëntinformatie bevatten en write-downpreventie zorgt ervoor dat geen contractgegevens lekken naar een kanaal onder RESTRICTED.

Wanneer het kantoor van LLM-provider wisselt (omdat een nieuw model juridische taal beter aankan of omdat de huidige provider de prijzen verhoogt), is de wijziging één regel in de configuratie. De workflowdefinitie, de beveiligingscontroles, de audittrail en de notificatieroutering blijven allemaal werken zonder aanpassingen. Wanneer het kantoor een nieuw clausuletype toevoegt aan zijn risicoframework, verwerkt de LLM-subagent dit zonder extractieregels te herschrijven omdat het leest voor betekenis, niet voor patronen.

Het nalevingsteam krijgt een volledige audittrail vanaf dag één. Elk verwerkt contract, elke geëxtraheerde clausule, elke toegewezen risicoklassificatie, elke verzonden melding en elke advocaatgoedkeuring geregistreerd, met volledige lineage terug naar het brondocument. De bewijsverzameling die weken aangepast rapportagewerk zou hebben gekost, bestaat automatisch als een structurele eigenschap van het platform.
