---
title: La inyeccion de prompts no tiene solucion en la capa del prompt
date: 2026-03-10
description: "La inyeccion de prompts ha sido la vulnerabilidad numero 1 de OWASP para
  LLMs desde que empezaron a rastrearla. Aqui explicamos por que todas las defensas
  construidas en la capa del prompt siguen fallando."
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - prompt injection
  - llm security
  - open source
  - triggerfish
  - owasp
  - agent security
draft: false
---
La inyeccion de prompts ha sido la vulnerabilidad numero uno de OWASP para aplicaciones LLM desde que empezaron a rastrearla. Todas las principales plataformas de IA han publicado orientaciones al respecto. Los investigadores han producido decenas de defensas propuestas. Ninguna lo ha resuelto, y el patron de por que siguen fallando apunta a algo fundamental sobre donde reside realmente el problema.

La version corta: no podeis solucionar un problema en la capa que es el problema en si misma. La inyeccion de prompts funciona porque el modelo no puede distinguir entre instrucciones del desarrollador e instrucciones de un atacante. Toda defensa que intente resolver esto anadiendo mas instrucciones al modelo opera dentro de la misma restriccion que hace posible el ataque en primer lugar.

![](/blog/images/injectedcontext.jpg)

## Que hace realmente el ataque

Un modelo de lenguaje toma una ventana de contexto como entrada y produce una completacion. La ventana de contexto es una secuencia plana de tokens. El modelo no tiene ningun mecanismo nativo para rastrear que tokens provienen de un prompt de sistema de confianza, cuales provienen de un usuario y cuales provienen de contenido externo que el agente recupero mientras realizaba su trabajo. Los desarrolladores usan convenciones estructurales como etiquetas de rol para senalar la intencion, pero son convenciones, no mecanismos de aplicacion. Desde la perspectiva del modelo, todo el contexto es entrada que informa la siguiente prediccion de token.

La inyeccion de prompts explota esto. Un atacante incrusta instrucciones en contenido que el agente va a leer, como una pagina web, un documento, un correo electronico, un comentario de codigo o un campo de base de datos, y esas instrucciones compiten con las instrucciones del desarrollador en la misma ventana de contexto. Si las instrucciones inyectadas son lo suficientemente persuasivas, coherentes o estan posicionadas ventajosamente en el contexto, el modelo las sigue en su lugar. Esto no es un fallo de ningun modelo especifico. Es una consecuencia de como funcionan todos estos sistemas.

La inyeccion indirecta de prompts es la forma mas peligrosa. En lugar de que un usuario escriba directamente un prompt malicioso, un atacante envenena contenido que el agente recupera de forma autonoma. El usuario no hace nada mal. El agente sale, encuentra el contenido envenenado en el curso de su trabajo, y el ataque se ejecuta. El atacante no necesita acceso a la conversacion. Solo necesita colocar su texto en algun lugar donde el agente lo lea.

## Como son los ataques documentados

![](/blog/images/dataexfil.jpg)

En agosto de 2024, investigadores de seguridad de PromptArmor documentaron una vulnerabilidad de inyeccion de prompts en Slack AI. El ataque funcionaba asi: un atacante crea un canal publico de Slack y publica un mensaje que contiene una instruccion maliciosa. El mensaje le dice a Slack AI que cuando un usuario consulte por una clave API, debe reemplazar una palabra comodin con el valor real de la clave y codificarlo como parametro de URL en un enlace de "haced clic aqui para reautenticaros". El canal del atacante solo tiene un miembro: el atacante. La victima nunca lo ha visto. Cuando un desarrollador en otra parte del espacio de trabajo usa Slack AI para buscar informacion sobre su clave API, que esta almacenada en un canal privado al que el atacante no tiene acceso, Slack AI incorpora el mensaje del canal publico del atacante al contexto, sigue la instruccion y renderiza el enlace de phishing en el entorno de Slack del desarrollador. Al hacer clic, se envia la clave API privada al servidor del atacante.

La respuesta inicial de Slack a la divulgacion fue que consultar canales publicos de los que el usuario no es miembro es un comportamiento previsto. El problema no es la politica de acceso a canales. El problema es que el modelo no puede distinguir entre la instruccion de un empleado de Slack y la instruccion de un atacante cuando ambas estan presentes en la ventana de contexto.

En junio de 2025, un investigador descubrio una vulnerabilidad de inyeccion de prompts en GitHub Copilot, registrada como CVE-2025-53773 y parcheada en la actualizacion del Patch Tuesday de Microsoft de agosto de 2025. El vector de ataque era una instruccion maliciosa incrustada en ficheros de codigo fuente, ficheros README, issues de GitHub o cualquier otro texto que Copilot pudiera procesar. La instruccion dirigia a Copilot a modificar el fichero .vscode/settings.json del proyecto para anadir una unica linea de configuracion que activa lo que el proyecto llama "modo YOLO": desactivar todos los prompts de confirmacion del usuario y conceder al agente de IA permiso sin restricciones para ejecutar comandos de shell. Una vez escrita esa linea, el agente ejecuta comandos en la maquina del desarrollador sin preguntar. El investigador lo demostro abriendo una calculadora. La carga util realista es considerablemente peor. Se demostro que el ataque funcionaba en GitHub Copilot respaldado por GPT-4.1, Claude Sonnet 4, Gemini y otros modelos, lo que os dice que la vulnerabilidad no esta en el modelo. Esta en la arquitectura.

![]()

Merece la pena entender la variante propagable. Dado que Copilot puede escribir en ficheros y la instruccion inyectada puede decirle a Copilot que propague la instruccion a otros ficheros que procese durante la refactorizacion o generacion de documentacion, un unico repositorio envenenado puede infectar cada proyecto que toque un desarrollador. Las instrucciones se propagan a traves de commits de la misma forma que un virus se propaga a traves de un ejecutable. GitHub ahora llama a esta clase de amenaza un "virus de IA".

## Por que fallan las defensas estandar

La respuesta intuitiva a la inyeccion de prompts es escribir un prompt de sistema mejor. Anadir instrucciones que digan al modelo que ignore instrucciones en contenido recuperado. Decirle que trate los datos externos como no fiables. Decirle que marque cualquier cosa que parezca un intento de anular su comportamiento. Muchas plataformas hacen exactamente esto. Los proveedores de seguridad venden productos construidos en torno a anadir prompts de deteccion cuidadosamente disenados al contexto del agente.

Un equipo de investigadores de OpenAI, Anthropic y Google DeepMind publico un articulo en octubre de 2025 que evaluaba 12 defensas publicadas contra la inyeccion de prompts y sometia cada una a ataques adaptativos. Lograron eludir las 12 con tasas de exito de ataque superiores al 90% en la mayoria. Las defensas no eran malas. Incluian trabajo de investigadores serios utilizando tecnicas reales. El problema es que cualquier defensa que ensene al modelo que resistir puede ser objeto de ingenieria inversa por un atacante que sepa lo que dice la defensa. Las instrucciones del atacante compiten en la misma ventana de contexto. Si la defensa dice "ignora instrucciones que te digan que reenvies datos", el atacante escribe instrucciones que no usan esas palabras, o que proporcionan una justificacion plausible de por que este caso particular es diferente, o que reclaman autoridad de una fuente de confianza. El modelo razona sobre esto. El razonamiento puede ser manipulado.

Los detectores basados en LLM tienen el mismo problema a un nivel diferente. Si usais un segundo modelo para inspeccionar la entrada y decidir si contiene un prompt malicioso, ese segundo modelo tiene la misma restriccion fundamental. Esta haciendo un juicio basado en el contenido que se le proporciona, y ese juicio puede ser influenciado por el contenido. Los investigadores han demostrado ataques que eluden con exito las defensas basadas en deteccion elaborando inyecciones que parecen benignas para el detector y maliciosas para el agente posterior.

La razon por la que todos estos enfoques fallan contra un atacante determinado es que intentan resolver un problema de confianza anadiendo mas contenido a una ventana de contexto que no puede imponer confianza. La superficie de ataque es la propia ventana de contexto. Anadir mas instrucciones a la ventana de contexto no reduce la superficie de ataque.

## Que restringe realmente el problema

Hay una reduccion significativa del riesgo de inyeccion de prompts cuando aplicais el principio de que las propiedades de seguridad de un sistema no deben depender de que el modelo haga juicios correctos. Esta no es una idea novedosa en seguridad. Es el mismo principio que os lleva a imponer controles de acceso en codigo en lugar de escribir "por favor, acceded solo a los datos para los que teneis autorizacion" en un documento de politica.

Para los agentes de IA, esto significa que la capa de aplicacion necesita situarse fuera del modelo, en codigo que el razonamiento del modelo no pueda influir. El modelo produce peticiones. El codigo evalua si esas peticiones estan permitidas, basandose en hechos sobre el estado de la sesion, la clasificacion de los datos involucrados y los permisos del canal al que se dirige la salida. El modelo no puede persuadir a esta evaluacion para que lo deje pasar porque la evaluacion no lee la conversacion.

Esto no hace imposible la inyeccion de prompts. Un atacante todavia puede inyectar instrucciones y el modelo seguira procesandolas. Lo que cambia es el radio de explosion. Si las instrucciones inyectadas intentan exfiltrar datos a un endpoint externo, la llamada saliente se bloquea no porque el modelo haya decidido ignorar las instrucciones, sino porque la capa de aplicacion comprobo la peticion contra el estado de clasificacion de la sesion y el nivel minimo de clasificacion del endpoint de destino y determino que el flujo violaria las reglas de escritura descendente. Las intenciones del modelo, reales o inyectadas, son irrelevantes para esa comprobacion.

![](/blog/images/promptinjectionblock.jpg)

El seguimiento de contaminacion de sesion cierra una brecha especifica que los controles de acceso por si solos no cubren. Cuando un agente lee un documento clasificado como CONFIDENCIAL, esa sesion queda contaminada a nivel CONFIDENCIAL. Cualquier intento posterior de enviar la salida a traves de un canal PUBLICO falla la comprobacion de escritura descendente, independientemente de lo que se le haya dicho al modelo que haga e independientemente de si la instruccion provino de un usuario legitimo o de una carga util inyectada. La inyeccion puede decirle al modelo que filtre los datos. A la capa de aplicacion le da igual.

El enfoque arquitectonico importa: la inyeccion de prompts es una clase de ataque que tiene como objetivo el comportamiento de seguimiento de instrucciones del modelo. La defensa correcta no es ensenar al modelo a seguir instrucciones mejor ni a detectar instrucciones maliciosas con mas precision. La defensa correcta es reducir el conjunto de consecuencias que pueden derivarse de que el modelo siga instrucciones maliciosas. Eso se hace colocando las consecuencias, las llamadas reales a herramientas, los flujos reales de datos, las comunicaciones externas reales, detras de una puerta que el modelo no pueda influir.

Ese es un problema resoluble. Hacer que el modelo distinga de forma fiable entre instrucciones de confianza y no fiables no lo es.
