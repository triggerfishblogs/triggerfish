# 故障排除

遇到问题时从这里开始。请按顺序执行以下步骤。

## 第一步

### 1. 检查守护进程是否在运行

```bash
triggerfish status
```

如果守护进程未运行，启动它：

```bash
triggerfish start
```

### 2. 检查日志

```bash
triggerfish logs
```

这将实时跟踪日志文件。使用级别过滤器来减少干扰：

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. 运行诊断

```bash
triggerfish patrol
```

Patrol 会检查 Gateway 是否可达、LLM 提供商是否响应、通道是否已连接、策略规则是否已加载以及技能是否已被发现。任何标记为 `CRITICAL` 或 `WARNING` 的检查项都会告诉您应该关注的方向。

### 4. 验证配置

```bash
triggerfish config validate
```

这将解析 `triggerfish.yaml`，检查必填字段，验证分类级别，并解析密钥引用。

## 按领域排查

如果以上初步步骤未能指出问题所在，请选择与您的症状匹配的领域：

- [安装](/zh-CN/support/troubleshooting/installation) - 安装脚本失败、从源码构建问题、平台问题
- [守护进程](/zh-CN/support/troubleshooting/daemon) - 服务无法启动、端口冲突、"已在运行"错误
- [配置](/zh-CN/support/troubleshooting/configuration) - YAML 解析错误、缺少字段、密钥解析失败
- [通道](/zh-CN/support/troubleshooting/channels) - Bot 无响应、认证失败、消息投递问题
- [LLM 提供商](/zh-CN/support/troubleshooting/providers) - API 错误、模型未找到、流式传输失败
- [集成](/zh-CN/support/troubleshooting/integrations) - Google OAuth、GitHub PAT、Notion API、CalDAV、MCP 服务器
- [浏览器自动化](/zh-CN/support/troubleshooting/browser) - Chrome 未找到、启动失败、导航被阻止
- [安全与分类](/zh-CN/support/troubleshooting/security) - 写入降级阻止、污染问题、SSRF、策略拒绝
- [密钥与凭证](/zh-CN/support/troubleshooting/secrets) - 密钥链错误、加密文件存储、权限问题

## 仍然无法解决？

如果以上指南均未解决您的问题：

1. 收集[日志包](/zh-CN/support/guides/collecting-logs)
2. 阅读[提交 Issue 指南](/zh-CN/support/guides/filing-issues)
3. 在 [GitHub](https://github.com/greghavens/triggerfish/issues/new) 上提交 Issue
