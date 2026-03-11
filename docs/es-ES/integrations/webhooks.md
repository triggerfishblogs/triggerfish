# Webhooks

Triggerfish puede aceptar eventos entrantes de servicios externos, permitiendo
reacciones en tiempo real a correos electrónicos, alertas de errores, eventos
CI/CD, cambios de calendario y más. Los webhooks convierten a su agente de un
sistema reactivo de preguntas y respuestas en un participante proactivo en sus
flujos de trabajo.

## Cómo funcionan los webhooks

Los servicios externos envían peticiones HTTP POST a endpoints de webhook
registrados en el gateway de Triggerfish. Cada evento entrante se verifica para
su autenticidad, se clasifica y se enruta al agente para su procesamiento.

<img src="/diagrams/webhook-pipeline.svg" alt="Pipeline de webhook: los servicios externos envían HTTP POST a través de verificación HMAC, clasificación, aislamiento de sesión y hooks de política al procesamiento del agente" style="max-width: 100%;" />

## Fuentes de eventos soportadas

Triggerfish puede recibir webhooks de cualquier servicio que soporte entrega de
webhooks HTTP. Las integraciones comunes incluyen:

| Fuente   | Mecanismo                           | Eventos de ejemplo                              |
| -------- | ----------------------------------- | ----------------------------------------------- |
| Gmail    | Notificaciones push Pub/Sub         | Nuevo correo, cambio de etiqueta                |
| GitHub   | Webhook                             | PR abierto, comentario en issue, fallo de CI    |
| Sentry   | Webhook                             | Alerta de error, regresión detectada            |
| Stripe   | Webhook                             | Pago recibido, cambio de suscripción            |
| Calendar | Polling o push                      | Recordatorio de evento, conflicto detectado     |
| Propio   | Endpoint de webhook genérico         | Cualquier payload JSON                          |

## Configuración

Los endpoints de webhook se configuran en `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secreto almacenado en el llavero del SO
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secreto almacenado en el llavero del SO
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secreto almacenado en el llavero del SO
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Campos de configuración

| Campo             | Obligatorio | Descripción                                                      |
| ----------------- | :---------: | ---------------------------------------------------------------- |
| `id`              |     Sí      | Identificador único para este endpoint de webhook                |
| `path`            |     Sí      | Ruta URL donde el endpoint está registrado                       |
| `secret`          |     Sí      | Secreto compartido para verificación de firma HMAC               |
| `classification`  |     Sí      | Nivel de clasificación asignado a eventos de esta fuente         |
| `actions`         |     Sí      | Lista de mapeos evento-tarea                                     |
| `actions[].event` |     Sí      | Patrón de tipo de evento a coincidir                             |
| `actions[].task`  |     Sí      | Tarea en lenguaje natural para que el agente ejecute             |

::: tip Los secretos de webhook se almacenan en el llavero del SO. Ejecute
`triggerfish dive` o configure webhooks de forma interactiva para introducirlos
de forma segura. :::

## Verificación de firma HMAC

Cada petición de webhook entrante se verifica para su autenticidad usando
validación de firma HMAC antes de procesar el payload.

### Cómo funciona la verificación

1. El servicio externo envía un webhook con una cabecera de firma (por ejemplo,
   `X-Hub-Signature-256` para GitHub)
2. Triggerfish calcula el HMAC del cuerpo de la petición usando el secreto
   compartido configurado
3. La firma calculada se compara con la firma en la cabecera de la petición
4. Si las firmas no coinciden, la petición se **rechaza** inmediatamente
5. Si se verifica, el payload procede a clasificación y procesamiento

<img src="/diagrams/hmac-verification.svg" alt="Flujo de verificación HMAC: comprobar presencia de firma, calcular HMAC, comparar firmas, rechazar o proceder" style="max-width: 100%;" />

::: warning SEGURIDAD Las peticiones de webhook sin firmas HMAC válidas se
rechazan antes de cualquier procesamiento. Esto evita que eventos falsificados
desencadenen acciones del agente. Nunca desactive la verificación de firmas en
producción. :::

## Pipeline de procesamiento de eventos

Una vez que un evento de webhook pasa la verificación de firma, fluye a través
del pipeline de seguridad estándar:

### 1. Clasificación

El payload del evento se clasifica al nivel configurado para el endpoint de
webhook. Un endpoint configurado como `CONFIDENTIAL` produce eventos
`CONFIDENTIAL`.

### 2. Aislamiento de sesión

Cada evento de webhook genera su propia sesión aislada. Esto significa:

- El evento se procesa independientemente de cualquier conversación en curso
- La contaminación de sesión comienza limpia (al nivel de clasificación del
  webhook)
- No hay fugas de datos entre sesiones activadas por webhook y sesiones de
  usuario
- Cada sesión tiene su propio seguimiento de contaminación y linaje

### 3. Hook PRE_CONTEXT_INJECTION

El payload del evento pasa por el hook `PRE_CONTEXT_INJECTION` antes de entrar
en el contexto del agente. Este hook:

- Valida la estructura del payload
- Aplica clasificación a todos los campos de datos
- Crea un registro de linaje para los datos entrantes
- Escanea patrones de inyección en campos de cadena
- Puede bloquear el evento si las reglas de política lo dictan

### 4. Procesamiento del agente

El agente recibe el evento clasificado y ejecuta la tarea configurada. La tarea
es una instrucción en lenguaje natural -- el agente utiliza todas sus
capacidades (herramientas, skills, navegador, entorno de ejecución) para
completarla dentro de las restricciones de política.

### 5. Entrega de salida

Cualquier salida del agente (mensajes, notificaciones, acciones) pasa por el
hook `PRE_OUTPUT`. Se aplica la regla de no escritura descendente: la salida de
una sesión activada por webhook `CONFIDENTIAL` no puede enviarse a un canal
`PUBLIC`.

### 6. Auditoría

El ciclo de vida completo del evento se registra: recepción, verificación,
clasificación, creación de sesión, acciones del agente y decisiones de salida.

## Integración con el planificador

Los webhooks se integran de forma natural con el
[sistema de cron y triggers](/es-ES/features/cron-and-triggers) de Triggerfish.
Un evento de webhook puede:

- **Activar un cron job existente** antes de lo programado (por ejemplo, un
  webhook de despliegue activa una comprobación de estado inmediata)
- **Crear una nueva tarea programada** (por ejemplo, un webhook de calendario
  programa un recordatorio)
- **Actualizar prioridades de triggers** (por ejemplo, una alerta de Sentry hace
  que el agente priorice la investigación de errores en su próximo despertar de
  trigger)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # secreto almacenado en el llavero del SO
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # El agente puede usar cron.create para programar comprobaciones de seguimiento
```

## Resumen de seguridad

| Control                 | Descripción                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Verificación HMAC       | Todos los webhooks entrantes verificados antes del procesamiento                             |
| Clasificación           | Los payloads de webhook clasificados al nivel configurado                                    |
| Aislamiento de sesión   | Cada evento obtiene su propia sesión aislada                                                 |
| `PRE_CONTEXT_INJECTION` | Payload escaneado y clasificado antes de entrar en el contexto                               |
| No escritura descendente| La salida de eventos de alta clasificación no puede llegar a canales de baja clasificación   |
| Registro de auditoría   | Ciclo de vida completo del evento registrado                                                 |
| No expuestos públicamente| Los endpoints de webhook no están expuestos a internet público por defecto                  |

## Ejemplo: Bucle de revisión de PR de GitHub

Un ejemplo real de webhooks en acción: el agente abre un PR, luego los eventos
de webhook de GitHub impulsan el bucle de retroalimentación de revisión de
código sin ningún polling.

### Cómo funciona

1. El agente crea una rama de funcionalidad, hace commit, y abre un PR vía
   `gh pr create`
2. El agente escribe un fichero de seguimiento en
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` con el nombre de
   la rama, número de PR y contexto de la tarea
3. El agente se detiene y espera -- sin polling

Cuando un revisor publica retroalimentación:

4. GitHub envía un webhook `pull_request_review` a Triggerfish
5. Triggerfish verifica la firma HMAC, clasifica el evento y genera una sesión
   aislada
6. El agente lee el fichero de seguimiento para recuperar contexto, cambia a la
   rama, aborda la revisión, hace commit, push y comenta en el PR
7. Los pasos 4-6 se repiten hasta que la revisión se aprueba

Cuando el PR se fusiona:

8. GitHub envía un webhook `pull_request.closed` con `merged: true`
9. El agente limpia: elimina la rama local, archiva el fichero de seguimiento

### Configuración

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secreto almacenado en el llavero del SO
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

Consulte la guía completa de [integración con GitHub](/es-ES/integrations/github)
para instrucciones de configuración y el skill empaquetado
`git-branch-management` para el flujo de trabajo completo del agente.

### Controles empresariales

- **Lista de webhook permitida** gestionada por admin -- solo las fuentes
  externas aprobadas pueden registrar endpoints
- **Limitación de tasa** por endpoint para prevenir abuso
- **Límites de tamaño de payload** para prevenir agotamiento de memoria
- **Lista de IPs permitidas** para verificación adicional de origen
- **Políticas de retención** para registros de eventos de webhook

::: info Los endpoints de webhook no están expuestos a internet público por
defecto. Para que los servicios externos alcancen su instancia de Triggerfish,
necesita configurar reenvío de puertos, un proxy inverso o un túnel. La sección
de [Acceso remoto](/es-ES/reference/) de la documentación cubre las opciones de
exposición segura. :::
