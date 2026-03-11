# Ejecución de diagnósticos

Triggerfish tiene dos herramientas de diagnóstico integradas: `patrol` (comprobación de salud externa) y la herramienta `healthcheck` (sonda interna del sistema).

## Patrol

Patrol es un comando CLI que comprueba si los sistemas principales están operativos:

```bash
triggerfish patrol
```

### Qué comprueba

| Comprobación | Estado | Significado |
|--------------|--------|-------------|
| Gateway en ejecución | CRITICAL si caído | El plano de control WebSocket no responde |
| LLM conectado | CRITICAL si caído | No se puede alcanzar el proveedor LLM principal |
| Canales activos | WARNING si 0 | No hay adaptadores de canal conectados |
| Reglas de política cargadas | WARNING si 0 | No hay reglas de política cargadas |
| Skills instaladas | WARNING si 0 | No se han descubierto skills |

### Estado general

- **HEALTHY** - todas las comprobaciones pasan
- **WARNING** - algunas comprobaciones no críticas están marcadas (por ejemplo, no hay skills instaladas)
- **CRITICAL** - al menos una comprobación crítica ha fallado (gateway o LLM no accesibles)

### Cuándo usar patrol

- Tras la instalación, para verificar que todo funciona
- Tras cambios de configuración, para confirmar que el daemon se reinició correctamente
- Cuando el bot deja de responder, para determinar qué componente ha fallado
- Antes de reportar un fallo, para incluir la salida de patrol

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

## Herramienta healthcheck

La herramienta healthcheck es una herramienta interna del agente que sondea los componentes del sistema desde dentro del gateway en ejecución. Está disponible para el agente durante las conversaciones.

### Qué comprueba

**Proveedores:**
- El proveedor por defecto existe y es accesible
- Devuelve el nombre del proveedor

**Almacenamiento:**
- Prueba de ida y vuelta: escribe una clave, la lee de vuelta, la elimina
- Verifica que la capa de almacenamiento es funcional

**Skills:**
- Cuenta las skills descubiertas por origen (incluidas, instaladas, espacio de trabajo)

**Configuración:**
- Validación básica de la configuración

### Niveles de estado

Cada componente informa uno de:
- `healthy` - completamente operativo
- `degraded` - parcialmente funcional (algunas funciones pueden no funcionar)
- `error` - componente averiado

### Requisito de clasificación

La herramienta healthcheck requiere como mínimo clasificación INTERNAL porque revela internos del sistema (nombres de proveedores, recuento de skills, estado del almacenamiento). Una sesión PUBLIC no puede utilizarla.

### Uso de healthcheck

Pregunte a su agente:

> Ejecuta un healthcheck

O si utiliza la herramienta directamente:

```
tool: healthcheck
```

La respuesta es un informe estructurado:

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

1. **Ejecute patrol** desde el CLI:
   ```bash
   triggerfish patrol
   ```

2. **Compruebe los registros** en busca de errores recientes:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Pida al agente** que ejecute un healthcheck (si el agente responde):
   > Ejecuta un healthcheck del sistema y cuéntame si hay algún problema

4. **Recopile un paquete de registros** si necesita reportar un problema:
   ```bash
   triggerfish logs bundle
   ```

---

## Diagnósticos de arranque

Si el daemon no se inicia en absoluto, compruebe lo siguiente en orden:

1. **La configuración existe y es válida:**
   ```bash
   triggerfish config validate
   ```

2. **Los secretos pueden resolverse:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **No hay conflictos de puertos:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **No hay otra instancia en ejecución:**
   ```bash
   triggerfish status
   ```

5. **Compruebe el journal del sistema (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **Compruebe launchd (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Compruebe el registro de eventos de Windows (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
