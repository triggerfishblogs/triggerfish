# Proveedores LLM y failover

Triggerfish admite múltiples proveedores LLM con failover automático, selección de modelo por agente y cambio de modelo a nivel de sesión. Sin dependencia de un único proveedor.

## Proveedores admitidos

| Proveedor  | Autenticación | Modelos                     | Notas                               |
| ---------- | ------------- | --------------------------- | ----------------------------------- |
| Anthropic  | Clave API     | Claude Opus, Sonnet, Haiku  | API estándar de Anthropic           |
| OpenAI     | Clave API     | GPT-4o, o1, o3              | API estándar de OpenAI              |
| Google     | Clave API     | Gemini Pro, Flash           | API de Google AI Studio             |
| Local      | Ninguna       | Llama, Mistral, etc.        | Compatible con Ollama, formato OpenAI |
| OpenRouter | Clave API     | Cualquier modelo en OpenRouter | Acceso unificado a muchos proveedores |
| Z.AI       | Clave API     | GLM-4.7, GLM-4.5, GLM-5     | Z.AI Coding Plan, compatible OpenAI |

## Interfaz LlmProvider

Todos los proveedores implementan la misma interfaz:

```typescript
interface LlmProvider {
  /** Generar una completación a partir de un historial de mensajes. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Transmitir una completación token a token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** Si este proveedor admite llamadas a herramientas/funciones. */
  supportsTools: boolean;

  /** El identificador del modelo (p. ej., "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

Esto significa que puede cambiar de proveedor sin modificar ninguna lógica de la aplicación. El bucle del agente y toda la orquestación de herramientas funcionan de forma idéntica independientemente del proveedor activo.

## Configuración

### Configuración básica

Configure su modelo principal y las credenciales del proveedor en `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5
    openai:
      model: gpt-4o
    google:
      model: gemini-pro
    ollama:
      model: llama3
      baseUrl: "http://localhost:11434/v1" # Predeterminado de Ollama
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### Cadena de failover

El FailoverChain proporciona respaldo automático cuando un proveedor no está disponible. Configure una lista ordenada de modelos de respaldo:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # Primer respaldo
    - gpt-4o # Segundo respaldo
    - ollama/llama3 # Respaldo local (no requiere internet)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

Cuando el modelo principal falla debido a una condición configurada (limitación de tasa, error del servidor o timeout), Triggerfish intenta automáticamente con el siguiente proveedor en la cadena. Esto sucede de forma transparente -- la conversación continúa sin interrupción.

### Condiciones de failover

| Condición      | Descripción                                    |
| -------------- | ---------------------------------------------- |
| `rate_limited` | El proveedor devuelve una respuesta 429        |
| `server_error` | El proveedor devuelve un error 5xx             |
| `timeout`      | La solicitud excede el timeout configurado     |

## Selección de modelo por agente

En una [configuración multiagente](./multi-agent), cada agente puede usar un modelo diferente optimizado para su rol:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Mejor razonamiento para investigación
    - id: quick-tasks
      model: claude-haiku-4-5 # Rápido y económico para tareas simples
    - id: coding
      model: claude-sonnet-4-5 # Buen equilibrio para código
```

## Cambio de modelo a nivel de sesión

El agente puede cambiar de modelo durante una sesión para optimizar costes. Use un modelo rápido para consultas simples y escale a un modelo más capaz para razonamiento complejo. Esto está disponible a través de la herramienta `session_status`.

## Limitación de tasa

Triggerfish incluye un limitador de tasa con ventana deslizante integrado que previene alcanzar los límites de API del proveedor. El limitador envuelve cualquier proveedor de forma transparente -- rastrea tokens por minuto (TPM) y solicitudes por minuto (RPM) en una ventana deslizante y retrasa las llamadas cuando se acercan los límites.

La limitación de tasa funciona junto con el failover: si el límite de tasa de un proveedor se agota y el limitador no puede esperar dentro del timeout, la cadena de failover se activa e intenta con el siguiente proveedor.

Consulte [Limitación de tasa](/es-ES/features/rate-limiting) para obtener detalles completos, incluidos los límites por nivel de OpenAI.

::: info Las claves API nunca se almacenan en archivos de configuración. Use el llavero de su SO vía `triggerfish config set-secret`. Consulte el [modelo de seguridad](/es-ES/security/) para detalles sobre la gestión de secretos. :::
