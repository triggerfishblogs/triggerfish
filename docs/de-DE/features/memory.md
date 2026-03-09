# Persistenter Speicher

Triggerfish-Agenten haben persistenten session-uebergreifenden Speicher. Der Agent kann Fakten, Praeferenzen und Kontext speichern, die ueber Gespraeche, Neustarts und sogar Trigger-Wakeups hinweg erhalten bleiben. Der Speicher ist klassifizierungsgesteuert -- der Agent kann nicht ueber seine Session-Taint-Stufe hinaus lesen oder darunter schreiben.

## Tools

### `memory_save`

Speichern Sie einen Fakt oder eine Information im persistenten Speicher.

| Parameter | Typ    | Erforderlich | Beschreibung                                                         |
| --------- | ------ | ------------ | -------------------------------------------------------------------- |
| `key`     | string | ja           | Eindeutige Kennung (z.B. `user-name`, `project-deadline`)            |
| `content` | string | ja           | Der zu merkende Inhalt                                               |
| `tags`    | array  | nein         | Tags zur Kategorisierung (z.B. `["personal", "preference"]`)         |

Die Klassifizierung wird **automatisch** auf die aktuelle Taint-Stufe der Session gesetzt. Der Agent kann nicht waehlen, auf welcher Stufe ein Speichereintrag abgelegt wird.

### `memory_get`

Rufen Sie einen bestimmten Speichereintrag anhand seines Schluessels ab.

| Parameter | Typ    | Erforderlich | Beschreibung                                 |
| --------- | ------ | ------------ | -------------------------------------------- |
| `key`     | string | ja           | Der Schluessel des abzurufenden Eintrags      |

Gibt den Speicherinhalt zurueck, wenn er existiert und auf der aktuellen Sicherheitsstufe zugaenglich ist. Hoeher klassifizierte Versionen ueberdecken niedrigere.

### `memory_search`

Durchsuchen Sie alle zugaenglichen Speichereintraege mit natuerlicher Sprache.

| Parameter     | Typ    | Erforderlich | Beschreibung                        |
| ------------- | ------ | ------------ | ----------------------------------- |
| `query`       | string | ja           | Suchabfrage in natuerlicher Sprache |
| `max_results` | number | nein         | Maximale Ergebnisse (Standard: 10)  |

Verwendet SQLite FTS5 Volltextsuche mit Stemming. Ergebnisse werden nach der aktuellen Sicherheitsstufe der Session gefiltert.

### `memory_list`

Listen Sie alle zugaenglichen Speichereintraege auf, optional nach Tag gefiltert.

| Parameter | Typ    | Erforderlich | Beschreibung       |
| --------- | ------ | ------------ | ------------------ |
| `tag`     | string | nein         | Tag zum Filtern    |

### `memory_delete`

Loeschen Sie einen Speichereintrag nach Schluessel. Der Datensatz wird weich geloescht (ausgeblendet, aber fuer das Audit aufbewahrt).

| Parameter | Typ    | Erforderlich | Beschreibung                                |
| --------- | ------ | ------------ | ------------------------------------------- |
| `key`     | string | ja           | Der Schluessel des zu loeschenden Eintrags   |

Kann nur Speichereintraege auf der aktuellen Sicherheitsstufe der Session loeschen.

## Wie der Speicher funktioniert

### Auto-Extraktion

Der Agent speichert proaktiv wichtige Fakten, die der Benutzer teilt -- persoenliche Details, Projektkontext, Praeferenzen -- mit beschreibenden Schluesseln. Dies ist Prompt-Level-Verhalten, gesteuert durch SPINE.md. Das LLM waehlt **was** gespeichert wird; die Policy-Schicht erzwingt **auf welcher Stufe**.

### Klassifizierungs-Gating

Jeder Speicherdatensatz traegt eine Klassifizierungsstufe, die dem Session-Taint zum Zeitpunkt des Speicherns entspricht:

- Ein waehrend einer `CONFIDENTIAL`-Session gespeicherter Eintrag wird als `CONFIDENTIAL` klassifiziert
- Eine `PUBLIC`-Session kann keine `CONFIDENTIAL`-Speichereintraege lesen
- Eine `CONFIDENTIAL`-Session kann sowohl `CONFIDENTIAL`- als auch `PUBLIC`-Eintraege lesen

Dies wird durch `canFlowTo`-Pruefungen bei jedem Lesevorgang durchgesetzt. Das LLM kann dies nicht umgehen.

### Speicher-Shadowing

Wenn derselbe Schluessel auf mehreren Klassifizierungsstufen existiert, wird nur die am hoechsten klassifizierte Version zurueckgegeben, die fuer die aktuelle Session sichtbar ist. Dies verhindert Informationslecks ueber Klassifizierungsgrenzen hinweg.

**Beispiel:** Wenn `user-name` sowohl auf `PUBLIC` (gesetzt waehrend eines oeffentlichen Chats) als auch auf `INTERNAL` (aktualisiert waehrend einer privaten Session) existiert, sieht eine `INTERNAL`-Session die `INTERNAL`-Version, waehrend eine `PUBLIC`-Session nur die `PUBLIC`-Version sieht.

### Speicherung

Speichereintraege werden ueber die `StorageProvider`-Schnittstelle gespeichert (dieselbe Abstraktion, die fuer Sessions, Cron-Jobs und Todos verwendet wird). Die Volltextsuche verwendet SQLite FTS5 fuer schnelle natuerlichsprachige Abfragen mit Stemming.

## Sicherheit

- Die Klassifizierung wird immer auf `session.taint` im `PRE_TOOL_CALL`-Hook erzwungen -- das LLM kann keine niedrigere Klassifizierung waehlen
- Alle Lesevorgaenge werden nach `canFlowTo` gefiltert -- kein Speichereintrag oberhalb des Session-Taints wird jemals zurueckgegeben
- Loeschungen sind Weich-Loeschungen -- der Datensatz wird ausgeblendet, aber fuer das Audit aufbewahrt
- Der Agent kann die Speicher-Klassifizierung nicht eskalieren, indem er hoch klassifizierte Daten liest und auf niedrigerer Stufe erneut speichert (Write-Down-Praevention gilt)

::: warning SICHERHEIT Das LLM waehlt niemals die Speicher-Klassifizierung. Sie wird immer auf die aktuelle Taint-Stufe der Session durch die Policy-Schicht erzwungen. Dies ist eine feste Grenze, die nicht wegkonfiguriert werden kann. :::
