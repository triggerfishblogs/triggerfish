# KB: Cambios incompatibles

Una lista versión por versión de cambios que pueden requerir acción al actualizar.

## Notion: `client_secret` eliminado

**Commit:** 6d876c3

El campo `client_secret` fue eliminado de la configuración de la integración de Notion como medida de endurecimiento de seguridad. Notion ahora utiliza solo el token OAuth almacenado en el llavero del sistema operativo.

**Acción requerida:** Si su `triggerfish.yaml` tiene un campo `notion.client_secret`, elimínelo. Se ignorará pero puede causar confusión.

**Nuevo flujo de configuración:**

```bash
triggerfish connect notion
```

Esto almacena el token de integración en el llavero. No se necesita client secret.

---

## Nombres de herramientas: puntos a guiones bajos

**Commit:** 505a443

Todos los nombres de herramientas fueron cambiados de notación con puntos (`foo.bar`) a notación con guiones bajos (`foo_bar`). Algunos proveedores LLM no soportan puntos en los nombres de herramientas, lo que causaba fallos en las llamadas a herramientas.

**Acción requerida:** Si tiene reglas de política personalizadas o definiciones de skills que referencian nombres de herramientas con puntos, actualícelas para usar guiones bajos:

```yaml
# Antes
- tool: notion.search

# Después
- tool: notion_search
```

---

## Instalador de Windows: Move-Item a Copy-Item

**Commit:** 5e0370f

El instalador PowerShell de Windows fue cambiado de `Move-Item -Force` a `Copy-Item -Force` para el reemplazo del binario durante las actualizaciones. `Move-Item` no sobreescribe ficheros de forma fiable en Windows.

**Acción requerida:** Ninguna si instala de nuevo. Si está en una versión anterior y `triggerfish update` falla en Windows, detenga el servicio manualmente antes de actualizar:

```powershell
Stop-Service Triggerfish
# Luego vuelva a ejecutar el instalador o triggerfish update
```

---

## Estampado de versión: de tiempo de ejecución a tiempo de compilación

**Commits:** e8b0c8c, eae3930, 6ce0c25

La información de versión fue movida de la detección en tiempo de ejecución (comprobando `deno.json`) al estampado en tiempo de compilación desde las etiquetas de git. El banner del CLI ya no muestra una cadena de versión codificada.

**Acción requerida:** Ninguna. `triggerfish version` sigue funcionando. Las compilaciones de desarrollo muestran `dev` como versión.

---

## Signal: JRE 21 a JRE 25

**Commit:** e5b1047

El instalador automático del canal Signal fue actualizado para descargar JRE 25 (de Adoptium) en lugar de JRE 21. La versión de signal-cli también fue fijada a v0.14.0.

**Acción requerida:** Si tiene una instalación existente de signal-cli con un JRE más antiguo, vuelva a ejecutar la configuración de Signal:

```bash
triggerfish config add-channel signal
```

Esto descarga el JRE y signal-cli actualizados.

---

## Secretos: texto plano a cifrado

El formato de almacenamiento de secretos cambió de JSON en texto plano a JSON cifrado con AES-256-GCM.

**Acción requerida:** Ninguna. La migración es automática. Consulte [Migración de secretos](/es-ES/support/kb/secrets-migration) para más detalles.

Tras la migración, se recomienda rotar sus secretos porque las versiones en texto plano se almacenaban previamente en disco.

---

## Tidepool: de callback a protocolo canvas

La interfaz Tidepool (A2UI) migró de una interfaz `TidepoolTools` basada en callbacks a un protocolo basado en canvas.

**Ficheros afectados:**
- `src/tools/tidepool/tools/tools_legacy.ts` (interfaz antigua, conservada para compatibilidad)
- `src/tools/tidepool/tools/tools_canvas.ts` (interfaz nueva)

**Acción requerida:** Si tiene skills personalizadas que utilizan la interfaz antigua de callback de Tidepool, seguirán funcionando a través de la capa de compatibilidad heredada. Las nuevas skills deben utilizar el protocolo canvas.

---

## Configuración: formato heredado de cadena `primary`

El campo `models.primary` anteriormente aceptaba una cadena simple (`"anthropic/claude-sonnet-4-20250514"`). Ahora requiere un objeto:

```yaml
# Heredado (aún aceptado por compatibilidad retroactiva)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Actual (preferido)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Acción requerida:** Actualice al formato de objeto. El formato de cadena aún se analiza pero puede eliminarse en una versión futura.

---

## Registro por consola: eliminado

**Commit:** 9ce1ce5

Todas las llamadas a `console.log`, `console.warn` y `console.error` fueron migradas al registrador estructurado (`createLogger()`). Dado que Triggerfish se ejecuta como daemon, la salida stdout/stderr no es visible para los usuarios. Todo el registro ahora pasa por el escritor de ficheros.

**Acción requerida:** Ninguna. Si dependía de la salida de consola para depuración (por ejemplo, redirigiendo stdout), utilice `triggerfish logs` en su lugar.

---

## Estimación del impacto

Al actualizar a través de varias versiones, compruebe cada entrada anterior. La mayoría de los cambios son retrocompatibles con migración automática. Los únicos cambios que requieren acción manual son:

1. **Eliminación de client_secret de Notion** (eliminar el campo de la configuración)
2. **Cambio de formato de nombres de herramientas** (actualizar reglas de política personalizadas)
3. **Actualización de JRE de Signal** (volver a ejecutar la configuración de Signal si utiliza Signal)

Todo lo demás se gestiona automáticamente.
