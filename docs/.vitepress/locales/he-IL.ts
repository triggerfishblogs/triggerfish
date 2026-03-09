import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const heIL: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "he-IL",
  label: "עברית",
  dir: "rtl",
  description:
    "פלטפורמת סוכני AI מאובטחת ורב-ערוצית עם אכיפת מדיניות דטרמיניסטית מתחת לשכבת ה-LLM.",
  themeConfig: {
    nav: [
      { text: "מדריך", link: "/he-IL/guide/" },
      { text: "תמחור", link: "/he-IL/pricing" },
      { text: "ארכיטקטורה", link: "/he-IL/architecture/" },
      { text: "אבטחה", link: "/he-IL/security/" },
      { text: "ערוצים", link: "/he-IL/channels/" },
      { text: "אינטגרציות", link: "/he-IL/integrations/" },
      { text: "תכונות", link: "/he-IL/features/" },
      { text: "הפניה", link: "/he-IL/reference/" },
      { text: "תמיכה", link: "/he-IL/support/" },
    ],
    sidebar: {
      "/he-IL/guide/": [
        {
          text: "תחילת העבודה",
          items: [
            { text: "סקירה כללית", link: "/he-IL/guide/" },
            {
              text: "התקנה ופריסה",
              link: "/he-IL/guide/installation",
            },
            { text: "התחלה מהירה", link: "/he-IL/guide/quickstart" },
            { text: "הגדרות", link: "/he-IL/guide/configuration" },
            {
              text: "SPINE וטריגרים",
              link: "/he-IL/guide/spine-and-triggers",
            },
            { text: "פקודות CLI", link: "/he-IL/guide/commands" },
            {
              text: "מדריך סיווג",
              link: "/he-IL/guide/classification-guide",
            },
          ],
        },
      ],
      "/he-IL/architecture/": [
        {
          text: "ארכיטקטורה",
          items: [
            { text: "סקירה כללית", link: "/he-IL/architecture/" },
            {
              text: "מערכת סיווג",
              link: "/he-IL/architecture/classification",
            },
            {
              text: "מנוע מדיניות ו-Hooks",
              link: "/he-IL/architecture/policy-engine",
            },
            {
              text: "סשנים ו-Taint",
              link: "/he-IL/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/he-IL/architecture/gateway" },
            { text: "אחסון", link: "/he-IL/architecture/storage" },
            {
              text: "הגנה לעומק",
              link: "/he-IL/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/he-IL/security/": [
        {
          text: "מודל אבטחה",
          items: [
            { text: "עיצוב אבטחה-תחילה", link: "/he-IL/security/" },
            {
              text: "כלל איסור כתיבה כלפי מטה",
              link: "/he-IL/security/no-write-down",
            },
            {
              text: "זהות ואימות",
              link: "/he-IL/security/identity",
            },
            {
              text: "האצלת סוכן",
              link: "/he-IL/security/agent-delegation",
            },
            {
              text: "ניהול סודות",
              link: "/he-IL/security/secrets",
            },
            {
              text: "ביקורת ותאימות",
              link: "/he-IL/security/audit-logging",
            },
          ],
        },
        {
          text: "אמון ותאימות",
          items: [
            {
              text: "מרכז אמון",
              link: "/he-IL/security/trust-center",
            },
            {
              text: "גילוי אחראי",
              link: "/he-IL/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/he-IL/channels/": [
        {
          text: "ערוצים",
          items: [
            { text: "סקירה כללית", link: "/he-IL/channels/" },
            { text: "CLI", link: "/he-IL/channels/cli" },
            { text: "Telegram", link: "/he-IL/channels/telegram" },
            { text: "Slack", link: "/he-IL/channels/slack" },
            { text: "Discord", link: "/he-IL/channels/discord" },
            { text: "WhatsApp", link: "/he-IL/channels/whatsapp" },
            { text: "WebChat", link: "/he-IL/channels/webchat" },
            { text: "Email", link: "/he-IL/channels/email" },
            { text: "Signal", link: "/he-IL/channels/signal" },
            { text: "Google Chat", link: "/he-IL/channels/google-chat" },
          ],
        },
      ],
      "/he-IL/integrations/": [
        {
          text: "אינטגרציות",
          items: [
            { text: "סקירה כללית", link: "/he-IL/integrations/" },
            {
              text: "MCP Gateway",
              link: "/he-IL/integrations/mcp-gateway",
            },
            { text: "Plugin SDK", link: "/he-IL/integrations/plugins" },
            {
              text: "סביבת הרצה",
              link: "/he-IL/integrations/exec-environment",
            },
            { text: "Skills", link: "/he-IL/integrations/skills" },
            {
              text: "בניית Skills",
              link: "/he-IL/integrations/building-skills",
            },
            {
              text: "אוטומציית דפדפן",
              link: "/he-IL/integrations/browser",
            },
            { text: "Webhooks", link: "/he-IL/integrations/webhooks" },
            { text: "GitHub", link: "/he-IL/integrations/github" },
            {
              text: "Google Workspace",
              link: "/he-IL/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/he-IL/integrations/obsidian" },
            { text: "CalDAV", link: "/he-IL/integrations/caldav" },
            { text: "גישה מרחוק", link: "/he-IL/integrations/remote" },
          ],
        },
      ],
      "/he-IL/features/": [
        {
          text: "תכונות",
          items: [
            { text: "סקירה כללית", link: "/he-IL/features/" },
            {
              text: "Cron וטריגרים",
              link: "/he-IL/features/cron-and-triggers",
            },
            { text: "קול", link: "/he-IL/features/voice" },
            { text: "Tide Pool / A2UI", link: "/he-IL/features/tidepool" },
            {
              text: "ניתוב רב-סוכנים",
              link: "/he-IL/features/multi-agent",
            },
            {
              text: "מעבר כשל של מודלים",
              link: "/he-IL/features/model-failover",
            },
            { text: "התראות", link: "/he-IL/features/notifications" },
            { text: "רישום", link: "/he-IL/features/logging" },
            { text: "צוותי סוכנים", link: "/he-IL/features/agent-teams" },
            {
              text: "הגבלת קצב",
              link: "/he-IL/features/rate-limiting",
            },
            { text: "חקירה", link: "/he-IL/features/explore" },
            { text: "מערכת קבצים", link: "/he-IL/features/filesystem" },
            {
              text: "תמונה וראייה",
              link: "/he-IL/features/image-vision",
            },
            { text: "זיכרון", link: "/he-IL/features/memory" },
            { text: "תכנון", link: "/he-IL/features/planning" },
            { text: "סשנים", link: "/he-IL/features/sessions" },
            { text: "חיפוש באינטרנט", link: "/he-IL/features/web-search" },
            { text: "תת-סוכנים", link: "/he-IL/features/subagents" },
          ],
        },
      ],
      "/he-IL/reference/": [
        {
          text: "הפניה",
          items: [
            { text: "סקירה כללית", link: "/he-IL/reference/" },
            {
              text: "סכמת הגדרות",
              link: "/he-IL/reference/config-yaml",
            },
            { text: "ממשקים", link: "/he-IL/reference/interfaces" },
            { text: "מילון מונחים", link: "/he-IL/reference/glossary" },
          ],
        },
      ],
      "/he-IL/support/": [
        {
          text: "מרכז תמיכה",
          items: [
            { text: "סקירה כללית", link: "/he-IL/support/" },
            { text: "שאלות נפוצות", link: "/he-IL/support/faq" },
          ],
        },
        {
          text: "פתרון בעיות",
          items: [
            {
              text: "התחל כאן",
              link: "/he-IL/support/troubleshooting/",
            },
            {
              text: "התקנה",
              link: "/he-IL/support/troubleshooting/installation",
            },
            {
              text: "תהליך רקע",
              link: "/he-IL/support/troubleshooting/daemon",
            },
            {
              text: "הגדרות",
              link: "/he-IL/support/troubleshooting/configuration",
            },
            {
              text: "ערוצים",
              link: "/he-IL/support/troubleshooting/channels",
            },
            {
              text: "ספקי LLM",
              link: "/he-IL/support/troubleshooting/providers",
            },
            {
              text: "אינטגרציות",
              link: "/he-IL/support/troubleshooting/integrations",
            },
            {
              text: "אוטומציית דפדפן",
              link: "/he-IL/support/troubleshooting/browser",
            },
            {
              text: "אבטחה וסיווג",
              link: "/he-IL/support/troubleshooting/security",
            },
            {
              text: "סודות ואישורים",
              link: "/he-IL/support/troubleshooting/secrets",
            },
            {
              text: "הפניית שגיאות",
              link: "/he-IL/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "מדריכים מעשיים",
          items: [
            {
              text: "איסוף יומנים",
              link: "/he-IL/support/guides/collecting-logs",
            },
            {
              text: "הרצת אבחונים",
              link: "/he-IL/support/guides/diagnostics",
            },
            {
              text: "דיווח על בעיות",
              link: "/he-IL/support/guides/filing-issues",
            },
            {
              text: "הערות פלטפורמה",
              link: "/he-IL/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "בסיס ידע",
          items: [
            {
              text: "מיגרציית סודות",
              link: "/he-IL/support/kb/secrets-migration",
            },
            {
              text: "תהליך עדכון עצמי",
              link: "/he-IL/support/kb/self-update",
            },
            {
              text: "שינויים שוברים",
              link: "/he-IL/support/kb/breaking-changes",
            },
            {
              text: "בעיות ידועות",
              link: "/he-IL/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "ערוך דף זה ב-GitHub",
    },
    footer: {
      message:
        'שוחרר תחת רישיון Apache 2.0. | <a href="/he-IL/account">חשבון</a> | <a href="/he-IL/privacy-policy">מדיניות פרטיות</a> | <a href="/he-IL/cookie-policy">מדיניות עוגיות</a> | <a href="/he-IL/terms-of-service">תנאי שימוש</a>',
      copyright: "זכויות יוצרים 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "הדף הקודם",
      next: "הדף הבא",
    },
    lastUpdated: {
      text: "עודכן לאחרונה",
    },
    outline: {
      label: "בדף זה",
    },
    returnToTopLabel: "חזרה למעלה",
    sidebarMenuLabel: "תפריט",
    darkModeSwitchLabel: "מראה",
    langMenuLabel: "שנה שפה",
    notFound: {
      title: "הדף לא נמצא",
      quote: "הדף שאתה מחפש אינו קיים או הועבר.",
      linkLabel: "עבור לדף הבית",
      linkText: "קח אותי הביתה",
      code: "404",
    },
  },
};
