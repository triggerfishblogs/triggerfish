# Plugin SDK & Sandbox

Triggerfish plugins let you extend the agent with custom code that interacts
with external systems -- CRM queries, database operations, API integrations,
multi-step workflows -- while running inside a double sandbox that prevents the
code from doing anything it has not explicitly been permitted to do.

## Runtime Environment

Plugins run on Deno + Pyodide (WASM). No Docker. No containers. No prerequisites
beyond the Triggerfish installation itself.

- **TypeScript plugins** run directly in the Deno sandbox
- **Python plugins** run inside Pyodide (a Python interpreter compiled to
  WebAssembly), which itself runs inside the Deno sandbox

<img src="/diagrams/plugin-sandbox.svg" alt="Plugin sandbox: Deno sandbox wraps WASM sandbox, plugin code runs in the innermost layer" style="max-width: 100%;" />

This double-sandbox architecture means that even if a plugin contains malicious
code, it cannot access the filesystem, make undeclared network calls, or escape
to the host system.

## What Plugins Can Do

Plugins have a flexible interior within strict boundaries. Inside the sandbox,
your plugin can:

- Perform full CRUD operations on target systems (using the user's permissions)
- Execute complex queries and data transformations
- Orchestrate multi-step workflows
- Process and analyse data
- Maintain plugin state across invocations
- Call any declared external API endpoint

## What Plugins Cannot Do

| Constraint                               | How It Is Enforced                                          |
| ---------------------------------------- | ----------------------------------------------------------- |
| Access undeclared network endpoints      | Sandbox blocks all network calls not on the allowlist       |
| Emit data without a classification label | SDK rejects unclassified data                               |
| Read data without taint propagation      | SDK auto-taints the session when data is accessed           |
| Persist data outside Triggerfish         | No filesystem access from within the sandbox                |
| Exfiltrate via side channels             | Resource limits enforced, no raw socket access              |
| Use system credentials                   | SDK blocks `get_system_credential()`; user credentials only |

::: warning SECURITY `sdk.get_system_credential()` is **blocked** by design.
Plugins must always use delegated user credentials via
`sdk.get_user_credential()`. This ensures the agent can only access what the
user can access -- never more. :::

## Plugin SDK Methods

The SDK provides a controlled interface for plugins to interact with external
systems and the Triggerfish platform.

### Credential Access

```typescript
// Get the user's delegated credential for a service
const credential = await sdk.get_user_credential("salesforce");

// Check if the user has connected a service
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)` retrieves the user's OAuth token or API key
for the named service. If the user has not connected the service, the call
returns `null` and the plugin should handle this gracefully.

### Data Operations

```typescript
// Query an external system using the user's permissions
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Emit data back to the agent — classification label is REQUIRED
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info Every call to `sdk.emitData()` requires a `classification` label. If
you omit it, the SDK rejects the call. This ensures that all data flowing from
plugins into the agent context is properly classified. :::

### Connection Check

```typescript
// Check if the user has a live connection to a service
if (await sdk.has_user_connection("github")) {
  const repos = await sdk.query_as_user("github", {
    endpoint: "/user/repos",
  });
  sdk.emitData({
    classification: "INTERNAL",
    payload: repos,
    source: "github",
  });
}
```

## Plugin Lifecycle

Every plugin follows a lifecycle that ensures security review before activation.

```
1. Plugin created (by user, agent, or third party)
       |
       v
2. Plugin built using Plugin SDK
   - Must implement required interfaces
   - Must declare endpoints and capabilities
   - Must pass validation
       |
       v
3. Plugin enters UNTRUSTED state
   - Agent CANNOT use it
   - Owner/admin notified: "Pending classification"
       |
       v
4. Owner (personal) or admin (enterprise) reviews:
   - What data does this plugin access?
   - What actions can it take?
   - Assigns classification level
       |
       v
5. Plugin active at assigned classification
   - Agent can invoke within policy constraints
   - All invocations pass through policy hooks
```

::: tip In the personal tier, you are the owner -- you review and classify your
own plugins. In the enterprise tier, an admin manages the plugin registry and
assigns classification levels. :::

## Database Connectivity

Native database drivers (psycopg2, mysqlclient, etc.) do not work inside the
WASM sandbox. Plugins connect to databases through HTTP-based APIs instead.

| Database   | HTTP-Based Option                 |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST, Supabase SDK, Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK (HTTP)                    |

This is a security advantage, not a limitation. All database access flows
through inspectable, controllable HTTP requests that the sandbox can enforce and
the audit system can log.

## Writing a TypeScript Plugin

A minimal TypeScript plugin that queries a REST API:

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // Check if the user has connected the service
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // Query using the user's credentials
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // Emit classified data back to the agent
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## Writing a Python Plugin

A minimal Python plugin:

```python
async def execute(sdk):
    # Check connection
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # Query using user's credentials
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # Emit with classification
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

Python plugins run inside the Pyodide WASM runtime. Standard library modules are
available, but native C extensions are not. Use HTTP-based APIs for external
connectivity.

## Plugin Security Summary

- Plugins run in a double sandbox (Deno + WASM) with strict isolation
- All network access must be declared in the plugin manifest
- All emitted data must carry a classification label
- System credentials are blocked -- only user-delegated credentials are
  available
- Each plugin enters the system as `UNTRUSTED` and must be classified before use
- All plugin invocations pass through policy hooks and are fully audited
