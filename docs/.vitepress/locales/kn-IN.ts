import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const knIN: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "kn-IN",
  label: "ಕನ್ನಡ",
  description:
    "LLM ಪದರದ ಕೆಳಗೆ ನಿರ್ಣಾಯಕ ನೀತಿ ಜಾರಿಯೊಂದಿಗೆ ಸುರಕ್ಷಿತ, ಬಹು-ಚಾನೆಲ್ AI ಏಜೆಂಟ್ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್.",
  themeConfig: {
    nav: [
      { text: "ಮಾರ್ಗದರ್ಶಿ", link: "/kn-IN/guide/" },
      { text: "ಬೆಲೆ", link: "/kn-IN/pricing" },
      {
        text: "ದಾಖಲೆಗಳು",
        items: [
          { text: "ವಾಸ್ತುಶಿಲ್ಪ", link: "/kn-IN/architecture/" },
          { text: "ಭದ್ರತೆ", link: "/kn-IN/security/" },
          { text: "ಚಾನೆಲ್‌ಗಳು", link: "/kn-IN/channels/" },
          { text: "ಏಕೀಕರಣಗಳು", link: "/kn-IN/integrations/" },
          { text: "ವೈಶಿಷ್ಟ್ಯಗಳು", link: "/kn-IN/features/" },
          { text: "ಉಲ್ಲೇಖ", link: "/kn-IN/reference/" },
        ],
      },
      { text: "ಬೆಂಬಲ", link: "/kn-IN/support/" },
    ],
    sidebar: {
      "/kn-IN/guide/": [
        {
          text: "ಪ್ರಾರಂಭಿಸಿ",
          items: [
            { text: "ಅವಲೋಕನ", link: "/kn-IN/guide/" },
            { text: "ಸ್ಥಾಪನೆ ಮತ್ತು ನಿಯೋಜನೆ", link: "/kn-IN/guide/installation" },
            { text: "ತ್ವರಿತ ಆರಂಭ", link: "/kn-IN/guide/quickstart" },
            { text: "ಕಾನ್ಫಿಗರೇಶನ್", link: "/kn-IN/guide/configuration" },
            { text: "SPINE ಮತ್ತು Triggers", link: "/kn-IN/guide/spine-and-triggers" },
            { text: "CLI ಆಜ್ಞೆಗಳು", link: "/kn-IN/guide/commands" },
            {
              text: "ವರ್ಗೀಕರಣ ಮಾರ್ಗದರ್ಶಿ",
              link: "/kn-IN/guide/classification-guide",
            },
          ],
        },
      ],
      "/kn-IN/architecture/": [
        {
          text: "ವಾಸ್ತುಶಿಲ್ಪ",
          items: [
            { text: "ಅವಲೋಕನ", link: "/kn-IN/architecture/" },
            {
              text: "ವರ್ಗೀಕರಣ ವ್ಯವಸ್ಥೆ",
              link: "/kn-IN/architecture/classification",
            },
            {
              text: "ನೀತಿ ಎಂಜಿನ್ ಮತ್ತು Hooks",
              link: "/kn-IN/architecture/policy-engine",
            },
            {
              text: "ಅಧಿವೇಶನಗಳು ಮತ್ತು Taint",
              link: "/kn-IN/architecture/taint-and-sessions",
            },
            { text: "ಗೇಟ್‌ವೇ", link: "/kn-IN/architecture/gateway" },
            { text: "ಸಂಗ್ರಹಣೆ", link: "/kn-IN/architecture/storage" },
            {
              text: "ಆಳವಾದ ರಕ್ಷಣೆ",
              link: "/kn-IN/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/kn-IN/security/": [
        {
          text: "ಭದ್ರತಾ ಮಾದರಿ",
          items: [
            { text: "ಭದ್ರತೆ-ಮೊದಲ ವಿನ್ಯಾಸ", link: "/kn-IN/security/" },
            { text: "ಕೆಳಮಟ್ಟದ ಬರವಣಿಗೆ ನಿಷೇಧ ನಿಯಮ", link: "/kn-IN/security/no-write-down" },
            { text: "ಗುರುತು ಮತ್ತು ದೃಢೀಕರಣ", link: "/kn-IN/security/identity" },
            { text: "ಏಜೆಂಟ್ ನಿಯೋಗ", link: "/kn-IN/security/agent-delegation" },
            { text: "ರಹಸ್ಯ ನಿರ್ವಹಣೆ", link: "/kn-IN/security/secrets" },
            { text: "ಲೆಕ್ಕಪರಿಶೋಧನೆ ಮತ್ತು ಅನುಸರಣೆ", link: "/kn-IN/security/audit-logging" },
          ],
        },
        {
          text: "ವಿಶ್ವಾಸ ಮತ್ತು ಅನುಸರಣೆ",
          items: [
            { text: "ವಿಶ್ವಾಸ ಕೇಂದ್ರ", link: "/kn-IN/security/trust-center" },
            {
              text: "ಜವಾಬ್ದಾರಿಯುತ ಬಹಿರಂಗ",
              link: "/kn-IN/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/kn-IN/channels/": [
        {
          text: "ಚಾನೆಲ್‌ಗಳು",
          items: [
            { text: "ಅವಲೋಕನ", link: "/kn-IN/channels/" },
            { text: "CLI", link: "/kn-IN/channels/cli" },
            { text: "Telegram", link: "/kn-IN/channels/telegram" },
            { text: "Slack", link: "/kn-IN/channels/slack" },
            { text: "Discord", link: "/kn-IN/channels/discord" },
            { text: "WhatsApp", link: "/kn-IN/channels/whatsapp" },
            { text: "WebChat", link: "/kn-IN/channels/webchat" },
            { text: "Email", link: "/kn-IN/channels/email" },
            { text: "Signal", link: "/kn-IN/channels/signal" },
            { text: "Google Chat", link: "/kn-IN/channels/google-chat" },
          ],
        },
      ],
      "/kn-IN/integrations/": [
        {
          text: "ಏಕೀಕರಣಗಳು",
          items: [
            { text: "ಅವಲೋಕನ", link: "/kn-IN/integrations/" },
            { text: "MCP Gateway", link: "/kn-IN/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/kn-IN/integrations/plugins" },
            {
              text: "ಕಾರ್ಯಗತಗೊಳಿಸುವ ಪರಿಸರ",
              link: "/kn-IN/integrations/exec-environment",
            },
            { text: "Skills", link: "/kn-IN/integrations/skills" },
            { text: "Skills ನಿರ್ಮಾಣ", link: "/kn-IN/integrations/building-skills" },
            { text: "ಬ್ರೌಸರ್ ಸ್ವಯಂಚಾಲನೆ", link: "/kn-IN/integrations/browser" },
            { text: "Webhooks", link: "/kn-IN/integrations/webhooks" },
            { text: "GitHub", link: "/kn-IN/integrations/github" },
            {
              text: "Google Workspace",
              link: "/kn-IN/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/kn-IN/integrations/obsidian" },
            { text: "CalDAV", link: "/kn-IN/integrations/caldav" },
            { text: "ದೂರ ಪ್ರವೇಶ", link: "/kn-IN/integrations/remote" },
          ],
        },
      ],
      "/kn-IN/features/": [
        {
          text: "ವೈಶಿಷ್ಟ್ಯಗಳು",
          items: [
            { text: "ಅವಲೋಕನ", link: "/kn-IN/features/" },
            { text: "Cron ಮತ್ತು Triggers", link: "/kn-IN/features/cron-and-triggers" },
            { text: "ಧ್ವನಿ", link: "/kn-IN/features/voice" },
            { text: "Tide Pool / A2UI", link: "/kn-IN/features/tidepool" },
            { text: "ಬಹು-ಏಜೆಂಟ್ ರೂಟಿಂಗ್", link: "/kn-IN/features/multi-agent" },
            { text: "ಮಾದರಿ ಫೇಲ್‌ಓವರ್", link: "/kn-IN/features/model-failover" },
            { text: "ಅಧಿಸೂಚನೆಗಳು", link: "/kn-IN/features/notifications" },
            { text: "ಲಾಗಿಂಗ್", link: "/kn-IN/features/logging" },
            { text: "ಏಜೆಂಟ್ ತಂಡಗಳು", link: "/kn-IN/features/agent-teams" },
            { text: "ವರ್ಕ್‌ಫ್ಲೋಗಳು", link: "/kn-IN/features/workflows" },
            { text: "ದರ ಮಿತಿ", link: "/kn-IN/features/rate-limiting" },
            { text: "ಅನ್ವೇಷಣೆ", link: "/kn-IN/features/explore" },
            { text: "ಫೈಲ್ ಸಿಸ್ಟಮ್", link: "/kn-IN/features/filesystem" },
            { text: "ಚಿತ್ರ ಮತ್ತು ದೃಷ್ಟಿ", link: "/kn-IN/features/image-vision" },
            { text: "ಮೆಮೊರಿ", link: "/kn-IN/features/memory" },
            { text: "ಯೋಜನೆ", link: "/kn-IN/features/planning" },
            { text: "ಅಧಿವೇಶನಗಳು", link: "/kn-IN/features/sessions" },
            { text: "ವೆಬ್ ಹುಡುಕಾಟ", link: "/kn-IN/features/web-search" },
            { text: "ಉಪ ಏಜೆಂಟ್‌ಗಳು", link: "/kn-IN/features/subagents" },
          ],
        },
      ],
      "/kn-IN/reference/": [
        {
          text: "ಉಲ್ಲೇಖ",
          items: [
            { text: "ಅವಲೋಕನ", link: "/kn-IN/reference/" },
            { text: "ಕಾನ್ಫಿಗ್ ಸ್ಕೀಮಾ", link: "/kn-IN/reference/config-yaml" },
            { text: "ವರ್ಕ್‌ಫ್ಲೋ DSL", link: "/kn-IN/reference/workflow-dsl" },
            { text: "ಇಂಟರ್ಫೇಸ್‌ಗಳು", link: "/kn-IN/reference/interfaces" },
            { text: "ಪದಕೋಶ", link: "/kn-IN/reference/glossary" },
          ],
        },
      ],
      "/kn-IN/support/": [
        {
          text: "ಬೆಂಬಲ ಕೇಂದ್ರ",
          items: [
            { text: "ಅವಲೋಕನ", link: "/kn-IN/support/" },
            { text: "ಪದೇ ಪದೇ ಕೇಳುವ ಪ್ರಶ್ನೆಗಳು", link: "/kn-IN/support/faq" },
          ],
        },
        {
          text: "ಸಮಸ್ಯಾ ಪರಿಹಾರ",
          items: [
            { text: "ಇಲ್ಲಿ ಪ್ರಾರಂಭಿಸಿ", link: "/kn-IN/support/troubleshooting/" },
            {
              text: "ಸ್ಥಾಪನೆ",
              link: "/kn-IN/support/troubleshooting/installation",
            },
            { text: "ಡೀಮನ್", link: "/kn-IN/support/troubleshooting/daemon" },
            {
              text: "ಕಾನ್ಫಿಗರೇಶನ್",
              link: "/kn-IN/support/troubleshooting/configuration",
            },
            { text: "ಚಾನೆಲ್‌ಗಳು", link: "/kn-IN/support/troubleshooting/channels" },
            {
              text: "LLM ಪೂರೈಕೆದಾರರು",
              link: "/kn-IN/support/troubleshooting/providers",
            },
            {
              text: "ಏಕೀಕರಣಗಳು",
              link: "/kn-IN/support/troubleshooting/integrations",
            },
            {
              text: "ಬ್ರೌಸರ್ ಸ್ವಯಂಚಾಲನೆ",
              link: "/kn-IN/support/troubleshooting/browser",
            },
            {
              text: "ಭದ್ರತೆ ಮತ್ತು ವರ್ಗೀಕರಣ",
              link: "/kn-IN/support/troubleshooting/security",
            },
            {
              text: "ರಹಸ್ಯಗಳು ಮತ್ತು ರುಜುವಾತುಗಳು",
              link: "/kn-IN/support/troubleshooting/secrets",
            },
            {
              text: "ವರ್ಕ್‌ಫ್ಲೋಗಳು",
              link: "/kn-IN/support/troubleshooting/workflows",
            },
            {
              text: "ದೋಷ ಉಲ್ಲೇಖ",
              link: "/kn-IN/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "ಹೇಗೆ-ಮಾಡುವುದು ಮಾರ್ಗದರ್ಶಿಗಳು",
          items: [
            {
              text: "ಲಾಗ್ ಸಂಗ್ರಹಣೆ",
              link: "/kn-IN/support/guides/collecting-logs",
            },
            {
              text: "ರೋಗನಿರ್ಣಯ ನಡೆಸುವುದು",
              link: "/kn-IN/support/guides/diagnostics",
            },
            { text: "ಸಮಸ್ಯೆ ವರದಿ", link: "/kn-IN/support/guides/filing-issues" },
            {
              text: "ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಟಿಪ್ಪಣಿಗಳು",
              link: "/kn-IN/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "ಜ್ಞಾನ ಬೇಸ್",
          items: [
            {
              text: "ರಹಸ್ಯ ವಲಸೆ",
              link: "/kn-IN/support/kb/secrets-migration",
            },
            { text: "ಸ್ವಯಂ-ನವೀಕರಣ ಪ್ರಕ್ರಿಯೆ", link: "/kn-IN/support/kb/self-update" },
            {
              text: "ಮಹತ್ವದ ಬದಲಾವಣೆಗಳು",
              link: "/kn-IN/support/kb/breaking-changes",
            },
            { text: "ತಿಳಿದಿರುವ ಸಮಸ್ಯೆಗಳು", link: "/kn-IN/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "GitHub ನಲ್ಲಿ ಈ ಪುಟವನ್ನು ಸಂಪಾದಿಸಿ",
    },
    footer: {
      message:
        'Apache 2.0 ಪರವಾನಗಿಯಡಿ ಬಿಡುಗಡೆ. | <a href="/kn-IN/account">ಖಾತೆ</a> | <a href="/kn-IN/privacy-policy">ಗೌಪ್ಯತಾ ನೀತಿ</a> | <a href="/kn-IN/cookie-policy">ಕುಕೀ ನೀತಿ</a> | <a href="/kn-IN/terms-of-service">ಸೇವಾ ನಿಯಮಗಳು</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "ಹಿಂದಿನ ಪುಟ",
      next: "ಮುಂದಿನ ಪುಟ",
    },
    lastUpdated: {
      text: "ಕೊನೆಯ ನವೀಕರಣ",
    },
    outline: {
      label: "ಈ ಪುಟದಲ್ಲಿ",
    },
    returnToTopLabel: "ಮೇಲಕ್ಕೆ ಹಿಂತಿರುಗಿ",
    sidebarMenuLabel: "ಮೆನು",
    darkModeSwitchLabel: "ಥೀಮ್",
    langMenuLabel: "ಭಾಷೆ ಬದಲಿಸಿ",
    notFound: {
      title: "ಪುಟ ಕಂಡುಬಂದಿಲ್ಲ",
      quote:
        "ನೀವು ಹುಡುಕುತ್ತಿರುವ ಪುಟ ಅಸ್ತಿತ್ವದಲ್ಲಿಲ್ಲ ಅಥವಾ ಸ್ಥಳಾಂತರಗೊಂಡಿದೆ.",
      linkLabel: "ಮುಖಪುಟಕ್ಕೆ ಹೋಗಿ",
      linkText: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
      code: "404",
    },
  },
};
