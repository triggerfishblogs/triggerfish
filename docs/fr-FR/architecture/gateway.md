# Gateway

Le Gateway est le plan de contrôle central de Triggerfish -- un service local
persistant qui coordonne les sessions, les canaux, les outils, les événements et
les processus d'agent via un point de terminaison WebSocket unique. Tout ce qui
se passe dans Triggerfish transite par le Gateway.

## Architecture

<img src="/diagrams/gateway-architecture.svg" alt="Architecture du Gateway : les canaux à gauche se connectent via le Gateway central aux services à droite" style="max-width: 100%;" />

Le Gateway écoute sur un port configurable (par défaut `18789`) et accepte les
connexions des adaptateurs de canaux, des commandes CLI, des applications
compagnon et des services internes. Toutes les communications utilisent JSON-RPC
sur WebSocket.

## Services du Gateway

Le Gateway fournit ces services via ses points de terminaison WebSocket et HTTP :

| Service             | Description                                                                              | Intégration sécurité                    |
| ------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| **Sessions**        | Créer, lister, récupérer l'historique, envoyer entre sessions, lancer des tâches d'arrière-plan | Taint de session suivi par session  |
| **Canaux**          | Router les messages, gérer les connexions, réessayer les livraisons échouées, découper les gros messages | Vérification de classification sur toutes les sorties |
| **Cron**            | Planifier des tâches récurrentes et des réveils de trigger depuis `TRIGGER.md`           | Les actions cron passent par les hooks de politique |
| **Webhooks**        | Accepter les événements entrants de services externes via `POST /webhooks/:sourceId`     | Données entrantes classifiées à l'ingestion |
| **Ripple**          | Suivre le statut en ligne et les indicateurs de frappe sur les canaux                    | Aucune donnée sensible exposée          |
| **Config**          | Recharger les paramètres à chaud sans redémarrage                                        | Réservé à l'admin en entreprise         |
| **Interface de contrôle** | Tableau de bord web pour la santé et la gestion du Gateway                         | Authentifié par token                   |
| **Tide Pool**       | Héberger l'espace de travail visuel A2UI piloté par l'agent                             | Contenu soumis aux hooks de sortie      |
| **Notifications**   | Livraison de notifications multicanal avec routage par priorité                          | Les règles de classification s'appliquent |

## Protocole JSON-RPC WebSocket

Les clients se connectent au Gateway via WebSocket et échangent des messages
JSON-RPC 2.0. Chaque message est un appel de méthode avec des paramètres typés
et une réponse typée.

```typescript
// Le client envoie :
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Le Gateway répond :
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

Le Gateway sert également des points de terminaison HTTP pour l'ingestion de webhooks. Lorsqu'un `SchedulerService` est attaché, les routes `POST /webhooks/:sourceId` sont disponibles pour les événements webhook entrants.

## Interface du serveur

```typescript
interface GatewayServerOptions {
  /** Port d'écoute. Utilisez 0 pour un port disponible aléatoire. */
  readonly port?: number;
  /** Token d'authentification pour les connexions. */
  readonly authToken?: string;
  /** Service de planification optionnel pour les points de terminaison webhook. */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** Démarrer le serveur. Retourne l'adresse liée. */
  start(): Promise<GatewayAddr>;
  /** Arrêter le serveur gracieusement. */
  stop(): Promise<void>;
}
```

## Authentification

Les connexions au Gateway sont authentifiées avec un token. Le token est généré lors de l'installation (`triggerfish dive`) et stocké localement.

::: warning SÉCURITÉ Le Gateway se lie à `127.0.0.1` par défaut et n'est pas exposé au réseau. L'accès à distance nécessite une configuration de tunnel explicite. N'exposez jamais le WebSocket du Gateway sur l'internet public sans authentification. :::

## Gestion des sessions

Le Gateway gère le cycle de vie complet des sessions. Les sessions sont l'unité fondamentale de l'état de conversation, chacune avec un suivi de taint indépendant.

### Types de sessions

| Type         | Pattern de clé                 | Description                                                                          |
| ------------ | ------------------------------ | ------------------------------------------------------------------------------------ |
| Main         | `main`                         | Conversation directe principale avec le propriétaire. Persiste entre les redémarrages. |
| Channel      | `channel:<type>:<id>`          | Une par canal connecté. Taint isolé par canal.                                       |
| Background   | `bg:<task_id>`                 | Créée pour les tâches cron et déclenchées par webhook. Démarre au taint `PUBLIC`.    |
| Agent        | `agent:<agent_id>`             | Sessions par agent pour le routage multi-agent.                                      |
| Group        | `group:<channel>:<group_id>`   | Sessions de discussion de groupe.                                                    |

### Outils de session

L'agent interagit avec les sessions via ces outils, tous routés par le Gateway :

| Outil              | Description                                    | Implications pour le taint                |
| ------------------ | ---------------------------------------------- | ----------------------------------------- |
| `sessions_list`    | Lister les sessions actives avec filtres optionnels | Pas de changement de taint            |
| `sessions_history` | Récupérer la transcription d'une session       | Le taint hérite de la session référencée  |
| `sessions_send`    | Envoyer un message à une autre session         | Soumis à la vérification du write-down    |
| `sessions_spawn`   | Créer une session de tâche d'arrière-plan      | Nouvelle session au taint `PUBLIC`        |
| `session_status`   | Vérifier l'état, le modèle et le coût de la session | Pas de changement de taint           |

::: info La communication inter-sessions via `sessions_send` est soumise aux mêmes règles de write-down que toute autre sortie. Une session `CONFIDENTIAL` ne peut pas envoyer de données à une session connectée à un canal `PUBLIC`. :::

## Routage des canaux

Le Gateway route les messages entre les canaux et les sessions via le routeur de canaux. Le routeur gère :

- **Porte de classification** : chaque message sortant passe par `PRE_OUTPUT` avant la livraison
- **Réessai avec backoff** : les livraisons échouées sont réessayées avec un backoff exponentiel via `sendWithRetry()`
- **Découpage des messages** : les gros messages sont découpés en morceaux appropriés à la plateforme (ex. limite de 4 096 caractères de Telegram)
- **Streaming** : les réponses sont diffusées vers les canaux qui le supportent
- **Gestion des connexions** : `connectAll()` et `disconnectAll()` pour la gestion du cycle de vie

## Service de notifications

Le Gateway intègre un service de notifications de première classe qui remplace les patterns ad hoc « notifier le propriétaire » à travers la plateforme. Toutes les notifications transitent par un seul `NotificationService`.

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### Routage par priorité

| Priorité   | Comportement                                                              |
| ---------- | ------------------------------------------------------------------------- |
| `CRITICAL` | Contourne les heures calmes, livre à TOUS les canaux connectés immédiatement |
| `HIGH`     | Livre au canal préféré immédiatement, met en file si hors ligne           |
| `NORMAL`   | Livre à la session active, ou met en file pour le prochain démarrage de session |
| `LOW`      | Met en file, livre par lots pendant les sessions actives                  |

### Sources de notifications

| Source                               | Catégorie  | Priorité par défaut |
| ------------------------------------ | ---------- | ------------------- |
| Violations de politique              | `security` | `CRITICAL`          |
| Alertes de renseignement sur les menaces | `security` | `CRITICAL`      |
| Demandes d'approbation de skill      | `approval` | `HIGH`              |
| Échecs de tâches cron                | `system`   | `HIGH`              |
| Avertissements de santé système      | `system`   | `HIGH`              |
| Déclencheurs d'événements webhook    | `info`     | `NORMAL`            |
| Mises à jour disponibles sur The Reef | `info`    | `LOW`               |

Les notifications sont persistées via `StorageProvider` (espace de noms : `notifications:`) et survivent aux redémarrages. Les notifications non livrées sont retentées au prochain démarrage du Gateway ou à la connexion d'une session.

### Préférences de livraison

Vous configurez les préférences de notification par canal :

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "America/Chicago"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## Intégration du planificateur

Le Gateway héberge le service de planification, qui gère :

- **Boucle de tick cron** : évaluation périodique des tâches planifiées
- **Réveils de trigger** : réveils de l'agent définis dans `TRIGGER.md`
- **Points de terminaison HTTP webhook** : `POST /webhooks/:sourceId` pour les événements entrants
- **Isolation de l'orchestrateur** : chaque tâche planifiée s'exécute dans son propre `OrchestratorFactory` avec un état de session isolé

::: tip Les tâches déclenchées par cron et par webhook créent des sessions d'arrière-plan avec un taint `PUBLIC` frais. Elles n'héritent pas du taint d'une session existante, garantissant que les tâches autonomes démarrent avec un état de classification propre. :::

## Santé et diagnostics

La commande `triggerfish patrol` se connecte au Gateway et exécute des vérifications diagnostiques de santé, vérifiant :

- Le Gateway est en fonctionnement et réactif
- Tous les canaux configurés sont connectés
- Le stockage est accessible
- Les tâches planifiées s'exécutent à l'heure
- Aucune notification critique non livrée n'est bloquée dans la file
