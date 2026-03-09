# Centre de support

Obtenez de l'aide pour l'installation, la configuration et les opérations quotidiennes de Triggerfish.

## Liens rapides

- **Quelque chose ne fonctionne pas ?** Commencez par le [Guide de dépannage](/fr-FR/support/troubleshooting/)
- **Besoin de chercher une erreur ?** Consultez la [Référence des erreurs](/fr-FR/support/troubleshooting/error-reference)
- **Vous souhaitez signaler un bug ?** Lisez d'abord [Comment signaler un bon problème](/fr-FR/support/guides/filing-issues)
- **Mise à jour ou migration ?** Consultez la [Base de connaissances](#base-de-connaissances)

## Ressources en libre-service

### Dépannage

Guides étape par étape pour diagnostiquer et résoudre les problèmes courants, organisés par domaine :

| Domaine | Couvre |
|---------|--------|
| [Installation](/fr-FR/support/troubleshooting/installation) | Échecs d'installation, erreurs de permissions, configuration spécifique à la plateforme |
| [Daemon](/fr-FR/support/troubleshooting/daemon) | Problèmes de démarrage/arrêt, gestion du service, conflits de ports |
| [Configuration](/fr-FR/support/troubleshooting/configuration) | Analyse YAML, erreurs de validation, références de secrets |
| [Canaux](/fr-FR/support/troubleshooting/channels) | Telegram, Slack, Discord, WhatsApp, Signal, Email, WebChat |
| [Fournisseurs de LLM](/fr-FR/support/troubleshooting/providers) | Erreurs de clé API, modèle introuvable, échecs de streaming, failover |
| [Intégrations](/fr-FR/support/troubleshooting/integrations) | Google, GitHub, Notion, CalDAV, serveurs MCP |
| [Automatisation du navigateur](/fr-FR/support/troubleshooting/browser) | Détection de Chrome, échecs de lancement, Flatpak, navigation |
| [Sécurité et classification](/fr-FR/support/troubleshooting/security) | Escalade du taint, blocages write-down, SSRF, refus de politique |
| [Secrets et identifiants](/fr-FR/support/troubleshooting/secrets) | Backends de trousseau de clés, erreurs de permissions, stockage chiffré |
| [Référence des erreurs](/fr-FR/support/troubleshooting/error-reference) | Index consultable de chaque message d'erreur |

### Guides pratiques

| Guide | Description |
|-------|-------------|
| [Collecte des logs](/fr-FR/support/guides/collecting-logs) | Comment rassembler les archives de logs pour les rapports de bug |
| [Exécution des diagnostics](/fr-FR/support/guides/diagnostics) | Utilisation de `triggerfish patrol` et de l'outil de healthcheck |
| [Signaler un problème](/fr-FR/support/guides/filing-issues) | Ce qu'il faut inclure pour que votre problème soit résolu rapidement |
| [Notes de plateforme](/fr-FR/support/guides/platform-notes) | Spécificités macOS, Linux, Windows, Docker et Flatpak |

### Base de connaissances

| Article | Description |
|---------|-------------|
| [Migration des secrets](/fr-FR/support/kb/secrets-migration) | Migration du stockage de secrets en clair vers le format chiffré |
| [Processus de mise à jour](/fr-FR/support/kb/self-update) | Comment fonctionne `triggerfish update` et ce qui peut mal tourner |
| [Changements majeurs](/fr-FR/support/kb/breaking-changes) | Liste version par version des changements majeurs |
| [Problèmes connus](/fr-FR/support/kb/known-issues) | Problèmes connus actuels et leurs solutions de contournement |

## Toujours bloqué ?

Si la documentation ci-dessus n'a pas résolu votre problème :

1. **Cherchez dans les issues existantes** sur [GitHub Issues](https://github.com/greghavens/triggerfish/issues) pour voir si quelqu'un l'a déjà signalé
2. **Demandez à la communauté** dans [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions)
3. **Créez une nouvelle issue** en suivant le [guide de signalement](/fr-FR/support/guides/filing-issues)
