# Referencia de errores

Un índice de búsqueda de mensajes de error. Utilice la función de búsqueda de su navegador (Ctrl+F / Cmd+F) para buscar el texto exacto del error que ve en sus registros.

## Inicio y daemon

| Error | Causa | Solución |
|-------|-------|----------|
| `Fatal startup error` | Excepción no gestionada durante el arranque del gateway | Compruebe la traza completa en los registros |
| `Daemon start failed` | El gestor de servicios no pudo iniciar el daemon | Compruebe `triggerfish logs` o el journal del sistema |
| `Daemon stop failed` | El gestor de servicios no pudo detener el daemon | Finalice el proceso manualmente |
| `Failed to load configuration` | El fichero de configuración no es legible o está malformado | Ejecute `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | Falta la sección `models` o no hay proveedor definido | Configure al menos un proveedor |
| `Configuration file not found` | `triggerfish.yaml` no existe en la ruta esperada | Ejecute `triggerfish dive` o cree manualmente |
| `Configuration parse failed` | Error de sintaxis YAML | Corrija la sintaxis YAML (compruebe indentación, dos puntos, comillas) |
| `Configuration file did not parse to an object` | El YAML se analizó pero el resultado no es un mapping | Asegúrese de que el nivel superior es un mapping YAML, no una lista o escalar |
| `Configuration validation failed` | Campos obligatorios ausentes o valores no válidos | Compruebe el mensaje de validación específico |
| `Triggerfish is already running` | El fichero de registro está bloqueado por otra instancia | Detenga primero la instancia en ejecución |
| `Linger enable failed` | `loginctl enable-linger` no tuvo éxito | Ejecute `sudo loginctl enable-linger $USER` |

## Gestión de secretos

| Error | Causa | Solución |
|-------|-------|----------|
| `Secret store failed` | No se pudo inicializar el backend de secretos | Compruebe la disponibilidad del llavero/libsecret |
| `Secret not found` | La clave de secreto referenciada no existe | Almacénela: `triggerfish config set-secret <clave> <valor>` |
| `Machine key file permissions too open` | El fichero de clave tiene permisos más amplios que 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | El fichero de clave no es legible o está truncado | Elimínelo y almacene de nuevo todos los secretos |
| `Machine key chmod failed` | No se pueden establecer permisos en el fichero de clave | Compruebe que el sistema de ficheros soporta chmod |
| `Secret file permissions too open` | El fichero de secretos tiene permisos demasiado permisivos | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | No se pueden establecer permisos en el fichero de secretos | Compruebe el tipo de sistema de ficheros |
| `Secret backend selection failed` | SO no soportado o llavero no disponible | Utilice Docker o habilite el respaldo en memoria |
| `Migrating legacy plaintext secrets to encrypted format` | Fichero de secretos en formato antiguo detectado (INFO, no error) | No se necesita acción; la migración es automática |

## Proveedores LLM

| Error | Causa | Solución |
|-------|-------|----------|
| `Primary provider not found in registry` | El nombre del proveedor en `models.primary.provider` no está en `models.providers` | Corrija el nombre del proveedor |
| `Classification model provider not configured` | `classification_models` referencia un proveedor desconocido | Añada el proveedor a `models.providers` |
| `All providers exhausted` | Todos los proveedores de la cadena de failover han fallado | Compruebe todas las API keys y el estado de los proveedores |
| `Provider request failed with retryable error, retrying` | Error transitorio, reintento en progreso | Espere; la recuperación es automática |
| `Provider stream connection failed, retrying` | Conexión de streaming interrumpida | Espere; la recuperación es automática |
| `Local LLM request failed (status): text` | Ollama/LM Studio devolvió un error | Compruebe que el servidor local está en ejecución y el modelo cargado |
| `No response body for streaming` | El proveedor devolvió una respuesta de streaming vacía | Reintente; puede ser un problema transitorio del proveedor |
| `Unknown provider name in createProviderByName` | El código referencia un tipo de proveedor que no existe | Compruebe la ortografía del nombre del proveedor |

## Canales

| Error | Causa | Solución |
|-------|-------|----------|
| `Channel send failed` | El router no pudo entregar un mensaje | Compruebe errores específicos del canal en los registros |
| `WebSocket connection failed` | El chat del CLI no puede alcanzar el gateway | Compruebe que el daemon está en ejecución |
| `Message parse failed` | JSON malformado recibido del canal | Compruebe que el cliente envía JSON válido |
| `WebSocket upgrade rejected` | Conexión rechazada por el gateway | Compruebe el token de autenticación y las cabeceras de origen |
| `Chat WebSocket message rejected: exceeds size limit` | El cuerpo del mensaje supera 1 MB | Envíe mensajes más pequeños |
| `Discord channel configured but botToken is missing` | La configuración de Discord existe pero el token está vacío | Establezca el token del bot |
| `WhatsApp send failed (status): error` | La API de Meta rechazó la petición de envío | Compruebe la validez del token de acceso |
| `Signal connect failed` | No se puede alcanzar el daemon de signal-cli | Compruebe que signal-cli está en ejecución |
| `Signal ping failed after retries` | signal-cli está en ejecución pero no responde | Reinicie signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli no se inició a tiempo | Compruebe la instalación de Java y la configuración de signal-cli |
| `IMAP LOGIN failed` | Credenciales IMAP incorrectas | Compruebe nombre de usuario y contraseña |
| `IMAP connection not established` | No se puede alcanzar el servidor IMAP | Compruebe el nombre de host del servidor y el puerto 993 |
| `Google Chat PubSub poll failed` | No se puede obtener de la suscripción Pub/Sub | Compruebe las credenciales de Google Cloud |
| `Clipboard image rejected: exceeds size limit` | La imagen pegada es demasiado grande para el búfer de entrada | Utilice una imagen más pequeña |

## Integraciones

| Error | Causa | Solución |
|-------|-------|----------|
| `Google OAuth token exchange failed` | El intercambio de código OAuth devolvió un error | Vuelva a autenticarse: `triggerfish connect google` |
| `GitHub token verification failed` | El PAT no es válido o ha caducado | Almacene de nuevo: `triggerfish connect github` |
| `GitHub API request failed` | La API de GitHub devolvió un error | Compruebe los scopes del token y los límites de tasa |
| `Clone failed` | git clone falló | Compruebe token, acceso al repo y red |
| `Notion enabled but token not found in keychain` | Token de integración de Notion no almacenado | Ejecute `triggerfish connect notion` |
| `Notion API rate limited` | Superado 3 pet/seg | Espere el reintento automático (hasta 3 intentos) |
| `Notion API network request failed` | No se puede alcanzar api.notion.com | Compruebe la conectividad de red |
| `CalDAV credential resolution failed` | Falta nombre de usuario o contraseña CalDAV | Establezca credenciales en configuración y llavero |
| `CalDAV principal discovery failed` | No se puede encontrar la URL principal CalDAV | Compruebe el formato de la URL del servidor |
| `MCP server 'name' not found` | El servidor MCP referenciado no está en la configuración | Añádalo a `mcp_servers` en la configuración |
| `MCP SSE connection blocked by SSRF policy` | La URL SSE de MCP apunta a una IP privada | Utilice transporte stdio en su lugar |
| `Vault path does not exist` | La ruta del vault de Obsidian es incorrecta | Corrija `plugins.obsidian.vault_path` |
| `Path traversal rejected` | La ruta de la nota intentó escapar del directorio del vault | Utilice rutas dentro del vault |

## Seguridad y política

| Error | Causa | Solución |
|-------|-------|----------|
| `Write-down blocked` | Datos fluyendo de clasificación alta a baja | Utilice un canal/herramienta en el nivel de clasificación adecuado |
| `SSRF blocked: hostname resolves to private IP` | Petición saliente apunta a red interna | No puede desactivarse; utilice una URL pública |
| `Hook evaluation failed, defaulting to BLOCK` | El hook de política lanzó una excepción | Compruebe las reglas de política personalizadas |
| `Policy rule blocked action` | Una regla de política denegó la acción | Revise `policy.rules` en la configuración |
| `Tool floor violation` | La herramienta requiere clasificación superior a la de la sesión | Escale la sesión o utilice una herramienta diferente |
| `Plugin network access blocked` | El plugin intentó acceder a una URL no autorizada | El plugin debe declarar endpoints en su manifiesto |
| `Plugin SSRF blocked` | La URL del plugin se resuelve a una IP privada | El plugin no puede acceder a redes privadas |
| `Skill activation blocked by classification ceiling` | El taint de la sesión supera el techo de la skill | No puede utilizar esta skill al nivel de taint actual |
| `Skill content integrity check failed` | Los ficheros de la skill fueron modificados tras la instalación | Reinstale la skill |
| `Skill install rejected by scanner` | El escáner de seguridad encontró contenido sospechoso | Revise las advertencias del escaneo |
| `Delegation certificate signature invalid` | La cadena de delegación tiene una firma no válida | Vuelva a emitir la delegación |
| `Delegation certificate expired` | La delegación ha caducado | Vuelva a emitir con un TTL más largo |
| `Webhook HMAC verification failed` | La firma del webhook no coincide | Compruebe la configuración del secreto compartido |
| `Webhook replay detected` | Carga útil de webhook duplicada recibida | No es un error si se espera; si no, investigue |
| `Webhook rate limit exceeded` | Demasiadas llamadas de webhook de un origen | Reduzca la frecuencia de webhooks |

## Navegador

| Error | Causa | Solución |
|-------|-------|----------|
| `Browser launch failed` | No se pudo iniciar Chrome/Chromium | Instale un navegador basado en Chromium |
| `Direct Chrome process launch failed` | El binario de Chrome no se pudo ejecutar | Compruebe permisos del binario y dependencias |
| `Flatpak Chrome launch failed` | El envolvente de Chrome Flatpak falló | Compruebe la instalación de Flatpak |
| `CDP endpoint not ready after Xms` | Chrome no abrió el puerto de depuración a tiempo | El sistema puede tener recursos limitados |
| `Navigation blocked by domain policy` | La URL apunta a un dominio bloqueado o IP privada | Utilice una URL pública |
| `Navigation failed` | Error de carga de página o tiempo de espera | Compruebe la URL y la red |
| `Click/Type/Select failed on "selector"` | El selector CSS no coincidió con ningún elemento | Compruebe el selector contra el DOM de la página |
| `Snapshot failed` | No se pudo capturar el estado de la página | La página puede estar en blanco o con error de JavaScript |

## Ejecución y sandbox

| Error | Causa | Solución |
|-------|-------|----------|
| `Working directory path escapes workspace jail` | Intento de travesía de ruta en el entorno de ejecución | Utilice rutas dentro del espacio de trabajo |
| `Working directory does not exist` | El directorio de trabajo especificado no se encontró | Cree primero el directorio |
| `Workspace access denied for PUBLIC session` | Las sesiones PUBLIC no pueden usar espacios de trabajo | El espacio de trabajo requiere clasificación INTERNAL+ |
| `Workspace path traversal attempt blocked` | La ruta intentó escapar del límite del espacio de trabajo | Utilice rutas relativas dentro del espacio de trabajo |
| `Workspace agentId rejected: empty after sanitization` | El ID del agente contiene solo caracteres no válidos | Compruebe la configuración del agente |
| `Sandbox worker unhandled error` | El worker del sandbox del plugin se bloqueó | Compruebe el código del plugin en busca de errores |
| `Sandbox has been shut down` | Operación intentada en un sandbox destruido | Reinicie el daemon |

## Programador

| Error | Causa | Solución |
|-------|-------|----------|
| `Trigger callback failed` | El manejador del trigger lanzó una excepción | Compruebe TRIGGER.md en busca de problemas |
| `Trigger store persist failed` | No se pueden guardar los resultados del trigger | Compruebe la conectividad del almacenamiento |
| `Notification delivery failed` | No se pudo enviar la notificación del trigger | Compruebe la conectividad del canal |
| `Cron expression parse error` | Expresión cron no válida | Corrija la expresión en `scheduler.cron.jobs` |

## Autoactualización

| Error | Causa | Solución |
|-------|-------|----------|
| `Triggerfish self-update failed` | El proceso de actualización encontró un error | Compruebe el error específico en los registros |
| `Binary replacement failed` | No se pudo intercambiar el binario antiguo por el nuevo | Compruebe los permisos de ficheros; detenga el daemon primero |
| `Checksum file download failed` | No se pudo descargar SHA256SUMS.txt | Compruebe la conectividad de red |
| `Asset not found in SHA256SUMS.txt` | La versión no tiene checksum para su plataforma | Abra un issue en GitHub |
| `Checksum verification exception` | El hash del binario descargado no coincide | Reintente; la descarga puede haberse corrompido |
