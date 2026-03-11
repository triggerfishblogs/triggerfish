---
layout: home

hero:
  name: Triggerfish
  text: Agenti IA Sicuri
  tagline: Applicazione deterministica delle policy al di sotto del livello LLM. Ogni canale. Nessuna eccezione.
  image:
    src: /triggerfish.png
    alt: Triggerfish — navigando nel mare digitale
  actions:
    - theme: brand
      text: Inizia
      link: /it-IT/guide/
    - theme: alt
      text: Prezzi
      link: /it-IT/pricing
    - theme: alt
      text: Vedi su GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Sicurezza al di sotto del LLM
    details: Applicazione deterministica delle policy, sub-LLM. Hook in puro codice che l'IA non può aggirare, sovrascrivere o influenzare. Lo stesso input produce sempre la stessa decisione.
  - icon: "\U0001F4AC"
    title: Ogni canale che utilizzi
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — tutti con classificazione per canale e tracciamento automatico del Taint.
  - icon: "\U0001F528"
    title: Costruisci qualsiasi cosa
    details: Ambiente di esecuzione per agenti con ciclo di feedback scrittura/esecuzione/correzione. Skill auto-generate. Il marketplace The Reef per scoprire e condividere funzionalità.
  - icon: "\U0001F916"
    title: Qualsiasi provider LLM
    details: Anthropic, OpenAI, Google Gemini, modelli locali tramite Ollama, OpenRouter. Catene di failover automatiche. Oppure scegli Triggerfish Gateway — nessuna chiave API necessaria.
  - icon: "\U0001F3AF"
    title: Proattivo per default
    details: Cron job, trigger e webhook. Il tuo agente controlla, monitora e agisce autonomamente — entro rigidi confini di policy.
  - icon: "\U0001F310"
    title: Open Source
    details: Licenza Apache 2.0. Componenti critici per la sicurezza completamente aperti per l'audit. Non fidarti di noi — verifica il codice.
---

<LatestRelease />

## Installa con un solo comando

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

Gli installer binari scaricano una release pre-compilata, verificano il checksum
e avviano la procedura guidata di configurazione. Consulti la
[guida all'installazione](/it-IT/guide/installation) per la configurazione
Docker, la compilazione da sorgente e il processo di rilascio.

Non desidera gestire chiavi API? [Veda i prezzi](/it-IT/pricing) per Triggerfish
Gateway — infrastruttura LLM e di ricerca gestita, pronta in pochi minuti.

## Come funziona

Triggerfish inserisce un livello di policy deterministico tra il Suo agente IA e
tutto ciò con cui interagisce. Il LLM propone azioni — gli Hook in puro codice
decidono se sono consentite.

- **Policy deterministica** — Le decisioni di sicurezza sono puro codice. Nessuna
  casualità, nessuna influenza LLM, nessuna eccezione. Stesso input, stessa
  decisione, ogni volta.
- **Controllo del flusso informativo** — Quattro livelli di classificazione
  (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED) si propagano automaticamente
  attraverso il Taint di sessione. I dati non possono mai fluire verso il basso,
  verso un contesto meno sicuro.
- **Sei Hook di applicazione** — Ogni fase della pipeline dati è controllata:
  cosa entra nel contesto LLM, quali strumenti vengono chiamati, quali risultati
  tornano e cosa esce dal sistema. Ogni decisione viene registrata nell'audit.
- **Default deny** — Nulla viene consentito silenziosamente. Strumenti,
  integrazioni e fonti dati non classificati vengono rifiutati fino a quando non
  vengono esplicitamente configurati.
- **Identità dell'agente** — La missione del Suo agente risiede in SPINE.md, i
  comportamenti proattivi in TRIGGER.md. Le Skill estendono le funzionalità
  attraverso semplici convenzioni di cartelle. Il marketplace The Reef Le
  permette di scoprirle e condividerle.

[Scopra di più sull'architettura.](/it-IT/architecture/)
