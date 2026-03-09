# Solución de problemas: Proveedores LLM

## Errores comunes de proveedores

### 401 Unauthorized / 403 Forbidden

Su API key no es válida, ha caducado o no tiene permisos suficientes.

**Solución:**

```bash
# Almacenar de nuevo la API key
triggerfish config set-secret provider:<nombre>:apiKey <su-clave>

# Reiniciar el daemon
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

Ha superado el límite de tasa del proveedor. Triggerfish no reintenta automáticamente en caso de 429 para la mayoría de los proveedores (excepto Notion, que tiene retroceso incorporado).

**Solución:** Espere e inténtelo de nuevo. Si alcanza los límites de tasa de forma constante, considere:
- Actualizar su plan de API para obtener límites más altos
- Añadir un proveedor de failover para que las peticiones se redirigen cuando el principal está limitado
- Reducir la frecuencia de los triggers si las tareas programadas son la causa

### 500 / 502 / 503 Error del servidor

Los servidores del proveedor están experimentando problemas. Estos suelen ser transitorios.

Si tiene una cadena de failover configurada, Triggerfish prueba el siguiente proveedor automáticamente. Sin failover, el error se propaga al usuario.

### "No response body for streaming"

El proveedor aceptó la petición pero devolvió un cuerpo de respuesta vacío para una llamada de streaming. Esto puede ocurrir cuando:

- La infraestructura del proveedor está sobrecargada
- Un proxy o cortafuegos está eliminando el cuerpo de la respuesta
- El modelo no está disponible temporalmente

Afecta a: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Problemas específicos de proveedores

### Anthropic

**Conversión de formato de herramientas.** Triggerfish convierte entre el formato interno de herramientas y el formato nativo de herramientas de Anthropic. Si ve errores relacionados con herramientas, compruebe que sus definiciones de herramientas tienen JSON Schema válido.

**Manejo del prompt del sistema.** Anthropic requiere el prompt del sistema como un campo separado, no como un mensaje. Esta conversión es automática, pero si ve mensajes "system" apareciendo en la conversación, algo va mal con el formato de los mensajes.

### OpenAI

**Penalización de frecuencia.** Triggerfish aplica una penalización de frecuencia de 0,3 a todas las peticiones de OpenAI para desalentar la salida repetitiva. Esto está codificado y no puede cambiarse mediante configuración.

**Soporte de imágenes.** OpenAI soporta imágenes codificadas en base64 en el contenido del mensaje. Si la visión no funciona, asegúrese de tener un modelo con capacidad de visión configurado (por ejemplo, `gpt-4o`, no `gpt-4o-mini`).

### Google Gemini

**Clave en la cadena de consulta.** A diferencia de otros proveedores, Google utiliza la API key como parámetro de consulta, no como cabecera. Esto se gestiona automáticamente, pero significa que la clave puede aparecer en los registros de proxy/acceso si enruta a través de un proxy corporativo.

### Ollama / LM Studio (Local)

**El servidor debe estar en ejecución.** Los proveedores locales requieren que el servidor de modelos esté ejecutándose antes de que Triggerfish se inicie. Si Ollama o LM Studio no están en ejecución:

```
Local LLM request failed (connection refused)
```

**Inicie el servidor:**

```bash
# Ollama
ollama serve

# LM Studio
# Abra LM Studio e inicie el servidor local
```

**Modelo no cargado.** Con Ollama, el modelo debe descargarse primero:

```bash
ollama pull llama3.3:70b
```

**Anulación de endpoint.** Si su servidor local no está en el puerto por defecto:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Por defecto de Ollama
      # endpoint: "http://localhost:1234"  # Por defecto de LM Studio
```

### Fireworks

**API nativa.** Triggerfish utiliza la API nativa de Fireworks, no su endpoint compatible con OpenAI. Los IDs de modelo pueden diferir de lo que ve en la documentación compatible con OpenAI.

**Formatos de ID de modelo.** Fireworks acepta varios patrones de ID de modelo. El asistente normaliza los formatos comunes, pero si la verificación falla, consulte la [biblioteca de modelos de Fireworks](https://fireworks.ai/models) para el ID exacto.

### OpenRouter

**Enrutamiento de modelos.** OpenRouter enruta las peticiones a varios proveedores. Los errores del proveedor subyacente se envuelven en el formato de error de OpenRouter. El mensaje de error real se extrae y se muestra.

**Formato de errores de la API.** OpenRouter devuelve errores como objetos JSON. Si el mensaje de error parece genérico, el error sin procesar se registra a nivel DEBUG.

### ZenMux / Z.AI

**Soporte de streaming.** Ambos proveedores soportan streaming. Si el streaming falla:

```
ZenMux stream failed (status): error text
```

Compruebe que su API key tiene permisos de streaming (algunos niveles de API restringen el acceso al streaming).

---

## Failover

### Cómo funciona el failover

Cuando el proveedor principal falla, Triggerfish prueba cada modelo en la lista `failover` en orden:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Si un proveedor de failover tiene éxito, la respuesta se registra indicando qué proveedor se utilizó. Si todos los proveedores fallan, se devuelve al usuario el último error.

### "All providers exhausted"

Todos los proveedores de la cadena han fallado. Compruebe:

1. ¿Son válidas todas las API keys? Pruebe cada proveedor individualmente.
2. ¿Están todos los proveedores experimentando interrupciones? Consulte sus páginas de estado.
3. ¿Está su red bloqueando HTTPS saliente a alguno de los endpoints de los proveedores?

### Configuración de failover

```yaml
models:
  failover_config:
    max_retries: 3          # Reintentos por proveedor antes de pasar al siguiente
    retry_delay_ms: 1000    # Retardo base entre reintentos
    conditions:             # Qué errores activan el failover
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

El nombre del proveedor en `models.primary.provider` no coincide con ningún proveedor configurado en `models.providers`. Compruebe si hay errores tipográficos.

### "Classification model provider not configured"

Ha establecido una anulación de `classification_models` que referencia un proveedor no presente en `models.providers`:

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

## Comportamiento de reintentos

Triggerfish reintenta las peticiones a proveedores en caso de errores transitorios (tiempos de espera de red, respuestas 5xx). La lógica de reintentos:

1. Espera con retroceso exponencial entre intentos
2. Registra cada intento de reintento a nivel WARN
3. Tras agotar los reintentos de un proveedor, pasa al siguiente en la cadena de failover
4. Las conexiones de streaming tienen lógica de reintentos separada para el establecimiento de conexión frente a fallos durante la transmisión

Puede ver los intentos de reintento en los registros:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
