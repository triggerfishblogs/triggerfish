# Solución de problemas: instalación

## Problemas del instalador binario

### Verificación de checksum falló

El instalador descarga un archivo `SHA256SUMS.txt` junto con el binario y verifica el hash antes de la instalación. Si esto falla:

- **La red interrumpió la descarga.** Elimina la descarga parcial e intenta de nuevo.
- **Mirror o CDN sirvió contenido obsoleto.** Espera unos minutos y reintenta. El instalador descarga de GitHub Releases.
- **Asset no encontrado en SHA256SUMS.txt.** Esto significa que el release fue publicado sin un checksum para tu plataforma. Reporta un [issue en GitHub](https://github.com/greghavens/triggerfish/issues).

El instalador usa `sha256sum` en Linux y `shasum -a 256` en macOS. Si ninguno está disponible, no puede verificar la descarga.

### Permiso denegado al escribir en `/usr/local/bin`

El instalador intenta `/usr/local/bin` primero, luego recurre a `~/.local/bin`. Si ninguno funciona:

```bash
# Opción 1: Ejecutar con sudo para instalación en todo el sistema
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Opción 2: Crear ~/.local/bin y agregar al PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Luego vuelve a ejecutar el instalador
```

### Advertencia de cuarentena en macOS

macOS bloquea los binarios descargados de internet. El instalador ejecuta `xattr -cr` para limpiar el atributo de cuarentena, pero si descargaste el binario manualmente, ejecuta:

```bash
xattr -cr /usr/local/bin/triggerfish
```

O haz clic derecho en el binario en Finder, selecciona "Abrir" y confirma el prompt de seguridad.

### PATH no actualizado después de instalar

El instalador agrega el directorio de instalación a tu perfil de shell (`.zshrc`, `.bashrc` o `.bash_profile`). Si el comando `triggerfish` no se encuentra después de la instalación:

1. Abre una nueva ventana de terminal (el shell actual no detectará cambios en el perfil)
2. O ejecuta source de tu perfil manualmente: `source ~/.zshrc` (o el archivo de perfil que use tu shell)

Si el instalador saltó la actualización del PATH, significa que el directorio de instalación ya estaba en tu PATH.

---

## Compilar desde el código fuente

### Deno no encontrado

El instalador desde código fuente (`deploy/scripts/install-from-source.sh`) instala Deno automáticamente si no está presente. Si eso falla:

```bash
# Instalar Deno manualmente
curl -fsSL https://deno.land/install.sh | sh

# Verificar
deno --version   # Debería ser 2.x
```

### La compilación falla con errores de permisos

El comando `deno compile` necesita `--allow-all` porque el binario compilado requiere acceso completo al sistema (red, sistema de archivos, FFI para SQLite, generación de subprocesos). Si ves errores de permisos durante la compilación, asegúrate de que estás ejecutando el script de instalación como un usuario con acceso de escritura al directorio destino.

### Rama o versión específica

Configura `TRIGGERFISH_BRANCH` para clonar una rama específica:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Para el instalador binario, configura `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Problemas específicos de Windows

### La política de ejecución de PowerShell bloquea el instalador

Ejecuta PowerShell como Administrador y permite la ejecución de scripts:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Luego vuelve a ejecutar el instalador.

### La compilación del Windows Service falla

El instalador de Windows compila un wrapper de servicio C# sobre la marcha usando `csc.exe` de .NET Framework 4.x. Si la compilación falla:

1. **Verifica que .NET Framework está instalado.** Ejecuta `where csc.exe` en una línea de comandos. El instalador busca en el directorio de .NET Framework bajo `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Ejecuta como Administrador.** La instalación del servicio requiere privilegios elevados.
3. **Alternativa.** Si la compilación del servicio falla, aún puedes ejecutar Triggerfish manualmente: `triggerfish run` (modo primer plano). Necesitarás mantener la terminal abierta.

### `Move-Item` falla durante la actualización

Las versiones anteriores del instalador de Windows usaban `Move-Item -Force` que falla cuando el binario destino está en uso. Esto fue corregido en la versión 0.3.4+. Si encuentras esto en una versión anterior, detén el servicio manualmente primero:

```powershell
Stop-Service Triggerfish
# Luego vuelve a ejecutar el instalador
```

---

## Problemas de Docker

### El contenedor se cierra inmediatamente

Revisa los logs del contenedor:

```bash
docker logs triggerfish
```

Causas comunes:

- **Archivo de config faltante.** Monta tu `triggerfish.yaml` en `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Conflicto de puertos.** Si el puerto 18789 o 18790 está en uso, el gateway no puede iniciar.
- **Permiso denegado en el volumen.** El contenedor se ejecuta como UID 65534 (nonroot). Asegúrate de que el volumen sea escribible por ese usuario.

### No se puede acceder a Triggerfish desde el host

El gateway se vincula a `127.0.0.1` dentro del contenedor por defecto. Para acceder desde el host, el archivo Docker compose mapea los puertos `18789` y `18790`. Si estás usando `docker run` directamente, agrega:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman en lugar de Docker

El script de instalación Docker auto-detecta `podman` como el runtime de contenedores. También puedes configurarlo explícitamente:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

El script wrapper de `triggerfish` (instalado por el instalador Docker) también auto-detecta podman.

### Imagen o registro personalizado

Anula la imagen con `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Post-instalación

### El asistente de configuración no inicia

Después de la instalación binaria, el instalador ejecuta `triggerfish dive --install-daemon` para lanzar el asistente de configuración. Si no inicia:

1. Ejecútalo manualmente: `triggerfish dive`
2. Si ves "Terminal requirement not met", el asistente requiere un TTY interactivo. Las sesiones SSH, pipelines de CI y entrada canalizada no funcionarán. Configura `triggerfish.yaml` manualmente en su lugar.

### La auto-instalación del canal Signal falla

Signal requiere `signal-cli`, que es una aplicación Java. El auto-instalador descarga un binario pre-compilado de `signal-cli` y un runtime JRE 25. Los fallos pueden ocurrir si:

- **Sin acceso de escritura al directorio de instalación.** Verifica permisos en `~/.triggerfish/signal-cli/`.
- **La descarga del JRE falla.** El instalador descarga de Adoptium. Restricciones de red o proxies corporativos pueden bloquear esto.
- **Arquitectura no soportada.** La auto-instalación del JRE soporta solo x64 y aarch64.

Si la auto-instalación falla, instala `signal-cli` manualmente y asegúrate de que esté en tu PATH. Consulta los [docs del canal Signal](/pt-BR/channels/signal) para pasos de configuración manual.
