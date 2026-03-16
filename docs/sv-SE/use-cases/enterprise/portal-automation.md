---
title: Automatisering av tredjepartsportaler
description: Hur Triggerfish automatiserar interaktioner med leverantörsportaler, myndighetssajter och betalsystem utan att gå sönder när gränssnittet ändras.
---

# UI-beroende automatisering mot tredjepartsportaler

Varje företag har en lista med portaler som anställda loggar in på manuellt, varje dag, för att utföra arbete som borde vara automatiserat men inte är det. Leverantörsportaler för att kontrollera orderstatus. Myndighetssajter för att lämna in regulatoriska inlämningar. Försäkringsbetalares portaler för att verifiera behörighet och kontrollera anspråksstatus. Statliga licensnämnder för legitimationsverifiering. Skattemyndigheternas portaler för efterlevnadsregistrering.

Dessa portaler har inga API:er. Eller de har API:er som är odokumenterade, hastighetsbegränsade eller begränsade till "föredragna partners" som betalar för åtkomst. Datan finns bakom en inloggningssida, renderad i HTML, och det enda sättet att få ut den är att logga in och navigera gränssnittet.

Traditionell automatisering använder webbläsarskript. Selenium-, Playwright- eller Puppeteer-skript som loggar in, navigerar till rätt sida, hittar element via CSS-selektor eller XPath, extraherar datan och loggar ut. Dessa skript fungerar tills de inte gör det. En portalredesign ändrar CSS-klassnamnen. En ny CAPTCHA läggs till i inloggningsflödet. Navigeringsmenyn flyttas från en sidopanel till en hamburgermeny. En cookiebanner börjar täcka skicka-knappen. Skriptet går tyst sönder och ingen märker det förrän den nedströmsprocess som är beroende av datan börjar producera fel.

Statliga läkarnämnder är ett särskilt brutalt exempel. Det finns femtio av dem, var och en med en annan webbplats, olika layouter, olika autentiseringsmetoder och olika dataformat. De redesignar enligt sina egna scheman utan förvarning. En legitimationsverifieringstjänst som förlitar sig på att skrapa dessa sajter kan ha fem eller tio av sina femtio skript trasiga vid varje given tidpunkt, vart och ett kräver att en utvecklare inspekterar den nya layouten och skriver om selektorerna.

## Hur Triggerfish löser detta

Triggerfish webbläsarautomatisering kombinerar CDP-styrd Chromium med LLM-baserad visuell navigering. Agenten ser sidan som renderade pixlar och tillgänglighetsögonblicksbilder, inte som ett DOM-träd. Den identifierar element utifrån hur de ser ut och vad de gör, inte utifrån deras CSS-klassnamn. När en portal redesignas anpassar sig agenten eftersom inloggningsformulär fortfarande ser ut som inloggningsformulär, navigeringsmenyer fortfarande ser ut som navigeringsmenyer och datatabeller fortfarande ser ut som datatabeller.

### Visuell navigering i stället för selektor-skript

Webbläsarautomationsverktygen fungerar via sju operationer: navigate, snapshot, click, type, select, scroll och wait. Agenten navigerar till en URL, tar en ögonblicksbild av den renderade sidan, resonerar om vad den ser och bestämmer vilken åtgärd den ska vidta. Det finns inget `evaluate`-verktyg som kör godtycklig JavaScript i sidkontexten. Det är ett medvetet säkerhetsbeslut. Agenten interagerar med sidan på samma sätt som en människa skulle göra, via gränssnittet, och kan inte köra kod som kan utnyttjas av en skadlig sida.

När agenten stöter på ett inloggningsformulär identifierar den användarnamns-fältet, lösenordsfältet och skicka-knappen baserat på visuell layout, platshållartext, etiketter och sidstruktur. Den behöver inte veta att användarnamns-fältet har `id="auth-input-email"` eller `class="login-form__email-field"`. När dessa identifierare ändras i en redesign märker agenten det inte eftersom den aldrig förlitade sig på dem.

### Delad domänsäkerhet

Webbläsarnavigering delar samma domänsäkerhetskonfiguration som webbhämtningsoperationer. Ett enda konfigurationsblock i `triggerfish.yaml` definierar SSRF-denylistor, domänallowlistor, domändenylistor och domän-till-klassificeringsmappningar. När agenten navigerar till en leverantörsportal klassificerad som CONFIDENTIAL eskaleras sessionstainten automatiskt till CONFIDENTIAL och alla efterföljande åtgärder i det arbetsflödet är föremål för CONFIDENTIAL-nivåbegränsningar.

SSRF-denylistan är hårdkodad och kan inte åsidosättas. Privata IP-intervall, link-local-adresser och molnmetadataendpoints blockeras alltid. DNS-upplösning kontrolleras innan förfrågan, vilket förhindrar DNS-rebindningsattacker. Det spelar roll eftersom webbläsarautomatisering är den högsta riskattackytan i vilket agentsystem som helst. En skadlig sida som försöker omdirigera agenten till en intern tjänst blockeras innan förfrågan lämnar systemet.

### Vattenmärkning av webbläsarprofil

Varje agent underhåller sin egen webbläsarprofil, som ackumulerar cookies, lokal lagring och sessionsdata när den interagerar med portaler över tid. Profilen bär ett klassificeringsvattenmärke som registrerar den högsta klassificeringsnivå den har använts på. Det här vattenmärket kan bara eskalera, aldrig minska.

Om en agent använder sin webbläsarprofil för att logga in på en CONFIDENTIAL-leverantörsportal vattenmärks profilen som CONFIDENTIAL. En efterföljande session som körs på PUBLIC-klassificering kan inte använda den profilen, vilket förhindrar dataläckage via cachade inloggningsuppgifter, cookies eller sessionstokens som kan innehålla känslig information. Profilens isolering är per agent och vattenmärkeshantering är automatisk.

Det löser ett subtilt men viktigt problem med portalautomatisering. Webbläsarprofiler ackumulerar tillstånd som återspeglar den data de har kommit åt. Utan vattenmärkning kan en profil som loggat in på en känslig portal läcka information via autofyllnadsförslag, cachad siddata eller ihållande cookies till en lägre klassificerad session.

### Hantering av inloggningsuppgifter

Portaluppgifter lagras i operativsystemets nyckelring (personlig nivå) eller företagsvalvet (företagsnivå), aldrig i konfigurationsfiler eller miljövariabler. SECRET_ACCESS-hooken loggar varje hämtning av inloggningsuppgifter. Inloggningsuppgifter löses vid körningstiden av arbetsflödesmotorn och injiceras i webbläsarsessioner via skrivgränssnittet, inte genom att ange formulärvärden programmatiskt. Det innebär att inloggningsuppgifter flödar genom samma säkerhetslager som alla andra känsliga operationer.

### Motståndskraft mot vanliga portaländringar

Här är vad som händer när vanliga portaländringar inträffar:

**Redesign av inloggningssida.** Agenten tar en ny ögonblicksbild, identifierar den uppdaterade layouten och hittar formulärfälten via visuellt sammanhang. Om inte portalen byter till en helt annan autentiseringsmetod (SAML, OAuth, hårdvarutoken) fortsätter inloggningen att fungera utan någon konfigurationsändring.

**Omstrukturering av navigation.** Agenten läser sidan efter inloggning och navigerar till målsektionen baserat på länktext, menyetiketter och sidrubriker snarare än URL-mönster. Om leverantörsportalen har flyttat "Orderstatus" från vänster sidopanel till en övre navigeringsrullgardinsmeny hittar agenten det där.

**Ny cookie-samtycksbanner.** Agenten ser bannern, identifierar acceptera/stäng-knappen, klickar på den och fortsätter med den ursprungliga uppgiften. Det hanteras av LLM:ens generella sidförståelse, inte av en specialändamåls cookie-hanterare.

**CAPTCHA tillagd.** Det är här tillvägagångssättet har ärliga begränsningar. Enkla bild-CAPTCHA:er kan vara lösbara beroende på LLM:ens visuella förmågor, men reCAPTCHA v3 och liknande beteendeanalyssystem kan blockera automatiserade webbläsare. Arbetsflödet dirigerar dessa till en kö för mänsklig intervention snarare än att tyst misslyckas.

**Multifaktorautentiseringsuppmaningar.** Om portalen börjar kräva MFA som inte krävdes tidigare, upptäcker agenten den oväntade sidan, rapporterar situationen via aviseringssystemet och pausar arbetsflödet tills en människa slutför MFA-steget. Arbetsflödet kan konfigureras att vänta på MFA-slutförandet och sedan återuppta från där det slutade.

### Batchbearbetning över flera portaler

Arbetsflödesmotorns `for`-loopstöd innebär att ett enda arbetsflöde kan iterera över flera portalmål. En legitimationsverifieringstjänst kan definiera ett arbetsflöde som kontrollerar licenseringsstatus hos alla femtio statliga läkarnämnder i en enda batchkörning. Varje portalinteraktion körs som ett separat understeg med sin egen webbläsarsession, sin egen klassificeringsspårning och sin egen felhantering. Om tre av femtio portaler misslyckas slutför arbetsflödet de andra fyrtiosju och dirigerar de tre misslyckandena till en granskningskö med detaljerad felkontext.

## Hur det ser ut i praktiken

En legitimationsorganisation verifierar sjukvårdsleverantörers licenser hos statliga läkarnämnder som en del av leverantörsinskrivningsprocessen. Traditionellt loggar verifieringsassistenter in manuellt på varje nämnds webbplats, söker efter leverantören, tar en skärmdump av licensstatusen och matar in datan i legitimationssystemet. Varje verifiering tar fem till femton minuter och organisationen bearbetar hundratals per vecka.

Med Triggerfish hanterar ett arbetsflöde hela verifieringscykeln. Arbetsflödet tar emot ett batch leverantörer med deras licensnummer och målstater. För varje leverantör navigerar webbläsarautomatiseringen till den relevanta statliga nämndens portal, loggar in med lagrade inloggningsuppgifter, söker efter leverantören, extraherar licensstatus och utgångsdatum och lagrar resultatet. Den extraherade datan klassificeras som CONFIDENTIAL eftersom den innehåller leverantörens PII, och skriv-ned-reglerna förhindrar att den skickas till någon kanal under den klassificeringsnivån.

När en statlig nämnd redesignar sin portal anpassar sig agenten vid nästa verifieringsförsök. När en nämnd lägger till en CAPTCHA som blockerar automatiserad åtkomst flaggar arbetsflödet den staten för manuell verifiering och fortsätter att bearbeta resten av batchen. Verifieringsassistenterna övergår från att utföra alla verifieringar manuellt till att bara hantera de undantag som automatiseringen inte kan lösa.
