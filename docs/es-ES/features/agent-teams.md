# Equipos de agentes

Los agentes de Triggerfish pueden crear equipos persistentes de agentes colaboradores que trabajan juntos en tareas complejas. Cada miembro del equipo obtiene su propia sesión, rol, contexto de conversación y herramientas. Un miembro se designa como **líder** y coordina el trabajo.

Los equipos son ideales para tareas abiertas que se benefician de roles especializados trabajando en paralelo: investigación + análisis + redacción, arquitectura + implementación + revisión, o cualquier tarea donde diferentes perspectivas necesitan iterar sobre el trabajo de los demás.

::: info Disponibilidad
Los equipos de agentes requieren el plan **Power** (149 $/mes) cuando se usa Triggerfish Gateway. Los usuarios de código abierto que ejecutan con sus propias claves API tienen acceso completo a los equipos de agentes -- cada miembro del equipo consume inferencia de su proveedor configurado.
:::

## Herramientas

### `team_create`

Crear un equipo persistente de agentes que colaboran en una tarea. Defina roles de miembros, herramientas y modelos. Exactamente un miembro debe ser el líder.

| Parámetro                | Tipo   | Obligatorio | Descripción                                                          |
| ------------------------ | ------ | ----------- | -------------------------------------------------------------------- |
| `name`                   | string | sí          | Nombre legible del equipo                                            |
| `task`                   | string | sí          | Objetivo del equipo (enviado al líder como instrucciones iniciales)  |
| `members`                | array  | sí          | Definiciones de miembros del equipo (ver abajo)                      |
| `idle_timeout_seconds`   | number | no          | Timeout de inactividad por miembro. Predeterminado: 300 (5 minutos) |
| `max_lifetime_seconds`   | number | no          | Tiempo de vida máximo del equipo. Predeterminado: 3600 (1 hora)     |
| `classification_ceiling` | string | no          | Techo de clasificación de todo el equipo (p. ej. `CONFIDENTIAL`)    |

**Definición de miembro:**

| Campo                    | Tipo    | Obligatorio | Descripción                                            |
| ------------------------ | ------- | ----------- | ------------------------------------------------------ |
| `role`                   | string  | sí          | Identificador de rol único (p. ej. `researcher`, `reviewer`) |
| `description`            | string  | sí          | Qué hace este miembro (se inyecta en el prompt del sistema) |
| `is_lead`                | boolean | sí          | Si este miembro es el líder del equipo                  |
| `model`                  | string  | no          | Modelo alternativo para este miembro                    |
| `classification_ceiling` | string  | no          | Techo de clasificación por miembro                      |
| `initial_task`           | string  | no          | Instrucciones iniciales (el líder usa la tarea del equipo por defecto) |

**Reglas de validación:**

- El equipo debe tener exactamente un miembro con `is_lead: true`
- Todos los roles deben ser únicos y no vacíos
- Los techos de clasificación de los miembros no pueden exceder el techo del equipo
- `name` y `task` deben ser no vacíos

### `team_status`

Comprobar el estado actual de un equipo activo.

| Parámetro | Tipo   | Obligatorio | Descripción   |
| --------- | ------ | ----------- | ------------- |
| `team_id` | string | sí          | ID del equipo |

Devuelve el estado del equipo, el nivel de taint agregado y detalles por miembro incluyendo el taint actual, estado y marca de tiempo de la última actividad.

### `team_message`

Enviar un mensaje a un miembro específico del equipo. Útil para proporcionar contexto adicional, redirigir trabajo o pedir actualizaciones de progreso.

| Parámetro | Tipo   | Obligatorio | Descripción                                         |
| --------- | ------ | ----------- | --------------------------------------------------- |
| `team_id` | string | sí          | ID del equipo                                       |
| `role`    | string | no          | Rol del miembro destino (predeterminado: líder)     |
| `message` | string | sí          | Contenido del mensaje                               |

El equipo debe estar en estado `running` y el miembro destino debe estar `active` o `idle`.

### `team_disband`

Cerrar un equipo y terminar todas las sesiones de miembros.

| Parámetro | Tipo   | Obligatorio | Descripción                            |
| --------- | ------ | ----------- | -------------------------------------- |
| `team_id` | string | sí          | ID del equipo                          |
| `reason`  | string | no          | Por qué se disuelve el equipo          |

Solo la sesión que creó el equipo o el miembro líder pueden disolver el equipo.

## Cómo funcionan los equipos

### Creación

Cuando el agente llama a `team_create`, Triggerfish:

1. Valida la definición del equipo (roles, conteo de líder, techos de clasificación)
2. Crea una sesión de agente aislada para cada miembro vía la fábrica del orquestador
3. Inyecta un **prompt de plantilla del equipo** en el prompt del sistema de cada miembro, describiendo su rol, compañeros e instrucciones de colaboración
4. Envía la tarea inicial al líder (o `initial_task` personalizado por miembro)
5. Inicia un monitor de ciclo de vida que comprueba la salud del equipo cada 30 segundos

Cada sesión de miembro está completamente aislada con su propio contexto de conversación, seguimiento de taint y acceso a herramientas.

### Colaboración

Los miembros del equipo se comunican entre sí usando `sessions_send`. El agente creador no necesita retransmitir mensajes entre miembros. El flujo típico:

1. El líder recibe el objetivo del equipo
2. El líder descompone la tarea y envía asignaciones a los miembros vía `sessions_send`
3. Los miembros trabajan de forma autónoma, llamando herramientas e iterando
4. Los miembros envían resultados al líder (o directamente a otro miembro)
5. El líder sintetiza resultados y decide cuándo el trabajo está terminado
6. El líder llama a `team_disband` para cerrar el equipo

Los mensajes entre miembros del equipo se entregan directamente vía el orquestador -- cada mensaje activa un turno completo del agente en la sesión del destinatario.

### Estado

Use `team_status` para comprobar el progreso en cualquier momento. La respuesta incluye:

- **Estado del equipo:** `running`, `paused`, `completed`, `disbanded`, o `timed_out`
- **Taint agregado:** el nivel de clasificación más alto de todos los miembros
- **Detalles por miembro:** rol, estado (`active`, `idle`, `completed`, `failed`), nivel de taint actual y marca de tiempo de la última actividad

### Disolución

Los equipos pueden ser disueltos por:

- La sesión creadora llamando a `team_disband`
- El miembro líder llamando a `team_disband`
- El monitor de ciclo de vida auto-disolviendo cuando el límite de vida útil expira
- El monitor de ciclo de vida detectando que todos los miembros están inactivos

Cuando un equipo se disuelve, todas las sesiones de miembros activos se terminan y los recursos se liberan.

## Roles del equipo

### Líder

El miembro líder coordina el equipo. Al crearse:

- Recibe la `task` del equipo como instrucciones iniciales (a menos que se anule con `initial_task`)
- Obtiene instrucciones en el prompt del sistema para descomponer trabajo, asignar tareas y decidir cuándo se cumple el objetivo
- Está autorizado a disolver el equipo

Hay exactamente un líder por equipo.

### Miembros

Los miembros no líderes son especialistas. Al crearse:

- Reciben su `initial_task` si se proporciona; de lo contrario esperan hasta que el líder les envíe trabajo
- Obtienen instrucciones en el prompt del sistema para enviar trabajo completado al líder o al compañero apropiado
- No pueden disolver el equipo

## Monitorización del ciclo de vida

Los equipos tienen monitorización automática del ciclo de vida que se ejecuta cada 30 segundos.

### Timeout de inactividad

Cada miembro tiene un timeout de inactividad (predeterminado: 5 minutos). Cuando un miembro está inactivo:

1. **Primer umbral (idle_timeout_seconds):** el miembro recibe un mensaje de recordatorio pidiéndole que envíe resultados si su trabajo está completo
2. **Doble umbral (2x idle_timeout_seconds):** el miembro se termina y se notifica al líder

### Timeout de vida útil

Los equipos tienen una vida útil máxima (predeterminado: 1 hora). Cuando se alcanza el límite:

1. El líder recibe un mensaje de advertencia con 60 segundos para producir la salida final
2. Después del período de gracia, el equipo se disuelve automáticamente

### Comprobaciones de salud

El monitor comprueba la salud de las sesiones cada 30 segundos:

- **Fallo del líder:** si la sesión del líder ya no es accesible, el equipo se pausa y se notifica a la sesión creadora
- **Fallo de miembro:** si la sesión de un miembro ha desaparecido, se marca como `failed` y se notifica al líder para continuar con los miembros restantes
- **Todos inactivos:** si todos los miembros están `completed` o `failed`, se notifica a la sesión creadora para inyectar nuevas instrucciones o disolver

## Clasificación y taint

Las sesiones de miembros del equipo siguen las mismas reglas de clasificación que todas las demás sesiones:

- Cada miembro comienza con taint `PUBLIC` y escala a medida que accede a datos clasificados
- Se pueden establecer **techos de clasificación** por equipo o por miembro para restringir a qué datos pueden acceder los miembros
- La **aplicación de escritura descendente** se aplica a toda la comunicación entre miembros. Un miembro con taint `CONFIDENTIAL` no puede enviar datos a un miembro con taint `PUBLIC`
- El **taint agregado** (taint más alto de todos los miembros) se reporta en `team_status` para que la sesión creadora pueda rastrear la exposición de clasificación general del equipo

::: danger SEGURIDAD Los techos de clasificación de los miembros no pueden exceder el techo del equipo. Si el techo del equipo es `INTERNAL`, ningún miembro puede configurarse con un techo `CONFIDENTIAL`. Esto se valida en el momento de la creación. :::

## Equipos vs sub-agentes

| Aspecto          | Sub-agente (`subagent`)                    | Equipo (`team_create`)                                      |
| ---------------- | ------------------------------------------ | ----------------------------------------------------------- |
| **Vida útil**    | Tarea única, devuelve resultado y termina  | Persistente hasta disolución o timeout                      |
| **Miembros**     | Un agente                                  | Múltiples agentes con roles distintos                       |
| **Interacción**  | Disparar y olvidar desde el padre          | Los miembros se comunican libremente vía `sessions_send`    |
| **Coordinación** | El padre espera el resultado               | El líder coordina, el padre puede verificar vía `team_status` |
| **Caso de uso**  | Delegación enfocada de un solo paso        | Colaboración compleja con múltiples roles                   |

**Use sub-agentes** cuando necesite un solo agente para hacer una tarea enfocada y devolver un resultado. **Use equipos** cuando la tarea se beneficia de múltiples perspectivas especializadas que iteran sobre el trabajo de los demás.

::: tip Los equipos son autónomos una vez creados. El agente creador puede comprobar el estado y enviar mensajes, pero no necesita microgestionar. El líder se encarga de la coordinación. :::
