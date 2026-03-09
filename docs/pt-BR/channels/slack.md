# Slack

Conecte seu agente do Triggerfish ao Slack para que ele possa participar de
conversas no workspace. O adaptador usa o framework
[Bolt](https://slack.dev/bolt-js/) com Socket Mode, o que significa que nenhuma
URL publica ou endpoint de webhook e necessario.

## Classificacao padrao

O Slack tem classificacao `PUBLIC` por padrao. Isso reflete a realidade de que
workspaces do Slack frequentemente incluem convidados externos, usuarios do Slack
Connect e canais compartilhados. Voce pode elevar isso para `INTERNAL` ou
superior se seu workspace for estritamente interno.

## Configuracao

### Passo 1: Criar um app do Slack

1. Va em [api.slack.com/apps](https://api.slack.com/apps)
2. Clique em **Create New App**
3. Escolha **From scratch**
4. Nomeie seu app (ex.: "Triggerfish") e selecione seu workspace
5. Clique em **Create App**

### Passo 2: Configurar os escopos do bot token

Navegue ate **OAuth & Permissions** na barra lateral e adicione os seguintes
**Bot Token Scopes**:

| Escopo             | Proposito                                  |
| ------------------ | ------------------------------------------ |
| `chat:write`       | Enviar mensagens                           |
| `channels:history` | Ler mensagens em canais publicos           |
| `groups:history`   | Ler mensagens em canais privados           |
| `im:history`       | Ler mensagens diretas                      |
| `mpim:history`     | Ler mensagens diretas em grupo             |
| `channels:read`    | Listar canais publicos                     |
| `groups:read`      | Listar canais privados                     |
| `im:read`          | Listar conversas de mensagem direta        |
| `users:read`       | Consultar informacoes de usuarios          |

### Passo 3: Habilitar Socket Mode

1. Navegue ate **Socket Mode** na barra lateral
2. Ative **Enable Socket Mode**
3. Voce sera solicitado a criar um **App-Level Token** -- nomeie-o (ex.:
   "triggerfish-socket") e adicione o escopo `connections:write`
4. Copie o **App Token** gerado (comeca com `xapp-`)

### Passo 4: Habilitar eventos

1. Navegue ate **Event Subscriptions** na barra lateral
2. Ative **Enable Events**
3. Em **Subscribe to bot events**, adicione:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Passo 5: Obter suas credenciais

Voce precisa de tres valores:

- **Bot Token** -- Va em **OAuth & Permissions**, clique em **Install to
  Workspace**, depois copie o **Bot User OAuth Token** (comeca com `xoxb-`)
- **App Token** -- O token que voce criou no Passo 3 (comeca com `xapp-`)
- **Signing Secret** -- Va em **Basic Information**, role ate **App
  Credentials** e copie o **Signing Secret**

### Passo 6: Obter seu ID de usuario do Slack

Para configurar a identidade do proprietario:

1. Abra o Slack
2. Clique na sua foto de perfil no canto superior direito
3. Clique em **Profile**
4. Clique no menu de tres pontos e selecione **Copy member ID**

### Passo 7: Configurar o Triggerfish

Adicione o canal do Slack ao seu `triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret armazenados no chaveiro do SO
    ownerId: "U01234ABC"
```

Os segredos (bot token, app token, signing secret) sao inseridos durante
`triggerfish config add-channel slack` e armazenados no chaveiro do SO.

| Opcao            | Tipo   | Obrigatorio | Descricao                                              |
| ---------------- | ------ | ----------- | ------------------------------------------------------ |
| `ownerId`        | string | Recomendado | Seu ID de membro do Slack para verificacao de proprietario |
| `classification` | string | Nao         | Nivel de classificacao (padrao: `PUBLIC`)               |

::: warning Armazene segredos com seguranca Nunca inclua tokens ou segredos no
controle de versao. Use variaveis de ambiente ou o chaveiro do SO. Consulte
[Gerenciamento de segredos](/pt-BR/security/secrets) para mais detalhes. :::

### Passo 8: Convidar o bot

Antes de o bot poder ler ou enviar mensagens em um canal, voce precisa
convida-lo:

1. Abra o canal do Slack onde deseja o bot
2. Digite `/invite @Triggerfish` (ou o nome que voce deu ao app)

O bot tambem pode receber mensagens diretas sem ser convidado para um canal.

### Passo 9: Iniciar o Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envie uma mensagem em um canal onde o bot esteja presente, ou mande um DM
diretamente, para confirmar a conexao.

## Identidade do proprietario

O Triggerfish usa o fluxo OAuth do Slack para verificacao do proprietario. Quando
uma mensagem chega, o adaptador compara o ID de usuario do Slack do remetente com
o `ownerId` configurado:

- **Corresponde** -- Comando do proprietario
- **Nao corresponde** -- Entrada externa com taint `PUBLIC`

### Membros do workspace

Para classificacao de destinatarios, os membros do workspace do Slack determinam
se um usuario e `INTERNAL` ou `EXTERNAL`:

- Membros regulares do workspace sao `INTERNAL`
- Usuarios externos do Slack Connect sao `EXTERNAL`
- Usuarios convidados sao `EXTERNAL`

## Limites de mensagem

O Slack suporta mensagens de ate 40.000 caracteres. Mensagens que excedam esse
limite sao truncadas. Para a maioria das respostas do agente, esse limite nunca
e atingido.

## Indicadores de digitacao

O Triggerfish envia indicadores de digitacao ao Slack quando o agente esta
processando uma solicitacao. O Slack nao expoe eventos de digitacao de entrada
para bots, entao isso e apenas de envio.

## Chat em grupo

O bot pode participar em canais de grupo. Configure o comportamento em grupo
no seu `triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Comportamento    | Descricao                                             |
| ---------------- | ----------------------------------------------------- |
| `mentioned-only` | Responder apenas quando o bot for @mencionado         |
| `always`         | Responder a todas as mensagens no canal               |

## Alterar a classificacao

```yaml
channels:
  slack:
    classification: INTERNAL
```

Niveis validos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
