import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const hiIN: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "hi-IN",
  label: "हिन्दी",
  description:
    "LLM परत के नीचे नियतात्मक नीति प्रवर्तन के साथ सुरक्षित, बहु-चैनल AI एजेंट प्लेटफ़ॉर्म।",
  themeConfig: {
    nav: [
      { text: "गाइड", link: "/hi-IN/guide/" },
      { text: "मूल्य निर्धारण", link: "/hi-IN/pricing" },
      {
        text: "दस्तावेज़",
        items: [
          { text: "आर्किटेक्चर", link: "/hi-IN/architecture/" },
          { text: "सुरक्षा", link: "/hi-IN/security/" },
          { text: "चैनल", link: "/hi-IN/channels/" },
          { text: "एकीकरण", link: "/hi-IN/integrations/" },
          { text: "सुविधाएँ", link: "/hi-IN/features/" },
          { text: "संदर्भ", link: "/hi-IN/reference/" },
        ],
      },
      { text: "उपयोग के मामले", link: "/hi-IN/use-cases/enterprise/" },
      { text: "सहायता", link: "/hi-IN/support/" },
    ],
    sidebar: {
      "/hi-IN/use-cases/enterprise/": [
        {
          text: "एंटरप्राइज़ उपयोग के मामले",
          items: [
            { text: "अवलोकन", link: "/hi-IN/use-cases/enterprise/" },
            { text: "क्रॉस-सिस्टम ऑर्केस्ट्रेशन", link: "/hi-IN/use-cases/enterprise/cross-system-orchestration" },
            { text: "असंरचित डेटा अंतर्ग्रहण", link: "/hi-IN/use-cases/enterprise/unstructured-data-ingestion" },
            { text: "तृतीय-पक्ष पोर्टल स्वचालन", link: "/hi-IN/use-cases/enterprise/portal-automation" },
            { text: "उत्पादन में AI अनुमान", link: "/hi-IN/use-cases/enterprise/ai-inference-in-production" },
          ],
        },
      ],
      "/hi-IN/guide/": [
        {
          text: "शुरू करें",
          items: [
            { text: "अवलोकन", link: "/hi-IN/guide/" },
            {
              text: "स्थापना और परिनियोजन",
              link: "/hi-IN/guide/installation",
            },
            { text: "त्वरित शुरुआत", link: "/hi-IN/guide/quickstart" },
            { text: "कॉन्फ़िगरेशन", link: "/hi-IN/guide/configuration" },
            {
              text: "SPINE और Triggers",
              link: "/hi-IN/guide/spine-and-triggers",
            },
            { text: "CLI कमांड", link: "/hi-IN/guide/commands" },
            {
              text: "वर्गीकरण गाइड",
              link: "/hi-IN/guide/classification-guide",
            },
          ],
        },
      ],
      "/hi-IN/architecture/": [
        {
          text: "आर्किटेक्चर",
          items: [
            { text: "अवलोकन", link: "/hi-IN/architecture/" },
            {
              text: "वर्गीकरण प्रणाली",
              link: "/hi-IN/architecture/classification",
            },
            {
              text: "नीति इंजन और Hooks",
              link: "/hi-IN/architecture/policy-engine",
            },
            {
              text: "सत्र और Taint",
              link: "/hi-IN/architecture/taint-and-sessions",
            },
            { text: "गेटवे", link: "/hi-IN/architecture/gateway" },
            { text: "भंडारण", link: "/hi-IN/architecture/storage" },
            {
              text: "गहन रक्षा",
              link: "/hi-IN/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/hi-IN/security/": [
        {
          text: "सुरक्षा मॉडल",
          items: [
            { text: "सुरक्षा-प्रथम डिज़ाइन", link: "/hi-IN/security/" },
            {
              text: "डाउनग्रेड लेखन निषेध नियम",
              link: "/hi-IN/security/no-write-down",
            },
            { text: "पहचान और प्रमाणीकरण", link: "/hi-IN/security/identity" },
            {
              text: "एजेंट प्रतिनिधिमंडल",
              link: "/hi-IN/security/agent-delegation",
            },
            { text: "सीक्रेट प्रबंधन", link: "/hi-IN/security/secrets" },
            {
              text: "ऑडिट और अनुपालन",
              link: "/hi-IN/security/audit-logging",
            },
          ],
        },
        {
          text: "विश्वास और अनुपालन",
          items: [
            { text: "विश्वास केंद्र", link: "/hi-IN/security/trust-center" },
            {
              text: "जिम्मेदार प्रकटीकरण",
              link: "/hi-IN/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/hi-IN/channels/": [
        {
          text: "चैनल",
          items: [
            { text: "अवलोकन", link: "/hi-IN/channels/" },
            { text: "CLI", link: "/hi-IN/channels/cli" },
            { text: "Telegram", link: "/hi-IN/channels/telegram" },
            { text: "Slack", link: "/hi-IN/channels/slack" },
            { text: "Discord", link: "/hi-IN/channels/discord" },
            { text: "WhatsApp", link: "/hi-IN/channels/whatsapp" },
            { text: "WebChat", link: "/hi-IN/channels/webchat" },
            { text: "Email", link: "/hi-IN/channels/email" },
            { text: "Signal", link: "/hi-IN/channels/signal" },
            { text: "Google Chat", link: "/hi-IN/channels/google-chat" },
          ],
        },
      ],
      "/hi-IN/integrations/": [
        {
          text: "एकीकरण",
          items: [
            { text: "अवलोकन", link: "/hi-IN/integrations/" },
            { text: "MCP Gateway", link: "/hi-IN/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/hi-IN/integrations/plugins" },
            {
              text: "निष्पादन वातावरण",
              link: "/hi-IN/integrations/exec-environment",
            },
            { text: "Skills", link: "/hi-IN/integrations/skills" },
            {
              text: "Skills निर्माण",
              link: "/hi-IN/integrations/building-skills",
            },
            {
              text: "ब्राउज़र स्वचालन",
              link: "/hi-IN/integrations/browser",
            },
            { text: "Webhooks", link: "/hi-IN/integrations/webhooks" },
            { text: "GitHub", link: "/hi-IN/integrations/github" },
            {
              text: "Google Workspace",
              link: "/hi-IN/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/hi-IN/integrations/obsidian" },
            { text: "CalDAV", link: "/hi-IN/integrations/caldav" },
            { text: "दूरस्थ पहुँच", link: "/hi-IN/integrations/remote" },
          ],
        },
      ],
      "/hi-IN/features/": [
        {
          text: "सुविधाएँ",
          items: [
            { text: "अवलोकन", link: "/hi-IN/features/" },
            {
              text: "Cron और Triggers",
              link: "/hi-IN/features/cron-and-triggers",
            },
            { text: "आवाज़", link: "/hi-IN/features/voice" },
            { text: "Tide Pool / A2UI", link: "/hi-IN/features/tidepool" },
            {
              text: "मल्टी-एजेंट रूटिंग",
              link: "/hi-IN/features/multi-agent",
            },
            {
              text: "मॉडल फ़ेलओवर",
              link: "/hi-IN/features/model-failover",
            },
            { text: "सूचनाएँ", link: "/hi-IN/features/notifications" },
            { text: "लॉगिंग", link: "/hi-IN/features/logging" },
            { text: "एजेंट टीम", link: "/hi-IN/features/agent-teams" },
            { text: "वर्कफ़्लो", link: "/hi-IN/features/workflows" },
            { text: "दर सीमा", link: "/hi-IN/features/rate-limiting" },
            { text: "अन्वेषण", link: "/hi-IN/features/explore" },
            { text: "फ़ाइल सिस्टम", link: "/hi-IN/features/filesystem" },
            { text: "छवि और दृष्टि", link: "/hi-IN/features/image-vision" },
            { text: "स्मृति", link: "/hi-IN/features/memory" },
            { text: "योजना", link: "/hi-IN/features/planning" },
            { text: "सत्र", link: "/hi-IN/features/sessions" },
            { text: "वेब खोज", link: "/hi-IN/features/web-search" },
            { text: "सब-एजेंट", link: "/hi-IN/features/subagents" },
          ],
        },
      ],
      "/hi-IN/reference/": [
        {
          text: "संदर्भ",
          items: [
            { text: "अवलोकन", link: "/hi-IN/reference/" },
            { text: "कॉन्फ़िग स्कीमा", link: "/hi-IN/reference/config-yaml" },
            { text: "वर्कफ़्लो DSL", link: "/hi-IN/reference/workflow-dsl" },
            { text: "इंटरफ़ेस", link: "/hi-IN/reference/interfaces" },
            { text: "शब्दावली", link: "/hi-IN/reference/glossary" },
          ],
        },
      ],
      "/hi-IN/support/": [
        {
          text: "सहायता केंद्र",
          items: [
            { text: "अवलोकन", link: "/hi-IN/support/" },
            {
              text: "अक्सर पूछे जाने वाले प्रश्न",
              link: "/hi-IN/support/faq",
            },
          ],
        },
        {
          text: "समस्या निवारण",
          items: [
            {
              text: "यहाँ से शुरू करें",
              link: "/hi-IN/support/troubleshooting/",
            },
            {
              text: "स्थापना",
              link: "/hi-IN/support/troubleshooting/installation",
            },
            {
              text: "डेमन",
              link: "/hi-IN/support/troubleshooting/daemon",
            },
            {
              text: "कॉन्फ़िगरेशन",
              link: "/hi-IN/support/troubleshooting/configuration",
            },
            {
              text: "चैनल",
              link: "/hi-IN/support/troubleshooting/channels",
            },
            {
              text: "LLM प्रदाता",
              link: "/hi-IN/support/troubleshooting/providers",
            },
            {
              text: "एकीकरण",
              link: "/hi-IN/support/troubleshooting/integrations",
            },
            {
              text: "ब्राउज़र स्वचालन",
              link: "/hi-IN/support/troubleshooting/browser",
            },
            {
              text: "सुरक्षा और वर्गीकरण",
              link: "/hi-IN/support/troubleshooting/security",
            },
            {
              text: "सीक्रेट और क्रेडेंशियल",
              link: "/hi-IN/support/troubleshooting/secrets",
            },
            {
              text: "वर्कफ़्लो",
              link: "/hi-IN/support/troubleshooting/workflows",
            },
            {
              text: "त्रुटि संदर्भ",
              link: "/hi-IN/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "कैसे करें गाइड",
          items: [
            {
              text: "लॉग संग्रहण",
              link: "/hi-IN/support/guides/collecting-logs",
            },
            {
              text: "डायग्नोस्टिक्स चलाना",
              link: "/hi-IN/support/guides/diagnostics",
            },
            {
              text: "समस्या रिपोर्ट करना",
              link: "/hi-IN/support/guides/filing-issues",
            },
            {
              text: "प्लेटफ़ॉर्म नोट्स",
              link: "/hi-IN/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "ज्ञान आधार",
          items: [
            {
              text: "सीक्रेट माइग्रेशन",
              link: "/hi-IN/support/kb/secrets-migration",
            },
            {
              text: "स्वतः अपडेट प्रक्रिया",
              link: "/hi-IN/support/kb/self-update",
            },
            {
              text: "महत्वपूर्ण बदलाव",
              link: "/hi-IN/support/kb/breaking-changes",
            },
            {
              text: "ज्ञात समस्याएँ",
              link: "/hi-IN/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "GitHub पर इस पृष्ठ को संपादित करें",
    },
    footer: {
      message:
        'Apache 2.0 लाइसेंस के तहत जारी। | <a href="/hi-IN/account">खाता</a> | <a href="/hi-IN/privacy-policy">गोपनीयता नीति</a> | <a href="/hi-IN/cookie-policy">कुकी नीति</a> | <a href="/hi-IN/terms-of-service">सेवा की शर्तें</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "पिछला पृष्ठ",
      next: "अगला पृष्ठ",
    },
    lastUpdated: {
      text: "अंतिम अपडेट",
    },
    outline: {
      label: "इस पृष्ठ पर",
    },
    returnToTopLabel: "शीर्ष पर लौटें",
    sidebarMenuLabel: "मेनू",
    darkModeSwitchLabel: "थीम",
    langMenuLabel: "भाषा बदलें",
    notFound: {
      title: "पृष्ठ नहीं मिला",
      quote:
        "आप जिस पृष्ठ की तलाश कर रहे हैं वह मौजूद नहीं है या स्थानांतरित कर दिया गया है।",
      linkLabel: "होम पर जाएँ",
      linkText: "होम पर ले चलें",
      code: "404",
    },
  },
};
