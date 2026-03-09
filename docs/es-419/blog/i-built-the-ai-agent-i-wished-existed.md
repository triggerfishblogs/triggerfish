---
title: Construí el agente de IA que deseaba que existiera
date: 2026-03-09
description: Construí Triggerfish porque todos los agentes de IA que encontré
  confiaban en el modelo para hacer cumplir sus propias reglas. Eso no es
  seguridad. Esto es lo que hice en su lugar.
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - open source
  - self-hosted
  - llm
  - prompt injection
  - agent security
  - triggerfish
draft: false
---
Hace un tiempo empecé a prestar mucha atención a lo que los agentes de IA podían hacer realmente. No las demos. Los de verdad, corriendo con datos reales, en entornos reales donde los errores tienen consecuencias. Lo que encontré fue que la capacidad estaba genuinamente ahí. Podías conectar un agente a tu correo, tu calendario, tu código, tus archivos, y podía hacer trabajo significativo. Esa parte me impresionó.

Lo que no me impresionó fue el modelo de seguridad. O más bien, la ausencia de uno. Todas las plataformas que revisé hacían cumplir sus reglas de la misma manera: diciéndole al modelo lo que no debía hacer. Escribe un buen system prompt, describe los límites, confía en que el modelo se mantenga dentro de ellos. Eso funciona hasta que alguien descubre cómo formular una solicitud que convence al modelo de que las reglas no aplican aquí, ahora, en este caso específico. Y la gente sí lo descubre. No es tan difícil.

Seguí esperando a que alguien construyera la versión que yo realmente quería usar. Una que pudiera conectarse a todo, funcionar en todos los canales que ya estaba usando, y manejar datos genuinamente sensibles sin tener que cruzar los dedos y esperar que el modelo estuviera teniendo un buen día. Nunca apareció.

Así que lo construí yo.

Triggerfish es el agente que yo quería. Se conecta a tu correo, tu calendario, tus archivos, tu código, tus apps de mensajería. Funciona de forma proactiva, no solo cuando le haces un prompt. Trabaja donde tú ya trabajas. Pero la parte que me tomo más en serio es la arquitectura de seguridad. Las reglas sobre a qué puede acceder el agente y hacia dónde pueden fluir los datos no viven en un prompt. Viven en una capa de enforcement que está completamente fuera del modelo. El modelo le dice al sistema lo que quiere hacer, y una capa separada decide si eso realmente sucede. El modelo no puede negociar con esa capa. No puede razonar para evadirla. No puede verla.

Esa distinción importa más de lo que parece. Significa que las propiedades de seguridad del sistema no se degradan a medida que el modelo se vuelve más capaz. Significa que una herramienta de terceros comprometida no puede convencer al agente de hacer algo que no debería. Significa que puedes mirar las reglas, entenderlas y confiar en ellas, porque son código, no texto.

Liberé el núcleo de enforcement como open source exactamente por esa razón. Si no puedes leerlo, no puedes confiar en él. Eso es cierto para cualquier afirmación de seguridad, y es especialmente cierto cuando lo que estás protegiendo es un agente autónomo con acceso a tus datos más sensibles.

La plataforma es gratuita para individuos y puedes correrla tú mismo. Si prefieres no pensar en la infraestructura, hay una opción de suscripción donde nosotros manejamos el modelo y la búsqueda. De cualquier manera, el modelo de seguridad es el mismo.

Este es el agente que deseaba que existiera hace dos años. Creo que mucha gente ha estado esperando lo mismo.
