# 감사 및 컴플라이언스

Triggerfish의 모든 정책 결정은 전체 컨텍스트와 함께 로깅됩니다. 예외가 없으며, 로깅을 비활성화하는 "디버그 모드"가 없고, LLM이 감사 레코드를 억제할 방법이 없습니다. 이는 시스템이 내린 모든 보안 결정의 완전하고 변조 방지 기록을 제공합니다.

## 기록되는 내용

감사 로깅은 **고정 규칙**입니다 -- 항상 활성화되어 있으며 비활성화할 수 없습니다. 모든 시행 hook 실행은 다음을 포함하는 감사 레코드를 생성합니다:

| 필드              | 설명                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `timestamp`       | 결정이 내려진 시간 (ISO 8601, UTC)                                                                                                                                       |
| `hook_type`       | 실행된 시행 hook (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`)   |
| `session_id`      | 동작이 발생한 세션                                                                                                                                                       |
| `decision`        | `ALLOW`, `BLOCK` 또는 `REDACT`                                                                                                                                           |
| `reason`          | 결정에 대한 사람이 읽을 수 있는 설명                                                                                                                                     |
| `input`           | hook을 트리거한 데이터 또는 동작                                                                                                                                         |
| `rules_evaluated` | 결정에 도달하기 위해 확인된 정책 규칙                                                                                                                                    |
| `taint_before`    | 동작 전 세션 taint 수준                                                                                                                                                  |
| `taint_after`     | 동작 후 세션 taint 수준 (변경된 경우)                                                                                                                                    |
| `metadata`        | hook 유형에 특정한 추가 컨텍스트                                                                                                                                         |

## 감사 레코드 예시

### 허용된 출력

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Classification check passed",
  "input": {
    "target_channel": "telegram",
    "recipient": "owner"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification"
  ],
  "taint_before": "INTERNAL",
  "taint_after": "INTERNAL"
}
```

### 차단된 Write-Down

```json
{
  "timestamp": "2025-01-29T10:24:12Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Session taint (CONFIDENTIAL) exceeds effective classification (PUBLIC)",
  "input": {
    "target_channel": "whatsapp",
    "recipient": "external_user_789",
    "effective_classification": "PUBLIC"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification",
    "recipient_classification"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

### Taint 상승을 동반한 도구 호출

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "POST_TOOL_RESPONSE",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Tool response classified and taint updated",
  "input": {
    "tool_name": "salesforce.query_opportunities",
    "response_classification": "CONFIDENTIAL"
  },
  "rules_evaluated": [
    "tool_response_classification",
    "taint_escalation"
  ],
  "taint_before": "PUBLIC",
  "taint_after": "CONFIDENTIAL",
  "metadata": {
    "lineage_id": "lin_789xyz",
    "records_returned": 3
  }
}
```

### 차단된 에이전트 위임

```json
{
  "timestamp": "2025-01-29T10:25:00Z",
  "hook_type": "AGENT_INVOCATION",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Agent ceiling (INTERNAL) below session taint (CONFIDENTIAL)",
  "input": {
    "caller_agent_id": "agent_abc",
    "callee_agent_id": "agent_def",
    "callee_ceiling": "INTERNAL",
    "task": "Generate public summary"
  },
  "rules_evaluated": [
    "delegation_ceiling_check",
    "delegation_allowlist",
    "delegation_depth"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

## 감사 추적 기능

<img src="/diagrams/audit-trace-flow.svg" alt="감사 추적 흐름: 순방향 추적, 역방향 추적, 분류 정당화가 컴플라이언스 내보내기로 전달됩니다" style="max-width: 100%;" />

감사 레코드는 네 가지 방법으로 쿼리할 수 있으며, 각각 다른 컴플라이언스 및 포렌식 요구를 충족합니다.

### 순방향 추적

**질문:** "Salesforce 레코드 `opp_00123ABC`의 데이터에 무슨 일이 있었습니까?"

순방향 추적은 데이터 요소를 원점에서 모든 변환, 세션, 출력을 통해 따라갑니다. 이 데이터가 어디로 갔는지, 누가 보았는지, 조직 외부로 전송된 적이 있는지 답합니다.

```
원본: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> 분류: CONFIDENTIAL
  --> 세션: sess_456

변환:
  --> 추출된 필드: name, amount, stage
  --> LLM이 3개 레코드를 파이프라인 개요로 요약

출력:
  --> Telegram을 통해 소유자에게 전송 (허용)
  --> WhatsApp 외부 연락처로 차단 (차단)
```

### 역방향 추적

**질문:** "10:24 UTC에 전송된 메시지에 어떤 소스가 기여했습니까?"

역방향 추적은 출력에서 시작하여 계보 체인을 거슬러 올라가 출력에 영향을 미친 모든 데이터 소스를 식별합니다. 분류된 데이터가 응답에 포함되었는지 이해하는 데 필수적입니다.

```
출력: 10:24:00Z에 Telegram으로 전송된 메시지
  --> 세션: sess_456
  --> 계보 소스:
      --> lin_789xyz: Salesforce 기회 (CONFIDENTIAL)
      --> lin_790xyz: Salesforce 기회 (CONFIDENTIAL)
      --> lin_791xyz: Salesforce 기회 (CONFIDENTIAL)
      --> lin_792xyz: 날씨 API (PUBLIC)
```

### 분류 정당화

**질문:** "이 데이터가 왜 CONFIDENTIAL로 표시되었습니까?"

분류 정당화는 분류 수준을 할당한 규칙 또는 정책으로 추적합니다:

```
데이터: 파이프라인 요약 (lin_789xyz)
분류: CONFIDENTIAL
이유: source_system_default
  --> Salesforce 통합 기본 분류: CONFIDENTIAL
  --> 구성자: admin_001 at 2025-01-10T08:00:00Z
  --> 정책 규칙: "모든 Salesforce 데이터는 CONFIDENTIAL로 분류"
```

### 컴플라이언스 내보내기

법적, 규제, 내부 검토를 위해 Triggerfish는 모든 데이터 요소 또는 시간 범위에 대한 전체 관리 체인을 내보낼 수 있습니다:

```
내보내기 요청:
  --> 시간 범위: 2025-01-29T00:00:00Z ~ 2025-01-29T23:59:59Z
  --> 범위: user_456의 모든 세션
  --> 형식: JSON

내보내기에 포함:
  --> 시간 범위 내 모든 감사 레코드
  --> 감사 레코드가 참조하는 모든 계보 레코드
  --> 모든 세션 상태 전환
  --> 모든 정책 결정 (ALLOW, BLOCK, REDACT)
  --> 모든 taint 변경
  --> 모든 위임 체인 레코드
```

::: tip 컴플라이언스 내보내기는 SIEM 시스템, 컴플라이언스 대시보드, 법적 검토 도구에서 수집할 수 있는 구조화된 JSON 파일입니다. 내보내기 형식은 안정적이며 버전이 관리됩니다. :::

## 데이터 계보

감사 로깅은 Triggerfish의 데이터 계보 시스템과 함께 작동합니다. Triggerfish가 처리하는 모든 데이터 요소는 출처 메타데이터를 전달합니다:

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

계보 레코드는 `POST_TOOL_RESPONSE`(데이터가 시스템에 진입할 때)에서 생성되고 데이터가 변환될 때 업데이트됩니다. 집계된 데이터는 `max(입력 분류)`를 상속합니다 -- 입력 중 하나가 CONFIDENTIAL이면 출력은 최소 CONFIDENTIAL입니다.

| 이벤트                                | 계보 동작                                     |
| ------------------------------------- | --------------------------------------------- |
| 통합에서 데이터 읽기                  | 원본이 포함된 계보 레코드 생성                |
| LLM이 데이터 변환                     | 변환 추가, 입력 계보 연결                     |
| 여러 소스의 데이터 집계               | 계보 병합, 분류 = max(입력들)                 |
| 채널로 데이터 전송                    | 대상 기록, 분류 확인                          |
| 세션 초기화                           | 계보 레코드 아카이빙, 컨텍스트에서 삭제       |

## 저장소 및 보존

감사 로그는 `audit:` 네임스페이스 아래 `StorageProvider` 추상화를 통해 영속화됩니다. 계보 레코드는 `lineage:` 네임스페이스 아래 저장됩니다.

| 데이터 유형      | 네임스페이스 | 기본 보존                   |
| ---------------- | ------------ | --------------------------- |
| 감사 로그        | `audit:`     | 1년                         |
| 계보 레코드      | `lineage:`   | 90일                        |
| 세션 상태        | `sessions:`  | 30일                        |
| Taint 이력       | `taint:`     | 세션 보존과 동일            |

::: warning 보안 보존 기간은 구성 가능하지만, 감사 로그는 컴플라이언스 요구 사항(SOC 2, GDPR, HIPAA)을 지원하기 위해 기본 1년입니다. 조직의 규제 요구 사항 미만으로 보존 기간을 줄이는 것은 관리자의 책임입니다. :::

### 저장소 백엔드

| 티어           | 백엔드    | 세부 사항                                                                                                                                                    |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **개인**       | SQLite    | `~/.triggerfish/data/triggerfish.db`의 WAL 모드 데이터베이스입니다. 감사 레코드는 다른 모든 Triggerfish 상태와 같은 데이터베이스에 구조화된 JSON으로 저장됩니다. |
| **엔터프라이즈** | 플러그형 | 엔터프라이즈 백엔드(Postgres, S3 등)는 `StorageProvider` 인터페이스를 통해 사용할 수 있습니다. 기존 로그 집계 인프라와의 통합이 가능합니다.                    |

## 불변성 및 무결성

감사 레코드는 추가 전용입니다. 한번 작성되면 LLM, 에이전트, Plugin을 포함한 시스템의 어떤 구성 요소도 수정하거나 삭제할 수 없습니다. 삭제는 보존 정책 만료를 통해서만 발생합니다.

각 감사 레코드에는 무결성을 확인하는 데 사용할 수 있는 콘텐츠 해시가 포함됩니다. 컴플라이언스 검토를 위해 레코드를 내보내면 저장된 레코드와 비교하여 해시를 검증하여 변조를 감지할 수 있습니다.

## 엔터프라이즈 컴플라이언스 기능

엔터프라이즈 배포는 감사 로깅을 다음과 같이 확장할 수 있습니다:

| 기능                   | 설명                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **법적 보존**          | 지정된 사용자, 세션 또는 시간 범위에 대한 보존 기반 삭제 중지                             |
| **SIEM 통합**          | Splunk, Datadog 또는 기타 SIEM 시스템으로 실시간 감사 이벤트 스트리밍                     |
| **컴플라이언스 대시보드** | 정책 결정, 차단된 동작, taint 패턴의 시각적 개요                                          |
| **예약된 내보내기**    | 규제 검토를 위한 자동 주기적 내보내기                                                     |
| **알림 규칙**          | 특정 감사 패턴 발생 시 알림 트리거 (예: 반복적인 차단된 write-down)                       |

## 관련 페이지

- [보안 우선 설계](./) -- 보안 아키텍처 개요
- [No Write-Down 규칙](./no-write-down) -- 시행이 로깅되는 분류 흐름 규칙
- [신원 및 인증](./identity) -- 신원 결정이 기록되는 방법
- [에이전트 위임](./agent-delegation) -- 감사 레코드에서 위임 체인이 나타나는 방법
- [시크릿 관리](./secrets) -- 자격 증명 접근이 로깅되는 방법
