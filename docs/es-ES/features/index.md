# Descripción general de funcionalidades

Más allá de su [modelo de seguridad](/es-ES/security/) y [soporte de canales](/es-ES/channels/),
Triggerfish proporciona capacidades que extienden su agente de IA más allá del
formato pregunta-respuesta: tareas programadas, memoria persistente, acceso web,
entrada de voz y failover multimodelo.

## Comportamiento proactivo

### [Cron y triggers](./cron-and-triggers)

Programe tareas recurrentes con expresiones cron estándar y defina
comportamientos de monitorización proactiva a través de `TRIGGER.md`. Su agente
puede preparar informes matutinos, comprobar pipelines, monitorizar mensajes sin
leer y actuar de forma autónoma según un horario configurable, todo con
aplicación de clasificación y sesiones aisladas.

### [Notificaciones](./notifications)

Un servicio de entrega de notificaciones que enruta mensajes a través de todos
los canales conectados con niveles de prioridad, cola offline y deduplicación.
Reemplaza patrones de notificación ad-hoc con una abstracción unificada.

## Herramientas del agente

### [Búsqueda y obtención web](./web-search)

Busque en la web y obtenga contenido de páginas. El agente usa `web_search` para
encontrar información y `web_fetch` para leer páginas web, con prevención de
SSRF y aplicación de políticas en todas las solicitudes salientes.

### [Memoria persistente](./memory)

Memoria entre sesiones con control de clasificación. El agente guarda y recuerda
hechos, preferencias y contexto entre conversaciones. La clasificación de la
memoria se fuerza al taint de sesión; el LLM no puede elegir el nivel.

### [Análisis de imagen y visión](./image-vision)

Pegue imágenes del portapapeles (Ctrl+V en CLI, pegado en navegador en Tidepool)
y analice archivos de imagen en disco. Configure un modelo de visión separado
para describir imágenes automáticamente cuando el modelo principal no admita
visión.

### [Exploración de código](./explore)

Comprensión estructurada del código mediante sub-agentes paralelos. La
herramienta `explore` mapea árboles de directorios, detecta patrones de código,
rastrea imports y analiza el historial de git, todo de forma concurrente.

### [Gestión de sesiones](./sessions)

Inspeccione, comuníquese con y cree sesiones. El agente puede delegar tareas en
segundo plano, enviar mensajes entre sesiones y comunicarse a través de canales,
todo bajo la aplicación de escritura descendente.

### [Modo plan y seguimiento de tareas](./planning)

Planificación estructurada antes de la implementación (modo plan) y seguimiento
de tareas persistente (todos) entre sesiones. El modo plan restringe al agente a
exploración de solo lectura hasta que el usuario apruebe el plan.

### [Sistema de archivos y shell](./filesystem)

Lea, escriba, busque y ejecute comandos. Las herramientas fundamentales para
operaciones de archivo, con alcance de workspace y aplicación de lista de
denegación de comandos.

### [Sub-agentes y tareas LLM](./subagents)

Delegue trabajo a sub-agentes autónomos o ejecute prompts LLM aislados para
resumen, clasificación y razonamiento enfocado sin contaminar la conversación
principal.

### [Equipos de agentes](./agent-teams)

Cree equipos persistentes de agentes colaboradores con roles especializados. Un
líder coordina a los miembros que se comunican de forma autónoma mediante
mensajería entre sesiones. Incluye monitorización del ciclo de vida con tiempos
de espera de inactividad, límites de vida útil y comprobaciones de salud. Ideal
para tareas complejas que se benefician de múltiples perspectivas que iteran
sobre el trabajo de los demás.

## Interacción enriquecida

### [Pipeline de voz](./voice)

Soporte completo de voz con proveedores STT y TTS configurables. Use Whisper
para transcripción local, Deepgram u OpenAI para STT en la nube, y ElevenLabs u
OpenAI para texto a voz. La entrada de voz pasa por la misma clasificación y
aplicación de políticas que el texto.

### [Tide Pool / A2UI](./tidepool)

Un workspace visual controlado por el agente donde Triggerfish renderiza
contenido interactivo: paneles, gráficos, formularios y previsualizaciones de
código. El protocolo A2UI (Agent-to-UI) envía actualizaciones en tiempo real
desde el agente a los clientes conectados.

## Multiagente y multimodelo

### [Enrutamiento multiagente](./multi-agent)

Enrute diferentes canales, cuentas o contactos a agentes aislados separados,
cada uno con su propio SPINE.md, workspace, skills y techo de clasificación. Su
Slack de trabajo va a un agente; su WhatsApp personal va a otro.

### [Proveedores LLM y failover](./model-failover)

Conéctese a Anthropic, OpenAI, Google, modelos locales (Ollama) u OpenRouter.
Configure cadenas de failover para que su agente cambie automáticamente a un
proveedor alternativo cuando uno no esté disponible. Cada agente puede usar un
modelo diferente.

### [Limitación de tasa](./rate-limiting)

Limitador de tasa con ventana deslizante que previene alcanzar los límites de
API de los proveedores LLM. Rastrea tokens por minuto y solicitudes por minuto,
retrasa llamadas cuando la capacidad se agota e integra con la cadena de
failover.

## Operaciones

### [Registro estructurado](./logging)

Registro estructurado unificado con niveles de severidad, rotación de archivos
y salida dual a stderr y archivo. Líneas de registro etiquetadas por componente,
rotación automática de 1 MB y herramienta `log_read` para acceder al historial
de registros.

::: info Todas las funcionalidades se integran con el modelo de seguridad
central. Los trabajos cron respetan los techos de clasificación. La entrada de
voz lleva taint. El contenido de Tide Pool pasa por el hook PRE_OUTPUT. El
enrutamiento multiagente aplica aislamiento de sesiones. Ninguna funcionalidad
elude la capa de políticas. :::
