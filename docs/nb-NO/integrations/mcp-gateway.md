# MCP Gateway

> Bruk en hvilken som helst MCP-server. Vi sikrer grensen.

Model Context Protocol (MCP) er den fremvoksende standarden for agent-til-verktøy-kommunikasjon. Triggerfish tilbyr en sikker MCP Gateway som lar deg koble til en hvilken som helst MCP-kompatibel server, og håndhever klassifiseringskontroller, verktøynivå-tillatelser, taint-sporing og full revisjonslogging.

Du bringer MCP-serverne. Triggerfish sikrer hver forespørsel og respons som krysser grensen.

## Slik fungerer det

MCP Gateway sitter mellom agenten din og en hvilken som helst MCP-server. Alle verktøykall passerer gjennom policy-håndhevelselaget før de når den eksterne serveren, og alle svar klassifiseres før de går inn i agentkonteksten.

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway-flyt: Agent → MCP Gateway → Policy-lag → MCP-server, med avvisningssti til BLOCKED" style="max-width: 100%;" />

Gatewayen tilbyr fem kjernefunksjoner:

1. **Serverautentisering og klassifisering** — MCP-servere må gjennomgås og klassifiseres før bruk
2. **Verktøynivå-tillatelseshåndhevelse** — Individuelle verktøy kan tillates, begrenses eller blokkeres
3. **Forespørsel/svar-taint-sporing** — Session taint eskalerer basert på serverkslassifisering
4. **Skjemavalidering** — Alle forespørsler og svar valideres mot deklarerte skjemaer
5. **Revisjonslogging** — Hvert verktøykall, beslutning og taint-endring registreres

## MCP-servertilstander

Alle MCP-servere er som standard `UNTRUSTED`. De må eksplisitt klassifiseres før agenten kan kalle dem.

| Tilstand     | Beskrivelse                                                             | Agent kan kalle? |
| ------------ | ----------------------------------------------------------------------- | :--------------: |
| `UNTRUSTED`  | Standard for nye servere. Venter på gjennomgang.                        |       Nei        |
| `CLASSIFIED` | Gjennomgått og tildelt et klassifiseringsnivå med per-verktøy-tillatelser. | Ja (innenfor policy) |
| `BLOCKED`    | Eksplisitt forbudt av admin.                                            |       Nei        |

<img src="/diagrams/state-machine.svg" alt="MCP-server-tilstandsmaskin: UNTRUSTED → CLASSIFIED eller BLOCKED" style="max-width: 100%;" />

::: warning SIKKERHET En `UNTRUSTED` MCP-server kan ikke kalles av agenten under noen omstendigheter. LLM-en kan ikke be om, overbevise om, eller lure systemet til å bruke en uklassifisert server. Klassifisering er en kodenivå-port, ikke en LLM-beslutning. :::

## Konfigurasjon

MCP-servere er konfigurert i `triggerfish.yaml` som et kart nøklet av server-ID. Hver server bruker enten en lokal underprosess (stdio-transport) eller et eksternt endepunkt (SSE-transport).

### Lokale servere (Stdio)

Lokale servere spawnes som underprosesser. Triggerfish kommuniserer med dem via stdin/stdout.

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
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/deg/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### Eksterne servere (SSE)

Eksterne servere kjører andre steder og aksesseres via HTTP Server-Sent Events.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Konfigurasjonstaster

| Tast             | Type     | Påkrevd         | Beskrivelse                                                                      |
| ---------------- | -------- | --------------- | -------------------------------------------------------------------------------- |
| `command`        | string   | Ja (stdio)      | Binær å spawne (f.eks. `npx`, `deno`, `node`)                                   |
| `args`           | string[] | Nei             | Argumenter gitt til kommandoen                                                   |
| `env`            | kart     | Nei             | Miljøvariabler for underprosessen                                                |
| `url`            | string   | Ja (SSE)        | HTTP-endepunkt for eksterne servere                                              |
| `classification` | string   | **Ja**          | Datasensitivitetsnivå: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` eller `RESTRICTED`  |
| `enabled`        | boolean  | Nei             | Standard: `true`. Sett til `false` for å hoppe over uten å fjerne konfigurasjon.|

Hver server må ha enten `command` (lokal) eller `url` (ekstern). Servere uten noen av disse hoppes over.

### Lat tilkobling

MCP-servere kobler til i bakgrunnen etter oppstart. Du trenger ikke vente på at alle servere er klare før du bruker agenten din.

- Servere gjenprøver med eksponensiell tilbakekobling: 2s → 4s → 8s → 30s maks
- Nye servere blir tilgjengelige for agenten etter hvert som de kobler til — ingen sesjonsomstart nødvendig
- Hvis en server ikke klarer å koble til etter alle gjenprøvinger, går den inn i `failed`-tilstanden og kan gjenprøves ved neste daemon-omstart

CLI og Tidepool-grensesnittene viser sanntids MCP-tilkoblingsstatus. Se [CLI-kanal](/nb-NO/channels/cli#mcp-server-status) for detaljer.

### Deaktivere en server

For å midlertidig deaktivere en MCP-server uten å fjerne konfigurasjonen:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Hoppes over under oppstart
```

### Miljøvariabler og hemmeligheter

Env-verdier med prefiks `keychain:` løses fra OS-nøkkelringen ved oppstart:

```yaml
env:
  API_KEY: "keychain:mitt-hemmelignavn" # Løst fra OS-nøkkelringen
  PLAIN_VAR: "bokstavelig-verdi"        # Gitt som-er
```

Bare `PATH` er arvet fra vertsomgivelsene (slik at `npx`, `node`, `deno` osv. løses korrekt). Ingen andre vertsmiljøvariabler lekker inn i MCP-server-underprosesser.

::: tip Lagre hemmeligheter med `triggerfish config set-secret <navn> <verdi>`. Referer dem deretter som `keychain:<navn>` i MCP-server env-konfigurasjonen din. :::

### Verktøynavngiving

Verktøy fra MCP-servere navnesettes som `mcp_<serverId>_<toolName>` for å unngå konflikt med innebygde verktøy. For eksempel, hvis en server kalt `github` eksponerer et verktøy kalt `list_repos`, ser agenten det som `mcp_github_list_repos`.

### Klassifisering og standard avvisning

Hvis du utelater `classification`, registreres serveren som **UNTRUSTED** og gatewayen avviser alle verktøykall. Du må eksplisitt velge et klassifiseringsnivå. Se [Klassifiseringsveiledningen](/nb-NO/guide/classification-guide) for hjelp til å velge riktig nivå.

## Verktøykallflyt

Når agenten ber om et MCP-verktøykall, utfører gatewayen en deterministisk sekvens av sjekker før den videresender forespørselen.

### 1. Forhåndssjekker

Alle sjekker er deterministiske — ingen LLM-kall, ingen tilfeldighet.

| Sjekk                                                           | Feilvresultat                      |
| --------------------------------------------------------------- | ---------------------------------- |
| Servertilstand er `CLASSIFIED`?                                 | Blokker: «Server not approved»     |
| Verktøy er tillatt for denne serveren?                          | Blokker: «Tool not permitted»      |
| Bruker har nødvendige tillatelser?                              | Blokker: «Permission denied»       |
| Session taint kompatibel med serverklassifisering?              | Blokker: «Would violate write-down»|
| Skjemavalidering bestått?                                       | Blokker: «Invalid parameters»      |

::: info Hvis session taint er høyere enn serverklassifiseringen, blokkeres kallet for å forhindre write-down. En sesjon taintet på `CONFIDENTIAL` kan ikke sende data til en `PUBLIC` MCP-server. :::

### 2. Utfør

Hvis alle forhåndssjekker er bestått, videresender gatewayen forespørselen til MCP-serveren.

### 3. Responsbehandling

Når MCP-serveren returnerer et svar:

- Valider svaret mot det deklarerte skjemaet
- Klassifiser svardataene på serverens klassifiseringsnivå
- Oppdater session taint: `taint = max(gjeldende_taint, serverklassifisering)`
- Opprett en linjepost som sporer dataenes opprinnelse

### 4. Revisjon

Hvert verktøykall logges med: serveridentitet, verktøynavn, brukeridentitet, policy-beslutning, taint-endring og tidsstempel.

## Responsens taint-regler

MCP-server-svar arver serverens klassifiseringsnivå. Session taint kan bare eskalere.

| Serverklassifisering | Responsens taint | Sesjonsvirkning                           |
| -------------------- | ---------------- | ----------------------------------------- |
| `PUBLIC`             | `PUBLIC`         | Ingen taint-endring                       |
| `INTERNAL`           | `INTERNAL`       | Taint eskalerer til minst `INTERNAL`      |
| `CONFIDENTIAL`       | `CONFIDENTIAL`   | Taint eskalerer til minst `CONFIDENTIAL`  |
| `RESTRICTED`         | `RESTRICTED`     | Taint eskalerer til `RESTRICTED`          |

Når en sesjon er taintet på et gitt nivå, forblir den på det nivået eller høyere for resten av sesjonen. En full sesjonstilbakestilling (som tømmer samtalehistorikken) er nødvendig for å redusere taint.

## Brukerautentiserings-passgjennom

For MCP-servere som støtter brukernivelautentisering, videresender gatewayen brukerens delegerte legitimasjon i stedet for systemlegitimasjon.

Når et verktøy er konfigurert med `requires_user_auth: true`:

1. Gatewayen sjekker om brukeren har koblet til denne MCP-serveren
2. Henter brukerens delegerte legitimasjon fra det sikre legitimasjonslageret
3. Legger til brukerautentisering i MCP-forespørselshoder
4. MCP-serveren håndhever brukernivelttillatelser

Resultatet: MCP-serveren ser **brukerens identitet**, ikke en systemidentitet. Tillatelsesarv fungerer gjennom MCP-grensen — agenten kan bare aksessere det brukeren kan aksessere.

::: tip Brukeraut-passgjennom er det foretrukne mønsteret for enhver MCP-server som administrerer tilgangskontroll. Det betyr at agenten arver brukerens tillatelser i stedet for å ha bred systemtilgang. :::

## Skjemavalidering

Gatewayen validerer alle MCP-forespørsler og -svar mot deklarerte skjemaer før videresending:

```typescript
// Forespørselsvalidering (forenklet)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // Valider params mot JSON-skjema
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // Sjekk for injeksjonsmønstre i strengparams
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

Skjemavalidering fanger feilformede forespørsler før de når den eksterne serveren og flaggger potensielle injeksjonsmønstre i strengparametere.

## Bedriftskontroller

Bedriftsdistribusjoner har ytterligere kontroller for MCP-serveradministrasjon:

- **Admin-administrert serverregister** — Bare admin-godkjente MCP-servere kan klassifiseres
- **Per-avdeling verktøytillatelser** — Ulike team kan ha ulik verktøytilgang
- **Samsvarslogging** — Alle MCP-interaksjoner tilgjengelig i samsvarsdashbord
- **Hastighetsbegrensning** — Per-server og per-verktøy hastighetsbegrensninger
- **Serverhelseovervåking** — Gatewayen sporer servertilgjengelighet og svartider
