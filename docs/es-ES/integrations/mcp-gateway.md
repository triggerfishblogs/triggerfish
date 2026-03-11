# MCP Gateway

> Use cualquier servidor MCP. Nosotros aseguramos la frontera.

El Model Context Protocol (MCP) es el estándar emergente para la comunicación
agente-herramienta. Triggerfish proporciona un MCP Gateway seguro que le permite
conectarse a cualquier servidor compatible con MCP mientras aplica controles de
clasificación, permisos a nivel de herramienta, seguimiento de contaminación y
registro de auditoría completo.

Usted aporta los servidores MCP. Triggerfish asegura cada solicitud y respuesta
que cruza la frontera.

## Cómo funciona

El MCP Gateway se sitúa entre su agente y cualquier servidor MCP. Cada llamada
a herramienta pasa por la capa de aplicación de políticas antes de llegar al
servidor externo, y cada respuesta se clasifica antes de entrar en el contexto
del agente.

<img src="/diagrams/mcp-gateway-flow.svg" alt="Flujo del MCP Gateway: Agente -> MCP Gateway -> Capa de políticas -> Servidor MCP, con ruta de denegación a BLOCKED" style="max-width: 100%;" />

El gateway proporciona cinco funciones principales:

1. **Autenticación y clasificación de servidores** -- Los servidores MCP deben
   revisarse y clasificarse antes de su uso
2. **Aplicación de permisos a nivel de herramienta** -- Las herramientas
   individuales pueden permitirse, restringirse o bloquearse
3. **Seguimiento de contaminación de solicitud/respuesta** -- La contaminación
   de sesión escala según la clasificación del servidor
4. **Validación de esquemas** -- Todas las solicitudes y respuestas se validan
   contra los esquemas declarados
5. **Registro de auditoría** -- Cada llamada a herramienta, decisión y cambio de
   contaminación se registra

## Estados de los servidores MCP

Todos los servidores MCP tienen por defecto el estado `UNTRUSTED`. Deben ser
clasificados explícitamente antes de que el agente pueda invocarlos.

| Estado       | Descripción                                                                   | ¿El agente puede invocar? |
| ------------ | ----------------------------------------------------------------------------- | :-----------------------: |
| `UNTRUSTED`  | Por defecto para nuevos servidores. Pendiente de revisión.                    |            No             |
| `CLASSIFIED` | Revisado y con nivel de clasificación asignado y permisos por herramienta.    |   Sí (dentro de la política) |
| `BLOCKED`    | Prohibido explícitamente por el administrador.                                |            No             |

<img src="/diagrams/state-machine.svg" alt="Máquina de estados del servidor MCP: UNTRUSTED -> CLASSIFIED o BLOCKED" style="max-width: 100%;" />

::: warning SEGURIDAD Un servidor MCP `UNTRUSTED` no puede ser invocado por el
agente bajo ninguna circunstancia. El LLM no puede solicitar, convencer ni
engañar al sistema para que use un servidor sin clasificar. La clasificación es
una puerta a nivel de código, no una decisión del LLM. :::

## Configuración

Los servidores MCP se configuran en `triggerfish.yaml` como un mapa con clave
por ID de servidor. Cada servidor utiliza un subproceso local (transporte stdio)
o un endpoint remoto (transporte SSE).

### Servidores locales (Stdio)

Los servidores locales se lanzan como subprocesos. Triggerfish se comunica con
ellos a través de stdin/stdout.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### Servidores remotos (SSE)

Los servidores remotos se ejecutan en otro lugar y se acceden mediante HTTP
Server-Sent Events.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Claves de configuración

| Clave            | Tipo     | Obligatorio | Descripción                                                                       |
| ---------------- | -------- | ----------- | --------------------------------------------------------------------------------- |
| `command`        | string   | Sí (stdio)  | Binario a ejecutar (p. ej., `npx`, `deno`, `node`)                                |
| `args`           | string[] | No          | Argumentos pasados al comando                                                     |
| `env`            | map      | No          | Variables de entorno para el subproceso                                            |
| `url`            | string   | Sí (SSE)    | Endpoint HTTP para servidores remotos                                              |
| `classification` | string   | **Sí**      | Nivel de sensibilidad de datos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` o `RESTRICTED`|
| `enabled`        | boolean  | No          | Por defecto: `true`. Establezca `false` para omitir sin eliminar la configuración.|

Cada servidor debe tener `command` (local) o `url` (remoto). Los servidores sin
ninguno se omiten.

### Conexión diferida

Los servidores MCP se conectan en segundo plano después del inicio. No necesita
esperar a que todos los servidores estén listos antes de usar su agente.

- Los servidores reintentan con retroceso exponencial: 2s -> 4s -> 8s -> 30s máx
- Los nuevos servidores quedan disponibles para el agente a medida que se
  conectan -- no se necesita reiniciar la sesión
- Si un servidor no logra conectarse después de todos los reintentos, entra en
  estado `failed` y puede reintentarse en el próximo reinicio del daemon

Las interfaces CLI y Tidepool muestran el estado de conexión MCP en tiempo real.
Consulte [Canal CLI](/es-ES/channels/cli#estado-de-servidores-mcp) para más
detalles.

### Desactivar un servidor

Para desactivar temporalmente un servidor MCP sin eliminar su configuración:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Omitido durante el inicio
```

### Variables de entorno y secretos

Los valores de entorno con prefijo `keychain:` se resuelven desde el llavero del
SO al inicio:

```yaml
env:
  API_KEY: "keychain:mi-nombre-de-secreto" # Resuelto desde el llavero del SO
  PLAIN_VAR: "valor-literal" # Se pasa tal cual
```

Solo se hereda `PATH` del entorno del host (para que `npx`, `node`, `deno`,
etc. se resuelvan correctamente). Ninguna otra variable de entorno del host se
filtra a los subprocesos de servidores MCP.

::: tip Almacene secretos con `triggerfish config set-secret <nombre> <valor>`.
Luego referéncielos como `keychain:<nombre>` en la configuración de entorno de
su servidor MCP. :::

### Nomenclatura de herramientas

Las herramientas de servidores MCP se nombran como
`mcp_<idServidor>_<nombreHerramienta>` para evitar colisiones con herramientas
integradas. Por ejemplo, si un servidor llamado `github` expone una herramienta
llamada `list_repos`, el agente la ve como `mcp_github_list_repos`.

### Clasificación y denegación por defecto

Si omite `classification`, el servidor se registra como **UNTRUSTED** y el
gateway rechaza todas las llamadas a herramientas. Debe elegir explícitamente un
nivel de clasificación. Consulte la
[Guía de clasificación](/es-ES/guide/classification-guide) para ayuda en la
elección del nivel correcto.

## Flujo de llamada a herramienta

Cuando el agente solicita una llamada a herramienta MCP, el gateway ejecuta una
secuencia determinista de comprobaciones antes de reenviar la solicitud.

### 1. Comprobaciones previas al vuelo

Todas las comprobaciones son deterministas -- sin llamadas LLM, sin
aleatoriedad.

| Comprobación                                                | Resultado de fallo                           |
| ----------------------------------------------------------- | -------------------------------------------- |
| ¿El estado del servidor es `CLASSIFIED`?                    | Bloquear: "Servidor no aprobado"             |
| ¿La herramienta está permitida para este servidor?           | Bloquear: "Herramienta no permitida"         |
| ¿El usuario tiene los permisos necesarios?                   | Bloquear: "Permiso denegado"                 |
| ¿La contaminación de sesión es compatible con la clasificación del servidor? | Bloquear: "Violaría escritura descendente" |
| ¿La validación de esquema pasa?                              | Bloquear: "Parámetros inválidos"             |

::: info Si la contaminación de la sesión es superior a la clasificación del
servidor, la llamada se bloquea para evitar la escritura descendente. Una sesión
contaminada como `CONFIDENTIAL` no puede enviar datos a un servidor MCP
`PUBLIC`. :::

### 2. Ejecutar

Si todas las comprobaciones previas pasan, el gateway reenvía la solicitud al
servidor MCP.

### 3. Procesamiento de respuesta

Cuando el servidor MCP devuelve una respuesta:

- Validar la respuesta contra el esquema declarado
- Clasificar los datos de respuesta al nivel de clasificación del servidor
- Actualizar contaminación de sesión: `contaminación = max(contaminación_actual, clasificación_servidor)`
- Crear un registro de linaje rastreando el origen de los datos

### 4. Auditoría

Cada llamada a herramienta se registra con: identidad del servidor, nombre de
la herramienta, identidad del usuario, decisión de política, cambio de
contaminación y marca temporal.

## Reglas de contaminación de respuesta

Las respuestas del servidor MCP heredan el nivel de clasificación del servidor.
La contaminación de sesión solo puede escalar.

| Clasificación del servidor | Contaminación de respuesta | Impacto en la sesión                                  |
| -------------------------- | -------------------------- | ----------------------------------------------------- |
| `PUBLIC`                   | `PUBLIC`                   | Sin cambio de contaminación                           |
| `INTERNAL`                 | `INTERNAL`                 | La contaminación escala al menos a `INTERNAL`         |
| `CONFIDENTIAL`             | `CONFIDENTIAL`             | La contaminación escala al menos a `CONFIDENTIAL`     |
| `RESTRICTED`               | `RESTRICTED`               | La contaminación escala a `RESTRICTED`                |

Una vez que una sesión está contaminada a un nivel dado, permanece en ese nivel
o superior durante el resto de la sesión. Se requiere un reinicio completo de
sesión (que borra el historial de conversación) para reducir la contaminación.

## Paso de autenticación de usuario

Para los servidores MCP que soportan autenticación a nivel de usuario, el
gateway pasa las credenciales delegadas del usuario en lugar de las credenciales
del sistema.

Cuando una herramienta está configurada con `requires_user_auth: true`:

1. El gateway comprueba si el usuario ha conectado este servidor MCP
2. Recupera la credencial delegada del usuario del almacén seguro de credenciales
3. Añade la autenticación del usuario a las cabeceras de la solicitud MCP
4. El servidor MCP aplica los permisos a nivel de usuario

El resultado: el servidor MCP ve la **identidad del usuario**, no una identidad
del sistema. La herencia de permisos funciona a través de la frontera MCP -- el
agente solo puede acceder a lo que el usuario puede acceder.

::: tip El paso de autenticación de usuario es el patrón preferido para
cualquier servidor MCP que gestione control de acceso. Significa que el agente
hereda los permisos del usuario en lugar de tener acceso general del sistema.
:::

## Validación de esquemas

El gateway valida todas las solicitudes y respuestas MCP contra los esquemas
declarados antes de reenviar:

```typescript
// Validación de solicitud (simplificada)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // Validar params contra el esquema JSON
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // Comprobar patrones de inyección en parámetros de cadena
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

La validación de esquemas detecta solicitudes malformadas antes de que lleguen
al servidor externo y marca posibles patrones de inyección en parámetros de
cadena.

## Controles empresariales

Los despliegues empresariales tienen controles adicionales para la gestión de
servidores MCP:

- **Registro de servidores gestionado por admin** -- Solo los servidores MCP
  aprobados por el admin pueden ser clasificados
- **Permisos de herramientas por departamento** -- Diferentes equipos pueden
  tener diferente acceso a herramientas
- **Registro de cumplimiento** -- Todas las interacciones MCP disponibles en
  paneles de cumplimiento
- **Limitación de tasa** -- Límites de tasa por servidor y por herramienta
- **Monitorización de estado de servidores** -- El gateway rastrea la
  disponibilidad del servidor y los tiempos de respuesta
