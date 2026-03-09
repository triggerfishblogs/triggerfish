# Exploracion de Codigo

La herramienta `explore` le da al agente comprension rapida y estructurada de
codebases y directorios. En lugar de llamar manualmente a `read_file`,
`list_directory` y `search_files` en secuencia, el agente llama a `explore` una
vez y obtiene un reporte estructurado producido por sub-agentes paralelos.

## Herramienta

### `explore`

Explorar un directorio o codebase para entender estructura, patrones y
convenciones. Solo lectura.

| Parametro | Tipo   | Requerido | Descripcion                                                 |
| --------- | ------ | --------- | ----------------------------------------------------------- |
| `path`    | string | si        | Directorio o archivo a explorar                             |
| `focus`   | string | no        | Que buscar (ej. "patrones de auth", "estructura de tests")  |
| `depth`   | string | no        | Que tan exhaustivo: `shallow`, `standard` (predeterminado), o `deep` |

## Niveles de Profundidad

| Profundidad | Agentes Generados | Que se Analiza                                                |
| ----------- | ----------------- | ------------------------------------------------------------- |
| `shallow`   | 2                 | Arbol de directorios + manifiestos de dependencias            |
| `standard`  | 3-4               | Arbol + manifiestos + patrones de codigo + focus (si se especifica) |
| `deep`      | 5-6               | Todo lo anterior + trazado de grafos de imports + historial git |

## Como Funciona

La herramienta explore genera sub-agentes paralelos, cada uno enfocado en una
faceta diferente:

1. **Agente de arbol** -- Mapea la estructura de directorios (3 niveles de
   profundidad), identifica archivos clave por convencion (`mod.ts`, `main.ts`,
   `deno.json`, `README.md`, etc.)
2. **Agente de manifiesto** -- Lee archivos de dependencias (`deno.json`,
   `package.json`, `tsconfig.json`), lista dependencias, scripts y puntos de
   entrada
3. **Agente de patrones** -- Muestrea archivos fuente para detectar patrones de
   codigo: estructura de modulos, manejo de errores, convenciones de tipos,
   estilo de imports, nomenclatura, testing
4. **Agente de focus** -- Busca archivos y patrones relacionados con la
   consulta de focus
5. **Agente de imports** (solo deep) -- Traza grafos de imports desde puntos de
   entrada, detecta dependencias circulares
6. **Agente de git** (solo deep) -- Analiza commits recientes, rama actual,
   cambios no confirmados

Todos los agentes se ejecutan concurrentemente. Los resultados se ensamblan en
un `ExploreResult` estructurado:

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n\u251c\u2500\u2500 types/\n\u2502   \u251c\u2500\u2500 classification.ts\n\u2502   ...",
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

## Cuando el Agente la Usa

El agente esta instruido para usar `explore` en estas situaciones:

- Antes de modificar codigo desconocido
- Cuando se le pregunta "que hace esto" o "como esta estructurado"
- Al inicio de cualquier tarea no trivial que involucre codigo existente
- Cuando necesita encontrar el archivo correcto o patron a seguir

Despues de explorar, el agente hace referencia a los patrones y convenciones que
encontro al escribir nuevo codigo, asegurando consistencia con el codebase
existente.

## Ejemplos

```
# Vista rapida de un directorio
explore({ path: "src/auth" })

# Busqueda enfocada de patrones especificos
explore({ path: "src/auth", focus: "how tokens are validated" })

# Analisis profundo incluyendo historial git y grafos de imports
explore({ path: "src/core", depth: "deep" })

# Entender convenciones de tests antes de escribir tests
explore({ path: "tests/", focus: "test patterns and assertions" })
```
