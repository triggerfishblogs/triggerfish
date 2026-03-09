# Dépannage

Commencez ici quand quelque chose ne fonctionne pas. Suivez les étapes dans l'ordre.

## Premières étapes

### 1. Vérifiez si le daemon est en cours d'exécution

```bash
triggerfish status
```

Si le daemon n'est pas en cours d'exécution, démarrez-le :

```bash
triggerfish start
```

### 2. Vérifiez les logs

```bash
triggerfish logs
```

Cela affiche le fichier de log en temps réel. Utilisez un filtre de niveau pour réduire le bruit :

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Lancez les diagnostics

```bash
triggerfish patrol
```

Patrol vérifie si le gateway est accessible, si le fournisseur de LLM répond, si les canaux sont connectés, si les règles de politique sont chargées et si les skills sont découverts. Toute vérification marquée `CRITICAL` ou `WARNING` vous indique où concentrer votre attention.

### 4. Validez votre configuration

```bash
triggerfish config validate
```

Cela analyse `triggerfish.yaml`, vérifie les champs requis, valide les niveaux de classification et résout les références de secrets.

## Dépannage par domaine

Si les premières étapes ci-dessus ne vous ont pas orienté vers le problème, choisissez le domaine qui correspond à vos symptômes :

- [Installation](/fr-FR/support/troubleshooting/installation) - échecs du script d'installation, problèmes de compilation depuis les sources, problèmes de plateforme
- [Daemon](/fr-FR/support/troubleshooting/daemon) - le service ne démarre pas, conflits de ports, erreurs « already running »
- [Configuration](/fr-FR/support/troubleshooting/configuration) - erreurs d'analyse YAML, champs manquants, échecs de résolution de secrets
- [Canaux](/fr-FR/support/troubleshooting/channels) - bot ne répond pas, échecs d'authentification, problèmes de distribution des messages
- [Fournisseurs de LLM](/fr-FR/support/troubleshooting/providers) - erreurs API, modèle introuvable, échecs de streaming
- [Intégrations](/fr-FR/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, API Notion, CalDAV, serveurs MCP
- [Automatisation du navigateur](/fr-FR/support/troubleshooting/browser) - Chrome introuvable, échecs de lancement, navigation bloquée
- [Sécurité et classification](/fr-FR/support/troubleshooting/security) - blocages write-down, problèmes de taint, SSRF, refus de politique
- [Secrets et identifiants](/fr-FR/support/troubleshooting/secrets) - erreurs de trousseau de clés, stockage de fichier chiffré, problèmes de permissions

## Toujours bloqué ?

Si aucun des guides ci-dessus n'a résolu votre problème :

1. Collectez une [archive de logs](/fr-FR/support/guides/collecting-logs)
2. Lisez le [guide de signalement d'issues](/fr-FR/support/guides/filing-issues)
3. Ouvrez une issue sur [GitHub](https://github.com/greghavens/triggerfish/issues/new)
