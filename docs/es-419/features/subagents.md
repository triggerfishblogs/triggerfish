# Sub-Agentes y Tareas LLM

Los agentes de Triggerfish pueden delegar trabajo a sub-agentes y ejecutar
prompts LLM aislados. Esto permite trabajo en paralelo, razonamiento enfocado y
descomposicion de tareas multi-agente.

## Herramientas

### `subagent`

Generar un sub-agente para una tarea autonoma de multiples pasos. El sub-agente
obtiene su propio contexto de conversacion y puede usar herramientas de forma
independiente. Retorna el resultado final al completarse.

| Parametro | Tipo   | Requerido | Descripcion                                                  |
| --------- | ------ | --------- | ------------------------------------------------------------ |
| `task`    | string | si        | Que debe lograr el sub-agente                                |
| `tools`   | string | no        | Lista de herramientas permitidas separada por comas (predeterminado: herramientas de solo lectura) |

**Herramientas predeterminadas:** Los sub-agentes comienzan con herramientas de
solo lectura (`read_file`, `list_directory`, `search_files`, `run_command`).
Especifique herramientas adicionales explicitamente si el sub-agente necesita
acceso de escritura.

**Ejemplos de uso:**

- Investigar un tema mientras el agente principal continua otro trabajo
- Explorar un codebase en paralelo desde multiples angulos (esto es lo que la
  herramienta `explore` hace internamente)
- Delegar una tarea de implementacion autocontenida

### `llm_task`

Ejecutar un prompt LLM de un solo disparo para razonamiento aislado. El prompt
se ejecuta en un contexto separado y no contamina el historial de la
conversacion principal.

| Parametro | Tipo   | Requerido | Descripcion                                  |
| --------- | ------ | --------- | -------------------------------------------- |
| `prompt`  | string | si        | El prompt a enviar                           |
| `system`  | string | no        | System prompt opcional                       |
| `model`   | string | no        | Override opcional de modelo/proveedor         |

**Ejemplos de uso:**

- Resumir un documento largo sin llenar el contexto principal
- Clasificar o extraer datos de texto estructurado
- Obtener una segunda opinion sobre un enfoque
- Ejecutar un prompt contra un modelo diferente al principal

### `agents_list`

Listar proveedores LLM y agentes configurados. No toma parametros.

Retorna informacion sobre proveedores disponibles, sus modelos y estado de
configuracion.

## Como Funcionan los Sub-Agentes

Cuando el agente llama a `subagent`, Triggerfish:

1. Crea una nueva instancia de orquestador con su propio contexto de
   conversacion
2. Proporciona al sub-agente las herramientas especificadas (predeterminado:
   solo lectura)
3. Envia la tarea como el mensaje de usuario inicial
4. El sub-agente se ejecuta de forma autonoma -- llamando herramientas,
   procesando resultados, iterando
5. Cuando el sub-agente produce una respuesta final, se retorna al agente padre

Los sub-agentes heredan el nivel de taint y restricciones de clasificacion de la
sesion padre. No pueden escalar mas alla del techo del padre.

## Cuando Usar Cada Uno

| Herramienta | Usar Cuando                                                      |
| ----------- | ---------------------------------------------------------------- |
| `subagent`  | Tarea de multiples pasos que requiere uso de herramientas e iteracion |
| `llm_task`  | Razonamiento de un solo disparo, resumen o clasificacion         |
| `explore`   | Comprension de codebase (usa sub-agentes internamente)           |

::: tip La herramienta `explore` esta construida sobre `subagent` -- genera 2-6
sub-agentes paralelos dependiendo del nivel de profundidad. Si necesita
exploracion estructurada de codebase, use `explore` directamente en lugar de
generar sub-agentes manualmente. :::

## Sub-Agentes vs Equipos de Agentes

Los sub-agentes son fire-and-forget: el padre espera un unico resultado. Los
[Equipos de Agentes](./agent-teams) son grupos persistentes de agentes
colaboradores con roles distintos, un coordinador lider y comunicacion entre
miembros. Use sub-agentes para delegacion enfocada de un solo paso. Use equipos
cuando la tarea se beneficia de multiples perspectivas especializadas iterando
sobre el trabajo de los demas.
