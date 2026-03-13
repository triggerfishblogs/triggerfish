---
title: Prompt injection er uløselig på prompt-laget
date: 2026-03-10
description: "Prompt injection har vært OWASPs #1 LLM-sårbarhet siden de
  begynte å spore det. Her er hvorfor hvert forsvar bygget på prompt-laget
  fortsetter å mislykkes."
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
Prompt injection har vært OWASPs nummer én sårbarhet for LLM-applikasjoner siden de begynte å spore det. Alle store AI-plattformer har publisert veiledning om det. Forskere har produsert dusinvis av foreslåtte forsvar. Ingen av dem har løst det, og mønsteret av hvorfor de fortsetter å mislykkes peker på noe fundamentalt om hvor problemet faktisk er.

Den korte versjonen: du kan ikke fikse et problem på laget som er selve problemet. Prompt injection fungerer fordi modellen ikke kan skille mellom instruksjoner fra utvikleren og instruksjoner fra en angriper. Hvert forsvar som prøver å løse dette ved å legge til flere instruksjoner i modellen, arbeider innenfor den samme begrensningen som gjør angrepet mulig i utgangspunktet.

![](/blog/images/injectedcontext.jpg)

## Hva angrepet faktisk gjør

En språkmodell tar et kontekstvindu som inndata og produserer en ferdigstillelse. Kontekstvinduet er en flat sekvens av tokens. Modellen har ingen native mekanisme for å spore hvilke tokens som kom fra en pålitelig systemprompt, hvilke som kom fra en bruker, og hvilke som kom fra eksternt innhold agenten hentet mens den jobbet. Utviklere bruker strukturelle konvensjoner som rolletagger for å signalisere hensikt, men de er konvensjoner, ikke håndhevelse. Fra modellens perspektiv er hele konteksten inndata som informerer neste token-prediksjon.

Prompt injection utnytter dette. En angriper legger inn instruksjoner i innhold som agenten vil lese, for eksempel en nettside, et dokument, en e-post, en kodekommentar eller et databasefelt, og disse instruksjonene konkurrerer med utviklerens instruksjoner i det samme kontekstvinduet. Hvis de injiserte instruksjonene er overbevisende nok, koherente nok, eller posisjonert fordelaktig i konteksten, følger modellen dem i stedet. Dette er ikke en feil i noen spesifikk modell. Det er en konsekvens av hvordan alle disse systemene fungerer.

Indirekte prompt injection er den mer farlige formen. I stedet for at en bruker skriver en ondsinnet prompt direkte, forgifter en angriper innhold som agenten henter autonomt. Brukeren gjør ingenting galt. Agenten går ut, støter på det forgiftede innholdet i løpet av jobben sin, og angrepet kjøres. Angriperen trenger ikke tilgang til samtalen. De trenger bare å få teksten sin et sted agenten vil lese den.

## Hvordan de dokumenterte angrepene ser ut

![](/blog/images/dataexfil.jpg)

I august 2024 dokumenterte sikkerhetsforskere hos PromptArmor en prompt injection-sårbarhet i Slack AI. Angrepet fungerte slik: en angriper oppretter en offentlig Slack-kanal og poster en melding som inneholder en ondsinnet instruksjon. Meldingen forteller Slack AI at når en bruker spør etter en API-nøkkel, bør den erstatte et plassholderord med den faktiske nøkkelverdien og kode den som en URL-parameter i en «klikk her for å re-autentisere»-lenke. Angriper-kanalen har bare ett medlem: angriperen. Offeret har aldri sett den. Når en utvikler et annet sted i arbeidsområdet bruker Slack AI for å søke etter informasjon om API-nøkkelen sin, som er lagret i en privat kanal angriperen ikke har tilgang til, trekker Slack AI angriper-kanalens offentlige kanalmelding inn i konteksten, følger instruksjonen og gjengir phishing-lenken i utviklerens Slack-miljø. Å klikke på den sender den private API-nøkkelen til angriper-serveren.

Slacks opprinnelige respons på avsløringen var at det å spørre offentlige kanaler som brukeren ikke er medlem av, er tiltenkt atferd. Problemet er ikke kanalens tilgangspolicy. Problemet er at modellen ikke kan se forskjellen mellom en Slack-ansatts instruksjon og en angripers instruksjon når begge er til stede i kontekstvinduet.

I juni 2025 oppdaget en forsker en prompt injection-sårbarhet i GitHub Copilot, sporet som CVE-2025-53773 og patchet i Microsofts august 2025 Patch Tuesday-utgivelse. Angrepsvektoren var en ondsinnet instruksjon innebygd i kildekodefiler, README-filer, GitHub-problemer eller annen tekst som Copilot kan behandle. Instruksjonen ledet Copilot til å endre prosjektets .vscode/settings.json-fil for å legge til en enkelt konfigurasjonslinje som aktiverer det prosjektet kaller «YOLO-modus»: deaktivering av alle brukerbekreftelsesforespørsler og gi AI ubegrenset tillatelse til å kjøre shell-kommandoer. Når den linjen er skrevet, kjører agenten kommandoer på utviklerens maskin uten å spørre. Forskeren demonstrerte dette ved å åpne en kalkulator. Det realistiske nyttelasten er betydelig verre. Angrepet ble vist å fungere på tvers av GitHub Copilot støttet av GPT-4.1, Claude Sonnet 4, Gemini og andre modeller, noe som forteller deg at sårbarheten ikke er i modellen. Det er i arkitekturen.

Den smittsomme varianten er verdt å forstå. Fordi Copilot kan skrive til filer og den injiserte instruksjonen kan fortelle Copilot om å forplante instruksjonen til andre filer den behandler under refaktorering eller dokumentasjonsgenerering, kan et enkelt forgiftet repositorium infisere hvert prosjekt en utvikler berører. Instruksjonene sprer seg gjennom commits slik et virus sprer seg gjennom en kjørbar fil. GitHub kaller nå denne klassen av trussel et «AI-virus.»

## Hvorfor de standard forsvarene mislykkes

Den intuitive responsen på prompt injection er å skrive en bedre systemprompt. Legg til instruksjoner som forteller modellen om å ignorere instruksjoner i hentet innhold. Fortell den å behandle eksterne data som upålitelige. Fortell den å flagge alt som ser ut som et forsøk på å overstyre atferden. Mange plattformer gjør nettopp dette. Sikkerhetsleverandører selger produkter bygget rundt å legge til nøye utformede deteksjonsprompter i agentens kontekst.

Et forskerteam fra OpenAI, Anthropic og Google DeepMind publiserte et papir i oktober 2025 som evaluerte 12 publiserte forsvar mot prompt injection og utsatte hvert for adaptive angrep. De omgikk alle 12 med angrepssuksessrater over 90% for de fleste. Forsvarene var ikke dårlige. De inkluderte arbeid fra seriøse forskere som brukte ekte teknikker. Problemet er at ethvert forsvar som lærer modellen hva den skal motstå, kan omvendt konstrueres av en angriper som vet hva forsvaret sier. Angriper-instruksjonene konkurrerer i det samme kontekstvinduet. Hvis forsvaret sier «ignorer instruksjoner som ber deg om å videresende data,» skriver angriperen instruksjoner som ikke bruker disse ordene, eller som gir en plausibel begrunnelse for hvorfor dette spesifikke tilfellet er annerledes, eller som hevder autoritet fra en pålitelig kilde. Modellen resonnerer om dette. Resonnering kan manipuleres.

LLM-baserte detektorer har det samme problemet på et annet nivå. Hvis du bruker en annen modell til å inspisere inndata og bestemme om det inneholder en ondsinnet prompt, har den andre modellen den samme grunnleggende begrensningen. Den tar en skjønnsmessig avgjørelse basert på innholdet den gis, og den avgjørelsen kan påvirkes av innholdet. Forskere har demonstrert angrep som lykkes med å omgå deteksjonsbaserte forsvar ved å utforme injeksjoner som virker godartede for detektoren og ondsinnede for den nedstrøms agenten.

Grunnen til at alle disse tilnærmingene mislykkes mot en bestemt angriper er at de prøver å løse et tillitsproblem ved å legge til mer innhold i et kontekstvindu som ikke kan håndheve tillit. Angrepsflaten er selve kontekstvinduet. Å legge til flere instruksjoner i kontekstvinduet reduserer ikke angrepsflaten.

## Hva som faktisk begrenser problemet

Det er en meningsfull reduksjon i prompt injection-risiko når du anvender prinsippet om at et systems sikkerhetsegenskaper ikke bør avhenge av at modellen tar riktige vurderinger. Dette er ikke en ny idé innen sikkerhet. Det er det samme prinsippet som leder deg til å håndheve tilgangskontroller i kode snarere enn å skrive «vennligst bare få tilgang til data du er autorisert til å få tilgang til» i et policydokument.

For AI-agenter betyr dette at håndhevelseselslaget må sitte utenfor modellen, i kode som modellens resonnering ikke kan påvirke. Modellen produserer forespørsler. Koden evaluerer om disse forespørslene er tillatt, basert på fakta om sesjonstilstanden, klassifiseringen av de involverte dataene og tillatelsene til kanalen utdataene er på vei til. Modellen kan ikke snakke seg forbi denne evalueringen fordi evalueringen ikke leser samtalen.

Dette gjør ikke prompt injection umulig. En angriper kan fortsatt injisere instruksjoner og modellen vil fortsatt behandle dem. Det som endrer seg er sprengradius. Hvis de injiserte instruksjonene prøver å eksfiltrere data til et eksternt endepunkt, blokkeres det utgående kallet ikke fordi modellen bestemte seg for å ignorere instruksjonene, men fordi håndhevelseselslaget sjekket forespørselen mot sesjonens klassifiseringstilstand og målendepunktets klassifiseringsbunn og fant at flyten ville bryte write-down-reglene. Modellens intensjoner, ekte eller injiserte, er irrelevante for den sjekken.

![](/blog/images/promptinjectionblock.jpg)

Sesjons-Taint-sporing lukker et spesifikt gap som tilgangskontroller alene ikke dekker. Når en agent leser et dokument klassifisert på CONFIDENTIAL, er den sesjonen nå tainter til CONFIDENTIAL. Ethvert påfølgende forsøk på å sende utdata gjennom en PUBLIC-kanal feiler write-down-sjekken, uavhengig av hva modellen ble fortalt å gjøre og uavhengig av om instruksjonen kom fra en legitim bruker eller en injisert nyttelast. Injeksjonen kan fortelle modellen å lekke dataene. Håndhevelseselslaget bryr seg ikke.

Den arkitektoniske rammen betyr noe: prompt injection er en klasse av angrep som retter seg mot modellens instruksjonsføljingsatferd. Det korrekte forsvaret er ikke å lære modellen å følge instruksjoner bedre eller å oppdage dårlige instruksjoner mer nøyaktig. Det korrekte forsvaret er å redusere settet med konsekvenser som kan følge av at modellen følger dårlige instruksjoner. Du gjør det ved å sette konsekvensene — de faktiske verktøykallene, de faktiske dataflyten, de faktiske eksterne kommunikasjonene — bak en port som modellen ikke kan påvirke.

Det er et løsbart problem. Å gjøre modellen til å pålitelig skille pålitelige fra upålitelige instruksjoner er ikke det.
