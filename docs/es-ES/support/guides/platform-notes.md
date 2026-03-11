# Notas de plataforma

Comportamiento, requisitos y peculiaridades específicos de cada plataforma.

## macOS

### Gestor de servicios: launchd

Triggerfish se registra como agente de launchd en:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

El plist está configurado con `RunAtLoad: true` y `KeepAlive: true`, por lo que el daemon se inicia al iniciar sesión y se reinicia si se bloquea.

### Captura de PATH

El plist de launchd captura el PATH de su shell en el momento de la instalación. Esto es crítico porque launchd no carga su perfil de shell. Si instala dependencias de servidores MCP (como `npx`, `python`) después de instalar el daemon, esos binarios no estarán en el PATH del daemon.

**Solución:** Reinstale el daemon para actualizar el PATH capturado:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Cuarentena

macOS aplica una marca de cuarentena a los binarios descargados. El instalador la elimina con `xattr -cr`, pero si descargó el binario manualmente:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Llavero

Los secretos se almacenan en el llavero de inicio de sesión de macOS a través del CLI `security`. Si el Acceso a Llaveros está bloqueado, las operaciones de secretos fallarán hasta que lo desbloquee (normalmente al iniciar sesión).

### Deno vía Homebrew

Si compila desde el código fuente y Deno se instaló vía Homebrew, asegúrese de que el directorio bin de Homebrew esté en su PATH antes de ejecutar el script de instalación.

---

## Linux

### Gestor de servicios: systemd (modo usuario)

El daemon se ejecuta como un servicio de usuario de systemd:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Por defecto, los servicios de usuario de systemd se detienen cuando el usuario cierra sesión. Triggerfish habilita linger en el momento de la instalación:

```bash
loginctl enable-linger $USER
```

Si esto falla (por ejemplo, su administrador de sistemas lo deshabilitó), el daemon solo se ejecuta mientras usted tiene la sesión iniciada. En servidores donde desee que el daemon persista, pida a su administrador que habilite linger para su cuenta.

### PATH y entorno

La unidad systemd captura su PATH y establece `DENO_DIR=~/.cache/deno`. Al igual que en macOS, los cambios en el PATH después de la instalación requieren reinstalar el daemon.

La unidad también establece `Environment=PATH=...` explícitamente. Si el daemon no puede encontrar los binarios de servidores MCP, esta es la causa más probable.

### Fedora Atomic / Silverblue / Bazzite

Los escritorios Fedora Atomic tienen `/home` enlazado simbólicamente a `/var/home`. Triggerfish gestiona esto automáticamente al resolver el directorio home, siguiendo los enlaces simbólicos para encontrar la ruta real.

Los navegadores instalados mediante Flatpak se detectan y lanzan a través de un script envolvente que llama a `flatpak run`.

### Servidores sin escritorio

En servidores sin entorno de escritorio, el daemon de GNOME Keyring / Secret Service puede no estar en ejecución. Consulte [Solución de problemas de secretos](/es-ES/support/troubleshooting/secrets) para instrucciones de configuración.

### SQLite FFI

El backend de almacenamiento SQLite utiliza `@db/sqlite`, que carga una biblioteca nativa vía FFI. Esto requiere el permiso `--allow-ffi` de Deno (incluido en el binario compilado). En algunas distribuciones mínimas de Linux, la biblioteca C compartida o las dependencias relacionadas pueden faltar. Instale las bibliotecas base de desarrollo si ve errores relacionados con FFI.

---

## Windows

### Gestor de servicios: Servicio de Windows

Triggerfish se instala como un servicio de Windows llamado "Triggerfish". El servicio está implementado por un envolvente en C# compilado durante la instalación usando `csc.exe` de .NET Framework 4.x.

**Requisitos:**
- .NET Framework 4.x (instalado en la mayoría de los sistemas Windows 10/11)
- Privilegios de administrador para la instalación del servicio
- `csc.exe` accesible en el directorio de .NET Framework

### Reemplazo del binario durante actualizaciones

Windows no permite sobreescribir un ejecutable que está en ejecución. El actualizador:

1. Renombra el binario en ejecución a `triggerfish.exe.old`
2. Copia el nuevo binario a la ruta original
3. Reinicia el servicio
4. Limpia el fichero `.old` en el siguiente inicio

Si el renombrado o la copia falla, detenga el servicio manualmente antes de actualizar.

### Soporte de color ANSI

Triggerfish habilita el procesamiento de terminal virtual para la salida de consola con colores. Esto funciona en PowerShell moderno y Windows Terminal. Las ventanas `cmd.exe` antiguas pueden no renderizar los colores correctamente.

### Bloqueo exclusivo de ficheros

Windows utiliza bloqueos de ficheros exclusivos. Si el daemon está en ejecución y usted intenta iniciar otra instancia, el bloqueo del fichero de registro lo impide:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

Esta detección es específica de Windows y se basa en el error EBUSY / "os error 32" al abrir el fichero de registro.

### Almacenamiento de secretos

Windows utiliza el almacén de ficheros cifrados (AES-256-GCM) en `~/.triggerfish/secrets.json`. No hay integración con el Administrador de Credenciales de Windows. Trate el fichero `secrets.key` como sensible.

### Notas del instalador PowerShell

El instalador PowerShell (`install.ps1`):
- Detecta la arquitectura del procesador (x64/arm64)
- Instala en `%LOCALAPPDATA%\Triggerfish`
- Añade el directorio de instalación al PATH del usuario a través del registro
- Compila el envolvente de servicio en C#
- Registra e inicia el servicio de Windows

Si el instalador falla en el paso de compilación del servicio, puede seguir ejecutando Triggerfish manualmente:

```powershell
triggerfish run    # Modo en primer plano
```

---

## Docker

### Runtime de contenedores

El despliegue Docker soporta tanto Docker como Podman. La detección es automática, o puede establecerlo explícitamente:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Detalles de la imagen

- Base: `gcr.io/distroless/cc-debian12` (mínima, sin shell)
- Variante de depuración: `distroless:debug` (incluye shell para solución de problemas)
- Se ejecuta como UID 65534 (nonroot)
- Init: `true` (reenvío de señales PID 1 mediante `tini`)
- Política de reinicio: `unless-stopped`

### Persistencia de datos

Todos los datos persistentes están en el directorio `/data` dentro del contenedor, respaldado por un volumen con nombre de Docker:

```
/data/
  triggerfish.yaml        # Configuración
  secrets.json            # Secretos cifrados
  secrets.key             # Clave de cifrado
  SPINE.md                # Identidad del agente
  TRIGGER.md              # Comportamiento de triggers
  data/triggerfish.db     # Base de datos SQLite
  logs/                   # Ficheros de registro
  skills/                 # Skills instaladas
  workspace/              # Espacios de trabajo del agente
  .deno/                  # Caché de plugins FFI de Deno
```

### Variables de entorno

| Variable | Valor por defecto | Finalidad |
|----------|-------------------|-----------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Directorio base de datos |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Ruta del fichero de configuración |
| `TRIGGERFISH_DOCKER` | `true` | Habilita comportamiento específico de Docker |
| `DENO_DIR` | `/data/.deno` | Caché de Deno (plugins FFI) |
| `HOME` | `/data` | Directorio home para usuario nonroot |

### Secretos en Docker

Los contenedores Docker no pueden acceder al llavero del sistema operativo anfitrión. El almacén de ficheros cifrados se utiliza automáticamente. La clave de cifrado (`secrets.key`) y los datos cifrados (`secrets.json`) se almacenan en el volumen `/data`.

**Nota de seguridad:** Cualquier persona con acceso al volumen Docker puede leer la clave de cifrado. Asegure el volumen adecuadamente. En producción, considere utilizar Docker secrets o un gestor de secretos para inyectar la clave en tiempo de ejecución.

### Puertos

El fichero compose mapea:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Los puertos adicionales (WebChat en 8765, webhook de WhatsApp en 8443) deben añadirse al fichero compose si habilita esos canales.

### Ejecución del asistente de configuración en Docker

```bash
# Si el contenedor está en ejecución
docker exec -it triggerfish triggerfish dive

# Si el contenedor no está en ejecución (ejecución única)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Actualización

```bash
# Usando el script envolvente
triggerfish update

# Manualmente
docker compose pull
docker compose up -d
```

### Depuración

Utilice la variante de depuración de la imagen para la solución de problemas:

```yaml
# En docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

Esto incluye un shell para que pueda acceder al contenedor:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (solo navegador)

Triggerfish en sí no se ejecuta como Flatpak, pero puede utilizar navegadores instalados mediante Flatpak para la automatización del navegador.

### Navegadores Flatpak detectados

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### Cómo funciona

Triggerfish crea un script envolvente temporal que llama a `flatpak run` con las opciones de modo headless, luego lanza Chrome a través de ese script. El envolvente se escribe en un directorio temporal.

### Problemas comunes

- **Flatpak no instalado.** El binario debe estar en `/usr/bin/flatpak` o `/usr/local/bin/flatpak`.
- **Directorio temporal no escribible.** El script envolvente necesita escribirse en disco antes de la ejecución.
- **Conflictos con el sandbox de Flatpak.** Algunas compilaciones de Chrome en Flatpak restringen `--remote-debugging-port`. Si la conexión CDP falla, pruebe una instalación de Chrome no Flatpak.
