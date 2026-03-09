# 快速开始

本指南将带您完成使用 Triggerfish 的前 5 分钟 —— 从运行设置向导到拥有一个可以聊天的 AI 智能体。

## 运行设置向导

如果您使用了一键安装程序，向导已在安装过程中运行。要重新运行或重新开始：

```bash
triggerfish dive
```

向导将引导您完成八个步骤：

### 步骤 1：选择您的 LLM 提供商

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

选择提供商并输入您的凭据。Triggerfish 支持多个提供商的自动故障转移。**Triggerfish Gateway** 是最简单的选项 —— 订阅 [Pro 或 Power 方案](/zh-CN/pricing)，您的智能体即可连接到托管的 LLM 和搜索基础设施，无需配置 API 密钥。

### 步骤 2：为您的智能体命名

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

这会生成您的 `SPINE.md` 文件 —— 智能体系统提示的基础。您可以随时在 `~/.triggerfish/SPINE.md` 编辑它。

### 步骤 3：连接渠道

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

选择一个消息平台或跳过此步骤，仅使用 CLI 开始。您可以稍后在 `triggerfish.yaml` 中添加渠道。

### 步骤 4：可选 Plugin

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

连接可选集成，如 Obsidian 用于笔记。

### 步骤 5：连接 Google Workspace（可选）

通过 OAuth2 连接您的 Google 账户以使用 Gmail、日历、任务、云端硬盘和表格。您可以跳过此步骤，稍后使用 `triggerfish connect google` 连接。

### 步骤 6：连接 GitHub（可选）

通过粘贴个人访问令牌连接 GitHub。为智能体提供仓库、PR、Issue 和 Actions 的工具。您可以跳过此步骤，稍后使用 `triggerfish connect github` 连接。

### 步骤 7：设置网页搜索

为您的智能体选择搜索引擎（Brave Search 或自托管 SearXNG），或暂时跳过。

### 步骤 8：启动守护进程

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

选择"是"可让您的智能体在机器运行时始终运行。

## 开始聊天

向导完成后，您可以立即通过 CLI 开始聊天：

```bash
triggerfish chat
```

或者，如果您连接了消息渠道，可以在那里向您的智能体发送消息。

### 对话示例

```
You: What can you help me with?

Reef: I can help you with a wide range of tasks. Here are some things
I'm set up for:

  - Answer questions and have conversations
  - Manage your calendar and schedule
  - Summarize emails and messages
  - Write and edit documents
  - Run code in a sandboxed environment
  - Search the web for information
  - Automate recurring tasks with cron jobs

What would you like to start with?

You: Set up a morning briefing every day at 7am

Reef: I've created a cron job for your morning briefing:

  Schedule: Every day at 7:00 AM
  Task: Prepare briefing with calendar events, unread emails,
        and weather forecast
  Delivery: CLI (add a channel in config to get it on Telegram/Slack)

You'll receive your first briefing tomorrow morning. You can manage
cron jobs anytime with /cron list.
```

## 验证您的设置

运行健康检查以确保一切正常：

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 2m)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  1 channel active (CLI)
  Policy engine loaded (4 rules)
  3 skills installed (3 bundled)

Overall: HEALTHY
```

## 后续操作

- **自定义您的智能体** —— 编辑 `~/.triggerfish/SPINE.md` 来优化您的智能体个性和能力。参见 [SPINE 和触发器](./spine-and-triggers)。
- **添加更多渠道** —— 在 `triggerfish.yaml` 中连接 Telegram、Slack、Discord 或 WhatsApp。参见[配置](./configuration)。
- **连接集成** —— `triggerfish connect google` 用于 Google Workspace，`triggerfish connect github` 用于 GitHub。参见[集成](/integrations/)。
- **设置主动行为** —— 创建 `~/.triggerfish/TRIGGER.md` 告诉您的智能体需要监控什么。参见 [SPINE 和触发器](./spine-and-triggers)。
- **探索命令** —— 了解所有可用的 CLI 和聊天内命令。参见 [CLI 命令](./commands)。
