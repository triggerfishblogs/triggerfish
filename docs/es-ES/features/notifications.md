# Notificaciones

El NotificationService es la abstracción de primera clase de Triggerfish para entregar notificaciones al propietario del agente a través de todos los canales conectados.

## ¿Por qué un servicio de notificaciones?

Sin un servicio dedicado, la lógica de notificación tiende a dispersarse por el código -- cada funcionalidad implementando su propio patrón de "notificar al propietario". Esto genera un comportamiento inconsistente, notificaciones perdidas y duplicados.

Triggerfish centraliza toda la entrega de notificaciones a través de un único servicio que gestiona prioridad, cola y deduplicación.

## Cómo funciona

<img src="/diagrams/notification-routing.svg" alt="Enrutamiento de notificaciones: las fuentes fluyen a través del NotificationService con enrutamiento por prioridad, cola y deduplicación a los canales" style="max-width: 100%;" />

Cuando cualquier componente necesita notificar al propietario -- un trabajo cron completado, un trigger detectando algo importante, un webhook activándose -- llama al NotificationService. El servicio determina cómo y dónde entregar la notificación.

## Interfaz

```typescript
interface NotificationService {
  /** Entregar o encolar una notificación para un usuario. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Obtener notificaciones pendientes (no entregadas) para un usuario. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Confirmar la entrega de una notificación. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Niveles de prioridad

Cada notificación lleva una prioridad que afecta al comportamiento de entrega:

| Prioridad  | Comportamiento                                                                  |
| ---------- | ------------------------------------------------------------------------------- |
| `critical` | Se entrega inmediatamente a todos los canales conectados. Elude horas de silencio. |
| `normal`   | Se entrega al canal preferido. Se encola si el usuario está desconectado.       |
| `low`      | Se encola y se entrega en lotes. Puede resumirse.                               |

## Opciones de entrega

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Cola y entrega offline

Cuando el usuario destino está desconectado o no hay canales conectados, las notificaciones se encolan. Se entregan cuando:

- El usuario inicia una nueva sesión.
- Un canal se reconecta.
- El usuario solicita explícitamente las notificaciones pendientes.

Las notificaciones pendientes se pueden recuperar con `getPending()` y confirmar con `acknowledge()`.

## Deduplicación

El NotificationService previene que notificaciones duplicadas lleguen al usuario. Si el mismo contenido de notificación se entrega múltiples veces dentro de una ventana, solo la primera entrega se realiza.

## Configuración

Configure el comportamiento de notificaciones en `triggerfish.yaml`:

```yaml
notifications:
  preferred_channel: telegram # Canal de entrega predeterminado
  quiet_hours: "22:00-07:00" # Suprimir normal/low durante estas horas
  batch_interval: 15m # Agrupar notificaciones de baja prioridad
```

## Ejemplos de uso

Las notificaciones se utilizan en todo el sistema:

- **Trabajos cron** notifican al propietario cuando una tarea programada se completa o falla.
- **Triggers** notifican al propietario cuando la monitorización detecta algo que necesita atención.
- **Webhooks** notifican al propietario cuando se activa un evento externo (PR de GitHub, alerta de Sentry).
- **Violaciones de política** notifican al propietario cuando se intenta una acción bloqueada.
- **Estado de canal** notifica al propietario cuando un canal se desconecta o reconecta.

::: info La cola de notificaciones se persiste vía `StorageProvider` (espacio de nombres: `notifications:`) con una retención predeterminada de 7 días después de la entrega. Las notificaciones no entregadas se retienen hasta ser confirmadas. :::
