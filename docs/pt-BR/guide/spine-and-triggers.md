# SPINE y Triggers

Triggerfish usa dos archivos markdown para definir el comportamiento de tu agente:
**SPINE.md** controla quién es tu agente, y **TRIGGER.md** controla qué hace tu
agente de forma proactiva. Ambos son markdown de formato libre -- los escribes en
lenguaje natural.

## SPINE.md -- Identidad del agente

`SPINE.md` es la base del prompt del sistema de tu agente. Define el
nombre, personalidad, misión, dominios de conocimiento y límites del agente.
Triggerfish carga este archivo cada vez que procesa un mensaje, así que los cambios surten
efecto inmediatamente.

### Ubicación del archivo

```
~/.triggerfish/SPINE.md
```

Para configuraciones multi-agente, cada agente tiene su propio SPINE.md:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Primeros pasos

El asistente de configuración (`triggerfish dive`) genera un SPINE.md inicial basado en tus
respuestas. Puedes editarlo libremente en cualquier momento -- es solo markdown.

### Cómo escribir un SPINE.md efectivo

Un buen SPINE.md es específico. Cuanto más concreto seas sobre el rol de tu agente,
mejor se desempeña. Aquí hay una estructura recomendada:

```markdown
# Identidad

Eres Reef, un asistente personal de IA para Sarah.

# Misión

Ayudar a Sarah a mantenerse organizada, informada y productiva. Priorizar la gestión
de calendario, triaje de emails y seguimiento de tareas.

# Estilo de comunicación

- Sé conciso y directo. Sin relleno.
- Usa viñetas para listas de 3+ elementos.
- Cuando no estés seguro, dilo en lugar de adivinar.
- Adapta la formalidad al canal: casual en WhatsApp, profesional en Slack.

# Conocimiento del dominio

- Sarah es product manager en Acme Corp.
- Herramientas clave: Linear para tareas, Google Calendar, Gmail, Slack.
- Contactos VIP: @boss (David Chen), @skip (Maria Lopez).
- Prioridades actuales: roadmap Q2, lanzamiento de app móvil.

# Límites

- Nunca enviar mensajes a contactos externos sin aprobación explícita.
- Nunca hacer transacciones financieras.
- Siempre confirmar antes de eliminar o modificar eventos de calendario.
- Al discutir temas de trabajo en canales personales, recordarle a Sarah sobre
  los límites de clasificación.

# Preferencias de respuesta

- Por defecto respuestas cortas (2-3 oraciones).
- Usar respuestas más largas solo cuando la pregunta requiere detalle.
- Para código, incluir comentarios breves explicando decisiones clave.
```

### Mejores prácticas

::: tip **Sé específico sobre la personalidad.** En lugar de "sé útil," escribe "sé
conciso, directo, y usa viñetas para mayor claridad." :::

::: tip **Incluye contexto sobre el propietario.** El agente se desempeña mejor cuando
conoce tu rol, herramientas y prioridades. :::

::: tip **Establece límites explícitos.** Define lo que el agente nunca debería hacer. Esto
complementa (pero no reemplaza) la aplicación determinista del motor de
políticas. :::

::: warning Las instrucciones de SPINE.md guían el comportamiento del LLM pero no son controles de
seguridad. Para restricciones aplicables, usa el motor de políticas en
`triggerfish.yaml`. El motor de políticas es determinista y no se puede eludir --
las instrucciones de SPINE.md sí pueden serlo. :::

## TRIGGER.md -- Comportamiento proactivo

`TRIGGER.md` define qué debería verificar, monitorear y actuar tu agente durante
activaciones periódicas. A diferencia de las tareas cron (que ejecutan tareas fijas en un horario),
los triggers le dan al agente discreción para evaluar condiciones y decidir si
se necesita acción.

### Ubicación del archivo

```
~/.triggerfish/TRIGGER.md
```

Para configuraciones multi-agente:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Cómo funcionan los triggers

1. El bucle de triggers despierta al agente en un intervalo configurado (establecido en
   `triggerfish.yaml`)
2. Triggerfish carga tu TRIGGER.md y se lo presenta al agente
3. El agente evalúa cada elemento y toma acción si es necesario
4. Todas las acciones de triggers pasan por los hooks de políticas normales
5. La sesión de trigger se ejecuta con un techo de clasificación (también configurado en
   YAML)
6. Se respetan las horas tranquilas -- no se activan triggers durante esos horarios

### Configuración de triggers en YAML

Establece la temporización y restricciones en tu `triggerfish.yaml`:

```yaml
trigger:
  interval: 30m # Verificar cada 30 minutos
  classification: INTERNAL # Techo máximo de taint para sesiones de trigger
  quiet_hours: "22:00-07:00" # Sin activaciones durante estas horas
```

### Cómo escribir TRIGGER.md

Organiza tus triggers por prioridad. Sé específico sobre qué cuenta como accionable
y qué debería hacer el agente al respecto.

```markdown
# Verificaciones prioritarias

- Mensajes no leídos en todos los canales con más de 1 hora -- resumir y notificar
  en el canal principal.
- Conflictos de calendario en las próximas 24 horas -- señalar y sugerir resolución.
- Tareas vencidas en Linear -- listarlas con días de retraso.

# Monitoreo

- GitHub: PRs esperando mi revisión -- notificar si tienen más de 4 horas.
- Email: cualquier cosa de contactos VIP (David Chen, Maria Lopez) -- marcar para
  notificación inmediata sin importar las horas tranquilas.
- Slack: menciones en el canal #incidents -- resumir y escalar si no está resuelto.

# Proactivo

- Si es la mañana (7-9am), preparar briefing diario con calendario, clima y las 3
  principales prioridades.
- Si es viernes por la tarde, redactar resumen semanal de tareas completadas y pendientes.
- Si el conteo de inbox excede 50 no leídos, ofrecer triaje por lotes.
```

### Ejemplo: TRIGGER.md mínimo

Si quieres un punto de partida simple:

```markdown
# Verificar en cada activación

- Mensajes no leídos con más de 1 hora
- Eventos de calendario en las próximas 4 horas
- Cualquier cosa urgente en email
```

### Ejemplo: TRIGGER.md enfocado en desarrollo

```markdown
# Alta prioridad

- Fallos de CI en la rama principal -- investigar y notificar.
- PRs esperando mi revisión con más de 2 horas.
- Errores de Sentry con severidad "critical" en la última hora.

# Monitoreo

- PRs de Dependabot -- auto-aprobar actualizaciones patch, señalar minor/major.
- Tiempos de build que superan los 10 minutos -- reportar semanalmente.
- Issues abiertos asignados a mí sin actualizaciones en 3 días.

# Diario

- Mañana: resumir ejecuciones de CI nocturnas y estado de deploys.
- Fin del día: listar PRs que abrí que aún esperan revisión.
```

### Triggers y el motor de políticas

Todas las acciones de triggers están sujetas a la misma aplicación de políticas que las
conversaciones interactivas:

- Cada activación de trigger genera una sesión aislada con su propio seguimiento de taint
- El techo de clasificación en tu configuración YAML limita a qué datos puede acceder el trigger
- La regla de no write-down aplica -- si un trigger accede a datos confidenciales, no
  puede enviar los resultados a un canal público
- Todas las acciones de triggers se registran en la pista de auditoría

::: info Si TRIGGER.md está ausente, las activaciones de triggers siguen ocurriendo en el intervalo
configurado. El agente usa su conocimiento general y SPINE.md para decidir qué necesita
atención. Para mejores resultados, escribe un TRIGGER.md. :::

## SPINE.md vs TRIGGER.md

| Aspecto   | SPINE.md                            | TRIGGER.md                      |
| --------- | ----------------------------------- | ------------------------------- |
| Propósito | Define quién es el agente           | Define qué monitorea el agente  |
| Se carga  | Cada mensaje                        | Cada activación de trigger      |
| Alcance   | Todas las conversaciones            | Solo sesiones de trigger        |
| Afecta    | Personalidad, conocimiento, límites | Verificaciones y acciones proactivas |
| Requerido | Sí (generado por el asistente dive) | No (pero recomendado)           |

## Próximos pasos

- Configura la temporización de triggers y tareas cron en tu
  [triggerfish.yaml](./configuration)
- Conoce todos los comandos del CLI disponibles en la [Referencia de comandos](./commands)
