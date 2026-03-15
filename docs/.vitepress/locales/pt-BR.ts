import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const ptBR: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "pt-BR",
  label: "Português (Brasil)",
  description:
    "Plataforma segura de agentes de IA multicanal com aplicação determinística de políticas abaixo da camada LLM.",
  themeConfig: {
    nav: [
      { text: "Guia", link: "/pt-BR/guide/" },
      { text: "Preços", link: "/pt-BR/pricing" },
      {
        text: "Documentação",
        items: [
          { text: "Arquitetura", link: "/pt-BR/architecture/" },
          { text: "Segurança", link: "/pt-BR/security/" },
          { text: "Canais", link: "/pt-BR/channels/" },
          { text: "Integrações", link: "/pt-BR/integrations/" },
          { text: "Recursos", link: "/pt-BR/features/" },
          { text: "Referência", link: "/pt-BR/reference/" },
        ],
      },
      { text: "Suporte", link: "/pt-BR/support/" },
    ],
    sidebar: {
      "/pt-BR/guide/": [
        {
          text: "Primeiros Passos",
          items: [
            { text: "Visão Geral", link: "/pt-BR/guide/" },
            {
              text: "Instalação e Implantação",
              link: "/pt-BR/guide/installation",
            },
            { text: "Início Rápido", link: "/pt-BR/guide/quickstart" },
            { text: "Configuração", link: "/pt-BR/guide/configuration" },
            {
              text: "SPINE e Triggers",
              link: "/pt-BR/guide/spine-and-triggers",
            },
            { text: "Comandos CLI", link: "/pt-BR/guide/commands" },
            {
              text: "Guia de Classificação",
              link: "/pt-BR/guide/classification-guide",
            },
          ],
        },
      ],
      "/pt-BR/architecture/": [
        {
          text: "Arquitetura",
          items: [
            { text: "Visão Geral", link: "/pt-BR/architecture/" },
            {
              text: "Sistema de Classificação",
              link: "/pt-BR/architecture/classification",
            },
            {
              text: "Motor de Políticas e Hooks",
              link: "/pt-BR/architecture/policy-engine",
            },
            {
              text: "Sessões e Taint",
              link: "/pt-BR/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/pt-BR/architecture/gateway" },
            { text: "Armazenamento", link: "/pt-BR/architecture/storage" },
            {
              text: "Defesa em Profundidade",
              link: "/pt-BR/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/pt-BR/security/": [
        {
          text: "Modelo de Segurança",
          items: [
            {
              text: "Design Segurança-Primeiro",
              link: "/pt-BR/security/",
            },
            {
              text: "Regra de Proibição de Escrita Descendente",
              link: "/pt-BR/security/no-write-down",
            },
            {
              text: "Identidade e Autenticação",
              link: "/pt-BR/security/identity",
            },
            {
              text: "Delegação de Agente",
              link: "/pt-BR/security/agent-delegation",
            },
            {
              text: "Gerenciamento de Segredos",
              link: "/pt-BR/security/secrets",
            },
            {
              text: "Auditoria e Conformidade",
              link: "/pt-BR/security/audit-logging",
            },
          ],
        },
        {
          text: "Confiança e Conformidade",
          items: [
            {
              text: "Centro de Confiança",
              link: "/pt-BR/security/trust-center",
            },
            {
              text: "Divulgação Responsável",
              link: "/pt-BR/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/pt-BR/channels/": [
        {
          text: "Canais",
          items: [
            { text: "Visão Geral", link: "/pt-BR/channels/" },
            { text: "CLI", link: "/pt-BR/channels/cli" },
            { text: "Telegram", link: "/pt-BR/channels/telegram" },
            { text: "Slack", link: "/pt-BR/channels/slack" },
            { text: "Discord", link: "/pt-BR/channels/discord" },
            { text: "WhatsApp", link: "/pt-BR/channels/whatsapp" },
            { text: "WebChat", link: "/pt-BR/channels/webchat" },
            { text: "Email", link: "/pt-BR/channels/email" },
            { text: "Signal", link: "/pt-BR/channels/signal" },
            { text: "Google Chat", link: "/pt-BR/channels/google-chat" },
          ],
        },
      ],
      "/pt-BR/integrations/": [
        {
          text: "Integrações",
          items: [
            { text: "Visão Geral", link: "/pt-BR/integrations/" },
            {
              text: "MCP Gateway",
              link: "/pt-BR/integrations/mcp-gateway",
            },
            { text: "Plugin SDK", link: "/pt-BR/integrations/plugins" },
            {
              text: "Ambiente de Execução",
              link: "/pt-BR/integrations/exec-environment",
            },
            { text: "Skills", link: "/pt-BR/integrations/skills" },
            {
              text: "Construindo Skills",
              link: "/pt-BR/integrations/building-skills",
            },
            {
              text: "Automação de Navegador",
              link: "/pt-BR/integrations/browser",
            },
            { text: "Webhooks", link: "/pt-BR/integrations/webhooks" },
            { text: "GitHub", link: "/pt-BR/integrations/github" },
            {
              text: "Google Workspace",
              link: "/pt-BR/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/pt-BR/integrations/obsidian" },
            { text: "CalDAV", link: "/pt-BR/integrations/caldav" },
            { text: "Acesso Remoto", link: "/pt-BR/integrations/remote" },
          ],
        },
      ],
      "/pt-BR/features/": [
        {
          text: "Recursos",
          items: [
            { text: "Visão Geral", link: "/pt-BR/features/" },
            {
              text: "Cron e Triggers",
              link: "/pt-BR/features/cron-and-triggers",
            },
            { text: "Voz", link: "/pt-BR/features/voice" },
            { text: "Tide Pool / A2UI", link: "/pt-BR/features/tidepool" },
            {
              text: "Roteamento Multi-Agente",
              link: "/pt-BR/features/multi-agent",
            },
            {
              text: "Failover de Modelo",
              link: "/pt-BR/features/model-failover",
            },
            { text: "Notificações", link: "/pt-BR/features/notifications" },
            { text: "Registro de Logs", link: "/pt-BR/features/logging" },
            {
              text: "Equipes de Agentes",
              link: "/pt-BR/features/agent-teams",
            },
            {
              text: "Fluxos de trabalho",
              link: "/pt-BR/features/workflows",
            },
            {
              text: "Limitação de Taxa",
              link: "/pt-BR/features/rate-limiting",
            },
            { text: "Explorar", link: "/pt-BR/features/explore" },
            {
              text: "Sistema de Arquivos",
              link: "/pt-BR/features/filesystem",
            },
            {
              text: "Imagem e Visão",
              link: "/pt-BR/features/image-vision",
            },
            { text: "Memória", link: "/pt-BR/features/memory" },
            { text: "Planejamento", link: "/pt-BR/features/planning" },
            { text: "Sessões", link: "/pt-BR/features/sessions" },
            { text: "Busca na Web", link: "/pt-BR/features/web-search" },
            { text: "Subagentes", link: "/pt-BR/features/subagents" },
          ],
        },
      ],
      "/pt-BR/reference/": [
        {
          text: "Referência",
          items: [
            { text: "Visão Geral", link: "/pt-BR/reference/" },
            {
              text: "Schema de Configuração",
              link: "/pt-BR/reference/config-yaml",
            },
            {
              text: "DSL de fluxos de trabalho",
              link: "/pt-BR/reference/workflow-dsl",
            },
            { text: "Interfaces", link: "/pt-BR/reference/interfaces" },
            { text: "Glossário", link: "/pt-BR/reference/glossary" },
          ],
        },
      ],
      "/pt-BR/support/": [
        {
          text: "Centro de Suporte",
          items: [
            { text: "Visão Geral", link: "/pt-BR/support/" },
            { text: "FAQ", link: "/pt-BR/support/faq" },
          ],
        },
        {
          text: "Solução de Problemas",
          items: [
            {
              text: "Comece Aqui",
              link: "/pt-BR/support/troubleshooting/",
            },
            {
              text: "Instalação",
              link: "/pt-BR/support/troubleshooting/installation",
            },
            {
              text: "Daemon",
              link: "/pt-BR/support/troubleshooting/daemon",
            },
            {
              text: "Configuração",
              link: "/pt-BR/support/troubleshooting/configuration",
            },
            {
              text: "Canais",
              link: "/pt-BR/support/troubleshooting/channels",
            },
            {
              text: "Provedores de LLM",
              link: "/pt-BR/support/troubleshooting/providers",
            },
            {
              text: "Integrações",
              link: "/pt-BR/support/troubleshooting/integrations",
            },
            {
              text: "Automação de Navegador",
              link: "/pt-BR/support/troubleshooting/browser",
            },
            {
              text: "Segurança e Classificação",
              link: "/pt-BR/support/troubleshooting/security",
            },
            {
              text: "Segredos e Credenciais",
              link: "/pt-BR/support/troubleshooting/secrets",
            },
            {
              text: "Fluxos de trabalho",
              link: "/pt-BR/support/troubleshooting/workflows",
            },
            {
              text: "Referência de Erros",
              link: "/pt-BR/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Guias Práticos",
          items: [
            {
              text: "Coletando Logs",
              link: "/pt-BR/support/guides/collecting-logs",
            },
            {
              text: "Executando Diagnósticos",
              link: "/pt-BR/support/guides/diagnostics",
            },
            {
              text: "Reportando Problemas",
              link: "/pt-BR/support/guides/filing-issues",
            },
            {
              text: "Notas de Plataforma",
              link: "/pt-BR/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Base de Conhecimento",
          items: [
            {
              text: "Migração de Segredos",
              link: "/pt-BR/support/kb/secrets-migration",
            },
            {
              text: "Processo de Autoatualização",
              link: "/pt-BR/support/kb/self-update",
            },
            {
              text: "Mudanças Incompatíveis",
              link: "/pt-BR/support/kb/breaking-changes",
            },
            {
              text: "Problemas Conhecidos",
              link: "/pt-BR/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "Editar esta página no GitHub",
    },
    footer: {
      message:
        'Distribuído sob a licença Apache 2.0. | <a href="/pt-BR/account">Conta</a> | <a href="/pt-BR/privacy-policy">Política de Privacidade</a> | <a href="/pt-BR/cookie-policy">Política de Cookies</a> | <a href="/pt-BR/terms-of-service">Termos de Serviço</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Página anterior",
      next: "Próxima página",
    },
    lastUpdated: {
      text: "Última atualização",
    },
    outline: {
      label: "Nesta página",
    },
    returnToTopLabel: "Voltar ao topo",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Aparência",
    langMenuLabel: "Mudar idioma",
    notFound: {
      title: "PÁGINA NÃO ENCONTRADA",
      quote:
        "A página que você está procurando não existe ou foi movida.",
      linkLabel: "Ir para a página inicial",
      linkText: "Voltar para o início",
      code: "404",
    },
  },
};
