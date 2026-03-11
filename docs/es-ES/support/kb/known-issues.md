# KB: Problemas conocidos

Problemas conocidos actuales y sus soluciones alternativas. Esta página se actualiza a medida que se descubren y resuelven los problemas.

---

## Email: sin reconexión IMAP

**Estado:** Abierto

El adaptador del canal de correo electrónico sondea en busca de nuevos mensajes cada 30 segundos vía IMAP. Si la conexión IMAP se interrumpe (interrupción de red, reinicio del servidor, tiempo de espera por inactividad), el bucle de sondeo falla silenciosamente y no intenta reconectarse.

**Síntomas:**
- El canal de correo electrónico deja de recibir mensajes nuevos
- `IMAP unseen email poll failed` aparece en los registros
- Sin recuperación automática

**Solución alternativa:** Reinicie el daemon:

```bash
triggerfish stop && triggerfish start
```

**Causa raíz:** El bucle de sondeo IMAP no tiene lógica de reconexión. El `setInterval` sigue disparándose pero cada sondeo falla porque la conexión está muerta.

---

## SDKs de Slack/Discord: fugas de operaciones asíncronas

**Estado:** Problema conocido del proyecto upstream

Los SDKs de Slack (`@slack/bolt`) y Discord (`discord.js`) producen fugas de operaciones asíncronas al importarlos. Esto afecta a las pruebas (requiere `sanitizeOps: false`) pero no afecta al uso en producción.

**Síntomas:**
- Fallos de pruebas con "leaking async ops" al probar adaptadores de canal
- Sin impacto en producción

**Solución alternativa:** Los ficheros de prueba que importan adaptadores de Slack o Discord deben establecer:

```typescript
Deno.test({
  name: "nombre de la prueba",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: truncado de mensajes en lugar de fragmentación

**Estado:** Por diseño

Los mensajes de Slack se truncan a 40.000 caracteres en lugar de dividirse en múltiples mensajes (como hacen Telegram y Discord). Las respuestas muy largas del agente pierden contenido al final.

**Solución alternativa:** Pida al agente que produzca respuestas más cortas, o utilice un canal diferente para tareas que generan grandes salidas.

---

## WhatsApp: todos los usuarios tratados como propietario cuando falta ownerPhone

**Estado:** Por diseño (con advertencia)

Si el campo `ownerPhone` no está configurado para el canal WhatsApp, todos los remitentes de mensajes se tratan como el propietario, concediéndoles acceso completo a todas las herramientas.

**Síntomas:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (el mensaje de advertencia en el registro es en realidad engañoso; el comportamiento concede acceso de propietario)
- Cualquier usuario de WhatsApp puede acceder a todas las herramientas

**Solución alternativa:** Establezca siempre `ownerPhone`:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: PATH no actualizado tras instalación de herramientas

**Estado:** Por diseño

El fichero unit de systemd captura el PATH de su shell en el momento de la instalación del daemon. Si instala nuevas herramientas (binarios de servidores MCP, `npx`, etc.) después de instalar el daemon, el daemon no las encontrará.

**Síntomas:**
- Los servidores MCP no se lanzan
- Los binarios de herramientas "no encontrados" aunque funcionan en su terminal

**Solución alternativa:** Reinstale el daemon para actualizar el PATH capturado:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

Esto también aplica a launchd (macOS).

---

## Navegador: restricciones CDP de Chrome Flatpak

**Estado:** Limitación de la plataforma

Algunas compilaciones Flatpak de Chrome o Chromium restringen la opción `--remote-debugging-port`, lo que impide que Triggerfish se conecte a través del Chrome DevTools Protocol.

**Síntomas:**
- `CDP endpoint on port X not ready after Yms`
- El navegador se lanza pero Triggerfish no puede controlarlo

**Solución alternativa:** Instale Chrome o Chromium como paquete nativo en lugar de Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: permisos de volumen con Podman

**Estado:** Específico de la plataforma

Al usar Podman con contenedores rootless, el mapeo de UID puede impedir que el contenedor (ejecutándose como UID 65534) escriba en el volumen de datos.

**Síntomas:**
- Errores `Permission denied` al arrancar
- No se puede crear el fichero de configuración, base de datos o registros

**Solución alternativa:** Utilice la opción de montaje de volumen `:Z` para el reetiquetado SELinux, y asegúrese de que el directorio del volumen sea escribible:

```bash
podman run -v triggerfish-data:/data:Z ...
```

O cree el volumen con la propiedad correcta. Primero, busque la ruta de montaje del volumen, luego cambie el propietario:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Anote la ruta "Mountpoint"
podman unshare chown 65534:65534 /ruta/de/arriba
```

---

## Windows: csc.exe de .NET Framework no encontrado

**Estado:** Específico de la plataforma

El instalador de Windows compila un envolvente de servicio en C# en el momento de la instalación. Si `csc.exe` no se encuentra (falta .NET Framework o ruta de instalación no estándar), la instalación del servicio falla.

**Síntomas:**
- El instalador se completa pero el servicio no se registra
- `triggerfish status` muestra que el servicio no existe

**Solución alternativa:** Instale .NET Framework 4.x, o ejecute Triggerfish en modo de primer plano:

```powershell
triggerfish run
```

Mantenga la terminal abierta. El daemon se ejecuta hasta que la cierre.

---

## CalDAV: conflictos de ETag con clientes simultáneos

**Estado:** Por diseño (especificación CalDAV)

Al actualizar o eliminar eventos del calendario, CalDAV utiliza ETags para control de concurrencia optimista. Si otro cliente (aplicación del teléfono, interfaz web) modificó el evento entre su lectura y su escritura, la operación falla:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Solución alternativa:** El agente debería reintentar automáticamente obteniendo la última versión del evento. Si no lo hace, pídale que "obtenga la última versión del evento e inténtelo de nuevo."

---

## Respaldo en memoria: secretos perdidos al reiniciar

**Estado:** Por diseño

Al usar `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true`, los secretos se almacenan solo en memoria y se pierden cuando el daemon se reinicia. Este modo está destinado solo para pruebas.

**Síntomas:**
- Los secretos funcionan hasta el reinicio del daemon
- Tras reiniciar: errores `Secret not found`

**Solución alternativa:** Configure un backend de secretos apropiado. En Linux sin escritorio, instale `gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: token de actualización no emitido en la reautorización

**Estado:** Comportamiento de la API de Google

Google solo emite un token de actualización en la primera autorización. Si previamente autorizó la aplicación y vuelve a ejecutar `triggerfish connect google`, obtiene un token de acceso pero no un token de actualización.

**Síntomas:**
- La API de Google funciona inicialmente pero falla tras la caducidad del token de acceso (1 hora)
- Error `No refresh token`

**Solución alternativa:** Revoque el acceso de la aplicación primero, luego vuelva a autorizar:

1. Vaya a [Permisos de la cuenta de Google](https://myaccount.google.com/permissions)
2. Busque Triggerfish y haga clic en "Eliminar acceso"
3. Ejecute `triggerfish connect google` de nuevo
4. Google emitirá ahora un token de actualización nuevo

---

## Reportar nuevos problemas

Si encuentra un problema no listado aquí, consulte la página de [GitHub Issues](https://github.com/greghavens/triggerfish/issues). Si no ha sido reportado aún, abra un nuevo issue siguiendo la [guía para reportar issues](/es-ES/support/guides/filing-issues).
