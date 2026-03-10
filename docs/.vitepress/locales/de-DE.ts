import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const deDE: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "de-DE",
  label: "Deutsch",
  description:
    "Sichere, mehrkanalige KI-Agentenplattform mit deterministischer Richtliniendurchsetzung unterhalb der LLM-Schicht.",
  themeConfig: {
    nav: [
      { text: "Anleitung", link: "/de-DE/guide/" },
      { text: "Preise", link: "/de-DE/pricing" },
      { text: "Architektur", link: "/de-DE/architecture/" },
      { text: "Sicherheit", link: "/de-DE/security/" },
      { text: "Kanäle", link: "/de-DE/channels/" },
      { text: "Integrationen", link: "/de-DE/integrations/" },
      { text: "Funktionen", link: "/de-DE/features/" },
      { text: "Referenz", link: "/de-DE/reference/" },
      { text: "Support", link: "/de-DE/support/" },
    ],
    sidebar: {
      "/de-DE/guide/": [
        {
          text: "Erste Schritte",
          items: [
            { text: "Übersicht", link: "/de-DE/guide/" },
            {
              text: "Installation und Bereitstellung",
              link: "/de-DE/guide/installation",
            },
            { text: "Schnellstart", link: "/de-DE/guide/quickstart" },
            { text: "Konfiguration", link: "/de-DE/guide/configuration" },
            {
              text: "SPINE und Triggers",
              link: "/de-DE/guide/spine-and-triggers",
            },
            { text: "CLI-Befehle", link: "/de-DE/guide/commands" },
            {
              text: "Klassifizierungsleitfaden",
              link: "/de-DE/guide/classification-guide",
            },
          ],
        },
      ],
      "/de-DE/architecture/": [
        {
          text: "Architektur",
          items: [
            { text: "Übersicht", link: "/de-DE/architecture/" },
            {
              text: "Klassifizierungssystem",
              link: "/de-DE/architecture/classification",
            },
            {
              text: "Richtlinien-Engine und Hooks",
              link: "/de-DE/architecture/policy-engine",
            },
            {
              text: "Sitzungen und Taint",
              link: "/de-DE/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/de-DE/architecture/gateway" },
            { text: "Speicher", link: "/de-DE/architecture/storage" },
            {
              text: "Tiefenverteidigung",
              link: "/de-DE/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/de-DE/security/": [
        {
          text: "Sicherheitsmodell",
          items: [
            {
              text: "Sicherheit-zuerst-Design",
              link: "/de-DE/security/",
            },
            {
              text: "Keine-Abwärtsschreibung-Regel",
              link: "/de-DE/security/no-write-down",
            },
            {
              text: "Identität und Authentifizierung",
              link: "/de-DE/security/identity",
            },
            {
              text: "Agenten-Delegierung",
              link: "/de-DE/security/agent-delegation",
            },
            {
              text: "Geheimnisverwaltung",
              link: "/de-DE/security/secrets",
            },
            {
              text: "Audit und Compliance",
              link: "/de-DE/security/audit-logging",
            },
          ],
        },
        {
          text: "Vertrauen und Compliance",
          items: [
            {
              text: "Vertrauenszentrum",
              link: "/de-DE/security/trust-center",
            },
            {
              text: "Verantwortungsvolle Offenlegung",
              link: "/de-DE/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/de-DE/channels/": [
        {
          text: "Kanäle",
          items: [
            { text: "Übersicht", link: "/de-DE/channels/" },
            { text: "CLI", link: "/de-DE/channels/cli" },
            { text: "Telegram", link: "/de-DE/channels/telegram" },
            { text: "Slack", link: "/de-DE/channels/slack" },
            { text: "Discord", link: "/de-DE/channels/discord" },
            { text: "WhatsApp", link: "/de-DE/channels/whatsapp" },
            { text: "WebChat", link: "/de-DE/channels/webchat" },
            { text: "Email", link: "/de-DE/channels/email" },
            { text: "Signal", link: "/de-DE/channels/signal" },
            { text: "Google Chat", link: "/de-DE/channels/google-chat" },
          ],
        },
      ],
      "/de-DE/integrations/": [
        {
          text: "Integrationen",
          items: [
            { text: "Übersicht", link: "/de-DE/integrations/" },
            {
              text: "MCP Gateway",
              link: "/de-DE/integrations/mcp-gateway",
            },
            { text: "Plugin SDK", link: "/de-DE/integrations/plugins" },
            {
              text: "Ausführungsumgebung",
              link: "/de-DE/integrations/exec-environment",
            },
            { text: "Skills", link: "/de-DE/integrations/skills" },
            {
              text: "Skills erstellen",
              link: "/de-DE/integrations/building-skills",
            },
            {
              text: "Browser-Automatisierung",
              link: "/de-DE/integrations/browser",
            },
            { text: "Webhooks", link: "/de-DE/integrations/webhooks" },
            { text: "GitHub", link: "/de-DE/integrations/github" },
            {
              text: "Google Workspace",
              link: "/de-DE/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/de-DE/integrations/obsidian" },
            { text: "CalDAV", link: "/de-DE/integrations/caldav" },
            { text: "Fernzugriff", link: "/de-DE/integrations/remote" },
          ],
        },
      ],
      "/de-DE/features/": [
        {
          text: "Funktionen",
          items: [
            { text: "Übersicht", link: "/de-DE/features/" },
            {
              text: "Cron und Triggers",
              link: "/de-DE/features/cron-and-triggers",
            },
            { text: "Sprache", link: "/de-DE/features/voice" },
            { text: "Tide Pool / A2UI", link: "/de-DE/features/tidepool" },
            {
              text: "Multi-Agenten-Routing",
              link: "/de-DE/features/multi-agent",
            },
            {
              text: "Modell-Failover",
              link: "/de-DE/features/model-failover",
            },
            {
              text: "Benachrichtigungen",
              link: "/de-DE/features/notifications",
            },
            { text: "Protokollierung", link: "/de-DE/features/logging" },
            {
              text: "Agenten-Teams",
              link: "/de-DE/features/agent-teams",
            },
            {
              text: "Workflows",
              link: "/de-DE/features/workflows",
            },
            {
              text: "Ratenbegrenzung",
              link: "/de-DE/features/rate-limiting",
            },
            { text: "Erkunden", link: "/de-DE/features/explore" },
            { text: "Dateisystem", link: "/de-DE/features/filesystem" },
            {
              text: "Bild und Vision",
              link: "/de-DE/features/image-vision",
            },
            { text: "Speicher", link: "/de-DE/features/memory" },
            { text: "Planung", link: "/de-DE/features/planning" },
            { text: "Sitzungen", link: "/de-DE/features/sessions" },
            { text: "Websuche", link: "/de-DE/features/web-search" },
            { text: "Unteragenten", link: "/de-DE/features/subagents" },
          ],
        },
      ],
      "/de-DE/reference/": [
        {
          text: "Referenz",
          items: [
            { text: "Übersicht", link: "/de-DE/reference/" },
            {
              text: "Konfigurationsschema",
              link: "/de-DE/reference/config-yaml",
            },
            {
              text: "Workflow-DSL",
              link: "/de-DE/reference/workflow-dsl",
            },
            { text: "Schnittstellen", link: "/de-DE/reference/interfaces" },
            { text: "Glossar", link: "/de-DE/reference/glossary" },
          ],
        },
      ],
      "/de-DE/support/": [
        {
          text: "Support-Center",
          items: [
            { text: "Übersicht", link: "/de-DE/support/" },
            { text: "FAQ", link: "/de-DE/support/faq" },
          ],
        },
        {
          text: "Fehlerbehebung",
          items: [
            {
              text: "Hier starten",
              link: "/de-DE/support/troubleshooting/",
            },
            {
              text: "Installation",
              link: "/de-DE/support/troubleshooting/installation",
            },
            {
              text: "Daemon",
              link: "/de-DE/support/troubleshooting/daemon",
            },
            {
              text: "Konfiguration",
              link: "/de-DE/support/troubleshooting/configuration",
            },
            {
              text: "Kanäle",
              link: "/de-DE/support/troubleshooting/channels",
            },
            {
              text: "LLM-Anbieter",
              link: "/de-DE/support/troubleshooting/providers",
            },
            {
              text: "Integrationen",
              link: "/de-DE/support/troubleshooting/integrations",
            },
            {
              text: "Browser-Automatisierung",
              link: "/de-DE/support/troubleshooting/browser",
            },
            {
              text: "Sicherheit und Klassifizierung",
              link: "/de-DE/support/troubleshooting/security",
            },
            {
              text: "Geheimnisse und Anmeldedaten",
              link: "/de-DE/support/troubleshooting/secrets",
            },
            {
              text: "Workflows",
              link: "/de-DE/support/troubleshooting/workflows",
            },
            {
              text: "Fehlerreferenz",
              link: "/de-DE/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Praxisleitfäden",
          items: [
            {
              text: "Logs sammeln",
              link: "/de-DE/support/guides/collecting-logs",
            },
            {
              text: "Diagnosen ausführen",
              link: "/de-DE/support/guides/diagnostics",
            },
            {
              text: "Probleme melden",
              link: "/de-DE/support/guides/filing-issues",
            },
            {
              text: "Plattformhinweise",
              link: "/de-DE/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Wissensdatenbank",
          items: [
            {
              text: "Geheimnisse-Migration",
              link: "/de-DE/support/kb/secrets-migration",
            },
            {
              text: "Selbstaktualisierungsprozess",
              link: "/de-DE/support/kb/self-update",
            },
            {
              text: "Inkompatible Änderungen",
              link: "/de-DE/support/kb/breaking-changes",
            },
            {
              text: "Bekannte Probleme",
              link: "/de-DE/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "Diese Seite auf GitHub bearbeiten",
    },
    footer: {
      message:
        'Veröffentlicht unter der Apache 2.0 Lizenz. | <a href="/de-DE/account">Konto</a> | <a href="/de-DE/privacy-policy">Datenschutzrichtlinie</a> | <a href="/de-DE/cookie-policy">Cookie-Richtlinie</a> | <a href="/de-DE/terms-of-service">Nutzungsbedingungen</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Vorherige Seite",
      next: "Nächste Seite",
    },
    lastUpdated: {
      text: "Zuletzt aktualisiert",
    },
    outline: {
      label: "Auf dieser Seite",
    },
    returnToTopLabel: "Zurück nach oben",
    sidebarMenuLabel: "Menü",
    darkModeSwitchLabel: "Erscheinungsbild",
    langMenuLabel: "Sprache ändern",
    notFound: {
      title: "SEITE NICHT GEFUNDEN",
      quote:
        "Die gesuchte Seite existiert nicht oder wurde verschoben.",
      linkLabel: "Zur Startseite",
      linkText: "Zurück zur Startseite",
      code: "404",
    },
  },
};
