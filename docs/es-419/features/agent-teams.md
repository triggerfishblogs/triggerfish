# Equipos de Agentes

Los agentes de Triggerfish pueden generar equipos persistentes de agentes
colaboradores que trabajan juntos en tareas complejas. Cada miembro del equipo
obtiene su propia sesion, rol, contexto de conversacion y herramientas. Un
miembro se designa como **lider** y coordina el trabajo.

Los equipos son mejores para tareas abiertas que se benefician de roles
especializados trabajando en paralelo: investigacion + analisis + redaccion,
arquitectura + implementacion + revision, o cualquier tarea donde diferentes
perspectivas necesiten iterar sobre el trabajo de los demas.

::: info Disponibilidad
Los Equipos de Agentes requieren el plan **Power** ($149/mes) cuando se usa
Triggerfish Gateway. Los usuarios de codigo abierto que ejecutan sus propias API
keys tienen acceso completo a los equipos de agentes -- cada miembro del equipo
consume inferencia de su proveedor configurado.
:::

## Herramientas

### `team_create`

Crear un equipo persistente de agentes que colaboran en una tarea. Defina roles,
herramientas y modelos de los miembros. Exactamente un miembro debe ser el lider.

| Parametro                | Tipo   | Requerido | Descripcion                                                     |
| ------------------------ | ------ | --------- | --------------------------------------------------------------- |
| `name`                   | string | si        | Nombre legible del equipo                                       |
| `task`                   | string | si        | El objetivo del equipo (enviado al lider como instrucciones iniciales) |
| `members`                | array  | si        | Definiciones de miembros del equipo (ver abajo)                 |
| `idle_timeout_seconds`   | number | no        | Timeout de inactividad por miembro. Predeterminado: 300 (5 minutos) |
| `max_lifetime_seconds`   | number | no        | Duracion maxima del equipo. Predeterminado: 3600 (1 hora)       |
| `classification_ceiling` | string | no        | Techo de clasificacion para todo el equipo (ej. `CONFIDENTIAL`) |

**Definicion de miembro:**

| Campo                    | Tipo    | Requerido | Descripcion                                           |
| ------------------------ | ------- | --------- | ----------------------------------------------------- |
| `role`                   | string  | si        | Identificador unico de rol (ej. `researcher`, `reviewer`) |
| `description`            | string  | si        | Que hace este miembro (inyectado en el system prompt)  |
| `is_lead`                | boolean | si        | Si este miembro es el lider del equipo                 |
| `model`                  | string  | no        | Override de modelo para este miembro                   |
| `classification_ceiling` | string  | no        | Techo de clasificacion por miembro                     |
| `initial_task`           | string  | no        | Instrucciones iniciales (el lider usa la tarea del equipo por defecto) |

**Reglas de validacion:**

- El equipo debe tener exactamente un miembro con `is_lead: true`
- Todos los roles deben ser unicos y no vacios
- Los techos de clasificacion de miembros no pueden exceder el techo del equipo
- `name` y `task` deben ser no vacios

### `team_status`

Verificar el estado actual de un equipo activo.

| Parametro | Tipo   | Requerido | Descripcion |
| --------- | ------ | --------- | ----------- |
| `team_id` | string | si        | ID del equipo |

Retorna el estado del equipo, nivel de taint agregado y detalles por miembro
incluyendo el taint actual, estado y marca de tiempo de la ultima actividad de
cada miembro.

### `team_message`

Enviar un mensaje a un miembro especifico del equipo. Util para proporcionar
contexto adicional, redirigir trabajo o pedir actualizaciones de progreso.

| Parametro | Tipo   | Requerido | Descripcion                              |
| --------- | ------ | --------- | ---------------------------------------- |
| `team_id` | string | si        | ID del equipo                            |
| `role`    | string | no        | Rol del miembro destino (predeterminado: lider) |
| `message` | string | si        | Contenido del mensaje                    |

El equipo debe estar en estado `running` y el miembro destino debe estar
`active` o `idle`.

### `team_disband`

Cerrar un equipo y terminar todas las sesiones de miembros.

| Parametro | Tipo   | Requerido | Descripcion                        |
| --------- | ------ | --------- | ---------------------------------- |
| `team_id` | string | si        | ID del equipo                      |
| `reason`  | string | no        | Por que se esta disolviendo el equipo |

Solo la sesion que creo el equipo o el miembro lider pueden disolver el equipo.

## Como Funcionan los Equipos

### Creacion

Cuando el agente llama a `team_create`, Triggerfish:

1. Valida la definicion del equipo (roles, conteo de lideres, techos de
   clasificacion)
2. Genera una sesion de agente aislada para cada miembro via la fabrica de
   orquestadores
3. Inyecta un **prompt de roster de equipo** en el system prompt de cada
   miembro, describiendo su rol, companeros e instrucciones de colaboracion
4. Envia la tarea inicial al lider (o `initial_task` personalizado por miembro)
5. Inicia un monitor de ciclo de vida que verifica la salud del equipo cada 30
   segundos

Cada sesion de miembro esta completamente aislada con su propio contexto de
conversacion, seguimiento de taint y acceso a herramientas.

### Colaboracion

Los miembros del equipo se comunican entre si usando `sessions_send`. El agente
creador no necesita retransmitir mensajes entre miembros. El flujo tipico:

1. El lider recibe el objetivo del equipo
2. El lider descompone la tarea y envia asignaciones a los miembros via
   `sessions_send`
3. Los miembros trabajan de forma autonoma, llamando herramientas e iterando
4. Los miembros envian resultados de vuelta al lider (o directamente a otro
   miembro)
5. El lider sintetiza resultados y decide cuando el trabajo esta completo
6. El lider llama a `team_disband` para cerrar el equipo

Los mensajes entre miembros del equipo se entregan directamente via el
orquestador -- cada mensaje dispara un turno completo del agente en la sesion
del destinatario.

### Estado

Use `team_status` para verificar el progreso en cualquier momento. La respuesta
incluye:

- **Estado del equipo:** `running`, `paused`, `completed`, `disbanded` o
  `timed_out`
- **Taint agregado:** El nivel de clasificacion mas alto entre todos los
  miembros
- **Detalles por miembro:** Rol, estado (`active`, `idle`, `completed`,
  `failed`), nivel de taint actual y marca de tiempo de ultima actividad

### Disolucion

Los equipos pueden disolverse por:

- La sesion creadora llamando a `team_disband`
- El miembro lider llamando a `team_disband`
- El monitor de ciclo de vida auto-disolviendo despues de que expire el limite
  de duracion
- El monitor de ciclo de vida detectando que todos los miembros estan inactivos

Cuando un equipo se disuelve, todas las sesiones de miembros activos se terminan
y los recursos se liberan.

## Roles del Equipo

### Lider

El miembro lider coordina el equipo. Al crearse:

- Recibe la `task` del equipo como sus instrucciones iniciales (a menos que se
  anule con `initial_task`)
- Obtiene instrucciones en el system prompt para descomponer trabajo, asignar
  tareas y decidir cuando se cumple el objetivo
- Esta autorizado a disolver el equipo

Hay exactamente un lider por equipo.

### Miembros

Los miembros no lider son especialistas. Al crearse:

- Reciben su `initial_task` si se proporciona, de lo contrario esperan hasta que
  el lider les envie trabajo
- Obtienen instrucciones en el system prompt para enviar trabajo completado al
  lider o al siguiente companero apropiado
- No pueden disolver el equipo

## Monitoreo de Ciclo de Vida

Los equipos tienen monitoreo automatico de ciclo de vida que se ejecuta cada 30
segundos.

### Timeout de Inactividad

Cada miembro tiene un timeout de inactividad (predeterminado: 5 minutos). Cuando
un miembro esta inactivo:

1. **Primer umbral (idle_timeout_seconds):** El miembro recibe un mensaje de
   empujon pidiendole que envie resultados si su trabajo esta completo
2. **Doble umbral (2x idle_timeout_seconds):** El miembro se termina y se
   notifica al lider

### Timeout de Duracion

Los equipos tienen una duracion maxima (predeterminado: 1 hora). Cuando se
alcanza el limite:

1. El lider recibe un mensaje de advertencia con 60 segundos para producir
   salida final
2. Despues del periodo de gracia, el equipo se disuelve automaticamente

### Verificaciones de Salud

El monitor verifica la salud de las sesiones cada 30 segundos:

- **Fallo del lider:** Si la sesion del lider ya no es alcanzable, el equipo se
  pausa y se notifica a la sesion creadora
- **Fallo de miembro:** Si una sesion de miembro desaparecio, se marca como
  `failed` y se notifica al lider para continuar con los miembros restantes
- **Todos inactivos:** Si todos los miembros estan `completed` o `failed`, se
  notifica a la sesion creadora para inyectar nuevas instrucciones o disolver

## Clasificacion y Taint

Las sesiones de miembros del equipo siguen las mismas reglas de clasificacion
que todas las demas sesiones:

- Cada miembro comienza con taint `PUBLIC` y escala a medida que accede a datos
  clasificados
- Los **techos de clasificacion** pueden establecerse por equipo o por miembro
  para restringir a que datos pueden acceder los miembros
- El **cumplimiento de write-down** aplica a toda comunicacion entre miembros.
  Un miembro con taint `CONFIDENTIAL` no puede enviar datos a un miembro en
  `PUBLIC`
- El **taint agregado** (el taint mas alto entre todos los miembros) se reporta
  en `team_status` para que la sesion creadora pueda rastrear la exposicion
  general de clasificacion del equipo

::: danger SEGURIDAD Los techos de clasificacion de miembros no pueden exceder
el techo del equipo. Si el techo del equipo es `INTERNAL`, ningun miembro puede
configurarse con un techo `CONFIDENTIAL`. Esto se valida en el momento de la
creacion. :::

## Equipos vs Sub-Agentes

| Aspecto         | Sub-Agente (`subagent`)                    | Equipo (`team_create`)                                        |
| --------------- | ------------------------------------------ | ------------------------------------------------------------- |
| **Duracion**    | Tarea unica, retorna resultado y termina   | Persistente hasta disolver o timeout                          |
| **Miembros**    | Un agente                                  | Multiples agentes con roles distintos                         |
| **Interaccion** | Fire-and-forget desde el padre             | Los miembros se comunican libremente via `sessions_send`      |
| **Coordinacion**| El padre espera el resultado               | El lider coordina, el padre puede verificar via `team_status` |
| **Caso de uso** | Delegacion enfocada de un solo paso        | Colaboracion compleja de multiples roles                      |

**Use sub-agentes** cuando necesite un solo agente para hacer una tarea enfocada
y retornar un resultado. **Use equipos** cuando la tarea se beneficia de
multiples perspectivas especializadas iterando sobre el trabajo de los demas.

::: tip Los equipos son autonomos una vez creados. El agente creador puede
verificar estado y enviar mensajes, pero no necesita microgestionar. El lider
maneja la coordinacion. :::
