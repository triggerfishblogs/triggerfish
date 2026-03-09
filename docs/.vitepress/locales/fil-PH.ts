import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const filPH: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "fil-PH",
  label: "Filipino",
  description:
    "Ligtas, multi-channel na AI agent platform na may deterministikong pagpapatupad ng patakaran sa ilalim ng LLM layer.",
  themeConfig: {
    nav: [
      { text: "Gabay", link: "/fil-PH/guide/" },
      { text: "Presyo", link: "/fil-PH/pricing" },
      { text: "Arkitektura", link: "/fil-PH/architecture/" },
      { text: "Seguridad", link: "/fil-PH/security/" },
      { text: "Mga Channel", link: "/fil-PH/channels/" },
      { text: "Mga Integration", link: "/fil-PH/integrations/" },
      { text: "Mga Feature", link: "/fil-PH/features/" },
      { text: "Sanggunian", link: "/fil-PH/reference/" },
      { text: "Suporta", link: "/fil-PH/support/" },
    ],
    sidebar: {
      "/fil-PH/guide/": [
        {
          text: "Pagsisimula",
          items: [
            { text: "Pangkalahatang-tanaw", link: "/fil-PH/guide/" },
            {
              text: "Pag-install at Pag-deploy",
              link: "/fil-PH/guide/installation",
            },
            { text: "Mabilisang Simula", link: "/fil-PH/guide/quickstart" },
            { text: "Configuration", link: "/fil-PH/guide/configuration" },
            {
              text: "SPINE at Triggers",
              link: "/fil-PH/guide/spine-and-triggers",
            },
            { text: "Mga CLI Command", link: "/fil-PH/guide/commands" },
            {
              text: "Gabay sa Classification",
              link: "/fil-PH/guide/classification-guide",
            },
          ],
        },
      ],
      "/fil-PH/architecture/": [
        {
          text: "Arkitektura",
          items: [
            { text: "Pangkalahatang-tanaw", link: "/fil-PH/architecture/" },
            {
              text: "Sistema ng Classification",
              link: "/fil-PH/architecture/classification",
            },
            {
              text: "Policy Engine at Hooks",
              link: "/fil-PH/architecture/policy-engine",
            },
            {
              text: "Mga Session at Taint",
              link: "/fil-PH/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/fil-PH/architecture/gateway" },
            { text: "Storage", link: "/fil-PH/architecture/storage" },
            {
              text: "Malalimang Depensa",
              link: "/fil-PH/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/fil-PH/security/": [
        {
          text: "Modelo ng Seguridad",
          items: [
            {
              text: "Disenyo na Security-First",
              link: "/fil-PH/security/",
            },
            {
              text: "Panuntunan ng No Write-Down",
              link: "/fil-PH/security/no-write-down",
            },
            {
              text: "Pagkakakilanlan at Auth",
              link: "/fil-PH/security/identity",
            },
            {
              text: "Delegasyon ng Agent",
              link: "/fil-PH/security/agent-delegation",
            },
            {
              text: "Pamamahala ng mga Secret",
              link: "/fil-PH/security/secrets",
            },
            {
              text: "Audit at Pagsunod",
              link: "/fil-PH/security/audit-logging",
            },
          ],
        },
        {
          text: "Tiwala at Pagsunod",
          items: [
            { text: "Trust Center", link: "/fil-PH/security/trust-center" },
            {
              text: "Responsableng Pagsisiwalat",
              link: "/fil-PH/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/fil-PH/channels/": [
        {
          text: "Mga Channel",
          items: [
            { text: "Pangkalahatang-tanaw", link: "/fil-PH/channels/" },
            { text: "CLI", link: "/fil-PH/channels/cli" },
            { text: "Telegram", link: "/fil-PH/channels/telegram" },
            { text: "Slack", link: "/fil-PH/channels/slack" },
            { text: "Discord", link: "/fil-PH/channels/discord" },
            { text: "WhatsApp", link: "/fil-PH/channels/whatsapp" },
            { text: "WebChat", link: "/fil-PH/channels/webchat" },
            { text: "Email", link: "/fil-PH/channels/email" },
            { text: "Signal", link: "/fil-PH/channels/signal" },
            { text: "Google Chat", link: "/fil-PH/channels/google-chat" },
          ],
        },
      ],
      "/fil-PH/integrations/": [
        {
          text: "Mga Integration",
          items: [
            { text: "Pangkalahatang-tanaw", link: "/fil-PH/integrations/" },
            { text: "MCP Gateway", link: "/fil-PH/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/fil-PH/integrations/plugins" },
            {
              text: "Execution Environment",
              link: "/fil-PH/integrations/exec-environment",
            },
            { text: "Skills", link: "/fil-PH/integrations/skills" },
            {
              text: "Pagbuo ng mga Skill",
              link: "/fil-PH/integrations/building-skills",
            },
            {
              text: "Browser Automation",
              link: "/fil-PH/integrations/browser",
            },
            { text: "Webhooks", link: "/fil-PH/integrations/webhooks" },
            { text: "GitHub", link: "/fil-PH/integrations/github" },
            {
              text: "Google Workspace",
              link: "/fil-PH/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/fil-PH/integrations/obsidian" },
            { text: "CalDAV", link: "/fil-PH/integrations/caldav" },
            { text: "Remote Access", link: "/fil-PH/integrations/remote" },
          ],
        },
      ],
      "/fil-PH/features/": [
        {
          text: "Mga Feature",
          items: [
            { text: "Pangkalahatang-tanaw", link: "/fil-PH/features/" },
            {
              text: "Cron at Triggers",
              link: "/fil-PH/features/cron-and-triggers",
            },
            { text: "Boses", link: "/fil-PH/features/voice" },
            { text: "Tide Pool / A2UI", link: "/fil-PH/features/tidepool" },
            {
              text: "Multi-Agent Routing",
              link: "/fil-PH/features/multi-agent",
            },
            {
              text: "Model Failover",
              link: "/fil-PH/features/model-failover",
            },
            {
              text: "Mga Notipikasyon",
              link: "/fil-PH/features/notifications",
            },
            { text: "Logging", link: "/fil-PH/features/logging" },
            { text: "Mga Agent Team", link: "/fil-PH/features/agent-teams" },
            { text: "Rate Limiting", link: "/fil-PH/features/rate-limiting" },
            { text: "Tuklasin", link: "/fil-PH/features/explore" },
            { text: "Filesystem", link: "/fil-PH/features/filesystem" },
            {
              text: "Larawan at Vision",
              link: "/fil-PH/features/image-vision",
            },
            { text: "Memory", link: "/fil-PH/features/memory" },
            { text: "Pagpaplano", link: "/fil-PH/features/planning" },
            { text: "Mga Session", link: "/fil-PH/features/sessions" },
            { text: "Web Search", link: "/fil-PH/features/web-search" },
            { text: "Mga Subagent", link: "/fil-PH/features/subagents" },
          ],
        },
      ],
      "/fil-PH/reference/": [
        {
          text: "Sanggunian",
          items: [
            { text: "Pangkalahatang-tanaw", link: "/fil-PH/reference/" },
            { text: "Config Schema", link: "/fil-PH/reference/config-yaml" },
            { text: "Mga Interface", link: "/fil-PH/reference/interfaces" },
            { text: "Talasalitaan", link: "/fil-PH/reference/glossary" },
          ],
        },
      ],
      "/fil-PH/support/": [
        {
          text: "Sentro ng Suporta",
          items: [
            { text: "Pangkalahatang-tanaw", link: "/fil-PH/support/" },
            { text: "Mga Madalas Itanong", link: "/fil-PH/support/faq" },
          ],
        },
        {
          text: "Troubleshooting",
          items: [
            {
              text: "Magsimula Dito",
              link: "/fil-PH/support/troubleshooting/",
            },
            {
              text: "Pag-install",
              link: "/fil-PH/support/troubleshooting/installation",
            },
            {
              text: "Daemon",
              link: "/fil-PH/support/troubleshooting/daemon",
            },
            {
              text: "Configuration",
              link: "/fil-PH/support/troubleshooting/configuration",
            },
            {
              text: "Mga Channel",
              link: "/fil-PH/support/troubleshooting/channels",
            },
            {
              text: "Mga LLM Provider",
              link: "/fil-PH/support/troubleshooting/providers",
            },
            {
              text: "Mga Integration",
              link: "/fil-PH/support/troubleshooting/integrations",
            },
            {
              text: "Browser Automation",
              link: "/fil-PH/support/troubleshooting/browser",
            },
            {
              text: "Seguridad at Classification",
              link: "/fil-PH/support/troubleshooting/security",
            },
            {
              text: "Mga Secret at Credential",
              link: "/fil-PH/support/troubleshooting/secrets",
            },
            {
              text: "Sanggunian ng mga Error",
              link: "/fil-PH/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Mga Gabay",
          items: [
            {
              text: "Pangongolekta ng mga Log",
              link: "/fil-PH/support/guides/collecting-logs",
            },
            {
              text: "Pagpapatakbo ng Diagnostics",
              link: "/fil-PH/support/guides/diagnostics",
            },
            {
              text: "Pag-file ng mga Issue",
              link: "/fil-PH/support/guides/filing-issues",
            },
            {
              text: "Mga Tala sa Platform",
              link: "/fil-PH/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Knowledge Base",
          items: [
            {
              text: "Paglilipat ng mga Secret",
              link: "/fil-PH/support/kb/secrets-migration",
            },
            {
              text: "Proseso ng Self-Update",
              link: "/fil-PH/support/kb/self-update",
            },
            {
              text: "Mga Breaking Change",
              link: "/fil-PH/support/kb/breaking-changes",
            },
            {
              text: "Mga Kilalang Issue",
              link: "/fil-PH/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "I-edit ang pahinang ito sa GitHub",
    },
    footer: {
      message:
        'Inilabas sa ilalim ng Apache 2.0 License. | <a href="/fil-PH/account">Account</a> | <a href="/fil-PH/privacy-policy">Patakaran sa Privacy</a> | <a href="/fil-PH/cookie-policy">Patakaran sa Cookie</a> | <a href="/fil-PH/terms-of-service">Mga Tuntunin ng Serbisyo</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Nakaraang pahina",
      next: "Susunod na pahina",
    },
    lastUpdated: {
      text: "Huling na-update",
    },
    outline: {
      label: "Sa pahinang ito",
    },
    returnToTopLabel: "Bumalik sa itaas",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Hitsura",
    langMenuLabel: "Baguhin ang wika",
    notFound: {
      title: "HINDI NATAGPUAN ANG PAHINA",
      quote:
        "Ang pahina na hinahanap mo ay hindi umiiral o inilipat na.",
      linkLabel: "Pumunta sa home",
      linkText: "Dalhin ako sa home",
      code: "404",
    },
  },
};
