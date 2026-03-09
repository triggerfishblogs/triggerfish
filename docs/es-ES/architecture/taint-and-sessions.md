# Sesiones y taint

Las sesiones son la unidad fundamental del estado de conversación en
Triggerfish. Cada sesión rastrea de forma independiente un **nivel de taint**: una
marca de agua de clasificación que registra la sensibilidad más alta de los datos
accedidos durante la sesión. El taint impulsa las decisiones de salida del motor
de políticas: si una sesión tiene taint `CONFIDENTIAL`, ningún dato de esa sesión
puede fluir a un canal clasificado por debajo de `CONFIDENTIAL`.

## Modelo de taint de sesión

### Cómo funciona el taint

Cuando una sesión accede a datos con un nivel de clasificación, toda la sesión
queda **contaminada** (tainted) a ese nivel. El taint sigue tres reglas:

1. **Por conversación**: cada sesión tiene su propio nivel de taint independiente
2. **Solo escalada**: el taint puede aumentar, nunca disminuir dentro de una sesión
3. **El reinicio completo lo borra todo**: el taint Y el historial de
   conversación se borran juntos

<img src="/diagrams/taint-escalation.svg" alt="Escalada de taint: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. El taint solo puede escalar, nunca disminuir." style="max-width: 100%;" />

::: warning SEGURIDAD El taint nunca se puede reducir selectivamente. No hay
mecanismo para "descontaminar" una sesión sin borrar todo el historial de
conversación. Esto previene la filtración de contexto: si la sesión recuerda
haber visto datos confidenciales, el taint debe reflejarlo. :::

### Por qué el taint no puede disminuir

Aunque los datos clasificados ya no se muestren, la ventana de contexto del LLM
aún los contiene. El modelo puede hacer referencia, resumir o repetir información
clasificada en respuestas futuras. La única forma segura de reducir el taint es
eliminar el contexto por completo, que es exactamente lo que hace un reinicio
completo.

## Tipos de sesiones

Triggerfish gestiona varios tipos de sesiones, cada uno con seguimiento de taint
independiente:

| Tipo de sesión      | Descripción                                       | Taint inicial | Persiste entre reinicios |
| ------------------- | ------------------------------------------------- | ------------- | ------------------------ |
| **Principal**       | Conversación directa principal con el propietario | `PUBLIC`      | Sí                       |
| **Canal**           | Una por canal conectado (Telegram, Slack, etc.)   | `PUBLIC`      | Sí                       |
| **Segundo plano**   | Creada para tareas autónomas (cron, webhooks)     | `PUBLIC`      | Duración de la tarea     |
| **Agente**          | Sesiones por agente para enrutamiento multiagente | `PUBLIC`      | Sí                       |
| **Grupo**           | Sesiones de chat grupal                           | `PUBLIC`      | Sí                       |

::: info Las sesiones en segundo plano siempre comienzan con taint `PUBLIC`,
independientemente del nivel de taint de la sesión padre. Esto es intencionado:
los trabajos cron y las tareas activadas por webhook no deben heredar el taint
de la sesión que las creó. :::

## Ejemplo de escalada de taint

Este es un flujo completo que muestra la escalada de taint y el bloqueo de
política resultante:

<img src="/diagrams/taint-with-blocks.svg" alt="Ejemplo de escalada de taint: la sesión comienza como PUBLIC, escala a CONFIDENTIAL tras acceder a Salesforce, luego BLOQUEA la salida al canal PUBLIC de WhatsApp" style="max-width: 100%;" />

## Mecanismo de reinicio completo

Un reinicio de sesión es la única forma de reducir el taint. Es una operación
deliberada y destructiva:

1. **Archivar registros de linaje** -- Todos los datos de linaje de la sesión se
   preservan en el almacenamiento de auditoría
2. **Borrar historial de conversación** -- Toda la ventana de contexto se borra
3. **Reiniciar taint a PUBLIC** -- La sesión comienza de nuevo
4. **Requerir confirmación del usuario** -- El hook `SESSION_RESET` requiere
   confirmación explícita antes de ejecutarse

Después de un reinicio, la sesión es indistinguible de una sesión completamente
nueva. El agente no tiene memoria de la conversación anterior. Esta es la única
forma de garantizar que los datos clasificados no puedan filtrarse a través del
contexto del LLM.

## Comunicación entre sesiones

Cuando un agente envía datos entre sesiones usando `sessions_send`, se aplican
las mismas reglas de escritura descendente:

| Taint de sesión origen | Canal de sesión destino     | Decisión |
| ---------------------- | --------------------------- | -------- |
| `PUBLIC`               | Canal `PUBLIC`              | ALLOW    |
| `CONFIDENTIAL`         | Canal `CONFIDENTIAL`        | ALLOW    |
| `CONFIDENTIAL`         | Canal `PUBLIC`              | BLOCK    |
| `RESTRICTED`           | Canal `CONFIDENTIAL`        | BLOCK    |

Herramientas de sesión disponibles para el agente:

| Herramienta        | Descripción                                  | Impacto en taint                         |
| ------------------ | -------------------------------------------- | ---------------------------------------- |
| `sessions_list`    | Listar sesiones activas con filtros          | Sin cambio de taint                      |
| `sessions_history` | Recuperar transcripción de una sesión        | Taint se hereda de la sesión referenciada |
| `sessions_send`    | Enviar mensaje a otra sesión                 | Sujeto a verificación de escritura desc.  |
| `sessions_spawn`   | Crear sesión de tarea en segundo plano       | Nueva sesión comienza con `PUBLIC`       |
| `session_status`   | Comprobar estado actual y metadatos de sesión | Sin cambio de taint                      |

## Linaje de datos

Cada elemento de datos procesado por Triggerfish lleva **metadatos de
procedencia**: un registro completo de dónde vinieron los datos, cómo se
transformaron y a dónde fueron. El linaje es la pista de auditoría que hace
verificables las decisiones de clasificación.

### Estructura de registro de linaje

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### Reglas de seguimiento de linaje

| Evento                                   | Acción de linaje                                 |
| ---------------------------------------- | ------------------------------------------------ |
| Datos leídos de integración              | Crear registro de linaje con origen              |
| Datos transformados por LLM              | Añadir transformación, vincular linajes de entrada |
| Datos agregados de múltiples fuentes     | Fusionar linaje, clasificación = `max(entradas)` |
| Datos enviados a canal                   | Registrar destino, verificar clasificación       |
| Reinicio de sesión                       | Archivar registros de linaje, borrar del contexto |

### Clasificación de agregación

Cuando se combinan datos de múltiples fuentes (p. ej., un resumen del LLM de
registros de diferentes integraciones), el resultado agregado hereda la
**clasificación máxima** de todas las entradas:

```
Entrada 1: INTERNAL    (wiki interna)
Entrada 2: CONFIDENTIAL (registro de Salesforce)
Entrada 3: PUBLIC      (API del tiempo)

Clasificación de la salida agregada: CONFIDENTIAL (máximo de las entradas)
```

::: tip Los despliegues empresariales pueden configurar reglas opcionales de
degradación para agregados estadísticos (medias, recuentos, sumas de más de 10
registros) o datos anonimizados certificados. Todas las degradaciones requieren
reglas de política explícitas, se registran con justificación completa y están
sujetas a revisión de auditoría. :::

### Capacidades de auditoría

El linaje habilita cuatro categorías de consultas de auditoría:

- **Traza hacia adelante**: "¿Qué pasó con los datos del registro X de
  Salesforce?" -- sigue los datos desde el origen hasta todos los destinos
- **Traza hacia atrás**: "¿Qué fuentes contribuyeron a esta salida?" -- rastrea
  una salida hasta todos sus registros de origen
- **Justificación de clasificación**: "¿Por qué está marcado como
  CONFIDENTIAL?" -- muestra la cadena de razones de clasificación
- **Exportación de cumplimiento**: cadena de custodia completa para revisión
  legal o regulatoria

## Persistencia del taint

El taint de sesión se persiste a través del `StorageProvider` bajo el espacio de
nombres `taint:`. Esto significa que el taint sobrevive a reinicios del daemon:
una sesión que estaba en `CONFIDENTIAL` antes de un reinicio sigue siendo
`CONFIDENTIAL` después.

Los registros de linaje se persisten bajo el espacio de nombres `lineage:` con
retención impulsada por cumplimiento (predeterminado 90 días).
