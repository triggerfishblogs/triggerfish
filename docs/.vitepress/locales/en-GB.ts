import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const enGB: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "en-GB",
  label: "English (UK)",
  description:
    "Secure, multi-channel AI agent platform with deterministic policy enforcement below the LLM layer.",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/en-GB/guide/" },
      { text: "Pricing", link: "/en-GB/pricing" },
      { text: "Architecture", link: "/en-GB/architecture/" },
      { text: "Security", link: "/en-GB/security/" },
      { text: "Channels", link: "/en-GB/channels/" },
      { text: "Integrations", link: "/en-GB/integrations/" },
      { text: "Features", link: "/en-GB/features/" },
      { text: "Reference", link: "/en-GB/reference/" },
      { text: "Support", link: "/en-GB/support/" },
    ],
    sidebar: {
      "/en-GB/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Overview", link: "/en-GB/guide/" },
            {
              text: "Installation & Deployment",
              link: "/en-GB/guide/installation",
            },
            { text: "Quick Start", link: "/en-GB/guide/quickstart" },
            { text: "Configuration", link: "/en-GB/guide/configuration" },
            {
              text: "SPINE & Triggers",
              link: "/en-GB/guide/spine-and-triggers",
            },
            { text: "CLI Commands", link: "/en-GB/guide/commands" },
            {
              text: "Classification Guide",
              link: "/en-GB/guide/classification-guide",
            },
          ],
        },
      ],
      "/en-GB/architecture/": [
        {
          text: "Architecture",
          items: [
            { text: "Overview", link: "/en-GB/architecture/" },
            {
              text: "Classification System",
              link: "/en-GB/architecture/classification",
            },
            {
              text: "Policy Engine & Hooks",
              link: "/en-GB/architecture/policy-engine",
            },
            {
              text: "Sessions & Taint",
              link: "/en-GB/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/en-GB/architecture/gateway" },
            { text: "Storage", link: "/en-GB/architecture/storage" },
            {
              text: "Defence in Depth",
              link: "/en-GB/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/en-GB/security/": [
        {
          text: "Security Model",
          items: [
            { text: "Security-First Design", link: "/en-GB/security/" },
            {
              text: "No Write-Down Rule",
              link: "/en-GB/security/no-write-down",
            },
            { text: "Identity & Auth", link: "/en-GB/security/identity" },
            {
              text: "Agent Delegation",
              link: "/en-GB/security/agent-delegation",
            },
            { text: "Secrets Management", link: "/en-GB/security/secrets" },
            {
              text: "Audit & Compliance",
              link: "/en-GB/security/audit-logging",
            },
          ],
        },
        {
          text: "Trust & Compliance",
          items: [
            { text: "Trust Centre", link: "/en-GB/security/trust-center" },
            {
              text: "Responsible Disclosure",
              link: "/en-GB/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/en-GB/channels/": [
        {
          text: "Channels",
          items: [
            { text: "Overview", link: "/en-GB/channels/" },
            { text: "CLI", link: "/en-GB/channels/cli" },
            { text: "Telegram", link: "/en-GB/channels/telegram" },
            { text: "Slack", link: "/en-GB/channels/slack" },
            { text: "Discord", link: "/en-GB/channels/discord" },
            { text: "WhatsApp", link: "/en-GB/channels/whatsapp" },
            { text: "WebChat", link: "/en-GB/channels/webchat" },
            { text: "Email", link: "/en-GB/channels/email" },
            { text: "Signal", link: "/en-GB/channels/signal" },
            { text: "Google Chat", link: "/en-GB/channels/google-chat" },
          ],
        },
      ],
      "/en-GB/integrations/": [
        {
          text: "Integrations",
          items: [
            { text: "Overview", link: "/en-GB/integrations/" },
            {
              text: "MCP Gateway",
              link: "/en-GB/integrations/mcp-gateway",
            },
            { text: "Plugin SDK", link: "/en-GB/integrations/plugins" },
            {
              text: "Exec Environment",
              link: "/en-GB/integrations/exec-environment",
            },
            { text: "Skills", link: "/en-GB/integrations/skills" },
            {
              text: "Building Skills",
              link: "/en-GB/integrations/building-skills",
            },
            {
              text: "Browser Automation",
              link: "/en-GB/integrations/browser",
            },
            { text: "Webhooks", link: "/en-GB/integrations/webhooks" },
            { text: "GitHub", link: "/en-GB/integrations/github" },
            {
              text: "Google Workspace",
              link: "/en-GB/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/en-GB/integrations/obsidian" },
            { text: "CalDAV", link: "/en-GB/integrations/caldav" },
            { text: "Remote Access", link: "/en-GB/integrations/remote" },
          ],
        },
      ],
      "/en-GB/features/": [
        {
          text: "Features",
          items: [
            { text: "Overview", link: "/en-GB/features/" },
            {
              text: "Cron & Triggers",
              link: "/en-GB/features/cron-and-triggers",
            },
            { text: "Voice", link: "/en-GB/features/voice" },
            { text: "Tide Pool / A2UI", link: "/en-GB/features/tidepool" },
            {
              text: "Multi-Agent Routing",
              link: "/en-GB/features/multi-agent",
            },
            {
              text: "Model Failover",
              link: "/en-GB/features/model-failover",
            },
            {
              text: "Notifications",
              link: "/en-GB/features/notifications",
            },
            { text: "Logging", link: "/en-GB/features/logging" },
            { text: "Agent Teams", link: "/en-GB/features/agent-teams" },
            { text: "Workflows", link: "/en-GB/features/workflows" },
            {
              text: "Rate Limiting",
              link: "/en-GB/features/rate-limiting",
            },
            { text: "Explore", link: "/en-GB/features/explore" },
            { text: "Filesystem", link: "/en-GB/features/filesystem" },
            {
              text: "Image & Vision",
              link: "/en-GB/features/image-vision",
            },
            { text: "Memory", link: "/en-GB/features/memory" },
            { text: "Planning", link: "/en-GB/features/planning" },
            { text: "Sessions", link: "/en-GB/features/sessions" },
            { text: "Web Search", link: "/en-GB/features/web-search" },
            { text: "Subagents", link: "/en-GB/features/subagents" },
          ],
        },
      ],
      "/en-GB/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Overview", link: "/en-GB/reference/" },
            { text: "Config Schema", link: "/en-GB/reference/config-yaml" },
            { text: "Workflow DSL", link: "/en-GB/reference/workflow-dsl" },
            { text: "Interfaces", link: "/en-GB/reference/interfaces" },
            { text: "Glossary", link: "/en-GB/reference/glossary" },
          ],
        },
      ],
      "/en-GB/support/": [
        {
          text: "Support Centre",
          items: [
            { text: "Overview", link: "/en-GB/support/" },
            { text: "FAQ", link: "/en-GB/support/faq" },
          ],
        },
        {
          text: "Troubleshooting",
          items: [
            { text: "Start Here", link: "/en-GB/support/troubleshooting/" },
            {
              text: "Installation",
              link: "/en-GB/support/troubleshooting/installation",
            },
            {
              text: "Daemon",
              link: "/en-GB/support/troubleshooting/daemon",
            },
            {
              text: "Configuration",
              link: "/en-GB/support/troubleshooting/configuration",
            },
            {
              text: "Channels",
              link: "/en-GB/support/troubleshooting/channels",
            },
            {
              text: "LLM Providers",
              link: "/en-GB/support/troubleshooting/providers",
            },
            {
              text: "Integrations",
              link: "/en-GB/support/troubleshooting/integrations",
            },
            {
              text: "Browser Automation",
              link: "/en-GB/support/troubleshooting/browser",
            },
            {
              text: "Security & Classification",
              link: "/en-GB/support/troubleshooting/security",
            },
            {
              text: "Secrets & Credentials",
              link: "/en-GB/support/troubleshooting/secrets",
            },
            {
              text: "Workflows",
              link: "/en-GB/support/troubleshooting/workflows",
            },
            {
              text: "Error Reference",
              link: "/en-GB/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "How-To Guides",
          items: [
            {
              text: "Collecting Logs",
              link: "/en-GB/support/guides/collecting-logs",
            },
            {
              text: "Running Diagnostics",
              link: "/en-GB/support/guides/diagnostics",
            },
            {
              text: "Filing Issues",
              link: "/en-GB/support/guides/filing-issues",
            },
            {
              text: "Platform Notes",
              link: "/en-GB/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Knowledge Base",
          items: [
            {
              text: "Secrets Migration",
              link: "/en-GB/support/kb/secrets-migration",
            },
            {
              text: "Self-Update Process",
              link: "/en-GB/support/kb/self-update",
            },
            {
              text: "Breaking Changes",
              link: "/en-GB/support/kb/breaking-changes",
            },
            {
              text: "Known Issues",
              link: "/en-GB/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "Edit this page on GitHub",
    },
    footer: {
      message:
        'Released under the Apache 2.0 Licence. | <a href="/en-GB/account">Account</a> | <a href="/en-GB/privacy-policy">Privacy Policy</a> | <a href="/en-GB/cookie-policy">Cookie Policy</a> | <a href="/en-GB/terms-of-service">Terms of Service</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Previous page",
      next: "Next page",
    },
    lastUpdated: {
      text: "Last updated",
    },
    outline: {
      label: "On this page",
    },
    returnToTopLabel: "Return to top",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Appearance",
    langMenuLabel: "Change language",
    notFound: {
      title: "PAGE NOT FOUND",
      quote:
        "The page you're looking for doesn't exist or has been moved.",
      linkLabel: "Go to home",
      linkText: "Take me home",
      code: "404",
    },
  },
};
