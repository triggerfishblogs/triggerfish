# Multi-kanaaloverzicht

Triggerfish verbindt met uw bestaande berichtenplatforms. U communiceert met uw agent waar u al communiceert — terminal, Telegram, Slack, Discord, WhatsApp, een webwidget of e-mail. Elk kanaal heeft zijn eigen classificatieniveau, eigenaaridentiteitscontroles en beleidshandhaving.

## Hoe kanalen werken

Elke kanaaladapter implementeert dezelfde interface: `connect`, `disconnect`, `send`, `onMessage` en `status`. De **kanaalkoppeling** bevindt zich boven alle adapters en verwerkt berichtenverzending, classificatiecontroles en logica voor opnieuw proberen.

<img src="/diagrams/channel-router.svg" alt="Kanaalkoppeling: alle kanaaladapters stromen via een centrale classificatiepoort naar de Gateway Server" style="max-width: 100%;" />

Wanneer een bericht op een kanaal aankomt, doet de koppeling het volgende:

1. Identificeert de afzender (eigenaar of extern) met **identiteitscontroles op codeniveau** — niet via LLM-interpretatie
2. Labelt het bericht met het classificatieniveau van het kanaal
3. Stuurt het door naar de beleidsengine voor handhaving
4. Routeert het antwoord van de agent terug via hetzelfde kanaal

## Kanaalclassificatie

Elk kanaal heeft een standaardclassificatieniveau dat bepaalt welke gegevens er doorheen kunnen stromen. De beleidsengine handhaaft de **no-write-down-regel**: gegevens op een bepaald classificatieniveau kunnen nooit stromen naar een kanaal met een lager classificatieniveau.

| Kanaal                              | Standaardclassificatie | Eigenaarsdetectie                       |
| ----------------------------------- | :--------------------: | --------------------------------------- |
| [CLI](/nl-NL/channels/cli)           |       `INTERNAL`       | Altijd eigenaar (terminalgebruiker)     |
| [Telegram](/nl-NL/channels/telegram) |       `INTERNAL`       | Overeenkomst Telegram-gebruikers-ID     |
| [Signal](/nl-NL/channels/signal)     |        `PUBLIC`        | Nooit eigenaar (adapter IS uw telefoon) |
| [Slack](/nl-NL/channels/slack)       |        `PUBLIC`        | Slack-gebruikers-ID via OAuth           |
| [Discord](/nl-NL/channels/discord)   |        `PUBLIC`        | Overeenkomst Discord-gebruikers-ID      |
| [WhatsApp](/nl-NL/channels/whatsapp) |        `PUBLIC`        | Overeenkomst telefoonnummer             |
| [WebChat](/nl-NL/channels/webchat)   |        `PUBLIC`        | Nooit eigenaar (bezoekers)              |
| [E-mail](/nl-NL/channels/email)      |     `CONFIDENTIAL`     | Overeenkomst e-mailadres                |

::: tip Volledig configureerbaar Alle classificaties zijn configureerbaar in uw `triggerfish.yaml`. U kunt elk kanaal op elk classificatieniveau instellen op basis van uw beveiligingsvereisten.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Effectieve classificatie

De effectieve classificatie voor elk bericht is het **minimum** van de kanaalclassificatie en de ontvangerclassificatie:

| Kanaalniveau  | Ontvangerniveau | Effectief niveau |
| ------------- | --------------- | ---------------- |
| INTERNAL      | INTERNAL        | INTERNAL         |
| INTERNAL      | EXTERNAL        | PUBLIC           |
| CONFIDENTIAL  | INTERNAL        | INTERNAL         |
| CONFIDENTIAL  | EXTERNAL        | PUBLIC           |

Dit betekent dat zelfs als een kanaal als `CONFIDENTIAL` is geclassificeerd, berichten aan externe ontvangers op dat kanaal als `PUBLIC` worden behandeld.

## Kanaalstatussen

Kanalen doorlopen gedefinieerde statussen:

- **UNTRUSTED** — Nieuwe of onbekende kanalen starten hier. Er stromen geen gegevens in of uit. Het kanaal is volledig geïsoleerd totdat u het classificeert.
- **CLASSIFIED** — Het kanaal heeft een toegewezen classificatieniveau en is actief. Berichten stromen volgens beleidsregels.
- **BLOCKED** — Het kanaal is expliciet uitgeschakeld. Er worden geen berichten verwerkt.

::: warning UNTRUSTED-kanalen Een `UNTRUSTED`-kanaal kan geen gegevens ontvangen van de agent en kan geen gegevens sturen naar de context van de agent. Dit is een harde beveiligingsgrens, geen suggestie. :::

## Kanaalkoppeling

De kanaalkoppeling beheert alle geregistreerde adapters en biedt:

- **Adapterregistratie** — Registreer en verwijder kanaaladapters per kanaal-ID
- **Berichtenverzending** — Routeer uitgaande berichten naar de juiste adapter
- **Opnieuw proberen met exponentiële backoff** — Mislukte verzendingen worden tot 3 keer opnieuw geprobeerd met toenemende vertragingen (1s, 2s, 4s)
- **Bulkbewerkingen** — `connectAll()` en `disconnectAll()` voor levenscyclusbeheer

```yaml
# Koppelingsgedrag voor opnieuw proberen is configureerbaar
router:
  maxRetries: 3
  baseDelay: 1000 # milliseconden
```

## Ripple: typen en aanwezigheid

Triggerfish geeft typaanduidingen en aanwezigheidsstatus door tussen kanalen die deze ondersteunen. Dit heet **Ripple**.

| Kanaal   | Typaanduidingen     | Leesbevestigingen |
| -------- | :-----------------: | :---------------: |
| Telegram | Verzenden en ontvangen | Ja             |
| Signal   | Verzenden en ontvangen | --             |
| Slack    | Alleen verzenden    | --                |
| Discord  | Alleen verzenden    | --                |
| WhatsApp | Verzenden en ontvangen | Ja             |
| WebChat  | Verzenden en ontvangen | Ja             |

Agentaanwezigheidsstatussen: `idle`, `online`, `away`, `busy`, `processing`, `speaking`, `error`.

## Berichtopsplitsing

Platforms hebben berichtlengtebeperkingen. Triggerfish splitst lange antwoorden automatisch op om binnen de limieten van elk platform te passen, opgesplitst op regeleinden of spaties voor leesbaarheid:

| Kanaal   | Maximale berichtlengte |
| -------- | :--------------------: |
| Telegram |  4.096 tekens          |
| Signal   |  4.000 tekens          |
| Discord  |  2.000 tekens          |
| Slack    | 40.000 tekens          |
| WhatsApp |  4.096 tekens          |
| WebChat  |  Onbeperkt             |

## Volgende stappen

Stel de kanalen in die u gebruikt:

- [CLI](/nl-NL/channels/cli) — Altijd beschikbaar, geen installatie vereist
- [Telegram](/nl-NL/channels/telegram) — Maak een bot via @BotFather
- [Signal](/nl-NL/channels/signal) — Koppel via signal-cli daemon
- [Slack](/nl-NL/channels/slack) — Maak een Slack-app met Socket Mode
- [Discord](/nl-NL/channels/discord) — Maak een Discord-bottoepassing
- [WhatsApp](/nl-NL/channels/whatsapp) — Verbind via WhatsApp Business Cloud API
- [WebChat](/nl-NL/channels/webchat) — Sluit een chatwidget in op uw site
- [E-mail](/nl-NL/channels/email) — Verbind via IMAP en SMTP-relay
