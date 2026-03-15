# Nettsøk og -henting

Triggerfish gir agenten din tilgang til internett gjennom to verktøy:
`web_search` for å finne informasjon og `web_fetch` for å lese nettsider.
Sammen lar de agenten forske på emner, slå opp dokumentasjon, sjekke aktuelle
hendelser og hente inn data fra nettet — alt under den samme policy-håndhevelsen
som alle andre verktøy.

## Verktøy

### `web_search`

Søk på nettet. Returnerer titler, URL-er og utdrag.

| Parameter     | Type   | Påkrevd | Beskrivelse                                                                                      |
| ------------- | ------ | ------- | ------------------------------------------------------------------------------------------------ |
| `query`       | string | Ja      | Søkespørring. Vær spesifikk — inkluder relevante søkeord, navn eller datoer for bedre resultater.|
| `max_results` | number | Nei     | Maksimalt antall resultater å returnere (standard: 5, maks: 20).                                 |

**Eksempelsvar:**

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

Hent og ekstraher lesbart innhold fra en URL. Returnerer artikkeltekst som
standard ved hjelp av Mozilla Readability.

| Parameter | Type   | Påkrevd | Beskrivelse                                                                         |
| --------- | ------ | ------- | ----------------------------------------------------------------------------------- |
| `url`     | string | Ja      | URL-en som skal hentes. Bruk URL-er fra `web_search`-resultater.                   |
| `mode`    | string | Nei     | Ekstraksjonsmoodus: `readability` (standard, artikkeltekst) eller `raw` (full HTML).|

**Ekstraksjonsmodi:**

- **`readability`** (standard) — Trekker ut hovedartikkelinnholdet, fjerner
  navigasjon, annonser og standardtekst. Best for nyhetsartikler, blogginnlegg
  og dokumentasjon.
- **`raw`** — Returnerer full HTML. Bruk når readability-ekstraksjon returnerer
  for lite innhold (f.eks. single-page-apper, dynamisk innhold).

## Slik bruker agenten dem

Agenten følger et søk-så-hent-mønster:

1. Bruk `web_search` til å finne relevante URL-er
2. Bruk `web_fetch` til å lese de mest lovende sidene
3. Syntetiser informasjonen og sitér kildene

Når agenten svarer med nettinformasjon, siterer den kilde-URL-er innebygd slik
at de er synlige på tvers av alle kanaler (Telegram, Slack, CLI osv.).

## Konfigurasjon

Nettsøk krever en søkeleverandør. Konfigurer den i `triggerfish.yaml`:

```yaml
web:
  search:
    provider: brave # Søkemotor (brave er standard)
    api_key: your-api-key # Brave Search API-nøkkel
```

| Nøkkel                | Type   | Beskrivelse                                     |
| --------------------- | ------ | ----------------------------------------------- |
| `web.search.provider` | string | Søkemotor. Støttet for øyeblikket: `brave`.     |
| `web.search.api_key`  | string | API-nøkkel for søkeleverandøren.                |

::: tip Hvis ingen søkeleverandør er konfigurert, returnerer `web_search` en
feilmelding som forteller agenten at søk er utilgjengelig. `web_fetch` fungerer
uavhengig — det krever ikke en søkeleverandør. :::

## Sikkerhet

- Alle hentede URL-er passerer gjennom SSRF-beskyttelse: DNS løses først og
  sjekkes mot en hardkodet IP-denylist. Private/reserverte IP-områder er alltid
  blokkert.
- Hentet innhold klassifiseres og bidrar til session taint som ethvert annet
  verktøysvar.
- `PRE_TOOL_CALL`-hooken utløses før hver henting, og `POST_TOOL_RESPONSE`
  utløses etter, slik at egendefinerte policyregler kan begrense hvilke domener
  agenten aksesserer.
