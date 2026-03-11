# Registro estructurado

Triggerfish utiliza registro estructurado con niveles de severidad, rotación de archivos y salida configurable. Cada componente -- el Gateway, el orquestador, el cliente MCP, los proveedores LLM, el motor de políticas -- registra a través de un logger unificado. Esto significa que se obtiene un flujo de registros único y consistente independientemente de dónde se origine un evento.

## Niveles de registro

El ajuste `logging.level` controla cuánto detalle se captura:

| Valor de configuración | Severidad          | Qué se registra                                       |
| ---------------------- | ------------------ | ----------------------------------------------------- |
| `quiet`                | Solo ERROR         | Fallos catastróficos y errores críticos               |
| `normal` (predeterminado) | INFO y superior | Arranque, conexiones, eventos significativos          |
| `verbose`              | DEBUG y superior   | Llamadas a herramientas, decisiones de políticas, solicitudes a proveedores |
| `debug`                | TRACE (todo)       | Cargas completas de solicitud/respuesta, streaming a nivel de token |

Cada nivel incluye todo lo que está por encima. Establecer `verbose` proporciona DEBUG, INFO y ERROR. Establecer `quiet` silencia todo excepto los errores.

## Configuración

Establezca el nivel de registro en `triggerfish.yaml`:

```yaml
logging:
  level: normal
```

Esa es la única configuración necesaria. Los valores predeterminados son adecuados para la mayoría de los usuarios -- `normal` captura suficiente para entender lo que hace el agente sin inundar el registro con ruido.

## Salida de registros

Los registros se escriben en dos destinos simultáneamente:

- **stderr** -- para captura con `journalctl` cuando se ejecuta como servicio systemd, o salida directa al terminal durante el desarrollo
- **Archivo** -- `~/.triggerfish/logs/triggerfish.log`

Cada línea de registro sigue un formato estructurado:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Etiquetas de componente

La etiqueta entre corchetes identifica qué subsistema emitió la entrada de registro:

| Etiqueta      | Componente                                |
| ------------- | ----------------------------------------- |
| `[gateway]`   | Plano de control WebSocket                |
| `[orch]`      | Orquestador de agente y despacho de herramientas |
| `[mcp]`       | Cliente MCP y proxy del Gateway           |
| `[provider]`  | Llamadas a proveedores LLM               |
| `[policy]`    | Motor de políticas y evaluación de hooks  |
| `[session]`   | Ciclo de vida de sesión y cambios de taint |
| `[channel]`   | Adaptadores de canal (Telegram, Slack, etc.) |
| `[scheduler]` | Trabajos cron, triggers, webhooks         |
| `[memory]`    | Operaciones de almacén de memoria         |
| `[browser]`   | Automatización de navegador (CDP)         |

## Rotación de archivos

Los archivos de registro se rotan automáticamente para prevenir el uso ilimitado de disco:

- **Umbral de rotación:** 1 MB por archivo
- **Archivos retenidos:** 10 archivos rotados (total ~10 MB máximo)
- **Comprobación de rotación:** en cada escritura
- **Nomenclatura:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

Cuando `triggerfish.log` alcanza 1 MB, se renombra a `triggerfish.1.log`, el anterior `triggerfish.1.log` se convierte en `triggerfish.2.log`, y así sucesivamente. El archivo más antiguo (`triggerfish.10.log`) se elimina.

## Escrituras sin bloqueo

Las escrituras a archivo no son bloqueantes. El logger nunca retrasa el procesamiento de solicitudes para esperar a que se complete una escritura en disco. Si una escritura falla -- disco lleno, error de permisos, archivo bloqueado -- el error se absorbe silenciosamente.

Esto es intencional. El registro nunca debe hacer fallar la aplicación ni ralentizar al agente. La salida por stderr sirve como respaldo si las escrituras a archivo fallan.

## Herramienta de lectura de registros

La herramienta `log_read` proporciona al agente acceso directo al historial de registros estructurados. El agente puede leer entradas de registro recientes, filtrar por etiqueta de componente o severidad, y diagnosticar problemas sin salir de la conversación.

| Parámetro   | Tipo   | Obligatorio | Descripción                                                         |
| ----------- | ------ | ----------- | ------------------------------------------------------------------- |
| `lines`     | number | no          | Número de líneas de registro recientes a devolver (predeterminado: 100) |
| `level`     | string | no          | Filtro de severidad mínima (`error`, `warn`, `info`, `debug`)       |
| `component` | string | no          | Filtrar por etiqueta de componente (p. ej., `gateway`, `orch`, `provider`) |

::: tip Pregunte a su agente "qué errores hubo hoy" o "muéstrame los registros recientes del gateway" -- la herramienta `log_read` gestiona el filtrado y la recuperación. :::

## Visualización de registros

### Comandos CLI

```bash
# Ver registros recientes
triggerfish logs

# Transmitir en tiempo real
triggerfish logs --tail

# Acceso directo al archivo
cat ~/.triggerfish/logs/triggerfish.log
```

### Con journalctl

Cuando Triggerfish se ejecuta como servicio systemd, los registros también se capturan en el journal:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs registro estructurado

::: info La variable de entorno `TRIGGERFISH_DEBUG=1` sigue siendo compatible por retrocompatibilidad, pero se prefiere la configuración `logging.level: debug`. Ambas producen una salida equivalente: registro completo de nivel TRACE de todas las cargas de solicitud/respuesta y estado interno. :::

## Relacionado

- [Comandos CLI](/es-ES/guide/commands) -- referencia del comando `triggerfish logs`
- [Configuración](/es-ES/guide/configuration) -- esquema completo de `triggerfish.yaml`
