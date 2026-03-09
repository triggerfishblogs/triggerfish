import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const zhCN: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "zh-CN",
  label: "简体中文",
  description:
    "安全的多渠道 AI 代理平台，在 LLM 层之下实施确定性策略执行。",
  themeConfig: {
    nav: [
      { text: "指南", link: "/zh-CN/guide/" },
      { text: "定价", link: "/zh-CN/pricing" },
      { text: "架构", link: "/zh-CN/architecture/" },
      { text: "安全", link: "/zh-CN/security/" },
      { text: "渠道", link: "/zh-CN/channels/" },
      { text: "集成", link: "/zh-CN/integrations/" },
      { text: "功能", link: "/zh-CN/features/" },
      { text: "参考", link: "/zh-CN/reference/" },
      { text: "支持", link: "/zh-CN/support/" },
    ],
    sidebar: {
      "/zh-CN/guide/": [
        {
          text: "入门",
          items: [
            { text: "概览", link: "/zh-CN/guide/" },
            { text: "安装与部署", link: "/zh-CN/guide/installation" },
            { text: "快速开始", link: "/zh-CN/guide/quickstart" },
            { text: "配置", link: "/zh-CN/guide/configuration" },
            { text: "SPINE 与 Triggers", link: "/zh-CN/guide/spine-and-triggers" },
            { text: "CLI 命令", link: "/zh-CN/guide/commands" },
            {
              text: "分类指南",
              link: "/zh-CN/guide/classification-guide",
            },
          ],
        },
      ],
      "/zh-CN/architecture/": [
        {
          text: "架构",
          items: [
            { text: "概览", link: "/zh-CN/architecture/" },
            {
              text: "分类系统",
              link: "/zh-CN/architecture/classification",
            },
            {
              text: "策略引擎与 Hooks",
              link: "/zh-CN/architecture/policy-engine",
            },
            {
              text: "会话与 Taint",
              link: "/zh-CN/architecture/taint-and-sessions",
            },
            { text: "网关", link: "/zh-CN/architecture/gateway" },
            { text: "存储", link: "/zh-CN/architecture/storage" },
            {
              text: "纵深防御",
              link: "/zh-CN/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/zh-CN/security/": [
        {
          text: "安全模型",
          items: [
            { text: "安全优先设计", link: "/zh-CN/security/" },
            { text: "禁止降级写入规则", link: "/zh-CN/security/no-write-down" },
            { text: "身份与认证", link: "/zh-CN/security/identity" },
            { text: "代理委派", link: "/zh-CN/security/agent-delegation" },
            { text: "密钥管理", link: "/zh-CN/security/secrets" },
            { text: "审计与合规", link: "/zh-CN/security/audit-logging" },
          ],
        },
        {
          text: "信任与合规",
          items: [
            { text: "信任中心", link: "/zh-CN/security/trust-center" },
            {
              text: "负责任披露",
              link: "/zh-CN/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/zh-CN/channels/": [
        {
          text: "渠道",
          items: [
            { text: "概览", link: "/zh-CN/channels/" },
            { text: "CLI", link: "/zh-CN/channels/cli" },
            { text: "Telegram", link: "/zh-CN/channels/telegram" },
            { text: "Slack", link: "/zh-CN/channels/slack" },
            { text: "Discord", link: "/zh-CN/channels/discord" },
            { text: "WhatsApp", link: "/zh-CN/channels/whatsapp" },
            { text: "WebChat", link: "/zh-CN/channels/webchat" },
            { text: "Email", link: "/zh-CN/channels/email" },
            { text: "Signal", link: "/zh-CN/channels/signal" },
            { text: "Google Chat", link: "/zh-CN/channels/google-chat" },
          ],
        },
      ],
      "/zh-CN/integrations/": [
        {
          text: "集成",
          items: [
            { text: "概览", link: "/zh-CN/integrations/" },
            { text: "MCP Gateway", link: "/zh-CN/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/zh-CN/integrations/plugins" },
            {
              text: "执行环境",
              link: "/zh-CN/integrations/exec-environment",
            },
            { text: "Skills", link: "/zh-CN/integrations/skills" },
            { text: "创建 Skills", link: "/zh-CN/integrations/building-skills" },
            { text: "浏览器自动化", link: "/zh-CN/integrations/browser" },
            { text: "Webhooks", link: "/zh-CN/integrations/webhooks" },
            { text: "GitHub", link: "/zh-CN/integrations/github" },
            {
              text: "Google Workspace",
              link: "/zh-CN/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/zh-CN/integrations/obsidian" },
            { text: "CalDAV", link: "/zh-CN/integrations/caldav" },
            { text: "远程访问", link: "/zh-CN/integrations/remote" },
          ],
        },
      ],
      "/zh-CN/features/": [
        {
          text: "功能",
          items: [
            { text: "概览", link: "/zh-CN/features/" },
            { text: "Cron 与 Triggers", link: "/zh-CN/features/cron-and-triggers" },
            { text: "语音", link: "/zh-CN/features/voice" },
            { text: "Tide Pool / A2UI", link: "/zh-CN/features/tidepool" },
            { text: "多代理路由", link: "/zh-CN/features/multi-agent" },
            { text: "模型故障转移", link: "/zh-CN/features/model-failover" },
            { text: "通知", link: "/zh-CN/features/notifications" },
            { text: "日志", link: "/zh-CN/features/logging" },
            { text: "代理团队", link: "/zh-CN/features/agent-teams" },
            { text: "速率限制", link: "/zh-CN/features/rate-limiting" },
            { text: "探索", link: "/zh-CN/features/explore" },
            { text: "文件系统", link: "/zh-CN/features/filesystem" },
            { text: "图像与视觉", link: "/zh-CN/features/image-vision" },
            { text: "记忆", link: "/zh-CN/features/memory" },
            { text: "规划", link: "/zh-CN/features/planning" },
            { text: "会话", link: "/zh-CN/features/sessions" },
            { text: "网页搜索", link: "/zh-CN/features/web-search" },
            { text: "子代理", link: "/zh-CN/features/subagents" },
          ],
        },
      ],
      "/zh-CN/reference/": [
        {
          text: "参考",
          items: [
            { text: "概览", link: "/zh-CN/reference/" },
            { text: "配置模式", link: "/zh-CN/reference/config-yaml" },
            { text: "接口", link: "/zh-CN/reference/interfaces" },
            { text: "术语表", link: "/zh-CN/reference/glossary" },
          ],
        },
      ],
      "/zh-CN/support/": [
        {
          text: "支持中心",
          items: [
            { text: "概览", link: "/zh-CN/support/" },
            { text: "常见问题", link: "/zh-CN/support/faq" },
          ],
        },
        {
          text: "故障排除",
          items: [
            { text: "从这里开始", link: "/zh-CN/support/troubleshooting/" },
            {
              text: "安装",
              link: "/zh-CN/support/troubleshooting/installation",
            },
            { text: "守护进程", link: "/zh-CN/support/troubleshooting/daemon" },
            {
              text: "配置",
              link: "/zh-CN/support/troubleshooting/configuration",
            },
            { text: "渠道", link: "/zh-CN/support/troubleshooting/channels" },
            {
              text: "LLM 提供商",
              link: "/zh-CN/support/troubleshooting/providers",
            },
            {
              text: "集成",
              link: "/zh-CN/support/troubleshooting/integrations",
            },
            {
              text: "浏览器自动化",
              link: "/zh-CN/support/troubleshooting/browser",
            },
            {
              text: "安全与分类",
              link: "/zh-CN/support/troubleshooting/security",
            },
            {
              text: "密钥与凭据",
              link: "/zh-CN/support/troubleshooting/secrets",
            },
            {
              text: "错误参考",
              link: "/zh-CN/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "操作指南",
          items: [
            {
              text: "收集日志",
              link: "/zh-CN/support/guides/collecting-logs",
            },
            {
              text: "运行诊断",
              link: "/zh-CN/support/guides/diagnostics",
            },
            { text: "提交问题", link: "/zh-CN/support/guides/filing-issues" },
            {
              text: "平台说明",
              link: "/zh-CN/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "知识库",
          items: [
            {
              text: "密钥迁移",
              link: "/zh-CN/support/kb/secrets-migration",
            },
            { text: "自动更新流程", link: "/zh-CN/support/kb/self-update" },
            {
              text: "重大变更",
              link: "/zh-CN/support/kb/breaking-changes",
            },
            { text: "已知问题", link: "/zh-CN/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "在 GitHub 上编辑此页",
    },
    footer: {
      message:
        '基于 Apache 2.0 许可证发布。 | <a href="/zh-CN/account">账户</a> | <a href="/zh-CN/privacy-policy">隐私政策</a> | <a href="/zh-CN/cookie-policy">Cookie 政策</a> | <a href="/zh-CN/terms-of-service">服务条款</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "上一页",
      next: "下一页",
    },
    lastUpdated: {
      text: "最后更新",
    },
    outline: {
      label: "本页目录",
    },
    returnToTopLabel: "返回顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "外观",
    langMenuLabel: "切换语言",
    notFound: {
      title: "页面未找到",
      quote:
        "您访问的页面不存在或已被移动。",
      linkLabel: "返回首页",
      linkText: "返回首页",
      code: "404",
    },
  },
};
