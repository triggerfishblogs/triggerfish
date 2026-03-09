# 故障排除：守护进程

## 守护进程无法启动

### "Triggerfish is already running"

当日志文件被其他进程锁定时，会出现此消息。在 Windows 上，这是通过文件写入器尝试打开日志文件时的 `EBUSY` / "os error 32" 来检测的。

**修复方法：**

```bash
triggerfish status    # 检查是否确实有正在运行的实例
triggerfish stop      # 停止现有实例
triggerfish start     # 重新启动
```

如果 `triggerfish status` 报告守护进程未运行但仍然出现此错误，说明有其他进程占用了日志文件。检查僵尸进程：

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

终止所有过期进程，然后重试。

### 端口 18789 或 18790 已被占用

Gateway 监听端口 18789（WebSocket），Tidepool 监听端口 18790（A2UI）。如果其他应用程序占用了这些端口，守护进程将无法启动。

**查找占用端口的进程：**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### 未配置 LLM 提供商

如果 `triggerfish.yaml` 缺少 `models` 部分或主要提供商没有 API 密钥，Gateway 会记录：

```
No LLM provider configured. Check triggerfish.yaml.
```

**修复方法：** 运行安装向导或手动配置：

```bash
triggerfish dive                    # 交互式设置
# 或
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### 配置文件未找到

如果 `triggerfish.yaml` 在预期路径不存在，守护进程将退出。错误消息因环境而异：

- **本机安装：** 建议运行 `triggerfish dive`
- **Docker：** 建议使用 `-v ./triggerfish.yaml:/data/triggerfish.yaml` 挂载配置文件

检查路径：

```bash
ls ~/.triggerfish/triggerfish.yaml      # 本机安装
docker exec triggerfish ls /data/       # Docker
```

### 密钥解析失败

如果您的配置引用了不存在于密钥链中的密钥（`secret:provider:anthropic:apiKey`），守护进程将退出并报告缺失的密钥名称。

**修复方法：**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## 服务管理

### systemd：注销后守护进程停止

默认情况下，systemd 用户服务在用户注销后停止。Triggerfish 在安装时启用 `loginctl enable-linger` 来防止这种情况。如果 linger 未能启用：

```bash
# 检查 linger 状态
loginctl show-user $USER | grep Linger

# 启用它（可能需要 sudo）
sudo loginctl enable-linger $USER
```

如果没有 linger，守护进程只在您登录时运行。

### systemd：服务无法启动

检查服务状态和日志：

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

常见原因：
- **二进制文件被移动或删除。** 单元文件中有硬编码的二进制文件路径。重新安装守护进程：`triggerfish dive --install-daemon`
- **PATH 问题。** systemd 单元在安装时捕获您的 PATH。如果在安装守护进程后安装了新工具（如 MCP 服务器），需要重新安装守护进程以更新 PATH。
- **DENO_DIR 未设置。** systemd 单元设置 `DENO_DIR=~/.cache/deno`。如果此目录不可写，SQLite FFI 插件将无法加载。

### launchd：守护进程未在登录时启动

检查 plist 状态：

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

如果 plist 未加载：

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

常见原因：
- **Plist 被删除或损坏。** 重新安装：`triggerfish dive --install-daemon`
- **二进制文件被移动。** Plist 有硬编码路径。移动二进制文件后需要重新安装。
- **安装时的 PATH。** 与 systemd 类似，launchd 在创建 plist 时捕获 PATH。如果添加了新工具到 PATH，需要重新安装。

### Windows：服务无法启动

检查服务状态：

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

常见原因：
- **服务未安装。** 重新安装：以管理员身份运行安装程序。
- **二进制文件路径更改。** 服务包装器有硬编码路径。重新安装。
- **安装时 .NET 编译失败。** C# 服务包装器需要 .NET Framework 4.x 的 `csc.exe`。

### 升级导致守护进程中断

运行 `triggerfish update` 后，守护进程会自动重启。如果未重启：

1. 旧的二进制文件可能仍在运行。手动停止：`triggerfish stop`
2. 在 Windows 上，旧的二进制文件会被重命名为 `.old`。如果重命名失败，更新将报错。请先停止服务，然后再更新。

---

## 日志文件问题

### 日志文件为空

守护进程将日志写入 `~/.triggerfish/logs/triggerfish.log`。如果文件存在但为空：

- 守护进程可能刚刚启动。稍等片刻。
- 日志级别设置为 `quiet`，仅记录 ERROR 级别的消息。将其设置为 `normal` 或 `verbose`：

```bash
triggerfish config set logging.level normal
```

### 日志过于冗杂

将日志级别设置为 `quiet` 以仅查看错误：

```bash
triggerfish config set logging.level quiet
```

级别映射：

| 配置值 | 记录的最低级别 |
|--------|---------------|
| `quiet` | 仅 ERROR |
| `normal` | INFO 及以上 |
| `verbose` | DEBUG 及以上 |
| `debug` | TRACE 及以上（全部） |

### 日志轮转

当前文件超过 1 MB 时，日志会自动轮转。最多保留 10 个轮转文件：

```
triggerfish.log        # 当前日志
triggerfish.1.log      # 最近的备份
triggerfish.2.log      # 第二近的备份
...
triggerfish.10.log     # 最旧的（新轮转发生时删除）
```

没有基于时间的轮转，仅基于大小。
