# Gateway

Gateway är Triggerfish centrala kontrollplan — en långvarig lokal tjänst som koordinerar sessioner, kanaler, verktyg, händelser och agentprocesser via en enda WebSocket-endpoint. Allt som händer i Triggerfish flödar genom Gateway.

## Arkitektur

<img src="/diagrams/gateway-architecture.svg" alt="Gateway-arkitektur: kanaler till vänster ansluter via den centrala Gateway till tjänster till höger" style="max-width: 100%;" />

Gateway lyssnar på en konfigurerbar port (standard `18789`) och tar emot anslutningar från kanaladaptrar, CLI-kommandon, följeslagarappar och interna tjänster. All kommunikation använder JSON-RPC över WebSocket.

## Gateway-tjänster

Gateway tillhandahåller dessa tjänster via sina WebSocket- och HTTP-endpoints:

| Tjänst           | Beskrivning                                                                            | Säkerhetsintegration                         |
| ---------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Sessioner**    | Skapa, lista, hämta historik, skicka mellan sessioner, skapa bakgrundsuppgifter        | Session-taint spåras per session             |
| **Kanaler**      | Dirigera meddelanden, hantera anslutningar, försöka misslyckade leveranser, chunka stora meddelanden | Klassificeringskontroller på all utdata |
| **Cron**         | Schemalägg återkommande uppgifter och triggeruppvaknanden från `TRIGGER.md`            | Cron-åtgärder passerar policy-hooks          |
| **Webhooks**     | Ta emot inkommande händelser från externa tjänster via `POST /webhooks/:sourceId`      | Inkommande data klassificeras vid intagning  |
| **Ripple**       | Spåra onlinestatus och skrivindikatorers över kanaler                                  | Inga känsliga data exponeras                 |
| **Config**       | Ladda om inställningar utan omstart                                                    | Bara admin i företagsmiljö                  |
| **Kontroll-UI**  | Webbkontrollpanel för gateway-hälsa och hantering                                      | Token-autentiserad                           |
| **Tide Pool**    | Värd för agentdriven A2UI visuell arbetsyta                                            | Innehåll föremål för output-hooks            |
| **Notifieringar** | Tvärkanalsleverans av notifieringar med prioritetsroutning                            | Klassificeringsregler gäller                 |

## WebSocket JSON-RPC-protokoll

Klienter ansluter till Gateway via WebSocket och utbyter JSON-RPC 2.0-meddelanden. Varje meddelande är ett metodanrop med typade parametrar och ett typat svar.

```typescript
// Klienten skickar:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway svarar:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

Gateway betjänar också HTTP-endpoints för webhook-intagning. När en `SchedulerService` är kopplad finns `POST /webhooks/:sourceId`-rutter tillgängliga för inkommande webhook-händelser.

## Servergränssnitt

```typescript
interface GatewayServerOptions {
  /** Port att lyssna på. Använd 0 för en slumpmässig tillgänglig port. */
  readonly port?: number;
  /** Autentiseringstoken för anslutningar. */
  readonly authToken?: string;
  /** Valfri schemaläggartjänst för webhook-endpoints. */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** Starta servern. Returnerar den bundna adressen. */
  start(): Promise<GatewayAddr>;
  /** Stoppa servern på ett kontrollerat sätt. */
  stop(): Promise<void>;
}
```

## Autentisering

Gateway-anslutningar autentiseras med en token. Tokenen genereras under installationen (`triggerfish dive`) och lagras lokalt.

::: warning SÄKERHET Gateway binder till `127.0.0.1` som standard och exponeras inte i nätverket. Fjärråtkomst kräver explicit tunnelkonfiguration. Exponera aldrig Gateway WebSocket på det öppna internet utan autentisering. :::

## Sessionshantering

Gateway hanterar hela livscykeln för sessioner. Sessioner är den grundläggande enheten för konversationstillstånd, var och en med oberoende taint-spårning.

### Sessionstyper

| Typ          | Nyckelmönster                | Beskrivning                                                                           |
| ------------ | ---------------------------- | ------------------------------------------------------------------------------------- |
| Main         | `main`                       | Primär direkt konversation med ägaren. Bevaras vid omstarter.                        |
| Kanal        | `channel:<typ>:<id>`         | En per ansluten kanal. Isolerad taint per kanal.                                     |
| Bakgrund     | `bg:<uppgift-id>`            | Skapad för cron-jobb och webhook-utlösta uppgifter. Startar med `PUBLIC` taint.      |
| Agent        | `agent:<agent-id>`           | Per-agentsessioner för multi-agent-routning.                                         |
| Grupp        | `group:<kanal>:<grupp-id>`   | Gruppchatt-sessioner.                                                                |

### Sessionsverktyg

Agenten interagerar med sessioner via dessa verktyg, alla routade via Gateway:

| Verktyg            | Beskrivning                                        | Taint-implikationer                      |
| ------------------ | -------------------------------------------------- | ---------------------------------------- |
| `sessions_list`    | Lista aktiva sessioner med valfria filter          | Ingen taint-ändring                      |
| `sessions_history` | Hämta utskrift för en session                      | Taint ärvs från refererad session        |
| `sessions_send`    | Skicka meddelande till en annan session            | Föremål för nedskrivningskontroll        |
| `sessions_spawn`   | Skapa bakgrundsuppgiftssession                     | Ny session startar med `PUBLIC` taint    |
| `session_status`   | Kontrollera aktuellt sessionstillstånd, modell, kostnad | Ingen taint-ändring                 |

::: info Inter-sessionskommunikation via `sessions_send` är föremål för samma nedskrivningsregler som all annan utdata. En `CONFIDENTIAL`-session kan inte skicka data till en session ansluten till en `PUBLIC`-kanal. :::

## Kanalroutning

Gateway dirigerar meddelanden mellan kanaler och sessioner via kanalroutern. Routern hanterar:

- **Klassificeringskontroll**: Varje utgående meddelande passerar `PRE_OUTPUT` innan leverans
- **Återförsök med backoff**: Misslyckade leveranser återförsöks med exponentiell backoff via `sendWithRetry()`
- **Meddelandechunkning**: Stora meddelanden delas upp i plattformsanpassade bitar (t.ex. Telegrams 4096-teckengräns)
- **Strömning**: Svar strömmar till kanaler som stöder det
- **Anslutningshantering**: `connectAll()` och `disconnectAll()` för livscykelhantering

## Notifieringstjänst

Gateway integrerar en förstklassig notifieringstjänst som ersätter ad-hoc "notifiera ägaren"-mönster i hela plattformen. Alla notifieringar flödar via en enda `NotificationService`.

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### Prioritetsroutning

| Prioritet  | Beteende                                                               |
| ---------- | ---------------------------------------------------------------------- |
| `CRITICAL` | Förbigå tysta timmar, leverera till ALLA anslutna kanaler omedelbart   |
| `HIGH`     | Leverera till föredragen kanal omedelbart, köa om offline              |
| `NORMAL`   | Leverera till aktiv session, eller köa för nästa sessionsstart         |
| `LOW`      | Köa, leverera i omgångar under aktiva sessioner                        |

### Notifieringskällor

| Källa                      | Kategori   | Standardprioritet |
| -------------------------- | ---------- | ----------------- |
| Policyöverträdelser        | `security` | `CRITICAL`        |
| Hotintelligensvarningar    | `security` | `CRITICAL`        |
| Skill-godkännandeförfrågningar | `approval` | `HIGH`          |
| Cron-jobbs misslyckanden   | `system`   | `HIGH`            |
| Systemhälsovarningar       | `system`   | `HIGH`            |
| Webhook-händelseaktivering | `info`     | `NORMAL`          |
| The Reef-uppdateringar tillgängliga | `info` | `LOW`          |

Notifieringar bevaras via `StorageProvider` (namnrymd: `notifications:`) och överlever omstarter. Ej levererade notifieringar återförsöks vid nästa Gateway-start eller sessionsanslutning.

### Leveransinställningar

Användare konfigurerar notifieringsinställningar per kanal:

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "Europe/Stockholm"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## Schemaläggarintegration

Gateway är värd för schemaläggartjänsten, som hanterar:

- **Cron-tick-loop**: Periodisk utvärdering av schemalagda uppgifter
- **Triggeruppvaknanden**: Agentuppvaknanden definierade i `TRIGGER.md`
- **Webhook HTTP-endpoints**: `POST /webhooks/:sourceId` för inkommande händelser
- **Orkestratorisolering**: Varje schemalagd uppgift körs i sin egen `OrchestratorFactory` med isolerat sessionstillstånd

::: tip Cron-utlösta och webhook-utlösta uppgifter skapar bakgrundssessioner med rent `PUBLIC` taint. De ärver inte taint från någon befintlig session, vilket säkerställer att autonoma uppgifter börjar med ett rent klassificeringstillstånd. :::

## Hälsa och diagnostik

Kommandot `triggerfish patrol` ansluter till Gateway och kör diagnostiska hälsokontroller, och verifierar:

- Gateway är igång och svarar
- Alla konfigurerade kanaler är anslutna
- Lagring är tillgänglig
- Schemalagda uppgifter körs i tid
- Inga ej levererade kritiska notifieringar är fast i kön
