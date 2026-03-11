# WhatsApp

Conecte su agente Triggerfish a WhatsApp para poder interactuar con él desde su
móvil. El adaptador utiliza la **WhatsApp Business Cloud API** (la API HTTP
oficial alojada por Meta), recibiendo mensajes a través de webhook y enviando
mediante REST.

## Clasificación por defecto

WhatsApp tiene por defecto la clasificación `PUBLIC`. Los contactos de WhatsApp
pueden incluir a cualquier persona que tenga su número de teléfono, por lo que
`PUBLIC` es el valor seguro por defecto.

## Configuración

### Paso 1: Crear una cuenta de Meta Business

1. Vaya al portal de [Meta for Developers](https://developers.facebook.com/)
2. Cree una cuenta de desarrollador si no tiene una
3. Cree una nueva aplicación y seleccione **Business** como tipo de aplicación
4. En el panel de su aplicación, añada el producto **WhatsApp**

### Paso 2: Obtener sus credenciales

Desde la sección de WhatsApp del panel de su aplicación, recopile estos valores:

- **Access Token** -- Un token de acceso permanente (o genere uno temporal para
  pruebas)
- **Phone Number ID** -- El ID del número de teléfono registrado con WhatsApp
  Business
- **Verify Token** -- Una cadena que usted elige, utilizada para verificar el
  registro del webhook

### Paso 3: Configurar webhooks

1. En la configuración del producto WhatsApp, navegue a **Webhooks**
2. Establezca la URL de callback a la dirección pública de su servidor (p. ej.,
   `https://su-servidor.com:8443/webhook`)
3. Establezca el **Verify Token** al mismo valor que utilizará en su
   configuración de Triggerfish
4. Suscríbase al campo de webhook `messages`

::: info Se requiere URL pública Los webhooks de WhatsApp requieren un endpoint
HTTPS accesible públicamente. Si está ejecutando Triggerfish localmente,
necesitará un servicio de túnel (p. ej., ngrok, Cloudflare Tunnel) o un
servidor con IP pública. :::

### Paso 4: Configurar Triggerfish

Añada el canal de WhatsApp a su `triggerfish.yaml`:

```yaml
channels:
  whatsapp:
    # accessToken almacenado en el llavero del SO
    phoneNumberId: "su-phone-number-id"
    # verifyToken almacenado en el llavero del SO
    ownerPhone: "15551234567"
```

| Opción           | Tipo   | Obligatorio | Descripción                                                                     |
| ---------------- | ------ | ----------- | ------------------------------------------------------------------------------- |
| `accessToken`    | string | Sí          | Token de acceso de WhatsApp Business API                                        |
| `phoneNumberId`  | string | Sí          | Phone Number ID del panel de Meta Business                                      |
| `verifyToken`    | string | Sí          | Token para verificación de webhook (lo elige usted)                             |
| `webhookPort`    | number | No          | Puerto para escuchar webhooks (por defecto: `8443`)                             |
| `ownerPhone`     | string | Recomendado | Su número de teléfono para verificación de propietario (p. ej., `"15551234567"`)|
| `classification` | string | No          | Nivel de clasificación (por defecto: `PUBLIC`)                                  |

::: warning Almacene los secretos de forma segura Nunca incluya tokens de acceso
en el control de versiones. Utilice variables de entorno o el llavero de su
SO. :::

### Paso 5: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envíe un mensaje desde su móvil al número de WhatsApp Business para confirmar la
conexión.

## Identidad del propietario

Triggerfish determina el estado de propietario comparando el número de teléfono
del remitente con el `ownerPhone` configurado. Esta comprobación ocurre en
código antes de que el LLM vea el mensaje:

- **Coincidencia** -- El mensaje es un comando del propietario
- **Sin coincidencia** -- El mensaje es entrada externa con contaminación
  `PUBLIC`

Si no se configura `ownerPhone`, todos los mensajes se tratan como del
propietario.

::: tip Establezca siempre el teléfono del propietario Si otros pueden enviar
mensajes a su número de WhatsApp Business, configure siempre `ownerPhone` para
evitar la ejecución no autorizada de comandos. :::

## Cómo funciona el webhook

El adaptador inicia un servidor HTTP en el puerto configurado (por defecto
`8443`) que gestiona dos tipos de peticiones:

1. **GET /webhook** -- Meta envía esto para verificar su endpoint de webhook.
   Triggerfish responde con el token de desafío si el token de verificación
   coincide.
2. **POST /webhook** -- Meta envía los mensajes entrantes aquí. Triggerfish
   analiza el payload del webhook de la Cloud API, extrae los mensajes de texto
   y los reenvía al gestor de mensajes.

## Límites de mensajes

WhatsApp soporta mensajes de hasta 4.096 caracteres. Los mensajes que excedan
este límite se fragmentan en varios mensajes antes del envío.

## Indicadores de escritura

Triggerfish envía y recibe indicadores de escritura en WhatsApp. Cuando su
agente está procesando una solicitud, el chat muestra un indicador de escritura.
Las confirmaciones de lectura también están soportadas.

## Cambiar la clasificación

```yaml
channels:
  whatsapp:
    # accessToken almacenado en el llavero del SO
    phoneNumberId: "su-phone-number-id"
    # verifyToken almacenado en el llavero del SO
    classification: INTERNAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
