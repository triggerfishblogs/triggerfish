---
title: "Vangrails: In Uw Rijstrook Blijven Zonder Erover Na te Denken"
date: 2026-03-08
description: Triggerfish-vangrails houden uw agent werkend op het niveau waarop
  u zich bevindt. Geen onbedoelde escalatie, geen verrassingen. Standaard aan.
  Schakel ze uit wanneer u meer nodig heeft.
author: Greg Havens
tags:
  - ai agents
  - security
  - classification
  - bumpers
  - triggerfish
draft: false
---
![](/blog/images/chatgpt-image-mar-9-2026-04_07_56-pm.jpg "Titelbanner over vangrails die u in uw rijstrook houden")

Een van de dingen die AI-agenten werkelijk nuttig maakt, is ook wat ze soms verontrustend maakt. Geef een agent toegang tot uw tools en het zal ze gebruiken. Allemaal, als de taak dat lijkt te vereisen. U vraagt het te helpen een bericht op te stellen en het reikt in uw agenda om beschikbaarheid te controleren, haalt wat context op uit een bestand, controleert een Slack-thread. Voordat u het weet, heeft een eenvoudige taak drie verschillende gegevensbronnen op drie verschillende classificatieniveaus aangeraakt en is uw sessie nu besmet tot een niveau dat u niet van plan was te werken.

Dit is geen bug. Het is de agent die zijn werk doet. Maar het creëert een echt bruikbaarheidsprobleem: als u casual werk doet en u niet per ongeluk wilt escaleren naar een context waar uw vertrouwelijke gegevens in het spel zijn, moet u ofwel de agent constant micromanagen of gewoon accepteren dat sessies afdrijven.

Vangrails lossen dat op.

![](/blog/images/screenshot_20260309_161249.png)

Het idee komt rechtstreeks van bowlen. Wanneer u de vangrails omhoog zet, blijft de bal in de baan. Het kan overal in de baan gaan, stuiteren, zijn ding doen. Het kan alleen niet in de goot vallen. Vangrails in Triggerfish werken op dezelfde manier. Wanneer ze aan zijn, kan de agent alles doen dat op of onder het huidige classificatieniveau van de sessie werkt. Wat het niet kan doen is een actie ondernemen die de sessie-taint zou escaleren. Als het dat probeert, wordt de actie geblokkeerd voordat het wordt uitgevoerd en wordt de agent verteld een andere manier te vinden of u te laten weten dat u de vangrails moet weghalen om verder te gaan.

Vangrails zijn standaard aan. Wanneer uw sessie start, ziet u "Vangrails ingezet." Als u de agent volledige bewegingsvrijheid wilt geven, voert u /bumpers uit en ze gaan eraf. Voer het opnieuw uit en ze gaan er weer op. Uw voorkeur blijft bewaard over sessies heen, dus als u iemand bent die altijd zonder werkt, hoeft u dat maar één keer in te stellen.

Het belangrijke om te begrijpen is wat vangrails wel en niet doen. Ze zijn geen algemene beperking op de agent. Ze beperken niet welke tools de agent kan aanroepen, welke gegevens het kan lezen of hoe het iets binnen het huidige classificatieniveau afhandelt. Als uw sessie al besmet is tot CONFIDENTIAL en de agent een andere CONFIDENTIAL-resource raadpleegt, hebben vangrails daar niets over te zeggen. De taint beweegt niet. Vangrails geven alleen om escalatie.

![](/blog/images/gemini_generated_image_4ovbs34ovbs34ovb.jpg)

Dit is van belang omdat vangrails zijn ontworpen om uit uw weg te blijven. Het hele punt is dat u niet hoeft na te denken over classificatieniveaus tijdens een normale werksessie. U zet vangrails aan, u werkt, en als de agent iets pakt dat de aard van uw sessie zou veranderen, stopt het en vertelt u dat. U beslist of u het wilt ontgrendelen. Dat is de volledige interactie.

Er is één randgeval dat het waard is te weten. Als u vangrails halverwege een sessie uitschakelt en de agent taint escaleert, brengt het opnieuw inschakelen van vangrails de taint niet terug omlaag. Taint is monotoon. Het gaat alleen omhoog. Dus als u vangrails uitschakelt, wat werk doet op een hoger niveau en ze opnieuw inschakelt, bewaken vangrails nu vanaf dat hogere niveau, niet het originele. Als u terug wilt naar een schone sessie op laag niveau, doe dan een volledige reset.

![](/blog/images/screenshot_20260309_164720.png)

Voor de meeste mensen zullen vangrails gewoon iets zijn dat stil aan is en af en toe uitlegt waarom de agent hen vroeg iets in te schakelen in plaats van het automatisch te doen. Dat is de bedoelde ervaring. De agent blijft in de baan, u behoudt de controle en u hoeft alleen maar een actieve beslissing te nemen wanneer u werkelijk verder wilt gaan.
