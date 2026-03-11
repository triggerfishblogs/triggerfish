# MCP Gateway

> Usen cualquier servidor MCP. Nosotros aseguramos el límite.

El Model Context Protocol (MCP) es el estándar emergente para la comunicación
agente-herramienta. Triggerfish proporciona un MCP Gateway seguro que les permite
conectarse a cualquier servidor compatible con MCP mientras aplica controles de
clasificación, permisos a nivel de herramienta, seguimiento de taint y registro
completo de auditoría.

Ustedes proporcionan los servidores MCP. Triggerfish asegura cada solicitud y
respuesta que cruza el límite.

## Cómo Funciona

El MCP Gateway se ubica entre su agente y cualquier servidor MCP. Cada llamada a
herramienta pasa por la capa de aplicación de políticas antes de llegar al
servidor externo, y cada respuesta se clasifica antes de entrar al contexto del
agente.

<img src="/diagrams/mcp-gateway-flow.svg" alt="Flujo del MCP Gateway: Agente → MCP Gateway → Capa de Políticas → Servidor MCP, con ruta de denegación a BLOCKED" style="max-width: 100%;" />

El gateway proporciona cinco funciones principales:

1. **Autenticación y clasificación del servidor** -- Los servidores MCP deben
   ser revisados y clasificados antes de su uso
2. **Aplicación de permisos a nivel de herramienta** -- Las herramientas
   individuales pueden ser permitidas, restringidas o bloqueadas
3. **Seguimiento de taint de solicitud/respuesta** -- El taint de sesión escala
   según la clasificación del servidor
4. **Validación de esquema** -- Todas las solicitudes y respuestas se validan
   contra los esquemas declarados
5. **Registro de auditoría** -- Cada llamada a herramienta, decisión y cambio
   de taint se registra

## Estados del Servidor MCP

Todos los servidores MCP tienen estado `UNTRUSTED` por defecto. Deben ser
explícitamente clasificados antes de que el agente pueda invocarlos.

| Estado       | Descripción                                                                    | ¿El Agente Puede Invocar? |
| ------------ | ------------------------------------------------------------------------------ | :-----------------------: |
| `UNTRUSTED`  | Predeterminado para nuevos servidores. Pendiente de revisión.                  |            No             |
| `CLASSIFIED` | Revisado y asignado un nivel de clasificación con permisos por herramienta.    |   Sí (dentro de política) |
| `BLOCKED`    | Prohibido explícitamente por el administrador.                                 |            No             |

<img src="/diagrams/state-machine.svg" alt="Máquina de estados del servidor MCP: UNTRUSTED → CLASSIFIED o BLOCKED" style="max-width: 100%;" />

::: warning SEGURIDAD Un servidor MCP `UNTRUSTED` no puede ser invocado por el
agente bajo ninguna circunstancia. El LLM no puede solicitar, convencer ni
engañar al sistema para usar un servidor no clasificado. La clasificación es una
puerta a nivel de código, no una decisión del LLM. :::

## Configuración

Los servidores MCP se configuran en `triggerfish.yaml` como un mapa indexado por
ID de servidor. Cada servidor usa un subproceso local (transporte stdio) o un
endpoint remoto (transporte SSE).

### Servidores Locales (Stdio)

Los servidores locales se inician como subprocesos. Triggerfish se comunica con
ellos vía stdin/stdout.

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

### Servidores Remotos (SSE)

Los servidores remotos se ejecutan en otro lugar y se acceden vía HTTP
Server-Sent Events.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Claves de Configuración

| Clave            | Tipo     | Requerido     | Descripción                                                                     |
| ---------------- | -------- | ------------- | ------------------------------------------------------------------------------- |
| `command`        | string   | Sí (stdio)    | Binario a ejecutar (ej., `npx`, `deno`, `node`)                                |
| `args`           | string[] | No            | Argumentos pasados al comando                                                   |
| `env`            | map      | No            | Variables de entorno para el subproceso                                         |
| `url`            | string   | Sí (SSE)      | Endpoint HTTP para servidores remotos                                           |
| `classification` | string   | **Sí**        | Nivel de sensibilidad: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` o `RESTRICTED`      |
| `enabled`        | boolean  | No            | Predeterminado: `true`. Establezcan en `false` para omitir sin eliminar config. |

Cada servidor debe tener `command` (local) o `url` (remoto). Los servidores sin
ninguno se omiten.

### Conexión Diferida

Los servidores MCP se conectan en segundo plano después del inicio. No necesitan
esperar a que todos los servidores estén listos antes de usar su agente.

- Los servidores reintentan con retroceso exponencial: 2s → 4s → 8s → 30s máx
- Los nuevos servidores quedan disponibles para el agente conforme se conectan
  -- no se necesita reiniciar la sesión
- Si un servidor falla en conectarse después de todos los reintentos, entra en
  estado `failed` y puede reintentarse en el siguiente reinicio del daemon

Las interfaces CLI y Tidepool muestran el estado de conexión MCP en tiempo real.
Consulten [Canal CLI](/pt-BR/channels/cli#estado-del-servidor-mcp) para más
detalles.

### Deshabilitar un Servidor

Para deshabilitar temporalmente un servidor MCP sin eliminar su configuración:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Omitido durante el inicio
```

### Variables de Entorno y Secretos

Los valores de env con prefijo `keychain:` se resuelven desde el llavero del SO
al inicio:

```yaml
env:
  API_KEY: "keychain:mi-nombre-secreto" # Resuelto desde el llavero del SO
  PLAIN_VAR: "valor-literal" # Pasado tal cual
```

Solo `PATH` se hereda del entorno del host (para que `npx`, `node`, `deno`,
etc. se resuelvan correctamente). Ninguna otra variable de entorno del host se
filtra a los subprocesos del servidor MCP.

::: tip Almacenen secretos con `triggerfish config set-secret <nombre> <valor>`.
Luego refiéranse a ellos como `keychain:<nombre>` en la configuración env de su
servidor MCP. :::

### Nomenclatura de Herramientas

Las herramientas de servidores MCP se nombran con el espacio de nombres
`mcp_<serverId>_<toolName>` para evitar colisiones con herramientas integradas.
Por ejemplo, si un servidor llamado `github` expone una herramienta llamada
`list_repos`, el agente la ve como `mcp_github_list_repos`.

### Clasificación y Denegación por Defecto

Si omiten `classification`, el servidor se registra como **UNTRUSTED** y el
gateway rechaza todas las llamadas a herramientas. Deben elegir explícitamente
un nivel de clasificación. Consulten la
[Guía de Clasificación](/pt-BR/guide/classification-guide) para ayuda en la
elección del nivel correcto.

## Flujo de Llamada a Herramienta

Cuando el agente solicita una llamada a herramienta MCP, el gateway ejecuta una
secuencia determinística de verificaciones antes de reenviar la solicitud.

### 1. Verificaciones Previas al Vuelo

Todas las verificaciones son determinísticas -- sin llamadas al LLM, sin
aleatoriedad.

| Verificación                                              | Resultado en Fallo                          |
| --------------------------------------------------------- | ------------------------------------------- |
| ¿El estado del servidor es `CLASSIFIED`?                  | Bloquear: "Servidor no aprobado"            |
| ¿La herramienta está permitida para este servidor?        | Bloquear: "Herramienta no permitida"        |
| ¿El usuario tiene los permisos requeridos?                | Bloquear: "Permiso denegado"                |
| ¿El taint de sesión es compatible con la clasificación?   | Bloquear: "Violaría escritura descendente"  |
| ¿La validación de esquema pasa?                           | Bloquear: "Parámetros inválidos"            |

::: info Si el taint de la sesión es superior a la clasificación del servidor,
la llamada se bloquea para prevenir escritura descendente. Una sesión con taint
`CONFIDENTIAL` no puede enviar datos a un servidor MCP `PUBLIC`. :::

### 2. Ejecutar

Si todas las verificaciones previas al vuelo pasan, el gateway reenvía la
solicitud al servidor MCP.

### 3. Procesamiento de Respuesta

Cuando el servidor MCP devuelve una respuesta:

- Validar la respuesta contra el esquema declarado
- Clasificar los datos de respuesta al nivel de clasificación del servidor
- Actualizar el taint de sesión: `taint = max(taint_actual, clasificación_servidor)`
- Crear un registro de linaje rastreando el origen de los datos

### 4. Auditoría

Cada llamada a herramienta se registra con: identidad del servidor, nombre de la
herramienta, identidad del usuario, decisión de política, cambio de taint y
marca de tiempo.

## Reglas de Taint de Respuesta

Las respuestas del servidor MCP heredan el nivel de clasificación del servidor.
El taint de sesión solo puede escalar.

| Clasificación del Servidor | Taint de Respuesta | Impacto en la Sesión                            |
| -------------------------- | ------------------ | ----------------------------------------------- |
| `PUBLIC`                   | `PUBLIC`           | Sin cambio de taint                             |
| `INTERNAL`                 | `INTERNAL`         | Taint escala al menos a `INTERNAL`              |
| `CONFIDENTIAL`             | `CONFIDENTIAL`     | Taint escala al menos a `CONFIDENTIAL`          |
| `RESTRICTED`               | `RESTRICTED`       | Taint escala a `RESTRICTED`                     |

Una vez que una sesión tiene taint a un nivel dado, permanece en ese nivel o
superior por el resto de la sesión. Se requiere un reinicio completo de sesión
(que borra el historial de conversación) para reducir el taint.

## Paso de Autenticación de Usuario

Para servidores MCP que soportan autenticación a nivel de usuario, el gateway
pasa las credenciales delegadas del usuario en lugar de credenciales del sistema.

Cuando una herramienta está configurada con `requires_user_auth: true`:

1. El gateway verifica si el usuario ha conectado este servidor MCP
2. Recupera la credencial delegada del usuario del almacén seguro de credenciales
3. Agrega autenticación de usuario a los encabezados de la solicitud MCP
4. El servidor MCP aplica permisos a nivel de usuario

El resultado: el servidor MCP ve la **identidad del usuario**, no una identidad
del sistema. La herencia de permisos funciona a través del límite MCP -- el
agente solo puede acceder a lo que el usuario puede acceder.

::: tip El paso de autenticación de usuario es el patrón preferido para cualquier
servidor MCP que gestione control de acceso. Significa que el agente hereda los
permisos del usuario en lugar de tener acceso total del sistema. :::

## Validación de Esquema

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

  // Validar params contra esquema JSON
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // Verificar patrones de inyección en params de tipo string
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

La validación de esquema detecta solicitudes malformadas antes de que lleguen al
servidor externo y marca patrones potenciales de inyección en parámetros de tipo
string.

## Controles Empresariales

Los despliegues empresariales tienen controles adicionales para la gestión de
servidores MCP:

- **Registro de servidores administrado** -- Solo los servidores MCP aprobados
  por el administrador pueden ser clasificados
- **Permisos de herramientas por departamento** -- Diferentes equipos pueden
  tener diferente acceso a herramientas
- **Registro de cumplimiento** -- Todas las interacciones MCP disponibles en
  paneles de cumplimiento
- **Limitación de tasa** -- Límites de tasa por servidor y por herramienta
- **Monitoreo de salud del servidor** -- El gateway rastrea la disponibilidad
  del servidor y los tiempos de respuesta
