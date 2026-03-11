# Plugin SDK at Sandbox

Ang mga Triggerfish plugins ay nagpapa-extend sa agent gamit ang custom code na
nakikipag-interact sa external systems -- CRM queries, database operations, API
integrations, multi-step workflows -- habang nare-run sa loob ng double sandbox
na pumipigil sa code na gawin ang anumang hindi explicitly na pinayagan.

## Runtime Environment

Nare-run ang mga plugins sa Deno + Pyodide (WASM). Walang Docker. Walang
containers. Walang prerequisites bukod sa Triggerfish installation mismo.

- **TypeScript plugins** ay direktang nare-run sa Deno sandbox
- **Python plugins** ay nare-run sa loob ng Pyodide (isang Python interpreter na
  compiled sa WebAssembly), na nare-run sa loob ng Deno sandbox

<img src="/diagrams/plugin-sandbox.svg" alt="Plugin sandbox: Deno sandbox ang nagwwrap ng WASM sandbox, nare-run ang plugin code sa pinakaloob na layer" style="max-width: 100%;" />

Ang double-sandbox architecture na ito ay nangangahulugan na kahit ang isang
plugin ay may malicious code, hindi nito maa-access ang filesystem, makagawa
ng undeclared network calls, o maka-escape sa host system.

## Ano ang Kaya ng Plugins

May flexible interior ang plugins sa loob ng strict boundaries. Sa loob ng
sandbox, ang iyong plugin ay pwedeng:

- Mag-perform ng full CRUD operations sa target systems (gamit ang permissions ng user)
- Mag-execute ng complex queries at data transformations
- Mag-orchestrate ng multi-step workflows
- Mag-process at mag-analyze ng data
- Mag-maintain ng plugin state sa mga invocations
- Tumawag sa kahit anong declared external API endpoint

## Ano ang Hindi Kaya ng Plugins

| Constraint                                 | Paano Ito Ine-enforce                                        |
| ------------------------------------------ | ------------------------------------------------------------ |
| Mag-access ng undeclared network endpoints | Bina-block ng sandbox ang lahat ng network calls na wala sa allowlist |
| Mag-emit ng data nang walang classification label | Nire-reject ng SDK ang unclassified data                  |
| Magbasa ng data nang walang taint propagation | Auto-taint ng SDK ang session kapag na-access ang data      |
| Mag-persist ng data sa labas ng Triggerfish | Walang filesystem access mula sa loob ng sandbox             |
| Mag-exfiltrate via side channels           | May resource limits, walang raw socket access                |
| Gumamit ng system credentials              | Bina-block ng SDK ang `get_system_credential()`; user credentials lang |

::: warning SECURITY Ang `sdk.get_system_credential()` ay **blocked** by design.
Dapat palaging gumamit ang plugins ng delegated user credentials via
`sdk.get_user_credential()`. Tinitiyak nito na ang agent ay maka-access lang ng
kaya ng user na i-access -- hindi kailanman higit pa. :::

## Plugin SDK Methods

### Credential Access

```typescript
// Kunin ang delegated credential ng user para sa isang service
const credential = await sdk.get_user_credential("salesforce");

// Tingnan kung na-connect na ng user ang isang service
const connected = await sdk.has_user_connection("notion");
```

### Data Operations

```typescript
// Mag-query ng external system gamit ang permissions ng user
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Mag-emit ng data pabalik sa agent -- REQUIRED ang classification label
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info Bawat tawag sa `sdk.emitData()` ay nangangailangan ng `classification`
label. Kung ini-omit mo ito, nire-reject ng SDK ang call. Tinitiyak nito na
lahat ng data na dumadaan mula sa plugins papunta sa agent context ay maayos na
classified. :::

## Plugin Lifecycle

```
1. Ginawa ang plugin (ng user, agent, o third party)
       |
       v
2. Binuo ang plugin gamit ang Plugin SDK
   - Kailangang mag-implement ng required interfaces
   - Kailangang mag-declare ng endpoints at capabilities
   - Kailangang pumasa sa validation
       |
       v
3. Pumapasok ang plugin sa UNTRUSTED state
   - HINDI ito magagamit ng agent
   - Nao-notify ang owner/admin: "Pending classification"
       |
       v
4. Nire-review ng owner (personal) o admin (enterprise):
   - Anong data ang ina-access ng plugin na ito?
   - Anong actions ang pwede nitong gawin?
   - Nag-assign ng classification level
       |
       v
5. Active ang plugin sa assigned classification
   - Pwede nang i-invoke ng agent within policy constraints
   - Lahat ng invocations ay dumadaan sa policy hooks
```

## Database Connectivity

Ang mga native database drivers (psycopg2, mysqlclient, atbp.) ay hindi gumagana
sa loob ng WASM sandbox. Nagkokonekta ang mga plugins sa databases sa
pamamagitan ng HTTP-based APIs.

| Database   | HTTP-Based Option                 |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST, Supabase SDK, Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK (HTTP)                    |

Ito ay security advantage, hindi limitation. Lahat ng database access ay
dumadaan sa inspectable, controllable HTTP requests na pwedeng i-enforce ng
sandbox at i-log ng audit system.

## Pagsulat ng TypeScript Plugin

Isang minimal na TypeScript plugin na nagqu-query ng REST API:

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // Tingnan kung na-connect na ng user ang service
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // Mag-query gamit ang credentials ng user
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // Mag-emit ng classified data pabalik sa agent
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## Pagsulat ng Python Plugin

Isang minimal na Python plugin:

```python
async def execute(sdk):
    # Tingnan ang connection
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # Mag-query gamit ang credentials ng user
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # Mag-emit na may classification
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

Nare-run ang Python plugins sa loob ng Pyodide WASM runtime. Available ang
standard library modules, pero hindi ang native C extensions. Gumamit ng
HTTP-based APIs para sa external connectivity.

## Plugin Security Summary

- Nare-run ang plugins sa double sandbox (Deno + WASM) na may strict isolation
- Lahat ng network access ay kailangang i-declare sa plugin manifest
- Lahat ng emitted data ay kailangang may classification label
- Blocked ang system credentials -- user-delegated credentials lang ang available
- Bawat plugin ay pumapasok sa system bilang `UNTRUSTED` at kailangang ma-classify bago gamitin
- Lahat ng plugin invocations ay dumadaan sa policy hooks at fully audited
