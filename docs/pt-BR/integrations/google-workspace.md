# Google Workspace

Conecten su cuenta de Google para darle a su agente acceso a Gmail, Calendar,
Tasks, Drive y Sheets.

## Prerrequisitos

- Una cuenta de Google
- Un proyecto de Google Cloud con credenciales OAuth

## Configuración

### Paso 1: Crear un Proyecto de Google Cloud

1. Vayan a [Google Cloud Console](https://console.cloud.google.com/)
2. Hagan clic en el menú desplegable de proyectos en la parte superior y
   seleccionen **New Project**
3. Nómbrenlo "Triggerfish" (o lo que prefieran) y hagan clic en **Create**

### Paso 2: Habilitar APIs

Habiliten cada una de estas APIs en su proyecto:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Hagan clic en **Enable** en cada página. Esto solo necesita hacerse una vez por
proyecto.

### Paso 3: Configurar la Pantalla de Consentimiento OAuth

Antes de poder crear credenciales, Google requiere una pantalla de consentimiento
OAuth. Esta es la pantalla que los usuarios ven al otorgar acceso.

1. Vayan a
   [Pantalla de consentimiento OAuth](https://console.cloud.google.com/apis/credentials/consent)
2. Tipo de usuario: seleccionen **External** (o **Internal** si están en una
   organización de Google Workspace y solo quieren usuarios de la organización)
3. Hagan clic en **Create**
4. Llenen los campos requeridos:
   - **App name**: "Triggerfish" (o lo que quieran)
   - **User support email**: su dirección de correo
   - **Developer contact email**: su dirección de correo
5. Hagan clic en **Save and Continue**
6. En la pantalla de **Scopes**, hagan clic en **Add or Remove Scopes** y
   agreguen:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. Hagan clic en **Update**, luego **Save and Continue**
8. Vayan a la página **Audience** (en la barra lateral izquierda bajo "OAuth
   consent screen") -- aquí encontrarán la sección **Test users**
9. Hagan clic en **+ Add Users** y agreguen su dirección de correo de Google
10. Hagan clic en **Save and Continue**, luego **Back to Dashboard**

::: warning Mientras su app está en estado "Testing", solo los usuarios de
prueba que hayan agregado pueden autorizar. Esto es adecuado para uso personal.
Publicar la app elimina la restricción de usuarios de prueba pero requiere
verificación de Google. :::

### Paso 4: Crear Credenciales OAuth

1. Vayan a [Credentials](https://console.cloud.google.com/apis/credentials)
2. Hagan clic en **+ CREATE CREDENTIALS** en la parte superior
3. Seleccionen **OAuth client ID**
4. Tipo de aplicación: **Desktop app**
5. Nombre: "Triggerfish" (o lo que quieran)
6. Hagan clic en **Create**
7. Copien el **Client ID** y el **Client Secret**

### Paso 5: Conectar

```bash
triggerfish connect google
```

Se les pedirá:

1. Su **Client ID**
2. Su **Client Secret**

Se abrirá una ventana del navegador para que otorguen acceso. Después de la
autorización, los tokens se almacenan de forma segura en el llavero del SO
(macOS Keychain o Linux libsecret). Ninguna credencial se almacena en archivos
de configuración ni variables de entorno.

### Desconectar

```bash
triggerfish disconnect google
```

Elimina todos los tokens de Google de su llavero. Pueden reconectarse en
cualquier momento ejecutando `connect` nuevamente.

## Herramientas Disponibles

Una vez conectados, su agente tiene acceso a 14 herramientas:

| Herramienta       | Descripción                                                    |
| ----------------- | -------------------------------------------------------------- |
| `gmail_search`    | Buscar correos por consulta (soporta sintaxis de búsqueda de Gmail) |
| `gmail_read`      | Leer un correo específico por ID                               |
| `gmail_send`      | Componer y enviar un correo                                    |
| `gmail_label`     | Agregar o quitar etiquetas de un mensaje                       |
| `calendar_list`   | Listar próximos eventos del calendario                         |
| `calendar_create` | Crear un nuevo evento de calendario                            |
| `calendar_update` | Actualizar un evento existente                                 |
| `tasks_list`      | Listar tareas de Google Tasks                                  |
| `tasks_create`    | Crear una nueva tarea                                          |
| `tasks_complete`  | Marcar una tarea como completada                               |
| `drive_search`    | Buscar archivos en Google Drive                                |
| `drive_read`      | Leer contenido de archivos (exporta Google Docs como texto)    |
| `sheets_read`     | Leer un rango de una hoja de cálculo                           |
| `sheets_write`    | Escribir valores en un rango de hoja de cálculo                |

## Ejemplos de Interacción

Pídanle a su agente cosas como:

- "¿Qué hay en mi calendario hoy?"
- "Busca en mi correo mensajes de alice@example.com"
- "Envía un correo a bob@example.com con el asunto 'Notas de la reunión'"
- "Encuentra la hoja de cálculo del presupuesto Q4 en Drive"
- "Agrega 'Comprar despensa' a mi lista de tareas"
- "Lee las celdas A1:D10 de la hoja de cálculo de Ventas"

## Permisos OAuth

Triggerfish solicita estos permisos durante la autorización:

| Permiso          | Nivel de Acceso                                     |
| ---------------- | --------------------------------------------------- |
| `gmail.modify`   | Leer, enviar y gestionar correos y etiquetas        |
| `calendar`       | Acceso completo de lectura/escritura a Google Calendar |
| `tasks`          | Acceso completo de lectura/escritura a Google Tasks  |
| `drive.readonly` | Acceso de solo lectura a archivos de Google Drive    |
| `spreadsheets`   | Acceso de lectura y escritura a Google Sheets        |

::: tip El acceso a Drive es de solo lectura. Triggerfish puede buscar y leer
sus archivos pero no puede crearlos, modificarlos ni eliminarlos. Sheets tiene
acceso de escritura separado para actualizaciones de celdas de hojas de
cálculo. :::

## Seguridad

- Todos los datos de Google Workspace se clasifican como mínimo **INTERNAL**
- El contenido de correo, detalles de calendario y contenido de documentos son
  típicamente **CONFIDENTIAL**
- Los tokens se almacenan en el llavero del SO (macOS Keychain / Linux
  libsecret)
- Las credenciales del cliente se almacenan junto con los tokens en el llavero,
  nunca en variables de entorno ni archivos de configuración
- La [regla de No Escritura Descendente](/pt-BR/security/no-write-down) aplica:
  los datos CONFIDENTIAL de Google no pueden fluir a canales PUBLIC
- Todas las llamadas a herramientas se registran en el registro de auditoría
  con contexto completo de clasificación

## Solución de Problemas

### "No Google tokens found"

Ejecuten `triggerfish connect google` para autenticarse.

### "Google refresh token revoked or expired"

Su refresh token fue invalidado (ej., revocaron el acceso en la configuración
de la cuenta de Google). Ejecuten `triggerfish connect google` para reconectarse.

### "Access blocked: has not completed the Google verification process"

Esto significa que su cuenta de Google no está listada como usuario de prueba
de la app. Mientras la app está en estado "Testing" (el predeterminado), solo
las cuentas explícitamente agregadas como usuarios de prueba pueden autorizar.

1. Vayan a
   [Pantalla de consentimiento OAuth](https://console.cloud.google.com/apis/credentials/consent)
2. Vayan a la página **Audience** (en la barra lateral izquierda)
3. En la sección **Test users**, hagan clic en **+ Add Users** y agreguen su
   dirección de correo de Google
4. Guarden e intenten `triggerfish connect google` nuevamente

### "Token exchange failed"

Verifiquen su Client ID y Client Secret. Asegúrense de que:

- El tipo de cliente OAuth es "Desktop app"
- Todas las APIs requeridas están habilitadas en su proyecto de Google Cloud
- Su cuenta de Google está listada como usuario de prueba (si la app está en
  modo testing)

### APIs no habilitadas

Si ven errores 403 para servicios específicos, asegúrense de que la API
correspondiente esté habilitada en su
[Biblioteca de APIs de Google Cloud Console](https://console.cloud.google.com/apis/library).
