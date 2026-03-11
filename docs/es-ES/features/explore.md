# Exploración de código

La herramienta `explore` proporciona al agente una comprensión rápida y
estructurada de repositorios y directorios. En lugar de llamar manualmente a
`read_file`, `list_directory` y `search_files` en secuencia, el agente llama a
`explore` una vez y obtiene un informe estructurado producido por sub-agentes
paralelos.

## Herramienta

### `explore`

Explore un directorio o repositorio para entender su estructura, patrones y
convenciones. Solo lectura.

| Parámetro | Tipo   | Obligatorio | Descripción                                                         |
| --------- | ------ | ----------- | ------------------------------------------------------------------- |
| `path`    | string | sí          | Directorio o archivo a explorar                                     |
| `focus`   | string | no          | Qué buscar (p. ej. "patrones de autenticación", "estructura de pruebas") |
| `depth`   | string | no          | Nivel de detalle: `shallow`, `standard` (predeterminado), o `deep`  |

## Niveles de profundidad

| Profundidad | Agentes creados | Qué se analiza                                              |
| ----------- | --------------- | ----------------------------------------------------------- |
| `shallow`   | 2               | Árbol de directorios + manifiestos de dependencias          |
| `standard`  | 3-4             | Árbol + manifiestos + patrones de código + foco (si se especifica) |
| `deep`      | 5-6             | Todo lo anterior + trazado de grafo de imports + historial de git |

## Cómo funciona

La herramienta explore crea sub-agentes paralelos, cada uno enfocado en una
faceta diferente:

1. **Agente de árbol** -- Mapea la estructura de directorios (3 niveles de
   profundidad), identifica archivos clave por convención (`mod.ts`, `main.ts`,
   `deno.json`, `README.md`, etc.)
2. **Agente de manifiesto** -- Lee archivos de dependencias (`deno.json`,
   `package.json`, `tsconfig.json`), lista dependencias, scripts y puntos de
   entrada
3. **Agente de patrones** -- Muestrea archivos fuente para detectar patrones de
   código: estructura de módulos, manejo de errores, convenciones de tipos,
   estilo de import, nomenclatura, pruebas
4. **Agente de foco** -- Busca archivos y patrones relacionados con la consulta
   de foco
5. **Agente de imports** (solo deep) -- Rastrea grafos de imports desde puntos
   de entrada, detecta dependencias circulares
6. **Agente de git** (solo deep) -- Analiza commits recientes, rama actual,
   cambios sin confirmar

Todos los agentes se ejecutan de forma concurrente. Los resultados se ensamblan
en un `ExploreResult` estructurado:

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Classification levels" }
  ],
  "patterns": [
    { "name": "Result pattern", "description": "Uses Result<T,E> for error handling", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Core module with classification types, policy engine, and session management."
}
```

## Cuándo lo usa el agente

El agente está instruido para usar `explore` en estas situaciones:

- Antes de modificar código desconocido
- Cuando se le pregunta "qué hace esto" o "cómo está estructurado"
- Al inicio de cualquier tarea no trivial que involucre código existente
- Cuando necesita encontrar el archivo o patrón correcto a seguir

Después de explorar, el agente hace referencia a los patrones y convenciones que
encontró al escribir código nuevo, asegurando consistencia con el repositorio
existente.

## Ejemplos

```
# Vista rápida de un directorio
explore({ path: "src/auth" })

# Búsqueda enfocada de patrones específicos
explore({ path: "src/auth", focus: "how tokens are validated" })

# Análisis profundo incluyendo historial de git y grafos de imports
explore({ path: "src/core", depth: "deep" })

# Entender convenciones de pruebas antes de escribir pruebas
explore({ path: "tests/", focus: "test patterns and assertions" })
```
