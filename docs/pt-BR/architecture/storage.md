# Armazenamento

Todos os dados com estado no Triggerfish fluem por uma abstracao unificada
`StorageProvider`. Nenhum modulo cria seu proprio mecanismo de armazenamento --
cada componente que precisa de persistencia recebe um `StorageProvider` como
dependencia. Esse design torna os backends intercambiaveis sem alterar a logica
de negocio e mantem todos os testes rapidos e deterministicos.

## Interface do StorageProvider

```typescript
interface StorageProvider {
  /** Obter um valor por chave. Retorna null se nao encontrado. */
  get(key: string): Promise<StorageValue | null>;

  /** Armazenar um valor em uma chave. Sobrescreve qualquer valor existente. */
  set(key: string, value: StorageValue): Promise<void>;

  /** Excluir uma chave. Nao faz nada se a chave nao existir. */
  delete(key: string): Promise<void>;

  /** Listar todas as chaves que correspondam a um prefixo opcional. */
  list(prefix?: string): Promise<string[]>;

  /** Excluir todas as chaves. Use com cautela. */
  clear(): Promise<void>;
}
```

::: info `StorageValue` e uma string. Todos os dados estruturados (sessoes,
registros de linhagem, configuracao) sao serializados em JSON antes do
armazenamento e desserializados na leitura. Isso mantem a interface simples e
agnostica de backend. :::

## Implementacoes

| Backend                 | Caso de uso                        | Persistencia                                       | Configuracao                       |
| ----------------------- | ---------------------------------- | -------------------------------------------------- | ---------------------------------- |
| `MemoryStorageProvider` | Testes, sessoes efemeras           | Nenhuma (perdida ao reiniciar)                     | Sem configuracao necessaria        |
| `SqliteStorageProvider` | Padrao para nivel pessoal          | SQLite WAL em `~/.triggerfish/data/triggerfish.db`  | Zero configuracao                  |
| Backends empresariais   | Nivel empresarial                  | Gerenciado pelo cliente                            | Postgres, S3 ou outros backends    |

### MemoryStorageProvider

Usado em todos os testes por velocidade e determinismo. Os dados existem apenas
na memoria e sao perdidos ao terminar o processo. Cada suite de testes cria um
`MemoryStorageProvider` novo, garantindo que os testes estejam isolados e sejam
reproduziveis.

### SqliteStorageProvider

O padrao para implantacoes de nivel pessoal. Usa SQLite em modo WAL (Write-Ahead
Logging) para acesso concorrente de leitura e seguranca contra falhas. O banco de
dados fica em:

```
~/.triggerfish/data/triggerfish.db
```

O SQLite nao requer configuracao, nem processo de servidor, nem rede. Um unico
arquivo armazena todo o estado do Triggerfish. O pacote `@db/sqlite` do Deno
fornece a ligacao, que requer a permissao `--allow-ffi`.

::: tip O modo WAL do SQLite permite que multiplos leitores acessem o banco de
dados simultaneamente com um unico escritor. Isso e importante para o Gateway,
que pode ler o estado da sessao enquanto o agente esta escrevendo resultados de
ferramentas. :::

### Backends empresariais

Implantacoes empresariais podem conectar backends de armazenamento externos
(Postgres, S3, etc.) sem alteracoes de codigo. Qualquer implementacao da
interface `StorageProvider` funciona. O backend e configurado no
`triggerfish.yaml`.

## Chaves com namespace

Todas as chaves no sistema de armazenamento possuem um namespace com um prefixo
que identifica o tipo de dado. Isso evita colisoes e permite consultar, reter e
purgar dados por categoria.

| Namespace        | Padrao de chave                              | Descricao                                              |
| ---------------- | -------------------------------------------- | ------------------------------------------------------ |
| `sessions:`      | `sessions:sess_abc123`                       | Estado da sessao (historico de conversa, metadados)     |
| `taint:`         | `taint:sess_abc123`                          | Nivel de taint da sessao                               |
| `lineage:`       | `lineage:lin_789xyz`                         | Registros de linhagem de dados (rastreamento de procedencia) |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Entradas do registro de auditoria                      |
| `cron:`          | `cron:job_daily_report`                      | Estado e historico de execucao de jobs cron             |
| `notifications:` | `notifications:notif_456`                    | Fila de notificacoes                                   |
| `exec:`          | `exec:run_789`                               | Historico do ambiente de execucao do agente             |
| `skills:`        | `skills:skill_weather`                       | Metadados de skills instalados                         |
| `config:`        | `config:v3`                                  | Snapshots de configuracao                              |

## Politicas de retencao

Cada namespace tem uma politica de retencao padrao. Implantacoes empresariais
podem personaliza-las.

| Namespace        | Retencao padrao               | Justificativa                                          |
| ---------------- | ----------------------------- | ------------------------------------------------------ |
| `sessions:`      | 30 dias                       | O historico de conversa expira                         |
| `taint:`         | Igual a retencao da sessao    | O taint nao faz sentido sem sua sessao                 |
| `lineage:`       | 90 dias                       | Orientado a conformidade, trilha de auditoria          |
| `audit:`         | 1 ano                         | Orientado a conformidade, legal e regulatorio          |
| `cron:`          | 30 dias                       | Historico de execucao para depuracao                   |
| `notifications:` | Ate entrega + 7 dias          | Notificacoes nao entregues devem persistir             |
| `exec:`          | 30 dias                       | Artefatos de execucao para depuracao                   |
| `skills:`        | Permanente                    | Metadados de skills instalados nao devem expirar       |
| `config:`        | 10 versoes                    | Historico rotativo de configuracao para rollback        |

## Principios de design

### Todos os modulos usam StorageProvider

Nenhum modulo no Triggerfish cria seu proprio mecanismo de armazenamento. Gerenciamento
de sessoes, rastreamento de taint, registro de linhagem, registro de auditoria,
estado de cron, filas de notificacoes, historico de execucao e configuracao --
tudo flui pelo `StorageProvider`.

Isso significa:

- Trocar backends requer alterar um unico ponto de injecao de dependencias
- Os testes usam `MemoryStorageProvider` por velocidade -- sem configuracao de SQLite, sem sistema de arquivos
- Ha exatamente um lugar para implementar criptografia em repouso, backup ou
  replicacao

### Serializacao

Todos os dados estruturados sao serializados em strings JSON antes do
armazenamento. A camada de serializacao/desserializacao lida com:

- Objetos `Date` (serializados como strings ISO 8601 via `toISOString()`,
  desserializados via `new Date()`)
- Tipos branded (serializados como seu valor string subjacente)
- Objetos e arrays aninhados

```typescript
// Armazenando uma sessao
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// Obtendo uma sessao
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Restaurar Date
}
```

### Imutabilidade

As operacoes de sessao sao imutaveis. Ler uma sessao, modifica-la e escreve-la
de volta sempre produz um novo objeto. As funcoes nunca alteram o objeto
armazenado diretamente. Isso se alinha com o principio geral do Triggerfish de
que as funcoes retornam novos objetos e nunca realizam mutacao.

## Estrutura de diretorios

```
~/.triggerfish/
  config/          # Configuracao do agente, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Ambiente de execucao do agente
    <agent-id>/    # Workspace por agente (persiste)
    background/    # Workspaces de sessoes em segundo plano
  skills/          # Skills instalados
  logs/            # Registros de auditoria
  secrets/         # Armazenamento de credenciais criptografadas
```

::: warning SEGURANCA O diretorio `secrets/` contem credenciais criptografadas
gerenciadas pela integracao com o chaveiro do SO. Nunca armazene segredos em
arquivos de configuracao ou no `StorageProvider`. Use o chaveiro do SO (nivel
pessoal) ou a integracao com vault (nivel empresarial). :::
