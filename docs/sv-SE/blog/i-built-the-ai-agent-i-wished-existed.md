---
title: Jag byggde den AI-agent jag önskade fanns
date: 2026-03-08
description: Jag byggde Triggerfish för att varje AI-agent jag hittade litade på
  att modellen skulle upprätthålla sina egna regler. Det är inte säkerhet. Här är
  vad jag gjorde istället.
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

För ett tag sedan började jag uppmärksamma vad AI-agenter faktiskt kunde göra. Inte demonstrationerna. De riktiga, som kördes på riktiga data, i riktiga miljöer där misstag har konsekvenser. Det jag hittade var att kapabiliteten verkligen fanns där. Du kunde koppla en agent till din e-post, din kalender, din kod, dina filer, och den kunde utföra meningsfullt arbete. Det imponerade på mig.

Det som inte imponerade på mig var säkerhetsmodellen. Eller snarare frånvaron av en. Varje plattform jag tittade på upprätthöll sina regler på samma sätt: genom att berätta för modellen vad den inte fick göra. Skriv en bra systemprompt, beskriv gränserna, lita på att modellen stannar inom dem. Det fungerar tills någon tar reda på hur man formulerar en förfrågan som övertygar modellen om att reglerna inte gäller här, just nu, i just det här fallet. Och det gör folk. Det är inte så svårt.

Jag väntade hela tiden på att någon skulle bygga den version av det här som jag faktiskt ville använda. En som kunde ansluta till allt, arbeta på varje kanal jag redan använde och hantera genuint känslig data utan att jag behövde korsa fingrarna och hoppas att modellen hade en bra dag. Den dök inte upp.

Så jag byggde den.

Triggerfish är den agent jag ville ha. Den ansluter till din e-post, din kalender, dina filer, din kod, dina meddelandeappar. Den körs proaktivt, inte bara när du ber om det. Den fungerar varhelst du redan arbetar. Men den del jag är allvarligast om är säkerhetsarkitekturen. Reglerna om vad agenten kan komma åt och vart data kan flöda lever inte i en prompt. De lever i ett tillämpningsskikt som sitter utanför modellen helt och hållet. Modellen talar om för systemet vad den vill göra, och ett separat skikt beslutar om det faktiskt sker. Modellen kan inte förhandla med det skiktet. Den kan inte resonera runt det. Den kan inte se det.

Den distinktionen spelar större roll än det kanske låter. Det innebär att systemets säkerhetsegenskaper inte försämras när modellen blir mer kapabel. Det innebär att ett komprometterat tredjepartsverktyg inte kan övertala agenten att göra något det inte borde. Det innebär att du faktiskt kan titta på reglerna, förstå dem och lita på dem, eftersom de är kod, inte prosa.

Jag öppnade källkoden för tillämpningskärnan av exakt den anledningen. Om du inte kan läsa den kan du inte lita på den. Det gäller alla säkerhetspåståenden, och det gäller särskilt när det du säkrar är en autonom agent med tillgång till dina känsligaste data.

Plattformen är gratis för privatpersoner och du kan köra den själv. Om du hellre inte vill tänka på infrastrukturen finns det ett prenumerationsalternativ där vi hanterar modellen och sökningen. Hur som helst är säkerhetsmodellen densamma.

Det här är agenten jag önskade fanns då. Jag tror att många har väntat på samma sak.
