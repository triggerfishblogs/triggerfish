# Solución de problemas: canales

## Problemas generales de canales

### El canal aparece conectado pero no llegan mensajes

1. **Verifica el ID del propietario.** Si `ownerId` no está configurado o es incorrecto, los mensajes tuyos pueden ser enrutados como mensajes externos (no propietario) con permisos restringidos.
2. **Verifica la clasificación.** Si la clasificación del canal es menor que el taint de la sesión, las respuestas se bloquean por la regla de no write-down.
3. **Revisa los logs del daemon.** Ejecuta `triggerfish logs --level WARN` y busca errores de entrega.

### Los mensajes no se están enviando

El router registra los fallos de entrega. Revisa `triggerfish logs` en busca de:

```
Channel send failed
```

Esto significa que el router intentó la entrega pero el adaptador del canal devolvió un error. El error específico se registrará junto a él.

### Comportamiento de reintento

El router de canales usa backoff exponencial para envíos fallidos. Si un mensaje falla, se reintenta con retrasos crecientes. Después de agotar todos los reintentos, el mensaje se descarta y el error se registra.

---

## Telegram

### El bot no responde

1. **Verifica el token.** Ve a @BotFather en Telegram, verifica que tu token sea válido y coincida con lo almacenado en el keychain.
2. **Envía un mensaje directo al bot.** Los mensajes de grupo requieren que el bot tenga permisos de mensajes de grupo.
3. **Busca errores de polling.** Telegram usa long polling. Si la conexión se cae, el adaptador se reconecta automáticamente, pero problemas persistentes de red impedirán la recepción de mensajes.

### Los mensajes se dividen en varias partes

Telegram tiene un límite de 4,096 caracteres por mensaje. Las respuestas largas se dividen automáticamente en chunks. Este es el comportamiento normal.

### Los comandos del bot no aparecen en el menú

El adaptador registra los comandos slash al iniciar. Si el registro falla, registra una advertencia pero continúa ejecutándose. Esto no es fatal. El bot sigue funcionando; el menú de comandos simplemente no mostrará sugerencias de autocompletado.

### No se pueden eliminar mensajes antiguos

Telegram no permite a los bots eliminar mensajes con más de 48 horas. Los intentos de eliminar mensajes antiguos fallan silenciosamente. Esta es una limitación de la API de Telegram.

---

## Slack

### El bot no se conecta

Slack requiere tres credenciales:

| Credencial | Formato | Dónde encontrarla |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | Página de OAuth & Permissions en configuración de la app de Slack |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Cadena hexadecimal | Basic Information > App Credentials |

Si alguna de las tres falta o es inválida, la conexión falla. El error más común es olvidar el App Token, que es separado del Bot Token.

### Problemas de Socket Mode

Triggerfish usa Socket Mode de Slack, no suscripciones de eventos HTTP. En la configuración de tu app de Slack:

1. Ve a "Socket Mode" y asegúrate de que esté habilitado
2. Crea un token de nivel app con el alcance `connections:write`
3. Este token es el `appToken` (`xapp-...`)

Si Socket Mode no está habilitado, el bot token solo no es suficiente para mensajería en tiempo real.

### Los mensajes se truncan

Slack tiene un límite de 40,000 caracteres. A diferencia de Telegram y Discord, Triggerfish trunca los mensajes de Slack en lugar de dividirlos. Si regularmente alcanzas este límite, considera pedirle a tu agente que produzca salidas más concisas.

### Fugas de recursos del SDK en pruebas

El SDK de Slack filtra operaciones asíncronas al importar. Este es un problema conocido upstream. Las pruebas que usan el adaptador de Slack necesitan `sanitizeResources: false` y `sanitizeOps: false`. Esto no afecta el uso en producción.

---

## Discord

### El bot no puede leer mensajes en servidores

Discord requiere el intent privilegiado **Message Content**. Sin él, el bot recibe eventos de mensajes pero el contenido del mensaje está vacío.

**Solución:** En el [Portal de desarrolladores de Discord](https://discord.com/developers/applications):
1. Selecciona tu aplicación
2. Ve a la configuración de "Bot"
3. Habilita "Message Content Intent" bajo Privileged Gateway Intents
4. Guarda los cambios

### Intents requeridos del bot

El adaptador requiere estos intents habilitados:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privilegiado)

### Los mensajes se dividen en chunks

Discord tiene un límite de 2,000 caracteres. Los mensajes largos se dividen automáticamente en múltiples mensajes.

### El indicador de escritura falla

El adaptador envía indicadores de escritura antes de las respuestas. Si el bot no tiene permiso para enviar mensajes en un canal, el indicador de escritura falla silenciosamente (registrado a nivel DEBUG). Esto es solo cosmético.

### Fugas de recursos del SDK

Como Slack, el SDK discord.js filtra operaciones asíncronas al importar. Las pruebas necesitan `sanitizeOps: false`. Esto no afecta producción.

---

## WhatsApp

### No se reciben mensajes

WhatsApp usa un modelo de webhook. El bot escucha solicitudes HTTP POST entrantes de los servidores de Meta. Para que lleguen mensajes:

1. **Registra la URL del webhook** en el [Panel de Meta Business](https://developers.facebook.com/)
2. **Configura el verify token.** El adaptador ejecuta un handshake de verificación cuando Meta se conecta por primera vez
3. **Inicia el listener de webhook.** El adaptador escucha en el puerto 8443 por defecto. Asegúrate de que este puerto sea accesible desde internet (usa un proxy inverso o túnel)

### Advertencia "ownerPhone not configured"

Si `ownerPhone` no está configurado en la configuración del canal WhatsApp, todos los remitentes son tratados como propietarios. Esto significa que cada usuario obtiene acceso completo a todas las herramientas. Esto es un problema de seguridad.

**Solución:** Configura el número de teléfono del propietario en tu configuración:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Access token expirado

Los access tokens de WhatsApp Cloud API pueden expirar. Si los envíos empiezan a fallar con errores 401, regenera el token en el panel de Meta y actualízalo:

```bash
triggerfish config set-secret whatsapp:accessToken <nuevo-token>
```

---

## Signal

### signal-cli no encontrado

El canal Signal requiere `signal-cli`, una aplicación Java de terceros. Triggerfish intenta auto-instalarlo durante la configuración, pero esto puede fallar si:

- Java (JRE 21+) no está disponible y la auto-instalación de JRE 25 falló
- La descarga fue bloqueada por restricciones de red
- El directorio destino no es escribible

**Instalación manual:**

```bash
# Instalar signal-cli manualmente
# Ver https://github.com/AsamK/signal-cli para instrucciones
```

### El daemon de signal-cli no es accesible

Después de iniciar signal-cli, Triggerfish espera hasta 60 segundos para que sea accesible. Si esto expira:

```
signal-cli daemon (tcp) not reachable within 60s
```

Verifica:
1. ¿signal-cli está realmente ejecutándose? Verifica `ps aux | grep signal-cli`
2. ¿Está escuchando en el endpoint esperado (socket TCP o socket Unix)?
3. ¿La cuenta Signal necesita ser vinculada? Ejecuta `triggerfish config add-channel signal` para pasar por el proceso de vinculación de nuevo.

### Vinculación de dispositivo fallida

Signal requiere vincular el dispositivo a tu cuenta Signal vía código QR. Si el proceso de vinculación falla:

1. Asegúrate de que Signal esté instalado en tu teléfono
2. Abre Signal > Configuración > Dispositivos vinculados > Vincular nuevo dispositivo
3. Escanea el código QR mostrado por el asistente de configuración
4. Si el código QR expiró, reinicia el proceso de vinculación

### Discrepancia de versión de signal-cli

Triggerfish se fija a una versión conocida de signal-cli. Si instalaste una versión diferente, podrías ver una advertencia:

```
Signal CLI version older than known-good
```

Esto no es fatal pero puede causar problemas de compatibilidad.

---

## Email

### La conexión IMAP falla

El adaptador de email se conecta a tu servidor IMAP para correo entrante. Problemas comunes:

- **Credenciales incorrectas.** Verifica el nombre de usuario y contraseña IMAP.
- **Puerto 993 bloqueado.** El adaptador usa IMAP sobre TLS (puerto 993). Algunas redes lo bloquean.
- **Se requiere contraseña específica de app.** Gmail y otros proveedores requieren contraseñas específicas de app cuando 2FA está habilitado.

Mensajes de error que podrías ver:
- `IMAP LOGIN failed` - nombre de usuario o contraseña incorrectos
- `IMAP connection not established` - no se puede alcanzar el servidor
- `IMAP connection closed unexpectedly` - el servidor cerró la conexión

### Fallos de envío SMTP

El adaptador de email envía vía un relay de API SMTP (no SMTP directo). Si los envíos fallan con errores HTTP:

- 401/403: API key inválida
- 429: Límite de tasa excedido
- 5xx: El servicio de relay está caído

### El polling IMAP se detiene

El adaptador hace polling de nuevos emails cada 30 segundos. Si el polling falla, el error se registra pero no hay reconexión automática. Reinicia el daemon para restablecer la conexión IMAP.

Esta es una limitación conocida. Consulta [Problemas conocidos](/es-419/support/kb/known-issues).

---

## WebChat

### Upgrade WebSocket rechazado

El adaptador WebChat valida las conexiones entrantes:

- **Headers demasiado grandes (431).** El tamaño combinado de headers excede 8,192 bytes. Esto puede pasar con cookies excesivamente grandes o headers personalizados.
- **Rechazo CORS.** Si `allowedOrigins` está configurado, el header Origin debe coincidir. El valor por defecto es `["*"]` (permitir todo).
- **Frames malformados.** JSON inválido en frames WebSocket se registra a nivel WARN y el frame se descarta.

### Clasificación

WebChat tiene clasificación PUBLIC por defecto. Los visitantes nunca son tratados como propietarios. Si necesitas clasificación más alta para WebChat, configúrala explícitamente:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### Fallos de polling PubSub

Google Chat usa Pub/Sub para la entrega de mensajes. Si el polling falla:

```
Google Chat PubSub poll failed
```

Verifica:
- Las credenciales de Google Cloud son válidas (verifica el `credentials_ref` en la config)
- La suscripción Pub/Sub existe y no ha sido eliminada
- La cuenta de servicio tiene el rol `pubsub.subscriber`

### Mensajes de grupo denegados

Si el modo de grupo no está configurado, los mensajes de grupo pueden ser descartados silenciosamente:

```
Google Chat group message denied by group mode
```

Configura `defaultGroupMode` en la configuración del canal Google Chat.

### ownerEmail no configurado

Sin `ownerEmail`, todos los usuarios son tratados como no propietarios:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Configúralo para obtener acceso completo a las herramientas.
