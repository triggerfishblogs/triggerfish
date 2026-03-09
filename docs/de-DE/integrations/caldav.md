# CalDAV-Integration

Verbinden Sie Ihren Triggerfish-Agenten mit jedem CalDAV-kompatiblen Kalenderserver. Dies ermoeglicht Kalenderoperationen ueber Anbieter hinweg, die den CalDAV-Standard unterstuetzen, einschliesslich iCloud, Fastmail, Nextcloud, Radicale und jedem selbst gehosteten CalDAV-Server.

## Unterstuetzte Anbieter

| Anbieter   | CalDAV-URL                                      | Hinweise                         |
| ---------- | ----------------------------------------------- | -------------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | Erfordert app-spezifisches Passwort |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | Standard-CalDAV                  |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Selbst gehostet                  |
| Radicale   | `https://your-server.com`                       | Leichtgewichtiges Self-Hosting   |
| Baikal     | `https://your-server.com/dav.php`               | Selbst gehostet                  |

::: info Fuer Google Calendar verwenden Sie stattdessen die [Google Workspace](/de-DE/integrations/google-workspace)-Integration, die die native Google-API mit OAuth2 nutzt. CalDAV ist fuer Nicht-Google-Kalenderanbieter. :::

## Einrichtung

### Schritt 1: CalDAV-Anmeldedaten beschaffen

Sie benoetigen drei Informationen von Ihrem Kalenderanbieter:

- **CalDAV-URL** -- Die Basis-URL fuer den CalDAV-Server
- **Benutzername** -- Ihr Konto-Benutzername oder E-Mail
- **Passwort** -- Ihr Konto-Passwort oder ein app-spezifisches Passwort

::: warning App-spezifische Passwoerter Die meisten Anbieter erfordern ein app-spezifisches Passwort anstelle Ihres Hauptkonto-Passworts. Pruefen Sie die Dokumentation Ihres Anbieters, wie Sie eines generieren koennen. :::

### Schritt 2: Triggerfish konfigurieren

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # Passwort im Betriebssystem-Schluesselbund gespeichert
    classification: CONFIDENTIAL
```

| Option           | Typ    | Erforderlich | Beschreibung                                             |
| ---------------- | ------ | ------------ | -------------------------------------------------------- |
| `url`            | string | Ja           | CalDAV-Server-Basis-URL                                  |
| `username`       | string | Ja           | Konto-Benutzername oder E-Mail                           |
| `password`       | string | Ja           | Konto-Passwort (im Betriebssystem-Schluesselbund gespeichert) |
| `classification` | string | Nein         | Klassifizierungsstufe (Standard: `CONFIDENTIAL`)         |

### Schritt 3: Kalender-Erkennung

Bei der ersten Verbindung fuehrt der Agent CalDAV-Erkennung durch, um alle verfuegbaren Kalender zu finden. Die erkannten Kalender werden lokal zwischengespeichert.

```bash
triggerfish connect caldav
```

## Verfuegbare Tools

| Tool                | Beschreibung                                           |
| ------------------- | ------------------------------------------------------ |
| `caldav_list`       | Alle Kalender des Kontos auflisten                     |
| `caldav_events`     | Ereignisse fuer einen Datumsbereich aus einem oder allen Kalendern abrufen |
| `caldav_create`     | Neues Kalenderereignis erstellen                       |
| `caldav_update`     | Bestehendes Ereignis aktualisieren                     |
| `caldav_delete`     | Ereignis loeschen                                      |
| `caldav_search`     | Ereignisse per Textabfrage durchsuchen                 |
| `caldav_freebusy`   | Frei/Belegt-Status fuer einen Zeitraum pruefen         |

## Klassifizierung

Kalenderdaten werden standardmaessig als `CONFIDENTIAL` eingestuft, da sie Namen, Zeitplaene, Orte und Besprechungsdetails enthalten. Der Zugriff auf jedes CalDAV-Tool eskaliert den Session-Taint auf die konfigurierte Klassifizierungsstufe.

## Authentifizierung

CalDAV verwendet HTTP Basic Auth ueber TLS. Anmeldedaten werden im Betriebssystem-Schluesselbund gespeichert und auf HTTP-Ebene unterhalb des LLM-Kontexts injiziert -- der Agent sieht niemals das rohe Passwort.

## Verwandte Seiten

- [Google Workspace](/de-DE/integrations/google-workspace) -- Fuer Google Calendar (verwendet native API)
- [Cron und Triggers](/de-DE/features/cron-and-triggers) -- Kalenderbasierte Agenten-Aktionen planen
- [Klassifizierungsleitfaden](/de-DE/guide/classification-guide) -- Die richtige Klassifizierungsstufe waehlen
