# 选择分类级别

Triggerfish 中的每个渠道、MCP 服务器、集成和 plugin 都必须有一个分类级别。本页帮助你选择正确的级别。

## 四个级别

| 级别 | 含义 | 数据流向... |
| ---------------- | ------------------------------------------------------ | ---------------------------------- |
| **PUBLIC** | 任何人都可以安全查看 | 任何地方 |
| **INTERNAL** | 仅供自己查看——不敏感但非公开 | INTERNAL、CONFIDENTIAL、RESTRICTED |
| **CONFIDENTIAL** | 包含你绝不想泄露的敏感数据 | CONFIDENTIAL、RESTRICTED |
| **RESTRICTED** | 最敏感——法律、医疗、金融、个人身份信息 | 仅 RESTRICTED |

数据只能**向上或平行**流动，永不向下。这是[禁止降级写入规则](/zh-CN/security/no-write-down)，不能被覆盖。

## 要问的两个问题

对于你正在配置的任何集成，问：

**1. 此来源可能返回的最敏感数据是什么？**

这决定了**最低**分类级别。如果一个 MCP 服务器可能返回金融数据，它必须至少是 CONFIDENTIAL——即使它的大多数工具返回无害的元数据。

**2. 我是否愿意会话数据流向此目标？**

这决定了你希望分配的**最高**分类级别。更高的分类意味着使用它时会话 taint 升级，这限制了数据之后可以流向哪里。

## MCP 服务器

当在 `triggerfish.yaml` 中添加 MCP 服务器时，分类决定两件事：

1. **会话 taint** —— 调用此服务器上的任何工具都会将会话升级到此级别
2. **降级写入防护** —— 已经被标记为高于此级别的会话不能向此服务器发送数据

```yaml
mcp_servers:
  # PUBLIC — 开放数据，无敏感性
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # CONFIDENTIAL — 访问私有仓库、客户问题
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL
```

::: warning 默认拒绝 如果省略 `classification`，服务器被注册为 **UNTRUSTED**，Gateway 拒绝所有工具调用。你必须明确选择级别。 :::

## 渠道

渠道分类决定**上限**——可以投递到该渠道的数据的最大敏感度。

```yaml
channels:
  cli:
    classification: INTERNAL # 你的本地终端——对内部数据安全
  telegram:
    classification: INTERNAL # 你的私人机器人——对所有者与 CLI 相同
  webchat:
    classification: PUBLIC # 匿名访客——仅公开数据
```

::: tip 所有者 vs 非所有者 对于**所有者**，所有渠道都有相同的信任级别——无论使用哪个应用，你就是你。渠道分类对于**非所有者用户**（webchat 上的访客、Slack 频道中的成员等）最重要，它门控了哪些数据可以流向他们。 :::

## 搞错了会怎样

**太低（例如 CONFIDENTIAL 服务器标记为 PUBLIC）：**

- 此服务器的数据不会升级会话 taint
- 会话可能将分类数据流向公共渠道——**数据泄露风险**
- 这是危险的方向

**太高（例如 PUBLIC 服务器标记为 CONFIDENTIAL）：**

- 使用此服务器时会话 taint 不必要地升级
- 之后你会被阻止发送到较低分类的渠道
- 烦人但**安全**——宁可偏高

::: danger 当有疑问时，**分类偏高**。在审查服务器实际返回什么数据后，你随时可以降低它。分类偏低是安全风险；分类偏高只是不便。 :::

## 相关页面

- [禁止降级写入规则](/zh-CN/security/no-write-down) —— 固定的数据流规则
- [配置](/zh-CN/guide/configuration) —— 完整的 YAML 参考
- [MCP Gateway](/zh-CN/integrations/mcp-gateway) —— MCP 服务器安全模型
