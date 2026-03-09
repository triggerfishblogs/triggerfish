# Canal CLI

A interface de linha de comando e o canal padrao do Triggerfish. Ela esta sempre
disponivel, nao requer configuracao externa e e a forma principal de voce
interagir com seu agente durante o desenvolvimento e uso local.

## Classificacao

O canal CLI tem classificacao `INTERNAL` por padrao. O usuario do terminal e
**sempre** tratado como o proprietario -- nao ha fluxo de pareamento ou
autenticacao porque voce esta executando o processo diretamente na sua maquina.

::: info Por que INTERNAL? O CLI e uma interface direta e local. Apenas alguem
com acesso ao seu terminal pode usa-lo. Isso torna `INTERNAL` o padrao
apropriado -- seu agente pode compartilhar dados internos livremente nesse
contexto. :::

## Recursos

### Entrada de terminal em modo raw

O CLI usa o modo raw de terminal com parsing completo de sequencias de escape
ANSI. Isso proporciona uma experiencia de edicao rica diretamente no seu
terminal:

- **Edicao de linha** -- Navegue com as setas, Home/End, apague palavras com
  Ctrl+W
- **Historico de entrada** -- Pressione Cima/Baixo para percorrer entradas
  anteriores
- **Sugestoes** -- Autocompletar com Tab para comandos comuns
- **Entrada multilinhas** -- Digite prompts mais longos naturalmente

### Exibicao compacta de ferramentas

Quando o agente chama ferramentas, o CLI mostra um resumo compacto de uma linha
por padrao:

```
tool_name arg  result
```

Alterne entre a exibicao compacta e expandida de ferramentas com **Ctrl+O**.

### Interromper operacoes em andamento

Pressione **ESC** para interromper a operacao atual. Isso envia um sinal de
cancelamento pelo orquestrador ate o provedor de LLM, parando a geracao
imediatamente. Voce nao precisa esperar uma resposta longa terminar.

### Exibicao de taint

Voce pode exibir opcionalmente o nivel de taint da sessao atual na saida
habilitando `showTaint` na configuracao do canal CLI. Isso adiciona o nivel de
classificacao antes de cada resposta:

```
[CONFIDENTIAL] Aqui estao seus numeros do pipeline do Q4...
```

### Barra de progresso do tamanho de contexto

O CLI exibe uma barra de uso da janela de contexto em tempo real na linha
separadora na parte inferior do terminal:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- A barra preenche conforme tokens de contexto sao consumidos
- Um marcador azul aparece no limite de 70% (onde a compactacao automatica e
  acionada)
- A barra fica vermelha ao se aproximar do limite
- Apos a compactacao (`/compact` ou automatica), a barra e reiniciada

### Status do servidor MCP

O separador tambem mostra o status de conexao dos servidores MCP:

| Exibicao           | Significado                                    |
| ------------------ | ---------------------------------------------- |
| `MCP 3/3` (verde)  | Todos os servidores configurados conectados    |
| `MCP 2/3` (amarelo) | Alguns servidores ainda conectando ou falharam |
| `MCP 0/3` (vermelho) | Nenhum servidor conectado                    |

Os servidores MCP conectam de forma lazy em segundo plano apos a inicializacao.
O status atualiza em tempo real conforme os servidores ficam online.

## Historico de entrada

Seu historico de entrada e preservado entre sessoes em:

```
~/.triggerfish/data/input_history.json
```

O historico e carregado na inicializacao e salvo apos cada entrada. Voce pode
limpa-lo excluindo o arquivo.

## Entrada sem TTY / canalizada

Quando stdin nao e um TTY (por exemplo, ao canalizar entrada de outro processo),
o CLI muda automaticamente para o **modo com buffer de linha**. Nesse modo:

- Os recursos de terminal raw (setas, navegacao do historico) sao desabilitados
- A entrada e lida linha por linha do stdin
- A saida e escrita no stdout sem formatacao ANSI

Isso permite que voce automatize interacoes com seu agente:

```bash
echo "What is the weather today?" | triggerfish run
```

## Configuracao

O canal CLI requer configuracao minima. Ele e criado automaticamente quando voce
executa `triggerfish run` ou usa o REPL interativo.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Opcao         | Tipo    | Padrao  | Descricao                                       |
| ------------- | ------- | ------- | ----------------------------------------------- |
| `interactive` | boolean | `true`  | Habilitar modo REPL interativo                  |
| `showTaint`   | boolean | `false` | Exibir nivel de taint da sessao na saida        |

::: tip Nenhuma configuracao necessaria O canal CLI funciona imediatamente. Voce
nao precisa configurar nada para comecar a usar o Triggerfish pelo seu
terminal. :::

## Atalhos de teclado

| Atalho       | Acao                                                          |
| ------------ | ------------------------------------------------------------- |
| Enter        | Enviar mensagem                                               |
| Cima/Baixo   | Navegar historico de entrada                                  |
| Ctrl+V       | Colar imagem da area de transferencia (enviada como conteudo multimodal) |
| Ctrl+O       | Alternar exibicao compacta/expandida de ferramentas           |
| ESC          | Interromper operacao atual                                    |
| Ctrl+C       | Sair do CLI                                                   |
| Ctrl+W       | Apagar palavra anterior                                       |
| Home/End     | Ir para inicio/fim da linha                                   |
