# Plugin SDK y Sandbox

Los plugins de Triggerfish les permiten extender el agente con código
personalizado que interactúa con sistemas externos -- consultas de CRM,
operaciones de base de datos, integraciones de API, flujos de trabajo de
múltiples pasos -- mientras se ejecuta dentro de un doble sandbox que evita que
el código haga algo que no se le haya permitido explícitamente.

## Entorno de Ejecución

Los plugins se ejecutan en Deno + Pyodide (WASM). Sin Docker. Sin contenedores.
Sin prerrequisitos más allá de la instalación de Triggerfish.

- **Plugins de TypeScript** se ejecutan directamente en el sandbox de Deno
- **Plugins de Python** se ejecutan dentro de Pyodide (un intérprete de Python
  compilado a WebAssembly), que a su vez se ejecuta dentro del sandbox de Deno

<img src="/diagrams/plugin-sandbox.svg" alt="Sandbox de plugin: el sandbox de Deno envuelve el sandbox WASM, el código del plugin se ejecuta en la capa más interna" style="max-width: 100%;" />

Esta arquitectura de doble sandbox significa que incluso si un plugin contiene
código malicioso, no puede acceder al sistema de archivos, hacer llamadas de
red no declaradas ni escapar al sistema host.

## Qué Pueden Hacer los Plugins

Los plugins tienen un interior flexible dentro de límites estrictos. Dentro del
sandbox, su plugin puede:

- Realizar operaciones CRUD completas en sistemas objetivo (usando los permisos
  del usuario)
- Ejecutar consultas y transformaciones de datos complejas
- Orquestar flujos de trabajo de múltiples pasos
- Procesar y analizar datos
- Mantener estado del plugin entre invocaciones
- Llamar a cualquier endpoint de API externa declarado

## Qué No Pueden Hacer los Plugins

| Restricción                                       | Cómo se Aplica                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| Acceder a endpoints de red no declarados          | El sandbox bloquea todas las llamadas de red fuera de la lista      |
| Emitir datos sin etiqueta de clasificación        | El SDK rechaza datos no clasificados                                |
| Leer datos sin propagación de taint               | El SDK marca automáticamente la sesión cuando se accede a datos     |
| Persistir datos fuera de Triggerfish              | Sin acceso al sistema de archivos desde dentro del sandbox          |
| Exfiltrar vía canales laterales                   | Límites de recursos aplicados, sin acceso a sockets raw             |
| Usar credenciales del sistema                     | El SDK bloquea `get_system_credential()`; solo credenciales de usuario |

::: warning SEGURIDAD `sdk.get_system_credential()` está **bloqueado** por
diseño. Los plugins siempre deben usar credenciales delegadas del usuario vía
`sdk.get_user_credential()`. Esto asegura que el agente solo pueda acceder a lo
que el usuario puede acceder -- nunca más. :::

## Métodos del Plugin SDK

El SDK proporciona una interfaz controlada para que los plugins interactúen con
sistemas externos y la plataforma Triggerfish.

### Acceso a Credenciales

```typescript
// Obtener la credencial delegada del usuario para un servicio
const credential = await sdk.get_user_credential("salesforce");

// Verificar si el usuario ha conectado un servicio
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)` recupera el token OAuth o API key del usuario
para el servicio nombrado. Si el usuario no ha conectado el servicio, la llamada
devuelve `null` y el plugin debe manejar esto correctamente.

### Operaciones de Datos

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
`classification`. Si la omiten, el SDK rechaza la llamada. Esto asegura que
todos los datos que fluyen de los plugins al contexto del agente estén
correctamente clasificados. :::

### Verificación de Conexión

```typescript
// Verificar si el usuario tiene una conexión activa a un servicio
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

## Ciclo de Vida del Plugin

Cada plugin sigue un ciclo de vida que asegura la revisión de seguridad antes de
la activación.

```
1. Plugin creado (por usuario, agente o tercero)
       |
       v
2. Plugin construido usando el Plugin SDK
   - Debe implementar las interfaces requeridas
   - Debe declarar endpoints y capacidades
   - Debe pasar la validación
       |
       v
3. Plugin entra en estado UNTRUSTED
   - El agente NO puede usarlo
   - Se notifica al propietario/admin: "Pendiente de clasificación"
       |
       v
4. Propietario (personal) o admin (empresarial) revisa:
   - ¿A qué datos accede este plugin?
   - ¿Qué acciones puede tomar?
   - Asigna nivel de clasificación
       |
       v
5. Plugin activo en la clasificación asignada
   - El agente puede invocar dentro de las restricciones de política
   - Todas las invocaciones pasan por hooks de política
```

::: tip En el nivel personal, ustedes son el propietario -- revisan y clasifican
sus propios plugins. En el nivel empresarial, un administrador gestiona el
registro de plugins y asigna niveles de clasificación. :::

## Conectividad de Base de Datos

Los controladores nativos de base de datos (psycopg2, mysqlclient, etc.) no
funcionan dentro del sandbox WASM. Los plugins se conectan a bases de datos a
través de APIs basadas en HTTP en su lugar.

| Base de Datos | Opción Basada en HTTP               |
| ------------- | ----------------------------------- |
| PostgreSQL    | PostgREST, Supabase SDK, Neon API   |
| MySQL         | PlanetScale API                     |
| MongoDB       | Atlas Data API                      |
| Snowflake     | REST API                            |
| BigQuery      | REST API                            |
| DynamoDB      | AWS SDK (HTTP)                      |

Esta es una ventaja de seguridad, no una limitación. Todo el acceso a base de
datos fluye a través de solicitudes HTTP inspeccionables y controlables que el
sandbox puede aplicar y el sistema de auditoría puede registrar.

## Escribir un Plugin de TypeScript

Un plugin mínimo de TypeScript que consulta una API REST:

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // Verificar si el usuario ha conectado el servicio
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

## Escribir un Plugin de Python

Un plugin mínimo de Python:

```python
async def execute(sdk):
    # Verificar conexión
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # Consultar usando credenciales del usuario
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

Los plugins de Python se ejecutan dentro del runtime WASM de Pyodide. Los
módulos de la biblioteca estándar están disponibles, pero las extensiones
nativas en C no. Usen APIs basadas en HTTP para conectividad externa.

## Resumen de Seguridad de Plugins

- Los plugins se ejecutan en un doble sandbox (Deno + WASM) con aislamiento
  estricto
- Todo acceso de red debe declararse en el manifiesto del plugin
- Todos los datos emitidos deben llevar una etiqueta de clasificación
- Las credenciales del sistema están bloqueadas -- solo están disponibles las
  credenciales delegadas del usuario
- Cada plugin entra al sistema como `UNTRUSTED` y debe ser clasificado antes de
  su uso
- Todas las invocaciones de plugins pasan por hooks de política y son
  completamente auditadas
