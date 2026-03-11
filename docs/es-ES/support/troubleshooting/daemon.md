# Solución de problemas: Daemon

## El daemon no se inicia

### "Triggerfish is already running"

Este mensaje aparece cuando el fichero de registro está bloqueado por otro proceso. En Windows, esto se detecta mediante un `EBUSY` / "os error 32" cuando el escritor de ficheros intenta abrir el fichero de registro.

**Solución:**

```bash
triggerfish status    # Compruebe si realmente hay una instancia en ejecución
triggerfish stop      # Detenga la instancia existente
triggerfish start     # Inicie de nuevo
```

Si `triggerfish status` indica que el daemon no está en ejecución pero sigue recibiendo este error, otro proceso está manteniendo el fichero de registro abierto. Compruebe si hay procesos zombi:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Finalice cualquier proceso residual e inténtelo de nuevo.

### Puerto 18789 o 18790 ya en uso

El gateway escucha en el puerto 18789 (WebSocket) y Tidepool en el 18790 (A2UI). Si otra aplicación ocupa estos puertos, el daemon no podrá iniciarse.

**Averigüe qué está usando el puerto:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### Ningún proveedor LLM configurado

Si `triggerfish.yaml` no tiene la sección `models` o el proveedor principal no tiene API key, el gateway registra:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Solución:** Ejecute el asistente de configuración o configure manualmente:

```bash
triggerfish dive                    # Configuración interactiva
# o
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Fichero de configuración no encontrado

El daemon se cierra si `triggerfish.yaml` no existe en la ruta esperada. El mensaje de error varía según el entorno:

- **Instalación nativa:** Sugiere ejecutar `triggerfish dive`
- **Docker:** Sugiere montar el fichero de configuración con `-v ./triggerfish.yaml:/data/triggerfish.yaml`

Compruebe la ruta:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Nativo
docker exec triggerfish ls /data/       # Docker
```

### Resolución de secretos fallida

Si su configuración referencia un secreto (`secret:provider:anthropic:apiKey`) que no existe en el llavero, el daemon se cierra con un error que indica el secreto que falta.

**Solución:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <su-clave>
```

---

## Gestión del servicio

### systemd: el daemon se detiene tras cerrar sesión

Por defecto, los servicios de usuario de systemd se detienen cuando el usuario cierra sesión. Triggerfish habilita `loginctl enable-linger` durante la instalación para evitar esto. Si linger no se pudo habilitar:

```bash
# Comprobar el estado de linger
loginctl show-user $USER | grep Linger

# Habilitarlo (puede requerir sudo)
sudo loginctl enable-linger $USER
```

Sin linger, el daemon solo se ejecuta mientras usted está con la sesión iniciada.

### systemd: el servicio no se inicia

Compruebe el estado del servicio y el journal:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Causas comunes:
- **Binario movido o eliminado.** El fichero unit tiene una ruta codificada al binario. Reinstale el daemon: `triggerfish dive --install-daemon`
- **Problemas de PATH.** La unidad systemd captura su PATH en el momento de la instalación. Si instaló nuevas herramientas (como servidores MCP) después de instalar el daemon, reinstale el daemon para actualizar el PATH.
- **DENO_DIR no establecido.** La unidad systemd establece `DENO_DIR=~/.cache/deno`. Si este directorio no es escribible, los plugins FFI de SQLite no se cargarán.

### launchd: el daemon no se inicia al iniciar sesión

Compruebe el estado del plist:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Si el plist no está cargado:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Causas comunes:
- **Plist eliminado o corrupto.** Reinstale: `triggerfish dive --install-daemon`
- **Binario movido.** El plist tiene una ruta codificada. Reinstale después de mover el binario.
- **PATH en el momento de la instalación.** Al igual que systemd, launchd captura el PATH cuando se crea el plist. Reinstale si añadió nuevas herramientas al PATH.

### Windows: el servicio no se inicia

Compruebe el estado del servicio:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Causas comunes:
- **Servicio no instalado.** Reinstale: ejecute el instalador como administrador.
- **Ruta del binario cambiada.** El envolvente del servicio tiene una ruta codificada. Reinstale.
- **La compilación de .NET falló durante la instalación.** El envolvente de servicio en C# requiere `csc.exe` de .NET Framework 4.x.

### La actualización interrumpe el daemon

Tras ejecutar `triggerfish update`, el daemon se reinicia automáticamente. Si no lo hace:

1. El binario antiguo puede seguir ejecutándose. Deténgalo manualmente: `triggerfish stop`
2. En Windows, el binario antiguo se renombra a `.old`. Si el renombrado falla, la actualización dará error. Detenga el servicio primero y luego actualice.

---

## Problemas con ficheros de registro

### El fichero de registro está vacío

El daemon escribe en `~/.triggerfish/logs/triggerfish.log`. Si el fichero existe pero está vacío:

- El daemon puede haberse iniciado hace poco. Espere un momento.
- El nivel de registro está establecido en `quiet`, que solo registra mensajes de nivel ERROR. Establézcalo en `normal` o `verbose`:

```bash
triggerfish config set logging.level normal
```

### Los registros son demasiado ruidosos

Establezca el nivel de registro en `quiet` para ver solo errores:

```bash
triggerfish config set logging.level quiet
```

Correspondencia de niveles:

| Valor de configuración | Nivel mínimo registrado |
|-----------------------|------------------------|
| `quiet` | Solo ERROR |
| `normal` | INFO y superiores |
| `verbose` | DEBUG y superiores |
| `debug` | TRACE y superiores (todo) |

### Rotación de registros

Los registros rotan automáticamente cuando el fichero actual supera 1 MB. Se conservan hasta 10 ficheros rotados:

```
triggerfish.log        # Actual
triggerfish.1.log      # Copia más reciente
triggerfish.2.log      # Segunda más reciente
...
triggerfish.10.log     # Más antigua (se elimina cuando ocurre una nueva rotación)
```

No hay rotación basada en tiempo, solo basada en tamaño.
