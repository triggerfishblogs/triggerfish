import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const esES: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "es-ES",
  label: "Español (España)",
  description:
    "Plataforma de agentes de IA segura y multicanal con aplicación determinista de políticas por debajo de la capa del LLM.",
  themeConfig: {
    nav: [
      { text: "Guía", link: "/es-ES/guide/" },
      { text: "Precios", link: "/es-ES/pricing" },
      {
        text: "Documentación",
        items: [
          { text: "Arquitectura", link: "/es-ES/architecture/" },
          { text: "Seguridad", link: "/es-ES/security/" },
          { text: "Canales", link: "/es-ES/channels/" },
          { text: "Integraciones", link: "/es-ES/integrations/" },
          { text: "Funcionalidades", link: "/es-ES/features/" },
          { text: "Referencia", link: "/es-ES/reference/" },
        ],
      },
      { text: "Casos de uso", link: "/es-ES/use-cases/enterprise/" },
      { text: "Soporte", link: "/es-ES/support/" },
    ],
    sidebar: {
      "/es-ES/use-cases/enterprise/": [
        {
          text: "Casos de uso empresariales",
          items: [
            { text: "Vista general", link: "/es-ES/use-cases/enterprise/" },
            { text: "Orquestación multisistema", link: "/es-ES/use-cases/enterprise/cross-system-orchestration" },
            { text: "Ingesta de datos no estructurados", link: "/es-ES/use-cases/enterprise/unstructured-data-ingestion" },
            { text: "Automatización de portales de terceros", link: "/es-ES/use-cases/enterprise/portal-automation" },
            { text: "Inferencia de IA en producción", link: "/es-ES/use-cases/enterprise/ai-inference-in-production" },
          ],
        },
      ],
      "/es-ES/guide/": [
        {
          text: "Primeros pasos",
          items: [
            { text: "Vista general", link: "/es-ES/guide/" },
            {
              text: "Instalación y despliegue",
              link: "/es-ES/guide/installation",
            },
            { text: "Inicio rápido", link: "/es-ES/guide/quickstart" },
            { text: "Configuración", link: "/es-ES/guide/configuration" },
            {
              text: "SPINE y Triggers",
              link: "/es-ES/guide/spine-and-triggers",
            },
            { text: "Comandos CLI", link: "/es-ES/guide/commands" },
            {
              text: "Guía de clasificación",
              link: "/es-ES/guide/classification-guide",
            },
          ],
        },
      ],
      "/es-ES/architecture/": [
        {
          text: "Arquitectura",
          items: [
            { text: "Vista general", link: "/es-ES/architecture/" },
            {
              text: "Sistema de clasificación",
              link: "/es-ES/architecture/classification",
            },
            {
              text: "Motor de políticas y hooks",
              link: "/es-ES/architecture/policy-engine",
            },
            {
              text: "Sesiones y taint",
              link: "/es-ES/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/es-ES/architecture/gateway" },
            { text: "Almacenamiento", link: "/es-ES/architecture/storage" },
            {
              text: "Defensa en profundidad",
              link: "/es-ES/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/es-ES/security/": [
        {
          text: "Modelo de seguridad",
          items: [
            {
              text: "Diseño de seguridad primero",
              link: "/es-ES/security/",
            },
            {
              text: "Regla de no escritura descendente",
              link: "/es-ES/security/no-write-down",
            },
            {
              text: "Identidad y autenticación",
              link: "/es-ES/security/identity",
            },
            {
              text: "Delegación de agentes",
              link: "/es-ES/security/agent-delegation",
            },
            {
              text: "Gestión de secretos",
              link: "/es-ES/security/secrets",
            },
            {
              text: "Auditoría y cumplimiento",
              link: "/es-ES/security/audit-logging",
            },
          ],
        },
        {
          text: "Confianza y cumplimiento",
          items: [
            {
              text: "Centro de confianza",
              link: "/es-ES/security/trust-center",
            },
            {
              text: "Divulgación responsable",
              link: "/es-ES/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/es-ES/channels/": [
        {
          text: "Canales",
          items: [
            { text: "Vista general", link: "/es-ES/channels/" },
            { text: "CLI", link: "/es-ES/channels/cli" },
            { text: "Telegram", link: "/es-ES/channels/telegram" },
            { text: "Slack", link: "/es-ES/channels/slack" },
            { text: "Discord", link: "/es-ES/channels/discord" },
            { text: "WhatsApp", link: "/es-ES/channels/whatsapp" },
            { text: "WebChat", link: "/es-ES/channels/webchat" },
            { text: "Correo electrónico", link: "/es-ES/channels/email" },
            { text: "Signal", link: "/es-ES/channels/signal" },
            { text: "Google Chat", link: "/es-ES/channels/google-chat" },
          ],
        },
      ],
      "/es-ES/integrations/": [
        {
          text: "Integraciones",
          items: [
            { text: "Vista general", link: "/es-ES/integrations/" },
            { text: "MCP Gateway", link: "/es-ES/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/es-ES/integrations/plugins" },
            {
              text: "Entorno de ejecución",
              link: "/es-ES/integrations/exec-environment",
            },
            { text: "Skills", link: "/es-ES/integrations/skills" },
            {
              text: "Creación de skills",
              link: "/es-ES/integrations/building-skills",
            },
            {
              text: "Automatización del navegador",
              link: "/es-ES/integrations/browser",
            },
            { text: "Webhooks", link: "/es-ES/integrations/webhooks" },
            { text: "GitHub", link: "/es-ES/integrations/github" },
            {
              text: "Google Workspace",
              link: "/es-ES/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/es-ES/integrations/obsidian" },
            { text: "CalDAV", link: "/es-ES/integrations/caldav" },
            { text: "Acceso remoto", link: "/es-ES/integrations/remote" },
          ],
        },
      ],
      "/es-ES/features/": [
        {
          text: "Funcionalidades",
          items: [
            { text: "Vista general", link: "/es-ES/features/" },
            {
              text: "Cron y Triggers",
              link: "/es-ES/features/cron-and-triggers",
            },
            { text: "Voz", link: "/es-ES/features/voice" },
            { text: "Tide Pool / A2UI", link: "/es-ES/features/tidepool" },
            {
              text: "Enrutamiento multiagente",
              link: "/es-ES/features/multi-agent",
            },
            {
              text: "Conmutación por error de modelos",
              link: "/es-ES/features/model-failover",
            },
            {
              text: "Notificaciones",
              link: "/es-ES/features/notifications",
            },
            { text: "Registro de eventos", link: "/es-ES/features/logging" },
            {
              text: "Equipos de agentes",
              link: "/es-ES/features/agent-teams",
            },
            {
              text: "Flujos de trabajo",
              link: "/es-ES/features/workflows",
            },
            {
              text: "Limitación de velocidad",
              link: "/es-ES/features/rate-limiting",
            },
            { text: "Explorar", link: "/es-ES/features/explore" },
            {
              text: "Sistema de archivos",
              link: "/es-ES/features/filesystem",
            },
            {
              text: "Imagen y visión",
              link: "/es-ES/features/image-vision",
            },
            { text: "Memoria", link: "/es-ES/features/memory" },
            { text: "Planificación", link: "/es-ES/features/planning" },
            { text: "Sesiones", link: "/es-ES/features/sessions" },
            {
              text: "Búsqueda web",
              link: "/es-ES/features/web-search",
            },
            { text: "Subagentes", link: "/es-ES/features/subagents" },
          ],
        },
      ],
      "/es-ES/reference/": [
        {
          text: "Referencia",
          items: [
            { text: "Vista general", link: "/es-ES/reference/" },
            {
              text: "Esquema de configuración",
              link: "/es-ES/reference/config-yaml",
            },
            {
              text: "DSL de flujos de trabajo",
              link: "/es-ES/reference/workflow-dsl",
            },
            { text: "Interfaces", link: "/es-ES/reference/interfaces" },
            { text: "Glosario", link: "/es-ES/reference/glossary" },
          ],
        },
      ],
      "/es-ES/support/": [
        {
          text: "Centro de soporte",
          items: [
            { text: "Vista general", link: "/es-ES/support/" },
            { text: "FAQ", link: "/es-ES/support/faq" },
          ],
        },
        {
          text: "Solución de problemas",
          items: [
            {
              text: "Comience aquí",
              link: "/es-ES/support/troubleshooting/",
            },
            {
              text: "Instalación",
              link: "/es-ES/support/troubleshooting/installation",
            },
            {
              text: "Daemon",
              link: "/es-ES/support/troubleshooting/daemon",
            },
            {
              text: "Configuración",
              link: "/es-ES/support/troubleshooting/configuration",
            },
            {
              text: "Canales",
              link: "/es-ES/support/troubleshooting/channels",
            },
            {
              text: "Proveedores de LLM",
              link: "/es-ES/support/troubleshooting/providers",
            },
            {
              text: "Integraciones",
              link: "/es-ES/support/troubleshooting/integrations",
            },
            {
              text: "Automatización del navegador",
              link: "/es-ES/support/troubleshooting/browser",
            },
            {
              text: "Seguridad y clasificación",
              link: "/es-ES/support/troubleshooting/security",
            },
            {
              text: "Secretos y credenciales",
              link: "/es-ES/support/troubleshooting/secrets",
            },
            {
              text: "Flujos de trabajo",
              link: "/es-ES/support/troubleshooting/workflows",
            },
            {
              text: "Referencia de errores",
              link: "/es-ES/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Guías prácticas",
          items: [
            {
              text: "Recopilación de registros",
              link: "/es-ES/support/guides/collecting-logs",
            },
            {
              text: "Ejecución de diagnósticos",
              link: "/es-ES/support/guides/diagnostics",
            },
            {
              text: "Creación de incidencias",
              link: "/es-ES/support/guides/filing-issues",
            },
            {
              text: "Notas de plataforma",
              link: "/es-ES/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Base de conocimiento",
          items: [
            {
              text: "Migración de secretos",
              link: "/es-ES/support/kb/secrets-migration",
            },
            {
              text: "Proceso de autoactualización",
              link: "/es-ES/support/kb/self-update",
            },
            {
              text: "Cambios incompatibles",
              link: "/es-ES/support/kb/breaking-changes",
            },
            {
              text: "Problemas conocidos",
              link: "/es-ES/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "Editar esta página en GitHub",
    },
    footer: {
      message:
        'Publicado bajo la licencia Apache 2.0. | <a href="/es-ES/account">Cuenta</a> | <a href="/es-ES/privacy-policy">Política de privacidad</a> | <a href="/es-ES/cookie-policy">Política de cookies</a> | <a href="/es-ES/terms-of-service">Términos de servicio</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Página anterior",
      next: "Página siguiente",
    },
    lastUpdated: {
      text: "Última actualización",
    },
    outline: {
      label: "En esta página",
    },
    returnToTopLabel: "Volver arriba",
    sidebarMenuLabel: "Menú",
    darkModeSwitchLabel: "Apariencia",
    langMenuLabel: "Cambiar idioma",
    notFound: {
      title: "PÁGINA NO ENCONTRADA",
      quote:
        "La página que busca no existe o ha sido movida.",
      linkLabel: "Ir al inicio",
      linkText: "Llévame al inicio",
      code: "404",
    },
  },
};
