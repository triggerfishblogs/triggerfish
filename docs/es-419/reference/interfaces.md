# Interfaces Clave

Esta pagina documenta las interfaces TypeScript que definen los puntos de
extension de Triggerfish. Si esta construyendo un adaptador de canal
personalizado, proveedor LLM, backend de almacenamiento o integracion de
politicas, estos son los contratos que su codigo debe satisfacer.

## Result\<T, E\>

Triggerfish usa un tipo de resultado de union discriminada en lugar de
excepciones lanzadas para todos los fallos esperados.

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

::: warning Nunca lance excepciones para fallos esperados. Use `Result<T, E>` en
todo el codigo. Las excepciones lanzadas estan reservadas para errores
verdaderamente inesperados e irrecuperables (bugs). :::

## ClassificationLevel

El sistema de clasificacion de cuatro niveles usado para todas las decisiones de
flujo de datos.

```typescript
type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";
```

Ordenado de mayor a menor: `RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC`. Los
datos solo pueden fluir a niveles iguales o superiores (sin write-down).

## StorageProvider

La abstraccion de persistencia unificada. Todos los datos con estado en
Triggerfish fluyen a traves de esta interfaz.

```typescript
interface StorageProvider {
  /** Almacenar un valor bajo la clave dada. Sobrescribe cualquier valor existente. */
  set(key: string, value: string): Promise<void>;

  /** Recuperar un valor por clave. Retorna null cuando la clave no existe. */
  get(key: string): Promise<string | null>;

  /** Eliminar una clave. No hace nada cuando la clave no existe. */
  delete(key: string): Promise<void>;

  /** Listar todas las claves que coincidan con un prefijo opcional. Retorna todas las claves cuando no se proporciona prefijo. */
  list(prefix?: string): Promise<string[]>;

  /** Liberar recursos mantenidos por este proveedor (ej., cerrar handles de base de datos). */
  close(): Promise<void>;
}
```

**Implementaciones:**

| Backend                 | Caso de Uso                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ |
| `MemoryStorageProvider` | Testing, sesiones efimeras                                                     |
| `SqliteStorageProvider` | Predeterminado para nivel personal (SQLite WAL en `~/.triggerfish/data/triggerfish.db`) |
| Backends enterprise     | Administrados por el cliente (Postgres, S3, etc.)                              |

**Namespaces de claves:** `sessions:`, `taint:`, `lineage:`, `audit:`, `cron:`,
`notifications:`, `exec:`, `skills:`, `config:`

## ChannelAdapter

La interfaz comun para todos los adaptadores de canal de mensajeria (CLI,
Telegram, Slack, Discord, WhatsApp, WebChat, Email).

```typescript
interface ChannelAdapter {
  /** El nivel de clasificacion asignado a este canal. */
  readonly classification: ClassificationLevel;

  /** Si el usuario actual es el propietario. */
  readonly isOwner: boolean;

  /** Conectar al canal. */
  connect(): Promise<void>;

  /** Desconectar del canal. */
  disconnect(): Promise<void>;

  /** Enviar un mensaje al canal. */
  send(message: ChannelMessage): Promise<void>;

  /** Registrar un handler para mensajes entrantes. */
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

La interfaz para completaciones LLM. Cada proveedor (Anthropic, OpenAI, Google,
Local, OpenRouter) implementa esta interfaz.

```typescript
interface LlmProvider {
  /** Identificador del nombre del proveedor. */
  readonly name: string;

  /** Si este proveedor soporta respuestas en streaming. */
  readonly supportsStreaming: boolean;

  /** Enviar mensajes al LLM y recibir una respuesta de completacion. */
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

  /** Obtener un proveedor por nombre, o undefined si no esta registrado. */
  get(name: string): LlmProvider | undefined;

  /** Establecer el proveedor predeterminado por nombre. Debe estar ya registrado. */
  setDefault(name: string): void;

  /** Obtener el proveedor predeterminado, o undefined si no se ha establecido ninguno. */
  getDefault(): LlmProvider | undefined;
}
```

## NotificationService

La abstraccion de entrega de notificaciones. Vea
[Notificaciones](/es-419/features/notifications) para detalles de uso.

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
  /** Entregar o encolar una notificacion para un usuario. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Obtener notificaciones pendientes (no entregadas) para un usuario. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Confirmar una notificacion como entregada. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Tipos de Hook

Los hooks de cumplimiento de politicas interceptan acciones en puntos criticos
del flujo de datos. Todos los hooks son deterministicos, sincronos, registrados
e infalsificables.

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

La unidad fundamental de estado de conversacion con seguimiento de taint
independiente.

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

**Tipos de ID con marca:**

```typescript
type SessionId = string & { readonly __brand: "SessionId" };
type UserId = string & { readonly __brand: "UserId" };
type ChannelId = string & { readonly __brand: "ChannelId" };
```

Los tipos con marca previenen el uso accidental incorrecto de IDs -- no puede
pasar un `UserId` donde se espera un `SessionId`.

::: info Todas las operaciones de sesion son inmutables. Las funciones retornan
nuevos objetos `SessionState` en lugar de mutar los existentes. Esto asegura
transparencia referencial y simplifica el testing. :::
