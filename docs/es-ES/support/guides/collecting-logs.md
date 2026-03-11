# Recopilación de registros

Al reportar un fallo, un paquete de registros proporciona a los mantenedores la información necesaria para diagnosticar el problema sin intercambiar múltiples mensajes pidiendo detalles.

## Paquete rápido

La forma más rápida de crear un paquete de registros:

```bash
triggerfish logs bundle
```

Esto crea un archivo que contiene todos los ficheros de registro de `~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Si el archivado falla por cualquier motivo, recurre a copiar los ficheros de registro sin comprimir a un directorio que puede comprimir manualmente.

## Qué contiene el paquete

- `triggerfish.log` (fichero de registro actual)
- `triggerfish.1.log` a `triggerfish.10.log` (copias de seguridad rotadas, si existen)

El paquete **no** contiene:
- Su fichero de configuración `triggerfish.yaml`
- Claves secretas o credenciales
- La base de datos SQLite
- SPINE.md o TRIGGER.md

## Recopilación manual de registros

Si el comando bundle no está disponible (versión antigua, Docker, etc.):

```bash
# Localizar los ficheros de registro
ls ~/.triggerfish/logs/

# Crear un archivo manualmente
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Aumentar el detalle de los registros

Por defecto, los registros están a nivel INFO. Para capturar más detalle para un informe de fallos:

1. Establezca el nivel de registro a verbose o debug:
   ```bash
   triggerfish config set logging.level verbose
   # o para máximo detalle:
   triggerfish config set logging.level debug
   ```

2. Reproduzca el problema

3. Recopile el paquete:
   ```bash
   triggerfish logs bundle
   ```

4. Restablezca el nivel a normal:
   ```bash
   triggerfish config set logging.level normal
   ```

### Detalle por nivel de registro

| Nivel | Qué captura |
|-------|-------------|
| `quiet` | Solo errores |
| `normal` | Errores, advertencias, información (por defecto) |
| `verbose` | Añade mensajes de depuración (llamadas a herramientas, interacciones con proveedores, decisiones de clasificación) |
| `debug` | Todo incluyendo mensajes de nivel trace (datos de protocolo sin procesar, cambios de estado interno) |

**Advertencia:** El nivel `debug` genera mucha salida. Solo utilícelo cuando esté reproduciendo activamente un problema, luego vuelva a cambiarlo.

## Filtrado de registros en tiempo real

Mientras reproduce un problema, puede filtrar el flujo de registros en vivo:

```bash
# Mostrar solo errores
triggerfish logs --level ERROR

# Mostrar advertencias y superiores
triggerfish logs --level WARN
```

En Linux/macOS, esto utiliza `tail -f` nativo con filtrado. En Windows, utiliza `Get-Content -Wait -Tail` de PowerShell.

## Formato de los registros

Cada línea de registro sigue este formato:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Marca temporal:** ISO 8601 en UTC
- **Nivel:** ERROR, WARN, INFO, DEBUG o TRACE
- **Componente:** Qué módulo generó el registro (por ejemplo, `gateway`, `anthropic`, `telegram`, `policy`)
- **Mensaje:** El mensaje de registro con contexto estructurado

## Qué incluir en un informe de fallos

Junto con el paquete de registros, incluya:

1. **Pasos para reproducir.** ¿Qué estaba haciendo cuando ocurrió el problema?
2. **Comportamiento esperado.** ¿Qué debería haber ocurrido?
3. **Comportamiento real.** ¿Qué ocurrió en su lugar?
4. **Información de plataforma.** SO, arquitectura, versión de Triggerfish (`triggerfish version`)
5. **Extracto de configuración.** La sección relevante de su `triggerfish.yaml` (elimine los secretos)

Consulte [Reportar issues](/es-ES/support/guides/filing-issues) para la lista de comprobación completa.

## Información sensible en los registros

Triggerfish sanea los datos externos en los registros envolviendo los valores en delimitadores `<<` y `>>`. Las API keys y tokens no deberían aparecer nunca en la salida de los registros. Sin embargo, antes de enviar un paquete de registros:

1. Examine si hay algo que no desee compartir (direcciones de correo, rutas de ficheros, contenido de mensajes)
2. Elimine lo necesario
3. Indique en su issue que el paquete ha sido editado

Los ficheros de registro contienen el contenido de los mensajes de sus conversaciones. Si sus conversaciones contienen información sensible, elimine esas porciones antes de compartirlos.
