# Visao geral multicanal

O Triggerfish se conecta as suas plataformas de mensagens existentes. Voce fala
com seu agente onde ja se comunica -- terminal, Telegram, Slack, Discord,
WhatsApp, um widget web ou e-mail. Cada canal tem seu proprio nivel de
classificacao, verificacoes de identidade do proprietario e aplicacao de
politicas.

## Como os canais funcionam

Cada adaptador de canal implementa a mesma interface: `connect`, `disconnect`,
`send`, `onMessage` e `status`. O **roteador de canais** fica acima de todos os
adaptadores e gerencia o despacho de mensagens, as verificacoes de classificacao
e a logica de retentativas.

<img src="/diagrams/channel-router.svg" alt="Roteador de canais: todos os adaptadores de canal fluem por um portao de classificacao central ate o Gateway Server" style="max-width: 100%;" />

Quando uma mensagem chega em qualquer canal, o roteador:

1. Identifica o remetente (proprietario ou externo) usando **verificacoes de
   identidade no nivel do codigo** -- nao interpretacao do LLM
2. Marca a mensagem com o nivel de classificacao do canal
3. A encaminha ao motor de politicas para aplicacao
4. Roteia a resposta do agente de volta pelo mesmo canal

## Classificacao de canais

Cada canal tem um nivel de classificacao padrao que determina quais dados podem
fluir por ele. O motor de politicas aplica a **regra de no write-down**: dados em
um determinado nivel de classificacao nunca podem fluir para um canal com
classificacao inferior.

| Canal                                          | Classificacao padrao | Deteccao de proprietario                      |
| ---------------------------------------------- | :------------------: | --------------------------------------------- |
| [CLI](/pt-BR/channels/cli)                     |      `INTERNAL`      | Sempre proprietario (usuario do terminal)     |
| [Telegram](/pt-BR/channels/telegram)           |      `INTERNAL`      | Correspondencia de ID de usuario do Telegram  |
| [Signal](/pt-BR/channels/signal)               |       `PUBLIC`       | Nunca proprietario (o adaptador E seu celular) |
| [Slack](/pt-BR/channels/slack)                 |       `PUBLIC`       | ID de usuario do Slack via OAuth              |
| [Discord](/pt-BR/channels/discord)             |       `PUBLIC`       | Correspondencia de ID de usuario do Discord   |
| [WhatsApp](/pt-BR/channels/whatsapp)           |       `PUBLIC`       | Correspondencia de numero de telefone         |
| [WebChat](/pt-BR/channels/webchat)             |       `PUBLIC`       | Nunca proprietario (visitantes)               |
| [E-mail](/pt-BR/channels/email)                |    `CONFIDENTIAL`    | Correspondencia de endereco de e-mail         |

::: tip Totalmente configuravel Todas as classificacoes sao configuraveis no seu
`triggerfish.yaml`. Voce pode definir qualquer canal em qualquer nivel de
classificacao com base nos seus requisitos de seguranca.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Classificacao efetiva

A classificacao efetiva de qualquer mensagem e o **minimo** entre a classificacao
do canal e a classificacao do destinatario:

| Nivel do canal | Nivel do destinatario | Nivel efetivo |
| -------------- | --------------------- | ------------- |
| INTERNAL       | INTERNAL              | INTERNAL      |
| INTERNAL       | EXTERNAL              | PUBLIC        |
| CONFIDENTIAL   | INTERNAL              | INTERNAL      |
| CONFIDENTIAL   | EXTERNAL              | PUBLIC        |

Isso significa que mesmo se um canal for classificado como `CONFIDENTIAL`,
mensagens para destinatarios externos nesse canal sao tratadas como `PUBLIC`.

## Estados dos canais

Os canais passam por estados definidos:

- **UNTRUSTED** -- Canais novos ou desconhecidos comecam aqui. Nenhum dado flui
  de entrada ou saida. O canal fica completamente isolado ate voce classifica-lo.
- **CLASSIFIED** -- O canal tem um nivel de classificacao atribuido e esta ativo.
  As mensagens fluem de acordo com as regras de politica.
- **BLOCKED** -- O canal foi desabilitado explicitamente. Nenhuma mensagem e
  processada.

::: warning Canais UNTRUSTED Um canal `UNTRUSTED` nao pode receber nenhum dado
do agente e nao pode enviar dados ao contexto do agente. Este e um limite de
seguranca rigido, nao uma sugestao. :::

## Roteador de canais

O roteador de canais gerencia todos os adaptadores registrados e fornece:

- **Registro de adaptadores** -- Registrar e desregistrar adaptadores de canal
  por ID de canal
- **Despacho de mensagens** -- Rotear mensagens de saida para o adaptador correto
- **Retentativa com backoff exponencial** -- Envios falhos sao retentados ate 3
  vezes com atrasos crescentes (1s, 2s, 4s)
- **Operacoes em lote** -- `connectAll()` e `disconnectAll()` para gerenciamento
  do ciclo de vida

```yaml
# O comportamento de retentativa do roteador e configuravel
router:
  maxRetries: 3
  baseDelay: 1000 # milissegundos
```

## Ripple: indicadores de digitacao e presenca

O Triggerfish retransmite indicadores de digitacao e estado de presenca entre
canais que os suportam. Isso se chama **Ripple**.

| Canal    | Indicadores de digitacao | Confirmacoes de leitura |
| -------- | :----------------------: | :---------------------: |
| Telegram |     Envio e recepcao     |           Sim           |
| Signal   |     Envio e recepcao     |           --            |
| Slack    |       Apenas envio       |           --            |
| Discord  |       Apenas envio       |           --            |
| WhatsApp |     Envio e recepcao     |           Sim           |
| WebChat  |     Envio e recepcao     |           Sim           |

Estados de presenca do agente: `idle`, `online`, `away`, `busy`, `processing`,
`speaking`, `error`.

## Divisao de mensagens

As plataformas tem limites de tamanho de mensagem. O Triggerfish divide
automaticamente respostas longas para caber nas restricoes de cada plataforma,
separando por quebras de linha ou espacos para facilitar a leitura:

| Canal    | Tamanho maximo de mensagem |
| -------- | :------------------------: |
| Telegram |     4.096 caracteres       |
| Signal   |     4.000 caracteres       |
| Discord  |     2.000 caracteres       |
| Slack    |    40.000 caracteres       |
| WhatsApp |     4.096 caracteres       |
| WebChat  |        Ilimitado           |

## Proximos passos

Configure os canais que voce usa:

- [CLI](/pt-BR/channels/cli) -- Sempre disponivel, nenhuma configuracao necessaria
- [Telegram](/pt-BR/channels/telegram) -- Crie um bot com o @BotFather
- [Signal](/pt-BR/channels/signal) -- Vincule pelo daemon signal-cli
- [Slack](/pt-BR/channels/slack) -- Crie um app do Slack com Socket Mode
- [Discord](/pt-BR/channels/discord) -- Crie um aplicativo de bot no Discord
- [WhatsApp](/pt-BR/channels/whatsapp) -- Conecte via WhatsApp Business Cloud API
- [WebChat](/pt-BR/channels/webchat) -- Incorpore um widget de chat no seu site
- [E-mail](/pt-BR/channels/email) -- Conecte via IMAP e relay SMTP
