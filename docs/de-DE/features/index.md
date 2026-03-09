# Feature-Uebersicht

Ueber das [Sicherheitsmodell](/de-DE/security/) und die [Kanal-Unterstuetzung](/de-DE/channels/) hinaus bietet Triggerfish Faehigkeiten, die Ihren KI-Agenten ueber Frage-und-Antwort hinaus erweitern: geplante Aufgaben, persistenter Speicher, Web-Zugang, Spracheingabe und Multi-Model-Failover.

## Proaktives Verhalten

### [Cron und Triggers](./cron-and-triggers)

Planen Sie wiederkehrende Aufgaben mit Standard-Cron-Ausdruecken und definieren Sie proaktives Ueberwachungsverhalten ueber `TRIGGER.md`. Ihr Agent kann Morgen-Briefings liefern, Pipelines pruefen, auf ungelesene Nachrichten ueberwachen und autonom nach einem konfigurierbaren Zeitplan handeln -- alles mit Klassifizierungsdurchsetzung und isolierten Sessions.

### [Benachrichtigungen](./notifications)

Ein Benachrichtigungszustelldienst, der Nachrichten ueber alle verbundenen Kanaele mit Prioritaetsstufen, Offline-Warteschlangen und Deduplizierung weiterleitet. Ersetzt ad-hoc-Benachrichtigungsmuster durch eine einheitliche Abstraktion.

## Agenten-Tools

### [Websuche und Abruf](./web-search)

Durchsuchen Sie das Web und rufen Sie Seiteninhalte ab. Der Agent verwendet `web_search`, um Informationen zu finden, und `web_fetch`, um Webseiten zu lesen, mit SSRF-Praevention und Policy-Durchsetzung bei allen ausgehenden Anfragen.

### [Persistenter Speicher](./memory)

Session-uebergreifender Speicher mit Klassifizierungs-Gating. Der Agent speichert und ruft Fakten, Praeferenzen und Kontext ueber Gespraeche hinweg ab. Die Speicher-Klassifizierung wird auf den Session-Taint erzwungen -- das LLM kann die Stufe nicht waehlen.

### [Bildanalyse und Vision](./image-vision)

Fuegen Sie Bilder aus Ihrer Zwischenablage ein (Strg+V im CLI, Browser-Einfuegen in Tidepool) und analysieren Sie Bilddateien auf der Festplatte. Konfigurieren Sie ein separates Vision-Modell, um Bilder automatisch zu beschreiben, wenn das primaere Modell Vision nicht unterstuetzt.

### [Codebase-Exploration](./explore)

Strukturiertes Codebase-Verstaendnis ueber parallele Sub-Agenten. Das `explore`-Tool kartiert Verzeichnisbaeume, erkennt Coding-Patterns, verfolgt Imports und analysiert Git-History -- alles gleichzeitig.

### [Session-Verwaltung](./sessions)

Inspizieren, kommunizieren und erstellen Sie Sessions. Der Agent kann Hintergrundaufgaben delegieren, session-uebergreifende Nachrichten senden und ueber Kanaele hinweg kommunizieren -- alles unter Write-Down-Durchsetzung.

### [Plan-Modus und Aufgabenverfolgung](./planning)

Strukturierte Planung vor der Implementierung (Plan-Modus) und persistente Aufgabenverfolgung (Todos) ueber Sessions hinweg. Der Plan-Modus beschraenkt den Agenten auf Nur-Lese-Exploration, bis der Benutzer den Plan genehmigt.

### [Dateisystem und Shell](./filesystem)

Lesen, schreiben, suchen und Befehle ausfuehren. Die grundlegenden Tools fuer Dateioperationen, mit Workspace-Scoping und Command-Denylist-Durchsetzung.

### [Sub-Agenten und LLM-Aufgaben](./subagents)

Delegieren Sie Arbeit an autonome Sub-Agenten oder fuehren Sie isolierte LLM-Prompts fuer Zusammenfassung, Klassifizierung und fokussierte Argumentation aus, ohne das Hauptgespraech zu verunreinigen.

### [Agenten-Teams](./agent-teams)

Erstellen Sie persistente Teams zusammenarbeitender Agenten mit spezialisierten Rollen. Ein Leiter koordiniert Mitglieder, die autonom ueber Inter-Session-Messaging kommunizieren. Umfasst Lebenszyklus-Monitoring mit Leerlauf-Timeouts, Lebensdauer-Limits und Health-Checks. Am besten geeignet fuer komplexe Aufgaben, die von mehreren Perspektiven profitieren, die auf der Arbeit des jeweils anderen aufbauen.

## Reichhaltige Interaktion

### [Voice-Pipeline](./voice)

Volle Sprachunterstuetzung mit konfigurierbaren STT- und TTS-Anbietern. Verwenden Sie Whisper fuer lokale Transkription, Deepgram oder OpenAI fuer Cloud-STT, und ElevenLabs oder OpenAI fuer Text-to-Speech. Spracheingabe durchlaeuft dieselbe Klassifizierungs- und Policy-Durchsetzung wie Text.

### [Tide Pool / A2UI](./tidepool)

Ein agentengesteuerter visueller Workspace, in dem Triggerfish interaktive Inhalte rendert -- Dashboards, Diagramme, Formulare und Code-Vorschauen. Das A2UI-Protokoll (Agent-to-UI) sendet Echtzeit-Updates vom Agenten an verbundene Clients.

## Multi-Agent und Multi-Model

### [Multi-Agent-Routing](./multi-agent)

Leiten Sie verschiedene Kanaele, Konten oder Kontakte an separate isolierte Agenten weiter, jeder mit eigenem SPINE.md, Workspace, Skills und Klassifizierungsobergrenze. Ihr Arbeits-Slack geht an einen Agenten; Ihr persoenliches WhatsApp an einen anderen.

### [LLM-Anbieter und Failover](./model-failover)

Verbinden Sie sich mit Anthropic, OpenAI, Google, lokalen Modellen (Ollama) oder OpenRouter. Konfigurieren Sie Failover-Ketten, damit Ihr Agent automatisch auf einen alternativen Anbieter zurueckfaellt, wenn einer nicht verfuegbar ist. Jeder Agent kann ein anderes Modell verwenden.

### [Rate Limiting](./rate-limiting)

Gleitfenster-Rate-Limiter, der das Erreichen von LLM-Anbieter-API-Limits verhindert. Verfolgt Tokens-pro-Minute und Requests-pro-Minute, verzoegert Aufrufe bei erschoepfter Kapazitaet und integriert sich in die Failover-Kette.

## Betrieb

### [Strukturiertes Logging](./logging)

Einheitliches strukturiertes Logging mit Schweregrad-Stufen, Dateirotation und doppelter Ausgabe auf stderr und Datei. Komponentengetaggte Log-Zeilen, automatische 1-MB-Rotation und ein `log_read`-Tool fuer den Zugriff auf Log-Verlauf.

::: info Alle Features integrieren sich in das Kern-Sicherheitsmodell. Cron-Jobs respektieren Klassifizierungsobergrenzen. Spracheingabe traegt Taint. Tide-Pool-Inhalte durchlaufen den PRE_OUTPUT-Hook. Multi-Agent-Routing setzt Session-Isolation durch. Kein Feature umgeht die Policy-Schicht. :::
