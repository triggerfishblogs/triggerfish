# Gateway

El Gateway es el plano de control central de Triggerfish: un servicio local de
larga ejecución que coordina sesiones, canales, herramientas, eventos y procesos
de agentes a través de un único endpoint WebSocket. Todo lo que sucede en
Triggerfish fluye a través del Gateway.

## Arquitectura

<img src="/diagrams/gateway-architecture.svg" alt="Arquitectura del Gateway: los canales a la izquierda se conectan a través del Gateway central a los servicios a la derecha" style="max-width: 100%;" />

El Gateway escucha en un puerto configurable (predeterminado `18789`) y acepta
conexiones de adaptadores de canal, comandos CLI, aplicaciones complementarias y
servicios internos. Toda la comunicación utiliza JSON-RPC sobre WebSocket.

## Servicios del Gateway

El Gateway proporciona estos servicios a través de sus endpoints WebSocket y
HTTP:

| Servicio          | Descripción                                                                          | Integración de seguridad                 |
| ----------------- | ------------------------------------------------------------------------------------ | ---------------------------------------- |
| **Sesiones**      | Crear, listar, recuperar historial, enviar entre sesiones, crear tareas en segundo plano | Taint de sesión rastreado por sesión     |
| **Canales**       | Enrutar mensajes, gestionar conexiones, reintentar entregas fallidas, fragmentar mensajes grandes | Verificaciones de clasificación en toda salida |
| **Cron**          | Programar tareas recurrentes y disparar despertares desde `TRIGGER.md`              | Las acciones cron pasan por hooks de políticas |
| **Webhooks**      | Aceptar eventos entrantes de servicios externos vía `POST /webhooks/:sourceId`       | Datos entrantes clasificados en la ingesta |
| **Ripple**        | Rastrear estado en línea e indicadores de escritura entre canales                    | No se exponen datos sensibles             |
| **Config**        | Recarga en caliente de configuración sin reinicio                                    | Solo administrador en empresa             |
| **UI de control** | Panel web para salud y gestión del Gateway                                           | Autenticado con token                     |
| **Tide Pool**     | Alojar workspace visual A2UI controlado por el agente                                | Contenido sujeto a hooks de salida        |
| **Notificaciones**| Entrega de notificaciones multicanal con enrutamiento por prioridad                  | Se aplican reglas de clasificación         |

## Protocolo WebSocket JSON-RPC

Los clientes se conectan al Gateway por WebSocket e intercambian mensajes
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
  /** Puerto en el que escuchar. Use 0 para un puerto aleatorio disponible. */
  readonly port?: number;
  /** Token de autenticación para las conexiones. */
  readonly authToken?: string;
  /** Servicio de planificación opcional para endpoints de webhook. */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** Iniciar el servidor. Devuelve la dirección vinculada. */
  start(): Promise<GatewayAddr>;
  /** Detener el servidor de forma elegante. */
  stop(): Promise<void>;
}
```

## Autenticación

Las conexiones al Gateway se autentican con un token. El token se genera
durante la configuración (`triggerfish dive`) y se almacena localmente.

::: warning SEGURIDAD El Gateway se vincula a `127.0.0.1` por defecto y no se
expone a la red. El acceso remoto requiere configuración explícita de túnel.
Nunca exponga el WebSocket del Gateway a internet público sin autenticación. :::

## Gestión de sesiones

El Gateway gestiona el ciclo de vida completo de las sesiones. Las sesiones son
la unidad fundamental del estado de conversación, cada una con seguimiento de
taint independiente.

### Tipos de sesiones

| Tipo       | Patrón de clave               | Descripción                                                                          |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| Principal  | `main`                        | Conversación directa principal con el propietario. Persiste entre reinicios.         |
| Canal      | `channel:<tipo>:<id>`         | Una por canal conectado. Taint aislado por canal.                                    |
| Segundo plano | `bg:<task_id>`             | Creada para trabajos cron y tareas activadas por webhook. Comienza con taint `PUBLIC`. |
| Agente     | `agent:<agent_id>`            | Sesiones por agente para enrutamiento multiagente.                                   |
| Grupo      | `group:<canal>:<group_id>`    | Sesiones de chat grupal.                                                             |

### Herramientas de sesión

El agente interactúa con las sesiones a través de estas herramientas, todas
enrutadas a través del Gateway:

| Herramienta        | Descripción                                    | Implicaciones de taint                   |
| ------------------ | ---------------------------------------------- | ---------------------------------------- |
| `sessions_list`    | Listar sesiones activas con filtros opcionales | Sin cambio de taint                      |
| `sessions_history` | Recuperar transcripción de una sesión          | Taint se hereda de la sesión referenciada |
| `sessions_send`    | Enviar mensaje a otra sesión                   | Sujeto a verificación de escritura desc.  |
| `sessions_spawn`   | Crear sesión de tarea en segundo plano         | Nueva sesión comienza con taint `PUBLIC` |
| `session_status`   | Comprobar estado actual, modelo, coste          | Sin cambio de taint                      |

::: info La comunicación entre sesiones vía `sessions_send` está sujeta a las
mismas reglas de escritura descendente que cualquier otra salida. Una sesión
`CONFIDENTIAL` no puede enviar datos a una sesión conectada a un canal
`PUBLIC`. :::

## Enrutamiento de canales

El Gateway enruta mensajes entre canales y sesiones a través del enrutador de
canales. El enrutador gestiona:

- **Puerta de clasificación**: cada mensaje saliente pasa por `PRE_OUTPUT` antes
  de la entrega
- **Reintento con retroceso**: las entregas fallidas se reintentan con retroceso
  exponencial vía `sendWithRetry()`
- **Fragmentación de mensajes**: los mensajes grandes se dividen en fragmentos
  apropiados para la plataforma (p. ej., límite de 4096 caracteres de Telegram)
- **Streaming**: las respuestas se transmiten en tiempo real a los canales que lo admiten
- **Gestión de conexiones**: `connectAll()` y `disconnectAll()` para gestión del
  ciclo de vida

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
| `CRITICAL` | Elude horas de silencio, entrega a TODOS los canales conectados inmediatamente |
| `HIGH`     | Entrega al canal preferido inmediatamente, cola si está desconectado       |
| `NORMAL`   | Entrega a la sesión activa, o cola para el próximo inicio de sesión        |
| `LOW`      | Cola, entrega en lotes durante sesiones activas                            |

### Fuentes de notificaciones

| Fuente                                 | Categoría  | Prioridad predeterminada |
| -------------------------------------- | ---------- | ------------------------ |
| Violaciones de política                | `security` | `CRITICAL`               |
| Alertas de inteligencia de amenazas    | `security` | `CRITICAL`               |
| Solicitudes de aprobación de skills    | `approval` | `HIGH`                   |
| Fallos de trabajos cron                | `system`   | `HIGH`                   |
| Advertencias de salud del sistema      | `system`   | `HIGH`                   |
| Disparadores de eventos webhook        | `info`     | `NORMAL`                 |
| Actualizaciones disponibles de The Reef | `info`    | `LOW`                    |

Las notificaciones se persisten vía `StorageProvider` (espacio de nombres:
`notifications:`) y sobreviven a reinicios. Las notificaciones no entregadas se
reintentan en el próximo arranque del Gateway o conexión de sesión.

### Preferencias de entrega

Los usuarios configuran las preferencias de notificación por canal:

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

## Integración con el planificador

El Gateway aloja el servicio de planificación, que gestiona:

- **Bucle de tick cron**: evaluación periódica de tareas programadas
- **Despertares de trigger**: despertares de agente definidos en `TRIGGER.md`
- **Endpoints HTTP de webhook**: `POST /webhooks/:sourceId` para eventos entrantes
- **Aislamiento del orquestador**: cada tarea programada se ejecuta en su propio
  `OrchestratorFactory` con estado de sesión aislado

::: tip Las tareas activadas por cron y webhook crean sesiones en segundo plano
con taint `PUBLIC` nuevo. No heredan el taint de ninguna sesión existente,
asegurando que las tareas autónomas comiencen con un estado de clasificación
limpio. :::

## Salud y diagnósticos

El comando `triggerfish patrol` se conecta al Gateway y ejecuta verificaciones
de salud diagnósticas, comprobando:

- El Gateway está ejecutándose y es receptivo
- Todos los canales configurados están conectados
- El almacenamiento es accesible
- Las tareas programadas se ejecutan a tiempo
- No hay notificaciones críticas no entregadas atascadas en la cola
