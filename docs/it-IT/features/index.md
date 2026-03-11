# Panoramica delle Funzionalità

Oltre al suo [modello di sicurezza](/it-IT/security/) e al [supporto
canali](/it-IT/channels/), Triggerfish offre funzionalità che estendono il Suo
agente IA oltre il semplice domanda-e-risposta: attività pianificate, memoria
persistente, accesso web, input vocale e failover multi-modello.

## Comportamento Proattivo

### [Cron e Trigger](./cron-and-triggers)

Pianifichi attività ricorrenti con espressioni cron standard e definisca
comportamenti di monitoraggio proattivo attraverso `TRIGGER.md`. Il Suo agente
può consegnare briefing mattutini, controllare pipeline, monitorare messaggi non
letti e agire autonomamente secondo un programma configurabile -- il tutto con
applicazione della classificazione e sessioni isolate.

### [Notifiche](./notifications)

Un servizio di consegna notifiche che instrada messaggi attraverso tutti i canali
connessi con livelli di priorità, accodamento offline e deduplicazione. Sostituisce
i pattern di notifica ad-hoc con un'astrazione unificata.

## Strumenti dell'Agente

### [Ricerca Web e Fetch](./web-search)

Cerchi nel web e recuperi contenuti delle pagine. L'agente usa `web_search` per
trovare informazioni e `web_fetch` per leggere pagine web, con prevenzione SSRF
e applicazione delle policy su tutte le richieste in uscita.

### [Memoria Persistente](./memory)

Memoria cross-sessione con gating della classificazione. L'agente salva e
richiama fatti, preferenze e contesto tra le conversazioni. La classificazione
della memoria è forzata al taint di sessione -- l'LLM non può scegliere il
livello.

### [Analisi Immagini e Visione](./image-vision)

Incolli immagini dagli appunti (Ctrl+V nella CLI, incolla nel browser in Tide
Pool) e analizzi file immagine su disco. Configuri un modello vision separato per
descrivere automaticamente le immagini quando il modello primario non supporta la
visione.

### [Esplorazione del Codebase](./explore)

Comprensione strutturata del codebase tramite sub-agenti paralleli. Lo strumento
`explore` mappa gli alberi delle directory, rileva pattern di codifica, traccia
gli import e analizza la cronologia git -- tutto in modo concorrente.

### [Gestione delle Sessioni](./sessions)

Ispezioni, comunichi con e generi sessioni. L'agente può delegare attività in
background, inviare messaggi cross-sessione e raggiungere altri canali -- tutto
sotto l'applicazione del write-down.

### [Modalità Pianificazione e Tracciamento Attività](./planning)

Pianificazione strutturata prima dell'implementazione (modalità pianificazione) e
tracciamento persistente delle attività (todo) tra le sessioni. La modalità
pianificazione vincola l'agente all'esplorazione in sola lettura finché l'utente
non approva il piano.

### [Filesystem e Shell](./filesystem)

Legga, scriva, cerchi ed esegua comandi. Gli strumenti fondamentali per le
operazioni sui file, con scoping del workspace e applicazione della denylist dei
comandi.

### [Sub-Agenti e Attività LLM](./subagents)

Deleghi lavoro a sub-agenti autonomi o esegua prompt LLM isolati per
summarizzazione, classificazione e ragionamento focalizzato senza inquinare la
conversazione principale.

### [Team di Agenti](./agent-teams)

Generi team persistenti di agenti collaborativi con ruoli specializzati. Un lead
coordina i membri che comunicano autonomamente tramite messaggistica
inter-sessione. Include monitoraggio del ciclo di vita con timeout di inattività,
limiti di durata e controlli di salute. Ideale per attività complesse che
beneficiano di prospettive multiple che iterano sul lavoro reciproco.

## Interazione Ricca

### [Pipeline Vocale](./voice)

Supporto vocale completo con provider STT e TTS configurabili. Utilizzi Whisper
per la trascrizione locale, Deepgram o OpenAI per STT cloud, ed ElevenLabs o
OpenAI per text-to-speech. L'input vocale passa attraverso la stessa
classificazione e applicazione delle policy del testo.

### [Tide Pool / A2UI](./tidepool)

Un workspace visuale guidato dall'agente dove Triggerfish renderizza contenuti
interattivi -- dashboard, grafici, form e anteprime del codice. Il protocollo
A2UI (Agent-to-UI) invia aggiornamenti in tempo reale dall'agente ai client
connessi.

## Multi-Agente e Multi-Modello

### [Routing Multi-Agente](./multi-agent)

Instradi canali, account o contatti diversi verso agenti isolati separati,
ciascuno con il proprio SPINE.md, workspace, skill e tetto di classificazione.
Il Suo Slack di lavoro va a un agente; il Suo WhatsApp personale va a un altro.

### [Provider LLM e Failover](./model-failover)

Si connetta ad Anthropic, OpenAI, Google, modelli locali (Ollama) o OpenRouter.
Configuri catene di failover affinché il Suo agente passi automaticamente a un
provider alternativo quando uno non è disponibile. Ogni agente può usare un
modello diverso.

### [Rate Limiting](./rate-limiting)

Rate limiter a finestra scorrevole che previene il raggiungimento dei limiti API
del provider LLM. Traccia token-per-minuto e richieste-per-minuto, ritarda le
chiamate quando la capacità è esaurita e si integra con la catena di failover.

## Operazioni

### [Logging Strutturato](./logging)

Logging strutturato unificato con livelli di severità, rotazione dei file e
doppio output su stderr e file. Righe di log etichettate per componente,
rotazione automatica a 1 MB e uno strumento `log_read` per accedere alla
cronologia dei log.

::: info Tutte le funzionalità si integrano con il modello di sicurezza
fondamentale. I job cron rispettano i tetti di classificazione. L'input vocale
porta taint. I contenuti Tide Pool passano attraverso l'Hook PRE_OUTPUT. Il
routing multi-agente applica l'isolamento delle sessioni. Nessuna funzionalità
aggira il livello di policy. :::
