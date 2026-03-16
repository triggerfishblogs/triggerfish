import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const mrIN: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "mr-IN",
  label: "मराठी",
  description:
    "LLM स्तराच्या खाली निर्णायक धोरण अंमलबजावणीसह सुरक्षित, बहु-चॅनेल AI एजंट प्लॅटफॉर्म.",
  themeConfig: {
    nav: [
      { text: "मार्गदर्शक", link: "/mr-IN/guide/" },
      { text: "किंमत", link: "/mr-IN/pricing" },
      {
        text: "दस्तऐवज",
        items: [
          { text: "आर्किटेक्चर", link: "/mr-IN/architecture/" },
          { text: "सुरक्षा", link: "/mr-IN/security/" },
          { text: "चॅनेल", link: "/mr-IN/channels/" },
          { text: "एकत्रीकरण", link: "/mr-IN/integrations/" },
          { text: "वैशिष्ट्ये", link: "/mr-IN/features/" },
          { text: "संदर्भ", link: "/mr-IN/reference/" },
        ],
      },
      { text: "वापर प्रकरणे", link: "/mr-IN/use-cases/enterprise/" },
      { text: "सहाय्य", link: "/mr-IN/support/" },
    ],
    sidebar: {
      "/mr-IN/use-cases/enterprise/": [
        {
          text: "एंटरप्राइझ वापर प्रकरणे",
          items: [
            { text: "आढावा", link: "/mr-IN/use-cases/enterprise/" },
            { text: "क्रॉस-सिस्टम ऑर्केस्ट्रेशन", link: "/mr-IN/use-cases/enterprise/cross-system-orchestration" },
            { text: "असंरचित डेटा अंतर्ग्रहण", link: "/mr-IN/use-cases/enterprise/unstructured-data-ingestion" },
            { text: "तृतीय-पक्ष पोर्टल स्वयंचलन", link: "/mr-IN/use-cases/enterprise/portal-automation" },
            { text: "उत्पादनात AI अनुमान", link: "/mr-IN/use-cases/enterprise/ai-inference-in-production" },
          ],
        },
      ],
      "/mr-IN/guide/": [
        {
          text: "सुरू करा",
          items: [
            { text: "आढावा", link: "/mr-IN/guide/" },
            { text: "स्थापना आणि तैनाती", link: "/mr-IN/guide/installation" },
            { text: "द्रुत सुरुवात", link: "/mr-IN/guide/quickstart" },
            { text: "कॉन्फिगरेशन", link: "/mr-IN/guide/configuration" },
            { text: "SPINE आणि Triggers", link: "/mr-IN/guide/spine-and-triggers" },
            { text: "CLI आदेश", link: "/mr-IN/guide/commands" },
            {
              text: "वर्गीकरण मार्गदर्शक",
              link: "/mr-IN/guide/classification-guide",
            },
          ],
        },
      ],
      "/mr-IN/architecture/": [
        {
          text: "आर्किटेक्चर",
          items: [
            { text: "आढावा", link: "/mr-IN/architecture/" },
            {
              text: "वर्गीकरण प्रणाली",
              link: "/mr-IN/architecture/classification",
            },
            {
              text: "धोरण इंजिन आणि Hooks",
              link: "/mr-IN/architecture/policy-engine",
            },
            {
              text: "सत्रे आणि Taint",
              link: "/mr-IN/architecture/taint-and-sessions",
            },
            { text: "गेटवे", link: "/mr-IN/architecture/gateway" },
            { text: "संचयन", link: "/mr-IN/architecture/storage" },
            {
              text: "सखोल संरक्षण",
              link: "/mr-IN/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/mr-IN/security/": [
        {
          text: "सुरक्षा मॉडेल",
          items: [
            { text: "सुरक्षा-प्रथम डिझाइन", link: "/mr-IN/security/" },
            { text: "खालच्या स्तरावर लेखन प्रतिबंध नियम", link: "/mr-IN/security/no-write-down" },
            { text: "ओळख आणि प्रमाणीकरण", link: "/mr-IN/security/identity" },
            { text: "एजंट प्रतिनिधीमंडळ", link: "/mr-IN/security/agent-delegation" },
            { text: "गुपिते व्यवस्थापन", link: "/mr-IN/security/secrets" },
            { text: "लेखापरीक्षण आणि अनुपालन", link: "/mr-IN/security/audit-logging" },
          ],
        },
        {
          text: "विश्वास आणि अनुपालन",
          items: [
            { text: "विश्वास केंद्र", link: "/mr-IN/security/trust-center" },
            {
              text: "जबाबदार प्रकटीकरण",
              link: "/mr-IN/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/mr-IN/channels/": [
        {
          text: "चॅनेल",
          items: [
            { text: "आढावा", link: "/mr-IN/channels/" },
            { text: "CLI", link: "/mr-IN/channels/cli" },
            { text: "Telegram", link: "/mr-IN/channels/telegram" },
            { text: "Slack", link: "/mr-IN/channels/slack" },
            { text: "Discord", link: "/mr-IN/channels/discord" },
            { text: "WhatsApp", link: "/mr-IN/channels/whatsapp" },
            { text: "WebChat", link: "/mr-IN/channels/webchat" },
            { text: "Email", link: "/mr-IN/channels/email" },
            { text: "Signal", link: "/mr-IN/channels/signal" },
            { text: "Google Chat", link: "/mr-IN/channels/google-chat" },
          ],
        },
      ],
      "/mr-IN/integrations/": [
        {
          text: "एकत्रीकरण",
          items: [
            { text: "आढावा", link: "/mr-IN/integrations/" },
            { text: "MCP Gateway", link: "/mr-IN/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/mr-IN/integrations/plugins" },
            {
              text: "कार्यान्वयन वातावरण",
              link: "/mr-IN/integrations/exec-environment",
            },
            { text: "Skills", link: "/mr-IN/integrations/skills" },
            { text: "Skills निर्मिती", link: "/mr-IN/integrations/building-skills" },
            { text: "ब्राउझर स्वयंचलन", link: "/mr-IN/integrations/browser" },
            { text: "Webhooks", link: "/mr-IN/integrations/webhooks" },
            { text: "GitHub", link: "/mr-IN/integrations/github" },
            {
              text: "Google Workspace",
              link: "/mr-IN/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/mr-IN/integrations/obsidian" },
            { text: "CalDAV", link: "/mr-IN/integrations/caldav" },
            { text: "दूरस्थ प्रवेश", link: "/mr-IN/integrations/remote" },
          ],
        },
      ],
      "/mr-IN/features/": [
        {
          text: "वैशिष्ट्ये",
          items: [
            { text: "आढावा", link: "/mr-IN/features/" },
            { text: "Cron आणि Triggers", link: "/mr-IN/features/cron-and-triggers" },
            { text: "आवाज", link: "/mr-IN/features/voice" },
            { text: "Tide Pool / A2UI", link: "/mr-IN/features/tidepool" },
            { text: "मल्टी-एजंट रूटिंग", link: "/mr-IN/features/multi-agent" },
            { text: "मॉडेल फेलओव्हर", link: "/mr-IN/features/model-failover" },
            { text: "सूचना", link: "/mr-IN/features/notifications" },
            { text: "लॉगिंग", link: "/mr-IN/features/logging" },
            { text: "एजंट संघ", link: "/mr-IN/features/agent-teams" },
            { text: "वर्कफ्लो", link: "/mr-IN/features/workflows" },
            { text: "दर मर्यादा", link: "/mr-IN/features/rate-limiting" },
            { text: "अन्वेषण", link: "/mr-IN/features/explore" },
            { text: "फाइल सिस्टम", link: "/mr-IN/features/filesystem" },
            { text: "प्रतिमा आणि दृष्टी", link: "/mr-IN/features/image-vision" },
            { text: "स्मृती", link: "/mr-IN/features/memory" },
            { text: "नियोजन", link: "/mr-IN/features/planning" },
            { text: "सत्रे", link: "/mr-IN/features/sessions" },
            { text: "वेब शोध", link: "/mr-IN/features/web-search" },
            { text: "उप-एजंट", link: "/mr-IN/features/subagents" },
          ],
        },
      ],
      "/mr-IN/reference/": [
        {
          text: "संदर्भ",
          items: [
            { text: "आढावा", link: "/mr-IN/reference/" },
            { text: "कॉन्फिग स्कीमा", link: "/mr-IN/reference/config-yaml" },
            { text: "वर्कफ्लो DSL", link: "/mr-IN/reference/workflow-dsl" },
            { text: "इंटरफेस", link: "/mr-IN/reference/interfaces" },
            { text: "शब्दकोश", link: "/mr-IN/reference/glossary" },
          ],
        },
      ],
      "/mr-IN/support/": [
        {
          text: "सहाय्य केंद्र",
          items: [
            { text: "आढावा", link: "/mr-IN/support/" },
            { text: "वारंवार विचारले जाणारे प्रश्न", link: "/mr-IN/support/faq" },
          ],
        },
        {
          text: "समस्या निवारण",
          items: [
            { text: "येथे सुरू करा", link: "/mr-IN/support/troubleshooting/" },
            {
              text: "स्थापना",
              link: "/mr-IN/support/troubleshooting/installation",
            },
            { text: "डेमन", link: "/mr-IN/support/troubleshooting/daemon" },
            {
              text: "कॉन्फिगरेशन",
              link: "/mr-IN/support/troubleshooting/configuration",
            },
            { text: "चॅनेल", link: "/mr-IN/support/troubleshooting/channels" },
            {
              text: "LLM प्रदाते",
              link: "/mr-IN/support/troubleshooting/providers",
            },
            {
              text: "एकत्रीकरण",
              link: "/mr-IN/support/troubleshooting/integrations",
            },
            {
              text: "ब्राउझर स्वयंचलन",
              link: "/mr-IN/support/troubleshooting/browser",
            },
            {
              text: "सुरक्षा आणि वर्गीकरण",
              link: "/mr-IN/support/troubleshooting/security",
            },
            {
              text: "गुपिते आणि प्रमाणपत्रे",
              link: "/mr-IN/support/troubleshooting/secrets",
            },
            {
              text: "वर्कफ्लो",
              link: "/mr-IN/support/troubleshooting/workflows",
            },
            {
              text: "त्रुटी संदर्भ",
              link: "/mr-IN/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "कसे करावे मार्गदर्शक",
          items: [
            {
              text: "लॉग संकलन",
              link: "/mr-IN/support/guides/collecting-logs",
            },
            {
              text: "निदान चालवणे",
              link: "/mr-IN/support/guides/diagnostics",
            },
            { text: "समस्या नोंदवणे", link: "/mr-IN/support/guides/filing-issues" },
            {
              text: "प्लॅटफॉर्म टिपा",
              link: "/mr-IN/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "ज्ञान आधार",
          items: [
            {
              text: "गुपिते स्थलांतर",
              link: "/mr-IN/support/kb/secrets-migration",
            },
            { text: "स्वयं-अद्यतन प्रक्रिया", link: "/mr-IN/support/kb/self-update" },
            {
              text: "महत्त्वाचे बदल",
              link: "/mr-IN/support/kb/breaking-changes",
            },
            { text: "ज्ञात समस्या", link: "/mr-IN/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "GitHub वर हे पृष्ठ संपादित करा",
    },
    footer: {
      message:
        'Apache 2.0 परवान्याअंतर्गत प्रकाशित. | <a href="/mr-IN/account">खाते</a> | <a href="/mr-IN/privacy-policy">गोपनीयता धोरण</a> | <a href="/mr-IN/cookie-policy">कुकी धोरण</a> | <a href="/mr-IN/terms-of-service">सेवा अटी</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "मागील पृष्ठ",
      next: "पुढील पृष्ठ",
    },
    lastUpdated: {
      text: "शेवटचे अद्यतन",
    },
    outline: {
      label: "या पृष्ठावर",
    },
    returnToTopLabel: "वर परत जा",
    sidebarMenuLabel: "मेनू",
    darkModeSwitchLabel: "थीम",
    langMenuLabel: "भाषा बदला",
    notFound: {
      title: "पृष्ठ सापडले नाही",
      quote:
        "आपण शोधत असलेले पृष्ठ अस्तित्वात नाही किंवा हलविले गेले आहे.",
      linkLabel: "मुख्यपृष्ठावर जा",
      linkText: "मुख्यपृष्ठावर परत जा",
      code: "404",
    },
  },
};
