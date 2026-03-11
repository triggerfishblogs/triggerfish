---
title: Preços
---

<style>
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  margin: 32px 0;
}

.pricing-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 32px 24px;
  background: var(--vp-c-bg-soft);
  display: flex;
  flex-direction: column;
}

.pricing-card.featured {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1);
}

.pricing-card h3 {
  margin: 0 0 8px;
  font-size: 22px;
}

.pricing-card .price {
  font-size: 36px;
  font-weight: 700;
  margin: 8px 0 4px;
}

.pricing-card .price span {
  font-size: 16px;
  font-weight: 400;
  color: var(--vp-c-text-2);
}

.pricing-card .subtitle {
  color: var(--vp-c-text-2);
  font-size: 14px;
  margin-bottom: 24px;
}

.pricing-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  flex: 1;
}

.pricing-card ul li {
  padding: 6px 0;
  font-size: 14px;
  line-height: 1.5;
}

.pricing-card ul li::before {
  content: "\2713\00a0";
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.pricing-card ul li.excluded::before {
  content: "\2014\00a0";
  color: var(--vp-c-text-3);
}

.pricing-card .cta {
  display: block;
  text-align: center;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  margin-top: auto;
}

.pricing-card .cta.primary {
  background: #16a34a;
  color: var(--vp-c-white);
}

.pricing-card .cta.primary:hover {
  background: #15803d;
}

.pricing-card .cta.secondary {
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.pricing-card .cta.secondary:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  margin: 32px 0;
  font-size: 14px;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}

.comparison-table th {
  font-weight: 600;
  background: var(--vp-c-bg-soft);
}

.comparison-table td:not(:first-child) {
  text-align: center;
}

.comparison-table th:not(:first-child) {
  text-align: center;
}

.comparison-table .section-header {
  font-weight: 700;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.faq-section h3 {
  margin-top: 32px;
}
</style>

# Preços

O Triggerfish é código aberto e sempre será. Use suas próprias API keys e
execute tudo localmente de graça. O Triggerfish Gateway adiciona um backend de
LLM gerenciado, busca na web, túneis e atualizações — para que você não precise
gerenciar nada disso.

::: info Acesso antecipado
O Triggerfish Gateway está atualmente em acesso antecipado. Preços e
funcionalidades podem mudar conforme aperfeiçoamos o produto. Assinantes do
acesso antecipado mantêm sua tarifa fixa.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">Grátis</div>
  <div class="subtitle">Para sempre. Apache 2.0.</div>
  <ul>
    <li>Plataforma completa de agentes</li>
    <li>Todos os canais (Telegram, Slack, Discord, WhatsApp, etc.)</li>
    <li>Todas as integrações (GitHub, Google, Obsidian, etc.)</li>
    <li>Classificação e aplicação de políticas</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>Automação do navegador</li>
    <li>Use suas próprias keys de LLM (Anthropic, OpenAI, Google, Ollama, etc.)</li>
    <li>Use suas próprias keys de busca (Brave, SearXNG)</li>
    <li>Atualizações automáticas</li>
  </ul>
  <a href="/pt-BR/guide/installation" class="cta secondary">Instalar agora</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/mês</span></div>
  <div class="subtitle">Tudo o que você precisa. Sem API keys necessárias.</div>
  <ul>
    <li>Tudo do Open Source</li>
    <li>Inferência de IA incluída — backend de LLM gerenciado, sem API keys necessárias</li>
    <li>Busca na web incluída</li>
    <li>Túnel na nuvem para webhooks</li>
    <li>Tarefas agendadas</li>
    <li>Configuração em menos de 2 minutos</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=pt-BR" class="cta primary">Assinar</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/mês</span></div>
  <div class="subtitle">5x mais uso que o Pro. Para cargas de trabalho pesadas.</div>
  <ul>
    <li>Tudo do Pro</li>
    <li>Inferência de IA incluída — limites de uso mais altos</li>
    <li>Equipes de agentes — colaboração multi-agente</li>
    <li>Mais sessões simultâneas</li>
    <li>Múltiplos túneis na nuvem</li>
    <li>Tarefas agendadas ilimitadas</li>
    <li>Respostas de IA mais longas</li>
    <li>Suporte prioritário</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=pt-BR" class="cta primary">Assinar</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Personalizado</div>
  <div class="subtitle">Implantações para equipes com SSO e conformidade.</div>
  <ul>
    <li>Tudo do Power</li>
    <li>Licenças multi-usuário</li>
    <li>Integração SSO / SAML</li>
    <li>Limites de uso personalizados</li>
    <li>Roteamento de modelos personalizado</li>
    <li>Suporte dedicado</li>
    <li>Garantias de SLA</li>
    <li>Opções de implantação on-premise</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Falar com vendas</a>
</div>

</div>

## Comparação de funcionalidades

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>Open Source</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">Plataforma</td></tr>
<tr><td>Todos os canais</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Todas as integrações</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Motor de classificação e políticas</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Automação do navegador</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Ambiente de execução</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Equipes de agentes</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">IA e busca</td></tr>
<tr><td>Provedor de LLM</td><td>Use o seu</td><td>Gerenciado</td><td>Gerenciado</td><td>Gerenciado</td></tr>
<tr><td>Busca na web</td><td>Use o seu</td><td>Incluída</td><td>Incluída</td><td>Incluída</td></tr>
<tr><td>Uso de IA</td><td>Seus limites de API</td><td>Padrão</td><td>Estendido</td><td>Personalizado</td></tr>

<tr class="section-header"><td colspan="5">Infraestrutura</td></tr>
<tr><td>Túneis na nuvem</td><td>&mdash;</td><td>&#10003;</td><td>Múltiplos</td><td>Personalizado</td></tr>
<tr><td>Tarefas agendadas</td><td>Ilimitadas</td><td>&#10003;</td><td>Ilimitadas</td><td>Ilimitadas</td></tr>
<tr><td>Atualizações automáticas</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Suporte e administração</td></tr>
<tr><td>Suporte da comunidade</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Suporte prioritário</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Licenças multi-usuário</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Como o Triggerfish Gateway funciona

O Triggerfish Gateway não é um produto separado — é um backend gerenciado para o
mesmo agente de código aberto que você já executa localmente.

1. **Assine** acima — você receberá sua chave de licença por e-mail após o
   pagamento
2. **Execute `triggerfish dive --force`** e selecione o Triggerfish Gateway como
   seu provedor
3. **Digite sua chave de licença** ou use o fluxo de link mágico para ativar
   automaticamente

Já assinou em outro computador? Execute `triggerfish dive --force`, selecione o
Triggerfish Gateway e escolha "Já tenho uma conta" para entrar com seu e-mail.

Sua chave de licença é armazenada no chaveiro do seu sistema operacional. Você
pode gerenciar sua assinatura a qualquer momento através do portal do cliente.

## Perguntas frequentes {.faq-section}

### Posso alternar entre Open Source e Cloud?

Sim. A configuração do seu agente é um único arquivo YAML. Execute
`triggerfish dive --force` para reconfigurar a qualquer momento. Alterne entre
suas próprias API keys e o Triggerfish Gateway ou vice-versa — seu SPINE, skills,
canais e dados permanecem exatamente os mesmos.

### Qual LLM o Triggerfish Gateway usa?

O Triggerfish Gateway roteia através de infraestrutura de modelos otimizada. A
seleção de modelos é gerenciada para você — escolhemos a melhor relação
custo/qualidade e cuidamos do cache, failover e otimização automaticamente.

### Posso usar minhas próprias API keys junto com o Cloud?

Sim. O Triggerfish suporta cadeias de failover. Você pode configurar o Cloud
como seu provedor principal e recorrer à sua própria key da Anthropic ou OpenAI,
ou vice-versa.

### O que acontece se minha assinatura expirar?

Seu agente continua funcionando. Ele volta ao modo somente local — se você tiver
suas próprias API keys configuradas, elas continuam funcionando. As
funcionalidades do Cloud (LLM gerenciado, busca, túneis) param até você assinar
novamente. Nenhum dado é perdido.

### Meus dados são enviados pelos seus servidores?

As solicitações de LLM são encaminhadas pelo gateway na nuvem até o provedor do
modelo. Não armazenamos o conteúdo das conversas. Metadados de uso são
registrados para faturamento. Seu agente, dados, SPINE e skills permanecem
inteiramente no seu computador.

### Como gerencio minha assinatura?

Visite o portal do cliente para atualizar métodos de pagamento, trocar de plano
ou cancelar.
