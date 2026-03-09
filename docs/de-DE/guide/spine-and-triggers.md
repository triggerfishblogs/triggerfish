# SPINE und Trigger

Triggerfish verwendet zwei Markdown-Dateien, um das Verhalten Ihres Agenten zu definieren: **SPINE.md** steuert, wer Ihr Agent ist, und **TRIGGER.md** steuert, was Ihr Agent proaktiv tut. Beide sind freiformatiges Markdown -- Sie schreiben sie in einfacher Sprache.

## SPINE.md -- Agent-Identitaet

`SPINE.md` ist die Grundlage des System-Prompts Ihres Agenten. Sie definiert den Namen, die Persoenlichkeit, die Mission, die Wissensbereiche und die Grenzen des Agenten. Triggerfish laedt diese Datei jedes Mal, wenn es eine Nachricht verarbeitet, sodass Aenderungen sofort wirksam werden.

### Dateispeicherort

```
~/.triggerfish/SPINE.md
```

Fuer Multi-Agent-Setups hat jeder Agent seine eigene SPINE.md:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Erste Schritte

Der Einrichtungsassistent (`triggerfish dive`) generiert eine Starter-SPINE.md basierend auf Ihren Antworten. Sie koennen sie jederzeit frei bearbeiten -- es ist einfach Markdown.

### Eine effektive SPINE.md schreiben

Eine gute SPINE.md ist spezifisch. Je konkreter Sie die Rolle Ihres Agenten beschreiben, desto besser funktioniert er. Hier ist eine empfohlene Struktur:

```markdown
# Identitaet

Du bist Reef, ein persoenlicher KI-Assistent fuer Sarah.

# Mission

Hilf Sarah, organisiert, informiert und produktiv zu bleiben. Priorisiere
Kalender-Management, E-Mail-Triage und Aufgabenverfolgung.

# Kommunikationsstil

- Sei praegnant und direkt. Kein Fuellmaterial.
- Verwende Aufzaehlungspunkte fuer Listen mit 3+ Eintraegen.
- Wenn unsicher, sage es, anstatt zu raten.
- Passe die Formalitaet an den Kanal an: locker auf WhatsApp, professionell auf Slack.

# Fachwissen

- Sarah ist Product Managerin bei Acme Corp.
- Wichtige Tools: Linear fuer Aufgaben, Google Calendar, Gmail, Slack.
- VIP-Kontakte: @boss (David Chen), @skip (Maria Lopez).
- Aktuelle Prioritaeten: Q2-Roadmap, Mobile-App-Launch.

# Grenzen

- Sende niemals Nachrichten an externe Kontakte ohne ausdrueckliche Genehmigung.
- Fuehre niemals Finanztransaktionen durch.
- Bestaetigen immer vor dem Loeschen oder Aendern von Kalendereintraegen.
- Wenn Arbeitsthemen auf persoenlichen Kanaelen besprochen werden, erinnere Sarah
  an Klassifizierungsgrenzen.

# Antwortpraeferenzen

- Standardmaessig kurze Antworten (2-3 Saetze).
- Laengere Antworten nur, wenn die Frage Details erfordert.
- Fuer Code kurze Kommentare einfuegen, die wichtige Entscheidungen erklaeren.
```

### Best Practices

::: tip **Seien Sie spezifisch bezueglich der Persoenlichkeit.** Statt "sei hilfreich" schreiben Sie "sei praegnant, direkt und verwende Aufzaehlungspunkte fuer Klarheit." :::

::: tip **Fuegen Sie Kontext ueber den Eigentuemer hinzu.** Der Agent funktioniert besser, wenn er Ihre Rolle, Tools und Prioritaeten kennt. :::

::: tip **Setzen Sie explizite Grenzen.** Definieren Sie, was der Agent niemals tun sollte. Dies ergaenzt (ersetzt aber nicht) die deterministische Durchsetzung der Policy-Engine. :::

::: warning SPINE.md-Anweisungen leiten das Verhalten des LLM, sind aber keine Sicherheitskontrollen. Fuer durchsetzbare Einschraenkungen verwenden Sie die Policy-Engine in `triggerfish.yaml`. Die Policy-Engine ist deterministisch und kann nicht umgangen werden -- SPINE.md-Anweisungen koennen es. :::

## TRIGGER.md -- Proaktives Verhalten

`TRIGGER.md` definiert, was Ihr Agent bei periodischen Aufwachvorgaengen pruefen, ueberwachen und ausfuehren soll. Im Gegensatz zu Cron-Jobs (die feste Aufgaben nach Zeitplan ausfuehren) geben Trigger dem Agenten den Ermessensspielraum, Bedingungen zu evaluieren und zu entscheiden, ob eine Aktion erforderlich ist.

### Dateispeicherort

```
~/.triggerfish/TRIGGER.md
```

Fuer Multi-Agent-Setups:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Wie Trigger funktionieren

1. Die Trigger-Schleife weckt den Agenten in einem konfigurierten Intervall (festgelegt in `triggerfish.yaml`)
2. Triggerfish laedt Ihre TRIGGER.md und praesentiert sie dem Agenten
3. Der Agent evaluiert jeden Punkt und ergreift bei Bedarf Massnahmen
4. Alle Trigger-Aktionen durchlaufen die normalen Policy-Hooks
5. Die Trigger-Session laeuft mit einer Klassifizierungsobergrenze (ebenfalls in YAML konfiguriert)
6. Ruhezeiten werden respektiert -- waehrend dieser Zeiten werden keine Trigger ausgefuehrt

### Trigger-Konfiguration in YAML

Legen Sie Timing und Einschraenkungen in Ihrer `triggerfish.yaml` fest:

```yaml
trigger:
  interval: 30m # Alle 30 Minuten pruefen
  classification: INTERNAL # Maximale Taint-Obergrenze fuer Trigger-Sessions
  quiet_hours: "22:00-07:00" # Keine Aufwachvorgaenge waehrend dieser Stunden
```

### TRIGGER.md schreiben

Organisieren Sie Ihre Trigger nach Prioritaet. Seien Sie spezifisch darueber, was als handlungsrelevant gilt und was der Agent dagegen tun soll.

```markdown
# Prioritaets-Pruefungen

- Ungelesene Nachrichten auf allen Kanaelen aelter als 1 Stunde -- zusammenfassen und
  auf dem primaeren Kanal benachrichtigen.
- Kalenderkonflikte in den naechsten 24 Stunden -- markieren und Loesung vorschlagen.
- Ueberfaellige Aufgaben in Linear -- mit Tagen Ueberfaelligkeit auflisten.

# Ueberwachung

- GitHub: PRs, die auf meine Ueberpruefung warten -- benachrichtigen wenn aelter als 4 Stunden.
- E-Mail: alles von VIP-Kontakten (David Chen, Maria Lopez) -- fuer sofortige
  Benachrichtigung markieren, unabhaengig von Ruhezeiten.
- Slack: Erwaehnung im #incidents-Kanal -- zusammenfassen und eskalieren wenn ungeloest.

# Proaktiv

- Wenn morgens (7-9 Uhr), Tagesbriefing mit Kalender, Wetter und Top-3-Prioritaeten
  vorbereiten.
- Wenn Freitagnachmittag, Wochenzusammenfassung der erledigten Aufgaben und offenen
  Punkte entwerfen.
- Wenn Posteingangsanzahl 50 ungelesene uebersteigt, Batch-Triage anbieten.
```

### Beispiel: Minimale TRIGGER.md

Wenn Sie einen einfachen Startpunkt wuenschen:

```markdown
# Bei jedem Aufwachvorgang pruefen

- Ungelesene Nachrichten aelter als 1 Stunde
- Kalendereintraege in den naechsten 4 Stunden
- Dringendes in der E-Mail
```

### Beispiel: Entwickler-orientierte TRIGGER.md

```markdown
# Hohe Prioritaet

- CI-Fehler auf dem Main-Branch -- untersuchen und benachrichtigen.
- PRs, die auf meine Ueberpruefung warten, aelter als 2 Stunden.
- Sentry-Fehler mit "kritischer" Schwere in der letzten Stunde.

# Ueberwachung

- Dependabot-PRs -- Patch-Updates automatisch genehmigen, Minor/Major markieren.
- Build-Zeiten ueber 10 Minuten Trend -- woechentlich berichten.
- Mir zugewiesene offene Issues ohne Updates seit 3 Tagen.

# Taeglich

- Morgens: Naechte CI-Laeufe und Deploy-Status zusammenfassen.
- Tagesende: PRs auflisten, die ich geoeffnet habe und die noch auf Review warten.
```

### Trigger und die Policy-Engine

Alle Trigger-Aktionen unterliegen derselben Policy-Durchsetzung wie interaktive Gespraeche:

- Jeder Trigger-Aufwachvorgang erzeugt eine isolierte Session mit eigenem Taint-Tracking
- Die Klassifizierungsobergrenze in Ihrer YAML-Konfiguration begrenzt, auf welche Daten der Trigger zugreifen kann
- Die No-Write-Down-Regel gilt -- wenn ein Trigger auf vertrauliche Daten zugreift, kann er Ergebnisse nicht an einen oeffentlichen Kanal senden
- Alle Trigger-Aktionen werden im Audit-Trail protokolliert

::: info Wenn TRIGGER.md fehlt, finden Trigger-Aufwachvorgaenge weiterhin im konfigurierten Intervall statt. Der Agent nutzt sein allgemeines Wissen und SPINE.md, um zu entscheiden, was Aufmerksamkeit erfordert. Fuer beste Ergebnisse schreiben Sie eine TRIGGER.md. :::

## SPINE.md vs TRIGGER.md

| Aspekt     | SPINE.md                              | TRIGGER.md                       |
| ---------- | ------------------------------------- | -------------------------------- |
| Zweck      | Definiert, wer der Agent ist          | Definiert, was der Agent ueberwacht |
| Geladen    | Bei jeder Nachricht                   | Bei jedem Trigger-Aufwachvorgang |
| Geltungsbereich | Alle Gespraeche                  | Nur Trigger-Sessions             |
| Beeinflusst | Persoenlichkeit, Wissen, Grenzen    | Proaktive Pruefungen und Aktionen |
| Erforderlich | Ja (vom Dive-Assistenten generiert) | Nein (aber empfohlen)            |

## Naechste Schritte

- Konfigurieren Sie Trigger-Timing und Cron-Jobs in Ihrer [triggerfish.yaml](./configuration)
- Lernen Sie alle verfuegbaren CLI-Befehle in der [Befehlsreferenz](./commands)
