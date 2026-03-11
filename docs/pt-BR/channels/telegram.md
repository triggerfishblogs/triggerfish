# Telegram

Conecte seu agente do Triggerfish ao Telegram para poder interagir com ele de
qualquer dispositivo onde voce usa o Telegram. O adaptador usa o framework
[grammY](https://grammy.dev/) para se comunicar com a API de Bot do Telegram.

## Configuracao

### Passo 1: Criar um bot

1. Abra o Telegram e procure por [@BotFather](https://t.me/BotFather)
2. Envie `/newbot`
3. Escolha um nome de exibicao para seu bot (ex.: "My Triggerfish")
4. Escolha um nome de usuario para seu bot (deve terminar em `bot`, ex.:
   `my_triggerfish_bot`)
5. O BotFather respondera com seu **token de bot** -- copie-o

::: warning Mantenha seu token em segredo Seu token de bot concede controle total
do seu bot. Nunca o inclua no controle de versao nem o compartilhe publicamente.
O Triggerfish o armazena no chaveiro do seu sistema operacional. :::

### Passo 2: Obter seu ID de usuario do Telegram

O Triggerfish precisa do seu ID numerico de usuario para verificar que as
mensagens sao suas. Nomes de usuario do Telegram podem ser alterados e nao sao
confiaveis para identidade -- o ID numerico e permanente e atribuido pelos
servidores do Telegram, portanto nao pode ser falsificado.

1. Procure por [@getmyid_bot](https://t.me/getmyid_bot) no Telegram
2. Envie qualquer mensagem
3. Ele respondera com seu ID de usuario (um numero como `8019881968`)

### Passo 3: Adicionar o canal

Execute a configuracao interativa:

```bash
triggerfish config add-channel telegram
```

Isso solicita seu token de bot, ID de usuario e nivel de classificacao, depois
escreve a configuracao no `triggerfish.yaml` e oferece reiniciar o daemon.

Voce tambem pode adiciona-lo manualmente:

```yaml
channels:
  telegram:
    # botToken armazenado no chaveiro do SO
    ownerId: 8019881968
    classification: INTERNAL
```

| Opcao            | Tipo   | Obrigatorio | Descricao                                          |
| ---------------- | ------ | ----------- | -------------------------------------------------- |
| `botToken`       | string | Sim         | Token de API do bot do @BotFather                  |
| `ownerId`        | number | Sim         | Seu ID numerico de usuario do Telegram             |
| `classification` | string | Nao         | Teto de classificacao (padrao: `INTERNAL`)         |

### Passo 4: Comecar a conversar

Apos o daemon reiniciar, abra seu bot no Telegram e envie `/start`. O bot ira
cumprimentar voce para confirmar que a conexao esta ativa. Voce pode entao
conversar com seu agente diretamente.

## Comportamento de classificacao

A configuracao de `classification` e um **teto** -- ela controla a sensibilidade
maxima dos dados que podem fluir por este canal para conversas do
**proprietario**. Nao se aplica uniformemente a todos os usuarios.

**Como funciona por mensagem:**

- **Voce envia mensagem ao bot** (seu ID de usuario corresponde ao `ownerId`): A
  sessao usa o teto do canal. Com o padrao `INTERNAL`, seu agente pode
  compartilhar dados de nivel interno com voce.
- **Outra pessoa envia mensagem ao bot**: A sessao dela e automaticamente marcada
  como `PUBLIC` independentemente da classificacao do canal. A regra de no
  write-down impede que qualquer dado interno chegue a sessao dela.

Isso significa que um unico bot do Telegram gerencia com seguranca tanto
conversas do proprietario quanto de nao proprietarios. A verificacao de
identidade ocorre em codigo antes de o LLM ver a mensagem -- o LLM nao pode
influencia-la.

| Classificacao do canal     | Mensagens do proprietario | Mensagens de nao proprietarios |
| -------------------------- | :-----------------------: | :----------------------------: |
| `PUBLIC`                   |          PUBLIC           |             PUBLIC             |
| `INTERNAL` (padrao)        |      Ate INTERNAL         |             PUBLIC             |
| `CONFIDENTIAL`             |    Ate CONFIDENTIAL       |             PUBLIC             |
| `RESTRICTED`               |     Ate RESTRICTED        |             PUBLIC             |

Consulte [Sistema de classificacao](/pt-BR/architecture/classification) para o
modelo completo e
[Sessoes e taint](/pt-BR/architecture/taint-and-sessions) para saber como a
escalacao de taint funciona.

## Identidade do proprietario

O Triggerfish determina o status de proprietario comparando o ID numerico de
usuario do Telegram do remetente com o `ownerId` configurado. Essa verificacao
ocorre em codigo **antes** de o LLM ver a mensagem:

- **Corresponde** -- A mensagem e marcada como proprietario e pode acessar dados
  ate o teto de classificacao do canal
- **Nao corresponde** -- A mensagem e marcada com taint `PUBLIC`, e a regra de
  no write-down impede que qualquer dado classificado flua para essa sessao

::: danger Sempre configure seu Owner ID Sem `ownerId`, o Triggerfish trata
**todos** os remetentes como o proprietario. Qualquer pessoa que encontrar seu
bot pode acessar seus dados ate o nivel de classificacao do canal. Este campo e
obrigatorio durante a configuracao por esse motivo. :::

## Divisao de mensagens

O Telegram tem um limite de mensagem de 4.096 caracteres. Quando seu agente gera
uma resposta mais longa, o Triggerfish a divide automaticamente em multiplas
mensagens. O divisor separa por quebras de linha ou espacos para facilitar a
leitura -- evita cortar palavras ou frases ao meio.

## Tipos de mensagem suportados

O adaptador do Telegram atualmente suporta:

- **Mensagens de texto** -- Suporte completo de envio e recepcao
- **Respostas longas** -- Divididas automaticamente para caber nos limites do
  Telegram

## Indicadores de digitacao

Quando seu agente esta processando uma solicitacao, o bot mostra "digitando..."
no chat do Telegram. O indicador roda enquanto o LLM gera uma resposta e e
limpo quando a resposta e enviada.

## Alterar a classificacao

Para elevar ou reduzir o teto de classificacao:

```bash
triggerfish config add-channel telegram
# Selecione sobrescrever a configuracao existente quando solicitado
```

Ou edite o `triggerfish.yaml` diretamente:

```yaml
channels:
  telegram:
    # botToken armazenado no chaveiro do SO
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Niveis validos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Reinicie o daemon apos alterar: `triggerfish stop && triggerfish start`
