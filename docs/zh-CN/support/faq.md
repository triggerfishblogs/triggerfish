# 常见问题

## 安装

### 系统要求是什么？

Triggerfish 可在 macOS（Intel 和 Apple Silicon）、Linux（x64 和 arm64）以及 Windows（x64）上运行。二进制安装程序会处理所有依赖。如果从源码构建，需要 Deno 2.x。

对于 Docker 部署，任何运行 Docker 或 Podman 的系统均可使用。容器镜像基于 distroless Debian 12。

### Triggerfish 将数据存储在哪里？

默认情况下，所有数据存放在 `~/.triggerfish/` 目录下：

```
~/.triggerfish/
  triggerfish.yaml          # 配置文件
  SPINE.md                  # Agent 身份文件
  TRIGGER.md                # 主动行为定义
  logs/                     # 日志文件（1 MB 轮转，保留 10 个备份）
  data/triggerfish.db       # SQLite 数据库（会话、记忆、状态）
  skills/                   # 已安装的技能
  backups/                  # 带时间戳的配置备份
```

Docker 部署使用 `/data` 代替。您可以通过 `TRIGGERFISH_DATA_DIR` 环境变量覆盖基础目录。

### 可以移动数据目录吗？

可以。在启动守护进程之前，将 `TRIGGERFISH_DATA_DIR` 环境变量设置为您期望的路径。如果使用 systemd 或 launchd，需要更新服务定义（参见[平台说明](/zh-CN/support/guides/platform-notes)）。

### 安装程序提示无法写入 `/usr/local/bin`

安装程序首先尝试 `/usr/local/bin`。如果需要 root 权限，会回退到 `~/.local/bin`。如果需要系统级安装，请使用 `sudo` 重新运行：

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### 如何卸载 Triggerfish？

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

这将停止守护进程、移除服务定义（systemd unit 或 launchd plist）、删除二进制文件，并移除整个 `~/.triggerfish/` 目录及其所有数据。

---

## 配置

### 如何更改 LLM 提供商？

编辑 `triggerfish.yaml` 或使用 CLI：

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

守护进程会在配置更改后自动重启。

### API 密钥存储在哪里？

API 密钥存储在操作系统密钥链中（macOS Keychain、Linux Secret Service 或 Windows/Docker 上的加密文件）。切勿将原始 API 密钥放入 `triggerfish.yaml`。请使用 `secret:` 引用语法：

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

存储实际密钥：

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### 配置中的 `secret:` 是什么意思？

以 `secret:` 为前缀的值是对操作系统密钥链的引用。在启动时，Triggerfish 会解析每个引用并在内存中替换为实际的密钥值。原始密钥永远不会出现在磁盘上的 `triggerfish.yaml` 中。有关各平台后端的详细信息，请参阅[密钥与凭证](/zh-CN/support/troubleshooting/secrets)。

### 什么是 SPINE.md？

`SPINE.md` 是您的 Agent 身份文件。它定义了 Agent 的名称、使命、个性和行为准则。可以将其视为系统提示词的基础。安装向导（`triggerfish dive`）会为您生成一个，但您可以自由编辑。

### 什么是 TRIGGER.md？

`TRIGGER.md` 定义了您的 Agent 的主动行为：在计划的触发器唤醒期间应该检查、监控和执行什么。如果没有 `TRIGGER.md`，触发器仍会触发，但 Agent 将没有执行指令。

### 如何添加新通道？

```bash
triggerfish config add-channel telegram
```

这会启动一个交互式提示，引导您完成所需字段的填写（Bot Token、Owner ID、分类级别）。您也可以直接编辑 `triggerfish.yaml` 中的 `channels:` 部分。

### 我修改了配置但没有生效

守护进程必须重启才能应用更改。如果使用 `triggerfish config set`，它会提示自动重启。如果手动编辑了 YAML 文件，请使用以下命令重启：

```bash
triggerfish stop && triggerfish start
```

---

## 通道

### 为什么我的 Bot 不响应消息？

首先检查：

1. **守护进程是否在运行？** 执行 `triggerfish status`
2. **通道是否已连接？** 检查日志：`triggerfish logs`
3. **Bot Token 是否有效？** 大多数通道在 Token 无效时会静默失败
4. **Owner ID 是否正确？** 如果您未被识别为所有者，Bot 可能会限制响应

有关特定通道的检查清单，请参阅[通道故障排除](/zh-CN/support/troubleshooting/channels)指南。

### 什么是 Owner ID？为什么它很重要？

Owner ID 告诉 Triggerfish 在给定通道上哪个用户是您（操作者）。非所有者用户的工具访问权限受限，并且可能受到分类限制。如果 Owner ID 留空，行为因通道而异。某些通道（如 WhatsApp）会将所有人视为所有者，这存在安全风险。

### 可以同时使用多个通道吗？

可以。在 `triggerfish.yaml` 中配置任意数量的通道。每个通道维护自己的会话和分类级别。路由器处理所有已连接通道之间的消息分发。

### 消息大小限制是什么？

| 通道 | 限制 | 行为 |
|------|------|------|
| Telegram | 4,096 字符 | 自动分块 |
| Discord | 2,000 字符 | 自动分块 |
| Slack | 40,000 字符 | 截断（不分块） |
| WhatsApp | 4,096 字符 | 截断 |
| Email | 无硬性限制 | 发送完整消息 |
| WebChat | 无硬性限制 | 发送完整消息 |

### 为什么 Slack 消息会被截断？

Slack 有 40,000 字符的限制。与 Telegram 和 Discord 不同，Triggerfish 会截断 Slack 消息而不是将其拆分为多条消息。非常长的响应（如大段代码输出）可能会丢失末尾内容。

---

## 安全与分类

### 分类级别有哪些？

四个级别，从最低到最高敏感度：

1. **PUBLIC** - 数据流无限制
2. **INTERNAL** - 标准运营数据
3. **CONFIDENTIAL** - 敏感数据（凭证、个人信息、财务记录）
4. **RESTRICTED** - 最高敏感度（受监管数据、合规关键数据）

数据只能从低级别流向相同或更高级别。CONFIDENTIAL 数据永远不能到达 PUBLIC 通道。这就是"禁止写入降级"规则，且不可覆盖。

### "会话污染"是什么意思？

每个会话从 PUBLIC 开始。当 Agent 访问分类数据（读取 CONFIDENTIAL 文件、查询 RESTRICTED 数据库）时，会话污染会升级以匹配。污染只升不降。被污染为 CONFIDENTIAL 的会话无法将其输出发送到 PUBLIC 通道。

### 为什么我收到"写入降级被阻止"的错误？

您的会话已被污染到高于目标的分类级别。例如，如果您访问了 CONFIDENTIAL 数据然后尝试将结果发送到 PUBLIC WebChat 通道，策略引擎会阻止此操作。

这是预期行为。要解决此问题，您可以：
- 开始新会话（新的对话）
- 使用分类级别等于或高于会话污染级别的通道

### 可以禁用分类执行吗？

不可以。分类系统是核心安全不变量。它作为确定性代码在 LLM 层之下运行，无法被绕过、禁用或被 Agent 影响。这是设计使然。

---

## LLM 提供商

### 支持哪些提供商？

Anthropic、OpenAI、Google Gemini、Fireworks、OpenRouter、ZenMux、Z.AI，以及通过 Ollama 或 LM Studio 使用的本地模型。

### 故障转移如何工作？

在 `triggerfish.yaml` 中配置 `failover` 列表：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

如果主要提供商失败，Triggerfish 会按顺序尝试每个备选方案。`failover_config` 部分控制重试次数、延迟和触发故障转移的错误条件。

### 我的提供商返回 401 / 403 错误

您的 API 密钥无效或已过期。重新存储：

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

然后重启守护进程。有关特定提供商的指导，请参阅 [LLM 提供商故障排除](/zh-CN/support/troubleshooting/providers)。

### 可以为不同分类级别使用不同模型吗？

可以。使用 `classification_models` 配置：

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

被污染到特定级别的会话将使用相应的模型。没有显式覆盖的级别会回退到主要模型。

---

## Docker

### 如何在 Docker 中运行 Triggerfish？

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

这将下载 Docker 包装脚本和 compose 文件，拉取镜像并运行安装向导。

### Docker 中数据存储在哪里？

所有持久化数据存储在 Docker 命名卷（`triggerfish-data`）中，挂载在容器内的 `/data` 路径。包括配置、密钥、SQLite 数据库、日志、技能和 Agent 工作区。

### Docker 中密钥如何工作？

Docker 容器无法访问宿主机操作系统的密钥链。Triggerfish 使用加密文件存储代替：`secrets.json`（加密值）和 `secrets.key`（AES-256 加密密钥），均存储在 `/data` 卷中。请将该卷视为敏感数据。

### 容器找不到我的配置文件

确保正确挂载：

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

如果容器在没有配置文件的情况下启动，将打印帮助信息并退出。

### 如何更新 Docker 镜像？

```bash
triggerfish update    # 如果使用包装脚本
# 或
docker compose pull && docker compose up -d
```

---

## 技能与 The Reef

### 什么是技能？

技能是一个包含 `SKILL.md` 文件的文件夹，为 Agent 提供新的能力、上下文或行为准则。技能可以包含工具定义、代码、模板和指令。

### 什么是 The Reef？

The Reef 是 Triggerfish 的技能市场。您可以通过它发现、安装和发布技能：

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### 为什么我的技能被安全扫描器阻止了？

每个技能在安装前都会被扫描。扫描器检查可疑模式、过多权限和分类上限违规。如果技能的上限低于您当前的会话污染级别，激活将被阻止以防止写入降级。

### 技能的分类上限是什么？

技能声明了允许操作的最大分类级别。`classification_ceiling: INTERNAL` 的技能不能在被污染为 CONFIDENTIAL 或更高级别的会话中激活。这防止技能访问超出其权限的数据。

---

## 触发器与调度

### 什么是触发器？

触发器是用于主动行为的定期 Agent 唤醒。您在 `TRIGGER.md` 中定义 Agent 应该检查的内容，Triggerfish 按计划唤醒它。Agent 审查其指令，采取行动（检查日历、监控服务、发送提醒），然后回到休眠状态。

### 触发器与 Cron 作业有什么不同？

Cron 作业按计划运行固定任务。触发器唤醒 Agent 并提供完整上下文（记忆、工具、通道访问权限），让它根据 `TRIGGER.md` 的指令决定要做什么。Cron 是机械式的；触发器是智能代理式的。

### 什么是静默时段？

`scheduler.trigger` 中的 `quiet_hours` 设置可防止触发器在指定时段内触发：

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Webhook 如何工作？

外部服务可以向 Triggerfish 的 Webhook 端点发送 POST 请求以触发 Agent 操作。每个 Webhook 源需要 HMAC 签名进行身份验证，并包含重放检测。

---

## Agent 团队

### 什么是 Agent 团队？

Agent 团队是持久的协作 Agent 组，它们共同处理复杂任务。每个团队成员是一个独立的 Agent 会话，拥有自己的角色、对话上下文和工具。其中一个成员被指定为负责人并协调工作。有关完整文档，请参阅 [Agent 团队](/features/agent-teams)。

### 团队与子 Agent 有什么不同？

子 Agent 是即发即忘型的：您委派一个任务然后等待结果。团队是持久的——成员通过 `sessions_send` 相互通信，负责人协调工作，团队自主运行直到被解散或超时。对于专注的委派任务使用子 Agent；对于复杂的多角色协作使用团队。

### Agent 团队需要付费计划吗？

使用 Triggerfish Gateway 时，Agent 团队需要 **Power** 计划（$149/月）。使用自己 API 密钥的开源用户拥有完全访问权限——每个团队成员从您配置的 LLM 提供商消耗推理资源。

### 为什么我的团队负责人立即失败了？

最常见的原因是 LLM 提供商配置错误。每个团队成员都会生成自己的 Agent 会话，需要一个可用的 LLM 连接。在创建团队时，检查 `triggerfish logs` 中的提供商错误。有关更多详情，请参阅 [Agent 团队故障排除](/zh-CN/support/troubleshooting/security#agent-teams)。

### 团队成员可以使用不同的模型吗？

可以。每个成员定义接受可选的 `model` 字段。如果省略，成员继承创建 Agent 的模型。这允许您为复杂角色分配昂贵的模型，为简单角色分配便宜的模型。

### 团队可以运行多长时间？

默认情况下，团队的生命周期为 1 小时（`max_lifetime_seconds: 3600`）。达到限制时，负责人会获得 60 秒警告以生成最终输出，然后团队会自动解散。您可以在创建时配置更长的生命周期。

### 如果团队成员崩溃会怎样？

生命周期监控器在 30 秒内检测到成员故障。失败的成员被标记为 `failed`，负责人被通知继续使用剩余成员或解散团队。如果负责人本身失败，团队会暂停，创建会话的用户会收到通知。

---

## 其他

### Triggerfish 是开源的吗？

是的，采用 Apache 2.0 许可证。完整源代码（包括所有安全关键组件）可在 [GitHub](https://github.com/greghavens/triggerfish) 上进行审计。

### Triggerfish 会向外发送数据吗？

不会。Triggerfish 除了您明确配置的服务（LLM 提供商、通道 API、集成）外，不会建立任何出站连接。没有遥测、分析或更新检查，除非您运行 `triggerfish update`。

### 可以运行多个 Agent 吗？

可以。`agents` 配置部分定义了多个 Agent，每个都有自己的名称、模型、通道绑定、工具集和分类上限。路由系统将消息定向到适当的 Agent。

### 什么是 Gateway？

Gateway 是 Triggerfish 的内部 WebSocket 控制平面。它管理会话、在通道和 Agent 之间路由消息、分发工具并执行策略。CLI 聊天界面连接到 Gateway 与您的 Agent 通信。

### Triggerfish 使用哪些端口？

| 端口 | 用途 | 绑定 |
|------|------|------|
| 18789 | Gateway WebSocket | 仅限 localhost |
| 18790 | Tidepool A2UI | 仅限 localhost |
| 8765 | WebChat（启用时） | 可配置 |
| 8443 | WhatsApp Webhook（启用时） | 可配置 |

所有默认端口绑定到 localhost。除非您明确配置或使用反向代理，否则不会暴露到网络。
