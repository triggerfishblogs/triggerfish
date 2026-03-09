import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const koKR: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "ko-KR",
  label: "한국어",
  description:
    "LLM 계층 아래에서 결정론적 정책 시행을 수행하는 안전한 멀티채널 AI 에이전트 플랫폼.",
  themeConfig: {
    nav: [
      { text: "가이드", link: "/ko-KR/guide/" },
      { text: "요금제", link: "/ko-KR/pricing" },
      { text: "아키텍처", link: "/ko-KR/architecture/" },
      { text: "보안", link: "/ko-KR/security/" },
      { text: "채널", link: "/ko-KR/channels/" },
      { text: "통합", link: "/ko-KR/integrations/" },
      { text: "기능", link: "/ko-KR/features/" },
      { text: "레퍼런스", link: "/ko-KR/reference/" },
      { text: "지원", link: "/ko-KR/support/" },
    ],
    sidebar: {
      "/ko-KR/guide/": [
        {
          text: "시작하기",
          items: [
            { text: "개요", link: "/ko-KR/guide/" },
            { text: "설치 및 배포", link: "/ko-KR/guide/installation" },
            { text: "빠른 시작", link: "/ko-KR/guide/quickstart" },
            { text: "구성", link: "/ko-KR/guide/configuration" },
            { text: "SPINE 및 Triggers", link: "/ko-KR/guide/spine-and-triggers" },
            { text: "CLI 명령어", link: "/ko-KR/guide/commands" },
            {
              text: "분류 가이드",
              link: "/ko-KR/guide/classification-guide",
            },
          ],
        },
      ],
      "/ko-KR/architecture/": [
        {
          text: "아키텍처",
          items: [
            { text: "개요", link: "/ko-KR/architecture/" },
            {
              text: "분류 시스템",
              link: "/ko-KR/architecture/classification",
            },
            {
              text: "정책 엔진 및 Hooks",
              link: "/ko-KR/architecture/policy-engine",
            },
            {
              text: "세션 및 Taint",
              link: "/ko-KR/architecture/taint-and-sessions",
            },
            { text: "게이트웨이", link: "/ko-KR/architecture/gateway" },
            { text: "스토리지", link: "/ko-KR/architecture/storage" },
            {
              text: "심층 방어",
              link: "/ko-KR/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/ko-KR/security/": [
        {
          text: "보안 모델",
          items: [
            { text: "보안 우선 설계", link: "/ko-KR/security/" },
            { text: "하향 기록 금지 규칙", link: "/ko-KR/security/no-write-down" },
            { text: "신원 및 인증", link: "/ko-KR/security/identity" },
            { text: "에이전트 위임", link: "/ko-KR/security/agent-delegation" },
            { text: "시크릿 관리", link: "/ko-KR/security/secrets" },
            { text: "감사 및 규정 준수", link: "/ko-KR/security/audit-logging" },
          ],
        },
        {
          text: "신뢰 및 규정 준수",
          items: [
            { text: "신뢰 센터", link: "/ko-KR/security/trust-center" },
            {
              text: "책임 있는 공개",
              link: "/ko-KR/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/ko-KR/channels/": [
        {
          text: "채널",
          items: [
            { text: "개요", link: "/ko-KR/channels/" },
            { text: "CLI", link: "/ko-KR/channels/cli" },
            { text: "Telegram", link: "/ko-KR/channels/telegram" },
            { text: "Slack", link: "/ko-KR/channels/slack" },
            { text: "Discord", link: "/ko-KR/channels/discord" },
            { text: "WhatsApp", link: "/ko-KR/channels/whatsapp" },
            { text: "WebChat", link: "/ko-KR/channels/webchat" },
            { text: "Email", link: "/ko-KR/channels/email" },
            { text: "Signal", link: "/ko-KR/channels/signal" },
            { text: "Google Chat", link: "/ko-KR/channels/google-chat" },
          ],
        },
      ],
      "/ko-KR/integrations/": [
        {
          text: "통합",
          items: [
            { text: "개요", link: "/ko-KR/integrations/" },
            { text: "MCP Gateway", link: "/ko-KR/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/ko-KR/integrations/plugins" },
            {
              text: "실행 환경",
              link: "/ko-KR/integrations/exec-environment",
            },
            { text: "Skills", link: "/ko-KR/integrations/skills" },
            { text: "Skills 제작", link: "/ko-KR/integrations/building-skills" },
            { text: "브라우저 자동화", link: "/ko-KR/integrations/browser" },
            { text: "Webhooks", link: "/ko-KR/integrations/webhooks" },
            { text: "GitHub", link: "/ko-KR/integrations/github" },
            {
              text: "Google Workspace",
              link: "/ko-KR/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/ko-KR/integrations/obsidian" },
            { text: "CalDAV", link: "/ko-KR/integrations/caldav" },
            { text: "원격 접속", link: "/ko-KR/integrations/remote" },
          ],
        },
      ],
      "/ko-KR/features/": [
        {
          text: "기능",
          items: [
            { text: "개요", link: "/ko-KR/features/" },
            { text: "Cron 및 Triggers", link: "/ko-KR/features/cron-and-triggers" },
            { text: "음성", link: "/ko-KR/features/voice" },
            { text: "Tide Pool / A2UI", link: "/ko-KR/features/tidepool" },
            { text: "멀티 에이전트 라우팅", link: "/ko-KR/features/multi-agent" },
            { text: "모델 장애 조치", link: "/ko-KR/features/model-failover" },
            { text: "알림", link: "/ko-KR/features/notifications" },
            { text: "로깅", link: "/ko-KR/features/logging" },
            { text: "에이전트 팀", link: "/ko-KR/features/agent-teams" },
            { text: "속도 제한", link: "/ko-KR/features/rate-limiting" },
            { text: "탐색", link: "/ko-KR/features/explore" },
            { text: "파일 시스템", link: "/ko-KR/features/filesystem" },
            { text: "이미지 및 비전", link: "/ko-KR/features/image-vision" },
            { text: "메모리", link: "/ko-KR/features/memory" },
            { text: "계획", link: "/ko-KR/features/planning" },
            { text: "세션", link: "/ko-KR/features/sessions" },
            { text: "웹 검색", link: "/ko-KR/features/web-search" },
            { text: "서브 에이전트", link: "/ko-KR/features/subagents" },
          ],
        },
      ],
      "/ko-KR/reference/": [
        {
          text: "레퍼런스",
          items: [
            { text: "개요", link: "/ko-KR/reference/" },
            { text: "구성 스키마", link: "/ko-KR/reference/config-yaml" },
            { text: "인터페이스", link: "/ko-KR/reference/interfaces" },
            { text: "용어집", link: "/ko-KR/reference/glossary" },
          ],
        },
      ],
      "/ko-KR/support/": [
        {
          text: "지원 센터",
          items: [
            { text: "개요", link: "/ko-KR/support/" },
            { text: "자주 묻는 질문", link: "/ko-KR/support/faq" },
          ],
        },
        {
          text: "문제 해결",
          items: [
            { text: "여기서 시작", link: "/ko-KR/support/troubleshooting/" },
            {
              text: "설치",
              link: "/ko-KR/support/troubleshooting/installation",
            },
            { text: "데몬", link: "/ko-KR/support/troubleshooting/daemon" },
            {
              text: "구성",
              link: "/ko-KR/support/troubleshooting/configuration",
            },
            { text: "채널", link: "/ko-KR/support/troubleshooting/channels" },
            {
              text: "LLM 제공자",
              link: "/ko-KR/support/troubleshooting/providers",
            },
            {
              text: "통합",
              link: "/ko-KR/support/troubleshooting/integrations",
            },
            {
              text: "브라우저 자동화",
              link: "/ko-KR/support/troubleshooting/browser",
            },
            {
              text: "보안 및 분류",
              link: "/ko-KR/support/troubleshooting/security",
            },
            {
              text: "시크릿 및 자격 증명",
              link: "/ko-KR/support/troubleshooting/secrets",
            },
            {
              text: "오류 레퍼런스",
              link: "/ko-KR/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "사용 가이드",
          items: [
            {
              text: "로그 수집",
              link: "/ko-KR/support/guides/collecting-logs",
            },
            {
              text: "진단 실행",
              link: "/ko-KR/support/guides/diagnostics",
            },
            { text: "이슈 제출", link: "/ko-KR/support/guides/filing-issues" },
            {
              text: "플랫폼 참고 사항",
              link: "/ko-KR/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "지식 베이스",
          items: [
            {
              text: "시크릿 마이그레이션",
              link: "/ko-KR/support/kb/secrets-migration",
            },
            { text: "자동 업데이트 프로세스", link: "/ko-KR/support/kb/self-update" },
            {
              text: "주요 변경 사항",
              link: "/ko-KR/support/kb/breaking-changes",
            },
            { text: "알려진 문제", link: "/ko-KR/support/kb/known-issues" },
          ],
        },
      ],
    },
    editLink: {
      text: "GitHub에서 이 페이지 편집",
    },
    footer: {
      message:
        'Apache 2.0 라이선스로 배포되었습니다. | <a href="/ko-KR/account">계정</a> | <a href="/ko-KR/privacy-policy">개인정보 처리방침</a> | <a href="/ko-KR/cookie-policy">쿠키 정책</a> | <a href="/ko-KR/terms-of-service">서비스 약관</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "이전 페이지",
      next: "다음 페이지",
    },
    lastUpdated: {
      text: "최종 업데이트",
    },
    outline: {
      label: "이 페이지 목차",
    },
    returnToTopLabel: "맨 위로 돌아가기",
    sidebarMenuLabel: "메뉴",
    darkModeSwitchLabel: "테마",
    langMenuLabel: "언어 변경",
    notFound: {
      title: "페이지를 찾을 수 없습니다",
      quote:
        "찾으시는 페이지가 존재하지 않거나 이동되었습니다.",
      linkLabel: "홈으로 이동",
      linkText: "홈으로 돌아가기",
      code: "404",
    },
  },
};
