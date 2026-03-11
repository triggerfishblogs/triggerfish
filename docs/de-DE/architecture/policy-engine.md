# Policy Engine & Hooks

Die Policy Engine ist die Durchsetzungsschicht, die zwischen dem LLM und der Aussenwelt sitzt. Sie faengt jede Aktion an kritischen Punkten im Datenfluss ab und trifft deterministische ALLOW-, BLOCK- oder REDACT-Entscheidungen. Das LLM kann diese Entscheidungen nicht umgehen, modifizieren oder beeinflussen.

## Kernprinzip: Durchsetzung unterhalb des LLM

<img src="/diagrams/policy-enforcement-layers.svg" alt="Policy-Durchsetzungsschichten: LLM sitzt oberhalb der Policy-Schicht, die oberhalb der Ausfuehrungsschicht sitzt" style="max-width: 100%;" />

::: warning SICHERHEIT Das LLM sitzt oberhalb der Policy-Schicht. Es kann durch Prompt-Injection manipuliert, jailbroken oder beeinflusst werden -- und es spielt keine Rolle. Die Policy-Schicht ist reiner Code, der unterhalb des LLM laeuft, strukturierte Aktionsanfragen untersucht und binaere Entscheidungen basierend auf Klassifizierungsregeln trifft. Es gibt keinen Pfad von der LLM-Ausgabe zur Hook-Umgehung. :::

## Hook-Typen

Acht Durchsetzungs-Hooks fangen Aktionen an jedem kritischen Punkt im Datenfluss ab.

### Hook-Architektur

<img src="/diagrams/hook-chain-flow.svg" alt="Hook-Ketten-Fluss: PRE_CONTEXT_INJECTION → LLM-Kontext → PRE_TOOL_CALL → Tool-Ausfuehrung → POST_TOOL_RESPONSE → LLM-Antwort → PRE_OUTPUT → Ausgabekanal" style="max-width: 100%;" />

### Alle Hook-Typen

| Hook                    | Ausloeser                          | Hauptaktionen                                                          | Fehlermodus              |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------------------- | ------------------------ |
| `PRE_CONTEXT_INJECTION` | Externe Eingabe tritt in Kontext ein | Eingabe klassifizieren, Taint zuweisen, Lineage erstellen, auf Injection scannen | Eingabe ablehnen     |
| `PRE_TOOL_CALL`         | LLM fordert Tool-Ausfuehrung an   | Berechtigungspruefung, Ratenbegrenzung, Parametervalidierung           | Tool-Aufruf blockieren   |
| `POST_TOOL_RESPONSE`    | Tool gibt Daten zurueck           | Antwort klassifizieren, Session-Taint aktualisieren, Lineage erstellen/aktualisieren | Schwärzen oder blockieren |
| `PRE_OUTPUT`            | Antwort verlaesst das System      | Finale Klassifizierungspruefung gegen Ziel, PII-Scan                   | Ausgabe blockieren       |
| `SECRET_ACCESS`         | Plugin fordert Anmeldedaten an    | Zugriff protokollieren, Berechtigung gegen deklarierten Scope pruefen  | Anmeldedaten verweigern  |
| `SESSION_RESET`         | Benutzer fordert Taint-Reset an   | Lineage archivieren, Kontext loeschen, Bestaetigung pruefen            | Bestaetigung erforderlich |
| `AGENT_INVOCATION`      | Agent ruft anderen Agenten auf    | Delegationskette pruefen, Taint-Obergrenze durchsetzen                 | Aufruf blockieren        |
| `MCP_TOOL_CALL`         | MCP-Server-Tool aufgerufen        | Gateway-Policy-Pruefung (Serverstatus, Tool-Berechtigungen, Schema)    | MCP-Aufruf blockieren    |

## Hook-Schnittstelle

Jeder Hook empfaengt einen Kontext und gibt ein Ergebnis zurueck. Der Handler ist eine synchrone, reine Funktion.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hook-spezifischer Payload variiert je nach Typ
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` ist synchron und gibt `HookResult` direkt zurueck -- kein Promise. Dies ist beabsichtigt. Hooks muessen abgeschlossen sein, bevor die Aktion fortgesetzt wird, und sie synchron zu machen eliminiert jede Moeglichkeit einer asynchronen Umgehung. Wenn ein Hook ein Timeout erreicht, wird die Aktion abgelehnt. :::

## Hook-Garantien

Jede Hook-Ausfuehrung traegt vier Invarianten:

| Garantie              | Was es bedeutet                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Deterministisch**   | Gleiche Eingabe erzeugt immer gleiche Entscheidung. Keine Zufaelligkeit. Keine LLM-Aufrufe innerhalb von Hooks. Keine externen API-Aufrufe, die Entscheidungen beeinflussen. |
| **Synchron**          | Hooks werden abgeschlossen, bevor die Aktion fortgesetzt wird. Keine asynchrone Umgehung moeglich. Timeout bedeutet Ablehnung.                   |
| **Protokolliert**     | Jede Hook-Ausfuehrung wird aufgezeichnet: Eingabeparameter, getroffene Entscheidung, Zeitstempel und ausgewertete Policy-Regeln.                 |
| **Unfaelschbar**      | LLM-Ausgabe kann keine Hook-Umgehungsanweisungen enthalten. Die Hook-Schicht hat keine "LLM-Ausgabe nach Befehlen parsen"-Logik.                 |

## Policy-Regelhierarchie

Policy-Regeln sind in drei Stufen organisiert. Hoehere Stufen koennen niedrigere Stufen nicht ueberschreiben.

### Feste Regeln (immer durchgesetzt, NICHT konfigurierbar)

Diese Regeln sind hartcodiert und koennen von keinem Administrator, Benutzer oder durch Konfiguration deaktiviert werden:

- **Kein Write-Down**: Klassifizierungsfluss ist unidirektional. Daten koennen nicht zu einer niedrigeren Stufe fliessen.
- **UNTRUSTED-Kanaele**: Keine Daten rein oder raus. Punkt.
- **Session-Taint**: Einmal erhoeht, bleibt er fuer die gesamte Session-Lebensdauer erhoeht.
- **Audit-Logging**: Alle Aktionen werden protokolliert. Keine Ausnahmen. Keine Moeglichkeit zur Deaktivierung.

### Konfigurierbare Regeln (administrativ anpassbar)

Administratoren koennen diese ueber die Benutzeroberflaeche oder Konfigurationsdateien anpassen:

- Standard-Klassifizierungen fuer Integrationen (z.B. Salesforce standardmaessig `CONFIDENTIAL`)
- Kanal-Klassifizierungen
- Aktions-Erlaubt-/Sperrlisten pro Integration
- Domain-Allowlists fuer externe Kommunikation
- Ratenbegrenzungen pro Tool, pro Benutzer oder pro Session

### Deklarative Ausnahme (Enterprise)

Enterprise-Bereitstellungen koennen benutzerdefinierte Policy-Regeln in strukturiertem YAML fuer erweiterte Szenarien definieren:

```yaml
# Salesforce-Abfragen mit SSN-Mustern blockieren
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN GESCHWAERZT]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# Genehmigung fuer hochwertige Transaktionen erforderlich
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# Zeitbasierte Einschraenkung: keine externen Sendungen ausserhalb der Geschaeftszeiten
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "Externe Kommunikation ausserhalb der Geschaeftszeiten eingeschraenkt"
```

::: tip Benutzerdefinierte YAML-Regeln muessen vor der Aktivierung die Validierung bestehen. Ungueltige Regeln werden zum Konfigurationszeitpunkt abgelehnt, nicht zur Laufzeit. Dies verhindert, dass Fehlkonfigurationen Sicherheitsluecken erzeugen. :::

## Ablehnungs-Benutzererlebnis

Wenn die Policy Engine eine Aktion blockiert, sieht der Benutzer eine klare Erklaerung -- keinen generischen Fehler.

**Standard (spezifisch):**

```
Ich kann keine vertraulichen Daten an einen oeffentlichen Kanal senden.

  -> Session zuruecksetzen und Nachricht senden
  -> Abbrechen
```

**Opt-in (lehrreich):**

```
Ich kann keine vertraulichen Daten an einen oeffentlichen Kanal senden.

Warum: Diese Session hat auf Salesforce (CONFIDENTIAL) zugegriffen.
Persoenliches WhatsApp ist als PUBLIC klassifiziert.
Daten koennen nur zu gleicher oder hoeherer Klassifizierung fliessen.

Optionen:
  -> Session zuruecksetzen und Nachricht senden
  -> Ihren Administrator bitten, den WhatsApp-Kanal umzuklassifizieren
  -> Mehr erfahren: [Doku-Link]
```

Der lehrreiche Modus ist Opt-in und hilft Benutzern zu verstehen, _warum_ eine Aktion blockiert wurde, einschliesslich welche Datenquelle die Taint-Eskalation verursacht hat und worin die Klassifizierungsabweichung besteht. Beide Modi bieten umsetzbare naechste Schritte statt Sackgassen-Fehler.

## Wie Hooks verketten

In einem typischen Anfrage-/Antwortzyklus werden mehrere Hooks nacheinander ausgeloest. Jeder Hook hat volle Einsicht in die Entscheidungen frueherer Hooks in der Kette.

```
Benutzer sendet: "Pruefe meine Salesforce-Pipeline und sende meiner Frau eine Nachricht"

1. PRE_CONTEXT_INJECTION
   - Eingabe vom Eigentuemer, klassifiziert als PUBLIC
   - Session-Taint: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - Tool erlaubt? JA
   - Benutzer hat Salesforce-Verbindung? JA
   - Ratenlimit? OK
   - Entscheidung: ALLOW

3. POST_TOOL_RESPONSE (Salesforce-Ergebnisse)
   - Daten klassifiziert: CONFIDENTIAL
   - Session-Taint eskaliert: PUBLIC -> CONFIDENTIAL
   - Lineage-Datensatz erstellt

4. PRE_TOOL_CALL (whatsapp.send_message)
   - Tool erlaubt? JA
   - Entscheidung: ALLOW (Tool-Pruefung bestanden)

5. PRE_OUTPUT (Nachricht an Frau ueber WhatsApp)
   - Session-Taint: CONFIDENTIAL
   - Effektive Zielklassifizierung: PUBLIC (externer Empfaenger)
   - CONFIDENTIAL -> PUBLIC: BLOCKIERT
   - Entscheidung: BLOCK
   - Grund: "classification_violation"

6. Agent praesentiert dem Benutzer Reset-Option
```
