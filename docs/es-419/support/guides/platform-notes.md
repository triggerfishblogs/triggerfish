# Notas de plataforma

Comportamiento, requisitos y peculiaridades específicos de cada plataforma.

## macOS

### Gestor de servicios: launchd

Triggerfish se registra como un agente launchd en:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

El plist está configurado con `RunAtLoad: true` y `KeepAlive: true`, así que el daemon se inicia al iniciar sesión y se reinicia si falla.

### Captura de PATH

El plist de launchd captura el PATH de tu shell en el momento de la instalación. Esto es crítico porque launchd no ejecuta tu perfil de shell. Si instalas dependencias de servidores MCP (como `npx`, `python`) después de instalar el daemon, esos binarios no estarán en el PATH del daemon.

**Solución:** Reinstala el daemon para actualizar el PATH capturado:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Cuarentena

macOS aplica una bandera de cuarentena a los binarios descargados. El instalador la limpia con `xattr -cr`, pero si descargaste el binario manualmente:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

Los secrets se almacenan en el keychain de inicio de sesión de macOS vía el CLI `security`. Si el Keychain Access está bloqueado, las operaciones de secrets fallarán hasta que lo desbloquees (usualmente al iniciar sesión).

### Deno vía Homebrew

Si compilas desde el código fuente y Deno fue instalado vía Homebrew, asegúrate de que el directorio bin de Homebrew esté en tu PATH antes de ejecutar el script de instalación.

---

## Linux

### Gestor de servicios: systemd (modo usuario)

El daemon se ejecuta como un servicio de usuario systemd:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Por defecto, los servicios de usuario systemd se detienen cuando el usuario cierra sesión. Triggerfish habilita linger en el momento de la instalación:

```bash
loginctl enable-linger $USER
```

Si esto falla (ej., tu administrador del sistema lo deshabilitó), el daemon solo se ejecuta mientras estás conectado. En servidores donde quieres que el daemon persista, pídele a tu administrador que habilite linger para tu cuenta.

### PATH y entorno

La unidad systemd captura tu PATH y establece `DENO_DIR=~/.cache/deno`. Como en macOS, los cambios al PATH después de la instalación requieren reinstalar el daemon.

La unidad también establece `Environment=PATH=...` explícitamente. Si el daemon no puede encontrar binarios de servidores MCP, esta es la causa más probable.

### Fedora Atomic / Silverblue / Bazzite

Los escritorios Fedora Atomic tienen `/home` enlazado simbólicamente a `/var/home`. Triggerfish maneja esto automáticamente al resolver el directorio home, siguiendo enlaces simbólicos para encontrar la ruta real.

Los navegadores instalados vía Flatpak se detectan y lanzan a través de un script wrapper que llama a `flatpak run`.

### Servidores headless

En servidores sin entorno de escritorio, el daemon GNOME Keyring / Secret Service puede no estar ejecutándose. Consulta [Solución de problemas de secrets](/es-419/support/troubleshooting/secrets) para instrucciones de configuración.

### SQLite FFI

El backend de almacenamiento SQLite usa `@db/sqlite`, que carga una biblioteca nativa vía FFI. Esto requiere el permiso `--allow-ffi` de Deno (incluido en el binario compilado). En algunas distribuciones Linux mínimas, la biblioteca C compartida o dependencias relacionadas pueden faltar. Instala las bibliotecas de desarrollo base si ves errores relacionados con FFI.

---

## Windows

### Gestor de servicios: Windows Service

Triggerfish se instala como un Windows Service llamado "Triggerfish". El servicio está implementado por un wrapper C# compilado durante la instalación usando `csc.exe` de .NET Framework 4.x.

**Requisitos:**
- .NET Framework 4.x (instalado en la mayoría de los sistemas Windows 10/11)
- Privilegios de administrador para la instalación del servicio
- `csc.exe` accesible en el directorio de .NET Framework

### Reemplazo de binario durante actualizaciones

Windows no permite sobrescribir un ejecutable que está en ejecución. El actualizador:

1. Renombra el binario en ejecución a `triggerfish.exe.old`
2. Copia el nuevo binario a la ruta original
3. Reinicia el servicio
4. Limpia el archivo `.old` en el siguiente inicio

Si el renombramiento o la copia falla, detén el servicio manualmente antes de actualizar.

### Soporte de colores ANSI

Triggerfish habilita Virtual Terminal Processing para salida con colores en la consola. Esto funciona en PowerShell moderno y Windows Terminal. Las ventanas antiguas de `cmd.exe` pueden no renderizar los colores correctamente.

### Bloqueo exclusivo de archivos

Windows usa bloqueos exclusivos de archivos. Si el daemon está ejecutándose e intentas iniciar otra instancia, el bloqueo del archivo de log lo impide:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

Esta detección es específica de Windows y se basa en el error EBUSY / "os error 32" al abrir el archivo de log.

### Almacenamiento de secrets

Windows usa el almacén de archivos cifrados (AES-256-GCM) en `~/.triggerfish/secrets.json`. No hay integración con Windows Credential Manager. Trata el archivo `secrets.key` como sensible.

### Notas del instalador PowerShell

El instalador PowerShell (`install.ps1`):
- Detecta la arquitectura del procesador (x64/arm64)
- Instala en `%LOCALAPPDATA%\Triggerfish`
- Agrega el directorio de instalación al PATH del usuario vía registro
- Compila el wrapper del servicio C#
- Registra e inicia el Windows Service

Si el instalador falla en el paso de compilación del servicio, aún puedes ejecutar Triggerfish manualmente:

```powershell
triggerfish run    # Modo en primer plano
```

---

## Docker

### Runtime de contenedores

El despliegue Docker soporta tanto Docker como Podman. La detección es automática, o configúralo explícitamente:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Detalles de la imagen

- Base: `gcr.io/distroless/cc-debian12` (mínima, sin shell)
- Variante debug: `distroless:debug` (incluye shell para solución de problemas)
- Se ejecuta como UID 65534 (nonroot)
- Init: `true` (reenvío de señales PID 1 vía `tini`)
- Política de reinicio: `unless-stopped`

### Persistencia de datos

Todos los datos persistentes están en el directorio `/data` dentro del contenedor, respaldados por un volumen nombrado de Docker:

```
/data/
  triggerfish.yaml        # Configuración
  secrets.json            # Secrets cifrados
  secrets.key             # Clave de cifrado
  SPINE.md                # Identidad del agente
  TRIGGER.md              # Comportamiento de triggers
  data/triggerfish.db     # Base de datos SQLite
  logs/                   # Archivos de log
  skills/                 # Skills instalados
  workspace/              # Workspaces del agente
  .deno/                  # Caché de plugins FFI de Deno
```

### Variables de entorno

| Variable | Por defecto | Propósito |
|----------|------------|-----------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Directorio base de datos |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Ruta del archivo de config |
| `TRIGGERFISH_DOCKER` | `true` | Habilita comportamiento específico de Docker |
| `DENO_DIR` | `/data/.deno` | Caché de Deno (plugins FFI) |
| `HOME` | `/data` | Directorio home para usuario nonroot |

### Secrets en Docker

Los contenedores Docker no pueden acceder al keychain del SO del host. El almacén de archivos cifrados se usa automáticamente. La clave de cifrado (`secrets.key`) y los datos cifrados (`secrets.json`) se almacenan en el volumen `/data`.

**Nota de seguridad:** Cualquiera con acceso al volumen de Docker puede leer la clave de cifrado. Asegura el volumen apropiadamente. En producción, considera usar Docker secrets o un gestor de secrets para inyectar la clave en tiempo de ejecución.

### Puertos

El archivo compose mapea:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Puertos adicionales (WebChat en 8765, webhook de WhatsApp en 8443) necesitan ser agregados al archivo compose si habilitas esos canales.

### Ejecutar el asistente de configuración en Docker

```bash
# Si el contenedor está ejecutándose
docker exec -it triggerfish triggerfish dive

# Si el contenedor no está ejecutándose (efímero)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Actualización

```bash
# Usando el script wrapper
triggerfish update

# Manualmente
docker compose pull
docker compose up -d
```

### Depuración

Usa la variante debug de la imagen para solución de problemas:

```yaml
# En docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

Esto incluye un shell para que puedas hacer exec en el contenedor:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (solo navegador)

Triggerfish en sí no se ejecuta como Flatpak, pero puede usar navegadores instalados vía Flatpak para automatización del navegador.

### Navegadores Flatpak detectados

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### Cómo funciona

Triggerfish crea un script wrapper temporal que llama a `flatpak run` con los flags de modo headless, luego lanza Chrome a través de ese script. El wrapper se escribe en un directorio temporal.

### Problemas comunes

- **Flatpak no instalado.** El binario debe estar en `/usr/bin/flatpak` o `/usr/local/bin/flatpak`.
- **Directorio temporal no escribible.** El script wrapper necesita ser escrito a disco antes de la ejecución.
- **Conflictos del sandbox de Flatpak.** Algunas compilaciones de Chrome en Flatpak restringen `--remote-debugging-port`. Si la conexión CDP falla, prueba una instalación de Chrome no Flatpak.
