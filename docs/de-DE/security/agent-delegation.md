# Agenten-Delegation

Da KI-Agenten zunehmend miteinander interagieren -- ein Agent ruft einen anderen auf, um Teilaufgaben zu erledigen -- entsteht eine neue Klasse von Sicherheitsrisiken. Eine Agentenkette koennte verwendet werden, um Daten ueber einen weniger eingeschraenkten Agenten zu waschen und so Klassifizierungskontrollen zu umgehen. Triggerfish verhindert dies mit kryptographischer Agenten-Identitaet, Klassifizierungsobergrenzen und verpflichtender Taint-Vererbung.

## Agenten-Zertifikate

Jeder Agent in Triggerfish hat ein Zertifikat, das seine Identitaet, Faehigkeiten und Delegationsberechtigungen definiert. Dieses Zertifikat ist vom Eigentuemer des Agenten signiert und kann weder vom Agenten selbst noch von anderen Agenten modifiziert werden.

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

Schluesselfelder im Zertifikat:

| Feld                   | Zweck                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | Die **Klassifizierungsobergrenze** -- die hoechste Taint-Stufe, auf der dieser Agent operieren kann. Ein Agent mit INTERNAL-Obergrenze kann nicht von einer mit CONFIDENTIAL getainteten Session aufgerufen werden. |
| `can_invoke_agents`    | Ob dieser Agent berechtigt ist, andere Agenten aufzurufen.                                                                                                                               |
| `can_be_invoked_by`    | Explizite Allowlist von Agenten, die diesen aufrufen duerfen.                                                                                                                           |
| `max_delegation_depth` | Maximale Tiefe der Agenten-Aufrufkette. Verhindert unbegrenzte Rekursion.                                                                                                               |
| `signature`            | Ed25519-Signatur vom Eigentuemer. Verhindert Zertifikat-Manipulation.                                                                                                                    |

## Aufruf-Ablauf

Wenn ein Agent einen anderen aufruft, verifiziert die Policy-Schicht die Delegation, bevor der aufgerufene Agent ausfuehrt. Die Pruefung ist deterministisch und laeuft im Code -- der aufrufende Agent kann die Entscheidung nicht beeinflussen.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Agenten-Delegationssequenz: Agent A ruft Agent B auf, Policy-Schicht verifiziert Taint vs. Obergrenze und blockiert, wenn Taint die Obergrenze uebersteigt" style="max-width: 100%;" />

In diesem Beispiel hat Agent A einen Session-Taint von CONFIDENTIAL (er hat frueher auf Salesforce-Daten zugegriffen). Agent B hat eine Klassifizierungsobergrenze von INTERNAL. Da CONFIDENTIAL hoeher als INTERNAL ist, wird der Aufruf blockiert. Agent As getaintete Daten koennen nicht an einen Agenten mit niedrigerer Klassifizierungsobergrenze fliessen.

::: warning SICHERHEIT Die Policy-Schicht prueft den **aktuellen Session-Taint** des Aufrufers, nicht seine Obergrenze. Selbst wenn Agent A eine CONFIDENTIAL-Obergrenze hat, zaehlt die tatsaechliche Taint-Stufe der Session zum Zeitpunkt des Aufrufs. Wenn Agent A auf keine klassifizierten Daten zugegriffen hat (Taint ist PUBLIC), kann er Agent B (INTERNAL-Obergrenze) problemlos aufrufen. :::

## Delegationsketten-Tracking

Wenn Agenten andere Agenten aufrufen, wird die vollstaendige Kette mit Zeitstempeln und Taint-Stufen bei jedem Schritt verfolgt:

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Sales Assistant",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Q4-Pipeline zusammenfassen"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Data Analyst",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Erfolgsraten berechnen"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

Diese Kette wird im Audit-Log aufgezeichnet und kann fuer Compliance und forensische Analyse abgefragt werden. Sie koennen genau nachvollziehen, welche Agenten beteiligt waren, welche Taint-Stufen sie hatten und welche Aufgaben sie ausgefuehrt haben.

## Sicherheitsinvarianten

Vier Invarianten regeln die Agenten-Delegation. Alle werden durch Code in der Policy-Schicht durchgesetzt und koennen von keinem Agenten in der Kette ueberschrieben werden.

| Invariante                         | Durchsetzung                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Taint steigt nur**               | Jeder Aufgerufene erbt `max(eigener Taint, Aufrufer-Taint)`. Ein Aufgerufener kann nie einen niedrigeren Taint als sein Aufrufer haben.  |
| **Obergrenze respektiert**         | Ein Agent kann nicht aufgerufen werden, wenn der Taint des Aufrufers die `max_classification`-Obergrenze des Aufgerufenen uebersteigt.   |
| **Tiefenlimits durchgesetzt**      | Die Kette endet bei `max_delegation_depth`. Wenn das Limit 3 ist, wird ein Aufruf auf vierter Ebene blockiert.                           |
| **Zirkulaere Aufrufe blockiert**   | Ein Agent kann nicht zweimal in derselben Kette erscheinen. Wenn Agent A Agent B aufruft, der versucht, Agent A aufzurufen, wird der zweite Aufruf blockiert. |

### Taint-Vererbung im Detail

Wenn Agent A (Taint: CONFIDENTIAL) erfolgreich Agent B aufruft (Obergrenze: CONFIDENTIAL), startet Agent B mit einem Taint von CONFIDENTIAL -- geerbt von Agent A. Wenn Agent B dann auf RESTRICTED-Daten zugreift, eskaliert sein Taint zu RESTRICTED. Dieser erhoehte Taint wird nach Abschluss des Aufrufs zu Agent A zurueckgetragen.

<img src="/diagrams/taint-inheritance.svg" alt="Taint-Vererbung: Agent A (INTERNAL) ruft Agent B auf, B erbt Taint, greift auf Salesforce (CONFIDENTIAL) zu, gibt erhoehten Taint an A zurueck" style="max-width: 100%;" />

Taint fliesst in beide Richtungen -- vom Aufrufer zum Aufgerufenen beim Aufruf und vom Aufgerufenen zurueck zum Aufrufer bei Abschluss. Er kann nur eskalieren.

## Datenwaesche verhindern

Ein zentraler Angriffsvektor in Multi-Agent-Systemen ist **Datenwaesche** -- die Verwendung einer Agentenkette, um klassifizierte Daten an ein Ziel mit niedrigerer Klassifizierung zu verschieben, indem sie ueber zwischengeschaltete Agenten geleitet werden.

### Der Angriff

```
Angreiferziel: CONFIDENTIAL-Daten ueber einen PUBLIC-Kanal exfiltrieren

Versuchter Ablauf:
1. Agent A greift auf Salesforce zu (Taint --> CONFIDENTIAL)
2. Agent A ruft Agent B auf (der einen PUBLIC-Kanal hat)
3. Agent B sendet Daten an den PUBLIC-Kanal
```

### Warum er fehlschlaegt

Triggerfish blockiert diesen Angriff an mehreren Punkten:

**Blockpunkt 1: Aufrufpruefung.** Wenn Agent B eine Obergrenze unter CONFIDENTIAL hat, wird der Aufruf sofort blockiert. Agent As Taint (CONFIDENTIAL) uebersteigt Agent Bs Obergrenze.

**Blockpunkt 2: Taint-Vererbung.** Selbst wenn Agent B eine CONFIDENTIAL-Obergrenze hat und der Aufruf erfolgreich ist, erbt Agent B den CONFIDENTIAL-Taint von Agent A. Wenn Agent B versucht, an einen PUBLIC-Kanal auszugeben, blockiert der `PRE_OUTPUT`-Hook den Write-Down.

**Blockpunkt 3: Kein Taint-Reset in Delegation.** Agenten in einer Delegationskette koennen ihren Taint nicht zuruecksetzen. Taint-Reset ist nur fuer den Endbenutzer verfuegbar und loescht den gesamten Gespraechsverlauf. Es gibt keinen Mechanismus fuer einen Agenten, seine Taint-Stufe waehrend einer Kette zu "waschen".

::: danger Daten koennen ihrer Klassifizierung nicht durch Agenten-Delegation entkommen. Die Kombination aus Obergrenzen-Pruefungen, verpflichtender Taint-Vererbung und Kein-Taint-Reset-in-Ketten macht Datenwaesche durch Agentenketten im Triggerfish-Sicherheitsmodell unmoeglich. :::

## Beispielszenarien

### Szenario 1: Erfolgreiche Delegation

```
Agent A (Obergrenze: CONFIDENTIAL, aktueller Taint: INTERNAL)
  ruft Agent B auf (Obergrenze: CONFIDENTIAL)

Policy-Pruefung:
  - A darf B aufrufen? JA (B ist in As Delegationsliste)
  - As Taint (INTERNAL) <= Bs Obergrenze (CONFIDENTIAL)? JA
  - Tiefenlimit OK? JA (Tiefe 1 von max 3)
  - Zirkulaer? NEIN

Ergebnis: ERLAUBT
Agent B startet mit Taint: INTERNAL (geerbt von A)
```

### Szenario 2: Blockiert durch Obergrenze

```
Agent A (Obergrenze: RESTRICTED, aktueller Taint: CONFIDENTIAL)
  ruft Agent B auf (Obergrenze: INTERNAL)

Policy-Pruefung:
  - As Taint (CONFIDENTIAL) <= Bs Obergrenze (INTERNAL)? NEIN

Ergebnis: BLOCKIERT
Grund: Agent-B-Obergrenze (INTERNAL) unter Session-Taint (CONFIDENTIAL)
```

### Szenario 3: Blockiert durch Tiefenlimit

```
Agent A ruft Agent B auf (Tiefe 1)
  Agent B ruft Agent C auf (Tiefe 2)
    Agent C ruft Agent D auf (Tiefe 3)
      Agent D ruft Agent E auf (Tiefe 4)

Policy-Pruefung fuer Agent E:
  - Tiefe 4 > max_delegation_depth (3)

Ergebnis: BLOCKIERT
Grund: Maximale Delegationstiefe ueberschritten
```

### Szenario 4: Blockiert durch zirkulaere Referenz

```
Agent A ruft Agent B auf (Tiefe 1)
  Agent B ruft Agent C auf (Tiefe 2)
    Agent C ruft Agent A auf (Tiefe 3)

Policy-Pruefung fuer den zweiten Agent-A-Aufruf:
  - Agent A erscheint bereits in der Kette

Ergebnis: BLOCKIERT
Grund: Zirkulaerer Agenten-Aufruf erkannt
```

## Verwandte Seiten

- [Sicherheit als Grundprinzip](./) -- Ueberblick ueber die Sicherheitsarchitektur
- [No-Write-Down-Regel](./no-write-down) -- Die Klassifizierungsflussregel, die die Delegation durchsetzt
- [Identitaet & Authentifizierung](./identity) -- Wie Benutzer- und Kanalidentitaet festgestellt wird
- [Audit & Compliance](./audit-logging) -- Wie Delegationsketten im Audit-Log aufgezeichnet werden
