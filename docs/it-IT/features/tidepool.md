# Tide Pool / A2UI

Il Tide Pool è uno spazio di lavoro visuale controllato dall'agent dove
Triggerfish renderizza contenuti interattivi: dashboard, grafici, moduli,
anteprime del codice e rich media. A differenza della chat, che è una
conversazione lineare, il Tide Pool è un canvas che l'agent controlla.

## Cos'è A2UI?

A2UI (Agent-to-UI) è il protocollo che alimenta il Tide Pool. Definisce come
l'agent invia contenuti visivi e aggiornamenti ai client connessi in tempo
reale. L'agent decide cosa mostrare; il client lo renderizza.

## Architettura

<img src="/diagrams/tidepool-architecture.svg" alt="Architettura Tide Pool A2UI: l'Agent invia contenuto attraverso il Gateway al Renderer Tide Pool sui client connessi" style="max-width: 100%;" />

L'agent utilizza il tool `tide_pool` per inviare contenuto al Tide Pool Host
che viene eseguito nel Gateway. L'Host trasmette gli aggiornamenti via WebSocket
a qualsiasi Renderer Tide Pool connesso su una piattaforma supportata.

## Tool del Tide Pool

L'agent interagisce con il Tide Pool attraverso questi tool:

| Tool              | Descrizione                                        | Caso d'Uso                                                    |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| `tidepool_render` | Renderizzare un albero di componenti nello spazio di lavoro | Dashboard, moduli, visualizzazioni, contenuti ricchi  |
| `tidepool_update` | Aggiornare le prop di un singolo componente per ID | Aggiornamenti incrementali senza sostituire l'intera vista    |
| `tidepool_clear`  | Cancellare lo spazio di lavoro, rimuovendo tutti i componenti | Transizioni di sessione, ricominciare da zero          |

### Azioni Legacy

L'host sottostante supporta anche azioni a livello più basso per la
retrocompatibilità:

| Azione     | Descrizione                             |
| ---------- | --------------------------------------- |
| `push`     | Inviare contenuto HTML/JS grezzo        |
| `eval`     | Eseguire JavaScript nel sandbox         |
| `reset`    | Cancellare tutto il contenuto           |
| `snapshot` | Catturare come immagine                 |

## Casi d'Uso

Il Tide Pool è progettato per scenari in cui la sola chat non è sufficiente:

- **Dashboard** -- L'agent costruisce una dashboard live che mostra metriche
  dalle integrazioni connesse.
- **Visualizzazione dei Dati** -- Grafici e diagrammi renderizzati dai risultati
  delle query.
- **Moduli e Input** -- Moduli interattivi per la raccolta di dati strutturati.
- **Anteprime del Codice** -- Codice con evidenziazione della sintassi e
  risultati di esecuzione live.
- **Rich Media** -- Immagini, mappe e contenuti incorporati.
- **Editing Collaborativo** -- L'agent presenta un documento per la revisione
  e l'annotazione.

## Come Funziona

1. Si chiede all'agent di visualizzare qualcosa (o l'agent decide che una
   risposta visiva è appropriata).
2. L'agent usa l'azione `push` per inviare HTML e JavaScript al Tide Pool.
3. Il Tide Pool Host del Gateway riceve il contenuto e lo trasmette ai client
   connessi.
4. Il renderer mostra il contenuto in tempo reale.
5. L'agent può usare `eval` per effettuare aggiornamenti incrementali senza
   sostituire l'intera vista.
6. Quando il contesto cambia, l'agent usa `reset` per cancellare lo spazio di
   lavoro.

## Integrazione con la Sicurezza

Il contenuto del Tide Pool è soggetto alla stessa applicazione della sicurezza
di qualsiasi altro output:

- **Hook PRE_OUTPUT** -- Tutto il contenuto inviato al Tide Pool passa
  attraverso l'hook di applicazione PRE_OUTPUT prima della renderizzazione. I
  dati classificati che violano le policy di output vengono bloccati.
- **Taint della sessione** -- Il contenuto renderizzato eredita il livello di
  taint della sessione. Un Tide Pool che mostra dati `CONFIDENTIAL` è esso
  stesso `CONFIDENTIAL`.
- **Classificazione degli snapshot** -- Gli snapshot del Tide Pool sono
  classificati al livello di taint della sessione al momento della cattura.
- **Sandboxing JavaScript** -- Il JavaScript eseguito tramite `eval` è in
  sandbox all'interno del contesto del Tide Pool. Non ha accesso al sistema host,
  alla rete o al filesystem.
- **Nessun accesso di rete** -- Il runtime del Tide Pool non può effettuare
  richieste di rete. Tutti i dati fluiscono attraverso l'agent e il livello
  delle policy.

## Indicatori di Stato

L'interfaccia web Tidepool include indicatori di stato in tempo reale:

### Barra della Lunghezza del Contesto

Una barra di progresso stilizzata che mostra l'utilizzo della finestra di
contesto -- quanto della finestra di contesto del LLM è stato consumato. La
barra si aggiorna dopo ogni messaggio e dopo la compattazione.

### Stato dei Server MCP

Mostra lo stato di connessione dei server MCP configurati (es. "MCP 3/3").
Codificato a colori: verde per tutti connessi, giallo per parziali, rosso per
nessuno.

### Input Sicuro per Secret

Quando l'agent necessita che si inserisca un secret (tramite il tool
`secret_save`), Tidepool mostra un popup di input sicuro. Il valore inserito va
direttamente al portachiavi -- non viene mai inviato attraverso la chat né è
visibile nella cronologia della conversazione.

::: tip Pensare al Tide Pool come alla lavagna dell'agent. Mentre la chat è il
modo in cui si parla con l'agent, il Tide Pool è dove l'agent mostra le
cose. :::
