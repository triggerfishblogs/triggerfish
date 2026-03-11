# CLI-Kanal

Die Befehlszeilenschnittstelle ist der Standardkanal in Triggerfish. Sie ist immer verfuegbar, erfordert keine externe Einrichtung und ist die primaere Art, wie Sie waehrend der Entwicklung und bei lokaler Nutzung mit Ihrem Agenten interagieren.

## Klassifizierung

Der CLI-Kanal hat standardmaessig die Klassifizierung `INTERNAL`. Der Terminal-Benutzer wird **immer** als Eigentuemer behandelt -- es gibt keinen Pairing- oder Authentifizierungsflow, weil Sie den Prozess direkt auf Ihrem Rechner ausfuehren.

::: info Warum INTERNAL? Die CLI ist eine direkte, lokale Schnittstelle. Nur jemand mit Zugang zu Ihrem Terminal kann sie nutzen. Das macht `INTERNAL` zum angemessenen Standard -- Ihr Agent kann in diesem Kontext interne Daten frei teilen. :::

## Funktionen

### Rohe Terminal-Eingabe

Die CLI verwendet den rohen Terminal-Modus mit vollstaendigem ANSI-Escape-Sequence-Parsing. Dies gibt Ihnen eine reichhaltige Bearbeitungserfahrung direkt in Ihrem Terminal:

- **Zeilenbearbeitung** -- Navigieren mit Pfeiltasten, Pos1/Ende, Woerter loeschen mit Strg+W
- **Eingabeverlauf** -- Hoch/Runter druecken, um durch vorherige Eingaben zu blaettern
- **Vorschlaege** -- Tab-Vervollstaendigung fuer gaengige Befehle
- **Mehrzeilige Eingabe** -- Laengere Prompts natuerlich eingeben

### Kompakte Tool-Anzeige

Wenn der Agent Tools aufruft, zeigt die CLI standardmaessig eine kompakte einzeilige Zusammenfassung:

```
tool_name arg  result
```

Wechseln Sie mit **Strg+O** zwischen kompakter und erweiterter Tool-Ausgabe.

### Laufende Operationen unterbrechen

Druecken Sie **ESC**, um die aktuelle Operation zu unterbrechen. Dies sendet ein Abbruchsignal durch den Orchestrator zum LLM-Anbieter und stoppt die Generierung sofort. Sie muessen nicht auf eine lange Antwort warten.

### Taint-Anzeige

Sie koennen optional die aktuelle Session-Taint-Stufe in der Ausgabe anzeigen, indem Sie `showTaint` in der CLI-Kanal-Konfiguration aktivieren. Dies stellt die Klassifizierungsstufe jeder Antwort voran:

```
[CONFIDENTIAL] Hier sind Ihre Q4-Pipeline-Zahlen...
```

### Kontextlaengen-Fortschrittsbalken

Die CLI zeigt einen Echtzeit-Kontextfenster-Nutzungsbalken in der Trennlinie am unteren Rand des Terminals:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- Der Balken fuellt sich, waehrend Kontext-Token verbraucht werden
- Eine blaue Markierung erscheint bei der 70%-Schwelle (wo automatische Komprimierung ausgeloest wird)
- Der Balken wird rot, wenn er sich dem Limit naehert
- Nach Komprimierung (`/compact` oder automatisch) wird der Balken zurueckgesetzt

### MCP-Server-Status

Die Trennlinie zeigt auch den MCP-Server-Verbindungsstatus:

| Anzeige            | Bedeutung                                  |
| ------------------ | ------------------------------------------ |
| `MCP 3/3` (gruen)  | Alle konfigurierten Server verbunden       |
| `MCP 2/3` (gelb)   | Einige Server verbinden noch oder fehlgeschlagen |
| `MCP 0/3` (rot)    | Keine Server verbunden                     |

MCP-Server verbinden sich nach dem Start lazy im Hintergrund. Der Status wird in Echtzeit aktualisiert, waehrend Server online gehen.

## Eingabeverlauf

Ihr Eingabeverlauf wird sitzungsuebergreifend gespeichert unter:

```
~/.triggerfish/data/input_history.json
```

Der Verlauf wird beim Start geladen und nach jeder Eingabe gespeichert. Sie koennen ihn durch Loeschen der Datei zuruecksetzen.

## Nicht-TTY / Weitergeleitete Eingabe

Wenn stdin kein TTY ist (zum Beispiel bei weitergeleiteter Eingabe von einem anderen Prozess), wechselt die CLI automatisch in den **zeilengepufferten Modus**. In diesem Modus:

- Rohe Terminal-Funktionen (Pfeiltasten, Verlaufsnavigation) sind deaktiviert
- Eingabe wird Zeile fuer Zeile von stdin gelesen
- Ausgabe wird ohne ANSI-Formatierung auf stdout geschrieben

Dies ermoeglicht Ihnen, Interaktionen mit Ihrem Agenten zu skripten:

```bash
echo "Wie ist das Wetter heute?" | triggerfish run
```

## Konfiguration

Der CLI-Kanal erfordert minimale Konfiguration. Er wird automatisch erstellt, wenn Sie `triggerfish run` ausfuehren oder die interaktive REPL verwenden.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Option        | Typ     | Standard | Beschreibung                             |
| ------------- | ------- | -------- | ---------------------------------------- |
| `interactive` | boolean | `true`   | Interaktiven REPL-Modus aktivieren       |
| `showTaint`   | boolean | `false`  | Session-Taint-Stufe in der Ausgabe zeigen |

::: tip Keine Einrichtung erforderlich Der CLI-Kanal funktioniert sofort. Sie muessen nichts konfigurieren, um Triggerfish von Ihrem Terminal aus zu nutzen. :::

## Tastaturkuerzel

| Kuerzel    | Aktion                                                          |
| ---------- | --------------------------------------------------------------- |
| Enter      | Nachricht senden                                                |
| Hoch/Runter| Im Eingabeverlauf navigieren                                    |
| Strg+V     | Bild aus Zwischenablage einfuegen (als multimodaler Inhalt gesendet) |
| Strg+O     | Kompakte/erweiterte Tool-Anzeige umschalten                     |
| ESC        | Aktuelle Operation unterbrechen                                 |
| Strg+C     | CLI beenden                                                     |
| Strg+W     | Vorheriges Wort loeschen                                        |
| Pos1/Ende  | An Zeilenanfang/-ende springen                                  |
