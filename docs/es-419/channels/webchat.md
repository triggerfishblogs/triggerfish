# WebChat

El canal WebChat proporciona un widget de chat integrado e incrustable que se
conecta a su agente de Triggerfish mediante WebSocket. Está diseñado para
interacciones orientadas al cliente, widgets de soporte o cualquier escenario
donde quieran ofrecer una experiencia de chat basada en la web.

## Clasificación Predeterminada

WebChat tiene clasificación `PUBLIC` por defecto. Este es un valor predeterminado
estricto por una razón: **los visitantes web nunca son tratados como
propietario**. Cada mensaje de una sesión de WebChat lleva taint `PUBLIC` sin
importar la configuración.

::: warning Los Visitantes Nunca Son Propietario A diferencia de otros canales
donde la identidad del propietario se verifica por ID de usuario o número de
teléfono, WebChat establece `isOwner: false` para todas las conexiones. Esto
significa que el agente nunca ejecutará comandos de nivel propietario desde una
sesión de WebChat. Esta es una decisión de seguridad deliberada -- no pueden
verificar la identidad de un visitante web anónimo. :::

## Configuración

### Paso 1: Configurar Triggerfish

Agreguen el canal WebChat a su `triggerfish.yaml`:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://su-sitio.com"
```

| Opción           | Tipo     | Requerido | Descripción                                        |
| ---------------- | -------- | --------- | -------------------------------------------------- |
| `port`           | number   | No        | Puerto del servidor WebSocket (predeterminado: `8765`) |
| `classification` | string   | No        | Nivel de clasificación (predeterminado: `PUBLIC`)  |
| `allowedOrigins` | string[] | No        | Orígenes CORS permitidos (predeterminado: `["*"]`) |

### Paso 2: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

El servidor WebSocket comienza a escuchar en el puerto configurado.

### Paso 3: Conectar un Widget de Chat

Conéctense al endpoint WebSocket desde su aplicación web:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // El servidor asignó un ID de sesión
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Respuesta del agente
    console.log("Agent:", frame.content);
  }
};

// Enviar un mensaje
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## Cómo Funciona

### Flujo de Conexión

1. Un cliente de navegador abre una conexión WebSocket al puerto configurado
2. Triggerfish actualiza la solicitud HTTP a WebSocket
3. Se genera un ID de sesión único (`webchat-<uuid>`)
4. El servidor envía el ID de sesión al cliente en un frame `session`
5. El cliente envía y recibe frames `message` como JSON

### Formato de Frame de Mensaje

Todos los mensajes son objetos JSON con esta estructura:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Tipos de frame:

| Tipo      | Dirección            | Descripción                                             |
| --------- | -------------------- | ------------------------------------------------------- |
| `session` | Servidor a cliente   | Enviado al conectar con el ID de sesión asignado        |
| `message` | Ambas                | Mensaje de chat con contenido de texto                  |
| `ping`    | Ambas                | Ping de keep-alive                                      |
| `pong`    | Ambas                | Respuesta de keep-alive                                 |

### Gestión de Sesiones

Cada conexión WebSocket obtiene su propia sesión. Cuando la conexión se cierra,
la sesión se elimina del mapa de conexiones activas. No hay reanudación de
sesión -- si la conexión se cae, se asigna un nuevo ID de sesión al
reconectarse.

## Verificación de Salud

El servidor WebSocket también responde a solicitudes HTTP regulares con una
verificación de salud:

```bash
curl http://localhost:8765
# Respuesta: "WebChat OK"
```

Esto es útil para verificaciones de salud de balanceadores de carga y monitoreo.

## Indicadores de Escritura

Triggerfish envía y recibe indicadores de escritura a través de WebChat. Cuando
el agente está procesando, se envía un frame de indicador de escritura al
cliente. El widget puede mostrarlo para indicar que el agente está pensando.

## Consideraciones de Seguridad

- **Todos los visitantes son externos** -- `isOwner` siempre es `false`. El
  agente no ejecutará comandos de propietario desde WebChat.
- **Taint PUBLIC** -- Cada mensaje tiene taint `PUBLIC` a nivel de sesión. El
  agente no puede acceder ni devolver datos por encima de la clasificación
  `PUBLIC` en una sesión de WebChat.
- **CORS** -- Configuren `allowedOrigins` para restringir qué dominios pueden
  conectarse. El predeterminado `["*"]` permite cualquier origen, lo cual es
  apropiado para desarrollo pero debe restringirse en producción.

::: tip Restrinjan los Orígenes en Producción Para despliegues en producción,
siempre especifiquen sus orígenes permitidos explícitamente:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://su-dominio.com"
      - "https://app.su-dominio.com"
```

:::

## Cambiar la Clasificación

Aunque WebChat tiene `PUBLIC` por defecto, técnicamente pueden establecerlo en
un nivel diferente. Sin embargo, como `isOwner` siempre es `false`, la
clasificación efectiva para todos los mensajes sigue siendo `PUBLIC` debido a la
regla de clasificación efectiva (`min(canal, destinatario)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Permitido, pero isOwner sigue siendo false
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
