---
title: Ho costruito l'agente AI che avrei voluto esistesse
date: 2026-03-09
description: Ho creato Triggerfish perché ogni agente AI che trovavo si affidava al
  modello per far rispettare le proprie regole. Questa non è sicurezza. Ecco cosa ho
  fatto invece.
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
Qualche tempo fa ho iniziato a osservare attentamente cosa gli agenti AI fossero realmente in grado di fare. Non le demo. Quelli veri, in esecuzione su dati reali, in ambienti reali dove gli errori hanno conseguenze. Quello che ho scoperto è che le capacità c'erano davvero. Si poteva collegare un agente alla propria email, al calendario, al codice, ai file, e riusciva a svolgere un lavoro significativo. Questo mi ha colpito.

Quello che non mi ha colpito è stato il modello di sicurezza. O meglio, la sua assenza. Ogni piattaforma che ho esaminato applicava le proprie regole allo stesso modo: dicendo al modello cosa non doveva fare. Si scrive un buon system prompt, si descrivono i limiti, si confida che il modello li rispetti. Funziona finché qualcuno non capisce come formulare una richiesta che convinca il modello che le regole non si applicano qui, ora, in questo caso specifico. E le persone lo scoprono. Non è poi così difficile.

Ho continuato ad aspettare che qualcuno costruisse la versione che avrei davvero voluto usare. Una che potesse connettersi a tutto, funzionare su tutti i canali che già utilizzavo e gestire dati genuinamente sensibili senza dover incrociare le dita e sperare che il modello stesse avendo una buona giornata. Non è arrivata.

Quindi l'ho costruita io.

Triggerfish è l'agente che desideravo. Si collega alla Sua email, al Suo calendario, ai Suoi file, al Suo codice, alle Sue app di messaggistica. Lavora in modo proattivo, non solo quando viene interpellato. Funziona dove Lei già lavora. Ma la parte a cui tengo di più è l'architettura di sicurezza. Le regole su cosa l'agente può accedere e dove i dati possono fluire non risiedono in un prompt. Risiedono in un livello di enforcement che si trova completamente al di fuori del modello. Il modello comunica al sistema cosa vorrebbe fare, e un livello separato decide se ciò avviene effettivamente. Il modello non può negoziare con quel livello. Non può aggirarlo. Non può nemmeno vederlo.

Questa distinzione conta più di quanto possa sembrare. Significa che le proprietà di sicurezza del sistema non si degradano man mano che il modello diventa più capace. Significa che uno strumento di terze parti compromesso non può convincere l'agente a fare qualcosa che non dovrebbe. Significa che le regole si possono effettivamente leggere, comprendere e di cui ci si può fidare, perché sono codice, non prosa.

Ho reso open source il nucleo dell'enforcement proprio per questo motivo. Se non si può leggere, non ci si può fidare. Questo vale per qualsiasi affermazione sulla sicurezza, e vale in particolare quando ciò che si sta proteggendo è un agente autonomo con accesso ai propri dati più sensibili.

La piattaforma è gratuita per i singoli utenti e può essere eseguita in autonomia. Se si preferisce non occuparsi dell'infrastruttura, esiste un'opzione in abbonamento in cui gestiamo noi il modello e la ricerca. In entrambi i casi, il modello di sicurezza è lo stesso.

Questo è l'agente che desideravo due anni fa. Credo che molte persone stessero aspettando la stessa cosa.
