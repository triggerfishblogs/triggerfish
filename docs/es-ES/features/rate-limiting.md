# Limitación de tasa

Triggerfish incluye un limitador de tasa con ventana deslizante que previene alcanzar los límites de API de los proveedores LLM. Envuelve cualquier proveedor de forma transparente -- el bucle del agente no necesita conocer los límites de tasa. Cuando la capacidad se agota, las llamadas se retrasan automáticamente hasta que la ventana se desplace lo suficiente para liberar capacidad.

## Cómo funciona

El limitador de tasa usa una ventana deslizante (predeterminado 60 segundos) para rastrear dos métricas:

- **Tokens por minuto (TPM)** -- total de tokens consumidos (prompt + completación) dentro de la ventana
- **Solicitudes por minuto (RPM)** -- total de llamadas API dentro de la ventana

Antes de cada llamada al LLM, el limitador comprueba la capacidad disponible contra ambos límites. Si cualquiera se agota, la llamada espera hasta que las entradas más antiguas se desplacen fuera de la ventana y liberen capacidad suficiente. Después de que cada llamada se completa, se registra el uso real de tokens.

Tanto las llamadas con streaming como sin streaming consumen del mismo presupuesto. Para las llamadas con streaming, el uso de tokens se registra cuando el stream finaliza.

<img src="/diagrams/rate-limiter-flow.svg" alt="Flujo del limitador de tasa: bucle del agente → limitador de tasa → comprobación de capacidad → reenviar al proveedor o esperar" style="max-width: 100%;" />

## Límites por nivel de OpenAI

El limitador de tasa incluye valores predeterminados integrados para los límites publicados por nivel de OpenAI:

| Nivel   | GPT-4o TPM  | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------- | ----------- | ---------- | ------- | ------ |
| Free    | 30.000      | 500        | 30.000  | 500    |
| Tier 1  | 30.000      | 500        | 30.000  | 500    |
| Tier 2  | 450.000     | 5.000      | 100.000 | 1.000  |
| Tier 3  | 800.000     | 5.000      | 100.000 | 1.000  |
| Tier 4  | 2.000.000   | 10.000     | 200.000 | 10.000 |
| Tier 5  | 30.000.000  | 10.000     | 200.000 | 10.000 |

::: warning Estos son valores predeterminados basados en los límites publicados de OpenAI. Sus límites reales dependen del nivel de su cuenta OpenAI y su historial de uso. Otros proveedores (Anthropic, Google) gestionan sus propios límites de tasa en el servidor -- el limitador es más útil para OpenAI donde la regulación del lado del cliente previene errores 429. :::

## Configuración

La limitación de tasa es automática cuando se usa el proveedor envuelto. No se necesita configuración del usuario para el comportamiento predeterminado. El limitador detecta su proveedor y aplica los límites apropiados.

Los usuarios avanzados pueden personalizar los límites vía la configuración del proveedor en `triggerfish.yaml`:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Tokens por minuto
        rpm: 5000 # Solicitudes por minuto
        window_ms: 60000 # Tamaño de ventana (predeterminado 60s)
```

::: info La limitación de tasa le protege de errores 429 y facturas inesperadas. Funciona junto con la cadena de failover -- si los límites de tasa se alcanzan y el limitador no puede esperar (timeout), el failover se activa para intentar con el siguiente proveedor. :::

## Monitorización del uso

El limitador de tasa expone una instantánea en tiempo real del uso actual:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

La barra de progreso de contexto en CLI y Tide Pool muestra el uso de contexto. El estado del límite de tasa es visible en los registros de depuración:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Cuando el limitador retrasa una llamada, registra el tiempo de espera:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Limitación de tasa de canal

Además de la limitación de tasa del proveedor LLM, Triggerfish aplica límites de tasa de mensajes por canal para prevenir la inundación de plataformas de mensajería. Cada adaptador de canal rastrea la frecuencia de mensajes salientes y retrasa envíos cuando se acercan los límites.

Esto protege contra:

- Prohibiciones de API de la plataforma por volumen excesivo de mensajes
- Spam accidental por bucles de agente descontrolados
- Tormentas de mensajes activadas por webhook

Los límites de tasa de canal se aplican de forma transparente por el enrutador de canales. Si el agente genera salida más rápido de lo que el canal permite, los mensajes se encolan y se entregan a la tasa máxima permitida.

## Relacionado

- [Proveedores LLM y failover](/es-ES/features/model-failover) -- integración de la cadena de failover con limitación de tasa
- [Configuración](/es-ES/guide/configuration) -- esquema completo de `triggerfish.yaml`
