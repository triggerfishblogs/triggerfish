# Discord

Conecte su agente Triggerfish a Discord para que pueda responder en los canales
del servidor y en mensajes directos. El adaptador utiliza
[discord.js](https://discord.js.org/) para conectarse al Gateway de Discord.

## Clasificación por defecto

Discord tiene por defecto la clasificación `PUBLIC`. Los servidores de Discord a
menudo incluyen una mezcla de miembros de confianza y visitantes públicos, por
lo que `PUBLIC` es el valor seguro por defecto. Puede elevarlo si su servidor
es privado y de confianza.

## Configuración

### Paso 1: Crear una aplicación de Discord

1. Vaya al
   [Portal de desarrolladores de Discord](https://discord.com/developers/applications)
2. Haga clic en **New Application**
3. Nombre su aplicación (p. ej., "Triggerfish")
4. Haga clic en **Create**

### Paso 2: Crear un usuario bot

1. En su aplicación, navegue a **Bot** en la barra lateral
2. Haga clic en **Add Bot** (si no se ha creado ya)
3. Bajo el nombre de usuario del bot, haga clic en **Reset Token** para generar
   un nuevo token
4. Copie el **token del bot**

::: warning Mantenga su token en secreto Su token de bot otorga control total
sobre su bot. Nunca lo incluya en el control de versiones ni lo comparta
públicamente. :::

### Paso 3: Configurar intenciones privilegiadas

Todavía en la página **Bot**, active estas intenciones privilegiadas del
gateway:

- **Message Content Intent** -- Necesaria para leer el contenido de los mensajes
- **Server Members Intent** -- Opcional, para búsqueda de miembros

### Paso 4: Obtener su ID de usuario de Discord

1. Abra Discord
2. Vaya a **Settings** > **Advanced** y active **Developer Mode**
3. Haga clic en su nombre de usuario en cualquier parte de Discord
4. Haga clic en **Copy User ID**

Este es el ID snowflake que Triggerfish utiliza para verificar la identidad del
propietario.

### Paso 5: Generar un enlace de invitación

1. En el Portal de desarrolladores, navegue a **OAuth2** > **URL Generator**
2. En **Scopes**, seleccione `bot`
3. En **Bot Permissions**, seleccione:
   - Send Messages
   - Read Message History
   - View Channels
4. Copie la URL generada y ábrala en su navegador
5. Seleccione el servidor al que desea añadir el bot y haga clic en
   **Authorize**

### Paso 6: Configurar Triggerfish

Añada el canal de Discord a su `triggerfish.yaml`:

```yaml
channels:
  discord:
    # botToken almacenado en el llavero del SO
    ownerId: "123456789012345678"
```

| Opción           | Tipo   | Obligatorio | Descripción                                                                     |
| ---------------- | ------ | ----------- | ------------------------------------------------------------------------------- |
| `botToken`       | string | Sí          | Token del bot de Discord                                                        |
| `ownerId`        | string | Recomendado | Su ID de usuario de Discord (snowflake) para verificación de propietario        |
| `classification` | string | No          | Nivel de clasificación (por defecto: `PUBLIC`)                                  |

### Paso 7: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envíe un mensaje en un canal donde el bot esté presente, o envíele un DM
directamente, para confirmar la conexión.

## Identidad del propietario

Triggerfish determina el estado de propietario comparando el ID de usuario de
Discord del remitente con el `ownerId` configurado. Esta comprobación ocurre en
código antes de que el LLM vea el mensaje:

- **Coincidencia** -- El mensaje es un comando del propietario
- **Sin coincidencia** -- El mensaje es entrada externa con contaminación
  `PUBLIC`

Si no se configura `ownerId`, todos los mensajes se tratan como del
propietario.

::: danger Establezca siempre el ID del propietario Si su bot está en un
servidor con otros miembros, configure siempre `ownerId`. Sin él, cualquier
miembro del servidor puede enviar comandos a su agente. :::

## Fragmentación de mensajes

Discord tiene un límite de 2.000 caracteres por mensaje. Cuando el agente
genera una respuesta más larga, Triggerfish la divide automáticamente en varios
mensajes. El fragmentador divide por saltos de línea o espacios para preservar
la legibilidad.

## Comportamiento del bot

El adaptador de Discord:

- **Ignora sus propios mensajes** -- El bot no responderá a los mensajes que
  envía
- **Escucha en todos los canales accesibles** -- Canales del servidor, DMs
  grupales y mensajes directos
- **Requiere Message Content Intent** -- Sin esto, el bot recibe eventos de
  mensajes vacíos

## Indicadores de escritura

Triggerfish envía indicadores de escritura a Discord cuando el agente está
procesando una solicitud. Discord no expone los eventos de escritura de los
usuarios a los bots de forma fiable, por lo que esto es solo de envío.

## Chat grupal

El bot puede participar en canales del servidor. Configure el comportamiento de
grupo:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Comportamiento   | Descripción                                              |
| ---------------- | -------------------------------------------------------- |
| `mentioned-only` | Solo responder cuando se menciona al bot con @            |
| `always`         | Responder a todos los mensajes del canal                 |

## Cambiar la clasificación

```yaml
channels:
  discord:
    # botToken almacenado en el llavero del SO
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
