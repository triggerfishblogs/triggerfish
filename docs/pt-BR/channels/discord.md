# Discord

Conecte seu agente do Triggerfish ao Discord para que ele possa responder em
canais do servidor e mensagens diretas. O adaptador usa o
[discord.js](https://discord.js.org/) para se conectar ao Gateway do Discord.

## Classificacao padrao

O Discord tem classificacao `PUBLIC` por padrao. Servidores do Discord
frequentemente incluem uma mistura de membros confiaveis e visitantes publicos,
entao `PUBLIC` e o padrao seguro. Voce pode elevar isso se seu servidor for
privado e confiavel.

## Configuracao

### Passo 1: Criar um aplicativo do Discord

1. Va ao
   [Portal de Desenvolvedores do Discord](https://discord.com/developers/applications)
2. Clique em **New Application**
3. Nomeie seu aplicativo (ex.: "Triggerfish")
4. Clique em **Create**

### Passo 2: Criar um usuario bot

1. No seu aplicativo, navegue ate **Bot** na barra lateral
2. Clique em **Add Bot** (se ainda nao foi criado)
3. Abaixo do nome de usuario do bot, clique em **Reset Token** para gerar um
   novo token
4. Copie o **token do bot**

::: warning Mantenha seu token em segredo Seu token de bot concede controle total
do seu bot. Nunca o inclua no controle de versao nem o compartilhe
publicamente. :::

### Passo 3: Configurar intents privilegiados

Ainda na pagina de **Bot**, habilite estes intents privilegiados do gateway:

- **Message Content Intent** -- Necessario para ler o conteudo das mensagens
- **Server Members Intent** -- Opcional, para busca de membros

### Passo 4: Obter seu ID de usuario do Discord

1. Abra o Discord
2. Va em **Settings** > **Advanced** e habilite o **Developer Mode**
3. Clique no seu nome de usuario em qualquer lugar no Discord
4. Clique em **Copy User ID**

Este e o ID snowflake que o Triggerfish usa para verificar a identidade do
proprietario.

### Passo 5: Gerar um link de convite

1. No Portal de Desenvolvedores, navegue ate **OAuth2** > **URL Generator**
2. Em **Scopes**, selecione `bot`
3. Em **Bot Permissions**, selecione:
   - Send Messages
   - Read Message History
   - View Channels
4. Copie a URL gerada e abra-a no seu navegador
5. Selecione o servidor ao qual deseja adicionar o bot e clique em **Authorize**

### Passo 6: Configurar o Triggerfish

Adicione o canal do Discord ao seu `triggerfish.yaml`:

```yaml
channels:
  discord:
    # botToken armazenado no chaveiro do SO
    ownerId: "123456789012345678"
```

| Opcao            | Tipo   | Obrigatorio | Descricao                                                               |
| ---------------- | ------ | ----------- | ----------------------------------------------------------------------- |
| `botToken`       | string | Sim         | Token do bot do Discord                                                 |
| `ownerId`        | string | Recomendado | Seu ID de usuario do Discord (snowflake) para verificacao de proprietario |
| `classification` | string | Nao         | Nivel de classificacao (padrao: `PUBLIC`)                               |

### Passo 7: Iniciar o Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envie uma mensagem em um canal onde o bot esteja presente, ou mande um DM
diretamente, para confirmar a conexao.

## Identidade do proprietario

O Triggerfish determina o status de proprietario comparando o ID de usuario do
Discord do remetente com o `ownerId` configurado. Essa verificacao ocorre em
codigo antes de o LLM ver a mensagem:

- **Corresponde** -- A mensagem e um comando do proprietario
- **Nao corresponde** -- A mensagem e entrada externa com taint `PUBLIC`

Se nenhum `ownerId` for configurado, todas as mensagens sao tratadas como vindas
do proprietario.

::: danger Sempre configure o Owner ID Se seu bot esta em um servidor com outros
membros, sempre configure o `ownerId`. Sem ele, qualquer membro do servidor pode
enviar comandos ao seu agente. :::

## Divisao de mensagens

O Discord tem um limite de mensagem de 2.000 caracteres. Quando o agente gera
uma resposta mais longa, o Triggerfish a divide automaticamente em multiplas
mensagens. O divisor separa por quebras de linha ou espacos para preservar a
legibilidade.

## Comportamento do bot

O adaptador do Discord:

- **Ignora suas proprias mensagens** -- O bot nao respondera as mensagens que
  ele envia
- **Escuta em todos os canais acessiveis** -- Canais do servidor, DMs em grupo
  e mensagens diretas
- **Requer Message Content Intent** -- Sem isso, o bot recebe eventos de
  mensagem vazios

## Indicadores de digitacao

O Triggerfish envia indicadores de digitacao ao Discord quando o agente esta
processando uma solicitacao. O Discord nao expoe eventos de digitacao dos
usuarios para bots de forma confiavel, entao isso e apenas de envio.

## Chat em grupo

O bot pode participar em canais do servidor. Configure o comportamento em grupo:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Comportamento    | Descricao                                             |
| ---------------- | ----------------------------------------------------- |
| `mentioned-only` | Responder apenas quando o bot for @mencionado         |
| `always`         | Responder a todas as mensagens no canal               |

## Alterar a classificacao

```yaml
channels:
  discord:
    # botToken armazenado no chaveiro do SO
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Niveis validos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
