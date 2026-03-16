---
title: Inmatning av ostrukturerad data
description: Hur Triggerfish hanterar fakturabearbetning, dokumentintag och e-postanalys utan att gå sönder när indataformat ändras.
---

# Inmatning av ostrukturerad och semistrukturerad data

Fakturabearbetning borde vara ett löst problem vid det här laget. Ett dokument anländer, fält extraheras, data valideras mot befintliga poster och resultatet dirigeras till rätt system. Verkligheten är att fakturabearbetning ensam kostar företag miljarder i manuellt arbete varje år, och automatiseringsprojekten som är tänkta att åtgärda detta går sönder kontinuerligt.

Anledningen är formatvariansen. Fakturor anländer som PDF:er, e-postbilagor, skannade bilder, kalkylbladsexporter och ibland fax. Varje leverantör använder en annorlunda layout. Radposter visas i tabeller, i fritext eller i en kombination av båda. Skatteberäkningar följer olika regler per jurisdiktion. Valutaformat varierar. Datumformat varierar. Även samma leverantör ändrar sin fakturamall utan förvarning.

Traditionell RPA hanterar detta med mallmatchning. Definiera koordinaterna för var fakturanumret visas, var radposterna börjar, var totalen finns. Det fungerar för en enskild leverantörs aktuella mall. Sen uppdaterar leverantören sitt system, förskjuter en kolumn, lägger till en rubrikrad eller ändrar sin PDF-generator, och roboten misslyckas antingen helt eller extraherar skräpdata som sprids nedströms tills någon märker det manuellt.

Samma mönster upprepas i varje arbetsflöde med ostrukturerad data. Bearbetning av försäkrings-EOB:er går sönder när en betalare ändrar sin formulärlayout. Intag av förhandsgodkännanden går sönder när en ny dokumenttyp läggs till i processen. Analys av kund-e-post går sönder när någon använder ett lite annorlunda ämnesradsformat. Underhållskostnaden för att hålla dessa automatiseringar igång överstiger ofta kostnaden för att utföra arbetet manuellt.

## Hur Triggerfish löser detta

Triggerfish ersätter positionell fältextrahering med LLM-baserad dokumentförståelse. AI:n läser dokumentet som en människa skulle göra: förstår sammanhang, drar slutsatser om relationer mellan fält och anpassar sig automatiskt till layoutändringar. Kombinerat med arbetsflödesmotorn för pipelineorkestrering och klassificeringssystemet för datasäkerhet skapar detta inmatningspipelines som inte går sönder när världen förändras.

### LLM-driven dokumentanalys

När ett dokument kommer in i ett Triggerfish-arbetsflöde läser en LLM-subagent hela dokumentet och extraherar strukturerad data baserat på vad dokumentet betyder, inte var specifika pixlar är. Ett fakturanummer är ett fakturanummer oavsett om det finns i det övre högra hörnet märkt "Invoice #" eller mitt på sidan märkt "Factura No." eller inbäddat i ett textstycke. LLM:en förstår att "Net 30" betyder betalningsvillkor, att "Qty", "Quantity" och "Units" betyder samma sak och att en tabell med kolumner för beskrivning, pris och belopp är en radpostlista oavsett kolumnordning.

Det här är inte ett generiskt "skicka dokumentet till ChatGPT och hoppas på det bästa"-tillvägagångssätt. Arbetsflödesdefinitionen specificerar exakt vilken strukturerad utdata LLM:en ska producera, vilka valideringsregler som gäller och vad som händer när extraheringens säkerhet är låg. Subagentens uppgiftsbeskrivning definierar det förväntade schemat och arbetsflödets efterföljande steg validerar den extraherade datan mot affärsregler innan den kommer in i något nedströmssystem.

### Webbläsarautomatisering för dokumenthämtning

Många dokumentinmatningsarbetsflöden börjar med att hämta dokumentet. Försäkrings-EOB:er finns i betalarportaler. Leverantörsfakturor finns i leverantörsplattformar. Myndighetsformulär finns på statliga myndighetssajter. Traditionell automatisering använder Selenium-skript eller API-anrop för att hämta dessa dokument och dessa skript går sönder när portalen ändras.

Triggerfish webbläsarautomatisering använder CDP-styrd Chromium med ett LLM som läser sidögonblicksbilder för att navigera. Agenten ser sidan som en människa gör och klickar, skriver och scrollar baserat på vad den ser snarare än hårdkodade CSS-selektorer. När en betalarportal designar om sin inloggningssida anpassar sig agenten eftersom den fortfarande kan identifiera användarnamns-fältet, lösenordsfältet och skicka-knappen från visuellt sammanhang. När en navigeringsmeny ändras hittar agenten den nya vägen till dokumentnedladdningssektionen.

Det här är inte helt tillförlitligt. CAPTCHA:er, flerfaktorsautentiseringsflöden och starkt JavaScript-beroende portaler orsakar fortfarande problem. Men felläget är fundamentalt annorlunda än traditionella skript. Ett Selenium-skript misslyckas tyst när en CSS-selektor slutar att matcha. En Triggerfish-agent rapporterar vad den ser, vad den försökte och var den fastnade, vilket ger operatören tillräckligt sammanhang för att ingripa eller justera arbetsflödet.

### Klassificeringsgrindad bearbetning

Dokument har olika känslighetsnivåer och klassificeringssystemet hanterar detta automatiskt. En faktura med prissättningsvillkor kan vara CONFIDENTIAL. Ett offentligt RFP-svar kan vara INTERNAL. Ett dokument med PHI är RESTRICTED. När LLM-subagenten läser ett dokument och extraherar data klassificerar POST_TOOL_RESPONSE-hooken det extraherade innehållet och sessionstainten eskaleras i enlighet med detta.

Det spelar roll för nedströmsrouting. Extraherad fakturedata klassificerad som CONFIDENTIAL kan inte skickas till en Slack-kanal klassificerad som PUBLIC. Ett arbetsflöde som bearbetar försäkringsdokument med PHI begränsar automatiskt var den extraherade datan kan flöda. Skriv-ned-förbudsregeln tillämpar detta vid varje gräns och LLM:en har noll befogenhet att kringgå det.

För hälso- och sjukvård och finansiella tjänster specifikt innebär detta att efterlevnadskostnaden för automatiserad dokumentbearbetning sjunker drastiskt. I stället för att bygga skräddarsydda åtkomstkontroller i varje steg av varje pipeline hanterar klassificeringssystemet det enhetligt. En revisor kan spåra exakt vilka dokument som bearbetades, vilken data som extraherades, vart den skickades och bekräfta att ingen data flödade till ett olämpligt mål, allt från de lineageposter som skapas automatiskt vid varje steg.

### Självläkande formatanpassning

När en leverantör ändrar sin fakturamall bryter traditionell automatisering och förblir trasig tills någon manuellt uppdaterar extraherings reglerna. I Triggerfish anpassar sig LLM-subagenten vid nästa körning. Den hittar fortfarande fakturanumret, radposterna och totalen, eftersom den läser för innebörd snarare än position. Extrahering lyckas, data valideras mot samma affärsregler och arbetsflödet slutförs.

Med tiden kan agenten använda korsessionsminnne för att lära sig mönster. Om leverantör A alltid inkluderar en återlageringsavgift som andra leverantörer inte har, kommer agenten ihåg det från tidigare extrahering och vet att leta efter det. Om ett visst betalar-EOB-format alltid placerar justeringskoderna på en ovanlig plats gör agentens minne av tidigare framgångsrika extrahering framtida extrahering mer tillförlitlig.

När en formatändring är tillräckligt betydande för att LLM:ens extraherings säkerhet sjunker under tröskeln som definieras i arbetsflödet dirigerar arbetsflödet dokumentet till en mänsklig granskningskö i stället för att gissa. Människans korrigeringar matas tillbaka genom arbetsflödet och agentens minne lagrar det nya mönstret för framtida referens. Systemet blir smartare med tiden utan att någon behöver skriva om extraheringsregler.

### Pipelineorkestrering

Dokumentinmatning är sällan bara "extrahera och lagra". En komplett pipeline hämtar dokumentet, extraherar strukturerad data, validerar den mot befintliga poster, berikar den med data från andra system, dirigerar undantag för mänsklig granskning och laddar den validerade datan i målsystemet. Arbetsflödesmotorn hanterar allt detta i en enda YAML-definition.

En pipeline för förhandsgodkännande inom sjukvård kan se ut så här: webbläsarautomatisering hämtar faxbilden från leverantörsportalen, en LLM-subagent extraherar patientidentifierare och procedurkoder, ett HTTP-anrop validerar patienten mot EHR:en, en annan subagent bedömer om godkännandet uppfyller medicinska nödvändighetskriterier baserat på den kliniska dokumentationen och resultatet dirigeras antingen till automatiskt godkännande eller till en klinisk granskningskö. Varje steg är klassificerings-spårat. Varje PHI-element är taintat markerat. Det fullständiga granskningsspåret finns automatiskt.

## Hur det ser ut i praktiken

Ett regionalt hälsosystem bearbetar förhandsgodkännandeförfrågningar från fyrtio olika läkarmottagningar, var och en med sin egen formulärlayout, några faxade, några e-postade, några uppladdade till en portal. Det traditionella tillvägagångssättet krävde ett team på åtta personer för att manuellt granska och mata in varje förfrågan, eftersom inget automationsverktyg tillförlitligt kunde hantera formatvariansen.

Med Triggerfish hanterar ett arbetsflöde hela pipelinen. Webbläsarautomatisering eller e-postanalys hämtar dokumenten. LLM-subagenter extraherar strukturerad data oavsett format. Valideringssteg kontrollerar den extraherade datan mot EHR:en och formulärdatabaserna. Ett classification ceiling på RESTRICTED säkerställer att PHI aldrig lämnar pipelinegränsen. Dokument som LLM:en inte kan analysera med hög säkerhet dirigeras till en mänsklig granskare, men den volymen minskar med tiden när agentens minne bygger ett bibliotek med formatmönster.

Teamet på åtta blir två personer som hanterar de undantag som systemet flaggar, plus periodiska kvalitetsrevisioner av de automatiserade extrakten. Formatändringar från läkarmottagningar absorberas automatiskt. Nya formulärlayouter hanteras vid första mötet. Underhållskostnaden som konsumerade det mesta av den traditionella automationsbudgeten sjunker till nästan noll.
