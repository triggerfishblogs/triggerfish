# Tide Pool / A2UI

El Tide Pool es un espacio de trabajo visual controlado por el agente donde
Triggerfish renderiza contenido interactivo: dashboards, graficos, formularios,
vistas previas de codigo y medios enriquecidos. A diferencia del chat, que es una
conversacion lineal, el Tide Pool es un lienzo que el agente controla.

## Que es A2UI?

A2UI (Agent-to-UI) es el protocolo que impulsa el Tide Pool. Define como el
agente envia contenido visual y actualizaciones a clientes conectados en tiempo
real. El agente decide que mostrar; el cliente lo renderiza.

## Arquitectura

<img src="/diagrams/tidepool-architecture.svg" alt="Arquitectura A2UI de Tide Pool: El agente envia contenido a traves del Gateway al Renderizador de Tide Pool en clientes conectados" style="max-width: 100%;" />

El agente usa la herramienta `tide_pool` para enviar contenido al Host de Tide
Pool que se ejecuta en el Gateway. El Host retransmite actualizaciones por
WebSocket a cualquier Renderizador de Tide Pool conectado en una plataforma
soportada.

## Herramientas de Tide Pool

El agente interactua con el Tide Pool a traves de estas herramientas:

| Herramienta       | Descripcion                                           | Caso de Uso                                          |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| `tidepool_render` | Renderizar un arbol de componentes en el workspace    | Dashboards, formularios, visualizaciones, contenido enriquecido |
| `tidepool_update` | Actualizar las props de un solo componente por ID     | Actualizaciones incrementales sin reemplazar toda la vista |
| `tidepool_clear`  | Limpiar el workspace, eliminando todos los componentes | Transiciones de sesion, comenzar de cero             |

### Acciones Legacy

El host subyacente tambien soporta acciones de bajo nivel para compatibilidad
hacia atras:

| Accion     | Descripcion                           |
| ---------- | ------------------------------------- |
| `push`     | Enviar contenido HTML/JS crudo        |
| `eval`     | Ejecutar JavaScript en el sandbox     |
| `reset`    | Limpiar todo el contenido             |
| `snapshot` | Capturar como imagen                  |

## Casos de Uso

El Tide Pool esta disenado para escenarios donde el chat solo no es suficiente:

- **Dashboards** -- El agente construye un dashboard en vivo mostrando metricas
  de sus integraciones conectadas.
- **Visualizacion de Datos** -- Graficos y diagramas renderizados desde
  resultados de consultas.
- **Formularios e Inputs** -- Formularios interactivos para recoleccion de datos
  estructurados.
- **Vistas Previas de Codigo** -- Codigo con resaltado de sintaxis con
  resultados de ejecucion en vivo.
- **Medios Enriquecidos** -- Imagenes, mapas y contenido incrustado.
- **Edicion Colaborativa** -- El agente presenta un documento para que usted
  revise y anote.

## Como Funciona

1. Usted le pide al agente que visualice algo (o el agente decide que una
   respuesta visual es apropiada).
2. El agente usa la accion `push` para enviar HTML y JavaScript al Tide Pool.
3. El Host de Tide Pool del Gateway recibe el contenido y lo retransmite a los
   clientes conectados.
4. El renderizador muestra el contenido en tiempo real.
5. El agente puede usar `eval` para hacer actualizaciones incrementales sin
   reemplazar toda la vista.
6. Cuando el contexto cambia, el agente usa `reset` para limpiar el workspace.

## Integracion de Seguridad

El contenido del Tide Pool esta sujeto al mismo cumplimiento de seguridad que
cualquier otra salida:

- **Hook PRE_OUTPUT** -- Todo el contenido enviado al Tide Pool pasa por el hook
  de cumplimiento PRE_OUTPUT antes del renderizado. Los datos clasificados que
  violan la politica de salida son bloqueados.
- **Taint de sesion** -- El contenido renderizado hereda el nivel de taint de la
  sesion. Un Tide Pool mostrando datos `CONFIDENTIAL` es en si mismo
  `CONFIDENTIAL`.
- **Clasificacion de snapshots** -- Los snapshots de Tide Pool se clasifican al
  nivel de taint de la sesion en el momento de la captura.
- **Sandboxing de JavaScript** -- El JavaScript ejecutado via `eval` esta
  sandboxeado dentro del contexto del Tide Pool. No tiene acceso al sistema
  host, red o sistema de archivos.
- **Sin acceso a red** -- El runtime de Tide Pool no puede hacer solicitudes de
  red. Todos los datos fluyen a traves del agente y la capa de politicas.

## Indicadores de Estado

La interfaz web de Tidepool incluye indicadores de estado en tiempo real:

### Barra de Longitud de Contexto

Una barra de progreso estilizada que muestra el uso de la ventana de contexto --
cuanto de la ventana de contexto del LLM se ha consumido. La barra se actualiza
despues de cada mensaje y despues de la compactacion.

### Estado de Servidores MCP

Muestra el estado de conexion de los servidores MCP configurados (ej., "MCP
3/3"). Codificado por colores: verde para todos conectados, amarillo para
parcial, rojo para ninguno.

### Entrada Segura de Secretos

Cuando el agente necesita que ingrese un secreto (via la herramienta
`secret_save`), Tidepool muestra un popup de entrada segura. El valor ingresado
va directamente al keychain -- nunca se envia a traves del chat ni es visible en
el historial de conversacion.

::: tip Piense en el Tide Pool como la pizarra del agente. Mientras que el chat
es como usted habla con el agente, el Tide Pool es donde el agente le muestra
cosas. :::
