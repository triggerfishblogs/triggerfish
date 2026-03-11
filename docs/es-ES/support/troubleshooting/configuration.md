# Solución de problemas: Configuración

## Errores de análisis YAML

### "Configuration parse failed"

El fichero YAML tiene un error de sintaxis. Causas comunes:

- **Indentación incorrecta.** YAML es sensible a los espacios en blanco. Utilice espacios, no tabulaciones. Cada nivel de anidación debe ser exactamente de 2 espacios.
- **Caracteres especiales sin entrecomillar.** Los valores que contienen `:`, `#`, `{`, `}`, `[`, `]` o `&` deben entrecomillarse.
- **Falta dos puntos después de la clave.** Cada clave necesita un `: ` (dos puntos seguido de un espacio).

Valide su YAML:

```bash
triggerfish config validate
```

O utilice un validador YAML en línea para encontrar la línea exacta.

### "Configuration file did not parse to an object"

El fichero YAML se analizó correctamente pero el resultado no es un mapping YAML (objeto). Esto ocurre si su fichero contiene solo un valor escalar, una lista o está vacío.

Su `triggerfish.yaml` debe tener un mapping de nivel superior. Como mínimo:

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

Triggerfish busca la configuración en estas rutas, por orden:

1. Variable de entorno `$TRIGGERFISH_CONFIG` (si está establecida)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (si `TRIGGERFISH_DATA_DIR` está establecida)
3. `/data/triggerfish.yaml` (entornos Docker)
4. `~/.triggerfish/triggerfish.yaml` (por defecto)

Ejecute el asistente de configuración para crear uno:

```bash
triggerfish dive
```

---

## Errores de validación

### "Configuration validation failed"

Esto significa que el YAML se analizó pero falló la validación estructural. Mensajes específicos:

**"models is required"** o **"models.primary is required"**

La sección `models` es obligatoria. Necesita al menos un proveedor y modelo principal:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** o **"primary.model must be non-empty"**

El campo `primary` debe tener tanto `provider` como `model` establecidos con cadenas no vacías.

**"Invalid classification level"** en `classification_models`

Los niveles válidos son: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. Son sensibles a mayúsculas y minúsculas. Compruebe las claves de su `classification_models`.

---

## Errores de referencia de secretos

### Secreto no resuelto al inicio

Si su configuración contiene `secret:alguna-clave` y esa clave no existe en el llavero, el daemon se cierra con un error como:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Solución:**

```bash
# Listar qué secretos existen
triggerfish config get-secret --list

# Almacenar el secreto que falta
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Backend de secretos no disponible

En Linux, el almacén de secretos utiliza `secret-tool` (libsecret / GNOME Keyring). Si la interfaz D-Bus de Secret Service no está disponible (servidores sin escritorio, contenedores mínimos), verá errores al almacenar o recuperar secretos.

**Solución alternativa para Linux sin escritorio:**

1. Instale `gnome-keyring` y `libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Inicie el daemon del llavero:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. O utilice el respaldo de fichero cifrado estableciendo:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Nota: el respaldo en memoria significa que los secretos se pierden al reiniciar. Solo es adecuado para pruebas.

---

## Problemas con valores de configuración

### Conversión booleana

Al usar `triggerfish config set`, los valores de cadena `"true"` y `"false"` se convierten automáticamente a booleanos YAML. Si realmente necesita la cadena literal `"true"`, edite el fichero YAML directamente.

De forma similar, las cadenas que parecen enteros (`"8080"`) se convierten a números.

### Sintaxis de ruta con puntos

Los comandos `config set` y `config get` utilizan rutas con puntos para navegar por el YAML anidado:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Si un segmento de ruta contiene un punto, no hay sintaxis de escape. Edite el fichero YAML directamente.

### Enmascaramiento de secretos en `config get`

Cuando ejecuta `triggerfish config get` en una clave que contiene "key", "secret" o "token", la salida se enmascara: `****...****` con solo los primeros y últimos 4 caracteres visibles. Esto es intencionado. Utilice `triggerfish config get-secret <clave>` para obtener el valor real.

---

## Copias de seguridad de configuración

Triggerfish crea una copia de seguridad con marca temporal en `~/.triggerfish/backups/` antes de cada operación `config set`, `config add-channel` o `config add-plugin`. Se conservan hasta 10 copias de seguridad.

Para restaurar una copia de seguridad:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Verificación de proveedores

El asistente de configuración verifica las API keys llamando al endpoint de listado de modelos de cada proveedor (que no consume tokens). Los endpoints de verificación son:

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

Si la verificación falla, compruebe:
- La API key es correcta y no ha caducado
- El endpoint es accesible desde su red
- Para proveedores locales (Ollama, LM Studio), el servidor está realmente en ejecución

### Modelo no encontrado

Si la verificación tiene éxito pero el modelo no se encuentra, el asistente le avisa. Esto suele significar:

- **Error tipográfico en el nombre del modelo.** Consulte la documentación del proveedor para los IDs de modelo exactos.
- **Modelo de Ollama no descargado.** Ejecute primero `ollama pull <modelo>`.
- **El proveedor no lista el modelo.** Algunos proveedores (Fireworks) utilizan formatos de nombres diferentes. El asistente normaliza los patrones comunes, pero los IDs de modelo inusuales pueden no coincidir.
