# Slack

Conecte su agente Triggerfish a Slack para que pueda participar en las
conversaciones del espacio de trabajo. El adaptador utiliza el framework
[Bolt](https://slack.dev/bolt-js/) con Socket Mode, lo que significa que no se
requiere una URL pública ni un endpoint de webhook.

## Clasificación por defecto

Slack tiene por defecto la clasificación `PUBLIC`. Esto refleja la realidad de
que los espacios de trabajo de Slack a menudo incluyen invitados externos,
usuarios de Slack Connect y canales compartidos. Puede elevarla a `INTERNAL` o
superior si su espacio de trabajo es estrictamente interno.

## Configuración

### Paso 1: Crear una aplicación de Slack

1. Vaya a [api.slack.com/apps](https://api.slack.com/apps)
2. Haga clic en **Create New App**
3. Elija **From scratch**
4. Nombre su aplicación (p. ej., "Triggerfish") y seleccione su espacio de
   trabajo
5. Haga clic en **Create App**

### Paso 2: Configurar los permisos del token de bot

Navegue a **OAuth & Permissions** en la barra lateral y añada los siguientes
**Bot Token Scopes**:

| Permiso            | Propósito                                      |
| ------------------ | ---------------------------------------------- |
| `chat:write`       | Enviar mensajes                                |
| `channels:history` | Leer mensajes en canales públicos              |
| `groups:history`   | Leer mensajes en canales privados              |
| `im:history`       | Leer mensajes directos                         |
| `mpim:history`     | Leer mensajes directos grupales                |
| `channels:read`    | Listar canales públicos                        |
| `groups:read`      | Listar canales privados                        |
| `im:read`          | Listar conversaciones de mensajes directos     |
| `users:read`       | Consultar información de usuarios              |

### Paso 3: Activar Socket Mode

1. Navegue a **Socket Mode** en la barra lateral
2. Active **Enable Socket Mode**
3. Se le solicitará crear un **App-Level Token** -- nómbrelo (p. ej.,
   "triggerfish-socket") y añada el permiso `connections:write`
4. Copie el **App Token** generado (comienza con `xapp-`)

### Paso 4: Activar eventos

1. Navegue a **Event Subscriptions** en la barra lateral
2. Active **Enable Events**
3. En **Subscribe to bot events**, añada:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Paso 5: Obtener sus credenciales

Necesita tres valores:

- **Bot Token** -- Vaya a **OAuth & Permissions**, haga clic en **Install to
  Workspace**, luego copie el **Bot User OAuth Token** (comienza con `xoxb-`)
- **App Token** -- El token que creó en el Paso 3 (comienza con `xapp-`)
- **Signing Secret** -- Vaya a **Basic Information**, desplácese hasta **App
  Credentials** y copie el **Signing Secret**

### Paso 6: Obtener su ID de usuario de Slack

Para configurar la identidad del propietario:

1. Abra Slack
2. Haga clic en su foto de perfil en la esquina superior derecha
3. Haga clic en **Profile**
4. Haga clic en el menú de tres puntos y seleccione **Copy member ID**

### Paso 7: Configurar Triggerfish

Añada el canal de Slack a su `triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret almacenados en el llavero del SO
    ownerId: "U01234ABC"
```

Los secretos (token de bot, token de aplicación, secreto de firma) se introducen
durante `triggerfish config add-channel slack` y se almacenan en el llavero del
SO.

| Opción           | Tipo   | Obligatorio | Descripción                                                  |
| ---------------- | ------ | ----------- | ------------------------------------------------------------ |
| `ownerId`        | string | Recomendado | Su ID de miembro de Slack para verificación de propietario   |
| `classification` | string | No          | Nivel de clasificación (por defecto: `PUBLIC`)               |

::: warning Almacene los secretos de forma segura Nunca incluya tokens o
secretos en el control de versiones. Utilice variables de entorno o el llavero
de su SO. Consulte
[Gestión de secretos](/es-ES/security/secrets) para más detalles. :::

### Paso 8: Invitar al bot

Antes de que el bot pueda leer o enviar mensajes en un canal, necesita
invitarlo:

1. Abra el canal de Slack donde desea que esté el bot
2. Escriba `/invite @Triggerfish` (o el nombre que haya dado a su aplicación)

El bot también puede recibir mensajes directos sin ser invitado a un canal.

### Paso 9: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envíe un mensaje en un canal donde el bot esté presente, o envíele un DM
directamente, para confirmar la conexión.

## Identidad del propietario

Triggerfish utiliza el flujo OAuth de Slack para la verificación del
propietario. Cuando llega un mensaje, el adaptador compara el ID de usuario de
Slack del remitente con el `ownerId` configurado:

- **Coincidencia** -- Comando del propietario
- **Sin coincidencia** -- Entrada externa con contaminación `PUBLIC`

### Pertenencia al espacio de trabajo

Para la clasificación de destinatarios, la pertenencia al espacio de trabajo de
Slack determina si un usuario es `INTERNAL` o `EXTERNAL`:

- Los miembros regulares del espacio de trabajo son `INTERNAL`
- Los usuarios externos de Slack Connect son `EXTERNAL`
- Los usuarios invitados son `EXTERNAL`

## Límites de mensajes

Slack soporta mensajes de hasta 40.000 caracteres. Los mensajes que excedan
este límite se truncan. Para la mayoría de las respuestas del agente, este
límite no se alcanza nunca.

## Indicadores de escritura

Triggerfish envía indicadores de escritura a Slack cuando el agente está
procesando una solicitud. Slack no expone los eventos de escritura entrantes a
los bots, por lo que esto es solo de envío.

## Chat grupal

El bot puede participar en canales de grupo. Configure el comportamiento de
grupo en su `triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Comportamiento   | Descripción                                              |
| ---------------- | -------------------------------------------------------- |
| `mentioned-only` | Solo responder cuando se menciona al bot con @            |
| `always`         | Responder a todos los mensajes del canal                 |

## Cambiar la clasificación

```yaml
channels:
  slack:
    classification: INTERNAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
