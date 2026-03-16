import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const zhTW: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "zh-TW",
  label: "繁體中文",
  description:
    "安全的多頻道 AI 代理平台，在 LLM 層之下實施確定性策略執行。",
  themeConfig: {
    nav: [
      { text: "指南", link: "/zh-TW/guide/" },
      { text: "定價", link: "/zh-TW/pricing" },
      {
        text: "文件",
        items: [
          { text: "架構", link: "/zh-TW/architecture/" },
          { text: "安全", link: "/zh-TW/security/" },
          { text: "頻道", link: "/zh-TW/channels/" },
          { text: "整合", link: "/zh-TW/integrations/" },
          { text: "功能", link: "/zh-TW/features/" },
          { text: "參考", link: "/zh-TW/reference/" },
        ],
      },
      { text: "使用案例", link: "/zh-TW/use-cases/enterprise/" },
      { text: "支援", link: "/zh-TW/support/" },
    ],
    sidebar: {
      "/zh-TW/use-cases/enterprise/": [
        {
          text: "企業使用案例",
          items: [
            { text: "概覽", link: "/zh-TW/use-cases/enterprise/" },
            { text: "跨系統編排", link: "/zh-TW/use-cases/enterprise/cross-system-orchestration" },
            { text: "非結構化資料擷取", link: "/zh-TW/use-cases/enterprise/unstructured-data-ingestion" },
            { text: "第三方入口網站自動化", link: "/zh-TW/use-cases/enterprise/portal-automation" },
            { text: "生產工作流程的 AI 推論整合", link: "/zh-TW/use-cases/enterprise/ai-inference-in-production" },
          ],
        },
      ],
      "/zh-TW/guide/": [
        {
          text: "入門",
          items: [
            { text: "概覽", link: "/zh-TW/guide/" },
            { text: "安裝與部署", link: "/zh-TW/guide/installation" },
            { text: "快速開始", link: "/zh-TW/guide/quickstart" },
            { text: "設定", link: "/zh-TW/guide/configuration" },
            { text: "SPINE 與 Triggers", link: "/zh-TW/guide/spine-and-triggers" },
            { text: "CLI 指令", link: "/zh-TW/guide/commands" },
            {
              text: "分類指南",
              link: "/zh-TW/guide/classification-guide",
            },
          ],
        },
      ],
      "/zh-TW/architecture/": [
        {
          text: "架構",
          items: [
            { text: "概覽", link: "/zh-TW/architecture/" },
            {
              text: "分類系統",
              link: "/zh-TW/architecture/classification",
            },
            {
              text: "策略引擎與 Hooks",
              link: "/zh-TW/architecture/policy-engine",
            },
            {
              text: "工作階段與 Taint",
              link: "/zh-TW/architecture/taint-and-sessions",
            },
            { text: "閘道", link: "/zh-TW/architecture/gateway" },
            { text: "儲存", link: "/zh-TW/architecture/storage" },
            {
              text: "縱深防禦",
              link: "/zh-TW/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/zh-TW/security/": [
        {
          text: "安全模型",
          items: [
            { text: "安全優先設計", link: "/zh-TW/security/" },
            { text: "禁止降級寫入規則", link: "/zh-TW/security/no-write-down" },
            { text: "身分與驗證", link: "/zh-TW/security/identity" },
            { text: "代理委派", link: "/zh-TW/security/agent-delegation" },
            { text: "密鑰管理", link: "/zh-TW/security/secrets" },
            { text: "稽核與合規", link: "/zh-TW/security/audit-logging" },
          ],
        },
        {
          text: "信任與合規",
          items: [
            { text: "信任中心", link: "/zh-TW/security/trust-center" },
            {
              text: "負責任揭露",
              link: "/zh-TW/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/zh-TW/channels/": [
        {
          text: "頻道",
          items: [
            { text: "概覽", link: "/zh-TW/channels/" },
            { text: "CLI", link: "/zh-TW/channels/cli" },
            { text: "Telegram", link: "/zh-TW/channels/telegram" },
            { text: "Slack", link: "/zh-TW/channels/slack" },
            { text: "Discord", link: "/zh-TW/channels/discord" },
            { text: "WhatsApp", link: "/zh-TW/channels/whatsapp" },
            { text: "WebChat", link: "/zh-TW/channels/webchat" },
            { text: "Email", link: "/zh-TW/channels/email" },
            { text: "Signal", link: "/zh-TW/channels/signal" },
            { text: "Google Chat", link: "/zh-TW/channels/google-chat" },
          ],
        },
      ],
      "/zh-TW/integrations/": [
        {
          text: "整合",
          items: [
            { text: "概覽", link: "/zh-TW/integrations/" },
            { text: "MCP Gateway", link: "/zh-TW/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/zh-TW/integrations/plugins" },
            {
              text: "執行環境",
              link: "/zh-TW/integrations/exec-environment",
            },
            { text: "Skills", link: "/zh-TW/integrations/skills" },
            { text: "建立 Skills", link: "/zh-TW/integrations/building-skills" },
            { text: "瀏覽器自動化", link: "/zh-TW/integrations/browser" },
            { text: "Webhooks", link: "/zh-TW/integrations/webhooks" },
            { text: "GitHub", link: "/zh-TW/integrations/github" },
            {
              text: "Google Workspace",
              link: "/zh-TW/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/zh-TW/integrations/obsidian" },
            { text: "CalDAV", link: "/zh-TW/integrations/caldav" },
            { text: "遠端存取", link: "/zh-TW/integrations/remote" },
          ],
        },
      ],
      "/zh-TW/features/": [
        {
          text: "功能",
          items: [
            { text: "概覽", link: "/zh-TW/features/" },
            { text: "Cron 與 Triggers", link: "/zh-TW/features/cron-and-triggers" },
            { text: "語音", link: "/zh-TW/features/voice" },
            { text: "Tide Pool / A2UI", link: "/zh-TW/features/tidepool" },
            { text: "多代理路由", link: "/zh-TW/features/multi-agent" },
            { text: "模型容錯移轉", link: "/zh-TW/features/model-failover" },
            { text: "通知", link: "/zh-TW/features/notifications" },
            { text: "日誌", link: "/zh-TW/features/logging" },
            { text: "代理團隊", link: "/zh-TW/features/agent-teams" },
            { text: "速率限制", link: "/zh-TW/features/rate-limiting" },
            { text: "探索", link: "/zh-TW/features/explore" },
            { text: "檔案系統", link: "/zh-TW/features/filesystem" },
            { text: "影像與視覺", link: "/zh-TW/features/image-vision" },
            { text: "記憶", link: "/zh-TW/features/memory" },
            { text: "規劃", link: "/zh-TW/features/planning" },
            { text: "工作階段", link: "/zh-TW/features/sessions" },
            { text: "網頁搜尋", link: "/zh-TW/features/web-search" },
            { text: "子代理", link: "/zh-TW/features/subagents" },
            { text: "工作流程", link: "/zh-TW/features/workflows" },
          ],
        },
      ],
      "/zh-TW/reference/": [
        {
          text: "參考",
          items: [
            { text: "概覽", link: "/zh-TW/reference/" },
            { text: "設定架構", link: "/zh-TW/reference/config-yaml" },
            { text: "工作流程 DSL", link: "/zh-TW/reference/workflow-dsl" },
            { text: "介面", link: "/zh-TW/reference/interfaces" },
            { text: "詞彙表", link: "/zh-TW/reference/glossary" },
          ],
        },
      ],
      "/zh-TW/support/": [
        {
          text: "支援中心",
          items: [
            { text: "概覽", link: "/zh-TW/support/" },
            { text: "常見問題", link: "/zh-TW/support/faq" },
          ],
        },
        {
          text: "疑難排解",
          items: [
            { text: "從這裡開始", link: "/zh-TW/support/troubleshooting/" },
            {
              text: "安裝",
              link: "/zh-TW/support/troubleshooting/installation",
            },
            { text: "背景程式", link: "/zh-TW/support/troubleshooting/daemon" },
            {
              text: "設定",
              link: "/zh-TW/support/troubleshooting/configuration",
            },
            { text: "頻道", link: "/zh-TW/support/troubleshooting/channels" },
            {
              text: "LLM 供應商",
              link: "/zh-TW/support/troubleshooting/providers",
            },
            {
              text: "整合",
              link: "/zh-TW/support/troubleshooting/integrations",
            },
            {
              text: "瀏覽器自動化",
              link: "/zh-TW/support/troubleshooting/browser",
            },
            {
              text: "安全與分類",
              link: "/zh-TW/support/troubleshooting/security",
            },
            {
              text: "密鑰與憑證",
              link: "/zh-TW/support/troubleshooting/secrets",
            },
            { text: "工作流程", link: "/zh-TW/support/troubleshooting/workflows" },
            {
              text: "錯誤參考",
              link: "/zh-TW/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "操作指南",
          items: [
            {
              text: "收集日誌",
              link: "/zh-TW/support/guides/collecting-logs",
            },
            {
              text: "執行診斷",
              link: "/zh-TW/support/guides/diagnostics",
            },
            { text: "回報問題", link: "/zh-TW/support/guides/filing-issues" },
            {
              text: "平台說明",
              link: "/zh-TW/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "知識庫",
          items: [
            {
              text: "密鑰遷移",
              link: "/zh-TW/support/kb/secrets-migration",
            },
            { text: "自動更新流程", link: "/zh-TW/support/kb/self-update" },
            {
              text: "重大變更",
              link: "/zh-TW/support/kb/breaking-changes",
            },
            { text: "已知問題", link: "/zh-TW/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "在 GitHub 上編輯此頁",
    },
    footer: {
      message:
        '基於 Apache 2.0 授權條款發布。 | <a href="/zh-TW/account">帳戶</a> | <a href="/zh-TW/privacy-policy">隱私權政策</a> | <a href="/zh-TW/cookie-policy">Cookie 政策</a> | <a href="/zh-TW/terms-of-service">服務條款</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "上一頁",
      next: "下一頁",
    },
    lastUpdated: {
      text: "最後更新",
    },
    outline: {
      label: "本頁目錄",
    },
    returnToTopLabel: "返回頂部",
    sidebarMenuLabel: "選單",
    darkModeSwitchLabel: "外觀",
    langMenuLabel: "切換語言",
    notFound: {
      title: "頁面未找到",
      quote:
        "您存取的頁面不存在或已被移動。",
      linkLabel: "返回首頁",
      linkText: "返回首頁",
      code: "404",
    },
  },
};
