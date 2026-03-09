# Herramientas de sistema de archivos y shell

Triggerfish proporciona al agente herramientas de propósito general para el
sistema de archivos y shell para leer, escribir, buscar y ejecutar comandos.
Estas son las herramientas fundamentales sobre las que se construyen otras
capacidades (entorno de ejecución, explore, skills).

## Herramientas

### `read_file`

Leer el contenido de un archivo en una ruta absoluta.

| Parámetro | Tipo   | Obligatorio | Descripción                     |
| --------- | ------ | ----------- | ------------------------------- |
| `path`    | string | sí          | Ruta absoluta del archivo a leer |

Devuelve el contenido de texto completo del archivo.

### `write_file`

Escribir contenido en un archivo en una ruta relativa al workspace.

| Parámetro | Tipo   | Obligatorio | Descripción                         |
| --------- | ------ | ----------- | ----------------------------------- |
| `path`    | string | sí          | Ruta relativa en el workspace       |
| `content` | string | sí          | Contenido del archivo a escribir    |

Las escrituras están limitadas al directorio del workspace del agente. El agente
no puede escribir en ubicaciones arbitrarias del sistema de archivos.

### `edit_file`

Reemplazar una cadena única en un archivo. El `old_text` debe aparecer
exactamente una vez en el archivo.

| Parámetro  | Tipo   | Obligatorio | Descripción                                        |
| ---------- | ------ | ----------- | -------------------------------------------------- |
| `path`     | string | sí          | Ruta absoluta del archivo a editar                 |
| `old_text` | string | sí          | Texto exacto a buscar (debe ser único en el archivo) |
| `new_text` | string | sí          | Texto de reemplazo                                 |

Esta es una herramienta de edición quirúrgica: encuentra una coincidencia exacta
y la reemplaza. Si el texto aparece más de una vez o no aparece, la operación
falla con un error.

### `list_directory`

Listar archivos y directorios en una ruta absoluta dada.

| Parámetro | Tipo   | Obligatorio | Descripción                            |
| --------- | ------ | ----------- | -------------------------------------- |
| `path`    | string | sí          | Ruta absoluta del directorio a listar  |

Devuelve entradas con sufijo `/` para directorios.

### `search_files`

Buscar archivos que coincidan con un patrón glob, o buscar contenido de archivos
con grep.

| Parámetro        | Tipo    | Obligatorio | Descripción                                                            |
| ---------------- | ------- | ----------- | ---------------------------------------------------------------------- |
| `path`           | string  | sí          | Directorio en el que buscar                                            |
| `pattern`        | string  | sí          | Patrón glob para nombres de archivo, o texto/regex para buscar dentro  |
| `content_search` | boolean | no          | Si es `true`, buscar dentro del contenido de archivos                  |

### `run_command`

Ejecutar un comando de shell en el directorio del workspace del agente.

| Parámetro | Tipo   | Obligatorio | Descripción                  |
| --------- | ------ | ----------- | ---------------------------- |
| `command` | string | sí          | Comando de shell a ejecutar  |

Devuelve stdout, stderr y código de salida. Los comandos se ejecutan en el
directorio del workspace del agente. El hook `PRE_TOOL_CALL` comprueba los
comandos contra una lista de denegación antes de la ejecución.

## Relación con otras herramientas

Estas herramientas de sistema de archivos se superponen con las herramientas del
[entorno de ejecución](/es-ES/integrations/exec-environment) (`exec.write`,
`exec.read`, `exec.run`, `exec.ls`). La distinción:

- **Herramientas de sistema de archivos** operan sobre rutas absolutas y el
  workspace predeterminado del agente. Siempre están disponibles.
- **Herramientas exec** operan dentro de un workspace estructurado con
  aislamiento explícito, ejecutores de pruebas e instalación de paquetes. Son
  parte de la integración del entorno de ejecución.

El agente usa herramientas de sistema de archivos para operaciones generales de
archivo y herramientas exec cuando trabaja en un flujo de desarrollo
(escribir/ejecutar/corregir).

## Seguridad

- `write_file` está limitado al directorio del workspace del agente
- `run_command` pasa por el hook `PRE_TOOL_CALL` con el comando como contexto
- Una lista de denegación de comandos bloquea operaciones peligrosas (`rm -rf /`,
  `sudo`, etc.)
- Todas las respuestas de herramientas pasan por `POST_TOOL_RESPONSE` para
  clasificación y seguimiento de taint
- En modo plan, `write_file` se bloquea hasta que el plan sea aprobado
