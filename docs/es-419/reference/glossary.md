# Glosario

| Termino                      | Definicion                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**               | Un grupo persistente de sesiones de agentes colaboradores con roles distintos. Un miembro es el lider que coordina el trabajo. Se crea via `team_create`, se monitorea con verificaciones de ciclo de vida. |
| **A2UI**                     | Protocolo Agent-to-UI para enviar contenido visual desde el agente al workspace de Tide Pool en tiempo real.                                                      |
| **Background Session**       | Una sesion generada para tareas autonomas (cron, triggers) que comienza con taint PUBLIC fresco y se ejecuta en un workspace aislado.                              |
| **Buoy**                     | Una app nativa companera (iOS, Android) que proporciona capacidades del dispositivo como camara, ubicacion, grabacion de pantalla y notificaciones push al agente. (Proximamente.) |
| **Classification**           | Una etiqueta de sensibilidad asignada a datos, canales y destinatarios. Cuatro niveles: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                               |
| **Cron**                     | Una tarea recurrente programada ejecutada por el agente a una hora especificada usando sintaxis estandar de expresiones cron.                                      |
| **Dive**                     | El asistente de configuracion inicial (`triggerfish dive`) que genera `triggerfish.yaml`, SPINE.md y la configuracion inicial.                                     |
| **Effective Classification** | El nivel de clasificacion usado para decisiones de salida, calculado como `min(clasificacion_canal, clasificacion_destinatario)`.                                 |
| **Exec Environment**         | El workspace de codigo del agente para escribir, ejecutar y depurar codigo en un ciclo rapido escribir-ejecutar-corregir, distinto del Plugin Sandbox.             |
| **Failover**                 | Cambio automatico a un proveedor LLM alternativo cuando el proveedor actual no esta disponible debido a limitacion de tasa, errores de servidor o timeouts.       |
| **Gateway**                  | El plano de control local de larga duracion que administra sesiones, canales, herramientas, eventos y procesos del agente a traves de un endpoint WebSocket JSON-RPC. |
| **Hook**                     | Un punto de cumplimiento deterministico en el flujo de datos donde el motor de politicas evalua reglas y decide si permitir, bloquear o redactar una accion.      |
| **Lineage**                  | Metadatos de procedencia que rastrean el origen, transformaciones y ubicacion actual de cada elemento de datos procesado por Triggerfish.                          |
| **LlmProvider**              | La interfaz para completaciones LLM, implementada por cada proveedor soportado (Anthropic, OpenAI, Google, Local, OpenRouter).                                   |
| **MCP**                      | Model Context Protocol, un estandar para comunicacion agente-herramienta. El MCP Gateway de Triggerfish agrega controles de clasificacion a cualquier servidor MCP. |
| **No Write-Down**            | La regla fija y no configurable de que los datos solo pueden fluir a canales o destinatarios en un nivel de clasificacion igual o superior.                        |
| **NotificationService**      | La abstraccion unificada para entregar notificaciones al propietario a traves de todos los canales conectados con prioridad, encolamiento y deduplicacion.         |
| **Patrol**                   | El comando de verificacion de salud diagnostica (`triggerfish patrol`) que verifica el gateway, proveedores LLM, canales y configuracion de politicas.            |
| **Reef (The)**               | El marketplace comunitario de skills para descubrir, instalar, publicar y administrar skills de Triggerfish.                                                      |
| **Ripple**                   | Indicadores de escritura en tiempo real y senales de estado en linea transmitidas entre canales donde se soporta.                                                 |
| **Session**                  | La unidad fundamental de estado de conversacion con seguimiento de taint independiente. Cada sesion tiene un ID unico, usuario, canal, nivel de taint e historial. |
| **Skill**                    | Una carpeta que contiene un archivo `SKILL.md` y archivos de soporte opcionales que dan al agente nuevas capacidades sin escribir plugins.                        |
| **SPINE.md**                 | El archivo de identidad y mision del agente cargado como fundamento del system prompt. Define personalidad, reglas y limites. El equivalente de CLAUDE.md en Triggerfish. |
| **StorageProvider**          | La abstraccion de persistencia unificada (interfaz clave-valor) a traves de la cual fluyen todos los datos con estado. Las implementaciones incluyen Memory, SQLite y backends enterprise. |
| **Taint**                    | El nivel de clasificacion adjunto a una sesion basado en los datos que ha accedido. El taint solo puede escalar dentro de una sesion, nunca disminuir.             |
| **Tide Pool**                | Un workspace visual controlado por el agente donde Triggerfish renderiza contenido interactivo (dashboards, graficos, formularios) usando el protocolo A2UI.      |
| **TRIGGER.md**               | El archivo de definicion de comportamiento proactivo del agente, especificando que verificar, monitorear y actuar durante despertares periodicos de triggers.     |
| **Webhook**                  | Un endpoint HTTP entrante que acepta eventos de servicios externos (GitHub, Sentry, etc.) y dispara acciones del agente.                                          |
| **Team Lead**                | El coordinador designado en un equipo de agentes. Recibe el objetivo del equipo, descompone el trabajo, asigna tareas a miembros y decide cuando el equipo ha terminado. |
| **Workspace**                | Un directorio de sistema de archivos por agente donde el agente escribe y ejecuta su propio codigo, aislado de otros agentes.                                     |
| **Write-Down**               | El flujo prohibido de datos de un nivel de clasificacion superior a uno inferior (ej., datos CONFIDENTIAL enviados a un canal PUBLIC).                             |
