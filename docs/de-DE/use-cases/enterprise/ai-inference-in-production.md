---
title: KI-Inferenz in Produktions-Workflows
description: Wie Triggerfish die Lücke zwischen KI-Demos und dauerhaften Produktions-Workflows mit Sicherheitsdurchsetzung, Audit-Trails und Workflow-Orchestrierung überbrückt.
---

# Integration von KI/ML-Inferenz in Produktions-Workflows

Die meisten KI-Projekte in Unternehmen sterben in der Lücke zwischen Demo und Produktion. Ein Team erstellt einen Proof of Concept, der GPT-4 verwendet, um Support-Tickets zu klassifizieren, juristische Dokumente zusammenzufassen oder Marketing-Texte zu generieren. Die Demo funktioniert. Die Führungsebene ist begeistert. Dann stagniert das Projekt monatelang beim Versuch, Fragen zu beantworten, die die Demo nie stellen musste: Woher kommen die Daten? Wohin gehen die Ausgaben? Wer genehmigt die Entscheidungen der KI? Was passiert, wenn das Modell halluziniert? Wie auditieren wir, was es getan hat? Wie verhindern wir, dass es auf Daten zugreift, die es nicht sehen sollte? Wie verhindern wir, dass es sensible Informationen an den falschen Ort sendet?

Das sind keine hypothetischen Bedenken. 95% der generativen KI-Piloten in Unternehmen scheitern daran, finanzielle Erträge zu erzielen, und der Grund ist nicht, dass die Technologie nicht funktioniert. Die Modelle sind leistungsfähig. Das Scheitern liegt in der Infrastruktur: KI-Inferenz zuverlässig in die echten Geschäftsprozesse zu integrieren, wo sie operieren muss, mit den Sicherheitskontrollen, der Fehlerbehandlung und den Audit-Trails, die Produktionssysteme erfordern.

Die typische Unternehmensantwort ist der Aufbau einer maßgefertigten Integrationsschicht. Ein Ingenieursteam verbringt Monate damit, das KI-Modell mit den Datenquellen zu verbinden, die Pipeline zu erstellen, Authentifizierung hinzuzufügen, Protokollierung zu implementieren, einen Genehmigungsworkflow zu erstellen und Sicherheitsprüfungen anzuhängen. Bis die Integration "produktionsbereit" ist, wurde das ursprüngliche Modell von einem neueren abgelöst, die Geschäftsanforderungen haben sich verschoben, und das Team muss von vorne anfangen.

## Wie Triggerfish das löst

Triggerfish eliminiert die Integrationslücke, indem es KI-Inferenz als erstklassigen Schritt in der Workflow-Engine macht, gesteuert durch dieselbe Sicherheitsdurchsetzung, Audit-Protokollierung und Klassifizierungskontrollen, die für alle anderen Operationen im System gelten. Ein LLM-Unteragenten-Schritt in einem Triggerfish-Workflow ist kein Zusatz. Er ist eine native Operation mit denselben Richtlinien-Hooks, Herkunftsverfolgung und Write-Down-Prävention wie ein HTTP-Aufruf oder eine Datenbankabfrage.

### KI als Workflow-Schritt, nicht als separates System

Im Workflow-DSL wird ein LLM-Inferenzschritt mit `call: triggerfish:llm` definiert. Die Aufgabenbeschreibung teilt dem Unteragenten in natürlicher Sprache mit, was zu tun ist. Der Unteragent hat Zugriff auf jedes in Triggerfish registrierte Tool. Er kann im Web suchen, Datenbanken über MCP-Tools abfragen, Dokumente lesen, Websites durchsuchen und sitzungsübergreifenden Arbeitsspeicher verwenden. Wenn der Schritt abgeschlossen ist, fließt seine Ausgabe direkt in den nächsten Schritt des Workflows.

Das bedeutet, dass es kein separates "KI-System" zu integrieren gibt. Die Inferenz findet innerhalb des Workflows statt, unter Verwendung derselben Anmeldedaten, derselben Datenverbindungen und derselben Sicherheitsdurchsetzung wie alles andere. Ein Ingenieursteam muss keine maßgefertigte Integrationsschicht aufbauen, weil die Integrationsschicht bereits existiert.

### Sicherheit ohne maßgefertigtes Engineering

Der zeitaufwendigste Teil der Produktionsreife eines KI-Workflows ist nicht die KI. Es ist die Sicherheits- und Compliance-Arbeit. Welche Daten kann das Modell sehen? Wohin kann es seine Ausgabe senden? Wie verhindern wir das Lecken sensibler Informationen? Wie protokollieren wir alles für die Prüfung?

Bei Triggerfish werden diese Fragen durch die Plattformarchitektur beantwortet, nicht durch projektspezifisches Engineering. Das Klassifizierungssystem verfolgt die Datensensitivität an jeder Grenze. Das Session-Taint steigt an, wenn das Modell auf klassifizierte Daten zugreift. Write-Down-Prävention blockiert die Ausgabe davon, zu einem Kanal zu fließen, der unterhalb des Taint-Niveaus der Sitzung klassifiziert ist. Jeder Tool-Aufruf, jeder Datenzugriff und jede Ausgabeentscheidung wird mit vollständiger Herkunft protokolliert.

Ein KI-Workflow, der Kundendatensätze (CONFIDENTIAL) liest und eine Zusammenfassung generiert, kann diese Zusammenfassung nicht an einen öffentlichen Slack-Kanal senden. Das wird nicht durch eine Prompt-Anweisung durchgesetzt, die das Modell ignorieren könnte. Es wird durch deterministischen Code im PRE_OUTPUT-Hook durchgesetzt, den das Modell nicht sehen, nicht modifizieren und nicht umgehen kann. Die Richtlinien-Hooks laufen unterhalb der LLM-Schicht. Das LLM fordert eine Aktion an, und die Richtlinien-Schicht entscheidet, ob sie erlaubt werden soll. Timeout entspricht Ablehnung. Es gibt keinen Weg vom Modell nach außen, der nicht durch die Durchsetzung geht.

### Audit-Trails, die bereits existieren

Jede KI-Entscheidung in einem Triggerfish-Workflow generiert automatisch Herkunftsdatensätze. Die Herkunft verfolgt, auf welche Daten das Modell zugegriffen hat, welches Klassifizierungsniveau sie trugen, welche Transformationen angewendet wurden und wohin die Ausgabe gesendet wurde. Das ist keine Protokollierungsfunktion, die aktiviert oder konfiguriert werden muss. Es ist eine strukturelle Eigenschaft der Plattform. Jedes Datenelement trägt Provenienzmetadaten von der Erstellung über jede Transformation bis zu seinem endgültigen Ziel.

Für regulierte Branchen bedeutet das, dass die Compliance-Belege für einen KI-Workflow ab dem ersten Tag existieren. Ein Prüfer kann jede KI-generierte Ausgabe durch die vollständige Kette zurückverfolgen: welches Modell sie produziert hat, auf welchen Daten sie basierte, welche Tools das Modell während des Reasonings verwendet hat, welches Klassifizierungsniveau bei jedem Schritt galt und ob Richtliniendurchsetzungsmaßnahmen stattgefunden haben. Diese Beweissammlung erfolgt automatisch, weil sie in die Durchsetzungs-Hooks eingebaut ist, nicht als Berichtsschicht angehängt.

### Modellflexibilität ohne Re-Architektur

Triggerfish unterstützt mehrere LLM-Anbieter über das LlmProvider-Interface: Anthropic, OpenAI, Google, lokale Modelle über Ollama und OpenRouter für jedes geroutete Modell. Die Anbieterauswahl ist pro Agent konfigurierbar mit automatischem Failover. Wenn ein besseres Modell verfügbar wird oder ein Anbieter seine Preise ändert, erfolgt der Wechsel auf Konfigurationsebene, ohne die Workflow-Definitionen anzufassen.

Das adressiert direkt das Problem "Projekt ist veraltet, bevor es ausgeliefert wird". Die Workflow-Definitionen beschreiben, was die KI tun soll, nicht welches Modell es tut. Der Wechsel von GPT-4 zu Claude zu einem fein abgestimmten lokalen Modell ändert einen Konfigurationswert. Der Workflow, die Sicherheitskontrollen, die Audit-Trails und die Integrationspunkte bleiben alle genau gleich.

### Cron, Webhooks und ereignisgesteuerte Ausführung

KI-Workflows, die nach Zeitplan oder als Reaktion auf Ereignisse laufen, brauchen keinen Menschen, der sie anstößt. Der Scheduler unterstützt fünfstellige Cron-Ausdrücke für wiederkehrende Workflows und Webhook-Endpunkte für ereignisgesteuerte Trigger. Ein täglicher Berichtsgenerierungs-Workflow läuft um 6 Uhr. Ein Dokumentenklassifizierungs-Workflow wird ausgelöst, wenn eine neue Datei per Webhook eintrifft. Ein Stimmungsanalyse-Workflow wird bei jedem neuen Support-Ticket ausgelöst.

Jede geplante oder ereignisausgelöste Ausführung instanziiert eine isolierte Sitzung mit frischem Taint. Der Workflow läuft in seinem eigenen Sicherheitskontext, unabhängig von interaktiven Sitzungen. Wenn der cron-ausgelöste Workflow auf CONFIDENTIAL-Daten zugreift, wird nur die Geschichte dieser Ausführung auf CONFIDENTIAL klassifiziert. Andere geplante Workflows, die auf PUBLIC-Klassifizierung laufen, sind davon unberührt.

### Fehlerbehandlung und menschliche Einbeziehung

Produktions-KI-Workflows müssen Fehler graceful behandeln. Das Workflow-DSL unterstützt `raise` für explizite Fehlerbedingungen und Try/Catch-Semantik durch Fehlerbehandlung in Aufgabendefinitionen. Wenn ein LLM-Unteragent eine Ausgabe mit niedrigem Vertrauen produziert oder auf eine Situation stößt, die er nicht bewältigen kann, kann der Workflow zu einer menschlichen Genehmigungswarteschlange weiterleiten, eine Benachrichtigung über den Benachrichtigungsdienst senden oder eine Fallback-Aktion durchführen.

Der Benachrichtigungsdienst liefert Warnmeldungen über alle verbundenen Kanäle mit Priorität und Deduplizierung. Wenn ein Workflow menschliche Genehmigung benötigt, bevor ein KI-generierter Vertragsnachtrag gesendet wird, kann die Genehmigungsanfrage auf Slack, WhatsApp, E-Mail oder wo auch immer der Genehmiger ist ankommen. Der Workflow pausiert, bis die Genehmigung eingeht, und setzt dann von dort fort, wo er aufgehört hat.

## So sieht das in der Praxis aus

Eine Rechtsabteilung möchte die Vertragsüberprüfung automatisieren. Der traditionelle Ansatz: sechs Monate maßgefertigter Entwicklung zum Aufbau einer Pipeline, die Klauseln aus hochgeladenen Verträgen extrahiert, Risikoebenen klassifiziert, nicht standardgemäße Bedingungen kennzeichnet und eine Zusammenfassung für den prüfenden Anwalt generiert. Das Projekt erfordert ein dediziertes Ingenieursteam, eine maßgefertigte Sicherheitsüberprüfung, eine Compliance-Freigabe und laufende Wartung.

Mit Triggerfish dauert das Schreiben der Workflow-Definition einen Tag. Der Upload löst einen Webhook aus. Ein LLM-Unteragent liest den Vertrag, extrahiert Schlüsselklauseln, klassifiziert Risikoebenen und identifiziert nicht standardgemäße Bedingungen. Ein Validierungsschritt prüft die Extraktion gegen die Klauselbibliothek der Kanzlei, die im Arbeitsspeicher gespeichert ist. Die Zusammenfassung wird an den Benachrichtigungskanal des zugewiesenen Anwalts weitergeleitet. Die gesamte Pipeline läuft auf RESTRICTED-Klassifizierung, weil Verträge mandantenprivilegierte Informationen enthalten, und Write-Down-Prävention stellt sicher, dass keine Vertragsdaten an einen Kanal unterhalb von RESTRICTED gelangen.

Wenn die Kanzlei den LLM-Anbieter wechselt (weil ein neues Modell juristische Sprache besser verarbeitet oder weil der aktuelle Anbieter die Preise erhöht), ist die Änderung eine einzige Zeile in der Konfiguration. Die Workflow-Definition, die Sicherheitskontrollen, der Audit-Trail und das Benachrichtigungs-Routing funktionieren alle ohne Änderung weiter. Wenn die Kanzlei einen neuen Klauseltyp zu ihrem Risikorahmen hinzufügt, berücksichtigt der LLM-Unteragent ihn, ohne Extraktionsregeln neu zu schreiben, weil er auf Bedeutung statt Muster liest.

Das Compliance-Team erhält ab dem ersten Tag einen vollständigen Audit-Trail. Jeder verarbeitete Vertrag, jede extrahierte Klausel, jede zugewiesene Risikoklassifizierung, jede gesendete Benachrichtigung und jede Anwaltsgenehmigung aufgezeichnet, mit vollständiger Herkunft zurück zum Quelldokument. Die Beweissammlung, die Wochen maßgefertigter Berichtsarbeit erfordert hätte, existiert automatisch als strukturelle Eigenschaft der Plattform.
