# Solución de problemas: Canales

## Problemas generales de canales

### El canal aparece conectado pero no llegan mensajes

1. **Compruebe el ID del propietario.** Si `ownerId` no está establecido o es incorrecto, los mensajes suyos pueden enrutarse como mensajes externos (no propietario) con permisos restringidos.
2. **Compruebe la clasificación.** Si la clasificación del canal es inferior al taint de la sesión, las respuestas se bloquean por la regla de no write-down.
3. **Compruebe los registros del daemon.** Ejecute `triggerfish logs --level WARN` y busque errores de entrega.

### Los mensajes no se envían

El router registra los fallos de entrega. Compruebe `triggerfish logs` para:

```
Channel send failed
```

Esto significa que el router intentó la entrega pero el adaptador del canal devolvió un error. El error específico se registra junto a él.

### Comportamiento de reintentos

El router de canales utiliza retroceso exponencial para los envíos fallidos. Si un mensaje falla, se reintenta con retardos crecientes. Tras agotar todos los reintentos, el mensaje se descarta y el error se registra.

---

## Telegram

### El bot no responde

1. **Verifique el token.** Vaya a @BotFather en Telegram, compruebe que su token es válido y coincide con lo almacenado en el llavero.
2. **Envíe un mensaje directo al bot.** Los mensajes de grupo requieren que el bot tenga permisos de mensajes de grupo.
3. **Compruebe errores de polling.** Telegram utiliza long polling. Si la conexión se interrumpe, el adaptador se reconecta automáticamente, pero los problemas de red persistentes impedirán la recepción de mensajes.

### Los mensajes se dividen en varias partes

Telegram tiene un límite de 4.096 caracteres por mensaje. Las respuestas largas se fragmentan automáticamente. Este es el comportamiento normal.

### Los comandos del bot no aparecen en el menú

El adaptador registra los comandos slash al inicio. Si el registro falla, se registra una advertencia pero continúa ejecutándose. Esto no es fatal. El bot sigue funcionando; el menú de comandos simplemente no mostrará sugerencias de autocompletado.

### No se pueden eliminar mensajes antiguos

Telegram no permite a los bots eliminar mensajes con más de 48 horas de antigüedad. Los intentos de eliminar mensajes antiguos fallan silenciosamente. Esta es una limitación de la API de Telegram.

---

## Slack

### El bot no se conecta

Slack requiere tres credenciales:

| Credencial | Formato | Dónde encontrarla |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | Página OAuth & Permissions en la configuración de la app de Slack |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Cadena hexadecimal | Basic Information > App Credentials |

Si alguna de las tres falta o no es válida, la conexión falla. El error más común es olvidar el App Token, que es independiente del Bot Token.

### Problemas con Socket Mode

Triggerfish utiliza el Socket Mode de Slack, no las suscripciones de eventos HTTP. En la configuración de su app de Slack:

1. Vaya a "Socket Mode" y asegúrese de que esté habilitado
2. Cree un token a nivel de aplicación con el scope `connections:write`
3. Este token es el `appToken` (`xapp-...`)

Si Socket Mode no está habilitado, el bot token por sí solo no es suficiente para la mensajería en tiempo real.

### Los mensajes se truncan

Slack tiene un límite de 40.000 caracteres. A diferencia de Telegram y Discord, Triggerfish trunca los mensajes de Slack en lugar de dividirlos. Si alcanza este límite regularmente, considere pedir a su agente que produzca salidas más concisas.

### Fugas de recursos del SDK en pruebas

El SDK de Slack produce fugas de operaciones asíncronas al importarlo. Este es un problema conocido del proyecto upstream. Las pruebas que utilizan el adaptador de Slack necesitan `sanitizeResources: false` y `sanitizeOps: false`. Esto no afecta al uso en producción.

---

## Discord

### El bot no puede leer mensajes en servidores

Discord requiere el intent privilegiado **Message Content**. Sin él, el bot recibe eventos de mensajes pero el contenido del mensaje está vacío.

**Solución:** En el [Portal de Desarrolladores de Discord](https://discord.com/developers/applications):
1. Seleccione su aplicación
2. Vaya a la configuración de "Bot"
3. Habilite "Message Content Intent" en Privileged Gateway Intents
4. Guarde los cambios

### Intents de bot requeridos

El adaptador requiere que estos intents estén habilitados:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privilegiado)

### Los mensajes se fragmentan

Discord tiene un límite de 2.000 caracteres. Los mensajes largos se dividen automáticamente en varios mensajes.

### El indicador de escritura falla

El adaptador envía indicadores de escritura antes de las respuestas. Si el bot carece de permiso para enviar mensajes en un canal, el indicador de escritura falla silenciosamente (registrado a nivel DEBUG). Esto es solo cosmético.

### Fugas de recursos del SDK

Al igual que Slack, el SDK discord.js produce fugas de operaciones asíncronas al importarlo. Las pruebas necesitan `sanitizeOps: false`. Esto no afecta a la producción.

---

## WhatsApp

### No se reciben mensajes

WhatsApp utiliza un modelo de webhook. El bot escucha peticiones HTTP POST entrantes desde los servidores de Meta. Para que lleguen los mensajes:

1. **Registre la URL del webhook** en el [Panel de Meta Business](https://developers.facebook.com/)
2. **Configure el token de verificación.** El adaptador ejecuta un handshake de verificación cuando Meta se conecta por primera vez
3. **Inicie el listener del webhook.** El adaptador escucha en el puerto 8443 por defecto. Asegúrese de que este puerto sea accesible desde internet (utilice un proxy inverso o túnel)

### Aviso "ownerPhone not configured"

Si `ownerPhone` no está establecido en la configuración del canal WhatsApp, todos los remitentes se tratan como propietario. Esto significa que cada usuario obtiene acceso completo a todas las herramientas. Esto es un problema de seguridad.

**Solución:** Establezca el número de teléfono del propietario en su configuración:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Token de acceso caducado

Los tokens de acceso de la API de WhatsApp Cloud pueden caducar. Si los envíos comienzan a fallar con errores 401, regenere el token en el panel de Meta y actualícelo:

```bash
triggerfish config set-secret whatsapp:accessToken <nuevo-token>
```

---

## Signal

### signal-cli no encontrado

El canal Signal requiere `signal-cli`, una aplicación Java de terceros. Triggerfish intenta instalarlo automáticamente durante la configuración, pero esto puede fallar si:

- Java (JRE 21+) no está disponible y la instalación automática de JRE 25 falló
- La descarga fue bloqueada por restricciones de red
- El directorio de destino no es escribible

**Instalación manual:**

```bash
# Instalar signal-cli manualmente
# Consulte https://github.com/AsamK/signal-cli para instrucciones
```

### El daemon de signal-cli no es accesible

Tras iniciar signal-cli, Triggerfish espera hasta 60 segundos para que sea accesible. Si se agota el tiempo:

```
signal-cli daemon (tcp) not reachable within 60s
```

Compruebe:
1. ¿Está signal-cli realmente en ejecución? Compruebe `ps aux | grep signal-cli`
2. ¿Está escuchando en el endpoint esperado (socket TCP o Unix)?
3. ¿Necesita la cuenta de Signal ser vinculada? Ejecute `triggerfish config add-channel signal` para repetir el proceso de vinculación.

### Vinculación de dispositivo fallida

Signal requiere vincular el dispositivo a su cuenta de Signal mediante código QR. Si el proceso de vinculación falla:

1. Asegúrese de que Signal está instalado en su teléfono
2. Abra Signal > Ajustes > Dispositivos vinculados > Vincular nuevo dispositivo
3. Escanee el código QR mostrado por el asistente de configuración
4. Si el código QR ha caducado, reinicie el proceso de vinculación

### Discordancia de versión de signal-cli

Triggerfish se fija a una versión conocida y funcional de signal-cli. Si ha instalado una versión diferente, puede ver una advertencia:

```
Signal CLI version older than known-good
```

Esto no es fatal pero puede causar problemas de compatibilidad.

---

## Email

### La conexión IMAP falla

El adaptador de correo electrónico se conecta a su servidor IMAP para el correo entrante. Problemas comunes:

- **Credenciales incorrectas.** Verifique el nombre de usuario y la contraseña IMAP.
- **Puerto 993 bloqueado.** El adaptador utiliza IMAP sobre TLS (puerto 993). Algunas redes bloquean esto.
- **Se requiere contraseña específica de aplicación.** Gmail y otros proveedores requieren contraseñas específicas de aplicación cuando la 2FA está habilitada.

Mensajes de error que puede ver:
- `IMAP LOGIN failed` - nombre de usuario o contraseña incorrectos
- `IMAP connection not established` - no se puede alcanzar el servidor
- `IMAP connection closed unexpectedly` - el servidor cortó la conexión

### Fallos de envío SMTP

El adaptador de correo electrónico envía a través de un relay SMTP por API (no SMTP directo). Si los envíos fallan con errores HTTP:

- 401/403: la API key no es válida
- 429: límite de tasa alcanzado
- 5xx: el servicio de relay está caído

### El sondeo IMAP se detiene

El adaptador sondea en busca de nuevos correos cada 30 segundos. Si el sondeo falla, el error se registra pero no hay reconexión automática. Reinicie el daemon para restablecer la conexión IMAP.

Esta es una limitación conocida. Consulte [Problemas conocidos](/es-ES/support/kb/known-issues).

---

## WebChat

### Actualización WebSocket rechazada

El adaptador de WebChat valida las conexiones entrantes:

- **Cabeceras demasiado grandes (431).** El tamaño combinado de las cabeceras supera los 8.192 bytes. Esto puede ocurrir con cookies excesivamente grandes o cabeceras personalizadas.
- **Rechazo CORS.** Si `allowedOrigins` está configurado, la cabecera Origin debe coincidir. El valor por defecto es `["*"]` (permitir todo).
- **Tramas malformadas.** El JSON no válido en tramas WebSocket se registra a nivel WARN y la trama se descarta.

### Clasificación

WebChat tiene clasificación PUBLIC por defecto. Los visitantes nunca se tratan como propietario. Si necesita una clasificación superior para WebChat, establézcala explícitamente:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### Fallos de sondeo PubSub

Google Chat utiliza Pub/Sub para la entrega de mensajes. Si el sondeo falla:

```
Google Chat PubSub poll failed
```

Compruebe:
- Las credenciales de Google Cloud son válidas (compruebe el `credentials_ref` en la configuración)
- La suscripción Pub/Sub existe y no ha sido eliminada
- La cuenta de servicio tiene el rol `pubsub.subscriber`

### Mensajes de grupo denegados

Si el modo de grupo no está configurado, los mensajes de grupo pueden descartarse silenciosamente:

```
Google Chat group message denied by group mode
```

Configure `defaultGroupMode` en la configuración del canal Google Chat.

### ownerEmail no configurado

Sin `ownerEmail`, todos los usuarios se tratan como no propietarios:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Establézcalo en su configuración para obtener acceso completo a las herramientas.
