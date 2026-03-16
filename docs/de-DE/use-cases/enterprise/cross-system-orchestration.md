---
title: Multi-System-Orchestrierung
description: Wie Triggerfish Workflows über 12+ Systeme hinweg mit kontextuellen Entscheidungen bei jedem Schritt bewältigt, ohne die Sprödigkeit, die traditionelle Automatisierung zunichte macht.
---

# Multi-System-Orchestrierung mit Entscheidungsfindung

Ein typischer Procure-to-Pay-Workflow berührt ein Dutzend Systeme. Eine Bestellanforderung beginnt in einer Plattform, wird in einer anderen zu einer Genehmigungskette weitergeleitet, löst eine Lieferantensuche in einer dritten aus, erstellt einen Bestellauftrag in einer vierten, startet einen Wareneinnahmprozess in einer fünften, gleicht Rechnungen in einer sechsten ab, plant die Zahlung in einer siebten und erfasst alles in einer achten. Jedes System hat seine eigene API, seinen eigenen Update-Zeitplan, sein eigenes Authentifizierungsmodell und seine eigenen Fehlertypen.

Traditionelle Automatisierung handhabt dies mit starren Pipelines. Schritt eins ruft API A auf, analysiert die Antwort, gibt ein Feld an Schritt zwei weiter, der API B aufruft. Es funktioniert, bis es nicht mehr funktioniert. Ein Lieferantendatensatz hat ein etwas anderes Format als erwartet. Eine Genehmigung kommt mit einem Statuscode zurück, für den die Pipeline nicht ausgelegt war. Ein neues Pflichtfeld erscheint in einem API-Update. Ein fehlerhafter Schritt unterbricht die gesamte Kette, und niemand weiß es, bis ein nachgelagerter Prozess Tage später ausfällt.

Das tiefere Problem ist nicht technische Sprödigkeit. Es ist, dass echte Geschäftsprozesse Urteilsvermögen erfordern. Sollte diese Rechnungsabweichung eskaliert oder automatisch gelöst werden? Rechtfertigt das Muster verspäteter Lieferungen dieses Lieferanten eine Vertragsüberprüfung? Ist diese Genehmigungsanfrage dringend genug, um die Standardweiterleitung zu überspringen? Diese Entscheidungen befinden sich derzeit in den Köpfen von Menschen, was bedeutet, dass die Automatisierung nur den Happy Path bewältigen kann.

## Wie Triggerfish das löst

Die Workflow-Engine von Triggerfish führt YAML-basierte Workflow-Definitionen aus, die deterministische Automatisierung mit KI-Reasoning in einer einzigen Pipeline kombinieren. Jeder Schritt im Workflow durchläuft dieselbe Sicherheitsdurchsetzungsschicht, die alle Triggerfish-Operationen steuert, sodass Klassifizierungsverfolgung und Audit-Trails über die gesamte Kette hinweg gelten, unabhängig davon, wie viele Systeme beteiligt sind.

### Deterministische Schritte für deterministische Arbeit

Wenn ein Workflow-Schritt eine bekannte Eingabe und eine bekannte Ausgabe hat, wird er als Standard-HTTP-Aufruf, Shell-Befehl oder MCP-Tool-Aufruf ausgeführt. Keine LLM-Beteiligung, kein Latenz-Overhead, keine Inferenzkosten. Die Workflow-Engine unterstützt `call: http` für REST-APIs, `call: triggerfish:mcp` für jeden verbundenen MCP-Server und `run: shell` für Befehlszeilen-Tools. Diese Schritte werden genauso ausgeführt wie traditionelle Automatisierung, weil für vorhersehbare Arbeit traditionelle Automatisierung der richtige Ansatz ist.

### LLM-Unteragenten für Entscheidungsfindung

Wenn ein Workflow-Schritt kontextuelles Reasoning erfordert, instanziiert die Engine eine echte LLM-Unteragenten-Sitzung mit `call: triggerfish:llm`. Das ist kein einzelnes Prompt/Antwort-Paar. Der Unteragent hat Zugriff auf jedes in Triggerfish registrierte Tool, einschließlich Websuche, Arbeitsspeicher, Browser-Automatisierung und alle verbundenen Integrationen. Er kann Dokumente lesen, Datenbanken abfragen, Datensätze vergleichen und eine Entscheidung auf Basis von allem treffen, was er findet.

Die Ausgabe des Unteragenten fließt direkt in den nächsten Workflow-Schritt. Wenn er während seines Reasonings auf klassifizierte Daten zugegriffen hat, steigt das Session-Taint automatisch an und propagiert zurück zum übergeordneten Workflow. Die Workflow-Engine verfolgt dies, sodass ein Workflow, der auf PUBLIC startete, aber während einer Entscheidungsfindung CONFIDENTIAL-Daten berührt hat, seine gesamte Ausführungsgeschichte auf CONFIDENTIAL-Ebene gespeichert bekommt. Eine niedriger klassifizierte Sitzung kann nicht einmal sehen, dass der Workflow ausgeführt wurde.

### Bedingte Verzweigung auf Basis des echten Kontexts

Das Workflow-DSL unterstützt `switch`-Blöcke für bedingte Weiterleitung, `for`-Schleifen für die Stapelverarbeitung und `set`-Operationen zur Aktualisierung des Workflow-Zustands. Kombiniert mit LLM-Unteragenten-Schritten, die komplexe Bedingungen auswerten können, bedeutet dies, dass der Workflow basierend auf dem tatsächlichen Geschäftskontext verzweigen kann, nicht nur auf Feldwerten.

Ein Beschaffungs-Workflow kann je nach Lieferantenrisikobewertung des Unteragenten unterschiedlich weiterleiten. Ein Onboarding-Workflow kann Schritte überspringen, die für eine bestimmte Rolle nicht relevant sind. Ein Incident-Response-Workflow kann je nach Ursachenanalyse des Unteragenten zu verschiedenen Teams eskalieren. Die Verzweigungslogik lebt in der Workflow-Definition, aber die Entscheidungseingaben kommen aus dem KI-Reasoning.

### Selbstheilung bei Systemänderungen

Wenn ein deterministischer Schritt fehlschlägt, weil eine API ihr Antwortformat geändert hat oder ein System einen unerwarteten Fehler zurückgegeben hat, hält der Workflow nicht einfach an. Die Engine kann den fehlgeschlagenen Schritt an einen LLM-Unteragenten delegieren, der den Fehler liest, die Antwort untersucht und einen alternativen Ansatz versucht. Eine API, die ein neues Pflichtfeld hinzugefügt hat, wird vom Unteragenten behandelt, der die Fehlermeldung liest und die Anfrage anpasst. Ein System, das seinen Authentifizierungsfluss geändert hat, wird von den Browser-Automatisierungstools navigiert.

Das bedeutet nicht, dass jeder Fehler magisch gelöst wird. Aber es bedeutet, dass der Workflow graceful degradiert statt stillschweigend zu versagen. Der Unteragent findet entweder einen Weg nach vorne oder liefert eine klare Erklärung, was sich geändert hat und warum manuelles Eingreifen erforderlich ist, anstatt eines kryptischen Fehlercodes, der in einer Protokolldatei vergraben ist, die niemand prüft.

### Sicherheit über die gesamte Kette

Jeder Schritt in einem Triggerfish-Workflow durchläuft dieselben Richtlinien-Durchsetzungs-Hooks wie jeder direkte Tool-Aufruf. PRE_TOOL_CALL validiert Berechtigungen und prüft Ratenbeschränkungen vor der Ausführung. POST_TOOL_RESPONSE klassifiziert die zurückgegebenen Daten und aktualisiert das Session-Taint. PRE_OUTPUT stellt sicher, dass nichts das System auf einem Klassifizierungsniveau verlässt, das über dem liegt, was das Ziel erlaubt.

Das bedeutet, dass ein Workflow, der aus Ihrem CRM (CONFIDENTIAL) liest, die Daten durch ein LLM verarbeitet und eine Zusammenfassung an Slack sendet, nicht versehentlich vertrauliche Details in einen öffentlichen Kanal preisgibt. Die Write-Down-Präventionsregel fängt dies beim PRE_OUTPUT-Hook ab, unabhängig davon, durch wie viele Zwischenschritte die Daten durchgegangen sind. Die Klassifizierung reist mit den Daten durch den gesamten Workflow.

Die Workflow-Definition selbst kann eine `classification_ceiling` setzen, die verhindert, dass der Workflow jemals Daten über einem bestimmten Niveau berührt. Ein wöchentlicher Zusammenfassungs-Workflow, der auf INTERNAL klassifiziert ist, kann nicht auf CONFIDENTIAL-Daten zugreifen, selbst wenn er die Anmeldedaten dazu hat. Die Obergrenze wird im Code durchgesetzt, nicht darauf gehofft, dass das LLM eine Prompt-Anweisung respektiert.

### Cron- und Webhook-Trigger

Workflows müssen nicht manuell gestartet werden. Der Scheduler unterstützt cron-basierte Trigger für wiederkehrende Workflows und Webhook-Trigger für ereignisgesteuerte Ausführung. Ein morgendlicher Briefing-Workflow läuft um 7 Uhr. Ein PR-Review-Workflow wird ausgelöst, wenn GitHub einen Webhook sendet. Ein Rechnungsverarbeitungs-Workflow löst aus, wenn eine neue Datei in einem freigegebenen Laufwerk erscheint.

Webhook-Ereignisse tragen ihr eigenes Klassifizierungsniveau. Ein GitHub-Webhook für ein privates Repository wird automatisch basierend auf den Domain-Klassifizierungsmappings in der Sicherheitskonfiguration auf CONFIDENTIAL klassifiziert. Der Workflow erbt diese Klassifizierung, und die gesamte nachgelagerte Durchsetzung gilt.

## So sieht das in der Praxis aus

Ein mittelständisches Unternehmen, das Procure-to-Pay über NetSuite, Coupa, DocuSign und Slack abwickelt, definiert einen Triggerfish-Workflow, der den gesamten Zyklus verwaltet. Deterministische Schritte verarbeiten die API-Aufrufe zum Erstellen von Bestellaufträgen, Weiterleiten von Genehmigungen und Abgleichen von Rechnungen. LLM-Unteragenten-Schritte verarbeiten die Ausnahmen: Rechnungen mit Positionen, die nicht zum Bestellauftrag passen, Lieferanten, die Dokumentation in einem unerwarteten Format eingereicht haben, Genehmigungsanfragen, die Kontext zur Geschichte des Antragstellers benötigen.

Der Workflow läuft auf einer selbst gehosteten Triggerfish-Instanz. Keine Daten verlassen die Unternehmensinfrastruktur. Das Klassifizierungssystem stellt sicher, dass Finanzdaten von NetSuite auf CONFIDENTIAL bleiben und nicht an einen Slack-Kanal gesendet werden können, der auf INTERNAL klassifiziert ist. Der Audit-Trail erfasst jede Entscheidung, die der LLM-Unteragent getroffen hat, jedes Tool, das er aufgerufen hat, und jedes Datenstück, auf das er zugegriffen hat, gespeichert mit vollständiger Herkunftsverfolgung für die Compliance-Überprüfung.

Wenn Coupa ihre API aktualisiert und einen Feldnamen ändert, schlägt der deterministische HTTP-Schritt des Workflows fehl. Die Engine delegiert an einen Unteragenten, der den Fehler liest, das geänderte Feld identifiziert und mit dem richtigen Parameter erneut versucht. Der Workflow wird ohne menschliche Intervention abgeschlossen, und der Vorfall wird protokolliert, damit ein Ingenieur die Workflow-Definition aktualisieren kann, um das neue Format zukünftig zu verarbeiten.
