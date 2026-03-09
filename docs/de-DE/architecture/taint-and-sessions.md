# Sessions & Taint

Sessions sind die fundamentale Einheit des Gespraechszustands in Triggerfish. Jede Session verfolgt unabhaengig eine **Taint-Stufe** -- ein Klassifizierungswasserzeichen, das die hoechste Sensibilitaet der waehrend der Session abgerufenen Daten aufzeichnet. Taint treibt die Ausgabeentscheidungen der Policy Engine: Wenn eine Session mit `CONFIDENTIAL` getaintet ist, koennen keine Daten aus dieser Session an einen Kanal fliessen, der unterhalb von `CONFIDENTIAL` klassifiziert ist.

## Session-Taint-Modell

### Wie Taint funktioniert

Wenn eine Session auf Daten einer Klassifizierungsstufe zugreift, wird die gesamte Session auf dieser Stufe **getaintet**. Taint folgt drei Regeln:

1. **Pro Gespraech**: Jede Session hat ihre eigene unabhaengige Taint-Stufe
2. **Nur Eskalation**: Taint kann innerhalb einer Session steigen, aber niemals sinken
3. **Vollstaendiger Reset loescht alles**: Taint UND Gespraechsverlauf werden zusammen geloescht

<img src="/diagrams/taint-escalation.svg" alt="Taint-Eskalation: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint kann nur eskalieren, niemals sinken." style="max-width: 100%;" />

::: warning SICHERHEIT Taint kann niemals selektiv reduziert werden. Es gibt keinen Mechanismus, eine Session zu "enttainten", ohne den gesamten Gespraechsverlauf zu loeschen. Dies verhindert Kontextlecks -- wenn die Session das Sehen vertraulicher Daten in Erinnerung hat, muss der Taint dies widerspiegeln. :::

### Warum Taint nicht sinken kann

Selbst wenn die klassifizierten Daten nicht mehr angezeigt werden, enthaelt das Kontextfenster des LLM sie weiterhin. Das Modell kann klassifizierte Informationen in zukuenftigen Antworten referenzieren, zusammenfassen oder wiedergeben. Der einzig sichere Weg, den Taint zu senken, ist die vollstaendige Eliminierung des Kontexts -- und genau das tut ein vollstaendiger Reset.

## Session-Typen

Triggerfish verwaltet mehrere Session-Typen, jeder mit unabhaengigem Taint-Tracking:

| Session-Typ      | Beschreibung                                          | Initialer Taint | Ueberlebt Neustarts    |
| ---------------- | ----------------------------------------------------- | --------------- | ---------------------- |
| **Haupt**        | Primaeres direktes Gespraech mit dem Eigentuemer      | `PUBLIC`        | Ja                     |
| **Kanal**        | Einer pro verbundenem Kanal (Telegram, Slack usw.)    | `PUBLIC`        | Ja                     |
| **Hintergrund**  | Erstellt fuer autonome Aufgaben (Cron, Webhooks)      | `PUBLIC`        | Dauer der Aufgabe      |
| **Agent**        | Pro-Agent-Sessions fuer Multi-Agent-Routing           | `PUBLIC`        | Ja                     |
| **Gruppe**       | Gruppenchat-Sessions                                  | `PUBLIC`        | Ja                     |

::: info Hintergrund-Sessions starten immer mit `PUBLIC`-Taint, unabhaengig von der Taint-Stufe der uebergeordneten Session. Dies ist beabsichtigt -- Cron-Jobs und Webhook-ausgeloeste Aufgaben sollten nicht den Taint der Session erben, die sie zufaellig gestartet hat. :::

## Beispiel fuer Taint-Eskalation

Hier ist ein vollstaendiger Ablauf, der Taint-Eskalation und die resultierende Policy-Blockierung zeigt:

<img src="/diagrams/taint-with-blocks.svg" alt="Taint-Eskalations-Beispiel: Session startet PUBLIC, eskaliert zu CONFIDENTIAL nach Salesforce-Zugriff, BLOCKIERT dann Ausgabe an PUBLIC WhatsApp-Kanal" style="max-width: 100%;" />

## Vollstaendiger Reset-Mechanismus

Ein Session-Reset ist der einzige Weg, den Taint zu senken. Es ist eine bewusste, destruktive Operation:

1. **Lineage-Datensaetze archivieren** -- Alle Lineage-Daten der Session werden im Audit-Speicher aufbewahrt
2. **Gespraechsverlauf loeschen** -- Das gesamte Kontextfenster wird geloescht
3. **Taint auf PUBLIC zuruecksetzen** -- Die Session startet frisch
4. **Benutzerbestaetigung erforderlich** -- Der `SESSION_RESET`-Hook erfordert eine explizite Bestaetigung vor der Ausfuehrung

Nach einem Reset ist die Session nicht von einer brandneuen Session zu unterscheiden. Der Agent hat keine Erinnerung an das vorherige Gespraech. Dies ist der einzige Weg, um sicherzustellen, dass klassifizierte Daten nicht durch den Kontext des LLM lecken koennen.

## Inter-Session-Kommunikation

Wenn ein Agent Daten zwischen Sessions mit `sessions_send` sendet, gelten dieselben Write-Down-Regeln:

| Quell-Session-Taint | Ziel-Session-Kanal     | Entscheidung |
| -------------------- | ---------------------- | ------------ |
| `PUBLIC`             | `PUBLIC`-Kanal         | ERLAUBT      |
| `CONFIDENTIAL`       | `CONFIDENTIAL`-Kanal   | ERLAUBT      |
| `CONFIDENTIAL`       | `PUBLIC`-Kanal         | BLOCKIERT    |
| `RESTRICTED`         | `CONFIDENTIAL`-Kanal   | BLOCKIERT    |

Session-Tools, die dem Agenten zur Verfuegung stehen:

| Tool               | Beschreibung                                     | Taint-Auswirkung                                  |
| ------------------ | ------------------------------------------------ | ------------------------------------------------- |
| `sessions_list`    | Aktive Sessions mit Filtern auflisten            | Keine Taint-Aenderung                             |
| `sessions_history` | Transkript fuer eine Session abrufen             | Taint erbt von referenzierter Session              |
| `sessions_send`    | Nachricht an eine andere Session senden          | Unterliegt Write-Down-Pruefung                     |
| `sessions_spawn`   | Hintergrund-Aufgaben-Session erstellen           | Neue Session startet mit `PUBLIC`                  |
| `session_status`   | Aktuellen Session-Zustand und Metadaten pruefen  | Keine Taint-Aenderung                             |

## Daten-Lineage

Jedes von Triggerfish verarbeitete Datenelement traegt **Herkunftsmetadaten** -- einen vollstaendigen Datensatz darueber, woher die Daten kamen, wie sie transformiert wurden und wohin sie gingen. Lineage ist der Audit-Trail, der Klassifizierungsentscheidungen ueberpruefbar macht.

### Lineage-Datensatz-Struktur

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Ausgewaehlte Felder: Name, Betrag, Phase",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM fasste 3 Datensaetze in Pipeline-Uebersicht zusammen",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### Lineage-Tracking-Regeln

| Ereignis                                | Lineage-Aktion                                         |
| --------------------------------------- | ------------------------------------------------------ |
| Daten von Integration gelesen           | Lineage-Datensatz mit Ursprung erstellen               |
| Daten durch LLM transformiert           | Transformation anhaengen, Eingabe-Lineages verknuepfen |
| Daten aus mehreren Quellen aggregiert   | Lineage zusammenfuehren, Klassifizierung = `max(Eingaben)` |
| Daten an Kanal gesendet                 | Ziel aufzeichnen, Klassifizierung verifizieren         |
| Session-Reset                           | Lineage-Datensaetze archivieren, aus Kontext loeschen  |

### Aggregations-Klassifizierung

Wenn Daten aus mehreren Quellen kombiniert werden (z.B. eine LLM-Zusammenfassung von Datensaetzen verschiedener Integrationen), erbt das aggregierte Ergebnis die **maximale Klassifizierung** aller Eingaben:

```
Eingabe 1: INTERNAL    (internes Wiki)
Eingabe 2: CONFIDENTIAL (Salesforce-Datensatz)
Eingabe 3: PUBLIC      (Wetter-API)

Klassifizierung der aggregierten Ausgabe: CONFIDENTIAL (Maximum der Eingaben)
```

::: tip Enterprise-Bereitstellungen koennen optionale Downgrade-Regeln fuer statistische Aggregate (Durchschnitte, Zaehler, Summen von 10+ Datensaetzen) oder zertifiziert anonymisierte Daten konfigurieren. Alle Downgrades erfordern explizite Policy-Regeln, werden mit vollstaendiger Begruendung protokolliert und unterliegen der Audit-Ueberpruefung. :::

### Audit-Faehigkeiten

Lineage ermoeglicht vier Kategorien von Audit-Abfragen:

- **Vorwaertsverfolgung**: "Was passierte mit den Daten aus Salesforce-Datensatz X?" -- folgt Daten vorwaerts vom Ursprung zu allen Zielen
- **Rueckwaertsverfolgung**: "Welche Quellen haben zu dieser Ausgabe beigetragen?" -- verfolgt eine Ausgabe zurueck zu allen Quelldatensaetzen
- **Klassifizierungsbegruendung**: "Warum ist dies als CONFIDENTIAL markiert?" -- zeigt die Klassifizierungsbegruendungskette
- **Compliance-Export**: Vollstaendige Aufbewahrungskette fuer rechtliche oder regulatorische Ueberpruefung

## Taint-Persistenz

Session-Taint wird ueber den `StorageProvider` unter dem Namensraum `taint:` persistiert. Das bedeutet, Taint ueberlebt Daemon-Neustarts -- eine Session, die vor einem Neustart `CONFIDENTIAL` war, ist auch danach noch `CONFIDENTIAL`.

Lineage-Datensaetze werden unter dem Namensraum `lineage:` mit Compliance-gesteuerter Aufbewahrung (Standard 90 Tage) persistiert.
