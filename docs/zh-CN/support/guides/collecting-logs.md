# 收集日志

提交 Bug 报告时，日志包为维护者提供诊断问题所需的信息，无需反复询问细节。

## 快速打包

创建日志包的最快方式：

```bash
triggerfish logs bundle
```

这会创建一个包含 `~/.triggerfish/logs/` 中所有日志文件的归档：

- **Linux/macOS：** `triggerfish-logs.tar.gz`
- **Windows：** `triggerfish-logs.zip`

如果归档因任何原因失败，会回退到将原始日志文件复制到一个目录中，供您手动压缩。

## 打包内容

- `triggerfish.log`（当前日志文件）
- `triggerfish.1.log` 到 `triggerfish.10.log`（轮转备份，如果存在）

打包**不**包含：
- 您的 `triggerfish.yaml` 配置文件
- 密钥或凭证
- SQLite 数据库
- SPINE.md 或 TRIGGER.md

## 手动收集日志

如果打包命令不可用（旧版本、Docker 等）：

```bash
# 查找日志文件
ls ~/.triggerfish/logs/

# 手动创建归档
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## 增加日志详细程度

默认情况下，日志级别为 INFO。要为 Bug 报告捕获更多细节：

1. 将日志级别设置为 verbose 或 debug：
   ```bash
   triggerfish config set logging.level verbose
   # 或获取最大详细程度：
   triggerfish config set logging.level debug
   ```

2. 复现问题

3. 收集打包：
   ```bash
   triggerfish logs bundle
   ```

4. 将级别恢复为正常：
   ```bash
   triggerfish config set logging.level normal
   ```

### 日志级别详情

| 级别 | 捕获内容 |
|------|----------|
| `quiet` | 仅错误 |
| `normal` | 错误、警告、信息（默认） |
| `verbose` | 添加调试信息（工具调用、提供商交互、分类决策） |
| `debug` | 所有内容，包括跟踪级别消息（原始协议数据、内部状态变化） |

**警告：** `debug` 级别会生成大量输出。仅在主动复现问题时使用，然后切换回正常级别。

## 实时过滤日志

在复现问题时，您可以过滤实时日志流：

```bash
# 仅显示错误
triggerfish logs --level ERROR

# 显示警告及以上
triggerfish logs --level WARN
```

在 Linux/macOS 上，使用带过滤的原生 `tail -f`。在 Windows 上，使用 PowerShell 的 `Get-Content -Wait -Tail`。

## 日志格式

每行日志遵循以下格式：

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **时间戳：** ISO 8601 UTC 格式
- **级别：** ERROR、WARN、INFO、DEBUG 或 TRACE
- **组件：** 生成日志的模块（如 `gateway`、`anthropic`、`telegram`、`policy`）
- **消息：** 带结构化上下文的日志消息

## Bug 报告中应包含的内容

除日志包外，还应包含：

1. **复现步骤。** 问题发生时您在做什么？
2. **预期行为。** 应该发生什么？
3. **实际行为。** 实际发生了什么？
4. **平台信息。** 操作系统、架构、Triggerfish 版本（`triggerfish version`）
5. **配置摘录。** `triggerfish.yaml` 的相关部分（脱敏处理）

有关完整检查清单，请参阅[提交 Issue](/zh-CN/support/guides/filing-issues)。

## 日志中的敏感信息

Triggerfish 通过将值包裹在 `<<` 和 `>>` 分隔符中来清理日志中的外部数据。API 密钥和 Token 不应出现在日志输出中。但是，在提交日志包之前：

1. 扫描任何您不想分享的内容（电子邮件地址、文件路径、消息内容）
2. 必要时进行脱敏
3. 在 Issue 中注明日志包已脱敏

日志文件包含您对话中的消息内容。如果您的对话包含敏感信息，请在分享前脱敏这些部分。
