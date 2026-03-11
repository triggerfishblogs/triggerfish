# Tide Pool / A2UI

El Tide Pool es un workspace visual controlado por el agente donde Triggerfish renderiza contenido interactivo: paneles, gráficos, formularios, previsualizaciones de código y medios enriquecidos. A diferencia del chat, que es una conversación lineal, el Tide Pool es un lienzo que el agente controla.

## ¿Qué es A2UI?

A2UI (Agent-to-UI) es el protocolo que impulsa el Tide Pool. Define cómo el agente envía contenido visual y actualizaciones a los clientes conectados en tiempo real. El agente decide qué mostrar; el cliente lo renderiza.

## Arquitectura

<img src="/diagrams/tidepool-architecture.svg" alt="Arquitectura A2UI del Tide Pool: el agente envía contenido a través del Gateway al renderizador del Tide Pool en los clientes conectados" style="max-width: 100%;" />

El agente usa la herramienta `tide_pool` para enviar contenido al host del Tide Pool que se ejecuta en el Gateway. El host retransmite actualizaciones por WebSocket a cualquier renderizador del Tide Pool conectado en una plataforma compatible.

## Herramientas del Tide Pool

El agente interactúa con el Tide Pool a través de estas herramientas:

| Herramienta       | Descripción                                        | Caso de uso                                              |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `tidepool_render` | Renderizar un árbol de componentes en el workspace | Paneles, formularios, visualizaciones, contenido enriquecido |
| `tidepool_update` | Actualizar las propiedades de un componente por ID | Actualizaciones incrementales sin reemplazar toda la vista |
| `tidepool_clear`  | Limpiar el workspace eliminando todos los componentes | Transiciones de sesión, empezar de nuevo                |

### Acciones legacy

El host subyacente también admite acciones de nivel inferior para retrocompatibilidad:

| Acción     | Descripción                            |
| ---------- | -------------------------------------- |
| `push`     | Enviar contenido HTML/JS en bruto      |
| `eval`     | Ejecutar JavaScript en el sandbox      |
| `reset`    | Limpiar todo el contenido              |
| `snapshot` | Capturar como imagen                   |

## Casos de uso

El Tide Pool está diseñado para escenarios donde solo el chat es insuficiente:

- **Paneles** -- El agente construye un panel en vivo mostrando métricas de sus integraciones conectadas.
- **Visualización de datos** -- Gráficos y diagramas renderizados a partir de resultados de consultas.
- **Formularios y entradas** -- Formularios interactivos para recopilación de datos estructurados.
- **Previsualizaciones de código** -- Código con resaltado de sintaxis con resultados de ejecución en vivo.
- **Medios enriquecidos** -- Imágenes, mapas y contenido incrustado.
- **Edición colaborativa** -- El agente presenta un documento para que usted lo revise y anote.

## Cómo funciona

1. Usted pide al agente que visualice algo (o el agente decide que una respuesta visual es apropiada).
2. El agente usa la acción `push` para enviar HTML y JavaScript al Tide Pool.
3. El host del Tide Pool del Gateway recibe el contenido y lo retransmite a los clientes conectados.
4. El renderizador muestra el contenido en tiempo real.
5. El agente puede usar `eval` para hacer actualizaciones incrementales sin reemplazar toda la vista.
6. Cuando el contexto cambia, el agente usa `reset` para limpiar el workspace.

## Integración de seguridad

El contenido del Tide Pool está sujeto a la misma aplicación de seguridad que cualquier otra salida:

- **Hook PRE_OUTPUT** -- Todo el contenido enviado al Tide Pool pasa por el hook de aplicación PRE_OUTPUT antes de renderizarse. Los datos clasificados que violan la política de salida se bloquean.
- **Taint de sesión** -- El contenido renderizado hereda el nivel de taint de la sesión. Un Tide Pool que muestra datos `CONFIDENTIAL` es en sí mismo `CONFIDENTIAL`.
- **Clasificación de capturas** -- Las capturas del Tide Pool se clasifican al nivel de taint de la sesión en el momento de la captura.
- **Sandboxing de JavaScript** -- El JavaScript ejecutado vía `eval` está aislado dentro del contexto del Tide Pool. No tiene acceso al sistema anfitrión, la red ni el sistema de archivos.
- **Sin acceso a red** -- El entorno de ejecución del Tide Pool no puede realizar solicitudes de red. Todos los datos fluyen a través del agente y la capa de políticas.

## Indicadores de estado

La interfaz web Tidepool incluye indicadores de estado en tiempo real:

### Barra de longitud de contexto

Una barra de progreso estilizada que muestra el uso de la ventana de contexto -- cuánto de la ventana de contexto del LLM se ha consumido. La barra se actualiza después de cada mensaje y después de la compactación.

### Estado de servidores MCP

Muestra el estado de conexión de los servidores MCP configurados (p. ej., "MCP 3/3"). Codificado por colores: verde para todos conectados, amarillo para parcial, rojo para ninguno.

### Entrada segura de secretos

Cuando el agente necesita que introduzca un secreto (vía la herramienta `secret_save`), Tidepool muestra una ventana emergente de entrada segura. El valor introducido va directamente al llavero -- nunca se envía a través del chat ni es visible en el historial de conversación.

::: tip Piense en el Tide Pool como la pizarra del agente. Mientras que el chat es cómo habla con el agente, el Tide Pool es donde el agente le muestra cosas. :::
