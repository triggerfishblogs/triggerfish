# Solución de problemas: automatización del navegador

## Chrome / Chromium no encontrado

Triggerfish usa puppeteer-core (no Chromium incluido) y auto-detecta Chrome o Chromium en tu sistema. Si no se encuentra ningún navegador, las herramientas del navegador fallarán con un error de lanzamiento.

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

### Instalar un navegador

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# O instala Brave, que también es detectado
```

### Anulación manual de ruta

Si tu navegador está instalado en una ubicación no estándar, puedes establecer la ruta. Contacta al proyecto para la clave de configuración exacta (esto actualmente se establece vía la configuración del gestor de navegadores).

---

## Fallos de lanzamiento

### "Direct Chrome process launch failed"

Triggerfish lanza Chrome en modo headless vía `Deno.Command`. Si el proceso falla al iniciar:

1. **El binario no es ejecutable.** Verifica los permisos del archivo.
2. **Faltan bibliotecas compartidas.** En instalaciones mínimas de Linux (contenedores, WSL), Chrome puede necesitar bibliotecas adicionales:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Sin servidor de display.** Chrome headless no necesita X11/Wayland, pero algunas versiones de Chrome aún intentan cargar bibliotecas relacionadas con display.

### Chrome Flatpak

Si Chrome está instalado como paquete Flatpak, Triggerfish crea un script wrapper que llama a `flatpak run` con los argumentos apropiados.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Si el script wrapper falla:
- Verifica que `/usr/bin/flatpak` o `/usr/local/bin/flatpak` existe
- Verifica que el ID de la app Flatpak es correcto (ejecuta `flatpak list` para ver las apps instaladas)
- El script wrapper se escribe en un directorio temporal. Si el directorio temporal no es escribible, la escritura falla.

### Endpoint CDP no listo

Después de lanzar Chrome, Triggerfish hace polling del endpoint del Chrome DevTools Protocol (CDP) para establecer una conexión. El timeout por defecto es 30 segundos con un intervalo de polling de 200ms.

```
CDP endpoint on port <puerto> not ready after <timeout>ms
```

Esto significa que Chrome inició pero no abrió el puerto CDP a tiempo. Causas:
- Chrome está cargando lentamente (sistema con recursos limitados)
- Otra instancia de Chrome está usando el mismo puerto de depuración
- Chrome falló durante el inicio (revisa la salida propia de Chrome)

---

## Problemas de navegación

### "Navigation blocked by domain policy"

Las herramientas del navegador aplican la misma protección SSRF que web_fetch. Las URLs que apuntan a direcciones IP privadas están bloqueadas:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

Esta es una aplicación de seguridad intencional. El navegador no puede acceder a:
- `localhost` / `127.0.0.1`
- Redes privadas (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Direcciones link-local (`169.254.x.x`)

No hay forma de deshabilitar esta verificación.

### "Invalid URL"

La URL está malformada. La navegación del navegador requiere una URL completa con protocolo:

```
# Incorrecto
browser_navigate google.com

# Correcto
browser_navigate https://google.com
```

### Timeout de navegación

```
Navigation failed: Timeout
```

La página tardó demasiado en cargar. Esto es típicamente un servidor lento o una página que nunca termina de cargar (redirecciones infinitas, JavaScript atascado).

---

## Problemas de interacción con la página

### "Click failed", "Type failed", "Select failed"

Estos errores incluyen el selector CSS que falló:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

El selector no coincidió con ningún elemento en la página. Causas comunes:
- La página no ha terminado de cargar aún
- El elemento está dentro de un iframe (los selectores no cruzan límites de iframe)
- El selector está mal (nombres de clase dinámicos, shadow DOM)

### "Snapshot failed"

La captura de la página (extracción del DOM para contexto) falló. Esto puede pasar si:
- La página no tiene contenido (página en blanco)
- Errores de JavaScript impiden el acceso al DOM
- La página navegó a otro lugar durante la captura

### "Scroll failed"

Usualmente ocurre en páginas con contenedores de scroll personalizados. El comando de scroll apunta al viewport del documento principal.

---

## Aislamiento de perfiles

Los perfiles del navegador están aislados por agente. Cada agente obtiene su propio directorio de perfil de Chrome bajo el directorio base de perfiles. Esto significa:

- Las sesiones de login no se comparten entre agentes
- Las cookies, almacenamiento local y caché son por agente
- Los controles de acceso conscientes de clasificación previenen contaminación cruzada

Si ves comportamiento inesperado del perfil, el directorio del perfil puede estar corrupto. Elimínalo y deja que Triggerfish cree uno nuevo en el siguiente lanzamiento del navegador.
