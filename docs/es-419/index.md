---
layout: home

hero:
  name: Triggerfish
  text: Agentes de IA Seguros
  tagline: Aplicación determinista de políticas por debajo de la capa del LLM. Todos los canales. Sin excepciones.
  image:
    src: /triggerfish.png
    alt: Triggerfish — recorriendo el mar digital
  actions:
    - theme: brand
      text: Comenzar
      link: /es-419/guide/
    - theme: alt
      text: Precios
      link: /es-419/pricing
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Seguridad por debajo del LLM
    details: Aplicación de políticas determinista, sub-LLM. Hooks de código puro que la IA no puede eludir, anular ni influenciar. La misma entrada siempre produce la misma decisión.
  - icon: "\U0001F4AC"
    title: Todos los canales que usas
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — todos con clasificación por canal y seguimiento automático de contaminación (taint).
  - icon: "\U0001F528"
    title: Construye lo que sea
    details: Entorno de ejecución del agente con un ciclo de escritura/ejecución/corrección. Skills auto-generados. El marketplace The Reef para descubrir y compartir capacidades.
  - icon: "\U0001F916"
    title: Cualquier proveedor de LLM
    details: Anthropic, OpenAI, Google Gemini, modelos locales vía Ollama, OpenRouter. Cadenas de failover automático. O elige Triggerfish Gateway — sin necesidad de API keys.
  - icon: "\U0001F3AF"
    title: Proactivo por defecto
    details: Trabajos cron, triggers y webhooks. Tu agente verifica, monitorea y actúa de forma autónoma — dentro de límites estrictos de políticas.
  - icon: "\U0001F310"
    title: Código abierto
    details: Licencia Apache 2.0. Componentes críticos de seguridad completamente abiertos para auditoría. No confíes en nosotros — verifica el código.
---

<LatestRelease />

## Instala con un solo comando

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

Los instaladores binarios descargan una versión pre-compilada, verifican su
checksum y ejecutan el asistente de configuración. Consulta la
[guía de instalación](/es-419/guide/installation) para la configuración con
Docker, compilación desde el código fuente y el proceso de lanzamiento.

¿No quieres administrar API keys? [Consulta los precios](/es-419/pricing) de
Triggerfish Gateway — infraestructura administrada de LLM y búsqueda, lista en
minutos.

## Cómo funciona

Triggerfish coloca una capa de políticas determinista entre tu agente de IA y
todo lo que toca. El LLM propone acciones — hooks de código puro deciden si
están permitidas.

- **Políticas deterministas** — Las decisiones de seguridad son código puro. Sin
  aleatoriedad, sin influencia del LLM, sin excepciones. Misma entrada, misma
  decisión, siempre.
- **Control de flujo de información** — Cuatro niveles de clasificación (PUBLIC,
  INTERNAL, CONFIDENTIAL, RESTRICTED) se propagan automáticamente a través de la
  contaminación de sesión (session taint). Los datos nunca pueden fluir hacia
  abajo a un contexto menos seguro.
- **Seis hooks de aplicación** — Cada etapa del pipeline de datos está
  controlada: qué entra al contexto del LLM, qué herramientas se llaman, qué
  resultados regresan y qué sale del sistema. Cada decisión se registra en el
  log de auditoría.
- **Denegación por defecto** — Nada se permite silenciosamente. Herramientas,
  integraciones y fuentes de datos sin clasificar son rechazadas hasta que se
  configuren explícitamente.
- **Identidad del agente** — La misión de tu agente vive en SPINE.md, los
  comportamientos proactivos en TRIGGER.md. Los skills extienden las capacidades
  mediante convenciones simples de carpetas. El marketplace The Reef te permite
  descubrirlos y compartirlos.

[Aprende más sobre la arquitectura.](/architecture/)
