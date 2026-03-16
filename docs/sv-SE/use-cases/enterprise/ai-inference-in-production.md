---
title: AI-inferens i produktionsarbetsflöden
description: Hur Triggerfish överbryggar klyftan mellan AI-demos och hållbara produktionsarbetsflöden med säkerhetshantering, granskningsspår och arbetsflödesorkestrering.
---

# Integration av AI/ML-inferens i produktionsarbetsflöden

De flesta enterprise-AI-projekt dör i klyftan mellan demo och produktion. Ett team bygger ett proof of concept som använder GPT-4 för att klassificera supportärenden, sammanfatta juridiska dokument eller generera marknadsföringstexter. Demon fungerar. Ledningen blir entusiastisk. Sen stannar projektet i månader och försöker besvara frågor som demon aldrig behövde hantera: Var kommer datan ifrån? Vart tar utdatan vägen? Vem godkänner AI:ns beslut? Vad händer när modellen hallucinar? Hur granskar vi vad den har gjort? Hur förhindrar vi att den kommer åt data den inte borde se? Hur hindrar vi den från att skicka känslig information till fel ställe?

Det är inte hypotetiska bekymmer. 95 procent av enterprise generativa AI-piloter levererar inte finansiell avkastning och anledningen är inte att tekniken inte fungerar. Modellerna är kapabla. Misslyckandet ligger i rörmokeriarbetet: att tillförlitligt integrera AI-inferens i de faktiska affärsarbetsflöden där den behöver verka, med de säkerhetskontroller, felhantering och granskningsspår som produktionssystem kräver.

Det typiska enterprise-svaret är att bygga ett skräddarsytt integrationslager. Ett teknikteam ägnar månader åt att ansluta AI-modellen till datakällorna, bygga pipelinen, lägga till autentisering, implementera loggning, skapa ett godkännandearbetsflöde och skruva på säkerhetskontroller. När integrationen är "produktionsklar" har den ursprungliga modellen ersatts av en nyare, affärskraven har förskjutits och teamet måste börja om.

## Hur Triggerfish löser detta

Triggerfish eliminerar integrationsgapet genom att göra AI-inferens till ett förstaklass-steg i arbetsflödesmotorn, styrt av samma säkerhetshantering, granskningsloggning och klassificeringskontroller som gäller för alla andra operationer i systemet. Ett LLM-subagentsteg i ett Triggerfish-arbetsflöde är inte ett tillägg i efterhand. Det är en inbyggd operation med samma policyh hookar, lineagespårning och skriv-ned-förebyggande som ett HTTP-anrop eller en databasfråga.

### AI som ett arbetsflödessteg, inte som ett separat system

I arbetsflödes-DSL:n definieras ett LLM-inferenssteg med `call: triggerfish:llm`. Uppgiftsbeskrivningen talar om för subagenten vad den ska göra på naturligt språk. Subagenten har tillgång till varje verktyg som är registrerat i Triggerfish. Den kan söka på webben, fråga databaser via MCP-verktyg, läsa dokument, surfa på webbplatser och använda korsessionsminne. När steget slutförs matas dess utdata direkt in i nästa steg i arbetsflödet.

Det innebär att det inte finns något separat "AI-system" att integrera. Inferensen sker inne i arbetsflödet och använder samma inloggningsuppgifter, samma dataanslutningar och samma säkerhetshantering som allt annat. Ett teknikteam behöver inte bygga ett skräddarsytt integrationslager eftersom integrationslagret redan finns.

### Säkerhet som inte kräver skräddarsydd teknik

Den mest tidskrävande delen av att produktionssätta ett AI-arbetsflöde är inte AI:n. Det är säkerhets- och efterlevnadsarbetet. Vilken data kan modellen se? Vart kan den skicka sin utdata? Hur förhindrar vi att den läcker känslig information? Hur loggar vi allt för granskning?

I Triggerfish besvaras dessa frågor av plattformsarkitekturen, inte av projekts-specifik teknik. Klassificeringssystemet spårar datakänslighet vid varje gräns. Sessionstainet eskaleras när modellen kommer åt klassificerad data. Skriv-ned-förebyggande blockerar utdata från att flöda till en kanal som klassificeras under sessionens taintnivå. Varje verktygsanrop, varje dataåtkomst och varje utdatabeslut loggas med fullständig lineage.

Ett AI-arbetsflöde som läser kundposter (CONFIDENTIAL) och genererar en sammanfattning kan inte skicka den sammanfattningen till en offentlig Slack-kanal. Det tillämpas inte av en promptinstruktion som modellen kan ignorera. Det tillämpas av deterministisk kod i PRE_OUTPUT-hooken som modellen inte kan se, inte kan ändra och inte kan kringgå. Policyh hookarna körs under LLM-lagret. LLM:en begär en åtgärd och policylagret bestämmer om det ska tillåtas. Timeout är lika med avvisning. Det finns ingen väg från modellen till omvärlden som inte passerar genom hantering.

### Granskningsspår som redan finns

Varje AI-beslut i ett Triggerfish-arbetsflöde genererar lineageposter automatiskt. Lineagen spårar vilken data modellen kom åt, vilken klassificeringsnivå den bar, vilka transformationer som tillämpades och vart utdatan skickades. Det är inte en loggfunktion som behöver aktiveras eller konfigureras. Det är en strukturell egenskap hos plattformen. Varje dataelement bär härstamningsmetadata från skapande via varje transformation till sin slutliga destination.

För reglerade branscher innebär detta att efterlevnadsbevis för ett AI-arbetsflöde finns från dag ett. En revisor kan spåra valfri AI-genererad utdata tillbaka genom hela kedjan: vilken modell producerade den, vilken data den baserades på, vilka verktyg modellen använde under resonemang, vilken klassificeringsnivå som gällde vid varje steg och om några policyhanteringsåtgärder inträffade. Denna bevisinsamling sker automatiskt eftersom den är inbyggd i hanteringshookarna, inte påskruvad som ett rapporteringslager.

### Modellflexibilitet utan omarkitektur

Triggerfish stöder flera LLM-leverantörer via LlmProvider-gränssnittet: Anthropic, OpenAI, Google, lokala modeller via Ollama och OpenRouter för valfri routad modell. Leverantörsvalet är konfigurerbart per agent med automatisk failover. När en bättre modell blir tillgänglig eller en leverantör ändrar prissättningen sker bytet på konfigurationsnivå utan att röra arbetsflödesdefinitionerna.

Det adresserar direkt problemet med "projektet är föråldrat innan det levereras". Arbetsflödesdefinitionerna beskriver vad AI:n ska göra, inte vilken modell som gör det. Att byta från GPT-4 till Claude till en finjusterad lokal modell ändrar ett konfigurationsvärde. Arbetsflödet, säkerhetskontrollerna, granskningsspåren och integrationspunkterna förblir alla exakt likadana.

### Cron, webhooks och händelsedriven körning

AI-arbetsflöden som körs efter schema eller som svar på händelser behöver inte en människa för att starta dem. Schemaläggaren stöder femfältiga cron-uttryck för återkommande arbetsflöden och webhook-endpoints för händelsedrivna triggers. Ett dagligt rapportgenereringsarbetsflöde körs kl. 6. Ett dokumentklassificeringsarbetsflöde aktiveras när en ny fil anländer via webhook. Ett sentimentanalysarbetsflöde triggas vid varje nytt supportärende.

Varje schemalagd eller händelsedriven körning skapar en isolerad session med frisk taint. Arbetsflödet körs i sitt eget säkerhetskontext, oberoende av interaktiva sessioner. Om det cron-triggade arbetsflödet kommer åt CONFIDENTIAL-data klassificeras bara den körningens historik som CONFIDENTIAL. Andra schemalagda arbetsflöden som körs på PUBLIC-klassificering påverkas inte.

### Felhantering och mänsklig tillsyn

Produktions-AI-arbetsflöden måste hantera fel på ett elegant sätt. Arbetsflödes-DSL:n stöder `raise` för explicita feltillstånd och try/catch-semantik via felhantering i uppgiftsdefinitioner. När en LLM-subagent producerar utdata med låg säkerhet eller stöter på en situation den inte kan hantera, kan arbetsflödet dirigera till en mänsklig godkänningskö, skicka en avisering via aviseringstjänsten eller vidta en reservåtgärd.

Aviseringstjänsten levererar aviseringar via alla anslutna kanaler med prioritet och avduplicering. Om ett arbetsflöde behöver mänskligt godkännande innan en AI-genererad kontraktsändring skickas kan godkänningsbegäran anlända på Slack, WhatsApp, e-post eller var godkännaren än befinner sig. Arbetsflödet pausar tills godkännandet kommer och fortsätter sedan från där det slutade.

## Hur det ser ut i praktiken

En juridisk avdelning vill automatisera kontraktsgranskning. Det traditionella tillvägagångssättet: sex månaders skräddarsydd utveckling för att bygga en pipeline som extraherar klausuler från uppladdade kontrakt, klassificerar risknivåer, flaggar icke-standardiserade villkor och genererar en sammanfattning för den granskande advokaten. Projektet kräver ett dedikerat teknikteam, en skräddarsydd säkerhetsgranskning, ett efterlevnadsgodkännande och löpande underhåll.

Med Triggerfish tar skrivandet av arbetsflödesdefinitionen en dag. Uppladdning triggar en webhook. En LLM-subagent läser kontraktet, extraherar nyckelklausuler, klassificerar risknivåer och identifierar icke-standardiserade villkor. Ett valideringssteg kontrollerar extraktionen mot byråns klausulbibliotek lagrat i minnet. Sammanfattningen dirigeras till den tilldelade advokatens aviseringskanal. Hela pipelinen körs på RESTRICTED-klassificering eftersom kontrakt innehåller klientprivilegierad information och skriv-ned-förebyggande säkerställer att inga kontraktsdata läcker till en kanal under RESTRICTED.

När byrån byter LLM-leverantör (för att en ny modell hanterar juridiskt språk bättre, eller för att den nuvarande leverantören höjer priserna) är ändringen en enda rad i konfigurationen. Arbetsflödesdefinitionen, säkerhetskontrollerna, granskningsspåret och aviseringsroutningen fortsätter alla att fungera utan ändringar. När byrån lägger till en ny klausultyp i sitt riskramverk fångar LLM-subagenten upp det utan att skriva om extraheringsregler eftersom den läser för innebörd, inte mönster.

Efterlevnadsteamet får ett fullständigt granskningsspår från dag ett. Varje behandlat kontrakt, varje extraherad klausul, varje tilldelad riskklassificering, varje skickad avisering och varje advokatgodkännande registrerat, med fullständig lineage tillbaka till källdokumentet. Bevisinsamlingen som hade tagit veckor av skräddarsytt rapporteringsarbete finns automatiskt som en strukturell egenskap hos plattformen.
