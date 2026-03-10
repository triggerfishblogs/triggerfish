---
title: Solución de problemas de flujos de trabajo
description: Problemas habituales y soluciones al trabajar con flujos de trabajo de Triggerfish.
---

# Solución de problemas: Flujos de trabajo

## "Workflow not found or not accessible"

El flujo de trabajo existe pero está almacenado a un nivel de clasificación más
alto que el taint de vuestra sesión actual.

Los flujos de trabajo guardados durante una sesión `CONFIDENTIAL` son invisibles
para sesiones `PUBLIC` o `INTERNAL`. El almacén utiliza verificaciones
`canFlowTo` en cada carga, y devuelve `null` (mostrado como "not found") cuando
la clasificación del flujo de trabajo excede el taint de la sesión.

**Solución:** Escalad el taint de vuestra sesión accediendo a datos clasificados
primero, o volved a guardar el flujo de trabajo desde una sesión de menor
clasificación si el contenido lo permite.

**Verificación:** Ejecutad `workflow_list` para ver qué flujos de trabajo son
visibles a vuestro nivel de clasificación actual. Si el flujo de trabajo que
esperáis no aparece, fue guardado a un nivel más alto.

---

## "Workflow classification ceiling breached"

El nivel de taint de la sesión excede el `classification_ceiling` del flujo de
trabajo. Esta verificación se ejecuta antes de cada tarea, por lo que puede
activarse a mitad de la ejecución si una tarea anterior escaló el taint de la
sesión.

Por ejemplo, un flujo de trabajo con `classification_ceiling: INTERNAL` se
detendrá si una llamada `triggerfish:memory` recupera datos `CONFIDENTIAL` que
escalan el taint de la sesión.

**Solución:**

- Aumentad el `classification_ceiling` del flujo de trabajo para que coincida
  con la sensibilidad esperada de los datos.
- O reestructurad el flujo de trabajo para que no se acceda a datos clasificados.
  Usad parámetros de entrada en lugar de leer memoria clasificada.

---

## Errores de análisis YAML

### "YAML parse error: ..."

Errores habituales de sintaxis YAML:

**Indentación.** YAML es sensible a los espacios en blanco. Usad espacios, no
tabulaciones. Cada nivel de anidamiento debe ser exactamente de 2 espacios.

```yaml
# Wrong — tabs or inconsistent indent
do:
- fetch:
      call: http

# Correct
do:
  - fetch:
      call: http
```

**Comillas ausentes alrededor de expresiones.** Las cadenas de expresiones con
`${ }` deben estar entre comillas, de lo contrario YAML interpreta `{` como un
mapeo en línea.

```yaml
# Wrong — YAML parse error
endpoint: ${ .config.url }

# Correct
endpoint: "${ .config.url }"
```

**Bloque `document` ausente.** Cada flujo de trabajo debe tener un campo
`document` con `dsl`, `namespace` y `name`:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

El YAML se analizó correctamente pero el resultado es un escalar o array, no
un objeto. Comprobad que vuestro YAML tenga claves de nivel superior (`document`,
`do`).

### "Task has no recognized type"

Cada entrada de tarea debe contener exactamente una clave de tipo: `call`,
`run`, `set`, `switch`, `for`, `raise`, `emit` o `wait`. Si el analizador no
encuentra ninguna de estas claves, notifica un tipo no reconocido.

Causa habitual: un error tipográfico en el nombre del tipo de tarea (ej.,
`calls` en lugar de `call`).

---

## Fallos en la evaluación de expresiones

### Valores incorrectos o vacíos

Las expresiones usan la sintaxis `${ .path.to.value }`. El punto inicial es
obligatorio -- ancla la ruta a la raíz del contexto de datos del flujo de
trabajo.

```yaml
# Wrong — missing leading dot
value: "${ result.name }"

# Correct
value: "${ .result.name }"
```

### "undefined" en la salida

La ruta de punto se resolvió a nada. Causas habituales:

- **Nombre de tarea incorrecto.** Cada tarea almacena su resultado bajo su
  propio nombre. Si vuestra tarea se llama `fetch_data`, referenciad su
  resultado como `${ .fetch_data }`, no `${ .data }` ni `${ .result }`.
- **Anidamiento incorrecto.** Si la llamada HTTP devuelve
  `{"data": {"items": [...]}}`, los items están en
  `${ .fetch_data.data.items }`.
- **Indexación de arrays.** Usad sintaxis de corchetes:
  `${ .items[0].name }`. Las rutas de solo punto no soportan índices numéricos.

### Las condiciones booleanas no funcionan

Las comparaciones de expresiones son estrictas (`===`). Aseguraos de que los
tipos coincidan:

```yaml
# This fails if .count is a string "0"
if: "${ .count == 0 }"

# Works when .count is a number
if: "${ .count == 0 }"
```

Verificad si las tareas anteriores devuelven strings o números. Las respuestas
HTTP frecuentemente devuelven valores de tipo string que no necesitan conversión
para comparación -- simplemente comparad contra la forma de string.

---

## Fallos en llamadas HTTP

### Timeouts

Las llamadas HTTP pasan por la herramienta `web_fetch`. Si el servidor de
destino es lento, la solicitud puede expirar. No hay override de timeout por
tarea para llamadas HTTP en el DSL de flujos de trabajo -- se aplica el timeout
predeterminado de la herramienta `web_fetch`.

### Bloqueos por SSRF

Todo el HTTP saliente en Triggerfish resuelve DNS primero y verifica la IP
resuelta contra una lista de denegación codificada. Los rangos de IP privados y
reservados siempre se bloquean.

Si vuestro flujo de trabajo llama a un servicio interno en una IP privada (ej.,
`http://192.168.1.100/api`), será bloqueado por la prevención de SSRF. Esto es
por diseño y no puede configurarse.

**Solución:** Usad un nombre de host público que resuelva a una IP pública, o
usad `triggerfish:mcp` para enrutar a través de un servidor MCP que tenga acceso
directo.

### Headers ausentes

El tipo de llamada `http` mapea `with.headers` directamente a los headers de la
solicitud. Si vuestra API requiere autenticación, incluid el header:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Aseguraos de que el valor del token esté proporcionado en la entrada del flujo
de trabajo o establecido por una tarea anterior.

---

## Límite de recursión de sub-flujos

### "Workflow recursion depth exceeded maximum of 5"

Los sub-flujos pueden anidarse hasta 5 niveles de profundidad. Este límite
previene la recursión infinita cuando el flujo de trabajo A llama al flujo B,
que a su vez llama al flujo A.

**Solución:**

- Aplanad la cadena de flujos de trabajo. Combinad pasos en menos flujos.
- Comprobad si hay referencias circulares donde dos flujos de trabajo se llaman
  mutuamente.

---

## Ejecución de shell deshabilitada

### "Shell execution failed" o resultado vacío de tareas run

La opción `allowShellExecution` en el contexto de herramientas del flujo de
trabajo controla si las tareas `run` con objetivos `shell` o `script` están
permitidas. Cuando está deshabilitada, estas tareas fallan.

**Solución:** Comprobad si la ejecución de shell está habilitada en vuestra
configuración de Triggerfish. En entornos de producción, la ejecución de shell
puede estar intencionalmente deshabilitada por seguridad.

---

## El flujo de trabajo se ejecuta pero produce una salida incorrecta

### Depuración con `workflow_history`

Usad `workflow_history` para inspeccionar ejecuciones pasadas:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

Cada entrada del historial incluye:

- **status** — `completed` o `failed`
- **error** — mensaje de error si falló
- **taskCount** — número de tareas en el flujo de trabajo
- **startedAt / completedAt** — información de tiempo

### Comprobación del flujo de contexto

Cada tarea almacena su resultado en el contexto de datos bajo el nombre de la
tarea. Si vuestro flujo de trabajo tiene tareas llamadas `fetch`, `transform` y
`save`, el contexto de datos después de las tres tareas tiene este aspecto:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

Errores habituales:

- **Sobrescritura de contexto.** Una tarea `set` que asigna a una clave que ya
  existe reemplazará el valor anterior.
- **Referencia de tarea incorrecta.** Referenciar `${ .step1 }` cuando la tarea
  se llama `step_1`.
- **Transformación de entrada reemplazando contexto.** Una directiva `input.from`
  reemplaza el contexto de entrada de la tarea por completo. Si usáis
  `input.from: "${ .config }"`, la tarea solo ve el objeto `config`, no el
  contexto completo.

### Salida ausente

Si el flujo de trabajo se completa pero devuelve una salida vacía, comprobad si
el resultado de la tarea final es lo que esperáis. La salida del flujo de
trabajo es el contexto de datos completo al completarse, con las claves internas
filtradas.

---

## "Permission denied" en workflow_delete

La herramienta `workflow_delete` carga el flujo de trabajo primero utilizando el
nivel de taint de la sesión actual. Si el flujo de trabajo fue guardado a un
nivel de clasificación que excede el taint de vuestra sesión, la carga devuelve
null y `workflow_delete` notifica "not found" en lugar de "permission denied."

Esto es intencionado -- la existencia de flujos de trabajo clasificados no se
revela a sesiones de menor clasificación.

**Solución:** Escalad el taint de vuestra sesión para igualar o exceder el nivel
de clasificación del flujo de trabajo antes de eliminarlo. O eliminadlo desde el
mismo tipo de sesión donde fue guardado originalmente.
