# 密钥管理

Triggerfish 永远不在配置文件中存储凭证。所有密钥 —— API 密钥、OAuth 令牌、集成凭证 —— 存储在平台原生的安全存储中：个人版使用操作系统钥匙串，企业版使用保管库服务。插件和智能体通过 SDK 与凭证交互，SDK 执行严格的访问控制。

## 存储后端

| 层级 | 后端 | 详情 |
| -------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| **个人版** | 操作系统钥匙串 | macOS Keychain、Linux Secret Service（通过 D-Bus）、Windows Credential Manager |
| **企业版** | 保管库集成 | HashiCorp Vault、AWS Secrets Manager、Azure Key Vault 或其他企业保管库服务 |

在两种情况下，密钥都由存储后端静态加密。Triggerfish 不自行实现密钥加密 —— 它委托给专门构建的、经过审计的密钥存储系统。

在没有原生钥匙串的平台上（没有 Credential Manager 的 Windows、Docker 容器），Triggerfish 回退到 `~/.triggerfish/secrets.json` 的加密 JSON 文件。条目使用 AES-256-GCM 加密，使用存储在 `~/.triggerfish/secrets.key`（权限：`0600`）的机器绑定 256 位密钥。每个条目在每次写入时使用全新的随机 12 字节 IV。旧版明文密钥文件在首次加载时自动迁移到加密格式。

::: tip 个人版的密钥管理零配置。当你在设置期间连接集成时（`triggerfish dive`），凭证会自动存储在操作系统钥匙串中。你不需要安装或配置任何超出操作系统已提供的东西。 :::

## 配置中的密钥引用

Triggerfish 支持在 `triggerfish.yaml` 中使用 `secret:` 引用。你不必以明文存储凭证，而是通过名称引用它们，启动时从操作系统钥匙串解析。

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

解析器对配置文件执行深度优先遍历。任何以 `secret:` 开头的字符串值都会被替换为对应的钥匙串条目。如果引用的密钥未找到，启动会立即失败并给出清晰的错误信息。

### 迁移现有密钥

如果你的配置文件中有来自早期版本的明文凭证，迁移命令会自动将它们移到钥匙串中：

```bash
triggerfish config migrate-secrets
```

此命令：

1. 扫描 `triggerfish.yaml` 中的明文凭证值
2. 将每个存储到操作系统钥匙串
3. 用 `secret:` 引用替换明文值
4. 创建原始文件的备份

::: warning 迁移后，在删除备份文件之前验证你的智能体能正确启动。没有备份的情况下迁移不可逆。 :::

## 委托凭证架构

Triggerfish 的核心安全原则是数据查询使用**用户的**凭证运行，而非系统凭证。这确保智能体继承源系统的权限模型 —— 用户只能访问他们可以直接访问的数据。

<img src="/diagrams/delegated-credentials.svg" alt="委托凭证架构：用户授予 OAuth 同意，智能体使用用户的令牌查询，源系统执行权限" style="max-width: 100%;" />

这种架构意味着：

- **无过度授权** —— 智能体不能访问用户无法直接访问的数据
- **无系统服务账户** —— 没有可能被入侵的全能凭证
- **源系统执行** —— 源系统（Salesforce、Jira、GitHub 等）在每次查询时执行自己的权限

::: warning 安全 传统 AI 智能体平台通常使用单个系统服务账户代表所有用户访问集成。这意味着智能体可以访问集成中的所有数据，并依赖 LLM 来决定向每个用户显示什么。Triggerfish 完全消除了这种风险：查询使用用户自己的委托 OAuth 令牌运行。 :::

## Plugin SDK 执行

插件通过 Triggerfish SDK 与凭证交互。SDK 提供权限感知的方法，阻止任何访问系统级凭证的尝试。

### 允许：用户凭证访问

```python
def get_user_opportunities(sdk, params):
    # SDK 从安全存储中检索用户的委托令牌
    # 如果用户未连接 Salesforce，返回有用的错误
    user_token = sdk.get_user_credential("salesforce")

    # 查询使用用户的权限运行
    # 源系统执行访问控制
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### 阻止：系统凭证访问

```python
def get_all_opportunities(sdk, params):
    # 这将引发 PermissionError —— 被 SDK 阻止
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` 始终被阻止。没有启用它的配置，没有管理员覆盖，也没有逃逸口。这是一条固定的安全规则，与禁止降级写入规则相同。 :::

## LLM 可调用的密钥工具

智能体可以通过三个工具帮助你管理密钥。关键是，LLM 永远看不到实际的密钥值 —— 输入和存储在带外进行。

### `secret_save`

提示你安全输入密钥值：

- **CLI**：终端切换到隐藏输入模式（字符不回显）
- **Tidepool**：在 Web 界面中出现安全输入弹窗

LLM 请求保存密钥，但实际值由你通过安全提示输入。值直接存储到钥匙串 —— 它永远不通过 LLM 上下文。

### `secret_list`

列出所有已存储密钥的名称。永远不暴露值。

### `secret_delete`

按名称从钥匙串中删除密钥。

### 工具参数替换

<div v-pre>

当智能体使用需要密钥的工具时（例如在 MCP 服务器环境变量中设置 API 密钥），它在工具参数中使用 <span v-pre>`{{secret:name}}`</span> 语法：

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

运行时在工具执行之前**在 LLM 层之下**解析 <span v-pre>`{{secret:name}}`</span> 引用。解析后的值永远不会出现在对话历史或日志中。

</div>

::: warning 安全 <code v-pre>{{secret:name}}</code> 替换由代码执行，而非 LLM。即使 LLM 试图记录或返回解析后的值，策略层也会在 `PRE_OUTPUT` hook 中捕获该尝试。 :::

### SDK 权限方法

| 方法 | 行为 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)` | 返回用户对指定集成的委托 OAuth 令牌。如果用户未连接该集成，返回带有说明的错误。 |
| `sdk.query_as_user(integration, query)` | 使用用户的委托凭证对集成执行查询。源系统执行自己的权限。 |
| `sdk.get_system_credential(name)` | **始终被阻止。** 引发 `PermissionError`。记录为安全事件。 |
| `sdk.has_user_connection(integration)` | 如果用户已连接指定集成返回 `true`，否则返回 `false`。不暴露任何凭证数据。 |

## 权限感知的数据访问

委托凭证架构与分类系统协同工作。即使用户在源系统中有权限访问数据，Triggerfish 的分类规则在数据检索后管控其可以流向哪里。

<img src="/diagrams/secret-resolution-flow.svg" alt="密钥解析流程：配置文件引用从操作系统钥匙串在 LLM 层之下解析" style="max-width: 100%;" />

**示例：**

```
用户："汇总 Acme 交易并发送给我妻子"

步骤 1：权限检查
  --> 使用用户的 Salesforce 令牌
  --> Salesforce 返回 Acme 商机（用户有访问权限）

步骤 2：分类
  --> Salesforce 数据分类为 CONFIDENTIAL
  --> 会话 taint 升级到 CONFIDENTIAL

步骤 3：输出检查
  --> 妻子 = EXTERNAL 接收者
  --> CONFIDENTIAL --> EXTERNAL：阻止

结果：数据已检索（用户有权限），但不能发送
      （分类规则防止泄露）
```

用户在 Salesforce 中对 Acme 交易有合法访问权限。Triggerfish 尊重这一点并检索数据。但分类系统防止该数据流向外部接收者。访问数据的权限与分享数据的权限是分开的。

## 密钥访问日志

每次凭证访问都通过 `SECRET_ACCESS` 执行 hook 记录：

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

被阻止的尝试也会记录：

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "System credential access is prohibited",
    "plugin_id": "plugin_789"
  }
}
```

::: info 被阻止的凭证访问尝试以提升的告警级别记录。在企业部署中，这些事件可以触发安全团队的通知。 :::

## 企业保管库集成

企业部署可以将 Triggerfish 连接到集中的保管库服务进行凭证管理：

| 保管库服务 | 集成 |
| ------------------- | ------------------------------------ |
| HashiCorp Vault | 原生 API 集成 |
| AWS Secrets Manager | AWS SDK 集成 |
| Azure Key Vault | Azure SDK 集成 |
| 自定义保管库 | 可插拔的 `SecretProvider` 接口 |

企业保管库集成提供：

- **集中轮换** —— 凭证在保管库中轮换，Triggerfish 自动获取
- **访问策略** —— 保管库级策略控制哪些智能体和用户可以访问哪些凭证
- **审计整合** —— Triggerfish 和保管库的凭证访问日志可以关联

## 永远不存储在配置文件中的内容

以下内容永远不会作为明文值出现在 `triggerfish.yaml` 或任何其他配置文件中。它们要么存储在操作系统钥匙串中并通过 `secret:` 语法引用，要么通过 `secret_save` 工具管理：

- LLM 提供商的 API 密钥
- 集成的 OAuth 令牌
- 数据库凭证
- Webhook 密钥
- 加密密钥
- 配对码（临时的，仅在内存中）

::: danger 如果你在 Triggerfish 配置文件中发现明文凭证（不是 `secret:` 引用的值），说明出了问题。运行 `triggerfish config migrate-secrets` 将它们移到钥匙串中。发现的明文凭证应立即轮换。 :::

## 相关页面

- [安全优先设计](./) —— 安全架构概览
- [禁止降级写入规则](./no-write-down) —— 分类控制如何补充凭证隔离
- [身份与认证](./identity) —— 用户身份如何输入到委托凭证访问
- [审计与合规](./audit-logging) —— 凭证访问事件如何记录
