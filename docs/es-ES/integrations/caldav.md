# Integración CalDAV

Conecte su agente de Triggerfish a cualquier servidor de calendario compatible con CalDAV. Esto permite operaciones de calendario con proveedores que admiten el estándar CalDAV, incluyendo iCloud, Fastmail, Nextcloud, Radicale y cualquier servidor CalDAV autoalojado.

## Proveedores compatibles

| Proveedor  | URL CalDAV                                      | Notas                                  |
| ---------- | ----------------------------------------------- | -------------------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | Requiere contraseña específica de app  |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | CalDAV estándar                        |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Autoalojado                            |
| Radicale   | `https://your-server.com`                       | Autoalojado ligero                     |
| Baikal     | `https://your-server.com/dav.php`               | Autoalojado                            |

::: info Para Google Calendar, utilice la integración de [Google Workspace](/es-ES/integrations/google-workspace) en su lugar, que usa la API nativa de Google con OAuth2. CalDAV es para proveedores de calendario que no son Google. :::

## Configuración

### Paso 1: Obtenga sus credenciales CalDAV

Necesita tres datos de su proveedor de calendario:

- **URL CalDAV** -- La URL base del servidor CalDAV
- **Nombre de usuario** -- Su nombre de usuario o correo electrónico de la cuenta
- **Contraseña** -- La contraseña de su cuenta o una contraseña específica de app

::: warning Contraseñas específicas de app La mayoría de los proveedores requieren una contraseña específica de app en lugar de la contraseña principal de su cuenta. Consulte la documentación de su proveedor para saber cómo generar una. :::

### Paso 2: Configure Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # contraseña almacenada en el llavero del SO
    classification: CONFIDENTIAL
```

| Opción           | Tipo   | Obligatorio | Descripción                                             |
| ---------------- | ------ | ----------- | ------------------------------------------------------- |
| `url`            | string | Sí          | URL base del servidor CalDAV                            |
| `username`       | string | Sí          | Nombre de usuario o correo electrónico de la cuenta     |
| `password`       | string | Sí          | Contraseña de la cuenta (almacenada en el llavero del SO) |
| `classification` | string | No          | Nivel de clasificación (predeterminado: `CONFIDENTIAL`) |

### Paso 3: Descubrimiento de calendarios

En la primera conexión, el agente ejecuta el descubrimiento CalDAV para encontrar todos los calendarios disponibles. Los calendarios descubiertos se almacenan en caché local.

```bash
triggerfish connect caldav
```

## Herramientas disponibles

| Herramienta       | Descripción                                                  |
| ----------------- | ------------------------------------------------------------ |
| `caldav_list`     | Listar todos los calendarios de la cuenta                    |
| `caldav_events`   | Obtener eventos para un rango de fechas de uno o todos los calendarios |
| `caldav_create`   | Crear un nuevo evento de calendario                          |
| `caldav_update`   | Actualizar un evento existente                               |
| `caldav_delete`   | Eliminar un evento                                           |
| `caldav_search`   | Buscar eventos por consulta de texto                         |
| `caldav_freebusy` | Comprobar disponibilidad para un rango horario               |

## Clasificación

Los datos de calendario tienen como valor predeterminado `CONFIDENTIAL` porque contienen nombres, horarios, ubicaciones y detalles de reuniones. Acceder a cualquier herramienta CalDAV escala el taint de sesión al nivel de clasificación configurado.

## Autenticación

CalDAV utiliza HTTP Basic Auth sobre TLS. Las credenciales se almacenan en el llavero del SO y se inyectan a nivel de la capa HTTP por debajo del contexto del LLM -- el agente nunca ve la contraseña en texto plano.

## Páginas relacionadas

- [Google Workspace](/es-ES/integrations/google-workspace) -- Para Google Calendar (usa API nativa)
- [Cron y triggers](/es-ES/features/cron-and-triggers) -- Programe acciones del agente basadas en el calendario
- [Guía de clasificación](/es-ES/guide/classification-guide) -- Elegir el nivel de clasificación adecuado
