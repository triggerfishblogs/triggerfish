# Modo plan y seguimiento de tareas

Triggerfish proporciona dos herramientas complementarias para trabajo estructurado: **modo plan** para planificación de implementaciones complejas, y **seguimiento de tareas** para gestión de tareas entre sesiones.

## Modo plan

El modo plan restringe al agente a exploración de solo lectura y planificación estructurada antes de realizar cambios. Esto previene que el agente salte a la implementación antes de entender el problema.

### Herramientas

#### `plan_enter`

Entrar en modo plan. Bloquea operaciones de escritura (`write_file`, `cron_create`, `cron_delete`) hasta que el plan sea aprobado.

| Parámetro | Tipo   | Obligatorio | Descripción                                                      |
| --------- | ------ | ----------- | ---------------------------------------------------------------- |
| `goal`    | string | sí          | Qué va a construir/cambiar el agente                             |
| `scope`   | string | no          | Restringir la exploración a directorios o módulos específicos    |

#### `plan_exit`

Salir del modo plan y presentar el plan de implementación para aprobación del usuario. **No** comienza la ejecución automáticamente.

| Parámetro | Tipo   | Obligatorio | Descripción                                                                  |
| --------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `plan`    | object | sí          | El plan de implementación (resumen, enfoque, pasos, riesgos, archivos, pruebas) |

El objeto plan incluye:

- `summary` -- Qué logra el plan
- `approach` -- Cómo se realizará
- `alternatives_considered` -- Qué otros enfoques se evaluaron
- `steps` -- Lista ordenada de pasos de implementación, cada uno con archivos, dependencias y verificación
- `risks` -- Riesgos conocidos y mitigaciones
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Devuelve el estado actual del modo plan: modo activo, objetivo y progreso del plan.

#### `plan_approve`

Aprobar el plan pendiente y comenzar la ejecución. Se llama cuando el usuario aprueba.

#### `plan_reject`

Rechazar el plan pendiente y volver al modo normal.

#### `plan_step_complete`

Marcar un paso del plan como completado durante la ejecución.

| Parámetro             | Tipo   | Obligatorio | Descripción                               |
| --------------------- | ------ | ----------- | ----------------------------------------- |
| `step_id`             | number | sí          | El ID del paso a marcar como completado   |
| `verification_result` | string | sí          | Salida del comando de verificación        |

#### `plan_complete`

Marcar el plan completo como finalizado.

| Parámetro    | Tipo   | Obligatorio | Descripción                            |
| ------------ | ------ | ----------- | -------------------------------------- |
| `summary`    | string | sí          | Qué se logró                           |
| `deviations` | array  | no          | Cualquier cambio respecto al plan original |

#### `plan_modify`

Solicitar una modificación a un paso del plan aprobado. Requiere aprobación del usuario.

| Parámetro          | Tipo   | Obligatorio | Descripción                       |
| ------------------ | ------ | ----------- | --------------------------------- |
| `step_id`          | number | sí          | Qué paso necesita cambio          |
| `reason`           | string | sí          | Por qué se necesita el cambio     |
| `new_description`  | string | sí          | Descripción actualizada del paso  |
| `new_files`        | array  | no          | Lista de archivos actualizada     |
| `new_verification` | string | no          | Comando de verificación actualizado |

### Flujo de trabajo

```
1. El usuario pide algo complejo
2. El agente llama a plan_enter({ goal: "..." })
3. El agente explora el código (solo herramientas de lectura)
4. El agente llama a plan_exit({ plan: { ... } })
5. El usuario revisa el plan
6. El usuario aprueba → el agente llama a plan_approve
   (o rechaza → el agente llama a plan_reject)
7. El agente ejecuta paso a paso, llamando a plan_step_complete después de cada uno
8. El agente llama a plan_complete cuando termina
```

### Cuándo usar el modo plan

El agente entra en modo plan para tareas complejas: construir funcionalidades, refactorizar sistemas, implementar cambios en múltiples archivos. Para tareas simples (corregir un error tipográfico, renombrar una variable), omite el modo plan y actúa directamente.

## Seguimiento de tareas

El agente tiene una lista de tareas persistente para rastrear trabajo de múltiples pasos entre sesiones.

### Herramientas

#### `todo_read`

Leer la lista de tareas actual. Devuelve todos los elementos con su ID, contenido, estado, prioridad y marcas de tiempo.

#### `todo_write`

Reemplazar toda la lista de tareas. Es un reemplazo completo, no una actualización parcial.

| Parámetro | Tipo  | Obligatorio | Descripción                            |
| --------- | ----- | ----------- | -------------------------------------- |
| `todos`   | array | sí          | Lista completa de elementos de tareas  |

Cada elemento de tarea tiene:

| Campo        | Tipo   | Valores                                   |
| ------------ | ------ | ----------------------------------------- |
| `id`         | string | Identificador único                       |
| `content`    | string | Descripción de la tarea                   |
| `status`     | string | `pending`, `in_progress`, `completed`     |
| `priority`   | string | `high`, `medium`, `low`                   |
| `created_at` | string | Marca de tiempo ISO                       |
| `updated_at` | string | Marca de tiempo ISO                       |

### Comportamiento

- Las tareas tienen alcance por agente (no por sesión) -- persisten entre sesiones, despertares de trigger y reinicios
- El agente solo usa tareas para trabajo genuinamente complejo (3+ pasos distintos)
- Una tarea está `in_progress` a la vez; los elementos completados se marcan inmediatamente
- Cuando el agente escribe una nueva lista que omite elementos previamente almacenados, esos elementos se preservan automáticamente como `completed`
- Cuando todos los elementos están `completed`, los elementos antiguos no se preservan (pizarra limpia)

### Visualización

Las tareas se renderizan tanto en el CLI como en Tidepool:

- **CLI** -- Caja ANSI estilizada con iconos de estado: `✓` (completado, tachado), `▶` (en progreso, negrita), `○` (pendiente)
- **Tidepool** -- Lista HTML con clases CSS para cada estado
