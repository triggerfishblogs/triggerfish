# Notifieringar

NotificationService är Triggerfish förstklassiga abstraktion för att leverera notifieringar till agentens ägare över alla anslutna kanaler.

## Varför en notifieringstjänst?

Utan en dedikerad tjänst tenderar notifieringslogik att sprida sig över kodbasen — varje funktion implementerar sitt eget "meddela ägaren"-mönster. Det leder till inkonsekvent beteende, missade notifieringar och dubbletter.

Triggerfish centraliserar all notifieringsleverans via en enda tjänst som hanterar prioritet, köning och deduplicering.

## Hur det fungerar

<img src="/diagrams/notification-routing.svg" alt="Notifieringsdirigering: källor flödar genom NotificationService med prioritetsdirigering, köning och deduplicering till kanaler" style="max-width: 100%;" />

När någon komponent behöver meddela ägaren — ett cron-jobb som slutförs, en trigger som identifierar något viktigt, ett webhook som avfyras — anropar den NotificationService. Tjänsten avgör hur och var notifieringen ska levereras.

## Gränssnitt

```typescript
interface NotificationService {
  /** Leverera eller köa en notifiering för en användare. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Hämta väntande (oleverade) notifieringar för en användare. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Bekräfta att en notifiering är levererad. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Prioritetsnivåer

Varje notifiering bär en prioritet som påverkar leveransbeteendet:

| Prioritet  | Beteende                                                                         |
| ---------- | -------------------------------------------------------------------------------- |
| `critical` | Levereras omedelbart till alla anslutna kanaler. Kringgår tysta timmar.          |
| `normal`   | Levereras till den föredragna kanalen. Köas om användaren är offline.            |
| `low`      | Köas och levereras i batchar. Kan sammanfattas.                                  |

## Leveransalternativ

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Köning och offline-leverans

När målanvändaren är offline eller inga kanaler är anslutna köas notifieringar. De levereras när:

- Användaren startar en ny session.
- En kanal återansluter.
- Användaren explicit begär väntande notifieringar.

Väntande notifieringar kan hämtas med `getPending()` och bekräftas med `acknowledge()`.

## Deduplicering

NotificationService förhindrar att dubbla notifieringar når användaren. Om samma notifieringsinnehåll levereras flera gånger inom ett tidsfönster passerar bara den första leveransen igenom.

## Konfiguration

Konfigurera notifieringsbeteende i `triggerfish.yaml`:

```yaml
notifications:
  preferred_channel: telegram # Standard leveranskanal
  quiet_hours: "22:00-07:00" # Undertryck normal/låg under dessa timmar
  batch_interval: 15m # Batchlägg låg-prioritetsnotifieringar
```

## Användningsexempel

Notifieringar används i hela systemet:

- **Cron-jobb** meddelar ägaren när en schemalagd uppgift slutförs eller misslyckas.
- **Triggers** meddelar ägaren när övervakning identifierar något som behöver uppmärksamhet.
- **Webhooks** meddelar ägaren när en extern händelse avfyras (GitHub PR, Sentry-larm).
- **Policyöverträdelser** meddelar ägaren när ett blockerat försök görs.
- **Kanalstatus** meddelar ägaren när en kanal kopplar från eller återansluter.

::: info Notifieringskön bevaras via `StorageProvider` (namnrymd: `notifications:`) med en standard retention på 7 dagar efter leverans. Oleverade notifieringar bevaras tills de bekräftas. :::
