# Ricerca Web e Fetch

Triggerfish dà all'agent accesso a internet attraverso due tool: `web_search`
per trovare informazioni e `web_fetch` per leggere pagine web. Insieme
consentono all'agent di ricercare argomenti, consultare documentazione,
verificare eventi attuali e importare dati dal web -- il tutto sotto la stessa
applicazione delle policy di ogni altro tool.

## Tool

### `web_search`

Cercare nel web. Restituisce titoli, URL e frammenti.

| Parametro     | Tipo   | Obbligatorio | Descrizione                                                                                         |
| ------------- | ------ | ------------ | --------------------------------------------------------------------------------------------------- |
| `query`       | string | sì           | Query di ricerca. Essere specifici -- includere parole chiave, nomi o date pertinenti per migliori risultati. |
| `max_results` | number | no           | Risultati massimi da restituire (predefinito: 5, max: 20).                                          |

**Esempio di risposta:**

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

Recuperare ed estrarre contenuto leggibile da un URL. Restituisce il testo
dell'articolo per impostazione predefinita usando Mozilla Readability.

| Parametro | Tipo   | Obbligatorio | Descrizione                                                                         |
| --------- | ------ | ------------ | ----------------------------------------------------------------------------------- |
| `url`     | string | sì           | L'URL da recuperare. Utilizzare URL dai risultati di `web_search`.                  |
| `mode`    | string | no           | Modalità di estrazione: `readability` (predefinito, testo articolo) o `raw` (HTML completo). |

**Modalità di estrazione:**

- **`readability`** (predefinito) -- Estrae il contenuto principale dell'articolo,
  rimuovendo navigazione, pubblicità e boilerplate. Migliore per articoli di
  notizie, post di blog e documentazione.
- **`raw`** -- Restituisce l'HTML completo. Utilizzare quando l'estrazione
  readability restituisce troppo poco contenuto (es. app a singola pagina,
  contenuto dinamico).

## Come l'Agent Li Utilizza

L'agent segue un pattern cerca-poi-recupera:

1. Utilizzare `web_search` per trovare URL pertinenti
2. Utilizzare `web_fetch` per leggere le pagine più promettenti
3. Sintetizzare le informazioni e citare le fonti

Quando risponde con informazioni dal web, l'agent cita gli URL sorgente inline
affinché siano visibili su tutti i canali (Telegram, Slack, CLI, ecc.).

## Configurazione

La ricerca web richiede un provider di ricerca. Configurarlo in
`triggerfish.yaml`:

```yaml
web:
  search:
    provider: brave # Backend di ricerca (brave è il predefinito)
    api_key: your-api-key # Chiave API Brave Search
```

| Chiave                | Tipo   | Descrizione                                               |
| --------------------- | ------ | --------------------------------------------------------- |
| `web.search.provider` | string | Backend di ricerca. Attualmente supportato: `brave`.      |
| `web.search.api_key`  | string | Chiave API per il provider di ricerca.                    |

::: tip Se nessun provider di ricerca è configurato, `web_search` restituisce un
messaggio di errore che informa l'agent che la ricerca non è disponibile.
`web_fetch` funziona indipendentemente -- non richiede un provider di ricerca.
:::

## Sicurezza

- Tutti gli URL recuperati passano attraverso la prevenzione SSRF: il DNS viene
  risolto prima e verificato rispetto a una denylist di IP hardcoded. Gli
  intervalli IP privati/riservati sono sempre bloccati.
- Il contenuto recuperato viene classificato e contribuisce al taint della
  sessione come qualsiasi altra risposta di tool.
- L'hook `PRE_TOOL_CALL` si attiva prima di ogni fetch, e `POST_TOOL_RESPONSE`
  si attiva dopo, così le regole di policy personalizzate possono limitare
  quali domini l'agent accede.
