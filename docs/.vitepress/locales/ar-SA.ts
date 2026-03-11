import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const arSA: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "ar-SA",
  label: "العربية",
  dir: "rtl",
  description:
    "منصة وكلاء ذكاء اصطناعي آمنة ومتعددة القنوات مع تطبيق حتمي للسياسات تحت طبقة LLM.",
  themeConfig: {
    nav: [
      { text: "الدليل", link: "/ar-SA/guide/" },
      { text: "الأسعار", link: "/ar-SA/pricing" },
      { text: "البنية", link: "/ar-SA/architecture/" },
      { text: "الأمان", link: "/ar-SA/security/" },
      { text: "القنوات", link: "/ar-SA/channels/" },
      { text: "التكاملات", link: "/ar-SA/integrations/" },
      { text: "الميزات", link: "/ar-SA/features/" },
      { text: "المرجع", link: "/ar-SA/reference/" },
      { text: "الدعم", link: "/ar-SA/support/" },
    ],
    sidebar: {
      "/ar-SA/guide/": [
        {
          text: "البدء",
          items: [
            { text: "نظرة عامة", link: "/ar-SA/guide/" },
            {
              text: "التثبيت والنشر",
              link: "/ar-SA/guide/installation",
            },
            { text: "بداية سريعة", link: "/ar-SA/guide/quickstart" },
            { text: "الإعدادات", link: "/ar-SA/guide/configuration" },
            {
              text: "SPINE والمحفزات",
              link: "/ar-SA/guide/spine-and-triggers",
            },
            { text: "أوامر CLI", link: "/ar-SA/guide/commands" },
            {
              text: "دليل التصنيف",
              link: "/ar-SA/guide/classification-guide",
            },
          ],
        },
      ],
      "/ar-SA/architecture/": [
        {
          text: "البنية",
          items: [
            { text: "نظرة عامة", link: "/ar-SA/architecture/" },
            {
              text: "نظام التصنيف",
              link: "/ar-SA/architecture/classification",
            },
            {
              text: "محرك السياسات و Hooks",
              link: "/ar-SA/architecture/policy-engine",
            },
            {
              text: "الجلسات و Taint",
              link: "/ar-SA/architecture/taint-and-sessions",
            },
            { text: "البوابة", link: "/ar-SA/architecture/gateway" },
            { text: "التخزين", link: "/ar-SA/architecture/storage" },
            {
              text: "الدفاع المتعمق",
              link: "/ar-SA/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/ar-SA/security/": [
        {
          text: "نموذج الأمان",
          items: [
            { text: "تصميم الأمان أولاً", link: "/ar-SA/security/" },
            {
              text: "قاعدة منع الكتابة التنازلية",
              link: "/ar-SA/security/no-write-down",
            },
            { text: "الهوية والمصادقة", link: "/ar-SA/security/identity" },
            {
              text: "تفويض الوكيل",
              link: "/ar-SA/security/agent-delegation",
            },
            { text: "إدارة الأسرار", link: "/ar-SA/security/secrets" },
            {
              text: "التدقيق والامتثال",
              link: "/ar-SA/security/audit-logging",
            },
          ],
        },
        {
          text: "الثقة والامتثال",
          items: [
            { text: "مركز الثقة", link: "/ar-SA/security/trust-center" },
            {
              text: "الإفصاح المسؤول",
              link: "/ar-SA/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/ar-SA/channels/": [
        {
          text: "القنوات",
          items: [
            { text: "نظرة عامة", link: "/ar-SA/channels/" },
            { text: "CLI", link: "/ar-SA/channels/cli" },
            { text: "Telegram", link: "/ar-SA/channels/telegram" },
            { text: "Slack", link: "/ar-SA/channels/slack" },
            { text: "Discord", link: "/ar-SA/channels/discord" },
            { text: "WhatsApp", link: "/ar-SA/channels/whatsapp" },
            { text: "WebChat", link: "/ar-SA/channels/webchat" },
            { text: "Email", link: "/ar-SA/channels/email" },
            { text: "Signal", link: "/ar-SA/channels/signal" },
            { text: "Google Chat", link: "/ar-SA/channels/google-chat" },
          ],
        },
      ],
      "/ar-SA/integrations/": [
        {
          text: "التكاملات",
          items: [
            { text: "نظرة عامة", link: "/ar-SA/integrations/" },
            { text: "MCP Gateway", link: "/ar-SA/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/ar-SA/integrations/plugins" },
            {
              text: "بيئة التنفيذ",
              link: "/ar-SA/integrations/exec-environment",
            },
            { text: "Skills", link: "/ar-SA/integrations/skills" },
            {
              text: "بناء Skills",
              link: "/ar-SA/integrations/building-skills",
            },
            {
              text: "أتمتة المتصفح",
              link: "/ar-SA/integrations/browser",
            },
            { text: "Webhooks", link: "/ar-SA/integrations/webhooks" },
            { text: "GitHub", link: "/ar-SA/integrations/github" },
            {
              text: "Google Workspace",
              link: "/ar-SA/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/ar-SA/integrations/obsidian" },
            { text: "CalDAV", link: "/ar-SA/integrations/caldav" },
            { text: "الوصول عن بُعد", link: "/ar-SA/integrations/remote" },
          ],
        },
      ],
      "/ar-SA/features/": [
        {
          text: "الميزات",
          items: [
            { text: "نظرة عامة", link: "/ar-SA/features/" },
            {
              text: "Cron والمحفزات",
              link: "/ar-SA/features/cron-and-triggers",
            },
            { text: "الصوت", link: "/ar-SA/features/voice" },
            { text: "Tide Pool / A2UI", link: "/ar-SA/features/tidepool" },
            {
              text: "توجيه متعدد الوكلاء",
              link: "/ar-SA/features/multi-agent",
            },
            {
              text: "تجاوز فشل النموذج",
              link: "/ar-SA/features/model-failover",
            },
            { text: "الإشعارات", link: "/ar-SA/features/notifications" },
            { text: "التسجيل", link: "/ar-SA/features/logging" },
            { text: "فرق الوكلاء", link: "/ar-SA/features/agent-teams" },
            { text: "سير العمل", link: "/ar-SA/features/workflows" },
            {
              text: "تحديد المعدل",
              link: "/ar-SA/features/rate-limiting",
            },
            { text: "استكشاف", link: "/ar-SA/features/explore" },
            { text: "نظام الملفات", link: "/ar-SA/features/filesystem" },
            {
              text: "الصور والرؤية",
              link: "/ar-SA/features/image-vision",
            },
            { text: "الذاكرة", link: "/ar-SA/features/memory" },
            { text: "التخطيط", link: "/ar-SA/features/planning" },
            { text: "الجلسات", link: "/ar-SA/features/sessions" },
            { text: "البحث في الويب", link: "/ar-SA/features/web-search" },
            {
              text: "الوكلاء الفرعيون",
              link: "/ar-SA/features/subagents",
            },
          ],
        },
      ],
      "/ar-SA/reference/": [
        {
          text: "المرجع",
          items: [
            { text: "نظرة عامة", link: "/ar-SA/reference/" },
            { text: "مخطط الإعدادات", link: "/ar-SA/reference/config-yaml" },
            { text: "DSL سير العمل", link: "/ar-SA/reference/workflow-dsl" },
            { text: "الواجهات", link: "/ar-SA/reference/interfaces" },
            { text: "المصطلحات", link: "/ar-SA/reference/glossary" },
          ],
        },
      ],
      "/ar-SA/support/": [
        {
          text: "مركز الدعم",
          items: [
            { text: "نظرة عامة", link: "/ar-SA/support/" },
            { text: "الأسئلة الشائعة", link: "/ar-SA/support/faq" },
          ],
        },
        {
          text: "استكشاف الأخطاء",
          items: [
            { text: "ابدأ من هنا", link: "/ar-SA/support/troubleshooting/" },
            {
              text: "التثبيت",
              link: "/ar-SA/support/troubleshooting/installation",
            },
            {
              text: "العملية الخلفية",
              link: "/ar-SA/support/troubleshooting/daemon",
            },
            {
              text: "الإعدادات",
              link: "/ar-SA/support/troubleshooting/configuration",
            },
            {
              text: "القنوات",
              link: "/ar-SA/support/troubleshooting/channels",
            },
            {
              text: "مزودو LLM",
              link: "/ar-SA/support/troubleshooting/providers",
            },
            {
              text: "التكاملات",
              link: "/ar-SA/support/troubleshooting/integrations",
            },
            {
              text: "أتمتة المتصفح",
              link: "/ar-SA/support/troubleshooting/browser",
            },
            {
              text: "الأمان والتصنيف",
              link: "/ar-SA/support/troubleshooting/security",
            },
            {
              text: "الأسرار وبيانات الاعتماد",
              link: "/ar-SA/support/troubleshooting/secrets",
            },
            {
              text: "سير العمل",
              link: "/ar-SA/support/troubleshooting/workflows",
            },
            {
              text: "مرجع الأخطاء",
              link: "/ar-SA/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "أدلة إرشادية",
          items: [
            {
              text: "جمع السجلات",
              link: "/ar-SA/support/guides/collecting-logs",
            },
            {
              text: "تشغيل التشخيصات",
              link: "/ar-SA/support/guides/diagnostics",
            },
            {
              text: "الإبلاغ عن المشكلات",
              link: "/ar-SA/support/guides/filing-issues",
            },
            {
              text: "ملاحظات المنصة",
              link: "/ar-SA/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "قاعدة المعرفة",
          items: [
            {
              text: "ترحيل الأسرار",
              link: "/ar-SA/support/kb/secrets-migration",
            },
            {
              text: "عملية التحديث التلقائي",
              link: "/ar-SA/support/kb/self-update",
            },
            {
              text: "التغييرات الجوهرية",
              link: "/ar-SA/support/kb/breaking-changes",
            },
            {
              text: "المشكلات المعروفة",
              link: "/ar-SA/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "تعديل هذه الصفحة على GitHub",
    },
    footer: {
      message:
        'صدر بموجب رخصة Apache 2.0. | <a href="/ar-SA/account">الحساب</a> | <a href="/ar-SA/privacy-policy">سياسة الخصوصية</a> | <a href="/ar-SA/cookie-policy">سياسة ملفات تعريف الارتباط</a> | <a href="/ar-SA/terms-of-service">شروط الخدمة</a>',
      copyright: "حقوق النشر ٢٠٢٦ Triggerfish, Inc.",
    },
    docFooter: {
      prev: "الصفحة السابقة",
      next: "الصفحة التالية",
    },
    lastUpdated: {
      text: "آخر تحديث",
    },
    outline: {
      label: "في هذه الصفحة",
    },
    returnToTopLabel: "العودة إلى الأعلى",
    sidebarMenuLabel: "القائمة",
    darkModeSwitchLabel: "المظهر",
    langMenuLabel: "تغيير اللغة",
    notFound: {
      title: "الصفحة غير موجودة",
      quote:
        "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
      linkLabel: "الذهاب إلى الصفحة الرئيسية",
      linkText: "العودة إلى الرئيسية",
      code: "٤٠٤",
    },
  },
};
