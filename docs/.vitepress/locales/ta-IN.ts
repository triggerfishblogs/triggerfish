import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const taIN: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "ta-IN",
  label: "தமிழ்",
  description:
    "LLM அடுக்கிற்கு கீழே நிர்ணயமான கொள்கை அமலாக்கத்துடன் பாதுகாப்பான, பல-சேனல் AI முகவர் தளம்.",
  themeConfig: {
    nav: [
      { text: "வழிகாட்டி", link: "/ta-IN/guide/" },
      { text: "விலை", link: "/ta-IN/pricing" },
      {
        text: "ஆவணங்கள்",
        items: [
          { text: "கட்டமைப்பு", link: "/ta-IN/architecture/" },
          { text: "பாதுகாப்பு", link: "/ta-IN/security/" },
          { text: "சேனல்கள்", link: "/ta-IN/channels/" },
          { text: "ஒருங்கிணைப்புகள்", link: "/ta-IN/integrations/" },
          { text: "அம்சங்கள்", link: "/ta-IN/features/" },
          { text: "குறிப்பு", link: "/ta-IN/reference/" },
        ],
      },
      { text: "ஆதரவு", link: "/ta-IN/support/" },
    ],
    sidebar: {
      "/ta-IN/guide/": [
        {
          text: "தொடங்குங்கள்",
          items: [
            { text: "கண்ணோட்டம்", link: "/ta-IN/guide/" },
            { text: "நிறுவல் மற்றும் வரிசைப்படுத்தல்", link: "/ta-IN/guide/installation" },
            { text: "விரைவு தொடக்கம்", link: "/ta-IN/guide/quickstart" },
            { text: "கட்டமைவு", link: "/ta-IN/guide/configuration" },
            { text: "SPINE மற்றும் Triggers", link: "/ta-IN/guide/spine-and-triggers" },
            { text: "CLI கட்டளைகள்", link: "/ta-IN/guide/commands" },
            {
              text: "வகைப்படுத்தல் வழிகாட்டி",
              link: "/ta-IN/guide/classification-guide",
            },
          ],
        },
      ],
      "/ta-IN/architecture/": [
        {
          text: "கட்டமைப்பு",
          items: [
            { text: "கண்ணோட்டம்", link: "/ta-IN/architecture/" },
            {
              text: "வகைப்படுத்தல் அமைப்பு",
              link: "/ta-IN/architecture/classification",
            },
            {
              text: "கொள்கை இயந்திரம் மற்றும் Hooks",
              link: "/ta-IN/architecture/policy-engine",
            },
            {
              text: "அமர்வுகள் மற்றும் Taint",
              link: "/ta-IN/architecture/taint-and-sessions",
            },
            { text: "நுழைவாயில்", link: "/ta-IN/architecture/gateway" },
            { text: "சேமிப்பு", link: "/ta-IN/architecture/storage" },
            {
              text: "ஆழமான பாதுகாப்பு",
              link: "/ta-IN/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/ta-IN/security/": [
        {
          text: "பாதுகாப்பு மாதிரி",
          items: [
            { text: "பாதுகாப்பு-முதல் வடிவமைப்பு", link: "/ta-IN/security/" },
            { text: "கீழ்நிலை எழுத்து தடை விதி", link: "/ta-IN/security/no-write-down" },
            { text: "அடையாளம் மற்றும் அங்கீகாரம்", link: "/ta-IN/security/identity" },
            { text: "முகவர் பிரதிநிதித்துவம்", link: "/ta-IN/security/agent-delegation" },
            { text: "ரகசிய மேலாண்மை", link: "/ta-IN/security/secrets" },
            { text: "தணிக்கை மற்றும் இணக்கம்", link: "/ta-IN/security/audit-logging" },
          ],
        },
        {
          text: "நம்பிக்கை மற்றும் இணக்கம்",
          items: [
            { text: "நம்பிக்கை மையம்", link: "/ta-IN/security/trust-center" },
            {
              text: "பொறுப்பான வெளிப்படுத்தல்",
              link: "/ta-IN/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/ta-IN/channels/": [
        {
          text: "சேனல்கள்",
          items: [
            { text: "கண்ணோட்டம்", link: "/ta-IN/channels/" },
            { text: "CLI", link: "/ta-IN/channels/cli" },
            { text: "Telegram", link: "/ta-IN/channels/telegram" },
            { text: "Slack", link: "/ta-IN/channels/slack" },
            { text: "Discord", link: "/ta-IN/channels/discord" },
            { text: "WhatsApp", link: "/ta-IN/channels/whatsapp" },
            { text: "WebChat", link: "/ta-IN/channels/webchat" },
            { text: "Email", link: "/ta-IN/channels/email" },
            { text: "Signal", link: "/ta-IN/channels/signal" },
            { text: "Google Chat", link: "/ta-IN/channels/google-chat" },
          ],
        },
      ],
      "/ta-IN/integrations/": [
        {
          text: "ஒருங்கிணைப்புகள்",
          items: [
            { text: "கண்ணோட்டம்", link: "/ta-IN/integrations/" },
            { text: "MCP Gateway", link: "/ta-IN/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/ta-IN/integrations/plugins" },
            {
              text: "செயல்படுத்தல் சூழல்",
              link: "/ta-IN/integrations/exec-environment",
            },
            { text: "Skills", link: "/ta-IN/integrations/skills" },
            { text: "Skills உருவாக்கம்", link: "/ta-IN/integrations/building-skills" },
            { text: "உலாவி தானியங்கி", link: "/ta-IN/integrations/browser" },
            { text: "Webhooks", link: "/ta-IN/integrations/webhooks" },
            { text: "GitHub", link: "/ta-IN/integrations/github" },
            {
              text: "Google Workspace",
              link: "/ta-IN/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/ta-IN/integrations/obsidian" },
            { text: "CalDAV", link: "/ta-IN/integrations/caldav" },
            { text: "தொலை அணுகல்", link: "/ta-IN/integrations/remote" },
          ],
        },
      ],
      "/ta-IN/features/": [
        {
          text: "அம்சங்கள்",
          items: [
            { text: "கண்ணோட்டம்", link: "/ta-IN/features/" },
            { text: "Cron மற்றும் Triggers", link: "/ta-IN/features/cron-and-triggers" },
            { text: "குரல்", link: "/ta-IN/features/voice" },
            { text: "Tide Pool / A2UI", link: "/ta-IN/features/tidepool" },
            { text: "பல-முகவர் வழிப்படுத்தல்", link: "/ta-IN/features/multi-agent" },
            { text: "மாடல் தோல்வி மாற்றம்", link: "/ta-IN/features/model-failover" },
            { text: "அறிவிப்புகள்", link: "/ta-IN/features/notifications" },
            { text: "பதிவு", link: "/ta-IN/features/logging" },
            { text: "முகவர் குழுக்கள்", link: "/ta-IN/features/agent-teams" },
            { text: "பணிப்பாய்வுகள்", link: "/ta-IN/features/workflows" },
            { text: "வீத வரம்பு", link: "/ta-IN/features/rate-limiting" },
            { text: "ஆராய்தல்", link: "/ta-IN/features/explore" },
            { text: "கோப்பு அமைப்பு", link: "/ta-IN/features/filesystem" },
            { text: "படம் மற்றும் பார்வை", link: "/ta-IN/features/image-vision" },
            { text: "நினைவகம்", link: "/ta-IN/features/memory" },
            { text: "திட்டமிடல்", link: "/ta-IN/features/planning" },
            { text: "அமர்வுகள்", link: "/ta-IN/features/sessions" },
            { text: "வலை தேடல்", link: "/ta-IN/features/web-search" },
            { text: "துணை முகவர்கள்", link: "/ta-IN/features/subagents" },
          ],
        },
      ],
      "/ta-IN/reference/": [
        {
          text: "குறிப்பு",
          items: [
            { text: "கண்ணோட்டம்", link: "/ta-IN/reference/" },
            { text: "கட்டமைவு திட்டம்", link: "/ta-IN/reference/config-yaml" },
            { text: "பணிப்பாய்வு DSL", link: "/ta-IN/reference/workflow-dsl" },
            { text: "இடைமுகங்கள்", link: "/ta-IN/reference/interfaces" },
            { text: "சொற்களஞ்சியம்", link: "/ta-IN/reference/glossary" },
          ],
        },
      ],
      "/ta-IN/support/": [
        {
          text: "ஆதரவு மையம்",
          items: [
            { text: "கண்ணோட்டம்", link: "/ta-IN/support/" },
            { text: "அடிக்கடி கேட்கப்படும் கேள்விகள்", link: "/ta-IN/support/faq" },
          ],
        },
        {
          text: "சிக்கல் தீர்வு",
          items: [
            { text: "இங்கே தொடங்குங்கள்", link: "/ta-IN/support/troubleshooting/" },
            {
              text: "நிறுவல்",
              link: "/ta-IN/support/troubleshooting/installation",
            },
            { text: "டீமன்", link: "/ta-IN/support/troubleshooting/daemon" },
            {
              text: "கட்டமைவு",
              link: "/ta-IN/support/troubleshooting/configuration",
            },
            { text: "சேனல்கள்", link: "/ta-IN/support/troubleshooting/channels" },
            {
              text: "LLM வழங்குநர்கள்",
              link: "/ta-IN/support/troubleshooting/providers",
            },
            {
              text: "ஒருங்கிணைப்புகள்",
              link: "/ta-IN/support/troubleshooting/integrations",
            },
            {
              text: "உலாவி தானியங்கி",
              link: "/ta-IN/support/troubleshooting/browser",
            },
            {
              text: "பாதுகாப்பு மற்றும் வகைப்படுத்தல்",
              link: "/ta-IN/support/troubleshooting/security",
            },
            {
              text: "ரகசியங்கள் மற்றும் சான்றுகள்",
              link: "/ta-IN/support/troubleshooting/secrets",
            },
            {
              text: "பணிப்பாய்வுகள்",
              link: "/ta-IN/support/troubleshooting/workflows",
            },
            {
              text: "பிழை குறிப்பு",
              link: "/ta-IN/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "எப்படி வழிகாட்டிகள்",
          items: [
            {
              text: "பதிவுகள் சேகரிப்பு",
              link: "/ta-IN/support/guides/collecting-logs",
            },
            {
              text: "கண்டறிதல் இயக்குதல்",
              link: "/ta-IN/support/guides/diagnostics",
            },
            { text: "சிக்கல் அறிக்கை", link: "/ta-IN/support/guides/filing-issues" },
            {
              text: "தள குறிப்புகள்",
              link: "/ta-IN/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "அறிவு தளம்",
          items: [
            {
              text: "ரகசிய இடம்பெயர்வு",
              link: "/ta-IN/support/kb/secrets-migration",
            },
            { text: "சுய-புதுப்பிப்பு செயல்முறை", link: "/ta-IN/support/kb/self-update" },
            {
              text: "முக்கிய மாற்றங்கள்",
              link: "/ta-IN/support/kb/breaking-changes",
            },
            { text: "அறியப்பட்ட சிக்கல்கள்", link: "/ta-IN/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "GitHub இல் இந்தப் பக்கத்தைத் திருத்தவும்",
    },
    footer: {
      message:
        'Apache 2.0 உரிமத்தின் கீழ் வெளியிடப்பட்டது. | <a href="/ta-IN/account">கணக்கு</a> | <a href="/ta-IN/privacy-policy">தனியுரிமைக் கொள்கை</a> | <a href="/ta-IN/cookie-policy">குக்கீ கொள்கை</a> | <a href="/ta-IN/terms-of-service">சேவை விதிமுறைகள்</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "முந்தைய பக்கம்",
      next: "அடுத்த பக்கம்",
    },
    lastUpdated: {
      text: "கடைசியாக புதுப்பிக்கப்பட்டது",
    },
    outline: {
      label: "இந்தப் பக்கத்தில்",
    },
    returnToTopLabel: "மேலே திரும்பு",
    sidebarMenuLabel: "பட்டி",
    darkModeSwitchLabel: "தீம்",
    langMenuLabel: "மொழி மாற்று",
    notFound: {
      title: "பக்கம் கிடைக்கவில்லை",
      quote:
        "நீங்கள் தேடும் பக்கம் இல்லை அல்லது நகர்த்தப்பட்டுள்ளது.",
      linkLabel: "முகப்புக்குச் செல்",
      linkText: "முகப்புக்குத் திரும்பு",
      code: "404",
    },
  },
};
