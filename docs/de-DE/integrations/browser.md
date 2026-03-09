# Browser-Automatisierung

Triggerfish bietet umfassende Browser-Steuerung ueber eine dedizierte verwaltete Chromium-Instanz mittels CDP (Chrome DevTools Protocol). Der Agent kann im Web navigieren, mit Seiten interagieren, Formulare ausfuellen, Screenshots aufnehmen und Web-Workflows automatisieren -- alles unter Policy-Durchsetzung.

## Architektur

Browser-Automatisierung basiert auf `puppeteer-core` und verbindet sich mit einer verwalteten Chromium-Instanz ueber CDP. Jede Browser-Aktion durchlaeuft die Policy-Schicht, bevor sie den Browser erreicht.

Triggerfish erkennt automatisch Chromium-basierte Browser einschliesslich **Google Chrome**, **Chromium** und **Brave**. Die Erkennung umfasst Standard-Installationspfade auf Linux, macOS, Windows und Flatpak-Umgebungen.

::: info Das `browser_navigate`-Tool erfordert `http://`- oder `https://`-URLs. Browser-interne Schemata (wie `chrome://`, `brave://`, `about:`) werden nicht unterstuetzt und geben einen Fehler mit dem Hinweis zurueck, eine Web-URL zu verwenden. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Browser-Automatisierungsablauf: Agent --> Browser-Tool --> Policy-Schicht --> CDP --> Verwaltetes Chromium" style="max-width: 100%;" />

Das Browser-Profil ist pro Agent isoliert. Die verwaltete Chromium-Instanz teilt keine Cookies, Sessions oder lokalen Speicher mit Ihrem persoenlichen Browser. Anmeldedaten-Autofill ist standardmaessig deaktiviert.

## Verfuegbare Aktionen

| Aktion     | Beschreibung                                           | Beispielverwendung                                    |
| ---------- | ------------------------------------------------------ | ----------------------------------------------------- |
| `navigate` | Zu einer URL navigieren (unterliegt Domain-Policy)     | Webseite fuer Recherche oeffnen                       |
| `snapshot` | Seiten-Screenshot aufnehmen                            | UI-Zustand dokumentieren, visuelle Informationen extrahieren |
| `click`    | Element auf der Seite anklicken                        | Formular absenden, Schaltflaeche aktivieren           |
| `type`     | Text in ein Eingabefeld eingeben                       | Suchfeld ausfuellen, Formular vervollstaendigen       |
| `select`   | Option aus einem Dropdown auswaehlen                   | Aus einem Menue waehlen                               |
| `upload`   | Datei in ein Formular hochladen                        | Dokument anhaengen                                    |
| `evaluate` | JavaScript im Seitenkontext ausfuehren (sandboxed)     | Daten extrahieren, DOM manipulieren                   |
| `wait`     | Auf ein Element oder eine Bedingung warten             | Sicherstellen, dass eine Seite geladen hat             |

## Domain-Policy-Durchsetzung

Jede URL, zu der der Agent navigiert, wird vor der Browser-Aktion gegen eine Domain-Allowlist und -Denylist geprueft.

### Konfiguration

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### Wie Domain-Policy funktioniert

1. Agent ruft `browser.navigate("https://github.com/org/repo")` auf
2. `PRE_TOOL_CALL`-Hook wird mit der URL als Kontext ausgeloest
3. Policy-Engine prueft die Domain gegen Allow/Deny-Listen
4. Wenn verweigert oder nicht auf der Allowlist, wird die Navigation **blockiert**
5. Wenn erlaubt, wird die Domain-Klassifizierung nachgeschlagen
6. Session-Taint eskaliert auf die Domain-Klassifizierung
7. Navigation wird fortgesetzt

::: warning SICHERHEIT Wenn eine Domain nicht auf der Allowlist steht, wird die Navigation standardmaessig blockiert. Das LLM kann die Domain-Policy nicht ueberschreiben. Dies verhindert, dass der Agent beliebige Websites besucht, die sensible Daten exponieren oder unerwuenschte Aktionen ausloesen koennten. :::

## Screenshots und Klassifizierung

Screenshots, die ueber `browser.snapshot` aufgenommen werden, erben die aktuelle Taint-Stufe der Session. Wenn die Session mit `CONFIDENTIAL` getaintet ist, werden alle Screenshots aus dieser Session als `CONFIDENTIAL` klassifiziert.

Dies ist relevant fuer die Ausgabe-Policy. Ein als `CONFIDENTIAL` klassifizierter Screenshot kann nicht an einen `PUBLIC`-Kanal gesendet werden. Der `PRE_OUTPUT`-Hook setzt dies an der Grenze durch.

## Gescrapte Inhalte und Lineage

Wenn der Agent Inhalte von einer Webseite extrahiert (ueber `evaluate`, Textlesen oder Elementparsing), werden die extrahierten Daten:

- Basierend auf der zugewiesenen Klassifizierungsstufe der Domain klassifiziert
- Ein Lineage-Datensatz erstellt, der die Quell-URL, Extraktionszeit und Klassifizierung verfolgt
- Tragen zum Session-Taint bei (Taint eskaliert auf die Inhaltsklassifizierung)

Dieses Lineage-Tracking bedeutet, dass Sie immer zurueckverfolgen koennen, woher Daten stammen, selbst wenn sie vor Wochen von einer Webseite gescrapt wurden.

## Sicherheitskontrollen

### Browser-Isolation pro Agent

Jeder Agent erhaelt sein eigenes Browser-Profil. Das bedeutet:

- Keine geteilten Cookies zwischen Agenten
- Kein geteilter lokaler Speicher oder Session-Speicher
- Kein Zugriff auf Host-Browser-Cookies oder -Sessions
- Anmeldedaten-Autofill standardmaessig deaktiviert
- Browser-Erweiterungen werden nicht geladen

### Policy-Hook-Integration

Alle Browser-Aktionen durchlaufen die Standard-Policy-Hooks:

| Hook                 | Wann er ausloest                        | Was er prueft                                                   |
| -------------------- | --------------------------------------- | --------------------------------------------------------------- |
| `PRE_TOOL_CALL`      | Vor jeder Browser-Aktion               | Domain-Allowlist, URL-Policy, Aktionsberechtigungen             |
| `POST_TOOL_RESPONSE` | Nachdem der Browser Daten zurueckgibt   | Antwort klassifizieren, Session-Taint aktualisieren, Lineage erstellen |
| `PRE_OUTPUT`         | Wenn Browser-Inhalte das System verlassen | Klassifizierungspruefung gegen das Ziel                        |

### Ressourcenlimits

- Navigations-Timeout verhindert, dass der Browser endlos haengt
- Seitenlade-Groessenlimits verhindern uebermassigen Speicherverbrauch
- Gleichzeitige Tab-Limits werden pro Agent durchgesetzt

## Enterprise-Kontrollen

Enterprise-Bereitstellungen haben zusaetzliche Browser-Automatisierungskontrollen:

| Kontrolle                              | Beschreibung                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| Domain-Level-Klassifizierung           | Intranet-Domains automatisch als `INTERNAL` klassifiziert                        |
| Blockierte-Domains-Liste               | Admin-verwaltete Liste verbotener Domains                                        |
| Screenshot-Aufbewahrungsrichtlinie     | Wie lange aufgenommene Screenshots gespeichert werden                            |
| Browser-Session-Audit-Logging          | Vollstaendiges Logging aller Browser-Aktionen fuer Compliance                    |
| Browser-Automatisierung deaktivieren   | Admin kann das Browser-Tool fuer bestimmte Agenten oder Rollen deaktivieren      |

## Beispiel: Web-Recherche-Workflow

Ein typischer Agenten-Workflow mit Browser-Automatisierung:

```
1. Benutzer: "Recherchiere Wettbewerber-Preise auf example-competitor.com"

2. Agent: browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL: Domain "example-competitor.com" gegen Allowlist geprueft
          -> Erlaubt, als PUBLIC klassifiziert
          -> Navigation wird fortgesetzt

3. Agent: browser.snapshot()
          -> Screenshot aufgenommen, auf Session-Taint-Stufe klassifiziert (PUBLIC)

4. Agent: browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> Text extrahiert, als PUBLIC klassifiziert
          -> Lineage-Datensatz erstellt: source=example-competitor.com/pricing

5. Agent: Fasst Preisinformationen zusammen und gibt sie an den Benutzer zurueck
          -> PRE_OUTPUT: PUBLIC-Daten an Benutzerkanal -- ERLAUBT
```

Jeder Schritt wird protokolliert, klassifiziert und ist auditierbar.
