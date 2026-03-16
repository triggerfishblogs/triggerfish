---
title: Automatisierung von Drittanbieter-Portalen
description: Wie Triggerfish Interaktionen mit Lieferantenportalen, Behörden-Websites und Kostenträger-Systemen automatisiert, ohne bei UI-Änderungen zu versagen.
---

# UI-abhängige Automatisierung gegen Drittanbieter-Portale

Jedes Unternehmen hat eine Liste von Portalen, in die sich Mitarbeiter täglich manuell einloggen, um Arbeit zu erledigen, die automatisiert werden sollte, es aber nicht ist. Lieferantenportale zur Überprüfung des Bestellstatus. Behörden-Websites für regulatorische Einreichungen. Versicherungskostenträger-Portale zur Überprüfung der Anspruchsberechtigung und des Anspruchsstatus. Staatliche Zulassungsbehörden für die Zertifikatsüberprüfung. Steuerportale für Compliance-Einreichungen.

Diese Portale haben keine APIs. Oder sie haben APIs, die undokumentiert, ratenbeschränkt oder auf "bevorzugte Partner" beschränkt sind, die für den Zugang zahlen. Die Daten befinden sich hinter einer Anmeldeseite, in HTML gerendert, und der einzige Weg, sie herauszubekommen, ist sich anzumelden und die Benutzeroberfläche zu navigieren.

Traditionelle Automatisierung verwendet Browser-Skripte. Selenium-, Playwright- oder Puppeteer-Skripte, die sich einloggen, zur richtigen Seite navigieren, Elemente per CSS-Selektor oder XPath finden, die Daten extrahieren und sich abmelden. Diese Skripte funktionieren, bis sie es nicht mehr tun. Eine Portal-Neugestaltung ändert die CSS-Klassennamen. Ein neues CAPTCHA wird zum Anmeldefluss hinzugefügt. Das Navigationsmenü wechselt von einer Seitenleiste zu einem Hamburger-Menü. Ein Cookie-Zustimmungsbanner beginnt, den Senden-Button zu überdecken. Das Skript versagt stillschweigend, und niemand bemerkt es, bis der nachgelagerte Prozess, der auf die Daten angewiesen ist, Fehler produziert.

Staatliche Ärztekammern sind ein besonders drastisches Beispiel. Es gibt fünfzig davon, jede mit einer anderen Website, anderen Layouts, anderen Authentifizierungsmethoden und anderen Datenformaten. Sie gestalten ihre Websites nach eigenem Zeitplan ohne Vorankündigung neu. Ein Zertifizierungsverifizierungsdienst, der auf das Scraping dieser Websites angewiesen ist, könnte fünf oder zehn seiner fünfzig Skripte jederzeit defekt haben, jedes davon erfordert, dass ein Entwickler das neue Layout inspiziert und die Selektoren neu schreibt.

## Wie Triggerfish das löst

Die Browser-Automatisierung von Triggerfish kombiniert CDP-gesteuertes Chromium mit LLM-basierter visueller Navigation. Der Agent sieht die Seite als gerenderte Pixel und Zugänglichkeits-Snapshots, nicht als DOM-Baum. Er identifiziert Elemente danach, wie sie aussehen und was sie tun, nicht nach ihren CSS-Klassennamen. Wenn ein Portal neu gestaltet wird, passt sich der Agent an, weil Anmeldeformulare immer noch wie Anmeldeformulare aussehen, Navigationsmenüs immer noch wie Navigationsmenüs aussehen und Datentabellen immer noch wie Datentabellen aussehen.

### Visuelle Navigation statt Selektor-Skripte

Die Browser-Automatisierungstools arbeiten über sieben Operationen: navigieren, Snapshot aufnehmen, klicken, tippen, auswählen, scrollen und warten. Der Agent navigiert zu einer URL, nimmt einen Snapshot der gerenderten Seite auf, denkt darüber nach, was er sieht, und entscheidet, welche Aktion er ergreifen soll. Es gibt kein `evaluate`-Tool, das beliebiges JavaScript im Seitenkontext ausführt. Das ist eine bewusste Sicherheitsentscheidung. Der Agent interagiert mit der Seite so wie ein Mensch — über die Benutzeroberfläche — und kann keinen Code ausführen, der von einer bösartigen Seite ausgenutzt werden könnte.

Wenn der Agent auf ein Anmeldeformular trifft, identifiziert er das Benutzername-Feld, das Passwort-Feld und den Senden-Button basierend auf visuellem Layout, Platzhaltertext, Beschriftungen und Seitenstruktur. Er muss nicht wissen, dass das Benutzername-Feld `id="auth-input-email"` oder `class="login-form__email-field"` hat. Wenn diese Identifikatoren sich bei einer Neugestaltung ändern, bemerkt der Agent es nicht, weil er sich nie darauf verlassen hat.

### Gemeinsame Domain-Sicherheit

Browser-Navigation teilt dieselbe Domain-Sicherheitskonfiguration wie Web-Fetch-Operationen. Ein einziger Konfigurationsblock in `triggerfish.yaml` definiert SSRF-Sperrlisten, Domain-Erlaubnislisten, Domain-Sperrlisten und Domain-zu-Klassifizierungs-Mappings. Wenn der Agent zu einem Lieferantenportal navigiert, das auf CONFIDENTIAL klassifiziert ist, steigt das Session-Taint automatisch auf CONFIDENTIAL an, und alle nachfolgenden Aktionen in diesem Workflow unterliegen CONFIDENTIAL-Level-Beschränkungen.

Die SSRF-Sperrliste ist fest codiert und nicht überschreibbar. Private IP-Bereiche, Link-Local-Adressen und Cloud-Metadaten-Endpunkte sind immer blockiert. Die DNS-Auflösung wird vor der Anfrage geprüft, was DNS-Rebinding-Angriffe verhindert. Das ist wichtig, weil Browser-Automatisierung die riskanteste Angriffsfläche in jedem Agentensystem ist. Eine bösartige Seite, die versucht, den Agenten zu einem internen Dienst umzuleiten, wird blockiert, bevor die Anfrage das System verlässt.

### Browser-Profil-Wasserzeichen

Jeder Agent pflegt sein eigenes Browser-Profil, das im Laufe der Zeit Cookies, lokalen Speicher und Sitzungsdaten ansammelt, wenn er mit Portalen interagiert. Das Profil trägt ein Klassifizierungs-Wasserzeichen, das das höchste Klassifizierungsniveau aufzeichnet, auf dem es verwendet wurde. Dieses Wasserzeichen kann nur steigen, nie sinken.

Wenn ein Agent sein Browser-Profil verwendet, um sich bei einem CONFIDENTIAL-Lieferantenportal anzumelden, wird das Profil auf CONFIDENTIAL mit einem Wasserzeichen versehen. Eine nachfolgende Sitzung, die auf PUBLIC-Klassifizierung läuft, kann dieses Profil nicht verwenden, was Datenlecks durch gecachte Anmeldedaten, Cookies oder Sitzungstoken verhindert, die möglicherweise vertrauliche Informationen enthalten. Die Profilisolierung erfolgt pro Agent, und die Wasserzeichen-Durchsetzung ist automatisch.

Das löst ein subtiles, aber wichtiges Problem bei der Portal-Automatisierung. Browser-Profile sammeln Zustand an, der die Daten widerspiegelt, auf die sie zugegriffen haben. Ohne Wasserzeichen könnte ein Profil, das sich bei einem sensiblen Portal angemeldet hat, Informationen durch Autovervollständigungsvorschläge, gecachte Seitendaten oder persistente Cookies an eine niedriger klassifizierte Sitzung weitergeben.

### Anmeldedatenverwaltung

Portal-Anmeldedaten werden im OS-Schlüsselbund (persönliche Stufe) oder im Unternehmens-Vault (Enterprise-Stufe) gespeichert, niemals in Konfigurationsdateien oder Umgebungsvariablen. Der SECRET_ACCESS-Hook protokolliert jeden Abruf von Anmeldedaten. Anmeldedaten werden zur Ausführungszeit von der Workflow-Engine aufgelöst und über die Tipp-Schnittstelle in Browser-Sitzungen injiziert, nicht durch programmatisches Setzen von Formularwerten. Das bedeutet, dass Anmeldedaten durch dieselbe Sicherheitsschicht fließen wie jede andere sensible Operation.

### Resilienz gegenüber häufigen Portal-Änderungen

Hier ist, was bei häufigen Portal-Änderungen passiert:

**Neugestaltung der Anmeldeseite.** Der Agent nimmt einen neuen Snapshot auf, identifiziert das aktualisierte Layout und findet die Formularfelder durch visuellen Kontext. Sofern das Portal nicht zu einer völlig anderen Authentifizierungsmethode (SAML, OAuth, Hardware-Token) gewechselt hat, funktioniert die Anmeldung ohne Konfigurationsänderung weiter.

**Umstrukturierung der Navigation.** Der Agent liest die Seite nach dem Einloggen und navigiert zum Zielabschnitt basierend auf Linktexten, Menübeschriftungen und Seitenüberschriften statt URL-Mustern. Wenn das Lieferantenportal "Bestellstatus" von der linken Seitenleiste in ein oberes Navigations-Dropdown verschoben hat, findet der Agent es dort.

**Neues Cookie-Zustimmungsbanner.** Der Agent sieht das Banner, identifiziert den Akzeptieren/Ablehnen-Button, klickt darauf und fährt mit der ursprünglichen Aufgabe fort. Das wird durch das allgemeine Seitenverständnis des LLM verarbeitet, nicht durch einen speziellen Cookie-Handler.

**CAPTCHA hinzugefügt.** Hier hat der Ansatz ehrliche Grenzen. Einfache Bild-CAPTCHAs könnten je nach Bildverarbeitungsfähigkeiten des LLM lösbar sein, aber reCAPTCHA v3 und ähnliche Verhaltensanalysesysteme können automatisierte Browser blockieren. Der Workflow leitet diese Fälle an eine menschliche Interventionswarteschlange weiter, statt stillschweigend zu versagen.

**Multi-Faktor-Authentifizierungsaufforderungen.** Wenn das Portal MFA anzufordern beginnt, das zuvor nicht erforderlich war, erkennt der Agent die unerwartete Seite, meldet die Situation über das Benachrichtigungssystem und pausiert den Workflow, bis ein Mensch den MFA-Schritt abschließt. Der Workflow kann so konfiguriert werden, dass er auf die MFA-Fertigstellung wartet und dann von dort weitermacht, wo er aufgehört hat.

### Stapelverarbeitung über mehrere Portale

Die `for`-Schleifen-Unterstützung der Workflow-Engine bedeutet, dass ein einzelner Workflow über mehrere Portal-Ziele iterieren kann. Ein Zertifizierungsverifizierungsdienst kann einen Workflow definieren, der den Lizensstatus bei allen fünfzig staatlichen Ärztekammern in einem einzigen Stapeldurchlauf prüft. Jede Portal-Interaktion läuft als separater Unterschritt mit eigener Browser-Sitzung, eigener Klassifizierungsverfolgung und eigener Fehlerbehandlung. Wenn drei von fünfzig Portalen versagen, schließt der Workflow die anderen siebenundvierzig ab und leitet die drei Fehlschläge an eine Überprüfungswarteschlange mit detailliertem Fehlerkontext weiter.

## So sieht das in der Praxis aus

Eine Zertifizierungsorganisation verifiziert Lizenzen von Gesundheitsdienstleistern bei staatlichen Ärztekammern als Teil des Anbieter-Einschreibungsprozesses. Traditionell melden sich Verifikationsassistenten manuell bei der Website jeder Kammer an, suchen nach dem Anbieter, erstellen einen Screenshot des Lizensstatus und geben die Daten in das Zertifizierungssystem ein. Jede Verifizierung dauert fünf bis fünfzehn Minuten, und die Organisation verarbeitet Hunderte pro Woche.

Mit Triggerfish verwaltet ein Workflow den vollständigen Verifizierungszyklus. Der Workflow erhält einen Stapel von Anbietern mit ihren Lizenznummern und Zielstaaten. Für jeden Anbieter navigiert die Browser-Automatisierung zum relevanten Staatskammerportal, meldet sich mit gespeicherten Anmeldedaten an, sucht nach dem Anbieter, extrahiert den Lizensstatus und das Ablaufdatum und speichert das Ergebnis. Die extrahierten Daten werden auf CONFIDENTIAL klassifiziert, weil sie Anbieter-PII enthalten, und die Write-Down-Regeln verhindern, dass sie an einen Kanal unterhalb dieses Klassifizierungsniveaus gesendet werden.

Wenn eine staatliche Kammer ihr Portal neu gestaltet, passt sich der Agent beim nächsten Verifizierungsversuch an. Wenn eine Kammer ein CAPTCHA hinzufügt, das automatisierten Zugang blockiert, kennzeichnet der Workflow diesen Staat für manuelle Verifizierung und verarbeitet den Rest des Stapels weiter. Die Verifikationsassistenten wechseln von der manuellen Durchführung aller Verifizierungen zur Bearbeitung nur der Ausnahmen, die die Automatisierung nicht lösen kann.
