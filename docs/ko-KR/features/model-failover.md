# LLM 제공자 및 페일오버

Triggerfish는 자동 페일오버, 에이전트별 모델 선택, 세션 수준 모델 전환을 가진 여러 LLM 제공자를 지원합니다. 단일 제공자에 대한 종속이 없습니다.

## 지원 제공자

| 제공자     | 인증    | 모델                       | 비고                                |
| ---------- | ------- | -------------------------- | ----------------------------------- |
| Anthropic  | API 키  | Claude Opus, Sonnet, Haiku | 표준 Anthropic API                  |
| OpenAI     | API 키  | GPT-4o, o1, o3             | 표준 OpenAI API                     |
| Google     | API 키  | Gemini Pro, Flash          | Google AI Studio API                |
| Local      | 없음    | Llama, Mistral 등          | Ollama 호환, OpenAI 형식            |
| OpenRouter | API 키  | OpenRouter의 모든 모델     | 여러 제공자에 대한 통합 접근        |
| Z.AI       | API 키  | GLM-4.7, GLM-4.5, GLM-5   | Z.AI Coding Plan, OpenAI 호환      |

## LlmProvider 인터페이스

모든 제공자가 동일한 인터페이스를 구현합니다:

```typescript
interface LlmProvider {
  /** 메시지 기록에서 완성을 생성합니다. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** 토큰별로 완성을 스트리밍합니다. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** 이 제공자가 도구/함수 호출을 지원하는지 여부입니다. */
  supportsTools: boolean;

  /** 모델 식별자 (예: "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

이는 애플리케이션 로직을 변경하지 않고 제공자를 전환할 수 있음을 의미합니다. 에이전트 루프와 모든 도구 오케스트레이션은 어떤 제공자가 활성화되어 있든 동일하게 작동합니다.

## 구성

### 기본 설정

`triggerfish.yaml`에서 기본 모델과 제공자 자격 증명을 구성합니다:

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
      baseUrl: "http://localhost:11434/v1" # Ollama 기본값
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### 페일오버 체인

FailoverChain은 제공자가 사용 불가능할 때 자동 폴백을 제공합니다. 순서가 있는 폴백 모델 목록을 구성합니다:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # 첫 번째 폴백
    - gpt-4o # 두 번째 폴백
    - ollama/llama3 # 로컬 폴백 (인터넷 불필요)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

기본 모델이 구성된 조건(속도 제한, 서버 오류 또는 시간 초과)으로 실패하면 Triggerfish가 자동으로 체인의 다음 제공자를 시도합니다. 이것은 투명하게 발생합니다 -- 대화가 중단 없이 계속됩니다.

### 페일오버 조건

| 조건           | 설명                                     |
| -------------- | ---------------------------------------- |
| `rate_limited` | 제공자가 429 속도 제한 응답을 반환       |
| `server_error` | 제공자가 5xx 서버 오류를 반환            |
| `timeout`      | 요청이 구성된 시간 초과를 초과           |

## 에이전트별 모델 선택

[멀티 에이전트 설정](./multi-agent)에서 각 에이전트는 역할에 최적화된 다른 모델을 사용할 수 있습니다:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # 연구를 위한 최고의 추론
    - id: quick-tasks
      model: claude-haiku-4-5 # 간단한 작업을 위한 빠르고 저렴한 모델
    - id: coding
      model: claude-sonnet-4-5 # 코드를 위한 좋은 균형
```

## 세션 수준 모델 전환

에이전트는 비용 최적화를 위해 세션 중간에 모델을 전환할 수 있습니다. 간단한 쿼리에는 빠른 모델을 사용하고 복잡한 추론에는 더 능력 있는 모델로 에스컬레이션합니다. 이것은 `session_status` 도구를 통해 사용할 수 있습니다.

## 속도 제한

Triggerfish에는 제공자 API 한도에 도달하는 것을 방지하는 내장 슬라이딩 윈도우 속도 제한기가 포함되어 있습니다. 제한기는 모든 제공자를 투명하게 래핑합니다 -- 슬라이딩 윈도우에서 분당 토큰(TPM)과 분당 요청(RPM)을 추적하고 한도에 도달하면 호출을 지연합니다.

속도 제한은 페일오버와 함께 작동합니다: 제공자의 속도 제한이 소진되고 제한기가 시간 초과 내에 대기할 수 없으면 페일오버 체인이 활성화되어 다음 제공자를 시도합니다.

OpenAI 티어 한도를 포함한 전체 세부 사항은 [속도 제한](/ko-KR/features/rate-limiting)을 참조하십시오.

::: info API 키는 구성 파일에 절대 저장되지 않습니다. `triggerfish config set-secret`을 통해 OS 키체인을 사용하십시오. 시크릿 관리에 대한 자세한 내용은 [보안 모델](/ko-KR/security/)을 참조하십시오. :::
