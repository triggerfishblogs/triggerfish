# Cron y triggers

Los agentes de Triggerfish no se limitan a preguntas y respuestas reactivas. El
sistema de cron y triggers habilita comportamiento proactivo: tareas
programadas, revisiones periódicas, informes matutinos, monitorización en
segundo plano y flujos de trabajo autónomos de múltiples pasos.

## Trabajos cron

Los trabajos cron son tareas programadas con instrucciones fijas, un canal de
entrega y un techo de clasificación. Utilizan la sintaxis estándar de
expresiones cron.

### Configuración

Defina trabajos cron en `triggerfish.yaml` o deje que el agente los gestione en
tiempo de ejecución a través de la herramienta cron:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 AM diario
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # Dónde entregar
        classification: INTERNAL # Taint máximo para este trabajo

      - id: pipeline-check
        schedule: "0 */4 * * *" # Cada 4 horas
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### Cómo funciona

1. El **CronManager** analiza las expresiones cron estándar y mantiene un
   registro de trabajos persistente que sobrevive a reinicios.
2. Cuando un trabajo se activa, el **OrchestratorFactory** crea un orquestador y
   sesión aislados específicamente para esa ejecución.
3. El trabajo se ejecuta en un **workspace de sesión en segundo plano** con su
   propio seguimiento de taint.
4. La salida se entrega al canal configurado, sujeta a las reglas de
   clasificación de ese canal.
5. El historial de ejecución se registra para auditoría.

### Cron gestionado por el agente

El agente puede crear y gestionar sus propios trabajos cron a través de la
herramienta `cron`:

| Acción         | Descripción             | Seguridad                                   |
| -------------- | ----------------------- | ------------------------------------------- |
| `cron.list`    | Listar trabajos programados | Solo propietario                          |
| `cron.create`  | Programar un nuevo trabajo | Solo propietario, techo de clasificación aplicado |
| `cron.delete`  | Eliminar un trabajo programado | Solo propietario                        |
| `cron.history` | Ver ejecuciones pasadas | Pista de auditoría preservada               |

::: warning La creación de trabajos cron requiere autenticación de propietario.
El agente no puede programar trabajos en nombre de usuarios externos ni exceder
el techo de clasificación configurado. :::

### Gestión de cron por CLI

Los trabajos cron también se pueden gestionar directamente desde la línea de
comandos:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

La opción `--classification` establece el techo de clasificación para el
trabajo. Los niveles válidos son `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` y
`RESTRICTED`. Si se omite, el predeterminado es `INTERNAL`.

## Sistema de triggers

Los triggers son bucles periódicos de "revisión" donde el agente se despierta
para evaluar si es necesaria alguna acción proactiva. A diferencia de los
trabajos cron con tareas fijas, los triggers dan al agente discreción para
decidir qué necesita atención.

### TRIGGER.md

`TRIGGER.md` define lo que el agente debe comprobar durante cada despertar. Se
encuentra en `~/.triggerfish/config/TRIGGER.md` y es un archivo markdown de
formato libre donde se especifican prioridades de monitorización, reglas de
escalada y comportamientos proactivos.

Si `TRIGGER.md` está ausente, el agente usa su conocimiento general para decidir
qué necesita atención.

**Ejemplo de TRIGGER.md:**

```markdown
# TRIGGER.md -- Qué comprobar en cada despertar

## Comprobaciones prioritarias

- Mensajes sin leer en todos los canales con más de 1 hora de antigüedad
- Conflictos de calendario en las próximas 24 horas
- Tareas vencidas en Linear o Jira

## Monitorización

- GitHub: PRs esperando mi revisión
- Correo electrónico: cualquier cosa de contactos VIP (marcar para notificación inmediata)
- Slack: menciones en el canal #incidents

## Proactivo

- Si es por la mañana (7-9am), preparar informe diario
- Si es viernes por la tarde, redactar resumen semanal
```

### Configuración de triggers

La temporización y restricciones de triggers se establecen en
`triggerfish.yaml`:

```yaml
scheduler:
  trigger:
    enabled: true # Establecer a false para desactivar triggers (predeterminado: true)
    interval_minutes: 30 # Comprobar cada 30 minutos (predeterminado: 30)
    # Establecer a 0 para desactivar triggers sin eliminar la configuración
    classification_ceiling: CONFIDENTIAL # Techo de taint máximo (predeterminado: CONFIDENTIAL)
    quiet_hours:
      start: 22 # No despertar entre las 22:00 ...
      end: 7 # ... y las 7:00
```

| Ajuste                                  | Descripción                                                                                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Si los despertares periódicos de triggers están activos. Establecer a `false` para desactivar.                                                     |
| `interval_minutes`                      | Con qué frecuencia (en minutos) el agente se despierta para comprobar triggers. Predeterminado: `30`. Establecer a `0` para desactivar.             |
| `classification_ceiling`                | Nivel de clasificación máximo que la sesión de trigger puede alcanzar. Predeterminado: `CONFIDENTIAL`.                                              |
| `quiet_hours.start` / `quiet_hours.end` | Rango horario (reloj de 24h) durante el cual los triggers se suprimen.                                                                              |

::: tip Para desactivar temporalmente los triggers, establezca
`interval_minutes: 0`. Esto equivale a `enabled: false` y le permite mantener
los demás ajustes de trigger para poder reactivarlos fácilmente. :::

### Ejecución de triggers

Cada despertar de trigger sigue esta secuencia:

1. El planificador se activa en el intervalo configurado.
2. Se crea una sesión en segundo plano con taint `PUBLIC`.
3. El agente lee `TRIGGER.md` para sus instrucciones de monitorización.
4. El agente evalúa cada comprobación, usando herramientas disponibles y
   servidores MCP.
5. Si se necesita acción, el agente actúa: enviando notificaciones, creando
   tareas o entregando resúmenes.
6. El taint de la sesión puede escalar a medida que se accede a datos
   clasificados, pero no puede exceder el techo configurado.
7. La sesión se archiva después de completarse.

::: tip Los triggers y trabajos cron se complementan entre sí. Use cron para
tareas que deben ejecutarse en horarios exactos independientemente de las
condiciones (informe matutino a las 7 AM). Use triggers para monitorización que
requiere juicio (comprobar si algo necesita mi atención cada 30 minutos). :::

## Herramienta de contexto de trigger

El agente puede cargar resultados de trigger en su conversación actual usando la
herramienta `trigger_add_to_context`. Esto es útil cuando un usuario pregunta
sobre algo que se comprobó durante el último despertar de trigger.

### Uso

| Parámetro | Predeterminado | Descripción                                                                                         |
| --------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"`    | Qué salida de trigger cargar: `"trigger"` (periódico), `"cron:<job-id>"`, o `"webhook:<source>"`    |

La herramienta carga el resultado de ejecución más reciente para la fuente
especificada y lo añade al contexto de la conversación.

### Aplicación de escritura descendente

La inyección de contexto de trigger respeta la regla de prohibición de escritura
descendente:

- Si la clasificación del trigger **excede** el taint de sesión, el taint de
  sesión **escala** para coincidir
- Si el taint de sesión **excede** la clasificación del trigger, la inyección se
  **permite** -- datos de clasificación inferior siempre pueden fluir a una
  sesión de clasificación superior (comportamiento normal de `canFlowTo`). El
  taint de sesión no cambia.

::: info Una sesión CONFIDENTIAL puede cargar un resultado de trigger PUBLIC sin
problema -- los datos fluyen hacia arriba. Lo contrario (inyectar datos de
trigger CONFIDENTIAL en una sesión con techo PUBLIC) escalaría el taint de sesión
a CONFIDENTIAL. :::

### Persistencia

Los resultados de trigger se almacenan vía `StorageProvider` con claves en el
formato `trigger:last:<source>`. Solo se conserva el resultado más reciente por
fuente.

## Integración de seguridad

Toda la ejecución programada se integra con el modelo de seguridad central:

- **Sesiones aisladas** -- cada trabajo cron y despertar de trigger se ejecuta en
  su propia sesión creada con seguimiento de taint independiente.
- **Techo de clasificación** -- las tareas en segundo plano no pueden exceder su
  nivel de clasificación configurado, incluso si las herramientas que invocan
  devuelven datos de clasificación superior.
- **Hooks de políticas** -- todas las acciones dentro de tareas programadas
  pasan por los mismos hooks de aplicación que las sesiones interactivas
  (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT).
- **Clasificación de canal** -- la entrega de salida respeta el nivel de
  clasificación del canal destino. Un resultado `CONFIDENTIAL` no se puede
  enviar a un canal `PUBLIC`.
- **Pista de auditoría** -- cada ejecución programada se registra con contexto
  completo: ID de trabajo, ID de sesión, historial de taint, acciones tomadas y
  estado de entrega.
- **Persistencia** -- los trabajos cron se almacenan vía `StorageProvider`
  (espacio de nombres: `cron:`) y sobreviven a reinicios del Gateway.
