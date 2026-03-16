---
title: Automação de portais de terceiros
description: Como o Triggerfish automatiza interações com portais de fornecedores, sites governamentais e sistemas de pagadores sem quebrar quando a interface muda.
---

# Automação de interface contra portais de terceiros

Toda empresa tem uma lista de portais que funcionários acessam manualmente, todos os dias, para fazer trabalhos que deveriam ser automatizados mas não são. Portais de fornecedores para verificar status de pedidos. Sites governamentais para enviar comunicações regulatórias. Portais de pagadores de seguros para verificar elegibilidade e verificar status de sinistros. Conselhos de licenciamento estaduais para verificação de credenciais. Portais de autoridades fiscais para arquivamentos de conformidade.

Esses portais não têm APIs. Ou têm APIs não documentadas, com limite de taxa ou restritas a "parceiros preferidos" que pagam pelo acesso. Os dados ficam atrás de uma página de login, renderizados em HTML, e a única forma de obtê-los é fazer login e navegar na interface.

A automação tradicional usa scripts de browser. Scripts Selenium, Playwright ou Puppeteer que fazem login, navegam para a página certa, encontram elementos por seletor CSS ou XPath, extraem os dados e fazem logout. Esses scripts funcionam até pararem de funcionar. Um redesign do portal muda os nomes das classes CSS. Um novo CAPTCHA é adicionado ao fluxo de login. O menu de navegação se move de uma barra lateral para um menu hamburger. Um banner de consentimento de cookies começa a cobrir o botão de envio. O script quebra silenciosamente e ninguém percebe até que o processo downstream que depende dos dados começa a produzir erros.

Os conselhos médicos estaduais são um exemplo particularmente brutal. Há cinquenta deles, cada um com um site diferente, layouts diferentes, métodos de autenticação diferentes e formatos de dados diferentes. Eles redesenham em seus próprios cronogramas sem aviso. Um serviço de verificação de credenciais que depende de scraping desses sites pode ter cinco ou dez de seus cinquenta scripts quebrados a qualquer momento, cada um exigindo que um desenvolvedor inspecione o novo layout e reescreva os seletores.

## Como o Triggerfish resolve isso

A automação de browser do Triggerfish combina Chromium controlado via CDP com navegação visual baseada em LLM. O agente vê a página como pixels renderizados e snapshots de acessibilidade, não como uma árvore DOM. Ele identifica elementos pelo que parecem e pelo que fazem, não pelos nomes de suas classes CSS. Quando um portal é redesenhado, o agente se adapta porque formulários de login ainda parecem formulários de login, menus de navegação ainda parecem menus de navegação e tabelas de dados ainda parecem tabelas de dados.

### Navegação visual em vez de scripts com seletores

As ferramentas de automação de browser funcionam por meio de sete operações: navigate, snapshot, click, type, select, scroll e wait. O agente navega para uma URL, tira uma snapshot da página renderizada, raciocina sobre o que vê e decide qual ação tomar. Não há ferramenta `evaluate` que execute JavaScript arbitrário no contexto da página. Esta é uma decisão de segurança deliberada. O agente interage com a página da mesma forma que um ser humano faria, pela interface, e não pode executar código que poderia ser explorado por uma página maliciosa.

Quando o agente encontra um formulário de login, identifica o campo de usuário, o campo de senha e o botão de envio com base no layout visual, texto de placeholder, rótulos e estrutura da página. Ele não precisa saber que o campo de usuário tem `id="auth-input-email"` ou `class="login-form__email-field"`. Quando esses identificadores mudam em um redesign, o agente não percebe porque nunca dependeu deles.

### Segurança de domínio compartilhada

A navegação do browser compartilha a mesma configuração de segurança de domínio das operações de web fetch. Um único bloco de configuração em `triggerfish.yaml` define listas de bloqueio de SSRF, listas de domínios permitidos, listas de domínios bloqueados e mapeamentos de domínio para classificação. Quando o agente navega para um portal de fornecedor classificado como CONFIDENTIAL, o taint da sessão escalona automaticamente para CONFIDENTIAL, e todas as ações subsequentes naquele workflow estão sujeitas às restrições de nível CONFIDENTIAL.

A lista de bloqueio de SSRF é hardcoded e não pode ser substituída. Intervalos de IP privados, endereços link-local e endpoints de metadados de nuvem são sempre bloqueados. A resolução DNS é verificada antes da requisição, prevenindo ataques de rebinding DNS. Isso importa porque a automação de browser é a superfície de ataque de maior risco em qualquer sistema de agente. Uma página maliciosa que tenta redirecionar o agente para um serviço interno é bloqueada antes que a requisição saia do sistema.

### Marca d'água de perfil de browser

Cada agente mantém seu próprio perfil de browser, que acumula cookies, armazenamento local e dados de sessão conforme interage com portais ao longo do tempo. O perfil carrega uma marca d'água de classificação que registra o nível de classificação mais alto no qual foi utilizado. Essa marca d'água só pode escalonar, nunca diminuir.

Se um agente usa seu perfil de browser para fazer login em um portal de fornecedor CONFIDENTIAL, o perfil é marcado como CONFIDENTIAL. Uma sessão subsequente em execução com classificação PUBLIC não pode usar esse perfil, prevenindo vazamento de dados por meio de credenciais em cache, cookies ou tokens de sessão que possam conter informações sensíveis. O isolamento do perfil é por agente e a aplicação da marca d'água é automática.

Isso resolve um problema sutil mas importante na automação de portais. Perfis de browser acumulam estado que reflete os dados que acessaram. Sem marcação d'água, um perfil que fez login em um portal sensível poderia vazar informações por meio de sugestões de preenchimento automático, dados de página em cache ou cookies persistentes para uma sessão com classificação inferior.

### Gerenciamento de credenciais

As credenciais do portal são armazenadas no keychain do sistema operacional (nível pessoal) ou no cofre empresarial (nível enterprise), nunca em arquivos de configuração ou variáveis de ambiente. O hook SECRET_ACCESS registra cada recuperação de credencial. As credenciais são resolvidas no momento da execução pelo mecanismo de workflow e injetadas em sessões de browser por meio da interface de digitação, não definindo valores de formulário programaticamente. Isso significa que as credenciais fluem pelo mesmo nível de segurança de qualquer outra operação sensível.

### Resiliência a mudanças comuns em portais

Veja o que acontece quando mudanças comuns em portais ocorrem:

**Redesign da página de login.** O agente tira uma nova snapshot, identifica o layout atualizado e encontra os campos do formulário por contexto visual. A menos que o portal tenha mudado para um método de autenticação completamente diferente (SAML, OAuth, token de hardware), o login continua funcionando sem nenhuma mudança de configuração.

**Reestruturação da navegação.** O agente lê a página após o login e navega para a seção de destino com base em texto de link, rótulos de menu e cabeçalhos de página em vez de padrões de URL. Se o portal de fornecedor moveu "Status do Pedido" da barra lateral esquerda para um menu dropdown superior, o agente o encontra lá.

**Novo banner de consentimento de cookies.** O agente vê o banner, identifica o botão aceitar/fechar, clica nele e continua com a tarefa original. Isso é tratado pelo entendimento geral de página do LLM, não por um manipulador especial de cookies.

**CAPTCHA adicionado.** É aqui que a abordagem tem limitações honestas. CAPTCHAs simples de imagem podem ser resolvíveis dependendo das capacidades de visão do LLM, mas sistemas de análise comportamental como reCAPTCHA v3 e similares podem bloquear browsers automatizados. O workflow roteia esses para uma fila de intervenção humana em vez de falhar silenciosamente.

**Prompts de autenticação multifator.** Se o portal começa a exigir MFA que não era necessário anteriormente, o agente detecta a página inesperada, relata a situação pelo sistema de notificação e pausa o workflow até que um ser humano complete a etapa de MFA. O workflow pode ser configurado para aguardar a conclusão do MFA e então retomar de onde parou.

### Processamento em lote em múltiplos portais

O suporte a loop `for` do mecanismo de workflow significa que um único workflow pode iterar sobre múltiplos alvos de portais. Um serviço de verificação de credenciais pode definir um workflow que verifica o status de licenciamento em todos os cinquenta conselhos médicos estaduais em uma única execução em lote. Cada interação com portal é executada como uma sub-etapa separada com sua própria sessão de browser, seu próprio rastreamento de classificação e seu próprio tratamento de erros. Se três de cinquenta portais falharem, o workflow completa os outros quarenta e sete e roteia as três falhas para uma fila de revisão com contexto detalhado de erro.

## Como fica na prática

Uma organização de credenciamento verifica licenças de provedores de saúde em conselhos médicos estaduais como parte do processo de inscrição de provedores. Tradicionalmente, assistentes de credenciamento fazem login manualmente no site de cada conselho, procuram o provedor, tiram screenshot do status da licença e inserem os dados no sistema de credenciamento. Cada verificação leva de cinco a quinze minutos, e a organização processa centenas por semana.

Com o Triggerfish, um workflow lida com o ciclo completo de verificação. O workflow recebe um lote de provedores com seus números de licença e estados de destino. Para cada provedor, a automação de browser navega para o portal do conselho estadual relevante, faz login com credenciais armazenadas, procura o provedor, extrai o status da licença e a data de expiração e armazena o resultado. Os dados extraídos são classificados como CONFIDENTIAL porque contêm PII de provedor, e as regras de write-down impedem que sejam enviados para qualquer canal abaixo desse nível de classificação.

Quando um conselho estadual redesenha seu portal, o agente se adapta na próxima tentativa de verificação. Quando um conselho adiciona um CAPTCHA que bloqueia o acesso automatizado, o workflow sinaliza aquele estado para verificação manual e continua processando o restante do lote. Os assistentes de credenciamento passam de fazer todas as verificações manualmente para lidar apenas com as exceções que a automação não consegue resolver.
