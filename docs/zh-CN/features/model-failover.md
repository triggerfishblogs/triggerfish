# LLM 提供商和故障转移

Triggerfish 支持多个 LLM 提供商，具有自动故障转移、按智能体模型选择和会话级模型切换。没有单一提供商锁定。

## 支持的提供商

| 提供商 | 认证 | 模型 | 备注 |
| ---------- | ------- | -------------------------- | ----------------------------------- |
| Anthropic | API 密钥 | Claude Opus、Sonnet、Haiku | 标准 Anthropic API |
| OpenAI | API 密钥 | GPT-4o、o1、o3 | 标准 OpenAI API |
| Google | API 密钥 | Gemini Pro、Flash | Google AI Studio API |
| Local | 无 | Llama、Mistral 等 | 兼容 Ollama，OpenAI 格式 |
| OpenRouter | API 密钥 | OpenRouter 上的任何模型 | 统一访问多个提供商 |
| Z.AI | API 密钥 | GLM-4.7、GLM-4.5、GLM-5 | Z.AI Coding Plan，兼容 OpenAI |

## LlmProvider 接口

所有提供商实现相同的接口：

```typescript
interface LlmProvider {
  /** 从消息历史生成补全。 */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** 逐令牌流式补全。 */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** 此提供商是否支持工具/函数调用。 */
  supportsTools: boolean;

  /** 模型标识符（例如 "claude-sonnet-4-5"、"gpt-4o"）。 */
  modelId: string;
}
```

这意味着你可以在不改变任何应用逻辑的情况下切换提供商。无论哪个提供商活跃，智能体循环和所有工具编排的工作方式都完全相同。

## 配置

### 基本设置

在 `triggerfish.yaml` 中配置你的主模型和提供商凭证：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5
    openai:
      model: gpt-4o
    google:
      model: gemini-pro
    ollama:
      model: llama3
      baseUrl: "http://localhost:11434/v1"
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### 故障转移链

FailoverChain 在提供商不可用时提供自动回退。配置有序的回退模型列表：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # 第一回退
    - gpt-4o # 第二回退
    - ollama/llama3 # 本地回退（不需要互联网）

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

当主模型因配置的条件（速率限制、服务器错误或超时）失败时，Triggerfish 自动尝试链中的下一个提供商。这是透明的——对话不中断地继续。

## 按智能体模型选择

在[多智能体设置](./multi-agent)中，每个智能体可以使用针对其角色优化的不同模型：

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5
    - id: quick-tasks
      model: claude-haiku-4-5
    - id: coding
      model: claude-sonnet-4-5
```

## 速率限制

Triggerfish 包含一个内置的滑动窗口速率限制器，防止达到提供商 API 限制。限制器透明地包装任何提供商——它在滑动窗口中跟踪每分钟令牌数（TPM）和每分钟请求数（RPM），并在接近限制时延迟调用。

速率限制与故障转移协同工作：如果提供商的速率限制耗尽且限制器无法在超时内等待，故障转移链激活并尝试下一个提供商。

详见[速率限制](/zh-CN/features/rate-limiting)了解完整细节，包括 OpenAI 层级限制。

::: info API 密钥永远不存储在配置文件中。使用你的操作系统钥匙串通过 `triggerfish config set-secret`。详见[安全模型](/zh-CN/security/)了解密钥管理的详情。 :::
