# Proveedores LLM y Failover

Triggerfish soporta multiples proveedores LLM con failover automatico, seleccion
de modelo por agente y cambio de modelo a nivel de sesion. Sin dependencia de un
solo proveedor.

## Proveedores Soportados

| Proveedor  | Auth    | Modelos                    | Notas                               |
| ---------- | ------- | -------------------------- | ----------------------------------- |
| Anthropic  | API key | Claude Opus, Sonnet, Haiku | API estandar de Anthropic           |
| OpenAI     | API key | GPT-4o, o1, o3             | API estandar de OpenAI              |
| Google     | API key | Gemini Pro, Flash          | API de Google AI Studio             |
| Local      | Ninguna | Llama, Mistral, etc.       | Compatible con Ollama, formato OpenAI |
| OpenRouter | API key | Cualquier modelo en OpenRouter | Acceso unificado a muchos proveedores |
| Z.AI       | API key | GLM-4.7, GLM-4.5, GLM-5   | Z.AI Coding Plan, compatible con OpenAI |

## Interfaz LlmProvider

Todos los proveedores implementan la misma interfaz:

```typescript
interface LlmProvider {
  /** Generar una completacion a partir de un historial de mensajes. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Transmitir una completacion token por token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** Si este proveedor soporta llamadas a herramientas/funciones. */
  supportsTools: boolean;

  /** El identificador del modelo (ej., "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

Esto significa que puede cambiar de proveedor sin cambiar ninguna logica de la
aplicacion. El ciclo del agente y toda la orquestacion de herramientas funcionan
de manera identica independientemente del proveedor activo.

## Configuracion

### Configuracion Basica

Configure su modelo principal y credenciales de proveedor en
`triggerfish.yaml`:

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

### Cadena de Failover

El FailoverChain proporciona fallback automatico cuando un proveedor no esta
disponible. Configure una lista ordenada de modelos de respaldo:

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

Cuando el modelo principal falla debido a una condicion configurada (limitacion
de tasa, error de servidor o timeout), Triggerfish automaticamente intenta con el
siguiente proveedor en la cadena. Esto sucede de forma transparente -- la
conversacion continua sin interrupcion.

### Condiciones de Failover

| Condicion      | Descripcion                                       |
| -------------- | ------------------------------------------------- |
| `rate_limited` | El proveedor retorna una respuesta 429 de limite de tasa |
| `server_error` | El proveedor retorna un error de servidor 5xx     |
| `timeout`      | La solicitud excede el timeout configurado        |

## Seleccion de Modelo por Agente

En una [configuracion multi-agente](./multi-agent), cada agente puede usar un
modelo diferente optimizado para su rol:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Mejor razonamiento para investigacion
    - id: quick-tasks
      model: claude-haiku-4-5 # Rapido y economico para tareas simples
    - id: coding
      model: claude-sonnet-4-5 # Buen balance para codigo
```

## Cambio de Modelo a Nivel de Sesion

El agente puede cambiar de modelo a mitad de sesion para optimizacion de costos.
Use un modelo rapido para consultas simples y escale a un modelo mas capaz para
razonamiento complejo. Esto esta disponible a traves de la herramienta
`session_status`.

## Limitacion de Tasa

Triggerfish incluye un limitador de tasa integrado con ventana deslizante que
previene alcanzar los limites de API del proveedor. El limitador envuelve
cualquier proveedor de forma transparente -- rastrea tokens por minuto (TPM) y
solicitudes por minuto (RPM) en una ventana deslizante y retrasa llamadas cuando
se aproximan los limites.

La limitacion de tasa funciona junto con el failover: si el limite de tasa de un
proveedor se agota y el limitador no puede esperar dentro del timeout, la cadena
de failover se activa e intenta con el siguiente proveedor.

Vea [Limitacion de Tasa](/pt-BR/features/rate-limiting) para detalles completos
incluyendo limites de niveles de OpenAI.

::: info Las API keys nunca se almacenan en archivos de configuracion. Use su
keychain del SO via `triggerfish config set-secret`. Vea el
[Modelo de Seguridad](/pt-BR/security/) para detalles sobre gestion de
secretos. :::
