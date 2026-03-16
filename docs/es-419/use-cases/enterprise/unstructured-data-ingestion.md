---
title: Ingesta de datos no estructurados
description: Cómo Triggerfish maneja el procesamiento de facturas, la recepción de documentos y el análisis de correos electrónicos sin fallar cuando cambian los formatos de entrada.
---

# Ingesta de datos no estructurados y semiestructurados

El procesamiento de facturas debería ser un problema resuelto a estas alturas. Llega un documento, se extraen los campos, los datos se validan contra los registros existentes y el resultado se enruta al sistema correcto. La realidad es que solo el procesamiento de facturas le cuesta a las empresas miles de millones en mano de obra manual anualmente, y los proyectos de automatización destinados a solucionar esto se rompen constantemente.

La razón es la varianza de formato. Las facturas llegan como PDFs, adjuntos de correo electrónico, imágenes escaneadas, exportaciones de hojas de cálculo y ocasionalmente faxes. Cada proveedor usa un diseño diferente. Los ítems de línea aparecen en tablas, en texto libre o en una combinación de ambos. Los cálculos de impuestos siguen reglas diferentes según la jurisdicción. Los formatos de moneda varían. Los formatos de fecha varían. Incluso el mismo proveedor cambia su plantilla de factura sin previo aviso.

La RPA tradicional maneja esto con coincidencia de plantillas. Define las coordenadas donde aparece el número de factura, donde comienzan los ítems de línea, donde está el total. Funciona para la plantilla actual de un único proveedor. Luego el proveedor actualiza su sistema, desplaza una columna, agrega una fila de encabezado o cambia su generador de PDF, y el bot falla directamente o extrae datos incorrectos que se propagan aguas abajo hasta que alguien los detecta manualmente.

El mismo patrón se repite en todos los flujos de trabajo de datos no estructurados. El procesamiento de EOB de seguros falla cuando un pagador cambia el diseño de su formulario. La recepción de solicitudes de autorización previa falla cuando se agrega un nuevo tipo de documento al proceso. El análisis de correos electrónicos de clientes falla cuando alguien usa un formato de línea de asunto ligeramente diferente. El costo de mantenimiento para mantener estas automatizaciones funcionando frecuentemente supera el costo de hacer el trabajo manualmente.

## Cómo Triggerfish lo resuelve

Triggerfish reemplaza la extracción posicional de campos por la comprensión documental basada en LLM. La IA lee el documento como lo haría un humano: comprende el contexto, infiere relaciones entre campos y se adapta automáticamente a los cambios de diseño. Combinado con el motor de flujos de trabajo para la orquestación de pipelines y el sistema de clasificación para la seguridad de datos, esto crea pipelines de ingesta que no se rompen cuando el mundo cambia.

### Análisis documental impulsado por LLM

Cuando un documento entra en un flujo de trabajo de Triggerfish, un subagente LLM lee el documento completo y extrae datos estructurados basándose en lo que el documento significa, no en dónde están píxeles específicos. Un número de factura es un número de factura ya sea que esté en la esquina superior derecha etiquetado como "Invoice #" o en el centro de la página etiquetado como "Factura No." o integrado en un párrafo de texto. El LLM entiende que "Neto 30" significa condiciones de pago, que "Cant.", "Quantity" y "Unidades" significan lo mismo, y que una tabla con columnas de descripción, precio y cantidad es una lista de ítems de línea independientemente del orden de columnas.

Este no es un enfoque genérico de "mandar el documento a ChatGPT y esperar lo mejor". La definición del flujo de trabajo especifica exactamente qué salida estructurada debe producir el LLM, qué reglas de validación se aplican y qué sucede cuando la confianza de extracción es baja. La descripción de la tarea del subagente define el esquema esperado, y los pasos posteriores del flujo de trabajo validan los datos extraídos contra las reglas de negocio antes de que entren en cualquier sistema posterior.

### Automatización del navegador para la recuperación de documentos

Muchos flujos de trabajo de ingesta de documentos comienzan por obtener el documento en primer lugar. Los EOB de seguros están en portales de pagadores. Las facturas de proveedores están en plataformas de proveedores. Los formularios gubernamentales están en sitios web de agencias estatales. La automatización tradicional usa scripts de Selenium o llamadas API para obtener estos documentos, y esos scripts se rompen cuando el portal cambia.

La automatización del navegador de Triggerfish usa Chromium controlado por CDP con un LLM que lee instantáneas de página para navegar. El agente ve la página como lo hace un humano y hace clic, escribe y desplaza basándose en lo que ve en lugar de selectores CSS codificados. Cuando un portal de pagador rediseña su página de inicio de sesión, el agente se adapta porque todavía puede identificar el campo de nombre de usuario, el campo de contraseña y el botón de enviar desde el contexto visual. Cuando un menú de navegación cambia, el agente encuentra el nuevo camino a la sección de descarga de documentos.

Esto no es perfectamente confiable. Los CAPTCHA, los flujos de autenticación multifactor y los portales muy dependientes de JavaScript todavía causan problemas. Pero el modo de falla es fundamentalmente diferente al de los scripts tradicionales. Un script de Selenium falla silenciosamente cuando un selector CSS deja de coincidir. Un agente de Triggerfish reporta lo que ve, lo que intentó y dónde se atascó, dándole al operador suficiente contexto para intervenir o ajustar el flujo de trabajo.

### Procesamiento sujeto a clasificación

Los documentos tienen diferentes niveles de sensibilidad, y el sistema de clasificación lo maneja automáticamente. Una factura con condiciones de precios podría ser CONFIDENTIAL. Una respuesta a una RFP pública podría ser INTERNAL. Un documento con PHI es RESTRICTED. Cuando el subagente LLM lee un documento y extrae datos, el hook POST_TOOL_RESPONSE clasifica el contenido extraído y el taint de sesión escala en consecuencia.

Esto importa para el enrutamiento posterior. Los datos de factura extraídos clasificados en CONFIDENTIAL no pueden enviarse a un canal de Slack clasificado en PUBLIC. Un flujo de trabajo que procesa documentos de seguros con PHI restringe automáticamente a dónde pueden fluir los datos extraídos. La regla de prevención de escritura descendente lo aplica en cada frontera, y el LLM no tiene ninguna autoridad para anularlo.

Para el sector salud y los servicios financieros en particular, esto significa que la carga de cumplimiento del procesamiento automatizado de documentos cae drásticamente. En lugar de construir controles de acceso personalizados en cada paso de cada pipeline, el sistema de clasificación lo maneja de manera uniforme. Un auditor puede rastrear exactamente qué documentos fueron procesados, qué datos fueron extraídos, a dónde fueron enviados y confirmar que ningún dato fluyó a un destino inapropiado, todo desde los registros de linaje que se crean automáticamente en cada paso.

### Adaptación de formato de autocorrección

Cuando un proveedor cambia su plantilla de factura, la automatización tradicional se rompe y permanece rota hasta que alguien actualiza manualmente las reglas de extracción. En Triggerfish, el subagente LLM se adapta en la siguiente ejecución. Todavía encuentra el número de factura, los ítems de línea y el total, porque lee por significado en lugar de por posición. La extracción tiene éxito, los datos se validan contra las mismas reglas de negocio y el flujo de trabajo se completa.

Con el tiempo, el agente puede usar la memoria entre sesiones para aprender patrones. Si el proveedor A siempre incluye una tarifa de reposición que otros proveedores no tienen, el agente lo recuerda de extracciones anteriores y sabe buscarlo. Si el formato de EOB de un pagador particular siempre pone los códigos de ajuste en una ubicación inusual, la memoria del agente sobre extracciones exitosas anteriores hace que las futuras sean más confiables.

Cuando un cambio de formato es lo suficientemente significativo como para que la confianza de extracción del LLM caiga por debajo del umbral definido en el flujo de trabajo, el flujo de trabajo enruta el documento a una cola de revisión humana en lugar de adivinar. Las correcciones humanas se retroalimentan a través del flujo de trabajo, y la memoria del agente almacena el nuevo patrón para referencia futura. El sistema se vuelve más inteligente con el tiempo sin que nadie reescriba las reglas de extracción.

### Orquestación de pipelines

La ingesta de documentos raramente es solo "extraer y almacenar". Un pipeline completo obtiene el documento, extrae datos estructurados, los valida contra registros existentes, los enriquece con datos de otros sistemas, enruta las excepciones para revisión humana y carga los datos validados en el sistema de destino. El motor de flujos de trabajo maneja todo esto en una única definición YAML.

Un pipeline de autorización previa en salud podría verse así: la automatización del navegador obtiene la imagen del fax del portal del proveedor, un subagente LLM extrae los identificadores de paciente y los códigos de procedimiento, una llamada HTTP valida al paciente contra el EHR, otro subagente evalúa si la autorización cumple los criterios de necesidad médica según la documentación clínica, y el resultado se enruta bien a aprobación automática o a una cola de revisión clínica. Cada paso se clasifica. Cada PHI tiene su taint marcado. La traza de auditoría completa existe automáticamente.

## Cómo se ve esto en la práctica

Un sistema de salud regional procesa solicitudes de autorización previa de cuarenta consultorios diferentes, cada uno usando su propio diseño de formulario, algunos enviados por fax, algunos por correo electrónico, algunos subidos a un portal. El enfoque tradicional requería un equipo de ocho personas para revisar e ingresar manualmente cada solicitud, porque ninguna herramienta de automatización podía manejar la varianza de formato de forma confiable.

Con Triggerfish, un flujo de trabajo maneja el pipeline completo. La automatización del navegador o el análisis de correos electrónicos recupera los documentos. Los subagentes LLM extraen los datos estructurados independientemente del formato. Los pasos de validación verifican los datos extraídos contra el EHR y las bases de datos de formularios. Un límite de clasificación de RESTRICTED garantiza que los PHI nunca salgan del perímetro del pipeline. Los documentos que el LLM no puede analizar con alta confianza se enrutan a un revisor humano, pero ese volumen disminuye con el tiempo a medida que la memoria del agente construye una biblioteca de patrones de formato.

El equipo de ocho personas se convierte en dos personas manejando las excepciones que el sistema señala, más auditorías de calidad periódicas de las extracciones automatizadas. Los cambios de formato de los consultorios se absorben automáticamente. Los nuevos diseños de formularios se manejan en el primer encuentro. El costo de mantenimiento que consumía la mayor parte del presupuesto de automatización tradicional cae a casi cero.
