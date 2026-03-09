# Auditoría y cumplimiento

Cada decisión de política en Triggerfish se registra con contexto completo. No
hay excepciones, no hay "modo de depuración" que deshabilite el registro, y no
hay forma de que el LLM suprima registros de auditoría. Esto proporciona un
registro completo e inviolable de cada decisión de seguridad que el sistema ha
tomado.

## Qué se registra

El registro de auditoría es una **regla fija** — siempre está activo y no puede
deshabilitarse. Cada ejecución de hook de aplicación produce un registro de
auditoría que contiene:

| Campo             | Descripción                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`       | Cuándo se tomó la decisión (ISO 8601, UTC)                                                                                                                                             |
| `hook_type`       | Qué hook de aplicación se ejecutó (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`) |
| `session_id`      | La sesión en la que ocurrió la acción                                                                                                                                                  |
| `decision`        | `ALLOW`, `BLOCK` o `REDACT`                                                                                                                                                            |
| `reason`          | Explicación legible de la decisión                                                                                                                                                      |
| `input`           | Los datos o la acción que disparó el hook                                                                                                                                               |
| `rules_evaluated` | Qué reglas de políticas se verificaron para llegar a la decisión                                                                                                                        |
| `taint_before`    | Nivel de taint de sesión antes de la acción                                                                                                                                             |
| `taint_after`     | Nivel de taint de sesión después de la acción (si cambió)                                                                                                                               |
| `metadata`        | Contexto adicional específico del tipo de hook                                                                                                                                          |

## Ejemplos de registros de auditoría

### Salida permitida

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Classification check passed",
  "input": {
    "target_channel": "telegram",
    "recipient": "owner"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification"
  ],
  "taint_before": "INTERNAL",
  "taint_after": "INTERNAL"
}
```

### Write-down bloqueado

```json
{
  "timestamp": "2025-01-29T10:24:12Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Session taint (CONFIDENTIAL) exceeds effective classification (PUBLIC)",
  "input": {
    "target_channel": "whatsapp",
    "recipient": "external_user_789",
    "effective_classification": "PUBLIC"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification",
    "recipient_classification"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

### Llamada a herramienta con escalación de taint

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "POST_TOOL_RESPONSE",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Tool response classified and taint updated",
  "input": {
    "tool_name": "salesforce.query_opportunities",
    "response_classification": "CONFIDENTIAL"
  },
  "rules_evaluated": [
    "tool_response_classification",
    "taint_escalation"
  ],
  "taint_before": "PUBLIC",
  "taint_after": "CONFIDENTIAL",
  "metadata": {
    "lineage_id": "lin_789xyz",
    "records_returned": 3
  }
}
```

### Delegación de agente bloqueada

```json
{
  "timestamp": "2025-01-29T10:25:00Z",
  "hook_type": "AGENT_INVOCATION",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Agent ceiling (INTERNAL) below session taint (CONFIDENTIAL)",
  "input": {
    "caller_agent_id": "agent_abc",
    "callee_agent_id": "agent_def",
    "callee_ceiling": "INTERNAL",
    "task": "Generate public summary"
  },
  "rules_evaluated": [
    "delegation_ceiling_check",
    "delegation_allowlist",
    "delegation_depth"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

## Capacidades de rastreo de auditoría

<img src="/diagrams/audit-trace-flow.svg" alt="Flujo de rastreo de auditoría: rastreo hacia adelante, rastreo hacia atrás y justificación de clasificación alimentan la exportación de cumplimiento" style="max-width: 100%;" />

Los registros de auditoría pueden consultarse de cuatro formas, cada una sirviendo
una necesidad diferente de cumplimiento y análisis forense.

### Rastreo hacia adelante

**Pregunta:** "¿Qué pasó con los datos del registro de Salesforce `opp_00123ABC`?"

Un rastreo hacia adelante sigue un elemento de datos desde su punto de origen a
través de cada transformación, sesión y salida. Responde: ¿a dónde fueron estos
datos, quién los vio, y se enviaron fuera de la organización?

```
Origen: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> clasificación: CONFIDENTIAL
  --> sesión: sess_456

Transformaciones:
  --> Campos extraídos: name, amount, stage
  --> LLM resumió 3 registros en resumen de pipeline

Salidas:
  --> Enviado al propietario vía Telegram (PERMITIDO)
  --> Bloqueado del contacto externo de WhatsApp (BLOQUEADO)
```

### Rastreo hacia atrás

**Pregunta:** "¿Qué fuentes contribuyeron al mensaje enviado a las 10:24 UTC?"

Un rastreo hacia atrás comienza desde una salida y recorre hacia atrás la cadena
de linaje para identificar cada fuente de datos que influyó en la salida. Esto es
esencial para entender si se incluyeron datos clasificados en una respuesta.

```
Salida: Mensaje enviado a Telegram a las 10:24:00Z
  --> sesión: sess_456
  --> fuentes de linaje:
      --> lin_789xyz: Oportunidad de Salesforce (CONFIDENTIAL)
      --> lin_790xyz: Oportunidad de Salesforce (CONFIDENTIAL)
      --> lin_791xyz: Oportunidad de Salesforce (CONFIDENTIAL)
      --> lin_792xyz: API del clima (PUBLIC)
```

### Justificación de clasificación

**Pregunta:** "¿Por qué estos datos están marcados como CONFIDENTIAL?"

La justificación de clasificación rastrea hasta la regla o política que asignó
el nivel de clasificación:

```
Datos: Resumen de pipeline (lin_789xyz)
Clasificación: CONFIDENTIAL
Razón: source_system_default
  --> Clasificación predeterminada de la integración de Salesforce: CONFIDENTIAL
  --> Configurado por: admin_001 el 2025-01-10T08:00:00Z
  --> Regla de política: "Todos los datos de Salesforce se clasifican como CONFIDENTIAL"
```

### Exportación de cumplimiento

Para revisión legal, regulatoria o interna, Triggerfish puede exportar la cadena
completa de custodia para cualquier elemento de datos o rango de tiempo:

```
Solicitud de exportación:
  --> Rango de tiempo: 2025-01-29T00:00:00Z a 2025-01-29T23:59:59Z
  --> Alcance: Todas las sesiones del user_456
  --> Formato: JSON

La exportación incluye:
  --> Todos los registros de auditoría en el rango de tiempo
  --> Todos los registros de linaje referenciados por los registros de auditoría
  --> Todas las transiciones de estado de sesión
  --> Todas las decisiones de política (ALLOW, BLOCK, REDACT)
  --> Todos los cambios de taint
  --> Todos los registros de cadenas de delegación
```

::: tip Las exportaciones de cumplimiento son archivos JSON estructurados que
pueden ser ingeridos por sistemas SIEM, paneles de cumplimiento o herramientas de
revisión legal. El formato de exportación es estable y versionado. :::

## Linaje de datos

El registro de auditoría trabaja en conjunto con el sistema de linaje de datos de
Triggerfish. Cada elemento de datos procesado por Triggerfish lleva metadatos de
procedencia:

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

Los registros de linaje se crean en `POST_TOOL_RESPONSE` (cuando los datos
ingresan al sistema) y se actualizan a medida que los datos se transforman. Los
datos agregados heredan `max(clasificaciones de entrada)` — si alguna entrada es
CONFIDENTIAL, la salida es al menos CONFIDENTIAL.

| Evento                                         | Acción de linaje                                   |
| ---------------------------------------------- | -------------------------------------------------- |
| Datos leídos desde una integración             | Crear registro de linaje con origen                |
| Datos transformados por el LLM                 | Agregar transformación, vincular linajes de entrada |
| Datos agregados de múltiples fuentes           | Fusionar linaje, clasificación = max(entradas)     |
| Datos enviados a un canal                      | Registrar destino, verificar clasificación         |
| Reinicio de sesión                             | Archivar registros de linaje, limpiar del contexto |

## Almacenamiento y retención

Los registros de auditoría se persisten a través de la abstracción
`StorageProvider` bajo el espacio de nombres `audit:`. Los registros de linaje se
almacenan bajo el espacio de nombres `lineage:`.

| Tipo de dato        | Espacio de nombres | Retención predeterminada      |
| ------------------- | ------------------ | ----------------------------- |
| Registros de auditoría | `audit:`        | 1 año                         |
| Registros de linaje  | `lineage:`        | 90 días                       |
| Estado de sesión     | `sessions:`       | 30 días                       |
| Historial de taint   | `taint:`          | Coincide con retención de sesión |

::: warning SEGURIDAD Los períodos de retención son configurables, pero los
registros de auditoría tienen como predeterminado 1 año para soportar requisitos
de cumplimiento (SOC 2, GDPR, HIPAA). Reducir el período de retención por debajo
del requisito regulatorio de su organización es responsabilidad del
administrador. :::

### Backends de almacenamiento

| Nivel             | Backend     | Detalles                                                                                                                                                              |
| ----------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personal**      | SQLite      | Base de datos en modo WAL en `~/.triggerfish/data/triggerfish.db`. Los registros de auditoría se almacenan como JSON estructurado en la misma base de datos que el resto del estado de Triggerfish. |
| **Empresarial**   | Conectable  | Los backends empresariales (Postgres, S3, etc.) pueden usarse vía la interfaz `StorageProvider`. Esto permite la integración con infraestructura existente de agregación de registros. |

## Inmutabilidad e integridad

Los registros de auditoría son de solo adición. Una vez escritos, no pueden ser
modificados ni eliminados por ningún componente del sistema — incluyendo el LLM,
el agente o los plugins. La eliminación ocurre solo por expiración de la política
de retención.

Cada registro de auditoría incluye un hash de contenido que puede usarse para
verificar la integridad. Si los registros se exportan para revisión de
cumplimiento, los hashes pueden validarse contra los registros almacenados para
detectar manipulación.

## Funciones de cumplimiento empresarial

Los despliegues empresariales pueden extender el registro de auditoría con:

| Función                       | Descripción                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Retención legal**           | Suspender la eliminación basada en retención para usuarios, sesiones o rangos de tiempo especificados     |
| **Integración con SIEM**      | Transmitir eventos de auditoría a Splunk, Datadog u otros sistemas SIEM en tiempo real                   |
| **Paneles de cumplimiento**   | Vista visual de decisiones de políticas, acciones bloqueadas y patrones de taint                          |
| **Exportaciones programadas** | Exportaciones periódicas automáticas para revisión regulatoria                                           |
| **Reglas de alertas**         | Activar notificaciones cuando ocurran patrones de auditoría específicos (p. ej., write-downs bloqueados repetidos) |

## Páginas relacionadas

- [Diseño con seguridad primero](/es-419/security/) — descripción general de la arquitectura de seguridad
- [Regla de no write-down](/es-419/security/no-write-down) — la regla de flujo de clasificación cuya
  aplicación se registra
- [Identidad y autenticación](/es-419/security/identity) — cómo se registran las decisiones de identidad
- [Delegación de agentes](/es-419/security/agent-delegation) — cómo las cadenas de delegación aparecen en
  los registros de auditoría
- [Gestión de secretos](/es-419/security/secrets) — cómo se registra el acceso a credenciales
