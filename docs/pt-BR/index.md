---
layout: home

hero:
  name: Triggerfish
  text: Agentes de IA Seguros
  tagline: Aplicação determinística de políticas abaixo da camada do LLM. Todos os canais. Sem exceções.
  image:
    src: /triggerfish.webp
    alt: Triggerfish — navegando pelo mar digital
  actions:
    - theme: brand
      text: Começar
      link: /pt-BR/guide/
    - theme: alt
      text: Preços
      link: /pt-BR/pricing
    - theme: alt
      text: Ver no GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Segurança abaixo do LLM
    details: Aplicação de políticas determinística, sub-LLM. Hooks de código puro que a IA não consegue contornar, substituir ou influenciar. A mesma entrada sempre produz a mesma decisão.
  - icon: "\U0001F4AC"
    title: Todos os canais que você usa
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — todos com classificação por canal e rastreamento automático de contaminação (taint).
  - icon: "\U0001F528"
    title: Construa qualquer coisa
    details: Ambiente de execução do agente com um ciclo de escrita/execução/correção. Skills autogerados. O marketplace The Reef para descobrir e compartilhar capacidades.
  - icon: "\U0001F916"
    title: Qualquer provedor de LLM
    details: Anthropic, OpenAI, Google Gemini, modelos locais via Ollama, OpenRouter. Cadeias de failover automático. Ou escolha o Triggerfish Gateway — sem necessidade de API keys.
  - icon: "\U0001F3AF"
    title: Proativo por padrão
    details: Cron jobs, triggers e webhooks. Seu agente verifica, monitora e age de forma autônoma — dentro de limites rigorosos de políticas.
  - icon: "\U0001F310"
    title: Código aberto
    details: Licença Apache 2.0. Componentes críticos de segurança totalmente abertos para auditoria. Não confie em nós — verifique o código.
---

<LatestRelease />

## Instale com um único comando

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

Os instaladores binários baixam uma versão pré-compilada, verificam seu checksum
e executam o assistente de configuração. Consulte o
[guia de instalação](/pt-BR/guide/installation) para configuração com Docker,
compilação a partir do código-fonte e o processo de lançamento.

Não quer gerenciar API keys? [Veja os preços](/pt-BR/pricing) do Triggerfish
Gateway — infraestrutura gerenciada de LLM e busca, pronta em minutos.

## Como funciona

O Triggerfish coloca uma camada de políticas determinística entre seu agente de
IA e tudo que ele toca. O LLM propõe ações — hooks de código puro decidem se
elas são permitidas.

- **Políticas determinísticas** — As decisões de segurança são código puro. Sem
  aleatoriedade, sem influência do LLM, sem exceções. Mesma entrada, mesma
  decisão, sempre.
- **Controle de fluxo de informação** — Quatro níveis de classificação (PUBLIC,
  INTERNAL, CONFIDENTIAL, RESTRICTED) se propagam automaticamente através da
  contaminação de sessão (session taint). Os dados nunca podem fluir para baixo,
  para um contexto menos seguro.
- **Seis hooks de aplicação** — Cada etapa do pipeline de dados é controlada: o
  que entra no contexto do LLM, quais ferramentas são chamadas, quais resultados
  retornam e o que sai do sistema. Cada decisão é registrada no log de
  auditoria.
- **Negação por padrão** — Nada é permitido silenciosamente. Ferramentas,
  integrações e fontes de dados sem classificação são rejeitadas até serem
  configuradas explicitamente.
- **Identidade do agente** — A missão do seu agente vive no SPINE.md, os
  comportamentos proativos no TRIGGER.md. Os skills estendem as capacidades
  através de convenções simples de pastas. O marketplace The Reef permite
  descobri-los e compartilhá-los.

[Saiba mais sobre a arquitetura.](/pt-BR/architecture/)
