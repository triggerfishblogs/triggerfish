# Solución de problemas: configuración

## Errores de análisis YAML

### "Configuration parse failed"

El archivo YAML tiene un error de sintaxis. Causas comunes:

- **Indentación incorrecta.** YAML es sensible a espacios en blanco. Usa espacios, no tabs. Cada nivel de anidamiento debe ser exactamente 2 espacios.
- **Caracteres especiales sin comillas.** Los valores que contienen `:`, `#`, `{`, `}`, `[`, `]` o `&` deben estar entre comillas.
- **Falta dos puntos después de la clave.** Cada clave necesita `: ` (dos puntos seguido de un espacio).

Valida tu YAML:

```bash
triggerfish config validate
```

O usa un validador de YAML en línea para encontrar la línea exacta.

### "Configuration file did not parse to an object"

El archivo YAML se analizó exitosamente pero el resultado no es un mapeo YAML (objeto). Esto pasa si tu archivo contiene solo un valor escalar, una lista, o está vacío.

Tu `triggerfish.yaml` debe tener un mapeo de nivel superior. Como mínimo:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### "Configuration file not found"

Triggerfish busca la configuración en estas rutas, en orden:

1. Variable de entorno `$TRIGGERFISH_CONFIG` (si está configurada)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (si `TRIGGERFISH_DATA_DIR` está configurada)
3. `/data/triggerfish.yaml` (entornos Docker)
4. `~/.triggerfish/triggerfish.yaml` (por defecto)

Ejecuta el asistente de configuración para crear uno:

```bash
triggerfish dive
```

---

## Errores de validación

### "Configuration validation failed"

Esto significa que el YAML se analizó pero falló la validación estructural. Mensajes específicos:

**"models is required"** o **"models.primary is required"**

La sección `models` es obligatoria. Necesitas al menos un proveedor primario y modelo:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** o **"primary.model must be non-empty"**

El campo `primary` debe tener tanto `provider` como `model` configurados con cadenas no vacías.

**"Invalid classification level"** en `classification_models`

Los niveles válidos son: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. Son sensibles a mayúsculas. Verifica las claves de tus `classification_models`.

---

## Errores de referencias a secrets

### Secret no resuelto al inicio

Si tu configuración contiene `secret:alguna-clave` y esa clave no existe en el keychain, el daemon se cierra con un error como:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Solución:**

```bash
# Listar qué secrets existen
triggerfish config get-secret --list

# Almacenar el secret faltante
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Backend de secrets no disponible

En Linux, el almacén de secrets usa `secret-tool` (libsecret / GNOME Keyring). Si la interfaz D-Bus de Secret Service no está disponible (servidores headless, contenedores mínimos), verás errores al almacenar o recuperar secrets.

**Solución para Linux headless:**

1. Instala `gnome-keyring` y `libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Inicia el daemon del keyring:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. O usa el fallback de archivos cifrados configurando:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Nota: el fallback en memoria significa que los secrets se pierden al reiniciar. Solo es adecuado para pruebas.

---

## Problemas con valores de configuración

### Coerción de booleanos

Al usar `triggerfish config set`, los valores de cadena `"true"` y `"false"` se convierten automáticamente a booleanos YAML. Si realmente necesitas la cadena literal `"true"`, edita el archivo YAML directamente.

De manera similar, las cadenas que parecen enteros (`"8080"`) se convierten a números.

### Sintaxis de rutas con puntos

Los comandos `config set` y `config get` usan rutas con puntos para navegar YAML anidado:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Si un segmento de ruta contiene un punto, no hay sintaxis de escape. Edita el archivo YAML directamente.

### Enmascaramiento de secrets en `config get`

Cuando ejecutas `triggerfish config get` en una clave que contiene "key", "secret" o "token", la salida se enmascara: `****...****` con solo los primeros y últimos 4 caracteres visibles. Esto es intencional. Usa `triggerfish config get-secret <clave>` para recuperar el valor real.

---

## Respaldos de configuración

Triggerfish crea un respaldo con timestamp en `~/.triggerfish/backups/` antes de cada operación `config set`, `config add-channel` o `config add-plugin`. Se retienen hasta 10 respaldos.

Para restaurar un respaldo:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Verificación de proveedores

El asistente de configuración verifica las API keys llamando al endpoint de listado de modelos de cada proveedor (lo cual no consume tokens). Los endpoints de verificación son:

| Proveedor | Endpoint |
|-----------|----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

Si la verificación falla, verifica:
- La API key es correcta y no está expirada
- El endpoint es accesible desde tu red
- Para proveedores locales (Ollama, LM Studio), el servidor está realmente ejecutándose

### Modelo no encontrado

Si la verificación tiene éxito pero el modelo no se encuentra, el asistente te advierte. Esto usualmente significa:

- **Error tipográfico en el nombre del modelo.** Revisa los docs del proveedor para los IDs exactos de modelo.
- **Modelo de Ollama no descargado.** Ejecuta `ollama pull <modelo>` primero.
- **El proveedor no lista el modelo.** Algunos proveedores (Fireworks) usan formatos de nombre diferentes. El asistente normaliza patrones comunes, pero IDs de modelo inusuales pueden no coincidir.
