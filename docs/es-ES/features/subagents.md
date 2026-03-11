# Sub-agentes y tareas LLM

Los agentes de Triggerfish pueden delegar trabajo a sub-agentes y ejecutar prompts LLM aislados. Esto habilita trabajo paralelo, razonamiento enfocado y descomposición de tareas multiagente.

## Herramientas

### `subagent`

Crear un sub-agente para una tarea autónoma de múltiples pasos. El sub-agente obtiene su propio contexto de conversación y puede usar herramientas de forma independiente. Devuelve el resultado final cuando termina.

| Parámetro | Tipo   | Obligatorio | Descripción                                                     |
| --------- | ------ | ----------- | --------------------------------------------------------------- |
| `task`    | string | sí          | Qué debe lograr el sub-agente                                  |
| `tools`   | string | no          | Lista de herramientas permitidas separadas por comas (predeterminado: solo lectura) |

**Herramientas predeterminadas:** los sub-agentes comienzan con herramientas de solo lectura (`read_file`, `list_directory`, `search_files`, `run_command`). Especifique herramientas adicionales explícitamente si el sub-agente necesita acceso de escritura.

**Ejemplos de uso:**

- Investigar un tema mientras el agente principal continúa con otro trabajo
- Explorar un repositorio en paralelo desde múltiples ángulos (esto es lo que la herramienta `explore` hace internamente)
- Delegar una tarea de implementación autocontenida

### `llm_task`

Ejecutar un prompt LLM de un solo disparo para razonamiento aislado. El prompt se ejecuta en un contexto separado y no contamina el historial de conversación principal.

| Parámetro | Tipo   | Obligatorio | Descripción                                      |
| --------- | ------ | ----------- | ------------------------------------------------ |
| `prompt`  | string | sí          | El prompt a enviar                               |
| `system`  | string | no          | Prompt del sistema opcional                      |
| `model`   | string | no          | Nombre de modelo/proveedor alternativo opcional  |

**Ejemplos de uso:**

- Resumir un documento largo sin llenar el contexto principal
- Clasificar o extraer datos de texto estructurado
- Obtener una segunda opinión sobre un enfoque
- Ejecutar un prompt contra un modelo diferente al principal

### `agents_list`

Listar proveedores LLM y agentes configurados. No toma parámetros.

Devuelve información sobre proveedores disponibles, sus modelos y estado de configuración.

## Cómo funcionan los sub-agentes

Cuando el agente llama a `subagent`, Triggerfish:

1. Crea una nueva instancia de orquestador con su propio contexto de conversación
2. Proporciona al sub-agente las herramientas especificadas (predeterminado: solo lectura)
3. Envía la tarea como el mensaje inicial del usuario
4. El sub-agente se ejecuta de forma autónoma -- llamando herramientas, procesando resultados, iterando
5. Cuando el sub-agente produce una respuesta final, se devuelve al agente padre

Los sub-agentes heredan el nivel de taint y las restricciones de clasificación de la sesión padre. No pueden escalar por encima del techo del padre.

## Cuándo usar cada uno

| Herramienta | Cuándo usar                                                          |
| ----------- | -------------------------------------------------------------------- |
| `subagent`  | Tarea de múltiples pasos que requiere uso de herramientas e iteración |
| `llm_task`  | Razonamiento de un solo disparo, resumen o clasificación             |
| `explore`   | Comprensión de código (usa sub-agentes internamente)                 |

::: tip La herramienta `explore` está construida sobre `subagent` -- crea entre 2 y 6 sub-agentes paralelos dependiendo del nivel de profundidad. Si necesita exploración estructurada de código, use `explore` directamente en lugar de crear sub-agentes manualmente. :::

## Sub-agentes vs equipos de agentes

Los sub-agentes son de tipo disparar y olvidar: el padre espera un único resultado. Los [equipos de agentes](./agent-teams) son grupos persistentes de agentes colaboradores con roles distintos, un coordinador líder y comunicación entre miembros. Use sub-agentes para delegación enfocada de un solo paso. Use equipos cuando la tarea se beneficia de múltiples perspectivas especializadas que iteran sobre el trabajo de los demás.
