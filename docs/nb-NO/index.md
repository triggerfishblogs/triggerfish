---
layout: home

hero:
  name: Triggerfish
  text: Sikre AI-agenter
  tagline: Deterministisk policy-håndhevelse under LLM-laget. Hver kanal. Uten unntak.
  image:
    src: /triggerfish.png
    alt: Triggerfish — på vandring i det digitale havet
  actions:
    - theme: brand
      text: Kom i gang
      link: /nb-NO/guide/
    - theme: alt
      text: Priser
      link: /nb-NO/pricing
    - theme: alt
      text: Se på GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Sikkerhet under LLM
    details: Deterministisk, sub-LLM policy-håndhevelse. Rene kode-hooks som KI-en ikke kan omgå, overstyre eller påvirke. Samme inndata gir alltid samme beslutning.
  - icon: "\U0001F4AC"
    title: Alle kanaler du bruker
    details: Telegram, Slack, Discord, WhatsApp, e-post, WebChat, CLI — alle med per-kanal klassifisering og automatisk taint-sporing.
  - icon: "\U0001F528"
    title: Bygg hva som helst
    details: Agent-utførelsesmiljø med en skriv/kjør/fiks-tilbakemeldingssløyfe. Selvskrivende skills. The Reef-markedsplassen for å oppdage og dele evner.
  - icon: "\U0001F916"
    title: Enhver LLM-leverandør
    details: Anthropic, OpenAI, Google Gemini, lokale modeller via Ollama, OpenRouter. Automatiske failover-kjeder. Eller velg Triggerfish Gateway — ingen API-nøkler nødvendig.
  - icon: "\U0001F3AF"
    title: Proaktiv som standard
    details: Cron-jobber, triggers og webhooks. Agenten din sjekker inn, overvåker og handler autonomt — innenfor strenge policy-grenser.
  - icon: "\U0001F310"
    title: Åpen kildekode
    details: Lisensiert under Apache 2.0. Sikkerhetskritiske komponenter fullt åpne for revisjon. Stol ikke på oss — verifiser koden.
---

<LatestRelease />

## Installer med én kommando

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

De binære installasjonsprogrammene laster ned en ferdigbygd utgivelse, verifiserer sjekksummen og kjører oppsettveiviseren. Se [installasjonsveiledningen](/nb-NO/guide/installation) for Docker-oppsett, bygging fra kildekode og utgivelsesprosessen.

Vil du ikke administrere API-nøkler? [Se priser](/nb-NO/pricing) for Triggerfish Gateway — administrert LLM- og søkeinfrastruktur, klar på minutter.

## Slik fungerer det

Triggerfish plasserer et deterministisk policy-lag mellom AI-agenten din og alt den berører. LLM-en foreslår handlinger — rene kode-hooks bestemmer om de er tillatt.

- **Deterministisk policy** — Sikkerhetsbeslutninger er ren kode. Ingen tilfeldighet, ingen LLM-påvirkning, ingen unntak. Samme inndata, samme beslutning, hver gang.
- **Informasjonsflyt-kontroll** — Fire klassifiseringsnivåer (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED) propagerer automatisk gjennom session taint. Data kan aldri flyte nedover til en mindre sikker kontekst.
- **Seks håndhevingshooks** — Hvert trinn i datapipelinen er sikret: hva som kommer inn i LLM-konteksten, hvilke verktøy som kalles, hvilke resultater som kommer tilbake og hva som forlater systemet. Hver beslutning logges i revisjonsloggen.
- **Standard avvis** — Ingenting tillates stille. Uklassifiserte verktøy, integrasjoner og datakilder avvises inntil de er eksplisitt konfigurert.
- **Agent-identitet** — Agentens oppdrag bor i SPINE.md, proaktiv atferd i TRIGGER.md. Skills utvider evner gjennom enkle mappekonvensjoner. The Reef-markedsplassen lar deg oppdage og dele dem.

[Lær mer om arkitekturen.](/nb-NO/architecture/)
