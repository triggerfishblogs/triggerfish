# MCP Gateway

> Använd valfri MCP-server. Vi säkrar gränsen.

Model Context Protocol (MCP) är den framväxande standarden för agent-till-verktyg-kommunikation. Triggerfish tillhandahåller en säker MCP Gateway som låter dig ansluta till valfri MCP-kompatibel server medan du tillämpar klassificeringskontroller, verktygnivåbehörigheter, taint-spårning och fullständig revisionsloggning.

Du tar med MCP-servrarna. Triggerfish säkrar varje begäran och svar som passerar gränsen.

## Hur det fungerar

MCP Gateway sitter mellan din agent och alla MCP-servrar. Varje verktygsanrop passerar genom policytillämpningsnivån innan den når den externa servern, och varje svar klassificeras innan det träder in i agentkontexten.

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway-flöde: Agent → MCP Gateway → Policynivå → MCP-server, med nekat väg till BLOCKED" style="max-width: 100%;" />

Gateway:en tillhandahåller fem kärnfunktioner:

1. **Serverautentisering och klassificering** — MCP-servrar måste granskas och klassificeras innan de används
2. **Verktygnivåbehörighetstillämpning** — Individuella verktyg kan tillåtas, begränsas eller blockeras
3. **Begäran/svar-taint-spårning** — Sessions-taint eskalerar baserat på serverklassificering
4. **Schemavalidering** — Alla begäranden och svar valideras mot deklarerade scheman
5. **Revisionsloggning** — Varje verktygsanrop, beslut och taint-ändring registreras

## MCP-servertillstånd

Alla MCP-servrar är standard `UNTRUSTED`. De måste explicit klassificeras innan agenten kan anropa dem.

| Tillstånd    | Beskrivning                                                        | Agent kan anropa? |
| ------------ | ------------------------------------------------------------------ | :---------------: |
| `UNTRUSTED`  | Standard för nya servrar. Väntar på granskning.                    |       Nej         |
| `CLASSIFIED` | Granskad och tilldelad en klassificeringsnivå med per-verktygsbehörigheter. | Ja (inom policy) |
| `BLOCKED`    | Explicit förbjudet av administratören.                             |       Nej         |

<img src="/diagrams/state-machine.svg" alt="MCP-server tillståndsmaskine: UNTRUSTED → CLASSIFIED eller BLOCKED" style="max-width: 100%;" />

::: warning SÄKERHET En `UNTRUSTED` MCP-server kan inte anropas av agenten under några omständigheter. LLM:en kan inte begära, övertala eller lura systemet att använda en oklassificerad server. Klassificering är en kodgrind, inte ett LLM-beslut. :::

## Konfiguration

MCP-servrar konfigureras i `triggerfish.yaml` som en karta med server-ID som nyckel. Varje server använder antingen en lokal underprocess (stdio-transport) eller en fjärrslutpunkt (SSE-transport).

### Lokala servrar (Stdio)

Lokala servrar skapas som underprocesser. Triggerfish kommunicerar med dem via stdin/stdout.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/dig/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### Fjärrservrar (SSE)

Fjärrservrar körs på annan plats och nås via HTTP Server-Sent Events.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Konfigurationsnycklar

| Nyckel           | Typ      | Obligatorisk   | Beskrivning                                                                     |
| ---------------- | -------- | -------------- | ------------------------------------------------------------------------------- |
| `command`        | string   | Ja (stdio)     | Binärt att skapa (t.ex. `npx`, `deno`, `node`)                                  |
| `args`           | string[] | Nej            | Argument som skickas till kommandot                                              |
| `env`            | map      | Nej            | Miljövariabler för underprocessen                                               |
| `url`            | string   | Ja (SSE)       | HTTP-endpoint för fjärrservrar                                                  |
| `classification` | string   | **Ja**         | Datasensitivitetsnivå: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` eller `RESTRICTED`  |
| `enabled`        | boolean  | Nej            | Standard: `true`. Ange `false` för att hoppa över utan att ta bort konfigurationen. |

Varje server måste ha antingen `command` (lokal) eller `url` (fjärr). Servrar utan någon av dem hoppas över.

### Lat anslutning

MCP-servrar ansluter i bakgrunden efter uppstart. Du behöver inte vänta på att alla servrar är redo innan du använder din agent.

- Servrar försöker igen med exponentiell backoff: 2s → 4s → 8s → 30s max
- Nya servrar blir tillgängliga för agenten när de ansluter — ingen sessionsomstart behövs
- Om en server misslyckas med att ansluta efter alla försök går den in i tillståndet `failed` och kan försökas igen vid nästa daemon-omstart

CLI och Tidepool-gränssnitten visar MCP-anslutningsstatus i realtid. Se [CLI-kanalen](/sv-SE/channels/cli#mcp-server-status) för detaljer.

### Inaktivera en server

För att tillfälligt inaktivera en MCP-server utan att ta bort konfigurationen:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Hoppas över under uppstart
```

### Miljövariabler och hemligheter

Env-värden som börjar med `keychain:` löses upp från OS-nyckelringen vid uppstart:

```yaml
env:
  API_KEY: "keychain:mitt-hemliga-namn" # Löses upp från OS-nyckelringen
  PLAIN_VAR: "literalt-värde" # Skickas som det är
```

Bara `PATH` ärvs från värdmiljön (så `npx`, `node`, `deno` etc. löses korrekt). Inga andra värdmiljövariabler läcker in i MCP-server-underprocesser.

::: tip Lagra hemligheter med `triggerfish config set-secret <namn> <värde>`. Referera sedan till dem som `keychain:<namn>` i din MCP-servers env-konfiguration. :::

### Verktygnamngivning

Verktyg från MCP-servrar namnges `mcp_<serverId>_<toolName>` för att undvika kollision med inbyggda verktyg. Till exempel, om en server med namnet `github` exponerar ett verktyg som heter `list_repos` ser agenten det som `mcp_github_list_repos`.

### Klassificering och standardnekande

Om du utelämnar `classification` registreras servern som **UNTRUSTED** och gateway:en avvisar alla verktygsanrop. Du måste explicit välja en klassificeringsnivå. Se [Klassificeringsguiden](/sv-SE/guide/classification-guide) för hjälp att välja rätt nivå.

## Verktygsanropsflöde

När agenten begär ett MCP-verktygsanrop kör gateway:en en deterministisk sekvens av kontroller innan begäran vidarebefordras.

### 1. Förkontroller

Alla kontroller är deterministiska — inga LLM-anrop, ingen slumpmässighet.

| Kontroll                                                      | Felresultat                               |
| ------------------------------------------------------------- | ----------------------------------------- |
| Serverstatusen är `CLASSIFIED`?                               | Block: "Server inte godkänd"              |
| Verktyget är tillåtet för den här servern?                    | Block: "Verktyg inte tillåtet"            |
| Användaren har nödvändiga behörigheter?                       | Block: "Behörighet nekas"                 |
| Sessions-taint kompatibel med serverklassificering?           | Block: "Skulle bryta mot nedskrivning"    |
| Schemavalidering passerar?                                    | Block: "Ogiltiga parametrar"              |

::: info Om sessions-tainten är högre än serverklassificeringen blockeras anropet för att förhindra nedskrivning. En session märkt som `CONFIDENTIAL` kan inte skicka data till en `PUBLIC` MCP-server. :::

### 2. Köra

Om alla förkontroller passerar vidarebefordrar gateway:en begäran till MCP-servern.

### 3. Svarsbearbetning

När MCP-servern returnerar ett svar:

- Validera svaret mot det deklarerade schemat
- Klassificera svarsdata på serverns klassificeringsnivå
- Uppdatera sessions-taint: `taint = max(current_taint, server_classification)`
- Skapa en härledningspost som spårar datans ursprung

### 4. Revision

Varje verktygsanrop loggas med: serveridentitet, verktygsnamn, användaridentitet, policybeslut, taint-ändring och tidsstämpel.

## Svars-taint-regler

MCP-serversvar ärver serverns klassificeringsnivå. Sessions-taint kan bara eskalera.

| Serverklassificering | Svarstaint      | Sessionseffekt                                  |
| -------------------- | --------------- | ----------------------------------------------- |
| `PUBLIC`             | `PUBLIC`        | Ingen taint-ändring                             |
| `INTERNAL`           | `INTERNAL`      | Taint eskalerar till minst `INTERNAL`           |
| `CONFIDENTIAL`       | `CONFIDENTIAL`  | Taint eskalerar till minst `CONFIDENTIAL`       |
| `RESTRICTED`         | `RESTRICTED`    | Taint eskalerar till `RESTRICTED`               |

När en session en gång märkts på en given nivå stannar den på den nivån eller högre för resten av sessionen. En fullständig sessionsåterställning (som rensar konversationshistoriken) krävs för att minska tainten.

## Användarautentiseringspass

För MCP-servrar som stöder autentisering på användarnivå passerar gateway:en igenom användarens delegerade uppgifter snarare än systemuppgifter.

När ett verktyg är konfigurerat med `requires_user_auth: true`:

1. Gateway:en kontrollerar om användaren har anslutit den här MCP-servern
2. Hämtar användarens delegerade uppgift från det säkra uppgiftslagret
3. Lägger till användarautentisering i MCP-begäranshuvuden
4. MCP-servern tillämpar behörigheter på användarnivå

Resultatet: MCP-servern ser **användarens identitet**, inte en systemidentitet. Behörighetsarv fungerar genom MCP-gränsen — agenten kan bara komma åt det användaren kan komma åt.

::: tip Användarautentiseringspass är det föredragna mönstret för alla MCP-servrar som hanterar åtkomstkontroll. Det innebär att agenten ärver användarens behörigheter snarare än att ha bred systemåtkomst. :::

## Schemavalidering

Gateway:en validerar alla MCP-begäranden och svar mot deklarerade scheman innan vidarebefordran:

```typescript
// Begäransvalidering (förenklad)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Okänt verktyg"));
  }

  // Validera params mot JSON-schema
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Ogiltiga parametrar"));
  }

  // Kontrollera injiceringsmönster i strängparametrar
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potentiell injektion identifierad"));
    }
  }

  return ok(undefined);
}
```

Schemavalidering fångar felaktiga begäranden innan de når den externa servern och flaggar potentiella injiceringsmönster i strängparametrar.

## Företagskontroller

Företagsdistributioner har ytterligare kontroller för MCP-serverhantering:

- **Administratörshanterat serverregister** — Bara administratörsgodkända MCP-servrar kan klassificeras
- **Per-avdelnings verktygsbehörigheter** — Olika team kan ha olika verktygstillgång
- **Efterlevnadsloggning** — Alla MCP-interaktioner tillgängliga i efterlevnadsinstrumentpaneler
- **Hastighetsbegränsning** — Per-server och per-verktygshastighetsgränser
- **Serverhälsoövervakning** — Gateway:en spårar servertillgänglighet och svarstider
