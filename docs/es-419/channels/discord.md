# Discord

Conecten su agente de Triggerfish a Discord para que pueda responder en canales
del servidor y mensajes directos. El adaptador utiliza
[discord.js](https://discord.js.org/) para conectarse al Gateway de Discord.

## Clasificación Predeterminada

Discord tiene clasificación `PUBLIC` por defecto. Los servidores de Discord
frecuentemente incluyen una mezcla de miembros de confianza y visitantes
públicos, por lo que `PUBLIC` es el valor predeterminado seguro. Pueden elevar
esto si su servidor es privado y de confianza.

## Configuración

### Paso 1: Crear una Aplicación de Discord

1. Vayan al
   [Portal de Desarrolladores de Discord](https://discord.com/developers/applications)
2. Hagan clic en **New Application**
3. Nombren su aplicación (ej., "Triggerfish")
4. Hagan clic en **Create**

### Paso 2: Crear un Usuario Bot

1. En su aplicación, naveguen a **Bot** en la barra lateral
2. Hagan clic en **Add Bot** (si no se creó ya)
3. Debajo del nombre de usuario del bot, hagan clic en **Reset Token** para
   generar un nuevo token
4. Copien el **token del bot**

::: warning Mantengan su Token en Secreto Su token de bot otorga control total
de su bot. Nunca lo incluyan en el control de versiones ni lo compartan
públicamente. :::

### Paso 3: Configurar Intents Privilegiados

Aún en la página de **Bot**, habiliten estos intents privilegiados del gateway:

- **Message Content Intent** -- Requerido para leer el contenido de los mensajes
- **Server Members Intent** -- Opcional, para búsqueda de miembros

### Paso 4: Obtener su ID de Usuario de Discord

1. Abran Discord
2. Vayan a **Settings** > **Advanced** y habiliten **Developer Mode**
3. Hagan clic en su nombre de usuario en cualquier parte de Discord
4. Hagan clic en **Copy User ID**

Este es el ID snowflake que Triggerfish usa para verificar la identidad del
propietario.

### Paso 5: Generar un Enlace de Invitación

1. En el Portal de Desarrolladores, naveguen a **OAuth2** > **URL Generator**
2. En **Scopes**, seleccionen `bot`
3. En **Bot Permissions**, seleccionen:
   - Send Messages
   - Read Message History
   - View Channels
4. Copien la URL generada y ábranla en su navegador
5. Seleccionen el servidor al que quieren agregar el bot y hagan clic en
   **Authorize**

### Paso 6: Configurar Triggerfish

Agreguen el canal de Discord a su `triggerfish.yaml`:

```yaml
channels:
  discord:
    # botToken almacenado en el llavero del SO
    ownerId: "123456789012345678"
```

| Opción           | Tipo   | Requerido   | Descripción                                                             |
| ---------------- | ------ | ----------- | ----------------------------------------------------------------------- |
| `botToken`       | string | Sí          | Token del bot de Discord                                                |
| `ownerId`        | string | Recomendado | Su ID de usuario de Discord (snowflake) para verificación de propietario |
| `classification` | string | No          | Nivel de clasificación (predeterminado: `PUBLIC`)                       |

### Paso 7: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envíen un mensaje en un canal donde el bot esté presente, o envíenle un DM
directamente, para confirmar la conexión.

## Identidad del Propietario

Triggerfish determina el estado de propietario comparando el ID de usuario de
Discord del remitente con el `ownerId` configurado. Esta verificación ocurre en
código antes de que el LLM vea el mensaje:

- **Coincide** -- El mensaje es un comando del propietario
- **No coincide** -- El mensaje es entrada externa con taint `PUBLIC`

Si no se configura `ownerId`, todos los mensajes se tratan como provenientes del
propietario.

::: danger Siempre Configuren el Owner ID Si su bot está en un servidor con
otros miembros, siempre configuren `ownerId`. Sin él, cualquier miembro del
servidor puede enviar comandos a su agente. :::

## División de Mensajes

Discord tiene un límite de mensaje de 2,000 caracteres. Cuando el agente genera
una respuesta más larga, Triggerfish la divide automáticamente en múltiples
mensajes. El divisor separa por saltos de línea o espacios para preservar la
legibilidad.

## Comportamiento del Bot

El adaptador de Discord:

- **Ignora sus propios mensajes** -- El bot no responderá a los mensajes que
  envía
- **Escucha en todos los canales accesibles** -- Canales del servidor, DMs
  grupales y mensajes directos
- **Requiere Message Content Intent** -- Sin esto, el bot recibe eventos de
  mensaje vacíos

## Indicadores de Escritura

Triggerfish envía indicadores de escritura a Discord cuando el agente está
procesando una solicitud. Discord no expone eventos de escritura de los usuarios
a los bots de forma confiable, por lo que esto es solo de envío.

## Chat Grupal

El bot puede participar en canales del servidor. Configuren el comportamiento
grupal:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Comportamiento   | Descripción                                          |
| ---------------- | ---------------------------------------------------- |
| `mentioned-only` | Solo responder cuando el bot es @mencionado          |
| `always`         | Responder a todos los mensajes en el canal           |

## Cambiar la Clasificación

```yaml
channels:
  discord:
    # botToken almacenado en el llavero del SO
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
