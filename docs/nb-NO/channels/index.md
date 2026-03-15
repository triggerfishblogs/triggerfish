# Flerkanal-oversikt

Triggerfish kobles til dine eksisterende meldingsplattformer. Du snakker med agenten din uansett hvor du allerede kommuniserer — terminal, Telegram, Slack, Discord, WhatsApp, en nettwidget eller e-post. Hver kanal har sitt eget klassifiseringsnivå, eieridentitetssjekker og policy-håndhevelse.

## Hvordan kanaler fungerer

Hver kanaladapter implementerer det samme grensesnittet: `connect`, `disconnect`, `send`, `onMessage` og `status`. **Kanalrouteren** sitter over alle adaptere og håndterer meldingssending, klassifiseringssjekker og gjenprøvingslogikk.

<img src="/diagrams/channel-router.svg" alt="Kanalrouter: alle kanaladaptere flyter gjennom en sentral klassifiseringsport til Gateway-serveren" style="max-width: 100%;" />

Når en melding ankommer på en kanal, gjør routeren:

1. Identifiserer avsenderen (eier eller ekstern) ved hjelp av **kodenivå identitetssjekker** — ikke LLM-tolkning
2. Merker meldingen med kanalens klassifiseringsnivå
3. Videresender den til policy-motoren for håndhevelse
4. Ruter agentens svar tilbake gjennom samme kanal

## Kanalklassifisering

Hver kanal har et standard klassifiseringsnivå som bestemmer hvilke data som kan flyte gjennom den. Policy-motoren håndhever **no-write-down-regelen**: data på et gitt klassifiseringsnivå kan aldri flyte til en kanal med lavere klassifisering.

| Kanal                              | Standard klassifisering | Eiererdeteksjon                        |
| ---------------------------------- | :---------------------: | -------------------------------------- |
| [CLI](/nb-NO/channels/cli)         |       `INTERNAL`        | Alltid eier (terminalbruker)           |
| [Telegram](/nb-NO/channels/telegram) |       `INTERNAL`      | Telegram bruker-ID-samsvar             |
| [Signal](/nb-NO/channels/signal)   |        `PUBLIC`         | Aldri eier (adapter ER din telefon)    |
| [Slack](/nb-NO/channels/slack)     |        `PUBLIC`         | Slack bruker-ID via OAuth              |
| [Discord](/nb-NO/channels/discord) |        `PUBLIC`         | Discord bruker-ID-samsvar              |
| [WhatsApp](/nb-NO/channels/whatsapp) |       `PUBLIC`        | Telefonnummersamsvar                   |
| [WebChat](/nb-NO/channels/webchat) |        `PUBLIC`         | Aldri eier (besøkende)                 |
| [E-post](/nb-NO/channels/email)    |     `CONFIDENTIAL`      | E-postadressesamsvar                   |

::: tip Fullt konfigurerbar Alle klassifiseringer er konfigurerbare i din `triggerfish.yaml`. Du kan sette en kanal til et hvilket som helst klassifiseringsnivå basert på dine sikkerhetskrav.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Effektiv klassifisering

Den effektive klassifiseringen for en melding er **minimum** av kanalklassifiseringen og mottakerklassifiseringen:

| Kanalnivå    | Mottakernivå | Effektivt nivå |
| ------------ | ------------ | -------------- |
| INTERNAL     | INTERNAL     | INTERNAL       |
| INTERNAL     | EXTERNAL     | PUBLIC         |
| CONFIDENTIAL | INTERNAL     | INTERNAL       |
| CONFIDENTIAL | EXTERNAL     | PUBLIC         |

Dette betyr at selv om en kanal er klassifisert som `CONFIDENTIAL`, behandles meldinger til eksterne mottakere på den kanalen som `PUBLIC`.

## Kanaltilstander

Kanaler beveger seg gjennom definerte tilstander:

- **UNTRUSTED** — Nye eller ukjente kanaler starter her. Ingen data flyter inn eller ut. Kanalen er fullstendig isolert til du klassifiserer den.
- **CLASSIFIED** — Kanalen har et tildelt klassifiseringsnivå og er aktiv. Meldinger flyter i henhold til policy-regler.
- **BLOCKED** — Kanalen er eksplisitt deaktivert. Ingen meldinger behandles.

::: warning UNTRUSTED-kanaler En `UNTRUSTED`-kanal kan ikke motta noen data fra agenten og kan ikke sende data inn i agentens kontekst. Dette er en hard sikkerhetsgrense, ikke en anbefaling. :::

## Kanalrouteren

Kanalrouteren administrerer alle registrerte adaptere og tilbyr:

- **Adapterregistrering** — Registrer og avregistrer kanaladaptere etter kanal-ID
- **Meldingssending** — Rut utgående meldinger til riktig adapter
- **Gjenprøving med eksponensiell tilbakekobling** — Mislykkede sendinger gjenprøves opptil 3 ganger med økende forsinkelser (1s, 2s, 4s)
- **Bulkoperasjoner** — `connectAll()` og `disconnectAll()` for livssyklusadministrasjon

```yaml
# Routerens gjenprøvingsatferd er konfigurerbar
router:
  maxRetries: 3
  baseDelay: 1000 # millisekunder
```

## Ripple: Skriving og tilstedeværelse

Triggerfish videresender skriveindikatorer og tilstedeværelsestilstand på tvers av kanaler som støtter dem. Dette kalles **Ripple**.

| Kanal    | Skriveindikatorer | Lesebekreftelser |
| -------- | :---------------: | :--------------: |
| Telegram | Send og motta     |      Ja          |
| Signal   | Send og motta     |      --          |
| Slack    | Send bare         |      --          |
| Discord  | Send bare         |      --          |
| WhatsApp | Send og motta     |      Ja          |
| WebChat  | Send og motta     |      Ja          |

Agenttilstedeværelsestilstander: `idle`, `online`, `away`, `busy`, `processing`, `speaking`, `error`.

## Meldingsdeling

Plattformer har meldingslengdegrenser. Triggerfish deler automatisk lange svar for å passe innenfor hver plattforms begrensninger, og deler ved linjeskift eller mellomrom for lesbarhet:

| Kanal    | Maks meldingslengde |
| -------- | :-----------------: |
| Telegram |   4 096 tegn        |
| Signal   |   4 000 tegn        |
| Discord  |   2 000 tegn        |
| Slack    |  40 000 tegn        |
| WhatsApp |   4 096 tegn        |
| WebChat  |    Ubegrenset       |

## Neste steg

Konfigurer kanalene du bruker:

- [CLI](/nb-NO/channels/cli) — Alltid tilgjengelig, ingen oppsett nødvendig
- [Telegram](/nb-NO/channels/telegram) — Opprett en bot via @BotFather
- [Signal](/nb-NO/channels/signal) — Koble til via signal-cli-daemon
- [Slack](/nb-NO/channels/slack) — Opprett en Slack-app med Socket Mode
- [Discord](/nb-NO/channels/discord) — Opprett en Discord bot-applikasjon
- [WhatsApp](/nb-NO/channels/whatsapp) — Koble til via WhatsApp Business Cloud API
- [WebChat](/nb-NO/channels/webchat) — Integrer en chat-widget på nettstedet ditt
- [E-post](/nb-NO/channels/email) — Koble til via IMAP og SMTP-relé
