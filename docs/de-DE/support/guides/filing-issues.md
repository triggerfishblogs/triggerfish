# Wie man ein gutes Issue erstellt

Ein gut strukturiertes Issue wird schneller geloest. Ein vages Issue ohne Logs und ohne Reproduktionsschritte liegt oft wochenlang unbearbeitet, weil niemand darauf reagieren kann. Hier ist, was enthalten sein sollte.

## Vor dem Einreichen

1. **Bestehende Issues durchsuchen.** Jemand hat das gleiche Problem moeglicherweise bereits gemeldet. Pruefen Sie [offene Issues](https://github.com/greghavens/triggerfish/issues) und [geschlossene Issues](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Fehlerbehebungsleitfaeden pruefen.** Der [Fehlerbehebungsbereich](/de-DE/support/troubleshooting/) deckt die meisten gaengigen Probleme ab.

3. **Bekannte Probleme pruefen.** Die Seite [Bekannte Probleme](/de-DE/support/kb/known-issues) listet Probleme auf, die uns bereits bekannt sind.

4. **Neueste Version ausprobieren.** Wenn Sie nicht auf der neuesten Version sind, aktualisieren Sie zuerst:
   ```bash
   triggerfish update
   ```

## Was enthalten sein sollte

### 1. Umgebung

```
Triggerfish-Version: (fuehren Sie `triggerfish version` aus)
Betriebssystem: (z.B. macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Architektur: (x64 oder arm64)
Installationsmethode: (Binaer-Installer, aus Quellcode, Docker)
```

### 2. Schritte zur Reproduktion

Schreiben Sie die genaue Abfolge von Aktionen auf, die zum Problem fuehrt. Seien Sie spezifisch:

**Schlecht:**
> Der Bot hat aufgehoert zu funktionieren.

**Gut:**
> 1. Triggerfish mit konfiguriertem Telegram-Kanal gestartet
> 2. Die Nachricht "pruefe meinen Kalender fuer morgen" in einer DM an den Bot gesendet
> 3. Der Bot hat mit den Kalenderergebnissen geantwortet
> 4. "Sende diese Ergebnisse jetzt per E-Mail an alice@example.com" gesendet
> 5. Erwartet: Bot sendet die E-Mail
> 6. Tatsaechlich: Bot antwortet mit "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL"

### 3. Erwartetes vs. tatsaechliches Verhalten

Sagen Sie, was Sie erwartet haben und was tatsaechlich passiert ist. Fuegen Sie die genaue Fehlermeldung bei, falls vorhanden. Kopieren und Einfuegen ist besser als Umschreiben.

### 4. Log-Ausgabe

Haengen Sie ein [Log-Bundle](/de-DE/support/guides/collecting-logs) an:

```bash
triggerfish logs bundle
```

Wenn das Problem sicherheitsrelevant ist, koennen Sie Teile schwaerzen, aber vermerken Sie im Issue, was Sie geschwaerzt haben.

Fuegen Sie mindestens die relevanten Log-Zeilen ein. Schliessen Sie Zeitstempel ein, damit wir Ereignisse korrelieren koennen.

### 5. Konfiguration (geschwaerzt)

Fuegen Sie den relevanten Abschnitt Ihrer `triggerfish.yaml` ein. **Schwaerzen Sie immer Secrets.** Ersetzen Sie tatsaechliche Werte durch Platzhalter:

```yaml
# Gut - Secrets geschwaerzt
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # im Schluesselbund gespeichert
channels:
  telegram:
    ownerId: "GESCHWAERZT"
    classification: INTERNAL
```

### 6. Patrol-Ausgabe

```bash
triggerfish patrol
```

Fuegen Sie die Ausgabe ein. Dies gibt uns einen schnellen Ueberblick ueber den Systemzustand.

## Issue-Typen

### Fehlerbericht

Verwenden Sie diese Vorlage fuer Dinge, die nicht funktionieren:

```markdown
## Fehlerbericht

**Umgebung:**
- Version:
- Betriebssystem:
- Installationsmethode:

**Schritte zur Reproduktion:**
1.
2.
3.

**Erwartetes Verhalten:**

**Tatsaechliches Verhalten:**

**Fehlermeldung (falls vorhanden):**

**Patrol-Ausgabe:**

**Relevante Konfiguration (geschwaerzt):**

**Log-Bundle:** (Datei anhaengen)
```

### Feature-Anfrage

```markdown
## Feature-Anfrage

**Problem:** Was versuchen Sie zu tun, das Sie heute nicht tun koennen?

**Vorgeschlagene Loesung:** Wie sollte es Ihrer Meinung nach funktionieren?

**Betrachtete Alternativen:** Was haben Sie sonst noch versucht?
```

### Frage / Support-Anfrage

Wenn Sie nicht sicher sind, ob etwas ein Bug ist oder Sie einfach nicht weiterkommen, verwenden Sie [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) anstelle von Issues. Diskussionen eignen sich besser fuer Fragen, die moeglicherweise keine einzelne richtige Antwort haben.

## Was NICHT enthalten sein sollte

- **Rohe API-Schluessel oder Passwoerter.** Immer schwaerzen.
- **Persoenliche Daten aus Gespraechen.** Namen, E-Mail-Adressen, Telefonnummern schwaerzen.
- **Gesamte Log-Dateien inline.** Haengen Sie das Log-Bundle als Datei an, anstatt Tausende von Zeilen einzufuegen.

## Nach dem Einreichen

- **Auf Nachfragen achten.** Maintainer benoetigen moeglicherweise weitere Informationen.
- **Fixes testen.** Wenn ein Fix gepusht wird, werden Sie moeglicherweise gebeten, ihn zu verifizieren.
- **Das Issue schliessen**, wenn Sie die Loesung selbst finden. Posten Sie die Loesung, damit andere davon profitieren koennen.
