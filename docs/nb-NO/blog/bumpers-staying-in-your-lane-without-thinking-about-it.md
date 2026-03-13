---
title: "Bumpers: Hold deg i kjørefeltet uten å tenke på det"
date: 2026-03-08
description: Triggerfish bumpers holder agenten på det nivået du jobber på.
  Ingen utilsiktet eskalering, ingen overraskelser. Skru dem av når du trenger
  mer. På som standard.
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

En av tingene som gjør AI-agenter genuint nyttige er også det som gjør dem av og til foruroligende. Gi en agent tilgang til verktøyene dine, og den vil bruke dem. Alle, hvis oppgaven ser ut til å kreve det. Du ber den om å hjelpe med å formulere en melding, og den rekker inn i kalenderen for å sjekke tilgjengelighet, henter litt kontekst fra en fil, sjekker en Slack-tråd. Før du vet ordet av det, har en enkel oppgave berørt tre forskjellige datakilder på tre forskjellige klassifiseringsnivåer, og sesjonen din er nå tainter til et nivå du ikke hadde tenkt å jobbe på.

Dette er ikke en feil. Det er agenten som gjør jobben sin. Men det skaper et reelt brukerproblem: hvis du gjør uformelt arbeid og ikke vil eskalere utilsiktet til en kontekst der konfidensielle data er involvert, må du enten mikromanere agenten konstant eller bare akseptere at sesjoner flyter.

Bumpers løser dette.

![](/blog/images/screenshot_20260309_161249.png)

Ideen kommer rett fra bowling. Når du setter opp bumpers, holder ballen seg i banen. Den kan gå hvor som helst innenfor banen, sprette rundt, gjøre sin greie. Den kan bare ikke falle i rennen. Bumpers i Triggerfish fungerer på samme måte. Når de er på, kan agenten gjøre alt som opererer på eller under gjeldende sesjons klassifiseringsnivå. Det den ikke kan gjøre er å utføre en handling som ville eskalere sesjons-Tainen. Hvis den prøver, blokkeres handlingen før den kjøres og agenten blir bedt om å finne en annen måte eller la deg vite at du må slå av bumpers for å gå videre.

Bumpers er på som standard. Når sesjonen starter, ser du «Bumpers deployed.» Hvis du vil gi agenten fullt bevegelsesfrihet, kjører du /bumpers og de slås av. Kjør det igjen og de går tilbake på. Preferansen din vedvarer på tvers av sesjoner, så hvis du alltid jobber uten dem, trenger du bare å sette det én gang.

Det viktige å forstå er hva bumpers gjør og ikke gjør. De er ikke en generell begrensning på agenten. De begrenser ikke hvilke verktøy agenten kan kalle, hvilke data den kan lese, eller hvordan den håndterer noe innenfor det gjeldende klassifiseringsnivået. Hvis sesjonen din allerede er tainter til CONFIDENTIAL og agenten får tilgang til en annen CONFIDENTIAL-ressurs, har bumpers ingenting å si om det. Tainen beveger seg ikke. Bumpers bryr seg bare om eskalering.

![](/blog/images/gemini_generated_image_4ovbs34ovbs34ovb.jpg)

Dette betyr noe fordi bumpers er designet for å holde seg ute av veien din. Hele poenget er at du ikke skal måtte tenke på klassifiseringsnivåer under en normal arbeidsøkt. Du setter bumpers på, du jobber, og hvis agenten rekker etter noe som ville endre sesjonens natur stopper den og forteller deg det. Du bestemmer om du vil låse det opp. Det er hele interaksjonen.

Det er én kanttilfelle verdt å kjenne til. Hvis du slår av bumpers midt i sesjonen og agenten eskalerer Taint, bringer ikke det å slå bumpers tilbake på Tainen ned igjen. Taint er monoton. Den går bare opp. Så hvis du deaktiverer bumpers, gjør noe arbeid på et høyere nivå, og aktiverer dem igjen, vokter bumpers nå fra det høyere nivået, ikke det opprinnelige. Hvis du vil komme tilbake til en ren lav-nivå sesjon, gjør en full tilbakestilling.

![](/blog/images/screenshot_20260309_164720.png)

For de fleste mennesker vil bumpers bare være noe som stille er på og av og til forklarer hvorfor agenten ba dem om å aktivere noe i stedet for å gjøre det automatisk. Det er den tiltenkte opplevelsen. Agenten holder seg i banen, du beholder kontrollen, og du trenger bare å ta en aktiv beslutning når du faktisk vil gå videre.
