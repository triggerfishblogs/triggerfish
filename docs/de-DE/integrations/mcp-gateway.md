# MCP Gateway

> Verwenden Sie jeden MCP-Server. Wir sichern die Grenze ab.

Das Model Context Protocol (MCP) ist der aufkommende Standard fuer Agent-zu-Tool-Kommunikation. Triggerfish bietet ein sicheres MCP Gateway, das Ihnen ermoeglicht, sich mit jedem MCP-kompatiblen Server zu verbinden und dabei Klassifizierungskontrollen, Tool-Level-Berechtigungen, Taint-Tracking und vollstaendiges Audit-Logging durchzusetzen.

Sie bringen die MCP-Server. Triggerfish sichert jede Anfrage und Antwort, die die Grenze ueberquert.

## Funktionsweise

Das MCP Gateway sitzt zwischen Ihrem Agenten und jedem MCP-Server. Jeder Tool-Aufruf durchlaeuft die Policy-Durchsetzungsschicht, bevor er den externen Server erreicht, und jede Antwort wird klassifiziert, bevor sie in den Agenten-Kontext eintritt.

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway-Ablauf: Agent → MCP Gateway → Policy-Schicht → MCP-Server, mit Ablehnungspfad zu BLOCKIERT" style="max-width: 100%;" />

Das Gateway bietet fuenf Kernfunktionen:

1. **Server-Authentifizierung und -Klassifizierung** -- MCP-Server muessen vor der Verwendung geprueft und klassifiziert werden
2. **Tool-Level-Berechtigungsdurchsetzung** -- Einzelne Tools koennen erlaubt, eingeschraenkt oder blockiert werden
3. **Anfrage/Antwort-Taint-Tracking** -- Session-Taint eskaliert basierend auf der Server-Klassifizierung
4. **Schema-Validierung** -- Alle Anfragen und Antworten werden gegen deklarierte Schemas validiert
5. **Audit-Logging** -- Jeder Tool-Aufruf, jede Entscheidung und jede Taint-Aenderung wird aufgezeichnet

## MCP-Server-Zustaende

Alle MCP-Server starten standardmaessig als `UNTRUSTED`. Sie muessen explizit klassifiziert werden, bevor der Agent sie aufrufen kann.

| Zustand      | Beschreibung                                                            | Agent kann aufrufen? |
| ------------ | ----------------------------------------------------------------------- | :------------------: |
| `UNTRUSTED`  | Standard fuer neue Server. Pruefung ausstehend.                         |        Nein          |
| `CLASSIFIED` | Geprueft und mit einer Klassifizierungsstufe und pro-Tool-Berechtigungen versehen. | Ja (innerhalb der Policy) |
| `BLOCKED`    | Explizit vom Administrator verboten.                                    |        Nein          |

<img src="/diagrams/state-machine.svg" alt="MCP-Server-Zustandsmaschine: UNTRUSTED → CLASSIFIED oder BLOCKED" style="max-width: 100%;" />

::: warning SICHERHEIT Ein `UNTRUSTED` MCP-Server kann unter keinen Umstaenden vom Agenten aufgerufen werden. Das LLM kann das System nicht bitten, ueberzeugen oder dazu verleiten, einen nicht klassifizierten Server zu verwenden. Klassifizierung ist eine Code-Level-Sperre, keine LLM-Entscheidung. :::

## Konfiguration

MCP-Server werden in `triggerfish.yaml` als Map konfiguriert, die nach Server-ID schluesselt. Jeder Server verwendet entweder einen lokalen Unterprozess (stdio-Transport) oder einen Remote-Endpunkt (SSE-Transport).

### Lokale Server (Stdio)

Lokale Server werden als Unterprozesse gestartet. Triggerfish kommuniziert mit ihnen ueber stdin/stdout.

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

### Remote-Server (SSE)

Remote-Server laufen anderswo und werden ueber HTTP Server-Sent Events aufgerufen.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Konfigurationsschluessel

| Schluessel       | Typ      | Erforderlich | Beschreibung                                                                  |
| ---------------- | -------- | ------------ | ----------------------------------------------------------------------------- |
| `command`        | string   | Ja (stdio)   | Auszufuehrendes Binary (z.B. `npx`, `deno`, `node`)                          |
| `args`           | string[] | Nein         | Argumente fuer den Befehl                                                     |
| `env`            | map      | Nein         | Umgebungsvariablen fuer den Unterprozess                                      |
| `url`            | string   | Ja (SSE)     | HTTP-Endpunkt fuer Remote-Server                                              |
| `classification` | string   | **Ja**       | Daten-Sensitivitaetsstufe: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` oder `RESTRICTED` |
| `enabled`        | boolean  | Nein         | Standard: `true`. Auf `false` setzen, um ohne Entfernung der Konfiguration zu ueberspringen. |

Jeder Server muss entweder `command` (lokal) oder `url` (remote) haben. Server ohne beides werden uebersprungen.

### Lazy Connection

MCP-Server verbinden sich im Hintergrund nach dem Start. Sie muessen nicht warten, bis alle Server bereit sind, bevor Sie Ihren Agenten verwenden.

- Server versuchen es erneut mit exponentiellem Backoff: 2s → 4s → 8s → 30s Maximum
- Neue Server werden dem Agenten verfuegbar, sobald sie sich verbinden -- kein Session-Neustart erforderlich
- Wenn ein Server nach allen Versuchen keine Verbindung herstellt, geht er in den `failed`-Zustand und kann beim naechsten Daemon-Neustart erneut versucht werden

Die CLI- und Tidepool-Oberflaechen zeigen den MCP-Verbindungsstatus in Echtzeit an. Siehe [CLI-Kanal](/de-DE/channels/cli#mcp-server-status) fuer Details.

### Server deaktivieren

Um einen MCP-Server voruebergehend zu deaktivieren, ohne seine Konfiguration zu entfernen:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Wird beim Start uebersprungen
```

### Umgebungsvariablen und Secrets

Env-Werte mit dem Praefix `keychain:` werden beim Start aus dem Betriebssystem-Schluesselbund aufgeloest:

```yaml
env:
  API_KEY: "keychain:my-secret-name" # Wird aus dem Betriebssystem-Schluesselbund aufgeloest
  PLAIN_VAR: "literal-value" # Wird direkt uebergeben
```

Nur `PATH` wird von der Host-Umgebung geerbt (damit `npx`, `node`, `deno` usw. korrekt aufgeloest werden). Keine anderen Host-Umgebungsvariablen gelangen in MCP-Server-Unterprozesse.

::: tip Speichern Sie Secrets mit `triggerfish config set-secret <name> <wert>`. Dann referenzieren Sie sie als `keychain:<name>` in Ihrer MCP-Server-Env-Konfiguration. :::

### Tool-Benennung

Tools von MCP-Servern werden als `mcp_<serverId>_<toolName>` namensraumisiert, um Kollisionen mit eingebauten Tools zu vermeiden. Wenn beispielsweise ein Server namens `github` ein Tool namens `list_repos` bereitstellt, sieht der Agent es als `mcp_github_list_repos`.

### Klassifizierung und Standard-Ablehnung

Wenn Sie `classification` weglassen, wird der Server als **UNTRUSTED** registriert und das Gateway lehnt alle Tool-Aufrufe ab. Sie muessen explizit eine Klassifizierungsstufe waehlen. Siehe den [Klassifizierungsleitfaden](/de-DE/guide/classification-guide) fuer Hilfe bei der Wahl der richtigen Stufe.

## Tool-Aufruf-Ablauf

Wenn der Agent einen MCP-Tool-Aufruf anfordert, fuehrt das Gateway eine deterministische Folge von Pruefungen durch, bevor die Anfrage weitergeleitet wird.

### 1. Vorab-Pruefungen

Alle Pruefungen sind deterministisch -- keine LLM-Aufrufe, kein Zufall.

| Pruefung                                             | Fehlerresultat                    |
| ---------------------------------------------------- | --------------------------------- |
| Server-Status ist `CLASSIFIED`?                      | Blockiert: "Server nicht genehmigt" |
| Tool ist fuer diesen Server erlaubt?                 | Blockiert: "Tool nicht erlaubt"   |
| Benutzer hat erforderliche Berechtigungen?           | Blockiert: "Berechtigung verweigert" |
| Session-Taint kompatibel mit Server-Klassifizierung? | Blockiert: "Wuerde Write-Down verletzen" |
| Schema-Validierung bestanden?                        | Blockiert: "Ungueltige Parameter" |

::: info Wenn der Session-Taint hoeher als die Server-Klassifizierung ist, wird der Aufruf blockiert, um Write-Down zu verhindern. Eine auf `CONFIDENTIAL` getaintete Session kann keine Daten an einen `PUBLIC` MCP-Server senden. :::

### 2. Ausfuehren

Wenn alle Vorab-Pruefungen bestanden sind, leitet das Gateway die Anfrage an den MCP-Server weiter.

### 3. Antwortverarbeitung

Wenn der MCP-Server eine Antwort zurueckgibt:

- Antwort gegen das deklarierte Schema validieren
- Antwortdaten auf der Klassifizierungsstufe des Servers klassifizieren
- Session-Taint aktualisieren: `taint = max(aktueller_taint, server_klassifizierung)`
- Lineage-Datensatz erstellen, der den Datenursprung verfolgt

### 4. Audit

Jeder Tool-Aufruf wird protokolliert mit: Server-Identitaet, Tool-Name, Benutzer-Identitaet, Policy-Entscheidung, Taint-Aenderung und Zeitstempel.

## Antwort-Taint-Regeln

MCP-Server-Antworten erben die Klassifizierungsstufe des Servers. Session-Taint kann nur eskalieren.

| Server-Klassifizierung | Antwort-Taint  | Session-Auswirkung                         |
| ---------------------- | -------------- | ------------------------------------------ |
| `PUBLIC`               | `PUBLIC`       | Keine Taint-Aenderung                      |
| `INTERNAL`             | `INTERNAL`     | Taint eskaliert auf mindestens `INTERNAL`  |
| `CONFIDENTIAL`         | `CONFIDENTIAL` | Taint eskaliert auf mindestens `CONFIDENTIAL` |
| `RESTRICTED`           | `RESTRICTED`   | Taint eskaliert auf `RESTRICTED`           |

Sobald eine Session auf einer bestimmten Stufe getaintet ist, bleibt sie auf dieser Stufe oder hoeher fuer den Rest der Session. Ein vollstaendiger Session-Reset (der den Gespraechsverlauf loescht) ist erforderlich, um den Taint zu reduzieren.

## Benutzer-Authentifizierungs-Durchleitung

Fuer MCP-Server, die benutzerspezifische Authentifizierung unterstuetzen, leitet das Gateway die delegierten Anmeldedaten des Benutzers weiter, anstatt System-Anmeldedaten zu verwenden.

Wenn ein Tool mit `requires_user_auth: true` konfiguriert ist:

1. Das Gateway prueft, ob der Benutzer diesen MCP-Server verbunden hat
2. Ruft die delegierten Anmeldedaten des Benutzers aus dem sicheren Credential Store ab
3. Fuegt Benutzer-Authentifizierung zu den MCP-Anfrage-Headern hinzu
4. Der MCP-Server setzt Berechtigungen auf Benutzerebene durch

Das Ergebnis: Der MCP-Server sieht die **Identitaet des Benutzers**, nicht eine System-Identitaet. Berechtigungsvererbung funktioniert ueber die MCP-Grenze hinweg -- der Agent kann nur auf das zugreifen, worauf der Benutzer zugreifen kann.

::: tip Benutzer-Auth-Durchleitung ist das bevorzugte Muster fuer jeden MCP-Server, der Zugangskontrolle verwaltet. Es bedeutet, dass der Agent die Berechtigungen des Benutzers erbt, anstatt uneingeschraenkten Systemzugang zu haben. :::

## Schema-Validierung

Das Gateway validiert alle MCP-Anfragen und -Antworten gegen deklarierte Schemas, bevor sie weitergeleitet werden:

```typescript
// Anfrage-Validierung (vereinfacht)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // Parameter gegen JSON-Schema validieren
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // Auf Injection-Muster in String-Parametern pruefen
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

Schema-Validierung faengt fehlerhafte Anfragen ab, bevor sie den externen Server erreichen, und markiert potenzielle Injection-Muster in String-Parametern.

## Enterprise-Kontrollen

Enterprise-Bereitstellungen haben zusaetzliche Kontrollen fuer MCP-Server-Verwaltung:

- **Admin-verwaltete Server-Registry** -- Nur von Administratoren genehmigte MCP-Server koennen klassifiziert werden
- **Pro-Abteilung-Tool-Berechtigungen** -- Verschiedene Teams koennen unterschiedlichen Tool-Zugriff haben
- **Compliance-Logging** -- Alle MCP-Interaktionen in Compliance-Dashboards verfuegbar
- **Rate-Limiting** -- Pro-Server- und Pro-Tool-Rate-Limits
- **Server-Gesundheitsueberwachung** -- Gateway verfolgt Server-Verfuegbarkeit und Antwortzeiten
