# Telegram

Koble Triggerfish-agenten din til Telegram slik at du kan samhandle med den fra enhver enhet der du bruker Telegram. Adapteren bruker [grammY](https://grammy.dev/)-rammeverket til å kommunisere med Telegram Bot API.

## Oppsett

### Trinn 1: Opprett en bot

1. Åpne Telegram og søk etter [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Velg et visningsnavn for boten din (f.eks. «Min Triggerfish»)
4. Velg et brukernavn for boten din (må slutte på `bot`, f.eks. `min_triggerfish_bot`)
5. BotFather svarer med din **bot-token** — kopier den

::: warning Hold tokenet ditt hemmelig Bot-tokenet ditt gir full kontroll over boten din. Commit det aldri til kildekontroll eller del det offentlig. Triggerfish lagrer det i OS-nøkkelringen din. :::

### Trinn 2: Finn din Telegram bruker-ID

Triggerfish trenger din numeriske bruker-ID for å verifisere at meldinger er fra deg. Telegram-brukernavn kan endres og er ikke pålitelige for identitet — den numeriske ID-en er permanent og tildelt av Telegrams servere, slik at den ikke kan forfalskes.

1. Søk etter [@getmyid_bot](https://t.me/getmyid_bot) på Telegram
2. Send den en melding
3. Den svarer med bruker-ID-en din (et tall som `8019881968`)

### Trinn 3: Legg til kanalen

Kjør det interaktive oppsettet:

```bash
triggerfish config add-channel telegram
```

Dette ber om bot-token, bruker-ID og klassifiseringsnivå, deretter skriver det konfigurasjonen til `triggerfish.yaml` og tilbyr å starte daemonen på nytt.

Du kan også legge det til manuelt:

```yaml
channels:
  telegram:
    # botToken lagret i OS-nøkkelringen
    ownerId: 8019881968
    classification: INTERNAL
```

| Alternativ       | Type   | Påkrevd | Beskrivelse                                    |
| ---------------- | ------ | ------- | ---------------------------------------------- |
| `botToken`       | string | Ja      | Bot API-token fra @BotFather                   |
| `ownerId`        | number | Ja      | Din numeriske Telegram bruker-ID               |
| `classification` | string | Nei     | Klassifiseringstak (standard: `INTERNAL`)      |

### Trinn 4: Begynn å chatte

Etter at daemonen starter på nytt, åpne boten din i Telegram og send `/start`. Boten vil hilse deg velkommen for å bekrefte at tilkoblingen er aktiv. Du kan deretter chatte med agenten din direkte.

## Klassifiseringsatferd

`classification`-innstillingen er et **tak** — den kontrollerer maksimal sensitivitet for data som kan flyte gjennom denne kanalen for **eier**-samtaler. Den gjelder ikke ensartet for alle brukere.

**Slik fungerer det per melding:**

- **Du sender melding til boten** (din bruker-ID samsvarer med `ownerId`): Sesjonen bruker kanalens tak. Med standard `INTERNAL` kan agenten din dele interne data med deg.
- **Noen andre sender melding til boten**: Sesjonen tainttes automatisk `PUBLIC` uavhengig av kanalklassifiseringen. No-write-down-regelen forhindrer interne data fra å nå sesjonen deres.

Dette betyr at en enkelt Telegram-bot trygt håndterer både eier- og ikke-eier-samtaler. Identitetssjekken skjer i kode før LLM-en ser meldingen — LLM-en kan ikke påvirke den.

| Kanalklassifisering    | Eiersmeldinger      | Ikke-eier-meldinger |
| ---------------------- | :-----------------: | :-----------------: |
| `PUBLIC`               |       PUBLIC        |       PUBLIC        |
| `INTERNAL` (standard)  |   Opptil INTERNAL   |       PUBLIC        |
| `CONFIDENTIAL`         | Opptil CONFIDENTIAL |       PUBLIC        |
| `RESTRICTED`           | Opptil RESTRICTED   |       PUBLIC        |

Se [Klassifiseringssystem](/nb-NO/architecture/classification) for den fullstendige modellen og [Sesjoner og taint](/nb-NO/architecture/taint-and-sessions) for hvordan taint-eskalering fungerer.

## Eieridentitet

Triggerfish bestemmer eierstatus ved å sammenligne avsenderens numeriske Telegram bruker-ID mot den konfigurerte `ownerId`. Denne sjekken skjer i kode **før** LLM-en ser meldingen:

- **Samsvar** — Meldingen er merket som eier og kan aksessere data opptil kanalens klassifiseringstak
- **Ingen samsvar** — Meldingen er merket med `PUBLIC`-taint, og no-write-down-regelen forhindrer klassifiserte data fra å flyte til den sesjonen

::: danger Angi alltid eier-ID Uten `ownerId` behandler Triggerfish **alle** avsendere som eieren. Alle som finner boten din kan aksessere dataene dine opptil kanalens klassifiseringsnivå. Dette feltet er obligatorisk under oppsett av denne grunn. :::

## Meldingsdeling

Telegram har en 4 096-tegns meldingsgrense. Når agenten din genererer et svar som er lengre enn dette, deler Triggerfish det automatisk i flere meldinger. Deleren deler ved linjeskift eller mellomrom for lesbarhet — den unngår å kutte ord eller setninger på midten.

## Støttede meldingstyper

Telegram-adapteren håndterer for øyeblikket:

- **Tekstmeldinger** — Full send- og mottastøtte
- **Lange svar** — Automatisk delt for å passe Telegrams grenser

## Skriveindikatorer

Når agenten din behandler en forespørsel, viser boten «skriver...» i Telegram-chatten. Indikatoren kjøres mens LLM-en genererer et svar og tømmes når svaret er sendt.

## Endre klassifisering

Slik hever eller senker du klassifiseringstake:

```bash
triggerfish config add-channel telegram
# Velg å overskrive eksisterende konfigurasjon når du blir bedt om det
```

Eller rediger `triggerfish.yaml` direkte:

```yaml
channels:
  telegram:
    # botToken lagret i OS-nøkkelringen
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Gyldige nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Start daemonen på nytt etter endring: `triggerfish stop && triggerfish start`
