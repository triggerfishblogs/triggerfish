---
title: Orchestrazione cross-system
description: Come Triggerfish gestisce flussi di lavoro che attraversano 12+ sistemi con decisioni contestuali a ogni passaggio, senza la fragilità che uccide l'automazione tradizionale.
---

# Orchestrazione cross-system con decisioni contestuali

Un tipico flusso di lavoro procure-to-pay tocca una dozzina di sistemi. Una richiesta d'acquisto parte da una piattaforma, viene instradata a una catena di approvazione in un'altra, attiva una ricerca del fornitore in una terza, crea un ordine d'acquisto in una quarta, avvia un processo di ricezione in una quinta, abbina le fatture in una sesta, pianifica il pagamento in una settima e registra tutto in un'ottava. Ogni sistema ha la propria API, il proprio ciclo di aggiornamento, il proprio modello di autenticazione e i propri modi di fallire.

L'automazione tradizionale gestisce questo con pipeline rigide. Il passaggio uno chiama l'API A, analizza la risposta, passa un campo al passaggio due, che chiama l'API B. Funziona finché non funziona più. Un record fornitore ha un formato leggermente diverso da quello atteso. Un'approvazione torna con un codice di stato per cui la pipeline non è stata progettata. Un nuovo campo obbligatorio compare in un aggiornamento API. Un passaggio interrotto rompe l'intera catena e nessuno lo sa finché un processo a valle non fallisce giorni dopo.

Il problema più profondo non è la fragilità tecnica. È che i processi aziendali reali richiedono giudizio. Questa discrepanza nella fattura va escalata o risolta automaticamente? Lo schema di ritardi nelle consegne di questo fornitore giustifica una revisione del contratto? Questa richiesta di approvazione è abbastanza urgente da saltare l'instradamento standard? Queste decisioni vivono attualmente nelle teste delle persone, il che significa che l'automazione può gestire solo il percorso ottimale.

## Come Triggerfish risolve questo

Il motore dei flussi di lavoro di Triggerfish esegue definizioni di workflow basate su YAML che mescolano automazione deterministica con ragionamento AI in un'unica pipeline. Ogni passaggio nel workflow passa attraverso lo stesso livello di applicazione della sicurezza che governa tutte le operazioni di Triggerfish, quindi il monitoraggio della classificazione e le tracce di audit reggono per l'intera catena indipendentemente da quanti sistemi siano coinvolti.

### Passaggi deterministici per lavori deterministici

Quando un passaggio del workflow ha un input noto e un output noto, viene eseguito come una normale chiamata HTTP, un comando shell o una chiamata agli strumenti MCP. Nessun coinvolgimento dell'LLM, nessuna penalità di latenza, nessun costo di inferenza. Il motore dei workflow supporta `call: http` per le REST API, `call: triggerfish:mcp` per qualsiasi server MCP connesso, e `run: shell` per gli strumenti da riga di comando. Questi passaggi si eseguono esattamente come l'automazione tradizionale, perché per il lavoro prevedibile, l'automazione tradizionale è l'approccio giusto.

### Sub-agenti LLM per le decisioni contestuali

Quando un passaggio del workflow richiede un ragionamento contestuale, il motore genera una vera sessione di sub-agente LLM usando `call: triggerfish:llm`. Questo non è un singolo scambio prompt/risposta. Il sub-agente ha accesso a ogni strumento registrato in Triggerfish, inclusa la ricerca web, la memoria, l'automazione del browser e tutte le integrazioni connesse. Può leggere documenti, interrogare database, confrontare record e prendere una decisione basata su tutto ciò che trova.

L'output del sub-agente alimenta direttamente il passaggio successivo del workflow. Se ha acceduto a dati classificati durante il suo ragionamento, il taint della sessione si escalata automaticamente e si propaga al workflow padre. Il motore dei workflow lo traccia, quindi un workflow che è partito a PUBLIC ma ha toccato dati CONFIDENTIAL durante una decisione contestuale ottiene l'intera cronologia di esecuzione archiviata al livello CONFIDENTIAL. Una sessione con classificazione inferiore non può nemmeno vedere che il workflow è stato eseguito.

### Branching condizionale basato sul contesto reale

Il DSL del workflow supporta blocchi `switch` per l'instradamento condizionale, cicli `for` per l'elaborazione in batch e operazioni `set` per aggiornare lo stato del workflow. Combinato con i passaggi di sub-agente LLM che possono valutare condizioni complesse, ciò significa che il workflow può ramificarsi in base al contesto aziendale reale piuttosto che ai soli valori dei campi.

Un workflow di procurement può instradare diversamente in base alla valutazione del rischio fornitore da parte del sub-agente. Un workflow di onboarding può saltare i passaggi non pertinenti per un ruolo particolare. Un workflow di risposta agli incidenti può escalare a team diversi in base all'analisi della causa principale da parte del sub-agente. La logica di branching vive nella definizione del workflow, ma gli input delle decisioni provengono dal ragionamento AI.

### Auto-recupero quando i sistemi cambiano

Quando un passaggio deterministico fallisce perché un'API ha cambiato il formato della risposta o un sistema ha restituito un errore inatteso, il workflow non si ferma semplicemente. Il motore può delegare il passaggio fallito a un sub-agente LLM che legge l'errore, ispeziona la risposta e tenta un approccio alternativo. Un'API che ha aggiunto un nuovo campo obbligatorio viene gestita dal sub-agente che legge il messaggio di errore e adegua la richiesta. Un sistema che ha cambiato il flusso di autenticazione viene navigato dagli strumenti di automazione del browser.

Questo non significa che ogni fallimento venga magicamente risolto. Ma significa che il workflow degrada gracefully invece di fallire silenziosamente. Il sub-agente trova un percorso in avanti o produce una spiegazione chiara di cosa è cambiato e perché è necessario l'intervento manuale, invece di un codice di errore criptico sepolto in un file di log che nessuno controlla.

### Sicurezza per l'intera catena

Ogni passaggio in un workflow Triggerfish passa attraverso gli stessi hook di applicazione delle policy di qualsiasi chiamata diretta agli strumenti. PRE_TOOL_CALL valida le autorizzazioni e controlla i limiti di frequenza prima dell'esecuzione. POST_TOOL_RESPONSE classifica i dati restituiti e aggiorna il taint della sessione. PRE_OUTPUT garantisce che nulla lasci il sistema a un livello di classificazione superiore a quello consentito dalla destinazione.

Ciò significa che un workflow che legge dal CRM (CONFIDENTIAL), elabora i dati attraverso un LLM e invia un riassunto a Slack non fa trapelare accidentalmente dettagli riservati in un canale pubblico. La regola di divieto di write-down la intercetta nell'hook PRE_OUTPUT, indipendentemente da quanti passaggi intermedi abbiano attraversato i dati. La classificazione viaggia con i dati attraverso l'intero workflow.

La definizione stessa del workflow può impostare un `classification_ceiling` che impedisce al workflow di toccare mai dati al di sopra di un livello specificato. Un workflow di riepilogo settimanale classificato a INTERNAL non può accedere a dati CONFIDENTIAL anche se dispone delle credenziali per farlo. Il ceiling viene applicato nel codice, non sperando che l'LLM rispetti un'istruzione nel prompt.

### Trigger cron e webhook

I workflow non richiedono che qualcuno li avvii manualmente. Lo scheduler supporta trigger basati su cron per i workflow ricorrenti e trigger webhook per l'esecuzione guidata da eventi. Un workflow di briefing mattutino viene eseguito alle 7. Un workflow di revisione PR si attiva quando GitHub invia un webhook. Un workflow di elaborazione fatture si attiva quando un nuovo file appare in un'unità condivisa.

Gli eventi webhook portano il proprio livello di classificazione. Un webhook GitHub per un repository privato viene classificato automaticamente a CONFIDENTIAL in base alle mappature di classificazione dei domini nella configurazione di sicurezza. Il workflow eredita quella classificazione e tutta l'applicazione downstream si applica.

## Come appare nella pratica

Un'azienda mid-market che gestisce il procure-to-pay tra NetSuite, Coupa, DocuSign e Slack definisce un workflow Triggerfish che gestisce l'intero ciclo. I passaggi deterministici gestiscono le chiamate API per creare ordini d'acquisto, instradare le approvazioni e abbinare le fatture. I passaggi di sub-agente LLM gestiscono le eccezioni: fatture con voci che non corrispondono all'ordine d'acquisto, fornitori che hanno inviato documentazione in un formato inatteso, richieste di approvazione che necessitano di contesto sulla cronologia del richiedente.

Il workflow viene eseguito su un'istanza Triggerfish self-hosted. Nessun dato lascia l'infrastruttura aziendale. Il sistema di classificazione garantisce che i dati finanziari di NetSuite rimangano a CONFIDENTIAL e non possano essere inviati a un canale Slack classificato a INTERNAL. La traccia di audit cattura ogni decisione presa dal sub-agente LLM, ogni strumento chiamato e ogni dato acceduto, archiviati con tracciamento completo della lineage per la revisione di conformità.

Quando Coupa aggiorna la propria API e cambia un nome di campo, il passaggio HTTP deterministico del workflow fallisce. Il motore delega a un sub-agente che legge l'errore, identifica il campo modificato e riprova con il parametro corretto. Il workflow si completa senza intervento umano e l'incidente viene registrato in modo che un ingegnere possa aggiornare la definizione del workflow per gestire il nuovo formato in futuro.
