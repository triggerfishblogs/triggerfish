# 세션 및 Taint

세션은 Triggerfish에서 대화 상태의 기본 단위입니다. 모든 세션은 독립적으로 **taint 수준** -- 세션 중 접근한 데이터의 최고 민감도를 기록하는 분류 워터마크 -- 을 추적합니다. Taint는 정책 엔진의 출력 결정을 주도합니다: 세션이 `CONFIDENTIAL`로 taint되면 해당 세션의 데이터는 `CONFIDENTIAL` 미만으로 분류된 채널로 흐를 수 없습니다.

## 세션 Taint 모델

### Taint 작동 방식

세션이 분류 수준의 데이터에 접근하면 전체 세션이 해당 수준으로 **taint**됩니다. Taint는 세 가지 규칙을 따릅니다:

1. **대화별**: 각 세션은 자체 독립적인 taint 수준을 가집니다
2. **상승만 가능**: Taint는 세션 내에서 증가만 가능하고, 절대 감소하지 않습니다
3. **전체 초기화는 모든 것을 지움**: Taint와 대화 기록이 함께 삭제됩니다

<img src="/diagrams/taint-escalation.svg" alt="Taint 상승: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint는 상승만 가능하고, 절대 감소하지 않습니다." style="max-width: 100%;" />

::: warning 보안 Taint는 절대 선택적으로 낮출 수 없습니다. 전체 대화 기록을 지우지 않고 세션을 "un-taint"하는 메커니즘이 없습니다. 이는 컨텍스트 유출을 방지합니다 -- 세션이 기밀 데이터를 본 것을 기억한다면 taint가 이를 반영해야 합니다. :::

### Taint가 감소할 수 없는 이유

분류된 데이터가 더 이상 표시되지 않더라도 LLM의 컨텍스트 윈도우에는 여전히 포함되어 있습니다. 모델은 향후 응답에서 분류된 정보를 참조, 요약 또는 반복할 수 있습니다. taint를 낮추는 유일하게 안전한 방법은 컨텍스트를 완전히 제거하는 것입니다 -- 이것이 바로 전체 초기화가 하는 일입니다.

## 세션 유형

Triggerfish는 각각 독립적인 taint 추적을 가진 여러 세션 유형을 관리합니다:

| 세션 유형      | 설명                                              | 초기 Taint | 재시작 후 유지 |
| -------------- | ------------------------------------------------- | ---------- | -------------- |
| **Main**       | 소유자와의 주요 직접 대화                         | `PUBLIC`   | 예             |
| **Channel**    | 연결된 채널당 하나 (Telegram, Slack 등)            | `PUBLIC`   | 예             |
| **Background** | 자율 작업을 위해 생성 (cron, webhook)              | `PUBLIC`   | 작업 기간      |
| **Agent**      | 멀티 에이전트 라우팅을 위한 에이전트별 세션        | `PUBLIC`   | 예             |
| **Group**      | 그룹 채팅 세션                                    | `PUBLIC`   | 예             |

::: info 백그라운드 세션은 부모 세션의 taint 수준과 관계없이 항상 `PUBLIC` taint로 시작합니다. 이것은 의도적입니다 -- cron 작업과 webhook 트리거 작업은 생성한 세션의 taint를 상속해서는 안 됩니다. :::

## Taint 상승 예시

taint 상승과 그에 따른 정책 차단을 보여주는 전체 흐름입니다:

<img src="/diagrams/taint-with-blocks.svg" alt="Taint 상승 예시: 세션이 PUBLIC으로 시작하고, Salesforce 접근 후 CONFIDENTIAL로 상승하며, PUBLIC WhatsApp 채널로의 출력이 차단됩니다" style="max-width: 100%;" />

## 전체 초기화 메커니즘

세션 초기화는 taint를 낮추는 유일한 방법입니다. 의도적이고 파괴적인 작업입니다:

1. **계보 레코드 아카이빙** -- 세션의 모든 계보 데이터가 감사 저장소에 보존됩니다
2. **대화 기록 삭제** -- 전체 컨텍스트 윈도우가 지워집니다
3. **Taint를 PUBLIC으로 초기화** -- 세션이 새로 시작됩니다
4. **사용자 확인 요구** -- `SESSION_RESET` hook이 실행 전 명시적 확인을 요구합니다

초기화 후 세션은 새로 생성된 세션과 구별할 수 없습니다. 에이전트는 이전 대화에 대한 기억이 없습니다. 이것이 분류된 데이터가 LLM의 컨텍스트를 통해 유출될 수 없음을 보장하는 유일한 방법입니다.

## 세션 간 통신

에이전트가 `sessions_send`를 사용하여 세션 간에 데이터를 보낼 때 동일한 write-down 규칙이 적용됩니다:

| 소스 세션 Taint  | 대상 세션 채널         | 결정    |
| ---------------- | ---------------------- | ------- |
| `PUBLIC`         | `PUBLIC` 채널          | ALLOW   |
| `CONFIDENTIAL`   | `CONFIDENTIAL` 채널    | ALLOW   |
| `CONFIDENTIAL`   | `PUBLIC` 채널          | BLOCK   |
| `RESTRICTED`     | `CONFIDENTIAL` 채널    | BLOCK   |

에이전트가 사용할 수 있는 세션 도구:

| 도구               | 설명                                     | Taint 영향                             |
| ------------------ | ---------------------------------------- | -------------------------------------- |
| `sessions_list`    | 필터를 사용한 활성 세션 목록             | Taint 변경 없음                        |
| `sessions_history` | 세션의 대화 내용 검색                    | 참조된 세션에서 taint 상속             |
| `sessions_send`    | 다른 세션으로 메시지 전송                | Write-down 확인 대상                   |
| `sessions_spawn`   | 백그라운드 작업 세션 생성                | 새 세션은 `PUBLIC`으로 시작            |
| `session_status`   | 현재 세션 상태 및 메타데이터 확인        | Taint 변경 없음                        |

## 데이터 계보

Triggerfish가 처리하는 모든 데이터 요소는 **출처 메타데이터** -- 데이터가 어디서 왔는지, 어떻게 변환되었는지, 어디로 갔는지의 완전한 기록 -- 를 전달합니다. 계보는 분류 결정을 검증 가능하게 만드는 감사 추적입니다.

### 계보 레코드 구조

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### 계보 추적 규칙

| 이벤트                                | 계보 동작                                     |
| ------------------------------------- | --------------------------------------------- |
| 통합에서 데이터 읽기                  | 원본이 포함된 계보 레코드 생성                |
| LLM이 데이터 변환                     | 변환 추가, 입력 계보 연결                     |
| 여러 소스의 데이터 집계               | 계보 병합, 분류 = `max(입력들)`               |
| 채널로 데이터 전송                    | 대상 기록, 분류 확인                          |
| 세션 초기화                           | 계보 레코드 아카이빙, 컨텍스트에서 삭제       |

### 집계 분류

여러 소스의 데이터가 결합될 때(예: 다른 통합의 레코드에 대한 LLM 요약), 집계된 결과는 모든 입력의 **최대 분류**를 상속합니다:

```
입력 1: INTERNAL    (내부 위키)
입력 2: CONFIDENTIAL (Salesforce 레코드)
입력 3: PUBLIC      (날씨 API)

집계된 출력 분류: CONFIDENTIAL (입력의 최대값)
```

::: tip 엔터프라이즈 배포는 통계적 집계(10개 이상의 레코드에 대한 평균, 개수, 합계) 또는 인증된 익명화 데이터에 대한 선택적 다운그레이드 규칙을 구성할 수 있습니다. 모든 다운그레이드는 명시적 정책 규칙이 필요하고, 전체 근거와 함께 로깅되며, 감사 검토의 대상입니다. :::

### 감사 기능

계보는 네 가지 카테고리의 감사 쿼리를 가능하게 합니다:

- **순방향 추적**: "Salesforce 레코드 X의 데이터에 무슨 일이 있었습니까?" -- 원본에서 모든 대상까지 데이터를 추적합니다
- **역방향 추적**: "이 출력에 어떤 소스가 기여했습니까?" -- 출력을 모든 소스 레코드로 역추적합니다
- **분류 정당화**: "왜 이것이 CONFIDENTIAL로 표시되었습니까?" -- 분류 이유 체인을 보여줍니다
- **컴플라이언스 내보내기**: 법적 또는 규제 검토를 위한 전체 관리 체인

## Taint 영속성

세션 taint는 `taint:` 네임스페이스 아래 `StorageProvider`를 통해 영속화됩니다. 이는 taint가 데몬 재시작 후에도 유지됨을 의미합니다 -- 재시작 전에 `CONFIDENTIAL`이었던 세션은 재시작 후에도 여전히 `CONFIDENTIAL`입니다.

계보 레코드는 `lineage:` 네임스페이스 아래 컴플라이언스 기반 보존(기본 90일)으로 영속화됩니다.
