---
title: AI Inference nei flussi di lavoro di produzione
description: Come Triggerfish colma il divario tra le demo AI e i flussi di lavoro di produzione duraturi con applicazione della sicurezza, tracce di audit e orchestrazione dei workflow.
---

# Integrazione dell'inferenza AI/ML nei flussi di lavoro di produzione

La maggior parte dei progetti AI aziendali muore nel divario tra demo e produzione. Un team costruisce una proof of concept che usa GPT-4 per classificare i ticket di supporto, riassumere documenti legali o generare testi di marketing. La demo funziona. Il management si entusiasma. Poi il progetto si blocca per mesi cercando di rispondere a domande che la demo non ha mai dovuto affrontare: da dove provengono i dati? Dove va l'output? Chi approva le decisioni dell'AI? Cosa succede quando il modello allucinates? Come facciamo l'audit di ciò che ha fatto? Come impediamo l'accesso a dati che non dovrebbe vedere? Come impediamo che informazioni sensibili vengano inviate nel posto sbagliato?

Questi non sono problemi ipotetici. Il 95% dei pilot di AI generativa aziendale non riesce a produrre ritorni finanziari, e il motivo non è che la tecnologia non funziona. I modelli sono capaci. Il fallimento è nell'infrastruttura: integrare l'inferenza AI in modo affidabile nei workflow aziendali reali dove deve operare, con i controlli di sicurezza, la gestione degli errori e le tracce di audit che i sistemi di produzione richiedono.

La risposta tipica delle aziende è costruire un livello di integrazione personalizzato. Un team di ingegneria trascorre mesi a connettere il modello AI alle fonti di dati, costruire la pipeline, aggiungere l'autenticazione, implementare il logging, creare un workflow di approvazione e aggiungere i controlli di sicurezza. Quando l'integrazione è "pronta per la produzione", il modello originale è stato superato da uno più nuovo, i requisiti aziendali sono cambiati e il team deve ricominciare da capo.

## Come Triggerfish risolve questo

Triggerfish elimina il divario di integrazione rendendo l'inferenza AI un passaggio di prima classe nel motore dei workflow, governato dalla stessa applicazione della sicurezza, dal logging di audit e dai controlli di classificazione che si applicano a ogni altra operazione nel sistema. Un passaggio di sub-agente LLM in un workflow Triggerfish non è un'aggiunta. È un'operazione nativa con gli stessi hook di policy, il tracciamento della lineage e la prevenzione del write-down di una chiamata HTTP o di una query al database.

### L'AI come passaggio del workflow, non come sistema separato

Nel DSL del workflow, un passaggio di inferenza LLM è definito con `call: triggerfish:llm`. La descrizione del task dice al sub-agente cosa fare in linguaggio naturale. Il sub-agente ha accesso a ogni strumento registrato in Triggerfish. Può cercare sul web, interrogare database tramite strumenti MCP, leggere documenti, navigare siti web e usare la memoria cross-sessione. Quando il passaggio si completa, il suo output alimenta direttamente il passaggio successivo del workflow.

Ciò significa che non esiste un "sistema AI" separato da integrare. L'inferenza avviene all'interno del workflow, usando le stesse credenziali, le stesse connessioni ai dati e la stessa applicazione della sicurezza di tutto il resto. Un team di ingegneria non ha bisogno di costruire un livello di integrazione personalizzato perché il livello di integrazione esiste già.

### Sicurezza che non richiede ingegneria personalizzata

La parte più dispendiosa in termini di tempo della messa in produzione di un workflow AI non è l'AI. È il lavoro di sicurezza e conformità. Quali dati può vedere il modello? Dove può inviare il suo output? Come impediamo che faccia trapelare informazioni sensibili? Come registriamo tutto per l'audit?

In Triggerfish, queste domande ricevono risposta dall'architettura della piattaforma, non dall'ingegneria per ogni singolo progetto. Il sistema di classificazione traccia la sensibilità dei dati a ogni confine. Il taint della sessione si escalata quando il modello accede a dati classificati. La prevenzione del write-down blocca l'output dal fluire verso un canale classificato al di sotto del livello di taint della sessione. Ogni chiamata agli strumenti, ogni accesso ai dati e ogni decisione di output viene registrata con lineage completa.

Un workflow AI che legge i record dei clienti (CONFIDENTIAL) e genera un riassunto non può inviare quel riassunto a un canale Slack pubblico. Questo non è applicato da un'istruzione nel prompt che il modello potrebbe ignorare. È applicato da codice deterministico nell'hook PRE_OUTPUT che il modello non può vedere, non può modificare e non può aggirare. Gli hook di policy vengono eseguiti sotto il livello LLM. L'LLM richiede un'azione e il livello di policy decide se consentirla. Timeout equivale a rifiuto. Non esiste un percorso dal modello al mondo esterno che non passi attraverso l'applicazione.

### Tracce di audit che esistono già

Ogni decisione AI in un workflow Triggerfish genera automaticamente record di lineage. La lineage traccia quali dati il modello ha acceduto, quale livello di classificazione portavano, quali trasformazioni sono state applicate e dove è stato inviato l'output. Questa non è una funzionalità di logging che deve essere abilitata o configurata. È una proprietà strutturale della piattaforma. Ogni elemento di dato porta metadati di provenienza dalla creazione attraverso ogni trasformazione fino alla destinazione finale.

Per i settori regolamentati, questo significa che le evidenze di conformità per un workflow AI esistono dal primo giorno. Un revisore può tracciare qualsiasi output generato dall'AI attraverso la catena completa: quale modello lo ha prodotto, su quali dati si basava, quali strumenti ha usato il modello durante il ragionamento, quale livello di classificazione si applicava a ogni passaggio e se si sono verificate azioni di applicazione delle policy. Questa raccolta di evidenze avviene automaticamente perché è incorporata negli hook di applicazione, non aggiunta come livello di reporting.

### Flessibilità del modello senza re-architettura

Triggerfish supporta più provider LLM attraverso l'interfaccia LlmProvider: Anthropic, OpenAI, Google, modelli locali via Ollama e OpenRouter per qualsiasi modello instradato. La selezione del provider è configurabile per agente con failover automatico. Quando un modello migliore diventa disponibile o un provider cambia i prezzi, il cambio avviene a livello di configurazione senza toccare le definizioni dei workflow.

Questo affronta direttamente il problema "il progetto è obsoleto prima di essere consegnato". Le definizioni dei workflow descrivono cosa dovrebbe fare l'AI, non quale modello lo fa. Passare da GPT-4 a Claude a un modello locale fine-tuned cambia un valore di configurazione. Il workflow, i controlli di sicurezza, le tracce di audit e i punti di integrazione rimangono tutti esattamente gli stessi.

### Cron, webhook ed esecuzione guidata da eventi

I workflow AI che vengono eseguiti secondo una pianificazione o in risposta a eventi non richiedono che un essere umano li avvii. Lo scheduler supporta espressioni cron a cinque campi per i workflow ricorrenti ed endpoint webhook per i trigger guidati da eventi. Un workflow di generazione di report quotidiani viene eseguito alle 6. Un workflow di classificazione documentale si attiva quando un nuovo file arriva via webhook. Un workflow di analisi del sentiment si attiva su ogni nuovo ticket di supporto.

Ogni esecuzione pianificata o guidata da eventi genera una sessione isolata con taint fresco. Il workflow viene eseguito nel proprio contesto di sicurezza, indipendente da qualsiasi sessione interattiva. Se il workflow attivato dal cron accede a dati CONFIDENTIAL, solo la cronologia di quella esecuzione viene classificata a CONFIDENTIAL. Gli altri workflow pianificati che operano a classificazione PUBLIC non sono interessati.

### Gestione degli errori e supervisione umana

I workflow AI di produzione devono gestire i fallimenti con grazia. Il DSL del workflow supporta `raise` per le condizioni di errore esplicite e semantiche try/catch attraverso la gestione degli errori nelle definizioni dei task. Quando un sub-agente LLM produce output a bassa confidenza o incontra una situazione che non riesce a gestire, il workflow può instradare verso una coda di approvazione umana, inviare una notifica attraverso il servizio di notifica o intraprendere un'azione di fallback.

Il servizio di notifica recapita gli avvisi su tutti i canali connessi con priorità e deduplicazione. Se un workflow ha bisogno dell'approvazione umana prima che una modifica contrattuale generata dall'AI venga inviata, la richiesta di approvazione può arrivare su Slack, WhatsApp, email o ovunque si trovi l'approvatore. Il workflow si mette in pausa finché l'approvazione non arriva e poi riprende da dove si era interrotto.

## Come appare nella pratica

Un dipartimento legale vuole automatizzare la revisione dei contratti. L'approccio tradizionale: sei mesi di sviluppo personalizzato per costruire una pipeline che estrae clausole dai contratti caricati, classifica i livelli di rischio, segnala i termini non standard e genera un riassunto per l'avvocato revisore. Il progetto richiede un team di ingegneria dedicato, una revisione di sicurezza personalizzata, un'approvazione di conformità e manutenzione continua.

Con Triggerfish, la definizione del workflow richiede un giorno per essere scritta. Il caricamento attiva un webhook. Un sub-agente LLM legge il contratto, estrae le clausole chiave, classifica i livelli di rischio e identifica i termini non standard. Un passaggio di validazione controlla l'estrazione rispetto alla libreria di clausole dello studio archiviata in memoria. Il riassunto viene instradato al canale di notifica dell'avvocato assegnato. L'intera pipeline viene eseguita a classificazione RESTRICTED perché i contratti contengono informazioni privilegiate del cliente e la prevenzione del write-down garantisce che nessun dato contrattuale trapeli verso un canale al di sotto di RESTRICTED.

Quando lo studio cambia provider LLM (perché un nuovo modello gestisce meglio il linguaggio legale, o perché il provider attuale aumenta i prezzi), il cambiamento è una singola riga nella configurazione. La definizione del workflow, i controlli di sicurezza, la traccia di audit e l'instradamento delle notifiche continuano tutti a funzionare senza modifiche. Quando lo studio aggiunge un nuovo tipo di clausola al proprio framework di rischio, il sub-agente LLM lo incorpora senza riscrivere le regole di estrazione perché legge per significato, non per pattern.

Il team di conformità ottiene una traccia di audit completa dal primo giorno. Ogni contratto elaborato, ogni clausola estratta, ogni classificazione del rischio assegnata, ogni notifica inviata e ogni approvazione dell'avvocato registrata, con lineage completa fino al documento sorgente. La raccolta di evidenze che avrebbe richiesto settimane di lavoro di reporting personalizzato esiste automaticamente come proprietà strutturale della piattaforma.
