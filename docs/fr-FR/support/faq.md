# Foire aux questions

## Installation

### Quelles sont les exigences système ?

Triggerfish fonctionne sur macOS (Intel et Apple Silicon), Linux (x64 et arm64) et Windows (x64). L'installeur binaire gère tout. Si vous compilez depuis les sources, vous avez besoin de Deno 2.x.

Pour les déploiements Docker, tout système exécutant Docker ou Podman fonctionne. L'image conteneur est basée sur Debian 12 distroless.

### Où Triggerfish stocke-t-il ses données ?

Tout se trouve sous `~/.triggerfish/` par défaut :

```
~/.triggerfish/
  triggerfish.yaml          # Configuration
  SPINE.md                  # Identité de l'agent
  TRIGGER.md                # Définition du comportement proactif
  logs/                     # Fichiers de log (rotation à 1 Mo, 10 sauvegardes)
  data/triggerfish.db       # Base de données SQLite (sessions, mémoire, état)
  skills/                   # Skills installés
  backups/                  # Sauvegardes horodatées de la configuration
```

Les déploiements Docker utilisent `/data` à la place. Vous pouvez remplacer le répertoire de base avec la variable d'environnement `TRIGGERFISH_DATA_DIR`.

### Puis-je déplacer le répertoire de données ?

Oui. Définissez la variable d'environnement `TRIGGERFISH_DATA_DIR` avec le chemin souhaité avant de démarrer le daemon. Si vous utilisez systemd ou launchd, vous devrez mettre à jour la définition du service (voir les [Notes de plateforme](/fr-FR/support/guides/platform-notes)).

### L'installeur dit qu'il ne peut pas écrire dans `/usr/local/bin`

L'installeur essaie d'abord `/usr/local/bin`. Si cela nécessite un accès root, il se rabat sur `~/.local/bin`. Si vous voulez l'emplacement système, relancez avec `sudo` :

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Comment désinstaller Triggerfish ?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

Cela arrête le daemon, supprime la définition du service (unité systemd ou plist launchd), supprime le binaire et supprime l'intégralité du répertoire `~/.triggerfish/` y compris toutes les données.

---

## Configuration

### Comment changer le fournisseur de LLM ?

Modifiez `triggerfish.yaml` ou utilisez le CLI :

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Le daemon redémarre automatiquement après les modifications de configuration.

### Où vont les clés API ?

Les clés API sont stockées dans le trousseau de clés de votre système d'exploitation (macOS Keychain, Linux Secret Service, ou un fichier chiffré sur Windows/Docker). Ne mettez jamais de clés API brutes dans `triggerfish.yaml`. Utilisez la syntaxe de référence `secret:` :

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Stockez la clé réelle :

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Que signifie `secret:` dans ma configuration ?

Les valeurs préfixées par `secret:` sont des références à votre trousseau de clés du système d'exploitation. Au démarrage, Triggerfish résout chaque référence et la remplace par la valeur réelle du secret en mémoire. Le secret brut n'apparaît jamais dans `triggerfish.yaml` sur le disque. Voir [Secrets et identifiants](/fr-FR/support/troubleshooting/secrets) pour les détails du backend par plateforme.

### Qu'est-ce que SPINE.md ?

`SPINE.md` est le fichier d'identité de votre agent. Il définit le nom, la mission, la personnalité et les directives comportementales de l'agent. Considérez-le comme la fondation du prompt système. L'assistant de configuration (`triggerfish dive`) en génère un pour vous, mais vous pouvez le modifier librement.

### Qu'est-ce que TRIGGER.md ?

`TRIGGER.md` définit le comportement proactif de votre agent : ce qu'il doit vérifier, surveiller et faire lors des réveils programmés de trigger. Sans `TRIGGER.md`, les triggers se déclencheront toujours mais l'agent n'aura pas d'instructions sur ce qu'il doit faire.

### Comment ajouter un nouveau canal ?

```bash
triggerfish config add-channel telegram
```

Cela lance une invite interactive qui vous guide à travers les champs requis (token de bot, ID du propriétaire, niveau de classification). Vous pouvez également modifier `triggerfish.yaml` directement sous la section `channels:`.

### J'ai modifié ma configuration mais rien ne s'est passé

Le daemon doit redémarrer pour prendre en compte les modifications. Si vous avez utilisé `triggerfish config set`, il propose de redémarrer automatiquement. Si vous avez modifié le fichier YAML à la main, redémarrez avec :

```bash
triggerfish stop && triggerfish start
```

---

## Canaux

### Pourquoi mon bot ne répond-il pas aux messages ?

Commencez par vérifier :

1. **Le daemon est-il en cours d'exécution ?** Lancez `triggerfish status`
2. **Le canal est-il connecté ?** Vérifiez les logs : `triggerfish logs`
3. **Le token du bot est-il valide ?** La plupart des canaux échouent silencieusement avec des tokens invalides
4. **L'ID du propriétaire est-il correct ?** Si vous n'êtes pas reconnu comme propriétaire, le bot peut restreindre les réponses

Consultez le guide [Dépannage des canaux](/fr-FR/support/troubleshooting/channels) pour les listes de vérification spécifiques à chaque canal.

### Qu'est-ce que l'ID du propriétaire et pourquoi est-il important ?

L'ID du propriétaire indique à Triggerfish quel utilisateur sur un canal donné est vous (l'opérateur). Les utilisateurs non propriétaires obtiennent un accès restreint aux outils et peuvent être soumis à des limites de classification. Si vous laissez l'ID du propriétaire vide, le comportement varie selon le canal. Certains canaux (comme WhatsApp) traiteront tout le monde comme propriétaire, ce qui est un risque de sécurité.

### Puis-je utiliser plusieurs canaux en même temps ?

Oui. Configurez autant de canaux que vous voulez dans `triggerfish.yaml`. Chaque canal maintient ses propres sessions et son niveau de classification. Le routeur gère la distribution des messages à travers tous les canaux connectés.

### Quelles sont les limites de taille des messages ?

| Canal     | Limite                  | Comportement              |
|-----------|-------------------------|---------------------------|
| Telegram  | 4 096 caractères        | Automatiquement découpé   |
| Discord   | 2 000 caractères        | Automatiquement découpé   |
| Slack     | 40 000 caractères       | Tronqué (pas découpé)     |
| WhatsApp  | 4 096 caractères        | Tronqué                   |
| Email     | Pas de limite stricte   | Message complet envoyé    |
| WebChat   | Pas de limite stricte   | Message complet envoyé    |

### Pourquoi les messages Slack sont-ils coupés ?

Slack a une limite de 40 000 caractères. Contrairement à Telegram et Discord, Triggerfish tronque les messages Slack au lieu de les diviser en plusieurs messages. Les réponses très longues (comme les sorties de code volumineuses) peuvent perdre du contenu à la fin.

---

## Sécurité et classification

### Quels sont les niveaux de classification ?

Quatre niveaux, du moins au plus sensible :

1. **PUBLIC** - Aucune restriction sur le flux de données
2. **INTERNAL** - Données opérationnelles standard
3. **CONFIDENTIAL** - Données sensibles (identifiants, informations personnelles, dossiers financiers)
4. **RESTRICTED** - Sensibilité la plus élevée (données réglementées, critiques pour la conformité)

Les données ne peuvent circuler que des niveaux inférieurs vers des niveaux égaux ou supérieurs. Les données CONFIDENTIAL ne peuvent jamais atteindre un canal PUBLIC. C'est la règle du « no write-down » et elle ne peut pas être contournée.

### Que signifie « taint de session » ?

Chaque session commence à PUBLIC. Quand l'agent accède à des données classifiées (lit un fichier CONFIDENTIAL, interroge une base de données RESTRICTED), le taint de session s'élève pour correspondre. Le taint ne fait que monter, jamais descendre. Une session marquée CONFIDENTIAL ne peut pas envoyer sa sortie vers un canal PUBLIC.

### Pourquoi ai-je des erreurs « write-down bloqué » ?

Votre session a été marquée à un niveau de classification supérieur à celui de la destination. Par exemple, si vous avez accédé à des données CONFIDENTIAL puis essayé d'envoyer les résultats vers un canal WebChat PUBLIC, le policy engine le bloque.

C'est le comportement attendu. Pour résoudre le problème, vous pouvez :
- Démarrer une nouvelle session (nouvelle conversation)
- Utiliser un canal classifié au niveau ou au-dessus du taint de votre session

### Puis-je désactiver l'application de la classification ?

Non. Le système de classification est un invariant de sécurité fondamental. Il s'exécute en tant que code déterministe sous la couche LLM et ne peut être contourné, désactivé ou influencé par l'agent. C'est par conception.

---

## Fournisseurs de LLM

### Quels fournisseurs sont pris en charge ?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI et les modèles locaux via Ollama ou LM Studio.

### Comment fonctionne le failover ?

Configurez une liste `failover` dans `triggerfish.yaml` :

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Si le fournisseur principal échoue, Triggerfish essaie chaque fournisseur de repli dans l'ordre. La section `failover_config` contrôle le nombre de tentatives, le délai et les conditions d'erreur qui déclenchent le failover.

### Mon fournisseur renvoie des erreurs 401 / 403

Votre clé API est invalide ou expirée. Restockez-la :

```bash
triggerfish config set-secret provider:<nom>:apiKey <votre-clé>
```

Puis redémarrez le daemon. Voir [Dépannage des fournisseurs de LLM](/fr-FR/support/troubleshooting/providers) pour des conseils spécifiques à chaque fournisseur.

### Puis-je utiliser différents modèles pour différents niveaux de classification ?

Oui. Utilisez la configuration `classification_models` :

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

Les sessions marquées à un niveau spécifique utiliseront le modèle correspondant. Les niveaux sans remplacement explicite se rabattent sur le modèle principal.

---

## Docker

### Comment exécuter Triggerfish dans Docker ?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

Cela télécharge le script wrapper Docker et le fichier compose, récupère l'image et lance l'assistant de configuration.

### Où sont stockées les données dans Docker ?

Toutes les données persistantes se trouvent dans un volume nommé Docker (`triggerfish-data`) monté à `/data` dans le conteneur. Cela inclut la configuration, les secrets, la base de données SQLite, les logs, les skills et les espaces de travail des agents.

### Comment fonctionnent les secrets dans Docker ?

Les conteneurs Docker ne peuvent pas accéder au trousseau de clés du système hôte. Triggerfish utilise à la place un stockage de fichier chiffré : `secrets.json` (valeurs chiffrées) et `secrets.key` (clé de chiffrement AES-256), tous deux stockés dans le volume `/data`. Traitez le volume comme sensible.

### Le conteneur ne trouve pas mon fichier de configuration

Assurez-vous de l'avoir monté correctement :

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Si le conteneur démarre sans fichier de configuration, il affichera un message d'aide et se terminera.

### Comment mettre à jour l'image Docker ?

```bash
triggerfish update    # Si vous utilisez le script wrapper
# ou
docker compose pull && docker compose up -d
```

---

## Skills et The Reef

### Qu'est-ce qu'un skill ?

Un skill est un dossier contenant un fichier `SKILL.md` qui donne à l'agent de nouvelles capacités, du contexte ou des directives comportementales. Les skills peuvent inclure des définitions d'outils, du code, des modèles et des instructions.

### Qu'est-ce que The Reef ?

The Reef est le marketplace de skills de Triggerfish. Vous pouvez découvrir, installer et publier des skills à travers :

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Pourquoi mon skill a-t-il été bloqué par le scanner de sécurité ?

Chaque skill est analysé avant l'installation. Le scanner vérifie les patterns suspects, les permissions excessives et les violations de plafond de classification. Si le plafond d'un skill est inférieur au taint actuel de votre session, l'activation est bloquée pour empêcher le write-down.

### Qu'est-ce qu'un plafond de classification sur un skill ?

Les skills déclarent un niveau de classification maximum auquel ils sont autorisés à opérer. Un skill avec `classification_ceiling: INTERNAL` ne peut pas être activé dans une session marquée CONFIDENTIAL ou au-dessus. Cela empêche les skills d'accéder à des données au-dessus de leur habilitation.

---

## Triggers et planification

### Que sont les triggers ?

Les triggers sont des réveils périodiques de l'agent pour un comportement proactif. Vous définissez ce que l'agent doit vérifier dans `TRIGGER.md`, et Triggerfish le réveille selon un calendrier. L'agent examine ses instructions, agit (vérifier un calendrier, surveiller un service, envoyer un rappel) et se rendort.

### En quoi les triggers diffèrent-ils des tâches cron ?

Les tâches cron exécutent une tâche fixe selon un calendrier. Les triggers réveillent l'agent avec son contexte complet (mémoire, outils, accès aux canaux) et le laissent décider quoi faire en fonction des instructions de `TRIGGER.md`. Le cron est mécanique ; les triggers sont agentiques.

### Que sont les heures de silence ?

Le paramètre `quiet_hours` dans `scheduler.trigger` empêche les triggers de se déclencher pendant les heures spécifiées :

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Comment fonctionnent les webhooks ?

Les services externes peuvent envoyer des requêtes POST vers le point de terminaison webhook de Triggerfish pour déclencher des actions de l'agent. Chaque source de webhook nécessite une signature HMAC pour l'authentification et inclut la détection de rejeu.

---

## Équipes d'agents

### Que sont les équipes d'agents ?

Les équipes d'agents sont des groupes persistants d'agents collaborant sur des tâches complexes. Chaque membre de l'équipe est une session d'agent séparée avec son propre rôle, contexte de conversation et outils. Un membre est désigné comme leader et coordonne le travail. Voir [Équipes d'agents](/fr-FR/features/agent-teams) pour la documentation complète.

### En quoi les équipes diffèrent-elles des sous-agents ?

Les sous-agents fonctionnent en mode « lance et oublie » : vous déléguez une seule tâche et attendez le résultat. Les équipes sont persistantes -- les membres communiquent entre eux via `sessions_send`, le leader coordonne le travail et l'équipe fonctionne de manière autonome jusqu'à dissolution ou expiration. Utilisez les sous-agents pour la délégation ciblée ; utilisez les équipes pour la collaboration multi-rôle complexe.

### Les équipes d'agents nécessitent-elles un plan payant ?

Les équipes d'agents nécessitent le plan **Power** (149 $/mois) lors de l'utilisation de Triggerfish Gateway. Les utilisateurs open source utilisant leurs propres clés API ont un accès complet -- chaque membre de l'équipe consomme de l'inférence de votre fournisseur de LLM configuré.

### Pourquoi mon leader d'équipe a-t-il échoué immédiatement ?

La cause la plus courante est un fournisseur de LLM mal configuré. Chaque membre de l'équipe crée sa propre session d'agent qui a besoin d'une connexion LLM fonctionnelle. Vérifiez `triggerfish logs` pour les erreurs de fournisseur autour du moment de la création de l'équipe. Voir [Dépannage des équipes d'agents](/fr-FR/support/troubleshooting/security#agent-teams) pour plus de détails.

### Les membres de l'équipe peuvent-ils utiliser différents modèles ?

Oui. Chaque définition de membre accepte un champ optionnel `model`. S'il est omis, le membre hérite du modèle de l'agent qui l'a créé. Cela vous permet d'attribuer des modèles coûteux aux rôles complexes et des modèles moins chers aux rôles simples.

### Combien de temps une équipe peut-elle fonctionner ?

Par défaut, les équipes ont une durée de vie de 1 heure (`max_lifetime_seconds: 3600`). Quand la limite est atteinte, le leader reçoit un avertissement de 60 secondes pour produire la sortie finale, puis l'équipe est automatiquement dissoute. Vous pouvez configurer une durée de vie plus longue à la création.

### Que se passe-t-il si un membre de l'équipe plante ?

Le moniteur de cycle de vie détecte les défaillances de membres dans les 30 secondes. Les membres défaillants sont marqués comme `failed` et le leader est notifié pour continuer avec les membres restants ou dissoudre l'équipe. Si le leader lui-même échoue, l'équipe est mise en pause et la session qui l'a créée est notifiée.

---

## Divers

### Triggerfish est-il open source ?

Oui, sous licence Apache 2.0. Le code source complet, y compris tous les composants critiques pour la sécurité, est disponible pour audit sur [GitHub](https://github.com/greghavens/triggerfish).

### Triggerfish contacte-t-il des serveurs externes ?

Non. Triggerfish n'effectue aucune connexion sortante sauf vers les services que vous configurez explicitement (fournisseurs de LLM, API de canaux, intégrations). Il n'y a pas de télémétrie, d'analytique ou de vérification de mise à jour, sauf si vous exécutez `triggerfish update`.

### Puis-je exécuter plusieurs agents ?

Oui. La section de configuration `agents` définit plusieurs agents, chacun avec son propre nom, modèle, liaisons de canaux, ensembles d'outils et plafonds de classification. Le système de routage dirige les messages vers l'agent approprié.

### Qu'est-ce que le gateway ?

Le gateway est le plan de contrôle WebSocket interne de Triggerfish. Il gère les sessions, route les messages entre les canaux et l'agent, distribue les outils et applique la politique. L'interface de chat CLI se connecte au gateway pour communiquer avec votre agent.

### Quels ports Triggerfish utilise-t-il ?

| Port  | Usage                    | Liaison          |
|-------|--------------------------|------------------|
| 18789 | Gateway WebSocket        | localhost uniquement |
| 18790 | Tidepool A2UI            | localhost uniquement |
| 8765  | WebChat (si activé)      | configurable     |
| 8443  | Webhook WhatsApp (si activé) | configurable |

Tous les ports par défaut se lient à localhost. Aucun n'est exposé au réseau sauf si vous le configurez explicitement autrement ou utilisez un reverse proxy.
