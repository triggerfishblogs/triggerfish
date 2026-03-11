# Sistema de classificacao

O sistema de classificacao de dados e a base do modelo de seguranca do
Triggerfish. Cada dado que entra, se move ou sai do sistema carrega um rotulo de
classificacao. Esses rotulos determinam para onde os dados podem fluir -- e, mais
importante, para onde nao podem.

## Niveis de classificacao

O Triggerfish usa uma unica hierarquia ordenada de quatro niveis para todas as
implantacoes.

| Nivel          | Posto          | Descricao                                                 | Exemplos                                                                          |
| -------------- | -------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `RESTRICTED`   | 4 (mais alto)  | Dados mais sensiveis que exigem protecao maxima           | Documentos de fusoes e aquisicoes, materiais de conselho, PII, contas bancarias, prontuarios medicos |
| `CONFIDENTIAL` | 3              | Informacoes sensiveis de negocio ou pessoais              | Dados de CRM, financas, registros de RH, contratos, registros fiscais             |
| `INTERNAL`     | 2              | Nao destinadas a compartilhamento externo                 | Wikis internas, documentos de equipe, notas pessoais, contatos                    |
| `PUBLIC`       | 1 (mais baixo) | Seguras para qualquer pessoa ver                          | Materiais de marketing, documentacao publica, conteudo web geral                  |

## A regra de no write-down

O invariante de seguranca mais importante do Triggerfish:

::: danger Os dados so podem fluir para canais ou destinatarios com classificacao
**igual ou superior**. Esta e uma **regra fixa** -- nao pode ser configurada,
anulada ou desabilitada. O LLM nao pode influenciar esta decisao. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Hierarquia de classificacao: PUBLIC -> INTERNAL -> CONFIDENTIAL -> RESTRICTED. Os dados fluem apenas para cima." style="max-width: 100%;" />

Isso significa:

- Uma resposta contendo dados `CONFIDENTIAL` nao pode ser enviada para um canal `PUBLIC`
- Uma sessao com taint `RESTRICTED` nao pode enviar saida para nenhum canal abaixo
  de `RESTRICTED`
- Nao ha anulacao de administrador, nem escotilha de escape empresarial, nem solucao alternativa do LLM

## Classificacao efetiva

Os canais e os destinatarios possuem niveis de classificacao. Quando os dados
estao prestes a sair do sistema, a **classificacao efetiva** do destino
determina o que pode ser enviado:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

A classificacao efetiva e a _menor_ das duas. Isso significa que um canal de alta
classificacao com um destinatario de baixa classificacao e tratado como de baixa
classificacao.

| Canal          | Destinatario | Efetiva        | Pode receber dados CONFIDENTIAL? |
| -------------- | ------------ | -------------- | -------------------------------- |
| `INTERNAL`     | `INTERNAL`   | `INTERNAL`     | Nao (CONFIDENTIAL > INTERNAL)    |
| `INTERNAL`     | `EXTERNAL`   | `PUBLIC`       | Nao                              |
| `CONFIDENTIAL` | `INTERNAL`   | `INTERNAL`     | Nao (CONFIDENTIAL > INTERNAL)    |
| `CONFIDENTIAL` | `EXTERNAL`   | `PUBLIC`       | Nao                              |
| `RESTRICTED`   | `INTERNAL`   | `INTERNAL`     | Nao (CONFIDENTIAL > INTERNAL)    |

## Regras de classificacao de canais

Cada tipo de canal tem regras especificas para determinar seu nivel de
classificacao.

### E-mail

- **Correspondencia de dominio**: Mensagens de `@empresa.com` sao classificadas como `INTERNAL`
- O administrador configura quais dominios sao internos
- Dominios desconhecidos ou externos sao classificados como `EXTERNAL` por padrao
- Destinatarios externos reduzem a classificacao efetiva para `PUBLIC`

### Slack / Teams

- **Membros do workspace**: Membros do mesmo workspace/tenant sao `INTERNAL`
- Usuarios externos do Slack Connect sao classificados como `EXTERNAL`
- Usuarios convidados sao classificados como `EXTERNAL`
- A classificacao e derivada da API da plataforma, nao da interpretacao do LLM

### WhatsApp / Telegram / iMessage

- **Empresarial**: Numeros de telefone comparados com a sincronizacao do diretorio de RH determinam
  interno vs. externo
- **Pessoal**: Todos os destinatarios sao classificados como `EXTERNAL` por padrao
- Os usuarios podem marcar contatos de confianca, mas isso nao muda o calculo de
  classificacao -- muda a classificacao do destinatario

### WebChat

- Os visitantes do WebChat sao sempre classificados como `PUBLIC` (visitantes nunca
  sao verificados como proprietario)
- O WebChat e projetado para interacoes voltadas ao publico

### CLI

- O canal CLI roda localmente e e classificado com base no usuario autenticado
- O acesso direto pelo terminal e tipicamente `INTERNAL` ou superior

## Fontes de classificacao de destinatarios

### Empresarial

- A **sincronizacao de diretorio** (Okta, Azure AD, Google Workspace) preenche automaticamente
  as classificacoes de destinatarios
- Todos os membros do diretorio sao classificados como `INTERNAL`
- Convidados externos e fornecedores sao classificados como `EXTERNAL`
- Os administradores podem alterar por contato ou por dominio

### Pessoal

- **Padrao**: Todos os destinatarios sao `EXTERNAL`
- Os usuarios reclassificam contatos de confianca por meio de prompts no fluxo ou pelo app complementar
- A reclassificacao e explicita e registrada

## Estados dos canais

Cada canal passa por uma maquina de estados antes de poder transportar dados:

<img src="/diagrams/state-machine.svg" alt="Maquina de estados de canais: UNTRUSTED -> CLASSIFIED ou BLOCKED" style="max-width: 100%;" />

| Estado       | Pode receber dados? | Pode enviar dados ao contexto do agente? | Descricao                                                        |
| ------------ | :-----------------: | :--------------------------------------: | ---------------------------------------------------------------- |
| `UNTRUSTED`  |         Nao         |                   Nao                    | Padrao para canais novos/desconhecidos. Completamente isolado.   |
| `CLASSIFIED` | Sim (dentro da politica) |       Sim (com classificacao)       | Revisado e atribuido um nivel de classificacao.                  |
| `BLOCKED`    |         Nao         |                   Nao                    | Explicitamente proibido pelo administrador ou usuario.           |

::: warning SEGURANCA Os canais novos sempre iniciam no estado `UNTRUSTED`. Eles
nao podem receber nenhum dado do agente e nao podem enviar dados ao contexto do
agente. O canal permanece completamente isolado ate que um administrador
(empresarial) ou o usuario (pessoal) o classifique explicitamente. :::

## Como a classificacao interage com outros sistemas

A classificacao nao e um recurso isolado -- ela direciona decisoes em toda a
plataforma:

| Sistema                   | Como a classificacao e usada                                                  |
| ------------------------- | ----------------------------------------------------------------------------- |
| **Taint de sessao**       | Acessar dados classificados escala a sessao para esse nivel                   |
| **Hooks de politicas**    | PRE_OUTPUT compara o taint de sessao com a classificacao do destino            |
| **MCP Gateway**           | As respostas do servidor MCP carregam classificacao que contamina a sessao     |
| **Linhagem de dados**     | Cada registro de linhagem inclui o nivel de classificacao e o motivo          |
| **Notificacoes**          | O conteudo das notificacoes esta sujeito as mesmas regras de classificacao     |
| **Delegacao de agentes**  | O teto de classificacao do agente chamado deve atender ao taint do chamador    |
| **Sandbox de plugins**    | O SDK de plugins auto-classifica todos os dados emitidos                       |
