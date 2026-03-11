# Visión general multicanal

Triggerfish se conecta a sus plataformas de mensajería existentes. Puede
comunicarse con su agente desde donde ya se comunica: terminal, Telegram, Slack,
Discord, WhatsApp, un widget web o correo electrónico. Cada canal tiene su
propio nivel de clasificación, verificación de identidad del propietario y
aplicación de políticas.

## Cómo funcionan los canales

Cada adaptador de canal implementa la misma interfaz: `connect`, `disconnect`,
`send`, `onMessage` y `status`. El **enrutador de canales** se sitúa por encima
de todos los adaptadores y gestiona el envío de mensajes, las comprobaciones de
clasificación y la lógica de reintentos.

<img src="/diagrams/channel-router.svg" alt="Enrutador de canales: todos los adaptadores de canal pasan por una puerta de clasificación central hacia el Gateway Server" style="max-width: 100%;" />

Cuando un mensaje llega por cualquier canal, el enrutador:

1. Identifica al remitente (propietario o externo) mediante **comprobaciones de
   identidad a nivel de código**, no mediante interpretación del LLM
2. Etiqueta el mensaje con el nivel de clasificación del canal
3. Lo reenvía al motor de políticas para su aplicación
4. Dirige la respuesta del agente de vuelta por el mismo canal

## Clasificación de canales

Cada canal tiene un nivel de clasificación por defecto que determina qué datos
pueden fluir a través de él. El motor de políticas aplica la **regla de no
escritura descendente**: los datos con un nivel de clasificación determinado
nunca pueden fluir a un canal con una clasificación inferior.

| Canal                                      | Clasificación por defecto | Detección de propietario                            |
| ------------------------------------------ | :-----------------------: | --------------------------------------------------- |
| [CLI](/es-ES/channels/cli)                 |        `INTERNAL`         | Siempre propietario (usuario del terminal)          |
| [Telegram](/es-ES/channels/telegram)       |        `INTERNAL`         | Coincidencia de ID de usuario de Telegram           |
| [Signal](/es-ES/channels/signal)           |         `PUBLIC`          | Nunca propietario (el adaptador ES su teléfono)     |
| [Slack](/es-ES/channels/slack)             |         `PUBLIC`          | ID de usuario de Slack vía OAuth                    |
| [Discord](/es-ES/channels/discord)         |         `PUBLIC`          | Coincidencia de ID de usuario de Discord            |
| [WhatsApp](/es-ES/channels/whatsapp)       |         `PUBLIC`          | Coincidencia de número de teléfono                  |
| [WebChat](/es-ES/channels/webchat)         |         `PUBLIC`          | Nunca propietario (visitantes)                      |
| [Email](/es-ES/channels/email)             |      `CONFIDENTIAL`       | Coincidencia de dirección de correo electrónico     |

::: tip Totalmente configurable Todas las clasificaciones son configurables en
su `triggerfish.yaml`. Puede establecer cualquier canal a cualquier nivel de
clasificación según sus requisitos de seguridad.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Clasificación efectiva

La clasificación efectiva para cualquier mensaje es el **mínimo** entre la
clasificación del canal y la clasificación del destinatario:

| Nivel del canal | Nivel del destinatario | Nivel efectivo |
| --------------- | ---------------------- | -------------- |
| INTERNAL        | INTERNAL               | INTERNAL       |
| INTERNAL        | EXTERNAL               | PUBLIC         |
| CONFIDENTIAL    | INTERNAL               | INTERNAL       |
| CONFIDENTIAL    | EXTERNAL               | PUBLIC         |

Esto significa que aunque un canal esté clasificado como `CONFIDENTIAL`, los
mensajes a destinatarios externos en ese canal se tratan como `PUBLIC`.

## Estados de los canales

Los canales pasan por estados definidos:

- **UNTRUSTED** -- Los canales nuevos o desconocidos comienzan aquí. No fluyen
  datos de entrada ni de salida. El canal está completamente aislado hasta que
  usted lo clasifique.
- **CLASSIFIED** -- El canal tiene un nivel de clasificación asignado y está
  activo. Los mensajes fluyen según las reglas de política.
- **BLOCKED** -- El canal ha sido desactivado explícitamente. No se procesan
  mensajes.

::: warning Canales UNTRUSTED Un canal `UNTRUSTED` no puede recibir ningún dato
del agente ni enviar datos al contexto del agente. Esta es una frontera de
seguridad estricta, no una sugerencia. :::

## Enrutador de canales

El enrutador de canales gestiona todos los adaptadores registrados y
proporciona:

- **Registro de adaptadores** -- Registrar y desregistrar adaptadores de canal
  por ID de canal
- **Envío de mensajes** -- Dirigir mensajes salientes al adaptador correcto
- **Reintento con retroceso exponencial** -- Los envíos fallidos se reintentan
  hasta 3 veces con intervalos crecientes (1s, 2s, 4s)
- **Operaciones masivas** -- `connectAll()` y `disconnectAll()` para la gestión
  del ciclo de vida

```yaml
# El comportamiento de reintento del enrutador es configurable
router:
  maxRetries: 3
  baseDelay: 1000 # milisegundos
```

## Ripple: indicadores de escritura y presencia

Triggerfish retransmite indicadores de escritura y estado de presencia entre los
canales que los soportan. Esto se llama **Ripple**.

| Canal    | Indicadores de escritura | Confirmaciones de lectura |
| -------- | :----------------------: | :-----------------------: |
| Telegram |    Envío y recepción     |            Sí             |
| Signal   |    Envío y recepción     |            --             |
| Slack    |       Solo envío         |            --             |
| Discord  |       Solo envío         |            --             |
| WhatsApp |    Envío y recepción     |            Sí             |
| WebChat  |    Envío y recepción     |            Sí             |

Estados de presencia del agente: `idle`, `online`, `away`, `busy`, `processing`,
`speaking`, `error`.

## Fragmentación de mensajes

Las plataformas tienen límites de longitud de mensaje. Triggerfish fragmenta
automáticamente las respuestas largas para ajustarse a las restricciones de cada
plataforma, dividiendo por saltos de línea o espacios para legibilidad:

| Canal    | Longitud máxima del mensaje |
| -------- | :-------------------------: |
| Telegram |     4.096 caracteres        |
| Signal   |     4.000 caracteres        |
| Discord  |     2.000 caracteres        |
| Slack    |    40.000 caracteres        |
| WhatsApp |     4.096 caracteres        |
| WebChat  |         Ilimitado           |

## Próximos pasos

Configure los canales que utiliza:

- [CLI](/es-ES/channels/cli) -- Siempre disponible, sin configuración necesaria
- [Telegram](/es-ES/channels/telegram) -- Cree un bot a través de @BotFather
- [Signal](/es-ES/channels/signal) -- Vincule mediante el daemon signal-cli
- [Slack](/es-ES/channels/slack) -- Cree una aplicación de Slack con Socket Mode
- [Discord](/es-ES/channels/discord) -- Cree una aplicación de bot de Discord
- [WhatsApp](/es-ES/channels/whatsapp) -- Conéctese a través de WhatsApp Business Cloud API
- [WebChat](/es-ES/channels/webchat) -- Inserte un widget de chat en su sitio web
- [Email](/es-ES/channels/email) -- Conéctese mediante IMAP y relé SMTP
