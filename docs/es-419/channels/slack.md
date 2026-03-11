# Slack

Conecten su agente de Triggerfish a Slack para que su agente pueda participar en
conversaciones del espacio de trabajo. El adaptador utiliza el framework
[Bolt](https://slack.dev/bolt-js/) con Socket Mode, lo que significa que no se
requiere una URL pública ni un endpoint de webhook.

## Clasificación Predeterminada

Slack tiene clasificación `PUBLIC` por defecto. Esto refleja la realidad de que
los espacios de trabajo de Slack frecuentemente incluyen invitados externos,
usuarios de Slack Connect y canales compartidos. Pueden elevar esto a `INTERNAL`
o superior si su espacio de trabajo es estrictamente interno.

## Configuración

### Paso 1: Crear una App de Slack

1. Vayan a [api.slack.com/apps](https://api.slack.com/apps)
2. Hagan clic en **Create New App**
3. Elijan **From scratch**
4. Nombren su app (ej., "Triggerfish") y seleccionen su espacio de trabajo
5. Hagan clic en **Create App**

### Paso 2: Configurar los Permisos del Bot Token

Naveguen a **OAuth & Permissions** en la barra lateral y agreguen los siguientes
**Bot Token Scopes**:

| Permiso            | Propósito                                 |
| ------------------ | ----------------------------------------- |
| `chat:write`       | Enviar mensajes                           |
| `channels:history` | Leer mensajes en canales públicos         |
| `groups:history`   | Leer mensajes en canales privados         |
| `im:history`       | Leer mensajes directos                    |
| `mpim:history`     | Leer mensajes directos grupales           |
| `channels:read`    | Listar canales públicos                   |
| `groups:read`      | Listar canales privados                   |
| `im:read`          | Listar conversaciones de mensaje directo  |
| `users:read`       | Buscar información de usuarios            |

### Paso 3: Habilitar Socket Mode

1. Naveguen a **Socket Mode** en la barra lateral
2. Activen **Enable Socket Mode**
3. Se les pedirá crear un **App-Level Token** -- nómbrenlo (ej.,
   "triggerfish-socket") y agreguen el permiso `connections:write`
4. Copien el **App Token** generado (comienza con `xapp-`)

### Paso 4: Habilitar Eventos

1. Naveguen a **Event Subscriptions** en la barra lateral
2. Activen **Enable Events**
3. En **Subscribe to bot events**, agreguen:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Paso 5: Obtener sus Credenciales

Necesitan tres valores:

- **Bot Token** -- Vayan a **OAuth & Permissions**, hagan clic en **Install to
  Workspace**, luego copien el **Bot User OAuth Token** (comienza con `xoxb-`)
- **App Token** -- El token que crearon en el Paso 3 (comienza con `xapp-`)
- **Signing Secret** -- Vayan a **Basic Information**, desplácense hasta **App
  Credentials** y copien el **Signing Secret**

### Paso 6: Obtener su ID de Usuario de Slack

Para configurar la identidad del propietario:

1. Abran Slack
2. Hagan clic en su foto de perfil en la esquina superior derecha
3. Hagan clic en **Profile**
4. Hagan clic en el menú de tres puntos y seleccionen **Copy member ID**

### Paso 7: Configurar Triggerfish

Agreguen el canal de Slack a su `triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret almacenados en el llavero del SO
    ownerId: "U01234ABC"
```

Los secretos (bot token, app token, signing secret) se ingresan durante
`triggerfish config add-channel slack` y se almacenan en el llavero del SO.

| Opción           | Tipo   | Requerido   | Descripción                                           |
| ---------------- | ------ | ----------- | ----------------------------------------------------- |
| `ownerId`        | string | Recomendado | Su ID de miembro de Slack para verificación de propietario |
| `classification` | string | No          | Nivel de clasificación (predeterminado: `PUBLIC`)     |

::: warning Almacenen los Secretos de Forma Segura Nunca incluyan tokens ni
secretos en el control de versiones. Usen variables de entorno o el llavero de
su SO. Consulten [Gestión de Secretos](/es-419/security/secrets) para más
detalles. :::

### Paso 8: Invitar al Bot

Antes de que el bot pueda leer o enviar mensajes en un canal, necesitan
invitarlo:

1. Abran el canal de Slack donde quieren al bot
2. Escriban `/invite @Triggerfish` (o como hayan nombrado su app)

El bot también puede recibir mensajes directos sin ser invitado a un canal.

### Paso 9: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envíen un mensaje en un canal donde el bot esté presente, o envíenle un DM
directamente, para confirmar la conexión.

## Identidad del Propietario

Triggerfish utiliza el flujo OAuth de Slack para la verificación del propietario.
Cuando llega un mensaje, el adaptador compara el ID de usuario de Slack del
remitente con el `ownerId` configurado:

- **Coincide** -- Comando del propietario
- **No coincide** -- Entrada externa con taint `PUBLIC`

### Membresía del Espacio de Trabajo

Para la clasificación de destinatarios, la membresía del espacio de trabajo de
Slack determina si un usuario es `INTERNAL` o `EXTERNAL`:

- Los miembros regulares del espacio de trabajo son `INTERNAL`
- Los usuarios externos de Slack Connect son `EXTERNAL`
- Los usuarios invitados son `EXTERNAL`

## Límites de Mensaje

Slack soporta mensajes de hasta 40,000 caracteres. Los mensajes que excedan este
límite se truncan. Para la mayoría de las respuestas del agente, este límite
nunca se alcanza.

## Indicadores de Escritura

Triggerfish envía indicadores de escritura a Slack cuando el agente está
procesando una solicitud. Slack no expone eventos de escritura entrantes a los
bots, por lo que esto es solo de envío.

## Chat Grupal

El bot puede participar en canales grupales. Configuren el comportamiento
grupal en su `triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Comportamiento   | Descripción                                          |
| ---------------- | ---------------------------------------------------- |
| `mentioned-only` | Solo responder cuando el bot es @mencionado          |
| `always`         | Responder a todos los mensajes en el canal           |

## Cambiar la Clasificación

```yaml
channels:
  slack:
    classification: INTERNAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
