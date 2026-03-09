# Integración CalDAV

Conecta tu agente de Triggerfish a cualquier servidor de calendario compatible con CalDAV. Esto
habilita operaciones de calendario en proveedores que soportan el estándar CalDAV,
incluyendo iCloud, Fastmail, Nextcloud, Radicale y cualquier servidor CalDAV
auto-hospedado.

## Proveedores soportados

| Proveedor  | URL CalDAV                                       | Notas                          |
| ---------- | ------------------------------------------------ | ------------------------------ |
| iCloud     | `https://caldav.icloud.com`                      | Requiere contraseña específica de app |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`      | CalDAV estándar                |
| Nextcloud  | `https://your-server.com/remote.php/dav`         | Auto-hospedado                 |
| Radicale   | `https://your-server.com`                        | Auto-hospedado ligero          |
| Baikal     | `https://your-server.com/dav.php`                | Auto-hospedado                 |

::: info Para Google Calendar, usa la integración de [Google Workspace](/pt-BR/integrations/google-workspace)
en su lugar, que usa la API nativa de Google con OAuth2. CalDAV es para
proveedores de calendario que no son Google. :::

## Configuración

### Paso 1: Obtén tus credenciales CalDAV

Necesitas tres datos de tu proveedor de calendario:

- **URL CalDAV** -- La URL base del servidor CalDAV
- **Nombre de usuario** -- Tu nombre de usuario o email de la cuenta
- **Contraseña** -- La contraseña de tu cuenta o una contraseña específica de app

::: warning Contraseñas específicas de app La mayoría de los proveedores requieren una contraseña específica
de app en lugar de la contraseña principal de tu cuenta. Consulta la
documentación de tu proveedor para saber cómo generar una. :::

### Paso 2: Configura Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # contraseña almacenada en el keychain del SO
    classification: CONFIDENTIAL
```

| Opción           | Tipo   | Requerido | Descripción                                      |
| ---------------- | ------ | --------- | ------------------------------------------------- |
| `url`            | string | Sí        | URL base del servidor CalDAV                      |
| `username`       | string | Sí        | Nombre de usuario o email de la cuenta            |
| `password`       | string | Sí        | Contraseña de la cuenta (almacenada en el keychain del SO) |
| `classification` | string | No        | Nivel de clasificación (por defecto: `CONFIDENTIAL`) |

### Paso 3: Descubrimiento de calendarios

En la primera conexión, el agente ejecuta el descubrimiento CalDAV para encontrar todos los
calendarios disponibles. Los calendarios descubiertos se almacenan en caché localmente.

```bash
triggerfish connect caldav
```

## Herramientas disponibles

| Herramienta         | Descripción                                           |
| ------------------- | ----------------------------------------------------- |
| `caldav_list`       | Listar todos los calendarios de la cuenta             |
| `caldav_events`     | Obtener eventos para un rango de fechas de uno o todos los calendarios |
| `caldav_create`     | Crear un nuevo evento de calendario                   |
| `caldav_update`     | Actualizar un evento existente                        |
| `caldav_delete`     | Eliminar un evento                                    |
| `caldav_search`     | Buscar eventos por consulta de texto                  |
| `caldav_freebusy`   | Verificar disponibilidad para un rango de tiempo      |

## Clasificación

Los datos de calendario tienen clasificación CONFIDENTIAL por defecto porque contienen nombres, horarios,
ubicaciones y detalles de reuniones. Acceder a cualquier herramienta CalDAV escala el taint
de sesión al nivel de clasificación configurado.

## Autenticación

CalDAV usa HTTP Basic Auth sobre TLS. Las credenciales se almacenan en el keychain del SO
y se inyectan en la capa HTTP por debajo del contexto del LLM -- el agente nunca ve
la contraseña en crudo.

## Páginas relacionadas

- [Google Workspace](/pt-BR/integrations/google-workspace) -- Para Google Calendar
  (usa API nativa)
- [Cron y Triggers](/pt-BR/features/cron-and-triggers) -- Programar acciones del agente
  basadas en calendario
- [Guía de clasificación](/pt-BR/guide/classification-guide) -- Cómo elegir el nivel
  de clasificación correcto
