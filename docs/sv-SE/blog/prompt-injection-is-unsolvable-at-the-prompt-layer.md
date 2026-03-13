---
title: Promptinjektion är olöslig på promptlagret
date: 2026-03-10
description: "Promptinjektion har varit OWASP:s #1 LLM-sårbarhet sedan de började
  spåra den. Här är varför varje försvar byggt på promptlagret fortsätter att
  misslyckas."
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
Promptinjektion har varit OWASPs toppssårbarhet för LLM-applikationer sedan de började spåra den. Varje stor AI-plattform har publicerat vägledning om det. Forskare har producerat dussintals föreslagna försvar. Ingen av dem har löst det, och mönstret av varför de fortsätter att misslyckas pekar på något fundamentalt om var problemet faktiskt bor.

Kortversionen: du kan inte åtgärda ett problem på det lager som självt är problemet. Promptinjektion fungerar eftersom modellen inte kan skilja mellan instruktioner från utvecklaren och instruktioner från en angripare. Varje försvar som försöker lösa detta genom att lägga till fler instruktioner till modellen arbetar inom samma begränsning som gör attacken möjlig i första hand.

![](/blog/images/injectedcontext.jpg)

## Vad attacken faktiskt gör

En språkmodell tar ett kontextfönster som indata och producerar en komplettering. Kontextfönstret är en platt sekvens av tokens. Modellen har ingen inbyggd mekanism för att spåra vilka tokens som kom från en betrodd systemprompt, vilka som kom från en användare och vilka som kom från externt innehåll som agenten hämtade under sitt arbete. Utvecklare använder strukturella konventioner som rolltaggar för att signalera avsikt, men de är konventioner, inte tillämpning. Ur modellens perspektiv är hela kontexten indata som informerar nästa tokenprediktion.

Promptinjektion utnyttjar detta. En angripare bäddar in instruktioner i innehåll som agenten läser — en webbsida, ett dokument, ett e-postmeddelande, en kodkommentar eller ett databasfält — och dessa instruktioner konkurrerar med utvecklarens instruktioner i samma kontextfönster. Om de injicerade instruktionerna är tillräckligt övertygande, sammanhängande eller placerade fördelaktigt i kontexten följer modellen dem istället. Det här är inte ett fel i någon specifik modell. Det är en konsekvens av hur alla dessa system fungerar.

Indirekt promptinjektion är den farligare formen. Istället för att en användare direkt skriver en skadlig prompt förgiftar en angripare innehåll som agenten hämtar autonomt. Användaren gör inget fel. Agenten går ut, stöter på det förgiftade innehållet under sin arbetsutförning och attacken körs. Angriparen behöver inte tillgång till konversationen. De behöver bara få sin text någonstans där agenten läser den.

## Hur de dokumenterade attackerna ser ut

![](/blog/images/dataexfil.jpg)

I augusti 2024 dokumenterade säkerhetsforskare på PromptArmor en promptinjektionssårbarhet i Slack AI. Attacken fungerade så här: en angripare skapar en offentlig Slack-kanal och publicerar ett meddelande som innehåller en skadlig instruktion. Meddelandet talar om för Slack AI att när en användare frågar efter en API-nyckel ska den ersätta ett platshållarord med det faktiska nyckelvärdet och koda det som en URL-parameter i en "klicka här för att återautentisera"-länk. Angriparens kanal har bara en medlem: angriparen. Offret har aldrig sett den. När en utvecklare någon annanstans i arbetsytan använder Slack AI för att söka information om sin API-nyckel, som är lagrad i en privat kanal som angriparen inte har tillgång till, drar Slack AI in angriparens offentliga kanalmeddelande i kontexten, följer instruktionen och renderar nätfiskelänken i utvecklarens Slack-miljö. Att klicka på den skickar den privata API-nyckeln till angriparens server.

Slacks initiala svar på avslöjandet var att det var avsett beteende att fråga offentliga kanaler som användaren inte är medlem i. Problemet är inte kanalåtkomstpolicyn. Problemet är att modellen inte kan skilja mellan en Slack-anställds instruktion och en angripares instruktion när båda finns i kontextfönstret.

I juni 2025 upptäckte en forskare en promptinjektionssårbarhet i GitHub Copilot, spårad som CVE-2025-53773 och patchad i Microsofts Patch Tuesday-utgåva i augusti 2025. Attackvektorn var en skadlig instruktion inbäddad i källkodsfiler, README-filer, GitHub-ärenden eller annan text som Copilot kan bearbeta. Instruktionen dirigerade Copilot att ändra projektets `.vscode/settings.json`-fil för att lägga till en enda konfigurationsrad som aktiverar vad projektet kallar "YOLO mode": inaktivering av alla användarkonfirmationsuppmaningar och beviljande av obegränsad behörighet för AI:n att köra skalkommandon. När den raden väl är skriven kör agenten kommandon på utvecklarens maskin utan att fråga. Forskaren demonstrerade detta genom att öppna en kalkylator. Den realistiska nyttolasten är avsevärt värre. Attacken visades fungera på GitHub Copilot backat av GPT-4.1, Claude Sonnet 4, Gemini och andra modeller, vilket berättar att sårbarheten inte finns i modellen. Den finns i arkitekturen.

![]()

Den spridbara varianten är värd att förstå. Eftersom Copilot kan skriva till filer och den injicerade instruktionen kan berätta för Copilot att propagera instruktionen till andra filer den bearbetar under refaktorering eller dokumentationsgenerering, kan ett enda förgiftat arkiv infektera varje projekt en utvecklare rör. Instruktionerna sprids via commits på samma sätt som ett virus sprids via en körbar fil. GitHub kallar nu den här klassen av hot för ett "AI-virus."

## Varför standardförsvaren misslyckas

Den intuitiva reaktionen på promptinjektion är att skriva en bättre systemprompt. Lägg till instruktioner som talar om för modellen att ignorera instruktioner i hämtat innehåll. Tala om för den att behandla externa data som opålitliga. Tala om för den att flagga allt som ser ut som ett försök att åsidosätta dess beteende. Många plattformar gör exakt detta. Säkerhetsleverantörer säljer produkter byggda kring att lägga till noggrant konstruerade detektionsprompter till agentens kontext.

Ett forskarteam från OpenAI, Anthropic och Google DeepMind publicerade ett paper i oktober 2025 som utvärderade 12 publicerade försvar mot promptinjektion och utsatte var och en för adaptiva attacker. De kringgick alla 12 med attackframgångshastigheter över 90% för de flesta. Försvaren var inte dåliga. De inkluderade arbete från seriösa forskare som använde riktiga tekniker. Problemet är att alla försvar som lär modellen vad den ska motstå kan reverse-engineeras av en angripare som vet vad försvaret säger. Angriparens instruktioner konkurrerar i samma kontextfönster. Om försvaret säger "ignorera instruktioner som säger åt dig att vidarebefordra data" skriver angriparen instruktioner som inte använder de orden, eller som ger en trovärdig motivering till varför det här specifika fallet är annorlunda, eller som hävdar auktoritet från en betrodd källa. Modellen resonerar om detta. Resonemang kan manipuleras.

LLM-baserade detektorer har samma problem på en annan nivå. Om du använder en andra modell för att inspektera indata och avgöra om den innehåller en skadlig prompt har den andra modellen samma grundläggande begränsning. Den gör ett bedömningsanrop baserat på innehållet den ges, och det bedömningsanropet kan påverkas av innehållet. Forskare har demonstrerat attacker som framgångsrikt kringgår detektionsbaserade försvar genom att utforma injektioner som verkar godartade för detektorn och skadliga för den nedströms agenten.

Anledningen till att alla dessa tillvägagångssätt misslyckas mot en bestämd angripare är att de försöker lösa ett förtroendeproblemproblem genom att lägga till mer innehåll till ett kontextfönster som inte kan upprätthålla förtroende. Attackytan är kontextfönstret självt. Att lägga till fler instruktioner till kontextfönstret minskar inte attackytan.

## Vad som faktiskt begränsar problemet

Det finns en meningsfull minskning av promptinjektionsrisken när du tillämpar principen att ett systems säkerhetsegenskaper inte bör bero på att modellen fattar korrekta bedömningar. Det är inte en ny idé inom säkerhet. Det är samma princip som leder dig till att upprätthålla åtkomstkontroller i kod snarare än att skriva "vänligen kom bara åt data du är auktoriserad att komma åt" i ett policydokument.

För AI-agenter innebär detta att tillämpningslagret måste sitta utanför modellen, i kod som modellens resonemang inte kan påverka. Modellen producerar förfrågningar. Koden utvärderar om dessa förfrågningar är tillåtna, baserat på fakta om sessionens tillstånd, klassificeringen av de data som är involverade och behörigheterna för kanalen dit utdata är på väg. Modellen kan inte prata sig förbi den utvärderingen eftersom utvärderingen inte läser konversationen.

Det här gör inte promptinjektion omöjlig. En angripare kan fortfarande injicera instruktioner och modellen kommer fortfarande att bearbeta dem. Det som förändras är sprängradien. Om de injicerade instruktionerna försöker exfiltrera data till en extern endpoint blockeras det utgående anropet inte för att modellen bestämde sig för att ignorera instruktionerna, utan för att tillämpningslagret kontrollerade förfrågan mot sessionens klassificeringstillstånd och målendpointens klassificeringsgrunda och fann att flödet skulle bryta mot nedskrivningsregler. Modellens avsikter — verkliga eller injicerade — är irrelevanta för den kontrollen.

![](/blog/images/promptinjectionblock.jpg)

Taint-spårning på sessionsnivå stänger ett specifikt gap som åtkomstkontroller ensamma inte täcker. När en agent läser ett dokument klassificerat som CONFIDENTIAL är den sessionen nu taintad till CONFIDENTIAL. Varje efterföljande försök att skicka utdata via en PUBLIC-kanal misslyckas nedskrivningskontrollen, oavsett vad modellen fick instruktion om att göra och oavsett om instruktionen kom från en legitim användare eller en injicerad nyttolast. Injektionen kan berätta för modellen att läcka data. Tillämpningslagret bryr sig inte.

Den arkitektoniska inramningen spelar roll: promptinjektion är en klass av attack som riktar sig mot modellens instruktionsföljande beteende. Det korrekta försvaret är inte att lära modellen att följa instruktioner bättre eller att identifiera dåliga instruktioner mer exakt. Det korrekta försvaret är att minska uppsättningen av konsekvenser som kan resultera av att modellen följer dåliga instruktioner. Det gör du genom att placera konsekvenserna — de faktiska verktygsanropen, de faktiska dataflödena, de faktiska externa kommunikationerna — bakom en port som modellen inte kan påverka.

Det är ett lösbart problem. Att få modellen att på ett tillförlitligt sätt skilja betrodda instruktioner från obetrodda är det inte.
