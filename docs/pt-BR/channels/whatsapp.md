# WhatsApp

Conecte seu agente do Triggerfish ao WhatsApp para poder interagir com ele pelo
seu celular. O adaptador usa a **WhatsApp Business Cloud API** (a API HTTP
oficial hospedada pela Meta), recebendo mensagens via webhook e enviando via
REST.

## Classificacao padrao

O WhatsApp tem classificacao `PUBLIC` por padrao. Os contatos do WhatsApp podem
incluir qualquer pessoa com seu numero de telefone, entao `PUBLIC` e o padrao
seguro.

## Configuracao

### Passo 1: Criar uma conta Meta Business

1. Va ao portal [Meta for Developers](https://developers.facebook.com/)
2. Crie uma conta de desenvolvedor se ainda nao tiver uma
3. Crie um novo app e selecione **Business** como tipo de app
4. No painel do app, adicione o produto **WhatsApp**

### Passo 2: Obter suas credenciais

Na secao do WhatsApp no painel do app, colete estes valores:

- **Access Token** -- Um token de acesso permanente (ou gere um temporario para
  testes)
- **Phone Number ID** -- O ID do numero de telefone registrado no WhatsApp
  Business
- **Verify Token** -- Uma string que voce escolhe, usada para verificar o
  registro do webhook

### Passo 3: Configurar webhooks

1. Nas configuracoes do produto WhatsApp, navegue ate **Webhooks**
2. Defina a URL de callback para o endereco publico do seu servidor (ex.:
   `https://seu-servidor.com:8443/webhook`)
3. Defina o **Verify Token** com o mesmo valor que usara na configuracao do
   Triggerfish
4. Inscreva-se no campo de webhook `messages`

::: info URL publica necessaria Os webhooks do WhatsApp requerem um endpoint
HTTPS acessivel publicamente. Se voce esta rodando o Triggerfish localmente,
precisara de um servico de tunel (ex.: ngrok, Cloudflare Tunnel) ou um servidor
com IP publico. :::

### Passo 4: Configurar o Triggerfish

Adicione o canal do WhatsApp ao seu `triggerfish.yaml`:

```yaml
channels:
  whatsapp:
    # accessToken armazenado no chaveiro do SO
    phoneNumberId: "seu-phone-number-id"
    # verifyToken armazenado no chaveiro do SO
    ownerPhone: "15551234567"
```

| Opcao            | Tipo   | Obrigatorio | Descricao                                                                    |
| ---------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `accessToken`    | string | Sim         | Token de acesso da API do WhatsApp Business                                  |
| `phoneNumberId`  | string | Sim         | Phone Number ID do Painel do Meta Business                                   |
| `verifyToken`    | string | Sim         | Token para verificacao de webhook (voce escolhe)                             |
| `webhookPort`    | number | Nao         | Porta para escutar webhooks (padrao: `8443`)                                 |
| `ownerPhone`     | string | Recomendado | Seu numero de telefone para verificacao de proprietario (ex.: `"15551234567"`) |
| `classification` | string | Nao         | Nivel de classificacao (padrao: `PUBLIC`)                                    |

::: warning Armazene segredos com seguranca Nunca inclua tokens de acesso no
controle de versao. Use variaveis de ambiente ou o chaveiro do SO. :::

### Passo 5: Iniciar o Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envie uma mensagem do seu celular para o numero do WhatsApp Business para
confirmar a conexao.

## Identidade do proprietario

O Triggerfish determina o status de proprietario comparando o numero de telefone
do remetente com o `ownerPhone` configurado. Essa verificacao ocorre em codigo
antes de o LLM ver a mensagem:

- **Corresponde** -- A mensagem e um comando do proprietario
- **Nao corresponde** -- A mensagem e entrada externa com taint `PUBLIC`

Se nenhum `ownerPhone` for configurado, todas as mensagens sao tratadas como
vindas do proprietario.

::: tip Sempre configure o telefone do proprietario Se outras pessoas podem enviar
mensagens para seu numero do WhatsApp Business, sempre configure o `ownerPhone`
para evitar execucao nao autorizada de comandos. :::

## Como o webhook funciona

O adaptador inicia um servidor HTTP na porta configurada (padrao `8443`) que
trata dois tipos de requisicoes:

1. **GET /webhook** -- A Meta envia isso para verificar seu endpoint de webhook.
   O Triggerfish responde com o token de desafio se o token de verificacao
   corresponder.
2. **POST /webhook** -- A Meta envia mensagens de entrada aqui. O Triggerfish
   faz parsing do payload do webhook da Cloud API, extrai mensagens de texto e as
   encaminha ao handler de mensagens.

## Limites de mensagem

O WhatsApp suporta mensagens de ate 4.096 caracteres. Mensagens que excedam esse
limite sao divididas em multiplas mensagens antes do envio.

## Indicadores de digitacao

O Triggerfish envia e recebe indicadores de digitacao no WhatsApp. Quando seu
agente esta processando uma solicitacao, o chat mostra um indicador de digitacao.
Confirmacoes de leitura tambem sao suportadas.

## Alterar a classificacao

```yaml
channels:
  whatsapp:
    # accessToken armazenado no chaveiro do SO
    phoneNumberId: "seu-phone-number-id"
    # verifyToken armazenado no chaveiro do SO
    classification: INTERNAL
```

Niveis validos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
