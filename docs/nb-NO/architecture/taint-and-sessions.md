# Sesjoner og Taint

Sesjoner er den grunnleggende enheten av samtaletilstand i Triggerfish. Hver sesjon sporer uavhengig et **taint-nivå** — et klassifiseringsmerke som registrerer den høyeste sensitiviteten til data som er aksessert under sesjonen. Taint driver policy-motorens utgangsbeslutninger: hvis en sesjon er tainted ved `CONFIDENTIAL`, kan ingen data fra den sesjonen flyte til en kanal klassifisert under `CONFIDENTIAL`.

## Session Taint-modell

### Slik fungerer Taint

Når en sesjon aksesserer data på et klassifiseringsnivå, **taint-es** hele sesjonen på det nivået. Taint følger tre regler:

1. **Per-samtale**: Hver sesjon har sitt eget uavhengige taint-nivå
2. **Kun eskalering**: Taint kan øke, aldri synke innen en sesjon
3. **Full tilbakestilling tømmer alt**: Taint OG samtalehistorikk tømmes sammen

<img src="/diagrams/taint-escalation.svg" alt="Taint-eskalering: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint kan bare eskalere, aldri synke." style="max-width: 100%;" />

::: warning SIKKERHET Taint kan aldri selektivt reduseres. Det finnes ingen mekanisme for å "un-taint" en sesjon uten å tømme hele samtalehistorikken. Dette forhindrer kontekstlekkasje — hvis sesjonen husker å ha sett konfidensielle data, må taint gjenspeile det. :::

### Hvorfor Taint ikke kan synke

Selv om de klassifiserte dataene ikke lenger vises, inneholder LLM-ens kontekstvindu dem fortsatt. Modellen kan referere til, oppsummere eller gjenta klassifisert informasjon i fremtidige svar. Den eneste sikre måten å senke taint på er å eliminere konteksten fullstendig — noe en full tilbakestilling gjør.

## Sesjonstyper

Triggerfish administrerer flere sesjonstyper, hver med uavhengig taint-sporing:

| Sesjonstype    | Beskrivelse                                             | Innledende Taint | Vedvarer over omstarter |
| -------------- | ------------------------------------------------------- | ---------------- | ----------------------- |
| **Hoved**      | Primær direkte samtale med eieren                       | `PUBLIC`         | Ja                      |
| **Kanal**      | Én per tilkoblet kanal (Telegram, Slack osv.)           | `PUBLIC`         | Ja                      |
| **Bakgrunn**   | Spawnet for autonome oppgaver (cron, webhooks)          | `PUBLIC`         | Oppgavens varighet      |
| **Agent**      | Per-agent sesjoner for multi-agent-ruting               | `PUBLIC`         | Ja                      |
| **Gruppe**     | Gruppechat-sesjoner                                     | `PUBLIC`         | Ja                      |

::: info Bakgrunnssesjoner starter alltid med `PUBLIC` taint, uavhengig av foreldresesjonens taint-nivå. Dette er med hensikt — cron-jobber og webhook-utløste oppgaver bør ikke arve taint fra hvilken sesjon som helst som spawnet dem. :::

## Taint-eskaleringeksempel

Her er en fullstendig flyt som viser taint-eskalering og den resulterende policy-blokkeringen:

<img src="/diagrams/taint-with-blocks.svg" alt="Taint-eskaleringeksempel: sesjon starter PUBLIC, eskalerer til CONFIDENTIAL etter Salesforce-tilgang, blokkerer deretter utdata til PUBLIC WhatsApp-kanal" style="max-width: 100%;" />

## Full tilbakestillingsmekanisme

En sesjonstilbakestilling er den eneste måten å senke taint på. Det er en bevisst, destruktiv operasjon:

1. **Arkiver linjeoppføringer** — All linjedata fra sesjonen bevares i revisjonslagring
2. **Tøm samtalehistorikk** — Hele kontekstvinduet slettes
3. **Tilbakestill taint til PUBLIC** — Sesjonen starter på nytt
4. **Krev brukerbekreftelse** — `SESSION_RESET`-hooken krever eksplisitt bekreftelse før utførelse

Etter en tilbakestilling er sesjonen uadskillelig fra en brandny sesjon. Agenten har ingen hukommelse om forrige samtale. Dette er den eneste måten å garantere at klassifiserte data ikke kan lekke gjennom LLM-ens kontekst.

## Kommunikasjon mellom sesjoner

Når en agent sender data mellom sesjoner ved hjelp av `sessions_send`, gjelder de samme write-down-reglene:

| Kilde Sesjon Taint | Mål Sesjon Kanal       | Beslutning |
| ------------------- | ----------------------- | ---------- |
| `PUBLIC`            | `PUBLIC`-kanal          | ALLOW      |
| `CONFIDENTIAL`      | `CONFIDENTIAL`-kanal    | ALLOW      |
| `CONFIDENTIAL`      | `PUBLIC`-kanal          | BLOCK      |
| `RESTRICTED`        | `CONFIDENTIAL`-kanal    | BLOCK      |

Sesjonsverktøy tilgjengelig for agenten:

| Verktøy            | Beskrivelse                                | Taint-effekt                               |
| ------------------ | ------------------------------------------ | ------------------------------------------ |
| `sessions_list`    | List aktive sesjoner med filtre            | Ingen taint-endring                        |
| `sessions_history` | Hent utskrift for en sesjon                | Taint arver fra referert sesjon            |
| `sessions_send`    | Send melding til en annen sesjon           | Underlagt write-down-sjekk                 |
| `sessions_spawn`   | Opprett bakgrunnsoppgavesesjon             | Ny sesjon starter ved `PUBLIC`             |
| `session_status`   | Sjekk gjeldende sesjonstilstand og metadata | Ingen taint-endring                       |

## Datalinje

Hvert dataelement behandlet av Triggerfish bærer **provenansmetadata** — en fullstendig oversikt over hvor data kom fra, hvordan det ble transformert og hvor det dro. Linje er revisjonsloggen som gjør klassifiseringsbeslutninger verifiserbare.

### Linjepoststruktur

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Valgte felt: navn, beløp, stadium",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM oppsummerte 3 oppføringer til pipeline-oversikt",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### Regler for linjesporing

| Hendelse                                 | Linjehandling                                     |
| ---------------------------------------- | ------------------------------------------------- |
| Data lest fra integrasjon                | Opprett linjepost med opprinnelse                 |
| Data transformert av LLM                 | Legg til transformasjon, koble inndata-linjer     |
| Data aggregert fra flere kilder          | Slå sammen linje, klassifisering = `max(inndata)` |
| Data sendt til kanal                     | Register destinasjon, verifiser klassifisering    |
| Sesjonstilbakestilling                   | Arkiver linjeoppføringer, tøm fra kontekst        |

### Aggregasjonsklassifisering

Når data fra flere kilder kombineres (f.eks. en LLM-oppsummering av oppføringer fra forskjellige integrasjoner), arver det aggregerte resultatet den **maksimale klassifiseringen** av alle inndata:

```
Inndata 1: INTERNAL    (intern wiki)
Inndata 2: CONFIDENTIAL (Salesforce-post)
Inndata 3: PUBLIC      (vær-API)

Aggregert utklassifisering: CONFIDENTIAL (maks av inndata)
```

::: tip Bedriftsdistribusjoner kan konfigurere valgfrie nedgraderingsregler for statistiske aggregater (gjennomsnitt, antall, summer av 10+ oppføringer) eller sertifisert anonymiserte data. Alle nedgraderinger krever eksplisitte policy-regler, logges med full begrunnelse og er underlagt revisjonsgjennomgang. :::

### Revisjonsevner

Linje muliggjør fire kategorier av revisjonsforespørsler:

- **Fremoverssporing**: "Hva skjedde med data fra Salesforce-post X?" — følger data fremover fra opprinnelse til alle destinasjoner
- **Bakoverssporing**: "Hvilke kilder bidro til dette utdataet?" — sporer et utdata tilbake til alle kildeoppføringer
- **Klassifiseringsbegrunnelse**: "Hvorfor er dette merket CONFIDENTIAL?" — viser klassifiseringsårsakskjeden
- **Samsvareksport**: Fullstendig forvaringskjede for juridisk eller regulatorisk gjennomgang

## Taint-vedvarenhet

Session taint vedvares gjennom `StorageProvider` under `taint:`-navnerommet. Dette betyr at taint overlever daemon-omstarter — en sesjon som var `CONFIDENTIAL` før en omstart er fortsatt `CONFIDENTIAL` etterpå.

Linjeoppføringer vedvares under `lineage:`-navnerommet med samsvarsdrevet oppbevaring (standard 90 dager).
