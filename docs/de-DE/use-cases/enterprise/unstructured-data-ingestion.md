---
title: Unstrukturierte Dateneinspeisung
description: Wie Triggerfish die Rechnungsverarbeitung, den Dokumenteneingang und das E-Mail-Parsing handhabt, ohne bei Formatänderungen zu versagen.
---

# Einspeisung unstrukturierter und semi-strukturierter Daten

Die Rechnungsverarbeitung sollte inzwischen ein gelöstes Problem sein. Ein Dokument kommt an, Felder werden extrahiert, Daten werden gegen bestehende Datensätze validiert, und das Ergebnis wird an das richtige System weitergeleitet. Die Realität ist, dass allein die Rechnungsverarbeitung Unternehmen jährlich Milliarden an manueller Arbeit kostet, und die Automatisierungsprojekte, die das beheben sollen, brechen ständig zusammen.

Der Grund ist die Formatvielfalt. Rechnungen kommen als PDFs, E-Mail-Anhänge, gescannte Bilder, Tabellenkalkulationsexporte und gelegentlich Faxe an. Jeder Lieferant verwendet ein anderes Layout. Positionen erscheinen in Tabellen, in Freitext oder in einer Kombination aus beidem. Steuerberechnungen folgen unterschiedlichen Regeln je nach Jurisdiktion. Währungsformate variieren. Datumsformate variieren. Selbst derselbe Lieferant ändert seine Rechnungsvorlage ohne Vorankündigung.

Traditionelle RPA handhabt dies mit Musterabgleich. Die Koordinaten definieren, wo die Rechnungsnummer erscheint, wo die Positionen beginnen, wo die Gesamtsumme steht. Es funktioniert für die aktuelle Vorlage eines einzelnen Lieferanten. Dann aktualisiert der Lieferant sein System, verschiebt eine Spalte, fügt eine Kopfzeile hinzu oder ändert seinen PDF-Generator, und der Bot versagt entweder vollständig oder extrahiert fehlerhafte Daten, die sich downstream fortpflanzen, bis jemand sie manuell bemerkt.

Das gleiche Muster wiederholt sich bei allen Workflows mit unstrukturierten Daten. Die Verarbeitung von Versicherungs-EOBs bricht zusammen, wenn ein Kostenträger sein Formularlayout ändert. Die Einspeisung von Prior-Authorization-Anträgen bricht zusammen, wenn ein neuer Dokumenttyp zum Prozess hinzugefügt wird. Das Parsen von Kunden-E-Mails bricht zusammen, wenn jemand ein leicht abweichendes Betreffzeilenformat verwendet. Die Wartungskosten für den Betrieb dieser Automatisierungen übersteigen oft die Kosten für manuelle Arbeit.

## Wie Triggerfish das löst

Triggerfish ersetzt positionsbasierte Feldextraktion durch LLM-basiertes Dokumentenverständnis. Die KI liest das Dokument so wie ein Mensch: versteht den Kontext, schließt auf Beziehungen zwischen Feldern und passt sich automatisch an Layoutänderungen an. Kombiniert mit der Workflow-Engine für Pipeline-Orchestrierung und dem Klassifizierungssystem für Datensicherheit entstehen Einspeisungspipelines, die nicht zusammenbrechen, wenn sich die Welt ändert.

### LLM-gestütztes Dokumenten-Parsing

Wenn ein Dokument in einen Triggerfish-Workflow eintritt, liest ein LLM-Unteragent das gesamte Dokument und extrahiert strukturierte Daten basierend auf dem, was das Dokument bedeutet, nicht wo sich bestimmte Pixel befinden. Eine Rechnungsnummer ist eine Rechnungsnummer, egal ob sie in der oberen rechten Ecke mit "Invoice #" oder in der Mitte der Seite mit "Factura No." gekennzeichnet ist oder in einem Textabsatz eingebettet ist. Das LLM versteht, dass "Netto 30" Zahlungsbedingungen bedeutet, dass "Menge", "Qty" und "Stück" dasselbe bedeuten, und dass eine Tabelle mit Spalten für Beschreibung, Preis und Betrag eine Positionsliste ist, unabhängig von der Spaltenreihenfolge.

Das ist kein generischer "Dokument an ChatGPT schicken und auf das Beste hoffen"-Ansatz. Die Workflow-Definition legt genau fest, welche strukturierte Ausgabe das LLM produzieren soll, welche Validierungsregeln gelten und was passiert, wenn das Extraktionsvertrauen niedrig ist. Die Aufgabenbeschreibung des Unteragenten definiert das erwartete Schema, und die nachfolgenden Schritte des Workflows validieren die extrahierten Daten gegen Geschäftsregeln, bevor sie in ein nachgelagertes System eingehen.

### Browser-Automatisierung für den Dokumentenabruf

Viele Dokumenteneinspeisungs-Workflows beginnen damit, das Dokument überhaupt erst zu beschaffen. Versicherungs-EOBs befinden sich in Kostenträger-Portalen. Lieferantenrechnungen befinden sich in Lieferantenplattformen. Behördenformulare befinden sich auf staatlichen Behörden-Websites. Traditionelle Automatisierung verwendet Selenium-Skripte oder API-Aufrufe, um diese Dokumente abzurufen, und diese Skripte brechen zusammen, wenn sich das Portal ändert.

Die Browser-Automatisierung von Triggerfish verwendet CDP-gesteuertes Chromium mit einem LLM, das Seiten-Snapshots liest, um zu navigieren. Der Agent sieht die Seite so wie ein Mensch und klickt, tippt und scrollt basierend auf dem, was er sieht, anstatt auf fest codierten CSS-Selektoren. Wenn ein Kostenträger-Portal seine Anmeldeseite neu gestaltet, passt sich der Agent an, weil er das Benutzername-Feld, das Passwort-Feld und den Senden-Button immer noch aus dem visuellen Kontext identifizieren kann. Wenn ein Navigationsmenü sich ändert, findet der Agent den neuen Weg zum Dokumenten-Download-Bereich.

Das ist nicht vollständig zuverlässig. CAPTCHAs, Multi-Faktor-Authentifizierungsflows und stark JavaScript-abhängige Portale bereiten immer noch Probleme. Aber der Ausfallmodus ist grundlegend anders als bei traditionellen Skripten. Ein Selenium-Skript versagt stillschweigend, wenn ein CSS-Selektor nicht mehr übereinstimmt. Ein Triggerfish-Agent meldet, was er sieht, was er versucht hat und wo er feststeckt, und gibt dem Operator genug Kontext, um einzugreifen oder den Workflow anzupassen.

### Klassifizierungsgesteuertes Processing

Dokumente tragen unterschiedliche Empfindlichkeitsstufen, und das Klassifizierungssystem verwaltet dies automatisch. Eine Rechnung mit Preisbedingungen könnte CONFIDENTIAL sein. Eine öffentliche Ausschreibungsantwort könnte INTERNAL sein. Ein Dokument mit PHI ist RESTRICTED. Wenn der LLM-Unteragent ein Dokument liest und Daten extrahiert, klassifiziert der POST_TOOL_RESPONSE-Hook den extrahierten Inhalt, und das Session-Taint steigt entsprechend an.

Das ist wichtig für die nachgelagerte Weiterleitung. Extrahierte Rechnungsdaten, die auf CONFIDENTIAL klassifiziert sind, können nicht an einen Slack-Kanal gesendet werden, der auf PUBLIC klassifiziert ist. Ein Workflow, der Versicherungsdokumente mit PHI verarbeitet, schränkt automatisch ein, wohin die extrahierten Daten fließen können. Die Write-Down-Präventionsregel erzwingt dies an jeder Grenze, und das LLM hat keinerlei Befugnis, dies zu umgehen.

Für Gesundheitswesen und Finanzdienstleistungen insbesondere bedeutet dies, dass der Compliance-Overhead der automatisierten Dokumentenverarbeitung erheblich sinkt. Anstatt benutzerdefinierte Zugriffskontrollen in jeden Schritt jeder Pipeline einzubauen, verwaltet das Klassifizierungssystem dies einheitlich. Ein Prüfer kann genau zurückverfolgen, welche Dokumente verarbeitet wurden, welche Daten extrahiert wurden, wohin sie gesendet wurden, und bestätigen, dass keine Daten an ein ungeeignetes Ziel geflossen sind — alles aus den Herkunftsdatensätzen, die automatisch bei jedem Schritt erstellt werden.

### Selbstheilende Formatanpassung

Wenn ein Lieferant seine Rechnungsvorlage ändert, bricht traditionelle Automatisierung zusammen und bleibt kaputt, bis jemand die Extraktionsregeln manuell aktualisiert. Bei Triggerfish passt sich der LLM-Unteragent beim nächsten Durchlauf an. Er findet immer noch die Rechnungsnummer, die Positionen und die Gesamtsumme, weil er auf Bedeutung statt Position liest. Die Extraktion gelingt, die Daten werden gegen dieselben Geschäftsregeln validiert, und der Workflow wird abgeschlossen.

Im Laufe der Zeit kann der Agent sitzungsübergreifenden Arbeitsspeicher nutzen, um Muster zu erlernen. Wenn Lieferant A immer eine Wiedereinlagerungsgebühr enthält, die andere Lieferanten nicht haben, erinnert sich der Agent daran aus früheren Extraktionen und weiß, danach zu suchen. Wenn das EOB-Format eines bestimmten Kostenträgers die Anpassungscodes immer an einer ungewöhnlichen Stelle platziert, machen die Erinnerungen des Agenten an frühere erfolgreiche Extraktionen zukünftige zuverlässiger.

Wenn eine Formatänderung so bedeutend ist, dass das Extraktionsvertrauen des LLM unter den im Workflow definierten Schwellenwert fällt, leitet der Workflow das Dokument an eine menschliche Überprüfungswarteschlange weiter, anstatt zu raten. Die menschlichen Korrekturen werden durch den Workflow zurückgespeist, und der Arbeitsspeicher des Agenten speichert das neue Muster für zukünftige Referenz. Das System wird im Laufe der Zeit intelligenter, ohne dass jemand Extraktionsregeln neu schreibt.

### Pipeline-Orchestrierung

Dokumenteneinspeisung ist selten nur "extrahieren und speichern". Eine vollständige Pipeline ruft das Dokument ab, extrahiert strukturierte Daten, validiert sie gegen bestehende Datensätze, reichert sie mit Daten aus anderen Systemen an, leitet Ausnahmen zur menschlichen Überprüfung weiter und lädt die validierten Daten in das Zielsystem. Die Workflow-Engine verwaltet all dies in einer einzigen YAML-Definition.

Eine Prior-Authorization-Pipeline im Gesundheitswesen könnte so aussehen: Browser-Automatisierung ruft das Faxbild vom Anbieter-Portal ab, ein LLM-Unteragent extrahiert Patientenidentifikatoren und Prozedurcodes, ein HTTP-Aufruf validiert den Patienten gegen das EHR, ein weiterer Unteragent bewertet, ob die Genehmigung die medizinischen Notwendigkeitskriterien basierend auf der klinischen Dokumentation erfüllt, und das Ergebnis wird entweder zur automatischen Genehmigung oder zu einer klinischen Reviewer-Warteschlange weitergeleitet. Jeder Schritt wird klassifizierungsverfolgt. Jedes PHI wird taint-markiert. Der vollständige Audit-Trail existiert automatisch.

## So sieht das in der Praxis aus

Ein regionales Gesundheitssystem verarbeitet Prior-Authorization-Anträge von vierzig verschiedenen Anbieterpraxen, jede mit eigenem Formularlayout, manche per Fax, manche per E-Mail, manche über ein Portal hochgeladen. Der traditionelle Ansatz erforderte ein Team von acht Personen, die jeden Antrag manuell überprüfen und eingeben, weil kein Automatisierungstool die Formatvielfalt zuverlässig handhaben konnte.

Mit Triggerfish verwaltet ein Workflow die vollständige Pipeline. Browser-Automatisierung oder E-Mail-Parsing ruft die Dokumente ab. LLM-Unteragenten extrahieren die strukturierten Daten unabhängig vom Format. Validierungsschritte prüfen die extrahierten Daten gegen das EHR und Formulardatenbanken. Eine Klassifizierungsobergrenze von RESTRICTED stellt sicher, dass PHI nie die Pipeline-Grenze verlässt. Dokumente, die das LLM nicht mit hohem Vertrauen parsen kann, werden an einen menschlichen Reviewer weitergeleitet, aber dieses Volumen sinkt im Laufe der Zeit, da der Arbeitsspeicher des Agenten eine Bibliothek von Formatmustern aufbaut.

Das Achtköpfige Team wird zu zwei Personen, die die Ausnahmen behandeln, die das System kennzeichnet, plus periodische Qualitätsprüfungen der automatisierten Extraktionen. Formatänderungen von Anbieterpraxen werden automatisch absorbiert. Neue Formularlayouts werden beim ersten Auftreten verarbeitet. Die Wartungskosten, die den Großteil des traditionellen Automatisierungsbudgets verbrauchten, sinken auf nahezu null.
