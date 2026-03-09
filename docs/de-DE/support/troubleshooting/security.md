# Fehlerbehebung: Sicherheit & Klassifizierung

## Write-Down-Blockierungen

### "Write-down blocked"

Dies ist der haeufigste Sicherheitsfehler. Er bedeutet, dass Daten versuchen, von einer hoeheren Klassifizierungsstufe zu einer niedrigeren zu fliessen.

**Beispiel:** Ihre Session hat auf CONFIDENTIAL-Daten zugegriffen (eine klassifizierte Datei gelesen, eine klassifizierte Datenbank abgefragt). Der Session-Taint ist jetzt CONFIDENTIAL. Sie haben dann versucht, die Antwort an einen PUBLIC-WebChat-Kanal zu senden. Die Policy-Engine blockiert dies, weil CONFIDENTIAL-Daten nicht an PUBLIC-Ziele fliessen koennen.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Wie Sie das loesen:**
1. **Starten Sie eine neue Session.** Eine frische Session beginnt mit PUBLIC-Taint. Verwenden Sie ein neues Gespraech.
2. **Verwenden Sie einen hoeher klassifizierten Kanal.** Senden Sie die Antwort ueber einen Kanal, der auf CONFIDENTIAL oder hoeher klassifiziert ist.
3. **Verstehen Sie, was den Taint verursacht hat.** Pruefen Sie die Logs auf "Taint escalation"-Eintraege, um zu sehen, welcher Tool-Aufruf die Klassifizierung der Session erhoeht hat.

### "Session taint cannot flow to channel"

Dasselbe wie Write-Down, aber speziell bezogen auf die Kanal-Klassifizierung:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Tool-Aufrufe an klassifizierte Integrationen erzwingen ebenfalls Write-Down:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

Dies sieht umgekehrt aus. Der Session-Taint ist hoeher als die Klassifizierung des Tools. Das bedeutet, die Session ist zu stark kontaminiert, um ein niedriger klassifiziertes Tool zu verwenden. Die Sorge ist, dass der Aufruf des Tools klassifizierten Kontext in ein weniger sicheres System leaken koennte.

### "Workspace write-down blocked"

Agenten-Workspaces haben pro Verzeichnis eine Klassifizierung. Das Schreiben in ein niedriger klassifiziertes Verzeichnis aus einer hoeher kontaminierten Session wird blockiert:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint-Eskalation

### "Taint escalation"

Dies ist informativ, kein Fehler. Es bedeutet, dass die Klassifizierungsstufe der Session gerade gestiegen ist, weil der Agent auf klassifizierte Daten zugegriffen hat.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint steigt nur an, sinkt nie. Sobald eine Session auf CONFIDENTIAL kontaminiert ist, bleibt sie dort fuer den Rest der Session.

### "Resource-based taint escalation firing"

Ein Tool-Aufruf hat auf eine Ressource mit einer hoeheren Klassifizierung als dem aktuellen Session-Taint zugegriffen. Der Session-Taint wird automatisch angepasst.

### "Non-owner taint applied"

Nicht-Eigentuemer-Benutzer koennen ihre Sessions basierend auf der Kanal-Klassifizierung oder den Benutzerberechtigungen kontaminiert bekommen. Dies ist unabhaengig von der ressourcenbasierten Kontaminierung.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

Alle ausgehenden HTTP-Anfragen (web_fetch, Browser-Navigation, MCP-SSE-Verbindungen) durchlaufen den SSRF-Schutz. Wenn der Ziel-Hostname sich zu einer privaten IP-Adresse aufloest, wird die Anfrage blockiert.

**Blockierte Bereiche:**
- `127.0.0.0/8` (Loopback)
- `10.0.0.0/8` (privat)
- `172.16.0.0/12` (privat)
- `192.168.0.0/16` (privat)
- `169.254.0.0/16` (Link-Local)
- `0.0.0.0/8` (nicht spezifiziert)
- `::1` (IPv6-Loopback)
- `fc00::/7` (IPv6-ULA)
- `fe80::/10` (IPv6-Link-Local)

Dieser Schutz ist fest codiert und kann nicht deaktiviert oder konfiguriert werden. Er verhindert, dass der KI-Agent dazu gebracht wird, auf interne Dienste zuzugreifen.

**IPv4-gemapptes IPv6:** Adressen wie `::ffff:127.0.0.1` werden erkannt und blockiert.

### "SSRF check blocked outbound request"

Dasselbe wie oben, aber vom web_fetch-Tool protokolliert statt vom SSRF-Modul.

### DNS-Aufloesungsfehler

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Der Hostname konnte nicht aufgeloest werden. Pruefen Sie:
- Die URL ist korrekt geschrieben
- Ihr DNS-Server ist erreichbar
- Die Domain existiert tatsaechlich

---

## Policy-Engine

### "Hook evaluation failed, defaulting to BLOCK"

Ein Policy-Hook hat waehrend der Auswertung eine Exception geworfen. In diesem Fall ist die Standardaktion BLOCK (ablehnen). Dies ist der sichere Standard.

Pruefen Sie die Logs auf die vollstaendige Exception. Sie deutet wahrscheinlich auf einen Fehler in einer benutzerdefinierten Policy-Regel hin.

### "Policy rule blocked action"

Eine Policy-Regel hat die Aktion explizit abgelehnt. Der Log-Eintrag enthaelt, welche Regel ausgeloest wurde und warum. Pruefen Sie den `policy.rules`-Abschnitt Ihrer Konfiguration, um zu sehen, welche Regeln definiert sind.

### "Tool floor violation"

Ein Tool wurde aufgerufen, das eine Mindest-Klassifizierungsstufe erfordert, aber die Session liegt unter dieser Stufe.

**Beispiel:** Das Healthcheck-Tool erfordert mindestens INTERNAL-Klassifizierung (weil es Systeminterna offenlegt). Wenn eine PUBLIC-Session versucht, es zu verwenden, wird der Aufruf blockiert.

---

## Plugin- & Skill-Sicherheit

### "Plugin network access blocked"

Plugins laufen in einer Sandbox mit eingeschraenktem Netzwerkzugriff. Sie koennen nur auf URLs ihrer deklarierten Endpunkt-Domain zugreifen.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Das Plugin hat versucht, auf eine URL zuzugreifen, die nicht in seinen deklarierten Endpunkten liegt, oder die URL hat sich zu einer privaten IP aufgeloest.

### "Skill activation blocked by classification ceiling"

Skills deklarieren eine `classification_ceiling` in ihrem SKILL.md-Frontmatter. Wenn die Obergrenze unter dem Taint-Level der Session liegt, kann der Skill nicht aktiviert werden:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Dies verhindert, dass ein niedriger klassifizierter Skill hoeher klassifizierten Daten ausgesetzt wird.

### "Skill content integrity check failed"

Nach der Installation hasht Triggerfish den Inhalt des Skills. Wenn sich der Hash aendert (der Skill wurde nach der Installation modifiziert), schlaegt die Integritaetspruefung fehl:

```
Skill content hash mismatch detected
```

Dies koennte auf Manipulation hinweisen. Installieren Sie den Skill aus einer vertrauenswuerdigen Quelle erneut.

### "Skill install rejected by scanner"

Der Sicherheitsscanner hat verdaechtige Inhalte im Skill gefunden. Der Scanner prueft auf Muster, die auf boesartiges Verhalten hindeuten koennten. Die spezifischen Warnungen sind in der Fehlermeldung enthalten.

---

## Session-Sicherheit

### "Session not found"

```
Session not found: <session-id>
```

Die angeforderte Session existiert nicht im Session-Manager. Sie wurde moeglicherweise bereinigt, oder die Session-ID ist ungueltig.

### "Session status access denied: taint exceeds caller"

Sie haben versucht, den Status einer Session anzuzeigen, aber diese Session hat ein hoeheres Taint-Level als Ihre aktuelle Session. Dies verhindert, dass niedriger klassifizierte Sessions ueber hoeher klassifizierte Operationen erfahren.

### "Session history access denied"

Dasselbe Konzept wie oben, aber fuer das Anzeigen des Gespraechsverlaufs.

---

## Agenten-Teams

### "Team message delivery denied: team status is ..."

Das Team befindet sich nicht im Status `running`. Dies passiert, wenn:

- Das Team **aufgeloest** wurde (manuell oder durch den Lebenszyklus-Monitor)
- Das Team **pausiert** wurde, weil die Lead-Session fehlgeschlagen ist
- Das Team **ein Timeout** hatte, nachdem es seine Lebensdauer ueberschritten hat

Pruefen Sie den aktuellen Status des Teams mit `team_status`. Wenn das Team aufgrund eines Lead-Fehlers pausiert ist, koennen Sie es mit `team_disband` aufloesen und ein neues erstellen.

### "Team member not found" / "Team member ... is not active"

Das Zielmitglied existiert entweder nicht (falscher Rollenname) oder wurde beendet. Mitglieder werden beendet, wenn:

- Sie das Leerlauf-Timeout ueberschreiten (2x `idle_timeout_seconds`)
- Das Team aufgeloest wird
- Ihre Session abstuerzt und der Lebenszyklus-Monitor dies erkennt

Verwenden Sie `team_status`, um alle Mitglieder und ihren aktuellen Status zu sehen.

### "Team disband denied: only the lead or creating session can disband"

Nur zwei Sessions koennen ein Team aufloesen:

1. Die Session, die urspruenglich `team_create` aufgerufen hat
2. Die Session des Lead-Mitglieds

Wenn Sie diesen Fehler innerhalb des Teams erhalten, ist das aufrufende Mitglied nicht der Lead. Wenn Sie ihn ausserhalb des Teams erhalten, sind Sie nicht die Session, die es erstellt hat.

### Team-Lead schlaegt sofort nach Erstellung fehl

Die Agenten-Session des Leads konnte ihren ersten Zug nicht abschliessen. Haeufige Ursachen:

1. **LLM-Provider-Fehler:** Der Provider hat einen Fehler zurueckgegeben (Rate-Limit, Auth-Fehler, Modell nicht gefunden). Pruefen Sie `triggerfish logs` auf Provider-Fehler.
2. **Klassifizierungsobergrenze zu niedrig:** Wenn der Lead Tools benoetigt, die ueber seiner Obergrenze klassifiziert sind, kann die Session bei ihrem ersten Tool-Aufruf fehlschlagen.
3. **Fehlende Tools:** Der Lead benoetigt moeglicherweise bestimmte Tools, um die Arbeit aufzuteilen. Stellen Sie sicher, dass Tool-Profile korrekt konfiguriert sind.

### Team-Mitglieder sind inaktiv und erzeugen keine Ausgabe

Mitglieder warten darauf, dass der Lead ihnen Arbeit ueber `sessions_send` zuweist. Wenn der Lead die Aufgabe nicht aufteilt:

- Das Modell des Leads versteht moeglicherweise die Team-Koordination nicht. Versuchen Sie ein leistungsfaehigeres Modell fuer die Lead-Rolle.
- Die `task`-Beschreibung ist moeglicherweise zu vage, damit der Lead sie in Teilaufgaben aufteilen kann.
- Pruefen Sie `team_status`, um zu sehen, ob der Lead `active` ist und kuerzliche Aktivitaet hat.

### "Write-down blocked" zwischen Team-Mitgliedern

Team-Mitglieder folgen den gleichen Klassifizierungsregeln wie alle Sessions. Wenn ein Mitglied auf `CONFIDENTIAL` kontaminiert wurde und versucht, Daten an ein Mitglied mit `PUBLIC` zu senden, blockiert die Write-Down-Pruefung dies. Dies ist erwartetes Verhalten — klassifizierte Daten koennen nicht an niedriger klassifizierte Sessions fliessen, auch nicht innerhalb eines Teams.

---

## Delegation & Multi-Agent

### "Delegation certificate signature invalid"

Agenten-Delegation verwendet kryptographische Zertifikate. Wenn die Signaturpruefung fehlschlaegt, wird die Delegation abgelehnt. Dies verhindert gefaelschte Delegationsketten.

### "Delegation certificate expired"

Das Delegationszertifikat hat eine Lebenszeit. Wenn es abgelaufen ist, kann der delegierte Agent nicht mehr im Namen des Delegierenden handeln.

### "Delegation chain linkage broken"

Bei mehrstufigen Delegationen (A delegiert an B, B delegiert an C) muss jedes Glied in der Kette gueltig sein. Wenn ein Glied gebrochen ist, wird die gesamte Kette abgelehnt.

---

## Webhooks

### "Webhook HMAC verification failed"

Eingehende Webhooks erfordern HMAC-Signaturen zur Authentifizierung. Wenn die Signatur fehlt, fehlerhaft ist oder nicht uebereinstimmt:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Pruefen Sie:
- Die Webhook-Quelle sendet den korrekten HMAC-Signatur-Header
- Das Shared-Secret in Ihrer Konfiguration stimmt mit dem Secret der Quelle ueberein
- Das Signaturformat stimmt ueberein (hex-kodiertes HMAC-SHA256)

### "Webhook replay detected"

Triggerfish enthaelt Replay-Schutz. Wenn ein Webhook-Payload ein zweites Mal empfangen wird (gleiche Signatur), wird er abgelehnt.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

Zu viele Webhook-Anfragen von derselben Quelle in kurzer Zeit. Dies schuetzt vor Webhook-Fluten. Warten Sie und versuchen Sie es erneut.

---

## Audit-Integritaet

### "previousHash mismatch"

Das Audit-Log verwendet Hash-Verkettung. Jeder Eintrag enthaelt den Hash des vorherigen Eintrags. Wenn die Kette gebrochen ist, bedeutet das, dass das Audit-Log manipuliert oder beschaedigt wurde.

### "HMAC mismatch"

Die HMAC-Signatur des Audit-Eintrags stimmt nicht ueberein. Der Eintrag wurde moeglicherweise nach der Erstellung modifiziert.
