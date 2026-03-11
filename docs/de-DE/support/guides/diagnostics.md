# Diagnose ausfuehren

Triggerfish verfuegt ueber zwei integrierte Diagnose-Tools: `patrol` (externer Gesundheitscheck) und das `healthcheck`-Tool (interne Systemabfrage).

## Patrol

Patrol ist ein CLI-Befehl, der prueft, ob die Kernsysteme betriebsbereit sind:

```bash
triggerfish patrol
```

### Was es prueft

| Pruefung | Status | Bedeutung |
|----------|--------|-----------|
| Gateway laeuft | CRITICAL wenn ausgefallen | Die WebSocket-Steuerungsebene antwortet nicht |
| LLM verbunden | CRITICAL wenn ausgefallen | Der primaere LLM-Provider ist nicht erreichbar |
| Kanaele aktiv | WARNING wenn 0 | Keine Channel-Adapter sind verbunden |
| Policy-Regeln geladen | WARNING wenn 0 | Keine Policy-Regeln sind geladen |
| Skills installiert | WARNING wenn 0 | Keine Skills wurden erkannt |

### Gesamtstatus

- **HEALTHY** - alle Pruefungen bestanden
- **WARNING** - einige nicht-kritische Pruefungen sind markiert (z.B. keine Skills installiert)
- **CRITICAL** - mindestens eine kritische Pruefung ist fehlgeschlagen (Gateway oder LLM nicht erreichbar)

### Wann Patrol verwenden

- Nach der Installation, um zu pruefen, ob alles funktioniert
- Nach Konfigurationsaenderungen, um zu bestaetigen, dass der Daemon sauber neu gestartet wurde
- Wenn der Bot nicht mehr antwortet, um einzugrenzen, welche Komponente ausgefallen ist
- Vor dem Einreichen eines Fehlerberichts, um die Patrol-Ausgabe beizufuegen

### Beispielausgabe

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## Healthcheck-Tool

Das Healthcheck-Tool ist ein internes Agenten-Tool, das Systemkomponenten innerhalb des laufenden Gateways abfragt. Es steht dem Agenten waehrend Gespraechen zur Verfuegung.

### Was es prueft

**Provider:**
- Standard-Provider existiert und ist erreichbar
- Gibt den Provider-Namen zurueck

**Storage:**
- Round-Trip-Test: schreibt einen Schluessel, liest ihn zurueck, loescht ihn
- Verifiziert, dass die Storage-Schicht funktional ist

**Skills:**
- Zaehlt erkannte Skills nach Quelle (mitgeliefert, installiert, Workspace)

**Config:**
- Grundlegende Konfigurationsvalidierung

### Status-Level

Jede Komponente meldet eines von:
- `healthy` - voll betriebsbereit
- `degraded` - teilweise funktionsfaehig (einige Funktionen funktionieren moeglicherweise nicht)
- `error` - Komponente ist defekt

### Klassifizierungsanforderung

Das Healthcheck-Tool erfordert mindestens INTERNAL-Klassifizierung, da es Systeminterna offenlegt (Provider-Namen, Skill-Anzahlen, Storage-Status). Eine PUBLIC-Session kann es nicht verwenden.

### Healthcheck verwenden

Fragen Sie Ihren Agenten:

> Fuehre einen Healthcheck durch

Oder bei direkter Tool-Verwendung:

```
tool: healthcheck
```

Die Antwort ist ein strukturierter Bericht:

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## Diagnosen kombinieren

Fuer eine gruendliche Diagnosesitzung:

1. **Patrol ausfuehren** ueber die CLI:
   ```bash
   triggerfish patrol
   ```

2. **Logs pruefen** auf aktuelle Fehler:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Den Agenten bitten**, einen Healthcheck durchzufuehren (wenn der Agent reagiert):
   > Fuehre einen System-Healthcheck durch und berichte ueber Probleme

4. **Ein Log-Bundle sammeln**, wenn Sie ein Issue einreichen muessen:
   ```bash
   triggerfish logs bundle
   ```

---

## Startdiagnosen

Wenn der Daemon ueberhaupt nicht startet, pruefen Sie diese Punkte der Reihe nach:

1. **Konfiguration existiert und ist gueltig:**
   ```bash
   triggerfish config validate
   ```

2. **Secrets koennen aufgeloest werden:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Keine Port-Konflikte:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **Keine andere Instanz laeuft:**
   ```bash
   triggerfish status
   ```

5. **Systemjournal pruefen (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **launchd pruefen (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Windows-Ereignisprotokoll pruefen (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
