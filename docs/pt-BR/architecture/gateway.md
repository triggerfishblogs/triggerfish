# Gateway

O Gateway e o plano de controle central do Triggerfish -- um servico local de
longa execucao que coordena sessoes, canais, ferramentas, eventos e processos de
agentes por meio de um unico endpoint WebSocket. Tudo o que acontece no
Triggerfish flui pelo Gateway.

## Arquitetura

<img src="/diagrams/gateway-architecture.svg" alt="Arquitetura do Gateway: os canais a esquerda se conectam pelo Gateway central aos servicos a direita" style="max-width: 100%;" />

O Gateway escuta em uma porta configuravel (padrao `18789`) e aceita conexoes de
adaptadores de canal, comandos CLI, apps complementares e servicos internos.
Toda a comunicacao usa JSON-RPC sobre WebSocket.

## Servicos do Gateway

O Gateway fornece estes servicos por meio de seus endpoints WebSocket e HTTP:

| Servico           | Descricao                                                                         | Integracao de seguranca                        |
| ----------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Sessoes**       | Criar, listar, obter historico, enviar entre sessoes, gerar tarefas em segundo plano | Taint de sessao rastreado por sessao        |
| **Canais**        | Rotear mensagens, gerenciar conexoes, retentar entregas falhas, dividir mensagens grandes | Verificacao de classificacao em toda saida |
| **Cron**          | Agendar tarefas recorrentes e disparar ativacoes a partir do `TRIGGER.md`          | Acoes cron passam por hooks de politicas       |
| **Webhooks**      | Aceitar eventos de entrada de servicos externos via `POST /webhooks/:sourceId`     | Dados de entrada classificados na ingestao     |
| **Ripple**        | Rastrear status online e indicadores de digitacao entre canais                     | Sem dados sensiveis expostos                   |
| **Configuracao**  | Recarga a quente de configuracoes sem reinicio                                     | Apenas administrador no nivel empresarial      |
| **UI de controle** | Painel web para saude e gerenciamento do Gateway                                  | Autenticado por token                          |
| **Tide Pool**     | Hospedar workspace visual A2UI dirigido pelo agente                                | Conteudo sujeito a hooks de saida              |
| **Notificacoes**  | Entrega de notificacoes multicanal com roteamento por prioridade                   | Regras de classificacao se aplicam             |

## Protocolo WebSocket JSON-RPC

Os clientes se conectam ao Gateway via WebSocket e trocam mensagens JSON-RPC 2.0.
Cada mensagem e uma chamada de metodo com parametros tipados e uma resposta
tipada.

```typescript
// O cliente envia:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// O Gateway responde:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

O Gateway tambem serve endpoints HTTP para ingestao de webhooks. Quando um
`SchedulerService` e acoplado, as rotas `POST /webhooks/:sourceId` ficam
disponiveis para eventos de webhook de entrada.

## Interface do servidor

```typescript
interface GatewayServerOptions {
  /** Porta para escutar. Use 0 para uma porta disponivel aleatoria. */
  readonly port?: number;
  /** Token de autenticacao para conexoes. */
  readonly authToken?: string;
  /** Servico de agendamento opcional para endpoints de webhook. */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** Iniciar o servidor. Retorna o endereco vinculado. */
  start(): Promise<GatewayAddr>;
  /** Parar o servidor de forma controlada. */
  stop(): Promise<void>;
}
```

## Autenticacao

As conexoes ao Gateway sao autenticadas com um token. O token e gerado durante a
configuracao (`triggerfish dive`) e armazenado localmente.

::: warning SEGURANCA O Gateway se vincula a `127.0.0.1` por padrao e nao e
exposto a rede. O acesso remoto requer configuracao explicita de tunel. Nunca
exponha o WebSocket do Gateway a internet publica sem autenticacao. :::

## Gerenciamento de sessoes

O Gateway gerencia o ciclo de vida completo das sessoes. As sessoes sao a
unidade fundamental do estado de conversa, cada uma com rastreamento de taint
independente.

### Tipos de sessoes

| Tipo            | Padrao de chave                | Descricao                                                                          |
| --------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| Principal       | `main`                         | Conversa direta principal com o proprietario. Persiste entre reinicializacoes.      |
| Canal           | `channel:<type>:<id>`          | Uma por canal conectado. Taint isolado por canal.                                  |
| Segundo plano   | `bg:<task_id>`                 | Gerada para jobs cron e tarefas disparadas por webhook. Inicia com taint `PUBLIC`. |
| Agente          | `agent:<agent_id>`             | Sessoes por agente para roteamento multiagente.                                    |
| Grupo           | `group:<channel>:<group_id>`   | Sessoes de chat em grupo.                                                          |

### Ferramentas de sessao

O agente interage com as sessoes por meio destas ferramentas, todas roteadas pelo
Gateway:

| Ferramenta         | Descricao                                       | Implicacoes de taint                          |
| ------------------ | ----------------------------------------------- | --------------------------------------------- |
| `sessions_list`    | Listar sessoes ativas com filtros opcionais     | Sem mudanca de taint                          |
| `sessions_history` | Obter transcricao de uma sessao                 | Taint herda da sessao referenciada            |
| `sessions_send`    | Enviar mensagem para outra sessao               | Sujeito a verificacao de write-down           |
| `sessions_spawn`   | Criar sessao de tarefa em segundo plano         | Nova sessao inicia com taint `PUBLIC`         |
| `session_status`   | Verificar estado atual, modelo e custo da sessao | Sem mudanca de taint                         |

::: info A comunicacao entre sessoes via `sessions_send` esta sujeita as mesmas
regras de write-down que qualquer outra saida. Uma sessao `CONFIDENTIAL` nao pode
enviar dados para uma sessao conectada a um canal `PUBLIC`. :::

## Roteamento de canais

O Gateway roteia mensagens entre canais e sessoes por meio do roteador de canais.
O roteador gerencia:

- **Portao de classificacao**: Cada mensagem de saida passa por `PRE_OUTPUT`
  antes da entrega
- **Retentativa com backoff**: Entregas falhas sao retentadas com backoff
  exponencial via `sendWithRetry()`
- **Divisao de mensagens**: Mensagens grandes sao divididas em blocos
  apropriados para a plataforma (ex.: o limite de 4096 caracteres do Telegram)
- **Streaming**: Respostas sao transmitidas em streaming para canais que suportam
- **Gerenciamento de conexoes**: `connectAll()` e `disconnectAll()` para
  gerenciamento do ciclo de vida

## Servico de notificacoes

O Gateway integra um servico de notificacoes de primeira classe que substitui os
padroes ad-hoc de "notificar o proprietario" em toda a plataforma. Todas as
notificacoes fluem por um unico `NotificationService`.

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### Roteamento por prioridade

| Prioridade | Comportamento                                                             |
| ---------- | ------------------------------------------------------------------------- |
| `CRITICAL` | Ignora horarios de silencio, entrega em TODOS os canais conectados imediatamente |
| `HIGH`     | Entrega no canal preferido imediatamente, enfileira se offline            |
| `NORMAL`   | Entrega na sessao ativa, ou enfileira para o proximo inicio de sessao    |
| `LOW`      | Enfileira, entrega em lotes durante sessoes ativas                       |

### Fontes de notificacoes

| Fonte                                   | Categoria    | Prioridade padrao |
| --------------------------------------- | ------------ | ----------------- |
| Violacoes de politicas                  | `security`   | `CRITICAL`        |
| Alertas de inteligencia de ameacas      | `security`   | `CRITICAL`        |
| Solicitacoes de aprovacao de skills     | `approval`   | `HIGH`            |
| Falhas de jobs cron                     | `system`     | `HIGH`            |
| Avisos de saude do sistema              | `system`     | `HIGH`            |
| Disparadores de eventos webhook         | `info`       | `NORMAL`          |
| Atualizacoes disponiveis no The Reef    | `info`       | `LOW`             |

As notificacoes sao persistidas via `StorageProvider` (namespace:
`notifications:`) e sobrevivem a reinicializacoes. Notificacoes nao entregues sao
retentadas no proximo inicio do Gateway ou conexao de sessao.

### Preferencias de entrega

Os usuarios configuram preferencias de notificacao por canal:

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "America/Chicago"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## Integracao com o agendador

O Gateway hospeda o servico de agendamento, que gerencia:

- **Loop de tick cron**: Avaliacao periodica de tarefas agendadas
- **Ativacoes de trigger**: Ativacoes do agente definidas em `TRIGGER.md`
- **Endpoints HTTP de webhook**: `POST /webhooks/:sourceId` para eventos de entrada
- **Isolamento de orquestrador**: Cada tarefa agendada roda em seu proprio
  `OrchestratorFactory` com estado de sessao isolado

::: tip As tarefas disparadas por cron e por webhook geram sessoes em segundo
plano com taint `PUBLIC` limpo. Elas nao herdam o taint de nenhuma sessao
existente, garantindo que tarefas autonomas iniciem com um estado de
classificacao limpo. :::

## Saude e diagnosticos

O comando `triggerfish patrol` se conecta ao Gateway e executa verificacoes de
saude diagnosticas, conferindo:

- O Gateway esta rodando e respondendo
- Todos os canais configurados estao conectados
- O armazenamento esta acessivel
- As tarefas agendadas estao sendo executadas no horario
- Nao ha notificacoes criticas nao entregues presas na fila
