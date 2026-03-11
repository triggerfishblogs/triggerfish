# Websuche und Abruf

Triggerfish gibt Ihrem Agenten Zugang zum Internet ueber zwei Tools: `web_search` zum Finden von Informationen und `web_fetch` zum Lesen von Webseiten. Zusammen ermoeglichen sie dem Agenten, Themen zu recherchieren, Dokumentation nachzuschlagen, aktuelle Ereignisse zu pruefen und Daten aus dem Web abzurufen -- alles unter derselben Policy-Durchsetzung wie jedes andere Tool.

## Tools

### `web_search`

Durchsucht das Web. Gibt Titel, URLs und Snippets zurueck.

| Parameter     | Typ    | Erforderlich | Beschreibung                                                                                             |
| ------------- | ------ | ------------ | -------------------------------------------------------------------------------------------------------- |
| `query`       | string | ja           | Suchabfrage. Seien Sie spezifisch -- verwenden Sie relevante Schluesselwoerter, Namen oder Daten fuer bessere Ergebnisse. |
| `max_results` | number | nein         | Maximale zurueckgegebene Ergebnisse (Standard: 5, Maximum: 20).                                           |

**Beispielantwort:**

```
Search results for "deno sqlite module":

1. @db/sqlite - Deno SQLite bindings
   https://jsr.io/@db/sqlite
   Fast SQLite3 bindings for Deno using FFI...

2. Deno SQLite Guide
   https://docs.deno.com/examples/sqlite
   How to use SQLite with Deno...
```

### `web_fetch`

Ruft lesbaren Inhalt von einer URL ab und extrahiert ihn. Gibt standardmaessig Artikeltext zurueck, unter Verwendung von Mozilla Readability.

| Parameter | Typ    | Erforderlich | Beschreibung                                                                             |
| --------- | ------ | ------------ | ---------------------------------------------------------------------------------------- |
| `url`     | string | ja           | Die abzurufende URL. Verwenden Sie URLs aus `web_search`-Ergebnissen.                     |
| `mode`    | string | nein         | Extraktionsmodus: `readability` (Standard, Artikeltext) oder `raw` (vollstaendiges HTML). |

**Extraktionsmodi:**

- **`readability`** (Standard) -- Extrahiert den Hauptartikelinhalt und entfernt Navigation, Werbung und Standardelemente. Am besten fuer Nachrichtenartikel, Blogbeitraege und Dokumentation.
- **`raw`** -- Gibt das vollstaendige HTML zurueck. Verwenden Sie dies, wenn die Readability-Extraktion zu wenig Inhalt zurueckgibt (z.B. Single-Page-Apps, dynamischer Inhalt).

## Wie der Agent sie verwendet

Der Agent folgt einem Suchen-dann-Abrufen-Muster:

1. `web_search` verwenden, um relevante URLs zu finden
2. `web_fetch` verwenden, um die vielversprechendsten Seiten zu lesen
3. Die Informationen zusammenfassen und Quellen zitieren

Wenn der Agent mit Web-Informationen antwortet, zitiert er Quell-URLs inline, damit sie ueber alle Kanaele hinweg sichtbar sind (Telegram, Slack, CLI usw.).

## Konfiguration

Websuche erfordert einen Suchanbieter. Konfigurieren Sie ihn in `triggerfish.yaml`:

```yaml
web:
  search:
    provider: brave # Such-Backend (brave ist der Standard)
    api_key: your-api-key # Brave Search API-Schluessel
```

| Schluessel            | Typ    | Beschreibung                                           |
| --------------------- | ------ | ------------------------------------------------------ |
| `web.search.provider` | string | Such-Backend. Derzeit unterstuetzt: `brave`.            |
| `web.search.api_key`  | string | API-Schluessel fuer den Suchanbieter.                   |

::: tip Wenn kein Suchanbieter konfiguriert ist, gibt `web_search` eine Fehlermeldung zurueck, die dem Agenten mitteilt, dass die Suche nicht verfuegbar ist. `web_fetch` funktioniert unabhaengig -- es erfordert keinen Suchanbieter. :::

## Sicherheit

- Alle abgerufenen URLs durchlaufen SSRF-Praevention: DNS wird zuerst aufgeloest und gegen eine fest kodierte IP-Denylist geprueft. Private/reservierte IP-Bereiche werden immer blockiert.
- Abgerufene Inhalte werden klassifiziert und tragen wie jede andere Tool-Antwort zum Session-Taint bei.
- Der `PRE_TOOL_CALL`-Hook wird vor jedem Abruf ausgeloest, und `POST_TOOL_RESPONSE` wird danach ausgeloest, sodass benutzerdefinierte Policy-Regeln einschraenken koennen, auf welche Domains der Agent zugreift.
