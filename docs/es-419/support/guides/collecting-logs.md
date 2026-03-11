# Recolección de logs

Al reportar un error, un paquete de logs le da a los mantenedores la información que necesitan para diagnosticar el problema sin ir y venir pidiendo detalles.

## Paquete rápido

La forma más rápida de crear un paquete de logs:

```bash
triggerfish logs bundle
```

Esto crea un archivo comprimido con todos los archivos de log de `~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Si la compresión falla por cualquier razón, recurre a copiar los archivos de log sin comprimir a un directorio que puedes comprimir manualmente.

## Qué contiene el paquete

- `triggerfish.log` (archivo de log actual)
- `triggerfish.1.log` hasta `triggerfish.10.log` (copias rotadas, si existen)

El paquete **no** contiene:
- Tu archivo de configuración `triggerfish.yaml`
- Claves secretas o credenciales
- La base de datos SQLite
- SPINE.md o TRIGGER.md

## Recolección manual de logs

Si el comando de paquete no está disponible (versión antigua, Docker, etc.):

```bash
# Encontrar archivos de log
ls ~/.triggerfish/logs/

# Crear un archivo comprimido manualmente
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Aumentar el detalle de los logs

Por defecto, los logs están en nivel INFO. Para capturar más detalle para un reporte de error:

1. Establece el nivel de log a verbose o debug:
   ```bash
   triggerfish config set logging.level verbose
   # o para máximo detalle:
   triggerfish config set logging.level debug
   ```

2. Reproduce el problema

3. Recolecta el paquete:
   ```bash
   triggerfish logs bundle
   ```

4. Regresa el nivel a normal:
   ```bash
   triggerfish config set logging.level normal
   ```

### Detalle por nivel de log

| Nivel | Qué captura |
|-------|------------|
| `quiet` | Solo errores |
| `normal` | Errores, advertencias, información (por defecto) |
| `verbose` | Agrega mensajes de depuración (llamadas a herramientas, interacciones con proveedores, decisiones de clasificación) |
| `debug` | Todo incluyendo mensajes a nivel de traza (datos crudos de protocolo, cambios de estado interno) |

**Advertencia:** El nivel `debug` genera mucha salida. Solo úsalo cuando estés reproduciendo activamente un problema, luego regresa al nivel anterior.

## Filtrar logs en tiempo real

Mientras reproduces un problema, puedes filtrar el flujo de logs en vivo:

```bash
# Mostrar solo errores
triggerfish logs --level ERROR

# Mostrar advertencias y superiores
triggerfish logs --level WARN
```

En Linux/macOS, esto usa `tail -f` nativo con filtrado. En Windows, usa `Get-Content -Wait -Tail` de PowerShell.

## Formato del log

Cada línea de log sigue este formato:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Timestamp:** ISO 8601 en UTC
- **Nivel:** ERROR, WARN, INFO, DEBUG o TRACE
- **Componente:** Qué módulo generó el log (ej., `gateway`, `anthropic`, `telegram`, `policy`)
- **Mensaje:** El mensaje de log con contexto estructurado

## Qué incluir en un reporte de error

Junto con el paquete de logs, incluye:

1. **Pasos para reproducir.** ¿Qué estabas haciendo cuando ocurrió el problema?
2. **Comportamiento esperado.** ¿Qué debería haber pasado?
3. **Comportamiento real.** ¿Qué pasó en su lugar?
4. **Información de la plataforma.** SO, arquitectura, versión de Triggerfish (`triggerfish version`)
5. **Extracto de la configuración.** La sección relevante de tu `triggerfish.yaml` (redacta secrets)

Consulta [Cómo reportar issues](/es-419/support/guides/filing-issues) para la lista completa de verificación.

## Información sensible en los logs

Triggerfish sanitiza datos externos en los logs envolviendo los valores en delimitadores `<<` y `>>`. Las API keys y tokens no deberían aparecer nunca en la salida de logs. Sin embargo, antes de enviar un paquete de logs:

1. Revisa si hay algo que no quieras compartir (direcciones de email, rutas de archivos, contenido de mensajes)
2. Redacta si es necesario
3. Indica en tu issue que el paquete fue redactado

Los archivos de log contienen contenido de mensajes de tus conversaciones. Si tus conversaciones contienen información sensible, redacta esas porciones antes de compartir.
