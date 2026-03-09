# WhatsApp

Conecten su agente de Triggerfish a WhatsApp para poder interactuar con él desde
su teléfono. El adaptador utiliza la **WhatsApp Business Cloud API** (la API
HTTP oficial alojada por Meta), recibiendo mensajes vía webhook y enviando
mediante REST.

## Clasificación Predeterminada

WhatsApp tiene clasificación `PUBLIC` por defecto. Los contactos de WhatsApp
pueden incluir a cualquiera con su número de teléfono, por lo que `PUBLIC` es el
valor predeterminado seguro.

## Configuración

### Paso 1: Crear una Cuenta de Meta Business

1. Vayan al portal de [Meta for Developers](https://developers.facebook.com/)
2. Creen una cuenta de desarrollador si no tienen una
3. Creen una nueva app y seleccionen **Business** como tipo de app
4. En el panel de su app, agreguen el producto **WhatsApp**

### Paso 2: Obtener sus Credenciales

Desde la sección de WhatsApp del panel de su app, recopilen estos valores:

- **Access Token** -- Un token de acceso permanente (o generen uno temporal para
  pruebas)
- **Phone Number ID** -- El ID del número telefónico registrado con WhatsApp
  Business
- **Verify Token** -- Una cadena que ustedes eligen, usada para verificar el
  registro del webhook

### Paso 3: Configurar Webhooks

1. En la configuración del producto WhatsApp, naveguen a **Webhooks**
2. Establezcan la URL de callback a la dirección pública de su servidor (ej.,
   `https://su-servidor.com:8443/webhook`)
3. Establezcan el **Verify Token** con el mismo valor que usarán en su
   configuración de Triggerfish
4. Suscríbanse al campo de webhook `messages`

::: info URL Pública Requerida Los webhooks de WhatsApp requieren un endpoint
HTTPS accesible públicamente. Si están ejecutando Triggerfish localmente,
necesitarán un servicio de túnel (ej., ngrok, Cloudflare Tunnel) o un servidor
con IP pública. :::

### Paso 4: Configurar Triggerfish

Agreguen el canal de WhatsApp a su `triggerfish.yaml`:

```yaml
channels:
  whatsapp:
    # accessToken almacenado en el llavero del SO
    phoneNumberId: "su-phone-number-id"
    # verifyToken almacenado en el llavero del SO
    ownerPhone: "15551234567"
```

| Opción           | Tipo   | Requerido   | Descripción                                                                  |
| ---------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `accessToken`    | string | Sí          | Token de acceso de la API de WhatsApp Business                               |
| `phoneNumberId`  | string | Sí          | Phone Number ID del Panel de Meta Business                                   |
| `verifyToken`    | string | Sí          | Token para verificación de webhook (ustedes lo eligen)                       |
| `webhookPort`    | number | No          | Puerto para escuchar webhooks (predeterminado: `8443`)                       |
| `ownerPhone`     | string | Recomendado | Su número de teléfono para verificación de propietario (ej., `"15551234567"`) |
| `classification` | string | No          | Nivel de clasificación (predeterminado: `PUBLIC`)                            |

::: warning Almacenen los Secretos de Forma Segura Nunca incluyan tokens de
acceso en el control de versiones. Usen variables de entorno o el llavero de
su SO. :::

### Paso 5: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envíen un mensaje desde su teléfono al número de WhatsApp Business para
confirmar la conexión.

## Identidad del Propietario

Triggerfish determina el estado de propietario comparando el número de teléfono
del remitente con el `ownerPhone` configurado. Esta verificación ocurre en
código antes de que el LLM vea el mensaje:

- **Coincide** -- El mensaje es un comando del propietario
- **No coincide** -- El mensaje es entrada externa con taint `PUBLIC`

Si no se configura `ownerPhone`, todos los mensajes se tratan como provenientes
del propietario.

::: tip Siempre Configuren el Teléfono del Propietario Si otras personas pueden
enviar mensajes a su número de WhatsApp Business, siempre configuren
`ownerPhone` para prevenir la ejecución no autorizada de comandos. :::

## Cómo Funciona el Webhook

El adaptador inicia un servidor HTTP en el puerto configurado (predeterminado
`8443`) que maneja dos tipos de solicitudes:

1. **GET /webhook** -- Meta envía esto para verificar su endpoint de webhook.
   Triggerfish responde con el token de desafío si el token de verificación
   coincide.
2. **POST /webhook** -- Meta envía mensajes entrantes aquí. Triggerfish analiza
   el payload del webhook de la Cloud API, extrae mensajes de texto y los
   reenvía al manejador de mensajes.

## Límites de Mensaje

WhatsApp soporta mensajes de hasta 4,096 caracteres. Los mensajes que excedan
este límite se dividen en múltiples mensajes antes de enviarse.

## Indicadores de Escritura

Triggerfish envía y recibe indicadores de escritura en WhatsApp. Cuando su
agente está procesando una solicitud, el chat muestra un indicador de escritura.
Las confirmaciones de lectura también están soportadas.

## Cambiar la Clasificación

```yaml
channels:
  whatsapp:
    # accessToken almacenado en el llavero del SO
    phoneNumberId: "su-phone-number-id"
    # verifyToken almacenado en el llavero del SO
    classification: INTERNAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
