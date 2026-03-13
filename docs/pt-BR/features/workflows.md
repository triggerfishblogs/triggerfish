---
title: Fluxos de Trabalho
description: Automatize tarefas de varias etapas com o motor CNCF Serverless Workflow DSL integrado ao Triggerfish.
---

# Fluxos de Trabalho

O Triggerfish inclui um motor de execucao integrado para o
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
Os fluxos de trabalho permitem definir automacoes deterministicas de varias etapas
em YAML que sao executadas **sem o LLM no loop** durante a execucao. O agente cria
e aciona fluxos de trabalho, mas o motor cuida do despacho real de tarefas,
ramificacao, loops e fluxo de dados.

## Quando Usar Fluxos de Trabalho

**Use fluxos de trabalho** para sequencias repetitivas e deterministicas onde voce
conhece as etapas com antecedencia: buscar dados de uma API, transforma-los,
salvar na memoria, enviar uma notificacao. A mesma entrada sempre produz a mesma
saida.

**Use o agente diretamente** para raciocinio aberto, exploracao ou tarefas onde a
proxima etapa depende de julgamento: pesquisar um topico, escrever codigo,
resolver um problema.

Uma boa regra geral: se voce se pega pedindo ao agente para executar a mesma
sequencia de varias etapas repetidamente, transforme-a em um fluxo de trabalho.

::: info Disponibilidade
Os fluxos de trabalho estao disponiveis em todos os planos. Usuarios de codigo
aberto que executam suas proprias API keys tem acesso completo ao motor de fluxos
de trabalho -- cada chamada `triggerfish:llm` ou `triggerfish:agent` dentro de
um fluxo de trabalho consome inferencia do seu provedor configurado.
:::

## Ferramentas

### `workflow_save`

Analisa, valida e armazena uma definicao de fluxo de trabalho. O fluxo de
trabalho e salvo no nivel de classificacao da sessao atual.

| Parameter     | Type   | Required | Descricao                              |
| ------------- | ------ | -------- | -------------------------------------- |
| `name`        | string | yes      | Nome do fluxo de trabalho              |
| `yaml`        | string | yes      | Definicao YAML do fluxo de trabalho    |
| `description` | string | no       | O que o fluxo de trabalho faz          |

### `workflow_run`

Executa um fluxo de trabalho pelo nome ou a partir de YAML inline. Retorna a
saida da execucao e o status.

| Parameter | Type   | Required | Descricao                                              |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `name`    | string | no       | Nome de um fluxo de trabalho salvo para executar       |
| `yaml`    | string | no       | Definicao YAML inline (quando nao usa um salvo)        |
| `input`   | string | no       | String JSON de dados de entrada para o fluxo de trabalho |

Um dos parametros `name` ou `yaml` e obrigatorio.

### `workflow_list`

Lista todos os fluxos de trabalho salvos acessiveis no nivel de classificacao
atual. Nao recebe parametros.

### `workflow_get`

Recupera uma definicao de fluxo de trabalho salva pelo nome.

| Parameter | Type   | Required | Descricao                                |
| --------- | ------ | -------- | ---------------------------------------- |
| `name`    | string | yes      | Nome do fluxo de trabalho a recuperar    |

### `workflow_delete`

Exclui um fluxo de trabalho salvo pelo nome. O fluxo de trabalho deve estar
acessivel no nivel de classificacao da sessao atual.

| Parameter | Type   | Required | Descricao                                |
| --------- | ------ | -------- | ---------------------------------------- |
| `name`    | string | yes      | Nome do fluxo de trabalho a excluir      |

### `workflow_history`

Visualiza resultados de execucoes anteriores de fluxos de trabalho, opcionalmente
filtrados pelo nome do fluxo de trabalho.

| Parameter       | Type   | Required | Descricao                                   |
| --------------- | ------ | -------- | ------------------------------------------- |
| `workflow_name` | string | no       | Filtrar resultados pelo nome do fluxo de trabalho |
| `limit`         | string | no       | Numero maximo de resultados (padrao 10)     |

## Tipos de Tarefa

Os fluxos de trabalho sao compostos por tarefas em um bloco `do:`. Cada tarefa e
uma entrada nomeada com um corpo especifico do tipo. O Triggerfish suporta 8
tipos de tarefa.

### `call` — Chamadas Externas

Despacha para endpoints HTTP ou servicos do Triggerfish.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

O campo `call` determina o destino do despacho. Consulte
[Despacho de Chamadas](#despacho-de-chamadas) para o mapeamento completo.

### `run` — Shell, Script ou Sub-Fluxo de Trabalho

Executa um comando shell, um script inline ou outro fluxo de trabalho salvo.

**Comando shell:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Sub-fluxo de trabalho:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
A execucao de shell e script requer que o flag `allowShellExecution` esteja
habilitado no contexto da ferramenta de fluxo de trabalho. Se desabilitado,
tarefas run com alvos `shell` ou `script` falharao.
:::

### `set` — Mutacoes do Contexto de Dados

Atribui valores ao contexto de dados do fluxo de trabalho. Suporta expressoes.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Ramificacao Condicional

Ramifica com base em condicoes. Cada caso tem uma expressao `when` e uma
diretiva de fluxo `then`. Um caso sem `when` funciona como padrao.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — Iteracao

Itera sobre uma colecao, executando um bloco `do:` aninhado para cada item.

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

O campo `each` nomeia a variavel do loop, `in` referencia a colecao, e o campo
opcional `at` fornece o indice atual.

### `raise` — Parar com Erro

Para a execucao com um erro estruturado.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — Registrar Eventos

Registra um evento do fluxo de trabalho. Os eventos sao capturados no resultado
da execucao e podem ser revisados via `workflow_history`.

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — Pausa

Pausa a execucao por uma duracao ISO 8601.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Despacho de Chamadas

O campo `call` em uma tarefa call determina qual ferramenta do Triggerfish e
invocada.

| Tipo de chamada        | Ferramenta Triggerfish | Campos `with:` obrigatorios            |
| ---------------------- | ---------------------- | -------------------------------------- |
| `http`                 | `web_fetch`            | `endpoint` (ou `url`), `method`        |
| `triggerfish:llm`      | `llm_task`             | `prompt` (ou `task`)                   |
| `triggerfish:agent`    | `subagent`             | `prompt` (ou `task`)                   |
| `triggerfish:memory`   | `memory_*`             | `operation` + campos especificos da operacao |
| `triggerfish:web_search` | `web_search`         | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`          | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`         |
| `triggerfish:message`  | `send_message`         | `channel`, `text`                      |

**Operacoes de memoria:** O tipo de chamada `triggerfish:memory` requer um campo
`operation` definido como `save`, `search`, `get`, `list` ou `delete`. Os campos
`with:` restantes sao passados diretamente para a ferramenta de memoria
correspondente.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**Chamadas MCP:** O tipo de chamada `triggerfish:mcp` roteia para qualquer
ferramenta de servidor MCP conectado. Especifique o nome do `server`, o nome
da `tool` e o objeto `arguments`.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Expressoes

As expressoes de fluxo de trabalho usam a sintaxe `${ }` com resolucao de
caminho por ponto contra o contexto de dados do fluxo de trabalho.

```yaml
# Referencia de valor simples
url: "${ .config.api_url }"

# Indexacao de array
first_item: "${ .results[0].name }"

# Interpolacao de string (varias expressoes em uma string)
message: "Found ${ .count } issues in ${ .repo }"

# Comparacao (retorna booleano)
if: "${ .status == 'open' }"

# Aritmetica
total: "${ .price * .quantity }"
```

**Operadores suportados:**

- Comparacao: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Aritmetica: `+`, `-`, `*`, `/`, `%`

**Literais:** String (`"value"` ou `'value'`), numero (`42`, `3.14`), booleano
(`true`, `false`), nulo (`null`).

Quando uma expressao `${ }` e o valor inteiro, o tipo bruto e preservado (numero,
booleano, objeto). Quando misturado com texto, o resultado e sempre uma string.

## Exemplo Completo

Este fluxo de trabalho busca uma issue do GitHub, resume-a com o LLM, salva o
resumo na memoria e envia uma notificacao.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**Execute:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Transformacoes de Entrada e Saida

As tarefas podem transformar sua entrada antes da execucao e sua saida antes de
armazenar os resultados.

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — Expressao ou mapeamento de objeto que substitui o contexto
  de entrada da tarefa antes da execucao.
- **`output.from`** — Expressao ou mapeamento de objeto que reformata o resultado
  da tarefa antes de armazena-lo no contexto de dados.

## Controle de Fluxo

Toda tarefa pode incluir uma diretiva `then` controlando o que acontece em
seguida:

- **`continue`** (padrao) — prossegue para a proxima tarefa na sequencia
- **`end`** — para o fluxo de trabalho imediatamente (status: completed)
- **Nome da tarefa** — pula para uma tarefa especifica pelo nome

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## Execucao Condicional

Qualquer tarefa pode incluir um campo `if`. A tarefa e ignorada quando a
condicao avalia como falso.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Sub-Fluxos de Trabalho

Uma tarefa `run` com alvo `workflow` executa outro fluxo de trabalho salvo. O
sub-fluxo de trabalho executa com seu proprio contexto e retorna sua saida para
o pai.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Sub-fluxos de trabalho podem aninhar ate **5 niveis de profundidade**. Exceder
este limite produz um erro e interrompe a execucao.

## Classificacao e Seguranca

Os fluxos de trabalho participam do mesmo sistema de classificacao que todos os
outros dados do Triggerfish.

**Classificacao de armazenamento.** Quando voce salva um fluxo de trabalho com
`workflow_save`, ele e armazenado no nivel de taint da sessao atual. Um fluxo de
trabalho salvo durante uma sessao `CONFIDENTIAL` so pode ser carregado por sessoes
em `CONFIDENTIAL` ou superior.

**Teto de classificacao.** Os fluxos de trabalho podem declarar um
`classification_ceiling` em seu YAML. Antes de cada tarefa ser executada, o motor
verifica se o taint atual da sessao nao excede o teto. Se o taint da sessao
escalar alem do teto durante a execucao (por exemplo, ao acessar dados
classificados via uma chamada de ferramenta), o fluxo de trabalho para com um
erro de violacao de teto.

```yaml
classification_ceiling: INTERNAL
```

Valores validos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Historico de execucao.** Os resultados de execucao sao armazenados com a
classificacao da sessao no momento da conclusao. `workflow_history` filtra
resultados por `canFlowTo`, entao voce so ve execucoes que estao no nivel ou
abaixo do taint da sua sessao atual.

::: danger SEGURANCA
A exclusao de fluxos de trabalho requer que o fluxo de trabalho esteja acessivel
no nivel de classificacao da sua sessao atual. Voce nao pode excluir um fluxo de
trabalho armazenado em `CONFIDENTIAL` a partir de uma sessao `PUBLIC`. A
ferramenta `workflow_delete` carrega o fluxo de trabalho primeiro e retorna
"nao encontrado" se a verificacao de classificacao falhar.
:::

## Self-Healing

Os fluxos de trabalho podem ter opcionalmente um agente de recuperacao autonoma
que observa a execucao em tempo real, diagnostica falhas e propoe correcoes.
Quando self-healing esta habilitado, um agente lider e gerado junto a execucao
do fluxo de trabalho. Ele observa cada evento de etapa, faz a triagem de falhas
e coordena equipes de especialistas para resolver os problemas.

### Habilitando Self-Healing

Adicione um bloco `self_healing` a secao `metadata.triggerfish` do fluxo de
trabalho:

```yaml
document:
  dsl: "1.0"
  namespace: ops
  name: data-pipeline
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
do:
  - fetch-data:
      call: http
      with:
        endpoint: "https://api.example.com/data"
      metadata:
        description: "Fetch raw invoice data from billing API"
        expects: "API returns JSON array of invoice objects"
        produces: "Array of {id, amount, status, date} objects"
```

Quando `enabled: true`, cada etapa **deve** incluir tres campos de metadados:

| Field         | Descricao                                            |
| ------------- | ---------------------------------------------------- |
| `description` | O que a etapa faz e por que existe                   |
| `expects`     | Forma de entrada ou precondicoes que a etapa precisa |
| `produces`    | Forma de saida que a etapa gera                      |

O analisador rejeita fluxos de trabalho onde qualquer etapa estiver sem esses
campos.

### Opcoes de configuracao

| Option                    | Type    | Default              | Descricao |
| ------------------------- | ------- | -------------------- | --------- |
| `enabled`                 | boolean | —                    | Obrigatorio. Habilita o agente de recuperacao. |
| `retry_budget`            | number  | `3`                  | Tentativas maximas de intervencao antes de escalar como irresoluvel. |
| `approval_required`       | boolean | `true`               | Se as correcoes propostas ao fluxo de trabalho requerem aprovacao humana. |
| `pause_on_intervention`   | string  | `"blocking_only"`    | Quando pausar as tarefas descendentes: `always`, `never` ou `blocking_only`. |
| `pause_timeout_seconds`   | number  | `300`                | Segundos de espera durante uma pausa antes da politica de timeout ser acionada. |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| O que acontece ao expirar o timeout: `escalate_and_halt`, `escalate_and_skip` ou `escalate_and_fail`. |
| `notify_on`               | array   | `[]`                 | Eventos que acionam notificacoes: `intervention`, `escalation`, `approval_required`. |

### Como funciona

1. **Observacao.** O agente lider de recuperacao recebe um fluxo em tempo real de
   eventos de etapa (started, completed, failed, skipped) enquanto o fluxo de
   trabalho e executado.

2. **Triagem.** Quando uma etapa falha, o lider classifica a falha em uma de
   cinco categorias:

   | Category              | Meaning                                                |
   | --------------------- | ------------------------------------------------------ |
   | `transient_retry`     | Problema temporario (erro de rede, rate limit, 503)    |
   | `runtime_workaround`  | Erro desconhecido pela primeira vez, pode ser contornado |
   | `structural_fix`      | Falha recorrente que necessita de alteracao na definicao do fluxo |
   | `plugin_gap`          | Problema de autenticacao/credenciais que requer uma nova integracao |
   | `unresolvable`        | Orcamento de tentativas esgotado ou fundamentalmente quebrado |

3. **Equipes de especialistas.** Com base na categoria de triagem, o lider gera
   uma equipe de agentes especialistas (diagnosticador, coordenador de
   tentativas, corretor de definicao, autor de plugins, etc.) para investigar e
   resolver o problema.

4. **Propostas de versao.** Quando uma correcao estrutural e necessaria, a equipe
   propoe uma nova versao do fluxo de trabalho. Se `approval_required` for true,
   a proposta aguarda revisao humana via `workflow_version_approve` ou
   `workflow_version_reject`.

5. **Pausa com escopo limitado.** Quando `pause_on_intervention` esta habilitado,
   apenas as tarefas descendentes sao pausadas — ramos independentes continuam
   sendo executados.

### Ferramentas de recuperacao

Quatro ferramentas adicionais estao disponiveis para gerenciar o estado de
recuperacao:

| Tool                       | Descricao                                            |
| -------------------------- | ---------------------------------------------------- |
| `workflow_version_list`    | Listar versoes propostas/aprovadas/rejeitadas        |
| `workflow_version_approve` | Aprovar uma versao proposta                          |
| `workflow_version_reject`  | Rejeitar uma versao proposta com motivo               |
| `workflow_healing_status`  | Status atual de recuperacao de uma execucao do fluxo  |

### Seguranca

- O agente de recuperacao **nao pode modificar sua propria configuracao
  `self_healing`**. Versoes propostas que alterem o bloco de configuracao sao
  rejeitadas.
- O agente lider e todos os membros da equipe herdam o nivel de taint do fluxo
  de trabalho e escalam em sincronia.
- Todas as acoes dos agentes passam pela cadeia padrao de hooks de politica —
  sem excecoes.
- As versoes propostas sao armazenadas no nivel de classificacao do fluxo de
  trabalho.
