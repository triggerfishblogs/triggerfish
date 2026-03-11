# Secrets-Verwaltung

Triggerfish speichert Anmeldedaten niemals in Konfigurationsdateien. Alle Secrets -- API-Schluessel, OAuth-Tokens, Integrations-Anmeldedaten -- werden in plattformnativer sicherer Speicherung abgelegt: dem Betriebssystem-Schluesselbund fuer die persoenliche Stufe oder einem Vault-Dienst fuer die Enterprise-Stufe. Plugins und Agenten interagieren mit Anmeldedaten ueber das SDK, das strikte Zugriffskontrollen durchsetzt.

## Speicher-Backends

| Stufe          | Backend             | Details                                                                                     |
| -------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| **Persoenlich**| Betriebssystem-Schluesselbund | macOS Keychain, Linux Secret Service (ueber D-Bus), Windows Credential Manager |
| **Enterprise** | Vault-Integration   | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault oder andere Enterprise-Vault-Dienste  |

In beiden Faellen werden Secrets durch das Speicher-Backend im Ruhezustand verschluesselt. Triggerfish implementiert keine eigene Verschluesselung fuer Secrets -- es delegiert an zweckgebundene, auditierte Secret-Speichersysteme.

Auf Plattformen ohne nativen Schluesselbund (Windows ohne Credential Manager, Docker-Container) faellt Triggerfish auf eine verschluesselte JSON-Datei unter `~/.triggerfish/secrets.json` zurueck. Eintraege werden mit AES-256-GCM verschluesselt, unter Verwendung eines maschinengebundenen 256-Bit-Schluessels, der unter `~/.triggerfish/secrets.key` gespeichert ist (Berechtigungen: `0600`). Jeder Eintrag verwendet bei jedem Schreibvorgang einen neuen zufaelligen 12-Byte-IV. Aeltere Klartext-Secret-Dateien werden beim ersten Laden automatisch in das verschluesselte Format migriert.

::: tip Die persoenliche Stufe erfordert keinerlei Konfiguration fuer Secrets. Wenn Sie eine Integration waehrend der Einrichtung (`triggerfish dive`) verbinden, werden Anmeldedaten automatisch in Ihrem Betriebssystem-Schluesselbund gespeichert. Sie muessen nichts ueber das hinaus installieren oder konfigurieren, was Ihr Betriebssystem bereits bereitstellt. :::

## Secret-Referenzen in der Konfiguration

Triggerfish unterstuetzt `secret:`-Referenzen in `triggerfish.yaml`. Anstatt Anmeldedaten als Klartext zu speichern, referenzieren Sie sie nach Name, und sie werden beim Start aus dem Betriebssystem-Schluesselbund aufgeloest.

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

Der Resolver fuehrt einen Tiefendurchlauf der Konfigurationsdatei durch. Jeder String-Wert, der mit `secret:` beginnt, wird durch den entsprechenden Schluesselbund-Eintrag ersetzt. Wenn ein referenziertes Secret nicht gefunden wird, schlaegt der Start sofort mit einer klaren Fehlermeldung fehl.

### Bestehende Secrets migrieren

Wenn Sie Klartext-Anmeldedaten in Ihrer Konfigurationsdatei von einer frueheren Version haben, verschiebt der Migrationsbefehl sie automatisch in den Schluesselbund:

```bash
triggerfish config migrate-secrets
```

Dieser Befehl:

1. Durchsucht `triggerfish.yaml` nach Klartext-Anmeldedaten
2. Speichert jede im Betriebssystem-Schluesselbund
3. Ersetzt den Klartext-Wert durch eine `secret:`-Referenz
4. Erstellt ein Backup der Originaldatei

::: warning Ueberpruefen Sie nach der Migration, ob Ihr Agent korrekt startet, bevor Sie die Backup-Datei loeschen. Die Migration ist ohne das Backup nicht umkehrbar. :::

## Delegierte Anmeldedaten-Architektur

Ein Kern-Sicherheitsprinzip in Triggerfish ist, dass Datenabfragen mit den **Anmeldedaten des Benutzers** ausgefuehrt werden, nicht mit Systemanmeldedaten. Dies stellt sicher, dass der Agent das Berechtigungsmodell des Quellsystems erbt -- ein Benutzer kann nur auf Daten zugreifen, auf die er auch direkt zugreifen koennte.

<img src="/diagrams/delegated-credentials.svg" alt="Delegierte Anmeldedaten-Architektur: Benutzer erteilt OAuth-Zustimmung, Agent fragt mit Token des Benutzers ab, Quellsystem setzt Berechtigungen durch" style="max-width: 100%;" />

Diese Architektur bedeutet:

- **Keine Ueberberechtigung** -- der Agent kann nicht auf Daten zugreifen, auf die der Benutzer nicht direkt zugreifen kann
- **Keine System-Service-Konten** -- es gibt keine allmaechtige Anmeldedaten, die kompromittiert werden koennte
- **Quellsystem-Durchsetzung** -- das Quellsystem (Salesforce, Jira, GitHub usw.) setzt seine eigenen Berechtigungen bei jeder Abfrage durch

::: warning SICHERHEIT Traditionelle KI-Agenten-Plattformen verwenden oft ein einziges System-Service-Konto, um auf Integrationen im Namen aller Benutzer zuzugreifen. Das bedeutet, der Agent hat Zugriff auf alle Daten in der Integration und verlaesst sich darauf, dass das LLM entscheidet, was jedem Benutzer gezeigt wird. Triggerfish eliminiert dieses Risiko vollstaendig: Abfragen laufen mit dem eigenen delegierten OAuth-Token des Benutzers. :::

## Plugin-SDK-Durchsetzung

Plugins interagieren mit Anmeldedaten ausschliesslich ueber das Triggerfish SDK. Das SDK bietet berechtigungsbewusste Methoden und blockiert jeden Versuch, auf Systemanmeldedaten zuzugreifen.

### Erlaubt: Benutzer-Anmeldedaten-Zugriff

```python
def get_user_opportunities(sdk, params):
    # SDK ruft delegiertes Token des Benutzers aus sicherer Speicherung ab
    # Wenn Benutzer Salesforce nicht verbunden hat, gibt hilfreichen Fehler zurueck
    user_token = sdk.get_user_credential("salesforce")

    # Abfrage laeuft mit Berechtigungen des Benutzers
    # Quellsystem setzt Zugriffskontrolle durch
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### Blockiert: System-Anmeldedaten-Zugriff

```python
def get_all_opportunities(sdk, params):
    # Dies loest PermissionError aus -- BLOCKIERT durch SDK
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` ist immer blockiert. Es gibt keine Konfiguration, um es zu aktivieren, keinen Admin-Override und keine Ausnahme. Dies ist eine feste Sicherheitsregel, ebenso wie die No-Write-Down-Regel. :::

## LLM-aufrufbare Secret-Tools

Der Agent kann Ihnen bei der Verwaltung von Secrets ueber drei Tools helfen. Entscheidend ist, dass das LLM niemals die tatsaechlichen Secret-Werte sieht -- Eingabe und Speicherung geschehen Out-of-Band.

### `secret_save`

Fordert Sie auf, einen Secret-Wert sicher einzugeben:

- **CLI**: Terminal wechselt in den versteckten Eingabemodus (Zeichen werden nicht angezeigt)
- **Tidepool**: Ein sicheres Eingabe-Popup erscheint in der Weboberflaeche

Das LLM fordert an, dass ein Secret gespeichert wird, aber der tatsaechliche Wert wird von Ihnen ueber die sichere Eingabeaufforderung eingegeben. Der Wert wird direkt im Schluesselbund gespeichert -- er passiert niemals den LLM-Kontext.

### `secret_list`

Listet die Namen aller gespeicherten Secrets auf. Exponiert niemals Werte.

### `secret_delete`

Loescht ein Secret nach Name aus dem Schluesselbund.

### Tool-Argument-Substitution

<div v-pre>

Wenn der Agent ein Tool verwendet, das ein Secret benoetigt (zum Beispiel das Setzen eines API-Schluessels in einer MCP-Server-Umgebungsvariable), verwendet er die <span v-pre>`{{secret:name}}`</span>-Syntax in Tool-Argumenten:

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

Die Laufzeitumgebung loest <span v-pre>`{{secret:name}}`</span>-Referenzen **unterhalb der LLM-Schicht** auf, bevor das Tool ausgefuehrt wird. Der aufgeloeste Wert erscheint niemals im Gespraechsverlauf oder in Logs.

</div>

::: warning SICHERHEIT Die <code v-pre>{{secret:name}}</code>-Substitution wird durch Code durchgesetzt, nicht durch das LLM. Selbst wenn das LLM versuchte, den aufgeloesten Wert zu protokollieren oder zurueckzugeben, wuerde die Policy-Schicht den Versuch im `PRE_OUTPUT`-Hook abfangen. :::

### SDK-Berechtigungsmethoden

| Methode                                 | Verhalten                                                                                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | Gibt das delegierte OAuth-Token des Benutzers fuer die angegebene Integration zurueck. Wenn der Benutzer die Integration nicht verbunden hat, gibt einen Fehler mit Anweisungen zurueck. |
| `sdk.query_as_user(integration, query)` | Fuehrt eine Abfrage gegen die Integration mit den delegierten Anmeldedaten des Benutzers aus. Das Quellsystem setzt seine eigenen Berechtigungen durch.            |
| `sdk.get_system_credential(name)`       | **Immer blockiert.** Loest `PermissionError` aus. Wird als Sicherheitsereignis protokolliert.                                                                      |
| `sdk.has_user_connection(integration)`  | Gibt `true` zurueck, wenn der Benutzer die angegebene Integration verbunden hat, andernfalls `false`. Exponiert keine Anmeldedaten.                                |

## Berechtigungsbewusster Datenzugriff

Die delegierte Anmeldedaten-Architektur arbeitet Hand in Hand mit dem Klassifizierungssystem. Selbst wenn ein Benutzer die Berechtigung hat, auf Daten im Quellsystem zuzugreifen, bestimmen die Klassifizierungsregeln von Triggerfish, wohin diese Daten fliessen koennen, nachdem sie abgerufen wurden.

<img src="/diagrams/secret-resolution-flow.svg" alt="Secret-Aufloesungsablauf: Konfigurationsdatei-Referenzen werden aus dem Betriebssystem-Schluesselbund unterhalb der LLM-Schicht aufgeloest" style="max-width: 100%;" />

**Beispiel:**

```
Benutzer: "Fasse den Acme-Deal zusammen und sende ihn meiner Frau"

Schritt 1: Berechtigungspruefung
  --> Token des Benutzers fuer Salesforce verwendet
  --> Salesforce gibt Acme-Opportunity zurueck (Benutzer hat Zugriff)

Schritt 2: Klassifizierung
  --> Salesforce-Daten als CONFIDENTIAL klassifiziert
  --> Session-Taint eskaliert zu CONFIDENTIAL

Schritt 3: Ausgabepruefung
  --> Frau = EXTERNAL-Empfaenger
  --> CONFIDENTIAL --> EXTERNAL: BLOCKIERT

Ergebnis: Daten abgerufen (Benutzer hat Berechtigung), aber koennen nicht gesendet
          werden (Klassifizierungsregeln verhindern Datenleck)
```

Der Benutzer hat legitimen Zugriff auf den Acme-Deal in Salesforce. Triggerfish respektiert das und ruft die Daten ab. Aber das Klassifizierungssystem verhindert, dass diese Daten an einen externen Empfaenger fliessen. Berechtigung zum Zugriff auf Daten ist getrennt von der Berechtigung, sie zu teilen.

## Secret-Zugriffs-Logging

Jeder Zugriff auf Anmeldedaten wird ueber den `SECRET_ACCESS`-Durchsetzungs-Hook protokolliert:

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

Blockierte Versuche werden ebenfalls protokolliert:

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "System credential access is prohibited",
    "plugin_id": "plugin_789"
  }
}
```

::: info Blockierte Zugriffe auf Anmeldedaten werden mit erhoehter Alarmstufe protokolliert. In Enterprise-Bereitstellungen koennen diese Ereignisse Benachrichtigungen an das Sicherheitsteam ausloesen. :::

## Enterprise-Vault-Integration

Enterprise-Bereitstellungen koennen Triggerfish mit einem zentralisierten Vault-Dienst fuer die Anmeldedaten-Verwaltung verbinden:

| Vault-Dienst        | Integration                           |
| ------------------- | ------------------------------------- |
| HashiCorp Vault     | Native API-Integration                |
| AWS Secrets Manager | AWS SDK-Integration                   |
| Azure Key Vault     | Azure SDK-Integration                 |
| Eigener Vault       | Erweiterbare `SecretProvider`-Schnittstelle |

Enterprise-Vault-Integration bietet:

- **Zentralisierte Rotation** -- Anmeldedaten werden im Vault rotiert und automatisch von Triggerfish uebernommen
- **Zugriffsrichtlinien** -- Vault-Richtlinien steuern, welche Agenten und Benutzer auf welche Anmeldedaten zugreifen koennen
- **Audit-Konsolidierung** -- Zugriffsprotokolle fuer Anmeldedaten von Triggerfish und dem Vault koennen korreliert werden

## Was niemals in Konfigurationsdateien gespeichert wird

Folgendes erscheint niemals als Klartext-Werte in `triggerfish.yaml` oder anderen Konfigurationsdateien. Sie werden entweder im Betriebssystem-Schluesselbund gespeichert und ueber `secret:`-Syntax referenziert oder ueber das `secret_save`-Tool verwaltet:

- API-Schluessel fuer LLM-Anbieter
- OAuth-Tokens fuer Integrationen
- Datenbank-Anmeldedaten
- Webhook-Secrets
- Verschluesselungsschluessel
- Pairing-Codes (kurzlebig, nur im Speicher)

::: danger Wenn Sie Klartext-Anmeldedaten in einer Triggerfish-Konfigurationsdatei finden (Werte, die KEINE `secret:`-Referenzen sind), ist etwas schiefgelaufen. Fuehren Sie `triggerfish config migrate-secrets` aus, um sie in den Schluesselbund zu verschieben. Als Klartext gefundene Anmeldedaten sollten sofort rotiert werden. :::

## Verwandte Seiten

- [Sicherheit als Grundprinzip](./) -- Ueberblick ueber die Sicherheitsarchitektur
- [No-Write-Down-Regel](./no-write-down) -- Wie Klassifizierungskontrollen die Anmeldedaten-Isolation ergaenzen
- [Identitaet & Authentifizierung](./identity) -- Wie Benutzeridentitaet in den delegierten Anmeldedaten-Zugriff einfliesst
- [Audit & Compliance](./audit-logging) -- Wie Zugriffsereignisse auf Anmeldedaten aufgezeichnet werden
