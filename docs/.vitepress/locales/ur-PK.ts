import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const urPK: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "ur-PK",
  label: "اردو",
  dir: "rtl",
  description:
    "LLM پرت کے نیچے فیصلہ کن پالیسی نفاذ کے ساتھ محفوظ، ملٹی چینل AI ایجنٹ پلیٹ فارم۔",
  themeConfig: {
    nav: [
      { text: "گائیڈ", link: "/ur-PK/guide/" },
      { text: "قیمتیں", link: "/ur-PK/pricing" },
      {
        text: "دستاویزات",
        items: [
          { text: "فن تعمیر", link: "/ur-PK/architecture/" },
          { text: "سیکیورٹی", link: "/ur-PK/security/" },
          { text: "چینلز", link: "/ur-PK/channels/" },
          { text: "انٹیگریشنز", link: "/ur-PK/integrations/" },
          { text: "خصوصیات", link: "/ur-PK/features/" },
          { text: "حوالہ", link: "/ur-PK/reference/" },
        ],
      },
      { text: "معاونت", link: "/ur-PK/support/" },
    ],
    sidebar: {
      "/ur-PK/guide/": [
        {
          text: "شروع کریں",
          items: [
            { text: "جائزہ", link: "/ur-PK/guide/" },
            { text: "تنصیب اور تعیناتی", link: "/ur-PK/guide/installation" },
            { text: "فوری آغاز", link: "/ur-PK/guide/quickstart" },
            { text: "ترتیب", link: "/ur-PK/guide/configuration" },
            { text: "SPINE اور Triggers", link: "/ur-PK/guide/spine-and-triggers" },
            { text: "CLI احکامات", link: "/ur-PK/guide/commands" },
            {
              text: "درجہ بندی گائیڈ",
              link: "/ur-PK/guide/classification-guide",
            },
          ],
        },
      ],
      "/ur-PK/architecture/": [
        {
          text: "فن تعمیر",
          items: [
            { text: "جائزہ", link: "/ur-PK/architecture/" },
            {
              text: "درجہ بندی نظام",
              link: "/ur-PK/architecture/classification",
            },
            {
              text: "پالیسی انجن اور Hooks",
              link: "/ur-PK/architecture/policy-engine",
            },
            {
              text: "سیشنز اور Taint",
              link: "/ur-PK/architecture/taint-and-sessions",
            },
            { text: "گیٹ وے", link: "/ur-PK/architecture/gateway" },
            { text: "ذخیرہ", link: "/ur-PK/architecture/storage" },
            {
              text: "گہرائی میں دفاع",
              link: "/ur-PK/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/ur-PK/security/": [
        {
          text: "سیکیورٹی ماڈل",
          items: [
            { text: "سیکیورٹی فرسٹ ڈیزائن", link: "/ur-PK/security/" },
            { text: "رائٹ ڈاؤن ممانعت قاعدہ", link: "/ur-PK/security/no-write-down" },
            { text: "شناخت اور تصدیق", link: "/ur-PK/security/identity" },
            { text: "ایجنٹ وفد", link: "/ur-PK/security/agent-delegation" },
            { text: "رازداری کا انتظام", link: "/ur-PK/security/secrets" },
            { text: "آڈٹ اور تعمیل", link: "/ur-PK/security/audit-logging" },
          ],
        },
        {
          text: "اعتماد اور تعمیل",
          items: [
            { text: "اعتماد مرکز", link: "/ur-PK/security/trust-center" },
            {
              text: "ذمہ دارانہ انکشاف",
              link: "/ur-PK/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/ur-PK/channels/": [
        {
          text: "چینلز",
          items: [
            { text: "جائزہ", link: "/ur-PK/channels/" },
            { text: "CLI", link: "/ur-PK/channels/cli" },
            { text: "Telegram", link: "/ur-PK/channels/telegram" },
            { text: "Slack", link: "/ur-PK/channels/slack" },
            { text: "Discord", link: "/ur-PK/channels/discord" },
            { text: "WhatsApp", link: "/ur-PK/channels/whatsapp" },
            { text: "WebChat", link: "/ur-PK/channels/webchat" },
            { text: "Email", link: "/ur-PK/channels/email" },
            { text: "Signal", link: "/ur-PK/channels/signal" },
            { text: "Google Chat", link: "/ur-PK/channels/google-chat" },
          ],
        },
      ],
      "/ur-PK/integrations/": [
        {
          text: "انٹیگریشنز",
          items: [
            { text: "جائزہ", link: "/ur-PK/integrations/" },
            { text: "MCP Gateway", link: "/ur-PK/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/ur-PK/integrations/plugins" },
            {
              text: "عمل درآمد ماحول",
              link: "/ur-PK/integrations/exec-environment",
            },
            { text: "Skills", link: "/ur-PK/integrations/skills" },
            { text: "Skills تعمیر", link: "/ur-PK/integrations/building-skills" },
            { text: "براؤزر آٹومیشن", link: "/ur-PK/integrations/browser" },
            { text: "Webhooks", link: "/ur-PK/integrations/webhooks" },
            { text: "GitHub", link: "/ur-PK/integrations/github" },
            {
              text: "Google Workspace",
              link: "/ur-PK/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/ur-PK/integrations/obsidian" },
            { text: "CalDAV", link: "/ur-PK/integrations/caldav" },
            { text: "ریموٹ رسائی", link: "/ur-PK/integrations/remote" },
          ],
        },
      ],
      "/ur-PK/features/": [
        {
          text: "خصوصیات",
          items: [
            { text: "جائزہ", link: "/ur-PK/features/" },
            { text: "Cron اور Triggers", link: "/ur-PK/features/cron-and-triggers" },
            { text: "آواز", link: "/ur-PK/features/voice" },
            { text: "Tide Pool / A2UI", link: "/ur-PK/features/tidepool" },
            { text: "ملٹی ایجنٹ روٹنگ", link: "/ur-PK/features/multi-agent" },
            { text: "ماڈل فیل اوور", link: "/ur-PK/features/model-failover" },
            { text: "اطلاعات", link: "/ur-PK/features/notifications" },
            { text: "لاگنگ", link: "/ur-PK/features/logging" },
            { text: "ایجنٹ ٹیمیں", link: "/ur-PK/features/agent-teams" },
            { text: "ورک فلوز", link: "/ur-PK/features/workflows" },
            { text: "شرح کی حد", link: "/ur-PK/features/rate-limiting" },
            { text: "دریافت", link: "/ur-PK/features/explore" },
            { text: "فائل سسٹم", link: "/ur-PK/features/filesystem" },
            { text: "تصویر اور وژن", link: "/ur-PK/features/image-vision" },
            { text: "میموری", link: "/ur-PK/features/memory" },
            { text: "منصوبہ بندی", link: "/ur-PK/features/planning" },
            { text: "سیشنز", link: "/ur-PK/features/sessions" },
            { text: "ویب تلاش", link: "/ur-PK/features/web-search" },
            { text: "ذیلی ایجنٹس", link: "/ur-PK/features/subagents" },
          ],
        },
      ],
      "/ur-PK/reference/": [
        {
          text: "حوالہ",
          items: [
            { text: "جائزہ", link: "/ur-PK/reference/" },
            { text: "ترتیب اسکیما", link: "/ur-PK/reference/config-yaml" },
            { text: "ورک فلو DSL", link: "/ur-PK/reference/workflow-dsl" },
            { text: "انٹرفیسز", link: "/ur-PK/reference/interfaces" },
            { text: "لغت", link: "/ur-PK/reference/glossary" },
          ],
        },
      ],
      "/ur-PK/support/": [
        {
          text: "معاونت مرکز",
          items: [
            { text: "جائزہ", link: "/ur-PK/support/" },
            { text: "اکثر پوچھے گئے سوالات", link: "/ur-PK/support/faq" },
          ],
        },
        {
          text: "خرابی کا ازالہ",
          items: [
            { text: "یہاں سے شروع کریں", link: "/ur-PK/support/troubleshooting/" },
            {
              text: "تنصیب",
              link: "/ur-PK/support/troubleshooting/installation",
            },
            { text: "ڈیمن", link: "/ur-PK/support/troubleshooting/daemon" },
            {
              text: "ترتیب",
              link: "/ur-PK/support/troubleshooting/configuration",
            },
            { text: "چینلز", link: "/ur-PK/support/troubleshooting/channels" },
            {
              text: "LLM فراہم کنندگان",
              link: "/ur-PK/support/troubleshooting/providers",
            },
            {
              text: "انٹیگریشنز",
              link: "/ur-PK/support/troubleshooting/integrations",
            },
            {
              text: "براؤزر آٹومیشن",
              link: "/ur-PK/support/troubleshooting/browser",
            },
            {
              text: "سیکیورٹی اور درجہ بندی",
              link: "/ur-PK/support/troubleshooting/security",
            },
            {
              text: "رازداری اور اسناد",
              link: "/ur-PK/support/troubleshooting/secrets",
            },
            {
              text: "ورک فلوز",
              link: "/ur-PK/support/troubleshooting/workflows",
            },
            {
              text: "خرابی حوالہ",
              link: "/ur-PK/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "رہنما گائیڈز",
          items: [
            {
              text: "لاگز جمع کرنا",
              link: "/ur-PK/support/guides/collecting-logs",
            },
            {
              text: "تشخیصات چلانا",
              link: "/ur-PK/support/guides/diagnostics",
            },
            { text: "مسائل کی اطلاع", link: "/ur-PK/support/guides/filing-issues" },
            {
              text: "پلیٹ فارم نوٹس",
              link: "/ur-PK/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "علمی بنیاد",
          items: [
            {
              text: "رازداری منتقلی",
              link: "/ur-PK/support/kb/secrets-migration",
            },
            { text: "خود اپ ڈیٹ عمل", link: "/ur-PK/support/kb/self-update" },
            {
              text: "اہم تبدیلیاں",
              link: "/ur-PK/support/kb/breaking-changes",
            },
            { text: "معلوم مسائل", link: "/ur-PK/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "GitHub پر اس صفحے میں ترمیم کریں",
    },
    footer: {
      message:
        'Apache 2.0 لائسنس کے تحت جاری۔ | <a href="/ur-PK/account">اکاؤنٹ</a> | <a href="/ur-PK/privacy-policy">رازداری پالیسی</a> | <a href="/ur-PK/cookie-policy">کوکی پالیسی</a> | <a href="/ur-PK/terms-of-service">سروس کی شرائط</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "پچھلا صفحہ",
      next: "اگلا صفحہ",
    },
    lastUpdated: {
      text: "آخری اپ ڈیٹ",
    },
    outline: {
      label: "اس صفحے پر",
    },
    returnToTopLabel: "اوپر واپس جائیں",
    sidebarMenuLabel: "مینو",
    darkModeSwitchLabel: "تھیم",
    langMenuLabel: "زبان تبدیل کریں",
    notFound: {
      title: "صفحہ نہیں ملا",
      quote:
        "آپ جس صفحے کی تلاش کر رہے ہیں وہ موجود نہیں ہے یا منتقل کر دیا گیا ہے۔",
      linkLabel: "ہوم پر جائیں",
      linkText: "ہوم واپس جائیں",
      code: "404",
    },
  },
};
