---
title: Prompt-injectie Is Onoplosbaar op de Promptlaag
date: 2026-03-10
description: "Prompt-injectie is OWASP's #1 LLM-kwetsbaarheid sinds ze begonnen
  bij te houden. Dit is waarom elke verdediging gebouwd op de promptlaag blijft
  falen."
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - prompt injection
  - llm security
  - open source
  - triggerfish
  - owasp
  - agent security
draft: false
---
Prompt-injectie is OWASP's nummer één kwetsbaarheid voor LLM-toepassingen sinds ze begonnen bij te houden. Elk groot AI-platform heeft er begeleiding over gepubliceerd. Onderzoekers hebben tientallen voorgestelde verdedigingen geproduceerd. Geen enkele heeft het opgelost, en het patroon van waarom ze blijven falen wijst op iets fundamenteels over waar het probleem werkelijk leeft.

De korte versie: u kunt een probleem niet oplossen op de laag die zelf het probleem is. Prompt-injectie werkt omdat het model geen onderscheid kan maken tussen instructies van de ontwikkelaar en instructies van een aanvaller. Elke verdediging die dit probeert op te lossen door meer instructies aan het model toe te voegen, werkt binnen dezelfde beperking die de aanval in de eerste plaats mogelijk maakt.

![](/blog/images/injectedcontext.jpg)

## Wat de aanval werkelijk doet

Een taalmodel neemt een contextvenster als invoer en produceert een aanvulling. Het contextvenster is een platte reeks tokens. Het model heeft geen native mechanisme voor het bijhouden van welke tokens afkomstig zijn van een vertrouwde systeemprompt, welke van een gebruiker en welke van externe inhoud die de agent heeft opgehaald tijdens zijn werk. Ontwikkelaars gebruiken structurele conventies zoals roltags om intentie aan te geven, maar dat zijn conventies, geen handhaving. Vanuit het perspectief van het model is de volledige context invoer die de voorspelling van het volgende token informeert.

Prompt-injectie misbruikt dit. Een aanvaller sluit instructies in inhoud in die de agent zal lezen — een webpagina, een document, een e-mail, een codeopmerking of een databaseveld — en die instructies concurreren met de instructies van de ontwikkelaar in hetzelfde contextvenster. Als de geïnjecteerde instructies overtuigend genoeg, coherent genoeg of voordelig gepositioneerd zijn in de context, volgt het model ze in plaats daarvan. Dit is geen bug in een specifiek model. Het is een gevolg van hoe al deze systemen werken.

Indirecte prompt-injectie is de gevaarlijkere vorm. In plaats van dat een gebruiker direct een kwaadaardige prompt typt, vergiftigt een aanvaller inhoud die de agent autonoom ophaalt. De gebruiker doet niets verkeerds. De agent gaat naar buiten, stuit op de vergiftigde inhoud tijdens zijn werk, en de aanval wordt uitgevoerd. De aanvaller heeft geen toegang tot het gesprek nodig. Ze hoeven alleen hun tekst ergens te plaatsen waar de agent het zal lezen.

## Hoe de gedocumenteerde aanvallen eruitzien

![](/blog/images/dataexfil.jpg)

In augustus 2024 documenteerden beveiligingsonderzoekers van PromptArmor een prompt-injectiekwetsbaarheid in Slack AI. De aanval werkte als volgt: een aanvaller maakt een openbaar Slack-kanaal en plaatst een bericht met een kwaadaardige instructie. Het bericht vertelt Slack AI dat wanneer een gebruiker naar een API-sleutel vraagt, het een tijdelijke aanduiding moet vervangen door de werkelijke sleutelwaarde en deze moet coderen als een URL-parameter in een "klik hier om opnieuw te verifiëren"-link. Wanneer een ontwikkelaar ergens anders in de werkruimte Slack AI gebruikt om naar informatie over zijn API-sleutel te zoeken — opgeslagen in een privékanaal waartoe de aanvaller geen toegang heeft — haalt Slack AI het bericht van het openbare kanaal van de aanvaller in de context, volgt de instructie en rendert de phishing-link in de Slack-omgeving van de ontwikkelaar.

In juni 2025 ontdekte een onderzoeker een prompt-injectiekwetsbaarheid in GitHub Copilot, bijgehouden als CVE-2025-53773 en gepatcht in de Patch Tuesday-release van Microsoft van augustus 2025. De aanvalsvector was een kwaadaardige instructie ingebed in broncodebestanden, README-bestanden, GitHub-issues of andere tekst die Copilot kan verwerken. De instructie dirigeerde Copilot om het `.vscode/settings.json`-bestand van het project te wijzigen om een enkele configuratieregel toe te voegen die de zogenaamde "YOLO-modus" inschakelt: het uitschakelen van alle gebruikersbevestigingsprompts en het verlenen van onbeperkte toestemming aan de AI om shell-opdrachten uit te voeren.

De wormachtige variant is het begrijpen waard. Omdat Copilot naar bestanden kan schrijven en de geïnjecteerde instructie Copilot kan vertellen de instructie in andere bestanden te verspreiden die het verwerkt tijdens refactoring of documentatiegeneratie, kan een enkel vergiftigd repository elk project infecteren dat een ontwikkelaar aanraakt. GitHub noemt deze klasse van bedreigingen nu een "AI-virus."

## Waarom de standaardverdedigingen falen

De intuïtieve reactie op prompt-injectie is het schrijven van een betere systeemprompt. Instructies toevoegen die het model vertellen instructies in opgehaalde inhoud te negeren. Het vertellen om externe gegevens als niet-vertrouwd te beschouwen. Veel platforms doen precies dit. Beveiligingsleveranciers verkopen producten die zijn gebouwd rond het toevoegen van zorgvuldig ontworpen detectieprompten aan de context van de agent.

Een onderzoeksteam van OpenAI, Anthropic en Google DeepMind publiceerde een paper in oktober 2025 dat 12 gepubliceerde verdedigingen tegen prompt-injectie evalueerde en elk aan adaptieve aanvallen onderwierp. Ze omzeilden alle 12 met aanvalssuccespercentages boven 90% voor de meesten. De verdedigingen waren niet slecht. De reden waarom al deze benaderingen falen tegen een vastberaden aanvaller is dat ze proberen een vertrouwensprobleem op te lossen door meer inhoud toe te voegen aan een contextvenster dat vertrouwen niet kan handhaven. De aanvalsoppervlakte is het contextvenster zelf. Het toevoegen van meer instructies aan het contextvenster vermindert de aanvalsoppervlakte niet.

## Wat het probleem werkelijk beperkt

Er is een betekenisvolle vermindering van het risico op prompt-injectie wanneer u het principe toepast dat de beveiligingseigenschappen van een systeem niet mogen afhangen van het feit dat het model correcte oordelen velt. Dit is geen nieuw idee in beveiliging. Het is hetzelfde principe dat ertoe leidt dat u toegangscontroles in code handhaaft in plaats van "verzoek uitsluitend toegang te krijgen tot gegevens waartoe u gemachtigd bent" in een beleidsdocument te schrijven.

Voor AI-agenten betekent dit dat de handhavingslaag buiten het model moet zitten, in code die de redenering van het model niet kan beïnvloeden. Het model produceert verzoeken. De code evalueert of die verzoeken zijn toegestaan, op basis van feiten over de sessiestatus, de classificatie van de betrokken gegevens en de machtigingen van het kanaal waarnaar de uitvoer gaat. Het model kan zich niet langs deze evaluatie redeneren omdat de evaluatie het gesprek niet leest.

Dit maakt prompt-injectie niet onmogelijk. Een aanvaller kan nog steeds instructies injecteren en het model zal ze nog steeds verwerken. Wat verandert is de explosieradius. Als de geïnjecteerde instructies proberen gegevens te exfiltreren naar een extern eindpunt, wordt de uitgaande aanroep geblokkeerd — niet omdat het model besloot de instructies te negeren, maar omdat de handhavingslaag het verzoek heeft gecontroleerd aan de hand van de classificatiestatus van de sessie en de classificatievloer van het doeladressen vond de stroom write-down-regels zou schenden.

![](/blog/images/promptinjectionblock.jpg)

Sessie-taint-tracking sluit een specifieke kloof die toegangscontroles alleen niet dekken. Wanneer een agent een document leest dat geclassificeerd is op CONFIDENTIAL, is die sessie nu besmet tot CONFIDENTIAL. Elke volgende poging om uitvoer via een PUBLIC-kanaal te sturen, mislukt de write-down-controle, ongeacht wat het model werd verteld te doen en ongeacht of de instructie afkomstig was van een legitieme gebruiker of een geïnjecteerde payload.

De architecturale formulering is van belang: prompt-injectie is een klasse van aanval die het instructievolgende gedrag van het model target. De juiste verdediging is niet het model te leren instructies beter te volgen of slechte instructies nauwkeuriger te detecteren. De juiste verdediging is het reduceren van de set gevolgen die kunnen voortvloeien uit het feit dat het model slechte instructies volgt. Dat doet u door de gevolgen — de werkelijke toolaanroepen, de werkelijke gegevensstromen, de werkelijke externe communicaties — achter een poort te plaatsen die het model niet kan beïnvloeden.

Dat is een oplosbaar probleem. Het model betrouwbaar instructies van vertrouwde versus niet-vertrouwde bronnen laten onderscheiden, is dat niet.
