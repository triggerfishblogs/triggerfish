# Sessoes e taint

As sessoes sao a unidade fundamental do estado de conversa no Triggerfish. Cada
sessao rastreia de forma independente um **nivel de taint** -- uma marca d'agua
de classificacao que registra a maior sensibilidade dos dados acessados durante a
sessao. O taint direciona as decisoes de saida do motor de politicas: se uma
sessao esta com taint `CONFIDENTIAL`, nenhum dado dessa sessao pode fluir para um
canal classificado abaixo de `CONFIDENTIAL`.

## Modelo de taint de sessao

### Como o taint funciona

Quando uma sessao acessa dados em um nivel de classificacao, toda a sessao fica
**contaminada** nesse nivel. O taint segue tres regras:

1. **Por conversa**: Cada sessao tem seu proprio nivel de taint independente
2. **Apenas escalacao**: O taint pode aumentar, nunca diminuir dentro de uma sessao
3. **A reinicializacao completa limpa tudo**: O taint E o historico de conversa
   sao apagados juntos

<img src="/diagrams/taint-escalation.svg" alt="Escalacao de taint: PUBLIC -> INTERNAL -> CONFIDENTIAL -> RESTRICTED. O taint so pode escalar, nunca diminuir." style="max-width: 100%;" />

::: warning SEGURANCA O taint nunca pode ser reduzido seletivamente. Nao ha
mecanismo para "descontaminar" uma sessao sem apagar todo o historico de
conversa. Isso evita vazamento de contexto -- se a sessao lembra de ter visto
dados confidenciais, o taint deve refletir isso. :::

### Por que o taint nao pode diminuir

Mesmo que os dados classificados nao estejam mais sendo exibidos, a janela de
contexto do LLM ainda os contem. O modelo pode referenciar, resumir ou repetir
informacoes classificadas em respostas futuras. A unica forma segura de reduzir o
taint e eliminar o contexto por completo -- que e exatamente o que uma
reinicializacao completa faz.

## Tipos de sessoes

O Triggerfish gerencia varios tipos de sessoes, cada um com rastreamento de taint
independente:

| Tipo de sessao     | Descricao                                         | Taint inicial | Persiste entre reinicializacoes |
| ------------------ | ------------------------------------------------- | ------------- | ------------------------------- |
| **Principal**      | Conversa direta principal com o proprietario       | `PUBLIC`      | Sim                             |
| **Canal**          | Uma por canal conectado (Telegram, Slack, etc.)    | `PUBLIC`      | Sim                             |
| **Segundo plano**  | Criada para tarefas autonomas (cron, webhooks)     | `PUBLIC`      | Duracao da tarefa               |
| **Agente**         | Sessoes por agente para roteamento multiagente     | `PUBLIC`      | Sim                             |
| **Grupo**          | Sessoes de chat em grupo                           | `PUBLIC`      | Sim                             |

::: info As sessoes em segundo plano sempre iniciam com taint `PUBLIC`,
independentemente do nivel de taint da sessao pai. Isso e por design -- jobs cron
e tarefas disparadas por webhooks nao devem herdar o taint de qualquer sessao que
as tenha gerado. :::

## Exemplo de escalacao de taint

Aqui esta um fluxo completo mostrando a escalacao de taint e o bloqueio
resultante pela politica:

<img src="/diagrams/taint-with-blocks.svg" alt="Exemplo de escalacao de taint: a sessao inicia PUBLIC, escala para CONFIDENTIAL apos acesso ao Salesforce, entao BLOQUEIA a saida para o canal PUBLIC do WhatsApp" style="max-width: 100%;" />

## Mecanismo de reinicializacao completa

Uma reinicializacao de sessao e a unica forma de reduzir o taint. E uma operacao
deliberada e destrutiva:

1. **Arquivar registros de linhagem** -- Todos os dados de linhagem da sessao sao
   preservados no armazenamento de auditoria
2. **Apagar historico de conversa** -- Toda a janela de contexto e limpa
3. **Reinicializar taint para PUBLIC** -- A sessao comeca do zero
4. **Exigir confirmacao do usuario** -- O hook `SESSION_RESET` exige confirmacao
   explicita antes de executar

Apos uma reinicializacao, a sessao e indistinguivel de uma sessao nova. O agente
nao tem memoria da conversa anterior. Essa e a unica forma de garantir que dados
classificados nao vazem pelo contexto do LLM.

## Comunicacao entre sessoes

Quando um agente envia dados entre sessoes usando `sessions_send`, as mesmas
regras de no write-down se aplicam:

| Taint da sessao de origem | Canal da sessao de destino | Decisao |
| ------------------------- | -------------------------- | ------- |
| `PUBLIC`                  | Canal `PUBLIC`             | ALLOW   |
| `CONFIDENTIAL`            | Canal `CONFIDENTIAL`       | ALLOW   |
| `CONFIDENTIAL`            | Canal `PUBLIC`             | BLOCK   |
| `RESTRICTED`              | Canal `CONFIDENTIAL`       | BLOCK   |

Ferramentas de sessao disponiveis para o agente:

| Ferramenta         | Descricao                                     | Impacto no taint                           |
| ------------------ | --------------------------------------------- | ------------------------------------------ |
| `sessions_list`    | Listar sessoes ativas com filtros             | Sem mudanca de taint                       |
| `sessions_history` | Obter transcricao de uma sessao               | Taint herda da sessao referenciada         |
| `sessions_send`    | Enviar mensagem para outra sessao             | Sujeito a verificacao de write-down        |
| `sessions_spawn`   | Criar sessao de tarefa em segundo plano       | Nova sessao inicia em `PUBLIC`             |
| `session_status`   | Verificar estado atual e metadados da sessao  | Sem mudanca de taint                       |

## Linhagem de dados

Cada elemento de dados processado pelo Triggerfish carrega **metadados de
procedencia** -- um registro completo de onde os dados vieram, como foram
transformados e para onde foram. A linhagem e a trilha de auditoria que torna as
decisoes de classificacao verificaveis.

### Estrutura do registro de linhagem

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### Regras de rastreamento de linhagem

| Evento                                         | Acao de linhagem                                    |
| ---------------------------------------------- | --------------------------------------------------- |
| Dados lidos de uma integracao                  | Criar registro de linhagem com origem               |
| Dados transformados pelo LLM                   | Adicionar transformacao, vincular linhagens de entrada |
| Dados agregados de multiplas fontes            | Mesclar linhagem, classificacao = `max(entradas)`   |
| Dados enviados para um canal                   | Registrar destino, verificar classificacao          |
| Reinicializacao de sessao                      | Arquivar registros de linhagem, apagar do contexto  |

### Classificacao de agregacao

Quando dados de multiplas fontes sao combinados (ex.: um resumo do LLM de
registros de diferentes integracoes), o resultado agregado herda a
**classificacao maxima** de todas as entradas:

```
Entrada 1: INTERNAL    (wiki interna)
Entrada 2: CONFIDENTIAL (registro do Salesforce)
Entrada 3: PUBLIC      (API de clima)

Classificacao do resultado agregado: CONFIDENTIAL (maximo das entradas)
```

::: tip Implantacoes empresariais podem configurar regras opcionais de
rebaixamento para agregados estatisticos (medias, contagens, somas de mais de 10
registros) ou dados anonimizados certificados. Todos os rebaixamentos exigem
regras de politicas explicitas, sao registrados com justificativa completa e
estao sujeitos a revisao de auditoria. :::

### Capacidades de auditoria

A linhagem habilita quatro categorias de consultas de auditoria:

- **Rastreamento para frente**: "O que aconteceu com os dados do registro X do
  Salesforce?" -- segue os dados para frente da origem a todos os destinos
- **Rastreamento para tras**: "Quais fontes contribuiram para essa saida?" --
  rastreia uma saida de volta a todos os registros de origem
- **Justificativa de classificacao**: "Por que isso esta marcado como
  CONFIDENTIAL?" -- mostra a cadeia de motivos de classificacao
- **Exportacao de conformidade**: Cadeia completa de custodia para revisao legal
  ou regulatoria

## Persistencia do taint

O taint de sessao e persistido pelo `StorageProvider` sob o namespace `taint:`.
Isso significa que o taint sobrevive a reinicializacoes do daemon -- uma sessao
que era `CONFIDENTIAL` antes de uma reinicializacao continua sendo `CONFIDENTIAL`
depois.

Os registros de linhagem sao persistidos sob o namespace `lineage:` com retencao
orientada a conformidade (90 dias por padrao).
