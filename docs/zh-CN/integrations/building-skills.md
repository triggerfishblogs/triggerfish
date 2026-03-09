# 构建技能

本指南将引导您从头创建一个 Triggerfish 技能——从编写 `SKILL.md` 文件到测试它并获得批准。

## 您将构建什么

技能是一个包含 `SKILL.md` 文件的文件夹，教智能体如何做某件事。在本指南结束时，您将拥有一个智能体可以发现和使用的可工作技能。

## 技能解剖

每个技能都是一个根目录下有 `SKILL.md` 的目录：

```
my-skill/
  SKILL.md           # 必需：前置元数据 + 指令
  template.md        # 可选：技能引用的模板
  helper.ts          # 可选：支持代码
```

`SKILL.md` 文件有两个部分：

1. **YAML 前置元数据**（在 `---` 分隔符之间）——关于技能的元数据
2. **Markdown 正文**——智能体读取的指令

## 第 1 步：编写前置元数据

前置元数据声明技能做什么、需要什么以及适用的安全约束。

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, and flag PRs needing review.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---
```

### 必填字段

| 字段          | 描述                                              | 示例            |
| ------------- | ------------------------------------------------- | --------------- |
| `name`        | 唯一标识符。小写，用连字符分隔。                  | `github-triage` |
| `description` | 技能做什么以及何时使用。1-3 句话。                | 见上文          |

### 可选字段

| 字段                     | 描述                        | 默认值   |
| ------------------------ | --------------------------- | -------- |
| `classification_ceiling` | 最大数据敏感级别            | `PUBLIC` |
| `requires_tools`         | 技能需要访问的工具          | `[]`     |
| `network_domains`        | 技能访问的外部域名          | `[]`     |

其他字段如 `version`、`category`、`tags` 和 `triggers` 可以包含用于文档和未来使用。技能加载器会静默忽略它不识别的字段。

### 选择分级上限

分级上限是您的技能将处理的最大数据敏感度。选择能满足需求的最低级别：

| 级别           | 何时使用                    | 示例                                           |
| -------------- | --------------------------- | ---------------------------------------------- |
| `PUBLIC`       | 仅使用公开可用的数据        | Web 搜索、公共 API 文档、天气                  |
| `INTERNAL`     | 处理内部项目数据            | 代码分析、配置审查、内部文档                   |
| `CONFIDENTIAL` | 处理个人或私有数据          | 邮件摘要、GitHub 通知、CRM 查询                |
| `RESTRICTED`   | 访问高度敏感数据            | 密钥管理、安全审计、合规                       |

::: warning 如果您的技能上限超过用户配置的上限，技能创作 API 将拒绝它。始终使用必要的最低级别。 :::

## 第 2 步：编写指令

Markdown 正文是智能体用来学习如何执行技能的内容。使其可操作且具体。

### 结构模板

```markdown
# Skill Name

One-line purpose statement.

## When to Use

- Condition 1 (user asks for X)
- Condition 2 (triggered by cron)
- Condition 3 (related keyword detected)

## Steps

1. First action with specific details
2. Second action with specific details
3. Process and format the results
4. Deliver to the configured channel

## Output Format

Describe how results should be formatted.

## Common Mistakes

- Don't do X because Y
- Always check Z before proceeding
```

### 最佳实践

- **从目的开始**：一句话解释技能做什么
- **包含"何时使用"**：帮助智能体决定何时激活技能
- **要具体**："获取过去 24 小时的未读邮件"比"获取邮件"更好
- **使用代码示例**：展示确切的 API 调用、数据格式、命令模式
- **添加表格**：选项、端点、参数的快速参考
- **包含错误处理**：当 API 调用失败或数据缺失时该怎么做
- **以"常见错误"结尾**：防止智能体重复已知问题

## 第 3 步：测试发现

验证您的技能可被技能加载器发现。如果您将其放在内置目录中：

```typescript
import { createSkillLoader } from "../src/skills/loader.ts";

const loader = createSkillLoader({
  directories: ["skills/bundled"],
  dirTypes: { "skills/bundled": "bundled" },
});

const skills = await loader.discover();
const mySkill = skills.find((s) => s.name === "github-triage");
console.log(mySkill);
// { name: "github-triage", classificationCeiling: "CONFIDENTIAL", ... }
```

检查：

- 技能出现在已发现列表中
- `name` 与前置元数据匹配
- `classificationCeiling` 正确
- `requiresTools` 和 `networkDomains` 已填充

## 智能体自主创作

智能体可以使用 `SkillAuthor` API 以编程方式创建技能。这是智能体在被要求做新事情时扩展自己的方式。

### 工作流

```
1. 用户： "我需要你每天早上检查 Notion 中的新任务"
2. 智能体：使用 SkillAuthor 在其工作区创建技能
3. 技能： 进入 PENDING_APPROVAL 状态
4. 用户： 收到通知，审核技能
5. 用户： 批准 → 技能变为活动状态
6. 智能体：将技能连接到晨间定时计划
```

### 使用 SkillAuthor API

```typescript
import { createSkillAuthor } from "triggerfish/skills";

const author = createSkillAuthor({
  skillsDir: workspace.skillsPath,
  userCeiling: "CONFIDENTIAL",
});

const result = await author.create({
  name: "notion-tasks",
  description: "Check Notion for new tasks and summarize them daily",
  classificationCeiling: "INTERNAL",
  requiresTools: ["browser"],
  networkDomains: ["api.notion.com"],
  content: `# Notion Task Checker

## When to Use

- Morning cron trigger
- User asks about pending tasks

## Steps

1. Fetch tasks from Notion API using the user's integration token
2. Filter for tasks created or updated in the last 24 hours
3. Categorize by priority (P0, P1, P2)
4. Format as a concise bullet-point summary
5. Deliver to the configured channel
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### 审批状态

| 状态               | 含义                       |
| ------------------ | -------------------------- |
| `PENDING_APPROVAL` | 已创建，等待所有者审核     |
| `APPROVED`         | 所有者已批准，技能处于活动 |
| `REJECTED`         | 所有者已拒绝，技能未激活   |

::: warning 安全 智能体不能批准自己的技能。这在 API 级别执行。所有智能体创作的技能在激活前都需要明确的所有者确认。 :::

## 安全扫描

在激活前，技能会通过安全扫描器检查提示注入模式：

- "Ignore all previous instructions"——提示注入
- "You are now a..."——身份重定义
- "Reveal secrets/credentials"——数据泄露尝试
- "Bypass security/policy"——安全规避
- "Sudo/admin/god mode"——权限提升

被扫描器标记的技能包含警告，所有者必须在批准前审核。

## 触发器

技能可以在前置元数据中定义自动触发器：

```yaml
triggers:
  - cron: "0 7 * * *" # 每天早上 7 点
  - cron: "*/30 * * * *" # 每 30 分钟
```

调度器读取这些定义并在指定时间唤醒智能体执行技能。您可以将触发器与 `triggerfish.yaml` 中的静默时段结合使用，以防止在特定时段执行。

## 完整示例

这是一个用于分类 GitHub 通知的完整技能：

```
github-triage/
  SKILL.md
```

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, flag PRs needing review. Use when the user
  asks about GitHub activity or on the hourly cron.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---

# GitHub Triage

Review and categorize GitHub notifications, issues, and pull requests.

## When to Use

- User asks "what's happening on GitHub?"
- Hourly cron trigger
- User asks about specific repo activity

## Steps

1. Fetch notifications from GitHub API using the user's token
2. Categorize: PRs needing review, new issues, mentions, CI failures
3. Prioritize by label: bug > security > feature > question
4. Summarize top items with direct links
5. Flag anything assigned to the user

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- Don't fetch all notifications — filter by `since` parameter for the last hour
- Always check rate limits before making multiple API calls
- Include direct links to every item for quick action
```

## 技能检查清单

在认为技能完成之前：

- [ ] 文件夹名称与前置元数据中的 `name` 匹配
- [ ] 描述解释了**做什么**以及**何时使用**
- [ ] 分级上限是能满足需求的最低级别
- [ ] 所有必需工具列在 `requires_tools` 中
- [ ] 所有外部域名列在 `network_domains` 中
- [ ] 指令具体且分步骤
- [ ] 代码示例使用 Triggerfish 模式（Result 类型、工厂函数）
- [ ] 指定了输出格式
- [ ] 包含常见错误部分
- [ ] 技能可被加载器发现（已测试）
