import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Triggerfish",
  description:
    "Secure, multi-channel AI agent platform with deterministic policy enforcement below the LLM layer.",
  lang: "en-US",
  appearance: "force-dark",

  head: [
    ["link", { rel: "icon", type: "image/png", href: "/triggerfish.png" }],

    // OpenGraph
    ["meta", {
      property: "og:title",
      content: "Triggerfish — Secure AI Agents",
    }],
    ["meta", {
      property: "og:description",
      content:
        "A secure, multi-channel AI agent platform with deterministic policy enforcement below the LLM layer. Every channel. No exceptions.",
    }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:url", content: "https://trigger.fish" }],
    ["meta", { property: "og:site_name", content: "Triggerfish" }],
    ["meta", {
      property: "og:image",
      content: "https://trigger.fish/og-image.png",
    }],
    ["meta", {
      property: "og:image:alt",
      content: "Triggerfish — secure AI agent platform",
    }],
    ["meta", { property: "og:image:width", content: "1200" }],
    ["meta", { property: "og:image:height", content: "630" }],

    // Twitter Card
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", {
      name: "twitter:title",
      content: "Triggerfish — Secure AI Agents",
    }],
    ["meta", {
      name: "twitter:description",
      content:
        "A secure, multi-channel AI agent platform with deterministic policy enforcement below the LLM layer. Every channel. No exceptions.",
    }],
    ["meta", {
      name: "twitter:image",
      content: "https://trigger.fish/og-image.png",
    }],
    ["meta", {
      name: "twitter:image:alt",
      content: "Triggerfish — secure AI agent platform",
    }],

    // Termly consent banner (must be after meta tags to avoid blocking crawlers)
    ["script", {
      src: "https://app.termly.io/resource-blocker/00bdb41e-67d7-4026-a802-0edd02329f10?autoBlock=on",
    }],
  ],

  themeConfig: {
    logo: { src: "/triggerfish.png", alt: "Triggerfish" },
    siteTitle: "Triggerfish",

    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "Pricing", link: "/pricing" },
      { text: "Architecture", link: "/architecture/" },
      { text: "Security", link: "/security/" },
      { text: "Channels", link: "/channels/" },
      { text: "Integrations", link: "/integrations/" },
      { text: "Features", link: "/features/" },
      { text: "Reference", link: "/reference/" },
      { text: "Support", link: "/support/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Overview", link: "/guide/" },
            { text: "Installation & Deployment", link: "/guide/installation" },
            { text: "Quick Start", link: "/guide/quickstart" },
            { text: "Configuration", link: "/guide/configuration" },
            { text: "SPINE & Triggers", link: "/guide/spine-and-triggers" },
            { text: "CLI Commands", link: "/guide/commands" },
            {
              text: "Classification Guide",
              link: "/guide/classification-guide",
            },
          ],
        },
      ],
      "/architecture/": [
        {
          text: "Architecture",
          items: [
            { text: "Overview", link: "/architecture/" },
            {
              text: "Classification System",
              link: "/architecture/classification",
            },
            {
              text: "Policy Engine & Hooks",
              link: "/architecture/policy-engine",
            },
            {
              text: "Sessions & Taint",
              link: "/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/architecture/gateway" },
            { text: "Storage", link: "/architecture/storage" },
            {
              text: "Defense in Depth",
              link: "/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/security/": [
        {
          text: "Security Model",
          items: [
            { text: "Security-First Design", link: "/security/" },
            { text: "No Write-Down Rule", link: "/security/no-write-down" },
            { text: "Identity & Auth", link: "/security/identity" },
            { text: "Agent Delegation", link: "/security/agent-delegation" },
            { text: "Secrets Management", link: "/security/secrets" },
            { text: "Audit & Compliance", link: "/security/audit-logging" },
          ],
        },
        {
          text: "Trust & Compliance",
          items: [
            { text: "Trust Center", link: "/security/trust-center" },
            {
              text: "Responsible Disclosure",
              link: "/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/channels/": [
        {
          text: "Channels",
          items: [
            { text: "Overview", link: "/channels/" },
            { text: "CLI", link: "/channels/cli" },
            { text: "Telegram", link: "/channels/telegram" },
            { text: "Slack", link: "/channels/slack" },
            { text: "Discord", link: "/channels/discord" },
            { text: "WhatsApp", link: "/channels/whatsapp" },
            { text: "WebChat", link: "/channels/webchat" },
            { text: "Email", link: "/channels/email" },
            { text: "Signal", link: "/channels/signal" },
            { text: "Google Chat", link: "/channels/google-chat" },
          ],
        },
      ],
      "/integrations/": [
        {
          text: "Integrations",
          items: [
            { text: "Overview", link: "/integrations/" },
            { text: "MCP Gateway", link: "/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/integrations/plugins" },
            {
              text: "Exec Environment",
              link: "/integrations/exec-environment",
            },
            { text: "Skills", link: "/integrations/skills" },
            { text: "Building Skills", link: "/integrations/building-skills" },
            { text: "Browser Automation", link: "/integrations/browser" },
            { text: "Webhooks", link: "/integrations/webhooks" },
            { text: "GitHub", link: "/integrations/github" },
            {
              text: "Google Workspace",
              link: "/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/integrations/obsidian" },
            { text: "CalDAV", link: "/integrations/caldav" },
            { text: "Remote Access", link: "/integrations/remote" },
          ],
        },
      ],
      "/features/": [
        {
          text: "Features",
          items: [
            { text: "Overview", link: "/features/" },
            { text: "Cron & Triggers", link: "/features/cron-and-triggers" },
            { text: "Voice", link: "/features/voice" },
            { text: "Tide Pool / A2UI", link: "/features/tidepool" },
            { text: "Multi-Agent Routing", link: "/features/multi-agent" },
            { text: "Model Failover", link: "/features/model-failover" },
            { text: "Notifications", link: "/features/notifications" },
            { text: "Logging", link: "/features/logging" },
            { text: "Agent Teams", link: "/features/agent-teams" },
            { text: "Rate Limiting", link: "/features/rate-limiting" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Overview", link: "/reference/" },
            { text: "Config Schema", link: "/reference/config-yaml" },
            { text: "Interfaces", link: "/reference/interfaces" },
            { text: "Glossary", link: "/reference/glossary" },
          ],
        },
      ],
      "/support/": [
        {
          text: "Support Center",
          items: [
            { text: "Overview", link: "/support/" },
            { text: "FAQ", link: "/support/faq" },
          ],
        },
        {
          text: "Troubleshooting",
          items: [
            { text: "Start Here", link: "/support/troubleshooting/" },
            {
              text: "Installation",
              link: "/support/troubleshooting/installation",
            },
            { text: "Daemon", link: "/support/troubleshooting/daemon" },
            {
              text: "Configuration",
              link: "/support/troubleshooting/configuration",
            },
            { text: "Channels", link: "/support/troubleshooting/channels" },
            {
              text: "LLM Providers",
              link: "/support/troubleshooting/providers",
            },
            {
              text: "Integrations",
              link: "/support/troubleshooting/integrations",
            },
            {
              text: "Browser Automation",
              link: "/support/troubleshooting/browser",
            },
            {
              text: "Security & Classification",
              link: "/support/troubleshooting/security",
            },
            {
              text: "Secrets & Credentials",
              link: "/support/troubleshooting/secrets",
            },
            {
              text: "Error Reference",
              link: "/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "How-To Guides",
          items: [
            {
              text: "Collecting Logs",
              link: "/support/guides/collecting-logs",
            },
            {
              text: "Running Diagnostics",
              link: "/support/guides/diagnostics",
            },
            { text: "Filing Issues", link: "/support/guides/filing-issues" },
            {
              text: "Platform Notes",
              link: "/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Knowledge Base",
          items: [
            {
              text: "Secrets Migration",
              link: "/support/kb/secrets-migration",
            },
            { text: "Self-Update Process", link: "/support/kb/self-update" },
            {
              text: "Breaking Changes",
              link: "/support/kb/breaking-changes",
            },
            { text: "Known Issues", link: "/support/kb/known-issues" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/greghavens/triggerfish" },
    ],

    footer: {
      message:
        'Released under the Apache 2.0 License. | <a href="/account">Account</a> | <a href="/privacy-policy">Privacy Policy</a> | <a href="/cookie-policy">Cookie Policy</a> | <a href="/terms-of-service">Terms of Service</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },

    search: {
      provider: "local",
    },

    editLink: {
      pattern:
        "https://github.com/greghavens/triggerfish/edit/master/docs/:path",
      text: "Edit this page on GitHub",
    },
  },

  markdown: {
    theme: "github-dark",
  },
});
