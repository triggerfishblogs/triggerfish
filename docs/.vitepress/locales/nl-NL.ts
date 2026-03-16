import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const nlNL: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "nl-NL",
  label: "Nederlands",
  description:
    "Veilig, meerkanaals AI-agentplatform met deterministische beleidshandhaving onder de LLM-laag.",
  themeConfig: {
    nav: [
      { text: "Handleiding", link: "/nl-NL/guide/" },
      { text: "Prijzen", link: "/nl-NL/pricing" },
      {
        text: "Documentatie",
        items: [
          { text: "Architectuur", link: "/nl-NL/architecture/" },
          { text: "Beveiliging", link: "/nl-NL/security/" },
          { text: "Kanalen", link: "/nl-NL/channels/" },
          { text: "Integraties", link: "/nl-NL/integrations/" },
          { text: "Functies", link: "/nl-NL/features/" },
          { text: "Referentie", link: "/nl-NL/reference/" },
        ],
      },
      { text: "Use cases", link: "/nl-NL/use-cases/enterprise/" },
      { text: "Ondersteuning", link: "/nl-NL/support/" },
    ],
    sidebar: {
      "/nl-NL/use-cases/enterprise/": [
        {
          text: "Enterprise use cases",
          items: [
            { text: "Overzicht", link: "/nl-NL/use-cases/enterprise/" },
            { text: "Cross-systeemorkestrtatie", link: "/nl-NL/use-cases/enterprise/cross-system-orchestration" },
            { text: "Ingestie van ongestructureerde data", link: "/nl-NL/use-cases/enterprise/unstructured-data-ingestion" },
            { text: "Automatisering van externe portalen", link: "/nl-NL/use-cases/enterprise/portal-automation" },
            { text: "AI-inferentie in productieworkflows", link: "/nl-NL/use-cases/enterprise/ai-inference-in-production" },
          ],
        },
      ],
      "/nl-NL/guide/": [
        {
          text: "Aan de slag",
          items: [
            { text: "Overzicht", link: "/nl-NL/guide/" },
            { text: "Installatie en implementatie", link: "/nl-NL/guide/installation" },
            { text: "Snelstart", link: "/nl-NL/guide/quickstart" },
            { text: "Configuratie", link: "/nl-NL/guide/configuration" },
            { text: "SPINE en Triggers", link: "/nl-NL/guide/spine-and-triggers" },
            { text: "CLI-opdrachten", link: "/nl-NL/guide/commands" },
            {
              text: "Classificatiegids",
              link: "/nl-NL/guide/classification-guide",
            },
          ],
        },
      ],
      "/nl-NL/architecture/": [
        {
          text: "Architectuur",
          items: [
            { text: "Overzicht", link: "/nl-NL/architecture/" },
            {
              text: "Classificatiesysteem",
              link: "/nl-NL/architecture/classification",
            },
            {
              text: "Beleidsmotor en Hooks",
              link: "/nl-NL/architecture/policy-engine",
            },
            {
              text: "Sessies en Taint",
              link: "/nl-NL/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/nl-NL/architecture/gateway" },
            { text: "Opslag", link: "/nl-NL/architecture/storage" },
            {
              text: "Diepteverdediging",
              link: "/nl-NL/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/nl-NL/security/": [
        {
          text: "Beveiligingsmodel",
          items: [
            { text: "Beveiliging-eerst ontwerp", link: "/nl-NL/security/" },
            { text: "Geen-afschrijving regel", link: "/nl-NL/security/no-write-down" },
            { text: "Identiteit en authenticatie", link: "/nl-NL/security/identity" },
            { text: "Agentdelegatie", link: "/nl-NL/security/agent-delegation" },
            { text: "Geheimenbeheer", link: "/nl-NL/security/secrets" },
            { text: "Audit en compliance", link: "/nl-NL/security/audit-logging" },
          ],
        },
        {
          text: "Vertrouwen en compliance",
          items: [
            { text: "Vertrouwenscentrum", link: "/nl-NL/security/trust-center" },
            {
              text: "Verantwoorde openbaarmaking",
              link: "/nl-NL/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/nl-NL/channels/": [
        {
          text: "Kanalen",
          items: [
            { text: "Overzicht", link: "/nl-NL/channels/" },
            { text: "CLI", link: "/nl-NL/channels/cli" },
            { text: "Telegram", link: "/nl-NL/channels/telegram" },
            { text: "Slack", link: "/nl-NL/channels/slack" },
            { text: "Discord", link: "/nl-NL/channels/discord" },
            { text: "WhatsApp", link: "/nl-NL/channels/whatsapp" },
            { text: "WebChat", link: "/nl-NL/channels/webchat" },
            { text: "Email", link: "/nl-NL/channels/email" },
            { text: "Signal", link: "/nl-NL/channels/signal" },
            { text: "Google Chat", link: "/nl-NL/channels/google-chat" },
          ],
        },
      ],
      "/nl-NL/integrations/": [
        {
          text: "Integraties",
          items: [
            { text: "Overzicht", link: "/nl-NL/integrations/" },
            { text: "MCP Gateway", link: "/nl-NL/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/nl-NL/integrations/plugins" },
            {
              text: "Uitvoeringsomgeving",
              link: "/nl-NL/integrations/exec-environment",
            },
            { text: "Skills", link: "/nl-NL/integrations/skills" },
            { text: "Skills bouwen", link: "/nl-NL/integrations/building-skills" },
            { text: "Browserautomatisering", link: "/nl-NL/integrations/browser" },
            { text: "Webhooks", link: "/nl-NL/integrations/webhooks" },
            { text: "GitHub", link: "/nl-NL/integrations/github" },
            {
              text: "Google Workspace",
              link: "/nl-NL/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/nl-NL/integrations/obsidian" },
            { text: "CalDAV", link: "/nl-NL/integrations/caldav" },
            { text: "Externe toegang", link: "/nl-NL/integrations/remote" },
          ],
        },
      ],
      "/nl-NL/features/": [
        {
          text: "Functies",
          items: [
            { text: "Overzicht", link: "/nl-NL/features/" },
            { text: "Cron en Triggers", link: "/nl-NL/features/cron-and-triggers" },
            { text: "Spraak", link: "/nl-NL/features/voice" },
            { text: "Tide Pool / A2UI", link: "/nl-NL/features/tidepool" },
            { text: "Multi-agent routing", link: "/nl-NL/features/multi-agent" },
            { text: "Model-failover", link: "/nl-NL/features/model-failover" },
            { text: "Meldingen", link: "/nl-NL/features/notifications" },
            { text: "Logging", link: "/nl-NL/features/logging" },
            { text: "Agentteams", link: "/nl-NL/features/agent-teams" },
            { text: "Workflows", link: "/nl-NL/features/workflows" },
            { text: "Snelheidsbeperking", link: "/nl-NL/features/rate-limiting" },
            { text: "Verkennen", link: "/nl-NL/features/explore" },
            { text: "Bestandssysteem", link: "/nl-NL/features/filesystem" },
            { text: "Beeld en visie", link: "/nl-NL/features/image-vision" },
            { text: "Geheugen", link: "/nl-NL/features/memory" },
            { text: "Planning", link: "/nl-NL/features/planning" },
            { text: "Sessies", link: "/nl-NL/features/sessions" },
            { text: "Webzoeken", link: "/nl-NL/features/web-search" },
            { text: "Subagenten", link: "/nl-NL/features/subagents" },
          ],
        },
      ],
      "/nl-NL/reference/": [
        {
          text: "Referentie",
          items: [
            { text: "Overzicht", link: "/nl-NL/reference/" },
            { text: "Configuratieschema", link: "/nl-NL/reference/config-yaml" },
            { text: "Workflow-DSL", link: "/nl-NL/reference/workflow-dsl" },
            { text: "Interfaces", link: "/nl-NL/reference/interfaces" },
            { text: "Woordenlijst", link: "/nl-NL/reference/glossary" },
          ],
        },
      ],
      "/nl-NL/support/": [
        {
          text: "Ondersteuningscentrum",
          items: [
            { text: "Overzicht", link: "/nl-NL/support/" },
            { text: "Veelgestelde vragen", link: "/nl-NL/support/faq" },
          ],
        },
        {
          text: "Probleemoplossing",
          items: [
            { text: "Begin hier", link: "/nl-NL/support/troubleshooting/" },
            {
              text: "Installatie",
              link: "/nl-NL/support/troubleshooting/installation",
            },
            { text: "Daemon", link: "/nl-NL/support/troubleshooting/daemon" },
            {
              text: "Configuratie",
              link: "/nl-NL/support/troubleshooting/configuration",
            },
            { text: "Kanalen", link: "/nl-NL/support/troubleshooting/channels" },
            {
              text: "LLM-providers",
              link: "/nl-NL/support/troubleshooting/providers",
            },
            {
              text: "Integraties",
              link: "/nl-NL/support/troubleshooting/integrations",
            },
            {
              text: "Browserautomatisering",
              link: "/nl-NL/support/troubleshooting/browser",
            },
            {
              text: "Beveiliging en classificatie",
              link: "/nl-NL/support/troubleshooting/security",
            },
            {
              text: "Geheimen en referenties",
              link: "/nl-NL/support/troubleshooting/secrets",
            },
            {
              text: "Workflows",
              link: "/nl-NL/support/troubleshooting/workflows",
            },
            {
              text: "Foutreferentie",
              link: "/nl-NL/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Handleidingen",
          items: [
            {
              text: "Logs verzamelen",
              link: "/nl-NL/support/guides/collecting-logs",
            },
            {
              text: "Diagnostiek uitvoeren",
              link: "/nl-NL/support/guides/diagnostics",
            },
            { text: "Problemen melden", link: "/nl-NL/support/guides/filing-issues" },
            {
              text: "Platformnotities",
              link: "/nl-NL/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Kennisbank",
          items: [
            {
              text: "Geheimensmigratie",
              link: "/nl-NL/support/kb/secrets-migration",
            },
            { text: "Zelfupdateproces", link: "/nl-NL/support/kb/self-update" },
            {
              text: "Belangrijke wijzigingen",
              link: "/nl-NL/support/kb/breaking-changes",
            },
            { text: "Bekende problemen", link: "/nl-NL/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "Bewerk deze pagina op GitHub",
    },
    footer: {
      message:
        'Uitgegeven onder de Apache 2.0-licentie. | <a href="/nl-NL/account">Account</a> | <a href="/nl-NL/privacy-policy">Privacybeleid</a> | <a href="/nl-NL/cookie-policy">Cookiebeleid</a> | <a href="/nl-NL/terms-of-service">Servicevoorwaarden</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Vorige pagina",
      next: "Volgende pagina",
    },
    lastUpdated: {
      text: "Laatst bijgewerkt",
    },
    outline: {
      label: "Op deze pagina",
    },
    returnToTopLabel: "Terug naar boven",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Thema",
    langMenuLabel: "Taal wijzigen",
    notFound: {
      title: "Pagina niet gevonden",
      quote:
        "De pagina die u zoekt bestaat niet of is verplaatst.",
      linkLabel: "Ga naar de startpagina",
      linkText: "Terug naar de startpagina",
      code: "404",
    },
  },
};
