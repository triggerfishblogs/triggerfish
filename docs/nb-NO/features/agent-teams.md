# Agentteam

Triggerfish-agenter kan spawne vedvarende team av samarbeidende agenter som
arbeider sammen om komplekse oppgaver. Hvert teammedlem får sin egen sesjon,
rolle, samtalekontekst og verktøy. Én av medlemmene utpekes som **leder** og
koordinerer arbeidet.

Team er best for åpne oppgaver som drar nytte av spesialiserte roller som
arbeider parallelt: forskning + analyse + skriving, arkitektur + implementering +
gjennomgang, eller enhver oppgave der forskjellige perspektiver trenger å iterere
på hverandres arbeid.

::: info Tilgjengelighet
Agentteam krever **Power**-planen ($149/måned) når Triggerfish Gateway brukes.
Åpen kildekode-brukere som kjører egne API-nøkler har full tilgang til agentteam
— hvert teammedlem forbruker inferens fra den konfigurerte leverandøren din.
:::

## Verktøy

### `team_create`

Opprett et vedvarende team av agenter som samarbeider om en oppgave. Definer
memberroller, verktøy og modeller. Nøyaktig ett member må være leder.

| Parameter                | Type   | Påkrevd | Beskrivelse                                                            |
| ------------------------ | ------ | ------- | ---------------------------------------------------------------------- |
| `name`                   | string | Ja      | Menneskelig-lesbart teamnavn                                           |
| `task`                   | string | Ja      | Teamets mål (sendes til lederen som opprinnelige instruksjoner)        |
| `members`                | array  | Ja      | Teammedlemsdefinisjoner (se nedenfor)                                  |
| `idle_timeout_seconds`   | number | Nei     | Per-member inaktivitetslimitt. Standard: 300 (5 minutter)              |
| `max_lifetime_seconds`   | number | Nei     | Maksimal teamlevetid. Standard: 3600 (1 time)                          |
| `classification_ceiling` | string | Nei     | Team-bredt klassifiseringstak (f.eks. `CONFIDENTIAL`)                  |

**Memberdefinsjon:**

| Felt                     | Type    | Påkrevd | Beskrivelse                                              |
| ------------------------ | ------- | ------- | -------------------------------------------------------- |
| `role`                   | string  | Ja      | Unik rolleidentifikator (f.eks. `researcher`, `reviewer`)|
| `description`            | string  | Ja      | Hva dette memberet gjør (injiseres i system-prompt)      |
| `is_lead`                | boolean | Ja      | Om dette memberet er teamleder                           |
| `model`                  | string  | Nei     | Modeloverstyring for dette memberet                      |
| `classification_ceiling` | string  | Nei     | Per-member klassifiseringstak                            |
| `initial_task`           | string  | Nei     | Opprinnelige instruksjoner (leder får teamoppgaven)      |

**Valideringsregler:**

- Teamet må ha nøyaktig ett member med `is_lead: true`
- Alle roller må være unike og ikke-tomme
- Member-klassifiseringstak kan ikke overstige teamtaket
- `name` og `task` må ikke være tomme

### `team_status`

Sjekk den gjeldende tilstanden til et aktivt team.

| Parameter | Type   | Påkrevd | Beskrivelse  |
| --------- | ------ | ------- | ------------ |
| `team_id` | string | Ja      | Team-ID      |

Returnerer teamets status, aggregert taint-nivå og per-member-detaljer inkludert
hvert members nåværende taint, status og siste aktivitetstidsstempel.

### `team_message`

Send en melding til et spesifikt teammedlem. Nyttig for å gi ytterligere
kontekst, omdirigere arbeid eller be om fremdriftsoppdateringer.

| Parameter | Type   | Påkrevd | Beskrivelse                                     |
| --------- | ------ | ------- | ----------------------------------------------- |
| `team_id` | string | Ja      | Team-ID                                         |
| `role`    | string | Nei     | Målmedlemsrolle (standard: leder)               |
| `message` | string | Ja      | Meldingsinnhold                                 |

Teamet må ha `running`-status og målmedlemmet må være `active` eller `idle`.

### `team_disband`

Slå ned et team og avslutt alle membersesjoner.

| Parameter | Type   | Påkrevd | Beskrivelse                       |
| --------- | ------ | ------- | --------------------------------- |
| `team_id` | string | Ja      | Team-ID                           |
| `reason`  | string | Nei     | Hvorfor teamet oppløses           |

Bare sesjonen som opprettet teamet eller ledermedlemmet kan oppløse teamet.

## Slik fungerer team

### Opprettelse

Når agenten kaller `team_create`, gjør Triggerfish følgende:

1. Validerer teamdefinisjonen (roller, lederantall, klassifiseringstak)
2. Spawner en isolert agentsesjon for hvert member via orchestrator-fabrikken
3. Injiserer en **teamliste-prompt** i hvert members system-prompt, som
   beskriver deres rolle, lagkamerater og samarbeidsinstruksjoner
4. Sender den opprinnelige oppgaven til lederen (eller egendefinert `initial_task`
   per member)
5. Starter en livssyklusmonitor som sjekker teamhelse hvert 30. sekund

Hvert membersesjon er fullstendig isolert med sin egen samtalekontekst,
taint-sporing og verktøytilgang.

### Samarbeid

Teammedlemmer kommuniserer med hverandre ved hjelp av `sessions_send`.
Den opprettende agenten trenger ikke å videreformidle meldinger mellom
membere. Den typiske flyten:

1. Lederen mottar teamets mål
2. Lederen dekomponerer oppgaven og sender oppdrag til membere via `sessions_send`
3. Membere arbeider autonomt, kaller verktøy og itererer
4. Membere sender resultater tilbake til lederen (eller direkte til en annen member)
5. Lederen syntetiserer resultater og bestemmer når arbeidet er ferdig
6. Lederen kaller `team_disband` for å slå ned teamet

Meldinger mellom teammedlemmer leveres direkte via orchestratoren — hver melding
utløser et fullt agentskift i mottakerens sesjon.

### Status

Bruk `team_status` for å sjekke fremdrift når som helst. Svaret inkluderer:

- **Teamstatus:** `running`, `paused`, `completed`, `disbanded` eller `timed_out`
- **Aggregert taint:** Det høyeste klassifiseringsnivået på tvers av alle membere
- **Per-member-detaljer:** Rolle, status (`active`, `idle`, `completed`, `failed`),
  nåværende taint-nivå og siste aktivitetstidsstempel

### Oppløsning

Team kan oppløses av:

- Den opprettende sesjonen som kaller `team_disband`
- Ledermedlemmet som kaller `team_disband`
- Livssyklusmonitoren som automatisk oppløser etter at levetidsgrensen er nådd
- Livssyklusmonitoren som oppdager at alle membere er inaktive

Når et team oppløses, avsluttes alle aktive membersesjoner og ressurser ryddes opp.

## Teamroller

### Leder

Ledermedlemmet koordinerer teamet. Når opprettet:

- Mottar teamets `task` som sine opprinnelige instruksjoner (med mindre overstyrt
  av `initial_task`)
- Får system-prompt-instruksjoner for å dekomponere arbeid, tildele oppgaver og
  bestemme når målet er nådd
- Er autorisert til å oppløse teamet

Det er nøyaktig én leder per team.

### Membere

Ikke-ledende membere er spesialister. Når opprettet:

- Mottar sin `initial_task` hvis angitt, ellers venter de til lederen sender dem arbeid
- Får system-prompt-instruksjoner for å sende fullført arbeid til lederen eller
  neste passende lagkamerat
- Kan ikke oppløse teamet

## Livssyklusovervåking

Team har automatisk livssyklusovervåking som kjøres hvert 30. sekund.

### Inaktivitetslimitt

Hvert member har en inaktivitetslimitt (standard: 5 minutter). Når et member
er inaktivt:

1. **Første terskel (idle_timeout_seconds):** Memberet mottar en påminnelsesmelding
   som ber dem om å sende resultater hvis arbeidet er ferdig
2. **Dobbel terskel (2x idle_timeout_seconds):** Memberet avsluttes og lederen
   varsles

### Levetidslimitt

Team har en maksimal levetid (standard: 1 time). Når grensen er nådd:

1. Lederen mottar en advarselsmelding med 60 sekunder til å produsere endelig utdata
2. Etter avdragsperioden oppløses teamet automatisk

### Helsesjekker

Monitoren sjekker sesjonshelse hvert 30. sekund:

- **Lederfeil:** Hvis ledersesjonen ikke lenger er nåbar, settes teamet på pause
  og den opprettende sesjonen varsles
- **Memberfeil:** Hvis en membersesjon er borte, merkes den som `failed` og
  lederen varsles om å fortsette med gjenværende membere
- **Alle inaktive:** Hvis alle membere er `completed` eller `failed`, varsles
  den opprettende sesjonen om enten å injisere nye instruksjoner eller oppløse

## Klassifisering og Taint

Teammedlemssesjoner følger de samme klassifiseringsreglene som alle andre sesjoner:

- Hvert member starter på `PUBLIC` taint og eskalerer etter hvert som det
  aksesserer klassifisert data
- **Klassifiseringstak** kan settes per-team eller per-member for å begrense
  hvilke data membere kan aksessere
- **No-write-down-håndhevelse** gjelder all inter-member-kommunikasjon. Et
  member taintet som `CONFIDENTIAL` kan ikke sende data til et member på `PUBLIC`
- Den **aggregerte tainte** (høyeste taint på tvers av alle membere) rapporteres
  i `team_status` slik at den opprettende sesjonen kan spore teamets overordnede
  klassifiseringseksponering

::: danger SIKKERHET Member-klassifiseringstak kan ikke overstige teamtaket.
Hvis teamtaket er `INTERNAL`, kan ingen member konfigureres med et `CONFIDENTIAL`-tak.
Dette valideres ved opprettingstidspunktet. :::

## Team vs. sub-agenter

| Aspekt           | Sub-agent (`subagent`)                    | Team (`team_create`)                                     |
| ---------------- | ----------------------------------------- | -------------------------------------------------------- |
| **Levetid**      | Enkeltoppgave, returnerer resultat og avslutter | Vedvarende inntil oppløst eller tidsavbrutt         |
| **Membere**      | Én agent                                  | Flere agenter med distinkte roller                       |
| **Interaksjon**  | Brann-og-glem fra forelder                | Membere kommuniserer fritt via `sessions_send`           |
| **Koordinering** | Forelder venter på resultat               | Leder koordinerer, forelder kan sjekke inn via `team_status`|
| **Brukstilfelle**| Fokusert enkelttrinnsdelegering           | Kompleks flerrollesamarbeid                              |

**Bruk sub-agenter** når du trenger at én agent gjør en fokusert oppgave og
returnerer et resultat. **Bruk team** når oppgaven drar nytte av flere
spesialiserte perspektiver som itererer på hverandres arbeid.

::: tip Team er autonome når de er opprettet. Den opprettende agenten kan sjekke
status og sende meldinger, men trenger ikke å mikroadministrere. Lederen håndterer
koordineringen. :::
