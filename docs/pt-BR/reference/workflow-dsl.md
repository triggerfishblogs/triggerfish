---
title: Referencia do DSL de Fluxos de Trabalho
description: Referencia completa para o CNCF Serverless Workflow DSL 1.0 conforme implementado no Triggerfish.
---

# Referencia do DSL de Fluxos de Trabalho

Referencia completa para o CNCF Serverless Workflow DSL 1.0 conforme
implementado no motor de fluxos de trabalho do Triggerfish. Para guia de uso e
exemplos, consulte [Fluxos de Trabalho](/pt-BR/features/workflows).

## Estrutura do Documento

Todo YAML de fluxo de trabalho deve ter um campo `document` de nivel superior e
um bloco `do`.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # optional
  description: "What it does"  # optional
classification_ceiling: INTERNAL  # optional
input:                            # optional
  from: "${ . }"
output:                           # optional
  from:
    result: "${ .final_step }"
timeout:                          # optional
  after: PT5M
do:
  - task_name:
      # task definition
```

### Metadados do Documento

| Field         | Type   | Required | Descricao                                    |
| ------------- | ------ | -------- | -------------------------------------------- |
| `dsl`         | string | yes      | Versao do DSL. Deve ser `"1.0"`              |
| `namespace`   | string | yes      | Agrupamento logico (ex.: `ops`, `reports`)   |
| `name`        | string | yes      | Nome unico do fluxo de trabalho no namespace |
| `version`     | string | no       | String de versao semantica                   |
| `description` | string | no       | Descricao legivel por humanos                |

### Campos de Nivel Superior

| Field                     | Type         | Required | Descricao                                   |
| ------------------------- | ------------ | -------- | ------------------------------------------- |
| `document`                | object       | yes      | Metadados do documento (veja acima)         |
| `do`                      | array        | yes      | Lista ordenada de entradas de tarefas       |
| `classification_ceiling`  | string       | no       | Taint maximo permitido da sessao durante a execucao |
| `input`                   | transform    | no       | Transformacao aplicada a entrada do fluxo de trabalho |
| `output`                  | transform    | no       | Transformacao aplicada a saida do fluxo de trabalho |
| `timeout`                 | object       | no       | Timeout do fluxo de trabalho (`after: <ISO 8601>`) |
| `metadata`                | object       | no       | Metadados arbitrarios de chave-valor        |

---

## Formato de Entrada de Tarefa

Cada entrada no bloco `do` e um objeto de chave unica. A chave e o nome da
tarefa, o valor e a definicao da tarefa.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Os nomes das tarefas devem ser unicos dentro do mesmo bloco `do`. O resultado da
tarefa e armazenado no contexto de dados sob o nome da tarefa.

---

## Campos Comuns de Tarefa

Todos os tipos de tarefa compartilham estes campos opcionais:

| Field      | Type      | Descricao                                           |
| ---------- | --------- | --------------------------------------------------- |
| `if`       | string    | Condicao de expressao. A tarefa e ignorada quando falsa. |
| `input`    | transform | Transformacao aplicada antes da execucao da tarefa   |
| `output`   | transform | Transformacao aplicada apos a execucao da tarefa     |
| `timeout`  | object    | Timeout da tarefa: `after: <duracao ISO 8601>`       |
| `then`     | string    | Diretiva de fluxo: `continue`, `end` ou um nome de tarefa |
| `metadata` | object    | Metadados arbitrarios de chave-valor. Quando self-healing esta habilitado, requer `description`, `expects`, `produces`. |

---

## Configuracao de Self-Healing

O bloco `metadata.triggerfish.self_healing` habilita um agente de recuperacao
autonoma para o fluxo de trabalho. Consulte
[Self-Healing](/pt-BR/features/workflows#self-healing) para um guia completo.

```yaml
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
      pause_timeout_seconds: 300
      pause_timeout_policy: escalate_and_halt
      notify_on: [intervention, escalation, approval_required]
```

| Field                   | Type    | Required | Default              | Descricao |
| ----------------------- | ------- | -------- | -------------------- | --------- |
| `enabled`               | boolean | yes      | —                    | Habilita o agente de recuperacao |
| `retry_budget`          | number  | no       | `3`                  | Tentativas maximas de intervencao |
| `approval_required`     | boolean | no       | `true`               | Requer aprovacao humana para as correcoes |
| `pause_on_intervention` | string  | no       | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | no       | `300`                | Segundos antes da politica de timeout ser acionada |
| `pause_timeout_policy`  | string  | no       | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | no       | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### Metadados de Etapa (Obrigatorios Quando Self-Healing Esta Habilitado)

Quando `self_healing.enabled` e `true`, cada tarefa deve incluir estes campos de
metadados. O analisador rejeita fluxos de trabalho que estejam sem qualquer um
deles.

| Field         | Type   | Descricao                                    |
| ------------- | ------ | -------------------------------------------- |
| `description` | string | O que a etapa faz e por que                  |
| `expects`     | string | Forma de entrada ou precondicoes necessarias |
| `produces`    | string | Forma de saida gerada                        |

```yaml
- fetch-invoices:
    call: http
    with:
      endpoint: "https://api.example.com/invoices"
    metadata:
      description: "Fetch open invoices from billing API"
      expects: "API available, returns JSON array"
      produces: "Array of {id, amount, status} objects"
```

---

## Tipos de Tarefa

### `call`

Despacha para um endpoint HTTP ou servico do Triggerfish.

| Field  | Type   | Required | Descricao                                         |
| ------ | ------ | -------- | ------------------------------------------------- |
| `call` | string | yes      | Tipo de chamada (veja tabela de despacho abaixo)  |
| `with` | object | no       | Argumentos passados para a ferramenta de destino  |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Executa um comando shell, script inline ou sub-fluxo de trabalho. O campo `run`
deve conter exatamente um entre `shell`, `script` ou `workflow`.

**Shell:**

| Field                  | Type   | Required | Descricao                |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.shell.command`    | string | yes      | Comando shell a executar |
| `run.shell.arguments`  | object | no       | Argumentos nomeados      |
| `run.shell.environment`| object | no       | Variaveis de ambiente    |

**Script:**

| Field                  | Type   | Required | Descricao                |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | Linguagem do script      |
| `run.script.code`      | string | yes      | Codigo do script inline  |
| `run.script.arguments` | object | no       | Argumentos nomeados      |

**Sub-fluxo de trabalho:**

| Field                | Type   | Required | Descricao                    |
| -------------------- | ------ | -------- | ---------------------------- |
| `run.workflow.name`  | string | yes      | Nome do fluxo de trabalho salvo |
| `run.workflow.version` | string | no     | Restricao de versao          |
| `run.workflow.input` | object | no       | Dados de entrada para o sub-fluxo de trabalho |

### `set`

Atribui valores ao contexto de dados.

| Field | Type   | Required | Descricao                                        |
| ----- | ------ | -------- | ------------------------------------------------ |
| `set` | object | yes      | Pares chave-valor a atribuir. Valores podem ser expressoes. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Ramificacao condicional. O campo `switch` e um array de entradas de caso. Cada
caso e um objeto de chave unica onde a chave e o nome do caso.

| Campo do caso | Type   | Required | Descricao                                       |
| ------------- | ------ | -------- | ----------------------------------------------- |
| `when`        | string | no       | Condicao de expressao. Omita para o caso padrao. |
| `then`        | string | yes      | Diretiva de fluxo: `continue`, `end` ou nome da tarefa |

Os casos sao avaliados em ordem. O primeiro caso com `when` verdadeiro (ou sem
`when`) e executado.

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

Itera sobre uma colecao.

| Field      | Type   | Required | Descricao                                    |
| ---------- | ------ | -------- | -------------------------------------------- |
| `for.each` | string | yes      | Nome da variavel para o item atual           |
| `for.in`   | string | yes      | Expressao referenciando a colecao            |
| `for.at`   | string | no       | Nome da variavel para o indice atual         |
| `do`       | array  | yes      | Lista de tarefas aninhadas executadas para cada iteracao |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Process item ${ .idx }: ${ .item.name }"
```

### `raise`

Interrompe o fluxo de trabalho com um erro estruturado.

| Field                | Type   | Required | Descricao              |
| -------------------- | ------ | -------- | ---------------------- |
| `raise.error.status` | number | yes      | Codigo de status estilo HTTP |
| `raise.error.type`   | string | yes      | URI/string do tipo de erro |
| `raise.error.title`  | string | yes      | Titulo legivel por humanos |
| `raise.error.detail` | string | no       | Mensagem de erro detalhada |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Invalid input"
        detail: "Field 'email' is required"
```

### `emit`

Registra um evento do fluxo de trabalho. Os eventos sao armazenados no resultado
da execucao.

| Field                | Type   | Required | Descricao              |
| -------------------- | ------ | -------- | ---------------------- |
| `emit.event.type`    | string | yes      | Identificador do tipo de evento |
| `emit.event.source`  | string | no       | URI de origem do evento |
| `emit.event.data`    | object | no       | Payload do evento      |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

Pausa a execucao por uma duracao.

| Field  | Type   | Required | Descricao                          |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | Duracao ISO 8601 (ex.: `PT5S`)     |

Duracoes comuns: `PT1S` (1 segundo), `PT30S` (30 segundos), `PT1M` (1 minuto),
`PT5M` (5 minutos).

---

## Tabela de Despacho de Chamadas

Mapeia o valor do campo `call` para a ferramenta do Triggerfish que e efetivamente
invocada.

| Valor de `call`        | Ferramenta invocada | Campos `with:` obrigatorios                    |
| ---------------------- | ------------------- | ---------------------------------------------- |
| `http`                 | `web_fetch`         | `endpoint` ou `url`; opcional `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`          | `prompt` ou `task`; opcional `tools`, `max_iterations`    |
| `triggerfish:agent`    | `subagent`          | `prompt` ou `task`; opcional `tools`, `agent`             |
| `triggerfish:memory`   | `memory_*`          | `operation` (`save`/`search`/`get`/`list`/`delete`) + campos da operacao |
| `triggerfish:web_search` | `web_search`      | `query`; opcional `max_results`                |
| `triggerfish:web_fetch`  | `web_fetch`       | `url`; opcional `method`, `headers`, `body`    |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; opcional `arguments`    |
| `triggerfish:message`  | `send_message`      | `channel`, `text`; opcional `recipient`        |

Tipos de chamada CNCF nao suportados (`grpc`, `openapi`, `asyncapi`) retornam
um erro.

---

## Sintaxe de Expressoes

As expressoes sao delimitadas por `${ }` e resolvem contra o contexto de dados
do fluxo de trabalho.

### Resolucao de Caminho por Ponto

| Sintaxe                 | Descricao                           | Resultado exemplo    |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | Contexto de dados inteiro           | `{...}`              |
| `${ .key }`             | Chave de nivel superior             | `"value"`            |
| `${ .a.b.c }`           | Chave aninhada                      | `"deep value"`       |
| `${ .items[0] }`        | Indice de array                     | `{...primeiro item...}` |
| `${ .items[0].name }`   | Indice de array e depois chave      | `"first"`            |

O ponto inicial (ou `$.`) ancora o caminho na raiz do contexto. Caminhos que
resolvem para `undefined` produzem uma string vazia quando interpolados, ou
`undefined` quando usados como valor independente.

### Operadores

| Tipo       | Operadores                   | Exemplo                        |
| ---------- | ---------------------------- | ------------------------------ |
| Comparacao | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`         |
| Aritmetica | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

Expressoes de comparacao retornam `true` ou `false`. Expressoes aritmeticas
retornam um numero (`undefined` se algum operando nao for numerico ou divisao
por zero).

### Literais

| Tipo    | Exemplos                 |
| ------- | ------------------------ |
| String  | `"hello"`, `'hello'`     |
| Numero  | `42`, `3.14`, `-1`       |
| Booleano| `true`, `false`          |
| Nulo    | `null`                   |

### Modos de Interpolacao

**Expressao unica (valor bruto):** Quando a string inteira e uma expressao
`${ }`, o valor tipado bruto e retornado (numero, booleano, objeto, array).

```yaml
count: "${ .items.length }"  # retorna um numero, nao uma string
```

**Mista / multiplas expressoes (string):** Quando expressoes `${ }` sao
misturadas com texto ou ha multiplas expressoes, o resultado e sempre uma string.

```yaml
message: "Found ${ .count } items in ${ .category }"  # retorna uma string
```

### Veracidade

Para condicoes `if:` e expressoes `when:` do `switch`, os valores sao avaliados
usando veracidade estilo JavaScript:

| Valor                         | Verdadeiro? |
| ----------------------------- | ----------- |
| `true`                        | sim         |
| Numero diferente de zero      | sim         |
| String nao vazia              | sim         |
| Array nao vazio               | sim         |
| Objeto                        | sim         |
| `false`, `0`, `""`, `null`, `undefined`, array vazio | nao |

---

## Transformacoes de Entrada/Saida

As transformacoes reformatam dados que fluem para dentro e para fora das tarefas.

### `input`

Aplicada antes da execucao da tarefa. Substitui a visao da tarefa sobre o
contexto de dados.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # a tarefa ve apenas o objeto config
    with:
      endpoint: "${ .api_url }"  # resolvido contra o objeto config
```

**`from` como string:** Expressao que substitui todo o contexto de entrada.

**`from` como objeto:** Mapeia novas chaves para expressoes:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Aplicada apos a execucao da tarefa. Reformata o resultado antes de armazena-lo
no contexto sob o nome da tarefa.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Diretivas de Fluxo

O campo `then` em qualquer tarefa controla o fluxo de execucao apos a tarefa
ser concluida.

| Valor        | Comportamento                                       |
| ------------ | --------------------------------------------------- |
| `continue`   | Prossegue para a proxima tarefa na sequencia (padrao) |
| `end`        | Para o fluxo de trabalho. Status: `completed`.      |
| `<nome da tarefa>` | Salta para a tarefa nomeada. A tarefa deve existir no mesmo bloco `do`. |

Casos do switch tambem usam diretivas de fluxo em seu campo `then`.

---

## Teto de Classificacao

Campo opcional que restringe o taint maximo da sessao durante a execucao.

```yaml
classification_ceiling: INTERNAL
```

| Valor          | Significado                                          |
| -------------- | ---------------------------------------------------- |
| `PUBLIC`       | O fluxo de trabalho para se qualquer dado classificado for acessado |
| `INTERNAL`     | Permite dados `PUBLIC` e `INTERNAL`                  |
| `CONFIDENTIAL` | Permite ate dados `CONFIDENTIAL`                     |
| `RESTRICTED`   | Permite todos os niveis de classificacao             |
| *(omitido)*    | Nenhum teto aplicado                                 |

O teto e verificado antes de cada tarefa. Se o taint da sessao escalou alem do
teto (por exemplo, porque uma tarefa anterior acessou dados classificados), o
fluxo de trabalho para com status `failed` e erro
`Workflow classification ceiling breached`.

---

## Armazenamento

### Definicoes de Fluxo de Trabalho

Armazenadas com prefixo de chave `workflows:{name}`. Cada registro armazenado
contem:

| Field            | Type   | Descricao                                |
| ---------------- | ------ | ---------------------------------------- |
| `name`           | string | Nome do fluxo de trabalho                |
| `yaml`           | string | Definicao YAML bruta                     |
| `classification` | string | Nivel de classificacao no momento do salvamento |
| `savedAt`        | string | Timestamp ISO 8601                       |
| `description`    | string | Descricao opcional                       |

### Historico de Execucao

Armazenado com prefixo de chave `workflow-runs:{runId}`. Cada registro de
execucao contem:

| Field            | Type   | Descricao                                |
| ---------------- | ------ | ---------------------------------------- |
| `runId`          | string | UUID desta execucao                      |
| `workflowName`   | string | Nome do fluxo de trabalho executado      |
| `status`         | string | `completed`, `failed` ou `cancelled`     |
| `output`         | object | Contexto de dados final (chaves internas filtradas) |
| `events`         | array  | Eventos emitidos durante a execucao      |
| `error`          | string | Mensagem de erro (se o status for `failed`) |
| `startedAt`      | string | Timestamp ISO 8601                       |
| `completedAt`    | string | Timestamp ISO 8601                       |
| `taskCount`      | number | Numero de tarefas no fluxo de trabalho   |
| `classification` | string | Taint da sessao na conclusao             |

---

## Limites

| Limite                   | Valor | Descricao                                |
| ------------------------ | ----- | ---------------------------------------- |
| Profundidade maxima de sub-fluxo | 5 | Aninhamento maximo de chamadas `run.workflow` |
| Limite padrao do historico | 10  | `limit` padrao para `workflow_history`   |

---

## Status de Execucao

| Status      | Descricao                                            |
| ----------- | ---------------------------------------------------- |
| `pending`   | O fluxo de trabalho foi criado mas nao iniciado      |
| `running`   | O fluxo de trabalho esta sendo executado atualmente  |
| `completed` | Todas as tarefas concluidas com sucesso (ou `then: end`) |
| `failed`    | Uma tarefa falhou, um `raise` foi acionado ou teto violado |
| `cancelled` | A execucao foi cancelada externamente                |
