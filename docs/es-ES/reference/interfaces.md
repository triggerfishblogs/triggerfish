# Interfaces clave

Esta página documenta las interfaces TypeScript que definen los puntos de extensión de Triggerfish. Si está construyendo un adaptador de canal personalizado, un proveedor LLM, un backend de almacenamiento o una integración de políticas, estos son los contratos que su código debe satisfacer.

## Result\<T, E\>

Triggerfish usa un tipo de resultado de unión discriminada en lugar de excepciones lanzadas para todos los fallos esperados.

```typescript
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

**Uso:**

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
  // result.value es Config
} else {
  // result.error es string
}
```

::: warning Nunca lance excepciones para fallos esperados. Use `Result<T, E>` en todo el código. Las excepciones lanzadas se reservan para errores verdaderamente inesperados e irrecuperables (bugs). :::

## ClassificationLevel

El sistema de clasificación de cuatro niveles usado para todas las decisiones de flujo de datos.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Ordenado de mayor a menor: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Los datos solo pueden fluir a niveles iguales o superiores (sin escritura descendente).

## StorageProvider

La abstracción unificada de persistencia. Todos los datos con estado en Triggerfish fluyen a través de esta interfaz.

```typescript
interface StorageProvider {
  /** Almacenar un valor bajo la clave dada. Sobrescribe cualquier valor existente. */
  set(key: string, value: string): Promise<void>;

  /** Recuperar un valor por clave. Devuelve null cuando la clave no existe. */
  get(key: string): Promise<string | null>;

  /** Eliminar una clave. Sin efecto cuando la clave no existe. */
  delete(key: string): Promise<void>;

  /** Listar todas las claves que coincidan con un prefijo opcional. Devuelve todas las claves cuando no se proporciona prefijo. */
  list(prefix?: string): Promise<string[]>;

  /** Liberar recursos mantenidos por este proveedor (p. ej., cerrar manejadores de base de datos). */
  close(): Promise<void>;
}
```

**Implementaciones:**

| Backend                 | Caso de uso                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| `MemoryStorageProvider` | Pruebas, sesiones efímeras                                                      |
| `SqliteStorageProvider` | Predeterminado para nivel personal (SQLite WAL en `~/.triggerfish/data/triggerfish.db`) |
| Backends empresariales  | Gestionados por el cliente (Postgres, S3, etc.)                                 |

**Espacios de nombres de claves:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`, `notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

La interfaz común para todos los adaptadores de canal de mensajería (CLI, Telegram, Slack, Discord, WhatsApp, WebChat, Email).

```typescript
interface ChannelAdapter {
  /** El nivel de clasificación asignado a este canal. */
  readonly classification: ClassificationLevel;

  /** Si el usuario actual es el propietario. */
  readonly isOwner: boolean;

  /** Conectar al canal. */
  connect(): Promise<void>;

  /** Desconectar del canal. */
  disconnect(): Promise<void>;

  /** Enviar un mensaje al canal. */
  send(message: ChannelMessage): Promise<void>;

  /** Registrar un manejador para mensajes entrantes. */
  onMessage(handler: MessageHandler): void;

  /** Obtener el estado actual del canal. */
  status(): ChannelStatus;
}
```

**Tipos de soporte:**

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

La interfaz para completaciones LLM. Cada proveedor (Anthropic, OpenAI, Google, Local, OpenRouter) implementa esta interfaz.

```typescript
interface LlmProvider {
  /** Identificador del nombre del proveedor. */
  readonly name: string;

  /** Si este proveedor admite respuestas en streaming. */
  readonly supportsStreaming: boolean;

  /** Enviar mensajes al LLM y recibir una respuesta de completación. */
  complete(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
    options: Record<string, unknown>,
  ): Promise<LlmCompletionResult>;
}
```

**Registro de proveedores:**

```typescript
interface LlmProviderRegistry {
  /** Registrar un proveedor. Reemplaza cualquier proveedor existente con el mismo nombre. */
  register(provider: LlmProvider): void;

  /** Obtener un proveedor por nombre, o undefined si no está registrado. */
  get(name: string): LlmProvider | undefined;

  /** Establecer el proveedor predeterminado por nombre. Debe estar ya registrado. */
  setDefault(name: string): void;

  /** Obtener el proveedor predeterminado, o undefined si no hay ninguno establecido. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

La abstracción de entrega de notificaciones. Consulte [Notificaciones](/es-ES/features/notifications) para detalles de uso.

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
  /** Entregar o encolar una notificación para un usuario. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Obtener notificaciones pendientes (no entregadas) para un usuario. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Confirmar una notificación como entregada. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Tipos de hook

Los hooks de aplicación de políticas interceptan acciones en puntos críticos del flujo de datos. Todos los hooks son deterministas, síncronos, registrados e infalsificables.

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

### HookContext y HookResult

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

La unidad fundamental de estado de conversación con seguimiento independiente de taint.

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

**Tipos de ID con marca (branded):**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

Los tipos con marca previenen el uso accidental de IDs -- no puede pasar un `UserId` donde se espera un `SessionId`.

::: info Todas las operaciones de sesión son inmutables. Las funciones devuelven nuevos objetos `SessionState` en lugar de mutar los existentes. Esto garantiza transparencia referencial y simplifica las pruebas. :::
