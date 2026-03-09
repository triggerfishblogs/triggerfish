# Logging Estructurado

Triggerfish usa logging estructurado con niveles de severidad, rotacion de
archivos y salida configurable. Cada componente -- el gateway, orquestador,
cliente MCP, proveedores LLM, motor de politicas -- registra a traves de un
logger unificado. Esto significa que obtiene un unico flujo de logs consistente
sin importar donde se origina un evento.

## Niveles de Log

La configuracion `logging.level` controla cuanto detalle se captura:

| Valor de Config    | Severidad          | Que se Registra                                          |
| ------------------ | ------------------ | -------------------------------------------------------- |
| `quiet`            | Solo ERROR         | Fallos criticos y crashes                                |
| `normal` (predeterminado) | INFO y superior | Inicio, conexiones, eventos significativos        |
| `verbose`          | DEBUG y superior   | Llamadas a herramientas, decisiones de politica, solicitudes a proveedores |
| `debug`            | TRACE (todo)       | Payloads completos de solicitud/respuesta, streaming a nivel de token |

Cada nivel incluye todo lo de arriba. Configurar `verbose` le da DEBUG, INFO y
ERROR. Configurar `quiet` silencia todo excepto errores.

## Configuracion

Establezca el nivel de log en `triggerfish.yaml`:

```yaml
logging:
  level: normal
```

Esa es la unica configuracion requerida. Los valores predeterminados son
adecuados para la mayoria de los usuarios -- `normal` captura suficiente para
entender que esta haciendo el agente sin inundar el log con ruido.

## Salida de Log

Los logs se escriben a dos destinos simultaneamente:

- **stderr** -- para captura por `journalctl` cuando se ejecuta como servicio
  systemd, o salida directa al terminal durante desarrollo
- **Archivo** -- `~/.triggerfish/logs/triggerfish.log`

Cada linea de log sigue un formato estructurado:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Etiquetas de Componente

La etiqueta entre corchetes identifica que subsistema emitio la entrada de log:

| Etiqueta      | Componente                                   |
| ------------- | -------------------------------------------- |
| `[gateway]`   | Plano de control WebSocket                   |
| `[orch]`      | Orquestador del agente y despacho de herramientas |
| `[mcp]`       | Cliente MCP y proxy de gateway               |
| `[provider]`  | Llamadas a proveedores LLM                   |
| `[policy]`    | Motor de politicas y evaluacion de hooks     |
| `[session]`   | Ciclo de vida de sesion y cambios de taint   |
| `[channel]`   | Adaptadores de canal (Telegram, Slack, etc.) |
| `[scheduler]` | Cron jobs, triggers, webhooks                |
| `[memory]`    | Operaciones del almacen de memoria           |
| `[browser]`   | Automatizacion del navegador (CDP)           |

## Rotacion de Archivos

Los archivos de log se rotan automaticamente para prevenir uso de disco
ilimitado:

- **Umbral de rotacion:** 1 MB por archivo
- **Archivos retenidos:** 10 archivos rotados (total ~10 MB maximo)
- **Verificacion de rotacion:** en cada escritura
- **Nomenclatura:** `triggerfish.1.log`, `triggerfish.2.log`, ...,
  `triggerfish.10.log`

Cuando `triggerfish.log` alcanza 1 MB, se renombra a `triggerfish.1.log`, el
anterior `triggerfish.1.log` se convierte en `triggerfish.2.log`, y asi
sucesivamente. El archivo mas antiguo (`triggerfish.10.log`) se elimina.

## Escrituras Fire-and-Forget

Las escrituras a archivo son no bloqueantes. El logger nunca retrasa el
procesamiento de solicitudes para esperar que una escritura en disco se complete.
Si una escritura falla -- disco lleno, error de permisos, archivo bloqueado --
el error se absorbe silenciosamente.

Esto es intencional. El logging nunca debe hacer fallar la aplicacion ni
ralentizar al agente. La salida stderr sirve como respaldo si las escrituras a
archivo fallan.

## Herramienta de Lectura de Logs

La herramienta `log_read` le da al agente acceso directo al historial de logs
estructurado. El agente puede leer entradas de log recientes, filtrar por
etiqueta de componente o severidad, y diagnosticar problemas sin salir de la
conversacion.

| Parametro   | Tipo   | Requerido | Descripcion                                                   |
| ----------- | ------ | --------- | ------------------------------------------------------------- |
| `lines`     | number | no        | Numero de lineas de log recientes a retornar (predeterminado: 100) |
| `level`     | string | no        | Filtro de severidad minima (`error`, `warn`, `info`, `debug`) |
| `component` | string | no        | Filtrar por etiqueta de componente (ej., `gateway`, `orch`, `provider`) |

::: tip Pregunte a su agente "que errores hubo hoy" o "muestra los logs
recientes del gateway" -- la herramienta `log_read` maneja el filtrado y la
recuperacion. :::

## Ver Logs

### Comandos CLI

```bash
# Ver logs recientes
triggerfish logs

# Transmitir en tiempo real
triggerfish logs --tail

# Acceso directo al archivo
cat ~/.triggerfish/logs/triggerfish.log
```

### Con journalctl

Cuando Triggerfish se ejecuta como servicio systemd, los logs tambien son
capturados por el journal:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs Logging Estructurado

::: info La variable de entorno `TRIGGERFISH_DEBUG=1` aun se soporta por
compatibilidad hacia atras pero se prefiere la configuracion
`logging.level: debug`. Ambas producen salida equivalente -- logging completo a
nivel TRACE de todos los payloads de solicitud/respuesta y estado interno. :::

## Relacionado

- [Comandos CLI](/es-419/guide/commands) -- referencia del comando
  `triggerfish logs`
- [Configuracion](/es-419/guide/configuration) -- esquema completo de
  `triggerfish.yaml`
