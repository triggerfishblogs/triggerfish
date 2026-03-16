---
title: AI Inference em fluxos de trabalho de produção
description: Como o Triggerfish preenche a lacuna entre demos de AI e fluxos de trabalho de produção duráveis com aplicação de segurança, trilhas de auditoria e orquestração de workflows.
---

# Integração de inferência AI/ML em fluxos de trabalho de produção

A maioria dos projetos de AI empresarial morre na lacuna entre a demo e a produção. Uma equipe cria uma prova de conceito que usa GPT-4 para classificar tickets de suporte, resumir documentos jurídicos ou gerar textos de marketing. A demo funciona. A liderança fica animada. Então o projeto para por meses tentando responder a perguntas que a demo nunca precisou responder: de onde vêm os dados? Para onde vai a saída? Quem aprova as decisões da AI? O que acontece quando o modelo alucina? Como auditamos o que fez? Como impedimos que acesse dados que não deveria ver? Como impedimos que envie informações sensíveis para o lugar errado?

Essas não são preocupações hipotéticas. 95% dos pilotos de AI generativa empresarial falham em entregar retornos financeiros, e o motivo não é que a tecnologia não funciona. Os modelos são capazes. A falha está no encanamento: integrar a inferência de AI de forma confiável nos fluxos de trabalho de negócio reais onde precisa operar, com os controles de segurança, tratamento de erros e trilhas de auditoria que os sistemas de produção exigem.

A resposta típica das empresas é construir uma camada de integração personalizada. Uma equipe de engenharia passa meses conectando o modelo de AI às fontes de dados, construindo o pipeline, adicionando autenticação, implementando logging, criando um workflow de aprovação e adicionando verificações de segurança. Quando a integração está "pronta para produção", o modelo original foi superado por um mais novo, os requisitos de negócio mudaram e a equipe precisa recomeçar.

## Como o Triggerfish resolve isso

O Triggerfish elimina a lacuna de integração tornando a inferência de AI uma etapa de primeira classe no mecanismo de workflow, governada pela mesma aplicação de segurança, log de auditoria e controles de classificação que se aplicam a todas as outras operações no sistema. Uma etapa de sub-agente LLM em um workflow do Triggerfish não é um complemento. É uma operação nativa com os mesmos hooks de política, rastreamento de lineage e prevenção de write-down de uma chamada HTTP ou uma consulta a banco de dados.

### AI como etapa de workflow, não como sistema separado

No DSL de workflow, uma etapa de inferência LLM é definida com `call: triggerfish:llm`. A descrição da tarefa instrui o sub-agente sobre o que fazer em linguagem natural. O sub-agente tem acesso a todas as ferramentas registradas no Triggerfish. Pode pesquisar na web, consultar bancos de dados por meio de ferramentas MCP, ler documentos, navegar em sites e usar memória entre sessões. Quando a etapa é concluída, sua saída alimenta diretamente a próxima etapa do workflow.

Isso significa que não há um "sistema de AI" separado para integrar. A inferência acontece dentro do workflow, usando as mesmas credenciais, as mesmas conexões de dados e a mesma aplicação de segurança de tudo o mais. Uma equipe de engenharia não precisa construir uma camada de integração personalizada porque a camada de integração já existe.

### Segurança que não requer engenharia personalizada

A parte mais demorada de colocar um workflow de AI em produção não é a AI. É o trabalho de segurança e conformidade. Quais dados o modelo pode ver? Para onde pode enviar sua saída? Como impedimos que vaze informações sensíveis? Como registramos tudo para auditoria?

No Triggerfish, essas perguntas são respondidas pela arquitetura da plataforma, não por engenharia por projeto. O sistema de classificação rastreia a sensibilidade dos dados em cada fronteira. O taint da sessão escalona quando o modelo acessa dados classificados. A prevenção de write-down bloqueia a saída de fluir para um canal classificado abaixo do nível de taint da sessão. Cada chamada de ferramenta, cada acesso a dados e cada decisão de saída é registrada com lineage completo.

Um workflow de AI que lê registros de clientes (CONFIDENTIAL) e gera um resumo não pode enviar esse resumo para um canal público do Slack. Isso não é aplicado por uma instrução no prompt que o modelo pode ignorar. É aplicado por código determinístico no hook PRE_OUTPUT que o modelo não pode ver, não pode modificar e não pode contornar. Os hooks de política são executados abaixo da camada LLM. O LLM solicita uma ação e a camada de política decide se permite. Timeout equivale a rejeição. Não há caminho do modelo para o mundo externo que não passe pela aplicação.

### Trilhas de auditoria que já existem

Cada decisão de AI em um workflow do Triggerfish gera registros de lineage automaticamente. O lineage rastreia quais dados o modelo acessou, qual nível de classificação carregavam, quais transformações foram aplicadas e para onde a saída foi enviada. Isso não é um recurso de logging que precisa ser habilitado ou configurado. É uma propriedade estrutural da plataforma. Cada elemento de dado carrega metadados de proveniência desde a criação por cada transformação até seu destino final.

Para setores regulados, isso significa que as evidências de conformidade para um workflow de AI existem desde o primeiro dia. Um auditor pode rastrear qualquer saída gerada por AI por toda a cadeia: qual modelo a produziu, em quais dados se baseou, quais ferramentas o modelo usou durante o raciocínio, qual nível de classificação se aplicava em cada etapa e se ocorreram ações de aplicação de política. Essa coleta de evidências acontece automaticamente porque está integrada nos hooks de aplicação, não adicionada como uma camada de relatório.

### Flexibilidade de modelo sem re-arquitetura

O Triggerfish suporta múltiplos provedores LLM por meio da interface LlmProvider: Anthropic, OpenAI, Google, modelos locais via Ollama e OpenRouter para qualquer modelo roteado. A seleção do provedor é configurável por agente com failover automático. Quando um modelo melhor fica disponível ou um provedor muda os preços, a troca acontece no nível de configuração sem tocar nas definições dos workflows.

Isso aborda diretamente o problema "o projeto está obsoleto antes de ser entregue". As definições de workflow descrevem o que a AI deve fazer, não qual modelo faz isso. Mudar de GPT-4 para Claude para um modelo local ajustado altera um único valor de configuração. O workflow, os controles de segurança, as trilhas de auditoria e os pontos de integração permanecem exatamente iguais.

### Cron, webhooks e execução orientada a eventos

Workflows de AI que são executados em agendamento ou em resposta a eventos não precisam que um ser humano os inicie. O agendador suporta expressões cron de cinco campos para workflows recorrentes e endpoints de webhook para triggers orientados a eventos. Um workflow de geração de relatório diário é executado às 6h. Um workflow de classificação de documentos é disparado quando um novo arquivo chega via webhook. Um workflow de análise de sentimento é acionado a cada novo ticket de suporte.

Cada execução agendada ou orientada a evento cria uma sessão isolada com taint fresco. O workflow é executado em seu próprio contexto de segurança, independente de qualquer sessão interativa. Se o workflow acionado por cron acessar dados CONFIDENTIAL, somente o histórico dessa execução é classificado como CONFIDENTIAL. Outros workflows agendados em execução com classificação PUBLIC não são afetados.

### Tratamento de erros e supervisão humana

Workflows de AI em produção precisam lidar com falhas de forma elegante. O DSL de workflow suporta `raise` para condições de erro explícitas e semânticas try/catch por meio do tratamento de erros em definições de tarefas. Quando um sub-agente LLM produz saída de baixa confiança ou encontra uma situação que não consegue lidar, o workflow pode rotear para uma fila de aprovação humana, enviar uma notificação pelo serviço de notificação ou tomar uma ação de fallback.

O serviço de notificação entrega alertas em todos os canais conectados com prioridade e deduplicação. Se um workflow precisa de aprovação humana antes que uma emenda de contrato gerada por AI seja enviada, a solicitação de aprovação pode chegar no Slack, WhatsApp, email ou onde quer que o aprovador esteja. O workflow pausa até que a aprovação chegue e então continua de onde parou.

## Como fica na prática

Um departamento jurídico quer automatizar a revisão de contratos. A abordagem tradicional: seis meses de desenvolvimento personalizado para construir um pipeline que extrai cláusulas de contratos carregados, classifica níveis de risco, sinaliza termos não padrão e gera um resumo para o advogado revisor. O projeto requer uma equipe de engenharia dedicada, uma revisão de segurança personalizada, aprovação de conformidade e manutenção contínua.

Com o Triggerfish, a definição do workflow leva um dia para ser escrita. O upload aciona um webhook. Um sub-agente LLM lê o contrato, extrai cláusulas-chave, classifica níveis de risco e identifica termos não padrão. Uma etapa de validação verifica a extração contra a biblioteca de cláusulas do escritório armazenada em memória. O resumo é roteado para o canal de notificação do advogado designado. Todo o pipeline é executado com classificação RESTRICTED porque os contratos contêm informações privilegiadas do cliente, e a prevenção de write-down garante que nenhum dado contratual vaze para um canal abaixo de RESTRICTED.

Quando o escritório muda de provedor LLM (porque um novo modelo lida melhor com linguagem jurídica, ou porque o provedor atual aumenta os preços), a mudança é uma única linha na configuração. A definição do workflow, os controles de segurança, a trilha de auditoria e o roteamento de notificações continuam funcionando sem modificação. Quando o escritório adiciona um novo tipo de cláusula ao seu framework de risco, o sub-agente LLM o incorpora sem reescrever regras de extração porque lê por significado, não por padrões.

A equipe de conformidade obtém uma trilha de auditoria completa desde o primeiro dia. Cada contrato processado, cada cláusula extraída, cada classificação de risco atribuída, cada notificação enviada e cada aprovação de advogado registrada, com lineage completo de volta ao documento de origem. A coleta de evidências que teria levado semanas de trabalho de relatório personalizado existe automaticamente como uma propriedade estrutural da plataforma.
