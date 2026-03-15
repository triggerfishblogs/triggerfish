import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const jaJP: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "ja-JP",
  label: "日本語",
  description:
    "LLM層の下で決定論的ポリシー適用を行う、安全なマルチチャネルAIエージェントプラットフォーム。",
  themeConfig: {
    nav: [
      { text: "ガイド", link: "/ja-JP/guide/" },
      { text: "料金", link: "/ja-JP/pricing" },
      {
        text: "ドキュメント",
        items: [
          { text: "アーキテクチャ", link: "/ja-JP/architecture/" },
          { text: "セキュリティ", link: "/ja-JP/security/" },
          { text: "チャネル", link: "/ja-JP/channels/" },
          { text: "統合", link: "/ja-JP/integrations/" },
          { text: "機能", link: "/ja-JP/features/" },
          { text: "リファレンス", link: "/ja-JP/reference/" },
        ],
      },
      { text: "サポート", link: "/ja-JP/support/" },
    ],
    sidebar: {
      "/ja-JP/guide/": [
        {
          text: "はじめに",
          items: [
            { text: "概要", link: "/ja-JP/guide/" },
            { text: "インストールとデプロイ", link: "/ja-JP/guide/installation" },
            { text: "クイックスタート", link: "/ja-JP/guide/quickstart" },
            { text: "設定", link: "/ja-JP/guide/configuration" },
            { text: "SPINEとTriggers", link: "/ja-JP/guide/spine-and-triggers" },
            { text: "CLIコマンド", link: "/ja-JP/guide/commands" },
            {
              text: "分類ガイド",
              link: "/ja-JP/guide/classification-guide",
            },
          ],
        },
      ],
      "/ja-JP/architecture/": [
        {
          text: "アーキテクチャ",
          items: [
            { text: "概要", link: "/ja-JP/architecture/" },
            {
              text: "分類システム",
              link: "/ja-JP/architecture/classification",
            },
            {
              text: "ポリシーエンジンとHooks",
              link: "/ja-JP/architecture/policy-engine",
            },
            {
              text: "セッションとTaint",
              link: "/ja-JP/architecture/taint-and-sessions",
            },
            { text: "ゲートウェイ", link: "/ja-JP/architecture/gateway" },
            { text: "ストレージ", link: "/ja-JP/architecture/storage" },
            {
              text: "多層防御",
              link: "/ja-JP/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/ja-JP/security/": [
        {
          text: "セキュリティモデル",
          items: [
            { text: "セキュリティファースト設計", link: "/ja-JP/security/" },
            { text: "書き下し禁止ルール", link: "/ja-JP/security/no-write-down" },
            { text: "認証と認可", link: "/ja-JP/security/identity" },
            { text: "エージェント委任", link: "/ja-JP/security/agent-delegation" },
            { text: "シークレット管理", link: "/ja-JP/security/secrets" },
            { text: "監査とコンプライアンス", link: "/ja-JP/security/audit-logging" },
          ],
        },
        {
          text: "信頼とコンプライアンス",
          items: [
            { text: "トラストセンター", link: "/ja-JP/security/trust-center" },
            {
              text: "責任ある開示",
              link: "/ja-JP/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/ja-JP/channels/": [
        {
          text: "チャネル",
          items: [
            { text: "概要", link: "/ja-JP/channels/" },
            { text: "CLI", link: "/ja-JP/channels/cli" },
            { text: "Telegram", link: "/ja-JP/channels/telegram" },
            { text: "Slack", link: "/ja-JP/channels/slack" },
            { text: "Discord", link: "/ja-JP/channels/discord" },
            { text: "WhatsApp", link: "/ja-JP/channels/whatsapp" },
            { text: "WebChat", link: "/ja-JP/channels/webchat" },
            { text: "Email", link: "/ja-JP/channels/email" },
            { text: "Signal", link: "/ja-JP/channels/signal" },
            { text: "Google Chat", link: "/ja-JP/channels/google-chat" },
          ],
        },
      ],
      "/ja-JP/integrations/": [
        {
          text: "統合",
          items: [
            { text: "概要", link: "/ja-JP/integrations/" },
            { text: "MCP Gateway", link: "/ja-JP/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/ja-JP/integrations/plugins" },
            {
              text: "実行環境",
              link: "/ja-JP/integrations/exec-environment",
            },
            { text: "Skills", link: "/ja-JP/integrations/skills" },
            { text: "Skills構築", link: "/ja-JP/integrations/building-skills" },
            { text: "ブラウザ自動化", link: "/ja-JP/integrations/browser" },
            { text: "Webhooks", link: "/ja-JP/integrations/webhooks" },
            { text: "GitHub", link: "/ja-JP/integrations/github" },
            {
              text: "Google Workspace",
              link: "/ja-JP/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/ja-JP/integrations/obsidian" },
            { text: "CalDAV", link: "/ja-JP/integrations/caldav" },
            { text: "リモートアクセス", link: "/ja-JP/integrations/remote" },
          ],
        },
      ],
      "/ja-JP/features/": [
        {
          text: "機能",
          items: [
            { text: "概要", link: "/ja-JP/features/" },
            { text: "CronとTriggers", link: "/ja-JP/features/cron-and-triggers" },
            { text: "音声", link: "/ja-JP/features/voice" },
            { text: "Tide Pool / A2UI", link: "/ja-JP/features/tidepool" },
            { text: "マルチエージェントルーティング", link: "/ja-JP/features/multi-agent" },
            { text: "モデルフェイルオーバー", link: "/ja-JP/features/model-failover" },
            { text: "通知", link: "/ja-JP/features/notifications" },
            { text: "ロギング", link: "/ja-JP/features/logging" },
            { text: "エージェントチーム", link: "/ja-JP/features/agent-teams" },
            { text: "ワークフロー", link: "/ja-JP/features/workflows" },
            { text: "レート制限", link: "/ja-JP/features/rate-limiting" },
            { text: "探索", link: "/ja-JP/features/explore" },
            { text: "ファイルシステム", link: "/ja-JP/features/filesystem" },
            { text: "画像とビジョン", link: "/ja-JP/features/image-vision" },
            { text: "メモリ", link: "/ja-JP/features/memory" },
            { text: "プランニング", link: "/ja-JP/features/planning" },
            { text: "セッション", link: "/ja-JP/features/sessions" },
            { text: "ウェブ検索", link: "/ja-JP/features/web-search" },
            { text: "サブエージェント", link: "/ja-JP/features/subagents" },
          ],
        },
      ],
      "/ja-JP/reference/": [
        {
          text: "リファレンス",
          items: [
            { text: "概要", link: "/ja-JP/reference/" },
            { text: "設定スキーマ", link: "/ja-JP/reference/config-yaml" },
            { text: "ワークフローDSL", link: "/ja-JP/reference/workflow-dsl" },
            { text: "インターフェース", link: "/ja-JP/reference/interfaces" },
            { text: "用語集", link: "/ja-JP/reference/glossary" },
          ],
        },
      ],
      "/ja-JP/support/": [
        {
          text: "サポートセンター",
          items: [
            { text: "概要", link: "/ja-JP/support/" },
            { text: "よくある質問", link: "/ja-JP/support/faq" },
          ],
        },
        {
          text: "トラブルシューティング",
          items: [
            { text: "ここから始める", link: "/ja-JP/support/troubleshooting/" },
            {
              text: "インストール",
              link: "/ja-JP/support/troubleshooting/installation",
            },
            { text: "デーモン", link: "/ja-JP/support/troubleshooting/daemon" },
            {
              text: "設定",
              link: "/ja-JP/support/troubleshooting/configuration",
            },
            { text: "チャネル", link: "/ja-JP/support/troubleshooting/channels" },
            {
              text: "LLMプロバイダー",
              link: "/ja-JP/support/troubleshooting/providers",
            },
            {
              text: "統合",
              link: "/ja-JP/support/troubleshooting/integrations",
            },
            {
              text: "ブラウザ自動化",
              link: "/ja-JP/support/troubleshooting/browser",
            },
            {
              text: "セキュリティと分類",
              link: "/ja-JP/support/troubleshooting/security",
            },
            {
              text: "シークレットと資格情報",
              link: "/ja-JP/support/troubleshooting/secrets",
            },
            {
              text: "ワークフロー",
              link: "/ja-JP/support/troubleshooting/workflows",
            },
            {
              text: "エラーリファレンス",
              link: "/ja-JP/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "ハウツーガイド",
          items: [
            {
              text: "ログ収集",
              link: "/ja-JP/support/guides/collecting-logs",
            },
            {
              text: "診断の実行",
              link: "/ja-JP/support/guides/diagnostics",
            },
            { text: "問題の報告", link: "/ja-JP/support/guides/filing-issues" },
            {
              text: "プラットフォームノート",
              link: "/ja-JP/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "ナレッジベース",
          items: [
            {
              text: "シークレット移行",
              link: "/ja-JP/support/kb/secrets-migration",
            },
            { text: "自動更新プロセス", link: "/ja-JP/support/kb/self-update" },
            {
              text: "破壊的変更",
              link: "/ja-JP/support/kb/breaking-changes",
            },
            { text: "既知の問題", link: "/ja-JP/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "GitHubでこのページを編集",
    },
    footer: {
      message:
        'Apache 2.0ライセンスの下で公開。 | <a href="/ja-JP/account">アカウント</a> | <a href="/ja-JP/privacy-policy">プライバシーポリシー</a> | <a href="/ja-JP/cookie-policy">Cookieポリシー</a> | <a href="/ja-JP/terms-of-service">利用規約</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "前のページ",
      next: "次のページ",
    },
    lastUpdated: {
      text: "最終更新",
    },
    outline: {
      label: "このページの目次",
    },
    returnToTopLabel: "トップに戻る",
    sidebarMenuLabel: "メニュー",
    darkModeSwitchLabel: "テーマ",
    langMenuLabel: "言語を変更",
    notFound: {
      title: "ページが見つかりません",
      quote:
        "お探しのページは存在しないか、移動されました。",
      linkLabel: "ホームへ移動",
      linkText: "ホームに戻る",
      code: "404",
    },
  },
};
