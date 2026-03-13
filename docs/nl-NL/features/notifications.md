# Meldingen

De NotificationService is de eersteklas abstractie van Triggerfish voor het bezorgen van meldingen aan de agentteigenaar via alle verbonden kanalen.

## Waarom een meldingsservice?

Zonder een speciale service verspreidt meldingslogica zich over de codebase — elke functie implementeert zijn eigen "eigenaar melden"-patroon. Dit leidt tot inconsistent gedrag, gemiste meldingen en duplicaten.

Triggerfish centraliseert alle meldingsbezorging via één service die prioriteit, wachtrijen en deduplicatie verwerkt.

## Hoe het werkt

<img src="/diagrams/notification-routing.svg" alt="Meldingsrouting: bronnen stromen via NotificationService met prioriteitsrouting, wachtrijen en deduplicatie naar kanalen" style="max-width: 100%;" />

Wanneer een component de eigenaar moet melden — een voltooide cron-taak, een trigger die iets belangrijks detecteert, een webhook die afloopt — roept het de NotificationService aan. De service bepaalt hoe en waar de melding wordt bezorgd.

## Interface

```typescript
interface NotificationService {
  /** Een melding bezorgen of in de wachtrij plaatsen voor een gebruiker. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Uitstaande (niet-bezorgde) meldingen ophalen voor een gebruiker. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Een melding bevestigen als bezorgd. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Prioriteitsniveaus

Elke melding heeft een prioriteit die het bezorggedrag beïnvloedt:

| Prioriteit  | Gedrag                                                                    |
| ----------- | ------------------------------------------------------------------------- |
| `critical`  | Direct bezorgd naar alle verbonden kanalen. Bypaseen stille uren.         |
| `normal`    | Bezorgd aan het voorkeurskanaal. In de wachtrij als de gebruiker offline is. |
| `low`       | In de wachtrij geplaatst en in batches bezorgd. Kan worden samengevat.    |

## Bezorgopties

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Wachtrijen en offline bezorging

Wanneer de doelgebruiker offline is of er geen kanalen zijn verbonden, worden meldingen in de wachtrij geplaatst. Ze worden bezorgd wanneer:

- De gebruiker een nieuwe sessie start.
- Een kanaal opnieuw verbindt.
- De gebruiker expliciet uitstaande meldingen opvraagt.

Uitstaande meldingen kunnen worden opgehaald met `getPending()` en bevestigd met `acknowledge()`.

## Deduplicatie

De NotificationService voorkomt dat dubbele meldingen de gebruiker bereiken. Als dezelfde meldingsinhoud meerdere keren binnen een venster wordt bezorgd, gaat alleen de eerste bezorging door.

## Configuratie

Configureer meldingsgedrag in `triggerfish.yaml`:

```yaml
notifications:
  preferred_channel: telegram # Standaard bezorgkanaal
  quiet_hours: "22:00-07:00" # Normale/lage meldingen onderdrukken tijdens deze uren
  batch_interval: 15m # Lage-prioriteitsmeldingen samenvoegen
```

## Gebruiksvoorbeelden

Meldingen worden door het hele systeem gebruikt:

- **Cron-taken** melden de eigenaar wanneer een geplande taak is voltooid of mislukt.
- **Triggers** melden de eigenaar wanneer monitoring iets detecteert dat aandacht nodig heeft.
- **Webhooks** melden de eigenaar wanneer een externe gebeurtenis afloopt (GitHub PR, Sentry-waarschuwing).
- **Beleidsschendingen** melden de eigenaar wanneer een geblokkeerde actie wordt geprobeerd.
- **Kanaalstatus** meldt de eigenaar wanneer een kanaal de verbinding verbreekt of herstelt.

::: info De meldingswachtrij wordt bewaard via `StorageProvider` (naamruimte: `notifications:`) met een standaardbewaring van 7 dagen na bezorging. Niet-bezorgde meldingen worden bewaard totdat ze worden bevestigd. :::
