# KB: Problemas conocidos

Problemas conocidos actuales y sus soluciones temporales. Esta página se actualiza conforme se descubren y resuelven los problemas.

---

## Email: sin reconexión IMAP

**Estado:** Abierto

El adaptador del canal de email hace polling de nuevos mensajes cada 30 segundos vía IMAP. Si la conexión IMAP se cae (interrupción de red, reinicio del servidor, timeout por inactividad), el bucle de polling falla silenciosamente y no intenta reconectarse.

**Síntomas:**
- El canal de email deja de recibir mensajes nuevos
- `IMAP unseen email poll failed` aparece en los logs
- Sin recuperación automática

**Solución temporal:** Reinicia el daemon:

```bash
triggerfish stop && triggerfish start
```

**Causa raíz:** El bucle de polling IMAP no tiene lógica de reconexión. El `setInterval` continúa ejecutándose pero cada poll falla porque la conexión está muerta.

---

## SDK de Slack/Discord: fugas de operaciones asíncronas

**Estado:** Problema conocido upstream

Los SDK de Slack (`@slack/bolt`) y Discord (`discord.js`) filtran operaciones asíncronas al importar. Esto afecta las pruebas (requiere `sanitizeOps: false`) pero no afecta el uso en producción.

**Síntomas:**
- Fallos de prueba con "leaking async ops" al probar adaptadores de canal
- Sin impacto en producción

**Solución temporal:** Los archivos de prueba que importan adaptadores de Slack o Discord deben establecer:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: truncamiento de mensajes en lugar de división

**Estado:** Por diseño

Los mensajes de Slack se truncan a 40,000 caracteres en lugar de dividirse en múltiples mensajes (como hacen Telegram y Discord). Las respuestas muy largas del agente pierden contenido al final.

**Solución temporal:** Pídele al agente que produzca respuestas más cortas, o usa un canal diferente para tareas que generan salidas grandes.

---

## WhatsApp: todos los usuarios tratados como propietario cuando falta ownerPhone

**Estado:** Por diseño (con advertencia)

Si el campo `ownerPhone` no está configurado para el canal WhatsApp, todos los remitentes de mensajes son tratados como propietarios, otorgándoles acceso completo a todas las herramientas.

**Síntomas:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (la advertencia del log en realidad es engañosa; el comportamiento otorga acceso de propietario)
- Cualquier usuario de WhatsApp puede acceder a todas las herramientas

**Solución temporal:** Siempre configura `ownerPhone`:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: PATH no actualizado después de instalar herramientas

**Estado:** Por diseño

El archivo de unidad systemd captura el PATH de tu shell en el momento de la instalación del daemon. Si instalas nuevas herramientas (binarios de servidores MCP, `npx`, etc.) después de instalar el daemon, el daemon no las encontrará.

**Síntomas:**
- Los servidores MCP fallan al generarse
- Binarios de herramientas "no encontrados" aunque funcionan en tu terminal

**Solución temporal:** Reinstala el daemon para actualizar el PATH capturado:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

Esto aplica a launchd (macOS) también.

---

## Navegador: restricciones CDP de Chrome Flatpak

**Estado:** Limitación de plataforma

Algunas compilaciones Flatpak de Chrome o Chromium restringen el flag `--remote-debugging-port`, lo que impide que Triggerfish se conecte vía Chrome DevTools Protocol.

**Síntomas:**
- `CDP endpoint on port X not ready after Yms`
- El navegador se lanza pero Triggerfish no puede controlarlo

**Solución temporal:** Instala Chrome o Chromium como paquete nativo en lugar de Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: permisos de volumen con Podman

**Estado:** Específico de plataforma

Al usar Podman con contenedores rootless, el mapeo de UID puede impedir que el contenedor (ejecutándose como UID 65534) escriba en el volumen de datos.

**Síntomas:**
- Errores de `Permission denied` al iniciar
- No se puede crear archivo de config, base de datos o logs

**Solución temporal:** Usa el flag de montaje de volumen `:Z` para re-etiquetado SELinux, y asegura que el directorio del volumen sea escribible:

```bash
podman run -v triggerfish-data:/data:Z ...
```

O crea el volumen con la propiedad correcta. Primero, encuentra la ruta de montaje del volumen, luego cambia el propietario:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Anota la ruta "Mountpoint"
podman unshare chown 65534:65534 /ruta/de/arriba
```

---

## Windows: csc.exe de .NET Framework no encontrado

**Estado:** Específico de plataforma

El instalador de Windows compila un wrapper de servicio C# en el momento de la instalación. Si `csc.exe` no se encuentra (falta .NET Framework, o ruta de instalación no estándar), la instalación del servicio falla.

**Síntomas:**
- El instalador completa pero el servicio no se registra
- `triggerfish status` muestra que el servicio no existe

**Solución temporal:** Instala .NET Framework 4.x, o ejecuta Triggerfish en modo primer plano:

```powershell
triggerfish run
```

Mantén la terminal abierta. El daemon se ejecuta hasta que la cierres.

---

## CalDAV: conflictos de ETag con clientes concurrentes

**Estado:** Por diseño (especificación CalDAV)

Al actualizar o eliminar eventos de calendario, CalDAV usa ETags para control de concurrencia optimista. Si otro cliente (app del teléfono, interfaz web) modificó el evento entre tu lectura y tu escritura, la operación falla:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Solución temporal:** El agente debería reintentar automáticamente obteniendo la última versión del evento. Si no lo hace, pídele que "obtenga la última versión del evento e intente de nuevo."

---

## Fallback en memoria: secrets perdidos al reiniciar

**Estado:** Por diseño

Al usar `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true`, los secrets se almacenan solo en memoria y se pierden cuando el daemon reinicia. Este modo es solo para pruebas.

**Síntomas:**
- Los secrets funcionan hasta el reinicio del daemon
- Después del reinicio: errores de `Secret not found`

**Solución temporal:** Configura un backend de secrets adecuado. En Linux headless, instala `gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: refresh token no emitido en re-autorización

**Estado:** Comportamiento de la API de Google

Google solo emite un refresh token en la primera autorización. Si previamente autorizaste la app y vuelves a ejecutar `triggerfish connect google`, obtienes un access token pero sin refresh token.

**Síntomas:**
- La API de Google funciona inicialmente pero falla después de que el access token expira (1 hora)
- Error `No refresh token`

**Solución temporal:** Revoca el acceso de la app primero, luego vuelve a autorizar:

1. Ve a [Permisos de cuenta Google](https://myaccount.google.com/permissions)
2. Encuentra Triggerfish y haz clic en "Quitar acceso"
3. Ejecuta `triggerfish connect google` de nuevo
4. Google ahora emitirá un refresh token nuevo

---

## Reportar nuevos problemas

Si encuentras un problema no listado aquí, revisa la página de [GitHub Issues](https://github.com/greghavens/triggerfish/issues). Si no está reportado, reporta un nuevo issue siguiendo la [guía de reporte](/pt-BR/support/guides/filing-issues).
