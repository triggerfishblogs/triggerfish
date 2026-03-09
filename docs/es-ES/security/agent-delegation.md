# Delegación de agentes

A medida que los agentes de IA interactúan cada vez más entre sí -- un agente llamando a otro para completar subtareas -- surge una nueva clase de riesgos de seguridad. Una cadena de agentes podría usarse para lavar datos a través de un agente con menos restricciones, eludiendo los controles de clasificación. Triggerfish previene esto con identidad criptográfica de agentes, techos de clasificación y herencia obligatoria de taint.

## Certificados de agentes

Cada agente en Triggerfish tiene un certificado que define su identidad, capacidades y permisos de delegación. Este certificado está firmado por el propietario del agente y no puede ser modificado por el propio agente ni por otros agentes.

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

Campos clave del certificado:

| Campo                  | Propósito                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | El **techo de clasificación** -- el nivel de taint más alto al que este agente puede operar. Un agente con techo INTERNAL no puede ser invocado por una sesión con taint CONFIDENTIAL. |
| `can_invoke_agents`    | Si este agente tiene permiso para llamar a otros agentes.                                                                                                                              |
| `can_be_invoked_by`    | Lista explícita de agentes que pueden invocar a este.                                                                                                                                  |
| `max_delegation_depth` | Profundidad máxima de la cadena de invocación de agentes. Previene la recursión ilimitada.                                                                                             |
| `signature`            | Firma Ed25519 del propietario. Previene la manipulación del certificado.                                                                                                               |

## Flujo de invocación

Cuando un agente llama a otro, la capa de políticas verifica la delegación antes de que el agente invocado se ejecute. La verificación es determinista y se ejecuta en código -- el agente que llama no puede influir en la decisión.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Secuencia de delegación de agentes: el Agente A invoca al Agente B, la capa de políticas verifica taint vs techo y bloquea cuando el taint excede el techo" style="max-width: 100%;" />

En este ejemplo, el Agente A tiene un taint de sesión de CONFIDENTIAL (accedió a datos de Salesforce anteriormente). El Agente B tiene un techo de clasificación de INTERNAL. Como CONFIDENTIAL es superior a INTERNAL, la invocación se bloquea. Los datos contaminados del Agente A no pueden fluir a un agente con un techo de clasificación inferior.

::: warning SEGURIDAD La capa de políticas verifica el **taint de sesión actual** del invocador, no su techo. Aunque el Agente A tenga un techo CONFIDENTIAL, lo que importa es el nivel de taint real de la sesión en el momento de la invocación. Si el Agente A no ha accedido a ningún dato clasificado (taint es PUBLIC), puede invocar al Agente B (techo INTERNAL) sin problema. :::

## Seguimiento de cadenas de delegación

Cuando los agentes invocan a otros agentes, la cadena completa se registra con marcas temporales y niveles de taint en cada paso:

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Sales Assistant",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Summarize Q4 pipeline"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Data Analyst",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Calculate win rates"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

Esta cadena se registra en el registro de auditoría y puede consultarse para análisis de cumplimiento y forense. Puede rastrear exactamente qué agentes participaron, cuáles eran sus niveles de taint y qué tareas realizaron.

## Invariantes de seguridad

Cuatro invariantes gobiernan la delegación de agentes. Todas se aplican mediante código en la capa de políticas y no pueden ser anuladas por ningún agente de la cadena.

| Invariante                             | Aplicación                                                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **El taint solo aumenta**              | Cada invocado hereda `max(taint propio, taint del invocador)`. Un invocado nunca puede tener un taint inferior al de su invocador.        |
| **Se respeta el techo**                | Un agente no puede ser invocado si el taint del invocador excede el techo `max_classification` del invocado.                              |
| **Se aplican límites de profundidad**  | La cadena termina en `max_delegation_depth`. Si el límite es 3, una invocación de cuarto nivel se bloquea.                                |
| **Se bloquea la invocación circular**  | Un agente no puede aparecer dos veces en la misma cadena. Si el Agente A llama al Agente B que intenta llamar al Agente A, se bloquea.   |

### Herencia de taint en detalle

Cuando el Agente A (taint: CONFIDENTIAL) invoca exitosamente al Agente B (techo: CONFIDENTIAL), el Agente B comienza con un taint de CONFIDENTIAL -- heredado del Agente A. Si el Agente B luego accede a datos RESTRICTED, su taint escala a RESTRICTED. Este taint elevado se lleva de vuelta al Agente A cuando la invocación se completa.

<img src="/diagrams/taint-inheritance.svg" alt="Herencia de taint: el Agente A (INTERNAL) invoca al Agente B, B hereda el taint, accede a Salesforce (CONFIDENTIAL), devuelve el taint elevado a A" style="max-width: 100%;" />

El taint fluye en ambas direcciones -- del invocador al invocado en el momento de la invocación, y del invocado de vuelta al invocador al completarse. Solo puede escalar.

## Prevención del lavado de datos

Un vector de ataque clave en sistemas multiagente es el **lavado de datos** -- usar una cadena de agentes para mover datos clasificados a un destino de clasificación inferior enrutándolos a través de agentes intermedios.

### El ataque

```
Objetivo del atacante: Exfiltrar datos CONFIDENTIAL a través de un canal PUBLIC

Flujo intentado:
1. El Agente A accede a Salesforce (taint --> CONFIDENTIAL)
2. El Agente A invoca al Agente B (que tiene un canal PUBLIC)
3. El Agente B envía datos al canal PUBLIC
```

### Por qué falla

Triggerfish bloquea este ataque en múltiples puntos:

**Punto de bloqueo 1: Verificación de invocación.** Si el Agente B tiene un techo por debajo de CONFIDENTIAL, la invocación se bloquea directamente. El taint del Agente A (CONFIDENTIAL) excede el techo del Agente B.

**Punto de bloqueo 2: Herencia de taint.** Incluso si el Agente B tiene un techo CONFIDENTIAL y la invocación tiene éxito, el Agente B hereda el taint CONFIDENTIAL del Agente A. Cuando el Agente B intenta enviar al canal PUBLIC, el hook `PRE_OUTPUT` bloquea la escritura descendente.

**Punto de bloqueo 3: Sin reinicio de taint en delegación.** Los agentes en una cadena de delegación no pueden reiniciar su taint. El reinicio de taint solo está disponible para el usuario final, y borra todo el historial de conversación. No existe mecanismo para que un agente "lave" su nivel de taint durante una cadena.

::: danger Los datos no pueden escapar de su clasificación a través de la delegación de agentes. La combinación de verificaciones de techo, herencia obligatoria de taint y ausencia de reinicio de taint en cadenas hace imposible el lavado de datos a través de cadenas de agentes dentro del modelo de seguridad de Triggerfish. :::

## Escenarios de ejemplo

### Escenario 1: Delegación exitosa

```
Agente A (techo: CONFIDENTIAL, taint actual: INTERNAL)
  llama al Agente B (techo: CONFIDENTIAL)

Verificación de políticas:
  - ¿A puede invocar a B? SÍ (B está en la lista de delegación de A)
  - ¿Taint de A (INTERNAL) <= techo de B (CONFIDENTIAL)? SÍ
  - ¿Límite de profundidad OK? SÍ (profundidad 1 de máx. 3)
  - ¿Circular? NO

Resultado: PERMITIDO
El Agente B comienza con taint: INTERNAL (heredado de A)
```

### Escenario 2: Bloqueado por techo

```
Agente A (techo: RESTRICTED, taint actual: CONFIDENTIAL)
  llama al Agente B (techo: INTERNAL)

Verificación de políticas:
  - ¿Taint de A (CONFIDENTIAL) <= techo de B (INTERNAL)? NO

Resultado: BLOQUEADO
Razón: Techo del Agente B (INTERNAL) por debajo del taint de sesión (CONFIDENTIAL)
```

### Escenario 3: Bloqueado por límite de profundidad

```
Agente A llama al Agente B (profundidad 1)
  Agente B llama al Agente C (profundidad 2)
    Agente C llama al Agente D (profundidad 3)
      Agente D llama al Agente E (profundidad 4)

Verificación de políticas para el Agente E:
  - Profundidad 4 > max_delegation_depth (3)

Resultado: BLOQUEADO
Razón: Profundidad máxima de delegación excedida
```

### Escenario 4: Bloqueado por referencia circular

```
Agente A llama al Agente B (profundidad 1)
  Agente B llama al Agente C (profundidad 2)
    Agente C llama al Agente A (profundidad 3)

Verificación de políticas para la segunda invocación del Agente A:
  - El Agente A ya aparece en la cadena

Resultado: BLOQUEADO
Razón: Invocación circular de agente detectada
```

## Páginas relacionadas

- [Diseño con seguridad como prioridad](./) -- visión general de la arquitectura de seguridad
- [Regla de escritura descendente](./no-write-down) -- la regla de flujo de clasificación que la delegación aplica
- [Identidad y autenticación](./identity) -- cómo se establece la identidad de usuarios y canales
- [Auditoría y cumplimiento](./audit-logging) -- cómo se registran las cadenas de delegación en el registro de auditoría
