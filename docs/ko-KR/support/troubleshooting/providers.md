# 문제 해결: LLM Provider

## 일반적인 Provider 오류

### 401 Unauthorized / 403 Forbidden

API 키가 유효하지 않거나, 만료되었거나, 충분한 권한이 없습니다.

**해결 방법:**

```bash
# API 키 다시 저장
triggerfish config set-secret provider:<name>:apiKey <your-key>

# Daemon 재시작
triggerfish stop && triggerfish start
```

Provider별 참고 사항:

| Provider | 키 형식 | 발급 위치 |
|----------|-----------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

Provider의 속도 제한을 초과했습니다. Triggerfish는 대부분의 provider에서 429에 대해 자동으로 재시도하지 않습니다(내장 백오프가 있는 Notion은 제외).

**해결 방법:** 잠시 기다린 후 다시 시도하십시오. 지속적으로 속도 제한에 도달하면:
- 더 높은 제한을 위해 API 플랜을 업그레이드하십시오
- 기본이 제한될 때 요청이 전달되도록 failover provider를 추가하십시오
- 예약된 작업이 원인인 경우 trigger 빈도를 줄이십시오

### 500 / 502 / 503 서버 오류

Provider의 서버에 문제가 발생하고 있습니다. 일반적으로 일시적입니다.

Failover 체인이 구성된 경우 Triggerfish는 자동으로 다음 provider를 시도합니다. Failover가 없으면 오류가 사용자에게 전달됩니다.

### "No response body for streaming"

Provider가 요청을 수락했지만 스트리밍 호출에 대해 빈 응답 본문을 반환했습니다. 다음과 같은 경우에 발생할 수 있습니다:

- Provider의 인프라가 과부하됨
- 프록시 또는 방화벽이 응답 본문을 제거함
- 모델이 일시적으로 사용 불가

영향을 받는 provider: OpenRouter, Local(Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Provider별 문제

### Anthropic

**도구 형식 변환.** Triggerfish는 내부 도구 형식과 Anthropic의 네이티브 도구 형식 간에 변환합니다. 도구 관련 오류가 표시되면 도구 정의에 유효한 JSON Schema가 있는지 확인하십시오.

**시스템 프롬프트 처리.** Anthropic은 시스템 프롬프트를 메시지가 아닌 별도의 필드로 요구합니다. 이 변환은 자동이지만, "system" 메시지가 대화에 나타나면 메시지 형식에 문제가 있습니다.

### OpenAI

**Frequency penalty.** Triggerfish는 반복적인 출력을 억제하기 위해 모든 OpenAI 요청에 0.3 frequency penalty를 적용합니다. 이것은 하드코딩되어 있으며 구성으로 변경할 수 없습니다.

**이미지 지원.** OpenAI는 메시지 콘텐츠에서 base64 인코딩된 이미지를 지원합니다. 비전이 작동하지 않으면 비전 지원 모델이 구성되어 있는지 확인하십시오(예: `gpt-4o`, `gpt-4o-mini`가 아님).

### Google Gemini

**쿼리 문자열의 키.** 다른 provider와 달리 Google은 API 키를 헤더가 아닌 쿼리 파라미터로 사용합니다. 이것은 자동으로 처리되지만, 기업 프록시를 통해 라우팅하면 키가 프록시/액세스 로그에 나타날 수 있습니다.

### Ollama / LM Studio (Local)

**서버가 실행 중이어야 합니다.** 로컬 provider는 Triggerfish가 시작되기 전에 모델 서버가 실행 중이어야 합니다. Ollama 또는 LM Studio가 실행 중이 아니면:

```
Local LLM request failed (connection refused)
```

**서버 시작:**

```bash
# Ollama
ollama serve

# LM Studio
# LM Studio를 열고 로컬 서버를 시작하십시오
```

**모델 미로드.** Ollama의 경우 모델을 먼저 pull해야 합니다:

```bash
ollama pull llama3.3:70b
```

**엔드포인트 재정의.** 로컬 서버가 기본 포트에 없는 경우:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama 기본값
      # endpoint: "http://localhost:1234"  # LM Studio 기본값
```

### Fireworks

**네이티브 API.** Triggerfish는 OpenAI 호환 엔드포인트가 아닌 Fireworks의 네이티브 API를 사용합니다. 모델 ID는 OpenAI 호환 문서에서 보이는 것과 다를 수 있습니다.

**모델 ID 형식.** Fireworks는 여러 모델 ID 패턴을 허용합니다. 마법사가 일반적인 형식을 정규화하지만 검증이 실패하면 정확한 ID를 [Fireworks 모델 라이브러리](https://fireworks.ai/models)에서 확인하십시오.

### OpenRouter

**모델 라우팅.** OpenRouter는 다양한 provider에 요청을 라우팅합니다. 기본 provider의 오류는 OpenRouter의 오류 형식으로 래핑됩니다. 실제 오류 메시지가 추출되어 표시됩니다.

**API 오류 형식.** OpenRouter는 오류를 JSON 객체로 반환합니다. 오류 메시지가 일반적으로 보이면 원시 오류가 DEBUG 수준에서 로그됩니다.

### ZenMux / Z.AI

**스트리밍 지원.** 두 provider 모두 스트리밍을 지원합니다. 스트리밍이 실패하면:

```
ZenMux stream failed (status): error text
```

API 키에 스트리밍 권한이 있는지 확인하십시오(일부 API 등급은 스트리밍 액세스를 제한합니다).

---

## Failover

### Failover 작동 방식

기본 provider가 실패하면 Triggerfish는 `failover` 목록의 각 모델을 순서대로 시도합니다:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Failover provider가 성공하면 어떤 provider가 사용되었는지 응답이 로그됩니다. 모든 provider가 실패하면 마지막 오류가 사용자에게 반환됩니다.

### "All providers exhausted"

체인의 모든 provider가 실패했습니다. 확인 사항:

1. 모든 API 키가 유효합니까? 각 provider를 개별적으로 테스트하십시오.
2. 모든 provider에 장애가 발생하고 있습니까? 상태 페이지를 확인하십시오.
3. 네트워크가 provider 엔드포인트로의 아웃바운드 HTTPS를 차단하고 있습니까?

### Failover 구성

```yaml
models:
  failover_config:
    max_retries: 3          # 다음으로 이동하기 전 provider당 재시도 횟수
    retry_delay_ms: 1000    # 재시도 간 기본 지연
    conditions:             # failover를 트리거하는 오류 조건
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

`models.primary.provider`의 provider 이름이 `models.providers`에 구성된 provider와 일치하지 않습니다. 오타를 확인하십시오.

### "Classification model provider not configured"

`models.providers`에 없는 provider를 참조하는 `classification_models` 재정의를 설정했습니다:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # 이 provider가 models.providers에 존재해야 합니다
      model: llama3.3:70b
  providers:
    # "local"이 여기에 정의되어야 합니다
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## 재시도 동작

Triggerfish는 일시적 오류(네트워크 타임아웃, 5xx 응답)에 대해 provider 요청을 재시도합니다. 재시도 로직:

1. 시도 간 지수 백오프로 대기합니다
2. 각 재시도 시도를 WARN 수준에서 로그합니다
3. 하나의 provider에 대한 재시도를 모두 소진한 후 failover 체인의 다음으로 이동합니다
4. 스트리밍 연결은 연결 설정과 스트림 중간 실패에 대해 별도의 재시도 로직을 가집니다

로그에서 재시도 시도를 확인할 수 있습니다:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
