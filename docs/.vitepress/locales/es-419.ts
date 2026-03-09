import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const es419: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "es-419",
  label: "Español (Latinoamérica)",
  description:
    "Plataforma segura de agentes de IA multicanal con aplicación determinista de políticas por debajo de la capa LLM.",
  themeConfig: {
    nav: [
      { text: "Guía", link: "/es-419/guide/" },
      { text: "Precios", link: "/es-419/pricing" },
      { text: "Arquitectura", link: "/es-419/architecture/" },
      { text: "Seguridad", link: "/es-419/security/" },
      { text: "Canales", link: "/es-419/channels/" },
      { text: "Integraciones", link: "/es-419/integrations/" },
      { text: "Funcionalidades", link: "/es-419/features/" },
      { text: "Referencia", link: "/es-419/reference/" },
      { text: "Soporte", link: "/es-419/support/" },
    ],
    sidebar: {
      "/es-419/guide/": [
        {
          text: "Primeros pasos",
          items: [
            { text: "Vista general", link: "/es-419/guide/" },
            {
              text: "Instalación y despliegue",
              link: "/es-419/guide/installation",
            },
            { text: "Inicio rápido", link: "/es-419/guide/quickstart" },
            { text: "Configuración", link: "/es-419/guide/configuration" },
            {
              text: "SPINE y Triggers",
              link: "/es-419/guide/spine-and-triggers",
            },
            { text: "Comandos CLI", link: "/es-419/guide/commands" },
            {
              text: "Guía de clasificación",
              link: "/es-419/guide/classification-guide",
            },
          ],
        },
      ],
      "/es-419/architecture/": [
        {
          text: "Arquitectura",
          items: [
            { text: "Vista general", link: "/es-419/architecture/" },
            {
              text: "Sistema de clasificación",
              link: "/es-419/architecture/classification",
            },
            {
              text: "Motor de políticas y Hooks",
              link: "/es-419/architecture/policy-engine",
            },
            {
              text: "Sesiones y Taint",
              link: "/es-419/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/es-419/architecture/gateway" },
            { text: "Almacenamiento", link: "/es-419/architecture/storage" },
            {
              text: "Defensa en profundidad",
              link: "/es-419/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/es-419/security/": [
        {
          text: "Modelo de seguridad",
          items: [
            {
              text: "Diseño con seguridad primero",
              link: "/es-419/security/",
            },
            {
              text: "Regla de no escritura descendente",
              link: "/es-419/security/no-write-down",
            },
            {
              text: "Identidad y autenticación",
              link: "/es-419/security/identity",
            },
            {
              text: "Delegación de agentes",
              link: "/es-419/security/agent-delegation",
            },
            {
              text: "Gestión de secretos",
              link: "/es-419/security/secrets",
            },
            {
              text: "Auditoría y cumplimiento",
              link: "/es-419/security/audit-logging",
            },
          ],
        },
        {
          text: "Confianza y cumplimiento",
          items: [
            {
              text: "Centro de confianza",
              link: "/es-419/security/trust-center",
            },
            {
              text: "Divulgación responsable",
              link: "/es-419/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/es-419/channels/": [
        {
          text: "Canales",
          items: [
            { text: "Vista general", link: "/es-419/channels/" },
            { text: "CLI", link: "/es-419/channels/cli" },
            { text: "Telegram", link: "/es-419/channels/telegram" },
            { text: "Slack", link: "/es-419/channels/slack" },
            { text: "Discord", link: "/es-419/channels/discord" },
            { text: "WhatsApp", link: "/es-419/channels/whatsapp" },
            { text: "WebChat", link: "/es-419/channels/webchat" },
            { text: "Email", link: "/es-419/channels/email" },
            { text: "Signal", link: "/es-419/channels/signal" },
            { text: "Google Chat", link: "/es-419/channels/google-chat" },
          ],
        },
      ],
      "/es-419/integrations/": [
        {
          text: "Integraciones",
          items: [
            { text: "Vista general", link: "/es-419/integrations/" },
            { text: "MCP Gateway", link: "/es-419/integrations/mcp-gateway" },
            { text: "Plugin SDK", link: "/es-419/integrations/plugins" },
            {
              text: "Entorno de ejecución",
              link: "/es-419/integrations/exec-environment",
            },
            { text: "Skills", link: "/es-419/integrations/skills" },
            {
              text: "Creación de Skills",
              link: "/es-419/integrations/building-skills",
            },
            {
              text: "Automatización del navegador",
              link: "/es-419/integrations/browser",
            },
            { text: "Webhooks", link: "/es-419/integrations/webhooks" },
            { text: "GitHub", link: "/es-419/integrations/github" },
            {
              text: "Google Workspace",
              link: "/es-419/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/es-419/integrations/obsidian" },
            { text: "CalDAV", link: "/es-419/integrations/caldav" },
            { text: "Acceso remoto", link: "/es-419/integrations/remote" },
          ],
        },
      ],
      "/es-419/features/": [
        {
          text: "Funcionalidades",
          items: [
            { text: "Vista general", link: "/es-419/features/" },
            {
              text: "Cron y Triggers",
              link: "/es-419/features/cron-and-triggers",
            },
            { text: "Voz", link: "/es-419/features/voice" },
            { text: "Tide Pool / A2UI", link: "/es-419/features/tidepool" },
            {
              text: "Enrutamiento multi-agente",
              link: "/es-419/features/multi-agent",
            },
            {
              text: "Conmutación de modelos",
              link: "/es-419/features/model-failover",
            },
            {
              text: "Notificaciones",
              link: "/es-419/features/notifications",
            },
            { text: "Registro", link: "/es-419/features/logging" },
            {
              text: "Equipos de agentes",
              link: "/es-419/features/agent-teams",
            },
            {
              text: "Límite de velocidad",
              link: "/es-419/features/rate-limiting",
            },
            { text: "Explorar", link: "/es-419/features/explore" },
            {
              text: "Sistema de archivos",
              link: "/es-419/features/filesystem",
            },
            {
              text: "Imagen y visión",
              link: "/es-419/features/image-vision",
            },
            { text: "Memoria", link: "/es-419/features/memory" },
            { text: "Planificación", link: "/es-419/features/planning" },
            { text: "Sesiones", link: "/es-419/features/sessions" },
            { text: "Búsqueda web", link: "/es-419/features/web-search" },
            { text: "Subagentes", link: "/es-419/features/subagents" },
          ],
        },
      ],
      "/es-419/reference/": [
        {
          text: "Referencia",
          items: [
            { text: "Vista general", link: "/es-419/reference/" },
            {
              text: "Esquema de configuración",
              link: "/es-419/reference/config-yaml",
            },
            { text: "Interfaces", link: "/es-419/reference/interfaces" },
            { text: "Glosario", link: "/es-419/reference/glossary" },
          ],
        },
      ],
      "/es-419/support/": [
        {
          text: "Centro de soporte",
          items: [
            { text: "Vista general", link: "/es-419/support/" },
            { text: "Preguntas frecuentes", link: "/es-419/support/faq" },
          ],
        },
        {
          text: "Solución de problemas",
          items: [
            {
              text: "Comience aquí",
              link: "/es-419/support/troubleshooting/",
            },
            {
              text: "Instalación",
              link: "/es-419/support/troubleshooting/installation",
            },
            {
              text: "Daemon",
              link: "/es-419/support/troubleshooting/daemon",
            },
            {
              text: "Configuración",
              link: "/es-419/support/troubleshooting/configuration",
            },
            {
              text: "Canales",
              link: "/es-419/support/troubleshooting/channels",
            },
            {
              text: "Proveedores de LLM",
              link: "/es-419/support/troubleshooting/providers",
            },
            {
              text: "Integraciones",
              link: "/es-419/support/troubleshooting/integrations",
            },
            {
              text: "Automatización del navegador",
              link: "/es-419/support/troubleshooting/browser",
            },
            {
              text: "Seguridad y clasificación",
              link: "/es-419/support/troubleshooting/security",
            },
            {
              text: "Secretos y credenciales",
              link: "/es-419/support/troubleshooting/secrets",
            },
            {
              text: "Referencia de errores",
              link: "/es-419/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Guías prácticas",
          items: [
            {
              text: "Recolección de registros",
              link: "/es-419/support/guides/collecting-logs",
            },
            {
              text: "Ejecución de diagnósticos",
              link: "/es-419/support/guides/diagnostics",
            },
            {
              text: "Reporte de problemas",
              link: "/es-419/support/guides/filing-issues",
            },
            {
              text: "Notas de plataforma",
              link: "/es-419/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Base de conocimientos",
          items: [
            {
              text: "Migración de secretos",
              link: "/es-419/support/kb/secrets-migration",
            },
            {
              text: "Proceso de autoactualización",
              link: "/es-419/support/kb/self-update",
            },
            {
              text: "Cambios importantes",
              link: "/es-419/support/kb/breaking-changes",
            },
            {
              text: "Problemas conocidos",
              link: "/es-419/support/kb/known-issues",
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
        'Publicado bajo la licencia Apache 2.0. | <a href="/es-419/account">Cuenta</a> | <a href="/es-419/privacy-policy">Política de privacidad</a> | <a href="/es-419/cookie-policy">Política de cookies</a> | <a href="/es-419/terms-of-service">Términos de servicio</a>',
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
