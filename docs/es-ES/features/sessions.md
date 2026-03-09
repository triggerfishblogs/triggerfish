# Gestión de sesiones

El agente puede inspeccionar, comunicarse con y crear sesiones. Estas herramientas habilitan flujos de trabajo entre sesiones, delegación de tareas en segundo plano y mensajería entre canales -- todo bajo la aplicación de escritura descendente.

## Herramientas

### `sessions_list`

Listar todas las sesiones activas visibles para la sesión actual.

No toma parámetros. Los resultados se filtran por nivel de taint -- una sesión `PUBLIC` no puede ver metadatos de sesiones `CONFIDENTIAL`.

### `sessions_history`

Obtener el historial de mensajes de una sesión por ID.

| Parámetro    | Tipo   | Obligatorio | Descripción                                    |
| ------------ | ------ | ----------- | ---------------------------------------------- |
| `session_id` | string | sí          | El ID de la sesión para recuperar el historial |

El acceso se deniega si el taint de la sesión destino es superior al taint del solicitante.

### `sessions_send`

Enviar contenido de la sesión actual a otra sesión. Sujeto a la aplicación de escritura descendente.

| Parámetro    | Tipo   | Obligatorio | Descripción                      |
| ------------ | ------ | ----------- | -------------------------------- |
| `session_id` | string | sí          | ID de la sesión destino          |
| `content`    | string | sí          | Contenido del mensaje a enviar   |

**Verificación de escritura descendente:** el taint del solicitante debe poder fluir al nivel de clasificación de la sesión destino. Una sesión `CONFIDENTIAL` no puede enviar datos a una sesión `PUBLIC`.

### `sessions_spawn`

Crear una nueva sesión en segundo plano para una tarea autónoma.

| Parámetro | Tipo   | Obligatorio | Descripción                                              |
| --------- | ------ | ----------- | -------------------------------------------------------- |
| `task`    | string | sí          | Descripción de lo que debe hacer la sesión en segundo plano |

La sesión creada comienza con taint `PUBLIC` independiente y su propio workspace aislado. Se ejecuta de forma autónoma y devuelve resultados cuando termina.

### `session_status`

Obtener metadatos y estado de una sesión específica.

| Parámetro    | Tipo   | Obligatorio | Descripción                       |
| ------------ | ------ | ----------- | --------------------------------- |
| `session_id` | string | sí          | El ID de la sesión a comprobar    |

Devuelve ID de sesión, canal, usuario, nivel de taint y hora de creación. El acceso está controlado por taint.

### `message`

Enviar un mensaje a un canal y destinatario. Sujeto a la aplicación de escritura descendente vía hooks de políticas.

| Parámetro   | Tipo   | Obligatorio | Descripción                                      |
| ----------- | ------ | ----------- | ------------------------------------------------ |
| `channel`   | string | sí          | Canal destino (p. ej. `telegram`, `slack`)       |
| `recipient` | string | sí          | Identificador del destinatario dentro del canal  |
| `text`      | string | sí          | Texto del mensaje a enviar                       |

### `summarize`

Generar un resumen conciso de la conversación actual. Útil para crear notas de traspaso, comprimir contexto o producir un resumen para entregar a otro canal.

| Parámetro | Tipo   | Obligatorio | Descripción                                           |
| --------- | ------ | ----------- | ----------------------------------------------------- |
| `scope`   | string | no          | Qué resumir: `session` (predeterminado), `topic`      |

### `simulate_tool_call`

Simular una llamada a herramienta para previsualizar la decisión del motor de políticas sin ejecutar la herramienta. Devuelve el resultado de la evaluación del hook (ALLOW, BLOCK o REDACT) y las reglas evaluadas.

| Parámetro   | Tipo   | Obligatorio | Descripción                                   |
| ----------- | ------ | ----------- | --------------------------------------------- |
| `tool_name` | string | sí          | La herramienta a simular                      |
| `args`      | object | no          | Argumentos a incluir en la simulación         |

::: tip Use `simulate_tool_call` para comprobar si una llamada a herramienta será permitida antes de ejecutarla. Esto es útil para entender el comportamiento de las políticas sin efectos secundarios. :::

## Casos de uso

### Delegación de tareas en segundo plano

El agente puede crear una sesión en segundo plano para gestionar una tarea de larga duración sin bloquear la conversación actual:

```
Usuario: "Investiga los precios de la competencia y prepara un resumen"
Agente: [llama a sessions_spawn con la tarea]
Agente: "He iniciado una sesión en segundo plano para investigar eso. Tendré los resultados en breve."
```

### Comunicación entre sesiones

Las sesiones pueden enviarse datos entre sí, habilitando flujos de trabajo donde una sesión produce datos que otra consume:

```
Sesión en segundo plano completa investigación → sessions_send al padre → el padre notifica al usuario
```

### Mensajería entre canales

La herramienta `message` permite al agente comunicarse proactivamente en cualquier canal conectado:

```
El agente detecta un evento urgente → message({ channel: "telegram", recipient: "owner", text: "Alerta: ..." })
```

## Seguridad

- Todas las operaciones de sesión están controladas por taint: no puede ver, leer ni enviar a sesiones por encima de su nivel de taint
- `sessions_send` aplica prevención de escritura descendente: los datos no pueden fluir a una clasificación inferior
- Las sesiones creadas comienzan con taint `PUBLIC` con seguimiento de taint independiente
- La herramienta `message` pasa por hooks de políticas `PRE_OUTPUT` antes de la entrega
- Los IDs de sesión se inyectan desde el contexto de ejecución, no de los argumentos del LLM -- el agente no puede suplantar otra sesión

::: warning SEGURIDAD La prevención de escritura descendente se aplica en toda la comunicación entre sesiones. Una sesión con taint `CONFIDENTIAL` no puede enviar datos a una sesión o canal `PUBLIC`. Este es un límite estricto aplicado por la capa de políticas. :::
