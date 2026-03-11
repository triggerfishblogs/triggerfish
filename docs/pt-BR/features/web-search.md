# Busqueda Web y Fetch

Triggerfish le da a su agente acceso a internet a traves de dos herramientas:
`web_search` para encontrar informacion y `web_fetch` para leer paginas web.
Juntas permiten que el agente investigue temas, busque documentacion, verifique
eventos actuales y extraiga datos de la web -- todo bajo el mismo cumplimiento
de politicas que cualquier otra herramienta.

## Herramientas

### `web_search`

Buscar en la web. Retorna titulos, URLs y fragmentos.

| Parametro     | Tipo   | Requerido | Descripcion                                                                                        |
| ------------- | ------ | --------- | -------------------------------------------------------------------------------------------------- |
| `query`       | string | si        | Consulta de busqueda. Sea especifico -- incluya palabras clave, nombres o fechas relevantes para mejores resultados. |
| `max_results` | number | no        | Resultados maximos a retornar (predeterminado: 5, maximo: 20).                                     |

**Ejemplo de respuesta:**

```
Search results for "deno sqlite module":

1. @db/sqlite - Deno SQLite bindings
   https://jsr.io/@db/sqlite
   Fast SQLite3 bindings for Deno using FFI...

2. Deno SQLite Guide
   https://docs.deno.com/examples/sqlite
   How to use SQLite with Deno...
```

### `web_fetch`

Obtener y extraer contenido legible de una URL. Retorna texto del articulo por
defecto usando Mozilla Readability.

| Parametro | Tipo   | Requerido | Descripcion                                                                          |
| --------- | ------ | --------- | ------------------------------------------------------------------------------------ |
| `url`     | string | si        | La URL a obtener. Use URLs de resultados de `web_search`.                            |
| `mode`    | string | no        | Modo de extraccion: `readability` (predeterminado, texto del articulo) o `raw` (HTML completo). |

**Modos de extraccion:**

- **`readability`** (predeterminado) -- Extrae el contenido principal del
  articulo, eliminando navegacion, anuncios y texto repetitivo. Mejor para
  articulos de noticias, posts de blog y documentacion.
- **`raw`** -- Retorna el HTML completo. Use cuando la extraccion readability
  retorna muy poco contenido (ej., aplicaciones de una sola pagina, contenido
  dinamico).

## Como el Agente las Usa

El agente sigue un patron de buscar-luego-obtener:

1. Usa `web_search` para encontrar URLs relevantes
2. Usa `web_fetch` para leer las paginas mas prometedoras
3. Sintetiza la informacion y cita fuentes

Al responder con informacion web, el agente cita URLs de fuentes en linea para
que sean visibles en todos los canales (Telegram, Slack, CLI, etc.).

## Configuracion

La busqueda web requiere un proveedor de busqueda. Configurelo en
`triggerfish.yaml`:

```yaml
web:
  search:
    provider: brave # Backend de busqueda (brave es el predeterminado)
    api_key: your-api-key # API key de Brave Search
```

| Clave                 | Tipo   | Descripcion                                      |
| --------------------- | ------ | ------------------------------------------------ |
| `web.search.provider` | string | Backend de busqueda. Actualmente soportado: `brave`. |
| `web.search.api_key`  | string | API key para el proveedor de busqueda.           |

::: tip Si no se configura un proveedor de busqueda, `web_search` retorna un
mensaje de error indicando al agente que la busqueda no esta disponible.
`web_fetch` funciona independientemente -- no requiere un proveedor de busqueda.
:::

## Seguridad

- Todas las URLs obtenidas pasan por prevencion SSRF: el DNS se resuelve
  primero y se verifica contra una lista de denegacion de IPs hardcodeada. Los
  rangos de IP privadas/reservadas siempre se bloquean.
- El contenido obtenido se clasifica y contribuye al taint de sesion como
  cualquier otra respuesta de herramienta.
- El hook `PRE_TOOL_CALL` se dispara antes de cada fetch, y
  `POST_TOOL_RESPONSE` se dispara despues, para que reglas de politica
  personalizadas puedan restringir a que dominios accede el agente.
