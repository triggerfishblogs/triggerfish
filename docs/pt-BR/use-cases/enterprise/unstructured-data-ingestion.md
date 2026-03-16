---
title: Ingestão de dados não estruturados
description: Como o Triggerfish lida com processamento de faturas, ingestão de documentos e análise de emails sem quebrar quando os formatos de entrada mudam.
---

# Ingestão de dados não estruturados e semiestruturados

O processamento de faturas já deveria ser um problema resolvido. Um documento chega, os campos são extraídos, os dados são validados contra registros existentes e o resultado é roteado para o sistema correto. A realidade é que só o processamento de faturas custa às empresas bilhões em mão de obra manual anualmente, e os projetos de automação destinados a resolver isso quebram constantemente.

O motivo é a variação de formato. Faturas chegam como PDFs, anexos de email, imagens digitalizadas, exportações de planilhas e ocasionalmente faxes. Cada fornecedor usa um layout diferente. Itens de linha aparecem em tabelas, em texto livre ou em uma combinação de ambos. Os cálculos de impostos seguem regras diferentes por jurisdição. Os formatos de moeda variam. Os formatos de data variam. Até o mesmo fornecedor muda seu modelo de fatura sem aviso.

O RPA tradicional lida com isso por correspondência de templates. Define as coordenadas onde o número da fatura aparece, onde os itens de linha começam, onde fica o total. Funciona para o template atual de um único fornecedor. Então o fornecedor atualiza seu sistema, desloca uma coluna, adiciona uma linha de cabeçalho ou muda seu gerador de PDF, e o bot ou falha completamente ou extrai dados inúteis que se propagam downstream até alguém identificar manualmente.

O mesmo padrão se repete em todos os fluxos de trabalho com dados não estruturados. O processamento de EOB de seguros quebra quando um pagador muda o layout do formulário. A ingestão de autorização prévia quebra quando um novo tipo de documento é adicionado ao processo. A análise de emails de clientes quebra quando alguém usa um formato de linha de assunto ligeiramente diferente. O custo de manutenção para manter essas automações funcionando frequentemente supera o custo de fazer o trabalho manualmente.

## Como o Triggerfish resolve isso

O Triggerfish substitui a extração posicional de campos pela compreensão de documentos baseada em LLM. A AI lê o documento como um ser humano faria: entendendo o contexto, inferindo relacionamentos entre campos e adaptando-se automaticamente a mudanças de layout. Combinado com o mecanismo de workflow para orquestração de pipeline e o sistema de classificação para segurança de dados, isso cria pipelines de ingestão que não quebram quando o mundo muda.

### Análise de documentos baseada em LLM

Quando um documento entra em um workflow do Triggerfish, um sub-agente LLM lê o documento inteiro e extrai dados estruturados com base no que o documento significa, não onde pixels específicos estão. Um número de fatura é um número de fatura esteja ele no canto superior direito rotulado como "Invoice #" ou no meio da página rotulado como "Factura No." ou incorporado em um parágrafo de texto. O LLM entende que "Net 30" significa condições de pagamento, que "Qty", "Quantity" e "Units" significam a mesma coisa e que uma tabela com colunas para descrição, taxa e valor é uma lista de itens independentemente da ordem das colunas.

Esta não é uma abordagem genérica de "enviar o documento ao ChatGPT e torcer para o melhor". A definição do workflow especifica exatamente qual saída estruturada o LLM deve produzir, quais regras de validação se aplicam e o que acontece quando a confiança da extração é baixa. A descrição da tarefa do sub-agente define o schema esperado, e as etapas subsequentes do workflow validam os dados extraídos contra as regras de negócio antes de entrarem em qualquer sistema downstream.

### Automação de browser para recuperação de documentos

Muitos fluxos de trabalho de ingestão de documentos começam com a obtenção do documento. EOBs de seguros vivem em portais de pagadores. Faturas de fornecedores vivem em plataformas de fornecedores. Formulários governamentais vivem em sites de agências estaduais. A automação tradicional usa scripts Selenium ou chamadas de API para buscar esses documentos, e esses scripts quebram quando o portal muda.

A automação de browser do Triggerfish usa Chromium controlado via CDP com um LLM lendo snapshots de página para navegar. O agente vê a página como um ser humano veria e clica, digita e rola com base no que vê em vez de seletores CSS hardcoded. Quando um portal de pagador redesenha sua página de login, o agente se adapta porque ainda consegue identificar o campo de usuário, o campo de senha e o botão de envio pelo contexto visual. Quando um menu de navegação muda, o agente encontra o novo caminho para a seção de download de documentos.

Isso não é perfeitamente confiável. CAPTCHAs, fluxos de autenticação multifator e portais fortemente dependentes de JavaScript ainda causam problemas. Mas o modo de falha é fundamentalmente diferente dos scripts tradicionais. Um script Selenium falha silenciosamente quando um seletor CSS para de corresponder. Um agente do Triggerfish relata o que vê, o que tentou e onde ficou preso, dando ao operador contexto suficiente para intervir ou ajustar o workflow.

### Processamento com portão de classificação

Documentos carregam diferentes níveis de sensibilidade, e o sistema de classificação lida com isso automaticamente. Uma fatura contendo termos de preços pode ser CONFIDENTIAL. Uma resposta a uma RFP pública pode ser INTERNAL. Um documento contendo PHI é RESTRICTED. Quando o sub-agente LLM lê um documento e extrai dados, o hook POST_TOOL_RESPONSE classifica o conteúdo extraído e o taint da sessão escalona de acordo.

Isso importa para o roteamento downstream. Dados de fatura extraídos classificados como CONFIDENTIAL não podem ser enviados a um canal Slack classificado como PUBLIC. Um workflow que processa documentos de seguros contendo PHI restringe automaticamente para onde os dados extraídos podem fluir. A regra de proibição de write-down aplica isso em cada fronteira, e o LLM não tem nenhuma autoridade para contorná-la.

Para os setores de saúde e serviços financeiros especificamente, isso significa que a sobrecarga de conformidade do processamento automatizado de documentos cai drasticamente. Em vez de construir controles de acesso personalizados em cada etapa de cada pipeline, o sistema de classificação os trata uniformemente. Um auditor pode rastrear exatamente quais documentos foram processados, quais dados foram extraídos, para onde foram enviados e confirmar que nenhum dado fluiu para um destino inadequado, tudo a partir dos registros de lineage criados automaticamente em cada etapa.

### Adaptação de formato com auto-recuperação

Quando um fornecedor muda seu template de fatura, a automação tradicional quebra e permanece quebrada até que alguém atualize manualmente as regras de extração. No Triggerfish, o sub-agente LLM se adapta na próxima execução. Ele ainda encontra o número da fatura, os itens de linha e o total, porque está lendo por significado e não por posição. A extração é bem-sucedida, os dados são validados contra as mesmas regras de negócio e o workflow se completa.

Com o tempo, o agente pode usar memória entre sessões para aprender padrões. Se o fornecedor A sempre inclui uma taxa de reposição que outros fornecedores não incluem, o agente se lembra disso de extrações anteriores e sabe que deve procurar por ela. Se um determinado formato de EOB de pagador sempre coloca os códigos de ajuste em uma localização incomum, a memória do agente de extrações bem-sucedidas anteriores torna as futuras mais confiáveis.

Quando uma mudança de formato é significativa o suficiente para que a confiança de extração do LLM caia abaixo do limiar definido no workflow, o workflow roteia o documento para uma fila de revisão humana em vez de fazer suposições. As correções do revisor são alimentadas de volta pelo workflow, e a memória do agente armazena o novo padrão para referência futura. O sistema fica mais inteligente com o tempo sem que ninguém reescreva as regras de extração.

### Orquestração de pipeline

A ingestão de documentos raramente é apenas "extrair e armazenar". Um pipeline completo busca o documento, extrai dados estruturados, valida-os contra registros existentes, enriquece-os com dados de outros sistemas, roteia exceções para revisão humana e carrega os dados validados no sistema de destino. O mecanismo de workflow lida com tudo isso em uma única definição YAML.

Um pipeline de autorização prévia de saúde pode ser assim: a automação de browser busca a imagem do fax do portal do provedor, um sub-agente LLM extrai identificadores do paciente e códigos de procedimento, uma chamada HTTP valida o paciente contra o EHR, outro sub-agente avalia se a autorização atende aos critérios de necessidade médica com base na documentação clínica, e o resultado é roteado para aprovação automática ou para uma fila de revisão clínica. Cada etapa é rastreada por classificação. Cada dado PHI é marcado com taint. A trilha de auditoria completa existe automaticamente.

## Como fica na prática

Um sistema de saúde regional processa solicitações de autorização prévia de quarenta consultórios médicos diferentes, cada um usando seu próprio layout de formulário, alguns por fax, alguns por email, alguns carregados em um portal. A abordagem tradicional exigia uma equipe de oito pessoas para revisar e inserir manualmente cada solicitação, porque nenhuma ferramenta de automação conseguia lidar com a variação de formato de forma confiável.

Com o Triggerfish, um workflow lida com o pipeline completo. A automação de browser ou a análise de email recupera os documentos. Sub-agentes LLM extraem os dados estruturados independentemente do formato. Etapas de validação verificam os dados extraídos contra o EHR e os bancos de dados de formulários. Um classification ceiling de RESTRICTED garante que PHI nunca saia da fronteira do pipeline. Documentos que o LLM não consegue analisar com alta confiança são roteados para um revisor humano, mas esse volume diminui com o tempo à medida que a memória do agente constrói uma biblioteca de padrões de formato.

A equipe de oito pessoas torna-se duas pessoas lidando com as exceções sinalizadas pelo sistema, mais auditorias periódicas de qualidade das extrações automatizadas. As mudanças de formato dos consultórios são absorvidas automaticamente. Novos layouts de formulário são tratados no primeiro encontro. O custo de manutenção que consumia a maior parte do orçamento de automação tradicional cai para quase zero.
