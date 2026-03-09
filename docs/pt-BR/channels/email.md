# E-mail

Conecte seu agente do Triggerfish ao e-mail para que ele possa receber mensagens
via IMAP e enviar respostas por meio de um servico de relay SMTP. O adaptador
suporta servicos como SendGrid, Mailgun e Amazon SES para e-mail de saida, e
consulta qualquer servidor IMAP para mensagens de entrada.

## Classificacao padrao

O e-mail tem classificacao `CONFIDENTIAL` por padrao. E-mails frequentemente
contem conteudo sensivel (contratos, notificacoes de contas, correspondencia
pessoal), entao `CONFIDENTIAL` e o padrao seguro.

## Configuracao

### Passo 1: Escolher um relay SMTP

O Triggerfish envia e-mail de saida por meio de uma API HTTP de relay SMTP. Os
servicos suportados incluem:

| Servico    | Endpoint da API                                                  |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/SEU_DOMINIO/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Cadastre-se em um desses servicos e obtenha uma API key.

### Passo 2: Configurar IMAP para recepcao

Voce precisa de credenciais IMAP para receber e-mail. A maioria dos provedores
de e-mail suporta IMAP:

| Provedor | Host IMAP                 | Porta |
| -------- | ------------------------- | ----- |
| Gmail    | `imap.gmail.com`          | 993   |
| Outlook  | `outlook.office365.com`   | 993   |
| Fastmail | `imap.fastmail.com`       | 993   |
| Outro    | Seu servidor de e-mail    | 993   |

::: info Senhas de app do Gmail Se voce usa o Gmail com autenticacao de 2
fatores, precisara gerar uma
[Senha de app](https://myaccount.google.com/apppasswords) para acesso IMAP. Sua
senha normal do Gmail nao funcionara. :::

### Passo 3: Configurar o Triggerfish

Adicione o canal de e-mail ao seu `triggerfish.yaml`:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "voce@gmail.com"
    fromAddress: "triggerfish@seudominio.com"
    ownerEmail: "voce@gmail.com"
```

Os segredos (API key do SMTP, senha do IMAP) sao inseridos durante
`triggerfish config add-channel email` e armazenados no chaveiro do SO.

| Opcao            | Tipo   | Obrigatorio | Descricao                                                             |
| ---------------- | ------ | ----------- | --------------------------------------------------------------------- |
| `smtpApiUrl`     | string | Sim         | URL do endpoint da API de relay SMTP                                  |
| `imapHost`       | string | Sim         | Nome de host do servidor IMAP                                         |
| `imapPort`       | number | Nao         | Porta do servidor IMAP (padrao: `993`)                                |
| `imapUser`       | string | Sim         | Nome de usuario IMAP (geralmente seu endereco de e-mail)              |
| `fromAddress`    | string | Sim         | Endereco de remetente para e-mails de saida                           |
| `pollInterval`   | number | Nao         | Frequencia de verificacao de novos e-mails, em ms (padrao: `30000`)   |
| `classification` | string | Nao         | Nivel de classificacao (padrao: `CONFIDENTIAL`)                       |
| `ownerEmail`     | string | Recomendado | Seu endereco de e-mail para verificacao de proprietario               |

::: warning Credenciais A API key do SMTP e a senha do IMAP sao armazenadas no
chaveiro do SO (Linux: GNOME Keyring, macOS: Keychain Access). Elas nunca
aparecem no `triggerfish.yaml`. :::

### Passo 4: Iniciar o Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envie um e-mail para o endereco configurado para confirmar a conexao.

## Identidade do proprietario

O Triggerfish determina o status de proprietario comparando o endereco de e-mail
do remetente com o `ownerEmail` configurado:

- **Corresponde** -- A mensagem e um comando do proprietario
- **Nao corresponde** -- A mensagem e entrada externa com taint `PUBLIC`

Se nenhum `ownerEmail` for configurado, todas as mensagens sao tratadas como
vindas do proprietario.

## Classificacao baseada em dominio

Para um controle mais granular, o e-mail suporta classificacao de destinatarios
baseada em dominio. Isso e especialmente util em ambientes empresariais:

- E-mails de `@suaempresa.com` podem ser classificados como `INTERNAL`
- E-mails de dominios desconhecidos sao classificados como `EXTERNAL` por padrao
- O administrador pode configurar uma lista de dominios internos

```yaml
channels:
  email:
    # ... outra configuracao
    internalDomains:
      - "suaempresa.com"
      - "subsidiaria.com"
```

Isso significa que o motor de politicas aplica regras diferentes com base na
origem de um e-mail:

| Dominio do remetente            | Classificacao |
| ------------------------------- | :-----------: |
| Dominio interno configurado     |  `INTERNAL`   |
| Dominio desconhecido            |  `EXTERNAL`   |

## Como funciona

### Mensagens de entrada

O adaptador consulta o servidor IMAP no intervalo configurado (padrao: a cada 30
segundos) buscando mensagens novas nao lidas. Quando um novo e-mail chega:

1. O endereco do remetente e extraido
2. O status de proprietario e verificado contra o `ownerEmail`
3. O corpo do e-mail e encaminhado ao handler de mensagens
4. Cada thread de e-mail e mapeada para um ID de sessao com base no endereco do
   remetente (`email-remetente@exemplo.com`)

### Mensagens de saida

Quando o agente responde, o adaptador envia a resposta pela API HTTP do relay
SMTP configurado. A resposta inclui:

- **De** -- O endereco `fromAddress` configurado
- **Para** -- O endereco de e-mail do remetente original
- **Assunto** -- "Triggerfish" (padrao)
- **Corpo** -- A resposta do agente como texto simples

## Intervalo de consulta

O intervalo de consulta padrao e 30 segundos. Voce pode ajusta-lo conforme suas
necessidades:

```yaml
channels:
  email:
    # ... outra configuracao
    pollInterval: 10000 # Verificar a cada 10 segundos
```

::: tip Equilibre responsividade e recursos Um intervalo de consulta mais curto
significa resposta mais rapida ao e-mail de entrada, mas conexoes IMAP mais
frequentes. Para a maioria dos casos de uso pessoal, 30 segundos e um bom
equilibrio. :::

## Alterar a classificacao

```yaml
channels:
  email:
    # ... outra configuracao
    classification: CONFIDENTIAL
```

Niveis validos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
