# Cron y Triggers

Los agentes de Triggerfish no se limitan a preguntas y respuestas reactivas. El
sistema de cron y triggers permite comportamiento proactivo: tareas programadas,
verificaciones periodicas, briefings matutinos, monitoreo en segundo plano y
flujos de trabajo autonomos de multiples pasos.

## Cron Jobs

Los cron jobs son tareas programadas con instrucciones fijas, un canal de
entrega y un techo de clasificacion. Usan sintaxis estandar de expresiones cron.

### Configuracion

Defina cron jobs en `triggerfish.yaml` o permita que el agente los administre en
tiempo de ejecucion a traves de la herramienta cron:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 AM diariamente
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # Donde entregar
        classification: INTERNAL # Taint maximo para este job

      - id: pipeline-check
        schedule: "0 */4 * * *" # Cada 4 horas
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### Como Funciona

1. El **CronManager** analiza expresiones cron estandar y mantiene un registro
   persistente de jobs que sobrevive reinicios.
2. Cuando un job se ejecuta, el **OrchestratorFactory** crea un orquestador y
   sesion aislados especificamente para esa ejecucion.
3. El job se ejecuta en un **workspace de sesion en segundo plano** con su
   propio seguimiento de taint.
4. La salida se entrega al canal configurado, sujeta a las reglas de
   clasificacion de ese canal.
5. El historial de ejecucion se registra para auditoria.

### Cron Administrado por el Agente

El agente puede crear y administrar sus propios cron jobs a traves de la
herramienta `cron`:

| Accion         | Descripcion             | Seguridad                                       |
| -------------- | ----------------------- | ----------------------------------------------- |
| `cron.list`    | Listar todos los jobs programados | Solo propietario                      |
| `cron.create`  | Programar un nuevo job  | Solo propietario, techo de clasificacion forzado |
| `cron.delete`  | Eliminar un job programado | Solo propietario                              |
| `cron.history` | Ver ejecuciones pasadas | Registro de auditoria preservado                |

::: warning La creacion de cron jobs requiere autenticacion de propietario. El
agente no puede programar jobs en nombre de usuarios externos ni exceder el
techo de clasificacion configurado. :::

### Gestion de Cron por CLI

Los cron jobs tambien pueden administrarse directamente desde la linea de
comandos:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

El flag `--classification` establece el techo de clasificacion para el job. Los
niveles validos son `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` y `RESTRICTED`. Si se
omite, el valor predeterminado es `INTERNAL`.

## Sistema de Triggers

Los triggers son ciclos periodicos de "verificacion" donde el agente se
despierta para evaluar si se necesita alguna accion proactiva. A diferencia de
los cron jobs con tareas fijas, los triggers dan al agente discrecion para
decidir que necesita atencion.

### TRIGGER.md

`TRIGGER.md` define que debe verificar el agente durante cada despertar. Se
encuentra en `~/.triggerfish/config/TRIGGER.md` y es un archivo markdown de
formato libre donde se especifican prioridades de monitoreo, reglas de
escalamiento y comportamientos proactivos.

Si `TRIGGER.md` esta ausente, el agente usa su conocimiento general para decidir
que necesita atencion.

**Ejemplo de TRIGGER.md:**

```markdown
# TRIGGER.md -- Que verificar en cada despertar

## Verificaciones Prioritarias

- Mensajes no leidos en todos los canales con mas de 1 hora de antiguedad
- Conflictos de calendario en las proximas 24 horas
- Tareas atrasadas en Linear o Jira

## Monitoreo

- GitHub: PRs esperando mi revision
- Email: cualquier cosa de contactos VIP (marcar para notificacion inmediata)
- Slack: menciones en el canal #incidents

## Proactivo

- Si es de manana (7-9am), preparar briefing diario
- Si es viernes por la tarde, redactar resumen semanal
```

### Configuracion de Triggers

La temporizacion y restricciones de triggers se configuran en
`triggerfish.yaml`:

```yaml
scheduler:
  trigger:
    enabled: true # Establecer en false para deshabilitar triggers (predeterminado: true)
    interval_minutes: 30 # Verificar cada 30 minutos (predeterminado: 30)
    # Establecer en 0 para deshabilitar triggers sin eliminar la configuracion
    classification_ceiling: CONFIDENTIAL # Techo maximo de taint (predeterminado: CONFIDENTIAL)
    quiet_hours:
      start: 22 # No despertar entre las 10 PM ...
      end: 7 # ... y las 7 AM
```

| Configuracion                           | Descripcion                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Si los despertares periodicos de triggers estan activos. Establecer en `false` para deshabilitar.                                                        |
| `interval_minutes`                      | Cada cuantos minutos el agente se despierta para verificar triggers. Predeterminado: `30`. Establecer en `0` para deshabilitar triggers sin eliminar el bloque de configuracion. |
| `classification_ceiling`                | Nivel maximo de clasificacion que la sesion de trigger puede alcanzar. Predeterminado: `CONFIDENTIAL`.                                                   |
| `quiet_hours.start` / `quiet_hours.end` | Rango de horas (formato 24h) durante el cual los triggers se suprimen.                                                                                   |

::: tip Para deshabilitar triggers temporalmente, establezca
`interval_minutes: 0`. Esto es equivalente a `enabled: false` y le permite
mantener sus otras configuraciones de trigger para poder reactivarlos facilmente.
:::

### Ejecucion de Triggers

Cada despertar de trigger sigue esta secuencia:

1. El programador se activa en el intervalo configurado.
2. Se genera una sesion fresca en segundo plano con taint `PUBLIC`.
3. El agente lee `TRIGGER.md` para sus instrucciones de monitoreo.
4. El agente evalua cada verificacion, usando herramientas disponibles y
   servidores MCP.
5. Si se necesita accion, el agente actua -- enviando notificaciones, creando
   tareas o entregando resumenes.
6. El taint de la sesion puede escalar a medida que se acceden datos
   clasificados, pero no puede exceder el techo configurado.
7. La sesion se archiva al completarse.

::: tip Los triggers y los cron jobs se complementan entre si. Use cron para
tareas que deben ejecutarse a horas exactas independientemente de las condiciones
(briefing matutino a las 7 AM). Use triggers para monitoreo que requiere juicio
(verificar si algo necesita mi atencion cada 30 minutos). :::

## Herramienta de Contexto de Trigger

El agente puede cargar resultados de triggers en su conversacion actual usando
la herramienta `trigger_add_to_context`. Esto es util cuando un usuario pregunta
sobre algo que fue verificado durante el ultimo despertar de trigger.

### Uso

| Parametro | Predeterminado | Descripcion                                                                                          |
| --------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"`    | Que salida de trigger cargar: `"trigger"` (periodico), `"cron:<job-id>"`, o `"webhook:<source>"` |

La herramienta carga el resultado de ejecucion mas reciente para la fuente
especificada y lo agrega al contexto de la conversacion.

### Cumplimiento de Write-Down

La inyeccion de contexto de trigger respeta la regla de no-write-down:

- Si la clasificacion del trigger **excede** el taint de la sesion, el taint de
  la sesion **escala** para coincidir
- Si el taint de la sesion **excede** la clasificacion del trigger, la inyeccion
  se **permite** -- datos de menor clasificacion siempre pueden fluir a una
  sesion de mayor clasificacion (comportamiento normal de `canFlowTo`). El taint
  de la sesion no cambia.

::: info Una sesion CONFIDENTIAL puede cargar un resultado de trigger PUBLIC sin
problema -- los datos fluyen hacia arriba. Lo inverso (inyectar datos de trigger
CONFIDENTIAL en una sesion con techo PUBLIC) escalaria el taint de la sesion a
CONFIDENTIAL. :::

### Persistencia

Los resultados de triggers se almacenan via `StorageProvider` con claves en el
formato `trigger:last:<source>`. Solo se mantiene el resultado mas reciente por
fuente.

## Integracion de Seguridad

Toda ejecucion programada se integra con el modelo de seguridad central:

- **Sesiones aisladas** -- Cada cron job y despertar de trigger se ejecuta en su
  propia sesion generada con seguimiento de taint independiente.
- **Techo de clasificacion** -- Las tareas en segundo plano no pueden exceder su
  nivel de clasificacion configurado, incluso si las herramientas que invocan
  retornan datos de mayor clasificacion.
- **Hooks de politica** -- Todas las acciones dentro de tareas programadas pasan
  por los mismos hooks de cumplimiento que las sesiones interactivas
  (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT).
- **Clasificacion de canal** -- La entrega de salida respeta el nivel de
  clasificacion del canal destino. Un resultado `CONFIDENTIAL` no puede enviarse
  a un canal `PUBLIC`.
- **Registro de auditoria** -- Cada ejecucion programada se registra con
  contexto completo: ID del job, ID de sesion, historial de taint, acciones
  tomadas y estado de entrega.
- **Persistencia** -- Los cron jobs se almacenan via `StorageProvider` (namespace:
  `cron:`) y sobreviven reinicios del gateway.
