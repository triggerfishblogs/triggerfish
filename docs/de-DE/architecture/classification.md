# Klassifizierungssystem

Das Datenklassifizierungssystem ist die Grundlage des Sicherheitsmodells von Triggerfish. Jedes Datenelement, das in das System eintritt, sich durch es bewegt oder es verlaesst, traegt eine Klassifizierungskennzeichnung. Diese Kennzeichnungen bestimmen, wohin Daten fliessen koennen -- und wichtiger noch, wohin sie nicht fliessen koennen.

## Klassifizierungsstufen

Triggerfish verwendet eine einzige vierstufige geordnete Hierarchie fuer alle Bereitstellungen.

| Stufe          | Rang            | Beschreibung                                              | Beispiele                                                               |
| -------------- | --------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `RESTRICTED`   | 4 (hoechste)    | Sensibelste Daten, die maximalen Schutz erfordern         | M&A-Dokumente, Vorstandsmaterialien, PII, Bankkonten, Krankenakten      |
| `CONFIDENTIAL` | 3               | Geschaefts- oder personenbezogene sensible Informationen  | CRM-Daten, Finanzen, Personalakten, Vertraege, Steuerunterlagen         |
| `INTERNAL`     | 2               | Nicht fuer externe Weitergabe bestimmt                    | Interne Wikis, Teamdokumente, persoenliche Notizen, Kontakte            |
| `PUBLIC`       | 1 (niedrigste)  | Fuer jeden sicher einsehbar                               | Marketingmaterialien, oeffentliche Dokumentation, allgemeine Webinhalte |

## Die No-Write-Down-Regel

Die wichtigste Sicherheitsinvariante in Triggerfish:

::: danger Daten koennen nur zu Kanaelen oder Empfaengern mit **gleicher oder hoeherer** Klassifizierung fliessen. Dies ist eine **feste Regel** -- sie kann nicht konfiguriert, ueberschrieben oder deaktiviert werden. Das LLM kann diese Entscheidung nicht beeinflussen. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Klassifizierungshierarchie: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Daten fliessen nur aufwaerts." style="max-width: 100%;" />

Das bedeutet:

- Eine Antwort mit `CONFIDENTIAL`-Daten kann nicht an einen `PUBLIC`-Kanal gesendet werden
- Eine Session mit `RESTRICTED`-Taint kann nicht an einen Kanal unterhalb von `RESTRICTED` ausgeben
- Es gibt keinen Admin-Override, keine Enterprise-Ausnahme und keinen LLM-Workaround

## Effektive Klassifizierung

Kanaele und Empfaenger tragen beide Klassifizierungsstufen. Wenn Daten das System verlassen, bestimmt die **effektive Klassifizierung** des Ziels, was gesendet werden kann:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

Die effektive Klassifizierung ist die _niedrigere_ der beiden. Das bedeutet, dass ein hochklassifizierter Kanal mit einem niedrig klassifizierten Empfaenger dennoch als niedrig klassifiziert behandelt wird.

| Kanal          | Empfaenger | Effektiv       | Kann CONFIDENTIAL-Daten empfangen? |
| -------------- | ---------- | -------------- | ---------------------------------- |
| `INTERNAL`     | `INTERNAL` | `INTERNAL`     | Nein (CONFIDENTIAL > INTERNAL)     |
| `INTERNAL`     | `EXTERNAL` | `PUBLIC`       | Nein                               |
| `CONFIDENTIAL` | `INTERNAL` | `INTERNAL`     | Nein (CONFIDENTIAL > INTERNAL)     |
| `CONFIDENTIAL` | `EXTERNAL` | `PUBLIC`       | Nein                               |
| `RESTRICTED`   | `INTERNAL` | `INTERNAL`     | Nein (CONFIDENTIAL > INTERNAL)     |

## Kanal-Klassifizierungsregeln

Jeder Kanaltyp hat spezifische Regeln zur Bestimmung seiner Klassifizierungsstufe.

### E-Mail

- **Domain-Abgleich**: Nachrichten von `@firma.de` werden als `INTERNAL` klassifiziert
- Administratoren konfigurieren, welche Domains intern sind
- Unbekannte oder externe Domains werden standardmaessig als `EXTERNAL` behandelt
- Externe Empfaenger reduzieren die effektive Klassifizierung auf `PUBLIC`

### Slack / Teams

- **Workspace-Mitgliedschaft**: Mitglieder desselben Workspace/Mandanten sind `INTERNAL`
- Externe Slack-Connect-Benutzer werden als `EXTERNAL` klassifiziert
- Gastbenutzer werden als `EXTERNAL` klassifiziert
- Klassifizierung wird aus der Plattform-API abgeleitet, nicht aus der LLM-Interpretation

### WhatsApp / Telegram / iMessage

- **Enterprise**: Telefonnummern werden gegen die HR-Verzeichnissynchronisation abgeglichen, um intern vs. extern zu bestimmen
- **Persoenlich**: Alle Empfaenger werden standardmaessig als `EXTERNAL` behandelt
- Benutzer koennen vertrauenswuerdige Kontakte markieren, aber dies aendert nicht die Klassifizierungsberechnung -- es aendert die Empfaengerklassifizierung

### WebChat

- WebChat-Besucher werden immer als `PUBLIC` klassifiziert (Besucher werden nie als Eigentuemer verifiziert)
- WebChat ist fuer oeffentlich zugaengliche Interaktionen gedacht

### CLI

- Der CLI-Kanal laeuft lokal und wird basierend auf dem authentifizierten Benutzer klassifiziert
- Direkter Terminalzugang ist typischerweise `INTERNAL` oder hoeher

## Empfaenger-Klassifizierungsquellen

### Enterprise

- **Verzeichnissynchronisation** (Okta, Azure AD, Google Workspace) fuellt Empfaengerklassifizierungen automatisch
- Alle Verzeichnismitglieder werden als `INTERNAL` klassifiziert
- Externe Gaeste und Dienstleister werden als `EXTERNAL` klassifiziert
- Administratoren koennen pro Kontakt oder pro Domain ueberschreiben

### Persoenlich

- **Standard**: Alle Empfaenger sind `EXTERNAL`
- Benutzer klassifizieren vertrauenswuerdige Kontakte ueber In-Flow-Abfragen oder die Begleit-App um
- Umklassifizierungen sind explizit und werden protokolliert

## Kanalzustaende

Jeder Kanal durchlaeuft einen Zustandsautomaten, bevor er Daten transportieren kann:

<img src="/diagrams/state-machine.svg" alt="Kanal-Zustandsautomat: UNTRUSTED → CLASSIFIED oder BLOCKED" style="max-width: 100%;" />

| Zustand      | Kann Daten empfangen?       | Kann Daten in den Agentenkontext senden? | Beschreibung                                              |
| ------------ | :-------------------------: | :--------------------------------------: | --------------------------------------------------------- |
| `UNTRUSTED`  |            Nein             |                   Nein                   | Standard fuer neue/unbekannte Kanaele. Vollstaendig isoliert. |
| `CLASSIFIED` | Ja (innerhalb der Policy)   |        Ja (mit Klassifizierung)          | Ueberprueft und einer Klassifizierungsstufe zugewiesen.   |
| `BLOCKED`    |            Nein             |                   Nein                   | Explizit durch Administrator oder Benutzer gesperrt.      |

::: warning SICHERHEIT Neue Kanaele landen immer im Zustand `UNTRUSTED`. Sie koennen keine Daten vom Agenten empfangen und keine Daten in den Agentenkontext senden. Der Kanal bleibt vollstaendig isoliert, bis ein Administrator (Enterprise) oder der Benutzer (persoenlich) ihn explizit klassifiziert. :::

## Wie Klassifizierung mit anderen Systemen interagiert

Klassifizierung ist kein eigenstaendiges Feature -- sie treibt Entscheidungen ueber die gesamte Plattform:

| System                | Wie Klassifizierung verwendet wird                                           |
| --------------------- | ---------------------------------------------------------------------------- |
| **Session-Taint**     | Zugriff auf klassifizierte Daten eskaliert die Session auf diese Stufe       |
| **Policy Hooks**      | PRE_OUTPUT vergleicht Session-Taint mit der Zielklassifizierung              |
| **MCP Gateway**       | MCP-Server-Antworten tragen Klassifizierung, die die Session taintet        |
| **Daten-Lineage**     | Jeder Lineage-Eintrag enthaelt die Klassifizierungsstufe und den Grund      |
| **Benachrichtigungen**| Benachrichtigungsinhalte unterliegen denselben Klassifizierungsregeln        |
| **Agenten-Delegation**| Die Klassifizierungsobergrenze des aufgerufenen Agenten muss dem Taint des Aufrufers entsprechen |
| **Plugin-Sandbox**    | Das Plugin SDK klassifiziert alle ausgegebenen Daten automatisch             |
