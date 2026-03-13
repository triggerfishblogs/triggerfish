---
title: "Bumpers: Håll dig i banan utan att tänka på det"
date: 2026-03-08
description: Triggerfish bumpers håller din agent på rätt nivå. Ingen oavsiktlig
  eskalering, inga överraskningar. Stäng av dem när du behöver mer. På som standard.
author: Greg Havens
tags:
  - ai agents
  - security
  - classification
  - bumpers
  - triggerfish
draft: false
---
![](/blog/images/chatgpt-image-mar-9-2026-04_07_56-pm.jpg "Title Graphic on Bumpers Keeping you in your lane")

En av de saker som gör AI-agenter genuint användbara är också det som ibland gör dem oroande. Ge en agent tillgång till dina verktyg och den kommer att använda dem. Alla, om uppgiften verkar kräva det. Du ber den hjälpa till att formulera ett meddelande och den hämtar in din kalender för att kontrollera tillgängligheten, drar en del kontext från en fil, kollar en Slack-tråd. Innan du vet ordet av har en enkel uppgift berört tre olika datakällor på tre olika klassificeringsnivåer och din session är nu taintad till en nivå du inte avsåg arbeta på.

Det här är inte ett fel. Det är agenten som gör sitt jobb. Men det skapar ett verkligt användbarhetsproblem: om du gör vardagligt arbete och inte vill råka eskalera till en kontext där dina konfidentiella data är i spel, måste du antingen ständigt mikrostyra agenten eller bara acceptera att sessioner glider iväg.

Bumpers löser det.

![](/blog/images/screenshot_20260309_161249.png)

Idén kommer direkt från bowling. När du sätter upp bumpers stannar bollen i banan. Den kan gå varsomhelst inom banan, studsa runt, göra sitt. Den kan bara inte ramla ner i diket. Bumpers i Triggerfish fungerar på samma sätt. När de är på kan agenten göra allt som fungerar på eller under den aktuella sessionens klassificeringsnivå. Vad den inte kan göra är att vidta en åtgärd som skulle eskalera sessionens taint. Om den försöker blockeras åtgärden innan den körs och agenten informeras om att den behöver hitta ett annat sätt eller meddela dig att du behöver stänga av bumpers för att gå vidare.

Bumpers är på som standard. När din session startar ser du "Bumpers deployed." Om du vill ge agenten fullt rörelsefrihet kör du `/bumpers` och de stängs av. Kör det igen och de slås på igen. Din inställning sparas mellan sessioner, så om du är den typen av person som alltid arbetar utan dem behöver du bara ange det en gång.

Det viktiga att förstå är vad bumpers gör och inte gör. De är inte en generell begränsning av agenten. De begränsar inte vilka verktyg agenten kan anropa, vilken data den kan läsa eller hur den hanterar något inom den aktuella klassificeringsnivån. Om din session redan är taintad till CONFIDENTIAL och agenten öppnar en annan CONFIDENTIAL-resurs har bumpers ingenting att säga om det. Tainten rör sig inte. Bumpers bryr sig bara om eskalering.

![](/blog/images/gemini_generated_image_4ovbs34ovbs34ovb.jpg)

Det spelar roll för att bumpers är utformade för att inte störa dig. Hela poängen är att du inte ska behöva tänka på klassificeringsnivåer under en normal arbetsession. Du sätter bumpers på, du arbetar, och om agenten sträcker sig mot något som skulle förändra karaktären på din session stannar den och berättar det. Du bestämmer om du vill låsa upp det. Det är hela interaktionen.

Det finns ett kantfall värt att känna till. Om du stänger av bumpers mitt i en session och agenten eskalerar taint, återställer inte tainten att du slår på bumpers igen. Taint är monoton. Den går bara uppåt. Så om du inaktiverar bumpers, gör lite arbete på en högre nivå och återaktiverar dem, skyddar bumpers nu från den högre nivån, inte den ursprungliga. Om du vill komma tillbaka till en ren lognivå-session, gör en fullständig återställning.

![](/blog/images/screenshot_20260309_164720.png)

För de flesta kommer bumpers bara att vara något som tyst är på och ibland förklarar varför agenten bad dem aktivera något istället för att göra det automatiskt. Det är den avsedda upplevelsen. Agenten håller sig i banan, du behåller kontrollen och du behöver bara fatta ett aktivt beslut när du faktiskt vill gå längre.
