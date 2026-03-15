# Sub-agenter og LLM-oppgaver

Triggerfish-agenter kan delegere arbeid til sub-agenter og kjøre isolerte
LLM-prompter. Dette muliggjør parallelt arbeid, fokusert resonnering og
flertrinnsdekomponing av oppgaver.

## Verktøy

### `subagent`

Spawn en sub-agent for en autonom flertrinnsoppgave. Sub-agenten får sin egen
samtalekontekst og kan bruke verktøy uavhengig. Returnerer det endelige
resultatet når den er ferdig.

| Parameter | Type   | Påkrevd | Beskrivelse                                                           |
| --------- | ------ | ------- | --------------------------------------------------------------------- |
| `task`    | string | Ja      | Hva sub-agenten skal oppnå                                            |
| `tools`   | string | Nei     | Komma-separert verktøy-hviteliste (standard: skrivebeskyttede verktøy)|

**Standardverktøy:** Sub-agenter starter med skrivebeskyttede verktøy
(`read_file`, `list_directory`, `search_files`, `run_command`). Angi
ytterligere verktøy eksplisitt hvis sub-agenten trenger skrivetilgang.

**Eksempelbruk:**

- Forsk på et emne mens hovedagenten fortsetter annet arbeid
- Utforsk en kodebase parallelt fra flere vinkler (dette er hva `explore`-verktøyet
  gjør internt)
- Deleger en selvstendig implementeringsoppgave

### `llm_task`

Kjør en engangs LLM-prompt for isolert resonnering. Prompten kjøres i en
separat kontekst og forurenser ikke den primære samtalehistorikken.

| Parameter | Type   | Påkrevd | Beskrivelse                                     |
| --------- | ------ | ------- | ----------------------------------------------- |
| `prompt`  | string | Ja      | Prompten som skal sendes                        |
| `system`  | string | Nei     | Valgfri system-prompt                           |
| `model`   | string | Nei     | Valgfri modell/leverandørnavnoverstyring        |

**Eksempelbruk:**

- Oppsummer et langt dokument uten å fylle den primære konteksten
- Klassifiser eller ekstraher data fra strukturert tekst
- Få en annen mening om en tilnærming
- Kjør en prompt mot en annen modell enn den primære

### `agents_list`

List konfigurerte LLM-leverandører og agenter. Tar ingen parametere.

Returnerer informasjon om tilgjengelige leverandører, deres modeller og
konfigurasjonsstatus.

## Slik fungerer sub-agenter

Når agenten kaller `subagent`, gjør Triggerfish følgende:

1. Oppretter en ny orchestrator-instans med sin egen samtalekontekst
2. Gir sub-agenten de angitte verktøyene (standard: skrivebeskyttede)
3. Sender oppgaven som den første brukermeldingen
4. Sub-agenten kjøres autonomt — kaller verktøy, behandler resultater, itererer
5. Når sub-agenten produserer et endelig svar, returneres det til foreldreagenten

Sub-agenter arver foreldresesjonens taint-nivå og klassifiseringsbegrensninger.
De kan ikke eskalere utover forelderens tak.

## Når man bruker hvert verktøy

| Verktøy    | Bruk når                                                  |
| ---------- | --------------------------------------------------------- |
| `subagent` | Flertrinnsoppgave som krever verktøybruk og iterasjon     |
| `llm_task` | Engangsresonnering, oppsummering eller klassifisering     |
| `explore`  | Kodebaseforståelse (bruker sub-agenter internt)           |

::: tip `explore`-verktøyet er bygget på `subagent` — det spawner 2–6 parallelle
sub-agenter avhengig av dybdenivå. Hvis du trenger strukturert kodebaseutforskning,
bruk `explore` direkte i stedet for å manuelt spawne sub-agenter. :::

## Sub-agenter vs. agentteam

Sub-agenter er brann-og-glem: foreldreagenten venter på ett enkelt resultat.
[Agentteam](./agent-teams) er vedvarende grupper av samarbeidende agenter med
distinkte roller, en ledende koordinator og kommunikasjon mellom medlemmer.
Bruk sub-agenter for fokusert enkelttrinnsdelegering. Bruk team når oppgaven
drar nytte av flere spesialiserte perspektiver som itererer på hverandres arbeid.
