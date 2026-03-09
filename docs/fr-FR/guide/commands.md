# Commandes CLI

Triggerfish fournit un CLI pour gérer votre agent, le daemon, les canaux et les
sessions. Cette page couvre chaque commande disponible et chaque raccourci de
chat.

## Commandes principales

### `triggerfish dive`

Lance l'assistant de configuration interactif. C'est la première commande que
vous exécutez après l'installation et elle peut être relancée à tout moment
pour reconfigurer.

```bash
triggerfish dive
```

L'assistant parcourt 8 étapes : fournisseur LLM, nom/personnalité de l'agent,
configuration du canal, plugins optionnels, connexion Google Workspace,
connexion GitHub, fournisseur de recherche et installation du daemon. Voir
[Démarrage rapide](./quickstart) pour une présentation complète.

### `triggerfish chat`

Démarre une session de chat interactive dans votre terminal. C'est la commande
par défaut quand vous exécutez `triggerfish` sans arguments.

```bash
triggerfish chat
```

L'interface de chat propose :

- Barre de saisie pleine largeur en bas du terminal
- Réponses en streaming avec affichage des tokens en temps réel
- Affichage compact des appels d'outils (basculer avec Ctrl+O)
- Historique de saisie (persisté entre les sessions)
- ESC pour interrompre une réponse en cours
- Compaction de conversation pour gérer les longues sessions

### `triggerfish run`

Démarre le serveur Gateway en premier plan. Utile pour le développement et le
débogage.

```bash
triggerfish run
```

Le Gateway gère les connexions WebSocket, les adaptateurs de canaux, le moteur
de politiques et l'état des sessions. En production, utilisez
`triggerfish start` pour l'exécuter en tant que daemon.

### `triggerfish start`

Installe et démarre Triggerfish en tant que daemon en arrière-plan en utilisant
le gestionnaire de services de votre système d'exploitation.

```bash
triggerfish start
```

| Plateforme | Gestionnaire de services         |
| ---------- | -------------------------------- |
| macOS      | launchd                          |
| Linux      | systemd                          |
| Windows    | Windows Service / Task Scheduler |

Le daemon démarre automatiquement à la connexion et maintient votre agent en
fonctionnement en arrière-plan.

### `triggerfish stop`

Arrête le daemon en cours d'exécution.

```bash
triggerfish stop
```

### `triggerfish status`

Vérifie si le daemon est actuellement en cours d'exécution et affiche les
informations d'état de base.

```bash
triggerfish status
```

Exemple de sortie :

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

Affiche les journaux du daemon.

```bash
# Afficher les journaux récents
triggerfish logs

# Diffuser les journaux en temps réel
triggerfish logs --tail
```

### `triggerfish patrol`

Lance une vérification de santé de votre installation Triggerfish.

```bash
triggerfish patrol
```

Exemple de sortie :

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 3d 2h)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  3 channels active (CLI, Telegram, Slack)
  Policy engine loaded (12 rules, 3 custom)
  5 skills installed (2 bundled, 1 managed, 2 workspace)
  Secrets stored securely (macOS Keychain)
  2 cron jobs scheduled
  Webhook endpoints configured (2 active)

Overall: HEALTHY
```

Patrol vérifie :

- État et disponibilité du processus Gateway
- Connectivité du fournisseur LLM
- Santé des adaptateurs de canaux
- Chargement des règles du moteur de politiques
- Skills installés
- Stockage des secrets
- Planification des tâches cron
- Configuration des points de terminaison webhook
- Détection des ports exposés

### `triggerfish config`

Gérez votre fichier de configuration. Utilise des chemins à points dans
`triggerfish.yaml`.

```bash
# Définir n'importe quelle valeur de configuration
triggerfish config set <key> <value>

# Lire n'importe quelle valeur de configuration
triggerfish config get <key>

# Valider la syntaxe et la structure de la configuration
triggerfish config validate

# Ajouter un canal de manière interactive
triggerfish config add-channel [type]
```

Exemples :

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

Migre les identifiants en clair de `triggerfish.yaml` vers le trousseau de clés
du système d'exploitation.

```bash
triggerfish config migrate-secrets
```

Cette commande analyse votre configuration pour trouver les clés API, tokens et
mots de passe en clair, les stocke dans le trousseau de clés du système
d'exploitation et remplace les valeurs en clair par des références `secret:`.
Une sauvegarde du fichier original est créée avant toute modification.

Voir [Gestion des secrets](/fr-FR/security/secrets) pour les détails.

### `triggerfish connect`

Connecte un service externe à Triggerfish.

```bash
triggerfish connect google    # Google Workspace (flux OAuth2)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** -- Démarre le flux OAuth2. Demande votre OAuth Client ID
et Client Secret de Google Cloud, ouvre un navigateur pour l'autorisation et
stocke les tokens de manière sécurisée dans le trousseau de clés du système
d'exploitation.

**GitHub** -- Vous guide dans la création d'un Personal Access Token à
granularité fine, le valide contre l'API GitHub et le stocke dans le trousseau
de clés du système d'exploitation.

### `triggerfish disconnect`

Supprime l'authentification pour un service externe.

```bash
triggerfish disconnect google    # Supprimer les tokens Google
triggerfish disconnect github    # Supprimer le token GitHub
```

Supprime tous les tokens stockés du trousseau de clés. Vous pouvez vous
reconnecter à tout moment.

### `triggerfish healthcheck`

Lance une vérification rapide de connectivité avec le fournisseur LLM configuré.
Renvoie un succès si le fournisseur répond, ou une erreur avec des détails.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

Affiche les notes de version pour la version actuelle ou une version spécifiée.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

Vérifie les mises à jour disponibles et les installe.

```bash
triggerfish update
```

### `triggerfish version`

Affiche la version actuelle de Triggerfish.

```bash
triggerfish version
```

## Commandes de skills

Gérez les skills depuis The Reef, le marketplace, et votre espace de travail
local.

```bash
triggerfish skill search "calendar"     # Rechercher des skills sur The Reef
triggerfish skill install google-cal    # Installer un skill
triggerfish skill list                  # Lister les skills installés
triggerfish skill update --all          # Mettre à jour tous les skills installés
triggerfish skill publish               # Publier un skill sur The Reef
triggerfish skill create                # Créer un nouveau skill
```

## Commandes de sessions

Inspectez et gérez les sessions actives.

```bash
triggerfish session list                # Lister les sessions actives
triggerfish session history             # Voir la transcription de session
triggerfish session spawn               # Créer une session en arrière-plan
```

## Commandes Buoy <ComingSoon :inline="true" />

Gérez les connexions d'appareils compagnons. Buoy n'est pas encore disponible.

```bash
triggerfish buoys list                  # Lister les buoys connectés
triggerfish buoys pair                  # Appairer un nouvel appareil buoy
```

## Commandes en chat

Ces commandes sont disponibles pendant une session de chat interactive (via
`triggerfish chat` ou tout canal connecté). Elles sont réservées au ou à la
propriétaire.

| Commande                | Description                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| `/help`                 | Afficher les commandes de chat disponibles                                    |
| `/status`               | Afficher l'état de session : modèle, nombre de tokens, coût, niveau de taint |
| `/reset`                | Réinitialiser le taint de session et l'historique de conversation             |
| `/compact`              | Compresser l'historique de conversation par résumé LLM                        |
| `/model <name>`         | Changer le modèle LLM pour la session en cours                               |
| `/skill install <name>` | Installer un skill depuis The Reef                                            |
| `/cron list`            | Lister les tâches cron planifiées                                             |

## Raccourcis clavier

Ces raccourcis fonctionnent dans l'interface de chat CLI :

| Raccourci | Action                                                  |
| --------- | ------------------------------------------------------- |
| ESC       | Interrompre la réponse LLM en cours                     |
| Ctrl+V    | Coller une image depuis le presse-papiers               |
| Ctrl+O    | Basculer l'affichage compact/étendu des appels d'outils |
| Ctrl+C    | Quitter la session de chat                              |
| Haut/Bas  | Naviguer dans l'historique de saisie                    |

::: tip L'interruption ESC envoie un signal d'abandon à travers toute la
chaîne -- de l'orchestrateur jusqu'au fournisseur LLM. La réponse s'arrête
proprement et vous pouvez poursuivre la conversation. :::

## Sortie de débogage

Triggerfish inclut une journalisation détaillée de débogage pour diagnostiquer
les problèmes de fournisseur LLM, l'analyse des appels d'outils et le
comportement de la boucle d'agent. Activez-la en définissant la variable
d'environnement `TRIGGERFISH_DEBUG` à `1`.

::: tip La méthode préférée pour contrôler la verbosité des journaux est via
`triggerfish.yaml` :

```yaml
logging:
  level: verbose # quiet, normal, verbose ou debug
```

La variable d'environnement `TRIGGERFISH_DEBUG=1` est toujours supportée pour
la compatibilité ascendante. :::

### Mode premier plan

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

Ou pour une session de chat :

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Mode daemon (systemd)

Ajoutez la variable d'environnement à votre unité de service systemd :

```bash
systemctl --user edit triggerfish.service
```

Ajoutez sous `[Service]` :

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

Puis redémarrez :

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

Consultez la sortie de débogage avec :

```bash
journalctl --user -u triggerfish.service -f
```

### Ce qui est journalisé

Lorsque le mode de débogage est activé, les éléments suivants sont écrits sur
stderr :

| Composant       | Préfixe journal | Détails                                                                                                                      |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Orchestrateur   | `[orch]`        | Chaque itération : longueur du prompt système, nombre d'entrées d'historique, rôles/tailles des messages, nombre d'appels d'outils, texte de réponse final |
| OpenRouter      | `[openrouter]`  | Payload de requête complet (modèle, nombre de messages, nombre d'outils), corps de réponse brut, longueur du contenu, raison de fin, utilisation des tokens |
| Autres fournisseurs | `[provider]` | Résumés requête/réponse (varie selon le fournisseur)                                                                         |

Exemple de sortie de débogage :

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning La sortie de débogage inclut les payloads complets de requête et
réponse LLM. Ne la laissez pas activée en production car elle peut journaliser
du contenu de conversation sensible sur stderr/journal. :::

## Référence rapide

```bash
# Configuration et gestion
triggerfish dive              # Assistant de configuration
triggerfish start             # Démarrer le daemon
triggerfish stop              # Arrêter le daemon
triggerfish status            # Vérifier l'état
triggerfish logs --tail       # Diffuser les journaux
triggerfish patrol            # Vérification de santé
triggerfish config set <k> <v> # Définir une valeur de config
triggerfish config get <key>  # Lire une valeur de config
triggerfish config add-channel # Ajouter un canal
triggerfish config migrate-secrets  # Migrer les secrets vers le trousseau
triggerfish update            # Vérifier les mises à jour
triggerfish version           # Afficher la version

# Utilisation quotidienne
triggerfish chat              # Chat interactif
triggerfish run               # Mode premier plan

# Skills
triggerfish skill search      # Rechercher sur The Reef
triggerfish skill install     # Installer un skill
triggerfish skill list        # Lister les skills installés
triggerfish skill create      # Créer un nouveau skill

# Sessions
triggerfish session list      # Lister les sessions
triggerfish session history   # Voir la transcription
```
