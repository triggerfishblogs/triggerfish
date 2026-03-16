---
title: Automazione di portali di terze parti
description: Come Triggerfish automatizza le interazioni con portali vendor, siti governativi e sistemi dei pagatori senza rompersi quando l'interfaccia cambia.
---

# Automazione dell'interfaccia utente contro portali di terze parti

Ogni azienda ha un elenco di portali a cui i dipendenti accedono manualmente ogni giorno per svolgere lavori che dovrebbero essere automatizzati ma non lo sono. Portali vendor per controllare lo stato degli ordini. Siti governativi per presentare comunicazioni regolamentari. Portali dei pagatori assicurativi per verificare l'idoneità e controllare lo stato dei rimborsi. Ordini professionali statali per la verifica delle credenziali. Portali delle autorità fiscali per i depositi di conformità.

Questi portali non hanno API. O hanno API non documentate, con limiti di frequenza o riservate ai "partner preferiti" che pagano per l'accesso. I dati si trovano dietro una pagina di login, resi in HTML, e l'unico modo per estrarli è accedere e navigare l'interfaccia utente.

L'automazione tradizionale usa script per browser. Script Selenium, Playwright o Puppeteer che accedono, navigano alla pagina giusta, trovano gli elementi tramite selettore CSS o XPath, estraggono i dati e si disconnettono. Questi script funzionano finché non funzionano più. Un redesign del portale cambia i nomi delle classi CSS. Un nuovo CAPTCHA viene aggiunto al flusso di login. Il menu di navigazione si sposta da una barra laterale a un menu hamburger. Un banner di consenso ai cookie inizia a coprire il pulsante di invio. Lo script si rompe silenziosamente e nessuno se ne accorge finché il processo downstream che dipende dai dati non inizia a produrre errori.

I collegi medici statali sono un esempio particolarmente brutale. Ce ne sono cinquanta, ciascuno con un sito web diverso, layout diversi, metodi di autenticazione diversi e formati dei dati diversi. Ridisegnano secondo i propri calendari senza preavviso. Un servizio di verifica delle credenziali che si affida allo scraping di questi siti potrebbe avere cinque o dieci dei suoi cinquanta script rotti in qualsiasi momento, ciascuno che richiede a uno sviluppatore di ispezionare il nuovo layout e riscrivere i selettori.

## Come Triggerfish risolve questo

L'automazione del browser di Triggerfish combina Chromium controllato via CDP con la navigazione visuale basata su LLM. L'agente vede la pagina come pixel renderizzati e snapshot di accessibilità, non come albero DOM. Identifica gli elementi per come appaiono e cosa fanno, non per i loro nomi di classe CSS. Quando un portale viene ridisegnato, l'agente si adatta perché i moduli di login sembrano ancora moduli di login, i menu di navigazione sembrano ancora menu di navigazione e le tabelle di dati sembrano ancora tabelle di dati.

### Navigazione visuale invece di script con selettori

Gli strumenti di automazione del browser funzionano attraverso sette operazioni: navigate, snapshot, click, type, select, scroll e wait. L'agente naviga verso un URL, prende una snapshot della pagina renderizzata, ragiona su ciò che vede e decide quale azione intraprendere. Non esiste uno strumento `evaluate` che esegua JavaScript arbitrario nel contesto della pagina. Questa è una decisione di sicurezza deliberata. L'agente interagisce con la pagina come farebbe un essere umano, attraverso l'interfaccia utente, e non può eseguire codice che potrebbe essere sfruttato da una pagina malevola.

Quando l'agente incontra un modulo di login, identifica il campo username, il campo password e il pulsante di invio in base al layout visivo, al testo segnaposto, alle etichette e alla struttura della pagina. Non ha bisogno di sapere che il campo username ha `id="auth-input-email"` o `class="login-form__email-field"`. Quando questi identificatori cambiano in un redesign, l'agente non se ne accorge perché non si è mai affidato ad essi.

### Sicurezza dei domini condivisa

La navigazione del browser condivide la stessa configurazione di sicurezza dei domini delle operazioni di web fetch. Un singolo blocco di configurazione in `triggerfish.yaml` definisce le denylist SSRF, le allowlist dei domini, le denylist dei domini e le mappature dominio-classificazione. Quando l'agente naviga verso un portale vendor classificato a CONFIDENTIAL, il taint della sessione si escalata automaticamente a CONFIDENTIAL e tutte le azioni successive in quel workflow sono soggette alle restrizioni di livello CONFIDENTIAL.

La denylist SSRF è hardcoded e non sovrascrivibile. Gli intervalli IP privati, gli indirizzi link-local e gli endpoint dei metadati cloud sono sempre bloccati. La risoluzione DNS viene verificata prima della richiesta, prevenendo attacchi di DNS rebinding. Questo è importante perché l'automazione del browser è la superficie di attacco ad alto rischio più alta in qualsiasi sistema agente. Una pagina malevola che tenta di reindirizzare l'agente verso un servizio interno viene bloccata prima che la richiesta lasci il sistema.

### Watermarking dei profili browser

Ogni agente mantiene il proprio profilo browser, che accumula cookie, localStorage e dati di sessione man mano che interagisce con i portali nel tempo. Il profilo porta un watermark di classificazione che registra il livello di classificazione più alto al quale è stato utilizzato. Questo watermark può solo escalare, mai diminuire.

Se un agente usa il proprio profilo browser per accedere a un portale vendor CONFIDENTIAL, il profilo viene contrassegnato a CONFIDENTIAL. Una sessione successiva che opera a classificazione PUBLIC non può usare quel profilo, prevenendo fughe di dati attraverso credenziali memorizzate nella cache, cookie o token di sessione che potrebbero contenere informazioni sensibili. L'isolamento del profilo è per agente e l'applicazione del watermark è automatica.

Questo risolve un problema sottile ma importante nell'automazione dei portali. I profili browser accumulano stato che riflette i dati ai quali hanno avuto accesso. Senza watermarking, un profilo che ha effettuato l'accesso a un portale sensibile potrebbe far trapelare informazioni attraverso suggerimenti di completamento automatico, dati di pagina memorizzati nella cache o cookie persistenti a una sessione con classificazione inferiore.

### Gestione delle credenziali

Le credenziali del portale sono archiviate nel portachiavi del sistema operativo (livello personale) o nel vault aziendale (livello enterprise), mai nei file di configurazione o nelle variabili d'ambiente. L'hook SECRET_ACCESS registra ogni recupero di credenziali. Le credenziali vengono risolte al momento dell'esecuzione dal motore dei workflow e iniettate nelle sessioni del browser attraverso l'interfaccia di digitazione, non impostando i valori del modulo in modo programmatico. Ciò significa che le credenziali fluiscono attraverso lo stesso livello di sicurezza di ogni altra operazione sensibile.

### Resilienza ai comuni cambiamenti dei portali

Ecco cosa succede quando si verificano comuni cambiamenti nei portali:

**Redesign della pagina di login.** L'agente prende una nuova snapshot, identifica il layout aggiornato e trova i campi del modulo per contesto visivo. A meno che il portale non sia passato a un metodo di autenticazione completamente diverso (SAML, OAuth, token hardware), il login continua a funzionare senza alcuna modifica alla configurazione.

**Ristrutturazione della navigazione.** L'agente legge la pagina dopo il login e naviga verso la sezione di destinazione in base al testo dei link, alle etichette dei menu e alle intestazioni di pagina piuttosto che ai pattern URL. Se il portale vendor ha spostato "Stato ordini" dalla barra laterale sinistra a un menu a tendina in cima, l'agente lo trova lì.

**Nuovo banner di consenso ai cookie.** L'agente vede il banner, identifica il pulsante accetta/chiudi, lo clicca e continua con il compito originale. Questo viene gestito dalla comprensione generale della pagina dell'LLM, non da un gestore di cookie apposito.

**CAPTCHA aggiunto.** Qui l'approccio ha limitazioni oneste. I semplici CAPTCHA a immagine potrebbero essere risolvibili a seconda delle capacità di visione dell'LLM, ma i sistemi di analisi comportamentale come reCAPTCHA v3 possono bloccare i browser automatizzati. Il workflow li instrada a una coda di intervento umano piuttosto che fallire silenziosamente.

**Prompt di autenticazione multi-fattore.** Se il portale inizia a richiedere MFA che non era richiesta in precedenza, l'agente rileva la pagina inattesa, segnala la situazione attraverso il sistema di notifica e mette in pausa il workflow finché un essere umano non completa il passaggio MFA. Il workflow può essere configurato per attendere il completamento dell'MFA e poi riprendere da dove si era interrotto.

### Elaborazione in batch su più portali

Il supporto del ciclo `for` del motore dei workflow significa che un singolo workflow può iterare su più target di portali. Un servizio di verifica delle credenziali può definire un workflow che controlla lo stato della licenza in tutti e cinquanta i collegi medici statali in un singolo batch. Ogni interazione con il portale viene eseguita come un sotto-passaggio separato con la propria sessione browser, il proprio tracciamento della classificazione e la propria gestione degli errori. Se tre portali su cinquanta falliscono, il workflow completa gli altri quarantasette e instrada i tre fallimenti a una coda di revisione con contesto dettagliato dell'errore.

## Come appare nella pratica

Un'organizzazione di credenziali verifica le licenze degli operatori sanitari nei collegi medici statali come parte del processo di iscrizione dei fornitori. Tradizionalmente, gli assistenti alla credenzializzazione accedono manualmente al sito web di ogni collegio, cercano il fornitore, fanno uno screenshot dello stato della licenza e inseriscono i dati nel sistema di credenzializzazione. Ogni verifica richiede da cinque a quindici minuti e l'organizzazione ne elabora centinaia a settimana.

Con Triggerfish, un workflow gestisce l'intero ciclo di verifica. Il workflow riceve un batch di fornitori con i loro numeri di licenza e gli stati di destinazione. Per ogni fornitore, l'automazione del browser naviga verso il portale del collegio statale pertinente, accede con le credenziali memorizzate, cerca il fornitore, estrae lo stato della licenza e la data di scadenza e archivia il risultato. I dati estratti vengono classificati a CONFIDENTIAL perché contengono PII del fornitore e le regole di write-down impediscono che vengano inviati a qualsiasi canale al di sotto di quel livello di classificazione.

Quando un collegio statale ridisegna il proprio portale, l'agente si adatta al prossimo tentativo di verifica. Quando un collegio aggiunge un CAPTCHA che blocca l'accesso automatizzato, il workflow segnala quello stato per la verifica manuale e continua a elaborare il resto del batch. Gli assistenti alla credenzializzazione passano dall'eseguire tutte le verifiche manualmente alla gestione solo delle eccezioni che l'automazione non riesce a risolvere.
