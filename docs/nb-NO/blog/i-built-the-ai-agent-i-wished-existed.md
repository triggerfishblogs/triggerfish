---
title: Jeg bygde AI-agenten jeg ønsket eksisterte
date: 2026-03-08
description: Jeg bygde Triggerfish fordi alle AI-agenter jeg fant stolte på
  modellen for å håndheve sine egne regler. Det er ikke sikkerhet. Her er hva
  jeg gjorde i stedet.
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

For en stund siden begynte jeg å følge nøye med på hva AI-agenter faktisk kunne gjøre. Ikke demoene. De virkelige, som kjørte på reelle data, i reelle miljøer der feil har konsekvenser. Det jeg fant var at evnene faktisk var der. Du kunne koble en agent til e-posten din, kalenderen din, koden din, filene dine, og den kunne gjøre meningsfullt arbeid. Den delen imponerte meg.

Det som ikke imponerte meg var sikkerhetsmodellen. Eller rettere sagt, fraværet av en. Alle plattformene jeg kikket på håndhevet reglene sine på samme måte: ved å fortelle modellen hva den ikke skulle gjøre. Skriv en god systemprompt, beskriv grensene, stol på at modellen holder seg innenfor dem. Det fungerer inntil noen finner ut hvordan man formulerer en forespørsel som overbeviser modellen om at reglene ikke gjelder her, akkurat nå, i dette spesifikke tilfellet. Og folk finner det ut. Det er ikke så vanskelig.

Jeg ventet hele tiden på at noen skulle bygge den versjonen av dette som jeg faktisk ville bruke. En som kunne koble til alt, fungere på tvers av alle kanalene jeg allerede brukte, og håndtere ekte sensitiv data uten at jeg måtte krysse fingrene og håpe at modellen hadde en god dag. Den dukket ikke opp.

Så bygde jeg den.

Triggerfish er agenten jeg ønsket. Den kobler til e-posten din, kalenderen din, filene dine, koden din, meldingsappene dine. Den kjører proaktivt, ikke bare når du ber den om det. Den fungerer uansett hvor du allerede jobber. Men den delen jeg er mest seriøs om er sikkerhetsarkitekturen. Reglene om hva agenten kan få tilgang til og hvor data kan flyte bor ikke i en prompt. De bor i et håndhevelseslag som sitter utenfor modellen helt. Modellen forteller systemet hva den vil gjøre, og et separat lag bestemmer om det faktisk skjer. Modellen kan ikke forhandle med det laget. Den kan ikke resonnere rundt det. Den kan ikke se det.

Den distinksjonen betyr mer enn det kanskje høres ut. Det betyr at systemets sikkerhetsegenskaper ikke forringes etter hvert som modellen blir mer kapabel. Det betyr at et kompromittert tredjepartsverktøy ikke kan snakke agenten til å gjøre noe den ikke burde. Det betyr at du faktisk kan se på reglene, forstå dem og stole på dem, fordi de er kode, ikke prosa.

Jeg åpnet kildekoden for håndhevelseskjernen nettopp av den grunn. Hvis du ikke kan lese det, kan du ikke stole på det. Det gjelder for ethvert sikkerhetskrav, og det er spesielt sant når det du sikrer er en autonom agent med tilgang til dine mest sensitive data.

Plattformen er gratis for enkeltpersoner og du kan kjøre den selv. Hvis du heller ikke vil tenke på infrastrukturen, er det et abonnementsalternativ der vi håndterer modellen og søk. Uansett er sikkerhetsmodellen den samme.

Dette er agenten jeg ønsket eksisterte da. Jeg tror mange mennesker har ventet på det samme.
