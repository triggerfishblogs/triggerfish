# Fehlerreferenz

Ein durchsuchbarer Index von Fehlermeldungen. Verwenden Sie die Suchfunktion Ihres Browsers (Strg+F / Cmd+F), um nach dem genauen Fehlertext zu suchen, den Sie in Ihren Logs sehen.

## Start & Daemon

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Fatal startup error` | Nicht behandelte Exception waehrend des Gateway-Starts | Pruefen Sie den vollstaendigen Stack-Trace in den Logs |
| `Daemon start failed` | Dienstverwaltung konnte den Daemon nicht starten | Pruefen Sie `triggerfish logs` oder das Systemjournal |
| `Daemon stop failed` | Dienstverwaltung konnte den Daemon nicht stoppen | Beenden Sie den Prozess manuell |
| `Failed to load configuration` | Konfigurationsdatei nicht lesbar oder fehlerhaft | Fuehren Sie `triggerfish config validate` aus |
| `No LLM provider configured. Check triggerfish.yaml.` | Fehlender `models`-Abschnitt oder kein Provider definiert | Konfigurieren Sie mindestens einen Provider |
| `Configuration file not found` | `triggerfish.yaml` existiert nicht am erwarteten Pfad | Fuehren Sie `triggerfish dive` aus oder erstellen Sie manuell |
| `Configuration parse failed` | YAML-Syntaxfehler | YAML-Syntax korrigieren (Einrueckung, Doppelpunkte, Anfuehrungszeichen pruefen) |
| `Configuration file did not parse to an object` | YAML geparst, aber Ergebnis ist kein Mapping | Stellen Sie sicher, dass die Top-Level-Struktur ein YAML-Mapping ist, keine Liste oder ein Skalar |
| `Configuration validation failed` | Erforderliche Felder fehlen oder ungueltige Werte | Pruefen Sie die spezifische Validierungsmeldung |
| `Triggerfish is already running` | Log-Datei wird von einer anderen Instanz gesperrt | Stoppen Sie zuerst die laufende Instanz |
| `Linger enable failed` | `loginctl enable-linger` war nicht erfolgreich | Fuehren Sie `sudo loginctl enable-linger $USER` aus |

## Secret-Verwaltung

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Secret store failed` | Secret-Backend konnte nicht initialisiert werden | Pruefen Sie Schluesselbund-/libsecret-Verfuegbarkeit |
| `Secret not found` | Referenzierter Secret-Schluessel existiert nicht | Speichern: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | Schluesseldatei hat Berechtigungen breiter als 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Schluesseldatei ist nicht lesbar oder abgeschnitten | Loeschen und alle Secrets erneut speichern |
| `Machine key chmod failed` | Berechtigungen auf Schluesseldatei koennen nicht gesetzt werden | Pruefen Sie, ob das Dateisystem chmod unterstuetzt |
| `Secret file permissions too open` | Secrets-Datei hat zu offene Berechtigungen | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Berechtigungen auf Secrets-Datei koennen nicht gesetzt werden | Pruefen Sie den Dateisystemtyp |
| `Secret backend selection failed` | Nicht unterstuetztes Betriebssystem oder kein Schluesselbund verfuegbar | Verwenden Sie Docker oder aktivieren Sie den Memory-Fallback |
| `Migrating legacy plaintext secrets to encrypted format` | Alte Format-Secrets-Datei erkannt (INFO, kein Fehler) | Keine Aktion erforderlich; Migration erfolgt automatisch |

## LLM-Provider

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Primary provider not found in registry` | Provider-Name in `models.primary.provider` nicht in `models.providers` | Provider-Namen korrigieren |
| `Classification model provider not configured` | `classification_models` referenziert unbekannten Provider | Provider zu `models.providers` hinzufuegen |
| `All providers exhausted` | Jeder Provider in der Failover-Kette ist fehlgeschlagen | Alle API-Schluessel und Provider-Status pruefen |
| `Provider request failed with retryable error, retrying` | Voruebergehender Fehler, Wiederholung laeuft | Warten; dies ist automatische Wiederherstellung |
| `Provider stream connection failed, retrying` | Streaming-Verbindung abgebrochen | Warten; dies ist automatische Wiederherstellung |
| `Local LLM request failed (status): text` | Ollama/LM Studio hat einen Fehler zurueckgegeben | Pruefen Sie, ob der lokale Server laeuft und das Modell geladen ist |
| `No response body for streaming` | Provider hat leere Streaming-Antwort zurueckgegeben | Erneut versuchen; moeglicherweise voruebergehendes Provider-Problem |
| `Unknown provider name in createProviderByName` | Code referenziert einen Provider-Typ, der nicht existiert | Provider-Name-Schreibweise pruefen |

## Kanaele

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Channel send failed` | Router konnte eine Nachricht nicht zustellen | Kanalspezifische Fehler in Logs pruefen |
| `WebSocket connection failed` | CLI-Chat kann das Gateway nicht erreichen | Pruefen Sie, ob der Daemon laeuft |
| `Message parse failed` | Fehlerhaftes JSON vom Kanal empfangen | Pruefen Sie, ob der Client gueltiges JSON sendet |
| `WebSocket upgrade rejected` | Verbindung vom Gateway abgelehnt | Auth-Token und Origin-Header pruefen |
| `Chat WebSocket message rejected: exceeds size limit` | Nachrichtenkoerper ueberschreitet 1 MB | Kleinere Nachrichten senden |
| `Discord channel configured but botToken is missing` | Discord-Konfiguration existiert, aber Token fehlt | Bot-Token setzen |
| `WhatsApp send failed (status): error` | Meta-API hat die Sendeanfrage abgelehnt | Access-Token-Gueltigkeit pruefen |
| `Signal connect failed` | signal-cli-Daemon nicht erreichbar | Pruefen Sie, ob signal-cli laeuft |
| `Signal ping failed after retries` | signal-cli laeuft, antwortet aber nicht | signal-cli neu starten |
| `signal-cli daemon not reachable within 60s` | signal-cli wurde nicht rechtzeitig gestartet | Java-Installation und signal-cli-Setup pruefen |
| `IMAP LOGIN failed` | Falsche IMAP-Anmeldedaten | Benutzername und Passwort pruefen |
| `IMAP connection not established` | IMAP-Server nicht erreichbar | Server-Hostname und Port 993 pruefen |
| `Google Chat PubSub poll failed` | Kann nicht aus Pub/Sub-Subscription abrufen | Google-Cloud-Anmeldedaten pruefen |
| `Clipboard image rejected: exceeds size limit` | Eingefuegtes Bild ist zu gross fuer den Eingabepuffer | Kleineres Bild verwenden |

## Integrationen

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Google OAuth token exchange failed` | OAuth-Code-Austausch hat einen Fehler zurueckgegeben | Erneut authentifizieren: `triggerfish connect google` |
| `GitHub token verification failed` | PAT ist ungueltig oder abgelaufen | Erneut speichern: `triggerfish connect github` |
| `GitHub API request failed` | GitHub-API hat einen Fehler zurueckgegeben | Token-Scopes und Rate-Limits pruefen |
| `Clone failed` | git clone fehlgeschlagen | Token, Repository-Zugriff und Netzwerk pruefen |
| `Notion enabled but token not found in keychain` | Notion-Integrationstoken nicht gespeichert | `triggerfish connect notion` ausfuehren |
| `Notion API rate limited` | 3 Anfragen/Sekunde ueberschritten | Auf automatische Wiederholung warten (bis zu 3 Versuche) |
| `Notion API network request failed` | api.notion.com nicht erreichbar | Netzwerkverbindung pruefen |
| `CalDAV credential resolution failed` | Fehlender CalDAV-Benutzername oder Passwort | Anmeldedaten in Konfiguration und Schluesselbund setzen |
| `CalDAV principal discovery failed` | CalDAV-Principal-URL nicht findbar | Server-URL-Format pruefen |
| `MCP server 'name' not found` | Referenzierter MCP-Server nicht in Konfiguration | Zu `mcp_servers` in der Konfiguration hinzufuegen |
| `MCP SSE connection blocked by SSRF policy` | MCP-SSE-URL zeigt auf private IP | Stattdessen stdio-Transport verwenden |
| `Vault path does not exist` | Obsidian-Vault-Pfad ist falsch | `plugins.obsidian.vault_path` korrigieren |
| `Path traversal rejected` | Notiz-Pfad hat versucht, Vault-Verzeichnis zu verlassen | Pfade innerhalb des Vaults verwenden |

## Sicherheit & Policy

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Write-down blocked` | Daten fliessen von hoher zu niedriger Klassifizierung | Kanal/Tool auf der richtigen Klassifizierungsstufe verwenden |
| `SSRF blocked: hostname resolves to private IP` | Ausgehende Anfrage zielt auf internes Netzwerk | Kann nicht deaktiviert werden; oeffentliche URL verwenden |
| `Hook evaluation failed, defaulting to BLOCK` | Policy-Hook hat eine Exception geworfen | Benutzerdefinierte Policy-Regeln pruefen |
| `Policy rule blocked action` | Eine Policy-Regel hat die Aktion abgelehnt | `policy.rules` in der Konfiguration ueberpruefen |
| `Tool floor violation` | Tool erfordert hoehere Klassifizierung als die Session hat | Session eskalieren oder anderes Tool verwenden |
| `Plugin network access blocked` | Plugin hat versucht, auf nicht autorisierte URL zuzugreifen | Plugin muss Endpunkte in seinem Manifest deklarieren |
| `Plugin SSRF blocked` | Plugin-URL loest sich zu privater IP auf | Plugin kann nicht auf private Netzwerke zugreifen |
| `Skill activation blocked by classification ceiling` | Session-Taint ueberschreitet die Obergrenze des Skills | Kann diesen Skill auf aktuellem Taint-Level nicht verwenden |
| `Skill content integrity check failed` | Skill-Dateien wurden nach Installation geaendert | Skill erneut installieren |
| `Skill install rejected by scanner` | Sicherheitsscanner hat verdaechtige Inhalte gefunden | Scan-Warnungen ueberpruefen |
| `Delegation certificate signature invalid` | Delegationskette hat eine ungueltige Signatur | Delegation erneut ausstellen |
| `Delegation certificate expired` | Delegation ist abgelaufen | Mit laengerer TTL erneut ausstellen |
| `Webhook HMAC verification failed` | Webhook-Signatur stimmt nicht ueberein | Shared-Secret-Konfiguration pruefen |
| `Webhook replay detected` | Doppelter Webhook-Payload empfangen | Kein Fehler wenn erwartet; sonst untersuchen |
| `Webhook rate limit exceeded` | Zu viele Webhook-Aufrufe von einer Quelle | Webhook-Frequenz reduzieren |

## Browser

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Browser launch failed` | Chrome/Chromium konnte nicht gestartet werden | Chromium-basierten Browser installieren |
| `Direct Chrome process launch failed` | Chrome-Binaerdatei konnte nicht ausgefuehrt werden | Binaer-Berechtigungen und Abhaengigkeiten pruefen |
| `Flatpak Chrome launch failed` | Flatpak-Chrome-Wrapper fehlgeschlagen | Flatpak-Installation pruefen |
| `CDP endpoint not ready after Xms` | Chrome hat Debug-Port nicht rechtzeitig geoeffnet | System ist moeglicherweise ressourcenbeschraenkt |
| `Navigation blocked by domain policy` | URL zielt auf blockierte Domain oder private IP | Oeffentliche URL verwenden |
| `Navigation failed` | Seitenlade-Fehler oder Timeout | URL und Netzwerk pruefen |
| `Click/Type/Select failed on "selector"` | CSS-Selektor hat kein Element gefunden | Selektor gegen das Seiten-DOM pruefen |
| `Snapshot failed` | Seitenzustand konnte nicht erfasst werden | Seite ist moeglicherweise leer oder JavaScript hat Fehler |

## Ausfuehrung & Sandbox

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Working directory path escapes workspace jail` | Pfad-Traversierungsversuch in Exec-Umgebung | Pfade innerhalb des Workspace verwenden |
| `Working directory does not exist` | Angegebenes Arbeitsverzeichnis nicht gefunden | Verzeichnis zuerst erstellen |
| `Workspace access denied for PUBLIC session` | PUBLIC-Sessions koennen keine Workspaces verwenden | Workspace erfordert INTERNAL+-Klassifizierung |
| `Workspace path traversal attempt blocked` | Pfad hat versucht, Workspace-Grenze zu verlassen | Relative Pfade innerhalb des Workspace verwenden |
| `Workspace agentId rejected: empty after sanitization` | Agenten-ID enthaelt nur ungueltige Zeichen | Agenten-Konfiguration pruefen |
| `Sandbox worker unhandled error` | Plugin-Sandbox-Worker ist abgestuerzt | Plugin-Code auf Fehler pruefen |
| `Sandbox has been shut down` | Operation auf zerstoerter Sandbox versucht | Daemon neu starten |

## Scheduler

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Trigger callback failed` | Trigger-Handler hat eine Exception geworfen | TRIGGER.md auf Probleme pruefen |
| `Trigger store persist failed` | Trigger-Ergebnisse koennen nicht gespeichert werden | Storage-Konnektivitaet pruefen |
| `Notification delivery failed` | Trigger-Benachrichtigung konnte nicht gesendet werden | Kanal-Konnektivitaet pruefen |
| `Cron expression parse error` | Ungueltiger Cron-Ausdruck | Ausdruck in `scheduler.cron.jobs` korrigieren |

## Selbst-Update

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Triggerfish self-update failed` | Update-Prozess hat einen Fehler festgestellt | Spezifischen Fehler in Logs pruefen |
| `Binary replacement failed` | Alte Binaerdatei konnte nicht durch neue ersetzt werden | Dateiberechtigungen pruefen; Daemon zuerst stoppen |
| `Checksum file download failed` | SHA256SUMS.txt konnte nicht heruntergeladen werden | Netzwerkverbindung pruefen |
| `Asset not found in SHA256SUMS.txt` | Release fehlt Pruefsumme fuer Ihre Plattform | GitHub-Issue erstellen |
| `Checksum verification exception` | Hash der heruntergeladenen Binaerdatei stimmt nicht ueberein | Erneut versuchen; Download wurde moeglicherweise beschaedigt |
