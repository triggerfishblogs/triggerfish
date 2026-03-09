# KB: Secrets-Migration

Dieser Artikel behandelt die Migration von Secrets von Klartext-Speicherung zum verschluesselten Format und von Inline-Konfigurationswerten zu Schluesselbund-Referenzen.

## Hintergrund

Fruehe Versionen von Triggerfish speicherten Secrets als Klartext-JSON. Die aktuelle Version verwendet AES-256-GCM-Verschluesselung fuer dateibasierte Secret-Speicher (Windows, Docker) und betriebssystemeigene Schluesselbunde (macOS Keychain, Linux Secret Service).

## Automatische Migration (Klartext zu verschluesselt)

Wenn Triggerfish eine Secrets-Datei oeffnet und das alte Klartext-Format erkennt (ein flaches JSON-Objekt ohne `v`-Feld), migriert es automatisch:

1. **Erkennung.** Die Datei wird auf das Vorhandensein der `{v: 1, entries: {...}}`-Struktur geprueft. Wenn es ein einfaches `Record<string, string>` ist, handelt es sich um das Legacy-Format.

2. **Migration.** Jeder Klartext-Wert wird mit AES-256-GCM verschluesselt, wobei ein Maschinenschluessel verwendet wird, der ueber PBKDF2 abgeleitet wurde. Ein eindeutiger IV wird fuer jeden Wert generiert.

3. **Atomarer Schreibvorgang.** Die verschluesselten Daten werden zuerst in eine temporaere Datei geschrieben, dann atomar umbenannt, um die Originaldatei zu ersetzen. Dies verhindert Datenverlust, wenn der Prozess unterbrochen wird.

4. **Logging.** Zwei Log-Eintraege werden erstellt:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Geraeteuebergreifende Behandlung.** Wenn die atomare Umbenennung fehlschlaegt (z.B. temporaere Datei und Secrets-Datei befinden sich auf verschiedenen Dateisystemen), faellt die Migration auf Kopieren-dann-Entfernen zurueck.

### Was Sie tun muessen

Nichts. Die Migration ist vollautomatisch und erfolgt beim ersten Zugriff. Jedoch nach der Migration:

- **Rotieren Sie Ihre Secrets.** Die Klartext-Versionen koennten gesichert, zwischengespeichert oder protokolliert worden sein. Generieren Sie neue API-Schluessel und aktualisieren Sie diese:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <neuer-schluessel>
  ```

- **Loeschen Sie alte Backups.** Wenn Sie Backups der alten Klartext-Secrets-Datei haben, loeschen Sie diese sicher.

## Manuelle Migration (Inline-Konfiguration zu Schluesselbund)

Wenn Ihre `triggerfish.yaml` rohe Secret-Werte anstelle von `secret:`-Referenzen enthaelt:

```yaml
# Vorher (unsicher)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-echter-schluessel-hier"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Fuehren Sie den Migrationsbefehl aus:

```bash
triggerfish config migrate-secrets
```

Dieser Befehl:

1. Durchsucht die Konfiguration nach bekannten Secret-Feldern (API-Schluessel, Bot-Tokens, Passwoerter)
2. Speichert jeden Wert unter seinem Standard-Schluesselnamen im Betriebssystem-Schluesselbund
3. Ersetzt den Inline-Wert durch eine `secret:`-Referenz

```yaml
# Nachher (sicher)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### Bekannte Secret-Felder

Der Migrationsbefehl kennt diese Felder:

| Konfigurationspfad | Schluesselbund-Schluessel |
|---------------------|--------------------------|
| `models.providers.<name>.apiKey` | `provider:<name>:apiKey` |
| `channels.telegram.botToken` | `telegram:botToken` |
| `channels.slack.botToken` | `slack:botToken` |
| `channels.slack.appToken` | `slack:appToken` |
| `channels.slack.signingSecret` | `slack:signingSecret` |
| `channels.discord.botToken` | `discord:botToken` |
| `channels.whatsapp.accessToken` | `whatsapp:accessToken` |
| `channels.whatsapp.webhookVerifyToken` | `whatsapp:webhookVerifyToken` |
| `channels.email.smtpPassword` | `email:smtpPassword` |
| `channels.email.imapPassword` | `email:imapPassword` |
| `web.search.api_key` | `web:search:apiKey` |

## Maschinenschluessel

Der verschluesselte Dateispeicher leitet seinen Verschluesselungsschluessel von einem Maschinenschluessel ab, der in `secrets.key` gespeichert ist. Dieser Schluessel wird bei der ersten Verwendung automatisch generiert.

### Dateiberechtigungen des Schluessels

Auf Unix-Systemen muss die Schluesseldatei `0600`-Berechtigungen haben (nur Eigentuemer lesen/schreiben). Triggerfish prueft dies beim Start und protokolliert eine Warnung, wenn die Berechtigungen zu offen sind:

```
Machine key file permissions too open
```

Loesung:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Verlust der Schluesseldatei

Wenn die Maschinenschluessel-Datei geloescht oder beschaedigt wird, werden alle damit verschluesselten Secrets unwiederbringlich. Sie muessen jedes Secret erneut speichern:

```bash
triggerfish config set-secret provider:anthropic:apiKey <schluessel>
triggerfish config set-secret telegram:botToken <token>
# ... usw.
```

Sichern Sie Ihre `secrets.key`-Datei an einem sicheren Ort.

### Benutzerdefinierter Schluesselpfad

Ueberschreiben Sie den Schluesseldatei-Speicherort mit:

```bash
export TRIGGERFISH_KEY_PATH=/benutzerdefinierter/pfad/secrets.key
```

Dies ist primaer nuetzlich fuer Docker-Bereitstellungen mit nicht standardmaessigen Volume-Layouts.
