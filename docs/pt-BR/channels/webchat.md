# WebChat

O canal WebChat fornece um widget de chat integrado e incorporavel que se conecta
ao seu agente do Triggerfish via WebSocket. Ele e projetado para interacoes
voltadas ao cliente, widgets de suporte ou qualquer cenario onde voce queira
oferecer uma experiencia de chat baseada na web.

## Classificacao padrao

O WebChat tem classificacao `PUBLIC` por padrao. Esse e um padrao rigido por um
motivo: **visitantes da web nunca sao tratados como proprietario**. Cada
mensagem de uma sessao WebChat carrega taint `PUBLIC` independentemente da
configuracao.

::: warning Visitantes nunca sao proprietario Diferente de outros canais onde a
identidade do proprietario e verificada por ID de usuario ou numero de telefone,
o WebChat define `isOwner: false` para todas as conexoes. Isso significa que o
agente nunca executara comandos de nivel de proprietario em uma sessao WebChat.
Essa e uma decisao de seguranca deliberada -- voce nao pode verificar a
identidade de um visitante web anonimo. :::

## Configuracao

### Passo 1: Configurar o Triggerfish

Adicione o canal WebChat ao seu `triggerfish.yaml`:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://seu-site.com"
```

| Opcao            | Tipo     | Obrigatorio | Descricao                                          |
| ---------------- | -------- | ----------- | -------------------------------------------------- |
| `port`           | number   | Nao         | Porta do servidor WebSocket (padrao: `8765`)       |
| `classification` | string   | Nao         | Nivel de classificacao (padrao: `PUBLIC`)           |
| `allowedOrigins` | string[] | Nao         | Origens CORS permitidas (padrao: `["*"]`)          |

### Passo 2: Iniciar o Triggerfish

```bash
triggerfish stop && triggerfish start
```

O servidor WebSocket comeca a escutar na porta configurada.

### Passo 3: Conectar um widget de chat

Conecte-se ao endpoint WebSocket a partir da sua aplicacao web:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // O servidor atribuiu um ID de sessao
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Resposta do agente
    console.log("Agent:", frame.content);
  }
};

// Enviar uma mensagem
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## Como funciona

### Fluxo de conexao

1. Um cliente de navegador abre uma conexao WebSocket na porta configurada
2. O Triggerfish faz upgrade da requisicao HTTP para WebSocket
3. Um ID de sessao unico e gerado (`webchat-<uuid>`)
4. O servidor envia o ID de sessao ao cliente em um frame `session`
5. O cliente envia e recebe frames `message` como JSON

### Formato do frame de mensagem

Todas as mensagens sao objetos JSON com esta estrutura:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Tipos de frame:

| Tipo      | Direcao              | Descricao                                               |
| --------- | -------------------- | ------------------------------------------------------- |
| `session` | Servidor para cliente | Enviado ao conectar com o ID de sessao atribuido        |
| `message` | Ambas                | Mensagem de chat com conteudo de texto                  |
| `ping`    | Ambas                | Ping de keep-alive                                      |
| `pong`    | Ambas                | Resposta de keep-alive                                  |

### Gerenciamento de sessoes

Cada conexao WebSocket recebe sua propria sessao. Quando a conexao e fechada, a
sessao e removida do mapa de conexoes ativas. Nao ha retomada de sessao -- se a
conexao cair, um novo ID de sessao e atribuido ao reconectar.

## Verificacao de saude

O servidor WebSocket tambem responde a requisicoes HTTP regulares com uma
verificacao de saude:

```bash
curl http://localhost:8765
# Resposta: "WebChat OK"
```

Isso e util para verificacoes de saude de balanceadores de carga e monitoramento.

## Indicadores de digitacao

O Triggerfish envia e recebe indicadores de digitacao pelo WebChat. Quando o
agente esta processando, um frame de indicador de digitacao e enviado ao cliente.
O widget pode exibi-lo para mostrar que o agente esta pensando.

## Consideracoes de seguranca

- **Todos os visitantes sao externos** -- `isOwner` e sempre `false`. O agente
  nao executara comandos de proprietario pelo WebChat.
- **Taint PUBLIC** -- Cada mensagem tem taint `PUBLIC` no nivel da sessao. O
  agente nao pode acessar nem retornar dados acima da classificacao `PUBLIC` em
  uma sessao WebChat.
- **CORS** -- Configure `allowedOrigins` para restringir quais dominios podem
  conectar. O padrao `["*"]` permite qualquer origem, o que e apropriado para
  desenvolvimento mas deve ser restrito em producao.

::: tip Restrinja origens em producao Para implantacoes em producao, sempre
especifique suas origens permitidas explicitamente:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://seu-dominio.com"
      - "https://app.seu-dominio.com"
```

:::

## Alterar a classificacao

Embora o WebChat tenha `PUBLIC` como padrao, tecnicamente voce pode defini-lo
para um nivel diferente. No entanto, como `isOwner` e sempre `false`, a
classificacao efetiva para todas as mensagens permanece `PUBLIC` devido a regra
de classificacao efetiva (`min(canal, destinatario)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Permitido, mas isOwner continua false
```

Niveis validos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
