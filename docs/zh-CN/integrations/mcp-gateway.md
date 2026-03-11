# MCP Gateway

> 使用任何 MCP 服务器。我们负责边界安全。

Model Context Protocol（MCP）是智能体到工具通信的新兴标准。Triggerfish 提供安全的 MCP Gateway，让您连接任何兼容 MCP 的服务器，同时执行分级控制、工具级权限、污染追踪和完整的审计日志。

您提供 MCP 服务器。Triggerfish 保护每个跨越边界的请求和响应的安全。

## 工作原理

MCP Gateway 位于您的智能体和任何 MCP 服务器之间。每个工具调用在到达外部服务器之前都会通过策略执行层，每个响应在进入智能体上下文之前都会被分级。

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway 流程：智能体 → MCP Gateway → 策略层 → MCP 服务器，拒绝路径到 BLOCKED" style="max-width: 100%;" />

Gateway 提供五个核心功能：

1. **服务器身份验证和分级**——MCP 服务器在使用前必须经过审核和分级
2. **工具级权限执行**——单个工具可以被允许、限制或阻止
3. **请求/响应污染追踪**——会话污染根据服务器分级升级
4. **模式验证**——所有请求和响应按照声明的模式进行验证
5. **审计日志**——每个工具调用、决策和污染变化都被记录

## MCP 服务器状态

所有 MCP 服务器默认为 `UNTRUSTED`。它们必须被明确分级后，智能体才能调用。

| 状态         | 描述                                                             | 智能体可调用？ |
| ------------ | ---------------------------------------------------------------- | :------------: |
| `UNTRUSTED`  | 新服务器的默认状态。等待审核。                                   |       否       |
| `CLASSIFIED` | 已审核并分配了分级级别，具有逐工具的权限。                       | 是（在策略内） |
| `BLOCKED`    | 被管理员明确禁止。                                               |       否       |

<img src="/diagrams/state-machine.svg" alt="MCP 服务器状态机：UNTRUSTED → CLASSIFIED 或 BLOCKED" style="max-width: 100%;" />

::: warning 安全 `UNTRUSTED` 的 MCP 服务器在任何情况下都不能被智能体调用。LLM 不能请求、说服或欺骗系统使用未分级的服务器。分级是代码级别的门控，而非 LLM 的决策。 :::

## 配置

MCP 服务器在 `triggerfish.yaml` 中配置为按服务器 ID 键入的映射。每个服务器使用本地子进程（stdio 传输）或远程端点（SSE 传输）。

### 本地服务器（Stdio）

本地服务器作为子进程启动。Triggerfish 通过 stdin/stdout 与它们通信。

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### 远程服务器（SSE）

远程服务器在其他地方运行，通过 HTTP Server-Sent Events 访问。

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### 配置键

| 键               | 类型     | 必填        | 描述                                                                          |
| ---------------- | -------- | ----------- | ----------------------------------------------------------------------------- |
| `command`        | string   | 是（stdio） | 要启动的二进制文件（例如 `npx`、`deno`、`node`）                              |
| `args`           | string[] | 否          | 传递给命令的参数                                                              |
| `env`            | map      | 否          | 子进程的环境变量                                                              |
| `url`            | string   | 是（SSE）   | 远程服务器的 HTTP 端点                                                        |
| `classification` | string   | **是**      | 数据敏感级别：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL` 或 `RESTRICTED`            |
| `enabled`        | boolean  | 否          | 默认：`true`。设为 `false` 可跳过而不删除配置。                               |

每个服务器必须有 `command`（本地）或 `url`（远程）。两者都没有的服务器会被跳过。

### 延迟连接

MCP 服务器在启动后在后台连接。您无需等待所有服务器就绪即可使用智能体。

- 服务器以指数退避方式重试：2 秒 → 4 秒 → 8 秒 → 最大 30 秒
- 新服务器在连接后即可供智能体使用——无需重启会话
- 如果服务器在所有重试后仍未连接成功，它进入 `failed` 状态，可在下次守护进程重启时重试

CLI 和 Tidepool 界面显示实时 MCP 连接状态。详见 [CLI 渠道](/zh-CN/channels/cli#mcp-服务器状态)。

### 禁用服务器

要临时禁用 MCP 服务器而不删除其配置：

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # 启动时跳过
```

### 环境变量和密钥

以 `keychain:` 为前缀的环境变量值在启动时从操作系统密钥链解析：

```yaml
env:
  API_KEY: "keychain:my-secret-name" # 从操作系统密钥链解析
  PLAIN_VAR: "literal-value" # 按原样传递
```

只有 `PATH` 从主机环境继承（以便 `npx`、`node`、`deno` 等能正确解析）。没有其他主机环境变量泄漏到 MCP 服务器子进程中。

::: tip 使用 `triggerfish config set-secret <name> <value>` 存储密钥。然后在 MCP 服务器环境配置中引用为 `keychain:<name>`。 :::

### 工具命名

来自 MCP 服务器的工具命名空间为 `mcp_<serverId>_<toolName>`，以避免与内置工具冲突。例如，如果名为 `github` 的服务器公开了名为 `list_repos` 的工具，智能体看到的是 `mcp_github_list_repos`。

### 分级和默认拒绝

如果您省略 `classification`，服务器将注册为 **UNTRUSTED**，Gateway 会拒绝所有工具调用。您必须明确选择分级级别。请参阅[分级指南](/guide/classification-guide)以帮助选择正确的级别。

## 工具调用流程

当智能体请求 MCP 工具调用时，Gateway 在转发请求之前执行一系列确定性检查。

### 1. 预检检查

所有检查都是确定性的——没有 LLM 调用，没有随机性。

| 检查                                         | 失败结果                          |
| -------------------------------------------- | --------------------------------- |
| 服务器状态是否为 `CLASSIFIED`？               | 阻止："服务器未批准"              |
| 该服务器是否允许此工具？                      | 阻止："工具未被允许"              |
| 用户是否有所需权限？                          | 阻止："权限被拒绝"               |
| 会话污染是否与服务器分级兼容？                | 阻止："将违反降级写入"            |
| 模式验证是否通过？                            | 阻止："无效参数"                  |

::: info 如果会话污染高于服务器分级，调用将被阻止以防止降级写入。被标记为 `CONFIDENTIAL` 的会话不能向 `PUBLIC` MCP 服务器发送数据。 :::

### 2. 执行

如果所有预检检查通过，Gateway 将请求转发到 MCP 服务器。

### 3. 响应处理

当 MCP 服务器返回响应时：

- 按照声明的模式验证响应
- 按服务器的分级级别对响应数据进行分级
- 更新会话污染：`taint = max(current_taint, server_classification)`
- 创建追踪数据来源的血统记录

### 4. 审计

每个工具调用都记录：服务器身份、工具名称、用户身份、策略决策、污染变化和时间戳。

## 响应污染规则

MCP 服务器响应继承服务器的分级级别。会话污染只能升级。

| 服务器分级     | 响应污染       | 会话影响                              |
| -------------- | -------------- | ------------------------------------- |
| `PUBLIC`       | `PUBLIC`       | 无污染变化                            |
| `INTERNAL`     | `INTERNAL`     | 污染升级为至少 `INTERNAL`             |
| `CONFIDENTIAL` | `CONFIDENTIAL` | 污染升级为至少 `CONFIDENTIAL`         |
| `RESTRICTED`   | `RESTRICTED`   | 污染升级为 `RESTRICTED`               |

一旦会话在给定级别被污染，它在会话剩余期间保持该级别或更高。需要完整的会话重置（清除对话历史）才能降低污染。

## 用户身份验证透传

对于支持用户级身份验证的 MCP 服务器，Gateway 透传用户的委托凭据而非系统凭据。

当工具配置了 `requires_user_auth: true` 时：

1. Gateway 检查用户是否已连接此 MCP 服务器
2. 从安全凭据存储中检索用户的委托凭据
3. 将用户身份验证添加到 MCP 请求头中
4. MCP 服务器执行用户级权限

结果：MCP 服务器看到的是**用户的身份**，而非系统身份。权限继承通过 MCP 边界工作——智能体只能访问用户可以访问的内容。

::: tip 用户身份验证透传是管理访问控制的 MCP 服务器的首选模式。这意味着智能体继承用户的权限，而非拥有系统级的全面访问。 :::

## 模式验证

Gateway 在转发之前验证所有 MCP 请求和响应是否符合声明的模式：

```typescript
// 请求验证（简化版）
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // 按 JSON 模式验证参数
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // 检查字符串参数中的注入模式
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

模式验证在请求到达外部服务器之前捕获格式错误的请求，并标记字符串参数中的潜在注入模式。

## 企业控制

企业部署对 MCP 服务器管理有额外的控制：

- **管理员管理的服务器注册表**——只有管理员批准的 MCP 服务器才能被分级
- **按部门的工具权限**——不同团队可以有不同的工具访问权限
- **合规日志**——所有 MCP 交互可在合规仪表板中查看
- **速率限制**——按服务器和按工具的速率限制
- **服务器健康监控**——Gateway 追踪服务器可用性和响应时间
