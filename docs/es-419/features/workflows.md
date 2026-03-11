---
title: Flujos de trabajo
description: Automatiza tareas de múltiples pasos con el motor CNCF Serverless Workflow DSL integrado en Triggerfish.
---

# Flujos de trabajo

Triggerfish incluye un motor de ejecución integrado para el
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
Los flujos de trabajo permiten definir automatizaciones deterministas de
múltiples pasos en YAML que se ejecutan **sin el LLM en el ciclo** durante la
ejecución. El agente crea y activa los flujos de trabajo, pero el motor se
encarga del despacho de tareas, las ramificaciones, los bucles y el flujo de
datos.

## Cuándo usar flujos de trabajo

**Usa flujos de trabajo** para secuencias repetibles y deterministas donde
conoces los pasos de antemano: obtener datos de una API, transformarlos,
guardarlos en la memoria, enviar una notificación. La misma entrada siempre
produce la misma salida.

**Usa el agente directamente** para razonamiento abierto, exploración o tareas
donde el siguiente paso depende del criterio: investigar un tema, escribir
código, resolver un problema.

Una buena regla general: si te encuentras pidiéndole al agente que haga la misma
secuencia de múltiples pasos repetidamente, conviértela en un flujo de trabajo.

::: info Disponibilidad
Los flujos de trabajo están disponibles en todos los planes. Los usuarios de
código abierto que usan sus propias claves de API tienen acceso completo al
motor de flujos de trabajo -- cada llamada `triggerfish:llm` o
`triggerfish:agent` dentro de un flujo de trabajo consume inferencia de tu
proveedor configurado.
:::

## Herramientas

### `workflow_save`

Analiza, valida y almacena una definición de flujo de trabajo. El flujo de
trabajo se guarda al nivel de clasificación de la sesión actual.

| Parameter     | Type   | Required | Description                                |
| ------------- | ------ | -------- | ------------------------------------------ |
| `name`        | string | yes      | Nombre del flujo de trabajo                |
| `yaml`        | string | yes      | Definición YAML del flujo de trabajo       |
| `description` | string | no       | Descripción del flujo de trabajo           |

### `workflow_run`

Ejecuta un flujo de trabajo por nombre o desde YAML en línea. Devuelve la salida
de ejecución y el estado.

| Parameter | Type   | Required | Description                                                 |
| --------- | ------ | -------- | ----------------------------------------------------------- |
| `name`    | string | no       | Nombre de un flujo de trabajo guardado para ejecutar        |
| `yaml`    | string | no       | Definición YAML en línea (cuando no se usa uno guardado)    |
| `input`   | string | no       | Cadena JSON de datos de entrada para el flujo de trabajo    |

Se requiere `name` o `yaml`.

### `workflow_list`

Lista todos los flujos de trabajo guardados accesibles al nivel de clasificación
actual. No requiere parámetros.

### `workflow_get`

Recupera una definición de flujo de trabajo guardada por nombre.

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| `name`    | string | yes      | Nombre del flujo de trabajo a recuperar|

### `workflow_delete`

Elimina un flujo de trabajo guardado por nombre. El flujo de trabajo debe ser
accesible al nivel de clasificación de la sesión actual.

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| `name`    | string | yes      | Nombre del flujo de trabajo a eliminar |

### `workflow_history`

Muestra resultados de ejecuciones pasadas, opcionalmente filtrados por nombre de
flujo de trabajo.

| Parameter       | Type   | Required | Description                                          |
| --------------- | ------ | -------- | ---------------------------------------------------- |
| `workflow_name` | string | no       | Filtrar resultados por nombre de flujo de trabajo    |
| `limit`         | string | no       | Cantidad máxima de resultados (predeterminado 10)    |

## Tipos de tareas

Los flujos de trabajo se componen de tareas en un bloque `do:`. Cada tarea es
una entrada con nombre y un cuerpo específico del tipo. Triggerfish soporta 8
tipos de tareas.

### `call` — Llamadas externas

Despacha a endpoints HTTP o servicios de Triggerfish.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

El campo `call` determina el destino del despacho. Consulta
[Despacho de llamadas](#despacho-de-llamadas) para la tabla completa.

### `run` — Shell, Script o Sub-flujo

Ejecuta un comando de shell, un script en línea u otro flujo de trabajo
guardado.

**Comando de shell:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Sub-flujo:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
La ejecución de shell y scripts requiere que la opción `allowShellExecution`
esté habilitada en el contexto de herramientas del flujo de trabajo. Si está
deshabilitada, las tareas run con objetivos `shell` o `script` fallarán.
:::

### `set` — Mutaciones del contexto de datos

Asigna valores al contexto de datos del flujo de trabajo. Soporta expresiones.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Ramificación condicional

Ramifica según condiciones. Cada caso tiene una expresión `when` y una directiva
de flujo `then`. Un caso sin `when` actúa como predeterminado.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — Iteración

Recorre una colección, ejecutando un bloque `do:` anidado para cada elemento.

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

El campo `each` nombra la variable del bucle, `in` referencia la colección y
el campo opcional `at` proporciona el índice actual.

### `raise` — Detener con error

Detiene la ejecución con un error estructurado.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — Registrar eventos

Registra un evento del flujo de trabajo. Los eventos se capturan en el resultado
de ejecución y pueden revisarse mediante `workflow_history`.

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — Espera

Pausa la ejecución durante una duración ISO 8601.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Despacho de llamadas

El campo `call` en una tarea call determina qué herramienta de Triggerfish se
invoca.

| Tipo de llamada        | Herramienta Triggerfish | Campos `with:` requeridos              |
| ---------------------- | ---------------------- | -------------------------------------- |
| `http`                 | `web_fetch`            | `endpoint` (o `url`), `method`         |
| `triggerfish:llm`      | `llm_task`             | `prompt` (o `task`)                    |
| `triggerfish:agent`    | `subagent`             | `prompt` (o `task`)                    |
| `triggerfish:memory`   | `memory_*`             | `operation` + campos específicos       |
| `triggerfish:web_search` | `web_search`         | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`          | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`        |
| `triggerfish:message`  | `send_message`         | `channel`, `text`                      |

**Operaciones de memoria:** El tipo de llamada `triggerfish:memory` requiere un
campo `operation` con uno de los valores `save`, `search`, `get`, `list` o
`delete`. Los campos `with:` restantes se pasan directamente a la herramienta
de memoria correspondiente.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**Llamadas MCP:** El tipo de llamada `triggerfish:mcp` se enruta a cualquier
herramienta de servidor MCP conectado. Especifica el nombre del `server`, el
nombre del `tool` y el objeto `arguments`.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Expresiones

Las expresiones de flujos de trabajo usan la sintaxis `${ }` con resolución de
rutas de punto contra el contexto de datos del flujo de trabajo.

```yaml
# Simple value reference
url: "${ .config.api_url }"

# Array indexing
first_item: "${ .results[0].name }"

# String interpolation (multiple expressions in one string)
message: "Found ${ .count } issues in ${ .repo }"

# Comparison (returns boolean)
if: "${ .status == 'open' }"

# Arithmetic
total: "${ .price * .quantity }"
```

**Operadores soportados:**

- Comparación: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Aritméticos: `+`, `-`, `*`, `/`, `%`

**Literales:** String (`"value"` o `'value'`), número (`42`, `3.14`), booleano
(`true`, `false`), nulo (`null`).

Cuando una expresión `${ }` es el valor completo, se preserva el tipo original
(número, booleano, objeto). Cuando se mezcla con texto, el resultado siempre es
un string.

## Ejemplo completo

Este flujo de trabajo obtiene un issue de GitHub, lo resume con el LLM, guarda
el resumen en la memoria y envía una notificación.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**Ejecútalo:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Transformaciones de entrada y salida

Las tareas pueden transformar su entrada antes de la ejecución y su salida antes
de almacenar los resultados.

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — Expresión u objeto de mapeo que reemplaza el contexto de
  entrada de la tarea antes de la ejecución.
- **`output.from`** — Expresión u objeto de mapeo que reestructura el resultado
  de la tarea antes de almacenarlo en el contexto de datos.

## Control de flujo

Cada tarea puede incluir una directiva `then` que controla lo que sucede después:

- **`continue`** (predeterminado) — continúa con la siguiente tarea en secuencia
- **`end`** — detiene el flujo de trabajo inmediatamente (estado: completed)
- **Tarea con nombre** — salta a una tarea específica por nombre

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## Ejecución condicional

Cualquier tarea puede incluir un campo `if`. La tarea se omite cuando la
condición evalúa a falso.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Sub-flujos

Una tarea `run` con un objetivo `workflow` ejecuta otro flujo de trabajo
guardado. El sub-flujo se ejecuta con su propio contexto y devuelve su salida
al padre.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Los sub-flujos pueden anidarse hasta **5 niveles de profundidad**. Exceder este
límite produce un error y detiene la ejecución.

## Clasificación y seguridad

Los flujos de trabajo participan en el mismo sistema de clasificación que todos
los demás datos de Triggerfish.

**Clasificación de almacenamiento.** Cuando guardas un flujo de trabajo con
`workflow_save`, se almacena al nivel de taint de la sesión actual. Un flujo de
trabajo guardado durante una sesión `CONFIDENTIAL` solo puede ser cargado por
sesiones en `CONFIDENTIAL` o superior.

**Techo de clasificación.** Los flujos de trabajo pueden declarar un
`classification_ceiling` en su YAML. Antes de que cada tarea se ejecute, el
motor verifica que el taint actual de la sesión no exceda el techo. Si el taint
de la sesión se escala más allá del techo durante la ejecución (por ejemplo, al
acceder a datos clasificados a través de una llamada a herramienta), el flujo de
trabajo se detiene con un error de violación del techo.

```yaml
classification_ceiling: INTERNAL
```

Valores válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Historial de ejecuciones.** Los resultados de ejecución se almacenan con la
clasificación de la sesión al momento de completarse. `workflow_history` filtra
los resultados por `canFlowTo`, por lo que solo ves ejecuciones que están en o
por debajo del taint de tu sesión actual.

::: danger SEGURIDAD
La eliminación de flujos de trabajo requiere que el flujo de trabajo sea
accesible al nivel de clasificación de tu sesión actual. No puedes eliminar un
flujo de trabajo almacenado en `CONFIDENTIAL` desde una sesión `PUBLIC`. La
herramienta `workflow_delete` carga el flujo de trabajo primero y devuelve
"not found" si la verificación de clasificación falla.
:::
