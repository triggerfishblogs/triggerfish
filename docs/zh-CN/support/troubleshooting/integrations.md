# 故障排除：集成

## Google Workspace

### OAuth Token 过期或被撤销

Google OAuth 刷新令牌可能被撤销（由用户、Google 或因不活动）。当这种情况发生时：

```
Google OAuth token exchange failed
```

或者您会在 Google API 调用中看到 401 错误。

**修复方法：** 重新认证：

```bash
triggerfish connect google
```

这会打开浏览器进行 OAuth 授权流程。授权后，新 Token 会存储在密钥链中。

### "No refresh token"

OAuth 流程返回了 Access Token 但没有 Refresh Token。这种情况发生在：

- 您之前已经授权过该应用（Google 仅在首次授权时发送 Refresh Token）
- OAuth 授权页面未请求离线访问权限

**修复方法：** 在 [Google 账户设置](https://myaccount.google.com/permissions) 中撤销该应用的访问权限，然后重新运行 `triggerfish connect google`。这次 Google 会发送新的 Refresh Token。

### 并发刷新防护

如果多个请求同时触发 Token 刷新，Triggerfish 会将它们串行化，确保只发送一个刷新请求。如果在 Token 刷新期间看到超时，可能是第一个刷新请求耗时过长。

---

## GitHub

### "GitHub token not found in keychain"

GitHub 集成将个人访问令牌（PAT）存储在操作系统密钥链中，键名为 `github-pat`。

**修复方法：**

```bash
triggerfish connect github
# 或手动：
triggerfish config set-secret github-pat ghp_...
```

### Token 格式

GitHub 支持两种 Token 格式：
- 经典 PAT：`ghp_...`
- 细粒度 PAT：`github_pat_...`

两者均可使用。安装向导通过调用 GitHub API 验证 Token。如果验证失败：

```
GitHub token verification failed
GitHub API request failed
```

请仔细检查 Token 是否具有所需的权限范围。要获得完整功能，需要：`repo`、`read:org`、`read:user`。

### 克隆失败

GitHub 克隆工具具有自动重试逻辑：

1. 首次尝试：使用指定的 `--branch` 克隆
2. 如果分支不存在：不带 `--branch` 重试（使用默认分支）

如果两次尝试都失败：

```
Clone failed on retry
Clone failed
```

检查：
- Token 是否具有 `repo` 权限范围
- 仓库是否存在且 Token 有访问权限
- 到 github.com 的网络连通性

### 速率限制

GitHub 的 API 速率限制为认证请求每小时 5,000 次。剩余速率限制次数和重置时间从响应头中提取并包含在错误消息中：

```
Rate limit: X remaining, resets at HH:MM:SS
```

没有自动退避。请等待速率限制窗口重置。

---

## Notion

### "Notion enabled but token not found in keychain"

Notion 集成需要存储在密钥链中的内部集成 Token。

**修复方法：**

```bash
triggerfish connect notion
```

这会提示输入 Token，并在通过 Notion API 验证后将其存储在密钥链中。

### Token 格式

Notion 使用两种 Token 格式：
- 内部集成 Token：`ntn_...`
- 旧版 Token：`secret_...`

两者均被接受。连接向导在存储前验证格式。

### 速率限制（429）

Notion 的 API 速率限制约为每秒 3 个请求。Triggerfish 有内置的速率限制（可配置）和重试逻辑：

- 默认速率：每秒 3 个请求
- 重试：429 时最多 3 次
- 退避：带抖动的指数退避，从 1 秒开始
- 尊重 Notion 响应中的 `Retry-After` 头

如果仍然遇到速率限制：

```
Notion API rate limited, retrying
```

减少并发操作或降低配置中的速率限制。

### 404 Not Found

```
Notion: 404 Not Found
```

资源存在但未与您的集成共享。在 Notion 中：

1. 打开页面或数据库
2. 点击"..."菜单 > "连接"
3. 添加您的 Triggerfish 集成

### "client_secret removed"（破坏性变更）

在一次安全更新中，`client_secret` 字段已从 Notion 配置中移除。如果您的 `triggerfish.yaml` 中有此字段，请将其删除。Notion 现在仅使用存储在密钥链中的 OAuth Token。

### 网络错误

```
Notion API network request failed
Notion API network error: <message>
```

API 不可达。检查您的网络连接。如果您在企业代理后面，Notion 的 API（`api.notion.com`）必须可访问。

---

## CalDAV（日历）

### 凭证解析失败

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAV 集成需要用户名和密码：

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

存储密码：

```bash
triggerfish config set-secret caldav:password <your-password>
```

### 发现失败

CalDAV 使用多步发现流程：
1. 查找 principal URL（对 well-known 端点执行 PROPFIND）
2. 查找 calendar-home-set
3. 列出可用的日历

如果任何步骤失败：

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

常见原因：
- 服务器 URL 错误（某些服务器需要 `/dav/principals/` 或 `/remote.php/dav/`）
- 凭证被拒绝（用户名/密码错误）
- 服务器不支持 CalDAV（某些服务器宣称支持 WebDAV 但不支持 CalDAV）

### 更新/删除时 ETag 不匹配

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV 使用 ETag 进行乐观并发控制。如果在您读取和更新之间，其他客户端（手机、网页）修改了事件，ETag 将不匹配。

**修复方法：** Agent 应重新获取事件以获取当前 ETag，然后重试操作。大多数情况下会自动处理。

### "CalDAV credentials not available, executor deferred"

如果在启动时无法解析凭证，CalDAV 执行器将以延迟状态启动。这不是致命错误；如果您尝试使用 CalDAV 工具，执行器将报告错误。

---

## MCP（Model Context Protocol）服务器

### 服务器未找到

```
MCP server '<name>' not found
```

工具调用引用了未配置的 MCP 服务器。检查 `triggerfish.yaml` 中的 `mcp_servers` 部分。

### 服务器二进制文件不在 PATH 中

MCP 服务器作为子进程启动。如果找不到二进制文件：

```
MCP server '<name>': <validation error>
```

常见问题：
- 命令（如 `npx`、`python`、`node`）不在守护进程的 PATH 中
- **systemd/launchd PATH 问题：** 守护进程在安装时捕获您的 PATH。如果在安装守护进程后安装了 MCP 服务器工具，请重新安装守护进程以更新 PATH：

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### 服务器崩溃

如果 MCP 服务器进程崩溃，读取循环退出，服务器变得不可用。没有自动重连。

**修复方法：** 重启守护进程以重新启动所有 MCP 服务器。

### SSE 传输被阻止

使用 SSE（Server-Sent Events）传输的 MCP 服务器受 SSRF 检查约束：

```
MCP SSE connection blocked by SSRF policy
```

指向私有 IP 地址的 SSE URL 会被阻止。这是设计使然。请改用 stdio 传输连接本地 MCP 服务器。

### 工具调用错误

```
tools/list failed: <message>
tools/call failed: <message>
```

MCP 服务器返回了错误。这是服务器的错误，不是 Triggerfish 的。请检查 MCP 服务器自身的日志以获取详情。

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

`plugins.obsidian.vault_path` 中配置的仓库路径不存在。确保路径正确且可访问。

### 路径穿越被阻止

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

笔记路径试图逃出仓库目录（例如使用 `../`）。这是安全检查。所有笔记操作都限制在仓库目录内。

### 排除的文件夹

```
Path is excluded: <path>
```

该笔记位于 `exclude_folders` 列表中的文件夹内。要访问它，请从排除列表中移除该文件夹。

### 分类执行

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

仓库或特定文件夹的分类级别与会话污染冲突。有关写入降级规则的详情，请参阅[安全故障排除](/zh-CN/support/troubleshooting/security)。
