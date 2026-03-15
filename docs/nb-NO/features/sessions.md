# Sesjonsadministrasjon

Agenten kan inspisere, kommunisere med og spawne sesjoner. Disse verktøyene
muliggjør kryssesjonale arbeidsflyter, delegering av bakgrunnsoppgaver og
krysskanal-meldinger — alt under no-write-down-håndhevelse.

## Verktøy

### `sessions_list`

List alle aktive sesjoner som er synlige for gjeldende sesjon.

Tar ingen parametere. Resultater filtreres etter taint-nivå — en `PUBLIC`-sesjon
kan ikke se `CONFIDENTIAL`-sesjonsmetadata.

### `sessions_history`

Hent meldingshistorikken for en sesjon etter ID.

| Parameter    | Type   | Påkrevd | Beskrivelse                                  |
| ------------ | ------ | ------- | -------------------------------------------- |
| `session_id` | string | Ja      | Sesjons-ID-en som historikk skal hentes for  |

Tilgang nektes hvis målsesjonens taint er høyere enn kallerens taint.

### `sessions_send`

Send innhold fra gjeldende sesjon til en annen sesjon. Underlagt
no-write-down-håndhevelse.

| Parameter    | Type   | Påkrevd | Beskrivelse                       |
| ------------ | ------ | ------- | --------------------------------- |
| `session_id` | string | Ja      | Mål-sesjons-ID                    |
| `content`    | string | Ja      | Meldingsinnholdet som skal sendes |

**No-write-down-sjekk:** Kallerens taint må kunne flyte til målsesjonens
klassifiseringsnivå. En `CONFIDENTIAL`-sesjon kan ikke sende data til en
`PUBLIC`-sesjon.

### `sessions_spawn`

Spawn en ny bakgrunnssesjon for en autonom oppgave.

| Parameter | Type   | Påkrevd | Beskrivelse                                              |
| --------- | ------ | ------- | -------------------------------------------------------- |
| `task`    | string | Ja      | Beskrivelse av hva bakgrunnssesjonen skal gjøre          |

Den spawnede sesjonen starter med uavhengig `PUBLIC` taint og sitt eget isolerte
arbeidsområde. Den kjøres autonomt og returnerer resultater når den er ferdig.

### `session_status`

Hent metadata og status for en spesifikk sesjon.

| Parameter    | Type   | Påkrevd | Beskrivelse                    |
| ------------ | ------ | ------- | ------------------------------ |
| `session_id` | string | Ja      | Sesjons-ID-en som skal sjekkes |

Returnerer sesjons-ID, kanal, bruker, taint-nivå og opprettelsestidspunkt.
Tilgang er taint-gatert.

### `message`

Send en melding til en kanal og mottaker. Underlagt no-write-down-håndhevelse
via policy-hooks.

| Parameter   | Type   | Påkrevd | Beskrivelse                                       |
| ----------- | ------ | ------- | ------------------------------------------------- |
| `channel`   | string | Ja      | Målkanal (f.eks. `telegram`, `slack`)             |
| `recipient` | string | Ja      | Mottakeridentifikator innenfor kanalen            |
| `text`      | string | Ja      | Meldingsteksten som skal sendes                   |

### `summarize`

Generer et konsist sammendrag av den gjeldende samtalen. Nyttig for å opprette
overleveringsnotater, komprimere kontekst eller produsere et referat for levering
til en annen kanal.

| Parameter | Type   | Påkrevd | Beskrivelse                                                |
| --------- | ------ | ------- | ---------------------------------------------------------- |
| `scope`   | string | Nei     | Hva som skal oppsummeres: `session` (standard), `topic`    |

### `simulate_tool_call`

Simuler et verktøykall for å forhåndsvise policy-motorens beslutning uten å
kjøre verktøyet. Returnerer hook-evalueringsresultatet (ALLOW, BLOCK eller
REDACT) og reglene som ble evaluert.

| Parameter   | Type   | Påkrevd | Beskrivelse                                    |
| ----------- | ------ | ------- | ---------------------------------------------- |
| `tool_name` | string | Ja      | Verktøyet som skal simuleres                   |
| `args`      | object | Nei     | Argumenter som skal inkluderes i simuleringen  |

::: tip Bruk `simulate_tool_call` for å sjekke om et verktøykall vil bli tillatt
før du kjører det. Dette er nyttig for å forstå policy-atferd uten bivirkninger. :::

## Brukstilfeller

### Delegering av bakgrunnsoppgave

Agenten kan spawne en bakgrunnssesjon for å håndtere en langvarig oppgave uten
å blokkere den gjeldende samtalen:

```
Bruker: "Research competitor pricing and put together a summary"
Agent: [kaller sessions_spawn med oppgaven]
Agent: "I've started a background session to research that. I'll have results shortly."
```

### Kryssesjonskommunikasjon

Sesjoner kan sende data til hverandre, noe som muliggjør arbeidsflyter der én
sesjon produserer data som en annen forbruker:

```
Bakgrunnssesjon fullfører forskning → sessions_send til forelder → forelder varsler bruker
```

### Krysskanalmelding

`message`-verktøyet lar agenten proaktivt nå ut på en hvilken som helst
tilkoblet kanal:

```
Agent oppdager en kritisk hendelse → message({ channel: "telegram", recipient: "owner", text: "Alert: ..." })
```

## Sikkerhet

- Alle sesjonsoperasjoner er taint-gatert: du kan ikke se, lese eller sende til
  sesjoner over taint-nivået ditt
- `sessions_send` håndhever no-write-down-beskyttelse: data kan ikke flyte til
  en lavere klassifisering
- Spawnede sesjoner starter på `PUBLIC` taint med uavhengig taint-sporing
- `message`-verktøyet passerer gjennom `PRE_OUTPUT` policy-hooks før levering
- Sesjons-ID-er injiseres fra kjøretidskonteksten, ikke fra LLM-argumenter —
  agenten kan ikke utgi seg for å være en annen sesjon

::: warning SIKKERHET No-write-down-beskyttelse håndheves på all
kryssesjonskommunikasjon. En sesjon taintet som `CONFIDENTIAL` kan ikke sende
data til en `PUBLIC`-sesjon eller kanal. Dette er en hard grense håndhevet av
policy-laget. :::
