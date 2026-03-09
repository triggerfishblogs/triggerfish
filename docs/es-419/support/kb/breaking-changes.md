# KB: Cambios incompatibles

Una lista versión por versión de cambios que pueden requerir acción al actualizar.

## Notion: `client_secret` eliminado

**Commit:** 6d876c3

El campo `client_secret` fue eliminado de la configuración de la integración de Notion como medida de endurecimiento de seguridad. Notion ahora usa solo el token OAuth almacenado en el keychain del SO.

**Acción requerida:** Si tu `triggerfish.yaml` tiene un campo `notion.client_secret`, elimínalo. Será ignorado pero puede causar confusión.

**Nuevo flujo de configuración:**

```bash
triggerfish connect notion
```

Esto almacena el token de integración en el keychain. No se necesita client secret.

---

## Nombres de herramientas: de puntos a guiones bajos

**Commit:** 505a443

Todos los nombres de herramientas fueron cambiados de notación con puntos (`foo.bar`) a notación con guiones bajos (`foo_bar`). Algunos proveedores de LLM no soportan puntos en los nombres de herramientas, lo que causaba fallos en las llamadas a herramientas.

**Acción requerida:** Si tienes reglas de política personalizadas o definiciones de skills que referencian nombres de herramientas con puntos, actualízalas para usar guiones bajos:

```yaml
# Antes
- tool: notion.search

# Después
- tool: notion_search
```

---

## Instalador de Windows: Move-Item a Copy-Item

**Commit:** 5e0370f

El instalador PowerShell de Windows fue cambiado de `Move-Item -Force` a `Copy-Item -Force` para el reemplazo de binarios durante actualizaciones. `Move-Item` no sobrescribe archivos de forma confiable en Windows.

**Acción requerida:** Ninguna si estás instalando desde cero. Si estás en una versión anterior y `triggerfish update` falla en Windows, detén el servicio manualmente antes de actualizar:

```powershell
Stop-Service Triggerfish
# Luego vuelve a ejecutar el instalador o triggerfish update
```

---

## Estampado de versión: de tiempo de ejecución a tiempo de compilación

**Commits:** e8b0c8c, eae3930, 6ce0c25

La información de versión fue movida de detección en tiempo de ejecución (verificando `deno.json`) a estampado en tiempo de compilación desde tags de git. El banner del CLI ya no muestra una cadena de versión hardcodeada.

**Acción requerida:** Ninguna. `triggerfish version` continúa funcionando. Las compilaciones de desarrollo muestran `dev` como la versión.

---

## Signal: JRE 21 a JRE 25

**Commit:** e5b1047

El auto-instalador del canal Signal fue actualizado para descargar JRE 25 (de Adoptium) en lugar de JRE 21. La versión de signal-cli también fue fijada a v0.14.0.

**Acción requerida:** Si tienes una instalación existente de signal-cli con un JRE antiguo, vuelve a ejecutar la configuración de Signal:

```bash
triggerfish config add-channel signal
```

Esto descarga el JRE y signal-cli actualizados.

---

## Secrets: de texto plano a cifrado

El formato de almacenamiento de secrets cambió de JSON en texto plano a JSON cifrado con AES-256-GCM.

**Acción requerida:** Ninguna. La migración es automática. Consulta [Migración de secrets](/es-419/support/kb/secrets-migration) para detalles.

Después de la migración, se recomienda rotar tus secrets porque las versiones en texto plano fueron previamente almacenadas en disco.

---

## Tidepool: de Callback a protocolo Canvas

La interfaz de Tidepool (A2UI) migró de una interfaz `TidepoolTools` basada en callbacks a un protocolo basado en canvas.

**Archivos afectados:**
- `src/tools/tidepool/tools/tools_legacy.ts` (interfaz antigua, retenida por compatibilidad)
- `src/tools/tidepool/tools/tools_canvas.ts` (interfaz nueva)

**Acción requerida:** Si tienes skills personalizados que usan la interfaz antigua de callbacks de Tidepool, seguirán funcionando a través del shim legacy. Los nuevos skills deben usar el protocolo canvas.

---

## Config: formato legacy de cadena para `primary`

El campo `models.primary` anteriormente aceptaba una cadena simple (`"anthropic/claude-sonnet-4-20250514"`). Ahora requiere un objeto:

```yaml
# Legacy (aún aceptado por compatibilidad hacia atrás)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Actual (preferido)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Acción requerida:** Actualiza al formato de objeto. El formato de cadena aún se parsea pero puede ser eliminado en una versión futura.

---

## Logging por consola: eliminado

**Commit:** 9ce1ce5

Todas las llamadas directas a `console.log`, `console.warn` y `console.error` fueron migradas al logger estructurado (`createLogger()`). Como Triggerfish se ejecuta como daemon, la salida de stdout/stderr no es visible para los usuarios. Todo el logging ahora pasa por el escritor de archivos.

**Acción requerida:** Ninguna. Si dependías de la salida por consola para depuración (ej., canalizando stdout), usa `triggerfish logs` en su lugar.

---

## Estimación de impacto

Al actualizar entre múltiples versiones, revisa cada entrada anterior. La mayoría de los cambios son compatibles hacia atrás con migración automática. Los únicos cambios que requieren acción manual son:

1. **Eliminación de client_secret de Notion** (eliminar el campo de la config)
2. **Cambio de formato de nombres de herramientas** (actualizar reglas de política personalizadas)
3. **Actualización de JRE de Signal** (volver a ejecutar la configuración de Signal si usas Signal)

Todo lo demás se maneja automáticamente.
