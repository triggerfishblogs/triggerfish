import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const faIR: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "fa-IR",
  label: "فارسی",
  dir: "rtl",
  description:
    "پلتفرم عامل‌های هوش مصنوعی امن و چندکاناله با اجرای قطعی سیاست‌ها زیر لایه LLM.",
  themeConfig: {
    nav: [
      { text: "راهنما", link: "/fa-IR/guide/" },
      { text: "قیمت‌گذاری", link: "/fa-IR/pricing" },
      { text: "معماری", link: "/fa-IR/architecture/" },
      { text: "امنیت", link: "/fa-IR/security/" },
      { text: "کانال‌ها", link: "/fa-IR/channels/" },
      { text: "یکپارچه‌سازی‌ها", link: "/fa-IR/integrations/" },
      { text: "ویژگی‌ها", link: "/fa-IR/features/" },
      { text: "مرجع", link: "/fa-IR/reference/" },
      { text: "پشتیبانی", link: "/fa-IR/support/" },
    ],
    sidebar: {
      "/fa-IR/guide/": [
        {
          text: "شروع کار",
          items: [
            { text: "نمای کلی", link: "/fa-IR/guide/" },
            {
              text: "نصب و استقرار",
              link: "/fa-IR/guide/installation",
            },
            { text: "شروع سریع", link: "/fa-IR/guide/quickstart" },
            { text: "پیکربندی", link: "/fa-IR/guide/configuration" },
            {
              text: "SPINE و تریگرها",
              link: "/fa-IR/guide/spine-and-triggers",
            },
            { text: "دستورات CLI", link: "/fa-IR/guide/commands" },
            {
              text: "راهنمای طبقه‌بندی",
              link: "/fa-IR/guide/classification-guide",
            },
          ],
        },
      ],
      "/fa-IR/architecture/": [
        {
          text: "معماری",
          items: [
            { text: "نمای کلی", link: "/fa-IR/architecture/" },
            {
              text: "سیستم طبقه‌بندی",
              link: "/fa-IR/architecture/classification",
            },
            {
              text: "موتور سیاست و Hooks",
              link: "/fa-IR/architecture/policy-engine",
            },
            {
              text: "نشست‌ها و Taint",
              link: "/fa-IR/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/fa-IR/architecture/gateway" },
            { text: "ذخیره‌سازی", link: "/fa-IR/architecture/storage" },
            {
              text: "دفاع عمیق",
              link: "/fa-IR/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/fa-IR/security/": [
        {
          text: "مدل امنیت",
          items: [
            { text: "طراحی امنیت‌محور", link: "/fa-IR/security/" },
            {
              text: "قانون عدم نوشتن به پایین",
              link: "/fa-IR/security/no-write-down",
            },
            {
              text: "هویت و احراز هویت",
              link: "/fa-IR/security/identity",
            },
            {
              text: "واگذاری عامل",
              link: "/fa-IR/security/agent-delegation",
            },
            {
              text: "مدیریت اسرار",
              link: "/fa-IR/security/secrets",
            },
            {
              text: "ممیزی و انطباق",
              link: "/fa-IR/security/audit-logging",
            },
          ],
        },
        {
          text: "اعتماد و انطباق",
          items: [
            {
              text: "مرکز اعتماد",
              link: "/fa-IR/security/trust-center",
            },
            {
              text: "افشای مسئولانه",
              link: "/fa-IR/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/fa-IR/channels/": [
        {
          text: "کانال‌ها",
          items: [
            { text: "نمای کلی", link: "/fa-IR/channels/" },
            { text: "CLI", link: "/fa-IR/channels/cli" },
            { text: "Telegram", link: "/fa-IR/channels/telegram" },
            { text: "Slack", link: "/fa-IR/channels/slack" },
            { text: "Discord", link: "/fa-IR/channels/discord" },
            { text: "WhatsApp", link: "/fa-IR/channels/whatsapp" },
            { text: "WebChat", link: "/fa-IR/channels/webchat" },
            { text: "Email", link: "/fa-IR/channels/email" },
            { text: "Signal", link: "/fa-IR/channels/signal" },
            { text: "Google Chat", link: "/fa-IR/channels/google-chat" },
          ],
        },
      ],
      "/fa-IR/integrations/": [
        {
          text: "یکپارچه‌سازی‌ها",
          items: [
            { text: "نمای کلی", link: "/fa-IR/integrations/" },
            {
              text: "MCP Gateway",
              link: "/fa-IR/integrations/mcp-gateway",
            },
            { text: "Plugin SDK", link: "/fa-IR/integrations/plugins" },
            {
              text: "محیط اجرا",
              link: "/fa-IR/integrations/exec-environment",
            },
            { text: "Skills", link: "/fa-IR/integrations/skills" },
            {
              text: "ساخت Skills",
              link: "/fa-IR/integrations/building-skills",
            },
            {
              text: "اتوماسیون مرورگر",
              link: "/fa-IR/integrations/browser",
            },
            { text: "Webhooks", link: "/fa-IR/integrations/webhooks" },
            { text: "GitHub", link: "/fa-IR/integrations/github" },
            {
              text: "Google Workspace",
              link: "/fa-IR/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/fa-IR/integrations/obsidian" },
            { text: "CalDAV", link: "/fa-IR/integrations/caldav" },
            { text: "دسترسی از راه دور", link: "/fa-IR/integrations/remote" },
          ],
        },
      ],
      "/fa-IR/features/": [
        {
          text: "ویژگی‌ها",
          items: [
            { text: "نمای کلی", link: "/fa-IR/features/" },
            {
              text: "Cron و تریگرها",
              link: "/fa-IR/features/cron-and-triggers",
            },
            { text: "صدا", link: "/fa-IR/features/voice" },
            { text: "Tide Pool / A2UI", link: "/fa-IR/features/tidepool" },
            {
              text: "مسیریابی چند عامله",
              link: "/fa-IR/features/multi-agent",
            },
            {
              text: "جایگزینی مدل در خرابی",
              link: "/fa-IR/features/model-failover",
            },
            { text: "اعلان‌ها", link: "/fa-IR/features/notifications" },
            { text: "ثبت رویداد", link: "/fa-IR/features/logging" },
            { text: "تیم‌های عامل", link: "/fa-IR/features/agent-teams" },
            {
              text: "محدودیت نرخ",
              link: "/fa-IR/features/rate-limiting",
            },
            { text: "کاوش", link: "/fa-IR/features/explore" },
            { text: "سیستم فایل", link: "/fa-IR/features/filesystem" },
            {
              text: "تصویر و بینایی",
              link: "/fa-IR/features/image-vision",
            },
            { text: "حافظه", link: "/fa-IR/features/memory" },
            { text: "برنامه‌ریزی", link: "/fa-IR/features/planning" },
            { text: "نشست‌ها", link: "/fa-IR/features/sessions" },
            { text: "جستجوی وب", link: "/fa-IR/features/web-search" },
            { text: "زیرعامل‌ها", link: "/fa-IR/features/subagents" },
          ],
        },
      ],
      "/fa-IR/reference/": [
        {
          text: "مرجع",
          items: [
            { text: "نمای کلی", link: "/fa-IR/reference/" },
            {
              text: "شمای پیکربندی",
              link: "/fa-IR/reference/config-yaml",
            },
            { text: "رابط‌ها", link: "/fa-IR/reference/interfaces" },
            { text: "واژه‌نامه", link: "/fa-IR/reference/glossary" },
          ],
        },
      ],
      "/fa-IR/support/": [
        {
          text: "مرکز پشتیبانی",
          items: [
            { text: "نمای کلی", link: "/fa-IR/support/" },
            { text: "سؤالات متداول", link: "/fa-IR/support/faq" },
          ],
        },
        {
          text: "عیب‌یابی",
          items: [
            {
              text: "از اینجا شروع کنید",
              link: "/fa-IR/support/troubleshooting/",
            },
            {
              text: "نصب",
              link: "/fa-IR/support/troubleshooting/installation",
            },
            {
              text: "فرآیند پس‌زمینه",
              link: "/fa-IR/support/troubleshooting/daemon",
            },
            {
              text: "پیکربندی",
              link: "/fa-IR/support/troubleshooting/configuration",
            },
            {
              text: "کانال‌ها",
              link: "/fa-IR/support/troubleshooting/channels",
            },
            {
              text: "ارائه‌دهندگان LLM",
              link: "/fa-IR/support/troubleshooting/providers",
            },
            {
              text: "یکپارچه‌سازی‌ها",
              link: "/fa-IR/support/troubleshooting/integrations",
            },
            {
              text: "اتوماسیون مرورگر",
              link: "/fa-IR/support/troubleshooting/browser",
            },
            {
              text: "امنیت و طبقه‌بندی",
              link: "/fa-IR/support/troubleshooting/security",
            },
            {
              text: "اسرار و اعتبارنامه‌ها",
              link: "/fa-IR/support/troubleshooting/secrets",
            },
            {
              text: "مرجع خطاها",
              link: "/fa-IR/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "راهنماهای عملی",
          items: [
            {
              text: "جمع‌آوری لاگ‌ها",
              link: "/fa-IR/support/guides/collecting-logs",
            },
            {
              text: "اجرای تشخیص‌ها",
              link: "/fa-IR/support/guides/diagnostics",
            },
            {
              text: "ثبت مشکلات",
              link: "/fa-IR/support/guides/filing-issues",
            },
            {
              text: "یادداشت‌های پلتفرم",
              link: "/fa-IR/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "پایگاه دانش",
          items: [
            {
              text: "مهاجرت اسرار",
              link: "/fa-IR/support/kb/secrets-migration",
            },
            {
              text: "فرآیند به‌روزرسانی خودکار",
              link: "/fa-IR/support/kb/self-update",
            },
            {
              text: "تغییرات شکننده",
              link: "/fa-IR/support/kb/breaking-changes",
            },
            {
              text: "مشکلات شناخته‌شده",
              link: "/fa-IR/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "ویرایش این صفحه در GitHub",
    },
    footer: {
      message:
        'منتشر شده تحت مجوز Apache 2.0. | <a href="/fa-IR/account">حساب کاربری</a> | <a href="/fa-IR/privacy-policy">سیاست حریم خصوصی</a> | <a href="/fa-IR/cookie-policy">سیاست کوکی</a> | <a href="/fa-IR/terms-of-service">شرایط خدمات</a>',
      copyright: "حق نشر ۲۰۲۶ Triggerfish, Inc.",
    },
    docFooter: {
      prev: "صفحه قبلی",
      next: "صفحه بعدی",
    },
    lastUpdated: {
      text: "آخرین به‌روزرسانی",
    },
    outline: {
      label: "در این صفحه",
    },
    returnToTopLabel: "بازگشت به بالا",
    sidebarMenuLabel: "منو",
    darkModeSwitchLabel: "ظاهر",
    langMenuLabel: "تغییر زبان",
    notFound: {
      title: "صفحه یافت نشد",
      quote: "صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.",
      linkLabel: "رفتن به صفحه اصلی",
      linkText: "بازگشت به خانه",
      code: "۴۰۴",
    },
  },
};
