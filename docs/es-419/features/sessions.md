# Gestion de Sesiones

El agente puede inspeccionar, comunicarse con y generar sesiones. Estas
herramientas habilitan flujos de trabajo entre sesiones, delegacion de tareas en
segundo plano y mensajeria entre canales -- todo bajo cumplimiento de write-down.

## Herramientas

### `sessions_list`

Listar todas las sesiones activas visibles para la sesion actual.

No toma parametros. Los resultados se filtran por nivel de taint -- una sesion
`PUBLIC` no puede ver metadatos de sesiones `CONFIDENTIAL`.

### `sessions_history`

Obtener el historial de mensajes de una sesion por ID.

| Parametro    | Tipo   | Requerido | Descripcion                                  |
| ------------ | ------ | --------- | -------------------------------------------- |
| `session_id` | string | si        | El ID de sesion para recuperar el historial  |

El acceso se deniega si el taint de la sesion destino es mayor que el taint del
que solicita.

### `sessions_send`

Enviar contenido de la sesion actual a otra sesion. Sujeto a cumplimiento de
write-down.

| Parametro    | Tipo   | Requerido | Descripcion                        |
| ------------ | ------ | --------- | ---------------------------------- |
| `session_id` | string | si        | ID de sesion destino               |
| `content`    | string | si        | El contenido del mensaje a enviar  |

**Verificacion de write-down:** El taint del emisor debe poder fluir al nivel de
clasificacion de la sesion destino. Una sesion `CONFIDENTIAL` no puede enviar
datos a una sesion `PUBLIC`.

### `sessions_spawn`

Generar una nueva sesion en segundo plano para una tarea autonoma.

| Parametro | Tipo   | Requerido | Descripcion                                              |
| --------- | ------ | --------- | -------------------------------------------------------- |
| `task`    | string | si        | Descripcion de lo que debe hacer la sesion en segundo plano |

La sesion generada comienza con taint `PUBLIC` independiente y su propio
workspace aislado. Se ejecuta de forma autonoma y retorna resultados al
completarse.

### `session_status`

Obtener metadatos y estado de una sesion especifica.

| Parametro    | Tipo   | Requerido | Descripcion                    |
| ------------ | ------ | --------- | ------------------------------ |
| `session_id` | string | si        | El ID de sesion a verificar    |

Retorna ID de sesion, canal, usuario, nivel de taint y hora de creacion. El
acceso esta controlado por taint.

### `message`

Enviar un mensaje a un canal y destinatario. Sujeto a cumplimiento de write-down
via hooks de politica.

| Parametro   | Tipo   | Requerido | Descripcion                               |
| ----------- | ------ | --------- | ----------------------------------------- |
| `channel`   | string | si        | Canal destino (ej. `telegram`, `slack`)    |
| `recipient` | string | si        | Identificador del destinatario en el canal |
| `text`      | string | si        | Texto del mensaje a enviar                |

### `summarize`

Generar un resumen conciso de la conversacion actual. Util para crear notas de
traspaso, comprimir contexto o producir un resumen para entrega a otro canal.

| Parametro | Tipo   | Requerido | Descripcion                                        |
| --------- | ------ | --------- | -------------------------------------------------- |
| `scope`   | string | no        | Que resumir: `session` (predeterminado), `topic`   |

### `simulate_tool_call`

Simular una llamada a herramienta para previsualizar la decision del motor de
politicas sin ejecutar la herramienta. Retorna el resultado de evaluacion del
hook (ALLOW, BLOCK o REDACT) y las reglas que fueron evaluadas.

| Parametro   | Tipo   | Requerido | Descripcion                                  |
| ----------- | ------ | --------- | -------------------------------------------- |
| `tool_name` | string | si        | La herramienta a simular llamar              |
| `args`      | object | no        | Argumentos a incluir en la simulacion        |

::: tip Use `simulate_tool_call` para verificar si una llamada a herramienta
sera permitida antes de ejecutarla. Esto es util para entender el comportamiento
de politicas sin efectos secundarios. :::

## Casos de Uso

### Delegacion de Tareas en Segundo Plano

El agente puede generar una sesion en segundo plano para manejar una tarea de
larga duracion sin bloquear la conversacion actual:

```
Usuario: "Investiga precios de competidores y arma un resumen"
Agente: [llama a sessions_spawn con la tarea]
Agente: "Inicie una sesion en segundo plano para investigar eso. Tendre resultados pronto."
```

### Comunicacion Entre Sesiones

Las sesiones pueden enviarse datos entre si, habilitando flujos de trabajo donde
una sesion produce datos que otra consume:

```
La sesion en segundo plano completa investigacion -> sessions_send al padre -> el padre notifica al usuario
```

### Mensajeria Entre Canales

La herramienta `message` permite al agente comunicarse proactivamente en
cualquier canal conectado:

```
El agente detecta un evento urgente -> message({ channel: "telegram", recipient: "owner", text: "Alerta: ..." })
```

## Seguridad

- Todas las operaciones de sesion estan controladas por taint: no puede ver,
  leer ni enviar a sesiones por encima de su nivel de taint
- `sessions_send` aplica prevencion de write-down: los datos no pueden fluir a
  una clasificacion menor
- Las sesiones generadas comienzan en taint `PUBLIC` con seguimiento de taint
  independiente
- La herramienta `message` pasa por hooks de politica `PRE_OUTPUT` antes de la
  entrega
- Los IDs de sesion se inyectan desde el contexto de ejecucion, no desde
  argumentos del LLM -- el agente no puede suplantar otra sesion

::: warning SEGURIDAD La prevencion de write-down se aplica en toda comunicacion
entre sesiones. Una sesion con taint `CONFIDENTIAL` no puede enviar datos a una
sesion o canal `PUBLIC`. Este es un limite duro aplicado por la capa de
politicas. :::
