# Email

Conecten su agente de Triggerfish al correo electrónico para que pueda recibir
mensajes vía IMAP y enviar respuestas mediante un servicio de relay SMTP. El
adaptador soporta servicios como SendGrid, Mailgun y Amazon SES para correo
saliente, y consulta cualquier servidor IMAP para mensajes entrantes.

## Clasificación Predeterminada

Email tiene clasificación `CONFIDENTIAL` por defecto. El correo electrónico
frecuentemente contiene contenido sensible (contratos, notificaciones de
cuentas, correspondencia personal), por lo que `CONFIDENTIAL` es el valor
predeterminado seguro.

## Configuración

### Paso 1: Elegir un Relay SMTP

Triggerfish envía correo saliente a través de una API HTTP de relay SMTP. Los
servicios soportados incluyen:

| Servicio   | Endpoint de la API                                               |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/SU_DOMINIO/messages`                 |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Regístrense en uno de estos servicios y obtengan una API key.

### Paso 2: Configurar IMAP para Recepción

Necesitan credenciales IMAP para recibir correo. La mayoría de los proveedores
de correo soportan IMAP:

| Proveedor | Host IMAP                 | Puerto |
| --------- | ------------------------- | ------ |
| Gmail     | `imap.gmail.com`          | 993    |
| Outlook   | `outlook.office365.com`   | 993    |
| Fastmail  | `imap.fastmail.com`       | 993    |
| Otro      | Su servidor de correo     | 993    |

::: info Contraseñas de Aplicación de Gmail Si usan Gmail con autenticación de
2 factores, necesitarán generar una
[Contraseña de Aplicación](https://myaccount.google.com/apppasswords) para
acceso IMAP. Su contraseña regular de Gmail no funcionará. :::

### Paso 3: Configurar Triggerfish

Agreguen el canal de Email a su `triggerfish.yaml`:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "ustedes@gmail.com"
    fromAddress: "triggerfish@sudominio.com"
    ownerEmail: "ustedes@gmail.com"
```

Los secretos (API key de SMTP, contraseña de IMAP) se ingresan durante
`triggerfish config add-channel email` y se almacenan en el llavero del SO.

| Opción           | Tipo   | Requerido   | Descripción                                                            |
| ---------------- | ------ | ----------- | ---------------------------------------------------------------------- |
| `smtpApiUrl`     | string | Sí          | URL del endpoint de la API de relay SMTP                               |
| `imapHost`       | string | Sí          | Nombre de host del servidor IMAP                                       |
| `imapPort`       | number | No          | Puerto del servidor IMAP (predeterminado: `993`)                       |
| `imapUser`       | string | Sí          | Nombre de usuario IMAP (generalmente su dirección de correo)           |
| `fromAddress`    | string | Sí          | Dirección de remitente para correos salientes                          |
| `pollInterval`   | number | No          | Frecuencia de verificación de nuevos correos, en ms (predeterminado: `30000`) |
| `classification` | string | No          | Nivel de clasificación (predeterminado: `CONFIDENTIAL`)                |
| `ownerEmail`     | string | Recomendado | Su dirección de correo para verificación de propietario                |

::: warning Credenciales La API key de SMTP y la contraseña de IMAP se
almacenan en el llavero del SO (Linux: GNOME Keyring, macOS: Keychain Access).
Nunca aparecen en `triggerfish.yaml`. :::

### Paso 4: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envíen un correo a la dirección configurada para confirmar la conexión.

## Identidad del Propietario

Triggerfish determina el estado de propietario comparando la dirección de correo
del remitente con el `ownerEmail` configurado:

- **Coincide** -- El mensaje es un comando del propietario
- **No coincide** -- El mensaje es entrada externa con taint `PUBLIC`

Si no se configura `ownerEmail`, todos los mensajes se tratan como provenientes
del propietario.

## Clasificación Basada en Dominio

Para un control más granular, el correo electrónico soporta clasificación de
destinatarios basada en dominio. Esto es especialmente útil en entornos
empresariales:

- Los correos de `@suempresa.com` pueden clasificarse como `INTERNAL`
- Los correos de dominios desconocidos se clasifican como `EXTERNAL` por defecto
- El administrador puede configurar una lista de dominios internos

```yaml
channels:
  email:
    # ... otra configuración
    internalDomains:
      - "suempresa.com"
      - "subsidiaria.com"
```

Esto significa que el motor de políticas aplica reglas diferentes basadas en el
origen de un correo:

| Dominio del Remitente             | Clasificación |
| --------------------------------- | :-----------: |
| Dominio interno configurado       |  `INTERNAL`   |
| Dominio desconocido               |  `EXTERNAL`   |

## Cómo Funciona

### Mensajes Entrantes

El adaptador consulta el servidor IMAP en el intervalo configurado
(predeterminado: cada 30 segundos) buscando mensajes nuevos no leídos. Cuando
llega un nuevo correo:

1. Se extrae la dirección del remitente
2. Se verifica el estado de propietario contra `ownerEmail`
3. El cuerpo del correo se reenvía al manejador de mensajes
4. Cada hilo de correo se mapea a un ID de sesión basado en la dirección del
   remitente (`email-remitente@ejemplo.com`)

### Mensajes Salientes

Cuando el agente responde, el adaptador envía la respuesta vía la API HTTP del
relay SMTP configurado. La respuesta incluye:

- **De** -- La dirección `fromAddress` configurada
- **Para** -- La dirección de correo del remitente original
- **Asunto** -- "Triggerfish" (predeterminado)
- **Cuerpo** -- La respuesta del agente como texto plano

## Intervalo de Consulta

El intervalo de consulta predeterminado es 30 segundos. Pueden ajustarlo según
sus necesidades:

```yaml
channels:
  email:
    # ... otra configuración
    pollInterval: 10000 # Verificar cada 10 segundos
```

::: tip Equilibren Capacidad de Respuesta y Recursos Un intervalo de consulta
más corto significa respuesta más rápida al correo entrante, pero conexiones
IMAP más frecuentes. Para la mayoría de los casos de uso personal, 30 segundos
es un buen equilibrio. :::

## Cambiar la Clasificación

```yaml
channels:
  email:
    # ... otra configuración
    classification: CONFIDENTIAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
