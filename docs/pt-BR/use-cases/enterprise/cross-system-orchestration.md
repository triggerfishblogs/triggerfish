---
title: Orquestração entre sistemas
description: Como o Triggerfish lida com fluxos de trabalho que abrangem 12+ sistemas com decisões contextuais em cada etapa, sem a fragilidade que mata a automação tradicional.
---

# Orquestração entre sistemas com decisões contextuais

Um fluxo de trabalho típico de procure-to-pay toca uma dúzia de sistemas. Uma solicitação de compra começa em uma plataforma, é roteada para uma cadeia de aprovação em outra, aciona uma consulta de fornecedor em uma terceira, cria um pedido de compra em uma quarta, inicia um processo de recebimento em uma quinta, faz a conciliação de faturas em uma sexta, agenda o pagamento em uma sétima e registra tudo em uma oitava. Cada sistema tem sua própria API, seu próprio ciclo de atualização, seu próprio modelo de autenticação e seus próprios modos de falha.

A automação tradicional lida com isso por meio de pipelines rígidos. A etapa um chama a API A, analisa a resposta, passa um campo para a etapa dois, que chama a API B. Funciona até parar de funcionar. Um registro de fornecedor tem um formato ligeiramente diferente do esperado. Uma aprovação retorna com um código de status para o qual o pipeline não foi projetado. Um novo campo obrigatório aparece em uma atualização de API. Uma etapa quebrada quebra toda a cadeia, e ninguém sabe até que um processo downstream falhe dias depois.

O problema mais profundo não é a fragilidade técnica. É que os processos de negócio reais exigem julgamento. Essa discrepância na fatura deve ser escalada ou resolvida automaticamente? O padrão de atrasos nas entregas desse fornecedor justifica uma revisão do contrato? Esta solicitação de aprovação é urgente o suficiente para pular o roteamento padrão? Essas decisões atualmente vivem na cabeça das pessoas, o que significa que a automação só consegue lidar com o caminho feliz.

## Como o Triggerfish resolve isso

O mecanismo de fluxo de trabalho do Triggerfish executa definições de workflow baseadas em YAML que combinam automação determinística com raciocínio de AI em um único pipeline. Cada etapa no workflow passa pelo mesmo nível de aplicação de segurança que governa todas as operações do Triggerfish, de modo que o rastreamento de classificação e as trilhas de auditoria se mantêm em toda a cadeia, independentemente de quantos sistemas estejam envolvidos.

### Etapas determinísticas para trabalho determinístico

Quando uma etapa do workflow tem uma entrada conhecida e uma saída conhecida, ela é executada como uma chamada HTTP padrão, um comando shell ou uma invocação de ferramenta MCP. Sem envolvimento do LLM, sem penalidade de latência, sem custo de inferência. O mecanismo de workflow suporta `call: http` para APIs REST, `call: triggerfish:mcp` para qualquer servidor MCP conectado e `run: shell` para ferramentas de linha de comando. Essas etapas são executadas exatamente como a automação tradicional, porque para trabalho previsível, a automação tradicional é a abordagem correta.

### Sub-agentes LLM para decisões contextuais

Quando uma etapa do workflow requer raciocínio contextual, o mecanismo cria uma sessão real de sub-agente LLM usando `call: triggerfish:llm`. Isso não é um único par prompt/resposta. O sub-agente tem acesso a todas as ferramentas registradas no Triggerfish, incluindo busca na web, memória, automação de browser e todas as integrações conectadas. Pode ler documentos, consultar bancos de dados, comparar registros e tomar uma decisão com base em tudo que encontrar.

A saída do sub-agente alimenta diretamente a próxima etapa do workflow. Se ele acessou dados classificados durante o raciocínio, o taint da sessão escalona automaticamente e se propaga de volta ao workflow pai. O mecanismo de workflow rastreia isso, então um workflow que começou em PUBLIC mas acessou dados CONFIDENTIAL durante uma decisão contextual tem todo seu histórico de execução armazenado no nível CONFIDENTIAL. Uma sessão com classificação inferior não consegue nem ver que o workflow foi executado.

### Ramificação condicional com base em contexto real

O DSL de workflow suporta blocos `switch` para roteamento condicional, loops `for` para processamento em lote e operações `set` para atualização do estado do workflow. Combinado com etapas de sub-agente LLM que podem avaliar condições complexas, isso significa que o workflow pode se ramificar com base em contexto de negócio real em vez de apenas valores de campos.

Um workflow de compras pode rotear de forma diferente com base na avaliação de risco do fornecedor pelo sub-agente. Um workflow de onboarding pode pular etapas irrelevantes para um determinado cargo. Um workflow de resposta a incidentes pode escalar para equipes diferentes com base na análise de causa raiz do sub-agente. A lógica de ramificação vive na definição do workflow, mas as entradas das decisões vêm do raciocínio de AI.

### Auto-recuperação quando sistemas mudam

Quando uma etapa determinística falha porque uma API mudou seu formato de resposta ou um sistema retornou um erro inesperado, o workflow não simplesmente para. O mecanismo pode delegar a etapa com falha a um sub-agente LLM que lê o erro, inspeciona a resposta e tenta uma abordagem alternativa. Uma API que adicionou um novo campo obrigatório é tratada pelo sub-agente que lê a mensagem de erro e ajusta a requisição. Um sistema que mudou seu fluxo de autenticação é navegado pelas ferramentas de automação de browser.

Isso não significa que toda falha seja magicamente resolvida. Mas significa que o workflow degrada de forma elegante em vez de falhar silenciosamente. O sub-agente ou encontra um caminho a seguir ou produz uma explicação clara do que mudou e por que a intervenção manual é necessária, em vez de um código de erro críptico enterrado em um arquivo de log que ninguém verifica.

### Segurança em toda a cadeia

Cada etapa em um workflow do Triggerfish passa pelos mesmos hooks de aplicação de política de qualquer chamada direta de ferramenta. PRE_TOOL_CALL valida permissões e verifica limites de frequência antes da execução. POST_TOOL_RESPONSE classifica os dados retornados e atualiza o taint da sessão. PRE_OUTPUT garante que nada deixe o sistema em um nível de classificação superior ao que o destino permite.

Isso significa que um workflow que lê do CRM (CONFIDENTIAL), processa os dados por um LLM e envia um resumo para o Slack não vaza acidentalmente detalhes confidenciais em um canal público. A regra de proibição de write-down a captura no hook PRE_OUTPUT, independentemente de quantas etapas intermediárias os dados passaram. A classificação viaja com os dados por todo o workflow.

A própria definição do workflow pode definir um `classification_ceiling` que impede o workflow de acessar dados acima de um nível especificado. Um workflow de resumo semanal classificado como INTERNAL não pode acessar dados CONFIDENTIAL mesmo que tenha as credenciais para isso. O teto é aplicado em código, não esperando que o LLM respeite uma instrução no prompt.

### Triggers de cron e webhook

Os workflows não precisam que alguém os inicie manualmente. O agendador suporta triggers baseados em cron para workflows recorrentes e triggers de webhook para execução orientada a eventos. Um workflow de briefing matinal é executado às 7h. Um workflow de revisão de PR é disparado quando o GitHub envia um webhook. Um workflow de processamento de faturas é acionado quando um novo arquivo aparece em uma unidade compartilhada.

Eventos de webhook carregam seu próprio nível de classificação. Um webhook do GitHub para um repositório privado é classificado automaticamente como CONFIDENTIAL com base nos mapeamentos de classificação de domínio na configuração de segurança. O workflow herda essa classificação e toda a aplicação downstream se aplica.

## Como fica na prática

Uma empresa de médio porte executando procure-to-pay entre NetSuite, Coupa, DocuSign e Slack define um workflow Triggerfish que lida com o ciclo completo. Etapas determinísticas lidam com as chamadas de API para criar pedidos de compra, rotear aprovações e conciliar faturas. Etapas de sub-agente LLM lidam com as exceções: faturas com itens de linha que não correspondem ao pedido de compra, fornecedores que enviaram documentação em um formato inesperado, solicitações de aprovação que precisam de contexto sobre o histórico do solicitante.

O workflow é executado em uma instância do Triggerfish auto-hospedada. Nenhum dado sai da infraestrutura da empresa. O sistema de classificação garante que os dados financeiros do NetSuite permaneçam em CONFIDENTIAL e não possam ser enviados a um canal Slack classificado como INTERNAL. A trilha de auditoria captura cada decisão que o sub-agente LLM tomou, cada ferramenta que chamou e cada dado que acessou, armazenados com rastreamento completo de lineage para revisão de conformidade.

Quando o Coupa atualiza sua API e muda um nome de campo, a etapa HTTP determinística do workflow falha. O mecanismo delega para um sub-agente que lê o erro, identifica o campo alterado e tenta novamente com o parâmetro correto. O workflow se completa sem intervenção humana, e o incidente é registrado para que um engenheiro possa atualizar a definição do workflow para lidar com o novo formato no futuro.
