---
title: Inferencia de IA en flujos de trabajo de producción
description: Cómo Triggerfish salva la brecha entre las demos de IA y los flujos de trabajo duraderos de producción con aplicación de seguridad, trazas de auditoría y orquestación de flujos de trabajo.
---

# Integración de inferencia de IA/ML en flujos de trabajo de producción

La mayoría de los proyectos de IA empresarial mueren en la brecha entre la demo y la producción. Un equipo construye una prueba de concepto que usa GPT-4 para clasificar tickets de soporte, resumir documentos legales o generar contenido de marketing. La demo funciona. La dirección se entusiasma. Luego el proyecto se estanca durante meses intentando responder preguntas que la demo nunca tuvo que hacerse: ¿De dónde vienen los datos? ¿A dónde va la salida? ¿Quién aprueba las decisiones de la IA? ¿Qué pasa cuando el modelo alucina? ¿Cómo auditamos lo que hizo? ¿Cómo evitamos que acceda a datos que no debería ver? ¿Cómo evitamos que envíe información sensible al lugar equivocado?

Estas no son preocupaciones hipotéticas. El 95% de los pilotos de IA generativa empresarial fracasan en generar retornos financieros, y la razón no es que la tecnología no funcione. Los modelos son capaces. El fracaso está en la fontanería: integrar la inferencia de IA de forma confiable en los flujos de trabajo de negocio reales donde necesita operar, con los controles de seguridad, el manejo de errores y las trazas de auditoría que los sistemas de producción requieren.

La respuesta empresarial típica es construir una capa de integración personalizada. Un equipo de ingeniería pasa meses conectando el modelo de IA a las fuentes de datos, construyendo el pipeline, agregando autenticación, implementando registro, creando un flujo de trabajo de aprobación y agregando verificaciones de seguridad. Para cuando la integración está "lista para producción", el modelo original ha sido superado por uno más nuevo, los requerimientos de negocio han cambiado y el equipo necesita empezar de nuevo.

## Cómo Triggerfish lo resuelve

Triggerfish elimina la brecha de integración haciendo de la inferencia de IA un paso de primera clase en el motor de flujos de trabajo, gobernado por la misma aplicación de seguridad, registro de auditoría y controles de clasificación que se aplican a todas las demás operaciones del sistema. Un paso de subagente LLM en un flujo de trabajo de Triggerfish no es un agregado. Es una operación nativa con los mismos hooks de política, seguimiento de linaje y prevención de escritura descendente que una llamada HTTP o una consulta de base de datos.

### La IA como paso de flujo de trabajo, no como sistema separado

En el DSL de flujos de trabajo, un paso de inferencia LLM se define con `call: triggerfish:llm`. La descripción de la tarea le dice al subagente qué hacer en lenguaje natural. El subagente tiene acceso a todas las herramientas registradas en Triggerfish. Puede buscar en la web, consultar bases de datos a través de herramientas MCP, leer documentos, navegar por sitios web y usar memoria entre sesiones. Cuando el paso se completa, su salida alimenta directamente el siguiente paso del flujo de trabajo.

Esto significa que no hay un "sistema de IA" separado que integrar. La inferencia ocurre dentro del flujo de trabajo, usando las mismas credenciales, las mismas conexiones de datos y la misma aplicación de seguridad que todo lo demás. Un equipo de ingeniería no necesita construir una capa de integración personalizada porque la capa de integración ya existe.

### Seguridad que no requiere ingeniería personalizada

La parte que más tiempo consume al llevar a producción un flujo de trabajo de IA no es la IA. Es el trabajo de seguridad y cumplimiento. ¿Qué datos puede ver el modelo? ¿A dónde puede enviar su salida? ¿Cómo evitamos que filtre información sensible? ¿Cómo registramos todo para la auditoría?

En Triggerfish, estas preguntas las responde la arquitectura de la plataforma, no la ingeniería por proyecto. El sistema de clasificación rastrea la sensibilidad de los datos en cada frontera. El taint de sesión escala cuando el modelo accede a datos clasificados. La prevención de escritura descendente bloquea que la salida fluya a un canal clasificado por debajo del nivel de taint de la sesión. Cada llamada a herramienta, cada acceso a datos y cada decisión de salida se registra con linaje completo.

Un flujo de trabajo de IA que lee registros de clientes (CONFIDENTIAL) y genera un resumen no puede enviar ese resumen a un canal público de Slack. Esto no se aplica mediante una instrucción de prompt que el modelo podría ignorar. Se aplica mediante código determinista en el hook PRE_OUTPUT que el modelo no puede ver, no puede modificar y no puede eludir. Los hooks de política se ejecutan por debajo de la capa LLM. El LLM solicita una acción, y la capa de política decide si permitirla. El tiempo de espera equivale al rechazo. No hay camino desde el modelo al exterior que no pase por la aplicación.

### Trazas de auditoría que ya existen

Cada decisión de IA en un flujo de trabajo de Triggerfish genera registros de linaje automáticamente. El linaje rastrea a qué datos accedió el modelo, qué nivel de clasificación llevaban, qué transformaciones se aplicaron y a dónde se envió la salida. Esto no es una función de registro que necesita habilitarse o configurarse. Es una propiedad estructural de la plataforma. Cada elemento de datos lleva metadatos de procedencia desde la creación a través de cada transformación hasta su destino final.

Para las industrias reguladas, esto significa que las evidencias de cumplimiento para un flujo de trabajo de IA existen desde el primer día. Un auditor puede rastrear cualquier salida generada por IA a través de la cadena completa: qué modelo la produjo, en qué datos se basó, qué herramientas usó el modelo durante el razonamiento, qué nivel de clasificación se aplicó en cada paso y si ocurrieron acciones de aplicación de políticas. Esta recopilación de evidencias ocurre automáticamente porque está integrada en los hooks de aplicación, no agregada como una capa de reportes.

### Flexibilidad de modelos sin re-arquitectura

Triggerfish soporta múltiples proveedores LLM a través de la interfaz LlmProvider: Anthropic, OpenAI, Google, modelos locales vía Ollama y OpenRouter para cualquier modelo enrutado. La selección de proveedor es configurable por agente con failover automático. Cuando un modelo mejor está disponible o un proveedor cambia su precio, el cambio ocurre a nivel de configuración sin tocar las definiciones de flujos de trabajo.

Esto aborda directamente el problema de "el proyecto está obsoleto antes de que se lance". Las definiciones de flujos de trabajo describen lo que la IA debe hacer, no qué modelo lo hace. Cambiar de GPT-4 a Claude a un modelo local ajustado cambia un valor de configuración. El flujo de trabajo, los controles de seguridad, las trazas de auditoría y los puntos de integración permanecen exactamente iguales.

### Cron, webhooks y ejecución impulsada por eventos

Los flujos de trabajo de IA que se ejecutan según un calendario o en respuesta a eventos no necesitan que un humano los inicie. El planificador soporta expresiones cron de cinco campos para flujos de trabajo recurrentes y puntos de acceso webhook para disparadores impulsados por eventos. Un flujo de trabajo de generación de reportes diario se ejecuta a las 6h. Un flujo de trabajo de clasificación de documentos se activa cuando llega un nuevo archivo por webhook. Un flujo de trabajo de análisis de sentimiento se activa en cada nuevo ticket de soporte.

Cada ejecución programada o disparada por eventos instancia una sesión aislada con taint nuevo. El flujo de trabajo se ejecuta en su propio contexto de seguridad, independiente de cualquier sesión interactiva. Si el flujo de trabajo disparado por cron accede a datos CONFIDENTIAL, solo el historial de esa ejecución se clasifica en CONFIDENTIAL. Otros flujos de trabajo programados que se ejecutan en clasificación PUBLIC no se ven afectados.

### Manejo de errores e intervención humana

Los flujos de trabajo de IA de producción necesitan manejar las fallas de forma controlada. El DSL de flujos de trabajo soporta `raise` para condiciones de error explícitas y semánticas try/catch a través del manejo de errores en las definiciones de tareas. Cuando un subagente LLM produce salida de baja confianza o encuentra una situación que no puede manejar, el flujo de trabajo puede enrutar a una cola de aprobación humana, enviar una notificación a través del servicio de notificaciones o tomar una acción de respaldo.

El servicio de notificaciones entrega alertas en todos los canales conectados con prioridad y deduplicación. Si un flujo de trabajo necesita aprobación humana antes de que se envíe una enmienda de contrato generada por IA, la solicitud de aprobación puede llegar a Slack, WhatsApp, correo electrónico o donde sea que esté el aprobador. El flujo de trabajo se pausa hasta que llega la aprobación, luego continúa desde donde lo dejó.

## Cómo se ve esto en la práctica

Un departamento legal quiere automatizar la revisión de contratos. El enfoque tradicional: seis meses de desarrollo personalizado para construir un pipeline que extrae cláusulas de contratos subidos, clasifica niveles de riesgo, señala términos no estándar y genera un resumen para el abogado revisor. El proyecto requiere un equipo de ingeniería dedicado, una revisión de seguridad personalizada, una aprobación de cumplimiento y mantenimiento continuo.

Con Triggerfish, la definición del flujo de trabajo tarda un día en escribirse. La subida activa un webhook. Un subagente LLM lee el contrato, extrae cláusulas clave, clasifica los niveles de riesgo e identifica términos no estándar. Un paso de validación verifica la extracción contra la biblioteca de cláusulas del estudio almacenada en memoria. El resumen se enruta al canal de notificación del abogado asignado. El pipeline completo se ejecuta en clasificación RESTRICTED porque los contratos contienen información privilegiada del cliente, y la prevención de escritura descendente garantiza que ningún dato de contrato se filtre a un canal por debajo de RESTRICTED.

Cuando el estudio cambia de proveedor LLM (porque un nuevo modelo maneja mejor el lenguaje jurídico, o porque el proveedor actual sube sus precios), el cambio es una única línea en la configuración. La definición del flujo de trabajo, los controles de seguridad, la traza de auditoría y el enrutamiento de notificaciones continúan funcionando sin modificación. Cuando el estudio agrega un nuevo tipo de cláusula a su marco de riesgo, el subagente LLM lo incorpora sin reescribir las reglas de extracción porque lee por significado, no por patrones.

El equipo de cumplimiento obtiene una traza de auditoría completa desde el primer día. Cada contrato procesado, cada cláusula extraída, cada clasificación de riesgo asignada, cada notificación enviada y cada aprobación de abogado registrada, con linaje completo hasta el documento de origen. La recopilación de evidencias que hubiera requerido semanas de trabajo de reportes personalizados existe automáticamente como propiedad estructural de la plataforma.
