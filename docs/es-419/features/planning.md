# Modo Plan y Seguimiento de Tareas

Triggerfish proporciona dos herramientas complementarias para trabajo
estructurado: **modo plan** para planificacion de implementacion compleja, y
**seguimiento de todos** para gestion de tareas entre sesiones.

## Modo Plan

El modo plan restringe al agente a exploracion de solo lectura y planificacion
estructurada antes de hacer cambios. Esto previene que el agente salte a la
implementacion antes de entender el problema.

### Herramientas

#### `plan_enter`

Entrar al modo plan. Bloquea operaciones de escritura (`write_file`,
`cron_create`, `cron_delete`) hasta que el plan sea aprobado.

| Parametro | Tipo   | Requerido | Descripcion                                                 |
| --------- | ------ | --------- | ----------------------------------------------------------- |
| `goal`    | string | si        | Que planea construir/cambiar el agente                      |
| `scope`   | string | no        | Restringir exploracion a directorios o modulos especificos  |

#### `plan_exit`

Salir del modo plan y presentar el plan de implementacion para aprobacion del
usuario. **No** comienza la ejecucion automaticamente.

| Parametro | Tipo   | Requerido | Descripcion                                                                |
| --------- | ------ | --------- | -------------------------------------------------------------------------- |
| `plan`    | object | si        | El plan de implementacion (resumen, enfoque, pasos, riesgos, archivos, tests) |

El objeto plan incluye:

- `summary` -- Que logra el plan
- `approach` -- Como se hara
- `alternatives_considered` -- Que otros enfoques se evaluaron
- `steps` -- Lista ordenada de pasos de implementacion, cada uno con archivos,
  dependencias y verificacion
- `risks` -- Riesgos conocidos y mitigaciones
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Retorna el estado actual del modo plan: modo activo, objetivo y progreso del
plan.

#### `plan_approve`

Aprobar el plan pendiente y comenzar la ejecucion. Se llama cuando el usuario
aprueba.

#### `plan_reject`

Rechazar el plan pendiente y volver al modo normal.

#### `plan_step_complete`

Marcar un paso del plan como completado durante la ejecucion.

| Parametro             | Tipo   | Requerido | Descripcion                               |
| --------------------- | ------ | --------- | ----------------------------------------- |
| `step_id`             | number | si        | El ID del paso a marcar como completado   |
| `verification_result` | string | si        | Salida del comando de verificacion        |

#### `plan_complete`

Marcar todo el plan como completado.

| Parametro    | Tipo   | Requerido | Descripcion                           |
| ------------ | ------ | --------- | ------------------------------------- |
| `summary`    | string | si        | Que se logro                          |
| `deviations` | array  | no        | Cualquier cambio del plan original    |

#### `plan_modify`

Solicitar una modificacion a un paso del plan aprobado. Requiere aprobacion del
usuario.

| Parametro          | Tipo   | Requerido | Descripcion                         |
| ------------------ | ------ | --------- | ----------------------------------- |
| `step_id`          | number | si        | Que paso necesita cambio            |
| `reason`           | string | si        | Por que se necesita el cambio       |
| `new_description`  | string | si        | Descripcion actualizada del paso    |
| `new_files`        | array  | no        | Lista de archivos actualizada       |
| `new_verification` | string | no        | Comando de verificacion actualizado |

### Flujo de Trabajo

```
1. El usuario pide algo complejo
2. El agente llama a plan_enter({ goal: "..." })
3. El agente explora el codebase (solo herramientas de lectura)
4. El agente llama a plan_exit({ plan: { ... } })
5. El usuario revisa el plan
6. El usuario aprueba -> el agente llama a plan_approve
   (o rechaza -> el agente llama a plan_reject)
7. El agente ejecuta paso a paso, llamando a plan_step_complete despues de cada uno
8. El agente llama a plan_complete cuando termina
```

### Cuando Usar el Modo Plan

El agente entra en modo plan para tareas complejas: construir funcionalidades,
refactorizar sistemas, implementar cambios en multiples archivos. Para tareas
simples (corregir un error tipografico, renombrar una variable), omite el modo
plan y actua directamente.

## Seguimiento de Todos

El agente tiene una lista de todos persistente para rastrear trabajo de
multiples pasos entre sesiones.

### Herramientas

#### `todo_read`

Leer la lista de todos actual. Retorna todos los items con su ID, contenido,
estado, prioridad y marcas de tiempo.

#### `todo_write`

Reemplazar la lista de todos completa. Este es un reemplazo total, no una
actualizacion parcial.

| Parametro | Tipo  | Requerido | Descripcion                        |
| --------- | ----- | --------- | ---------------------------------- |
| `todos`   | array | si        | Lista completa de items de todos   |

Cada item de todo tiene:

| Campo        | Tipo   | Valores                               |
| ------------ | ------ | ------------------------------------- |
| `id`         | string | Identificador unico                   |
| `content`    | string | Descripcion de la tarea               |
| `status`     | string | `pending`, `in_progress`, `completed` |
| `priority`   | string | `high`, `medium`, `low`               |
| `created_at` | string | Marca de tiempo ISO                   |
| `updated_at` | string | Marca de tiempo ISO                   |

### Comportamiento

- Los todos tienen alcance por agente (no por sesion) -- persisten entre
  sesiones, despertares de triggers y reinicios
- El agente solo usa todos para tareas genuinamente complejas (3+ pasos
  distintos)
- Una tarea esta `in_progress` a la vez; los items completados se marcan
  inmediatamente
- Cuando el agente escribe una nueva lista que omite items previamente
  almacenados, esos items se preservan automaticamente como `completed`
- Cuando todos los items estan `completed`, los items antiguos no se preservan
  (borrón y cuenta nueva)

### Visualizacion

Los todos se renderizan tanto en el CLI como en Tidepool:

- **CLI** -- Caja ANSI estilizada con iconos de estado: `check` (completado,
  tachado), `play` (en progreso, negrita), `circle` (pendiente)
- **Tidepool** -- Lista HTML con clases CSS para cada estado
