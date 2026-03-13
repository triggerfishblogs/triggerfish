import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const msMY: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "ms-MY",
  label: "Bahasa Melayu",
  description:
    "Platform ejen AI berbilang saluran yang selamat dengan penguatkuasaan dasar deterministik di bawah lapisan LLM.",
  themeConfig: {
    nav: [
      { text: "Panduan", link: "/ms-MY/guide/" },
      { text: "Harga", link: "/ms-MY/pricing" },
      { text: "Seni Bina", link: "/ms-MY/architecture/" },
      { text: "Keselamatan", link: "/ms-MY/security/" },
      { text: "Saluran", link: "/ms-MY/channels/" },
      { text: "Integrasi", link: "/ms-MY/integrations/" },
      { text: "Ciri-ciri", link: "/ms-MY/features/" },
      { text: "Rujukan", link: "/ms-MY/reference/" },
      { text: "Sokongan", link: "/ms-MY/support/" },
    ],
    sidebar: {
      "/ms-MY/guide/": [
        {
          text: "Bermula",
          items: [
            { text: "Gambaran Keseluruhan", link: "/ms-MY/guide/" },
            { text: "Pemasangan dan Penerapan", link: "/ms-MY/guide/installation" },
            { text: "Mula Pantas", link: "/ms-MY/guide/quickstart" },
            { text: "Konfigurasi", link: "/ms-MY/guide/configuration" },
            { text: "SPINE dan Triggers", link: "/ms-MY/guide/spine-and-triggers" },
            { text: "Arahan CLI", link: "/ms-MY/guide/commands" },
            {
              text: "Panduan Pengelasan",
              link: "/ms-MY/guide/classification-guide",
            },
          ],
        },
      ],
      "/ms-MY/architecture/": [
        {
          text: "Seni Bina",
          items: [
            { text: "Gambaran Keseluruhan", link: "/ms-MY/architecture/" },
            {
              text: "Sistem Pengelasan",
              link: "/ms-MY/architecture/classification",
            },
            {
              text: "Enjin Dasar dan Hooks",
              link: "/ms-MY/architecture/policy-engine",
            },
            {
              text: "Sesi dan Taint",
              link: "/ms-MY/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/ms-MY/architecture/gateway" },
            { text: "Storan", link: "/ms-MY/architecture/storage" },
            {
              text: "Pertahanan Mendalam",
              link: "/ms-MY/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/ms-MY/security/": [
        {
          text: "Model Keselamatan",
          items: [
            { text: "Reka Bentuk Keselamatan-Utama", link: "/ms-MY/security/" },
            { text: "Peraturan Larangan Tulis-Turun", link: "/ms-MY/security/no-write-down" },
            { text: "Identiti dan Pengesahan", link: "/ms-MY/security/identity" },
            { text: "Delegasi Ejen", link: "/ms-MY/security/agent-delegation" },
            { text: "Pengurusan Rahsia", link: "/ms-MY/security/secrets" },
            { text: "Audit dan Pematuhan", link: "/ms-MY/security/audit-logging" },
          ],
        },
        {
          text: "Kepercayaan dan Pematuhan",
          items: [
            { text: "Pusat Kepercayaan", link: "/ms-MY/security/trust-center" },
            {
              text: "Pendedahan Bertanggungjawab",
              link: "/ms-MY/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/ms-MY/channels/": [
        {
          text: "Saluran",
          items: [
            { text: "Gambaran Keseluruhan", link: "/ms-MY/channels/" },
            { text: "CLI", link: "/ms-MY/channels/cli" },
            { text: "Telegram", link: "/ms-MY/channels/telegram" },
            { text: "Slack", link: "/ms-MY/channels/slack" },
            { text: "Discord", link: "/ms-MY/channels/discord" },
            { text: "WhatsApp", link: "/ms-MY/channels/whatsapp" },
            { text: "WebChat", link: "/ms-MY/channels/webchat" },
            { text: "Email", link: "/ms-MY/channels/email" },
            { text: "Signal", link: "/ms-MY/channels/signal" },
            { text: "Google Chat", link: "/ms-MY/channels/google-chat" },
          ],
        },
      ],
      "/ms-MY/integrations/": [
        {
          text: "Integrasi",
          items: [
            { text: "Gambaran Keseluruhan", link: "/ms-MY/integrations/" },
            { text: "MCP Gateway", link: "/ms-MY/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/ms-MY/integrations/plugins" },
            {
              text: "Persekitaran Pelaksanaan",
              link: "/ms-MY/integrations/exec-environment",
            },
            { text: "Skills", link: "/ms-MY/integrations/skills" },
            { text: "Membina Skills", link: "/ms-MY/integrations/building-skills" },
            { text: "Automasi Pelayar", link: "/ms-MY/integrations/browser" },
            { text: "Webhooks", link: "/ms-MY/integrations/webhooks" },
            { text: "GitHub", link: "/ms-MY/integrations/github" },
            {
              text: "Google Workspace",
              link: "/ms-MY/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/ms-MY/integrations/obsidian" },
            { text: "CalDAV", link: "/ms-MY/integrations/caldav" },
            { text: "Akses Jauh", link: "/ms-MY/integrations/remote" },
          ],
        },
      ],
      "/ms-MY/features/": [
        {
          text: "Ciri-ciri",
          items: [
            { text: "Gambaran Keseluruhan", link: "/ms-MY/features/" },
            { text: "Cron dan Triggers", link: "/ms-MY/features/cron-and-triggers" },
            { text: "Suara", link: "/ms-MY/features/voice" },
            { text: "Tide Pool / A2UI", link: "/ms-MY/features/tidepool" },
            { text: "Penghalaan Berbilang Ejen", link: "/ms-MY/features/multi-agent" },
            { text: "Failover Model", link: "/ms-MY/features/model-failover" },
            { text: "Pemberitahuan", link: "/ms-MY/features/notifications" },
            { text: "Pengelogan", link: "/ms-MY/features/logging" },
            { text: "Pasukan Ejen", link: "/ms-MY/features/agent-teams" },
            { text: "Aliran Kerja", link: "/ms-MY/features/workflows" },
            { text: "Had Kadar", link: "/ms-MY/features/rate-limiting" },
            { text: "Teroka", link: "/ms-MY/features/explore" },
            { text: "Sistem Fail", link: "/ms-MY/features/filesystem" },
            { text: "Imej dan Penglihatan", link: "/ms-MY/features/image-vision" },
            { text: "Memori", link: "/ms-MY/features/memory" },
            { text: "Perancangan", link: "/ms-MY/features/planning" },
            { text: "Sesi", link: "/ms-MY/features/sessions" },
            { text: "Carian Web", link: "/ms-MY/features/web-search" },
            { text: "Sub-ejen", link: "/ms-MY/features/subagents" },
          ],
        },
      ],
      "/ms-MY/reference/": [
        {
          text: "Rujukan",
          items: [
            { text: "Gambaran Keseluruhan", link: "/ms-MY/reference/" },
            { text: "Skema Konfigurasi", link: "/ms-MY/reference/config-yaml" },
            { text: "DSL Aliran Kerja", link: "/ms-MY/reference/workflow-dsl" },
            { text: "Antara Muka", link: "/ms-MY/reference/interfaces" },
            { text: "Glosari", link: "/ms-MY/reference/glossary" },
          ],
        },
      ],
      "/ms-MY/support/": [
        {
          text: "Pusat Sokongan",
          items: [
            { text: "Gambaran Keseluruhan", link: "/ms-MY/support/" },
            { text: "Soalan Lazim", link: "/ms-MY/support/faq" },
          ],
        },
        {
          text: "Penyelesaian Masalah",
          items: [
            { text: "Mula Di Sini", link: "/ms-MY/support/troubleshooting/" },
            {
              text: "Pemasangan",
              link: "/ms-MY/support/troubleshooting/installation",
            },
            { text: "Daemon", link: "/ms-MY/support/troubleshooting/daemon" },
            {
              text: "Konfigurasi",
              link: "/ms-MY/support/troubleshooting/configuration",
            },
            { text: "Saluran", link: "/ms-MY/support/troubleshooting/channels" },
            {
              text: "Pembekal LLM",
              link: "/ms-MY/support/troubleshooting/providers",
            },
            {
              text: "Integrasi",
              link: "/ms-MY/support/troubleshooting/integrations",
            },
            {
              text: "Automasi Pelayar",
              link: "/ms-MY/support/troubleshooting/browser",
            },
            {
              text: "Keselamatan dan Pengelasan",
              link: "/ms-MY/support/troubleshooting/security",
            },
            {
              text: "Rahsia dan Kelayakan",
              link: "/ms-MY/support/troubleshooting/secrets",
            },
            {
              text: "Aliran Kerja",
              link: "/ms-MY/support/troubleshooting/workflows",
            },
            {
              text: "Rujukan Ralat",
              link: "/ms-MY/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Panduan Cara",
          items: [
            {
              text: "Mengumpul Log",
              link: "/ms-MY/support/guides/collecting-logs",
            },
            {
              text: "Menjalankan Diagnostik",
              link: "/ms-MY/support/guides/diagnostics",
            },
            { text: "Melaporkan Isu", link: "/ms-MY/support/guides/filing-issues" },
            {
              text: "Nota Platform",
              link: "/ms-MY/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Pangkalan Pengetahuan",
          items: [
            {
              text: "Penghijrahan Rahsia",
              link: "/ms-MY/support/kb/secrets-migration",
            },
            { text: "Proses Kemas Kini Sendiri", link: "/ms-MY/support/kb/self-update" },
            {
              text: "Perubahan Penting",
              link: "/ms-MY/support/kb/breaking-changes",
            },
            { text: "Isu Diketahui", link: "/ms-MY/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "Sunting halaman ini di GitHub",
    },
    footer: {
      message:
        'Dikeluarkan di bawah Lesen Apache 2.0. | <a href="/ms-MY/account">Akaun</a> | <a href="/ms-MY/privacy-policy">Dasar Privasi</a> | <a href="/ms-MY/cookie-policy">Dasar Kuki</a> | <a href="/ms-MY/terms-of-service">Terma Perkhidmatan</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Halaman Sebelumnya",
      next: "Halaman Seterusnya",
    },
    lastUpdated: {
      text: "Kemas kini terakhir",
    },
    outline: {
      label: "Di halaman ini",
    },
    returnToTopLabel: "Kembali ke atas",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Tema",
    langMenuLabel: "Tukar bahasa",
    notFound: {
      title: "Halaman tidak ditemui",
      quote:
        "Halaman yang anda cari tidak wujud atau telah dipindahkan.",
      linkLabel: "Pergi ke laman utama",
      linkText: "Kembali ke laman utama",
      code: "404",
    },
  },
};
