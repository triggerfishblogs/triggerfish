---
title: Referencia del DSL de flujos de trabajo
description: Referencia completa del CNCF Serverless Workflow DSL 1.0 tal como está implementado en Triggerfish.
---

# Referencia del DSL de flujos de trabajo

Referencia completa del CNCF Serverless Workflow DSL 1.0 tal como está
implementado en el motor de flujos de trabajo de Triggerfish. Para la guía de
uso y ejemplos, consultad
[Flujos de trabajo](/es-ES/features/workflows).

## Estructura del documento

Cada YAML de flujo de trabajo debe tener un campo `document` de nivel superior y
un bloque `do`.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # optional
  description: "What it does"  # optional
classification_ceiling: INTERNAL  # optional
input:                            # optional
  from: "${ . }"
output:                           # optional
  from:
    result: "${ .final_step }"
timeout:                          # optional
  after: PT5M
do:
  - task_name:
      # task definition
```

### Metadatos del documento

| Field         | Type   | Required | Description                                            |
| ------------- | ------ | -------- | ------------------------------------------------------ |
| `dsl`         | string | yes      | Versión del DSL. Debe ser `"1.0"`                      |
| `namespace`   | string | yes      | Agrupación lógica (ej., `ops`, `reports`)              |
| `name`        | string | yes      | Nombre único del flujo de trabajo en el namespace      |
| `version`     | string | no       | Cadena de versión semántica                            |
| `description` | string | no       | Descripción legible                                    |

### Campos de nivel superior

| Field                     | Type         | Required | Description                                              |
| ------------------------- | ------------ | -------- | -------------------------------------------------------- |
| `document`                | object       | yes      | Metadatos del documento (véase arriba)                   |
| `do`                      | array        | yes      | Lista ordenada de entradas de tareas                     |
| `classification_ceiling`  | string       | no       | Taint máximo de sesión permitido durante la ejecución    |
| `input`                   | transform    | no       | Transformación aplicada a la entrada del flujo de trabajo|
| `output`                  | transform    | no       | Transformación aplicada a la salida del flujo de trabajo |
| `timeout`                 | object       | no       | Timeout a nivel de flujo (`after: <ISO 8601>`)           |
| `metadata`                | object       | no       | Metadatos arbitrarios de clave-valor                     |

---

## Formato de entrada de tarea

Cada entrada en el bloque `do` es un objeto de una sola clave. La clave es el
nombre de la tarea, el valor es la definición de la tarea.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Los nombres de las tareas deben ser únicos dentro del mismo bloque `do`. El
resultado de la tarea se almacena en el contexto de datos bajo el nombre de la
tarea.

---

## Campos comunes de tareas

Todos los tipos de tareas comparten estos campos opcionales:

| Field      | Type      | Description                                                       |
| ---------- | --------- | ----------------------------------------------------------------- |
| `if`       | string    | Condición de expresión. La tarea se omite cuando es falsa.        |
| `input`    | transform | Transformación aplicada antes de la ejecución de la tarea         |
| `output`   | transform | Transformación aplicada después de la ejecución de la tarea       |
| `timeout`  | object    | Timeout de tarea: `after: <duración ISO 8601>`                    |
| `then`     | string    | Directiva de flujo: `continue`, `end`, o nombre de tarea          |
| `metadata` | object    | Metadatos arbitrarios de clave-valor. Cuando self-healing está habilitado, requiere `description`, `expects`, `produces`. |

---

## Configuración de Self-Healing

El bloque `metadata.triggerfish.self_healing` habilita un agente de recuperación
autónoma para el flujo de trabajo. Consultad
[Self-Healing](/es-ES/features/workflows#self-healing) para una guía completa.

```yaml
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
      pause_timeout_seconds: 300
      pause_timeout_policy: escalate_and_halt
      notify_on: [intervention, escalation, approval_required]
```

| Field                   | Type    | Required | Default              | Description |
| ----------------------- | ------- | -------- | -------------------- | ----------- |
| `enabled`               | boolean | yes      | —                    | Habilita el agente de recuperación |
| `retry_budget`          | number  | no       | `3`                  | Intentos máximos de intervención |
| `approval_required`     | boolean | no       | `true`               | Requiere aprobación humana para las correcciones |
| `pause_on_intervention` | string  | no       | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | no       | `300`                | Segundos antes de que la política de timeout se active |
| `pause_timeout_policy`  | string  | no       | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | no       | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### Metadatos de paso (obligatorios cuando Self-Healing está habilitado)

Cuando `self_healing.enabled` es `true`, cada tarea debe incluir estos campos de
metadatos. El analizador rechaza flujos de trabajo que carezcan de cualquiera de
ellos.

| Field         | Type   | Description                                    |
| ------------- | ------ | ---------------------------------------------- |
| `description` | string | Qué hace el paso y por qué                    |
| `expects`     | string | Forma de entrada o precondiciones necesarias   |
| `produces`    | string | Forma de salida generada                       |

```yaml
- fetch-invoices:
    call: http
    with:
      endpoint: "https://api.example.com/invoices"
    metadata:
      description: "Fetch open invoices from billing API"
      expects: "API available, returns JSON array"
      produces: "Array of {id, amount, status} objects"
```

---

## Tipos de tareas

### `call`

Despacha a un endpoint HTTP o servicio de Triggerfish.

| Field  | Type   | Required | Description                                            |
| ------ | ------ | -------- | ------------------------------------------------------ |
| `call` | string | yes      | Tipo de llamada (véase tabla de despacho abajo)        |
| `with` | object | no       | Argumentos pasados a la herramienta objetivo           |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Ejecuta un comando de shell, script en línea o sub-flujo. El campo `run` debe
contener exactamente uno de `shell`, `script` o `workflow`.

**Shell:**

| Field                  | Type   | Required | Description                  |
| ---------------------- | ------ | -------- | ---------------------------- |
| `run.shell.command`    | string | yes      | Comando de shell a ejecutar  |
| `run.shell.arguments`  | object | no       | Argumentos con nombre        |
| `run.shell.environment`| object | no       | Variables de entorno         |

**Script:**

| Field                  | Type   | Required | Description                  |
| ---------------------- | ------ | -------- | ---------------------------- |
| `run.script.language`  | string | yes      | Lenguaje del script          |
| `run.script.code`      | string | yes      | Código del script en línea   |
| `run.script.arguments` | object | no       | Argumentos con nombre        |

**Sub-flujo:**

| Field                | Type   | Required | Description                            |
| -------------------- | ------ | -------- | -------------------------------------- |
| `run.workflow.name`  | string | yes      | Nombre del flujo de trabajo guardado   |
| `run.workflow.version` | string | no     | Restricción de versión                 |
| `run.workflow.input` | object | no       | Datos de entrada para el sub-flujo     |

### `set`

Asigna valores al contexto de datos.

| Field | Type   | Required | Description                                                     |
| ----- | ------ | -------- | --------------------------------------------------------------- |
| `set` | object | yes      | Pares clave-valor para asignar. Los valores pueden ser expresiones. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Ramificación condicional. El campo `switch` es un array de entradas de caso.
Cada caso es un objeto de una sola clave donde la clave es el nombre del caso.

| Case field | Type   | Required | Description                                                   |
| ---------- | ------ | -------- | ------------------------------------------------------------- |
| `when`     | string | no       | Condición de expresión. Omitid para el caso predeterminado.   |
| `then`     | string | yes      | Directiva de flujo: `continue`, `end`, o nombre de tarea      |

Los casos se evalúan en orden. Se toma el primer caso con un `when` verdadero
(o sin `when`).

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

Itera sobre una colección.

| Field      | Type   | Required | Description                                    |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `for.each` | string | yes      | Nombre de variable para el elemento actual     |
| `for.in`   | string | yes      | Expresión que referencia la colección          |
| `for.at`   | string | no       | Nombre de variable para el índice actual       |
| `do`       | array  | yes      | Lista de tareas anidada ejecutada en cada iteración |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Process item ${ .idx }: ${ .item.name }"
```

### `raise`

Detiene el flujo de trabajo con un error estructurado.

| Field                | Type   | Required | Description                    |
| -------------------- | ------ | -------- | ------------------------------ |
| `raise.error.status` | number | yes      | Código de estado estilo HTTP   |
| `raise.error.type`   | string | yes      | URI/cadena del tipo de error   |
| `raise.error.title`  | string | yes      | Título legible                 |
| `raise.error.detail` | string | no       | Mensaje detallado del error    |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Invalid input"
        detail: "Field 'email' is required"
```

### `emit`

Registra un evento del flujo de trabajo. Los eventos se almacenan en el
resultado de ejecución.

| Field                | Type   | Required | Description                    |
| -------------------- | ------ | -------- | ------------------------------ |
| `emit.event.type`    | string | yes      | Identificador del tipo de evento|
| `emit.event.source`  | string | no       | URI de origen del evento       |
| `emit.event.data`    | object | no       | Carga del evento               |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

Pausa la ejecución durante una duración.

| Field  | Type   | Required | Description                             |
| ------ | ------ | -------- | --------------------------------------- |
| `wait` | string | yes      | Duración ISO 8601 (ej., `PT5S`)        |

Duraciones habituales: `PT1S` (1 segundo), `PT30S` (30 segundos), `PT1M`
(1 minuto), `PT5M` (5 minutos).

---

## Tabla de despacho de llamadas

Mapea el valor del campo `call` a la herramienta de Triggerfish que se invoca.

| Valor de `call`        | Herramienta invocada | Campos `with:` requeridos                      |
| ---------------------- | -------------------- | ---------------------------------------------- |
| `http`                 | `web_fetch`          | `endpoint` o `url`; opcional `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`           | `prompt` o `task`; opcional `tools`, `max_iterations`    |
| `triggerfish:agent`    | `subagent`           | `prompt` o `task`; opcional `tools`, `agent`             |
| `triggerfish:memory`   | `memory_*`           | `operation` (`save`/`search`/`get`/`list`/`delete`) + campos de operación |
| `triggerfish:web_search` | `web_search`       | `query`; opcional `max_results`                |
| `triggerfish:web_fetch`  | `web_fetch`        | `url`; opcional `method`, `headers`, `body`    |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; opcional `arguments`    |
| `triggerfish:message`  | `send_message`       | `channel`, `text`; opcional `recipient`        |

Los tipos de llamada CNCF no soportados (`grpc`, `openapi`, `asyncapi`)
devuelven un error.

---

## Sintaxis de expresiones

Las expresiones están delimitadas por `${ }` y se resuelven contra el contexto
de datos del flujo de trabajo.

### Resolución de rutas de punto

| Sintaxis                | Descripción                         | Resultado de ejemplo |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | Contexto de datos completo          | `{...}`              |
| `${ .key }`             | Clave de nivel superior             | `"value"`            |
| `${ .a.b.c }`           | Clave anidada                       | `"deep value"`       |
| `${ .items[0] }`        | Índice de array                     | `{...primer item...}`|
| `${ .items[0].name }`   | Índice de array y luego clave       | `"first"`            |

El punto inicial (o `$.`) ancla la ruta en la raíz del contexto. Las rutas que
resuelven a `undefined` producen una cadena vacía al interpolar, o `undefined`
cuando se usan como valor independiente.

### Operadores

| Tipo       | Operadores                   | Ejemplo                        |
| ---------- | ---------------------------- | ------------------------------ |
| Comparación | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`        |
| Aritmético | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

Las expresiones de comparación devuelven `true` o `false`. Las expresiones
aritméticas devuelven un número (`undefined` si algún operando no es numérico o
hay división por cero).

### Literales

| Tipo    | Ejemplos                 |
| ------- | ------------------------ |
| String  | `"hello"`, `'hello'`     |
| Número  | `42`, `3.14`, `-1`       |
| Booleano| `true`, `false`          |
| Nulo    | `null`                   |

### Modos de interpolación

**Expresión única (valor crudo):** Cuando toda la cadena es una expresión
`${ }`, se devuelve el valor con tipo crudo (número, booleano, objeto, array).

```yaml
count: "${ .items.length }"  # returns a number, not a string
```

**Mixto / múltiples expresiones (string):** Cuando las expresiones `${ }` se
mezclan con texto o hay múltiples expresiones, el resultado siempre es un string.

```yaml
message: "Found ${ .count } items in ${ .category }"  # returns a string
```

### Veracidad

Para condiciones `if:` y expresiones `when:` de `switch`, los valores se evalúan
usando veracidad al estilo JavaScript:

| Valor                         | ¿Verdadero? |
| ----------------------------- | ----------- |
| `true`                        | sí          |
| Número distinto de cero       | sí          |
| Cadena no vacía               | sí          |
| Array no vacío                | sí          |
| Objeto                        | sí          |
| `false`, `0`, `""`, `null`, `undefined`, array vacío | no |

---

## Transformaciones de entrada/salida

Las transformaciones reestructuran los datos que entran y salen de las tareas.

### `input`

Se aplica antes de la ejecución de la tarea. Reemplaza la vista de la tarea del
contexto de datos.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task sees only the config object
    with:
      endpoint: "${ .api_url }"  # resolved against the config object
```

**`from` como string:** Expresión que reemplaza todo el contexto de entrada.

**`from` como objeto:** Mapea nuevas claves a expresiones:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Se aplica después de la ejecución de la tarea. Reestructura el resultado antes
de almacenarlo en el contexto bajo el nombre de la tarea.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Directivas de flujo

El campo `then` en cualquier tarea controla el flujo de ejecución después de que
la tarea se complete.

| Valor          | Comportamiento                                      |
| -------------- | --------------------------------------------------- |
| `continue`     | Continúa con la siguiente tarea en secuencia (predeterminado) |
| `end`          | Detiene el flujo de trabajo. Estado: `completed`.   |
| `<nombre de tarea>` | Salta a la tarea con nombre. Debe existir en el mismo bloque `do`. |

Los casos de switch también usan directivas de flujo en su campo `then`.

---

## Techo de clasificación

Campo opcional que restringe el taint máximo de sesión durante la ejecución.

```yaml
classification_ceiling: INTERNAL
```

| Valor          | Significado                                          |
| -------------- | ---------------------------------------------------- |
| `PUBLIC`       | El flujo se detiene si se accede a datos clasificados|
| `INTERNAL`     | Permite datos `PUBLIC` e `INTERNAL`                  |
| `CONFIDENTIAL` | Permite datos hasta `CONFIDENTIAL`                  |
| `RESTRICTED`   | Permite todos los niveles de clasificación           |
| *(omitido)*    | Sin techo aplicado                                   |

El techo se verifica antes de cada tarea. Si el taint de la sesión se ha
escalado más allá del techo (por ejemplo, porque una tarea anterior accedió a
datos clasificados), el flujo de trabajo se detiene con estado `failed` y error
`Workflow classification ceiling breached`.

---

## Almacenamiento

### Definiciones de flujos de trabajo

Se almacenan con prefijo de clave `workflows:{name}`. Cada registro contiene:

| Field            | Type   | Description                                        |
| ---------------- | ------ | -------------------------------------------------- |
| `name`           | string | Nombre del flujo de trabajo                        |
| `yaml`           | string | Definición YAML original                           |
| `classification` | string | Nivel de clasificación en el momento de guardar    |
| `savedAt`        | string | Marca de tiempo ISO 8601                           |
| `description`    | string | Descripción opcional                               |

### Historial de ejecuciones

Se almacena con prefijo de clave `workflow-runs:{runId}`. Cada registro contiene:

| Field            | Type   | Description                                        |
| ---------------- | ------ | -------------------------------------------------- |
| `runId`          | string | UUID de esta ejecución                             |
| `workflowName`   | string | Nombre del flujo de trabajo ejecutado              |
| `status`         | string | `completed`, `failed`, o `cancelled`               |
| `output`         | object | Contexto de datos final (claves internas filtradas)|
| `events`         | array  | Eventos emitidos durante la ejecución              |
| `error`          | string | Mensaje de error (si el estado es `failed`)        |
| `startedAt`      | string | Marca de tiempo ISO 8601                           |
| `completedAt`    | string | Marca de tiempo ISO 8601                           |
| `taskCount`      | number | Número de tareas en el flujo de trabajo            |
| `classification` | string | Taint de la sesión al completarse                  |

---

## Límites

| Límite                            | Valor | Descripción                                        |
| --------------------------------- | ----- | -------------------------------------------------- |
| Profundidad máxima de sub-flujos  | 5     | Anidamiento máximo de llamadas `run.workflow`       |
| Límite predeterminado de historial| 10    | `limit` predeterminado para `workflow_history`      |

---

## Estados de ejecución

| Estado      | Descripción                                            |
| ----------- | ------------------------------------------------------ |
| `pending`   | El flujo de trabajo fue creado pero no iniciado        |
| `running`   | El flujo de trabajo se está ejecutando actualmente     |
| `completed` | Todas las tareas terminaron con éxito (o `then: end`)  |
| `failed`    | Una tarea falló, se alcanzó un `raise`, o se violó el techo |
| `cancelled` | La ejecución fue cancelada externamente                |
