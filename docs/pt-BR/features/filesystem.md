# Herramientas de Sistema de Archivos y Shell

Triggerfish proporciona al agente herramientas de proposito general de sistema de
archivos y shell para leer, escribir, buscar y ejecutar comandos. Estas son las
herramientas fundamentales sobre las que otras capacidades (entorno de ejecucion,
explore, skills) se construyen.

## Herramientas

### `read_file`

Leer el contenido de un archivo en una ruta absoluta.

| Parametro | Tipo   | Requerido | Descripcion                    |
| --------- | ------ | --------- | ------------------------------ |
| `path`    | string | si        | Ruta absoluta del archivo a leer |

Retorna el contenido de texto completo del archivo.

### `write_file`

Escribir contenido a un archivo en una ruta relativa al workspace.

| Parametro | Tipo   | Requerido | Descripcion                       |
| --------- | ------ | --------- | --------------------------------- |
| `path`    | string | si        | Ruta relativa en el workspace     |
| `content` | string | si        | Contenido del archivo a escribir  |

Las escrituras estan limitadas al directorio de workspace del agente. El agente
no puede escribir en ubicaciones arbitrarias del sistema de archivos.

### `edit_file`

Reemplazar un string unico en un archivo. El `old_text` debe aparecer
exactamente una vez en el archivo.

| Parametro  | Tipo   | Requerido | Descripcion                                       |
| ---------- | ------ | --------- | ------------------------------------------------- |
| `path`     | string | si        | Ruta absoluta del archivo a editar                |
| `old_text` | string | si        | Texto exacto a encontrar (debe ser unico en el archivo) |
| `new_text` | string | si        | Texto de reemplazo                                |

Esta es una herramienta de edicion quirurgica -- encuentra una coincidencia
exacta y la reemplaza. Si el texto aparece mas de una vez o no aparece, la
operacion falla con un error.

### `list_directory`

Listar archivos y directorios en una ruta absoluta dada.

| Parametro | Tipo   | Requerido | Descripcion                            |
| --------- | ------ | --------- | -------------------------------------- |
| `path`    | string | si        | Ruta absoluta del directorio a listar  |

Retorna entradas con sufijo `/` para directorios.

### `search_files`

Buscar archivos que coincidan con un patron glob, o buscar contenido de archivos
con grep.

| Parametro        | Tipo    | Requerido | Descripcion                                                          |
| ---------------- | ------- | --------- | -------------------------------------------------------------------- |
| `path`           | string  | si        | Directorio donde buscar                                              |
| `pattern`        | string  | si        | Patron glob para nombres de archivo, o texto/regex para buscar dentro de archivos |
| `content_search` | boolean | no        | Si es `true`, buscar contenido de archivos en lugar de nombres       |

### `run_command`

Ejecutar un comando de shell en el directorio de workspace del agente.

| Parametro | Tipo   | Requerido | Descripcion                 |
| --------- | ------ | --------- | --------------------------- |
| `command` | string | si        | Comando de shell a ejecutar |

Retorna stdout, stderr y codigo de salida. Los comandos se ejecutan en el
directorio de workspace del agente. El hook `PRE_TOOL_CALL` verifica los
comandos contra una lista de denegacion antes de la ejecucion.

## Relacion con Otras Herramientas

Estas herramientas de sistema de archivos se superponen con las herramientas del
[Entorno de Ejecucion](../integrations/exec-environment) (`exec.write`,
`exec.read`, `exec.run`, `exec.ls`). La distincion:

- Las **herramientas de sistema de archivos** operan en rutas absolutas y el
  workspace predeterminado del agente. Siempre estan disponibles.
- Las **herramientas exec** operan dentro de un workspace estructurado con
  aislamiento explicito, ejecutores de tests e instalacion de paquetes. Son
  parte de la integracion del entorno de ejecucion.

El agente usa herramientas de sistema de archivos para operaciones generales de
archivos y herramientas exec cuando trabaja en un flujo de desarrollo (ciclo
escribir/ejecutar/corregir).

## Seguridad

- `write_file` esta limitado al directorio de workspace del agente
- `run_command` pasa por el hook `PRE_TOOL_CALL` con el comando como contexto
- Una lista de denegacion de comandos bloquea operaciones peligrosas (`rm -rf /`,
  `sudo`, etc.)
- Todas las respuestas de herramientas pasan por `POST_TOOL_RESPONSE` para
  clasificacion y seguimiento de taint
- En modo plan, `write_file` se bloquea hasta que el plan sea aprobado
