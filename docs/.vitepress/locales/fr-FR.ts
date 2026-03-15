import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";

export const frFR: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: "fr-FR",
  label: "Français",
  description:
    "Plateforme d'agents IA sécurisée et multi-canal avec application déterministe des politiques sous la couche LLM.",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/fr-FR/guide/" },
      { text: "Tarifs", link: "/fr-FR/pricing" },
      {
        text: "Documentation",
        items: [
          { text: "Architecture", link: "/fr-FR/architecture/" },
          { text: "Sécurité", link: "/fr-FR/security/" },
          { text: "Canaux", link: "/fr-FR/channels/" },
          { text: "Intégrations", link: "/fr-FR/integrations/" },
          { text: "Fonctionnalités", link: "/fr-FR/features/" },
          { text: "Référence", link: "/fr-FR/reference/" },
        ],
      },
      { text: "Assistance", link: "/fr-FR/support/" },
    ],
    sidebar: {
      "/fr-FR/guide/": [
        {
          text: "Prise en main",
          items: [
            { text: "Vue d'ensemble", link: "/fr-FR/guide/" },
            {
              text: "Installation et déploiement",
              link: "/fr-FR/guide/installation",
            },
            { text: "Démarrage rapide", link: "/fr-FR/guide/quickstart" },
            { text: "Configuration", link: "/fr-FR/guide/configuration" },
            {
              text: "SPINE et Triggers",
              link: "/fr-FR/guide/spine-and-triggers",
            },
            { text: "Commandes CLI", link: "/fr-FR/guide/commands" },
            {
              text: "Guide de classification",
              link: "/fr-FR/guide/classification-guide",
            },
          ],
        },
      ],
      "/fr-FR/architecture/": [
        {
          text: "Architecture",
          items: [
            { text: "Vue d'ensemble", link: "/fr-FR/architecture/" },
            {
              text: "Système de classification",
              link: "/fr-FR/architecture/classification",
            },
            {
              text: "Moteur de politiques et Hooks",
              link: "/fr-FR/architecture/policy-engine",
            },
            {
              text: "Sessions et Taint",
              link: "/fr-FR/architecture/taint-and-sessions",
            },
            { text: "Gateway", link: "/fr-FR/architecture/gateway" },
            { text: "Stockage", link: "/fr-FR/architecture/storage" },
            {
              text: "Défense en profondeur",
              link: "/fr-FR/architecture/defense-in-depth",
            },
          ],
        },
      ],
      "/fr-FR/security/": [
        {
          text: "Modèle de sécurité",
          items: [
            {
              text: "Conception axée sur la sécurité",
              link: "/fr-FR/security/",
            },
            {
              text: "Règle de non-écriture descendante",
              link: "/fr-FR/security/no-write-down",
            },
            {
              text: "Identité et authentification",
              link: "/fr-FR/security/identity",
            },
            {
              text: "Délégation d'agents",
              link: "/fr-FR/security/agent-delegation",
            },
            {
              text: "Gestion des secrets",
              link: "/fr-FR/security/secrets",
            },
            {
              text: "Audit et conformité",
              link: "/fr-FR/security/audit-logging",
            },
          ],
        },
        {
          text: "Confiance et conformité",
          items: [
            {
              text: "Centre de confiance",
              link: "/fr-FR/security/trust-center",
            },
            {
              text: "Divulgation responsable",
              link: "/fr-FR/security/responsible-disclosure",
            },
          ],
        },
      ],
      "/fr-FR/channels/": [
        {
          text: "Canaux",
          items: [
            { text: "Vue d'ensemble", link: "/fr-FR/channels/" },
            { text: "CLI", link: "/fr-FR/channels/cli" },
            { text: "Telegram", link: "/fr-FR/channels/telegram" },
            { text: "Slack", link: "/fr-FR/channels/slack" },
            { text: "Discord", link: "/fr-FR/channels/discord" },
            { text: "WhatsApp", link: "/fr-FR/channels/whatsapp" },
            { text: "WebChat", link: "/fr-FR/channels/webchat" },
            { text: "Email", link: "/fr-FR/channels/email" },
            { text: "Signal", link: "/fr-FR/channels/signal" },
            { text: "Google Chat", link: "/fr-FR/channels/google-chat" },
          ],
        },
      ],
      "/fr-FR/integrations/": [
        {
          text: "Intégrations",
          items: [
            { text: "Vue d'ensemble", link: "/fr-FR/integrations/" },
            {
              text: "MCP Gateway",
              link: "/fr-FR/integrations/mcp-gateway",
            },
            { text: "Plugin SDK", link: "/fr-FR/integrations/plugins" },
            {
              text: "Environnement d'exécution",
              link: "/fr-FR/integrations/exec-environment",
            },
            { text: "Skills", link: "/fr-FR/integrations/skills" },
            {
              text: "Création de Skills",
              link: "/fr-FR/integrations/building-skills",
            },
            {
              text: "Automatisation du navigateur",
              link: "/fr-FR/integrations/browser",
            },
            { text: "Webhooks", link: "/fr-FR/integrations/webhooks" },
            { text: "GitHub", link: "/fr-FR/integrations/github" },
            {
              text: "Google Workspace",
              link: "/fr-FR/integrations/google-workspace",
            },
            { text: "Obsidian", link: "/fr-FR/integrations/obsidian" },
            { text: "CalDAV", link: "/fr-FR/integrations/caldav" },
            { text: "Accès distant", link: "/fr-FR/integrations/remote" },
          ],
        },
      ],
      "/fr-FR/features/": [
        {
          text: "Fonctionnalités",
          items: [
            { text: "Vue d'ensemble", link: "/fr-FR/features/" },
            {
              text: "Cron et Triggers",
              link: "/fr-FR/features/cron-and-triggers",
            },
            { text: "Voix", link: "/fr-FR/features/voice" },
            { text: "Tide Pool / A2UI", link: "/fr-FR/features/tidepool" },
            {
              text: "Routage multi-agents",
              link: "/fr-FR/features/multi-agent",
            },
            {
              text: "Basculement de modèles",
              link: "/fr-FR/features/model-failover",
            },
            {
              text: "Notifications",
              link: "/fr-FR/features/notifications",
            },
            { text: "Journalisation", link: "/fr-FR/features/logging" },
            {
              text: "Équipes d'agents",
              link: "/fr-FR/features/agent-teams",
            },
            {
              text: "Limitation de débit",
              link: "/fr-FR/features/rate-limiting",
            },
            { text: "Explorer", link: "/fr-FR/features/explore" },
            {
              text: "Système de fichiers",
              link: "/fr-FR/features/filesystem",
            },
            {
              text: "Image et vision",
              link: "/fr-FR/features/image-vision",
            },
            { text: "Mémoire", link: "/fr-FR/features/memory" },
            { text: "Planification", link: "/fr-FR/features/planning" },
            { text: "Sessions", link: "/fr-FR/features/sessions" },
            { text: "Recherche web", link: "/fr-FR/features/web-search" },
            { text: "Sous-agents", link: "/fr-FR/features/subagents" },
            {
              text: "Flux de travail",
              link: "/fr-FR/features/workflows",
            },
          ],
        },
      ],
      "/fr-FR/reference/": [
        {
          text: "Référence",
          items: [
            { text: "Vue d'ensemble", link: "/fr-FR/reference/" },
            {
              text: "Schéma de configuration",
              link: "/fr-FR/reference/config-yaml",
            },
            {
              text: "DSL de flux de travail",
              link: "/fr-FR/reference/workflow-dsl",
            },
            { text: "Interfaces", link: "/fr-FR/reference/interfaces" },
            { text: "Glossaire", link: "/fr-FR/reference/glossary" },
          ],
        },
      ],
      "/fr-FR/support/": [
        {
          text: "Centre d'assistance",
          items: [
            { text: "Vue d'ensemble", link: "/fr-FR/support/" },
            { text: "FAQ", link: "/fr-FR/support/faq" },
          ],
        },
        {
          text: "Dépannage",
          items: [
            {
              text: "Commencez ici",
              link: "/fr-FR/support/troubleshooting/",
            },
            {
              text: "Installation",
              link: "/fr-FR/support/troubleshooting/installation",
            },
            {
              text: "Daemon",
              link: "/fr-FR/support/troubleshooting/daemon",
            },
            {
              text: "Configuration",
              link: "/fr-FR/support/troubleshooting/configuration",
            },
            {
              text: "Canaux",
              link: "/fr-FR/support/troubleshooting/channels",
            },
            {
              text: "Fournisseurs de LLM",
              link: "/fr-FR/support/troubleshooting/providers",
            },
            {
              text: "Intégrations",
              link: "/fr-FR/support/troubleshooting/integrations",
            },
            {
              text: "Automatisation du navigateur",
              link: "/fr-FR/support/troubleshooting/browser",
            },
            {
              text: "Sécurité et classification",
              link: "/fr-FR/support/troubleshooting/security",
            },
            {
              text: "Secrets et identifiants",
              link: "/fr-FR/support/troubleshooting/secrets",
            },
            {
              text: "Flux de travail",
              link: "/fr-FR/support/troubleshooting/workflows",
            },
            {
              text: "Référence des erreurs",
              link: "/fr-FR/support/troubleshooting/error-reference",
            },
          ],
        },
        {
          text: "Guides pratiques",
          items: [
            {
              text: "Collecte des journaux",
              link: "/fr-FR/support/guides/collecting-logs",
            },
            {
              text: "Exécution des diagnostics",
              link: "/fr-FR/support/guides/diagnostics",
            },
            {
              text: "Signalement de problèmes",
              link: "/fr-FR/support/guides/filing-issues",
            },
            {
              text: "Notes de plateforme",
              link: "/fr-FR/support/guides/platform-notes",
            },
          ],
        },
        {
          text: "Base de connaissances",
          items: [
            {
              text: "Migration des secrets",
              link: "/fr-FR/support/kb/secrets-migration",
            },
            {
              text: "Processus de mise à jour automatique",
              link: "/fr-FR/support/kb/self-update",
            },
            {
              text: "Changements majeurs",
              link: "/fr-FR/support/kb/breaking-changes",
            },
            {
              text: "Problèmes connus",
              link: "/fr-FR/support/kb/known-issues",
            },
          ],
        },
      ],
    },
    editLink: {
      text: "Modifier cette page sur GitHub",
    },
    footer: {
      message:
        'Publié sous la licence Apache 2.0. | <a href="/fr-FR/account">Compte</a> | <a href="/fr-FR/privacy-policy">Politique de confidentialité</a> | <a href="/fr-FR/cookie-policy">Politique de cookies</a> | <a href="/fr-FR/terms-of-service">Conditions d\'utilisation</a>',
      copyright: "Copyright 2026 Triggerfish, Inc.",
    },
    docFooter: {
      prev: "Page précédente",
      next: "Page suivante",
    },
    lastUpdated: {
      text: "Dernière mise à jour",
    },
    outline: {
      label: "Sur cette page",
    },
    returnToTopLabel: "Retour en haut",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Apparence",
    langMenuLabel: "Changer de langue",
    notFound: {
      title: "PAGE NON TROUVÉE",
      quote:
        "La page que vous recherchez n'existe pas ou a été déplacée.",
      linkLabel: "Aller à l'accueil",
      linkText: "Retour à l'accueil",
      code: "404",
    },
  },
};
