# Solución de problemas: integraciones

## Google Workspace

### Token OAuth expirado o revocado

Los refresh tokens de Google OAuth pueden ser revocados (por el usuario, por Google, o por inactividad). Cuando esto pasa:

```
Google OAuth token exchange failed
```

O verás errores 401 en las llamadas a la API de Google.

**Solución:** Vuelve a autenticar:

```bash
triggerfish connect google
```

Esto abre un navegador para el flujo de consentimiento OAuth. Después de otorgar acceso, los nuevos tokens se almacenan en el keychain.

### "No refresh token"

El flujo OAuth devolvió un access token pero sin refresh token. Esto pasa cuando:

- Ya habías autorizado la app antes (Google solo envía el refresh token en la primera autorización)
- La pantalla de consentimiento OAuth no solicitó acceso offline

**Solución:** Revoca el acceso de la app en [Configuración de cuenta Google](https://myaccount.google.com/permissions), luego ejecuta `triggerfish connect google` de nuevo. Esta vez Google enviará un refresh token nuevo.

### Prevención de refresh concurrente

Si múltiples solicitudes activan un refresh de token al mismo tiempo, Triggerfish las serializa para que solo se envíe una solicitud de refresh. Si ves timeouts durante el refresh de token, puede ser que el primer refresh esté tardando demasiado.

---

## GitHub

### "GitHub token not found in keychain"

La integración de GitHub almacena el Personal Access Token en el keychain del SO bajo la clave `github-pat`.

**Solución:**

```bash
triggerfish connect github
# o manualmente:
triggerfish config set-secret github-pat ghp_...
```

### Formato del token

GitHub soporta dos formatos de token:
- PATs clásicos: `ghp_...`
- PATs de alcance preciso: `github_pat_...`

Ambos funcionan. El asistente de configuración verifica el token llamando a la API de GitHub. Si la verificación falla:

```
GitHub token verification failed
GitHub API request failed
```

Verifica que el token tenga los alcances requeridos. Para funcionalidad completa, necesitas: `repo`, `read:org`, `read:user`.

### Fallos de clonación

La herramienta de clonación de GitHub tiene lógica de auto-reintento:

1. Primer intento: clona con el `--branch` especificado
2. Si la rama no existe: reintenta sin `--branch` (usa la rama por defecto)

Si ambos intentos fallan:

```
Clone failed on retry
Clone failed
```

Verifica:
- El token tiene alcance `repo`
- El repositorio existe y el token tiene acceso
- Conectividad de red a github.com

### Límite de tasa

El límite de tasa de la API de GitHub es 5,000 solicitudes/hora para solicitudes autenticadas. El conteo de límite restante y el tiempo de reset se extraen de los headers de respuesta y se incluyen en los mensajes de error:

```
Rate limit: X remaining, resets at HH:MM:SS
```

No hay backoff automático. Espera a que se reinicie la ventana del límite de tasa.

---

## Notion

### "Notion enabled but token not found in keychain"

La integración de Notion requiere un token de integración interno almacenado en el keychain.

**Solución:**

```bash
triggerfish connect notion
```

Esto solicita el token y lo almacena en el keychain después de verificarlo con la API de Notion.

### Formato del token

Notion usa dos formatos de token:
- Tokens de integración interna: `ntn_...`
- Tokens legacy: `secret_...`

Ambos son aceptados. El asistente de conexión valida el formato antes de almacenar.

### Límite de tasa (429)

La API de Notion está limitada a aproximadamente 3 solicitudes por segundo. Triggerfish tiene limitación de tasa incorporada (configurable) y lógica de reintento:

- Tasa por defecto: 3 solicitudes/segundo
- Reintentos: hasta 3 veces en 429
- Backoff: exponencial con jitter, comenzando en 1 segundo
- Respeta el header `Retry-After` de la respuesta de Notion

Si aún alcanzas los límites de tasa:

```
Notion API rate limited, retrying
```

Reduce las operaciones concurrentes o baja el límite de tasa en la config.

### 404 Not Found

```
Notion: 404 Not Found
```

El recurso existe pero no está compartido con tu integración. En Notion:

1. Abre la página o base de datos
2. Haz clic en el menú "..." > "Conexiones"
3. Agrega tu integración de Triggerfish

### "client_secret removed" (cambio incompatible)

En una actualización de seguridad, el campo `client_secret` fue eliminado de la config de Notion. Si tienes este campo en tu `triggerfish.yaml`, elimínalo. Notion ahora usa solo el token OAuth almacenado en el keychain.

### Errores de red

```
Notion API network request failed
Notion API network error: <mensaje>
```

La API es inaccesible. Verifica tu conexión de red. Si estás detrás de un proxy corporativo, la API de Notion (`api.notion.com`) debe ser accesible.

---

## CalDAV (calendario)

### Resolución de credenciales falló

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

La integración CalDAV necesita un nombre de usuario y contraseña:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "tu-usuario"
  credential_ref: "secret:caldav:password"
```

Almacena la contraseña:

```bash
triggerfish config set-secret caldav:password <tu-contraseña>
```

### Fallos de descubrimiento

CalDAV usa un proceso de descubrimiento de múltiples pasos:
1. Encontrar la URL principal (PROPFIND en endpoint well-known)
2. Encontrar el calendar-home-set
3. Listar calendarios disponibles

Si algún paso falla:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Causas comunes:
- URL del servidor incorrecta (algunos servidores necesitan `/dav/principals/` o `/remote.php/dav/`)
- Credenciales rechazadas (nombre de usuario/contraseña incorrectos)
- El servidor no soporta CalDAV (algunos servidores anuncian WebDAV pero no CalDAV)

### Discrepancia de ETag en actualización/eliminación

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV usa ETags para control de concurrencia optimista. Si otro cliente (teléfono, web) modificó el evento entre tu lectura y tu actualización, el ETag no coincidirá.

**Solución:** El agente debería obtener el evento de nuevo para conseguir el ETag actual, luego reintentar la operación. Esto se maneja automáticamente en la mayoría de los casos.

### "CalDAV credentials not available, executor deferred"

El ejecutor CalDAV inicia en estado diferido si las credenciales no se pueden resolver al inicio. Esto no es fatal; el ejecutor reportará errores si intentas usar herramientas CalDAV.

---

## Servidores MCP (Model Context Protocol)

### Servidor no encontrado

```
MCP server '<nombre>' not found
```

La llamada a la herramienta referencia un servidor MCP que no está configurado. Revisa tu sección `mcp_servers` en `triggerfish.yaml`.

### Binario del servidor no está en el PATH

Los servidores MCP se generan como subprocesos. Si el binario no se encuentra:

```
MCP server '<nombre>': <error de validación>
```

Problemas comunes:
- El comando (ej., `npx`, `python`, `node`) no está en el PATH del daemon
- **Problema de PATH de systemd/launchd:** El daemon captura tu PATH en el momento de la instalación. Si instalaste la herramienta del servidor MCP después de instalar el daemon, reinstala el daemon para actualizar el PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### El servidor falla

Si un proceso de servidor MCP falla, el bucle de lectura termina y el servidor se vuelve no disponible. No hay reconexión automática.

**Solución:** Reinicia el daemon para volver a generar todos los servidores MCP.

### Transporte SSE bloqueado

Los servidores MCP que usan transporte SSE (Server-Sent Events) están sujetos a verificaciones SSRF:

```
MCP SSE connection blocked by SSRF policy
```

Las URLs SSE que apuntan a direcciones IP privadas están bloqueadas. Esto es por diseño. Usa transporte stdio para servidores MCP locales en su lugar.

### Errores en llamadas a herramientas

```
tools/list failed: <mensaje>
tools/call failed: <mensaje>
```

El servidor MCP respondió con un error. Este es el error del servidor, no de Triggerfish. Revisa los logs propios del servidor MCP para más detalles.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /ruta/al/vault
```

La ruta del vault configurada en `plugins.obsidian.vault_path` no existe. Asegúrate de que la ruta sea correcta y accesible.

### Traversal de ruta bloqueado

```
Path traversal rejected: <ruta>
Path escapes vault boundary: <ruta>
```

Una ruta de nota intentó escapar del directorio del vault (ej., usando `../`). Esta es una verificación de seguridad. Todas las operaciones de notas están confinadas al directorio del vault.

### Carpetas excluidas

```
Path is excluded: <ruta>
```

La nota está en una carpeta listada en `exclude_folders`. Para acceder a ella, elimina la carpeta de la lista de exclusión.

### Aplicación de clasificación

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

El vault o carpeta específica tiene un nivel de clasificación que entra en conflicto con el taint de sesión. Consulta [Solución de problemas de seguridad](/pt-BR/support/troubleshooting/security) para detalles sobre las reglas de write-down.
