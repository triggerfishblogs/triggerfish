# LLM 供應商和故障轉移

Triggerfish 支援多個 LLM 供應商，具有自動故障轉移、每代理模型選擇和工作階段級模型切換。不被單一供應商鎖定。

## 支援的供應商

| 供應商     | 驗證    | 模型                       | 備註                                |
| ---------- | ------- | -------------------------- | ----------------------------------- |
| Anthropic  | API 金鑰 | Claude Opus、Sonnet、Haiku | 標準 Anthropic API                  |
| OpenAI     | API 金鑰 | GPT-4o、o1、o3             | 標準 OpenAI API                     |
| Google     | API 金鑰 | Gemini Pro、Flash          | Google AI Studio API                |
| Local      | 無      | Llama、Mistral 等          | Ollama 相容，OpenAI 格式            |
| OpenRouter | API 金鑰 | OpenRouter 上的任何模型    | 統一存取多個供應商                  |
| Z.AI       | API 金鑰 | GLM-4.7、GLM-4.5、GLM-5    | Z.AI Coding Plan，OpenAI 相容      |

## LlmProvider 介面

所有供應商實作相同的介面：

```typescript
interface LlmProvider {
  /** Generate a completion from a message history. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Stream a completion token-by-token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** Whether this provider supports tool/function calling. */
  supportsTools: boolean;

  /** The model identifier (e.g., "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

這表示您可以在不更改任何應用程式邏輯的情況下切換供應商。代理迴圈和所有工具協調無論哪個供應商處於活躍狀態都以相同方式運作。

## 配置

### 基本設定

在 `triggerfish.yaml` 中配置您的主要模型和供應商憑證：

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
      baseUrl: "http://localhost:11434/v1" # Ollama 預設值
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### 故障轉移鏈

FailoverChain 在供應商不可用時提供自動備援。配置有序的備援模型清單：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # 第一備援
    - gpt-4o # 第二備援
    - ollama/llama3 # 本機備援（不需要網際網路）

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

當主要模型因配置的條件（速率限制、伺服器錯誤或逾時）失敗時，Triggerfish 自動嘗試鏈中的下一個供應商。這會透明地發生——對話繼續而不中斷。

### 故障轉移條件

| 條件           | 描述                                       |
| -------------- | ------------------------------------------ |
| `rate_limited` | 供應商回傳 429 速率限制回應                |
| `server_error` | 供應商回傳 5xx 伺服器錯誤                  |
| `timeout`      | 請求超過配置的逾時                         |

## 每代理模型選擇

在[多代理設定](./multi-agent)中，每個代理可以使用針對其角色最佳化的不同模型：

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # 最佳推理能力用於研究
    - id: quick-tasks
      model: claude-haiku-4-5 # 快速且便宜用於簡單任務
    - id: coding
      model: claude-sonnet-4-5 # 用於程式碼的良好平衡
```

## 工作階段級模型切換

代理可以在工作階段中間切換模型以進行成本最佳化。使用快速模型處理簡單查詢，並升級到更強大的模型進行複雜推理。這可透過 `session_status` 工具使用。

## 速率限制

Triggerfish 包含內建的滑動視窗速率限制器，防止達到供應商 API 限制。限制器透明地包裝任何供應商——它在滑動視窗中追蹤每分鐘 token 數（TPM）和每分鐘請求數（RPM），並在接近限制時延遲呼叫。

速率限制與故障轉移協同運作：如果供應商的速率限制耗盡且限制器無法在逾時內等待，故障轉移鏈啟動並嘗試下一個供應商。

完整詳情請參閱[速率限制](/zh-TW/features/rate-limiting)，包括 OpenAI 層級限制。

::: info API 金鑰永遠不會儲存在設定檔中。透過 `triggerfish config set-secret` 使用您的作業系統金鑰鏈。密鑰管理詳情請參閱[安全模型](/zh-TW/security/)。 :::
