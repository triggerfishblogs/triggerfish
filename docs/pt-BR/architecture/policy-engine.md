# Motor de politicas e hooks

O motor de politicas e a camada de aplicacao que fica entre o LLM e o mundo
exterior. Ele intercepta cada acao em pontos criticos do fluxo de dados e toma
decisoes deterministicas de ALLOW, BLOCK ou REDACT. O LLM nao pode contornar,
modificar ou influenciar essas decisoes.

## Principio central: aplicacao abaixo do LLM

<img src="/diagrams/policy-enforcement-layers.svg" alt="Camadas de aplicacao de politicas: o LLM fica acima da camada de politicas, que fica acima da camada de execucao" style="max-width: 100%;" />

::: warning SEGURANCA O LLM fica acima da camada de politicas. Ele pode sofrer
prompt injection, jailbreak ou manipulacao -- e isso nao importa. A camada de
politicas e codigo puro que roda abaixo do LLM, examinando requisicoes de acoes
estruturadas e tomando decisoes binarias com base em regras de classificacao. Nao
ha caminho da saida do LLM ate o contorno dos hooks. :::

## Tipos de hooks

Oito hooks de aplicacao interceptam acoes em cada ponto critico do fluxo de
dados.

### Arquitetura de hooks

<img src="/diagrams/hook-chain-flow.svg" alt="Fluxo da cadeia de hooks: PRE_CONTEXT_INJECTION -> Contexto do LLM -> PRE_TOOL_CALL -> Execucao de ferramenta -> POST_TOOL_RESPONSE -> Resposta do LLM -> PRE_OUTPUT -> Canal de saida" style="max-width: 100%;" />

### Todos os tipos de hooks

| Hook                    | Gatilho                             | Acoes-chave                                                                   | Modo de falha           |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------------------- | ----------------------- |
| `PRE_CONTEXT_INJECTION` | Entrada externa entra no contexto   | Classificar entrada, atribuir taint, criar linhagem, varrer injecoes          | Rejeitar entrada        |
| `PRE_TOOL_CALL`         | LLM solicita execucao de ferramenta | Verificacao de permissoes, limite de taxa, validacao de parametros             | Bloquear chamada        |
| `POST_TOOL_RESPONSE`    | Ferramenta retorna dados            | Classificar resposta, atualizar taint de sessao, criar/atualizar linhagem     | Redigir ou bloquear     |
| `PRE_OUTPUT`            | Resposta prestes a sair do sistema  | Verificacao final de classificacao contra destino, varredura de PII           | Bloquear saida          |
| `SECRET_ACCESS`         | Plugin solicita uma credencial      | Registrar acesso, verificar permissao contra escopo declarado                 | Negar credencial        |
| `SESSION_RESET`         | Usuario solicita reinicializacao de taint | Arquivar linhagem, limpar contexto, verificar confirmacao                | Exigir confirmacao      |
| `AGENT_INVOCATION`      | Agente chama outro agente           | Verificar cadeia de delegacao, aplicar teto de taint                          | Bloquear invocacao      |
| `MCP_TOOL_CALL`         | Ferramenta de servidor MCP invocada | Verificacao de politica do Gateway (status do servidor, permissoes de ferramenta, schema) | Bloquear chamada MCP |

## Interface de hooks

Cada hook recebe um contexto e retorna um resultado. O handler e uma funcao
sincrona e pura.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // O payload especifico do hook varia por tipo
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` e sincrono e retorna `HookResult` diretamente -- nao uma
Promise. Isso e por design. Os hooks devem ser concluidos antes que a acao
prossiga, e torna-los sincronos elimina qualquer possibilidade de contorno
assincrono. Se um hook expirar, a acao e rejeitada. :::

## Garantias dos hooks

Cada execucao de hook possui quatro invariantes:

| Garantia           | O que significa                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deterministico** | A mesma entrada sempre produz a mesma decisao. Sem aleatoriedade. Sem chamadas ao LLM dentro dos hooks. Sem chamadas a APIs externas que afetem decisoes. |
| **Sincrono**       | Os hooks sao concluidos antes que a acao prossiga. Contorno assincrono nao e possivel. Timeout equivale a rejeicao.                          |
| **Registrado**     | Cada execucao de hook e registrada: parametros de entrada, decisao tomada, timestamp e regras de politicas avaliadas.                         |
| **Infalsificavel** | A saida do LLM nao pode conter instrucoes de contorno de hooks. A camada de hooks nao tem logica de "fazer parsing da saida do LLM em busca de comandos". |

## Hierarquia de regras de politicas

As regras de politicas sao organizadas em tres niveis. Niveis superiores nao
podem anular niveis inferiores.

### Regras fixas (sempre aplicadas, NAO configuraveis)

Essas regras sao hardcoded e nao podem ser desabilitadas por nenhum
administrador, usuario ou configuracao:

- **No write-down**: O fluxo de classificacao e unidirecional. Os dados nao podem fluir para
  um nivel inferior.
- **Canais UNTRUSTED**: Nenhum dado de entrada ou saida. Ponto final.
- **Taint de sessao**: Uma vez elevado, permanece elevado durante toda a vida da sessao.
- **Registro de auditoria**: Todas as acoes sao registradas. Sem excecoes. Sem como desabilitar.

### Regras configuraveis (ajustaveis pelo administrador)

Os administradores podem ajustar estas por meio da interface ou arquivos de
configuracao:

- Classificacoes padrao de integracoes (ex.: Salesforce tem como padrao
  `CONFIDENTIAL`)
- Classificacoes de canais
- Listas de permissao/negacao de acoes por integracao
- Listas de dominios permitidos para comunicacoes externas
- Limites de taxa por ferramenta, por usuario ou por sessao

### Escotilha de escape declarativa (empresarial)

Implantacoes empresariais podem definir regras de politicas personalizadas em YAML
estruturado para cenarios avancados:

```yaml
# Bloquear qualquer consulta ao Salesforce que contenha padroes de SSN
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDACTED]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# Exigir aprovacao para transacoes de alto valor
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# Restricao por horario: nao enviar para externos fora do horario
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "Comunicacoes externas restritas fora do horario comercial"
```

::: tip As regras YAML personalizadas devem passar por validacao antes de serem
ativadas. Regras invalidas sao rejeitadas no momento da configuracao, nao em
tempo de execucao. Isso evita que erros de configuracao criem brechas de
seguranca. :::

## Experiencia do usuario na negacao

Quando o motor de politicas bloqueia uma acao, o usuario ve uma explicacao clara
-- nao um erro generico.

**Padrao (especifico):**

```
Nao posso enviar dados confidenciais para um canal publico.

  -> Reiniciar sessao e enviar mensagem
  -> Cancelar
```

**Opcional (educativo):**

```
Nao posso enviar dados confidenciais para um canal publico.

Por que: Esta sessao acessou o Salesforce (CONFIDENTIAL).
O WhatsApp pessoal e classificado como PUBLIC.
Os dados so podem fluir para classificacao igual ou superior.

Opcoes:
  -> Reiniciar sessao e enviar mensagem
  -> Pedir ao seu administrador para reclassificar o canal do WhatsApp
  -> Saiba mais: [link da documentacao]
```

O modo educativo e opcional e ajuda os usuarios a entender _por que_ uma acao foi
bloqueada, incluindo qual fonte de dados causou a escalacao de taint e qual e a
incompatibilidade de classificacao. Ambos os modos oferecem proximos passos
acionaveis em vez de erros sem saida.

## Como os hooks se encadeiam

Em um ciclo tipico de requisicao/resposta, multiplos hooks sao executados em
sequencia. Cada hook tem visibilidade completa das decisoes tomadas pelos hooks
anteriores na cadeia.

```
O usuario envia: "Verifique meu pipeline do Salesforce e mande uma mensagem para minha esposa"

1. PRE_CONTEXT_INJECTION
   - Entrada do proprietario, classificada como PUBLIC
   - Taint de sessao: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - Ferramenta permitida? SIM
   - O usuario tem conexao com o Salesforce? SIM
   - Limite de taxa? OK
   - Decisao: ALLOW

3. POST_TOOL_RESPONSE (resultados do Salesforce)
   - Dados classificados: CONFIDENTIAL
   - Taint de sessao escala: PUBLIC -> CONFIDENTIAL
   - Registro de linhagem criado

4. PRE_TOOL_CALL (whatsapp.send_message)
   - Ferramenta permitida? SIM
   - Decisao: ALLOW (verificacao no nivel da ferramenta passa)

5. PRE_OUTPUT (mensagem para a esposa via WhatsApp)
   - Taint de sessao: CONFIDENTIAL
   - Classificacao efetiva do destino: PUBLIC (destinatario externo)
   - CONFIDENTIAL -> PUBLIC: BLOQUEADO
   - Decisao: BLOCK
   - Motivo: "classification_violation"

6. O agente apresenta a opcao de reinicializacao ao usuario
```
