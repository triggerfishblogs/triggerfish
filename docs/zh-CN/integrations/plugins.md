# Plugin SDK 与沙箱

Triggerfish plugin 让您可以用与外部系统交互的自定义代码来扩展智能体——CRM 查询、数据库操作、API 集成、多步骤工作流——同时在双重沙箱中运行，防止代码做任何未被明确允许的事情。

## 运行时环境

Plugin 在 Deno + Pyodide（WASM）上运行。无 Docker。无容器。除 Triggerfish 安装本身外无需任何先决条件。

- **TypeScript plugin** 直接在 Deno 沙箱中运行
- **Python plugin** 在 Pyodide（编译为 WebAssembly 的 Python 解释器）中运行，而 Pyodide 本身在 Deno 沙箱中运行

<img src="/diagrams/plugin-sandbox.svg" alt="Plugin 沙箱：Deno 沙箱包裹 WASM 沙箱，plugin 代码在最内层运行" style="max-width: 100%;" />

这种双重沙箱架构意味着即使 plugin 包含恶意代码，它也无法访问文件系统、进行未声明的网络调用或逃逸到主机系统。

## Plugin 能做什么

Plugin 在严格边界内有灵活的内部空间。在沙箱内，您的 plugin 可以：

- 对目标系统执行完整的 CRUD 操作（使用用户的权限）
- 执行复杂的查询和数据转换
- 编排多步骤工作流
- 处理和分析数据
- 跨调用维护 plugin 状态
- 调用任何已声明的外部 API 端点

## Plugin 不能做什么

| 约束                               | 如何执行                                                    |
| ---------------------------------- | ----------------------------------------------------------- |
| 访问未声明的网络端点               | 沙箱阻止所有不在允许列表上的网络调用                        |
| 发出没有分级标签的数据             | SDK 拒绝未分级的数据                                        |
| 读取数据而不传播污染               | SDK 在数据被访问时自动污染会话                              |
| 在 Triggerfish 之外持久化数据      | 沙箱内没有文件系统访问权限                                  |
| 通过旁路通道泄露数据               | 执行资源限制，没有原始套接字访问                            |
| 使用系统凭据                       | SDK 阻止 `get_system_credential()`；只允许用户凭据          |

::: warning 安全 `sdk.get_system_credential()` 被**设计为阻止**。Plugin 必须始终通过 `sdk.get_user_credential()` 使用委托的用户凭据。这确保智能体只能访问用户可以访问的内容——永远不会更多。 :::

## Plugin SDK 方法

SDK 为 plugin 与外部系统和 Triggerfish 平台的交互提供了受控接口。

### 凭据访问

```typescript
// 获取用户对某个服务的委托凭据
const credential = await sdk.get_user_credential("salesforce");

// 检查用户是否已连接某个服务
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)` 检索用户对指定服务的 OAuth 令牌或 API 密钥。如果用户尚未连接该服务，调用返回 `null`，plugin 应优雅地处理这种情况。

### 数据操作

```typescript
// 使用用户的权限查询外部系统
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// 将数据发送回智能体——分级标签是必需的
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info 每次调用 `sdk.emitData()` 都需要 `classification` 标签。如果省略，SDK 会拒绝调用。这确保从 plugin 流入智能体上下文的所有数据都被正确分级。 :::

### 连接检查

```typescript
// 检查用户是否与某个服务有活动连接
if (await sdk.has_user_connection("github")) {
  const repos = await sdk.query_as_user("github", {
    endpoint: "/user/repos",
  });
  sdk.emitData({
    classification: "INTERNAL",
    payload: repos,
    source: "github",
  });
}
```

## Plugin 生命周期

每个 plugin 都遵循一个确保激活前安全审核的生命周期。

```
1. Plugin 创建（由用户、智能体或第三方）
       |
       v
2. 使用 Plugin SDK 构建 Plugin
   - 必须实现所需接口
   - 必须声明端点和能力
   - 必须通过验证
       |
       v
3. Plugin 进入 UNTRUSTED 状态
   - 智能体不能使用它
   - 通知所有者/管理员："等待分级"
       |
       v
4. 所有者（个人）或管理员（企业）审核：
   - 此 plugin 访问什么数据？
   - 它可以执行什么操作？
   - 分配分级级别
       |
       v
5. Plugin 以分配的分级级别激活
   - 智能体可以在策略约束内调用
   - 所有调用通过策略钩子
```

::: tip 在个人层级中，您就是所有者——您审核和分级自己的 plugin。在企业层级中，管理员管理 plugin 注册表并分配分级级别。 :::

## 数据库连接

原生数据库驱动（psycopg2、mysqlclient 等）在 WASM 沙箱内无法工作。Plugin 通过基于 HTTP 的 API 连接数据库。

| 数据库     | 基于 HTTP 的选项                  |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST、Supabase SDK、Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK（HTTP）                   |

这是一个安全优势，而非限制。所有数据库访问通过可检查、可控制的 HTTP 请求流转，沙箱可以执行，审计系统可以记录。

## 编写 TypeScript Plugin

一个查询 REST API 的最小 TypeScript plugin：

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // 检查用户是否已连接该服务
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // 使用用户的凭据查询
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // 将分级数据发送回智能体
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## 编写 Python Plugin

一个最小的 Python plugin：

```python
async def execute(sdk):
    # 检查连接
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # 使用用户的凭据查询
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # 带分级发送
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

Python plugin 在 Pyodide WASM 运行时中运行。标准库模块可用，但原生 C 扩展不可用。使用基于 HTTP 的 API 进行外部连接。

## Plugin 安全摘要

- Plugin 在双重沙箱（Deno + WASM）中运行，具有严格隔离
- 所有网络访问必须在 plugin 清单中声明
- 所有发出的数据必须携带分级标签
- 系统凭据被阻止——只有用户委托的凭据可用
- 每个 plugin 以 `UNTRUSTED` 状态进入系统，使用前必须被分级
- 所有 plugin 调用通过策略钩子并被完整审计
