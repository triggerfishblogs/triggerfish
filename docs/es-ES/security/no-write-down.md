# La regla de escritura descendente

La regla de escritura descendente es la base del modelo de protección de datos de Triggerfish. Es una regla fija, no configurable, que se aplica a cada sesión, cada canal y cada agente -- sin excepciones y sin anulación por parte del LLM.

**La regla:** Los datos solo pueden fluir a canales y destinatarios con un nivel de clasificación **igual o superior**.

Esta única regla previene toda una clase de escenarios de fuga de datos, desde el compartir accidental hasta ataques sofisticados de inyección de prompts diseñados para exfiltrar información sensible.

## Cómo fluye la clasificación

Triggerfish utiliza cuatro niveles de clasificación (de mayor a menor):

<img src="/diagrams/write-down-rules.svg" alt="Reglas de escritura descendente: los datos solo fluyen a niveles de clasificación iguales o superiores" style="max-width: 100%;" />

Los datos clasificados a un nivel determinado pueden fluir a ese nivel o a cualquier nivel superior. Nunca pueden fluir hacia abajo. Esta es la regla de escritura descendente.

::: danger La regla de escritura descendente es **fija y no configurable**. No puede ser relajada por administradores, anulada por reglas de política, ni eludida por el LLM. Es la base arquitectónica sobre la que se apoyan todos los demás controles de seguridad. :::

## Clasificación efectiva

Cuando los datos están a punto de salir del sistema, Triggerfish calcula la **clasificación efectiva** del destino:

```
CLASIFICACIÓN_EFECTIVA = min(clasificación_del_canal, clasificación_del_destinatario)
```

Tanto el canal como el destinatario deben estar al nivel de clasificación de los datos o por encima. Si alguno de los dos está por debajo, la salida se bloquea.

| Canal                  | Destinatario                       | Clasificación efectiva |
| ---------------------- | ---------------------------------- | ---------------------- |
| INTERNAL (Slack)       | INTERNAL (compañero de trabajo)    | INTERNAL               |
| INTERNAL (Slack)       | EXTERNAL (proveedor)               | PUBLIC                 |
| CONFIDENTIAL (Slack)   | INTERNAL (compañero de trabajo)    | INTERNAL               |
| CONFIDENTIAL (Email)   | EXTERNAL (contacto personal)       | PUBLIC                 |

::: info Un canal CONFIDENTIAL con un destinatario EXTERNAL tiene una clasificación efectiva de PUBLIC. Si la sesión ha accedido a cualquier dato por encima de PUBLIC, la salida se bloquea. :::

## Ejemplo real

A continuación se muestra un escenario concreto que ilustra la regla de escritura descendente en acción.

```
Usuario: "Comprueba mi pipeline de Salesforce"

Agente: [accede a Salesforce vía token delegado del usuario]
       [datos de Salesforce clasificados como CONFIDENTIAL]
       [el taint de sesión escala a CONFIDENTIAL]

       "Tiene 3 acuerdos cerrándose esta semana por un total de 2,1 M$..."

Usuario: "Envía un mensaje a mi esposa diciéndole que llegaré tarde esta noche"

Capa de políticas: BLOQUEADO
  - Taint de sesión: CONFIDENTIAL
  - Destinataria (esposa): EXTERNAL
  - Clasificación efectiva: PUBLIC
  - CONFIDENTIAL > PUBLIC --> violación de escritura descendente

Agente: "No puedo enviar a contactos externos en esta sesión
        porque hemos accedido a datos confidenciales.

        -> Reiniciar sesión y enviar mensaje
        -> Cancelar"
```

El usuario accedió a datos de Salesforce (clasificados como CONFIDENTIAL), lo que contaminó toda la sesión. Cuando luego intentó enviar un mensaje a un contacto externo (clasificación efectiva PUBLIC), la capa de políticas bloqueó la salida porque los datos CONFIDENTIAL no pueden fluir a un destino PUBLIC.

::: tip El mensaje del agente a la esposa ("Llegaré tarde esta noche") no contiene en sí mismo datos de Salesforce. Pero la sesión ha sido contaminada por el acceso anterior a Salesforce, y todo el contexto de la sesión -- incluyendo cualquier cosa que el LLM pueda haber retenido de la respuesta de Salesforce -- podría influir en la salida. La regla de escritura descendente previene toda esta clase de fuga de contexto. :::

## Lo que ve el usuario

Cuando la regla de escritura descendente bloquea una acción, el usuario recibe un mensaje claro y accionable. Triggerfish ofrece dos modos de respuesta:

**Predeterminado (específico):**

```
No puedo enviar datos confidenciales a un canal público.

-> Reiniciar sesión y enviar mensaje
-> Cancelar
```

**Educativo (opcional vía configuración):**

```
No puedo enviar datos confidenciales a un canal público.

Por qué: Esta sesión accedió a Salesforce (CONFIDENTIAL).
WhatsApp personal está clasificado como PUBLIC.
Los datos solo pueden fluir a clasificación igual o superior.

Opciones:
  - Reiniciar sesión y enviar mensaje
  - Pida a su administrador que reclasifique el canal de WhatsApp
  - Más información: https://trigger.fish/security/no-write-down
```

En ambos casos, el usuario recibe opciones claras. Nunca se queda confundido sobre lo que ocurrió o lo que puede hacer al respecto.

## Reinicio de sesión

Cuando un usuario elige "Reiniciar sesión y enviar mensaje", Triggerfish realiza un **reinicio completo**:

1. El taint de sesión se limpia de vuelta a PUBLIC
2. Todo el historial de conversación se borra (previniendo la fuga de contexto)
3. La acción solicitada se reevalúa contra la sesión limpia
4. Si la acción ahora está permitida (datos PUBLIC a un canal PUBLIC), procede

::: warning SEGURIDAD El reinicio de sesión limpia tanto el taint **como** el historial de conversación. Esto no es opcional. Si solo se limpiase la etiqueta de taint mientras el contexto de conversación permaneciera, el LLM podría seguir referenciando información clasificada de mensajes anteriores, anulando el propósito del reinicio. :::

## Cómo funciona la aplicación

La regla de escritura descendente se aplica en el hook `PRE_OUTPUT` -- el último punto de aplicación antes de que cualquier dato salga del sistema. El hook se ejecuta como código síncrono y determinista:

```typescript
// Lógica de aplicación simplificada
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Session taint (${sessionTaint}) exceeds effective ` +
        `classification (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Classification check passed" };
}
```

Este código es:

- **Determinista** -- las mismas entradas siempre producen la misma decisión
- **Síncrono** -- el hook se completa antes de que se envíe cualquier salida
- **Infalsificable** -- el LLM no puede influir en la decisión del hook
- **Registrado** -- cada ejecución se registra con contexto completo

## Taint de sesión y escalada

El taint de sesión rastrea el nivel de clasificación más alto de los datos accedidos durante una sesión. Sigue dos reglas estrictas:

1. **Solo escalada** -- el taint puede aumentar, nunca disminuir dentro de una sesión
2. **Automático** -- el taint se actualiza por el hook `POST_TOOL_RESPONSE` cada vez que datos entran en la sesión

| Acción                                     | Taint antes     | Taint después                   |
| ------------------------------------------ | --------------- | ------------------------------- |
| Acceder a API del tiempo (PUBLIC)          | PUBLIC          | PUBLIC                          |
| Acceder a wiki interna (INTERNAL)          | PUBLIC          | INTERNAL                        |
| Acceder a Salesforce (CONFIDENTIAL)        | INTERNAL        | CONFIDENTIAL                    |
| Acceder a API del tiempo de nuevo (PUBLIC) | CONFIDENTIAL    | CONFIDENTIAL (sin cambios)      |

Una vez que una sesión alcanza CONFIDENTIAL, permanece en CONFIDENTIAL hasta que el usuario reinicie explícitamente. No hay degradación automática, no hay timeout, y no hay forma de que el LLM baje el taint.

## Por qué esta regla es fija

La regla de escritura descendente no es configurable porque hacerla configurable socavaría todo el modelo de seguridad. Si un administrador pudiera crear una excepción -- "permitir que los datos CONFIDENTIAL fluyan a canales PUBLIC para esta integración" -- esa excepción se convertiría en una superficie de ataque.

Todos los demás controles de seguridad en Triggerfish se basan en la suposición de que la regla de escritura descendente es absoluta. El taint de sesión, el linaje de datos, los techos de delegación de agentes y el registro de auditoría dependen de ella. Hacerla configurable requeriría repensar toda la arquitectura.

::: info Los administradores **pueden** configurar los niveles de clasificación asignados a canales, destinatarios e integraciones. Esta es la forma correcta de ajustar el flujo de datos: si un canal debe recibir datos de mayor clasificación, clasifique el canal a un nivel superior. La regla en sí permanece fija; las entradas de la regla son configurables. :::

## Páginas relacionadas

- [Diseño con seguridad como prioridad](./) -- visión general de la arquitectura de seguridad
- [Identidad y autenticación](./identity) -- cómo se establece la identidad del canal
- [Auditoría y cumplimiento](./audit-logging) -- cómo se registran las acciones bloqueadas
- [Arquitectura: Taint y sesiones](/es-ES/architecture/taint-and-sessions) -- mecánica detallada del taint de sesión
