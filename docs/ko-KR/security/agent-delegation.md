# 에이전트 위임

AI 에이전트가 점점 더 서로 상호 작용하면서 -- 한 에이전트가 하위 작업을 완료하기 위해 다른 에이전트를 호출 -- 새로운 종류의 보안 위험이 발생합니다. 에이전트 체인을 사용하여 덜 제한된 에이전트를 통해 데이터를 세탁하고 분류 통제를 우회할 수 있습니다. Triggerfish는 암호화 에이전트 신원, 분류 상한, 필수 taint 상속으로 이를 방지합니다.

## 에이전트 인증서

Triggerfish의 모든 에이전트는 신원, 기능, 위임 권한을 정의하는 인증서를 가집니다. 이 인증서는 에이전트 소유자가 서명하며 에이전트 자체 또는 다른 에이전트가 수정할 수 없습니다.

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

인증서의 주요 필드:

| 필드                   | 목적                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `max_classification`   | **분류 상한** -- 이 에이전트가 운영할 수 있는 최고 taint 수준입니다. INTERNAL 상한을 가진 에이전트는 CONFIDENTIAL로 taint된 세션에서 호출될 수 없습니다.                   |
| `can_invoke_agents`    | 이 에이전트가 다른 에이전트를 호출할 수 있는지 여부입니다.                                                                                                               |
| `can_be_invoked_by`    | 이 에이전트를 호출할 수 있는 에이전트의 명시적 허용 목록입니다.                                                                                                          |
| `max_delegation_depth` | 에이전트 호출 체인의 최대 깊이입니다. 무한 재귀를 방지합니다.                                                                                                            |
| `signature`            | 소유자의 Ed25519 서명입니다. 인증서 변조를 방지합니다.                                                                                                                   |

## 호출 흐름

한 에이전트가 다른 에이전트를 호출하면 정책 계층은 피호출 에이전트가 실행되기 전에 위임을 검증합니다. 검사는 결정론적이며 코드에서 실행됩니다 -- 호출 에이전트가 결정에 영향을 미칠 수 없습니다.

<img src="/diagrams/agent-delegation-sequence.svg" alt="에이전트 위임 시퀀스: 에이전트 A가 에이전트 B를 호출하고, 정책 계층이 taint 대 상한을 검증하며, taint가 상한을 초과하면 차단합니다" style="max-width: 100%;" />

이 예시에서 에이전트 A는 CONFIDENTIAL 세션 taint를 가지고 있습니다(이전에 Salesforce 데이터에 접근). 에이전트 B는 INTERNAL 분류 상한을 가지고 있습니다. CONFIDENTIAL이 INTERNAL보다 높기 때문에 호출이 차단됩니다. 에이전트 A의 taint된 데이터는 더 낮은 분류 상한을 가진 에이전트로 흐를 수 없습니다.

::: warning 보안 정책 계층은 호출자의 상한이 아닌 **현재 세션 taint**를 확인합니다. 에이전트 A가 CONFIDENTIAL 상한을 가지고 있더라도 중요한 것은 호출 시점의 세션의 실제 taint 수준입니다. 에이전트 A가 분류된 데이터에 접근하지 않았다면(taint가 PUBLIC) 에이전트 B(INTERNAL 상한)를 문제 없이 호출할 수 있습니다. :::

## 위임 체인 추적

에이전트가 다른 에이전트를 호출하면 각 단계의 타임스탬프와 taint 수준을 포함한 전체 체인이 추적됩니다:

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Sales Assistant",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Summarize Q4 pipeline"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Data Analyst",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Calculate win rates"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

이 체인은 감사 로그에 기록되며 컴플라이언스 및 포렌식 분석을 위해 쿼리할 수 있습니다. 어떤 에이전트가 관련되었는지, taint 수준이 어떠했는지, 어떤 작업을 수행했는지 정확히 추적할 수 있습니다.

## 보안 불변 규칙

네 가지 불변 규칙이 에이전트 위임을 관리합니다. 모두 정책 계층의 코드로 시행되며 체인의 어떤 에이전트도 재정의할 수 없습니다.

| 불변 규칙                      | 시행                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Taint는 증가만 가능**        | 각 피호출자는 `max(자체 taint, 호출자 taint)`를 상속합니다. 피호출자의 taint는 호출자보다 낮을 수 없습니다.                   |
| **상한 준수**                  | 호출자의 taint가 피호출자의 `max_classification` 상한을 초과하면 에이전트를 호출할 수 없습니다.                               |
| **깊이 제한 시행**             | 체인은 `max_delegation_depth`에서 종료됩니다. 제한이 3이면 네 번째 수준의 호출이 차단됩니다.                                  |
| **순환 호출 차단**             | 같은 체인에서 에이전트가 두 번 나타날 수 없습니다. 에이전트 A가 에이전트 B를 호출하고 B가 다시 A를 호출하려 하면 두 번째 호출이 차단됩니다. |

### 상세 Taint 상속

에이전트 A(taint: CONFIDENTIAL)가 에이전트 B(상한: CONFIDENTIAL)를 성공적으로 호출하면 에이전트 B는 에이전트 A에서 상속한 CONFIDENTIAL taint로 시작합니다. 에이전트 B가 이후 RESTRICTED 데이터에 접근하면 taint가 RESTRICTED로 상승합니다. 이 상승된 taint는 호출이 완료될 때 에이전트 A로 다시 전달됩니다.

<img src="/diagrams/taint-inheritance.svg" alt="Taint 상속: 에이전트 A(INTERNAL)가 에이전트 B를 호출하고, B가 taint를 상속하고, Salesforce에 접근(CONFIDENTIAL)하고, 상승된 taint를 A에게 반환합니다" style="max-width: 100%;" />

Taint는 양방향으로 흐릅니다 -- 호출 시 호출자에서 피호출자로, 완료 시 피호출자에서 호출자로. 상승만 가능합니다.

## 데이터 세탁 방지

멀티 에이전트 시스템에서 핵심 공격 벡터는 **데이터 세탁** -- 중간 에이전트를 통해 라우팅하여 분류된 데이터를 더 낮은 분류 대상으로 이동시키는 에이전트 체인 사용 -- 입니다.

### 공격

```
공격자 목표: PUBLIC 채널을 통해 CONFIDENTIAL 데이터 유출

시도된 흐름:
1. 에이전트 A가 Salesforce에 접근 (taint --> CONFIDENTIAL)
2. 에이전트 A가 에이전트 B를 호출 (PUBLIC 채널을 가짐)
3. 에이전트 B가 PUBLIC 채널로 데이터 전송
```

### 실패하는 이유

Triggerfish는 여러 지점에서 이 공격을 차단합니다:

**차단 지점 1: 호출 검사.** 에이전트 B의 상한이 CONFIDENTIAL 미만이면 호출이 완전히 차단됩니다. 에이전트 A의 taint(CONFIDENTIAL)가 에이전트 B의 상한을 초과합니다.

**차단 지점 2: Taint 상속.** 에이전트 B가 CONFIDENTIAL 상한을 가지고 있어 호출이 성공하더라도 에이전트 B는 에이전트 A의 CONFIDENTIAL taint를 상속합니다. 에이전트 B가 PUBLIC 채널로 출력하려 하면 `PRE_OUTPUT` hook이 write-down을 차단합니다.

**차단 지점 3: 위임 중 taint 초기화 불가.** 위임 체인의 에이전트는 taint를 초기화할 수 없습니다. Taint 초기화는 최종 사용자만 사용할 수 있으며 전체 대화 기록을 지웁니다. 에이전트가 체인 중에 taint 수준을 "세탁"하는 메커니즘이 없습니다.

::: danger 에이전트 위임을 통해 데이터가 분류를 벗어날 수 없습니다. 상한 검사, 필수 taint 상속, 체인 내 taint 초기화 불가의 조합은 Triggerfish 보안 모델 내에서 에이전트 체인을 통한 데이터 세탁을 불가능하게 합니다. :::

## 예시 시나리오

### 시나리오 1: 성공적인 위임

```
에이전트 A (상한: CONFIDENTIAL, 현재 taint: INTERNAL)
  에이전트 B 호출 (상한: CONFIDENTIAL)

정책 검사:
  - A가 B를 호출할 수 있습니까? 예 (B가 A의 위임 목록에 있음)
  - A의 taint (INTERNAL) <= B의 상한 (CONFIDENTIAL)? 예
  - 깊이 제한 OK? 예 (최대 3 중 깊이 1)
  - 순환? 아니오

결과: 허용
에이전트 B가 taint: INTERNAL (A에서 상속)로 시작
```

### 시나리오 2: 상한에 의해 차단

```
에이전트 A (상한: RESTRICTED, 현재 taint: CONFIDENTIAL)
  에이전트 B 호출 (상한: INTERNAL)

정책 검사:
  - A의 taint (CONFIDENTIAL) <= B의 상한 (INTERNAL)? 아니오

결과: 차단
이유: 에이전트 B 상한 (INTERNAL)이 세션 taint (CONFIDENTIAL) 미만
```

### 시나리오 3: 깊이 제한에 의해 차단

```
에이전트 A가 에이전트 B 호출 (깊이 1)
  에이전트 B가 에이전트 C 호출 (깊이 2)
    에이전트 C가 에이전트 D 호출 (깊이 3)
      에이전트 D가 에이전트 E 호출 (깊이 4)

에이전트 E에 대한 정책 검사:
  - 깊이 4 > max_delegation_depth (3)

결과: 차단
이유: 최대 위임 깊이 초과
```

### 시나리오 4: 순환 참조에 의해 차단

```
에이전트 A가 에이전트 B 호출 (깊이 1)
  에이전트 B가 에이전트 C 호출 (깊이 2)
    에이전트 C가 에이전트 A 호출 (깊이 3)

두 번째 에이전트 A 호출에 대한 정책 검사:
  - 에이전트 A가 이미 체인에 존재

결과: 차단
이유: 순환 에이전트 호출 감지
```

## 관련 페이지

- [보안 우선 설계](./) -- 보안 아키텍처 개요
- [No Write-Down 규칙](./no-write-down) -- 위임이 시행하는 분류 흐름 규칙
- [신원 및 인증](./identity) -- 사용자 및 채널 신원 수립 방법
- [감사 및 컴플라이언스](./audit-logging) -- 감사 로그에서 위임 체인이 기록되는 방법
