---
layout: home

hero:
  name: Triggerfish
  text: Veilige AI-agenten
  tagline: Deterministische beleidshandhaving onder de LLM-laag. Elk kanaal. Geen uitzonderingen.
  image:
    src: /triggerfish.png
    alt: Triggerfish — onderweg in de digitale zee
  actions:
    - theme: brand
      text: Aan de slag
      link: /nl-NL/guide/
    - theme: alt
      text: Prijzen
      link: /nl-NL/pricing
    - theme: alt
      text: Bekijk op GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Beveiliging onder de LLM
    details: Deterministische beleidshandhaving onder het LLM. Pure code-hooks die de AI niet kan omzeilen, overschrijven of beïnvloeden. Dezelfde invoer levert altijd dezelfde beslissing op.
  - icon: "\U0001F4AC"
    title: Elk kanaal dat u gebruikt
    details: Telegram, Slack, Discord, WhatsApp, e-mail, WebChat, CLI — allemaal met kanaalspecifieke classificatie en automatische taint-tracking.
  - icon: "\U0001F528"
    title: Bouw alles
    details: Agent-uitvoeringsomgeving met een schrijven/uitvoeren/repareren-feedbacklus. Zelf-schrijvende skills. De Reef-marktplaats voor het ontdekken en delen van mogelijkheden.
  - icon: "\U0001F916"
    title: Elke LLM-aanbieder
    details: Anthropic, OpenAI, Google Gemini, lokale modellen via Ollama, OpenRouter. Automatische failover-ketens. Of kies voor Triggerfish Gateway — geen API-sleutels vereist.
  - icon: "\U0001F3AF"
    title: Standaard proactief
    details: Cron-jobs, triggers en webhooks. Uw agent controleert, bewaakt en handelt autonoom — binnen strikte beleidsgrenzen.
  - icon: "\U0001F310"
    title: Open source
    details: Gelicenseerd onder Apache 2.0. Beveiligingskritieke componenten volledig open voor controle. Vertrouw ons niet — controleer de code zelf.
---

<LatestRelease />

## Installeren met één opdracht

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

De binaire installatieprogramma's downloaden een vooraf gebouwde release, verifiëren de controlesom en starten de installatiewizard. Zie de [installatiegids](/nl-NL/guide/installation) voor Docker-instelling, bouwen vanuit broncode en het releaseproces.

Wilt u geen API-sleutels beheren? [Bekijk de prijzen](/nl-NL/pricing) voor Triggerfish Gateway — beheerde LLM- en zoekinfrastructuur, binnen enkele minuten klaar.

## Hoe het werkt

Triggerfish plaatst een deterministische beleidslaag tussen uw AI-agent en alles waarmee die in aanraking komt. Het LLM stelt acties voor — pure code-hooks beslissen of deze zijn toegestaan.

- **Deterministisch beleid** — Beveiligingsbeslissingen zijn pure code. Geen toeval, geen LLM-invloed, geen uitzonderingen. Dezelfde invoer, dezelfde beslissing, elke keer.
- **Informatiestroombeheer** — Vier classificatieniveaus (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED) propageren automatisch via session taint. Gegevens kunnen nooit naar een minder beveiligde context stromen.
- **Zes handhavingshooks** — Elke fase van de datapijplijn wordt bewaakt: wat de LLM-context binnenkomt, welke tools worden aangeroepen, welke resultaten terugkomen en wat het systeem verlaat. Elke beslissing wordt vastgelegd in het auditlog.
- **Standaard weigeren** — Niets wordt stilzwijgend toegestaan. Niet-geclassificeerde tools, integraties en gegevensbronnen worden geweigerd totdat ze expliciet zijn geconfigureerd.
- **Agent-identiteit** — De missie van uw agent staat in SPINE.md, proactief gedrag in TRIGGER.md. Skills breiden mogelijkheden uit via eenvoudige mapconventies. De Reef-marktplaats laat u deze ontdekken en delen.

[Lees meer over de architectuur.](/nl-NL/architecture/)
