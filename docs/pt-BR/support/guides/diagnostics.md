# Ejecución de diagnósticos

Triggerfish tiene dos herramientas de diagnóstico integradas: `patrol` (verificación externa de salud) y la herramienta `healthcheck` (sonda interna del sistema).

## Patrol

Patrol es un comando del CLI que verifica si los sistemas principales están operativos:

```bash
triggerfish patrol
```

### Qué verifica

| Verificación | Estado | Significado |
|-------------|--------|-------------|
| Gateway ejecutándose | CRITICAL si está caído | El plano de control WebSocket no está respondiendo |
| LLM conectado | CRITICAL si está caído | No se puede alcanzar el proveedor de LLM primario |
| Canales activos | WARNING si es 0 | No hay adaptadores de canal conectados |
| Reglas de política cargadas | WARNING si es 0 | No hay reglas de política cargadas |
| Skills instalados | WARNING si es 0 | No se encontraron skills |

### Estado general

- **HEALTHY** - todas las verificaciones pasan
- **WARNING** - algunas verificaciones no críticas están marcadas (ej., no hay skills instalados)
- **CRITICAL** - al menos una verificación crítica falló (gateway o LLM inaccesible)

### Cuándo usar patrol

- Después de la instalación, para verificar que todo funciona
- Después de cambios de configuración, para confirmar que el daemon reinició correctamente
- Cuando el bot deja de responder, para identificar qué componente falló
- Antes de reportar un error, para incluir la salida de patrol

### Ejemplo de salida

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## Herramienta Healthcheck

La herramienta healthcheck es una herramienta interna del agente que sondea los componentes del sistema desde dentro del gateway en ejecución. Está disponible para el agente durante las conversaciones.

### Qué verifica

**Proveedores:**
- El proveedor por defecto existe y es accesible
- Devuelve el nombre del proveedor

**Almacenamiento:**
- Prueba de ida y vuelta: escribe una clave, la lee de vuelta, la elimina
- Verifica que la capa de almacenamiento es funcional

**Skills:**
- Cuenta los skills descubiertos por fuente (bundled, instalados, workspace)

**Configuración:**
- Validación básica de la configuración

### Niveles de estado

Cada componente reporta uno de:
- `healthy` - completamente operativo
- `degraded` - parcialmente funcional (algunas características pueden no funcionar)
- `error` - componente roto

### Requisito de clasificación

La herramienta healthcheck requiere clasificación mínima INTERNAL porque revela internos del sistema (nombres de proveedores, conteo de skills, estado del almacenamiento). Una sesión PUBLIC no puede usarla.

### Uso del healthcheck

Pregúntale a tu agente:

> Ejecuta un healthcheck

O si usas la herramienta directamente:

```
tool: healthcheck
```

La respuesta es un reporte estructurado:

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## Combinación de diagnósticos

Para una sesión de diagnóstico completa:

1. **Ejecuta patrol** desde el CLI:
   ```bash
   triggerfish patrol
   ```

2. **Revisa los logs** para errores recientes:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Pídele al agente** que ejecute un healthcheck (si el agente responde):
   > Ejecuta un healthcheck del sistema y cuéntame sobre cualquier problema

4. **Recolecta un paquete de logs** si necesitas reportar un issue:
   ```bash
   triggerfish logs bundle
   ```

---

## Diagnósticos de inicio

Si el daemon no inicia en absoluto, verifica estos puntos en orden:

1. **La configuración existe y es válida:**
   ```bash
   triggerfish config validate
   ```

2. **Los secrets se pueden resolver:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Sin conflictos de puertos:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **No hay otra instancia ejecutándose:**
   ```bash
   triggerfish status
   ```

5. **Revisa el journal del sistema (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **Revisa launchd (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Revisa el Event Log de Windows (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
