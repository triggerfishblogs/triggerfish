# Email

Conecte su agente Triggerfish al correo electrónico para que pueda recibir
mensajes a través de IMAP y enviar respuestas mediante un servicio de relé SMTP.
El adaptador es compatible con servicios como SendGrid, Mailgun y Amazon SES
para el correo saliente, y consulta cualquier servidor IMAP para los mensajes
entrantes.

## Clasificación por defecto

Email tiene por defecto la clasificación `CONFIDENTIAL`. El correo electrónico a
menudo contiene contenido sensible (contratos, notificaciones de cuentas,
correspondencia personal), por lo que `CONFIDENTIAL` es el valor seguro por
defecto.

## Configuración

### Paso 1: Elegir un relé SMTP

Triggerfish envía correo saliente a través de una API de relé SMTP basada en
HTTP. Los servicios compatibles incluyen:

| Servicio   | Endpoint de API                                                  |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/SU_DOMINIO/messages`                 |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Regístrese en uno de estos servicios y obtenga una clave API.

### Paso 2: Configurar IMAP para recepción

Necesita credenciales IMAP para recibir correo electrónico. La mayoría de los
proveedores de correo soportan IMAP:

| Proveedor | Host IMAP               | Puerto |
| --------- | ----------------------- | ------ |
| Gmail     | `imap.gmail.com`        | 993    |
| Outlook   | `outlook.office365.com` | 993    |
| Fastmail  | `imap.fastmail.com`     | 993    |
| Propio    | Su servidor de correo   | 993    |

::: info Contraseñas de aplicación de Gmail Si usa Gmail con autenticación de
dos factores, necesitará generar una
[contraseña de aplicación](https://myaccount.google.com/apppasswords) para el
acceso IMAP. Su contraseña habitual de Gmail no funcionará. :::

### Paso 3: Configurar Triggerfish

Añada el canal de Email a su `triggerfish.yaml`:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "usted@gmail.com"
    fromAddress: "triggerfish@sudominio.com"
    ownerEmail: "usted@gmail.com"
```

Los secretos (clave API SMTP, contraseña IMAP) se introducen durante
`triggerfish config add-channel email` y se almacenan en el llavero del SO.

| Opción           | Tipo   | Obligatorio | Descripción                                                                  |
| ---------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `smtpApiUrl`     | string | Sí          | URL del endpoint de la API de relé SMTP                                      |
| `imapHost`       | string | Sí          | Nombre de host del servidor IMAP                                             |
| `imapPort`       | number | No          | Puerto del servidor IMAP (por defecto: `993`)                                |
| `imapUser`       | string | Sí          | Nombre de usuario IMAP (normalmente su dirección de correo)                  |
| `fromAddress`    | string | Sí          | Dirección del remitente para correos salientes                               |
| `pollInterval`   | number | No          | Frecuencia de comprobación de nuevos correos, en ms (por defecto: `30000`)   |
| `classification` | string | No          | Nivel de clasificación (por defecto: `CONFIDENTIAL`)                         |
| `ownerEmail`     | string | Recomendado | Su dirección de correo para verificación de propietario                      |

::: warning Credenciales La clave API SMTP y la contraseña IMAP se almacenan en
el llavero del SO (Linux: GNOME Keyring, macOS: Keychain Access). Nunca aparecen
en `triggerfish.yaml`. :::

### Paso 4: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envíe un correo electrónico a la dirección configurada para confirmar la
conexión.

## Identidad del propietario

Triggerfish determina el estado de propietario comparando la dirección de correo
del remitente con el `ownerEmail` configurado:

- **Coincidencia** -- El mensaje es un comando del propietario
- **Sin coincidencia** -- El mensaje es entrada externa con contaminación
  `PUBLIC`

Si no se configura `ownerEmail`, todos los mensajes se tratan como del
propietario.

## Clasificación basada en dominio

Para un control más granular, el correo electrónico soporta la clasificación de
destinatarios basada en dominio. Esto es especialmente útil en entornos
empresariales:

- Los correos de `@suempresa.com` pueden clasificarse como `INTERNAL`
- Los correos de dominios desconocidos se establecen por defecto como `EXTERNAL`
- El administrador puede configurar una lista de dominios internos

```yaml
channels:
  email:
    # ... otra configuración
    internalDomains:
      - "suempresa.com"
      - "filial.com"
```

Esto significa que el motor de políticas aplica diferentes reglas según la
procedencia del correo:

| Dominio del remitente              | Clasificación |
| ---------------------------------- | :-----------: |
| Dominio interno configurado        |  `INTERNAL`   |
| Dominio desconocido                |  `EXTERNAL`   |

## Cómo funciona

### Mensajes entrantes

El adaptador consulta el servidor IMAP en el intervalo configurado (por defecto:
cada 30 segundos) en busca de mensajes nuevos sin leer. Cuando llega un nuevo
correo:

1. Se extrae la dirección del remitente
2. Se comprueba el estado de propietario contra `ownerEmail`
3. El cuerpo del correo se reenvía al gestor de mensajes
4. Cada hilo de correo se asigna a un ID de sesión basado en la dirección del
   remitente (`email-remitente@ejemplo.com`)

### Mensajes salientes

Cuando el agente responde, el adaptador envía la respuesta a través de la API
HTTP del relé SMTP configurado. La respuesta incluye:

- **De** -- La dirección `fromAddress` configurada
- **Para** -- La dirección de correo del remitente original
- **Asunto** -- "Triggerfish" (por defecto)
- **Cuerpo** -- La respuesta del agente como texto plano

## Intervalo de consulta

El intervalo de consulta por defecto es de 30 segundos. Puede ajustarlo según
sus necesidades:

```yaml
channels:
  email:
    # ... otra configuración
    pollInterval: 10000 # Comprobar cada 10 segundos
```

::: tip Equilibre capacidad de respuesta y recursos Un intervalo de consulta más
corto significa una respuesta más rápida al correo entrante, pero conexiones
IMAP más frecuentes. Para la mayoría de los casos de uso personal, 30 segundos
es un buen equilibrio. :::

## Cambiar la clasificación

```yaml
channels:
  email:
    # ... otra configuración
    classification: CONFIDENTIAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
