# 策略引擎与 Hook

策略引擎是位于 LLM 和外部世界之间的执行层。它在数据流的关键点拦截每个操作，做出确定性的 ALLOW、BLOCK 或 REDACT 决策。LLM 不能绕过、修改或影响这些决策。

## 核心原则：LLM 之下的执行

<img src="/diagrams/policy-enforcement-layers.svg" alt="策略执行层：LLM 位于策略层之上，策略层位于执行层之上" style="max-width: 100%;" />

::: warning 安全 LLM 位于策略层之上。它可以被提示注入、越狱或操纵——这无关紧要。策略层是运行在 LLM 之下的纯代码，检查结构化的操作请求并根据分类规则做出二元决策。从 LLM 输出到 hook 绕过没有通路。 :::

## Hook 类型

八个执行 hook 在数据流的每个关键点拦截操作。

### Hook 架构

<img src="/diagrams/hook-chain-flow.svg" alt="Hook 链流程：PRE_CONTEXT_INJECTION → LLM 上下文 → PRE_TOOL_CALL → 工具执行 → POST_TOOL_RESPONSE → LLM 响应 → PRE_OUTPUT → 输出渠道" style="max-width: 100%;" />

### 所有 Hook 类型

| Hook | 触发条件 | 关键操作 | 失败模式 |
| ----------------------- | ------------------------------ | ---------------------------------------------------------------- | -------------------- |
| `PRE_CONTEXT_INJECTION` | 外部输入进入上下文 | 对输入分类、分配 taint、创建溯源、扫描注入 | 拒绝输入 |
| `PRE_TOOL_CALL` | LLM 请求工具执行 | 权限检查、速率限制、参数验证 | 阻止工具调用 |
| `POST_TOOL_RESPONSE` | 工具返回数据 | 对响应分类、更新会话 taint、创建/更新溯源 | 编辑或阻止 |
| `PRE_OUTPUT` | 响应即将离开系统 | 对目标进行最终分类检查、PII 扫描 | 阻止输出 |
| `SECRET_ACCESS` | Plugin 请求凭证 | 记录访问、验证权限与声明范围 | 拒绝凭证 |
| `SESSION_RESET` | 用户请求 taint 重置 | 归档溯源、清除上下文、验证确认 | 要求确认 |
| `AGENT_INVOCATION` | 智能体调用另一个智能体 | 验证委托链、执行 taint 上限 | 阻止调用 |
| `MCP_TOOL_CALL` | MCP 服务器工具被调用 | Gateway 策略检查（服务器状态、工具权限、模式） | 阻止 MCP 调用 |

## Hook 接口

每个 hook 接收上下文并返回结果。处理器是同步的纯函数。

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hook 特定的负载因类型而异
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` 是同步的，直接返回 `HookResult`——不是 Promise。这是设计使然。Hook 必须在操作继续之前完成，使其同步消除了任何异步绕过的可能性。如果 hook 超时，操作被拒绝。 :::

## Hook 保证

每次 hook 执行都有四个不变量：

| 保证 | 含义 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **确定性** | 相同输入始终产生相同决策。没有随机性。hook 内部没有 LLM 调用。没有影响决策的外部 API 调用。 |
| **同步** | Hook 在操作继续之前完成。没有异步绕过的可能。超时等于拒绝。 |
| **有日志记录** | 每次 hook 执行都被记录：输入参数、所做决策、时间戳和评估的策略规则。 |
| **不可伪造** | LLM 输出不能包含 hook 绕过指令。Hook 层没有"解析 LLM 输出寻找命令"的逻辑。 |

## 策略规则层级

策略规则按三个层级组织。更高层级不能覆盖更低层级。

### 固定规则（始终执行，不可配置）

这些规则是硬编码的，不能被任何管理员、用户或配置禁用：

- **禁止降级写入**：分类流向是单向的。数据不能流向更低级别。
- **UNTRUSTED 渠道**：不允许数据进出。
- **会话 taint**：一旦升级，在会话生命周期内保持升级。
- **审计日志**：所有操作都被记录。无例外。无法禁用。

### 可配置规则（管理员可调）

管理员可以通过界面或配置文件调整这些：

- 集成默认分类（例如 Salesforce 默认为 `CONFIDENTIAL`）
- 渠道分类
- 每个集成的操作允许/拒绝列表
- 外部通信的域名允许列表
- 按工具、按用户或按会话的速率限制

### 声明式例外规则（企业版）

企业部署可以在结构化 YAML 中为高级场景定义自定义策略规则：

```yaml
# 阻止包含身份证号模式的任何 Salesforce 查询
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[身份证号已编辑]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# 高价值交易需要审批
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# 基于时间的限制：工作时间外不允许外部发送
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "工作时间外限制外部通信"
```

::: tip 自定义 YAML 规则必须在激活前通过验证。无效规则在配置时被拒绝，而非运行时。这防止错误配置造成安全缺口。 :::

## 拒绝用户体验

当策略引擎阻止某个操作时，用户会看到清晰的解释——而非通用错误。

**默认（具体）：**

```
我无法将机密数据发送到公共渠道。

  -> 重置会话并发送消息
  -> 取消
```

**可选（教育性）：**

```
我无法将机密数据发送到公共渠道。

原因：此会话访问了 Salesforce（CONFIDENTIAL）。
WhatsApp 个人版被分类为 PUBLIC。
数据只能流向相同或更高的分类级别。

选项：
  -> 重置会话并发送消息
  -> 请管理员重新分类 WhatsApp 渠道
  -> 了解更多：[文档链接]
```

教育模式是可选的，帮助用户理解_为什么_操作被阻止，包括哪个数据源导致了 taint 升级以及分类不匹配是什么。两种模式都提供可操作的后续步骤，而非死胡同错误。

## Hook 如何链接

在典型的请求/响应周期中，多个 hook 按顺序触发。每个 hook 都能完全看到链中较早 hook 所做的决策。

```
用户发送："检查我的 Salesforce 销售漏斗并给我妻子发消息"

1. PRE_CONTEXT_INJECTION
   - 来自所有者的输入，分类为 PUBLIC
   - 会话 taint：PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - 工具允许？是
   - 用户有 Salesforce 连接？是
   - 速率限制？正常
   - 决策：ALLOW

3. POST_TOOL_RESPONSE (salesforce 结果)
   - 数据分类：CONFIDENTIAL
   - 会话 taint 升级：PUBLIC -> CONFIDENTIAL
   - 创建溯源记录

4. PRE_TOOL_CALL (whatsapp.send_message)
   - 工具允许？是
   - 决策：ALLOW（工具级检查通过）

5. PRE_OUTPUT (通过 WhatsApp 给妻子的消息)
   - 会话 taint：CONFIDENTIAL
   - 目标有效分类：PUBLIC（外部接收者）
   - CONFIDENTIAL -> PUBLIC：已阻止
   - 决策：BLOCK
   - 原因："classification_violation"

6. 智能体向用户提供重置选项
```
