# Referencia de errores

Un índice de mensajes de error para búsqueda. Usa la función de búsqueda de tu navegador (Ctrl+F / Cmd+F) para buscar el texto exacto del error que ves en tus logs.

## Inicio y daemon

| Error | Causa | Solución |
|-------|-------|----------|
| `Fatal startup error` | Excepción no manejada durante el arranque del gateway | Revisa el stack trace completo en los logs |
| `Daemon start failed` | El gestor de servicios no pudo iniciar el daemon | Revisa `triggerfish logs` o el journal del sistema |
| `Daemon stop failed` | El gestor de servicios no pudo detener el daemon | Termina el proceso manualmente |
| `Failed to load configuration` | Archivo de config ilegible o malformado | Ejecuta `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | Falta la sección `models` o no hay proveedor definido | Configura al menos un proveedor |
| `Configuration file not found` | `triggerfish.yaml` no existe en la ruta esperada | Ejecuta `triggerfish dive` o créalo manualmente |
| `Configuration parse failed` | Error de sintaxis YAML | Corrige la sintaxis YAML (verifica indentación, dos puntos, comillas) |
| `Configuration file did not parse to an object` | YAML se analizó pero el resultado no es un mapeo | Asegura que el nivel superior sea un mapeo YAML, no una lista o escalar |
| `Configuration validation failed` | Campos requeridos faltantes o valores inválidos | Revisa el mensaje de validación específico |
| `Triggerfish is already running` | El archivo de log está bloqueado por otra instancia | Detén la instancia en ejecución primero |
| `Linger enable failed` | `loginctl enable-linger` no tuvo éxito | Ejecuta `sudo loginctl enable-linger $USER` |

## Gestión de secrets

| Error | Causa | Solución |
|-------|-------|----------|
| `Secret store failed` | No se pudo inicializar el backend de secrets | Verifica disponibilidad del keychain/libsecret |
| `Secret not found` | La clave de secret referenciada no existe | Almacénalo: `triggerfish config set-secret <clave> <valor>` |
| `Machine key file permissions too open` | El archivo de clave tiene permisos más amplios que 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | El archivo de clave es ilegible o está truncado | Elimínalo y vuelve a almacenar todos los secrets |
| `Machine key chmod failed` | No se pueden establecer permisos en el archivo de clave | Verifica que el sistema de archivos soporte chmod |
| `Secret file permissions too open` | El archivo de secrets tiene permisos demasiado permisivos | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | No se pueden establecer permisos en el archivo de secrets | Verifica el tipo de sistema de archivos |
| `Secret backend selection failed` | SO no soportado o keychain no disponible | Usa Docker o habilita el fallback en memoria |
| `Migrating legacy plaintext secrets to encrypted format` | Archivo de secrets en formato antiguo detectado (INFO, no error) | No se requiere acción; la migración es automática |

## Proveedores de LLM

| Error | Causa | Solución |
|-------|-------|----------|
| `Primary provider not found in registry` | El nombre del proveedor en `models.primary.provider` no está en `models.providers` | Corrige el nombre del proveedor |
| `Classification model provider not configured` | `classification_models` referencia un proveedor desconocido | Agrega el proveedor a `models.providers` |
| `All providers exhausted` | Cada proveedor en la cadena de failover falló | Verifica todas las API keys y el estado de los proveedores |
| `Provider request failed with retryable error, retrying` | Error transitorio, reintento en progreso | Espera; esta es recuperación automática |
| `Provider stream connection failed, retrying` | Conexión de streaming caída | Espera; esta es recuperación automática |
| `Local LLM request failed (status): text` | Ollama/LM Studio devolvió un error | Verifica que el servidor local esté ejecutándose y el modelo cargado |
| `No response body for streaming` | El proveedor devolvió una respuesta de streaming vacía | Reintenta; puede ser un problema transitorio del proveedor |
| `Unknown provider name in createProviderByName` | El código referencia un tipo de proveedor que no existe | Verifica la ortografía del nombre del proveedor |

## Canales

| Error | Causa | Solución |
|-------|-------|----------|
| `Channel send failed` | El router no pudo entregar un mensaje | Revisa errores específicos del canal en los logs |
| `WebSocket connection failed` | El chat del CLI no puede alcanzar el gateway | Verifica que el daemon esté ejecutándose |
| `Message parse failed` | JSON malformado recibido del canal | Verifica que el cliente envíe JSON válido |
| `WebSocket upgrade rejected` | Conexión rechazada por el gateway | Verifica token de autenticación y headers de origen |
| `Chat WebSocket message rejected: exceeds size limit` | El cuerpo del mensaje excede 1 MB | Envía mensajes más pequeños |
| `Discord channel configured but botToken is missing` | La config de Discord existe pero el token está vacío | Configura el bot token |
| `WhatsApp send failed (status): error` | La API de Meta rechazó la solicitud de envío | Verifica la validez del access token |
| `Signal connect failed` | No se puede alcanzar el daemon de signal-cli | Verifica que signal-cli esté ejecutándose |
| `Signal ping failed after retries` | signal-cli está ejecutándose pero no responde | Reinicia signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli no inició a tiempo | Verifica la instalación de Java y la configuración de signal-cli |
| `IMAP LOGIN failed` | Credenciales IMAP incorrectas | Verifica nombre de usuario y contraseña |
| `IMAP connection not established` | No se puede alcanzar el servidor IMAP | Verifica hostname del servidor y puerto 993 |
| `Google Chat PubSub poll failed` | No se puede hacer pull de la suscripción Pub/Sub | Verifica credenciales de Google Cloud |
| `Clipboard image rejected: exceeds size limit` | La imagen pegada es demasiado grande para el buffer de entrada | Usa una imagen más pequeña |

## Integraciones

| Error | Causa | Solución |
|-------|-------|----------|
| `Google OAuth token exchange failed` | El intercambio de código OAuth devolvió un error | Vuelve a autenticar: `triggerfish connect google` |
| `GitHub token verification failed` | El PAT es inválido o expiró | Vuelve a almacenar: `triggerfish connect github` |
| `GitHub API request failed` | La API de GitHub devolvió un error | Verifica los alcances del token y los límites de tasa |
| `Clone failed` | git clone falló | Verifica token, acceso al repo y red |
| `Notion enabled but token not found in keychain` | Token de integración de Notion no almacenado | Ejecuta `triggerfish connect notion` |
| `Notion API rate limited` | Excediste 3 req/seg | Espera el reintento automático (hasta 3 intentos) |
| `Notion API network request failed` | No se puede alcanzar api.notion.com | Verifica conectividad de red |
| `CalDAV credential resolution failed` | Falta nombre de usuario o contraseña CalDAV | Configura credenciales en config y keychain |
| `CalDAV principal discovery failed` | No se puede encontrar la URL principal CalDAV | Verifica el formato de la URL del servidor |
| `MCP server 'name' not found` | Servidor MCP referenciado no está en la config | Agrégalo a `mcp_servers` en la config |
| `MCP SSE connection blocked by SSRF policy` | La URL SSE del MCP apunta a IP privada | Usa transporte stdio en su lugar |
| `Vault path does not exist` | La ruta del vault de Obsidian es incorrecta | Corrige `plugins.obsidian.vault_path` |
| `Path traversal rejected` | La ruta de nota intentó escapar del directorio del vault | Usa rutas dentro del vault |

## Seguridad y políticas

| Error | Causa | Solución |
|-------|-------|----------|
| `Write-down blocked` | Datos fluyendo de clasificación alta a baja | Usa un canal/herramienta al nivel de clasificación correcto |
| `SSRF blocked: hostname resolves to private IP` | Solicitud saliente apunta a red interna | No se puede deshabilitar; usa una URL pública |
| `Hook evaluation failed, defaulting to BLOCK` | El hook de política lanzó una excepción | Revisa las reglas de política personalizadas |
| `Policy rule blocked action` | Una regla de política denegó la acción | Revisa `policy.rules` en la config |
| `Tool floor violation` | La herramienta requiere clasificación más alta de la que tiene la sesión | Escala la sesión o usa una herramienta diferente |
| `Plugin network access blocked` | El plugin intentó acceder a URL no autorizada | El plugin debe declarar endpoints en su manifiesto |
| `Plugin SSRF blocked` | La URL del plugin resuelve a IP privada | El plugin no puede acceder a redes privadas |
| `Skill activation blocked by classification ceiling` | El taint de sesión excede el techo del skill | No se puede usar este skill al nivel de taint actual |
| `Skill content integrity check failed` | Los archivos del skill fueron modificados después de la instalación | Reinstala el skill |
| `Skill install rejected by scanner` | El escáner de seguridad encontró contenido sospechoso | Revisa las advertencias del escaneo |
| `Delegation certificate signature invalid` | La cadena de delegación tiene una firma inválida | Vuelve a emitir la delegación |
| `Delegation certificate expired` | La delegación ha expirado | Vuelve a emitir con TTL más largo |
| `Webhook HMAC verification failed` | La firma del webhook no coincide | Verifica la configuración del secret compartido |
| `Webhook replay detected` | Payload de webhook duplicado recibido | No es un error si es esperado; de lo contrario investiga |
| `Webhook rate limit exceeded` | Demasiadas llamadas de webhook de una fuente | Reduce la frecuencia de webhooks |

## Navegador

| Error | Causa | Solución |
|-------|-------|----------|
| `Browser launch failed` | No se pudo iniciar Chrome/Chromium | Instala un navegador basado en Chromium |
| `Direct Chrome process launch failed` | El binario de Chrome falló al ejecutarse | Verifica permisos del binario y dependencias |
| `Flatpak Chrome launch failed` | El wrapper de Chrome Flatpak falló | Verifica la instalación de Flatpak |
| `CDP endpoint not ready after Xms` | Chrome no abrió el puerto de depuración a tiempo | El sistema puede tener recursos limitados |
| `Navigation blocked by domain policy` | URL apunta a dominio bloqueado o IP privada | Usa una URL pública |
| `Navigation failed` | Error de carga de página o timeout | Verifica URL y red |
| `Click/Type/Select failed on "selector"` | El selector CSS no coincidió con ningún elemento | Verifica el selector contra el DOM de la página |
| `Snapshot failed` | No se pudo capturar el estado de la página | La página puede estar en blanco o JavaScript dio error |

## Ejecución y sandbox

| Error | Causa | Solución |
|-------|-------|----------|
| `Working directory path escapes workspace jail` | Intento de traversal de ruta en el entorno de ejecución | Usa rutas dentro del workspace |
| `Working directory does not exist` | Directorio de trabajo especificado no encontrado | Crea el directorio primero |
| `Workspace access denied for PUBLIC session` | Las sesiones PUBLIC no pueden usar workspaces | Workspace requiere clasificación INTERNAL+ |
| `Workspace path traversal attempt blocked` | La ruta intentó escapar del límite del workspace | Usa rutas relativas dentro del workspace |
| `Workspace agentId rejected: empty after sanitization` | El ID del agente contiene solo caracteres inválidos | Verifica la configuración del agente |
| `Sandbox worker unhandled error` | El worker del sandbox del plugin falló | Revisa el código del plugin por errores |
| `Sandbox has been shut down` | Operación intentada en sandbox destruido | Reinicia el daemon |

## Planificador

| Error | Causa | Solución |
|-------|-------|----------|
| `Trigger callback failed` | El manejador del trigger lanzó una excepción | Revisa TRIGGER.md por problemas |
| `Trigger store persist failed` | No se pueden guardar los resultados del trigger | Verifica la conectividad del almacenamiento |
| `Notification delivery failed` | No se pudo enviar la notificación del trigger | Verifica la conectividad del canal |
| `Cron expression parse error` | Expresión cron inválida | Corrige la expresión en `scheduler.cron.jobs` |

## Auto-actualización

| Error | Causa | Solución |
|-------|-------|----------|
| `Triggerfish self-update failed` | El proceso de actualización encontró un error | Revisa el error específico en los logs |
| `Binary replacement failed` | No se pudo intercambiar el binario antiguo por el nuevo | Verifica permisos de archivo; detén el daemon primero |
| `Checksum file download failed` | No se pudo descargar SHA256SUMS.txt | Verifica conectividad de red |
| `Asset not found in SHA256SUMS.txt` | El release no tiene checksum para tu plataforma | Reporta un issue en GitHub |
| `Checksum verification exception` | El hash del binario descargado no coincide | Reintenta; la descarga puede haberse corrompido |
