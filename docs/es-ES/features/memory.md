# Memoria persistente

Los agentes de Triggerfish tienen memoria persistente entre sesiones. El agente puede guardar hechos, preferencias y contexto que sobreviven entre conversaciones, reinicios e incluso despertares de trigger. La memoria tiene control de clasificación -- el agente no puede leer por encima de su taint de sesión ni escribir por debajo de él.

## Herramientas

### `memory_save`

Guardar un hecho o información en la memoria persistente.

| Parámetro | Tipo   | Obligatorio | Descripción                                                         |
| --------- | ------ | ----------- | ------------------------------------------------------------------- |
| `key`     | string | sí          | Identificador único (p. ej. `user-name`, `project-deadline`)       |
| `content` | string | sí          | El contenido a recordar                                             |
| `tags`    | array  | no          | Etiquetas para categorización (p. ej. `["personal", "preference"]`) |

La clasificación se **establece automáticamente** al nivel de taint de la sesión actual. El agente no puede elegir a qué nivel se almacena una memoria.

### `memory_get`

Recuperar una memoria específica por su clave.

| Parámetro | Tipo   | Obligatorio | Descripción                           |
| --------- | ------ | ----------- | ------------------------------------- |
| `key`     | string | sí          | La clave de la memoria a recuperar    |

Devuelve el contenido de la memoria si existe y es accesible en el nivel de seguridad actual. Las versiones de clasificación superior ocultan las inferiores.

### `memory_search`

Buscar en todas las memorias accesibles usando lenguaje natural.

| Parámetro     | Tipo   | Obligatorio | Descripción                          |
| ------------- | ------ | ----------- | ------------------------------------ |
| `query`       | string | sí          | Consulta de búsqueda en lenguaje natural |
| `max_results` | number | no          | Resultados máximos (predeterminado: 10) |

Utiliza búsqueda de texto completo SQLite FTS5 con stemming. Los resultados se filtran por el nivel de seguridad de la sesión actual.

### `memory_list`

Listar todas las memorias accesibles, opcionalmente filtradas por etiqueta.

| Parámetro | Tipo   | Obligatorio | Descripción            |
| --------- | ------ | ----------- | ---------------------- |
| `tag`     | string | no          | Etiqueta para filtrar  |

### `memory_delete`

Eliminar una memoria por clave. El registro se elimina de forma lógica (oculto pero retenido para auditoría).

| Parámetro | Tipo   | Obligatorio | Descripción                          |
| --------- | ------ | ----------- | ------------------------------------ |
| `key`     | string | sí          | La clave de la memoria a eliminar    |

Solo se pueden eliminar memorias del nivel de seguridad de la sesión actual.

## Cómo funciona la memoria

### Extracción automática

El agente guarda proactivamente hechos importantes que el usuario comparte -- datos personales, contexto de proyectos, preferencias -- usando claves descriptivas. Este es un comportamiento a nivel de prompt guiado por SPINE.md. El LLM elige **qué** guardar; la capa de políticas fuerza **a qué nivel**.

### Control de clasificación

Cada registro de memoria lleva un nivel de clasificación igual al taint de sesión en el momento en que se guardó:

- Una memoria guardada durante una sesión `CONFIDENTIAL` se clasifica como `CONFIDENTIAL`
- Una sesión `PUBLIC` no puede leer memorias `CONFIDENTIAL`
- Una sesión `CONFIDENTIAL` puede leer memorias tanto `CONFIDENTIAL` como `PUBLIC`

Esto se aplica mediante comprobaciones `canFlowTo` en cada operación de lectura. El LLM no puede eludir esto.

### Sombreado de memorias

Cuando la misma clave existe en múltiples niveles de clasificación, solo se devuelve la versión de clasificación más alta visible para la sesión actual. Esto previene la filtración de información a través de los límites de clasificación.

**Ejemplo:** Si `user-name` existe tanto en `PUBLIC` (establecido durante un chat público) como en `INTERNAL` (actualizado durante una sesión privada), una sesión `INTERNAL` ve la versión `INTERNAL`, mientras que una sesión `PUBLIC` solo ve la versión `PUBLIC`.

### Almacenamiento

Las memorias se almacenan vía la interfaz `StorageProvider` (la misma abstracción usada para sesiones, trabajos cron y todos). La búsqueda de texto completo usa SQLite FTS5 para consultas rápidas en lenguaje natural con stemming.

## Seguridad

- La clasificación siempre se fuerza a `session.taint` en el hook `PRE_TOOL_CALL` -- el LLM no puede elegir una clasificación inferior
- Todas las lecturas se filtran por `canFlowTo` -- ninguna memoria por encima del taint de sesión se devuelve jamás
- Las eliminaciones son eliminaciones lógicas -- el registro se oculta pero se retiene para auditoría
- El agente no puede escalar la clasificación de memoria leyendo datos de alta clasificación y volviéndolos a guardar a un nivel inferior (se aplica prevención de escritura descendente)

::: warning SEGURIDAD El LLM nunca elige la clasificación de memoria. Siempre se fuerza al nivel de taint de la sesión actual por la capa de políticas. Este es un límite estricto que no se puede eliminar mediante configuración. :::
