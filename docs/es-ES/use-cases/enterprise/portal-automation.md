---
title: Automatización de portales de terceros
description: Cómo Triggerfish automatiza las interacciones con portales de proveedores, sitios gubernamentales y sistemas de pagadores sin fallar cuando cambia la interfaz.
---

# Automatización dependiente de UI contra portales de terceros

Toda empresa tiene una lista de portales en los que los empleados inician sesión manualmente, cada día, para hacer un trabajo que debería estar automatizado pero no lo está. Portales de proveedores para comprobar el estado de los pedidos. Sitios gubernamentales para presentar registros regulatorios. Portales de pagadores de seguros para verificar la elegibilidad y comprobar el estado de las reclamaciones. Colegios de licencias estatales para la verificación de credenciales. Portales de autoridades fiscales para presentaciones de cumplimiento.

Estos portales no tienen APIs. O tienen APIs que están sin documentar, con límite de velocidad o restringidas a "socios preferidos" que pagan por el acceso. Los datos están detrás de una página de inicio de sesión, renderizados en HTML, y la única forma de sacarlos es iniciar sesión y navegar por la interfaz.

La automatización tradicional usa scripts de navegador. Scripts de Selenium, Playwright o Puppeteer que inician sesión, navegan a la página correcta, encuentran elementos por selector CSS o XPath, extraen los datos y cierran sesión. Estos scripts funcionan hasta que dejan de funcionar. Un rediseño del portal cambia los nombres de clases CSS. Se añade un nuevo CAPTCHA al flujo de inicio de sesión. El menú de navegación pasa de una barra lateral a un menú hamburguesa. Un banner de consentimiento de cookies empieza a cubrir el botón de enviar. El script falla silenciosamente, y nadie lo nota hasta que el proceso posterior que depende de los datos comienza a producir errores.

Los colegios médicos estatales son un ejemplo especialmente duro. Hay cincuenta de ellos, cada uno con un sitio web diferente, diseños diferentes, métodos de autenticación diferentes y formatos de datos diferentes. Rediseñan según sus propios calendarios sin previo aviso. Un servicio de verificación de credenciales que depende del scraping de estos sitios podría tener cinco o diez de sus cincuenta scripts rotos en cualquier momento dado, cada uno requiriendo que un desarrollador inspeccione el nuevo diseño y reescriba los selectores.

## Cómo Triggerfish lo resuelve

La automatización del navegador de Triggerfish combina Chromium controlado por CDP con navegación visual basada en LLM. El agente ve la página como píxeles renderizados e instantáneas de accesibilidad, no como un árbol DOM. Identifica elementos por lo que parecen y lo que hacen, no por sus nombres de clases CSS. Cuando un portal se rediseña, el agente se adapta porque los formularios de inicio de sesión todavía parecen formularios de inicio de sesión, los menús de navegación todavía parecen menús de navegación y las tablas de datos todavía parecen tablas de datos.

### Navegación visual en lugar de scripts de selectores

Las herramientas de automatización del navegador funcionan a través de siete operaciones: navegar, capturar instantánea, hacer clic, escribir, seleccionar, desplazar y esperar. El agente navega a una URL, toma una instantánea de la página renderizada, razona sobre lo que ve y decide qué acción tomar. No hay herramienta `evaluate` que ejecute JavaScript arbitrario en el contexto de la página. Esta es una decisión de seguridad deliberada. El agente interactúa con la página de la misma forma que lo haría un humano — a través de la interfaz — y no puede ejecutar código que podría ser explotado por una página maliciosa.

Cuando el agente encuentra un formulario de inicio de sesión, identifica el campo de nombre de usuario, el campo de contraseña y el botón de enviar basándose en el diseño visual, el texto de marcador de posición, las etiquetas y la estructura de la página. No necesita saber que el campo de nombre de usuario tiene `id="auth-input-email"` o `class="login-form__email-field"`. Cuando esos identificadores cambian en un rediseño, el agente no lo nota porque nunca dependió de ellos.

### Seguridad de dominio compartida

La navegación del navegador comparte la misma configuración de seguridad de dominio que las operaciones de obtención web. Un único bloque de configuración en `triggerfish.yaml` define listas de bloqueo SSRF, listas de permitidos de dominio, listas de bloqueo de dominio y mapeos de dominio a clasificación. Cuando el agente navega a un portal de proveedor clasificado en CONFIDENTIAL, el taint de sesión escala automáticamente a CONFIDENTIAL, y todas las acciones posteriores en ese flujo de trabajo están sujetas a las restricciones del nivel CONFIDENTIAL.

La lista de bloqueo SSRF está codificada en duro y no es reemplazable. Los rangos de IP privados, las direcciones de enlace local y los puntos de enlace de metadatos de nube siempre están bloqueados. La resolución DNS se comprueba antes de la solicitud, impidiendo los ataques de rebinding de DNS. Esto importa porque la automatización del navegador es la superficie de ataque de mayor riesgo en cualquier sistema de agente. Una página maliciosa que intenta redirigir al agente a un servicio interno se bloquea antes de que la solicitud salga del sistema.

### Marca de agua del perfil del navegador

Cada agente mantiene su propio perfil de navegador, que acumula cookies, almacenamiento local y datos de sesión a medida que interactúa con los portales con el tiempo. El perfil lleva una marca de agua de clasificación que registra el nivel de clasificación más alto en el que ha sido usado. Esta marca de agua solo puede escalar, nunca bajar.

Si un agente usa su perfil de navegador para iniciar sesión en un portal de proveedor CONFIDENTIAL, el perfil queda marcado en CONFIDENTIAL. Una sesión posterior que se ejecuta en clasificación PUBLIC no puede usar ese perfil, evitando fugas de datos a través de credenciales en caché, cookies o tokens de sesión que podrían contener información sensible. El aislamiento del perfil es por agente, y la aplicación de la marca de agua es automática.

Esto resuelve un problema sutil pero importante en la automatización de portales. Los perfiles de navegador acumulan estado que refleja los datos a los que han accedido. Sin marca de agua, un perfil que inició sesión en un portal sensible podría filtrar información a través de sugerencias de autocompletar, datos de página en caché o cookies persistentes a una sesión de menor clasificación.

### Gestión de credenciales

Las credenciales de portal se almacenan en el llavero del SO (nivel personal) o en el almacén empresarial (nivel enterprise), nunca en archivos de configuración o variables de entorno. El hook SECRET_ACCESS registra cada recuperación de credenciales. Las credenciales se resuelven en tiempo de ejecución por el motor de flujos de trabajo y se inyectan en las sesiones del navegador a través de la interfaz de escritura, no estableciendo valores de formulario de forma programática. Esto significa que las credenciales fluyen a través de la misma capa de seguridad que cualquier otra operación sensible.

### Resiliencia ante cambios comunes de portal

Esto es lo que sucede cuando ocurren cambios comunes de portal:

**Rediseño de la página de inicio de sesión.** El agente toma una nueva instantánea, identifica el diseño actualizado y encuentra los campos del formulario por contexto visual. A menos que el portal haya cambiado a un método de autenticación completamente diferente (SAML, OAuth, token de hardware), el inicio de sesión sigue funcionando sin ningún cambio de configuración.

**Reestructuración de la navegación.** El agente lee la página después del inicio de sesión y navega a la sección de destino basándose en el texto de los enlaces, las etiquetas de menú y los encabezados de página en lugar de los patrones de URL. Si el portal del proveedor movió "Estado del pedido" de la barra lateral izquierda a un menú desplegable de navegación superior, el agente lo encuentra allí.

**Nuevo banner de consentimiento de cookies.** El agente ve el banner, identifica el botón aceptar/descartar, hace clic en él y continúa con la tarea original. Esto es gestionado por la comprensión general de página del LLM, no por un manejador especial de cookies.

**CAPTCHA añadido.** Aquí es donde el enfoque tiene limitaciones honestas. Los CAPTCHA de imagen simples podrían ser solubles dependiendo de las capacidades de visión del LLM, pero reCAPTCHA v3 y sistemas de análisis comportamental similares pueden bloquear los navegadores automatizados. El flujo de trabajo enruta estos a una cola de intervención humana en lugar de fallar silenciosamente.

**Solicitudes de autenticación multifactor.** Si el portal empieza a requerir MFA que antes no se necesitaba, el agente detecta la página inesperada, informa la situación a través del sistema de notificaciones y pausa el flujo de trabajo hasta que un humano complete el paso de MFA. El flujo de trabajo se puede configurar para esperar la finalización de MFA y luego continuar desde donde se dejó.

### Procesamiento por lotes en múltiples portales

El soporte de bucles `for` del motor de flujos de trabajo significa que un único flujo de trabajo puede iterar sobre múltiples objetivos de portal. Un servicio de verificación de credenciales puede definir un flujo de trabajo que compruebe el estado de la licencia en los cincuenta colegios médicos estatales en una única ejecución por lotes. Cada interacción de portal se ejecuta como un subpaso separado con su propia sesión de navegador, su propio seguimiento de clasificación y su propio manejo de errores. Si tres de los cincuenta portales fallan, el flujo de trabajo completa los otros cuarenta y siete y enruta los tres fallos a una cola de revisión con contexto de error detallado.

## Cómo se ve esto en la práctica

Una organización de acreditación verifica las licencias de proveedores de atención médica en los colegios médicos estatales como parte del proceso de inscripción de proveedores. Tradicionalmente, los asistentes de verificación inician sesión manualmente en el sitio web de cada colegio, buscan al proveedor, capturan una pantalla del estado de la licencia e introducen los datos en el sistema de acreditación. Cada verificación tarda entre cinco y quince minutos, y la organización procesa cientos por semana.

Con Triggerfish, un flujo de trabajo gestiona el ciclo de verificación completo. El flujo de trabajo recibe un lote de proveedores con sus números de licencia y estados de destino. Para cada proveedor, la automatización del navegador navega al portal del colegio estatal relevante, inicia sesión con credenciales almacenadas, busca al proveedor, extrae el estado de la licencia y la fecha de vencimiento y almacena el resultado. Los datos extraídos se clasifican en CONFIDENTIAL porque contienen PII del proveedor, y las reglas de escritura descendente impiden que se envíen a cualquier canal por debajo de ese nivel de clasificación.

Cuando un colegio estatal rediseña su portal, el agente se adapta en el siguiente intento de verificación. Cuando un colegio añade un CAPTCHA que bloquea el acceso automatizado, el flujo de trabajo señala ese estado para verificación manual y continúa procesando el resto del lote. Los asistentes de verificación pasan de hacer todas las verificaciones manualmente a gestionar solo las excepciones que la automatización no puede resolver.
