# Solución de problemas: proveedores de LLM

## Errores comunes de proveedores

### 401 Unauthorized / 403 Forbidden

Tu API key es inválida, expiró o no tiene permisos suficientes.

**Solución:**

```bash
# Vuelve a almacenar la API key
triggerfish config set-secret provider:<nombre>:apiKey <tu-clave>

# Reinicia el daemon
triggerfish stop && triggerfish start
```

Notas específicas por proveedor:

| Proveedor | Formato de clave | Dónde obtenerla |
|-----------|-----------------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

Has excedido el límite de tasa del proveedor. Triggerfish no reintenta automáticamente en 429 para la mayoría de los proveedores (excepto Notion, que tiene backoff incorporado).

**Solución:** Espera e intenta de nuevo. Si alcanzas los límites de tasa consistentemente, considera:
- Mejorar tu plan de API para límites más altos
- Agregar un proveedor de failover para que las solicitudes se redirijan cuando el primario está limitado
- Reducir la frecuencia de triggers si las tareas programadas son la causa

### 500 / 502 / 503 Server Error

Los servidores del proveedor están experimentando problemas. Estos son típicamente transitorios.

Si tienes una cadena de failover configurada, Triggerfish prueba el siguiente proveedor automáticamente. Sin failover, el error se propaga al usuario.

### "No response body for streaming"

El proveedor aceptó la solicitud pero devolvió un cuerpo de respuesta vacío para una llamada de streaming. Esto puede pasar cuando:

- La infraestructura del proveedor está sobrecargada
- Un proxy o firewall está eliminando el cuerpo de la respuesta
- El modelo no está disponible temporalmente

Esto afecta a: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Problemas específicos por proveedor

### Anthropic

**Conversión de formato de herramientas.** Triggerfish convierte entre el formato interno de herramientas y el formato nativo de herramientas de Anthropic. Si ves errores relacionados con herramientas, verifica que tus definiciones de herramientas tengan JSON Schema válido.

**Manejo del prompt del sistema.** Anthropic requiere el prompt del sistema como un campo separado, no como un mensaje. Esta conversión es automática, pero si ves mensajes "system" apareciendo en la conversación, algo está mal con el formato de mensajes.

### OpenAI

**Penalidad de frecuencia.** Triggerfish aplica una penalidad de frecuencia de 0.3 a todas las solicitudes de OpenAI para desincentivar salida repetitiva. Esto está hardcodeado y no se puede cambiar vía configuración.

**Soporte de imágenes.** OpenAI soporta imágenes codificadas en base64 en el contenido de mensajes. Si la visión no funciona, asegúrate de tener un modelo capaz de visión configurado (ej., `gpt-4o`, no `gpt-4o-mini`).

### Google Gemini

**Clave en query string.** A diferencia de otros proveedores, Google usa la API key como parámetro de consulta, no como header. Esto se maneja automáticamente, pero significa que la clave puede aparecer en logs de proxy/acceso si enrutas a través de un proxy corporativo.

### Ollama / LM Studio (local)

**El servidor debe estar ejecutándose.** Los proveedores locales requieren que el servidor de modelos esté ejecutándose antes de que Triggerfish inicie. Si Ollama o LM Studio no están ejecutándose:

```
Local LLM request failed (connection refused)
```

**Inicia el servidor:**

```bash
# Ollama
ollama serve

# LM Studio
# Abre LM Studio e inicia el servidor local
```

**Modelo no cargado.** Con Ollama, el modelo debe descargarse primero:

```bash
ollama pull llama3.3:70b
```

**Anulación de endpoint.** Si tu servidor local no está en el puerto por defecto:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Puerto por defecto de Ollama
      # endpoint: "http://localhost:1234"  # Puerto por defecto de LM Studio
```

### Fireworks

**API nativa.** Triggerfish usa la API nativa de Fireworks, no su endpoint compatible con OpenAI. Los IDs de modelo pueden diferir de lo que ves en la documentación compatible con OpenAI.

**Formatos de ID de modelo.** Fireworks acepta varios patrones de ID de modelo. El asistente normaliza formatos comunes, pero si la verificación falla, revisa la [biblioteca de modelos de Fireworks](https://fireworks.ai/models) para el ID exacto.

### OpenRouter

**Enrutamiento de modelos.** OpenRouter enruta las solicitudes a varios proveedores. Los errores del proveedor subyacente están envueltos en el formato de error de OpenRouter. El mensaje de error real se extrae y se muestra.

**Formato de error de API.** OpenRouter devuelve errores como objetos JSON. Si el mensaje de error parece genérico, el error sin procesar se registra a nivel DEBUG.

### ZenMux / Z.AI

**Soporte de streaming.** Ambos proveedores soportan streaming. Si el streaming falla:

```
ZenMux stream failed (status): error text
```

Verifica que tu API key tenga permisos de streaming (algunos niveles de API restringen el acceso a streaming).

---

## Failover

### Cómo funciona el failover

Cuando el proveedor primario falla, Triggerfish prueba cada modelo en la lista `failover` en orden:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Si un proveedor de failover tiene éxito, la respuesta se registra con qué proveedor fue utilizado. Si todos los proveedores fallan, el último error se devuelve al usuario.

### "All providers exhausted"

Cada proveedor en la cadena falló. Verifica:

1. ¿Son válidas todas las API keys? Prueba cada proveedor individualmente.
2. ¿Están todos los proveedores experimentando interrupciones? Revisa sus páginas de estado.
3. ¿Tu red está bloqueando HTTPS saliente a alguno de los endpoints de los proveedores?

### Configuración de failover

```yaml
models:
  failover_config:
    max_retries: 3          # Reintentos por proveedor antes de pasar al siguiente
    retry_delay_ms: 1000    # Retraso base entre reintentos
    conditions:             # Qué errores activan el failover
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

El nombre del proveedor en `models.primary.provider` no coincide con ningún proveedor configurado en `models.providers`. Busca errores tipográficos.

### "Classification model provider not configured"

Configuraste un override de `classification_models` que referencia un proveedor no presente en `models.providers`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # Este proveedor debe existir en models.providers
      model: llama3.3:70b
  providers:
    # "local" debe estar definido aquí
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Comportamiento de reintento

Triggerfish reintenta las solicitudes a proveedores en errores transitorios (timeouts de red, respuestas 5xx). La lógica de reintento:

1. Espera con backoff exponencial entre intentos
2. Registra cada intento de reintento a nivel WARN
3. Después de agotar los reintentos para un proveedor, pasa al siguiente en la cadena de failover
4. Las conexiones de streaming tienen lógica de reintento separada para el establecimiento de conexión vs. fallos a mitad del stream

Puedes ver los intentos de reintento en los logs:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
