---
layout: home

hero:
  name: Triggerfish
  text: 安全的 AI 智能体
  tagline: LLM 层以下的确定性策略执行。覆盖每一个渠道，没有例外。
  image:
    src: /triggerfish.png
    alt: Triggerfish —— 遨游数字海洋
  actions:
    - theme: brand
      text: 开始使用
      link: /zh-CN/guide/
    - theme: alt
      text: 定价
      link: /zh-CN/pricing
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: LLM 层以下的安全性
    details: 确定性的、LLM 子层级策略执行。AI 无法绕过、覆盖或影响的纯代码 hook。相同的输入始终产生相同的决策。
  - icon: "\U0001F4AC"
    title: 覆盖您使用的每个渠道
    details: Telegram、Slack、Discord、WhatsApp、Email、WebChat、CLI —— 全部支持按渠道分类和自动 taint 跟踪。
  - icon: "\U0001F528"
    title: 构建一切
    details: 智能体执行环境，支持编写/运行/修复的反馈循环。自编写技能。The Reef 市场用于发现和共享能力。
  - icon: "\U0001F916"
    title: 任意 LLM 提供商
    details: Anthropic、OpenAI、Google Gemini、通过 Ollama 使用本地模型、OpenRouter。自动故障转移链。或者选择 Triggerfish Gateway —— 无需 API 密钥。
  - icon: "\U0001F3AF"
    title: 默认主动
    details: Cron 任务、触发器和 webhook。您的智能体会自主检查、监控和执行操作 —— 均在严格的策略边界内。
  - icon: "\U0001F310"
    title: 开源
    details: Apache 2.0 许可证。安全关键组件完全开放供审计。不要信任我们 —— 验证代码。
---

<LatestRelease />

## 一条命令完成安装

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

二进制安装程序会下载预构建的发行版、验证校验和并运行设置向导。请参阅[安装指南](/zh-CN/guide/installation)了解 Docker 部署、从源码构建以及发布流程。

不想管理 API 密钥？[查看定价](/zh-CN/pricing)了解 Triggerfish Gateway —— 托管的 LLM 和搜索基础设施，几分钟即可就绪。

## 工作原理

Triggerfish 在您的 AI 智能体和它所接触的一切之间放置了一个确定性策略层。LLM 提出操作建议 —— 纯代码 hook 决定是否允许执行。

- **确定性策略** —— 安全决策是纯代码。没有随机性、没有 LLM 影响、没有例外。相同的输入，相同的决策，每一次。
- **信息流控制** —— 四个分类级别（PUBLIC、INTERNAL、CONFIDENTIAL、RESTRICTED）通过会话 taint 自动传播。数据永远不能流向安全级别更低的上下文。
- **六个执行 Hook** —— 数据管道的每个阶段都有门控：进入 LLM 上下文的内容、调用哪些工具、返回什么结果，以及离开系统的内容。每个决策都有审计日志。
- **默认拒绝** —— 不会静默允许任何内容。未分类的工具、集成和数据源在明确配置之前会被拒绝。
- **智能体身份** —— 您的智能体的使命定义在 SPINE.md 中，主动行为定义在 TRIGGER.md 中。技能通过简单的文件夹约定扩展能力。The Reef 市场让您可以发现和分享技能。

[了解更多架构信息。](/zh-CN/architecture/)
