# MCP Gateway

> Gebruik elke MCP-server. Wij beveiligen de grens.

Het Model Context Protocol (MCP) is de opkomende standaard voor agent-naar-tool-communicatie. Triggerfish biedt een beveiligde MCP Gateway waarmee u verbinding kunt maken met elke MCP-compatibele server terwijl classificatiecontroles, tool-niveau-machtigingen, taint-tracking en volledige auditlogboekregistratie worden afgedwongen.

U levert de MCP-servers. Triggerfish beveiligt elk verzoek en elke reactie die de grens passeert.

## Hoe het werkt

De MCP Gateway bevindt zich tussen uw agent en elke MCP-server. Elke toolaanroep doorloopt de beleidshandhavingslaag voordat de externe server wordt bereikt, en elke reactie wordt geclassificeerd voordat deze de agentcontext ingaat.

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway-flow: Agent → MCP Gateway → Beleidslaag → MCP-server, met weigerpad naar BLOCKED" style="max-width: 100%;" />

De gateway biedt vijf kernfuncties:

1. **Serverauthenticatie en -classificatie** — MCP-servers moeten worden beoordeeld en geclassificeerd vóór gebruik
2. **Tool-niveau-machtigingshandhaving** — Individuele tools kunnen worden toegestaan, beperkt of geblokkeerd
3. **Verzoek/reactie-taint-tracking** — Sessietaint escaleert op basis van serverclassificatie
4. **Schema-validatie** — Alle verzoeken en reacties gevalideerd tegen gedeclareerde schema's
5. **Auditlogboekregistratie** — Elke toolaanroep, beslissing en taint-wijziging wordt vastgelegd

## MCP-serverstatussen

Alle MCP-servers beginnen standaard als `UNTRUSTED`. Ze moeten expliciet worden geclassificeerd voordat de agent ze kan aanroepen.

| Status       | Beschrijving                                                       | Agent kan aanroepen? |
| ------------ | ------------------------------------------------------------------ | :------------------: |
| `UNTRUSTED`  | Standaard voor nieuwe servers. In afwachting van beoordeling.      |         Nee          |
| `CLASSIFIED` | Beoordeeld en toegewezen aan een classificatieniveau met per-tool-machtigingen. | Ja (binnen beleid) |
| `BLOCKED`    | Expliciet verboden door beheerder.                                 |         Nee          |

<img src="/diagrams/state-machine.svg" alt="MCP-serverstatemachine: UNTRUSTED → CLASSIFIED of BLOCKED" style="max-width: 100%;" />

::: warning BEVEILIGING Een `UNTRUSTED` MCP-server kan onder geen enkele omstandigheid door de agent worden aangeroepen. De LLM kan het systeem niet verzoeken, overtuigen of misleiden om een niet-geclassificeerde server te gebruiken. Classificatie is een code-niveau-poort, geen LLM-beslissing. :::

## Configuratie

MCP-servers worden geconfigureerd in `triggerfish.yaml` als een map met server-ID als sleutel. Elke server gebruikt ofwel een lokaal subproces (stdio-transport) of een extern eindpunt (SSE-transport).

### Lokale servers (stdio)

Lokale servers worden gespawnd als subprocessen. Triggerfish communiceert met hen via stdin/stdout.

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
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### Externe servers (SSE)

Externe servers draaien elders en zijn toegankelijk via HTTP Server-Sent Events.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Configuratiesleutels

| Sleutel          | Type     | Vereist     | Beschrijving                                                                   |
| ---------------- | -------- | ----------- | ------------------------------------------------------------------------------ |
| `command`        | string   | Ja (stdio)  | Uit te voeren binair bestand (bijv. `npx`, `deno`, `node`)                     |
| `args`           | string[] | Nee         | Argumenten doorgegeven aan de opdracht                                         |
| `env`            | map      | Nee         | Omgevingsvariabelen voor het subproces                                         |
| `url`            | string   | Ja (SSE)    | HTTP-eindpunt voor externe servers                                             |
| `classification` | string   | **Ja**      | Gegevensgevoeligheidsniveau: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` of `RESTRICTED` |
| `enabled`        | boolean  | Nee         | Standaard: `true`. Stel in op `false` om over te slaan zonder configuratie te verwijderen. |

Elke server moet ofwel `command` (lokaal) of `url` (extern) hebben. Servers zonder beide worden overgeslagen.

### Luie verbinding

MCP-servers verbinden op de achtergrond na het opstarten. U hoeft niet te wachten tot alle servers klaar zijn voordat u uw agent gebruikt.

- Servers herstarten met exponentieel wachten: 2s → 4s → 8s → 30s maximum
- Nieuwe servers worden beschikbaar voor de agent zodra ze verbinding maken — geen sessieherstart nodig
- Als een server na alle pogingen geen verbinding maakt, gaat hij de `failed`-status in en kan opnieuw worden geprobeerd bij het volgende daemon-herstart

De CLI en Tidepool-interfaces tonen realtime MCP-verbindingsstatus. Zie [CLI-kanaal](/nl-NL/channels/cli#mcp-server-status) voor details.

### Een server uitschakelen

Om een MCP-server tijdelijk uit te schakelen zonder de configuratie te verwijderen:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Skipped during startup
```

### Omgevingsvariabelen en geheimen

Env-waarden met het prefix `keychain:` worden bij opstarten opgelost vanuit de OS-sleutelhanger:

```yaml
env:
  API_KEY: "keychain:my-secret-name" # Resolved from OS keychain
  PLAIN_VAR: "literal-value" # Passed as-is
```

Alleen `PATH` wordt overgeërfd van de hostomgeving (zodat `npx`, `node`, `deno`, enz. correct worden opgelost). Geen andere hostomgevingsvariabelen lekken in MCP-serversubprocessen.

::: tip Sla geheimen op met `triggerfish config set-secret <name> <value>`. Verwijs vervolgens naar ze als `keychain:<name>` in uw MCP-server env-configuratie. :::

### Tool-naamgeving

Tools van MCP-servers krijgen de naamruimte `mcp_<serverId>_<toolName>` om botsingen met ingebouwde tools te voorkomen. Als een server met de naam `github` bijvoorbeeld een tool genaamd `list_repos` beschikbaar stelt, ziet de agent deze als `mcp_github_list_repos`.

### Classificatie en standaard weigeren

Als u `classification` weglaat, wordt de server geregistreerd als **UNTRUSTED** en weigert de gateway alle toolaanroepen. U moet expliciet een classificatieniveau kiezen. Zie de [Classificatiehandleiding](/nl-NL/guide/classification-guide) voor hulp bij het kiezen van het juiste niveau.

## Tool-aanroepflow

Wanneer de agent een MCP-toolaanroep aanvraagt, voert de gateway een deterministische reeks controles uit vóór het doorsturen van het verzoek.

### 1. Voortestcontroles

Alle controles zijn deterministisch — geen LLM-aanroepen, geen willekeur.

| Controle                                                        | Resultaat bij mislukking              |
| --------------------------------------------------------------- | ------------------------------------- |
| Serverstatus is `CLASSIFIED`?                                   | Blokkeer: "Server not approved"       |
| Tool is toegestaan voor deze server?                            | Blokkeer: "Tool not permitted"        |
| Gebruiker heeft vereiste machtigingen?                          | Blokkeer: "Permission denied"         |
| Sessietaint compatibel met serverclassificatie?                 | Blokkeer: "Would violate write-down"  |
| Schema-validatie geslaagd?                                      | Blokkeer: "Invalid parameters"        |

::: info Als de sessietaint hoger is dan de serverclassificatie, wordt de aanroep geblokkeerd om write-down te voorkomen. Een sessie besmet op `CONFIDENTIAL`-niveau kan geen gegevens sturen naar een `PUBLIC` MCP-server. :::

### 2. Uitvoeren

Als alle voortestcontroles slagen, stuurt de gateway het verzoek door naar de MCP-server.

### 3. Reactieverwerking

Wanneer de MCP-server een reactie retourneert:

- Valideer de reactie aan de hand van het gedeclareerde schema
- Classificeer de reactiegegevens op het classificatieniveau van de server
- Sessietaint bijwerken: `taint = max(huidige_taint, serverclassificatie)`
- Een afkomstrecord aanmaken dat de gegevensoorsprong bijhoudt

### 4. Audit

Elke toolaanroep wordt geregistreerd met: serveridentiteit, toolnaam, gebruikersidentiteit, beleidsbeslissing, taint-wijziging en tijdstempel.

## Reactie-taint-regels

MCP-serverreacties erven het classificatieniveau van de server. Sessietaint kan alleen escaleren.

| Serverclassificatie | Reactietaint    | Sessie-impact                               |
| ------------------- | --------------- | ------------------------------------------- |
| `PUBLIC`            | `PUBLIC`        | Geen taint-wijziging                        |
| `INTERNAL`          | `INTERNAL`      | Taint escaleert naar minstens `INTERNAL`    |
| `CONFIDENTIAL`      | `CONFIDENTIAL`  | Taint escaleert naar minstens `CONFIDENTIAL` |
| `RESTRICTED`        | `RESTRICTED`    | Taint escaleert naar `RESTRICTED`           |

Zodra een sessie is besmet op een bepaald niveau, blijft het op dat niveau of hoger voor de rest van de sessie. Een volledige sessiereset (waarmee de conversatiegeschiedenis wordt gewist) is vereist om taint te verlagen.

## Doorgifte gebruikersauthenticatie

Voor MCP-servers die authenticatie op gebruikersniveau ondersteunen, geeft de gateway de gedelegeerde inloggegevens van de gebruiker door in plaats van systeeminloggegevens.

Wanneer een tool is geconfigureerd met `requires_user_auth: true`:

1. De gateway controleert of de gebruiker deze MCP-server heeft verbonden
2. Haalt de gedelegeerde inloggegevens van de gebruiker op uit het beveiligde inloggegevensopslag
3. Voegt gebruikersauthenticatie toe aan de MCP-verzoekheaders
4. De MCP-server handhaaft machtigingen op gebruikersniveau

Het resultaat: de MCP-server ziet de **identiteit van de gebruiker**, niet een systeemidentiteit. Machtigingsinheritantie werkt door de MCP-grens — de agent heeft alleen toegang tot wat de gebruiker kan bereiken.

::: tip Doorgifte gebruikersauthenticatie is het aanbevolen patroon voor elke MCP-server die toegangscontrole beheert. Dit betekent dat de agent de machtigingen van de gebruiker erft in plaats van brede systeemtoegang te hebben. :::

## Schema-validatie

De gateway valideert alle MCP-verzoeken en -reacties aan de hand van gedeclareerde schema's vóór het doorsturen:

```typescript
// Request validation (simplified)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // Validate params against JSON schema
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // Check for injection patterns in string params
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

Schema-validatie vangt misgevormde verzoeken op voordat ze de externe server bereiken en markeert potentiële injectiepatronen in stringparameters.

## Enterprise-besturingselementen

Enterprise-implementaties hebben aanvullende besturingselementen voor MCP-serverbeheer:

- **Door beheerder beheerd serverregister** — Alleen door beheerder goedgekeurde MCP-servers kunnen worden geclassificeerd
- **Toolmachtigingen per afdeling** — Verschillende teams kunnen verschillende tooltoegang hebben
- **Nalevingslogboekregistratie** — Alle MCP-interacties beschikbaar in nalevingsdashboards
- **Snelheidsbegrenzing** — Per-server en per-tool snelheidslimieten
- **Servergezondheidsmonitoring** — Gateway houdt serverbeschikbaarheid en responstijden bij
