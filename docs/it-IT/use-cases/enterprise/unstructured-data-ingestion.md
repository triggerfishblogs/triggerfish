---
title: Ingestione di dati non strutturati
description: Come Triggerfish gestisce l'elaborazione delle fatture, l'acquisizione di documenti e il parsing delle email senza rompersi quando i formati di input cambiano.
---

# Ingestione di dati non strutturati e semi-strutturati

L'elaborazione delle fatture dovrebbe essere un problema risolto ormai. Un documento arriva, i campi vengono estratti, i dati vengono validati rispetto ai record esistenti e il risultato viene instradato al sistema giusto. La realtà è che l'elaborazione delle fatture da sola costa alle imprese miliardi in lavoro manuale ogni anno, e i progetti di automazione pensati per risolvere il problema si rompono continuamente.

Il motivo è la varianza dei formati. Le fatture arrivano come PDF, allegati email, immagini scannerizzate, esportazioni di fogli di calcolo e occasionalmente fax. Ogni fornitore usa un layout diverso. Le voci appaiono in tabelle, in testo libero o in una combinazione di entrambi. I calcoli delle tasse seguono regole diverse per giurisdizione. I formati delle valute variano. I formati delle date variano. Persino lo stesso fornitore cambia il proprio modello di fattura senza preavviso.

I tradizionali sistemi RPA gestiscono questo con il template matching. Definire le coordinate dove appare il numero di fattura, dove iniziano le voci, dove si trova il totale. Funziona per il template corrente di un singolo fornitore. Poi il fornitore aggiorna il proprio sistema, sposta una colonna, aggiunge una riga di intestazione o cambia il generatore PDF, e il bot o fallisce outright o estrae dati spazzatura che si propagano downstream finché qualcuno non lo individua manualmente.

Lo stesso schema si ripete in ogni workflow di dati non strutturati. L'elaborazione degli EOB assicurativi si rompe quando un pagatore cambia il layout del modulo. L'acquisizione delle autorizzazioni preventive si rompe quando un nuovo tipo di documento viene aggiunto al processo. Il parsing delle email dei clienti si rompe quando qualcuno usa un formato della riga dell'oggetto leggermente diverso. Il costo di manutenzione per mantenere funzionanti queste automazioni spesso supera il costo di fare il lavoro manualmente.

## Come Triggerfish risolve questo

Triggerfish sostituisce l'estrazione posizionale dei campi con la comprensione documentale basata su LLM. L'AI legge il documento come farebbe un essere umano: comprendendo il contesto, inferendo le relazioni tra i campi e adattandosi automaticamente ai cambiamenti di layout. Combinato con il motore dei workflow per l'orchestrazione della pipeline e il sistema di classificazione per la sicurezza dei dati, questo crea pipeline di ingestione che non si rompono quando il mondo cambia.

### Parsing documentale basato su LLM

Quando un documento entra in un workflow Triggerfish, un sub-agente LLM legge l'intero documento ed estrae dati strutturati in base a ciò che il documento significa, non a dove si trovano pixel specifici. Un numero di fattura è un numero di fattura che sia nell'angolo in alto a destra con l'etichetta "Invoice #", nel mezzo della pagina con l'etichetta "Factura No." o incorporato in un paragrafo di testo. L'LLM capisce che "Net 30" significa termini di pagamento, che "Qty", "Quantity" e "Units" significano la stessa cosa, e che una tabella con colonne per descrizione, tariffa e importo è un elenco di voci indipendentemente dall'ordine delle colonne.

Questo non è un approccio generico "invia il documento a ChatGPT e spera per il meglio". La definizione del workflow specifica esattamente quale output strutturato deve produrre l'LLM, quali regole di validazione si applicano e cosa succede quando la confidenza dell'estrazione è bassa. La descrizione del task del sub-agente definisce lo schema atteso, e i passaggi successivi del workflow validano i dati estratti rispetto alle regole aziendali prima che entrino in qualsiasi sistema downstream.

### Automazione del browser per il recupero di documenti

Molti workflow di ingestione documentale iniziano con il recupero del documento. Gli EOB assicurativi si trovano nei portali dei pagatori. Le fatture dei fornitori si trovano nelle piattaforme dei fornitori. I moduli governativi si trovano sui siti web delle agenzie statali. L'automazione tradizionale usa script Selenium o chiamate API per recuperare questi documenti, e quegli script si rompono quando il portale cambia.

L'automazione del browser di Triggerfish usa Chromium controllato via CDP con un LLM che legge le snapshot delle pagine per navigare. L'agente vede la pagina come la vede un essere umano e clicca, digita e scorre in base a ciò che vede piuttosto che a selettori CSS hardcoded. Quando un portale di un pagatore ridisegna la propria pagina di login, l'agente si adatta perché riesce ancora a identificare il campo username, il campo password e il pulsante di invio dal contesto visivo. Quando cambia un menu di navigazione, l'agente trova il nuovo percorso verso la sezione di download dei documenti.

Questo non è perfettamente affidabile. I CAPTCHA, i flussi di autenticazione multi-fattore e i portali fortemente dipendenti da JavaScript causano ancora problemi. Ma la modalità di fallimento è fondamentalmente diversa dagli script tradizionali. Uno script Selenium fallisce silenziosamente quando un selettore CSS smette di corrispondere. Un agente Triggerfish riporta cosa vede, cosa ha provato e dove si è bloccato, dando all'operatore abbastanza contesto per intervenire o adeguare il workflow.

### Elaborazione con gate di classificazione

I documenti hanno diversi livelli di sensibilità, e il sistema di classificazione li gestisce automaticamente. Una fattura contenente termini di prezzo potrebbe essere CONFIDENTIAL. Una risposta a un RFP pubblico potrebbe essere INTERNAL. Un documento contenente PHI è RESTRICTED. Quando il sub-agente LLM legge un documento ed estrae dati, l'hook POST_TOOL_RESPONSE classifica il contenuto estratto e il taint della sessione si escalata di conseguenza.

Questo è rilevante per l'instradamento downstream. I dati di fattura estratti classificati a CONFIDENTIAL non possono essere inviati a un canale Slack classificato a PUBLIC. Un workflow che elabora documenti assicurativi contenenti PHI limita automaticamente dove possono fluire i dati estratti. La regola di divieto di write-down la applica a ogni confine, e l'LLM non ha alcuna autorità per aggirarla.

Per i settori sanitario e dei servizi finanziari in particolare, questo significa che il carico di conformità dell'elaborazione automatizzata dei documenti cala drasticamente. Invece di costruire controlli di accesso personalizzati in ogni passaggio di ogni pipeline, il sistema di classificazione li gestisce uniformemente. Un revisore può tracciare esattamente quali documenti sono stati elaborati, quali dati sono stati estratti, dove sono stati inviati e confermare che nessun dato è fluito verso una destinazione inappropriata, tutto dai record di lineage che vengono creati automaticamente a ogni passaggio.

### Adattamento auto-guarente dei formati

Quando un fornitore cambia il proprio template di fattura, l'automazione tradizionale si rompe e rimane rotta finché qualcuno non aggiorna manualmente le regole di estrazione. In Triggerfish, il sub-agente LLM si adatta alla prossima esecuzione. Trova ancora il numero di fattura, le voci e il totale, perché legge per significato piuttosto che per posizione. L'estrazione riesce, i dati vengono validati rispetto alle stesse regole aziendali e il workflow si completa.

Nel tempo, l'agente può usare la memoria cross-sessione per apprendere pattern. Se il fornitore A include sempre una commissione di restocking che altri fornitori non includono, l'agente lo ricorda dalle estrazioni precedenti e sa che deve cercarla. Se il formato EOB di un particolare pagatore mette sempre i codici di rettifica in una posizione insolita, la memoria dell'agente delle estrazioni passate riuscite rende quelle future più affidabili.

Quando un cambiamento di formato è abbastanza significativo da far scendere la confidenza dell'estrazione dell'LLM al di sotto della soglia definita nel workflow, il workflow instrada il documento a una coda di revisione umana invece di fare supposizioni. Le correzioni del revisore vengono reimmesse attraverso il workflow, e la memoria dell'agente archivia il nuovo pattern per riferimento futuro. Il sistema diventa più intelligente nel tempo senza che nessuno riscriva le regole di estrazione.

### Orchestrazione della pipeline

L'ingestione documentale è raramente solo "estrai e archivia". Una pipeline completa recupera il documento, estrae dati strutturati, li valida rispetto ai record esistenti, li arricchisce con dati provenienti da altri sistemi, instrada le eccezioni per la revisione umana e carica i dati validati nel sistema di destinazione. Il motore dei workflow gestisce tutto questo in un'unica definizione YAML.

Una pipeline di autorizzazione preventiva in ambito sanitario potrebbe apparire così: l'automazione del browser recupera l'immagine del fax dal portale del fornitore, un sub-agente LLM estrae gli identificatori del paziente e i codici di procedura, una chiamata HTTP valida il paziente rispetto all'EHR, un altro sub-agente valuta se l'autorizzazione soddisfa i criteri di necessità medica in base alla documentazione clinica, e il risultato viene instradato verso l'approvazione automatica o verso una coda di revisione clinica. Ogni passaggio viene tracciato per classificazione. Ogni dato PHI viene taggato. La traccia di audit completa esiste automaticamente.

## Come appare nella pratica

Un sistema sanitario regionale elabora richieste di autorizzazione preventiva da quaranta diversi studi medici, ciascuno con il proprio layout di modulo, alcuni via fax, alcuni via email, alcuni caricati su un portale. L'approccio tradizionale richiedeva un team di otto persone per esaminare e inserire manualmente ogni richiesta, perché nessuno strumento di automazione poteva gestire la varianza dei formati in modo affidabile.

Con Triggerfish, un workflow gestisce la pipeline completa. L'automazione del browser o il parsing email recupera i documenti. I sub-agenti LLM estraggono i dati strutturati indipendentemente dal formato. I passaggi di validazione controllano i dati estratti rispetto all'EHR e ai database del formulario. Un classification ceiling di RESTRICTED garantisce che i dati PHI non lascino mai il confine della pipeline. I documenti che l'LLM non riesce a analizzare con alta confidenza vengono instradati a un revisore umano, ma quel volume diminuisce nel tempo man mano che la memoria dell'agente costruisce una libreria di pattern di formato.

Il team di otto persone diventa due persone che gestiscono le eccezioni segnalate dal sistema, più audit periodici della qualità delle estrazioni automatizzate. I cambiamenti di formato degli studi medici vengono assorbiti automaticamente. I nuovi layout di modulo vengono gestiti al primo incontro. Il costo di manutenzione che consumava la maggior parte del budget dell'automazione tradizionale scende quasi a zero.
