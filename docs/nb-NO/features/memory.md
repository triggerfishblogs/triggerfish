# Vedvarende minne

Triggerfish-agenter har vedvarende kryssesjonelt minne. Agenten kan lagre
fakta, preferanser og kontekst som overlever på tvers av samtaler, omstarter
og til og med trigger-oppvåkninger. Minnet er klassifiseringsgatert — agenten kan
ikke lese over sin session taint eller skrive under den.

## Verktøy

### `memory_save`

Lagre et faktum eller en informasjonsbit i vedvarende minne.

| Parameter | Type   | Påkrevd | Beskrivelse                                                         |
| --------- | ------ | ------- | ------------------------------------------------------------------- |
| `key`     | string | Ja      | Unik identifikator (f.eks. `bruker-navn`, `prosjekt-frist`)         |
| `content` | string | Ja      | Innholdet som skal huskes                                           |
| `tags`    | array  | Nei     | Tagger for kategorisering (f.eks. `["personlig", "preferanse"]`)    |

Klassifisering **settes automatisk** til den gjeldende sesjonens taint-nivå.
Agenten kan ikke velge hvilket nivå et minne lagres på.

### `memory_get`

Hent et spesifikt minne med nøkkelen.

| Parameter | Type   | Påkrevd | Beskrivelse                          |
| --------- | ------ | ------- | ------------------------------------ |
| `key`     | string | Ja      | Nøkkelen til minnet som skal hentes  |

Returnerer minneinnholdet hvis det finnes og er tilgjengelig på gjeldende
sikkerhetsnivå. Høyere-klassifiserte versjoner skygger lavere.

### `memory_search`

Søk på tvers av alle tilgjengelige minner med naturlig språk.

| Parameter     | Type   | Påkrevd | Beskrivelse                        |
| ------------- | ------ | ------- | ---------------------------------- |
| `query`       | string | Ja      | Søkespørring på naturlig språk     |
| `max_results` | number | Nei     | Maksimalt antall resultater (standard: 10) |

Bruker SQLite FTS5 fulltekstsøk med stemming. Resultater filtreres etter
gjeldende sesjons sikkerhetsnivå.

### `memory_list`

List alle tilgjengelige minner, eventuelt filtrert etter tagg.

| Parameter | Type   | Påkrevd | Beskrivelse           |
| --------- | ------ | ------- | --------------------- |
| `tag`     | string | Nei     | Tagg å filtrere etter |

### `memory_delete`

Slett et minne etter nøkkel. Posten mykt-slettes (skjules men beholdes for revisjon).

| Parameter | Type   | Påkrevd | Beskrivelse                          |
| --------- | ------ | ------- | ------------------------------------ |
| `key`     | string | Ja      | Nøkkelen til minnet som skal slettes |

Kan bare slette minner på gjeldende sesjons sikkerhetsnivå.

## Slik fungerer minnet

### Automatisk utvinning

Agenten lagrer proaktivt viktige fakta brukeren deler — personlige detaljer,
prosjektkontekst, preferanser — ved hjelp av beskrivende nøkler. Dette er
atferd på prompt-nivå styrt av SPINE.md. LLM-en velger **hva** som lagres;
policy-laget tvinger **på hvilket nivå**.

### Klassifiseringsgating

Hver minnepost bærer et klassifiseringsnivå lik session taint på tidspunktet
den ble lagret:

- Et minne lagret under en `CONFIDENTIAL`-sesjon klassifiseres som `CONFIDENTIAL`
- En `PUBLIC`-sesjon kan ikke lese `CONFIDENTIAL`-minner
- En `CONFIDENTIAL`-sesjon kan lese både `CONFIDENTIAL`- og `PUBLIC`-minner

Dette håndheves av `canFlowTo`-sjekker på alle leseoperasjoner. LLM-en kan
ikke omgå dette.

### Minneskygge

Når samme nøkkel finnes på flere klassifiseringsnivåer, returneres bare den
høyest-klassifiserte versjonen som er synlig for gjeldende sesjon. Dette
forhindrer informasjonslekkasje på tvers av klassifiseringsgrenser.

**Eksempel:** Hvis `bruker-navn` finnes på både `PUBLIC` (satt under en offentlig
chat) og `INTERNAL` (oppdatert under en privat sesjon), ser en `INTERNAL`-sesjon
`INTERNAL`-versjonen, mens en `PUBLIC`-sesjon bare ser `PUBLIC`-versjonen.

### Lagring

Minner lagres via `StorageProvider`-grensesnittet (den samme abstraksjonen
som brukes for sesjoner, cron-jobber og todos). Fulltekstsøk bruker SQLite FTS5
for raske naturlige spørringer med stemming.

## Sikkerhet

- Klassifisering tvinges alltid til `session.taint` i `PRE_TOOL_CALL`-hooken
  — LLM-en kan ikke velge et lavere klassifiseringsnivå
- Alle lesninger filtreres av `canFlowTo` — ingen minner over session taint
  returneres noen gang
- Slettinger er mykt-slettinger — posten skjules men beholdes for revisjon
- Agenten kan ikke eskalere minneklassifisering ved å lese høy-klassifisert
  data og lagre det på nytt på et lavere nivå (no-write-down-beskyttelse gjelder)

::: warning SIKKERHET LLM-en velger aldri minneklassifisering. Det tvinges alltid
til gjeldende sesjons taint-nivå av policy-laget. Dette er en hard grense som
ikke kan konfigureres bort. :::
