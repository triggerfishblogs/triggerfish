# Plugin SDK & Sandbox

Triggerfish-Plugins ermoeglichen es Ihnen, den Agenten mit benutzerdefiniertem Code zu erweitern, der mit externen Systemen interagiert -- CRM-Abfragen, Datenbankoperationen, API-Integrationen, mehrstufige Workflows -- waehrend er in einer doppelten Sandbox laeuft, die verhindert, dass der Code etwas tut, wozu er nicht explizit berechtigt ist.

## Laufzeitumgebung

Plugins laufen auf Deno + Pyodide (WASM). Kein Docker. Keine Container. Keine Voraussetzungen ueber die Triggerfish-Installation selbst hinaus.

- **TypeScript-Plugins** laufen direkt in der Deno-Sandbox
- **Python-Plugins** laufen in Pyodide (ein nach WebAssembly kompilierter Python-Interpreter), der seinerseits in der Deno-Sandbox laeuft

<img src="/diagrams/plugin-sandbox.svg" alt="Plugin-Sandbox: Deno-Sandbox umschliesst WASM-Sandbox, Plugin-Code laeuft in der innersten Schicht" style="max-width: 100%;" />

Diese Doppel-Sandbox-Architektur bedeutet, dass selbst wenn ein Plugin boesartigen Code enthaelt, es nicht auf das Dateisystem zugreifen, nicht deklarierte Netzwerkaufrufe durchfuehren oder aus dem Host-System ausbrechen kann.

## Was Plugins koennen

Plugins haben einen flexiblen Innenraum innerhalb strenger Grenzen. Innerhalb der Sandbox kann Ihr Plugin:

- Vollstaendige CRUD-Operationen auf Zielsystemen durchfuehren (mit den Berechtigungen des Benutzers)
- Komplexe Abfragen und Datentransformationen ausfuehren
- Mehrstufige Workflows orchestrieren
- Daten verarbeiten und analysieren
- Plugin-Status ueber Aufrufe hinweg beibehalten
- Jeden deklarierten externen API-Endpunkt aufrufen

## Was Plugins nicht koennen

| Einschraenkung                           | Wie sie durchgesetzt wird                                   |
| ---------------------------------------- | ----------------------------------------------------------- |
| Auf nicht deklarierte Netzwerk-Endpunkte zugreifen | Sandbox blockiert alle Netzwerkaufrufe, die nicht auf der Allowlist stehen |
| Daten ohne Klassifizierungslabel ausgeben | SDK lehnt nicht klassifizierte Daten ab                     |
| Daten ohne Taint-Propagation lesen       | SDK taintet die Session automatisch beim Datenzugriff       |
| Daten ausserhalb von Triggerfish persistieren | Kein Dateisystemzugriff innerhalb der Sandbox              |
| Ueber Seitenkanaele exfiltrieren         | Ressourcenlimits durchgesetzt, kein roher Socket-Zugriff    |
| System-Anmeldedaten verwenden            | SDK blockiert `get_system_credential()`; nur Benutzer-Anmeldedaten |

::: warning SICHERHEIT `sdk.get_system_credential()` ist designbedingt **blockiert**. Plugins muessen immer delegierte Benutzer-Anmeldedaten ueber `sdk.get_user_credential()` verwenden. Dies stellt sicher, dass der Agent nur auf das zugreifen kann, worauf der Benutzer zugreifen kann -- niemals mehr. :::

## Plugin-SDK-Methoden

Das SDK bietet eine kontrollierte Schnittstelle fuer Plugins, um mit externen Systemen und der Triggerfish-Plattform zu interagieren.

### Anmeldedaten-Zugriff

```typescript
// Delegierte Anmeldedaten des Benutzers fuer einen Dienst abrufen
const credential = await sdk.get_user_credential("salesforce");

// Pruefen, ob der Benutzer einen Dienst verbunden hat
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)` ruft das OAuth-Token oder den API-Schluessel des Benutzers fuer den genannten Dienst ab. Wenn der Benutzer den Dienst nicht verbunden hat, gibt der Aufruf `null` zurueck und das Plugin sollte dies elegant behandeln.

### Datenoperationen

```typescript
// Externes System mit den Berechtigungen des Benutzers abfragen
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Daten an den Agenten zurueckgeben -- Klassifizierungslabel ist ERFORDERLICH
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info Jeder Aufruf von `sdk.emitData()` erfordert ein `classification`-Label. Wenn Sie es weglassen, lehnt das SDK den Aufruf ab. Dies stellt sicher, dass alle Daten, die von Plugins in den Agenten-Kontext fliessen, ordnungsgemaess klassifiziert sind. :::

### Verbindungspruefung

```typescript
// Pruefen, ob der Benutzer eine aktive Verbindung zu einem Dienst hat
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

## Plugin-Lebenszyklus

Jedes Plugin durchlaeuft einen Lebenszyklus, der eine Sicherheitspruefung vor der Aktivierung sicherstellt.

```
1. Plugin erstellt (durch Benutzer, Agent oder Drittanbieter)
       |
       v
2. Plugin mit Plugin SDK erstellt
   - Muss erforderliche Interfaces implementieren
   - Muss Endpunkte und Faehigkeiten deklarieren
   - Muss Validierung bestehen
       |
       v
3. Plugin geht in UNTRUSTED-Zustand
   - Agent KANN es NICHT verwenden
   - Eigentuemer/Administrator benachrichtigt: "Klassifizierung ausstehend"
       |
       v
4. Eigentuemer (persoenlich) oder Administrator (Enterprise) prueft:
   - Auf welche Daten greift dieses Plugin zu?
   - Welche Aktionen kann es ausfuehren?
   - Weist Klassifizierungsstufe zu
       |
       v
5. Plugin aktiv auf zugewiesener Klassifizierung
   - Agent kann innerhalb der Policy-Beschraenkungen aufrufen
   - Alle Aufrufe durchlaufen Policy-Hooks
```

::: tip Im persoenlichen Tarif sind Sie der Eigentuemer -- Sie pruefen und klassifizieren Ihre eigenen Plugins. Im Enterprise-Tarif verwaltet ein Administrator die Plugin-Registry und weist Klassifizierungsstufen zu. :::

## Datenbank-Konnektivitaet

Native Datenbanktreiber (psycopg2, mysqlclient usw.) funktionieren nicht innerhalb der WASM-Sandbox. Plugins verbinden sich stattdessen ueber HTTP-basierte APIs mit Datenbanken.

| Datenbank  | HTTP-basierte Option              |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST, Supabase SDK, Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK (HTTP)                    |

Dies ist ein Sicherheitsvorteil, keine Einschraenkung. Jeder Datenbankzugriff fliesst durch inspizierbare, kontrollierbare HTTP-Anfragen, die die Sandbox durchsetzen und das Audit-System protokollieren kann.

## Ein TypeScript-Plugin schreiben

Ein minimales TypeScript-Plugin, das eine REST-API abfragt:

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // Pruefen, ob der Benutzer den Dienst verbunden hat
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // Mit den Anmeldedaten des Benutzers abfragen
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // Klassifizierte Daten an den Agenten zurueckgeben
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## Ein Python-Plugin schreiben

Ein minimales Python-Plugin:

```python
async def execute(sdk):
    # Verbindung pruefen
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # Mit den Anmeldedaten des Benutzers abfragen
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # Mit Klassifizierung ausgeben
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

Python-Plugins laufen in der Pyodide-WASM-Laufzeit. Standardbibliotheks-Module sind verfuegbar, aber native C-Erweiterungen nicht. Verwenden Sie HTTP-basierte APIs fuer externe Konnektivitaet.

## Plugin-Sicherheitszusammenfassung

- Plugins laufen in einer doppelten Sandbox (Deno + WASM) mit strikter Isolation
- Jeder Netzwerkzugriff muss im Plugin-Manifest deklariert werden
- Alle ausgegebenen Daten muessen ein Klassifizierungslabel tragen
- System-Anmeldedaten sind blockiert -- nur benutzerdelegierte Anmeldedaten sind verfuegbar
- Jedes Plugin betritt das System als `UNTRUSTED` und muss vor der Verwendung klassifiziert werden
- Alle Plugin-Aufrufe durchlaufen Policy-Hooks und werden vollstaendig auditiert
