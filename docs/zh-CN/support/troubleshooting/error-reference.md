# 错误参考

可搜索的错误信息索引。使用浏览器的查找功能（Ctrl+F / Cmd+F）搜索您在日志中看到的确切错误文本。

## 启动与守护进程

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `Fatal startup error` | Gateway 启动时未处理的异常 | 检查日志中的完整堆栈跟踪 |
| `Daemon start failed` | 服务管理器无法启动守护进程 | 检查 `triggerfish logs` 或系统日志 |
| `Daemon stop failed` | 服务管理器无法停止守护进程 | 手动终止进程 |
| `Failed to load configuration` | 配置文件不可读或格式错误 | 运行 `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | 缺少 `models` 部分或未定义提供商 | 至少配置一个提供商 |
| `Configuration file not found` | `triggerfish.yaml` 在预期路径不存在 | 运行 `triggerfish dive` 或手动创建 |
| `Configuration parse failed` | YAML 语法错误 | 修复 YAML 语法（检查缩进、冒号、引号） |
| `Configuration file did not parse to an object` | YAML 解析成功但结果不是映射 | 确保顶层是 YAML 映射而非列表或标量 |
| `Configuration validation failed` | 缺少必填字段或值无效 | 检查具体的验证消息 |
| `Triggerfish is already running` | 日志文件被其他实例锁定 | 先停止运行中的实例 |
| `Linger enable failed` | `loginctl enable-linger` 未成功 | 运行 `sudo loginctl enable-linger $USER` |

## 密钥管理

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `Secret store failed` | 无法初始化密钥后端 | 检查密钥链/libsecret 可用性 |
| `Secret not found` | 引用的密钥键名不存在 | 存储它：`triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | 密钥文件权限大于 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | 密钥文件不可读或被截断 | 删除并重新存储所有密钥 |
| `Machine key chmod failed` | 无法设置密钥文件权限 | 检查文件系统是否支持 chmod |
| `Secret file permissions too open` | 密钥数据文件权限过于宽松 | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | 无法设置密钥数据文件权限 | 检查文件系统类型 |
| `Secret backend selection failed` | 不支持的操作系统或无可用的密钥链 | 使用 Docker 或启用内存回退 |
| `Migrating legacy plaintext secrets to encrypted format` | 检测到旧格式密钥文件（INFO，非错误） | 无需操作；迁移是自动的 |

## LLM 提供商

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `Primary provider not found in registry` | `models.primary.provider` 中的提供商名称不在 `models.providers` 中 | 修正提供商名称 |
| `Classification model provider not configured` | `classification_models` 引用了未知提供商 | 将提供商添加到 `models.providers` |
| `All providers exhausted` | 故障转移链中的所有提供商都失败了 | 检查所有 API 密钥和提供商状态 |
| `Provider request failed with retryable error, retrying` | 暂时性错误，正在重试 | 等待；这是自动恢复 |
| `Provider stream connection failed, retrying` | 流式连接断开 | 等待；这是自动恢复 |
| `Local LLM request failed (status): text` | Ollama/LM Studio 返回了错误 | 检查本地服务器是否在运行且模型已加载 |
| `No response body for streaming` | 提供商返回了空的流式响应 | 重试；可能是提供商的暂时性问题 |
| `Unknown provider name in createProviderByName` | 代码引用了不存在的提供商类型 | 检查提供商名称拼写 |

## 通道

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `Channel send failed` | 路由器无法投递消息 | 检查日志中的通道特定错误 |
| `WebSocket connection failed` | CLI 聊天无法连接 Gateway | 检查守护进程是否在运行 |
| `Message parse failed` | 从通道接收到格式错误的 JSON | 检查客户端是否发送了有效的 JSON |
| `WebSocket upgrade rejected` | 连接被 Gateway 拒绝 | 检查认证 Token 和 Origin 头 |
| `Chat WebSocket message rejected: exceeds size limit` | 消息体超过 1 MB | 发送更小的消息 |
| `Discord channel configured but botToken is missing` | Discord 配置存在但 Token 为空 | 设置 Bot Token |
| `WhatsApp send failed (status): error` | Meta API 拒绝了发送请求 | 检查 Access Token 有效性 |
| `Signal connect failed` | 无法连接 signal-cli 守护进程 | 检查 signal-cli 是否在运行 |
| `Signal ping failed after retries` | signal-cli 在运行但无响应 | 重启 signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli 未在规定时间内启动 | 检查 Java 安装和 signal-cli 设置 |
| `IMAP LOGIN failed` | IMAP 凭证错误 | 检查用户名和密码 |
| `IMAP connection not established` | 无法连接 IMAP 服务器 | 检查服务器主机名和端口 993 |
| `Google Chat PubSub poll failed` | 无法从 Pub/Sub 订阅拉取 | 检查 Google Cloud 凭证 |
| `Clipboard image rejected: exceeds size limit` | 粘贴的图片对输入缓冲区太大 | 使用更小的图片 |

## 集成

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `Google OAuth token exchange failed` | OAuth 授权码交换返回错误 | 重新认证：`triggerfish connect google` |
| `GitHub token verification failed` | PAT 无效或已过期 | 重新存储：`triggerfish connect github` |
| `GitHub API request failed` | GitHub API 返回错误 | 检查 Token 权限范围和速率限制 |
| `Clone failed` | git clone 失败 | 检查 Token、仓库访问权限和网络 |
| `Notion enabled but token not found in keychain` | Notion 集成 Token 未存储 | 运行 `triggerfish connect notion` |
| `Notion API rate limited` | 超过每秒 3 个请求 | 等待自动重试（最多 3 次） |
| `Notion API network request failed` | 无法访问 api.notion.com | 检查网络连通性 |
| `CalDAV credential resolution failed` | CalDAV 用户名或密码缺失 | 在配置和密钥链中设置凭证 |
| `CalDAV principal discovery failed` | 无法找到 CalDAV principal URL | 检查服务器 URL 格式 |
| `MCP server 'name' not found` | 引用的 MCP 服务器不在配置中 | 将其添加到配置中的 `mcp_servers` |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE URL 指向私有 IP | 改用 stdio 传输 |
| `Vault path does not exist` | Obsidian 仓库路径错误 | 修正 `plugins.obsidian.vault_path` |
| `Path traversal rejected` | 笔记路径试图逃出仓库目录 | 使用仓库内的路径 |

## 安全与策略

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `Write-down blocked` | 数据从高分类流向低分类 | 使用正确分类级别的通道/工具 |
| `SSRF blocked: hostname resolves to private IP` | 出站请求目标为内部网络 | 无法禁用；使用公共 URL |
| `Hook evaluation failed, defaulting to BLOCK` | 策略钩子抛出异常 | 检查自定义策略规则 |
| `Policy rule blocked action` | 策略规则拒绝了操作 | 查看配置中的 `policy.rules` |
| `Tool floor violation` | 工具需要比会话更高的分类 | 提升会话或使用其他工具 |
| `Plugin network access blocked` | 插件尝试访问未授权的 URL | 插件必须在清单中声明端点 |
| `Plugin SSRF blocked` | 插件 URL 解析到私有 IP | 插件无法访问私有网络 |
| `Skill activation blocked by classification ceiling` | 会话污染超过技能上限 | 在当前污染级别下无法使用此技能 |
| `Skill content integrity check failed` | 技能文件在安装后被修改 | 重新安装技能 |
| `Skill install rejected by scanner` | 安全扫描器发现可疑内容 | 查看扫描警告 |
| `Delegation certificate signature invalid` | 委派链中的签名无效 | 重新签发委派 |
| `Delegation certificate expired` | 委派已过期 | 使用更长的 TTL 重新签发 |
| `Webhook HMAC verification failed` | Webhook 签名不匹配 | 检查共享密钥配置 |
| `Webhook replay detected` | 收到重复的 Webhook 负载 | 如果预期则不是错误；否则需要调查 |
| `Webhook rate limit exceeded` | 同一来源的 Webhook 调用过多 | 降低 Webhook 频率 |

## 浏览器

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `Browser launch failed` | 无法启动 Chrome/Chromium | 安装基于 Chromium 的浏览器 |
| `Direct Chrome process launch failed` | Chrome 二进制文件执行失败 | 检查二进制文件权限和依赖 |
| `Flatpak Chrome launch failed` | Flatpak Chrome 包装器失败 | 检查 Flatpak 安装 |
| `CDP endpoint not ready after Xms` | Chrome 未在规定时间内打开调试端口 | 系统可能资源受限 |
| `Navigation blocked by domain policy` | URL 目标为被阻止的域或私有 IP | 使用公共 URL |
| `Navigation failed` | 页面加载错误或超时 | 检查 URL 和网络 |
| `Click/Type/Select failed on "selector"` | CSS 选择器未匹配任何元素 | 对照页面 DOM 检查选择器 |
| `Snapshot failed` | 无法捕获页面状态 | 页面可能为空或 JavaScript 出错 |

## 执行与沙盒

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `Working directory path escapes workspace jail` | 执行环境中的路径穿越尝试 | 使用工作区内的路径 |
| `Working directory does not exist` | 指定的工作目录未找到 | 先创建目录 |
| `Workspace access denied for PUBLIC session` | PUBLIC 会话无法使用工作区 | 工作区需要 INTERNAL 及以上分类 |
| `Workspace path traversal attempt blocked` | 路径试图逃出工作区边界 | 使用工作区内的相对路径 |
| `Workspace agentId rejected: empty after sanitization` | Agent ID 仅包含无效字符 | 检查 Agent 配置 |
| `Sandbox worker unhandled error` | 插件沙盒 Worker 崩溃 | 检查插件代码是否有错误 |
| `Sandbox has been shut down` | 在已销毁的沙盒上尝试操作 | 重启守护进程 |

## 调度器

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `Trigger callback failed` | 触发器处理程序抛出异常 | 检查 TRIGGER.md 是否有问题 |
| `Trigger store persist failed` | 无法保存触发器结果 | 检查存储连通性 |
| `Notification delivery failed` | 无法发送触发器通知 | 检查通道连通性 |
| `Cron expression parse error` | 无效的 Cron 表达式 | 修正 `scheduler.cron.jobs` 中的表达式 |

## 自更新

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `Triggerfish self-update failed` | 更新过程遇到错误 | 检查日志中的具体错误 |
| `Binary replacement failed` | 无法将旧二进制文件替换为新的 | 检查文件权限；先停止守护进程 |
| `Checksum file download failed` | 无法下载 SHA256SUMS.txt | 检查网络连通性 |
| `Asset not found in SHA256SUMS.txt` | 发布中缺少您所在平台的校验和 | 提交 GitHub Issue |
| `Checksum verification exception` | 下载的二进制文件哈希不匹配 | 重试；下载可能已损坏 |
