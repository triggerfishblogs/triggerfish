# 故障排除：LLM 提供商

## 常见提供商错误

### 401 Unauthorized / 403 Forbidden

您的 API 密钥无效、已过期或权限不足。

**修复方法：**

```bash
# 重新存储 API 密钥
triggerfish config set-secret provider:<name>:apiKey <your-key>

# 重启守护进程
triggerfish stop && triggerfish start
```

各提供商说明：

| 提供商 | 密钥格式 | 获取位置 |
|--------|----------|----------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 速率受限

您已超过提供商的速率限制。Triggerfish 对大多数提供商不会自动重试 429 错误（Notion 除外，它有内置退避逻辑）。

**修复方法：** 等待后重试。如果持续遇到速率限制，请考虑：
- 升级 API 计划以获取更高的限制
- 添加故障转移提供商，使请求在主要提供商受限时自动切换
- 如果是计划任务导致的，降低触发器频率

### 500 / 502 / 503 服务器错误

提供商的服务器正在出现问题。这些通常是暂时性的。

如果您配置了故障转移链，Triggerfish 会自动尝试下一个提供商。没有故障转移时，错误会传递给用户。

### "No response body for streaming"

提供商接受了请求但对流式调用返回了空的响应体。可能原因：

- 提供商基础设施过载
- 代理或防火墙剥离了响应体
- 模型暂时不可用

影响的提供商：OpenRouter、Local（Ollama/LM Studio）、ZenMux、Z.AI、Fireworks。

---

## 特定提供商问题

### Anthropic

**工具格式转换。** Triggerfish 在内部工具格式和 Anthropic 原生工具格式之间进行转换。如果您看到工具相关错误，请检查工具定义是否包含有效的 JSON Schema。

**系统提示词处理。** Anthropic 要求系统提示词作为单独字段而非消息。此转换是自动的，但如果您看到"system"消息出现在对话中，说明消息格式有问题。

### OpenAI

**频率惩罚。** Triggerfish 对所有 OpenAI 请求应用 0.3 的频率惩罚以抑制重复输出。这是硬编码的，无法通过配置更改。

**图像支持。** OpenAI 支持消息内容中的 base64 编码图像。如果视觉功能不工作，确保配置了支持视觉的模型（例如 `gpt-4o`，而非 `gpt-4o-mini`）。

### Google Gemini

**查询字符串中的密钥。** 与其他提供商不同，Google 将 API 密钥作为查询参数而非请求头传递。这是自动处理的，但如果您通过企业代理路由，密钥可能会出现在代理/访问日志中。

### Ollama / LM Studio（本地）

**服务器必须在运行。** 本地提供商需要模型服务器在 Triggerfish 启动前运行。如果 Ollama 或 LM Studio 未运行：

```
Local LLM request failed (connection refused)
```

**启动服务器：**

```bash
# Ollama
ollama serve

# LM Studio
# 打开 LM Studio 并启动本地服务器
```

**模型未加载。** 使用 Ollama 时，模型必须先拉取：

```bash
ollama pull llama3.3:70b
```

**端点覆盖。** 如果您的本地服务器不在默认端口：

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama 默认端口
      # endpoint: "http://localhost:1234"  # LM Studio 默认端口
```

### Fireworks

**原生 API。** Triggerfish 使用 Fireworks 的原生 API，而非其 OpenAI 兼容端点。模型 ID 可能与 OpenAI 兼容文档中看到的不同。

**模型 ID 格式。** Fireworks 接受多种模型 ID 格式。向导会规范化常见格式，但如果验证失败，请查看 [Fireworks 模型库](https://fireworks.ai/models) 获取准确的 ID。

### OpenRouter

**模型路由。** OpenRouter 将请求路由到各种提供商。来自底层提供商的错误会被包装在 OpenRouter 的错误格式中。实际错误消息会被提取并显示。

**API 错误格式。** OpenRouter 以 JSON 对象形式返回错误。如果错误消息看起来很通用，原始错误会在 DEBUG 级别记录。

### ZenMux / Z.AI

**流式传输支持。** 两个提供商都支持流式传输。如果流式传输失败：

```
ZenMux stream failed (status): error text
```

检查您的 API 密钥是否具有流式传输权限（某些 API 层级限制流式访问）。

---

## 故障转移

### 故障转移工作原理

当主要提供商失败时，Triggerfish 按顺序尝试 `failover` 列表中的每个模型：

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

如果故障转移提供商成功，日志会记录使用了哪个提供商。如果所有提供商都失败，最后一个错误将返回给用户。

### "All providers exhausted"

链中的所有提供商都失败了。检查：

1. 所有 API 密钥是否有效？逐个测试每个提供商。
2. 所有提供商是否都在经历中断？查看它们的状态页面。
3. 您的网络是否阻止了到任何提供商端点的出站 HTTPS？

### 故障转移配置

```yaml
models:
  failover_config:
    max_retries: 3          # 切换到下一个提供商前每个提供商的重试次数
    retry_delay_ms: 1000    # 重试间的基础延迟
    conditions:             # 触发故障转移的错误条件
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

`models.primary.provider` 中的提供商名称与 `models.providers` 中配置的任何提供商不匹配。检查拼写错误。

### "Classification model provider not configured"

您设置的 `classification_models` 覆盖引用了 `models.providers` 中不存在的提供商：

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # 此提供商必须在 models.providers 中存在
      model: llama3.3:70b
  providers:
    # "local" 必须在这里定义
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## 重试行为

Triggerfish 在遇到暂时性错误（网络超时、5xx 响应）时会重试提供商请求。重试逻辑：

1. 在尝试之间使用指数退避等待
2. 在 WARN 级别记录每次重试尝试
3. 在耗尽一个提供商的重试次数后，移至故障转移链中的下一个
4. 流式连接对连接建立和传输中断有单独的重试逻辑

您可以在日志中查看重试尝试：

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
