# 浏览器自动化

Triggerfish 通过使用 CDP（Chrome DevTools Protocol）的专用托管 Chromium 实例提供深度浏览器控制。智能体可以浏览网页、与页面交互、填写表单、截取屏幕截图并自动化 Web 工作流——全部在策略执行下进行。

## 架构

浏览器自动化基于 `puppeteer-core` 构建，通过 CDP 连接到托管的 Chromium 实例。每个浏览器操作在到达浏览器之前都通过策略层。

Triggerfish 自动检测基于 Chromium 的浏览器，包括 **Google Chrome**、**Chromium** 和 **Brave**。检测覆盖 Linux、macOS、Windows 和 Flatpak 环境的标准安装路径。

::: info `browser_navigate` 工具需要 `http://` 或 `https://` URL。浏览器内部协议（如 `chrome://`、`brave://`、`about:`）不受支持，将返回错误并指导使用 Web URL。 :::

<img src="/diagrams/browser-automation-flow.svg" alt="浏览器自动化流程：智能体 → 浏览器工具 → 策略层 → CDP → 托管 Chromium" style="max-width: 100%;" />

浏览器配置文件按智能体隔离。托管的 Chromium 实例不与您的个人浏览器共享 Cookie、会话或本地存储。凭据自动填充默认禁用。

## 可用操作

| 操作       | 描述                                       | 示例用途                                  |
| ---------- | ------------------------------------------ | ----------------------------------------- |
| `navigate` | 导航到 URL（受域策略约束）                 | 打开网页进行研究                          |
| `snapshot` | 截取页面截图                               | 记录 UI 状态，提取视觉信息               |
| `click`    | 点击页面上的元素                           | 提交表单，激活按钮                        |
| `type`     | 在输入字段中输入文本                       | 填写搜索框，完成表单                      |
| `select`   | 从下拉菜单中选择选项                       | 从菜单中选择                              |
| `upload`   | 向表单上传文件                             | 附加文档                                  |
| `evaluate` | 在页面上下文中运行 JavaScript（沙箱化的）  | 提取数据，操作 DOM                        |
| `wait`     | 等待元素或条件                             | 确保页面在交互前已加载                    |

## 域策略执行

智能体导航的每个 URL 在浏览器操作之前都会根据域允许列表和拒绝列表进行检查。

### 配置

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### 域策略的工作方式

1. 智能体调用 `browser.navigate("https://github.com/org/repo")`
2. `PRE_TOOL_CALL` 钩子以 URL 作为上下文触发
3. 策略引擎根据允许/拒绝列表检查域名
4. 如果被拒绝或不在允许列表上，导航被**阻止**
5. 如果允许，查找域分级
6. 会话污染升级以匹配域分级
7. 导航继续

::: warning 安全 如果域不在允许列表上，导航默认被阻止。LLM 不能覆盖域策略。这防止智能体访问可能暴露敏感数据或触发不需要的操作的任意网站。 :::

## 截图和分级

通过 `browser.snapshot` 截取的截图继承会话当前的污染级别。如果会话被标记为 `CONFIDENTIAL`，该会话的所有截图都被分级为 `CONFIDENTIAL`。

这对输出策略很重要。被分级为 `CONFIDENTIAL` 的截图不能发送到 `PUBLIC` 渠道。`PRE_OUTPUT` 钩子在边界处执行此规则。

## 抓取内容和血统

当智能体从网页提取内容（通过 `evaluate`、读取文本或解析元素）时，提取的数据：

- 根据域的分配分级级别被分级
- 创建追踪来源 URL、提取时间和分级的血统记录
- 贡献于会话污染（污染升级以匹配内容分级）

此血统追踪意味着您始终可以追溯数据的来源，即使它是几周前从网页上抓取的。

## 安全控制

### 每个智能体的浏览器隔离

每个智能体都有自己的浏览器配置文件。这意味着：

- 智能体之间没有共享 Cookie
- 没有共享的本地存储或会话存储
- 不能访问主机浏览器的 Cookie 或会话
- 凭据自动填充默认禁用
- 浏览器扩展不加载

### 策略钩子集成

所有浏览器操作通过标准策略钩子：

| 钩子                 | 触发时机                       | 检查内容                                      |
| -------------------- | ------------------------------ | --------------------------------------------- |
| `PRE_TOOL_CALL`      | 每个浏览器操作之前             | 域允许列表、URL 策略、操作权限                |
| `POST_TOOL_RESPONSE` | 浏览器返回数据之后             | 分级响应、更新会话污染、创建血统              |
| `PRE_OUTPUT`         | 浏览器内容离开系统时           | 针对目标的分级检查                            |

### 资源限制

- 导航超时防止浏览器无限期挂起
- 页面加载大小限制防止过度内存消耗
- 每个智能体执行并发标签页限制

## 企业控制

企业部署有额外的浏览器自动化控制：

| 控制                       | 描述                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| 域级分级                   | 内网域自动被分级为 `INTERNAL`                                      |
| 被阻止域列表               | 管理员管理的被禁止域列表                                           |
| 截图保留策略               | 截取的截图存储多长时间                                             |
| 浏览器会话审计日志         | 完整记录所有浏览器操作用于合规                                     |
| 禁用浏览器自动化           | 管理员可以完全禁用特定智能体或角色的浏览器工具                     |

## 示例：Web 研究工作流

使用浏览器自动化的典型智能体工作流：

```
1. 用户：  "调研 example-competitor.com 上的竞争对手定价"

2. 智能体：browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL：域"example-competitor.com"根据允许列表检查
          -> 允许，分级为 PUBLIC
          -> 导航继续

3. 智能体：browser.snapshot()
          -> 截取截图，以会话污染级别（PUBLIC）分级

4. 智能体：browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> 提取文本，分级为 PUBLIC
          -> 创建血统记录：source=example-competitor.com/pricing

5. 智能体：汇总定价信息并返回给用户
          -> PRE_OUTPUT：PUBLIC 数据到用户渠道——允许
```

每一步都被记录、分级和可审计。
