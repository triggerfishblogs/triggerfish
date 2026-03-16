import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const nbNO: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "nb-NO",
  label: "Norsk",
  description:
    "Sikker, flerkanalplattform for AI-agenter med deterministisk policyhåndheving under LLM-laget.",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/nb-NO/guide/" },
      { text: "Priser", link: "/nb-NO/pricing" },
      {
        text: "Dokumentasjon",
        items: [
          { text: "Arkitektur", link: "/nb-NO/architecture/" },
          { text: "Sikkerhet", link: "/nb-NO/security/" },
          { text: "Kanaler", link: "/nb-NO/channels/" },
          { text: "Integrasjoner", link: "/nb-NO/integrations/" },
          { text: "Funksjoner", link: "/nb-NO/features/" },
          { text: "Referanse", link: "/nb-NO/reference/" },
        ],
      },
      { text: "Brukstilfeller", link: "/nb-NO/use-cases/enterprise/" },
      { text: "Støtte", link: "/nb-NO/support/" },
    ],
    sidebar: {
      "/nb-NO/use-cases/enterprise/": [
        {
          text: "Enterprise-brukstilfeller",
          items: [
            { text: "Oversikt", link: "/nb-NO/use-cases/enterprise/" },
            { text: "Cross-System Orchestration", link: "/nb-NO/use-cases/enterprise/cross-system-orchestration" },
            { text: "Ustrukturert dataingest", link: "/nb-NO/use-cases/enterprise/unstructured-data-ingestion" },
            { text: "Tredjeparts portalautomatisering", link: "/nb-NO/use-cases/enterprise/portal-automation" },
            { text: "AI-inferens i produksjon", link: "/nb-NO/use-cases/enterprise/ai-inference-in-production" },
          ],
        },
      ],
      "/nb-NO/guide/": [
        {
          text: "Kom i gang",
          items: [
            { text: "Oversikt", link: "/nb-NO/guide/" },
            { text: "Installasjon og distribusjon", link: "/nb-NO/guide/installation" },
            { text: "Hurtigstart", link: "/nb-NO/guide/quickstart" },
            { text: "Konfigurasjon", link: "/nb-NO/guide/configuration" },
            { text: "SPINE og Triggers", link: "/nb-NO/guide/spine-and-triggers" },
            { text: "CLI-kommandoer", link: "/nb-NO/guide/commands" },
            {
              text: "Klassifiseringsguide",
              link: "/nb-NO/guide/classification-guide",
            },
          ],
        },
      ],
      "/nb-NO/architecture/": [
        {
          text: "Arkitektur",
          items: [
            { text: "Oversikt", link: "/nb-NO/architecture/" },
            {
              text: "Klassifiseringssystem",
              link: "/nb-NO/architecture/classification",
            },
            {
              text: "Policymotor og Hooks",
              link: "/nb-NO/architecture/policy-engine",
            },
            {
              text: "Sesjoner og Taint",
              link: "/nb-NO/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/nb-NO/architecture/gateway" },
            { text: "Lagring", link: "/nb-NO/architecture/storage" },
            {
              text: "Dybdeforsvar",
              link: "/nb-NO/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/nb-NO/security/": [
        {
          text: "Sikkerhetsmodell",
          items: [
            { text: "Sikkerhet først-design", link: "/nb-NO/security/" },
            { text: "Nedskrivningsforbudsregel", link: "/nb-NO/security/no-write-down" },
            { text: "Identitet og autentisering", link: "/nb-NO/security/identity" },
            { text: "Agentdelegering", link: "/nb-NO/security/agent-delegation" },
            { text: "Hemmelighetsadministrasjon", link: "/nb-NO/security/secrets" },
            { text: "Revisjon og samsvar", link: "/nb-NO/security/audit-logging" },
          ],
        },
        {
          text: "Tillit og samsvar",
          items: [
            { text: "Tillitssenter", link: "/nb-NO/security/trust-center" },
            {
              text: "Ansvarlig offentliggjøring",
              link: "/nb-NO/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/nb-NO/channels/": [
        {
          text: "Kanaler",
          items: [
            { text: "Oversikt", link: "/nb-NO/channels/" },
            { text: "CLI", link: "/nb-NO/channels/cli" },
            { text: "Telegram", link: "/nb-NO/channels/telegram" },
            { text: "Slack", link: "/nb-NO/channels/slack" },
            { text: "Discord", link: "/nb-NO/channels/discord" },
            { text: "WhatsApp", link: "/nb-NO/channels/whatsapp" },
            { text: "WebChat", link: "/nb-NO/channels/webchat" },
            { text: "Email", link: "/nb-NO/channels/email" },
            { text: "Signal", link: "/nb-NO/channels/signal" },
            { text: "Google Chat", link: "/nb-NO/channels/google-chat" },
          ],
        },
      ],
      "/nb-NO/integrations/": [
        {
          text: "Integrasjoner",
          items: [
            { text: "Oversikt", link: "/nb-NO/integrations/" },
            { text: "MCP Gateway", link: "/nb-NO/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/nb-NO/integrations/plugins" },
            {
              text: "Kjøringsmiljø",
              link: "/nb-NO/integrations/exec-environment",
            },
            { text: "Skills", link: "/nb-NO/integrations/skills" },
            { text: "Bygg Skills", link: "/nb-NO/integrations/building-skills" },
            { text: "Nettleserautomatisering", link: "/nb-NO/integrations/browser" },
            { text: "Webhooks", link: "/nb-NO/integrations/webhooks" },
            { text: "GitHub", link: "/nb-NO/integrations/github" },
            {
              text: "Google Workspace",
              link: "/nb-NO/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/nb-NO/integrations/obsidian" },
            { text: "CalDAV", link: "/nb-NO/integrations/caldav" },
            { text: "Fjerntilgang", link: "/nb-NO/integrations/remote" },
          ],
        },
      ],
      "/nb-NO/features/": [
        {
          text: "Funksjoner",
          items: [
            { text: "Oversikt", link: "/nb-NO/features/" },
            { text: "Cron og Triggers", link: "/nb-NO/features/cron-and-triggers" },
            { text: "Stemme", link: "/nb-NO/features/voice" },
            { text: "Tide Pool / A2UI", link: "/nb-NO/features/tidepool" },
            { text: "Multiagent-ruting", link: "/nb-NO/features/multi-agent" },
            { text: "Modell-failover", link: "/nb-NO/features/model-failover" },
            { text: "Varsler", link: "/nb-NO/features/notifications" },
            { text: "Logging", link: "/nb-NO/features/logging" },
            { text: "Agentteam", link: "/nb-NO/features/agent-teams" },
            { text: "Arbeidsflyter", link: "/nb-NO/features/workflows" },
            { text: "Hastighetsbegrensning", link: "/nb-NO/features/rate-limiting" },
            { text: "Utforsk", link: "/nb-NO/features/explore" },
            { text: "Filsystem", link: "/nb-NO/features/filesystem" },
            { text: "Bilde og visjon", link: "/nb-NO/features/image-vision" },
            { text: "Minne", link: "/nb-NO/features/memory" },
            { text: "Planlegging", link: "/nb-NO/features/planning" },
            { text: "Sesjoner", link: "/nb-NO/features/sessions" },
            { text: "Nettsøk", link: "/nb-NO/features/web-search" },
            { text: "Subagenter", link: "/nb-NO/features/subagents" },
          ],
        },
      ],
      "/nb-NO/reference/": [
        {
          text: "Referanse",
          items: [
            { text: "Oversikt", link: "/nb-NO/reference/" },
            { text: "Konfigurasjonsskjema", link: "/nb-NO/reference/config-yaml" },
            { text: "Arbeidsflyt-DSL", link: "/nb-NO/reference/workflow-dsl" },
            { text: "Grensesnitt", link: "/nb-NO/reference/interfaces" },
            { text: "Ordliste", link: "/nb-NO/reference/glossary" },
          ],
        },
      ],
      "/nb-NO/support/": [
        {
          text: "Støttesenter",
          items: [
            { text: "Oversikt", link: "/nb-NO/support/" },
            { text: "Vanlige spørsmål", link: "/nb-NO/support/faq" },
          ],
        },
        {
          text: "Feilsøking",
          items: [
            { text: "Start her", link: "/nb-NO/support/troubleshooting/" },
            {
              text: "Installasjon",
              link: "/nb-NO/support/troubleshooting/installation",
            },
            { text: "Daemon", link: "/nb-NO/support/troubleshooting/daemon" },
            {
              text: "Konfigurasjon",
              link: "/nb-NO/support/troubleshooting/configuration",
            },
            { text: "Kanaler", link: "/nb-NO/support/troubleshooting/channels" },
            {
              text: "LLM-leverandører",
              link: "/nb-NO/support/troubleshooting/providers",
            },
            {
              text: "Integrasjoner",
              link: "/nb-NO/support/troubleshooting/integrations",
            },
            {
              text: "Nettleserautomatisering",
              link: "/nb-NO/support/troubleshooting/browser",
            },
            {
              text: "Sikkerhet og klassifisering",
              link: "/nb-NO/support/troubleshooting/security",
            },
            {
              text: "Hemmeligheter og legitimasjon",
              link: "/nb-NO/support/troubleshooting/secrets",
            },
            {
              text: "Arbeidsflyter",
              link: "/nb-NO/support/troubleshooting/workflows",
            },
            {
              text: "Feilreferanse",
              link: "/nb-NO/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Veiledninger",
          items: [
            {
              text: "Samle logger",
              link: "/nb-NO/support/guides/collecting-logs",
            },
            {
              text: "Kjør diagnostikk",
              link: "/nb-NO/support/guides/diagnostics",
            },
            { text: "Melde problemer", link: "/nb-NO/support/guides/filing-issues" },
            {
              text: "Plattformnotater",
              link: "/nb-NO/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Kunnskapsbase",
          items: [
            {
              text: "Hemmelighetsmigrasjon",
              link: "/nb-NO/support/kb/secrets-migration",
            },
            { text: "Selvoppdateringsprosess", link: "/nb-NO/support/kb/self-update" },
            {
              text: "Viktige endringer",
              link: "/nb-NO/support/kb/breaking-changes",
            },
            { text: "Kjente problemer", link: "/nb-NO/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "Rediger denne siden på GitHub",
    },
    footer: {
      message:
        'Utgitt under Apache 2.0-lisensen. | <a href="/nb-NO/account">Konto</a> | <a href="/nb-NO/privacy-policy">Personvernerklæring</a> | <a href="/nb-NO/cookie-policy">Informasjonskapsler</a> | <a href="/nb-NO/terms-of-service">Vilkår for bruk</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Forrige side",
      next: "Neste side",
    },
    lastUpdated: {
      text: "Sist oppdatert",
    },
    outline: {
      label: "På denne siden",
    },
    returnToTopLabel: "Tilbake til toppen",
    sidebarMenuLabel: "Meny",
    darkModeSwitchLabel: "Tema",
    langMenuLabel: "Bytt språk",
    notFound: {
      title: "Siden ble ikke funnet",
      quote:
        "Siden du leter etter finnes ikke eller har blitt flyttet.",
      linkLabel: "Gå til startsiden",
      linkText: "Tilbake til startsiden",
      code: "404",
    },
  },
};
