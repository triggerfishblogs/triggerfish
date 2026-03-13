# Webzoeken en -ophalen

Triggerfish geeft uw agent toegang tot het internet via twee tools: `web_search` voor het vinden van informatie en `web_fetch` voor het lezen van webpagina's. Samen laten ze de agent onderwerpen onderzoeken, documentatie opzoeken, actuele gebeurtenissen controleren en gegevens van het web ophalen — allemaal onder dezelfde beleidshandhaving als elke andere tool.

## Tools

### `web_search`

Het web doorzoeken. Geeft titels, URL's en fragmenten terug.

| Parameter     | Type   | Vereist | Beschrijving                                                                                                         |
| ------------- | ------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `query`       | string | ja      | Zoekopdracht. Wees specifiek — voeg relevante trefwoorden, namen of datums toe voor betere resultaten.               |
| `max_results` | number | nee     | Maximale te retourneren resultaten (standaard: 5, max: 20).                                                          |

**Voorbeeldantwoord:**

```
Zoekresultaten voor "deno sqlite module":

1. @db/sqlite - Deno SQLite-bindingen
   https://jsr.io/@db/sqlite
   Snelle SQLite3-bindingen voor Deno met FFI...

2. Deno SQLite-gids
   https://docs.deno.com/examples/sqlite
   Hoe SQLite te gebruiken met Deno...
```

### `web_fetch`

Leesbare inhoud ophalen en extraheren van een URL. Geeft standaard artikeltekst terug via Mozilla Readability.

| Parameter | Type   | Vereist | Beschrijving                                                                       |
| --------- | ------ | ------- | ---------------------------------------------------------------------------------- |
| `url`     | string | ja      | De op te halen URL. Gebruik URL's uit `web_search`-resultaten.                     |
| `mode`    | string | nee     | Extractiemodus: `readability` (standaard, artikeltekst) of `raw` (volledige HTML). |

**Extractiemodi:**

- **`readability`** (standaard) — Extraheert de hoofdartikelinhoud, waarbij navigatie, advertenties en standaardtekst worden verwijderd. Best voor nieuwsartikelen, blogberichten en documentatie.
- **`raw`** — Geeft de volledige HTML terug. Gebruik wanneer readability-extractie te weinig inhoud teruggeeeft (bijv. single-page apps, dynamische inhoud).

## Hoe de agent ze gebruikt

De agent volgt een zoek-dan-ophalen-patroon:

1. Gebruik `web_search` om relevante URL's te vinden
2. Gebruik `web_fetch` om de meest veelbelovende pagina's te lezen
3. Synthetiseer de informatie en citeer bronnen

Bij het beantwoorden met webinformatie citeert de agent bron-URL's inline zodat ze zichtbaar zijn via alle kanalen (Telegram, Slack, CLI, enz.).

## Configuratie

Webzoeken vereist een zoekprovider. Configureer dit in `triggerfish.yaml`:

```yaml
web:
  search:
    provider: brave # Zoekbackend (brave is de standaard)
    api_key: uw-api-sleutel # Brave Search API-sleutel
```

| Sleutel               | Type   | Beschrijving                                          |
| --------------------- | ------ | ----------------------------------------------------- |
| `web.search.provider` | string | Zoekbackend. Momenteel ondersteund: `brave`.          |
| `web.search.api_key`  | string | API-sleutel voor de zoekprovider.                     |

::: tip Als er geen zoekprovider is geconfigureerd, geeft `web_search` een foutmelding die de agent vertelt dat zoeken niet beschikbaar is. `web_fetch` werkt onafhankelijk — het heeft geen zoekprovider nodig. :::

## Beveiliging

- Alle opgehaalde URL's doorlopen SSRF-preventie: DNS wordt eerst opgelost en gecontroleerd aan de hand van een vaste IP-denylist. Privé/gereserveerde IP-bereiken zijn altijd geblokkeerd.
- Opgehaalde inhoud wordt geclassificeerd en draagt bij aan sessie-taint zoals elke andere toolreactie.
- De `PRE_TOOL_CALL`-hook loopt vóór elke fetch, en `POST_TOOL_RESPONSE` loopt erna, zodat aangepaste beleidsregels kunnen beperken welke domeinen de agent benadert.
