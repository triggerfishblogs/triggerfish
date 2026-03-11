# Solución de problemas: Instalación

## Problemas del instalador binario

### Verificación de checksum fallida

El instalador descarga un fichero `SHA256SUMS.txt` junto con el binario y verifica el hash antes de la instalación. Si esto falla:

- **La descarga se interrumpió por la red.** Elimine la descarga parcial e inténtelo de nuevo.
- **El mirror o CDN sirvió contenido obsoleto.** Espere unos minutos y reintente. El instalador descarga desde GitHub Releases.
- **Asset no encontrado en SHA256SUMS.txt.** Esto significa que la versión se publicó sin un checksum para su plataforma. Abra un [issue en GitHub](https://github.com/greghavens/triggerfish/issues).

El instalador utiliza `sha256sum` en Linux y `shasum -a 256` en macOS. Si ninguno está disponible, no puede verificar la descarga.

### Permiso denegado al escribir en `/usr/local/bin`

El instalador intenta primero `/usr/local/bin`, luego recurre a `~/.local/bin`. Si ninguno funciona:

```bash
# Opción 1: Ejecutar con sudo para instalación en todo el sistema
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Opción 2: Crear ~/.local/bin y añadir al PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Luego vuelva a ejecutar el instalador
```

### Aviso de cuarentena de macOS

macOS bloquea los binarios descargados de internet. El instalador ejecuta `xattr -cr` para eliminar el atributo de cuarentena, pero si descargó el binario manualmente, ejecute:

```bash
xattr -cr /usr/local/bin/triggerfish
```

O haga clic derecho sobre el binario en Finder, seleccione "Abrir" y confirme el aviso de seguridad.

### PATH no actualizado tras la instalación

El instalador añade el directorio de instalación a su perfil de shell (`.zshrc`, `.bashrc` o `.bash_profile`). Si el comando `triggerfish` no se encuentra tras la instalación:

1. Abra una nueva ventana de terminal (la shell actual no recogerá los cambios del perfil)
2. O cargue su perfil manualmente: `source ~/.zshrc` (o el fichero de perfil que utilice su shell)

Si el instalador omitió la actualización del PATH, significa que el directorio de instalación ya estaba en su PATH.

---

## Compilación desde el código fuente

### Deno no encontrado

El instalador desde el código fuente (`deploy/scripts/install-from-source.sh`) instala Deno automáticamente si no está presente. Si eso falla:

```bash
# Instalar Deno manualmente
curl -fsSL https://deno.land/install.sh | sh

# Verificar
deno --version   # Debe ser 2.x
```

### La compilación falla con errores de permisos

El comando `deno compile` necesita `--allow-all` porque el binario compilado requiere acceso completo al sistema (red, sistema de ficheros, FFI para SQLite, creación de subprocesos). Si ve errores de permisos durante la compilación, asegúrese de que está ejecutando el script de instalación como un usuario con acceso de escritura al directorio de destino.

### Rama o versión específica

Establezca `TRIGGERFISH_BRANCH` para clonar una rama específica:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Para el instalador binario, establezca `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Problemas específicos de Windows

### La política de ejecución de PowerShell bloquea el instalador

Ejecute PowerShell como administrador y permita la ejecución de scripts:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Luego vuelva a ejecutar el instalador.

### La compilación del servicio de Windows falla

El instalador de Windows compila un envolvente de servicio en C# sobre la marcha usando `csc.exe` de .NET Framework 4.x. Si la compilación falla:

1. **Verifique que .NET Framework está instalado.** Ejecute `where csc.exe` en un símbolo del sistema. El instalador busca en el directorio de .NET Framework bajo `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Ejecute como administrador.** La instalación del servicio requiere privilegios elevados.
3. **Alternativa.** Si la compilación del servicio falla, puede seguir ejecutando Triggerfish manualmente: `triggerfish run` (modo en primer plano). Deberá mantener la terminal abierta.

### `Move-Item` falla durante la actualización

Las versiones anteriores del instalador de Windows utilizaban `Move-Item -Force`, que falla cuando el binario de destino está en uso. Esto se corrigió en la versión 0.3.4+. Si le ocurre en una versión anterior, detenga el servicio primero manualmente:

```powershell
Stop-Service Triggerfish
# Luego vuelva a ejecutar el instalador
```

---

## Problemas de Docker

### El contenedor se cierra inmediatamente

Compruebe los registros del contenedor:

```bash
docker logs triggerfish
```

Causas comunes:

- **Fichero de configuración ausente.** Monte su `triggerfish.yaml` en `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Conflicto de puertos.** Si el puerto 18789 o 18790 está en uso, el gateway no puede iniciarse.
- **Permiso denegado en el volumen.** El contenedor se ejecuta como UID 65534 (nonroot). Asegúrese de que el volumen sea escribible por ese usuario.

### No se puede acceder a Triggerfish desde el host

El gateway se enlaza a `127.0.0.1` dentro del contenedor por defecto. Para acceder desde el host, el fichero compose de Docker mapea los puertos `18789` y `18790`. Si está usando `docker run` directamente, añada:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman en lugar de Docker

El script de instalación de Docker detecta automáticamente `podman` como runtime de contenedores. También puede establecerlo explícitamente:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

El script envolvente `triggerfish` (instalado por el instalador de Docker) también detecta podman automáticamente.

### Imagen personalizada o registro

Sobreescriba la imagen con `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Post-instalación

### El asistente de configuración no se inicia

Tras la instalación del binario, el instalador ejecuta `triggerfish dive --install-daemon` para lanzar el asistente de configuración. Si no se inicia:

1. Ejecútelo manualmente: `triggerfish dive`
2. Si ve "Terminal requirement not met", el asistente requiere un TTY interactivo. Las sesiones SSH, los pipelines de CI y la entrada redirigida no funcionarán. Configure `triggerfish.yaml` manualmente en su lugar.

### La instalación automática del canal Signal falla

Signal requiere `signal-cli`, que es una aplicación Java. El instalador automático descarga un binario precompilado de `signal-cli` y un runtime JRE 25. Los fallos pueden ocurrir si:

- **No hay acceso de escritura al directorio de instalación.** Compruebe los permisos en `~/.triggerfish/signal-cli/`.
- **La descarga del JRE falla.** El instalador descarga desde Adoptium. Las restricciones de red o los proxies corporativos pueden bloquear esto.
- **Arquitectura no soportada.** La instalación automática del JRE soporta solo x64 y aarch64.

Si la instalación automática falla, instale `signal-cli` manualmente y asegúrese de que esté en su PATH. Consulte la [documentación del canal Signal](/es-ES/channels/signal) para los pasos de configuración manual.
