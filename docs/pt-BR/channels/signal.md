# Signal

Conecte seu agente do Triggerfish ao Signal para que pessoas possam enviar
mensagens a ele pelo app do Signal. O adaptador se comunica com um daemon do
[signal-cli](https://github.com/AsamK/signal-cli) via JSON-RPC, usando seu
numero de telefone vinculado ao Signal.

## Como o Signal e diferente

O adaptador do Signal **e** seu numero de telefone. Diferente do Telegram ou
Slack onde existe uma conta de bot separada, as mensagens do Signal vem de outras
pessoas para o seu numero. Isso significa:

- Todas as mensagens de entrada tem `isOwner: false` -- sao sempre de outra
  pessoa
- O adaptador responde como seu numero de telefone
- Nao ha verificacao de proprietario por mensagem como em outros canais

Isso torna o Signal ideal para receber mensagens de contatos que escrevem para
seu numero, com o agente respondendo em seu nome.

## Classificacao padrao

O Signal tem classificacao `PUBLIC` por padrao. Como todas as mensagens de
entrada vem de contatos externos, `PUBLIC` e o padrao seguro.

## Configuracao

### Passo 1: Instalar o signal-cli

O signal-cli e um cliente de linha de comando de terceiros para o Signal. O
Triggerfish se comunica com ele por um socket TCP ou Unix.

**Linux (build nativo -- nao precisa de Java):**

Baixe o ultimo build nativo na pagina de
[releases do signal-cli](https://github.com/AsamK/signal-cli/releases), ou
deixe o Triggerfish baixa-lo durante a configuracao.

**macOS / outras plataformas (build JVM):**

Requer Java 21+. O Triggerfish pode baixar um JRE portatil automaticamente se o
Java nao estiver instalado.

Voce tambem pode executar a configuracao guiada:

```bash
triggerfish config add-channel signal
```

Isso verifica o signal-cli, oferece baixa-lo se estiver faltando e guia voce
pelo processo de vinculacao.

### Passo 2: Vincular seu dispositivo

O signal-cli precisa ser vinculado a sua conta do Signal existente (como vincular
um app de desktop):

```bash
signal-cli link -n "Triggerfish"
```

Isso imprime um URI `tsdevice:`. Escaneie o codigo QR com seu app movel do
Signal (Configuracoes > Dispositivos Vinculados > Vincular Novo Dispositivo).

### Passo 3: Iniciar o daemon

O signal-cli roda como um daemon em segundo plano ao qual o Triggerfish se
conecta:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Substitua `+14155552671` pelo seu numero de telefone no formato E.164.

### Passo 4: Configurar o Triggerfish

Adicione o Signal ao seu `triggerfish.yaml`:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Opcao              | Tipo    | Obrigatorio | Descricao                                                                                    |
| ------------------ | ------- | ----------- | -------------------------------------------------------------------------------------------- |
| `endpoint`         | string  | Sim         | Endereco do daemon signal-cli (`tcp://host:porta` ou `unix:///caminho/do/socket`)            |
| `account`          | string  | Sim         | Seu numero de telefone do Signal (formato E.164)                                             |
| `classification`   | string  | Nao         | Teto de classificacao (padrao: `PUBLIC`)                                                     |
| `defaultGroupMode` | string  | Nao         | Tratamento de mensagens em grupo: `always`, `mentioned-only`, `owner-only` (padrao: `always`) |
| `groups`           | object  | Nao         | Configuracoes por grupo                                                                      |
| `ownerPhone`       | string  | Nao         | Reservado para uso futuro                                                                    |
| `pairing`          | boolean | Nao         | Habilitar modo de pareamento durante a configuracao                                          |

### Passo 5: Iniciar o Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envie uma mensagem para seu numero de telefone de outro usuario do Signal para
confirmar a conexao.

## Mensagens em grupo

O Signal suporta chats em grupo. Voce pode controlar como o agente responde a
mensagens em grupo:

| Modo             | Comportamento                                               |
| ---------------- | ----------------------------------------------------------- |
| `always`         | Responder a todas as mensagens em grupo (padrao)            |
| `mentioned-only` | Responder apenas quando mencionado por numero ou @mencao    |
| `owner-only`     | Nunca responder em grupos                                   |

Configure globalmente ou por grupo:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "seu-group-id":
        mode: always
        classification: INTERNAL
```

Os IDs de grupo sao identificadores codificados em base64. Use
`triggerfish signal list-groups` ou consulte a documentacao do signal-cli para
encontra-los.

## Divisao de mensagens

O Signal tem um limite de mensagem de 4.000 caracteres. Respostas mais longas
sao automaticamente divididas em multiplas mensagens, separando por quebras de
linha ou espacos para facilitar a leitura.

## Indicadores de digitacao

O adaptador envia indicadores de digitacao enquanto o agente esta processando
uma solicitacao. O estado de digitacao e limpo quando a resposta e enviada.

## Ferramentas estendidas

O adaptador do Signal expoe ferramentas adicionais:

- `sendTyping` / `stopTyping` -- Controle manual de indicadores de digitacao
- `listGroups` -- Listar todos os grupos do Signal dos quais a conta faz parte
- `listContacts` -- Listar todos os contatos do Signal

## Alterar a classificacao

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Niveis validos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Reinicie o daemon apos alterar: `triggerfish stop && triggerfish start`

## Recursos de confiabilidade

O adaptador do Signal inclui varios mecanismos de confiabilidade:

### Reconexao automatica

Se a conexao com o signal-cli cair (interrupcao de rede, reinicio do daemon), o
adaptador reconecta automaticamente com backoff exponencial. Nenhuma intervencao
manual e necessaria.

### Verificacao de saude

Na inicializacao, o Triggerfish verifica se um daemon signal-cli existente esta
saudavel usando uma sondagem de ping JSON-RPC. Se o daemon nao responder, ele e
encerrado e reiniciado automaticamente.

### Rastreamento de versao

O Triggerfish rastreia a versao considerada estavel do signal-cli (atualmente
0.13.0) e avisa na inicializacao se sua versao instalada for mais antiga. A
versao do signal-cli e registrada em cada conexao bem-sucedida.

### Suporte a socket Unix

Alem de endpoints TCP, o adaptador suporta sockets de dominio Unix:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Solucao de problemas

**Daemon signal-cli nao acessivel:**

- Verifique se o daemon esta rodando: procure o processo ou tente
  `nc -z 127.0.0.1 7583`
- O signal-cli aceita apenas IPv4 -- use `127.0.0.1`, nao `localhost`
- A porta TCP padrao e 7583
- O Triggerfish reiniciara automaticamente o daemon se detectar um processo nao
  saudavel

**Mensagens nao chegam:**

- Confirme que o dispositivo esta vinculado: verifique no app movel do Signal em
  Dispositivos Vinculados
- O signal-cli deve ter recebido pelo menos uma sincronizacao apos a vinculacao
- Verifique os logs em busca de erros de conexao: `triggerfish logs --tail`

**Erros de Java (apenas build JVM):**

- O build JVM do signal-cli requer Java 21+
- Execute `java -version` para verificar
- O Triggerfish pode baixar um JRE portatil durante a configuracao se necessario

**Loops de reconexao:**

- Se voce vir tentativas repetidas de reconexao nos logs, o daemon signal-cli
  pode estar falhando
- Verifique a saida stderr do signal-cli em busca de erros
- Tente reiniciar com um daemon limpo: pare o Triggerfish, encerre o signal-cli,
  reinicie ambos
