# Varsler

NotificationService er Triggerfish sin førsteklasses abstraksjon for å levere
varsler til agentens eier på tvers av alle tilkoblede kanaler.

## Hvorfor en varslingstjeneste?

Uten en dedikert tjeneste har varslingslogikk en tendens til å spre seg i koden
— hver funksjon implementerer sitt eget «varsle eieren»-mønster. Dette fører til
inkonsistent atferd, tapte varsler og duplikater.

Triggerfish sentraliserer all varslingslevering gjennom en enkelt tjeneste som
håndterer prioritet, køing og deduplicering.

## Slik fungerer det

<img src="/diagrams/notification-routing.svg" alt="Notification routing: sources flow through NotificationService with priority routing, queuing, and deduplication to channels" style="max-width: 100%;" />

Når en komponent trenger å varsle eieren — en cron-jobb som fullføres, en trigger
som oppdager noe viktig, en webhook som utløses — kaller den NotificationService.
Tjenesten bestemmer hvordan og hvor varslet leveres.

## Grensesnitt

```typescript
interface NotificationService {
  /** Deliver or queue a notification for a user. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Get pending (undelivered) notifications for a user. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Acknowledge a notification as delivered. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Prioritetsnivåer

Hvert varsel bærer en prioritet som påvirker leveringsatferden:

| Prioritet  | Atferd                                                                         |
| ---------- | ------------------------------------------------------------------------------ |
| `critical` | Leveres umiddelbart til alle tilkoblede kanaler. Omgår stille-timer.           |
| `normal`   | Leveres til den foretrukne kanalen. Køes hvis brukeren er frakoblet.           |
| `low`      | Køes og leveres i samlinger. Kan oppsummeres.                                  |

## Leveringsalternativer

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Køing og frakoblet levering

Når målbrukeren er frakoblet eller ingen kanaler er tilkoblet, køes varsler.
De leveres når:

- Brukeren starter en ny sesjon.
- En kanal kobler til igjen.
- Brukeren eksplisitt ber om ventende varsler.

Ventende varsler kan hentes med `getPending()` og bekreftes med `acknowledge()`.

## Deduplicering

NotificationService forhindrer at dupliserte varsler når brukeren. Hvis det
samme varselinnholdet leveres flere ganger innenfor et tidsvindu, går bare den
første leveringen gjennom.

## Konfigurasjon

Konfigurer varslingsatferd i `triggerfish.yaml`:

```yaml
notifications:
  preferred_channel: telegram # Standard leveringskanal
  quiet_hours: "22:00-07:00" # Undertrykk normal/lav i disse timene
  batch_interval: 15m # Saml lavprioritets-varsler
```

## Brukseksempler

Varsler brukes gjennom hele systemet:

- **Cron-jobber** varsler eieren når en planlagt oppgave fullføres eller feiler.
- **Triggers** varsler eieren når overvåking oppdager noe som trenger oppmerksomhet.
- **Webhooks** varsler eieren når en ekstern hendelse utløses (GitHub PR, Sentry-varsel).
- **Policy-brudd** varsler eieren når en blokkert handling forsøkes.
- **Kanalstatus** varsler eieren når en kanal kobles fra eller tilkobles igjen.

::: info Varselskøen er vedvarende via `StorageProvider` (navnerom:
`notifications:`) med standard oppbevaring på 7 dager etter levering. Uleverte
varsler beholdes inntil de bekreftes. :::
