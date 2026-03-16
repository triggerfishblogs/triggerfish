---
title: Orkestrering mellan system
description: Hur Triggerfish hanterar arbetsflöden som spänner över 12+ system med kontextuella bedömningar vid varje steg, utan den skörhet som dödar traditionell automatisering.
---

# Orkestrering mellan system med kontextuella bedömningar

Ett typiskt procure-to-pay-arbetsflöde berör ett dussintal system. En inköpsförfrågan börjar i en plattform, dirigeras till en godkännandekedja i en annan, triggar en leverantörssökning i en tredje, skapar en inköpsorder i en fjärde, startar en mottagningsprocess i en femte, matchar fakturor i en sjätte, schemalägger betalning i en sjunde och registrerar allt i en åttonde. Varje system har sitt eget API, sitt eget uppdateringsschema, sin egen autentiseringsmodell och sina egna fellägen.

Traditionell automatisering hanterar detta med stela pipelines. Steg ett anropar API A, tolkar svaret, skickar ett fält till steg två som anropar API B. Det fungerar tills det inte gör det. En leverantörspost har ett lite annorlunda format än väntat. Ett godkännande kommer tillbaka med en statuskod som pipelinen inte designades för. Ett nytt obligatoriskt fält dyker upp i en API-uppdatering. Ett trasigt steg bryter hela kedjan och ingen vet om det förrän en nedströmsprocess misslyckas dagar senare.

Det djupare problemet är inte teknisk skörhet. Det är att verkliga affärsprocesser kräver omdöme. Ska den här fakturadiskrepansen eskaleras eller lösas automatiskt? Motiverar det här leverantörens mönster med sena leveranser en kontraktsöversyn? Är den här godkännandebegäran tillräckligt brådskande för att hoppa över standardroutern? Dessa beslut lever för närvarande i folks huvuden, vilket innebär att automatiseringen bara kan hantera den lyckliga vägen.

## Hur Triggerfish löser detta

Triggerfish arbetsflödesmotor kör YAML-baserade arbetsflödesdefinitioner som blandar deterministisk automatisering med AI-resonemang i en enda pipeline. Varje steg i arbetsflödet passerar genom samma säkerhetshanteringslager som styr alla Triggerfish-operationer, så klassificeringsspårning och granskningsspår håller över hela kedjan oavsett hur många system som är inblandade.

### Deterministiska steg för deterministiskt arbete

När ett arbetsflödessteg har en känd indata och en känd utdata körs det som ett standard HTTP-anrop, skalkommando eller MCP-verktygsanrop. Ingen LLM-inblandning, ingen latensstraffavgift, ingen inferenskostnad. Arbetsflödesmotorn stöder `call: http` för REST-API:er, `call: triggerfish:mcp` för valfri ansluten MCP-server och `run: shell` för kommandoradsverktyg. Dessa steg körs precis som traditionell automatisering, för för förutsägbart arbete är traditionell automatisering rätt tillvägagångssätt.

### LLM-subagenter för kontextuella bedömningar

När ett arbetsflödessteg kräver kontextuellt resonemang skapar motorn en riktig LLM-subagenssession med `call: triggerfish:llm`. Det är inte ett enda prompt/svar-utbyte. Subagenten har tillgång till varje verktyg som registrerats i Triggerfish, inklusive webbsökning, minne, webbläsarautomatisering och alla anslutna integrationer. Den kan läsa dokument, fråga databaser, jämföra poster och fatta ett beslut baserat på allt den hittar.

Subagentens utdata matas direkt in i nästa arbetsflödessteg. Om den kom åt klassificerad data under resonemanget eskaleras sessionstainten automatiskt och sprids tillbaka till det överordnade arbetsflödet. Arbetsflödesmotorn spårar detta, så ett arbetsflöde som startade vid PUBLIC men träffade CONFIDENTIAL-data under en kontextuell bedömning får hela sin körhistorik lagrad på CONFIDENTIAL-nivå. En lägre klassificerad session kan inte ens se att arbetsflödet kördes.

### Villkorlig förgrening baserad på verkligt sammanhang

Arbetsflödes-DSL:n stöder `switch`-block för villkorlig routing, `for`-loopar för batchbearbetning och `set`-operationer för uppdatering av arbetsflödestillstånd. Kombinerat med LLM-subagentsteg som kan utvärdera komplexa villkor innebär detta att arbetsflödet kan förgrenas baserat på faktiskt affärssammanhang snarare än bara fältvärden.

Ett inköpsarbetsflöde kan routas annorlunda baserat på subagentens bedömning av leverantörsrisken. Ett onboardingarbetsflöde kan hoppa över steg som inte är relevanta för en viss roll. Ett incidentresponsarbetsflöde kan eskalera till olika team baserat på subagentens rotorsaksanalys. Förgreningslogiken finns i arbetsflödesdefinitionen, men beslutsindata kommer från AI-resonemang.

### Självläkande vid systemförändringar

När ett deterministiskt steg misslyckas för att ett API ändrat sitt svarsformat eller ett system returnerade ett oväntat fel stannar arbetsflödet inte bara. Motorn kan delegera det misslyckade steget till en LLM-subagent som läser felet, inspekterar svaret och försöker ett alternativt tillvägagångssätt. Ett API som lade till ett nytt obligatoriskt fält hanteras av subagenten som läser felmeddelandet och justerar förfrågan. Ett system som ändrade sitt autentiseringsflöde navigeras av webbläsarautomationsverktygen.

Det betyder inte att varje fel löses magiskt. Men det innebär att arbetsflödet degraderar elegant i stället för att tyst misslyckas. Subagenten hittar antingen en väg framåt eller producerar en tydlig förklaring av vad som förändrats och varför manuell intervention behövs, i stället för en kryptisk felkod begravd i en loggfil som ingen kontrollerar.

### Säkerhet över hela kedjan

Varje steg i ett Triggerfish-arbetsflöde passerar genom samma policyhanteringshookar som direkta verktygsanrop. PRE_TOOL_CALL validerar behörigheter och kontrollerar hastighetsgränser innan körning. POST_TOOL_RESPONSE klassificerar returnerad data och uppdaterar sessionstainten. PRE_OUTPUT säkerställer att inget lämnar systemet på en klassificeringsnivå som är högre än vad målet tillåter.

Det innebär att ett arbetsflöde som läser från ditt CRM (CONFIDENTIAL), bearbetar data via ett LLM och skickar en sammanfattning till Slack inte råkar läcka konfidentiella detaljer till en offentlig kanal. Skriv-ned-förbudsregeln fångar det vid PRE_OUTPUT-hooken, oavsett hur många mellanliggande steg data passerade. Klassificeringen reser med data genom hela arbetsflödet.

Arbetsflödesdefinitionen kan sätta ett `classification_ceiling` som förhindrar arbetsflödet från att någonsin beröra data över en specificerad nivå. Ett veckosummaryarbetsflöde klassificerat som INTERNAL kan inte komma åt CONFIDENTIAL-data även om det har inloggningsuppgifterna för att göra det. Taket tillämpas i kod, inte genom att hoppas att LLM:en respekterar en promptinstruktion.

### Cron- och webhook-triggers

Arbetsflöden kräver inte att någon startar dem manuellt. Schemaläggaren stöder cron-baserade triggers för återkommande arbetsflöden och webhook-triggers för händelsedriven körning. Ett morgonbriefingarbetsflöde körs kl. 7. Ett PR-granskningsarbetsflöde aktiveras när GitHub skickar en webhook. Ett fakturabearbetningsarbetsflöde triggas när en ny fil dyker upp på en delad enhet.

Webhookhändelser bär sin egen klassificeringsnivå. En GitHub-webhook för ett privat arkiv klassificeras automatiskt som CONFIDENTIAL baserat på domänklassificeringsmappningarna i säkerhetskonfigurationen. Arbetsflödet ärver den klassificeringen och all nedströmshantering tillämpas.

## Hur det ser ut i praktiken

Ett medelstort företag som kör procure-to-pay via NetSuite, Coupa, DocuSign och Slack definierar ett Triggerfish-arbetsflöde som hanterar hela cykeln. Deterministiska steg hanterar API-anropen för att skapa inköpsorder, dirigera godkännanden och matcha fakturor. LLM-subagentsteg hanterar undantagen: fakturor med radposter som inte matchar PO:n, leverantörer som lämnade in dokumentation i ett oväntat format, godkännandebegäranden som behöver kontext om begärarens historik.

Arbetsflödet körs på en egenhanterad Triggerfish-instans. Ingen data lämnar företagets infrastruktur. Klassificeringssystemet säkerställer att finansiella data från NetSuite förblir på CONFIDENTIAL och inte kan skickas till en Slack-kanal klassificerad som INTERNAL. Granskningsspåret fångar varje beslut som LLM-subagenten fattade, varje verktyg den anropade och varje dataelement den kom åt, lagrat med fullständig lineagespårning för efterlevnadsgranskning.

När Coupa uppdaterar sitt API och ändrar ett fältnamn misslyckas arbetsflödets deterministiska HTTP-steg. Motorn delegerar till en subagent som läser felet, identifierar det ändrade fältet och försöker igen med korrekt parameter. Arbetsflödet slutförs utan mänsklig inblandning och incidenten loggas så att en ingenjör kan uppdatera arbetsflödesdefinitionen för att hantera det nya formatet framöver.
