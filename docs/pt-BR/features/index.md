# Resumen de Funcionalidades

Mas alla de su [modelo de seguridad](/pt-BR/security/) y [soporte de canales](/pt-BR/channels/),
Triggerfish ofrece capacidades que extienden a su agente de IA mas alla de
preguntas y respuestas: tareas programadas, memoria persistente, acceso web,
entrada por voz y failover multi-modelo.

## Comportamiento Proactivo

### [Cron y Triggers](./cron-and-triggers)

Programe tareas recurrentes con expresiones cron estandar y defina
comportamiento de monitoreo proactivo a traves de `TRIGGER.md`. Su agente puede
entregar briefings matutinos, verificar pipelines, monitorear mensajes no leidos
y actuar de forma autonoma en un horario configurable -- todo con cumplimiento
de clasificacion y sesiones aisladas.

### [Notificaciones](./notifications)

Un servicio de entrega de notificaciones que enruta mensajes a traves de todos
los canales conectados con niveles de prioridad, encolamiento offline y
deduplicacion. Reemplaza patrones ad-hoc de notificacion con una abstraccion
unificada.

## Herramientas del Agente

### [Busqueda Web y Fetch](./web-search)

Busque en la web y obtenga contenido de paginas. El agente usa `web_search` para
encontrar informacion y `web_fetch` para leer paginas web, con prevencion SSRF y
cumplimiento de politicas en todas las solicitudes salientes.

### [Memoria Persistente](./memory)

Memoria entre sesiones con control de clasificacion. El agente guarda y recuerda
datos, preferencias y contexto entre conversaciones. La clasificacion de la
memoria se fuerza al nivel de taint de la sesion -- el LLM no puede elegir el
nivel.

### [Analisis de Imagenes y Vision](./image-vision)

Pegue imagenes desde su portapapeles (Ctrl+V en CLI, pegado en navegador en
Tidepool) y analice archivos de imagen en disco. Configure un modelo de vision
separado para describir imagenes automaticamente cuando el modelo principal no
soporta vision.

### [Exploracion de Codigo](./explore)

Comprension estructurada de codebases mediante sub-agentes paralelos. La
herramienta `explore` mapea arboles de directorios, detecta patrones de codigo,
rastrea imports y analiza historial git -- todo de forma concurrente.

### [Gestion de Sesiones](./sessions)

Inspeccione, comuniquese con y genere sesiones. El agente puede delegar tareas
en segundo plano, enviar mensajes entre sesiones y comunicarse a traves de
canales -- todo bajo cumplimiento de write-down.

### [Modo Plan y Seguimiento de Tareas](./planning)

Planificacion estructurada antes de la implementacion (modo plan) y seguimiento
persistente de tareas (todos) entre sesiones. El modo plan restringe al agente a
exploracion de solo lectura hasta que el usuario apruebe el plan.

### [Sistema de Archivos y Shell](./filesystem)

Lea, escriba, busque y ejecute comandos. Las herramientas fundamentales para
operaciones de archivos, con alcance de workspace y cumplimiento de lista de
denegacion de comandos.

### [Sub-Agentes y Tareas LLM](./subagents)

Delegue trabajo a sub-agentes autonomos o ejecute prompts LLM aislados para
resumen, clasificacion y razonamiento enfocado sin contaminar la conversacion
principal.

### [Equipos de Agentes](./agent-teams)

Genere equipos persistentes de agentes colaboradores con roles especializados. Un
lider coordina a los miembros que se comunican de forma autonoma mediante
mensajeria entre sesiones. Incluye monitoreo de ciclo de vida con timeouts de
inactividad, limites de duracion y verificaciones de salud. Ideal para tareas
complejas que se benefician de multiples perspectivas iterando sobre el trabajo
de los demas.

## Interaccion Enriquecida

### [Pipeline de Voz](./voice)

Soporte completo de voz con proveedores STT y TTS configurables. Use Whisper
para transcripcion local, Deepgram u OpenAI para STT en la nube, y ElevenLabs u
OpenAI para texto a voz. La entrada de voz pasa por el mismo cumplimiento de
clasificacion y politicas que el texto.

### [Tide Pool / A2UI](./tidepool)

Un espacio de trabajo visual controlado por el agente donde Triggerfish renderiza
contenido interactivo -- dashboards, graficos, formularios y vistas previas de
codigo. El protocolo A2UI (Agent-to-UI) envia actualizaciones en tiempo real
desde el agente a los clientes conectados.

## Multi-Agente y Multi-Modelo

### [Enrutamiento Multi-Agente](./multi-agent)

Dirija diferentes canales, cuentas o contactos a agentes aislados separados,
cada uno con su propio SPINE.md, workspace, skills y techo de clasificacion. Su
Slack de trabajo va a un agente; su WhatsApp personal va a otro.

### [Proveedores LLM y Failover](./model-failover)

Conectese a Anthropic, OpenAI, Google, modelos locales (Ollama) u OpenRouter.
Configure cadenas de failover para que su agente cambie automaticamente a un
proveedor alternativo cuando uno no este disponible. Cada agente puede usar un
modelo diferente.

### [Limitacion de Tasa](./rate-limiting)

Limitador de tasa con ventana deslizante que previene alcanzar los limites de API
de proveedores LLM. Rastrea tokens por minuto y solicitudes por minuto, retrasa
llamadas cuando la capacidad se agota e se integra con la cadena de failover.

## Operaciones

### [Logging Estructurado](./logging)

Logging estructurado unificado con niveles de severidad, rotacion de archivos y
salida dual a stderr y archivo. Lineas de log etiquetadas por componente,
rotacion automatica de 1 MB y una herramienta `log_read` para acceder al
historial de logs.

::: info Todas las funcionalidades se integran con el modelo de seguridad
central. Los cron jobs respetan los techos de clasificacion. La entrada de voz
lleva taint. El contenido de Tide Pool pasa por el hook PRE_OUTPUT. El
enrutamiento multi-agente aplica aislamiento de sesiones. Ninguna funcionalidad
evade la capa de politicas. :::
