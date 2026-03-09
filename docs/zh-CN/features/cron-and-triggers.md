# 定时任务和触发器

Triggerfish 智能体不限于被动的问答。定时任务和触发器系统支持主动行为：计划任务、定期检查、晨报、后台监控和自主多步骤工作流。

## 定时任务

定时任务是具有固定指令、投递渠道和分类上限的计划任务。它们使用标准 cron 表达式语法。

### 配置

在 `triggerfish.yaml` 中定义定时任务，或让智能体通过 cron 工具在运行时管理：

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 每天早上 7 点
        task: "准备包含日历、未读邮件和天气的晨报"
        channel: telegram # 投递到哪里
        classification: INTERNAL # 此任务的最大 taint

      - id: pipeline-check
        schedule: "0 */4 * * *" # 每 4 小时
        task: "检查 Salesforce 销售漏斗变化"
        channel: slack
        classification: CONFIDENTIAL
```

### 工作原理

1. **CronManager** 解析标准 cron 表达式并维护一个跨重启持久化的任务注册表。
2. 任务触发时，**OrchestratorFactory** 为该次执行创建一个隔离的编排器和会话。
3. 任务在**后台会话工作区**中运行，具有自己的 taint 跟踪。
4. 输出投递到配置的渠道，受该渠道分类规则约束。
5. 执行历史被记录用于审计。

### 智能体管理的定时任务

智能体可以通过 `cron` 工具创建和管理自己的定时任务：

| 操作 | 描述 | 安全 |
| -------------- | ----------------------- | ------------------------------------------- |
| `cron.list` | 列出所有计划任务 | 仅所有者 |
| `cron.create` | 调度新任务 | 仅所有者，执行分类上限 |
| `cron.delete` | 移除计划任务 | 仅所有者 |
| `cron.history` | 查看过去执行 | 保留审计跟踪 |

::: warning 定时任务创建需要所有者认证。智能体不能代表外部用户调度任务或超过配置的分类上限。 :::

### CLI 定时任务管理

定时任务也可以直接从命令行管理：

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

`--classification` 标志设置任务的分类上限。有效级别为 `PUBLIC`、`INTERNAL`、`CONFIDENTIAL` 和 `RESTRICTED`。如果省略，默认为 `INTERNAL`。

## 触发器系统

触发器是周期性的"签到"循环，智能体在其中唤醒以评估是否需要主动行动。与具有固定任务的定时任务不同，触发器赋予智能体决定需要关注什么的裁量权。

### TRIGGER.md

`TRIGGER.md` 定义智能体在每次唤醒时应检查的内容。它位于 `~/.triggerfish/config/TRIGGER.md`，是一个自由格式的 markdown 文件，你可以在其中指定监控优先级、升级规则和主动行为。

如果 `TRIGGER.md` 不存在，智能体使用其通用知识来决定需要关注什么。

**示例 TRIGGER.md：**

```markdown
# TRIGGER.md -- 每次唤醒时检查的内容

## 优先检查

- 所有渠道中超过 1 小时的未读消息
- 接下来 24 小时的日历冲突
- Linear 或 Jira 中逾期的任务

## 监控

- GitHub：等待我审查的 PR
- 电子邮件：VIP 联系人的任何内容（标记为立即通知）
- Slack：#incidents 频道中的提及

## 主动

- 如果是早上（7-9 点），准备每日简报
- 如果是周五下午，起草每周摘要
```

### 触发器配置

触发器时间和约束在 `triggerfish.yaml` 中设置：

```yaml
scheduler:
  trigger:
    enabled: true # 设为 false 以禁用触发器（默认：true）
    interval_minutes: 30 # 每 30 分钟检查一次（默认：30）
    # 设为 0 以在不移除配置的情况下禁用触发器
    classification_ceiling: CONFIDENTIAL # 最大 taint 上限（默认：CONFIDENTIAL）
    quiet_hours:
      start: 22 # 22 点到 ...
      end: 7 # ... 早上 7 点之间不唤醒
```

| 设置 | 描述 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled` | 是否激活周期性触发器唤醒。设为 `false` 以禁用。 |
| `interval_minutes` | 智能体唤醒检查触发器的频率（分钟）。默认：`30`。设为 `0` 以在不移除配置块的情况下禁用触发器。 |
| `classification_ceiling` | 触发器会话可以达到的最大分类级别。默认：`CONFIDENTIAL`。 |
| `quiet_hours.start` / `quiet_hours.end` | 抑制触发器的小时范围（24 小时制）。 |

::: tip 要临时禁用触发器，设置 `interval_minutes: 0`。这等同于 `enabled: false`，让你保留其他触发器设置以便于重新启用。 :::

### 触发器执行

每次触发器唤醒按以下序列进行：

1. 调度器在配置的间隔触发。
2. 以 `PUBLIC` taint 生成一个新的后台会话。
3. 智能体读取 `TRIGGER.md` 获取监控指令。
4. 智能体评估每个检查项，使用可用工具和 MCP 服务器。
5. 如果需要操作，智能体采取行动——发送通知、创建任务或投递摘要。
6. 会话的 taint 可能随着访问分类数据而升级，但不能超过配置的上限。
7. 会话完成后被归档。

::: tip 触发器和定时任务相互补充。使用定时任务执行不论条件都应在确切时间运行的任务（早上 7 点的晨报）。使用触发器进行需要判断的监控（每 30 分钟检查是否有需要我注意的事情）。 :::

## 触发器上下文工具

智能体可以使用 `trigger_add_to_context` 工具将触发器结果加载到当前对话中。当用户询问上次触发器唤醒期间检查的内容时，这很有用。

### 用法

| 参数 | 默认值 | 描述 |
| --------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `source` | `"trigger"` | 加载哪个触发器输出：`"trigger"`（周期性）、`"cron:<job-id>"`或`"webhook:<source>"` |

该工具加载指定来源的最近执行结果并添加到对话上下文中。

### 降级写入执行

触发器上下文注入遵守禁止降级写入规则：

- 如果触发器的分类**超过**会话 taint，会话 taint **升级**以匹配
- 如果会话 taint **超过**触发器的分类，注入被**允许**——较低分类的数据始终可以流入较高分类的会话（正常的 `canFlowTo` 行为）。会话 taint 不变。

::: info CONFIDENTIAL 会话可以毫无问题地加载 PUBLIC 触发器结果——数据向上流动。相反（将 CONFIDENTIAL 触发器数据注入具有 PUBLIC 上限的会话）会将会话 taint 升级到 CONFIDENTIAL。 :::

### 持久化

触发器结果通过 `StorageProvider` 存储，键格式为 `trigger:last:<source>`。每个来源仅保留最近的结果。

## 安全集成

所有计划执行都与核心安全模型集成：

- **隔离会话** —— 每个定时任务和触发器唤醒在自己生成的会话中运行，具有独立的 taint 跟踪。
- **分类上限** —— 后台任务不能超过其配置的分类级别，即使它们调用的工具返回更高分类的数据。
- **策略 hook** —— 计划任务内的所有操作与交互式会话一样通过相同的执行 hook（PRE_TOOL_CALL、POST_TOOL_RESPONSE、PRE_OUTPUT）。
- **渠道分类** —— 输出投递遵守目标渠道的分类级别。`CONFIDENTIAL` 结果不能发送到 `PUBLIC` 渠道。
- **审计跟踪** —— 每次计划执行都记录完整上下文：任务 ID、会话 ID、taint 历史、采取的操作和投递状态。
- **持久化** —— 定时任务通过 `StorageProvider`（命名空间：`cron:`）存储并在 Gateway 重启后保留。
