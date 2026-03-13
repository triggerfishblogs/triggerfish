# Webbasksökning och hämtning

Triggerfish ger din agent tillgång till internet via två verktyg: `web_search` för att hitta information och `web_fetch` för att läsa webbsidor. Tillsammans låter de agenten undersöka ämnen, söka upp dokumentation, kontrollera aktuella händelser och hämta data från webben — allt under samma policytillämpning som alla andra verktyg.

## Verktyg

### `web_search`

Sök på webben. Returnerar titlar, URL:er och utdrag.

| Parameter     | Typ    | Obligatorisk | Beskrivning                                                                                           |
| ------------- | ------ | ------------ | ----------------------------------------------------------------------------------------------------- |
| `query`       | string | Ja           | Söksförfrågan. Var specifik — inkludera relevanta nyckelord, namn eller datum för bättre resultat.    |
| `max_results` | number | Nej          | Maximalt antal resultat att returnera (standard: 5, max: 20).                                         |

**Exempelsvar:**

```
Sökresultat för "deno sqlite module":

1. @db/sqlite - Deno SQLite-bindningar
   https://jsr.io/@db/sqlite
   Snabba SQLite3-bindningar för Deno med FFI...

2. Deno SQLite Guide
   https://docs.deno.com/examples/sqlite
   Hur man använder SQLite med Deno...
```

### `web_fetch`

Hämta och extrahera läsbart innehåll från en URL. Returnerar artikeltext som standard med Mozilla Readability.

| Parameter | Typ    | Obligatorisk | Beskrivning                                                                               |
| --------- | ------ | ------------ | ----------------------------------------------------------------------------------------- |
| `url`     | string | Ja           | URL:en att hämta. Använd URL:er från `web_search`-resultat.                               |
| `mode`    | string | Nej          | Extraktionsläge: `readability` (standard, artikeltext) eller `raw` (full HTML).           |

**Extraktionslägen:**

- **`readability`** (standard) — Extraherar huvudartikelinnehållet, rensar navigation, annonser och standardtext. Bäst för nyhetsartiklar, blogginlägg och dokumentation.
- **`raw`** — Returnerar full HTML. Använd när readability-extraktion returnerar för lite innehåll (t.ex. ensidiga appar, dynamiskt innehåll).

## Hur agenten använder dem

Agenten följer ett sök-sedan-hämta-mönster:

1. Använd `web_search` för att hitta relevanta URL:er
2. Använd `web_fetch` för att läsa de mest lovande sidorna
3. Syntetisera informationen och citera källor

När agenten svarar med webbinformation citerar den käll-URL:er infogat så att de är synliga över alla kanaler (Telegram, Slack, CLI, etc.).

## Konfiguration

Webbsökning kräver en sökleverantör. Konfigurera den i `triggerfish.yaml`:

```yaml
web:
  search:
    provider: brave # Sökleverantör (brave är standard)
    api_key: din-api-nyckel # Brave Search API-nyckel
```

| Nyckel                | Typ    | Beskrivning                                            |
| --------------------- | ------ | ------------------------------------------------------ |
| `web.search.provider` | string | Sökleverantör. Nuvarande stöd: `brave`.                |
| `web.search.api_key`  | string | API-nyckel för sökleverantören.                        |

::: tip Om ingen sökleverantör är konfigurerad returnerar `web_search` ett felmeddelande som talar om för agenten att sökning är otillgänglig. `web_fetch` fungerar självständigt — det kräver ingen sökleverantör. :::

## Säkerhet

- Alla hämtade URL:er passerar genom SSRF-skydd: DNS löses upp först och kontrolleras mot en hårdkodad IP-denylist. Privata/reserverade IP-intervall blockeras alltid.
- Hämtat innehåll klassificeras och bidrar till sessions-taint precis som alla andra verktygssvar.
- `PRE_TOOL_CALL`-kroken körs före varje hämtning och `POST_TOOL_RESPONSE` körs efter, så anpassade policyregler kan begränsa vilka domäner agenten har åtkomst till.
