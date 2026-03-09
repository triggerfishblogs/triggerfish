# Gateway

El Gateway es el plano de control central de Triggerfish — un servicio local de
larga ejecución que coordina sesiones, canales, herramientas, eventos y procesos
de agentes a través de un único endpoint WebSocket. Todo lo que sucede en
Triggerfish fluye a través del Gateway.

## Arquitectura

<img src="/diagrams/gateway-architecture.svg" alt="Arquitectura del Gateway: los canales a la izquierda se conectan a través del Gateway central a los servicios a la derecha" style="max-width: 100%;" />

El Gateway escucha en un puerto configurable (predeterminado `18789`) y acepta
conexiones de adaptadores de canal, comandos CLI, apps complementarias y
servicios internos. Toda la comunicación usa JSON-RPC sobre WebSocket.

## Servicios del Gateway

El Gateway proporciona estos servicios a través de sus endpoints WebSocket y HTTP:

| Servicio          | Descripción                                                                        | Integración de seguridad                         |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Sesiones**      | Crear, listar, obtener historial, enviar entre sesiones, generar tareas en segundo plano | Taint de sesión rastreado por sesión         |
| **Canales**       | Enrutar mensajes, gestionar conexiones, reintentar entregas fallidas, dividir mensajes grandes | Verificación de clasificación en toda salida |
| **Cron**          | Programar tareas recurrentes y disparar activaciones desde `TRIGGER.md`            | Las acciones cron pasan por hooks de políticas   |
| **Webhooks**      | Aceptar eventos entrantes de servicios externos vía `POST /webhooks/:sourceId`     | Datos entrantes clasificados en la ingesta       |
| **Ripple**        | Rastrear estado en línea e indicadores de escritura entre canales                  | Sin datos sensibles expuestos                    |
| **Configuración** | Recarga en caliente de ajustes sin reinicio                                        | Solo administrador en empresarial                |
| **UI de control** | Panel web para salud y gestión del Gateway                                         | Autenticado por token                            |
| **Tide Pool**     | Alojar espacio de trabajo visual A2UI dirigido por el agente                       | Contenido sujeto a hooks de salida               |
| **Notificaciones** | Entrega de notificaciones multicanal con enrutamiento por prioridad              | Se aplican reglas de clasificación                |

## Protocolo WebSocket JSON-RPC

Los clientes se conectan al Gateway vía WebSocket e intercambian mensajes
JSON-RPC 2.0. Cada mensaje es una llamada a método con parámetros tipados y una
respuesta tipada.

```typescript
// El cliente envía:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// El Gateway responde:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

El Gateway también sirve endpoints HTTP para la ingesta de webhooks. Cuando se
adjunta un `SchedulerService`, las rutas `POST /webhooks/:sourceId` están
disponibles para eventos de webhook entrantes.

## Interfaz del servidor

```typescript
interface GatewayServerOptions {
  /** Puerto en el que escuchar. Usar 0 para un puerto disponible aleatorio. */
  readonly port?: number;
  /** Token de autenticación para conexiones. */
  readonly authToken?: string;
  /** Servicio de programación opcional para endpoints de webhook. */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** Iniciar el servidor. Devuelve la dirección enlazada. */
  start(): Promise<GatewayAddr>;
  /** Detener el servidor de forma controlada. */
  stop(): Promise<void>;
}
```

## Autenticación

Las conexiones al Gateway se autentican con un token. El token se genera durante
la configuración (`triggerfish dive`) y se almacena localmente.

::: warning SEGURIDAD El Gateway se enlaza a `127.0.0.1` por defecto y no está
expuesto a la red. El acceso remoto requiere configuración explícita de túnel.
Nunca exponga el WebSocket del Gateway al internet público sin autenticación. :::

## Gestión de sesiones

El Gateway gestiona el ciclo de vida completo de las sesiones. Las sesiones son
la unidad fundamental del estado de conversación, cada una con seguimiento de
taint independiente.

### Tipos de sesiones

| Tipo          | Patrón de clave               | Descripción                                                                        |
| ------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| Principal     | `main`                        | Conversación directa principal con el propietario. Persiste entre reinicios.       |
| Canal         | `channel:<type>:<id>`         | Una por canal conectado. Taint aislado por canal.                                  |
| Segundo plano | `bg:<task_id>`                | Generada para trabajos cron y tareas disparadas por webhook. Inicia con taint `PUBLIC`. |
| Agente        | `agent:<agent_id>`            | Sesiones por agente para enrutamiento multiagente.                                 |
| Grupo         | `group:<channel>:<group_id>`  | Sesiones de chat grupal.                                                           |

### Herramientas de sesión

El agente interactúa con las sesiones a través de estas herramientas, todas
enrutadas a través del Gateway:

| Herramienta        | Descripción                                     | Implicaciones de taint                        |
| ------------------ | ----------------------------------------------- | --------------------------------------------- |
| `sessions_list`    | Listar sesiones activas con filtros opcionales  | Sin cambio de taint                           |
| `sessions_history` | Obtener transcripción de una sesión             | El taint hereda de la sesión referenciada     |
| `sessions_send`    | Enviar mensaje a otra sesión                    | Sujeto a verificación de write-down           |
| `sessions_spawn`   | Crear sesión de tarea en segundo plano          | La nueva sesión inicia con taint `PUBLIC`     |
| `session_status`   | Verificar estado actual, modelo, costo de sesión | Sin cambio de taint                          |

::: info La comunicación entre sesiones vía `sessions_send` está sujeta a las
mismas reglas de write-down que cualquier otra salida. Una sesión `CONFIDENTIAL`
no puede enviar datos a una sesión conectada a un canal `PUBLIC`. :::

## Enrutamiento de canales

El Gateway enruta mensajes entre canales y sesiones a través del enrutador de
canales. El enrutador maneja:

- **Compuerta de clasificación**: Cada mensaje de salida pasa por `PRE_OUTPUT`
  antes de la entrega
- **Reintento con retroceso**: Las entregas fallidas se reintentan con retroceso
  exponencial vía `sendWithRetry()`
- **División de mensajes**: Los mensajes grandes se dividen en fragmentos
  apropiados para la plataforma (p. ej., el límite de 4096 caracteres de
  Telegram)
- **Streaming**: Las respuestas se transmiten en streaming a los canales que lo soportan
- **Gestión de conexiones**: `connectAll()` y `disconnectAll()` para la gestión
  del ciclo de vida

## Servicio de notificaciones

El Gateway integra un servicio de notificaciones de primera clase que reemplaza
los patrones ad-hoc de "notificar al propietario" en toda la plataforma. Todas
las notificaciones fluyen a través de un único `NotificationService`.

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### Enrutamiento por prioridad

| Prioridad  | Comportamiento                                                            |
| ---------- | ------------------------------------------------------------------------- |
| `CRITICAL` | Ignora horas de silencio, entrega a TODOS los canales conectados de inmediato |
| `HIGH`     | Entrega al canal preferido de inmediato, encolar si está desconectado     |
| `NORMAL`   | Entrega a la sesión activa, o encolar para el próximo inicio de sesión   |
| `LOW`      | Encolar, entregar en lotes durante sesiones activas                      |

### Fuentes de notificaciones

| Fuente                                   | Categoría    | Prioridad predeterminada |
| ---------------------------------------- | ------------ | ------------------------ |
| Violaciones de políticas                 | `security`   | `CRITICAL`               |
| Alertas de inteligencia de amenazas      | `security`   | `CRITICAL`               |
| Solicitudes de aprobación de skills      | `approval`   | `HIGH`                   |
| Fallos de trabajos cron                  | `system`     | `HIGH`                   |
| Advertencias de salud del sistema        | `system`     | `HIGH`                   |
| Disparadores de eventos webhook          | `info`       | `NORMAL`                 |
| Actualizaciones disponibles en The Reef  | `info`       | `LOW`                    |

Las notificaciones se persisten vía `StorageProvider` (espacio de nombres:
`notifications:`) y sobreviven a reinicios. Las notificaciones no entregadas se
reintentan en el próximo inicio del Gateway o conexión de sesión.

### Preferencias de entrega

Los usuarios configuran preferencias de notificación por canal:

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

## Integración con el programador

El Gateway aloja el servicio de programación, que gestiona:

- **Bucle de tick cron**: Evaluación periódica de tareas programadas
- **Activaciones de trigger**: Activaciones del agente definidas en `TRIGGER.md`
- **Endpoints HTTP de webhook**: `POST /webhooks/:sourceId` para eventos entrantes
- **Aislamiento de orquestador**: Cada tarea programada se ejecuta en su propio
  `OrchestratorFactory` con estado de sesión aislado

::: tip Las tareas disparadas por cron y por webhook generan sesiones en segundo
plano con taint `PUBLIC` limpio. No heredan el taint de ninguna sesión
existente, lo que asegura que las tareas autónomas inicien con un estado de
clasificación limpio. :::

## Salud y diagnósticos

El comando `triggerfish patrol` se conecta al Gateway y ejecuta verificaciones
de salud diagnósticas, comprobando:

- El Gateway está en ejecución y responde
- Todos los canales configurados están conectados
- El almacenamiento es accesible
- Las tareas programadas se ejecutan a tiempo
- No hay notificaciones críticas no entregadas atascadas en la cola
