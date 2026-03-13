import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const svSE: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "sv-SE",
  label: "Svenska",
  description:
    "Säker, flerkanalplattform för AI-agenter med deterministisk policytillämpning under LLM-lagret.",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/sv-SE/guide/" },
      { text: "Priser", link: "/sv-SE/pricing" },
      { text: "Arkitektur", link: "/sv-SE/architecture/" },
      { text: "Säkerhet", link: "/sv-SE/security/" },
      { text: "Kanaler", link: "/sv-SE/channels/" },
      { text: "Integrationer", link: "/sv-SE/integrations/" },
      { text: "Funktioner", link: "/sv-SE/features/" },
      { text: "Referens", link: "/sv-SE/reference/" },
      { text: "Support", link: "/sv-SE/support/" },
    ],
    sidebar: {
      "/sv-SE/guide/": [
        {
          text: "Kom igång",
          items: [
            { text: "Översikt", link: "/sv-SE/guide/" },
            { text: "Installation och distribution", link: "/sv-SE/guide/installation" },
            { text: "Snabbstart", link: "/sv-SE/guide/quickstart" },
            { text: "Konfiguration", link: "/sv-SE/guide/configuration" },
            { text: "SPINE och Triggers", link: "/sv-SE/guide/spine-and-triggers" },
            { text: "CLI-kommandon", link: "/sv-SE/guide/commands" },
            {
              text: "Klassificeringsguide",
              link: "/sv-SE/guide/classification-guide",
            },
          ],
        },
      ],
      "/sv-SE/architecture/": [
        {
          text: "Arkitektur",
          items: [
            { text: "Översikt", link: "/sv-SE/architecture/" },
            {
              text: "Klassificeringssystem",
              link: "/sv-SE/architecture/classification",
            },
            {
              text: "Policymotor och Hooks",
              link: "/sv-SE/architecture/policy-engine",
            },
            {
              text: "Sessioner och Taint",
              link: "/sv-SE/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/sv-SE/architecture/gateway" },
            { text: "Lagring", link: "/sv-SE/architecture/storage" },
            {
              text: "Djupförsvar",
              link: "/sv-SE/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/sv-SE/security/": [
        {
          text: "Säkerhetsmodell",
          items: [
            { text: "Säkerhet-först design", link: "/sv-SE/security/" },
            { text: "Nedskrivningsförbudsregel", link: "/sv-SE/security/no-write-down" },
            { text: "Identitet och autentisering", link: "/sv-SE/security/identity" },
            { text: "Agentdelegering", link: "/sv-SE/security/agent-delegation" },
            { text: "Hemlighetshantering", link: "/sv-SE/security/secrets" },
            { text: "Granskning och efterlevnad", link: "/sv-SE/security/audit-logging" },
          ],
        },
        {
          text: "Förtroende och efterlevnad",
          items: [
            { text: "Förtroendecenter", link: "/sv-SE/security/trust-center" },
            {
              text: "Ansvarsfull offentliggörande",
              link: "/sv-SE/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/sv-SE/channels/": [
        {
          text: "Kanaler",
          items: [
            { text: "Översikt", link: "/sv-SE/channels/" },
            { text: "CLI", link: "/sv-SE/channels/cli" },
            { text: "Telegram", link: "/sv-SE/channels/telegram" },
            { text: "Slack", link: "/sv-SE/channels/slack" },
            { text: "Discord", link: "/sv-SE/channels/discord" },
            { text: "WhatsApp", link: "/sv-SE/channels/whatsapp" },
            { text: "WebChat", link: "/sv-SE/channels/webchat" },
            { text: "Email", link: "/sv-SE/channels/email" },
            { text: "Signal", link: "/sv-SE/channels/signal" },
            { text: "Google Chat", link: "/sv-SE/channels/google-chat" },
          ],
        },
      ],
      "/sv-SE/integrations/": [
        {
          text: "Integrationer",
          items: [
            { text: "Översikt", link: "/sv-SE/integrations/" },
            { text: "MCP Gateway", link: "/sv-SE/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/sv-SE/integrations/plugins" },
            {
              text: "Körningsmiljö",
              link: "/sv-SE/integrations/exec-environment",
            },
            { text: "Skills", link: "/sv-SE/integrations/skills" },
            { text: "Bygga Skills", link: "/sv-SE/integrations/building-skills" },
            { text: "Webbläsarautomatisering", link: "/sv-SE/integrations/browser" },
            { text: "Webhooks", link: "/sv-SE/integrations/webhooks" },
            { text: "GitHub", link: "/sv-SE/integrations/github" },
            {
              text: "Google Workspace",
              link: "/sv-SE/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/sv-SE/integrations/obsidian" },
            { text: "CalDAV", link: "/sv-SE/integrations/caldav" },
            { text: "Fjärråtkomst", link: "/sv-SE/integrations/remote" },
          ],
        },
      ],
      "/sv-SE/features/": [
        {
          text: "Funktioner",
          items: [
            { text: "Översikt", link: "/sv-SE/features/" },
            { text: "Cron och Triggers", link: "/sv-SE/features/cron-and-triggers" },
            { text: "Röst", link: "/sv-SE/features/voice" },
            { text: "Tide Pool / A2UI", link: "/sv-SE/features/tidepool" },
            { text: "Multiagent-routing", link: "/sv-SE/features/multi-agent" },
            { text: "Modell-failover", link: "/sv-SE/features/model-failover" },
            { text: "Notifieringar", link: "/sv-SE/features/notifications" },
            { text: "Loggning", link: "/sv-SE/features/logging" },
            { text: "Agentteam", link: "/sv-SE/features/agent-teams" },
            { text: "Arbetsflöden", link: "/sv-SE/features/workflows" },
            { text: "Hastighetsbegränsning", link: "/sv-SE/features/rate-limiting" },
            { text: "Utforska", link: "/sv-SE/features/explore" },
            { text: "Filsystem", link: "/sv-SE/features/filesystem" },
            { text: "Bild och vision", link: "/sv-SE/features/image-vision" },
            { text: "Minne", link: "/sv-SE/features/memory" },
            { text: "Planering", link: "/sv-SE/features/planning" },
            { text: "Sessioner", link: "/sv-SE/features/sessions" },
            { text: "Webbsökning", link: "/sv-SE/features/web-search" },
            { text: "Subagenter", link: "/sv-SE/features/subagents" },
          ],
        },
      ],
      "/sv-SE/reference/": [
        {
          text: "Referens",
          items: [
            { text: "Översikt", link: "/sv-SE/reference/" },
            { text: "Konfigurationsschema", link: "/sv-SE/reference/config-yaml" },
            { text: "Arbetsflödes-DSL", link: "/sv-SE/reference/workflow-dsl" },
            { text: "Gränssnitt", link: "/sv-SE/reference/interfaces" },
            { text: "Ordlista", link: "/sv-SE/reference/glossary" },
          ],
        },
      ],
      "/sv-SE/support/": [
        {
          text: "Supportcenter",
          items: [
            { text: "Översikt", link: "/sv-SE/support/" },
            { text: "Vanliga frågor", link: "/sv-SE/support/faq" },
          ],
        },
        {
          text: "Felsökning",
          items: [
            { text: "Börja här", link: "/sv-SE/support/troubleshooting/" },
            {
              text: "Installation",
              link: "/sv-SE/support/troubleshooting/installation",
            },
            { text: "Daemon", link: "/sv-SE/support/troubleshooting/daemon" },
            {
              text: "Konfiguration",
              link: "/sv-SE/support/troubleshooting/configuration",
            },
            { text: "Kanaler", link: "/sv-SE/support/troubleshooting/channels" },
            {
              text: "LLM-leverantörer",
              link: "/sv-SE/support/troubleshooting/providers",
            },
            {
              text: "Integrationer",
              link: "/sv-SE/support/troubleshooting/integrations",
            },
            {
              text: "Webbläsarautomatisering",
              link: "/sv-SE/support/troubleshooting/browser",
            },
            {
              text: "Säkerhet och klassificering",
              link: "/sv-SE/support/troubleshooting/security",
            },
            {
              text: "Hemligheter och autentiseringsuppgifter",
              link: "/sv-SE/support/troubleshooting/secrets",
            },
            {
              text: "Arbetsflöden",
              link: "/sv-SE/support/troubleshooting/workflows",
            },
            {
              text: "Felreferens",
              link: "/sv-SE/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Guider",
          items: [
            {
              text: "Samla loggar",
              link: "/sv-SE/support/guides/collecting-logs",
            },
            {
              text: "Kör diagnostik",
              link: "/sv-SE/support/guides/diagnostics",
            },
            { text: "Rapportera problem", link: "/sv-SE/support/guides/filing-issues" },
            {
              text: "Plattformsanteckningar",
              link: "/sv-SE/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Kunskapsbas",
          items: [
            {
              text: "Hemlighetsmigration",
              link: "/sv-SE/support/kb/secrets-migration",
            },
            { text: "Självuppdateringsprocess", link: "/sv-SE/support/kb/self-update" },
            {
              text: "Viktiga ändringar",
              link: "/sv-SE/support/kb/breaking-changes",
            },
            { text: "Kända problem", link: "/sv-SE/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "Redigera denna sida på GitHub",
    },
    footer: {
      message:
        'Utgiven under Apache 2.0-licensen. | <a href="/sv-SE/account">Konto</a> | <a href="/sv-SE/privacy-policy">Integritetspolicy</a> | <a href="/sv-SE/cookie-policy">Cookiepolicy</a> | <a href="/sv-SE/terms-of-service">Användarvillkor</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Föregående sida",
      next: "Nästa sida",
    },
    lastUpdated: {
      text: "Senast uppdaterad",
    },
    outline: {
      label: "På denna sida",
    },
    returnToTopLabel: "Tillbaka till toppen",
    sidebarMenuLabel: "Meny",
    darkModeSwitchLabel: "Tema",
    langMenuLabel: "Byt språk",
    notFound: {
      title: "Sidan hittades inte",
      quote:
        "Sidan du letar efter finns inte eller har flyttats.",
      linkLabel: "Gå till startsidan",
      linkText: "Tillbaka till startsidan",
      code: "404",
    },
  },
};
