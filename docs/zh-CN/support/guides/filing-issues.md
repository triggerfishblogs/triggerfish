# 如何提交高质量的 Issue

一个结构良好的 Issue 能更快得到解决。一个没有日志和复现步骤的模糊 Issue 往往会搁置数周，因为没有人能对其采取行动。以下是应包含的内容。

## 提交前

1. **搜索现有 Issue。** 可能已有人报告了相同的问题。检查[未关闭的 Issue](https://github.com/greghavens/triggerfish/issues) 和[已关闭的 Issue](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed)。

2. **查看故障排除指南。** [故障排除部分](/zh-CN/support/troubleshooting/)涵盖了大多数常见问题。

3. **查看已知问题。** [已知问题](/zh-CN/support/kb/known-issues)页面列出了我们已知的问题。

4. **尝试最新版本。** 如果您不是最新版本，请先更新：
   ```bash
   triggerfish update
   ```

## 应包含的内容

### 1. 环境信息

```
Triggerfish 版本：（运行 `triggerfish version`）
操作系统：（如 macOS 15.2、Ubuntu 24.04、Windows 11、Docker）
架构：（x64 或 arm64）
安装方式：（二进制安装程序、从源码构建、Docker）
```

### 2. 复现步骤

写出导致问题的确切操作序列。要具体：

**不好的示例：**
> Bot 停止工作了。

**好的示例：**
> 1. 启动配置了 Telegram 通道的 Triggerfish
> 2. 在与 Bot 的私聊中发送消息"检查我明天的日历"
> 3. Bot 回复了日历结果
> 4. 发送"把这些结果发邮件给 alice@example.com"
> 5. 预期：Bot 发送邮件
> 6. 实际：Bot 回复"Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL"

### 3. 预期行为与实际行为

说明您预期会发生什么以及实际发生了什么。如果有错误消息，包含准确的错误消息。复制粘贴优于意译。

### 4. 日志输出

附加[日志包](/zh-CN/support/guides/collecting-logs)：

```bash
triggerfish logs bundle
```

如果 Issue 涉及安全敏感内容，您可以脱敏部分内容，但请在 Issue 中注明脱敏了哪些内容。

至少粘贴相关的日志行。包含时间戳以便我们关联事件。

### 5. 配置（脱敏）

粘贴 `triggerfish.yaml` 的相关部分。**务必脱敏密钥。** 用占位符替换实际值：

```yaml
# 好的示例 - 密钥已脱敏
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # 存储在密钥链中
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol 输出

```bash
triggerfish patrol
```

粘贴输出。这为我们提供系统健康状况的快速概览。

## Issue 类型

### Bug 报告

对于出现故障的情况，使用此模板：

```markdown
## Bug 报告

**环境：**
- 版本：
- 操作系统：
- 安装方式：

**复现步骤：**
1.
2.
3.

**预期行为：**

**实际行为：**

**错误消息（如有）：**

**Patrol 输出：**

**相关配置（脱敏）：**

**日志包：**（附加文件）
```

### 功能请求

```markdown
## 功能请求

**问题：** 您想做什么但目前无法做到？

**建议的解决方案：** 您认为它应该如何工作？

**考虑过的替代方案：** 您还尝试了什么？
```

### 问题 / 支持请求

如果您不确定某事是否是 Bug，或者只是遇到了困难，请使用 [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) 而不是 Issues。对于可能没有唯一正确答案的问题，Discussions 更合适。

## 不应包含的内容

- **原始 API 密钥或密码。** 务必脱敏。
- **对话中的个人数据。** 脱敏姓名、电子邮件、电话号码。
- **完整的日志文件内联。** 将日志包作为文件附加，而不是粘贴数千行。

## 提交后

- **关注后续问题。** 维护者可能需要更多信息。
- **测试修复。** 如果推送了修复，可能会要求您验证。
- **关闭 Issue，** 如果您自己找到了解决方案。发布解决方案以便他人受益。
