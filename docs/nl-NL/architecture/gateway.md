# Gateway

De Gateway is het centrale controlevlak van Triggerfish — een langlopende lokale service die sessies, kanalen, tools, evenementen en agentprocessen coördineert via één enkel WebSocket-eindpunt. Alles wat er in Triggerfish gebeurt, stroomt via de Gateway.

## Architectuur

<img src="/diagrams/gateway-architecture.svg" alt="Gateway-architectuur: kanalen aan de linkerkant verbinden via de centrale Gateway met services aan de rechterkant" style="max-width: 100%;" />

De Gateway luistert op een configureerbare poort (standaard `18789`) en accepteert verbindingen van kanaaladapters, CLI-opdrachten, companion-apps en interne services. Alle communicatie gebruikt JSON-RPC via WebSocket.

## Gateway-services

De Gateway biedt deze services via zijn WebSocket- en HTTP-eindpunten:

| Service           | Beschrijving                                                                          | Beveiligingsintegratie                    |
| ----------------- | ------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Sessies**       | Aanmaken, weergeven, geschiedenis ophalen, tussen sessies sturen, achtergrondtaken starten | Sessie-taint per sessie bijgehouden  |
| **Kanalen**       | Berichten routeren, verbindingen beheren, mislukte bezorgingen opnieuw proberen, grote berichten opsplitsen | Classificatiecontroles op alle uitvoer |
| **Cron**          | Terugkerende taken plannen en trigger-activeringen vanuit `TRIGGER.md`                | Cron-acties gaan via beleidshooks         |
| **Webhooks**      | Inkomende evenementen van externe services accepteren via `POST /webhooks/:sourceId`  | Inkomende gegevens geclassificeerd bij opname |
| **Ripple**        | Online status en typindicatoren bijhouden over kanalen                                | Geen gevoelige gegevens blootgesteld      |
| **Configuratie**  | Instellingen herladen zonder herstart                                                 | Alleen beheerder in enterprise            |
| **Beheer-UI**     | Webdashboard voor gateway-gezondheid en beheer                                        | Token-geverifieerd                        |
| **Tide Pool**     | Door agent aangestuurde A2UI-visuele werkruimte hosten                                | Inhoud onderworpen aan uitvoerhooks       |
| **Meldingen**     | Cross-kanaal meldingsbezorging met prioriteitsroutering                               | Classificatieregels van toepassing        |

## WebSocket JSON-RPC-protocol

Clients verbinden met de Gateway via WebSocket en wisselen JSON-RPC 2.0-berichten uit. Elk bericht is een methodeaanroep met getypte parameters en een getypt antwoord.

```typescript
// Client stuurt:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway antwoordt:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

De Gateway bedient ook HTTP-eindpunten voor webhook-opname. Wanneer een `SchedulerService` is gekoppeld, zijn `POST /webhooks/:sourceId`-routes beschikbaar voor inkomende webhook-evenementen.

## Server-interface

```typescript
interface GatewayServerOptions {
  /** Poort om op te luisteren. Gebruik 0 voor een willekeurige beschikbare poort. */
  readonly port?: number;
  /** Authenticatietoken voor verbindingen. */
  readonly authToken?: string;
  /** Optionele plannerservice voor webhook-eindpunten. */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** Start de server. Retourneert het gebonden adres. */
  start(): Promise<GatewayAddr>;
  /** Stop de server netjes. */
  stop(): Promise<void>;
}
```

## Authenticatie

Gateway-verbindingen worden geverifieerd met een token. Het token wordt gegenereerd tijdens de installatie (`triggerfish dive`) en lokaal opgeslagen.

::: warning BEVEILIGING De Gateway bindt standaard aan `127.0.0.1` en is niet blootgesteld aan het netwerk. Externe toegang vereist expliciete tunnelconfiguratie. Stel de Gateway WebSocket nooit bloot aan het openbare internet zonder authenticatie. :::

## Sessiebeheer

De Gateway beheert de volledige levenscyclus van sessies. Sessies zijn de fundamentele eenheid van gespreksstatus, elk met onafhankelijke taint-tracking.

### Sessietypen

| Type        | Sleutelpatroon               | Beschrijving                                                                   |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------ |
| Hoofd       | `main`                       | Primair direct gesprek met de eigenaar. Blijft bestaan bij herstarts.          |
| Kanaal      | `channel:<type>:<id>`        | Eén per verbonden kanaal. Geïsoleerde taint per kanaal.                       |
| Achtergrond | `bg:<task_id>`               | Gestart voor cron-jobs en webhook-getriggerde taken. Start op `PUBLIC`-taint. |
| Agent       | `agent:<agent_id>`           | Per-agent-sessies voor multi-agent-routering.                                  |
| Groep       | `group:<channel>:<group_id>` | Groepsgespreksssessies.                                                        |

### Sessietools

De agent interageert met sessies via deze tools, allemaal gerouteerd via de Gateway:

| Tool               | Beschrijving                                         | Taint-implicaties                              |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------- |
| `sessions_list`    | Actieve sessies weergeven met optionele filters      | Geen taint-wijziging                           |
| `sessions_history` | Transcript voor een sessie ophalen                   | Taint erft van de gerefereerde sessie          |
| `sessions_send`    | Bericht naar een andere sessie sturen                | Onderworpen aan write-down-controle            |
| `sessions_spawn`   | Achtergrondtaaksessie aanmaken                       | Nieuwe sessie start op `PUBLIC`-taint          |
| `session_status`   | Huidige sessiestatus, model, kosten controleren      | Geen taint-wijziging                           |

::: info Inter-sessiecommunicatie via `sessions_send` is onderworpen aan dezelfde no-write-down-regels als elke andere uitvoer. Een `CONFIDENTIAL`-sessie kan geen gegevens sturen naar een sessie verbonden met een `PUBLIC`-kanaal. :::

## Kanaalroutering

De Gateway routeert berichten tussen kanalen en sessies via de kanaalrouter. De router verwerkt:

- **Classificatiepoort**: Elk uitgaand bericht gaat via `PRE_OUTPUT` voor bezorging
- **Herproberen met backoff**: Mislukte bezorgingen worden opnieuw geprobeerd met exponentiële backoff via `sendWithRetry()`
- **Bericht opsplitsen**: Grote berichten worden opgesplitst in platformgeschikte stukken (bijv. Telegram's limiet van 4096 tekens)
- **Streaming**: Antwoorden streamen naar kanalen die dit ondersteunen
- **Verbindingsbeheer**: `connectAll()` en `disconnectAll()` voor levenscyclusbeheer

## Meldingsservice

De Gateway integreert een eersteklas meldingsservice die ad-hoc "notificeer eigenaar"-patronen in het platform vervangt. Alle meldingen stromen via één `NotificationService`.

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### Prioriteitsroutering

| Prioriteit | Gedrag                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| `CRITICAL` | Stille uren omzeilen, onmiddellijk bezorgen aan ALLE verbonden kanalen   |
| `HIGH`     | Onmiddellijk bezorgen aan voorkeurkanaal, wachtrij als offline           |
| `NORMAL`   | Bezorgen aan actieve sessie, of wachtrij voor volgende sessiestart       |
| `LOW`      | Wachtrij, bezorgen in batches tijdens actieve sessies                    |

### Meldingsbronnen

| Bron                         | Categorie   | Standaardprioriteit |
| ---------------------------- | ----------- | ------------------- |
| Beleidsovertredingen         | `security`  | `CRITICAL`          |
| Threat intelligence-waarschuwingen | `security` | `CRITICAL`        |
| Skill-goedkeuringsverzoeken  | `approval`  | `HIGH`              |
| Cron-jobfouten               | `system`    | `HIGH`              |
| Systeemgezondheidswarschuwingen | `system`  | `HIGH`              |
| Webhook-evenementtriggers    | `info`      | `NORMAL`            |
| Reef-updates beschikbaar     | `info`      | `LOW`               |

Meldingen worden bewaard via `StorageProvider` (naamruimte: `notifications:`) en overleven herstarts. Niet-bezorgde meldingen worden opnieuw geprobeerd bij de volgende Gateway-start of sessieverbinding.

### Bezorgingsvoorkeuren

Gebruikers configureren meldingsvoorkeuren per kanaal:

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "Europe/Amsterdam"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## Plannerintegratie

De Gateway host de plannerservice, die beheert:

- **Cron-ticklus**: Periodieke evaluatie van geplande taken
- **Trigger-activeringen**: Agentactiviteringen gedefinieerd in `TRIGGER.md`
- **Webhook HTTP-eindpunten**: `POST /webhooks/:sourceId` voor inkomende evenementen
- **Orchestratorisolatie**: Elke geplande taak draait in zijn eigen `OrchestratorFactory` met geïsoleerde sessiestatus

::: tip Cron-getriggerde en webhook-getriggerde taken starten achtergrondssessies met frisse `PUBLIC`-taint. Ze erven de taint niet van enige bestaande sessie, zodat autonome taken beginnen met een schone classificatiestatus. :::

## Gezondheid en diagnostiek

De opdracht `triggerfish patrol` verbindt met de Gateway en voert diagnostische gezondheidscontroles uit, waarbij het verifieert:

- Gateway is actief en reageert
- Alle geconfigureerde kanalen zijn verbonden
- Opslag is toegankelijk
- Geplande taken worden op tijd uitgevoerd
- Geen niet-bezorgde kritieke meldingen vast zitten in de wachtrij
