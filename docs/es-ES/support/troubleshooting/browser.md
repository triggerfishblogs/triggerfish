# Solución de problemas: Automatización del navegador

## Chrome / Chromium no encontrado

Triggerfish utiliza puppeteer-core (no Chromium empaquetado) y detecta automáticamente Chrome o Chromium en su sistema. Si no se encuentra ningún navegador, las herramientas de navegador fallarán con un error de inicio.

### Rutas de detección por plataforma

**Linux:**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak: `com.google.Chrome`, `org.chromium.Chromium`, `com.brave.Browser`

**macOS:**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows:**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### Instalación de un navegador

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# O instale Brave, que también es detectado
```

### Anulación manual de ruta

Si su navegador está instalado en una ubicación no estándar, puede establecer la ruta. Contacte con el proyecto para la clave de configuración exacta (actualmente se establece a través de la configuración del gestor de navegadores).

---

## Fallos de inicio

### "Direct Chrome process launch failed"

Triggerfish lanza Chrome en modo headless mediante `Deno.Command`. Si el proceso no se inicia:

1. **El binario no es ejecutable.** Compruebe los permisos del fichero.
2. **Faltan bibliotecas compartidas.** En instalaciones mínimas de Linux (contenedores, WSL), Chrome puede necesitar bibliotecas adicionales:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Sin servidor de pantalla.** Chrome headless no necesita X11/Wayland, pero algunas versiones de Chrome aún intentan cargar bibliotecas relacionadas con la pantalla.

### Chrome Flatpak

Si Chrome está instalado como paquete Flatpak, Triggerfish crea un script envolvente que llama a `flatpak run` con los argumentos apropiados.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Si el script envolvente falla:
- Compruebe que `/usr/bin/flatpak` o `/usr/local/bin/flatpak` existe
- Compruebe que el ID de la aplicación Flatpak es correcto (ejecute `flatpak list` para ver las aplicaciones instaladas)
- El script envolvente se escribe en un directorio temporal. Si el directorio temporal no es escribible, la escritura falla.

### Endpoint CDP no preparado

Tras lanzar Chrome, Triggerfish sondea el endpoint del Chrome DevTools Protocol (CDP) para establecer una conexión. El tiempo de espera por defecto es de 30 segundos con un intervalo de sondeo de 200 ms.

```
CDP endpoint on port <puerto> not ready after <tiempo_espera>ms
```

Esto significa que Chrome se inició pero no abrió el puerto CDP a tiempo. Causas:
- Chrome se está cargando lentamente (sistema con recursos limitados)
- Otra instancia de Chrome está utilizando el mismo puerto de depuración
- Chrome se bloqueó durante el arranque (compruebe la salida propia de Chrome)

---

## Problemas de navegación

### "Navigation blocked by domain policy"

Las herramientas de navegador aplican la misma protección SSRF que web_fetch. Las URLs que apuntan a direcciones IP privadas están bloqueadas:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

Esta es una aplicación de seguridad intencionada. El navegador no puede acceder a:
- `localhost` / `127.0.0.1`
- Redes privadas (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Direcciones link-local (`169.254.x.x`)

No hay forma de desactivar esta comprobación.

### "Invalid URL"

La URL está malformada. La navegación del navegador requiere una URL completa con protocolo:

```
# Incorrecto
browser_navigate google.com

# Correcto
browser_navigate https://google.com
```

### Tiempo de espera de navegación

```
Navigation failed: Timeout
```

La página tardó demasiado en cargarse. Esto suele deberse a un servidor lento o una página que nunca termina de cargarse (redirecciones infinitas, JavaScript bloqueado).

---

## Problemas de interacción con la página

### "Click failed", "Type failed", "Select failed"

Estos errores incluyen el selector CSS que falló:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

El selector no coincidió con ningún elemento de la página. Causas comunes:
- La página no ha terminado de cargarse
- El elemento está dentro de un iframe (los selectores no cruzan los límites de los iframes)
- El selector es incorrecto (nombres de clase dinámicos, shadow DOM)

### "Snapshot failed"

La captura de la página (extracción del DOM para contexto) falló. Esto puede ocurrir si:
- La página no tiene contenido (página en blanco)
- Los errores de JavaScript impiden el acceso al DOM
- La página navegó a otro lugar durante la captura

### "Scroll failed"

Normalmente ocurre en páginas con contenedores de desplazamiento personalizados. El comando de desplazamiento apunta al viewport del documento principal.

---

## Aislamiento de perfiles

Los perfiles del navegador están aislados por agente. Cada agente obtiene su propio directorio de perfil de Chrome bajo el directorio base de perfiles. Esto significa:

- Las sesiones de inicio de sesión no se comparten entre agentes
- Las cookies, el almacenamiento local y la caché son por agente
- Los controles de acceso con conocimiento de la clasificación previenen la contaminación cruzada

Si observa un comportamiento inesperado del perfil, el directorio del perfil puede estar corrupto. Elimínelo y deje que Triggerfish cree uno nuevo en el próximo inicio del navegador.
