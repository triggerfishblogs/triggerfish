# Gateway

Il Gateway è il piano di controllo centrale di Triggerfish -- un servizio locale
a lunga esecuzione che coordina sessioni, canali, strumenti, eventi e processi
agente attraverso un singolo endpoint WebSocket. Tutto ciò che accade in
Triggerfish fluisce attraverso il Gateway.

## Architettura

<img src="/diagrams/gateway-architecture.svg" alt="Architettura del Gateway: i canali sulla sinistra si connettono attraverso il Gateway centrale ai servizi sulla destra" style="max-width: 100%;" />

Il Gateway è in ascolto su una porta configurabile (default `18789`) e accetta
connessioni dagli adattatori di canale, comandi CLI, app companion e servizi
interni. Tutte le comunicazioni utilizzano JSON-RPC su WebSocket.

## Servizi del Gateway

Il Gateway fornisce questi servizi attraverso i suoi endpoint WebSocket e HTTP:

| Servizio          | Descrizione                                                                       | Integrazione Sicurezza                   |
| ----------------- | --------------------------------------------------------------------------------- | ---------------------------------------- |
| **Sessioni**      | Crea, elenca, recupera cronologia, invia tra sessioni, genera attività in background | Taint di sessione tracciato per-sessione |
| **Canali**        | Instrada messaggi, gestisce connessioni, riprova consegne fallite, suddivide messaggi grandi | Controlli di classificazione su tutto l'output |
| **Cron**          | Pianifica attività ricorrenti e risveglio trigger da `TRIGGER.md`                 | Le azioni cron passano attraverso gli Hook di policy |
| **Webhook**       | Accetta eventi in entrata da servizi esterni tramite `POST /webhooks/:sourceId`   | Dati in entrata classificati all'ingestione |
| **Ripple**        | Traccia stato online e indicatori di digitazione tra canali                        | Nessun dato sensibile esposto            |
| **Config**        | Ricaricamento a caldo delle impostazioni senza riavvio                            | Solo admin in enterprise                 |
| **Control UI**    | Dashboard web per la salute e la gestione del gateway                             | Autenticato con token                    |
| **Tide Pool**     | Ospita workspace visuale A2UI guidato dall'agente                                 | Contenuto soggetto agli Hook di output   |
| **Notifiche**     | Consegna notifiche cross-canale con routing per priorità                          | Si applicano le regole di classificazione |

## Protocollo WebSocket JSON-RPC

I client si connettono al Gateway tramite WebSocket e scambiano messaggi
JSON-RPC 2.0. Ogni messaggio è una chiamata a metodo con parametri tipizzati e
una risposta tipizzata.

```typescript
// Il client invia:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Il Gateway risponde:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

Il Gateway serve anche endpoint HTTP per l'ingestione dei webhook. Quando un
`SchedulerService` è collegato, le rotte `POST /webhooks/:sourceId` sono
disponibili per gli eventi webhook in entrata.

## Interfaccia del Server

```typescript
interface GatewayServerOptions {
  /** Porta su cui ascoltare. Usare 0 per una porta disponibile casuale. */
  readonly port?: number;
  /** Token di autenticazione per le connessioni. */
  readonly authToken?: string;
  /** Servizio scheduler opzionale per gli endpoint webhook. */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** Avvia il server. Restituisce l'indirizzo vincolato. */
  start(): Promise<GatewayAddr>;
  /** Ferma il server in modo controllato. */
  stop(): Promise<void>;
}
```

## Autenticazione

Le connessioni al Gateway sono autenticate con un token. Il token viene generato
durante la configurazione (`triggerfish dive`) e archiviato localmente.

::: warning SICUREZZA Il Gateway si vincola a `127.0.0.1` per impostazione
predefinita e non è esposto alla rete. L'accesso remoto richiede una
configurazione esplicita del tunnel. Non esponga mai il WebSocket del Gateway
all'internet pubblico senza autenticazione. :::

## Gestione delle Sessioni

Il Gateway gestisce l'intero ciclo di vita delle sessioni. Le sessioni sono
l'unità fondamentale dello stato della conversazione, ciascuna con tracciamento
indipendente del taint.

### Tipi di Sessione

| Tipo        | Pattern Chiave                 | Descrizione                                                                  |
| ----------- | ------------------------------ | ---------------------------------------------------------------------------- |
| Principale  | `main`                         | Conversazione diretta primaria con il proprietario. Persiste tra i riavvii.  |
| Canale      | `channel:<tipo>:<id>`          | Una per canale connesso. Taint isolato per canale.                           |
| Background  | `bg:<task_id>`                 | Generata per job cron e attività attivate da webhook. Inizia con taint `PUBLIC`. |
| Agente      | `agent:<agent_id>`             | Sessioni per-agente per routing multi-agente.                                |
| Gruppo      | `group:<canale>:<group_id>`    | Sessioni di chat di gruppo.                                                  |

### Strumenti di Sessione

L'agente interagisce con le sessioni attraverso questi strumenti, tutti
instradati attraverso il Gateway:

| Strumento          | Descrizione                                | Implicazioni sul Taint                     |
| ------------------ | ------------------------------------------ | ------------------------------------------ |
| `sessions_list`    | Elenca le sessioni attive con filtri opzionali | Nessun cambiamento del taint             |
| `sessions_history` | Recupera la trascrizione di una sessione   | Il taint eredita dalla sessione referenziata |
| `sessions_send`    | Invia messaggio a un'altra sessione        | Soggetto al controllo write-down           |
| `sessions_spawn`   | Crea sessione per attività in background   | La nuova sessione inizia con taint `PUBLIC` |
| `session_status`   | Controlla lo stato corrente della sessione, modello, costo | Nessun cambiamento del taint |

::: info La comunicazione inter-sessione tramite `sessions_send` è soggetta alle
stesse regole di write-down di qualsiasi altro output. Una sessione
`CONFIDENTIAL` non può inviare dati a una sessione connessa a un canale
`PUBLIC`. :::

## Routing dei Canali

Il Gateway instrada i messaggi tra canali e sessioni attraverso il router dei
canali. Il router gestisce:

- **Gate di classificazione**: ogni messaggio in uscita passa attraverso
  `PRE_OUTPUT` prima della consegna
- **Retry con backoff**: le consegne fallite vengono riprovate con backoff
  esponenziale tramite `sendWithRetry()`
- **Suddivisione messaggi**: i messaggi grandi vengono suddivisi in blocchi
  appropriati per la piattaforma (es. limite di 4096 caratteri di Telegram)
- **Streaming**: le risposte vengono trasmesse in streaming ai canali che lo
  supportano
- **Gestione connessioni**: `connectAll()` e `disconnectAll()` per la gestione
  del ciclo di vita

## Servizio di Notifiche

Il Gateway integra un servizio di notifiche di prima classe che sostituisce i
pattern ad-hoc "notifica il proprietario" attraverso la piattaforma. Tutte le
notifiche fluiscono attraverso un singolo `NotificationService`.

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### Routing per Priorità

| Priorità   | Comportamento                                                         |
| ---------- | --------------------------------------------------------------------- |
| `CRITICAL` | Ignora le ore di silenzio, consegna a TUTTI i canali connessi immediatamente |
| `HIGH`     | Consegna al canale preferito immediatamente, accoda se offline        |
| `NORMAL`   | Consegna alla sessione attiva, o accoda per il prossimo avvio sessione |
| `LOW`      | Accoda, consegna in batch durante le sessioni attive                  |

### Fonti di Notifica

| Fonte                                | Categoria  | Priorità Predefinita |
| ------------------------------------ | ---------- | -------------------- |
| Violazioni di policy                 | `security` | `CRITICAL`           |
| Alert di threat intelligence         | `security` | `CRITICAL`           |
| Richieste di approvazione skill      | `approval` | `HIGH`               |
| Fallimenti dei job cron              | `system`   | `HIGH`               |
| Avvisi sullo stato del sistema       | `system`   | `HIGH`               |
| Trigger eventi webhook               | `info`     | `NORMAL`             |
| Aggiornamenti disponibili da The Reef | `info`    | `LOW`                |

Le notifiche sono persistite tramite `StorageProvider` (namespace:
`notifications:`) e sopravvivono ai riavvii. Le notifiche non consegnate vengono
riprovate al prossimo avvio del Gateway o connessione della sessione.

### Preferenze di Consegna

Gli utenti configurano le preferenze di notifica per-canale:

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "America/Chicago"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## Integrazione dello Scheduler

Il Gateway ospita il servizio scheduler, che gestisce:

- **Ciclo tick cron**: valutazione periodica delle attività pianificate
- **Risvegli trigger**: risvegli dell'agente definiti in `TRIGGER.md`
- **Endpoint HTTP webhook**: `POST /webhooks/:sourceId` per eventi in entrata
- **Isolamento dell'orchestratore**: ogni attività pianificata viene eseguita nel
  proprio `OrchestratorFactory` con stato di sessione isolato

::: tip Le attività attivate da cron e webhook generano sessioni in background
con taint `PUBLIC` fresco. Non ereditano il taint di nessuna sessione esistente,
garantendo che le attività autonome partano con uno stato di classificazione
pulito. :::

## Salute e Diagnostica

Il comando `triggerfish patrol` si connette al Gateway ed esegue controlli
diagnostici di salute, verificando:

- Il Gateway è in esecuzione e reattivo
- Tutti i canali configurati sono connessi
- Lo storage è accessibile
- Le attività pianificate vengono eseguite nei tempi previsti
- Nessuna notifica critica non consegnata è bloccata nella coda
