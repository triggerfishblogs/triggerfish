# Solución de problemas: daemon

## El daemon no inicia

### "Triggerfish is already running"

Este mensaje aparece cuando el archivo de log está bloqueado por otro proceso. En Windows, esto se detecta vía un error `EBUSY` / "os error 32" cuando el escritor de archivos intenta abrir el archivo de log.

**Solución:**

```bash
triggerfish status    # Verificar si hay realmente una instancia ejecutándose
triggerfish stop      # Detener la instancia existente
triggerfish start     # Iniciar de nuevo
```

Si `triggerfish status` reporta que el daemon no está ejecutándose pero aún recibes este error, otro proceso tiene el archivo de log abierto. Busca procesos zombi:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Termina cualquier proceso zombi, luego intenta de nuevo.

### Puerto 18789 o 18790 ya en uso

El gateway escucha en el puerto 18789 (WebSocket) y Tidepool en el 18790 (A2UI). Si otra aplicación ocupa estos puertos, el daemon no podrá iniciar.

**Encuentra qué está usando el puerto:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### No hay proveedor de LLM configurado

Si `triggerfish.yaml` no tiene la sección `models` o el proveedor primario no tiene API key, el gateway registra:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Solución:** Ejecuta el asistente de configuración o configura manualmente:

```bash
triggerfish dive                    # Configuración interactiva
# o
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Archivo de configuración no encontrado

El daemon se cierra si `triggerfish.yaml` no existe en la ruta esperada. El mensaje de error difiere por entorno:

- **Instalación nativa:** Sugiere ejecutar `triggerfish dive`
- **Docker:** Sugiere montar el archivo de configuración con `-v ./triggerfish.yaml:/data/triggerfish.yaml`

Verifica la ruta:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Nativo
docker exec triggerfish ls /data/       # Docker
```

### Resolución de secrets fallida

Si tu configuración referencia un secret (`secret:provider:anthropic:apiKey`) que no existe en el keychain, el daemon se cierra con un error que nombra el secret faltante.

**Solución:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <tu-clave>
```

---

## Gestión del servicio

### systemd: el daemon se detiene después de cerrar sesión

Por defecto, los servicios de usuario systemd se detienen cuando el usuario cierra sesión. Triggerfish habilita `loginctl enable-linger` durante la instalación para prevenir esto. Si linger no se habilitó:

```bash
# Verificar estado de linger
loginctl show-user $USER | grep Linger

# Habilitarlo (puede requerir sudo)
sudo loginctl enable-linger $USER
```

Sin linger, el daemon solo se ejecuta mientras estás conectado.

### systemd: el servicio falla al iniciar

Revisa el estado del servicio y el journal:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Causas comunes:
- **Binario movido o eliminado.** El archivo de unidad tiene una ruta hardcodeada al binario. Reinstala el daemon: `triggerfish dive --install-daemon`
- **Problemas de PATH.** La unidad systemd captura tu PATH en el momento de la instalación. Si instalaste nuevas herramientas (como servidores MCP) después de la instalación del daemon, reinstala el daemon para actualizar el PATH.
- **DENO_DIR no configurado.** La unidad systemd establece `DENO_DIR=~/.cache/deno`. Si este directorio no es escribible, los plugins FFI de SQLite no podrán cargarse.

### launchd: el daemon no inicia al iniciar sesión

Verifica el estado del plist:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Si el plist no está cargado:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Causas comunes:
- **Plist eliminado o corrupto.** Reinstala: `triggerfish dive --install-daemon`
- **Binario movido.** El plist tiene una ruta hardcodeada. Reinstala después de mover el binario.
- **PATH al momento de la instalación.** Como systemd, launchd captura el PATH cuando se crea el plist. Reinstala si agregaste nuevas herramientas al PATH.

### Windows: el servicio no inicia

Verifica el estado del servicio:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Causas comunes:
- **Servicio no instalado.** Reinstala: ejecuta el instalador como Administrador.
- **Ruta del binario cambió.** El wrapper del servicio tiene una ruta hardcodeada. Reinstala.
- **Compilación de .NET falló durante la instalación.** El wrapper del servicio C# requiere `csc.exe` de .NET Framework 4.x.

### La actualización rompe el daemon

Después de ejecutar `triggerfish update`, el daemon se reinicia automáticamente. Si no lo hace:

1. El binario antiguo puede seguir ejecutándose. Detenlo manualmente: `triggerfish stop`
2. En Windows, el binario antiguo se renombra a `.old`. Si el renombramiento falla, la actualización dará error. Detén el servicio primero, luego actualiza.

---

## Problemas con archivos de log

### El archivo de log está vacío

El daemon escribe en `~/.triggerfish/logs/triggerfish.log`. Si el archivo existe pero está vacío:

- El daemon puede haber recién iniciado. Espera un momento.
- El nivel de log está configurado en `quiet`, que solo registra mensajes de nivel ERROR. Configúralo a `normal` o `verbose`:

```bash
triggerfish config set logging.level normal
```

### Los logs son demasiado ruidosos

Configura el nivel de log a `quiet` para ver solo errores:

```bash
triggerfish config set logging.level quiet
```

Mapeo de niveles:

| Valor de config | Nivel mínimo registrado |
|----------------|------------------------|
| `quiet` | Solo ERROR |
| `normal` | INFO y superior |
| `verbose` | DEBUG y superior |
| `debug` | TRACE y superior (todo) |

### Rotación de logs

Los logs rotan automáticamente cuando el archivo actual excede 1 MB. Se conservan hasta 10 archivos rotados:

```
triggerfish.log        # Actual
triggerfish.1.log      # Respaldo más reciente
triggerfish.2.log      # Segundo más reciente
...
triggerfish.10.log     # Más antiguo (se elimina cuando ocurre una nueva rotación)
```

No hay rotación basada en tiempo, solo basada en tamaño.
