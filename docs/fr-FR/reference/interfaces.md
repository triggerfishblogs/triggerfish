# Interfaces clés

Cette page documente les interfaces TypeScript qui définissent les points
d'extension de Triggerfish. Si vous construisez un adaptateur de canal
personnalisé, un fournisseur LLM, un backend de stockage ou une intégration de
politique, voici les contrats que votre code doit respecter.

## Result\<T, E\>

Triggerfish utilise un type résultat à union discriminée au lieu d'exceptions
levées pour toutes les erreurs attendues.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Utilisation :**

```typescript
function parseConfig(raw: string): Result<Config, string> {
  try {
    const config = JSON.parse(raw);
    return { ok: true, value: config };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

const result = parseConfig(input);
if (result.ok) {
  // result.value est Config
} else {
  // result.error est string
}
```

::: warning Ne levez jamais d'exceptions pour les erreurs attendues. Utilisez `Result<T, E>` partout. Les exceptions levées sont réservées aux erreurs véritablement inattendues et irrécupérables (bugs). :::

## ClassificationLevel

Le système de classification à quatre niveaux utilisé pour toutes les décisions de flux de données.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Ordonné du plus élevé au plus bas : `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Les données ne peuvent circuler que vers des niveaux égaux ou supérieurs (no write-down).

## StorageProvider

L'abstraction de persistance unifiée. Toutes les données avec état dans Triggerfish transitent par cette interface.

```typescript
interface StorageProvider {
  /** Stocker une valeur sous la clé donnée. Écrase toute valeur existante. */
  set(key: string, value: string): Promise<void>;

  /** Récupérer une valeur par clé. Retourne null quand la clé n'existe pas. */
  get(key: string): Promise<string | null>;

  /** Supprimer une clé. Sans effet quand la clé n'existe pas. */
  delete(key: string): Promise<void>;

  /** Lister toutes les clés correspondant à un préfixe optionnel. Retourne toutes les clés si aucun préfixe n'est fourni. */
  list(prefix?: string): Promise<string[]>;

  /** Libérer les ressources détenues par ce fournisseur (ex. fermer les handles de base de données). */
  close(): Promise<void>;
}
```

**Implémentations :**

| Backend                 | Cas d'utilisation                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `MemoryStorageProvider` | Tests, sessions éphémères                                                               |
| `SqliteStorageProvider` | Par défaut pour le tier personnel (SQLite WAL à `~/.triggerfish/data/triggerfish.db`)    |
| Backends entreprise     | Géré par le client (Postgres, S3, etc.)                                                 |

**Espaces de noms clés :** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`, `notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

L'interface commune pour tous les adaptateurs de canaux de messagerie (CLI, Telegram, Slack, Discord, WhatsApp, WebChat, Email).

```typescript
interface ChannelAdapter {
  /** Le niveau de classification attribué à ce canal. */
  readonly classification: ClassificationLevel;

  /** Si l'utilisateur actuel est le propriétaire. */
  readonly isOwner: boolean;

  /** Se connecter au canal. */
  connect(): Promise<void>;

  /** Se déconnecter du canal. */
  disconnect(): Promise<void>;

  /** Envoyer un message au canal. */
  send(message: ChannelMessage): Promise<void>;

  /** Enregistrer un gestionnaire pour les messages entrants. */
  onMessage(handler: MessageHandler): void;

  /** Obtenir le statut actuel du canal. */
  status(): ChannelStatus;
}
```

**Types associés :**

```typescript
interface ChannelMessage {
  readonly content: string;
  readonly sessionId?: string;
  readonly sessionTaint?: ClassificationLevel;
}

interface ChannelStatus {
  readonly connected: boolean;
  readonly channelType: string;
}

type MessageHandler = (message: ChannelMessage) => void;
```

## LlmProvider

L'interface pour les complétions LLM. Chaque fournisseur (Anthropic, OpenAI, Google, Local, OpenRouter) implémente cette interface.

```typescript
interface LlmProvider {
  /** Identifiant du nom du fournisseur. */
  readonly name: string;

  /** Si ce fournisseur supporte les réponses en streaming. */
  readonly supportsStreaming: boolean;

  /** Envoyer des messages au LLM et recevoir une réponse de complétion. */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}
```

**Registre de fournisseurs :**

```typescript
interface LlmProviderRegistry {
  /** Enregistrer un fournisseur. Remplace tout fournisseur existant avec le même nom. */
  register(provider: LlmProvider): void;

  /** Obtenir un fournisseur par nom, ou undefined s'il n'est pas enregistré. */
  get(name: string): LlmProvider | undefined;

  /** Définir le fournisseur par défaut par nom. Doit déjà être enregistré. */
  setDefault(name: string): void;

  /** Obtenir le fournisseur par défaut, ou undefined si aucun n'est défini. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

L'abstraction de livraison de notifications. Voir [Notifications](/fr-FR/features/notifications) pour les détails d'utilisation.

```typescript
type NotificationPriority = "critical" | "normal" | "low";

interface Notification {
  readonly id: string;
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly createdAt: Date;
}

interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority;
}

interface NotificationService {
  /** Livrer ou mettre en file une notification pour un utilisateur. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Obtenir les notifications en attente (non livrées) pour un utilisateur. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Accuser réception d'une notification comme livrée. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Types de hooks

Les hooks d'application de politique interceptent les actions aux points critiques du flux de données. Tous les hooks sont déterministes, synchrones, journalisés et infalsifiables.

### HookType

```typescript
type HookType =
  | "PRE_CONTEXT_INJECTION"
  | "PRE_TOOL_CALL"
  | "POST_TOOL_RESPONSE"
  | "PRE_OUTPUT"
  | "SECRET_ACCESS";
```

### PolicyAction

```typescript
type PolicyAction = "ALLOW" | "BLOCK" | "REDACT" | "REQUIRE_APPROVAL";
```

### HookContext et HookResult

```typescript
interface HookContext {
  readonly session: SessionState;
  readonly input: Record<string, unknown>;
}

interface HookResult {
  readonly allowed: boolean;
  readonly action: PolicyAction;
  readonly ruleId: string | null;
  readonly message?: string;
  readonly duration: number;
}
```

## SessionState

L'unité fondamentale de l'état de conversation avec suivi de taint indépendant.

```typescript
interface SessionState {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly channelId: ChannelId;
  readonly taint: ClassificationLevel;
  readonly createdAt: Date;
  readonly history: readonly TaintEvent[];
}
```

**Types d'ID marqués :**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

Les types marqués empêchent l'utilisation accidentelle erronée des IDs -- vous ne pouvez pas passer un `UserId` là où un `SessionId` est attendu.

::: info Toutes les opérations de session sont immuables. Les fonctions retournent de nouveaux objets `SessionState` plutôt que de modifier les objets existants. Cela garantit la transparence référentielle et simplifie les tests. :::
