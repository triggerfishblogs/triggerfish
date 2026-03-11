---
title: Eu construí o agente de IA que eu queria que existisse
date: 2026-03-09
description: Eu construí o Triggerfish porque todos os agentes de IA que encontrei
  confiavam no modelo para aplicar suas próprias regras. Isso não é segurança.
  Veja o que eu fiz no lugar.
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
Um tempo atrás, comecei a prestar bastante atenção no que os agentes de IA conseguiam fazer de verdade. Não as demos. Os reais, rodando com dados reais, em ambientes reais onde erros têm consequências. O que encontrei foi que a capacidade estava genuinamente ali. Você podia conectar um agente ao seu e-mail, seu calendário, seu código, seus arquivos, e ele conseguia fazer um trabalho significativo. Essa parte me impressionou.

O que não me impressionou foi o modelo de segurança. Ou melhor, a ausência de um. Todas as plataformas que eu olhei aplicavam suas regras da mesma forma: dizendo ao modelo o que ele não deveria fazer. Escreva um bom system prompt, descreva os limites, confie que o modelo vai ficar dentro deles. Isso funciona até alguém descobrir como formular um pedido que convence o modelo de que as regras não se aplicam aqui, agora, neste caso específico. E as pessoas descobrem. Não é tão difícil.

Fiquei esperando alguém construir a versão que eu realmente queria usar. Uma que pudesse se conectar a tudo, funcionar em todos os canais que eu já usava, e lidar com dados genuinamente sensíveis sem eu ter que cruzar os dedos e torcer para o modelo estar num bom dia. Ela nunca apareceu.

Então eu construí.

Triggerfish é o agente que eu queria. Ele se conecta ao seu e-mail, seu calendário, seus arquivos, seu código, seus apps de mensagem. Funciona de forma proativa, não só quando você faz um prompt. Trabalha onde você já trabalha. Mas a parte que eu levo mais a sério é a arquitetura de segurança. As regras sobre o que o agente pode acessar e para onde os dados podem fluir não ficam num prompt. Ficam numa camada de enforcement que existe totalmente fora do modelo. O modelo diz ao sistema o que quer fazer, e uma camada separada decide se aquilo realmente acontece. O modelo não pode negociar com essa camada. Não pode raciocinar para contorná-la. Não pode vê-la.

Essa distinção importa mais do que parece. Significa que as propriedades de segurança do sistema não se degradam conforme o modelo fica mais capaz. Significa que uma ferramenta de terceiros comprometida não pode convencer o agente a fazer algo que não deveria. Significa que você pode olhar as regras, entendê-las e confiar nelas, porque são código, não texto.

Liberei o núcleo de enforcement como open source exatamente por essa razão. Se você não pode ler, não pode confiar. Isso vale para qualquer afirmação de segurança, e vale especialmente quando o que você está protegendo é um agente autônomo com acesso aos seus dados mais sensíveis.

A plataforma é gratuita para uso individual e você pode rodá-la por conta própria. Se preferir não se preocupar com a infraestrutura, existe uma opção de assinatura onde nós cuidamos do modelo e da busca. De qualquer forma, o modelo de segurança é o mesmo.

Este é o agente que eu queria que existisse dois anos atrás. Acho que muita gente estava esperando a mesma coisa.
