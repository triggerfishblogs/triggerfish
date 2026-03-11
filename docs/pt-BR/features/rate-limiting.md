# Limitacion de Tasa

Triggerfish incluye un limitador de tasa con ventana deslizante que previene
alcanzar los limites de API de proveedores LLM. Envuelve cualquier proveedor de
forma transparente -- el ciclo del agente no necesita saber sobre limites de
tasa. Cuando la capacidad se agota, las llamadas se retrasan automaticamente
hasta que la ventana se desliza lo suficiente para liberar capacidad.

## Como Funciona

El limitador de tasa usa una ventana deslizante (predeterminado 60 segundos)
para rastrear dos metricas:

- **Tokens por minuto (TPM)** -- total de tokens consumidos (prompt +
  completacion) dentro de la ventana
- **Solicitudes por minuto (RPM)** -- total de llamadas API dentro de la ventana

Antes de cada llamada LLM, el limitador verifica la capacidad disponible contra
ambos limites. Si alguno se agota, la llamada espera hasta que las entradas mas
antiguas se deslicen fuera de la ventana y liberen suficiente capacidad. Despues
de que cada llamada se completa, el uso real de tokens se registra.

Tanto las llamadas de streaming como las no-streaming consumen del mismo
presupuesto. Para llamadas de streaming, el uso de tokens se registra cuando el
stream termina.

<img src="/diagrams/rate-limiter-flow.svg" alt="Flujo del limitador de tasa: Ciclo del Agente -> Limitador de Tasa -> verificacion de capacidad -> reenviar al proveedor o esperar" style="max-width: 100%;" />

## Limites de Niveles de OpenAI

El limitador de tasa viene con valores predeterminados integrados para los
limites publicados de niveles de OpenAI:

| Nivel  | GPT-4o TPM  | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ----------- | ---------- | ------- | ------ |
| Free   | 30,000      | 500        | 30,000  | 500    |
| Tier 1 | 30,000      | 500        | 30,000  | 500    |
| Tier 2 | 450,000     | 5,000      | 100,000 | 1,000  |
| Tier 3 | 800,000     | 5,000      | 100,000 | 1,000  |
| Tier 4 | 2,000,000   | 10,000     | 200,000 | 10,000 |
| Tier 5 | 30,000,000  | 10,000     | 200,000 | 10,000 |

::: warning Estos son valores predeterminados basados en los limites publicados
de OpenAI. Sus limites reales dependen de su nivel de cuenta OpenAI e historial
de uso. Otros proveedores (Anthropic, Google) manejan sus propios limites de
tasa del lado del servidor -- el limitador es mas util para OpenAI donde la
limitacion del lado del cliente previene errores 429. :::

## Configuracion

La limitacion de tasa es automatica cuando se usa el proveedor envuelto. No se
necesita configuracion del usuario para el comportamiento predeterminado. El
limitador detecta su proveedor y aplica los limites apropiados.

Usuarios avanzados pueden personalizar limites via la configuracion del
proveedor en `triggerfish.yaml`:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Tokens por minuto
        rpm: 5000 # Solicitudes por minuto
        window_ms: 60000 # Tamano de ventana (predeterminado 60s)
```

::: info La limitacion de tasa lo protege de errores 429 y facturas inesperadas.
Funciona junto con la cadena de failover -- si se alcanzan los limites de tasa y
el limitador no puede esperar (timeout), el failover se activa para intentar con
el siguiente proveedor. :::

## Monitoreo de Uso

El limitador de tasa expone una instantanea en vivo del uso actual:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

La barra de progreso de contexto en CLI y Tide Pool muestra el uso de contexto.
El estado del limitador de tasa es visible en los logs de debug:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Cuando el limitador retrasa una llamada, registra el tiempo de espera:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Limitacion de Tasa por Canal

Ademas de la limitacion de tasa de proveedores LLM, Triggerfish aplica limites
de tasa de mensajes por canal para prevenir inundar plataformas de mensajeria.
Cada adaptador de canal rastrea la frecuencia de mensajes salientes y retrasa
envios cuando se aproximan los limites.

Esto protege contra:

- Bloqueos de API de plataformas por volumen excesivo de mensajes
- Spam accidental de ciclos descontrolados del agente
- Tormentas de mensajes disparadas por webhooks

Los limites de tasa de canal se aplican de forma transparente por el router de
canales. Si el agente genera salida mas rapido de lo que el canal permite, los
mensajes se encolan y se entregan a la tasa maxima permitida.

## Relacionado

- [Proveedores LLM y Failover](/pt-BR/features/model-failover) -- integracion
  de la cadena de failover con limitacion de tasa
- [Configuracion](/pt-BR/guide/configuration) -- esquema completo de
  `triggerfish.yaml`
