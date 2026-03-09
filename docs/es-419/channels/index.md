# Descripción General Multicanal

Triggerfish se conecta a sus plataformas de mensajería existentes. Pueden hablar
con su agente donde ya se comunican -- terminal, Telegram, Slack, Discord,
WhatsApp, un widget web o correo electrónico. Cada canal tiene su propio nivel de
clasificación, verificaciones de identidad del propietario y aplicación de
políticas.

## Cómo Funcionan los Canales

Cada adaptador de canal implementa la misma interfaz: `connect`, `disconnect`,
`send`, `onMessage` y `status`. El **enrutador de canales** se ubica por encima
de todos los adaptadores y gestiona el despacho de mensajes, las verificaciones
de clasificación y la lógica de reintentos.

<img src="/diagrams/channel-router.svg" alt="Enrutador de canales: todos los adaptadores de canal fluyen a través de una puerta de clasificación central hacia el Gateway Server" style="max-width: 100%;" />

Cuando un mensaje llega por cualquier canal, el enrutador:

1. Identifica al remitente (propietario o externo) usando **verificaciones de
   identidad a nivel de código** -- no interpretación del LLM
2. Etiqueta el mensaje con el nivel de clasificación del canal
3. Lo reenvía al motor de políticas para su aplicación
4. Enruta la respuesta del agente de vuelta por el mismo canal

## Clasificación de Canales

Cada canal tiene un nivel de clasificación predeterminado que determina qué datos
pueden fluir a través de él. El motor de políticas aplica la **regla de no
escritura descendente**: los datos en un nivel de clasificación determinado nunca
pueden fluir a un canal con una clasificación inferior.

| Canal                                          | Clasificación Predeterminada | Detección de Propietario                     |
| ---------------------------------------------- | :--------------------------: | -------------------------------------------- |
| [CLI](/es-419/channels/cli)                    |          `INTERNAL`          | Siempre propietario (usuario de terminal)    |
| [Telegram](/es-419/channels/telegram)          |          `INTERNAL`          | Coincidencia de ID de usuario de Telegram    |
| [Signal](/es-419/channels/signal)              |           `PUBLIC`           | Nunca propietario (el adaptador ES su teléfono) |
| [Slack](/es-419/channels/slack)                |           `PUBLIC`           | ID de usuario de Slack vía OAuth             |
| [Discord](/es-419/channels/discord)            |           `PUBLIC`           | Coincidencia de ID de usuario de Discord     |
| [WhatsApp](/es-419/channels/whatsapp)          |           `PUBLIC`           | Coincidencia de número telefónico            |
| [WebChat](/es-419/channels/webchat)            |           `PUBLIC`           | Nunca propietario (visitantes)               |
| [Email](/es-419/channels/email)                |       `CONFIDENTIAL`         | Coincidencia de dirección de correo          |

::: tip Totalmente Configurable Todas las clasificaciones son configurables en su
`triggerfish.yaml`. Pueden establecer cualquier canal en cualquier nivel de
clasificación según sus requisitos de seguridad.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Clasificación Efectiva

La clasificación efectiva de cualquier mensaje es el **mínimo** entre la
clasificación del canal y la clasificación del destinatario:

| Nivel del Canal | Nivel del Destinatario | Nivel Efectivo |
| --------------- | ---------------------- | -------------- |
| INTERNAL        | INTERNAL               | INTERNAL       |
| INTERNAL        | EXTERNAL               | PUBLIC         |
| CONFIDENTIAL    | INTERNAL               | INTERNAL       |
| CONFIDENTIAL    | EXTERNAL               | PUBLIC         |

Esto significa que incluso si un canal está clasificado como `CONFIDENTIAL`, los
mensajes a destinatarios externos en ese canal se tratan como `PUBLIC`.

## Estados del Canal

Los canales pasan por estados definidos:

- **UNTRUSTED** -- Los canales nuevos o desconocidos comienzan aquí. No fluyen
  datos de entrada ni de salida. El canal está completamente aislado hasta que
  lo clasifiquen.
- **CLASSIFIED** -- El canal tiene un nivel de clasificación asignado y está
  activo. Los mensajes fluyen según las reglas de política.
- **BLOCKED** -- El canal ha sido deshabilitado explícitamente. No se procesan
  mensajes.

::: warning Canales UNTRUSTED Un canal `UNTRUSTED` no puede recibir ningún dato
del agente ni enviar datos al contexto del agente. Este es un límite de
seguridad estricto, no una sugerencia. :::

## Enrutador de Canales

El enrutador de canales administra todos los adaptadores registrados y
proporciona:

- **Registro de adaptadores** -- Registrar y desregistrar adaptadores de canal
  por ID de canal
- **Despacho de mensajes** -- Enrutar mensajes salientes al adaptador correcto
- **Reintento con retroceso exponencial** -- Los envíos fallidos se reintentan
  hasta 3 veces con demoras crecientes (1s, 2s, 4s)
- **Operaciones masivas** -- `connectAll()` y `disconnectAll()` para gestión
  del ciclo de vida

```yaml
# El comportamiento de reintento del enrutador es configurable
router:
  maxRetries: 3
  baseDelay: 1000 # milisegundos
```

## Ripple: Indicadores de Escritura y Presencia

Triggerfish retransmite indicadores de escritura y estado de presencia entre
canales que los soportan. Esto se llama **Ripple**.

| Canal    | Indicadores de Escritura | Confirmaciones de Lectura |
| -------- | :----------------------: | :-----------------------: |
| Telegram |    Envío y recepción     |            Sí             |
| Signal   |    Envío y recepción     |            --             |
| Slack    |       Solo envío         |            --             |
| Discord  |       Solo envío         |            --             |
| WhatsApp |    Envío y recepción     |            Sí             |
| WebChat  |    Envío y recepción     |            Sí             |

Estados de presencia del agente: `idle`, `online`, `away`, `busy`, `processing`,
`speaking`, `error`.

## División de Mensajes

Las plataformas tienen límites de longitud de mensaje. Triggerfish divide
automáticamente las respuestas largas para ajustarse a las restricciones de cada
plataforma, separando por saltos de línea o espacios para facilitar la lectura:

| Canal    | Longitud Máxima de Mensaje |
| -------- | :------------------------: |
| Telegram |     4,096 caracteres       |
| Signal   |     4,000 caracteres       |
| Discord  |     2,000 caracteres       |
| Slack    |    40,000 caracteres       |
| WhatsApp |     4,096 caracteres       |
| WebChat  |        Ilimitado           |

## Próximos Pasos

Configuren los canales que utilizan:

- [CLI](/es-419/channels/cli) -- Siempre disponible, no requiere configuración
- [Telegram](/es-419/channels/telegram) -- Creen un bot con @BotFather
- [Signal](/es-419/channels/signal) -- Vinculen mediante el daemon signal-cli
- [Slack](/es-419/channels/slack) -- Creen una app de Slack con Socket Mode
- [Discord](/es-419/channels/discord) -- Creen una aplicación de bot en Discord
- [WhatsApp](/es-419/channels/whatsapp) -- Conéctense vía WhatsApp Business Cloud API
- [WebChat](/es-419/channels/webchat) -- Incrusten un widget de chat en su sitio
- [Email](/es-419/channels/email) -- Conéctense vía IMAP y relay SMTP
