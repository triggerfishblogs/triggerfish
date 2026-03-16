---
title: Orquestación multisistema
description: Cómo Triggerfish gestiona flujos de trabajo que abarcan más de 12 sistemas con decisiones contextuales en cada paso, sin la fragilidad que destruye la automatización tradicional.
---

# Orquestación multisistema con toma de decisiones

Un flujo de trabajo típico de procure-to-pay toca una docena de sistemas. Una solicitud de compra comienza en una plataforma, se enruta a una cadena de aprobación en otra, activa una búsqueda de proveedor en una tercera, crea una orden de compra en una cuarta, inicia un proceso de recepción en una quinta, concilia facturas en una sexta, programa el pago en una séptima y registra todo en una octava. Cada sistema tiene su propia API, su propio calendario de actualización, su propio modelo de autenticación y sus propios modos de fallo.

La automatización tradicional gestiona esto con pipelines rígidos. El paso uno llama a la API A, analiza la respuesta, pasa un campo al paso dos, que llama a la API B. Funciona hasta que deja de funcionar. Un registro de proveedor tiene un formato ligeramente diferente al esperado. Una aprobación regresa con un código de estado para el que el pipeline no fue diseñado. Aparece un nuevo campo obligatorio en una actualización de API. Un paso roto rompe toda la cadena, y nadie lo sabe hasta que un proceso posterior falla días más tarde.

El problema más profundo no es la fragilidad técnica. Es que los procesos de negocio reales requieren criterio. ¿Debe escalarse esta discrepancia de factura o resolverse automáticamente? ¿El patrón de entregas tardías de este proveedor justifica una revisión del contrato? ¿Es esta solicitud de aprobación lo suficientemente urgente como para saltarse el enrutamiento estándar? Estas decisiones viven actualmente en la cabeza de las personas, lo que significa que la automatización solo puede gestionar el camino feliz.

## Cómo Triggerfish lo resuelve

El motor de flujos de trabajo de Triggerfish ejecuta definiciones de flujos de trabajo en YAML que mezclan automatización determinista con razonamiento IA en un único pipeline. Cada paso del flujo de trabajo pasa por la misma capa de aplicación de seguridad que gobierna todas las operaciones de Triggerfish, de modo que el seguimiento de clasificación y las trazas de auditoría se mantienen en toda la cadena independientemente de cuántos sistemas estén implicados.

### Pasos deterministas para trabajo determinista

Cuando un paso del flujo de trabajo tiene una entrada conocida y una salida conocida, se ejecuta como una llamada HTTP estándar, comando de shell o invocación de herramienta MCP. Sin implicación del LLM, sin penalización de latencia, sin coste de inferencia. El motor de flujos de trabajo soporta `call: http` para APIs REST, `call: triggerfish:mcp` para cualquier servidor MCP conectado, y `run: shell` para herramientas de línea de comandos. Estos pasos se ejecutan exactamente como la automatización tradicional, porque para el trabajo predecible, la automatización tradicional es el enfoque correcto.

### Subagentes LLM para la toma de decisiones

Cuando un paso del flujo de trabajo requiere razonamiento contextual, el motor instancia una sesión real de subagente LLM con `call: triggerfish:llm`. Esto no es un único par prompt/respuesta. El subagente tiene acceso a todas las herramientas registradas en Triggerfish, incluyendo búsqueda web, memoria, automatización del navegador y todas las integraciones conectadas. Puede leer documentos, consultar bases de datos, comparar registros y tomar una decisión basada en todo lo que encuentra.

La salida del subagente alimenta directamente el siguiente paso del flujo de trabajo. Si accedió a datos clasificados durante su razonamiento, el taint de sesión escala automáticamente y se propaga de vuelta al flujo de trabajo padre. El motor de flujos de trabajo lo rastrea, de modo que un flujo de trabajo que comenzó en PUBLIC pero tocó datos CONFIDENTIAL durante una toma de decisiones tiene todo su historial de ejecución almacenado en el nivel CONFIDENTIAL. Una sesión con menor clasificación ni siquiera puede ver que el flujo de trabajo se ejecutó.

### Ramificación condicional basada en contexto real

El DSL de flujos de trabajo soporta bloques `switch` para enrutamiento condicional, bucles `for` para procesamiento por lotes y operaciones `set` para actualizar el estado del flujo de trabajo. Combinado con pasos de subagente LLM que pueden evaluar condiciones complejas, esto significa que el flujo de trabajo puede ramificarse según el contexto empresarial real en lugar de simplemente los valores de los campos.

Un flujo de trabajo de adquisición puede enrutarse de forma diferente según la evaluación del riesgo del proveedor por el subagente. Un flujo de trabajo de incorporación puede omitir pasos que no son relevantes para un rol particular. Un flujo de trabajo de respuesta a incidentes puede escalar a diferentes equipos según el análisis de causa raíz del subagente. La lógica de ramificación vive en la definición del flujo de trabajo, pero las entradas de decisión provienen del razonamiento IA.

### Autocorrección cuando los sistemas cambian

Cuando un paso determinista falla porque una API cambió su formato de respuesta o un sistema devolvió un error inesperado, el flujo de trabajo no se detiene simplemente. El motor puede delegar el paso fallido a un subagente LLM que lee el error, inspecciona la respuesta e intenta un enfoque alternativo. Una API que añadió un nuevo campo obligatorio es gestionada por el subagente que lee el mensaje de error y ajusta la solicitud. Un sistema que cambió su flujo de autenticación es navegado por las herramientas de automatización del navegador.

Esto no significa que cada fallo se resuelva mágicamente. Pero significa que el flujo de trabajo degrada de forma controlada en lugar de fallar silenciosamente. El subagente encuentra un camino hacia adelante o produce una explicación clara de qué cambió y por qué se necesita intervención manual, en lugar de un código de error críptico enterrado en un archivo de registro que nadie revisa.

### Seguridad a lo largo de toda la cadena

Cada paso de un flujo de trabajo de Triggerfish pasa por los mismos hooks de aplicación de políticas que cualquier llamada directa a herramienta. PRE_TOOL_CALL valida permisos y comprueba límites de velocidad antes de la ejecución. POST_TOOL_RESPONSE clasifica los datos devueltos y actualiza el taint de sesión. PRE_OUTPUT garantiza que nada salga del sistema a un nivel de clasificación superior al que el destino permite.

Esto significa que un flujo de trabajo que lee de su CRM (CONFIDENTIAL), procesa los datos a través de un LLM y envía un resumen a Slack no filtra accidentalmente detalles confidenciales a un canal público. La regla de prevención de escritura descendente lo atrapa en el hook PRE_OUTPUT, independientemente de cuántos pasos intermedios hayan atravesado los datos. La clasificación viaja con los datos a través de todo el flujo de trabajo.

La propia definición del flujo de trabajo puede establecer un `classification_ceiling` que impide que el flujo de trabajo toque nunca datos por encima de un nivel especificado. Un flujo de trabajo de resumen semanal clasificado en INTERNAL no puede acceder a datos CONFIDENTIAL aunque tenga las credenciales para hacerlo. El límite se aplica en código, no esperando que el LLM respete una instrucción del prompt.

### Disparadores cron y webhook

Los flujos de trabajo no requieren que alguien los inicie manualmente. El planificador soporta disparadores basados en cron para flujos de trabajo recurrentes y disparadores webhook para ejecución impulsada por eventos. Un flujo de trabajo de briefing matutino se ejecuta a las 7h. Un flujo de trabajo de revisión de PR se activa cuando GitHub envía un webhook. Un flujo de trabajo de procesamiento de facturas se activa cuando aparece un nuevo archivo en una unidad compartida.

Los eventos webhook llevan su propio nivel de clasificación. Un webhook de GitHub para un repositorio privado se clasifica automáticamente en CONFIDENTIAL basándose en los mapeos de clasificación de dominio de la configuración de seguridad. El flujo de trabajo hereda esa clasificación y se aplica toda la aplicación posterior.

## Cómo se ve esto en la práctica

Una empresa mediana que ejecuta procure-to-pay en NetSuite, Coupa, DocuSign y Slack define un flujo de trabajo de Triggerfish que gestiona el ciclo completo. Los pasos deterministas gestionan las llamadas API para crear órdenes de compra, enrutar aprobaciones y conciliar facturas. Los pasos de subagente LLM gestionan las excepciones: facturas con líneas que no coinciden con el pedido de compra, proveedores que enviaron documentación en un formato inesperado, solicitudes de aprobación que necesitan contexto sobre el historial del solicitante.

El flujo de trabajo se ejecuta en una instancia de Triggerfish autohospedada. Ningún dato sale de la infraestructura de la empresa. El sistema de clasificación garantiza que los datos financieros de NetSuite permanezcan en CONFIDENTIAL y no puedan enviarse a un canal de Slack clasificado en INTERNAL. La traza de auditoría captura cada decisión que tomó el subagente LLM, cada herramienta que llamó y cada dato al que accedió, almacenado con seguimiento completo de linaje para revisión de cumplimiento.

Cuando Coupa actualiza su API y cambia un nombre de campo, el paso HTTP determinista del flujo de trabajo falla. El motor delega a un subagente que lee el error, identifica el campo cambiado y reintenta con el parámetro correcto. El flujo de trabajo se completa sin intervención humana, y el incidente queda registrado para que un ingeniero actualice la definición del flujo de trabajo para gestionar el nuevo formato en adelante.
