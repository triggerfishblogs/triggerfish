# Glosario

| Término                        | Definición                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**                 | Un grupo persistente de sesiones de agente colaboradoras con roles distintos. Un miembro es el líder que coordina el trabajo. Creado vía `team_create`, monitorizado con comprobaciones de ciclo de vida. |
| **A2UI**                       | Protocolo Agent-to-UI para enviar contenido visual desde el agente al workspace del Tide Pool en tiempo real.                                                       |
| **Background Session**         | Una sesión creada para tareas autónomas (cron, triggers) que comienza con taint PUBLIC nuevo y se ejecuta en un workspace aislado.                                  |
| **Buoy**                       | Una app complementaria nativa (iOS, Android) que proporciona capacidades del dispositivo como cámara, ubicación, grabación de pantalla y notificaciones push al agente. (Próximamente.) |
| **Classification**             | Una etiqueta de sensibilidad asignada a datos, canales y destinatarios. Cuatro niveles: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                                 |
| **Cron**                       | Una tarea programada recurrente ejecutada por el agente a una hora especificada usando sintaxis estándar de expresiones cron.                                       |
| **Dive**                       | El asistente de configuración inicial (`triggerfish dive`) que genera `triggerfish.yaml`, SPINE.md y la configuración inicial.                                       |
| **Effective Classification**   | El nivel de clasificación usado para decisiones de salida, calculado como `min(clasificación_del_canal, clasificación_del_destinatario)`.                           |
| **Exec Environment**           | El workspace de código del agente para escribir, ejecutar y depurar código en un ciclo rápido de escritura-ejecución-corrección, distinto del Plugin Sandbox.       |
| **Failover**                   | Respaldo automático a un proveedor LLM alternativo cuando el proveedor actual no está disponible por límite de tasa, errores del servidor o timeouts.               |
| **Gateway**                    | El plano de control local de larga ejecución que gestiona sesiones, canales, herramientas, eventos y procesos de agente a través de un endpoint WebSocket JSON-RPC. |
| **Hook**                       | Un punto de aplicación determinista en el flujo de datos donde el motor de políticas evalúa reglas y decide si permitir, bloquear o redactar una acción.            |
| **Lineage**                    | Metadatos de procedencia que rastrean el origen, transformaciones y ubicación actual de cada elemento de datos procesado por Triggerfish.                            |
| **LlmProvider**                | La interfaz para completaciones LLM, implementada por cada proveedor soportado (Anthropic, OpenAI, Google, Local, OpenRouter).                                     |
| **MCP**                        | Model Context Protocol, un estándar para comunicación agente-herramienta. El MCP Gateway de Triggerfish añade controles de clasificación a cualquier servidor MCP.  |
| **No Write-Down**              | La regla fija y no configurable de que los datos solo pueden fluir a canales o destinatarios con nivel de clasificación igual o superior.                            |
| **NotificationService**        | La abstracción unificada para entregar notificaciones al propietario a través de todos los canales conectados con prioridad, cola y deduplicación.                  |
| **Patrol**                     | El comando de comprobación de salud diagnóstica (`triggerfish patrol`) que verifica el Gateway, proveedores LLM, canales y configuración de políticas.              |
| **Reef (The)**                 | El marketplace comunitario de skills para descubrir, instalar, publicar y gestionar skills de Triggerfish.                                                          |
| **Ripple**                     | Indicadores de escritura en tiempo real y señales de estado en línea retransmitidas a través de canales donde estén soportados.                                     |
| **Session**                    | La unidad fundamental de estado de conversación con seguimiento independiente de taint. Cada sesión tiene un ID único, usuario, canal, nivel de taint e historial.  |
| **Skill**                      | Una carpeta que contiene un archivo `SKILL.md` y archivos de soporte opcionales que otorgan nuevas capacidades al agente sin escribir plugins.                      |
| **SPINE.md**                   | El archivo de identidad y misión del agente cargado como base del prompt del sistema. Define personalidad, reglas y límites. El equivalente de Triggerfish a CLAUDE.md. |
| **StorageProvider**            | La abstracción unificada de persistencia (interfaz clave-valor) a través de la cual fluyen todos los datos con estado. Las implementaciones incluyen Memory, SQLite y backends empresariales. |
| **Taint**                      | El nivel de clasificación asociado a una sesión basado en los datos a los que ha accedido. El taint solo puede escalar dentro de una sesión, nunca disminuir.       |
| **Tide Pool**                  | Un workspace visual controlado por el agente donde Triggerfish renderiza contenido interactivo (paneles, gráficos, formularios) usando el protocolo A2UI.          |
| **TRIGGER.md**                 | El archivo de definición de comportamiento proactivo del agente, que especifica qué comprobar, monitorizar y sobre qué actuar durante las activaciones periódicas de triggers. |
| **Webhook**                    | Un endpoint HTTP entrante que acepta eventos de servicios externos (GitHub, Sentry, etc.) y activa acciones del agente.                                             |
| **Team Lead**                  | El coordinador designado en un equipo de agentes. Recibe el objetivo del equipo, descompone el trabajo, asigna tareas a los miembros y decide cuándo el equipo ha terminado. |
| **Workspace**                  | Un directorio del sistema de archivos por agente donde el agente escribe y ejecuta su propio código, aislado de otros agentes.                                     |
| **Write-Down**                 | El flujo prohibido de datos de un nivel de clasificación superior a uno inferior (p. ej., datos CONFIDENTIAL enviados a un canal PUBLIC).                           |
