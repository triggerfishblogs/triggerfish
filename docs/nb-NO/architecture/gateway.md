# Gateway

Gateway er Triggerfish sitt sentrale kontrollplan — en langkjørende lokal tjeneste som koordinerer sesjoner, kanaler, verktøy, hendelser og agentprosesser gjennom ett enkelt WebSocket-endepunkt. Alt som skjer i Triggerfish flyter gjennom Gateway.

## Arkitektur

<img src="/diagrams/gateway-architecture.svg" alt="Gateway-arkitektur: kanaler på venstre side kobler til via den sentrale Gateway til tjenester på høyre side" style="max-width: 100%;" />

Gateway lytter på en konfigurerbar port (standard `18789`) og aksepterer tilkoblinger fra kanaladaptere, CLI-kommandoer, følgeapper og interne tjenester. All kommunikasjon bruker JSON-RPC over WebSocket.

## Gateway-tjenester

Gateway tilbyr disse tjenestene gjennom WebSocket- og HTTP-endepunktene:

| Tjeneste          | Beskrivelse                                                                          | Sikkerhetsintegrasjon                       |
| ----------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| **Sesjoner**      | Opprett, list, hent historikk, send mellom sesjoner, spawn bakgrunnsoppgaver         | Session taint spores per sesjon             |
| **Kanaler**       | Rute meldinger, administrer tilkoblinger, prøv mislykkede leveringer på nytt         | Klassifiseringssjekker på alle utdata       |
| **Cron**          | Planlegg gjentakende oppgaver og trigger oppvåkninger fra `TRIGGER.md`               | Cron-handlinger går gjennom policy-hooks    |
| **Webhooks**      | Aksepter innkommende hendelser fra eksterne tjenester via `POST /webhooks/:sourceId` | Innkommende data klassifiseres ved inntak   |
| **Ripple**        | Spor onlinestatus og skriveindikator på tvers av kanaler                             | Ingen sensitive data eksponert              |
| **Config**        | Varm-reload av innstillinger uten omstart                                            | Kun admin i bedrift                         |
| **Kontroll-UI**   | Webdashbord for gateway-helse og -administrasjon                                    | Token-autentisert                           |
| **Tide Pool**     | Vert for agent-drevet A2UI visuelt arbeidsområde                                    | Innhold underlagt utdata-hooks              |
| **Varsler**       | Leveranse av varsler på tvers av kanaler med prioritetsruting                        | Klassifiseringsregler gjelder               |

## WebSocket JSON-RPC-protokoll

Klienter kobler til Gateway over WebSocket og utveksler JSON-RPC 2.0-meldinger. Hver melding er et metodekall med typede parametere og et typet svar.

```typescript
// Klient sender:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway svarer:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

Gateway betjener også HTTP-endepunkter for webhook-inntak. Når en `SchedulerService` er tilkoblet, er `POST /webhooks/:sourceId`-ruter tilgjengelige for innkommende webhook-hendelser.

## Servergrensesnitt

```typescript
interface GatewayServerOptions {
  /** Port å lytte på. Bruk 0 for en tilfeldig ledig port. */
  readonly port?: number;
  /** Autentiseringstoken for tilkoblinger. */
  readonly authToken?: string;
  /** Valgfri planleggertjeneste for webhook-endepunkter. */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** Start serveren. Returnerer den bundne adressen. */
  start(): Promise<GatewayAddr>;
  /** Stopp serveren elegant. */
  stop(): Promise<void>;
}
```

## Autentisering

Gateway-tilkoblinger autentiseres med et token. Tokenet genereres under oppsett (`triggerfish dive`) og lagres lokalt.

::: warning SIKKERHET Gateway binder til `127.0.0.1` som standard og eksponeres ikke til nettverket. Fjerntilgang krever eksplisitt tunnelkonfigurasjon. Eksponér aldri Gateway WebSocket til det offentlige internett uten autentisering. :::

## Sesjonsadministrasjon

Gateway administrerer hele sesjoners livssyklus. Sesjoner er den grunnleggende enheten av samtaletilstand, hver med uavhengig taint-sporing.

### Sesjonstyper

| Type       | Nøkkelmønster                | Beskrivelse                                                                   |
| ---------- | ---------------------------- | ----------------------------------------------------------------------------- |
| Hoved      | `main`                       | Primær direkte samtale med eieren. Vedvarer over omstarter.                   |
| Kanal      | `channel:<type>:<id>`        | Én per tilkoblet kanal. Isolert taint per kanal.                              |
| Bakgrunn   | `bg:<task_id>`               | Spawnet for cron-jobber og webhook-utløste oppgaver. Starter ved `PUBLIC` taint. |
| Agent      | `agent:<agent_id>`           | Per-agent sesjoner for multi-agent-ruting.                                    |
| Gruppe     | `group:<channel>:<group_id>` | Gruppechat-sesjoner.                                                          |

### Sesjonsverktøy

Agenten samhandler med sesjoner gjennom disse verktøyene, alle rutet gjennom Gateway:

| Verktøy            | Beskrivelse                                | Taint-implikasjoner                        |
| ------------------ | ------------------------------------------ | ------------------------------------------ |
| `sessions_list`    | List aktive sesjoner med valgfrie filtre   | Ingen taint-endring                        |
| `sessions_history` | Hent utskrift for en sesjon                | Taint arver fra referert sesjon            |
| `sessions_send`    | Send melding til en annen sesjon           | Underlagt write-down-sjekk                 |
| `sessions_spawn`   | Opprett bakgrunnsoppgavesesjon             | Ny sesjon starter ved `PUBLIC` taint       |
| `session_status`   | Sjekk gjeldende sesjonsstatus, modell, kostnad | Ingen taint-endring                    |

::: info Intersesjonkommunikasjon via `sessions_send` er underlagt de samme write-down-reglene som andre utdata. En `CONFIDENTIAL`-sesjon kan ikke sende data til en sesjon koblet til en `PUBLIC`-kanal. :::

## Kanalruting

Gateway ruter meldinger mellom kanaler og sesjoner gjennom kanalruteren. Ruteren håndterer:

- **Klassifiseringsport**: Hver utgående melding passerer gjennom `PRE_OUTPUT` før levering
- **Prøv på nytt med backoff**: Mislykkede leveringer prøves på nytt med eksponensiell backoff via `sendWithRetry()`
- **Meldingsdeling**: Store meldinger deles inn i plattformpassende deler (f.eks. Telegrams 4096-tegngrense)
- **Strømming**: Svar strømmer til kanaler som støtter det
- **Tilkoblingsadministrasjon**: `connectAll()` og `disconnectAll()` for livssyklusstyring

## Varslingstjeneste

Gateway integrerer en førsteklasses varslingstjeneste som erstatter ad-hoc "varsle eier"-mønstre på tvers av plattformen. Alle varsler flyter gjennom én enkelt `NotificationService`.

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### Prioritetsruting

| Prioritet  | Atferd                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| `CRITICAL` | Omgå stille timer, lever til ALLE tilkoblede kanaler umiddelbart             |
| `HIGH`     | Lever til foretrukket kanal umiddelbart, sett i kø hvis frakoblet            |
| `NORMAL`   | Lever til aktiv sesjon, eller sett i kø for neste sesjonstart                |
| `LOW`      | Sett i kø, lever i grupper under aktive sesjoner                             |

### Varslingskilder

| Kilde                       | Kategori   | Standard prioritet |
| --------------------------- | ---------- | ------------------ |
| Policy-brudd                | `security` | `CRITICAL`         |
| Trusselintelligensadvarsler | `security` | `CRITICAL`         |
| Skill-godkjenningsforespørsler | `approval` | `HIGH`           |
| Cron-jobbfeil               | `system`   | `HIGH`             |
| Systemhelse-advarsler       | `system`   | `HIGH`             |
| Webhook-hendelsesutløsere   | `info`     | `NORMAL`           |
| The Reef oppdateringer       | `info`     | `LOW`              |

Varsler vedvares via `StorageProvider` (navnerom: `notifications:`) og overlever omstarter. Uleverte varsler prøves på nytt ved neste Gateway-oppstart eller sesjonstilkobling.

### Leveringspreferanser

Brukere konfigurerer varslingsinnstillinger per kanal:

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "Europe/Oslo"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## Planleggerintegrasjon

Gateway er vert for planleggertjenesten, som administrerer:

- **Cron-tikksløyfe**: Periodisk evaluering av planlagte oppgaver
- **Trigger-oppvåkninger**: Agent-oppvåkninger definert i `TRIGGER.md`
- **Webhook HTTP-endepunkter**: `POST /webhooks/:sourceId` for innkommende hendelser
- **Orkestratorsisolasjon**: Hver planlagt oppgave kjører i sin egen `OrchestratorFactory` med isolert sesjonsstilstand

::: tip Cron-utløste og webhook-utløste oppgaver spawner bakgrunnssesjoner med frisk `PUBLIC` taint. De arver ikke taint fra noen eksisterende sesjon, noe som sikrer at autonome oppgaver starter med en ren klassifiseringstilstand. :::

## Helse og diagnostikk

Kommandoen `triggerfish patrol` kobler til Gateway og kjører diagnostiske helsesjekker, og verifiserer:

- Gateway kjører og svarer
- Alle konfigurerte kanaler er tilkoblet
- Lagring er tilgjengelig
- Planlagte oppgaver kjører til rett tid
- Ingen uleverte kritiske varsler sitter fast i køen
