# La regla de no write-down

La regla de no write-down es la base del modelo de protección de datos de
Triggerfish. Es una regla fija, no configurable, que se aplica a cada sesión,
cada canal y cada agente — sin excepciones y sin anulación por parte del LLM.

**La regla:** Los datos solo pueden fluir a canales y destinatarios con un nivel
de clasificación **igual o superior**.

Esta única regla previene toda una clase de escenarios de filtración de datos,
desde la compartición accidental hasta ataques sofisticados de prompt injection
diseñados para exfiltrar información sensible.

## Cómo fluyen las clasificaciones

Triggerfish usa cuatro niveles de clasificación (de mayor a menor):

<img src="/diagrams/write-down-rules.svg" alt="Reglas de write-down: los datos solo fluyen a niveles de clasificación iguales o superiores" style="max-width: 100%;" />

Los datos clasificados a un nivel dado pueden fluir a ese nivel o a cualquier
nivel por encima. Nunca pueden fluir hacia abajo. Esta es la regla de no
write-down.

::: danger La regla de no write-down es **fija y no configurable**. No puede
ser relajada por administradores, anulada por reglas de políticas ni eludida por
el LLM. Es la base arquitectónica sobre la que se apoyan todos los demás
controles de seguridad. :::

## Clasificación efectiva

Cuando los datos están a punto de salir del sistema, Triggerfish calcula la
**clasificación efectiva** del destino:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

Tanto el canal como el destinatario deben estar al nivel de clasificación de los
datos o por encima. Si cualquiera de los dos está por debajo, la salida se
bloquea.

| Canal                | Destinatario                 | Clasificación efectiva |
| -------------------- | ---------------------------- | ---------------------- |
| INTERNAL (Slack)     | INTERNAL (compañero)         | INTERNAL               |
| INTERNAL (Slack)     | EXTERNAL (proveedor)         | PUBLIC                 |
| CONFIDENTIAL (Slack) | INTERNAL (compañero)         | INTERNAL               |
| CONFIDENTIAL (Email) | EXTERNAL (contacto personal) | PUBLIC                 |

::: info Un canal CONFIDENTIAL con un destinatario EXTERNAL tiene una
clasificación efectiva de PUBLIC. Si la sesión ha accedido a datos por encima de
PUBLIC, la salida se bloquea. :::

## Ejemplo del mundo real

Este es un escenario concreto que muestra la regla de no write-down en acción.

```
Usuario: "Revisa mi pipeline de Salesforce"

Agente: [accede a Salesforce vía token delegado del usuario]
       [los datos de Salesforce se clasifican como CONFIDENTIAL]
       [el taint de sesión escala a CONFIDENTIAL]

       "Tienes 3 oportunidades cerrando esta semana por un total de $2.1M..."

Usuario: "Envía un mensaje a mi esposa diciendo que llegaré tarde"

Capa de políticas: BLOQUEADO
  - Taint de sesión: CONFIDENTIAL
  - Destinatario (esposa): EXTERNAL
  - Clasificación efectiva: PUBLIC
  - CONFIDENTIAL > PUBLIC --> violación de write-down

Agente: "No puedo enviar a contactos externos en esta sesión
        porque accedimos a datos confidenciales.

        -> Reiniciar sesión y enviar mensaje
        -> Cancelar"
```

El usuario accedió a datos de Salesforce (clasificados como CONFIDENTIAL), lo
que contaminó toda la sesión. Cuando luego intentó enviar un mensaje a un
contacto externo (clasificación efectiva PUBLIC), la capa de políticas bloqueó la
salida porque los datos CONFIDENTIAL no pueden fluir a un destino PUBLIC.

::: tip El mensaje del agente a la esposa ("llegaré tarde") no contiene datos de
Salesforce por sí mismo. Pero la sesión ha sido contaminada por el acceso previo
a Salesforce, y todo el contexto de la sesión — incluyendo lo que el LLM pueda
haber retenido de la respuesta de Salesforce — podría influir en la salida. La
regla de no write-down previene toda esta clase de filtración de contexto. :::

## Lo que el usuario ve

Cuando la regla de no write-down bloquea una acción, el usuario recibe un
mensaje claro y accionable. Triggerfish ofrece dos modos de respuesta:

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
  - Pedir a su administrador que reclasifique el canal de WhatsApp
  - Más información: https://trigger.fish/security/no-write-down
```

En ambos casos, el usuario recibe opciones claras. Nunca se queda confundido
sobre qué pasó ni qué puede hacer al respecto.

## Reinicio de sesión

Cuando un usuario elige "Reiniciar sesión y enviar mensaje", Triggerfish
realiza un **reinicio completo**:

1. El taint de sesión se restablece a PUBLIC
2. Se limpia todo el historial de conversación (previniendo filtración de contexto)
3. La acción solicitada se re-evalúa contra la sesión limpia
4. Si la acción ahora es permitida (datos PUBLIC a un canal PUBLIC), procede

::: warning SEGURIDAD El reinicio de sesión limpia tanto el taint **como** el
historial de conversación. Esto no es opcional. Si solo se limpiara la etiqueta
de taint mientras el contexto de la conversación permaneciera, el LLM podría
seguir referenciando información clasificada de mensajes anteriores, anulando el
propósito del reinicio. :::

## Cómo funciona la aplicación

La regla de no write-down se aplica en el hook `PRE_OUTPUT` — el último punto de
aplicación antes de que cualquier dato salga del sistema. El hook se ejecuta
como código síncrono y determinístico:

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

- **Determinístico** — las mismas entradas siempre producen la misma decisión
- **Síncrono** — el hook se completa antes de que se envíe cualquier salida
- **Infalsificable** — el LLM no puede influir en la decisión del hook
- **Registrado** — cada ejecución se registra con contexto completo

## Taint de sesión y escalación

El taint de sesión rastrea el nivel de clasificación más alto de los datos
accedidos durante una sesión. Sigue dos reglas estrictas:

1. **Solo escalación** — el taint puede aumentar, nunca disminuir dentro de una sesión
2. **Automático** — el taint se actualiza por el hook `POST_TOOL_RESPONSE` cada
   vez que datos ingresan a la sesión

| Acción                                        | Taint antes   | Taint después                  |
| --------------------------------------------- | ------------- | ------------------------------ |
| Acceder a API del clima (PUBLIC)              | PUBLIC        | PUBLIC                         |
| Acceder a wiki interna (INTERNAL)             | PUBLIC        | INTERNAL                       |
| Acceder a Salesforce (CONFIDENTIAL)           | INTERNAL      | CONFIDENTIAL                   |
| Acceder a API del clima otra vez (PUBLIC)     | CONFIDENTIAL  | CONFIDENTIAL (sin cambio)      |

Una vez que una sesión alcanza CONFIDENTIAL, permanece CONFIDENTIAL hasta que el
usuario reinicie explícitamente. No hay degradación automática, ni timeout, ni
forma para que el LLM reduzca el taint.

## Por qué esta regla es fija

La regla de no write-down no es configurable porque hacerla configurable
debilitaría todo el modelo de seguridad. Si un administrador pudiera crear una
excepción — "permitir que datos CONFIDENTIAL fluyan a canales PUBLIC para esta
integración" — esa excepción se convierte en una superficie de ataque.

Cada otro control de seguridad en Triggerfish se basa en la suposición de que la
regla de no write-down es absoluta. El taint de sesión, el linaje de datos, los
topes de delegación de agentes y el registro de auditoría dependen de ella.
Hacerla configurable requeriría repensar toda la arquitectura.

::: info Los administradores **sí pueden** configurar los niveles de
clasificación asignados a canales, destinatarios e integraciones. Esta es la
forma correcta de ajustar el flujo de datos: si un canal debe recibir datos de
mayor clasificación, clasifique el canal a un nivel superior. La regla en sí
permanece fija; las entradas a la regla son configurables. :::

## Páginas relacionadas

- [Diseño con seguridad primero](/pt-BR/security/) — descripción general de la arquitectura de seguridad
- [Identidad y autenticación](/pt-BR/security/identity) — cómo se establece la identidad de canal
- [Auditoría y cumplimiento](/pt-BR/security/audit-logging) — cómo se registran las acciones bloqueadas
- [Arquitectura: Taint y sesiones](/pt-BR/architecture/taint-and-sessions) — mecánica detallada del
  taint de sesión
