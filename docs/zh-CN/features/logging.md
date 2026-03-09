# 结构化日志

Triggerfish 使用结构化日志，具有严重级别、文件轮转和可配置输出。每个组件——Gateway、编排器、MCP 客户端、LLM 提供商、策略引擎——都通过统一的日志记录器记录。这意味着无论事件来自哪里，你都能获得单一、一致的日志流。

## 日志级别

`logging.level` 设置控制捕获多少细节：

| 配置值 | 严重级别 | 记录内容 |
| ------------------ | ------------------ | ----------------------------------------------------- |
| `quiet` | 仅 ERROR | 崩溃和关键故障 |
| `normal`（默认） | INFO 及以上 | 启动、连接、重要事件 |
| `verbose` | DEBUG 及以上 | 工具调用、策略决策、提供商请求 |
| `debug` | TRACE（所有） | 完整请求/响应负载、令牌级流式传输 |

每个级别包含其上方的所有内容。设置 `verbose` 会得到 DEBUG、INFO 和 ERROR。设置 `quiet` 会静默除错误之外的所有内容。

## 配置

在 `triggerfish.yaml` 中设置日志级别：

```yaml
logging:
  level: normal
```

这是唯一必需的配置。默认值对大多数用户来说是合理的——`normal` 捕获足够的信息来理解智能体在做什么，而不会用噪声淹没日志。

## 日志输出

日志同时写入两个目标：

- **stderr** —— 作为 systemd 服务运行时供 `journalctl` 捕获，或开发期间的直接终端输出
- **文件** —— `~/.triggerfish/logs/triggerfish.log`

每行日志遵循结构化格式：

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### 组件标签

方括号中的标签标识发出日志条目的子系统：

| 标签 | 组件 |
| ------------- | ---------------------------------------- |
| `[gateway]` | WebSocket 控制平面 |
| `[orch]` | 智能体编排器和工具分发 |
| `[mcp]` | MCP 客户端和 Gateway 代理 |
| `[provider]` | LLM 提供商调用 |
| `[policy]` | 策略引擎和 hook 评估 |
| `[session]` | 会话生命周期和 taint 变更 |
| `[channel]` | 渠道适配器（Telegram、Slack 等） |
| `[scheduler]` | 定时任务、触发器、webhook |
| `[memory]` | 记忆存储操作 |
| `[browser]` | 浏览器自动化（CDP） |

## 文件轮转

日志文件自动轮转以防止无限制的磁盘使用：

- **轮转阈值：** 每个文件 1 MB
- **保留文件：** 10 个轮转文件（最大约 10 MB）
- **轮转检查：** 每次写入时
- **命名：** `triggerfish.1.log`、`triggerfish.2.log`、...、`triggerfish.10.log`

## 日志读取工具

`log_read` 工具让智能体直接访问结构化日志历史。智能体可以读取最近的日志条目，按组件标签或严重级别过滤，并在不离开对话的情况下诊断问题。

| 参数 | 类型 | 必需 | 描述 |
| ---------- | ------ | -------- | ------------------------------------------------------------- |
| `lines` | number | 否 | 返回的最近日志行数（默认：100） |
| `level` | string | 否 | 最低严重级别过滤（`error`、`warn`、`info`、`debug`） |
| `component`| string | 否 | 按组件标签过滤（例如 `gateway`、`orch`、`provider`） |

::: tip 问你的智能体"今天发生了什么错误"或"显示最近的 Gateway 日志"——`log_read` 工具处理过滤和检索。 :::

## 查看日志

### CLI 命令

```bash
# 查看最近的日志
triggerfish logs

# 实时流式传输
triggerfish logs --tail

# 直接文件访问
cat ~/.triggerfish/logs/triggerfish.log
```

### 使用 journalctl

当 Triggerfish 作为 systemd 服务运行时，日志也会被 journal 捕获：

```bash
journalctl --user -u triggerfish -f
```

## 相关

- [CLI 命令](/zh-CN/guide/commands) —— `triggerfish logs` 命令参考
- [配置](/zh-CN/guide/configuration) —— 完整的 `triggerfish.yaml` 模式
