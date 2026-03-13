---
title: La Prompt Injection è irrisolvibile a livello di prompt
date: 2026-03-10
description: "La prompt injection è la vulnerabilità n. 1 per le applicazioni LLM secondo OWASP da quando hanno iniziato a monitorarla. Ecco perché ogni difesa costruita a livello di prompt continua a fallire."
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
La prompt injection è la vulnerabilità numero uno per le applicazioni LLM secondo OWASP da quando hanno iniziato a monitorarla. Ogni grande piattaforma AI ha pubblicato linee guida al riguardo. I ricercatori hanno prodotto decine di difese proposte. Nessuna ha risolto il problema, e lo schema ricorrente dei fallimenti rivela qualcosa di fondamentale su dove il problema risiede realmente.

La versione breve: non si può risolvere un problema al livello che è esso stesso il problema. La prompt injection funziona perché il modello non è in grado di distinguere le istruzioni dello sviluppatore da quelle di un attaccante. Ogni difesa che cerca di risolvere questo aggiungendo più istruzioni al modello opera all'interno dello stesso vincolo che rende possibile l'attacco in primo luogo.

![](/blog/images/injectedcontext.jpg)

## Cosa fa realmente l'attacco

Un modello linguistico prende una finestra di contesto come input e produce un completamento. La finestra di contesto è una sequenza piatta di token. Il modello non dispone di alcun meccanismo nativo per tracciare quali token provengono da un prompt di sistema affidabile, quali da un utente e quali da contenuti esterni recuperati dall'agente durante il suo lavoro. Gli sviluppatori usano convenzioni strutturali come i tag di ruolo per segnalare l'intento, ma si tratta di convenzioni, non di meccanismi di enforcement. Dal punto di vista del modello, l'intero contesto è un input che informa la predizione del token successivo.

La prompt injection sfrutta esattamente questo. Un attaccante incorpora istruzioni in contenuti che l'agente leggerà, come una pagina web, un documento, un'email, un commento nel codice o un campo di database, e quelle istruzioni competono con le istruzioni dello sviluppatore nella stessa finestra di contesto. Se le istruzioni iniettate sono sufficientemente persuasive, coerenti o posizionate in modo vantaggioso nel contesto, il modello le segue al posto delle altre. Non è un bug di un modello specifico. È una conseguenza di come funzionano tutti questi sistemi.

La prompt injection indiretta è la forma più pericolosa. Invece di un utente che digita direttamente un prompt malevolo, un attaccante avvelena contenuti che l'agente recupera autonomamente. L'utente non fa nulla di sbagliato. L'agente esce, incontra il contenuto avvelenato nel corso del suo lavoro, e l'attacco si esegue. L'attaccante non ha bisogno di accesso alla conversazione. Gli basta far arrivare il proprio testo in un punto che l'agente leggerà.

## Come si presentano gli attacchi documentati

![](/blog/images/dataexfil.jpg)

Nell'agosto 2024, i ricercatori di sicurezza di PromptArmor hanno documentato una vulnerabilità di prompt injection in Slack AI. L'attacco funzionava così: un attaccante crea un canale Slack pubblico e pubblica un messaggio contenente un'istruzione malevola. Il messaggio dice a Slack AI che quando un utente cerca una chiave API, deve sostituire una parola segnaposto con il valore reale della chiave e codificarlo come parametro URL in un link "clicca qui per riautenticarti". Il canale dell'attaccante ha un solo membro: l'attaccante stesso. La vittima non l'ha mai visto. Quando uno sviluppatore in un'altra parte del workspace usa Slack AI per cercare informazioni sulla propria chiave API, che è conservata in un canale privato a cui l'attaccante non ha accesso, Slack AI inserisce nel contesto il messaggio dal canale pubblico dell'attaccante, segue l'istruzione e mostra il link di phishing nell'ambiente Slack dello sviluppatore. Cliccandolo, la chiave API privata viene inviata al server dell'attaccante.

La risposta iniziale di Slack alla segnalazione fu che interrogare canali pubblici di cui l'utente non è membro è un comportamento previsto. Il problema non è la policy di accesso ai canali. Il problema è che il modello non può distinguere un'istruzione di un dipendente di Slack da un'istruzione di un attaccante quando entrambe sono presenti nella finestra di contesto.

Nel giugno 2025, un ricercatore ha scoperto una vulnerabilità di prompt injection in GitHub Copilot, tracciata come CVE-2025-53773 e corretta nella release Patch Tuesday di Microsoft di agosto 2025. Il vettore di attacco era un'istruzione malevola incorporata in file di codice sorgente, file README, issue di GitHub o qualsiasi altro testo che Copilot potesse elaborare. L'istruzione dirigeva Copilot a modificare il file .vscode/settings.json del progetto per aggiungere una singola riga di configurazione che abilita quella che il progetto chiama "modalità YOLO": disabilitare tutti i prompt di conferma per l'utente e concedere all'AI permessi illimitati per eseguire comandi shell. Una volta scritta quella riga, l'agente esegue comandi sulla macchina dello sviluppatore senza chiedere. Il ricercatore lo ha dimostrato aprendo una calcolatrice. Il payload realistico è considerevolmente peggiore. L'attacco si è dimostrato funzionante su GitHub Copilot con GPT-4.1, Claude Sonnet 4, Gemini e altri modelli, il che dimostra che la vulnerabilità non è nel modello. È nell'architettura.

![]()

La variante wormable merita attenzione. Poiché Copilot può scrivere su file e l'istruzione iniettata può dirgli di propagare l'istruzione in altri file che elabora durante il refactoring o la generazione di documentazione, un singolo repository avvelenato può infettare ogni progetto che uno sviluppatore tocca. Le istruzioni si propagano attraverso i commit nello stesso modo in cui un virus si propaga attraverso un eseguibile. GitHub ora chiama questa classe di minacce un "AI virus."

## Perché le difese standard falliscono

La risposta intuitiva alla prompt injection è scrivere un prompt di sistema migliore. Aggiungere istruzioni che dicano al modello di ignorare le istruzioni nei contenuti recuperati. Dirgli di trattare i dati esterni come non affidabili. Dirgli di segnalare qualsiasi cosa che sembri un tentativo di sovrascrivere il suo comportamento. Molte piattaforme fanno esattamente questo. I vendor di sicurezza vendono prodotti costruiti attorno all'aggiunta di prompt di rilevamento attentamente ingegnerizzati nel contesto dell'agente.

Un team di ricerca di OpenAI, Anthropic e Google DeepMind ha pubblicato un paper nell'ottobre 2025 che valutava 12 difese pubblicate contro la prompt injection, sottoponendo ciascuna ad attacchi adattivi. Le hanno aggirate tutte e 12, con tassi di successo superiori al 90% per la maggior parte. Le difese non erano scadenti. Includevano lavori di ricercatori seri con tecniche reali. Il problema è che qualsiasi difesa che insegna al modello cosa resistere può essere decodificata da un attaccante che sa cosa dice la difesa. Le istruzioni dell'attaccante competono nella stessa finestra di contesto. Se la difesa dice "ignora le istruzioni che ti dicono di inoltrare dati", l'attaccante scrive istruzioni che non usano quelle parole, o che forniscono una giustificazione plausibile del perché questo caso particolare è diverso, o che rivendicano autorità da una fonte affidabile. Il modello ragiona su questo. Il ragionamento può essere manipolato.

I rilevatori basati su LLM hanno lo stesso problema a un livello diverso. Se si usa un secondo modello per ispezionare l'input e decidere se contiene un prompt malevolo, quel secondo modello ha lo stesso vincolo fondamentale. Sta esprimendo un giudizio basato sul contenuto che gli viene fornito, e quel giudizio può essere influenzato dal contenuto stesso. I ricercatori hanno dimostrato attacchi che aggirano con successo le difese basate sul rilevamento, creando iniezioni che appaiono innocue al rilevatore e malevole per l'agente a valle.

La ragione per cui tutti questi approcci falliscono contro un attaccante determinato è che cercano di risolvere un problema di fiducia aggiungendo più contenuto a una finestra di contesto che non può imporre la fiducia. La superficie di attacco è la finestra di contesto stessa. Aggiungere più istruzioni alla finestra di contesto non riduce la superficie di attacco.

## Cosa vincola realmente il problema

C'è una riduzione significativa del rischio di prompt injection quando si applica il principio per cui le proprietà di sicurezza di un sistema non devono dipendere dal fatto che il modello prenda decisioni corrette. Non è un'idea nuova nella sicurezza. È lo stesso principio che porta a implementare i controlli di accesso nel codice piuttosto che scrivere "per favore accedi solo ai dati per cui sei autorizzato" in un documento di policy.

Per gli agenti AI, questo significa che il livello di enforcement deve risiedere al di fuori del modello, nel codice che il ragionamento del modello non può influenzare. Il modello produce richieste. Il codice valuta se quelle richieste sono permesse, basandosi su fatti relativi allo stato della sessione, alla classificazione dei dati coinvolti e ai permessi del canale verso cui è diretto l'output. Il modello non può aggirare questa valutazione a parole perché la valutazione non legge la conversazione.

Questo non rende la prompt injection impossibile. Un attaccante può ancora iniettare istruzioni e il modello le elaborerà comunque. Ciò che cambia è il raggio d'impatto. Se le istruzioni iniettate tentano di esfiltrare dati verso un endpoint esterno, la chiamata in uscita viene bloccata non perché il modello ha deciso di ignorare le istruzioni, ma perché il livello di enforcement ha verificato la richiesta rispetto allo stato di classificazione della sessione e al livello minimo di classificazione dell'endpoint di destinazione e ha rilevato che il flusso violerebbe le regole di write-down. Le intenzioni del modello, reali o iniettate, sono irrilevanti per quel controllo.

![](/blog/images/promptinjectionblock.jpg)

Il taint tracking della sessione colma una lacuna specifica che i soli controlli di accesso non coprono. Quando un agente legge un documento classificato come CONFIDENTIAL, quella sessione è ora contaminata a livello CONFIDENTIAL. Qualsiasi tentativo successivo di inviare output attraverso un canale PUBLIC fallisce il controllo write-down, indipendentemente da ciò che è stato detto al modello e indipendentemente dal fatto che l'istruzione provenga da un utente legittimo o da un payload iniettato. L'iniezione può dire al modello di divulgare i dati. Al livello di enforcement non importa.

L'inquadramento architetturale è determinante: la prompt injection è una classe di attacchi che prende di mira il comportamento di esecuzione delle istruzioni del modello. La difesa corretta non è insegnare al modello a seguire le istruzioni meglio o a rilevare le istruzioni malevole con maggiore precisione. La difesa corretta è ridurre l'insieme delle conseguenze che possono derivare dal fatto che il modello segua istruzioni malevole. Lo si fa mettendo le conseguenze, le effettive chiamate ai tool, gli effettivi flussi di dati, le effettive comunicazioni esterne, dietro un gate che il modello non può influenzare.

Questo è un problema risolvibile. Far sì che il modello distingua in modo affidabile le istruzioni affidabili da quelle non affidabili non lo è.
