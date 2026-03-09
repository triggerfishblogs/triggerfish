# Solución de problemas: Integraciones

## Google Workspace

### Token OAuth caducado o revocado

Los tokens de actualización OAuth de Google pueden ser revocados (por el usuario, por Google o por inactividad). Cuando esto ocurre:

```
Google OAuth token exchange failed
```

O verá errores 401 en las llamadas a la API de Google.

**Solución:** Vuelva a autenticarse:

```bash
triggerfish connect google
```

Esto abre un navegador para el flujo de consentimiento OAuth. Tras conceder el acceso, los nuevos tokens se almacenan en el llavero.

### "No refresh token"

El flujo OAuth devolvió un token de acceso pero no un token de actualización. Esto ocurre cuando:

- Ya ha autorizado la aplicación anteriormente (Google solo envía el token de actualización en la primera autorización)
- La pantalla de consentimiento OAuth no solicitó acceso sin conexión

**Solución:** Revoque el acceso de la aplicación en la [Configuración de la cuenta de Google](https://myaccount.google.com/permissions), luego ejecute `triggerfish connect google` de nuevo. Esta vez Google enviará un token de actualización nuevo.

### Prevención de actualización simultánea

Si múltiples peticiones activan una actualización de token al mismo tiempo, Triggerfish las serializa para que solo se envíe una petición de actualización. Si ve tiempos de espera durante la actualización del token, puede ser que la primera actualización esté tardando demasiado.

---

## GitHub

### "GitHub token not found in keychain"

La integración de GitHub almacena el Personal Access Token en el llavero del sistema operativo con la clave `github-pat`.

**Solución:**

```bash
triggerfish connect github
# o manualmente:
triggerfish config set-secret github-pat ghp_...
```

### Formato del token

GitHub soporta dos formatos de token:
- PAT clásicos: `ghp_...`
- PAT de grano fino: `github_pat_...`

Ambos funcionan. El asistente de configuración verifica el token llamando a la API de GitHub. Si la verificación falla:

```
GitHub token verification failed
GitHub API request failed
```

Compruebe que el token tiene los scopes necesarios. Para funcionalidad completa, necesita: `repo`, `read:org`, `read:user`.

### Fallos de clonación

La herramienta de clonación de GitHub tiene lógica de reintento automático:

1. Primer intento: clona con el `--branch` especificado
2. Si la rama no existe: reintenta sin `--branch` (usa la rama por defecto)

Si ambos intentos fallan:

```
Clone failed on retry
Clone failed
```

Compruebe:
- El token tiene el scope `repo`
- El repositorio existe y el token tiene acceso
- Conectividad de red a github.com

### Limitación de tasa

El límite de tasa de la API de GitHub es de 5.000 peticiones/hora para peticiones autenticadas. El recuento de peticiones restantes y el tiempo de restablecimiento se extraen de las cabeceras de respuesta y se incluyen en los mensajes de error:

```
Rate limit: X remaining, resets at HH:MM:SS
```

No hay retroceso automático. Espere a que se restablezca la ventana de límite de tasa.

---

## Notion

### "Notion enabled but token not found in keychain"

La integración de Notion requiere un token de integración interno almacenado en el llavero.

**Solución:**

```bash
triggerfish connect notion
```

Esto solicita el token y lo almacena en el llavero tras verificarlo con la API de Notion.

### Formato del token

Notion utiliza dos formatos de token:
- Tokens de integración interna: `ntn_...`
- Tokens heredados: `secret_...`

Ambos son aceptados. El asistente de conexión valida el formato antes de almacenarlo.

### Limitación de tasa (429)

La API de Notion tiene un límite de tasa de aproximadamente 3 peticiones por segundo. Triggerfish tiene limitación de tasa incorporada (configurable) y lógica de reintentos:

- Tasa por defecto: 3 peticiones/segundo
- Reintentos: hasta 3 veces en caso de 429
- Retroceso: exponencial con fluctuación, empezando en 1 segundo
- Respeta la cabecera `Retry-After` de la respuesta de Notion

Si sigue alcanzando los límites de tasa:

```
Notion API rate limited, retrying
```

Reduzca las operaciones simultáneas o baje el límite de tasa en la configuración.

### 404 Not Found

```
Notion: 404 Not Found
```

El recurso existe pero no está compartido con su integración. En Notion:

1. Abra la página o base de datos
2. Haga clic en el menú "..." > "Connections"
3. Añada su integración de Triggerfish

### "client_secret removed" (Cambio incompatible)

En una actualización de seguridad, el campo `client_secret` fue eliminado de la configuración de Notion. Si tiene este campo en su `triggerfish.yaml`, elimínelo. Notion ahora utiliza solo el token OAuth almacenado en el llavero.

### Errores de red

```
Notion API network request failed
Notion API network error: <mensaje>
```

La API no es accesible. Compruebe su conexión de red. Si está detrás de un proxy corporativo, la API de Notion (`api.notion.com`) debe ser accesible.

---

## CalDAV (Calendario)

### Resolución de credenciales fallida

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

La integración CalDAV necesita un nombre de usuario y una contraseña:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "su-nombre-de-usuario"
  credential_ref: "secret:caldav:password"
```

Almacene la contraseña:

```bash
triggerfish config set-secret caldav:password <su-contraseña>
```

### Fallos de descubrimiento

CalDAV utiliza un proceso de descubrimiento de varios pasos:
1. Encontrar la URL principal (PROPFIND en el endpoint well-known)
2. Encontrar el calendar-home-set
3. Listar los calendarios disponibles

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

### Discordancia de ETag en actualización/eliminación

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV utiliza ETags para control de concurrencia optimista. Si otro cliente (teléfono, web) modificó el evento entre su lectura y su actualización, el ETag no coincidirá.

**Solución:** El agente debe obtener el evento de nuevo para conseguir el ETag actual y luego reintentar la operación. Esto se gestiona automáticamente en la mayoría de los casos.

### "CalDAV credentials not available, executor deferred"

El ejecutor de CalDAV se inicia en estado diferido si las credenciales no pueden resolverse al arrancar. Esto no es fatal; el ejecutor informará de errores si intenta utilizar herramientas CalDAV.

---

## Servidores MCP (Model Context Protocol)

### Servidor no encontrado

```
MCP server '<nombre>' not found
```

La llamada a herramienta referencia un servidor MCP que no está configurado. Compruebe su sección `mcp_servers` en `triggerfish.yaml`.

### Binario del servidor no está en el PATH

Los servidores MCP se lanzan como subprocesos. Si el binario no se encuentra:

```
MCP server '<nombre>': <error de validación>
```

Problemas comunes:
- El comando (por ejemplo, `npx`, `python`, `node`) no está en el PATH del daemon
- **Problema de PATH con systemd/launchd:** El daemon captura su PATH en el momento de la instalación. Si instaló la herramienta del servidor MCP después de instalar el daemon, reinstale el daemon para actualizar el PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### El servidor se bloquea

Si un proceso de servidor MCP se bloquea, el bucle de lectura se cierra y el servidor queda no disponible. No hay reconexión automática.

**Solución:** Reinicie el daemon para relanzar todos los servidores MCP.

### Transporte SSE bloqueado

Los servidores MCP que utilizan transporte SSE (Server-Sent Events) están sujetos a comprobaciones SSRF:

```
MCP SSE connection blocked by SSRF policy
```

Las URLs SSE que apuntan a direcciones IP privadas están bloqueadas. Esto es por diseño. Utilice el transporte stdio para servidores MCP locales en su lugar.

### Errores de llamadas a herramientas

```
tools/list failed: <mensaje>
tools/call failed: <mensaje>
```

El servidor MCP respondió con un error. Este es el error del servidor, no de Triggerfish. Compruebe los registros propios del servidor MCP para más detalles.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /ruta/al/vault
```

La ruta del vault configurada en `plugins.obsidian.vault_path` no existe. Asegúrese de que la ruta es correcta y accesible.

### Travesía de ruta bloqueada

```
Path traversal rejected: <ruta>
Path escapes vault boundary: <ruta>
```

Una ruta de nota intentó escapar del directorio del vault (por ejemplo, usando `../`). Esta es una comprobación de seguridad. Todas las operaciones con notas están confinadas al directorio del vault.

### Carpetas excluidas

```
Path is excluded: <ruta>
```

La nota está en una carpeta listada en `exclude_folders`. Para acceder a ella, elimine la carpeta de la lista de exclusión.

### Aplicación de clasificación

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

El vault o una carpeta específica tiene un nivel de clasificación que entra en conflicto con el taint de la sesión. Consulte [Solución de problemas de seguridad](/es-ES/support/troubleshooting/security) para detalles sobre las reglas de write-down.
