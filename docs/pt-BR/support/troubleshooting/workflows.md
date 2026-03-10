---
title: Solucao de Problemas de Fluxos de Trabalho
description: Problemas comuns e solucoes ao trabalhar com fluxos de trabalho do Triggerfish.
---

# Solucao de Problemas: Fluxos de Trabalho

## "Workflow not found or not accessible"

O fluxo de trabalho existe, mas esta armazenado em um nivel de classificacao
superior ao taint da sua sessao atual.

Fluxos de trabalho salvos durante uma sessao `CONFIDENTIAL` sao invisiveis para
sessoes `PUBLIC` ou `INTERNAL`. O armazenamento usa verificacoes `canFlowTo` em
cada carregamento, e retorna `null` (exibido como "not found") quando a
classificacao do fluxo de trabalho excede o taint da sessao.

**Correcao:** Escale o taint da sua sessao acessando dados classificados
primeiro, ou salve novamente o fluxo de trabalho a partir de uma sessao de
classificacao inferior se o conteudo permitir.

**Verificacao:** Execute `workflow_list` para ver quais fluxos de trabalho estao
visiveis no seu nivel de classificacao atual. Se o fluxo de trabalho esperado
estiver ausente, ele foi salvo em um nivel superior.

---

## "Workflow classification ceiling breached"

O nivel de taint da sessao excede o `classification_ceiling` do fluxo de
trabalho. Esta verificacao e executada antes de cada tarefa, entao pode ser
acionada no meio da execucao se uma tarefa anterior escalou o taint da sessao.

Por exemplo, um fluxo de trabalho com `classification_ceiling: INTERNAL` sera
interrompido se uma chamada `triggerfish:memory` recuperar dados `CONFIDENTIAL`
que escalam o taint da sessao.

**Correcao:**

- Aumente o `classification_ceiling` do fluxo de trabalho para corresponder a
  sensibilidade esperada dos dados.
- Ou reestruture o fluxo de trabalho para que dados classificados nao sejam
  acessados. Use parametros de entrada em vez de ler memoria classificada.

---

## Erros de Analise YAML

### "YAML parse error: ..."

Erros comuns de sintaxe YAML:

**Indentacao.** YAML e sensivel a espacos em branco. Use espacos, nao tabs. Cada
nivel de aninhamento deve ter exatamente 2 espacos.

```yaml
# Errado — tabs ou indentacao inconsistente
do:
- fetch:
      call: http

# Correto
do:
  - fetch:
      call: http
```

**Aspas ausentes em expressoes.** Strings de expressao com `${ }` devem estar
entre aspas, caso contrario o YAML interpreta `{` como um mapeamento inline.

```yaml
# Errado — erro de analise YAML
endpoint: ${ .config.url }

# Correto
endpoint: "${ .config.url }"
```

**Bloco `document` ausente.** Todo fluxo de trabalho deve ter um campo
`document` com `dsl`, `namespace` e `name`:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

O YAML foi analisado com sucesso, mas o resultado e um escalar ou array, nao um
objeto. Verifique se o seu YAML tem chaves de nivel superior (`document`, `do`).

### "Task has no recognized type"

Cada entrada de tarefa deve conter exatamente uma chave de tipo: `call`, `run`,
`set`, `switch`, `for`, `raise`, `emit` ou `wait`. Se o analisador nao
encontrar nenhuma dessas chaves, ele reporta um tipo nao reconhecido.

Causa comum: um erro de digitacao no nome do tipo de tarefa (ex.: `calls` em vez
de `call`).

---

## Falhas na Avaliacao de Expressoes

### Valores errados ou vazios

As expressoes usam a sintaxe `${ .path.to.value }`. O ponto inicial e
obrigatorio -- ele ancora o caminho na raiz do contexto de dados do fluxo de
trabalho.

```yaml
# Errado — ponto inicial ausente
value: "${ result.name }"

# Correto
value: "${ .result.name }"
```

### "undefined" na saida

O caminho por ponto nao resolveu para nada. Causas comuns:

- **Nome de tarefa errado.** Cada tarefa armazena seu resultado sob seu proprio
  nome. Se sua tarefa se chama `fetch_data`, referencie seu resultado como
  `${ .fetch_data }`, nao `${ .data }` ou `${ .result }`.
- **Aninhamento errado.** Se a chamada HTTP retorna
  `{"data": {"items": [...]}}`, os items estao em
  `${ .fetch_data.data.items }`.
- **Indexacao de array.** Use sintaxe de colchetes: `${ .items[0].name }`.
  Caminhos apenas com pontos nao suportam indices numericos.

### Condicoes booleanas nao funcionam

Comparacoes de expressoes sao estritas (`===`). Certifique-se de que os tipos
correspondam:

```yaml
# Isto falha se .count for uma string "0"
if: "${ .count == 0 }"

# Funciona quando .count e um numero
if: "${ .count == 0 }"
```

Verifique se as tarefas anteriores retornam strings ou numeros. Respostas HTTP
frequentemente retornam valores como strings que nao precisam de conversao para
comparacao -- basta comparar com a forma string.

---

## Falhas em Chamadas HTTP

### Timeouts

Chamadas HTTP passam pela ferramenta `web_fetch`. Se o servidor de destino for
lento, a requisicao pode expirar. Nao ha override de timeout por tarefa para
chamadas HTTP no DSL de fluxo de trabalho -- o timeout padrao da ferramenta
`web_fetch` e aplicado.

### Bloqueios SSRF

Todo HTTP de saida no Triggerfish resolve DNS primeiro e verifica o IP resolvido
contra uma lista de negacao codificada. Faixas de IP privadas e reservadas sao
sempre bloqueadas.

Se seu fluxo de trabalho chama um servico interno em um IP privado (ex.:
`http://192.168.1.100/api`), sera bloqueado pela prevencao de SSRF. Isto e por
design e nao pode ser configurado.

**Correcao:** Use um hostname publico que resolve para um IP publico, ou use
`triggerfish:mcp` para rotear atraves de um servidor MCP que tenha acesso
direto.

### Headers ausentes

O tipo de chamada `http` mapeia `with.headers` diretamente para os headers da
requisicao. Se sua API requer autenticacao, inclua o header:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Certifique-se de que o valor do token e fornecido na entrada do fluxo de
trabalho ou definido por uma tarefa anterior.

---

## Limite de Recursao de Sub-Fluxo de Trabalho

### "Workflow recursion depth exceeded maximum of 5"

Sub-fluxos de trabalho podem aninhar ate 5 niveis de profundidade. Este limite
previne recursao infinita quando o fluxo de trabalho A chama o fluxo de trabalho
B que chama o fluxo de trabalho A.

**Correcao:**

- Achate a cadeia de fluxos de trabalho. Combine etapas em menos fluxos de
  trabalho.
- Verifique referencias circulares onde dois fluxos de trabalho chamam um ao
  outro.

---

## Execucao de Shell Desabilitada

### "Shell execution failed" ou resultado vazio de tarefas run

O flag `allowShellExecution` no contexto da ferramenta de fluxo de trabalho
controla se tarefas `run` com alvos `shell` ou `script` sao permitidas. Quando
desabilitado, essas tarefas falham.

**Correcao:** Verifique se a execucao de shell esta habilitada na sua
configuracao do Triggerfish. Em ambientes de producao, a execucao de shell pode
ser intencionalmente desabilitada por seguranca.

---

## Fluxo de Trabalho Executa mas Produz Saida Errada

### Depuracao com `workflow_history`

Use `workflow_history` para inspecionar execucoes anteriores:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

Cada entrada do historico inclui:

- **status** — `completed` ou `failed`
- **error** — mensagem de erro se falhou
- **taskCount** — numero de tarefas no fluxo de trabalho
- **startedAt / completedAt** — informacoes de tempo

### Verificando o fluxo de contexto

Cada tarefa armazena seu resultado no contexto de dados sob o nome da tarefa. Se
seu fluxo de trabalho tem tarefas chamadas `fetch`, `transform` e `save`, o
contexto de dados apos todas as tres tarefas se parece com:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

Erros comuns:

- **Sobrescrita de contexto.** Uma tarefa `set` que atribui a uma chave que ja
  existe substituira o valor anterior.
- **Referencia de tarefa errada.** Referenciar `${ .step1 }` quando a tarefa se
  chama `step_1`.
- **Transformacao de entrada substituindo contexto.** Uma diretiva `input.from`
  substitui o contexto de entrada da tarefa inteiramente. Se voce usar
  `input.from: "${ .config }"`, a tarefa so ve o objeto `config`, nao o
  contexto completo.

### Saida ausente

Se o fluxo de trabalho completa mas retorna uma saida vazia, verifique se o
resultado da tarefa final e o que voce espera. A saida do fluxo de trabalho e o
contexto de dados completo na conclusao, com chaves internas filtradas.

---

## "Permission denied" no workflow_delete

A ferramenta `workflow_delete` carrega o fluxo de trabalho primeiro usando o
nivel de taint atual da sessao. Se o fluxo de trabalho foi salvo em um nivel de
classificacao que excede o taint da sua sessao, o carregamento retorna null e
`workflow_delete` reporta "not found" em vez de "permission denied."

Isto e intencional -- a existencia de fluxos de trabalho classificados nao e
divulgada para sessoes de classificacao inferior.

**Correcao:** Escale o taint da sua sessao para corresponder ou exceder o nivel
de classificacao do fluxo de trabalho antes de exclui-lo. Ou exclua-o a partir
do mesmo tipo de sessao onde foi originalmente salvo.
