import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const itIT: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "it-IT",
  label: "Italiano",
  description:
    "Piattaforma sicura di agenti IA multicanale con applicazione deterministica delle policy al di sotto del livello LLM.",
  themeConfig: {
    nav: [
      { text: "Guida", link: "/it-IT/guide/" },
      { text: "Prezzi", link: "/it-IT/pricing" },
      { text: "Architettura", link: "/it-IT/architecture/" },
      { text: "Sicurezza", link: "/it-IT/security/" },
      { text: "Canali", link: "/it-IT/channels/" },
      { text: "Integrazioni", link: "/it-IT/integrations/" },
      { text: "Funzionalità", link: "/it-IT/features/" },
      { text: "Riferimento", link: "/it-IT/reference/" },
      { text: "Supporto", link: "/it-IT/support/" },
    ],
    sidebar: {
      "/it-IT/guide/": [
        {
          text: "Per iniziare",
          items: [
            { text: "Panoramica", link: "/it-IT/guide/" },
            {
              text: "Installazione e distribuzione",
              link: "/it-IT/guide/installation",
            },
            { text: "Avvio rapido", link: "/it-IT/guide/quickstart" },
            { text: "Configurazione", link: "/it-IT/guide/configuration" },
            {
              text: "SPINE e Trigger",
              link: "/it-IT/guide/spine-and-triggers",
            },
            { text: "Comandi CLI", link: "/it-IT/guide/commands" },
            {
              text: "Guida alla classificazione",
              link: "/it-IT/guide/classification-guide",
            },
          ],
        },
      ],
      "/it-IT/architecture/": [
        {
          text: "Architettura",
          items: [
            { text: "Panoramica", link: "/it-IT/architecture/" },
            {
              text: "Sistema di classificazione",
              link: "/it-IT/architecture/classification",
            },
            {
              text: "Motore delle policy e Hook",
              link: "/it-IT/architecture/policy-engine",
            },
            {
              text: "Sessioni e Taint",
              link: "/it-IT/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/it-IT/architecture/gateway" },
            { text: "Archiviazione", link: "/it-IT/architecture/storage" },
            {
              text: "Difesa in profondità",
              link: "/it-IT/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/it-IT/security/": [
        {
          text: "Modello di sicurezza",
          items: [
            {
              text: "Progettazione sicurezza-prima",
              link: "/it-IT/security/",
            },
            {
              text: "Regola di divieto di scrittura verso il basso",
              link: "/it-IT/security/no-write-down",
            },
            {
              text: "Identità e autenticazione",
              link: "/it-IT/security/identity",
            },
            {
              text: "Delega dell'agente",
              link: "/it-IT/security/agent-delegation",
            },
            {
              text: "Gestione dei segreti",
              link: "/it-IT/security/secrets",
            },
            {
              text: "Audit e conformità",
              link: "/it-IT/security/audit-logging",
            },
          ],
        },
        {
          text: "Fiducia e conformità",
          items: [
            {
              text: "Centro di fiducia",
              link: "/it-IT/security/trust-center",
            },
            {
              text: "Divulgazione responsabile",
              link: "/it-IT/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/it-IT/channels/": [
        {
          text: "Canali",
          items: [
            { text: "Panoramica", link: "/it-IT/channels/" },
            { text: "CLI", link: "/it-IT/channels/cli" },
            { text: "Telegram", link: "/it-IT/channels/telegram" },
            { text: "Slack", link: "/it-IT/channels/slack" },
            { text: "Discord", link: "/it-IT/channels/discord" },
            { text: "WhatsApp", link: "/it-IT/channels/whatsapp" },
            { text: "WebChat", link: "/it-IT/channels/webchat" },
            { text: "Email", link: "/it-IT/channels/email" },
            { text: "Signal", link: "/it-IT/channels/signal" },
            { text: "Google Chat", link: "/it-IT/channels/google-chat" },
          ],
        },
      ],
      "/it-IT/integrations/": [
        {
          text: "Integrazioni",
          items: [
            { text: "Panoramica", link: "/it-IT/integrations/" },
            {
              text: "MCP Gateway",
              link: "/it-IT/integrations/mcp-gateway",
            },
            { text: "Plugin SDK", link: "/it-IT/integrations/plugins" },
            {
              text: "Ambiente di esecuzione",
              link: "/it-IT/integrations/exec-environment",
            },
            { text: "Skills", link: "/it-IT/integrations/skills" },
            {
              text: "Creare Skills",
              link: "/it-IT/integrations/building-skills",
            },
            {
              text: "Automazione del browser",
              link: "/it-IT/integrations/browser",
            },
            { text: "Webhooks", link: "/it-IT/integrations/webhooks" },
            { text: "GitHub", link: "/it-IT/integrations/github" },
            {
              text: "Google Workspace",
              link: "/it-IT/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/it-IT/integrations/obsidian" },
            { text: "CalDAV", link: "/it-IT/integrations/caldav" },
            { text: "Accesso remoto", link: "/it-IT/integrations/remote" },
          ],
        },
      ],
      "/it-IT/features/": [
        {
          text: "Funzionalità",
          items: [
            { text: "Panoramica", link: "/it-IT/features/" },
            {
              text: "Cron e Trigger",
              link: "/it-IT/features/cron-and-triggers",
            },
            { text: "Voce", link: "/it-IT/features/voice" },
            { text: "Tide Pool / A2UI", link: "/it-IT/features/tidepool" },
            {
              text: "Routing multi-agente",
              link: "/it-IT/features/multi-agent",
            },
            {
              text: "Failover del modello",
              link: "/it-IT/features/model-failover",
            },
            { text: "Notifiche", link: "/it-IT/features/notifications" },
            { text: "Registrazione", link: "/it-IT/features/logging" },
            {
              text: "Team di agenti",
              link: "/it-IT/features/agent-teams",
            },
            {
              text: "Limitazione della frequenza",
              link: "/it-IT/features/rate-limiting",
            },
            { text: "Esplora", link: "/it-IT/features/explore" },
            { text: "File system", link: "/it-IT/features/filesystem" },
            {
              text: "Immagini e visione",
              link: "/it-IT/features/image-vision",
            },
            { text: "Memoria", link: "/it-IT/features/memory" },
            { text: "Pianificazione", link: "/it-IT/features/planning" },
            { text: "Sessioni", link: "/it-IT/features/sessions" },
            { text: "Ricerca web", link: "/it-IT/features/web-search" },
            { text: "Sottoagenti", link: "/it-IT/features/subagents" },
          ],
        },
      ],
      "/it-IT/reference/": [
        {
          text: "Riferimento",
          items: [
            { text: "Panoramica", link: "/it-IT/reference/" },
            {
              text: "Schema di configurazione",
              link: "/it-IT/reference/config-yaml",
            },
            { text: "Interfacce", link: "/it-IT/reference/interfaces" },
            { text: "Glossario", link: "/it-IT/reference/glossary" },
          ],
        },
      ],
      "/it-IT/support/": [
        {
          text: "Centro di supporto",
          items: [
            { text: "Panoramica", link: "/it-IT/support/" },
            { text: "FAQ", link: "/it-IT/support/faq" },
          ],
        },
        {
          text: "Risoluzione dei problemi",
          items: [
            {
              text: "Inizia qui",
              link: "/it-IT/support/troubleshooting/",
            },
            {
              text: "Installazione",
              link: "/it-IT/support/troubleshooting/installation",
            },
            {
              text: "Daemon",
              link: "/it-IT/support/troubleshooting/daemon",
            },
            {
              text: "Configurazione",
              link: "/it-IT/support/troubleshooting/configuration",
            },
            {
              text: "Canali",
              link: "/it-IT/support/troubleshooting/channels",
            },
            {
              text: "Provider LLM",
              link: "/it-IT/support/troubleshooting/providers",
            },
            {
              text: "Integrazioni",
              link: "/it-IT/support/troubleshooting/integrations",
            },
            {
              text: "Automazione del browser",
              link: "/it-IT/support/troubleshooting/browser",
            },
            {
              text: "Sicurezza e classificazione",
              link: "/it-IT/support/troubleshooting/security",
            },
            {
              text: "Segreti e credenziali",
              link: "/it-IT/support/troubleshooting/secrets",
            },
            {
              text: "Riferimento degli errori",
              link: "/it-IT/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Guide pratiche",
          items: [
            {
              text: "Raccolta dei log",
              link: "/it-IT/support/guides/collecting-logs",
            },
            {
              text: "Esecuzione della diagnostica",
              link: "/it-IT/support/guides/diagnostics",
            },
            {
              text: "Segnalazione di problemi",
              link: "/it-IT/support/guides/filing-issues",
            },
            {
              text: "Note sulla piattaforma",
              link: "/it-IT/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Base di conoscenza",
          items: [
            {
              text: "Migrazione dei segreti",
              link: "/it-IT/support/kb/secrets-migration",
            },
            {
              text: "Processo di autoaggiornamento",
              link: "/it-IT/support/kb/self-update",
            },
            {
              text: "Modifiche incompatibili",
              link: "/it-IT/support/kb/breaking-changes",
            },
            {
              text: "Problemi noti",
              link: "/it-IT/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "Modifica questa pagina su GitHub",
    },
    footer: {
      message:
        'Rilasciato sotto la licenza Apache 2.0. | <a href="/it-IT/account">Account</a> | <a href="/it-IT/privacy-policy">Informativa sulla privacy</a> | <a href="/it-IT/cookie-policy">Politica sui cookie</a> | <a href="/it-IT/terms-of-service">Termini di servizio</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Pagina precedente",
      next: "Pagina successiva",
    },
    lastUpdated: {
      text: "Ultimo aggiornamento",
    },
    outline: {
      label: "In questa pagina",
    },
    returnToTopLabel: "Torna in alto",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Aspetto",
    langMenuLabel: "Cambia lingua",
    notFound: {
      title: "PAGINA NON TROVATA",
      quote:
        "La pagina che stai cercando non esiste o è stata spostata.",
      linkLabel: "Vai alla pagina iniziale",
      linkText: "Torna alla home",
      code: "404",
    },
  },
};
