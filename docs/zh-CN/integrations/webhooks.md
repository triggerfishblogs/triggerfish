# Webhooks

Triggerfish 可以接受来自外部服务的入站事件，实现对邮件、错误警报、CI/CD 事件、日历变更等的实时响应。Webhooks 将您的智能体从被动的问答系统转变为工作流的主动参与者。

## Webhooks 的工作原理

外部服务向 Triggerfish Gateway 上注册的 webhook 端点发送 HTTP POST 请求。每个传入事件都经过真实性验证、分级和路由到智能体处理。

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook 管道：外部服务通过 HMAC 验证、分级、会话隔离和策略钩子发送 HTTP POST 到智能体处理" style="max-width: 100%;" />

## 支持的事件来源

Triggerfish 可以从任何支持 HTTP webhook 交付的服务接收 webhooks。常见集成包括：

| 来源     | 机制                   | 示例事件                             |
| -------- | ---------------------- | ------------------------------------ |
| Gmail    | Pub/Sub 推送通知       | 新邮件、标签变更                     |
| GitHub   | Webhook                | PR 打开、问题评论、CI 失败           |
| Sentry   | Webhook                | 错误警报、检测到回归                 |
| Stripe   | Webhook                | 收到付款、订阅变更                   |
| 日历     | 轮询或推送             | 事件提醒、检测到冲突                 |
| 自定义   | 通用 webhook 端点      | 任何 JSON 载荷                       |

## 配置

Webhook 端点在 `triggerfish.yaml` 中配置：

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret 存储在操作系统密钥链中
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret 存储在操作系统密钥链中
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secret 存储在操作系统密钥链中
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### 配置字段

| 字段              | 必填 | 描述                                           |
| ----------------- | :--: | ---------------------------------------------- |
| `id`              |  是  | 此 webhook 端点的唯一标识符                    |
| `path`            |  是  | 端点注册的 URL 路径                            |
| `secret`          |  是  | 用于 HMAC 签名验证的共享密钥                   |
| `classification`  |  是  | 分配给来自此来源的事件的分级级别               |
| `actions`         |  是  | 事件到任务的映射列表                           |
| `actions[].event` |  是  | 要匹配的事件类型模式                           |
| `actions[].task`  |  是  | 智能体要执行的自然语言任务                     |

::: tip Webhook 密钥存储在操作系统密钥链中。运行 `triggerfish dive` 或交互式配置 webhook 来安全输入它们。 :::

## HMAC 签名验证

每个入站 webhook 请求在载荷处理前都会使用 HMAC 签名验证进行真实性验证。

### 验证的工作方式

1. 外部服务发送带有签名头（例如 GitHub 的 `X-Hub-Signature-256`）的 webhook
2. Triggerfish 使用配置的共享密钥计算请求体的 HMAC
3. 将计算的签名与请求头中的签名进行比较
4. 如果签名不匹配，请求被**立即拒绝**
5. 如果验证通过，载荷继续进行分级和处理

<img src="/diagrams/hmac-verification.svg" alt="HMAC 验证流程：检查签名存在、计算 HMAC、比较签名、拒绝或继续" style="max-width: 100%;" />

::: warning 安全 没有有效 HMAC 签名的 webhook 请求在任何处理发生之前就被拒绝。这防止伪造事件触发智能体操作。永远不要在生产中禁用签名验证。 :::

## 事件处理管道

一旦 webhook 事件通过签名验证，它会流经标准安全管道：

### 1. 分级

事件载荷按照 webhook 端点配置的级别进行分级。配置为 `CONFIDENTIAL` 的 webhook 端点产生 `CONFIDENTIAL` 事件。

### 2. 会话隔离

每个 webhook 事件生成自己的隔离会话。这意味着：

- 事件独立于任何进行中的对话进行处理
- 会话污染从新开始（在 webhook 的分级级别）
- webhook 触发的会话和用户会话之间没有数据泄漏
- 每个会话都有自己的污染追踪和血统

### 3. PRE_CONTEXT_INJECTION 钩子

事件载荷在进入智能体上下文之前通过 `PRE_CONTEXT_INJECTION` 钩子。此钩子：

- 验证载荷结构
- 对所有数据字段应用分级
- 为入站数据创建血统记录
- 扫描字符串字段中的注入模式
- 如果策略规则指示，可以阻止事件

### 4. 智能体处理

智能体接收已分级的事件并执行配置的任务。任务是自然语言指令——智能体使用其全部能力（工具、技能、浏览器、执行环境）在策略约束内完成它。

### 5. 输出投递

智能体的任何输出（消息、通知、操作）都通过 `PRE_OUTPUT` 钩子。禁止降级写入规则适用：来自 `CONFIDENTIAL` webhook 触发的会话的输出不能发送到 `PUBLIC` 渠道。

### 6. 审计

完整的事件生命周期被记录：接收、验证、分级、会话创建、智能体操作和输出决策。

## 与调度器的集成

Webhooks 自然地与 Triggerfish 的[定时任务和触发器系统](/zh-CN/features/cron-and-triggers)集成。webhook 事件可以：

- **提前触发现有定时任务**（例如，部署 webhook 触发立即健康检查）
- **创建新的计划任务**（例如，日历 webhook 安排提醒）
- **更新触发器优先级**（例如，Sentry 警报使智能体在下一次触发器唤醒时优先调查错误）

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # secret 存储在操作系统密钥链中
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # 智能体可以使用 cron.create 安排后续检查
```

## 安全摘要

| 控制                    | 描述                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| HMAC 验证               | 所有入站 webhook 在处理前经过验证                                             |
| 分级                    | Webhook 载荷按配置的级别分级                                                  |
| 会话隔离                | 每个事件获得自己的隔离会话                                                    |
| `PRE_CONTEXT_INJECTION` | 载荷在进入上下文前经过扫描和分级                                              |
| 禁止降级写入            | 来自高分级事件的输出不能到达低分级渠道                                        |
| 审计日志                | 完整的事件生命周期被记录                                                      |
| 不公开暴露              | Webhook 端点默认不暴露到公共互联网                                            |

## 示例：GitHub PR 审查循环

webhooks 实际应用的真实示例：智能体打开 PR，然后 GitHub webhook 事件驱动代码审查反馈循环，无需任何轮询。

### 工作方式

1. 智能体创建功能分支，提交代码，并通过 `gh pr create` 打开 PR
2. 智能体将追踪文件写入 `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`，包含分支名称、PR 编号和任务上下文
3. 智能体停止并等待——不轮询

当审查者发布反馈时：

4. GitHub 向 Triggerfish 发送 `pull_request_review` webhook
5. Triggerfish 验证 HMAC 签名、对事件分级并生成隔离会话
6. 智能体读取追踪文件以恢复上下文，检出分支，处理审查，提交、推送并在 PR 上评论
7. 步骤 4-6 重复直到审查被批准

当 PR 被合并时：

8. GitHub 发送 `pull_request.closed` webhook，带有 `merged: true`
9. 智能体清理：删除本地分支，归档追踪文件

### 配置

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret 存储在操作系统密钥链中
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

GitHub webhook 必须发送：`Pull requests`、`Pull request reviews`、`Pull request review comments` 和 `Issue comments`。

有关设置说明和完整的智能体工作流，请参阅完整的 [GitHub 集成](/zh-CN/integrations/github)指南和 `git-branch-management` 内置技能。

### 企业控制

- **Webhook 允许列表**由管理员管理——只有批准的外部来源可以注册端点
- **速率限制**每个端点以防止滥用
- **载荷大小限制**以防止内存耗尽
- **IP 允许列表**用于额外的来源验证
- **保留策略**用于 webhook 事件日志

::: info Webhook 端点默认不暴露到公共互联网。要使外部服务能够到达您的 Triggerfish 实例，您需要配置端口转发、反向代理或隧道。文档的[远程访问](/reference/)部分涵盖了安全暴露选项。 :::
