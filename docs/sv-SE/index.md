---
layout: home

hero:
  name: Triggerfish
  text: Säkra AI-agenter
  tagline: Deterministisk policyhantering under LLM-lagret. Varje kanal. Inga undantag.
  image:
    src: /triggerfish.png
    alt: Triggerfish — ute och simmaar i det digitala havet
  actions:
    - theme: brand
      text: Kom igång
      link: /sv-SE/guide/
    - theme: alt
      text: Priser
      link: /sv-SE/pricing
    - theme: alt
      text: Visa på GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "🔒"
    title: Säkerhet under LLM-lagret
    details: Deterministisk policyhantering under LLM-lagret. Rena kodhooks som AI:n inte kan kringgå, åsidosätta eller påverka. Samma indata ger alltid samma beslut.
  - icon: "💬"
    title: Varje kanal du använder
    details: Telegram, Slack, Discord, WhatsApp, e-post, WebChat, CLI — alla med kanalspecifik klassificering och automatisk taint-spårning.
  - icon: "🔨"
    title: Bygg vad som helst
    details: Agentens körningsmiljö med en skriv/kör/fixa-återkopplingslinga. Självskrivande skills. The Reef-marknadsplatsen för att upptäcka och dela funktioner.
  - icon: "🤖"
    title: Vilken LLM-leverantör som helst
    details: Anthropic, OpenAI, Google Gemini, lokala modeller via Ollama, OpenRouter. Automatiska failover-kedjor. Eller välj Triggerfish Gateway — inga API-nycklar behövs.
  - icon: "🎯"
    title: Proaktiv som standard
    details: Cron-jobb, triggers och webhooks. Din agent checkar in, övervakar och agerar självständigt — inom strikta policygränser.
  - icon: "🌐"
    title: Öppen källkod
    details: Apache 2.0-licensierad. Säkerhetskritiska komponenter fullt öppna för granskning. Lita inte på oss — verifiera koden.
---

<LatestRelease />

## Installera med ett kommando

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

De binära installationsprogrammen laddar ned en förbyggd version, verifierar dess kontrollsumma och startar installationsguiden. Se [installationsguiden](/sv-SE/guide/installation) för Docker-installation, kompilering från källkod och versionsprocessen.

Vill du inte hantera API-nycklar? [Se priserna](/sv-SE/pricing) för Triggerfish Gateway — hanterad LLM- och sökinfrastruktur, redo på minuter.

## Så här fungerar det

Triggerfish placerar ett deterministiskt policylager mellan din AI-agent och allt den rör vid. LLM:en föreslår åtgärder — rena kodhooks avgör om de är tillåtna.

- **Deterministisk policy** — Säkerhetsbeslut är ren kod. Ingen slumpmässighet, inget LLM-inflytande, inga undantag. Samma indata, samma beslut, varje gång.
- **Informationsflödeskontroll** — Fyra klassificeringsnivåer (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED) sprids automatiskt via session-taint. Data kan aldrig flöda nedåt till ett mindre säkert sammanhang.
- **Sex hanteringshooks** — Varje steg i datapipelinen är kontrollerat: vad som hamnar i LLM-kontexten, vilka verktyg som anropas, vilka resultat som returneras och vad som lämnar systemet. Varje beslut loggas i revisionsloggen.
- **Neka som standard** — Ingenting tillåts tyst. Oklassificerade verktyg, integrationer och datakällor avvisas tills de uttryckligen konfigurerats.
- **Agentidentitet** — Din agents uppdrag finns i SPINE.md, proaktiva beteenden i TRIGGER.md. Skills utökar funktionerna via enkla mappkonventioner. The Reef-marknadsplatsen låter dig upptäcka och dela dem.

[Läs mer om arkitekturen.](/sv-SE/architecture/)
