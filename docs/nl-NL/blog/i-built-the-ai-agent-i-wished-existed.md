---
title: Ik Bouwde de AI-agent Die Ik Had Gewenst te Bestaan
date: 2026-03-08
description: Ik bouwde Triggerfish omdat elke AI-agent die ik vond het model
  vertrouwde om zijn eigen regels te handhaven. Dat is geen beveiliging. Hier
  is wat ik in plaats daarvan deed.
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - open source
  - self-hosted
  - llm
  - prompt injection
  - agent security
  - triggerfish
draft: false
---
![](/blog/images/gemini_generated_image_ygq4uwygq4uwygq4.jpg)

Een tijdje geleden begon ik goed op te letten wat AI-agenten daadwerkelijk konden doen. Niet de demo's. De echte, die draaien op echte gegevens, in echte omgevingen waar fouten gevolgen hebben. Wat ik ontdekte was dat de mogelijkheden er daadwerkelijk waren. U kon een agent koppelen aan uw e-mail, uw agenda, uw code, uw bestanden, en het kon zinvol werk verrichten. Dat deel imponeerde me.

Wat me niet imponeerde was het beveiligingsmodel. Of beter gezegd: het ontbreken daarvan. Elk platform dat ik bekeek handhaafde zijn regels op dezelfde manier: door het model te vertellen wat het niet mocht doen. Schrijf een goede systeemprompt, beschrijf de grenzen, vertrouw erop dat het model daarbinnen blijft. Dat werkt totdat iemand uitvindt hoe hij een verzoek kan formuleren dat het model ervan overtuigt dat de regels hier, nu, in dit specifieke geval niet van toepassing zijn. En mensen komen daar achter. Het is niet zo moeilijk.

Ik bleef wachten totdat iemand de versie van dit zou bouwen die ik daadwerkelijk wilde gebruiken. Eén die overal mee kon verbinden, op elk kanaal dat ik al gebruikte kon werken en echt gevoelige gegevens kon verwerken zonder dat ik mijn vingers moest kruisen en hoopte dat het model een goede dag had. Die verscheen niet.

Dus bouwde ik het zelf.

Triggerfish is de agent die ik wilde. Het verbindt met uw e-mail, uw agenda, uw bestanden, uw code, uw berichtenapps. Het werkt proactief, niet alleen wanneer u het vraagt. Het werkt overal waar u al werkt. Maar het deel dat ik het meest serieus neem is de beveiligingsarchitectuur. De regels over wat de agent kan raadplegen en waar gegevens kunnen stromen, leven niet in een prompt. Ze leven in een handhavingslaag die volledig buiten het model staat. Het model vertelt het systeem wat het wil doen, en een aparte laag beslist of dat daadwerkelijk gebeurt. Het model kan niet onderhandelen met die laag. Het kan er niet omheen redeneren. Het kan het niet zien.

Dat onderscheid is belangrijker dan het misschien klinkt. Het betekent dat de beveiligingseigenschappen van het systeem niet verslechteren naarmate het model capabeler wordt. Het betekent dat een gecompromitteerde externe tool de agent niet kan overhalen om iets te doen wat het niet mag. Het betekent dat u daadwerkelijk naar de regels kunt kijken, ze kunt begrijpen en ze kunt vertrouwen, omdat het code is, geen proza.

Ik heb de handhavingskern opengesteld als open source juist om die reden. Als u het niet kunt lezen, kunt u het niet vertrouwen. Dat geldt voor elke beveiligingsclaim, en het is vooral waar wanneer wat u beveiligt een autonome agent is met toegang tot uw meest gevoelige gegevens.

Het platform is gratis voor individuen en u kunt het zelf draaien. Als u liever niet nadenkt over de infrastructuur, is er een abonnementsoptie waarbij wij het model en de zoekfunctie beheren. In beide gevallen is het beveiligingsmodel hetzelfde.

Dit is de agent die ik destijds had gewenst te bestaan. Ik denk dat veel mensen op hetzelfde hebben gewacht.
