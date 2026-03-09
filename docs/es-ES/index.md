---
layout: home

hero:
  name: Triggerfish
  text: Agentes de IA seguros
  tagline: Aplicación determinista de politicas por debajo de la capa LLM. Todos los canales. Sin excepciones.
  image:
    src: /triggerfish.png
    alt: Triggerfish — surcando el mar digital
  actions:
    - theme: brand
      text: Comenzar
      link: /es-ES/guide/
    - theme: alt
      text: Precios
      link: /es-ES/pricing
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Seguridad por debajo del LLM
    details: Aplicacion de politicas determinista y sub-LLM. Hooks de codigo puro que la IA no puede eludir, anular ni influir. La misma entrada siempre produce la misma decision.
  - icon: "\U0001F4AC"
    title: Todos los canales que utiliza
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — todos con clasificacion por canal y seguimiento automatico de taint.
  - icon: "\U0001F528"
    title: Construya lo que quiera
    details: Entorno de ejecucion del agente con un ciclo de escritura/ejecucion/correccion. Skills autoescribibles. El mercado The Reef para descubrir y compartir funcionalidades.
  - icon: "\U0001F916"
    title: Cualquier proveedor de LLM
    details: Anthropic, OpenAI, Google Gemini, modelos locales via Ollama, OpenRouter. Cadenas de failover automaticas. O elija Triggerfish Gateway — sin necesidad de claves API.
  - icon: "\U0001F3AF"
    title: Proactivo por defecto
    details: Cron jobs, triggers y webhooks. Su agente revisa, monitoriza y actua de forma autonoma — dentro de estrictos limites de politicas.
  - icon: "\U0001F310"
    title: Codigo abierto
    details: Licencia Apache 2.0. Los componentes criticos de seguridad estan completamente abiertos para auditoria. No confie en nosotros — verifique el codigo.
---

<LatestRelease />

## Instale con un solo comando

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

Los instaladores binarios descargan una release precompilada, verifican su
checksum e inician el asistente de configuracion. Consulte la
[guia de instalacion](/es-ES/guide/installation) para la configuracion con
Docker, la compilacion desde el codigo fuente y el proceso de lanzamiento.

No desea gestionar claves API? [Consulte los precios](/es-ES/pricing) de
Triggerfish Gateway — infraestructura gestionada de LLM y busqueda, lista en
minutos.

## Como funciona

Triggerfish interpone una capa de politicas determinista entre su agente de IA y
todo lo que este toca. El LLM propone acciones — los hooks de codigo puro
deciden si estan permitidas.

- **Politica determinista** — Las decisiones de seguridad son codigo puro. Sin
  aleatoriedad, sin influencia del LLM, sin excepciones. La misma entrada, la
  misma decision, siempre.
- **Control de flujo de informacion** — Cuatro niveles de clasificacion (PUBLIC,
  INTERNAL, CONFIDENTIAL, RESTRICTED) se propagan automaticamente a traves del
  taint de sesion. Los datos nunca pueden fluir hacia un contexto menos seguro.
- **Seis hooks de aplicacion** — Cada fase del pipeline de datos esta protegida:
  lo que entra en el contexto del LLM, que herramientas se invocan, que
  resultados regresan y que sale del sistema. Cada decision se registra en la
  auditoria.
- **Denegacion por defecto** — Nada se permite de forma silenciosa. Las
  herramientas, integraciones y fuentes de datos sin clasificar son rechazadas
  hasta que se configuren explicitamente.
- **Identidad del agente** — La mision de su agente reside en SPINE.md, los
  comportamientos proactivos en TRIGGER.md. Los skills amplian las capacidades
  mediante simples convenciones de carpetas. El mercado The Reef le permite
  descubrirlos y compartirlos.

[Conozca mas sobre la arquitectura.](/es-ES/architecture/)
