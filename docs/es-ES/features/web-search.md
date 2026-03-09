# Búsqueda y obtención web

Triggerfish da a su agente acceso a internet a través de dos herramientas: `web_search` para encontrar información y `web_fetch` para leer páginas web. Juntas permiten al agente investigar temas, buscar documentación, comprobar eventos actuales y extraer datos de la web, todo bajo la misma aplicación de políticas que cualquier otra herramienta.

## Herramientas

### `web_search`

Buscar en la web. Devuelve títulos, URLs y extractos.

| Parámetro     | Tipo   | Obligatorio | Descripción                                                                                      |
| ------------- | ------ | ----------- | ------------------------------------------------------------------------------------------------ |
| `query`       | string | sí          | Consulta de búsqueda. Sea específico -- incluya palabras clave relevantes, nombres o fechas para mejores resultados. |
| `max_results` | number | no          | Resultados máximos a devolver (predeterminado: 5, máximo: 20).                                   |

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

Obtener y extraer contenido legible de una URL. Devuelve texto del artículo por defecto usando Mozilla Readability.

| Parámetro | Tipo   | Obligatorio | Descripción                                                                         |
| --------- | ------ | ----------- | ----------------------------------------------------------------------------------- |
| `url`     | string | sí          | La URL a obtener. Use URLs de los resultados de `web_search`.                       |
| `mode`    | string | no          | Modo de extracción: `readability` (predeterminado, texto del artículo) o `raw` (HTML completo). |

**Modos de extracción:**

- **`readability`** (predeterminado) -- Extrae el contenido principal del artículo, eliminando navegación, anuncios y plantilla. Ideal para artículos de noticias, publicaciones de blog y documentación.
- **`raw`** -- Devuelve el HTML completo. Use cuando la extracción readability devuelve demasiado poco contenido (p. ej., aplicaciones de página única, contenido dinámico).

## Cómo las usa el agente

El agente sigue un patrón de buscar y luego obtener:

1. Usar `web_search` para encontrar URLs relevantes
2. Usar `web_fetch` para leer las páginas más prometedoras
3. Sintetizar la información y citar fuentes

Al responder con información web, el agente cita las URLs de origen en línea para que sean visibles en todos los canales (Telegram, Slack, CLI, etc.).

## Configuración

La búsqueda web requiere un proveedor de búsqueda. Configúrelo en `triggerfish.yaml`:

```yaml
web:
  search:
    provider: brave # Backend de búsqueda (brave es el predeterminado)
    api_key: your-api-key # Clave API de Brave Search
```

| Clave                 | Tipo   | Descripción                                             |
| --------------------- | ------ | ------------------------------------------------------- |
| `web.search.provider` | string | Backend de búsqueda. Actualmente admitido: `brave`.     |
| `web.search.api_key`  | string | Clave API para el proveedor de búsqueda.                |

::: tip Si no se configura ningún proveedor de búsqueda, `web_search` devuelve un mensaje de error indicando al agente que la búsqueda no está disponible. `web_fetch` funciona de forma independiente -- no requiere un proveedor de búsqueda. :::

## Seguridad

- Todas las URLs obtenidas pasan por la prevención de SSRF: se resuelve DNS primero y se comprueba contra una lista de denegación de IP codificada. Los rangos de IP privadas/reservadas siempre se bloquean.
- El contenido obtenido se clasifica y contribuye al taint de sesión como cualquier otra respuesta de herramienta.
- El hook `PRE_TOOL_CALL` se activa antes de cada obtención, y `POST_TOOL_RESPONSE` se activa después, por lo que las reglas de política personalizadas pueden restringir a qué dominios accede el agente.
