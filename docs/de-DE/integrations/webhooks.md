# Webhooks

Triggerfish kann eingehende Ereignisse von externen Diensten empfangen und so Echtzeit-Reaktionen auf E-Mails, Fehlerwarnungen, CI/CD-Ereignisse, Kalenderaenderungen und mehr ermoeglichen. Webhooks verwandeln Ihren Agenten von einem reaktiven Frage-Antwort-System in einen proaktiven Teilnehmer Ihrer Workflows.

## Funktionsweise von Webhooks

Externe Dienste senden HTTP-POST-Anfragen an registrierte Webhook-Endpunkte auf dem Triggerfish-Gateway. Jedes eingehende Ereignis wird auf Authentizitaet geprueft, klassifiziert und zur Verarbeitung an den Agenten weitergeleitet.

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook-Pipeline: Externe Dienste senden HTTP POST durch HMAC-Verifizierung, Klassifizierung, Session-Isolation und Policy-Hooks zur Agenten-Verarbeitung" style="max-width: 100%;" />

## Unterstuetzte Ereignisquellen

Triggerfish kann Webhooks von jedem Dienst empfangen, der HTTP-Webhook-Zustellung unterstuetzt. Haeufige Integrationen umfassen:

| Quelle   | Mechanismus                | Beispiel-Ereignisse                   |
| -------- | -------------------------- | ------------------------------------- |
| Gmail    | Pub/Sub-Push-Benachrichtigungen | Neue E-Mail, Label-Aenderung        |
| GitHub   | Webhook                    | PR geoeffnet, Issue-Kommentar, CI-Fehler |
| Sentry   | Webhook                    | Fehlerwarnung, Regression erkannt     |
| Stripe   | Webhook                    | Zahlung erhalten, Abonnement-Aenderung |
| Calendar | Polling oder Push          | Terminerinnerung, Konflikt erkannt    |
| Benutzerdefiniert | Generischer Webhook-Endpunkt | Beliebiges JSON-Payload          |

## Konfiguration

Webhook-Endpunkte werden in `triggerfish.yaml` konfiguriert:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # Secret im Betriebssystem-Schluesselbund gespeichert
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # Secret im Betriebssystem-Schluesselbund gespeichert
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # Secret im Betriebssystem-Schluesselbund gespeichert
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Konfigurationsfelder

| Feld              | Erforderlich | Beschreibung                                             |
| ----------------- | :----------: | -------------------------------------------------------- |
| `id`              |     Ja       | Eindeutiger Bezeichner fuer diesen Webhook-Endpunkt      |
| `path`            |     Ja       | URL-Pfad, unter dem der Endpunkt registriert ist         |
| `secret`          |     Ja       | Gemeinsames Secret fuer HMAC-Signaturverifizierung       |
| `classification`  |     Ja       | Klassifizierungsstufe fuer Ereignisse aus dieser Quelle  |
| `actions`         |     Ja       | Liste von Ereignis-zu-Aufgaben-Zuordnungen               |
| `actions[].event` |     Ja       | Zu vergleichendes Ereignistyp-Muster                     |
| `actions[].task`  |     Ja       | Natuerlichsprachliche Aufgabe fuer den Agenten           |

::: tip Webhook-Secrets werden im Betriebssystem-Schluesselbund gespeichert. Fuehren Sie `triggerfish dive` aus oder konfigurieren Sie Webhooks interaktiv, um sie sicher einzugeben. :::

## HMAC-Signaturverifizierung

Jede eingehende Webhook-Anfrage wird vor der Verarbeitung des Payloads auf Authentizitaet mittels HMAC-Signaturvalidierung geprueft.

### Wie die Verifizierung funktioniert

1. Der externe Dienst sendet einen Webhook mit einem Signatur-Header (zum Beispiel `X-Hub-Signature-256` fuer GitHub)
2. Triggerfish berechnet den HMAC des Anfrage-Bodys mit dem konfigurierten gemeinsamen Secret
3. Die berechnete Signatur wird mit der Signatur im Anfrage-Header verglichen
4. Wenn die Signaturen nicht uebereinstimmen, wird die Anfrage **sofort abgelehnt**
5. Bei erfolgreicher Verifizierung wird das Payload zur Klassifizierung und Verarbeitung weitergeleitet

<img src="/diagrams/hmac-verification.svg" alt="HMAC-Verifizierungsablauf: Signaturpraesenz pruefen, HMAC berechnen, Signaturen vergleichen, ablehnen oder fortfahren" style="max-width: 100%;" />

::: warning SICHERHEIT Webhook-Anfragen ohne gueltige HMAC-Signaturen werden abgelehnt, bevor eine Verarbeitung stattfindet. Dies verhindert, dass gefaelschte Ereignisse Agenten-Aktionen ausloesen. Deaktivieren Sie die Signaturverifizierung niemals in der Produktion. :::

## Ereignisverarbeitungs-Pipeline

Sobald ein Webhook-Ereignis die Signaturverifizierung bestanden hat, durchlaeuft es die Standard-Sicherheits-Pipeline:

### 1. Klassifizierung

Das Ereignis-Payload wird auf der fuer den Webhook-Endpunkt konfigurierten Stufe klassifiziert. Ein als `CONFIDENTIAL` konfigurierter Webhook-Endpunkt erzeugt `CONFIDENTIAL`-Ereignisse.

### 2. Session-Isolation

Jedes Webhook-Ereignis erzeugt seine eigene isolierte Session. Das bedeutet:

- Das Ereignis wird unabhaengig von laufenden Konversationen verarbeitet
- Session-Taint startet frisch (auf der Klassifizierungsstufe des Webhooks)
- Keine Daten lecken zwischen webhook-ausgeloesten Sessions und Benutzer-Sessions
- Jede Session erhaelt ihr eigenes Taint-Tracking und Lineage

### 3. PRE_CONTEXT_INJECTION-Hook

Das Ereignis-Payload durchlaeuft den `PRE_CONTEXT_INJECTION`-Hook, bevor es in den Agenten-Kontext eintritt. Dieser Hook:

- Validiert die Payload-Struktur
- Wendet Klassifizierung auf alle Datenfelder an
- Erstellt einen Lineage-Datensatz fuer die eingehenden Daten
- Scannt String-Felder auf Injection-Muster
- Kann das Ereignis blockieren, wenn Policy-Regeln es vorschreiben

### 4. Agenten-Verarbeitung

Der Agent empfaengt das klassifizierte Ereignis und fuehrt die konfigurierte Aufgabe aus. Die Aufgabe ist eine natuerlichsprachliche Anweisung -- der Agent nutzt seine vollen Faehigkeiten (Tools, Skills, Browser, Exec-Umgebung), um sie innerhalb der Policy-Beschraenkungen zu erledigen.

### 5. Ausgabe-Zustellung

Jede Ausgabe des Agenten (Nachrichten, Benachrichtigungen, Aktionen) durchlaeuft den `PRE_OUTPUT`-Hook. Die No-Write-Down-Regel gilt: Ausgaben einer `CONFIDENTIAL` webhook-ausgeloesten Session koennen nicht an einen `PUBLIC`-Kanal gesendet werden.

### 6. Audit

Der vollstaendige Ereignis-Lebenszyklus wird protokolliert: Empfang, Verifizierung, Klassifizierung, Session-Erstellung, Agenten-Aktionen und Ausgabe-Entscheidungen.

## Integration mit dem Scheduler

Webhooks integrieren sich natuerlich mit Triggerfishs [Cron- und Trigger-System](/de-DE/features/cron-and-triggers). Ein Webhook-Ereignis kann:

- **Einen bestehenden Cron-Job vorzeitig ausloesen** (zum Beispiel loest ein Deployment-Webhook einen sofortigen Health-Check aus)
- **Eine neue geplante Aufgabe erstellen** (zum Beispiel plant ein Kalender-Webhook eine Erinnerung)
- **Trigger-Prioritaeten aktualisieren** (zum Beispiel laesst ein Sentry-Alert den Agenten die Fehleruntersuchung beim naechsten Trigger-Wakeup priorisieren)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # Secret im Betriebssystem-Schluesselbund gespeichert
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # Agent kann cron.create verwenden, um Folge-Checks zu planen
```

## Sicherheitszusammenfassung

| Kontrolle               | Beschreibung                                                                    |
| ----------------------- | ------------------------------------------------------------------------------- |
| HMAC-Verifizierung      | Alle eingehenden Webhooks werden vor der Verarbeitung verifiziert                |
| Klassifizierung         | Webhook-Payloads werden auf der konfigurierten Stufe klassifiziert               |
| Session-Isolation       | Jedes Ereignis erhaelt seine eigene isolierte Session                            |
| `PRE_CONTEXT_INJECTION` | Payload wird gescannt und klassifiziert, bevor es in den Kontext eintritt        |
| No Write-Down           | Ausgaben von hoch klassifizierten Ereignissen koennen nicht an niedrig klassifizierte Kanaele gelangen |
| Audit-Logging           | Vollstaendiger Ereignis-Lebenszyklus wird aufgezeichnet                          |
| Nicht oeffentlich exponiert | Webhook-Endpunkte sind standardmaessig nicht dem oeffentlichen Internet ausgesetzt |

## Beispiel: GitHub-PR-Review-Schleife

Ein reales Beispiel fuer Webhooks in Aktion: Der Agent oeffnet einen PR, dann treiben GitHub-Webhook-Ereignisse die Code-Review-Feedback-Schleife ohne Polling voran.

### Funktionsweise

1. Der Agent erstellt einen Feature-Branch, committet Code und oeffnet einen PR ueber `gh pr create`
2. Der Agent schreibt eine Tracking-Datei nach `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` mit Branch-Name, PR-Nummer und Aufgabenkontext
3. Der Agent stoppt und wartet -- kein Polling

Wenn ein Reviewer Feedback gibt:

4. GitHub sendet einen `pull_request_review`-Webhook an Triggerfish
5. Triggerfish verifiziert die HMAC-Signatur, klassifiziert das Ereignis und erzeugt eine isolierte Session
6. Der Agent liest die Tracking-Datei, um den Kontext wiederherzustellen, checkt den Branch aus, adressiert das Review, committet, pusht und kommentiert auf dem PR
7. Schritte 4-6 wiederholen sich, bis das Review genehmigt ist

Wenn der PR gemergt wird:

8. GitHub sendet einen `pull_request.closed`-Webhook mit `merged: true`
9. Der Agent raeumt auf: loescht den lokalen Branch, archiviert die Tracking-Datei

### Konfiguration

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # Secret im Betriebssystem-Schluesselbund gespeichert
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

Der GitHub-Webhook muss senden: `Pull requests`, `Pull request reviews`, `Pull request review comments` und `Issue comments`.

Siehe die vollstaendige [GitHub-Integration](/de-DE/integrations/github)-Anleitung fuer Einrichtungsanweisungen und den `git-branch-management`-gebundelten Skill fuer den vollstaendigen Agenten-Workflow.

### Enterprise-Kontrollen

- **Webhook-Allowlist** vom Administrator verwaltet -- nur genehmigte externe Quellen koennen Endpunkte registrieren
- **Rate-Limiting** pro Endpunkt zur Missbrauchsverhinderung
- **Payload-Groessenlimits** zur Verhinderung von Speichererschoepfung
- **IP-Allowlisting** fuer zusaetzliche Quellenverifizierung
- **Aufbewahrungsrichtlinien** fuer Webhook-Ereignisprotokolle

::: info Webhook-Endpunkte werden standardmaessig nicht dem oeffentlichen Internet ausgesetzt. Damit externe Dienste Ihre Triggerfish-Instanz erreichen koennen, muessen Sie Portweiterleitung, einen Reverse Proxy oder einen Tunnel konfigurieren. Der Abschnitt [Remote-Zugriff](/de-DE/reference/) der Dokumentation behandelt sichere Exponierungsoptionen. :::
