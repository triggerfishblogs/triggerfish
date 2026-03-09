# Storage

Tutti i dati con stato in Triggerfish fluiscono attraverso un'astrazione
unificata `StorageProvider`. Nessun modulo crea il proprio meccanismo di storage
-- ogni componente che necessita di persistenza prende un `StorageProvider` come
dipendenza. Questo design rende i backend intercambiabili senza toccare la
logica di business e mantiene tutti i test veloci e deterministici.

## Interfaccia StorageProvider

```typescript
interface StorageProvider {
  /** Recupera un valore per chiave. Restituisce null se non trovato. */
  get(key: string): Promise<StorageValue | null>;

  /** Archivia un valore a una chiave. Sovrascrive qualsiasi valore esistente. */
  set(key: string, value: StorageValue): Promise<void>;

  /** Elimina una chiave. Nessun effetto se la chiave non esiste. */
  delete(key: string): Promise<void>;

  /** Elenca tutte le chiavi corrispondenti a un prefisso opzionale. */
  list(prefix?: string): Promise<string[]>;

  /** Elimina tutte le chiavi. Usare con cautela. */
  clear(): Promise<void>;
}
```

::: info `StorageValue` è una stringa. Tutti i dati strutturati (sessioni,
record di lineage, configurazione) vengono serializzati in JSON prima dello
storage e deserializzati alla lettura. Questo mantiene l'interfaccia semplice e
agnostica rispetto al backend. :::

## Implementazioni

| Backend                 | Caso d'Uso                       | Persistenza                                          | Configurazione                    |
| ----------------------- | -------------------------------- | ---------------------------------------------------- | --------------------------------- |
| `MemoryStorageProvider` | Testing, sessioni effimere       | Nessuna (persa al riavvio)                           | Nessuna configurazione necessaria |
| `SqliteStorageProvider` | Default per il livello personale | SQLite WAL in `~/.triggerfish/data/triggerfish.db`   | Zero configurazione               |
| Backend enterprise      | Livello enterprise               | Gestiti dal cliente                                  | Postgres, S3 o altri backend      |

### MemoryStorageProvider

Utilizzato in tutti i test per velocità e determinismo. I dati esistono solo in
memoria e vengono persi quando il processo termina. Ogni suite di test crea un
nuovo `MemoryStorageProvider`, garantendo che i test siano isolati e
riproducibili.

### SqliteStorageProvider

Il default per le distribuzioni di livello personale. Utilizza SQLite in modalità
WAL (Write-Ahead Logging) per accesso in lettura concorrente e sicurezza in caso
di crash. Il database si trova in:

```
~/.triggerfish/data/triggerfish.db
```

SQLite non richiede configurazione, nessun processo server e nessuna rete. Un
singolo file archivia tutto lo stato di Triggerfish. Il pacchetto Deno
`@db/sqlite` fornisce il binding, che richiede il permesso `--allow-ffi`.

::: tip La modalità WAL di SQLite consente a più lettori di accedere al database
contemporaneamente con un singolo scrittore. Questo è importante per il Gateway,
che potrebbe leggere lo stato della sessione mentre l'agente sta scrivendo i
risultati degli strumenti. :::

### Backend Enterprise

Le distribuzioni enterprise possono collegare backend di storage esterni
(Postgres, S3, ecc.) senza modifiche al codice. Qualsiasi implementazione
dell'interfaccia `StorageProvider` funziona. Il backend è configurato in
`triggerfish.yaml`.

## Chiavi con Namespace

Tutte le chiavi nel sistema di storage hanno un namespace con un prefisso che
identifica il tipo di dato. Questo previene collisioni e rende possibile
interrogare, conservare e purgare i dati per categoria.

| Namespace        | Pattern Chiave                               | Descrizione                                       |
| ---------------- | -------------------------------------------- | ------------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                       | Stato della sessione (cronologia conversazione, metadati) |
| `taint:`         | `taint:sess_abc123`                          | Livello di taint della sessione                   |
| `lineage:`       | `lineage:lin_789xyz`                         | Record di lineage dei dati (tracciamento provenienza) |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Voci di audit log                                 |
| `cron:`          | `cron:job_daily_report`                      | Stato dei job cron e cronologia esecuzioni        |
| `notifications:` | `notifications:notif_456`                    | Coda delle notifiche                              |
| `exec:`          | `exec:run_789`                               | Cronologia dell'ambiente di esecuzione dell'agente |
| `skills:`        | `skills:skill_weather`                       | Metadati delle skill installate                   |
| `config:`        | `config:v3`                                  | Snapshot della configurazione                     |

## Policy di Conservazione

Ogni namespace ha una policy di conservazione predefinita. Le distribuzioni
enterprise possono personalizzarle.

| Namespace        | Conservazione Predefinita     | Motivazione                                     |
| ---------------- | ----------------------------- | ------------------------------------------------ |
| `sessions:`      | 30 giorni                     | La cronologia delle conversazioni invecchia      |
| `taint:`         | Corrisponde alla sessione     | Il taint è privo di significato senza la sessione |
| `lineage:`       | 90 giorni                     | Guidato dalla conformità, traccia di audit       |
| `audit:`         | 1 anno                        | Guidato dalla conformità, legale e normativo     |
| `cron:`          | 30 giorni                     | Cronologia esecuzioni per il debug               |
| `notifications:` | Fino a consegna + 7 giorni   | Le notifiche non consegnate devono persistere    |
| `exec:`          | 30 giorni                     | Artefatti di esecuzione per il debug             |
| `skills:`        | Permanente                    | I metadati delle skill installate non devono scadere |
| `config:`        | 10 versioni                   | Cronologia rolling della configurazione per rollback |

## Principi di Progettazione

### Tutti i Moduli Usano StorageProvider

Nessun modulo in Triggerfish crea il proprio meccanismo di storage. La gestione
delle sessioni, il tracciamento del taint, la registrazione della lineage,
l'audit logging, lo stato dei cron, le code delle notifiche, la cronologia delle
esecuzioni e la configurazione -- tutto fluisce attraverso `StorageProvider`.

Questo significa:

- Lo scambio dei backend richiede la modifica di un singolo punto di dependency
  injection
- I test usano `MemoryStorageProvider` per velocità -- nessun setup SQLite,
  nessun filesystem
- C'è esattamente un posto dove implementare crittografia a riposo, backup o
  replica

### Serializzazione

Tutti i dati strutturati vengono serializzati in stringhe JSON prima dello
storage. Il livello di serializzazione/deserializzazione gestisce:

- Oggetti `Date` (serializzati come stringhe ISO 8601 tramite `toISOString()`,
  deserializzati tramite `new Date()`)
- Tipi branded (serializzati come il loro valore stringa sottostante)
- Oggetti e array annidati

```typescript
// Archiviare una sessione
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// Recuperare una sessione
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Ripristina Date
}
```

### Immutabilità

Le operazioni sulle sessioni sono immutabili. Leggere una sessione, modificarla
e riscriverla produce sempre un nuovo oggetto. Le funzioni non mutano mai
l'oggetto archiviato sul posto. Questo è in linea con il principio più ampio di
Triggerfish che le funzioni restituiscono nuovi oggetti e non mutano mai.

## Struttura delle Directory

```
~/.triggerfish/
  config/          # Configurazione dell'agente, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Ambiente di esecuzione dell'agente
    <agent-id>/    # Workspace per-agente (persiste)
    background/    # Workspace delle sessioni in background
  skills/          # Skill installate
  logs/            # Log di audit
  secrets/         # Archivio credenziali crittografato
```

::: warning SICUREZZA La directory `secrets/` contiene credenziali crittografate
gestite dall'integrazione con il portachiavi del sistema operativo. Non archivi
mai secret nei file di configurazione o nel `StorageProvider`. Utilizzi il
portachiavi del sistema operativo (livello personale) o l'integrazione vault
(livello enterprise). :::
