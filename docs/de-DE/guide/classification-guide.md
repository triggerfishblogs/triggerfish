# Klassifizierungsstufen waehlen

Jeder Kanal, MCP-Server, jede Integration und jedes Plugin in Triggerfish muss eine Klassifizierungsstufe haben. Diese Seite hilft Ihnen, die richtige zu waehlen.

## Die vier Stufen

| Stufe            | Was sie bedeutet                                          | Daten fliessen zu...               |
| ---------------- | --------------------------------------------------------- | ---------------------------------- |
| **PUBLIC**       | Fuer jeden sicher einsehbar                               | Ueberall hin                       |
| **INTERNAL**     | Nur fuer Sie -- nichts Sensibles, aber nicht oeffentlich  | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | Enthaelt sensible Daten, die nie durchsickern sollten     | CONFIDENTIAL, RESTRICTED           |
| **RESTRICTED**   | Am sensibelsten -- rechtlich, medizinisch, finanziell, PII | Nur RESTRICTED                     |

Daten koennen nur **aufwaerts oder seitwaerts** fliessen, niemals abwaerts. Dies ist die [No-Write-Down-Regel](/de-DE/security/no-write-down), die nicht ueberschrieben werden kann.

## Zwei Fragen stellen

Fuer jede Integration, die Sie konfigurieren, fragen Sie:

**1. Was sind die sensibelsten Daten, die diese Quelle zurueckgeben koennte?**

Dies bestimmt die **minimale** Klassifizierungsstufe. Wenn ein MCP-Server Finanzdaten zurueckgeben koennte, muss er mindestens CONFIDENTIAL sein -- selbst wenn die meisten seiner Tools harmlose Metadaten zurueckgeben.

**2. Waere es fuer Sie in Ordnung, wenn Session-Daten _zu_ diesem Ziel fliessen?**

Dies bestimmt die **maximale** Klassifizierungsstufe, die Sie zuweisen moechten. Eine hoehere Klassifizierung bedeutet, dass der Session-Taint eskaliert, wenn Sie sie nutzen, was einschraenkt, wohin Daten danach fliessen koennen.

## Klassifizierung nach Datentyp

| Datentyp                                            | Empfohlene Stufe   | Warum                                          |
| --------------------------------------------------- | ------------------ | ---------------------------------------------- |
| Wetter, oeffentliche Webseiten, Zeitzonen           | **PUBLIC**         | Fuer jeden frei verfuegbar                     |
| Ihre persoenlichen Notizen, Lesezeichen, Aufgabenlisten | **INTERNAL**   | Privat, aber nicht schaedlich bei Offenlegung   |
| Interne Wikis, Team-Dokumente, Projektboards        | **INTERNAL**       | Organisationsinterne Informationen             |
| E-Mail, Kalendereintraege, Kontakte                 | **CONFIDENTIAL**   | Enthaelt Namen, Zeitplaene, Beziehungen        |
| CRM-Daten, Vertriebspipeline, Kundendatensaetze     | **CONFIDENTIAL**   | Geschaeftssensibel, Kundendaten                |
| Finanzunterlagen, Bankkonten, Rechnungen             | **CONFIDENTIAL**   | Monetaere Informationen                        |
| Quellcode-Repositories (privat)                      | **CONFIDENTIAL**   | Geistiges Eigentum                             |
| Medizinische oder Gesundheitsdaten                   | **RESTRICTED**     | Gesetzlich geschuetzt (HIPAA usw.)             |
| Ausweisnummern, SSNs, Reisepaesse                    | **RESTRICTED**     | Identitaetsdiebstahlrisiko                     |
| Rechtliche Dokumente, Vertraege unter NDA            | **RESTRICTED**     | Rechtliche Exponierung                         |
| Verschluesselungsschluessel, Anmeldedaten, Secrets   | **RESTRICTED**     | Systemkompromittierungsrisiko                  |

## MCP-Server

Beim Hinzufuegen eines MCP-Servers zu `triggerfish.yaml` bestimmt die Klassifizierung zwei Dinge:

1. **Session-Taint** — der Aufruf eines beliebigen Tools auf diesem Server eskaliert die Session auf diese Stufe
2. **Write-Down-Praevention** — eine Session, die bereits ueber dieser Stufe getaintet ist, kann keine Daten _an_ diesen Server senden

```yaml
mcp_servers:
  # PUBLIC — offene Daten, keine Sensibilitaet
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — Ihr eigenes Dateisystem, privat aber keine Secrets
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/sie/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — greift auf private Repos, Kunden-Issues zu
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — Datenbank mit PII, Krankenakten, rechtlichen Dokumenten
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning STANDARD-VERWEIGERUNG Wenn Sie `classification` weglassen, wird der Server als **UNTRUSTED** registriert und das Gateway lehnt alle Tool-Aufrufe ab. Sie muessen explizit eine Stufe waehlen. :::

### Haeufige MCP-Server-Klassifizierungen

| MCP-Server                       | Vorgeschlagene Stufe | Begruendung                                         |
| -------------------------------- | -------------------- | --------------------------------------------------- |
| Dateisystem (oeffentliche Docs)  | PUBLIC               | Stellt nur oeffentlich verfuegbare Dateien bereit   |
| Dateisystem (Home-Verzeichnis)   | INTERNAL             | Persoenliche Dateien, nichts Geheimes              |
| Dateisystem (Arbeitsprojekte)    | CONFIDENTIAL         | Kann proprietaeren Code oder Daten enthalten       |
| GitHub (nur oeffentliche Repos)  | INTERNAL             | Code ist oeffentlich, aber Nutzungsmuster privat   |
| GitHub (private Repos)           | CONFIDENTIAL         | Proprietaerer Quellcode                            |
| Slack                            | CONFIDENTIAL         | Arbeitsplatzgespraeche, moeglicherweise sensibel   |
| Datenbank (Analytik/Berichte)    | CONFIDENTIAL         | Aggregierte Geschaeftsdaten                        |
| Datenbank (Produktion mit PII)   | RESTRICTED           | Enthaelt personenbezogene Daten                    |
| Wetter / Zeit / Rechner          | PUBLIC               | Keine sensiblen Daten                              |
| Websuche                         | PUBLIC               | Gibt oeffentlich verfuegbare Informationen zurueck |
| E-Mail                           | CONFIDENTIAL         | Namen, Gespraeche, Anhaenge                        |
| Google Drive                     | CONFIDENTIAL         | Dokumente koennen sensible Geschaeftsdaten enthalten |

## Kanaele

Die Kanal-Klassifizierung bestimmt die **Obergrenze** — die maximale Sensibilitaet von Daten, die an diesen Kanal zugestellt werden koennen.

```yaml
channels:
  cli:
    classification: INTERNAL # Ihr lokales Terminal — sicher fuer interne Daten
  telegram:
    classification: INTERNAL # Ihr privater Bot — gleich wie CLI fuer den Eigentuemer
  webchat:
    classification: PUBLIC # Anonyme Besucher — nur oeffentliche Daten
  email:
    classification: CONFIDENTIAL # E-Mail ist privat, koennte aber weitergeleitet werden
```

::: tip EIGENTUEMER vs. NICHT-EIGENTUEMER Fuer den **Eigentuemer** haben alle Kanaele die gleiche Vertrauensstufe — Sie sind Sie, unabhaengig davon, welche App Sie nutzen. Die Kanal-Klassifizierung ist am wichtigsten fuer **Nicht-Eigentuemer-Benutzer** (Besucher im WebChat, Mitglieder in einem Slack-Kanal usw.), wo sie steuert, welche Daten zu ihnen fliessen koennen. :::

### Kanal-Klassifizierung waehlen

| Frage                                                                           | Wenn ja...              | Wenn nein...            |
| ------------------------------------------------------------------------------- | ----------------------- | ----------------------- |
| Koennte ein Fremder Nachrichten auf diesem Kanal sehen?                         | **PUBLIC**              | Weiterlesen             |
| Ist dieser Kanal nur fuer Sie persoenlich?                                      | **INTERNAL** oder hoeher | Weiterlesen             |
| Koennten Nachrichten weitergeleitet, gescreenshottet oder von Dritten protokolliert werden? | Obergrenze **CONFIDENTIAL** | Koennte **RESTRICTED** sein |
| Ist der Kanal Ende-zu-Ende verschluesselt und unter Ihrer vollen Kontrolle?     | Koennte **RESTRICTED** sein | Obergrenze **CONFIDENTIAL** |

## Was passiert, wenn Sie falsch liegen

**Zu niedrig (z.B. CONFIDENTIAL-Server als PUBLIC markiert):**

- Daten von diesem Server eskalieren den Session-Taint nicht
- Session koennte klassifizierte Daten an oeffentliche Kanaele weiterleiten — **Datenleckrisiko**
- Dies ist die gefaehrliche Richtung

**Zu hoch (z.B. PUBLIC-Server als CONFIDENTIAL markiert):**

- Session-Taint eskaliert unnoetig bei Nutzung dieses Servers
- Sie werden daran gehindert, an niedriger klassifizierte Kanaele zu senden
- Aergerlich, aber **sicher** — im Zweifelsfall zu hoch klassifizieren

::: danger Im Zweifelsfall **hoeher klassifizieren**. Sie koennen es spaeter immer herabsetzen, nachdem Sie ueberprueft haben, welche Daten der Server tatsaechlich zurueckgibt. Zu niedrige Klassifizierung ist ein Sicherheitsrisiko; zu hohe Klassifizierung ist nur eine Unannehmlichkeit. :::

## Die Taint-Kaskade

Das Verstaendnis der praktischen Auswirkungen hilft Ihnen, klug zu waehlen. Folgendes geschieht in einer Session:

```
1. Session startet bei PUBLIC
2. Sie fragen nach dem Wetter (PUBLIC-Server)     → Taint bleibt PUBLIC
3. Sie pruefen Ihre Notizen (INTERNAL-Dateisystem) → Taint eskaliert zu INTERNAL
4. Sie fragen GitHub-Issues ab (CONFIDENTIAL)      → Taint eskaliert zu CONFIDENTIAL
5. Sie versuchen, im WebChat zu posten (PUBLIC-Kanal) → BLOCKIERT (Write-Down-Verletzung)
6. Sie setzen die Session zurueck                  → Taint kehrt zu PUBLIC zurueck
7. Sie posten im WebChat                           → erlaubt
```

Wenn Sie haeufig ein CONFIDENTIAL-Tool gefolgt von einem PUBLIC-Kanal verwenden, werden Sie oft zuruecksetzen muessen. Ueberlegen Sie, ob das Tool wirklich CONFIDENTIAL sein muss oder ob der Kanal umklassifiziert werden koennte.

## Dateisystem-Pfade

Sie koennen auch einzelne Dateisystem-Pfade klassifizieren, was nuetzlich ist, wenn Ihr Agent Zugang zu Verzeichnissen mit gemischter Sensibilitaet hat:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/sie/oeffentlich": PUBLIC
    "/home/sie/arbeit/kunden": CONFIDENTIAL
    "/home/sie/rechtlich": RESTRICTED
```

## Pruef-Checkliste

Vor dem Liveschalten mit einer neuen Integration:

- [ ] Was sind die schlimmsten Daten, die diese Quelle zurueckgeben koennte? Auf dieser Stufe klassifizieren.
- [ ] Ist die Klassifizierung mindestens so hoch wie die Datentyptabelle vorschlaegt?
- [ ] Wenn dies ein Kanal ist, ist die Klassifizierung fuer alle moeglichen Empfaenger angemessen?
- [ ] Haben Sie getestet, ob die Taint-Kaskade fuer Ihren typischen Workflow funktioniert?
- [ ] Haben Sie im Zweifelsfall hoeher statt niedriger klassifiziert?

## Verwandte Seiten

- [No-Write-Down-Regel](/de-DE/security/no-write-down) — die feste Datenflussregel
- [Konfiguration](/de-DE/guide/configuration) — vollstaendige YAML-Referenz
- [MCP Gateway](/de-DE/integrations/mcp-gateway) — MCP-Server-Sicherheitsmodell
