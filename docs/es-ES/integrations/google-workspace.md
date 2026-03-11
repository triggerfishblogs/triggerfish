# Google Workspace

Conecte su cuenta de Google para dar a su agente acceso a Gmail, Calendar, Tasks, Drive y Sheets.

## Requisitos previos

- Una cuenta de Google
- Un proyecto de Google Cloud con credenciales OAuth

## Configuración

### Paso 1: Crear un proyecto de Google Cloud

1. Vaya a [Google Cloud Console](https://console.cloud.google.com/)
2. Pulse en el desplegable de proyecto en la parte superior y seleccione **Nuevo proyecto**
3. Nómbrelo "Triggerfish" (o lo que prefiera) y pulse **Crear**

### Paso 2: Habilitar APIs

Habilite cada una de estas APIs en su proyecto:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Pulse **Habilitar** en cada página. Solo necesita hacerse una vez por proyecto.

### Paso 3: Configurar la pantalla de consentimiento OAuth

Antes de poder crear credenciales, Google requiere una pantalla de consentimiento OAuth. Esta es la pantalla que ven los usuarios al otorgar acceso.

1. Vaya a
   [Pantalla de consentimiento OAuth](https://console.cloud.google.com/apis/credentials/consent)
2. Tipo de usuario: seleccione **Externo** (o **Interno** si está en una organización de Google Workspace y solo quiere usuarios de la organización)
3. Pulse **Crear**
4. Complete los campos obligatorios:
   - **Nombre de la app**: "Triggerfish" (o lo que prefiera)
   - **Correo de soporte al usuario**: su dirección de correo
   - **Correo de contacto del desarrollador**: su dirección de correo
5. Pulse **Guardar y continuar**
6. En la pantalla de **Ámbitos**, pulse **Agregar o quitar ámbitos** y añada:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. Pulse **Actualizar**, luego **Guardar y continuar**
8. Vaya a la página de **Audiencia** (en la barra lateral izquierda bajo "Pantalla de consentimiento OAuth") -- aquí encontrará la sección de **Usuarios de prueba**
9. Pulse **+ Agregar usuarios** y añada su propia dirección de correo de Google
10. Pulse **Guardar y continuar**, luego **Volver al panel**

::: warning Mientras su app está en estado "Pruebas", solo los usuarios de prueba que haya añadido pueden autorizar. Esto es suficiente para uso personal. Publicar la app elimina la restricción de usuarios de prueba pero requiere verificación de Google. :::

### Paso 4: Crear credenciales OAuth

1. Vaya a [Credenciales](https://console.cloud.google.com/apis/credentials)
2. Pulse **+ CREAR CREDENCIALES** en la parte superior
3. Seleccione **ID de cliente OAuth**
4. Tipo de aplicación: **App de escritorio**
5. Nombre: "Triggerfish" (o lo que prefiera)
6. Pulse **Crear**
7. Copie el **ID de cliente** y el **Secreto de cliente**

### Paso 5: Conectar

```bash
triggerfish connect google
```

Se le pedirá:

1. Su **ID de cliente**
2. Su **Secreto de cliente**

Se abrirá una ventana del navegador para que otorgue acceso. Tras la autorización, los tokens se almacenan de forma segura en el llavero de su SO (macOS Keychain o Linux libsecret). No se almacenan credenciales en archivos de configuración ni variables de entorno.

### Desconectar

```bash
triggerfish disconnect google
```

Elimina todos los tokens de Google de su llavero. Puede reconectar en cualquier momento ejecutando `connect` de nuevo.

## Herramientas disponibles

Una vez conectado, su agente tiene acceso a 14 herramientas:

| Herramienta       | Descripción                                                  |
| ----------------- | ------------------------------------------------------------ |
| `gmail_search`    | Buscar correos por consulta (admite sintaxis de búsqueda de Gmail) |
| `gmail_read`      | Leer un correo específico por ID                             |
| `gmail_send`      | Componer y enviar un correo                                  |
| `gmail_label`     | Añadir o quitar etiquetas de un mensaje                      |
| `calendar_list`   | Listar eventos próximos del calendario                       |
| `calendar_create` | Crear un nuevo evento de calendario                          |
| `calendar_update` | Actualizar un evento existente                               |
| `tasks_list`      | Listar tareas de Google Tasks                                |
| `tasks_create`    | Crear una nueva tarea                                        |
| `tasks_complete`  | Marcar una tarea como completada                             |
| `drive_search`    | Buscar archivos en Google Drive                              |
| `drive_read`      | Leer contenido de archivos (exporta Google Docs como texto)  |
| `sheets_read`     | Leer un rango de una hoja de cálculo                         |
| `sheets_write`    | Escribir valores en un rango de hoja de cálculo              |

## Ejemplos de interacción

Pida a su agente cosas como:

- "¿Qué tengo en el calendario hoy?"
- "Busca en mi correo mensajes de alice@example.com"
- "Envía un correo a bob@example.com con el asunto 'Notas de la reunión'"
- "Busca la hoja de cálculo del presupuesto Q4 en Drive"
- "Añade 'Comprar comida' a mi lista de tareas"
- "Lee las celdas A1:D10 de la hoja de cálculo de Ventas"

## Ámbitos OAuth

Triggerfish solicita estos ámbitos durante la autorización:

| Ámbito           | Nivel de acceso                                    |
| ---------------- | -------------------------------------------------- |
| `gmail.modify`   | Leer, enviar y gestionar correo y etiquetas        |
| `calendar`       | Acceso completo de lectura/escritura a Google Calendar |
| `tasks`          | Acceso completo de lectura/escritura a Google Tasks |
| `drive.readonly` | Acceso de solo lectura a archivos de Google Drive   |
| `spreadsheets`   | Acceso de lectura y escritura a Google Sheets       |

::: tip El acceso a Drive es de solo lectura. Triggerfish puede buscar y leer sus archivos pero no puede crearlos, modificarlos ni eliminarlos. Sheets tiene acceso de escritura separado para actualizaciones de celdas de hojas de cálculo. :::

## Seguridad

- Todos los datos de Google Workspace se clasifican como mínimo **INTERNAL**
- El contenido de correos, detalles de calendario y contenido de documentos son típicamente **CONFIDENTIAL**
- Los tokens se almacenan en el llavero del SO (macOS Keychain / Linux libsecret)
- Las credenciales del cliente se almacenan junto a los tokens en el llavero, nunca en variables de entorno ni archivos de configuración
- La [regla de escritura descendente](/es-ES/security/no-write-down) se aplica: los datos CONFIDENTIAL de Google no pueden fluir a canales PUBLIC
- Todas las llamadas a herramientas se registran en la pista de auditoría con contexto de clasificación completo

## Resolución de problemas

### "No Google tokens found"

Ejecute `triggerfish connect google` para autenticarse.

### "Google refresh token revoked or expired"

Su token de actualización fue invalidado (p. ej., revocó el acceso en la configuración de su cuenta de Google). Ejecute `triggerfish connect google` para reconectar.

### "Access blocked: has not completed the Google verification process"

Esto significa que su cuenta de Google no está listada como usuario de prueba para la app. Mientras la app está en estado "Pruebas" (el predeterminado), solo las cuentas explícitamente añadidas como usuarios de prueba pueden autorizar.

1. Vaya a
   [Pantalla de consentimiento OAuth](https://console.cloud.google.com/apis/credentials/consent)
2. Vaya a la página de **Audiencia** (en la barra lateral izquierda)
3. En la sección de **Usuarios de prueba**, pulse **+ Agregar usuarios** y añada su dirección de correo de Google
4. Guarde e intente `triggerfish connect google` de nuevo

### "Token exchange failed"

Verifique su ID de cliente y Secreto de cliente. Asegúrese de que:

- El tipo de cliente OAuth es "App de escritorio"
- Todas las APIs requeridas están habilitadas en su proyecto de Google Cloud
- Su cuenta de Google está listada como usuario de prueba (si la app está en modo de pruebas)

### APIs no habilitadas

Si ve errores 403 para servicios específicos, asegúrese de que la API correspondiente está habilitada en su
[Biblioteca de APIs de Google Cloud Console](https://console.cloud.google.com/apis/library).
