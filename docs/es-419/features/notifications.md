# Notificaciones

El NotificationService es la abstraccion de primera clase de Triggerfish para
entregar notificaciones al propietario del agente a traves de todos los canales
conectados.

## Por que un Servicio de Notificaciones?

Sin un servicio dedicado, la logica de notificacion tiende a dispersarse por el
codigo -- cada funcionalidad implementando su propio patron de "notificar al
propietario". Esto lleva a comportamiento inconsistente, notificaciones perdidas
y duplicados.

Triggerfish centraliza toda la entrega de notificaciones a traves de un solo
servicio que maneja prioridad, encolamiento y deduplicacion.

## Como Funciona

<img src="/diagrams/notification-routing.svg" alt="Enrutamiento de notificaciones: las fuentes fluyen a traves de NotificationService con enrutamiento por prioridad, encolamiento y deduplicacion hacia canales" style="max-width: 100%;" />

Cuando cualquier componente necesita notificar al propietario -- un cron job
completandose, un trigger detectando algo importante, un webhook disparandose --
llama al NotificationService. El servicio determina como y donde entregar la
notificacion.

## Interfaz

```typescript
interface NotificationService {
  /** Entregar o encolar una notificacion para un usuario. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Obtener notificaciones pendientes (no entregadas) para un usuario. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Confirmar una notificacion como entregada. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Niveles de Prioridad

Cada notificacion lleva una prioridad que afecta el comportamiento de entrega:

| Prioridad  | Comportamiento                                                                |
| ---------- | ----------------------------------------------------------------------------- |
| `critical` | Entregada inmediatamente a todos los canales conectados. Evita horas de silencio. |
| `normal`   | Entregada al canal preferido. Encolada si el usuario esta offline.            |
| `low`      | Encolada y entregada en lotes. Puede ser resumida.                            |

## Opciones de Entrega

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Encolamiento y Entrega Offline

Cuando el usuario destino esta offline o no hay canales conectados, las
notificaciones se encolan. Se entregan cuando:

- El usuario inicia una nueva sesion.
- Un canal se reconecta.
- El usuario solicita explicitamente las notificaciones pendientes.

Las notificaciones pendientes pueden recuperarse con `getPending()` y
confirmarse con `acknowledge()`.

## Deduplicacion

El NotificationService previene que notificaciones duplicadas lleguen al
usuario. Si el mismo contenido de notificacion se entrega multiples veces dentro
de una ventana, solo la primera entrega se realiza.

## Configuracion

Configure el comportamiento de notificaciones en `triggerfish.yaml`:

```yaml
notifications:
  preferred_channel: telegram # Canal de entrega predeterminado
  quiet_hours: "22:00-07:00" # Suprimir normal/low durante estas horas
  batch_interval: 15m # Agrupar notificaciones de baja prioridad
```

## Ejemplos de Uso

Las notificaciones se usan en todo el sistema:

- Los **cron jobs** notifican al propietario cuando una tarea programada se
  completa o falla.
- Los **triggers** notifican al propietario cuando el monitoreo detecta algo que
  necesita atencion.
- Los **webhooks** notifican al propietario cuando un evento externo se dispara
  (PR de GitHub, alerta de Sentry).
- Las **violaciones de politica** notifican al propietario cuando se intenta una
  accion bloqueada.
- El **estado de canal** notifica al propietario cuando un canal se desconecta o
  reconecta.

::: info La cola de notificaciones se persiste via `StorageProvider` (namespace:
`notifications:`) con una retencion predeterminada de 7 dias despues de la
entrega. Las notificaciones no entregadas se retienen hasta que se confirmen.
:::
