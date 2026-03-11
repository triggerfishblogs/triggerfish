# Google Workspace

连接您的 Google 账户，让智能体可以访问 Gmail、日历、任务、云端硬盘和表格。

## 前提条件

- 一个 Google 账户
- 一个带有 OAuth 凭据的 Google Cloud 项目

## 设置

### 第 1 步：创建 Google Cloud 项目

1. 前往 [Google Cloud 控制台](https://console.cloud.google.com/)
2. 点击顶部的项目下拉菜单并选择 **New Project**
3. 命名为"Triggerfish"（或您喜欢的任何名称）并点击 **Create**

### 第 2 步：启用 API

在您的项目中启用以下每个 API：

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

在每个页面上点击 **Enable**。每个项目只需执行一次。

### 第 3 步：配置 OAuth 同意屏幕

在创建凭据之前，Google 需要一个 OAuth 同意屏幕。这是用户授权访问时看到的屏幕。

1. 前往 [OAuth 同意屏幕](https://console.cloud.google.com/apis/credentials/consent)
2. 用户类型：选择 **External**（如果您在 Google Workspace 组织中且只希望组织用户使用，则选择 **Internal**）
3. 点击 **Create**
4. 填写必填字段：
   - **App name**："Triggerfish"（或您喜欢的任何名称）
   - **User support email**：您的邮箱地址
   - **Developer contact email**：您的邮箱地址
5. 点击 **Save and Continue**
6. 在 **Scopes** 屏幕上，点击 **Add or Remove Scopes** 并添加：
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. 点击 **Update**，然后 **Save and Continue**
8. 前往 **Audience** 页面（左侧栏中"OAuth consent screen"下方）——在这里您可以找到 **Test users** 部分
9. 点击 **+ Add Users** 并添加您自己的 Google 邮箱地址
10. 点击 **Save and Continue**，然后 **Back to Dashboard**

::: warning 当您的应用处于"Testing"状态时，只有您添加的测试用户才能授权。对于个人使用来说这没问题。发布应用会移除测试用户限制，但需要 Google 验证。 :::

### 第 4 步：创建 OAuth 凭据

1. 前往 [Credentials](https://console.cloud.google.com/apis/credentials)
2. 点击顶部的 **+ CREATE CREDENTIALS**
3. 选择 **OAuth client ID**
4. 应用类型：**Desktop app**
5. 名称："Triggerfish"（或您喜欢的任何名称）
6. 点击 **Create**
7. 复制 **Client ID** 和 **Client Secret**

### 第 5 步：连接

```bash
triggerfish connect google
```

系统会提示您输入：

1. 您的 **Client ID**
2. 您的 **Client Secret**

浏览器窗口将打开以便您授权访问。授权后，令牌安全地存储在操作系统密钥链中（macOS 钥匙串或 Linux libsecret）。凭据不会存储在配置文件或环境变量中。

### 断开连接

```bash
triggerfish disconnect google
```

从密钥链中移除所有 Google 令牌。您可以随时通过再次运行 `connect` 来重新连接。

## 可用工具

连接后，您的智能体可以访问 14 个工具：

| 工具              | 描述                                           |
| ----------------- | ---------------------------------------------- |
| `gmail_search`    | 按查询搜索邮件（支持 Gmail 搜索语法）          |
| `gmail_read`      | 按 ID 读取特定邮件                             |
| `gmail_send`      | 撰写并发送邮件                                 |
| `gmail_label`     | 添加或移除消息上的标签                         |
| `calendar_list`   | 列出即将到来的日历事件                         |
| `calendar_create` | 创建新的日历事件                               |
| `calendar_update` | 更新现有事件                                   |
| `tasks_list`      | 列出 Google Tasks 中的任务                     |
| `tasks_create`    | 创建新任务                                     |
| `tasks_complete`  | 将任务标记为已完成                             |
| `drive_search`    | 搜索 Google 云端硬盘中的文件                   |
| `drive_read`      | 读取文件内容（将 Google 文档导出为文本）       |
| `sheets_read`     | 从电子表格中读取范围                           |
| `sheets_write`    | 向电子表格范围写入值                           |

## 交互示例

向智能体询问类似以下的问题：

- "我今天的日程安排是什么？"
- "搜索来自 alice@example.com 的邮件"
- "给 bob@example.com 发送一封主题为'会议记录'的邮件"
- "在云端硬盘中查找 Q4 预算电子表格"
- "添加'购买杂货'到我的任务列表"
- "读取 Sales 电子表格中的单元格 A1:D10"

## OAuth 权限范围

Triggerfish 在授权期间请求以下权限范围：

| 权限范围         | 访问级别                            |
| ---------------- | ----------------------------------- |
| `gmail.modify`   | 读取、发送和管理邮件及标签          |
| `calendar`       | Google 日历的完全读写权限           |
| `tasks`          | Google Tasks 的完全读写权限         |
| `drive.readonly` | Google 云端硬盘文件的只读权限       |
| `spreadsheets`   | Google 表格的读写权限               |

::: tip 云端硬盘访问为只读。Triggerfish 可以搜索和读取您的文件，但不能创建、修改或删除它们。表格有单独的写入权限用于电子表格单元格更新。 :::

## 安全

- 所有 Google Workspace 数据至少被分级为 **INTERNAL**
- 邮件内容、日历详情和文档内容通常为 **CONFIDENTIAL**
- 令牌存储在操作系统密钥链中（macOS 钥匙串 / Linux libsecret）
- 客户端凭据与令牌一起存储在密钥链中，不在环境变量或配置文件中
- [禁止降级写入规则](/security/no-write-down)适用：CONFIDENTIAL 的 Google 数据不能流向 PUBLIC 渠道
- 所有工具调用都记录在审计追踪中，带有完整的分级上下文

## 故障排除

### "No Google tokens found"

运行 `triggerfish connect google` 进行认证。

### "Google refresh token revoked or expired"

您的刷新令牌已失效（例如，您在 Google 账户设置中撤销了访问权限）。运行 `triggerfish connect google` 重新连接。

### "Access blocked: has not completed the Google verification process"

这意味着您的 Google 账户未列为应用的测试用户。当应用处于"Testing"状态（默认）时，只有明确添加为测试用户的账户才能授权。

1. 前往 [OAuth 同意屏幕](https://console.cloud.google.com/apis/credentials/consent)
2. 前往 **Audience** 页面（左侧栏中）
3. 在 **Test users** 部分，点击 **+ Add Users** 并添加您的 Google 邮箱地址
4. 保存并再次尝试 `triggerfish connect google`

### "Token exchange failed"

仔细检查您的 Client ID 和 Client Secret。确保：

- OAuth 客户端类型是"Desktop app"
- 所有必需的 API 都在您的 Google Cloud 项目中启用
- 您的 Google 账户列为测试用户（如果应用处于测试模式）

### API 未启用

如果您看到特定服务的 403 错误，请确保在您的 [Google Cloud 控制台 API 库](https://console.cloud.google.com/apis/library)中启用了相应的 API。
