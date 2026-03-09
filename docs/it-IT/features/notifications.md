# Notifiche

Il NotificationService è l'astrazione di prima classe di Triggerfish per la
consegna delle notifiche al proprietario dell'agent attraverso tutti i canali
connessi.

## Perché un Servizio di Notifica?

Senza un servizio dedicato, la logica delle notifiche tende a sparpagliarsi nel
codebase -- ogni funzionalità implementa il proprio pattern "notifica il
proprietario". Questo porta a comportamenti incoerenti, notifiche mancate e
duplicati.

Triggerfish centralizza tutta la consegna delle notifiche attraverso un singolo
servizio che gestisce priorità, accodamento e deduplicazione.

## Come Funziona

<img src="/diagrams/notification-routing.svg" alt="Routing delle notifiche: le fonti fluiscono attraverso il NotificationService con routing per priorità, accodamento e deduplicazione verso i canali" style="max-width: 100%;" />

Quando qualsiasi componente ha bisogno di notificare il proprietario -- un cron
job che si completa, un trigger che rileva qualcosa di importante, un webhook
che si attiva -- chiama il NotificationService. Il servizio determina come e
dove consegnare la notifica.

## Interfaccia

```typescript
interface NotificationService {
  /** Consegnare o accodare una notifica per un utente. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Ottenere le notifiche pendenti (non consegnate) per un utente. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Confermare una notifica come consegnata. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Livelli di Priorità

Ogni notifica porta una priorità che influenza il comportamento di consegna:

| Priorità   | Comportamento                                                               |
| ---------- | --------------------------------------------------------------------------- |
| `critical` | Consegnata immediatamente a tutti i canali connessi. Ignora le ore di silenzio. |
| `normal`   | Consegnata al canale preferito. Accodata se l'utente è offline.             |
| `low`      | Accodata e consegnata in batch. Potrebbe essere riassunta.                  |

## Opzioni di Consegna

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Accodamento e Consegna Offline

Quando l'utente target è offline o nessun canale è connesso, le notifiche
vengono accodate. Vengono consegnate quando:

- L'utente avvia una nuova sessione.
- Un canale si riconnette.
- L'utente richiede esplicitamente le notifiche pendenti.

Le notifiche pendenti possono essere recuperate con `getPending()` e confermate
con `acknowledge()`.

## Deduplicazione

Il NotificationService previene le notifiche duplicate dal raggiungere l'utente.
Se lo stesso contenuto di notifica viene consegnato più volte all'interno di
una finestra, solo la prima consegna viene effettuata.

## Configurazione

Configurare il comportamento delle notifiche in `triggerfish.yaml`:

```yaml
notifications:
  preferred_channel: telegram # Canale di consegna predefinito
  quiet_hours: "22:00-07:00" # Sopprimere normal/low durante queste ore
  batch_interval: 15m # Raggruppare le notifiche a bassa priorità
```

## Esempi di Utilizzo

Le notifiche sono utilizzate in tutto il sistema:

- I **cron job** notificano il proprietario quando un'attività programmata si
  completa o fallisce.
- I **trigger** notificano il proprietario quando il monitoraggio rileva
  qualcosa che richiede attenzione.
- I **webhook** notificano il proprietario quando un evento esterno si attiva
  (PR GitHub, allerta Sentry).
- Le **violazioni delle policy** notificano il proprietario quando viene tentata
  un'azione bloccata.
- Lo **stato dei canali** notifica il proprietario quando un canale si
  disconnette o si riconnette.

::: info La coda delle notifiche è persistita tramite `StorageProvider`
(namespace: `notifications:`) con una conservazione predefinita di 7 giorni dopo
la consegna. Le notifiche non consegnate vengono conservate fino alla
conferma. :::
