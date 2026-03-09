# Memoria Persistente

Los agentes de Triggerfish tienen memoria persistente entre sesiones. El agente
puede guardar datos, preferencias y contexto que sobreviven entre
conversaciones, reinicios e incluso despertares de triggers. La memoria tiene
control de clasificacion -- el agente no puede leer por encima de su taint de
sesion ni escribir por debajo de el.

## Herramientas

### `memory_save`

Guardar un dato o pieza de informacion en memoria persistente.

| Parametro | Tipo   | Requerido | Descripcion                                                 |
| --------- | ------ | --------- | ----------------------------------------------------------- |
| `key`     | string | si        | Identificador unico (ej. `user-name`, `project-deadline`)   |
| `content` | string | si        | El contenido a recordar                                     |
| `tags`    | array  | no        | Etiquetas para categorizacion (ej. `["personal", "preference"]`) |

La clasificacion se **establece automaticamente** al nivel de taint de la sesion
actual. El agente no puede elegir a que nivel se almacena una memoria.

### `memory_get`

Recuperar una memoria especifica por su clave.

| Parametro | Tipo   | Requerido | Descripcion                              |
| --------- | ------ | --------- | ---------------------------------------- |
| `key`     | string | si        | La clave de la memoria a recuperar       |

Retorna el contenido de la memoria si existe y es accesible al nivel de
seguridad actual. Las versiones de mayor clasificacion ocultan a las de menor.

### `memory_search`

Buscar en todas las memorias accesibles usando lenguaje natural.

| Parametro     | Tipo   | Requerido | Descripcion                      |
| ------------- | ------ | --------- | -------------------------------- |
| `query`       | string | si        | Consulta de busqueda en lenguaje natural |
| `max_results` | number | no        | Resultados maximos (predeterminado: 10) |

Usa busqueda de texto completo SQLite FTS5 con stemming. Los resultados se
filtran por el nivel de seguridad de la sesion actual.

### `memory_list`

Listar todas las memorias accesibles, opcionalmente filtradas por etiqueta.

| Parametro | Tipo   | Requerido | Descripcion           |
| --------- | ------ | --------- | --------------------- |
| `tag`     | string | no        | Etiqueta para filtrar |

### `memory_delete`

Eliminar una memoria por clave. El registro se elimina de forma suave (oculto
pero retenido para auditoria).

| Parametro | Tipo   | Requerido | Descripcion                        |
| --------- | ------ | --------- | ---------------------------------- |
| `key`     | string | si        | La clave de la memoria a eliminar  |

Solo puede eliminar memorias al nivel de seguridad de la sesion actual.

## Como Funciona la Memoria

### Extraccion Automatica

El agente guarda proactivamente datos importantes que el usuario comparte --
detalles personales, contexto de proyecto, preferencias -- usando claves
descriptivas. Este es comportamiento a nivel de prompt guiado por SPINE.md. El
LLM elige **que** guardar; la capa de politicas fuerza **a que nivel**.

### Control de Clasificacion

Cada registro de memoria lleva un nivel de clasificacion igual al taint de la
sesion en el momento en que fue guardado:

- Una memoria guardada durante una sesion `CONFIDENTIAL` se clasifica como
  `CONFIDENTIAL`
- Una sesion `PUBLIC` no puede leer memorias `CONFIDENTIAL`
- Una sesion `CONFIDENTIAL` puede leer tanto memorias `CONFIDENTIAL` como
  `PUBLIC`

Esto se aplica mediante verificaciones `canFlowTo` en cada operacion de lectura.
El LLM no puede evadir esto.

### Sombreado de Memoria

Cuando la misma clave existe en multiples niveles de clasificacion, solo se
retorna la version de mayor clasificacion visible para la sesion actual. Esto
previene fugas de informacion a traves de limites de clasificacion.

**Ejemplo:** Si `user-name` existe tanto en `PUBLIC` (establecido durante un
chat publico) como en `INTERNAL` (actualizado durante una sesion privada), una
sesion `INTERNAL` ve la version `INTERNAL`, mientras que una sesion `PUBLIC` ve
solo la version `PUBLIC`.

### Almacenamiento

Las memorias se almacenan via la interfaz `StorageProvider` (la misma
abstraccion usada para sesiones, cron jobs y todos). La busqueda de texto
completo usa SQLite FTS5 para consultas rapidas en lenguaje natural con
stemming.

## Seguridad

- La clasificacion siempre se fuerza a `session.taint` en el hook
  `PRE_TOOL_CALL` -- el LLM no puede elegir una clasificacion menor
- Todas las lecturas se filtran por `canFlowTo` -- nunca se retorna ninguna
  memoria por encima del taint de sesion
- Las eliminaciones son eliminaciones suaves -- el registro se oculta pero se
  retiene para auditoria
- El agente no puede escalar la clasificacion de memoria leyendo datos de alta
  clasificacion y volviendolos a guardar a un nivel menor (se aplica prevencion
  de write-down)

::: warning SEGURIDAD El LLM nunca elige la clasificacion de memoria. Siempre
se fuerza al nivel de taint de la sesion actual por la capa de politicas. Este
es un limite duro que no puede configurarse para eliminarse. :::
