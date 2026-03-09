# Plugin SDK y sandbox

Los plugins de Triggerfish le permiten ampliar el agente con código
personalizado que interactúa con sistemas externos -- consultas CRM, operaciones
de base de datos, integraciones de API, flujos de trabajo de varios pasos --
mientras se ejecutan dentro de un doble sandbox que impide al código hacer
cualquier cosa para la que no haya sido explícitamente autorizado.

## Entorno de ejecución

Los plugins se ejecutan en Deno + Pyodide (WASM). Sin Docker. Sin contenedores.
Sin prerrequisitos más allá de la propia instalación de Triggerfish.

- **Plugins TypeScript** se ejecutan directamente en el sandbox de Deno
- **Plugins Python** se ejecutan dentro de Pyodide (un intérprete de Python
  compilado a WebAssembly), que a su vez se ejecuta dentro del sandbox de Deno

<img src="/diagrams/plugin-sandbox.svg" alt="Plugin sandbox: el sandbox de Deno envuelve el sandbox WASM, el código del plugin se ejecuta en la capa más interna" style="max-width: 100%;" />

Esta arquitectura de doble sandbox significa que incluso si un plugin contiene
código malicioso, no puede acceder al sistema de ficheros, hacer llamadas de red
no declaradas ni escapar al sistema anfitrión.

## Qué pueden hacer los plugins

Los plugins tienen un interior flexible dentro de límites estrictos. Dentro del
sandbox, su plugin puede:

- Realizar operaciones CRUD completas en sistemas objetivo (usando los permisos
  del usuario)
- Ejecutar consultas y transformaciones de datos complejas
- Orquestar flujos de trabajo de varios pasos
- Procesar y analizar datos
- Mantener el estado del plugin entre invocaciones
- Llamar a cualquier endpoint de API externo declarado

## Qué no pueden hacer los plugins

| Restricción                                    | Cómo se aplica                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Acceder a endpoints de red no declarados       | El sandbox bloquea todas las llamadas de red fuera de la lista       |
| Emitir datos sin etiqueta de clasificación     | El SDK rechaza datos sin clasificar                                  |
| Leer datos sin propagación de contaminación    | El SDK contamina automáticamente la sesión al acceder a datos        |
| Persistir datos fuera de Triggerfish           | Sin acceso al sistema de ficheros desde dentro del sandbox            |
| Exfiltrar mediante canales laterales           | Límites de recursos aplicados, sin acceso a sockets sin procesar     |
| Usar credenciales del sistema                  | El SDK bloquea `get_system_credential()`; solo credenciales del usuario |

::: warning SEGURIDAD `sdk.get_system_credential()` está **bloqueado** por
diseño. Los plugins siempre deben usar credenciales delegadas del usuario
mediante `sdk.get_user_credential()`. Esto asegura que el agente solo pueda
acceder a lo que el usuario puede acceder -- nunca más. :::

## Métodos del Plugin SDK

El SDK proporciona una interfaz controlada para que los plugins interactúen con
sistemas externos y la plataforma Triggerfish.

### Acceso a credenciales

```typescript
// Obtener la credencial delegada del usuario para un servicio
const credential = await sdk.get_user_credential("salesforce");

// Comprobar si el usuario ha conectado un servicio
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)` recupera el token OAuth o la clave API del
usuario para el servicio nombrado. Si el usuario no ha conectado el servicio, la
llamada devuelve `null` y el plugin debería gestionarlo correctamente.

### Operaciones de datos

```typescript
// Consultar un sistema externo usando los permisos del usuario
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Emitir datos de vuelta al agente — la etiqueta de clasificación es OBLIGATORIA
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info Cada llamada a `sdk.emitData()` requiere una etiqueta de
`classification`. Si la omite, el SDK rechaza la llamada. Esto asegura que todos
los datos que fluyen desde plugins al contexto del agente estén correctamente
clasificados. :::

### Comprobación de conexión

```typescript
// Comprobar si el usuario tiene una conexión activa a un servicio
if (await sdk.has_user_connection("github")) {
  const repos = await sdk.query_as_user("github", {
    endpoint: "/user/repos",
  });
  sdk.emitData({
    classification: "INTERNAL",
    payload: repos,
    source: "github",
  });
}
```

## Ciclo de vida del plugin

Cada plugin sigue un ciclo de vida que asegura la revisión de seguridad antes de
la activación.

```
1. Plugin creado (por el usuario, el agente o un tercero)
       |
       v
2. Plugin construido usando el Plugin SDK
   - Debe implementar las interfaces requeridas
   - Debe declarar endpoints y capacidades
   - Debe pasar la validación
       |
       v
3. El plugin entra en estado UNTRUSTED
   - El agente NO PUEDE usarlo
   - Se notifica al propietario/admin: "Pendiente de clasificación"
       |
       v
4. El propietario (personal) o admin (empresarial) revisa:
   - ¿A qué datos accede este plugin?
   - ¿Qué acciones puede realizar?
   - Asigna nivel de clasificación
       |
       v
5. Plugin activo con la clasificación asignada
   - El agente puede invocarlo dentro de las restricciones de política
   - Todas las invocaciones pasan por hooks de política
```

::: tip En el nivel personal, usted es el propietario -- revisa y clasifica sus
propios plugins. En el nivel empresarial, un administrador gestiona el registro
de plugins y asigna niveles de clasificación. :::

## Conectividad con bases de datos

Los drivers nativos de bases de datos (psycopg2, mysqlclient, etc.) no funcionan
dentro del sandbox WASM. Los plugins se conectan a bases de datos a través de
APIs basadas en HTTP.

| Base de datos | Opción basada en HTTP                 |
| ------------- | ------------------------------------- |
| PostgreSQL    | PostgREST, Supabase SDK, API de Neon  |
| MySQL         | API de PlanetScale                    |
| MongoDB       | Atlas Data API                        |
| Snowflake     | REST API                              |
| BigQuery      | REST API                              |
| DynamoDB      | AWS SDK (HTTP)                        |

Esto es una ventaja de seguridad, no una limitación. Todo el acceso a bases de
datos fluye a través de peticiones HTTP inspeccionables y controlables que el
sandbox puede aplicar y el sistema de auditoría puede registrar.

## Escribir un plugin TypeScript

Un plugin TypeScript mínimo que consulta una REST API:

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // Comprobar si el usuario ha conectado el servicio
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // Consultar usando las credenciales del usuario
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // Emitir datos clasificados de vuelta al agente
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## Escribir un plugin Python

Un plugin Python mínimo:

```python
async def execute(sdk):
    # Comprobar conexión
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # Consultar usando las credenciales del usuario
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # Emitir con clasificación
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

Los plugins Python se ejecutan dentro del runtime WASM de Pyodide. Los módulos
de la biblioteca estándar están disponibles, pero las extensiones C nativas no.
Use APIs basadas en HTTP para la conectividad externa.

## Resumen de seguridad de plugins

- Los plugins se ejecutan en un doble sandbox (Deno + WASM) con aislamiento
  estricto
- Todo el acceso a red debe declararse en el manifiesto del plugin
- Todos los datos emitidos deben llevar una etiqueta de clasificación
- Las credenciales del sistema están bloqueadas -- solo las credenciales
  delegadas del usuario están disponibles
- Cada plugin entra en el sistema como `UNTRUSTED` y debe clasificarse antes de
  su uso
- Todas las invocaciones de plugins pasan por hooks de política y se auditan
  completamente
