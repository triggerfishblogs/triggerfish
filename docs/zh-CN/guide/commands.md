# CLI 命令

Triggerfish 提供 CLI 用于管理你的智能体、守护进程、渠道和会话。本页涵盖每个可用命令和聊天内快捷方式。

## 核心命令

### `triggerfish dive`

运行交互式设置向导。这是安装后运行的第一个命令，可以随时重新运行以重新配置。

```bash
triggerfish dive
```

### `triggerfish chat`

在终端中启动交互式聊天会话。当你运行不带参数的 `triggerfish` 时，这是默认命令。

```bash
triggerfish chat
```

### `triggerfish start`

安装并作为后台守护进程启动 Triggerfish。

```bash
triggerfish start
```

| 平台 | 服务管理器 |
| -------- | -------------------------------- |
| macOS | launchd |
| Linux | systemd |
| Windows | Windows 服务 / 任务计划程序 |

### `triggerfish stop`

停止运行中的守护进程。

```bash
triggerfish stop
```

### `triggerfish status`

检查守护进程是否正在运行并显示基本状态信息。

```bash
triggerfish status
```

### `triggerfish logs`

查看守护进程日志输出。

```bash
triggerfish logs        # 显示最近的日志
triggerfish logs --tail # 实时流式传输日志
```

### `triggerfish patrol`

运行 Triggerfish 安装的健康检查。

```bash
triggerfish patrol
```

### `triggerfish config`

管理你的配置文件。使用点分路径访问 `triggerfish.yaml`。

```bash
triggerfish config set <key> <value>    # 设置配置值
triggerfish config get <key>            # 读取配置值
triggerfish config validate             # 验证配置语法和结构
triggerfish config add-channel [type]   # 交互式添加渠道
triggerfish config migrate-secrets      # 将明文凭证迁移到操作系统钥匙串
```

### `triggerfish connect`

将外部服务连接到 Triggerfish。

```bash
triggerfish connect google    # Google Workspace（OAuth2 流程）
triggerfish connect github    # GitHub（个人访问令牌）
```

### `triggerfish update`

检查可用更新并安装。

```bash
triggerfish update
```

## 聊天内命令

这些命令在交互式聊天会话中可用。仅限所有者。

| 命令 | 描述 |
| ----------------------- | ------------------------------------------------------------- |
| `/help` | 显示可用的聊天内命令 |
| `/status` | 显示会话状态：模型、令牌数、费用、taint 级别 |
| `/reset` | 重置会话 taint 和对话历史 |
| `/compact` | 使用 LLM 摘要压缩对话历史 |
| `/model <name>` | 切换当前会话的 LLM 模型 |

## 键盘快捷键

| 快捷键 | 操作 |
| -------- | --------------------------------------------------------------------------- |
| ESC | 中断当前 LLM 响应 |
| Ctrl+V | 从剪贴板粘贴图像（参见[图像和视觉](/zh-CN/features/image-vision)） |
| Ctrl+O | 切换紧凑/展开工具调用显示 |
| Ctrl+C | 退出聊天会话 |
| 上/下 | 浏览输入历史 |

::: tip ESC 中断通过整个链——从编排器到 LLM 提供商——发送中止信号。响应干净地停止，你可以继续对话。 :::
