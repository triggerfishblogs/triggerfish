# Fehlerbehebung: Konfiguration

## YAML-Parse-Fehler

### "Configuration parse failed"

Die YAML-Datei hat einen Syntaxfehler. Haeufige Ursachen:

- **Einrueckungsfehler.** YAML ist leerzeichenempfindlich. Verwenden Sie Leerzeichen, keine Tabs. Jede Verschachtelungsebene sollte genau 2 Leerzeichen betragen.
- **Nicht in Anfuehrungszeichen gesetzte Sonderzeichen.** Werte, die `:`, `#`, `{`, `}`, `[`, `]` oder `&` enthalten, muessen in Anfuehrungszeichen stehen.
- **Fehlender Doppelpunkt nach Schluessel.** Jeder Schluessel benoetigt ein `: ` (Doppelpunkt gefolgt von einem Leerzeichen).

Validieren Sie Ihre YAML:

```bash
triggerfish config validate
```

Oder verwenden Sie einen Online-YAML-Validator, um die genaue Zeile zu finden.

### "Configuration file did not parse to an object"

Die YAML-Datei wurde erfolgreich geparst, aber das Ergebnis ist kein YAML-Mapping (Objekt). Dies passiert, wenn Ihre Datei nur einen skalaren Wert, eine Liste oder leer enthaelt.

Ihre `triggerfish.yaml` muss ein Top-Level-Mapping haben. Mindestens:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### "Configuration file not found"

Triggerfish sucht die Konfiguration an diesen Pfaden, in dieser Reihenfolge:

1. `$TRIGGERFISH_CONFIG`-Umgebungsvariable (wenn gesetzt)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (wenn `TRIGGERFISH_DATA_DIR` gesetzt ist)
3. `/data/triggerfish.yaml` (Docker-Umgebungen)
4. `~/.triggerfish/triggerfish.yaml` (Standard)

Fuehren Sie den Setup-Wizard aus, um eine zu erstellen:

```bash
triggerfish dive
```

---

## Validierungsfehler

### "Configuration validation failed"

Dies bedeutet, die YAML wurde geparst, hat aber die strukturelle Validierung nicht bestanden. Spezifische Meldungen:

**"models is required"** oder **"models.primary is required"**

Der `models`-Abschnitt ist obligatorisch. Sie benoetigen mindestens einen primaeren Provider und ein Modell:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** oder **"primary.model must be non-empty"**

Das `primary`-Feld muss sowohl `provider` als auch `model` auf nicht-leere Zeichenketten gesetzt haben.

**"Invalid classification level"** in `classification_models`

Gueltige Level sind: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. Diese sind gross-/kleinschreibungsempfindlich. Pruefen Sie Ihre `classification_models`-Schluessel.

---

## Secret-Referenz-Fehler

### Secret wird beim Start nicht aufgeloest

Wenn Ihre Konfiguration `secret:some-key` enthaelt und dieser Schluessel nicht im Schluesselbund existiert, beendet sich der Daemon mit einem Fehler wie:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Loesung:**

```bash
# Vorhandene Secrets auflisten
triggerfish config get-secret --list

# Fehlendes Secret speichern
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Secret-Backend nicht verfuegbar

Unter Linux verwendet der Secret-Speicher `secret-tool` (libsecret / GNOME Keyring). Wenn die Secret-Service-D-Bus-Schnittstelle nicht verfuegbar ist (Headless-Server, minimale Container), sehen Sie Fehler beim Speichern oder Abrufen von Secrets.

**Umgehung fuer Headless-Linux:**

1. Installieren Sie `gnome-keyring` und `libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Starten Sie den Keyring-Daemon:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. Oder verwenden Sie den verschluesselten Datei-Fallback:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Hinweis: Der Memory-Fallback bedeutet, dass Secrets beim Neustart verloren gehen. Er ist nur zum Testen geeignet.

---

## Konfigurationswert-Probleme

### Boolesche Konvertierung

Bei Verwendung von `triggerfish config set` werden Zeichenkettenwerte `"true"` und `"false"` automatisch in YAML-Booleans konvertiert. Wenn Sie tatsaechlich die literale Zeichenkette `"true"` benoetigen, bearbeiten Sie die YAML-Datei direkt.

Ebenso werden Zeichenketten, die wie Ganzzahlen aussehen (`"8080"`), in Zahlen konvertiert.

### Punkt-Pfad-Syntax

Die Befehle `config set` und `config get` verwenden Punkt-Pfade zur Navigation in verschachteltem YAML:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Wenn ein Pfadsegment einen Punkt enthaelt, gibt es keine Escape-Syntax. Bearbeiten Sie die YAML-Datei direkt.

### Secret-Maskierung in `config get`

Wenn Sie `triggerfish config get` auf einem Schluessel ausfuehren, der "key", "secret" oder "token" enthaelt, wird die Ausgabe maskiert: `****...****` mit nur den ersten und letzten 4 Zeichen sichtbar. Dies ist beabsichtigt. Verwenden Sie `triggerfish config get-secret <key>`, um den tatsaechlichen Wert abzurufen.

---

## Konfigurations-Backups

Triggerfish erstellt ein zeitgestempeltes Backup in `~/.triggerfish/backups/` vor jeder `config set`-, `config add-channel`- oder `config add-plugin`-Operation. Bis zu 10 Backups werden aufbewahrt.

Um ein Backup wiederherzustellen:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Provider-Verifizierung

Der Setup-Wizard verifiziert API-Schluessel, indem er den Modell-Auflistungs-Endpunkt jedes Providers aufruft (was keine Tokens verbraucht). Die Verifizierungs-Endpunkte sind:

| Provider | Endpunkt |
|----------|----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

Wenn die Verifizierung fehlschlaegt, pruefen Sie:
- Der API-Schluessel ist korrekt und nicht abgelaufen
- Der Endpunkt ist von Ihrem Netzwerk aus erreichbar
- Fuer lokale Provider (Ollama, LM Studio): der Server laeuft tatsaechlich

### Modell nicht gefunden

Wenn die Verifizierung erfolgreich ist, aber das Modell nicht gefunden wird, warnt der Wizard. Dies bedeutet normalerweise:

- **Tippfehler im Modellnamen.** Pruefen Sie die Dokumentation des Providers fuer die genauen Modell-IDs.
- **Ollama-Modell nicht heruntergeladen.** Fuehren Sie zuerst `ollama pull <modell>` aus.
- **Provider listet das Modell nicht auf.** Einige Provider (Fireworks) verwenden andere Namensformate. Der Wizard normalisiert gaengige Muster, aber ungewoehnliche Modell-IDs stimmen moeglicherweise nicht ueberein.
