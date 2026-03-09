# Webhooks

Triggerfish puede aceptar eventos entrantes de servicios externos, habilitando
reacciones en tiempo real a correos electrónicos, alertas de errores, eventos
CI/CD, cambios de calendario y más. Los webhooks convierten a su agente de un
sistema reactivo de preguntas y respuestas en un participante proactivo en sus
flujos de trabajo.

## Cómo Funcionan los Webhooks

Los servicios externos envían solicitudes HTTP POST a endpoints de webhook
registrados en el gateway de Triggerfish. Cada evento entrante se verifica para
autenticidad, se clasifica y se enruta al agente para procesamiento.

<img src="/diagrams/webhook-pipeline.svg" alt="Pipeline de webhook: servicios externos envían HTTP POST a través de verificación HMAC, clasificación, aislamiento de sesión y hooks de política al procesamiento del agente" style="max-width: 100%;" />

## Fuentes de Eventos Soportadas

Triggerfish puede recibir webhooks de cualquier servicio que soporte entrega de
webhooks HTTP. Las integraciones comunes incluyen:

| Fuente    | Mecanismo                         | Eventos de Ejemplo                           |
| --------- | --------------------------------- | -------------------------------------------- |
| Gmail     | Notificaciones push de Pub/Sub    | Nuevo correo, cambio de etiqueta             |
| GitHub    | Webhook                           | PR abierto, comentario en issue, fallo de CI |
| Sentry    | Webhook                           | Alerta de error, regresión detectada         |
| Stripe    | Webhook                           | Pago recibido, cambio de suscripción         |
| Calendario | Polling o push                   | Recordatorio de evento, conflicto detectado  |
| Personalizado | Endpoint de webhook genérico   | Cualquier payload JSON                       |

## Configuración

Los endpoints de webhook se configuran en `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret almacenado en el llavero del SO
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret almacenado en el llavero del SO
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secret almacenado en el llavero del SO
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Campos de Configuración

| Campo             | Requerido | Descripción                                                     |
| ----------------- | :-------: | --------------------------------------------------------------- |
| `id`              |    Sí     | Identificador único para este endpoint de webhook               |
| `path`            |    Sí     | Ruta URL donde se registra el endpoint                          |
| `secret`          |    Sí     | Secreto compartido para verificación de firma HMAC              |
| `classification`  |    Sí     | Nivel de clasificación asignado a eventos de esta fuente        |
| `actions`         |    Sí     | Lista de mapeos evento-a-tarea                                  |
| `actions[].event` |    Sí     | Patrón de tipo de evento a coincidir                            |
| `actions[].task`  |    Sí     | Tarea en lenguaje natural para que el agente ejecute            |

::: tip Los secretos de webhook se almacenan en el llavero del SO. Ejecuten
`triggerfish dive` o configuren webhooks interactivamente para ingresarlos de
forma segura. :::

## Verificación de Firma HMAC

Cada solicitud de webhook entrante se verifica para autenticidad usando
validación de firma HMAC antes de que el payload sea procesado.

### Cómo Funciona la Verificación

1. El servicio externo envía un webhook con un encabezado de firma (por ejemplo,
   `X-Hub-Signature-256` para GitHub)
2. Triggerfish calcula el HMAC del cuerpo de la solicitud usando el secreto
   compartido configurado
3. La firma calculada se compara contra la firma en el encabezado de la
   solicitud
4. Si las firmas no coinciden, la solicitud se **rechaza** inmediatamente
5. Si se verifica, el payload procede a clasificación y procesamiento

<img src="/diagrams/hmac-verification.svg" alt="Flujo de verificación HMAC: verificar presencia de firma, calcular HMAC, comparar firmas, rechazar o proceder" style="max-width: 100%;" />

::: warning SEGURIDAD Las solicitudes de webhook sin firmas HMAC válidas se
rechazan antes de cualquier procesamiento. Esto previene que eventos falsificados
activen acciones del agente. Nunca deshabiliten la verificación de firma en
producción. :::

## Pipeline de Procesamiento de Eventos

Una vez que un evento de webhook pasa la verificación de firma, fluye a través
del pipeline de seguridad estándar:

### 1. Clasificación

El payload del evento se clasifica al nivel configurado para el endpoint de
webhook. Un endpoint de webhook configurado como `CONFIDENTIAL` produce eventos
`CONFIDENTIAL`.

### 2. Aislamiento de Sesión

Cada evento de webhook genera su propia sesión aislada. Esto significa:

- El evento se procesa independientemente de cualquier conversación en curso
- El taint de sesión comienza limpio (al nivel de clasificación del webhook)
- No hay fugas de datos entre sesiones activadas por webhook y sesiones de
  usuario
- Cada sesión obtiene su propio seguimiento de taint y linaje

### 3. Hook PRE_CONTEXT_INJECTION

El payload del evento pasa por el hook `PRE_CONTEXT_INJECTION` antes de entrar
al contexto del agente. Este hook:

- Valida la estructura del payload
- Aplica clasificación a todos los campos de datos
- Crea un registro de linaje para los datos entrantes
- Escanea patrones de inyección en campos de tipo string
- Puede bloquear el evento si las reglas de política lo dictan

### 4. Procesamiento del Agente

El agente recibe el evento clasificado y ejecuta la tarea configurada. La tarea
es una instrucción en lenguaje natural -- el agente usa todas sus capacidades
(herramientas, skills, navegador, entorno de ejecución) para completarla dentro
de las restricciones de política.

### 5. Entrega de Salida

Cualquier salida del agente (mensajes, notificaciones, acciones) pasa por el
hook `PRE_OUTPUT`. La regla de No Escritura Descendente aplica: la salida de una
sesión activada por webhook `CONFIDENTIAL` no puede enviarse a un canal `PUBLIC`.

### 6. Auditoría

El ciclo de vida completo del evento se registra: recepción, verificación,
clasificación, creación de sesión, acciones del agente y decisiones de salida.

## Integración con el Programador

Los webhooks se integran naturalmente con el
[sistema de cron y triggers](/pt-BR/features/cron-and-triggers) de Triggerfish.
Un evento de webhook puede:

- **Activar un cron job existente** antes de lo programado (por ejemplo, un
  webhook de despliegue activa una verificación de salud inmediata)
- **Crear una nueva tarea programada** (por ejemplo, un webhook de calendario
  programa un recordatorio)
- **Actualizar prioridades de triggers** (por ejemplo, una alerta de Sentry
  hace que el agente priorice la investigación de errores en su próximo ciclo de
  trigger)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # secret almacenado en el llavero del SO
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # El agente puede usar cron.create para programar verificaciones de seguimiento
```

## Resumen de Seguridad

| Control                 | Descripción                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Verificación HMAC       | Todos los webhooks entrantes verificados antes del procesamiento                   |
| Clasificación           | Payloads de webhook clasificados al nivel configurado                               |
| Aislamiento de sesión   | Cada evento obtiene su propia sesión aislada                                       |
| `PRE_CONTEXT_INJECTION` | Payload escaneado y clasificado antes de entrar al contexto                        |
| No Escritura Descendente | La salida de eventos de alta clasificación no puede llegar a canales de baja clasificación |
| Registro de auditoría   | Ciclo de vida completo del evento registrado                                       |
| No expuesto públicamente | Los endpoints de webhook no están expuestos a internet público por defecto        |

## Ejemplo: Ciclo de Revisión de PR en GitHub

Un ejemplo real de webhooks en acción: el agente abre un PR, luego los eventos
de webhook de GitHub impulsan el ciclo de retroalimentación de revisión de código
sin ningún polling.

### Cómo Funciona

1. El agente crea una rama de feature, hace commit del código y abre un PR vía
   `gh pr create`
2. El agente escribe un archivo de seguimiento en
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` con el nombre de
   la rama, número de PR y contexto de la tarea
3. El agente se detiene y espera -- sin polling

Cuando un revisor publica retroalimentación:

4. GitHub envía un webhook `pull_request_review` a Triggerfish
5. Triggerfish verifica la firma HMAC, clasifica el evento y genera una sesión
   aislada
6. El agente lee el archivo de seguimiento para recuperar contexto, hace
   checkout de la rama, aborda la revisión, hace commit, push y comenta en el PR
7. Los pasos 4-6 se repiten hasta que la revisión sea aprobada

Cuando el PR se fusiona:

8. GitHub envía un webhook `pull_request.closed` con `merged: true`
9. El agente limpia: elimina la rama local, archiva el archivo de seguimiento

### Configuración

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret almacenado en el llavero del SO
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

El webhook de GitHub debe enviar: `Pull requests`, `Pull request reviews`,
`Pull request review comments` e `Issue comments`.

Consulten la guía completa de [Integración con GitHub](/pt-BR/integrations/github)
para instrucciones de configuración y el skill incluido `git-branch-management`
para el flujo de trabajo completo del agente.

### Controles Empresariales

- **Lista de webhooks permitidos** administrada por admin -- solo fuentes
  externas aprobadas pueden registrar endpoints
- **Limitación de tasa** por endpoint para prevenir abuso
- **Límites de tamaño de payload** para prevenir agotamiento de memoria
- **Lista de IPs permitidas** para verificación adicional de fuente
- **Políticas de retención** para logs de eventos de webhook

::: info Los endpoints de webhook no están expuestos a internet público por
defecto. Para que los servicios externos alcancen su instancia de Triggerfish,
necesitan configurar redirección de puertos, un proxy reverso o un túnel. La
sección de [Acceso Remoto](/pt-BR/reference/) de la documentación cubre
opciones de exposición segura. :::
