# 存储

Triggerfish 中的所有有状态数据都通过统一的 `StorageProvider` 抽象流转。没有模块自行创建存储机制——每个需要持久化的组件都将 `StorageProvider` 作为依赖。这种设计使后端可以在不修改业务逻辑的情况下进行替换，并保持所有测试快速且确定性。

## StorageProvider 接口

```typescript
interface StorageProvider {
  /** 按键检索值。未找到则返回 null。 */
  get(key: string): Promise<StorageValue | null>;

  /** 在键上存储值。覆盖任何现有值。 */
  set(key: string, value: StorageValue): Promise<void>;

  /** 删除键。键不存在时无操作。 */
  delete(key: string): Promise<void>;

  /** 列出匹配可选前缀的所有键。 */
  list(prefix?: string): Promise<string[]>;

  /** 删除所有键。谨慎使用。 */
  clear(): Promise<void>;
}
```

::: info `StorageValue` 是字符串。所有结构化数据（会话、溯源记录、配置）在存储前序列化为 JSON，读取时反序列化。这保持接口简单且后端无关。 :::

## 实现

| 后端 | 使用场景 | 持久化 | 配置 |
| ----------------------- | --------------------------- | -------------------------------------------------- | ------------------------------- |
| `MemoryStorageProvider` | 测试、临时会话 | 无（重启后丢失） | 无需配置 |
| `SqliteStorageProvider` | 个人版默认 | `~/.triggerfish/data/triggerfish.db` 的 SQLite WAL | 零配置 |
| 企业后端 | 企业版 | 客户管理 | Postgres、S3 或其他后端 |

### MemoryStorageProvider

在所有测试中使用，以获得速度和确定性。数据仅存在于内存中，进程退出时丢失。每个测试套件创建一个全新的 `MemoryStorageProvider`，确保测试隔离和可重复。

### SqliteStorageProvider

个人版部署的默认选择。使用 SQLite WAL（预写日志）模式实现并发读取访问和崩溃安全。数据库位于：

```
~/.triggerfish/data/triggerfish.db
```

SQLite 不需要配置、不需要服务器进程、不需要网络。单个文件存储所有 Triggerfish 状态。`@db/sqlite` Deno 包提供绑定，需要 `--allow-ffi` 权限。

::: tip SQLite WAL 模式允许多个读取器与单个写入器并发访问数据库。这对 Gateway 很重要，因为它可能在智能体写入工具结果时读取会话状态。 :::

### 企业后端

企业部署可以无需代码更改地接入外部存储后端（Postgres、S3 等）。`StorageProvider` 接口的任何实现都可以工作。后端在 `triggerfish.yaml` 中配置。

## 命名空间键

存储系统中的所有键都带有标识数据类型的前缀命名空间。这防止冲突，并使按类别查询、保留和清除数据成为可能。

| 命名空间 | 键模式 | 描述 |
| ---------------- | -------------------------------------------- | ---------------------------------------------- |
| `sessions:` | `sessions:sess_abc123` | 会话状态（对话历史、元数据） |
| `taint:` | `taint:sess_abc123` | 会话 taint 级别 |
| `lineage:` | `lineage:lin_789xyz` | 数据溯源记录（出处跟踪） |
| `audit:` | `audit:2025-01-29T10:23:45Z:hook_pre_output` | 审计日志条目 |
| `cron:` | `cron:job_daily_report` | 定时任务状态和执行历史 |
| `notifications:` | `notifications:notif_456` | 通知队列 |
| `exec:` | `exec:run_789` | 智能体执行环境历史 |
| `skills:` | `skills:skill_weather` | 已安装技能元数据 |
| `config:` | `config:v3` | 配置快照 |

## 保留策略

每个命名空间都有默认保留策略。企业部署可以自定义这些策略。

| 命名空间 | 默认保留 | 原因 |
| ---------------- | ------------------------- | ------------------------------------------ |
| `sessions:` | 30 天 | 对话历史老化 |
| `taint:` | 与会话保留匹配 | 没有会话的 taint 没有意义 |
| `lineage:` | 90 天 | 合规驱动，审计跟踪 |
| `audit:` | 1 年 | 合规驱动，法律和监管 |
| `cron:` | 30 天 | 调试的执行历史 |
| `notifications:` | 投递后 + 7 天 | 未投递的通知必须持久化 |
| `exec:` | 30 天 | 调试的执行产物 |
| `skills:` | 永久 | 已安装技能元数据不应过期 |
| `config:` | 10 个版本 | 用于回滚的滚动配置历史 |

## 设计原则

### 所有模块使用 StorageProvider

Triggerfish 中没有模块自行创建存储机制。会话管理、taint 跟踪、溯源记录、审计日志、定时任务状态、通知队列、执行历史和配置——全部通过 `StorageProvider` 流转。

这意味着：

- 更换后端只需要更改一个依赖注入点
- 测试使用 `MemoryStorageProvider` 以获得速度——无需 SQLite 设置，无需文件系统
- 实现静态加密、备份或复制只有一个位置

### 序列化

所有结构化数据在存储前序列化为 JSON 字符串。序列化/反序列化层处理：

- `Date` 对象（通过 `toISOString()` 序列化为 ISO 8601 字符串，通过 `new Date()` 反序列化）
- 品牌类型（序列化为其底层字符串值）
- 嵌套对象和数组

```typescript
// 存储会话
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// 检索会话
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // 恢复 Date
}
```

### 不可变性

会话操作是不可变的。读取会话、修改它并写回始终产生新对象。函数永远不会就地修改存储的对象。这与 Triggerfish 更广泛的原则一致：函数返回新对象，永不改变原对象。

## 目录结构

```
~/.triggerfish/
  config/          # 智能体配置、SPINE.md、TRIGGER.md
  data/            # triggerfish.db（SQLite）
  workspace/       # 智能体执行环境
    <agent-id>/    # 按智能体的工作区（持久化）
    background/    # 后台会话工作区
  skills/          # 已安装技能
  logs/            # 审计日志
  secrets/         # 加密凭证存储
```

::: warning 安全 `secrets/` 目录包含由操作系统钥匙串集成管理的加密凭证。永远不要在配置文件或 `StorageProvider` 中存储密钥。使用操作系统钥匙串（个人版）或保管库集成（企业版）。 :::
