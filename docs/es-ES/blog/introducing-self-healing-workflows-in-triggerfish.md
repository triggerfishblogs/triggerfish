---
title: Presentamos los flujos de trabajo autoreparables en Triggerfish
date: 2026-03-13
description: Los flujos de trabajo autoreparables de Triggerfish despliegan un agente
  vigilante activo en cada ejecución, detectando fallos en contexto y proponiendo
  correcciones sin detener la ejecución.
author: Greg Havens
tags:
  - workflow-automation
  - ai-agents
  - enterprise-it
  - self-healing
  - rpa
  - automation-maintenance
  - triggerfish
draft: false
---
Todos los programas de automatización empresarial acaban chocando contra el mismo muro. Enrutamiento de tickets en ServiceNow, remediación de desviaciones en Terraform, rotación de certificados, aprovisionamiento de grupos en AD, despliegue de parches con SCCM, orquestación de pipelines de CI/CD. Los primeros diez o veinte flujos de trabajo justifican la inversión fácilmente, y las cuentas de retorno se sostienen justo hasta que el número de flujos se cuenta por centenares y una parte significativa de la semana del equipo de IT pasa de construir nueva automatización a evitar que la existente se caiga.

Un portal de pagos rediseña su flujo de autenticación y el flujo de envío de reclamaciones deja de autenticarse. Salesforce lanza una actualización de metadatos y un mapeo de campos en el pipeline de lead-a-oportunidad empieza a escribir nulos. AWS depreca una versión de API y un plan de Terraform que funcionó limpiamente durante un año empieza a lanzar errores 400 en cada apply. Alguien abre un ticket, otra persona averigua qué cambió, lo parchea, lo prueba, despliega la corrección, y mientras tanto el proceso que estaba automatizado o se ejecutó manualmente o directamente no se ejecutó.

Esta es la trampa del mantenimiento, y es estructural, no un fallo de implementación. La automatización tradicional sigue rutas exactas, busca patrones exactos y se rompe en el momento en que la realidad se desvía de lo que existía cuando se escribió el flujo de trabajo. Los estudios son consistentes: las organizaciones gastan entre el 70 y el 75 por ciento del coste total de sus programas de automatización no en construir nuevos flujos de trabajo, sino en mantener los que ya tienen. En despliegues grandes, el 45 por ciento de los flujos se rompen cada semana.

El motor de flujos de trabajo de Triggerfish se construyó para cambiar esto. Los flujos de trabajo autoreparables se lanzan hoy, y representan la capacidad más significativa de la plataforma hasta la fecha.

![](/blog/images/watcher-model-diagram.jpg)

## Qué significa realmente la autorreparación

La expresión se usa de forma imprecisa, así que voy a ser directo sobre lo que es esto.

Cuando activáis la autorreparación en un flujo de trabajo de Triggerfish, se lanza un agente líder en el momento en que ese flujo comienza a ejecutarse. No arranca cuando algo se rompe; está vigilando desde el primer paso, recibiendo un flujo de eventos en tiempo real del motor mientras el flujo avanza y observando cada paso en directo.

El líder conoce la definición completa del flujo de trabajo antes de que se ejecute un solo paso, incluyendo la intención detrás de cada paso, qué espera cada paso de los anteriores y qué produce para los siguientes. También conoce el historial de ejecuciones previas: qué tuvo éxito, qué falló, qué parches se propusieron y si un humano los aprobó o rechazó. Cuando identifica algo que merece atención, todo ese contexto ya está en memoria porque estuvo observando desde el principio en lugar de reconstruirlo después del hecho.

Cuando algo va mal, el líder lo triaja. Una llamada de red inestable recibe un reintento con retroceso exponencial. Un endpoint de API que ha cambiado y se puede sortear se sortea en esta ejecución. Un problema estructural en la definición del flujo de trabajo recibe una corrección propuesta que se aplica para completar la ejecución, con el cambio enviado para vuestra aprobación antes de que sea permanente. Una integración de plugin rota recibe un plugin nuevo o actualizado, redactado y enviado para revisión. Si el líder agota sus intentos y no puede resolver el problema, os lo escala con un diagnóstico estructurado de lo que intentó y cuál cree que es la causa raíz.

El flujo de trabajo sigue ejecutándose siempre que sea seguro hacerlo. Si un paso está bloqueado, solo los pasos posteriores que dependen de él se pausan mientras las ramas paralelas continúan. El líder conoce el grafo de dependencias y solo pausa lo que realmente está bloqueado.

## Por qué importa el contexto que incorporáis en los flujos de trabajo

Lo que hace que la autorreparación funcione en la práctica es que los flujos de trabajo de Triggerfish requieren metadatos ricos a nivel de paso desde el momento en que los escribís. Esto no es opcional y no es documentación por documentar; es de lo que razona el agente líder.

Cada paso en un flujo de trabajo tiene cuatro campos obligatorios más allá de la propia definición de la tarea: una descripción de lo que hace el paso mecánicamente, una declaración de intención que explica por qué existe este paso y qué propósito de negocio cumple, un campo expects que describe qué datos asume que recibe y en qué estado deben estar los pasos previos, y un campo produces que describe qué escribe en el contexto para que los pasos posteriores lo consuman.

Así es como queda en la práctica. Suponed que estáis automatizando el aprovisionamiento de acceso para empleados. Un nuevo empleado empieza el lunes y el flujo de trabajo necesita crear cuentas en Active Directory, aprovisionar su pertenencia a la organización de GitHub, asignar sus grupos de Okta y abrir un ticket en Jira confirmando la finalización. Un paso obtiene el registro del empleado de vuestro sistema de RRHH. Su campo de intención no dice simplemente "obtener el registro del empleado". Dice: "Este paso es la fuente de verdad para todas las decisiones de aprovisionamiento posteriores. El rol, departamento y fecha de inicio de este registro determinan qué grupos de AD se asignan, qué equipos de GitHub se aprovisionan y qué políticas de Okta se aplican. Si este paso devuelve datos obsoletos o incompletos, cada paso posterior aprovisionará los accesos incorrectos."

![](/blog/images/employee-recrod.jpg)

El líder lee esa declaración de intención cuando el paso falla y entiende lo que está en juego. Sabe que un registro parcial significa que los pasos de aprovisionamiento de acceso se ejecutarán con datos erróneos, potencialmente concediendo permisos incorrectos a una persona real que empieza en dos días. Ese contexto determina cómo intenta recuperarse, si pausa los pasos posteriores y qué os dice si escala.

Otro paso en el mismo flujo de trabajo comprueba el campo produces del paso de obtención de RRHH y sabe que espera `.employee.role` y `.employee.department` como cadenas no vacías. Si vuestro sistema de RRHH actualiza su API y empieza a devolver esos campos anidados bajo `.employee.profile.role`, el líder detecta la desviación de esquema, aplica un mapeo en tiempo de ejecución para esta ejecución de modo que el nuevo empleado se aprovisione correctamente, y propone una corrección estructural para actualizar la definición del paso. No escribisteis una regla de migración de esquema ni un manejo de excepciones para este caso concreto. El líder razonó la solución a partir del contexto que ya estaba ahí.

Por eso importa la calidad de la autoría de los flujos de trabajo. Los metadatos no son ceremonia; son el combustible del que se alimenta el sistema de autorreparación. Un flujo de trabajo con descripciones superficiales de pasos es un flujo de trabajo sobre el que el líder no puede razonar cuando importa.

## Vigilar en directo significa detectar problemas antes de que se conviertan en fallos

Como el líder está vigilando en tiempo real, puede actuar ante señales débiles antes de que las cosas se rompan de verdad. Un paso que históricamente se completa en dos segundos ahora tarda cuarenta. Un paso que devolvió datos en todas las ejecuciones previas devuelve un resultado vacío. Se toma una rama condicional que nunca se había tomado en todo el historial de ejecuciones. Nada de esto son errores duros y el flujo de trabajo sigue ejecutándose, pero son señales de que algo ha cambiado en el entorno. Es mejor detectarlas antes de que el siguiente paso intente consumir datos erróneos.

La sensibilidad de estas comprobaciones es configurable por flujo de trabajo. Una generación de informes nocturna puede tener umbrales holgados mientras que un pipeline de aprovisionamiento de acceso vigila de cerca. Vosotros establecéis qué nivel de desviación merece la atención del líder.

![](/blog/images/self-healing-workflow.jpg)

## Sigue siendo vuestro flujo de trabajo

El agente líder y su equipo no pueden cambiar vuestra definición canónica del flujo de trabajo sin vuestra aprobación. Cuando el líder propone una corrección estructural, aplica la corrección para completar la ejecución actual y envía el cambio como propuesta. Lo veis en vuestra cola, veis el razonamiento, lo aprobáis o lo rechazáis. Si lo rechazáis, ese rechazo queda registrado y cada futuro líder que trabaje en ese flujo de trabajo sabe que no debe proponer lo mismo otra vez.

Hay una cosa que el líder nunca puede cambiar independientemente de la configuración: su propio mandato. La política de autorreparación en la definición del flujo de trabajo —si pausar, cuánto tiempo reintentar, si requerir aprobación— es política definida por el propietario. El líder puede parchear definiciones de tareas, actualizar llamadas a API, ajustar parámetros y escribir nuevos plugins. No puede cambiar las reglas que gobiernan su propio comportamiento. Ese límite está codificado de forma fija. Un agente que pudiera desactivar el requisito de aprobación que gobierna sus propias propuestas haría que todo el modelo de confianza careciera de sentido.

Los cambios en plugins siguen la misma ruta de aprobación que cualquier plugin escrito por un agente en Triggerfish. El hecho de que el plugin se haya escrito para arreglar un flujo de trabajo roto no le otorga ninguna confianza especial. Pasa por la misma revisión que si hubierais pedido a un agente que os construyera una nueva integración desde cero.

## Gestionando esto a través de todos los canales que ya usáis

No deberíais tener que iniciar sesión en un panel separado para saber qué están haciendo vuestros flujos de trabajo. Las notificaciones de autorreparación llegan a donde hayáis configurado Triggerfish para contactaros: un resumen de intervención en Slack, una solicitud de aprobación en Telegram, un informe de escalado por correo electrónico. El sistema llega a vosotros por el canal que tiene sentido según la urgencia, sin que tengáis que refrescar una consola de monitorización.

El modelo de estado del flujo de trabajo está diseñado para esto. El estado no es una cadena plana, sino un objeto estructurado que lleva todo lo que una notificación necesita para ser significativa: el estado actual, la señal de salud, si hay un parche en vuestra cola de aprobación, el resultado de la última ejecución y qué está haciendo el líder en este momento. Vuestro mensaje de Slack puede decir "el flujo de trabajo de aprovisionamiento de acceso está pausado, el líder está escribiendo una corrección de plugin, se requerirá aprobación" en una sola notificación sin tener que buscar contexto.

![](/blog/images/workflow-status-reporting.jpg)

Ese mismo estado estructurado alimenta la interfaz en directo de Tidepool cuando queréis la imagen completa. Los mismos datos, diferente superficie.

## Qué cambia esto realmente para los equipos de IT

Las personas de vuestra organización que pasan la semana arreglando flujos de trabajo rotos no están haciendo trabajo de baja cualificación. Están depurando sistemas distribuidos, leyendo changelogs de API e ingeniería inversa para entender por qué un flujo de trabajo que funcionó bien ayer está fallando hoy. Ese es un criterio valioso, y ahora mismo se consume casi por completo en mantener viva la automatización existente en lugar de construir nueva automatización o resolver problemas más complejos.

Los flujos de trabajo autoreparables no eliminan ese criterio, pero cambian cuándo se aplica. En lugar de apagar fuegos con un flujo de trabajo roto a medianoche, estáis revisando una corrección propuesta por la mañana y decidiendo si el diagnóstico del líder es correcto. Sois los aprobadores de un cambio propuesto, no los autores de un parche bajo presión.

Ese es el modelo laboral sobre el que se construye Triggerfish: humanos revisando y aprobando el trabajo de los agentes en lugar de ejecutar el trabajo que los agentes pueden manejar. La cobertura de automatización sube mientras la carga de mantenimiento baja, y el equipo que dedicaba el 75 por ciento de su tiempo al mantenimiento puede redirigir la mayor parte de ese tiempo hacia cosas que realmente requieren criterio humano.

## Disponible hoy

Los flujos de trabajo autoreparables se lanzan hoy como una característica opcional en el motor de flujos de trabajo de Triggerfish. Se activa por flujo de trabajo, configurándolo en el bloque de metadatos del flujo. Si no lo activáis, nada cambia en la ejecución de vuestros flujos de trabajo.

Esto importa no porque sea un problema técnico difícil (que lo es), sino porque aborda directamente aquello que ha hecho que la automatización empresarial sea más cara y más dolorosa de lo necesario. El equipo de mantenimiento de flujos de trabajo debería ser el primer puesto que la automatización con IA asuma. Ese es el uso correcto de esta tecnología, y eso es lo que ha construido Triggerfish.

Si queréis profundizar en cómo funciona, la especificación completa está en el repositorio. Si queréis probarlo, la skill workflow-builder os guiará en la escritura de vuestro primer flujo de trabajo autoreparable.
