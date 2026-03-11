# Fehlerbehebung: Secrets & Anmeldedaten

## Schluesselbund-Backends nach Plattform

| Plattform | Backend | Details |
|-----------|---------|---------|
| macOS | Keychain (nativ) | Verwendet die `security`-CLI fuer den Zugriff auf Keychain Access |
| Linux | Secret Service (D-Bus) | Verwendet die `secret-tool`-CLI (libsecret / GNOME Keyring) |
| Windows | Verschluesselter Dateispeicher | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Verschluesselter Dateispeicher | `/data/secrets.json` + `/data/secrets.key` |

Das Backend wird beim Start automatisch ausgewaehlt. Sie koennen nicht aendern, welches Backend fuer Ihre Plattform verwendet wird.

---

## macOS-Probleme

### Schluesselbund-Zugriffsabfragen

macOS fragt moeglicherweise, ob `triggerfish` auf den Schluesselbund zugreifen darf. Klicken Sie auf "Immer erlauben", um wiederholte Abfragen zu vermeiden. Wenn Sie versehentlich auf "Ablehnen" geklickt haben, oeffnen Sie die Schluesselbundverwaltung, finden Sie den Eintrag und entfernen Sie ihn. Der naechste Zugriff wird erneut nachfragen.

### Schluesselbund gesperrt

Wenn der macOS-Schluesselbund gesperrt ist (z.B. nach dem Ruhezustand), schlagen Secret-Operationen fehl. Entsperren Sie ihn:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

Oder entsperren Sie einfach Ihren Mac (der Schluesselbund wird beim Login entsperrt).

---

## Linux-Probleme

### "secret-tool" nicht gefunden

Das Linux-Schluesselbund-Backend verwendet `secret-tool`, das Teil des `libsecret-tools`-Pakets ist.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Kein Secret-Service-Daemon laeuft

Auf Headless-Servern oder minimalen Desktop-Umgebungen gibt es moeglicherweise keinen Secret-Service-Daemon. Symptome:

- `secret-tool`-Befehle haengen oder schlagen fehl
- Fehlermeldungen ueber D-Bus-Verbindung

**Optionen:**

1. **GNOME Keyring installieren und starten:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Verschluesselten Datei-Fallback verwenden:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Warnung: Der Memory-Fallback persistiert Secrets nicht ueber Neustarts. Er ist nur zum Testen geeignet.

3. **Fuer Server Docker erwaegen.** Die Docker-Bereitstellung verwendet einen verschluesselten Dateispeicher, der keinen Keyring-Daemon erfordert.

### KDE / KWallet

Wenn Sie KDE mit KWallet anstelle von GNOME Keyring verwenden, sollte `secret-tool` weiterhin ueber die Secret-Service-D-Bus-API funktionieren, die KWallet implementiert. Falls nicht, installieren Sie `gnome-keyring` neben KWallet.

---

## Windows / Docker verschluesselter Dateispeicher

### Funktionsweise

Der verschluesselte Dateispeicher verwendet AES-256-GCM-Verschluesselung:

1. Ein Maschinenschluessel wird mit PBKDF2 abgeleitet und in `secrets.key` gespeichert
2. Jeder Secret-Wert wird einzeln mit einem eindeutigen IV verschluesselt
3. Verschluesselte Daten werden in `secrets.json` in einem versionierten Format gespeichert (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

Auf Unix-basierten Systemen (Linux in Docker) muss die Schluesseldatei Berechtigungen `0600` haben (nur Eigentuemer lesen/schreiben). Wenn die Berechtigungen zu offen sind:

```
Machine key file permissions too open
```

**Loesung:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# oder in Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Die Schluesseldatei existiert, kann aber nicht geparst werden. Sie wurde moeglicherweise abgeschnitten oder ueberschrieben.

**Loesung:** Loeschen Sie die Schluesseldatei und generieren Sie neu:

```bash
rm ~/.triggerfish/secrets.key
```

Beim naechsten Start wird ein neuer Schluessel generiert. Jedoch werden alle bestehenden Secrets, die mit dem alten Schluessel verschluesselt wurden, unlesbar. Sie muessen alle Secrets erneut speichern:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Fuer alle Secrets wiederholen
```

### "Secret file permissions too open"

Wie die Schluesseldatei sollte auch die Secrets-Datei restriktive Berechtigungen haben:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

Das System konnte keine Dateiberechtigungen setzen. Dies kann auf Dateisystemen passieren, die Unix-Berechtigungen nicht unterstuetzen (einige Netzwerk-Mounts, FAT/exFAT-Volumes). Ueberpruefen Sie, ob das Dateisystem Berechtigungsaenderungen unterstuetzt.

---

## Legacy-Secrets-Migration

### Automatische Migration

Wenn Triggerfish eine Klartext-Secrets-Datei erkennt (altes Format ohne Verschluesselung), migriert es beim ersten Laden automatisch zum verschluesselten Format:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

Die Migration:
1. Liest die Klartext-JSON-Datei
2. Verschluesselt jeden Wert mit AES-256-GCM
3. Schreibt in eine temporaere Datei, benennt dann atomar um
4. Protokolliert eine Warnung mit Empfehlung zur Secret-Rotation

### Manuelle Migration

Wenn Sie Secrets in Ihrer `triggerfish.yaml`-Datei haben (keine `secret:`-Referenzen verwenden), migrieren Sie sie in den Schluesselbund:

```bash
triggerfish config migrate-secrets
```

Dies durchsucht Ihre Konfiguration nach bekannten Secret-Feldern (API-Schluessel, Bot-Tokens, etc.), speichert sie im Schluesselbund und ersetzt die Werte in der Konfigurationsdatei durch `secret:`-Referenzen.

### Geraeteuebergreifende Verschiebungsprobleme

Wenn die Migration das Verschieben von Dateien ueber Dateisystemgrenzen hinweg beinhaltet (verschiedene Mount-Punkte, NFS), kann die atomare Umbenennung fehlschlagen. Die Migration faellt auf Kopieren-dann-Entfernen zurueck, was sicher ist, aber kurzzeitig beide Dateien auf der Festplatte hat.

---

## Secret-Aufloesung

### Wie `secret:`-Referenzen funktionieren

Konfigurationswerte mit dem Praefix `secret:` werden beim Start aufgeloest:

```yaml
# In triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# Beim Start aufgeloest zu:
apiKey: "sk-ant-api03-tatsaechlicher-schluesselwert..."
```

Der aufgeloeste Wert lebt nur im Arbeitsspeicher. Die Konfigurationsdatei auf der Festplatte enthaelt immer die `secret:`-Referenz.

### "Secret not found"

```
Secret not found: <key>
```

Der referenzierte Schluessel existiert nicht im Schluesselbund.

**Loesung:**

```bash
triggerfish config set-secret <key> <value>
```

### Secrets auflisten

```bash
# Alle gespeicherten Secret-Schluessel auflisten (Werte werden nicht angezeigt)
triggerfish config get-secret --list
```

### Secrets loeschen

```bash
triggerfish config set-secret <key> ""
# oder ueber den Agenten:
# Der Agent kann Secret-Loeschung ueber das Secrets-Tool anfordern
```

---

## Umgebungsvariablen-Override

Der Schluesseldateipfad kann mit `TRIGGERFISH_KEY_PATH` ueberschrieben werden:

```bash
export TRIGGERFISH_KEY_PATH=/benutzerdefinierter/pfad/secrets.key
```

Dies ist hauptsaechlich nuetzlich fuer Docker-Bereitstellungen mit benutzerdefinierten Volume-Layouts.

---

## Gaengige Secret-Schluesselnamen

Dies sind die standardmaessigen Schluesselbund-Schluessel, die von Triggerfish verwendet werden:

| Schluessel | Verwendung |
|------------|-----------|
| `provider:<name>:apiKey` | LLM-Provider-API-Schluessel |
| `telegram:botToken` | Telegram-Bot-Token |
| `slack:botToken` | Slack-Bot-Token |
| `slack:appToken` | Slack-App-Level-Token |
| `slack:signingSecret` | Slack-Signing-Secret |
| `discord:botToken` | Discord-Bot-Token |
| `whatsapp:accessToken` | WhatsApp-Cloud-API-Access-Token |
| `whatsapp:webhookVerifyToken` | WhatsApp-Webhook-Verifizierungstoken |
| `email:smtpPassword` | SMTP-Relay-Passwort |
| `email:imapPassword` | IMAP-Server-Passwort |
| `web:search:apiKey` | Brave-Search-API-Schluessel |
| `github-pat` | GitHub Personal Access Token |
| `notion:token` | Notion-Integrationstoken |
| `caldav:password` | CalDAV-Server-Passwort |
| `google:clientId` | Google-OAuth-Client-ID |
| `google:clientSecret` | Google-OAuth-Client-Secret |
| `google:refreshToken` | Google-OAuth-Refresh-Token |
