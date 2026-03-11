---
layout: home

hero:
  name: Triggerfish
  text: Secure AI Agents
  tagline: Deterministikong policy enforcement sa ilalim ng LLM layer. Lahat ng channel. Walang exception.
  image:
    src: /triggerfish.png
    alt: Triggerfish — naglalayag sa digital na karagatan
  actions:
    - theme: brand
      text: Magsimula
      link: /fil-PH/guide/
    - theme: alt
      text: Presyo
      link: /fil-PH/pricing
    - theme: alt
      text: Tingnan sa GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Security sa Ilalim ng LLM
    details: Deterministiko at sub-LLM na policy enforcement. Pure code hooks na hindi kayang i-bypass, i-override, o impluwensyahan ng AI. Parehong input, parehong desisyon, palagi.
  - icon: "\U0001F4AC"
    title: Lahat ng Channel na Ginagamit Mo
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — lahat may per-channel classification at automatic na taint tracking.
  - icon: "\U0001F528"
    title: Gumawa ng Kahit Ano
    details: Agent execution environment na may write/run/fix feedback loop. Self-authoring skills. Ang Reef marketplace para mag-discover at mag-share ng capabilities.
  - icon: "\U0001F916"
    title: Kahit Anong LLM Provider
    details: Anthropic, OpenAI, Google Gemini, local models sa pamamagitan ng Ollama, OpenRouter. Automatic failover chains. O pumili ng Triggerfish Gateway — walang API keys na kailangan.
  - icon: "\U0001F3AF"
    title: Proactive bilang Default
    details: Cron jobs, triggers, at webhooks. Ang iyong agent ay nagche-check, nagmo-monitor, at kumikilos nang autonomous — sa loob ng mahigpit na policy boundaries.
  - icon: "\U0001F310"
    title: Open Source
    details: Apache 2.0 licensed. Bukas para sa audit ang security-critical components. Huwag magtiwala sa amin — i-verify ang code.
---

<LatestRelease />

## I-install sa isang command

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

Ang binary installers ay nagda-download ng pre-built release, nag-ve-verify ng checksum, at
nagpapatakbo ng setup wizard. Tingnan ang [installation guide](/fil-PH/guide/installation) para sa Docker
setup, pag-build mula sa source, at ang release process.

Ayaw mag-manage ng API keys? [Tingnan ang presyo](/fil-PH/pricing) para sa Triggerfish Gateway —
managed LLM at search infrastructure, handa sa ilang minuto.

## Paano Ito Gumagana

Naglalagay ang Triggerfish ng deterministikong policy layer sa pagitan ng iyong AI agent at
lahat ng tinatamaan nito. Ang LLM ay nagpo-propose ng actions — ang pure-code hooks ang nagde-desisyon
kung pinapayagan ang mga ito.

- **Deterministikong Policy** — Ang mga security decisions ay pure code. Walang randomness, walang
  LLM influence, walang exceptions. Parehong input, parehong desisyon, sa lahat ng pagkakataon.
- **Information Flow Control** — Apat na classification levels (PUBLIC, INTERNAL,
  CONFIDENTIAL, RESTRICTED) na awtomatikong nagpo-propagate sa pamamagitan ng session taint. Hindi
  kailanman puwedeng mag-flow pababa ang data sa isang hindi gaanong secure na context.
- **Anim na Enforcement Hooks** — Ang bawat stage ng data pipeline ay may gate: kung ano
  ang papasok sa LLM context, kung aling tools ang tatawagin, kung anong results ang babalik, at
  kung ano ang aalis sa system. Lahat ng desisyon ay audit-logged.
- **Default Deny** — Walang tahimik na pinapayagan. Ang mga unclassified tools,
  integrations, at data sources ay nire-reject hanggang sa maayos na na-configure.
- **Agent Identity** — Ang mission ng iyong agent ay nasa SPINE.md, ang mga proactive
  behaviors ay nasa TRIGGER.md. Ang skills ay nagpo-provide ng karagdagang capabilities sa pamamagitan ng
  simpleng folder conventions. Ang Reef marketplace ay para sa pag-discover at pag-share ng mga ito.

[Alamin pa ang tungkol sa architecture.](/fil-PH/architecture/)
