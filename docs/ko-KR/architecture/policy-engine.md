# 정책 엔진 및 Hook

정책 엔진은 LLM과 외부 세계 사이에 있는 시행 계층입니다. 데이터 흐름의 중요 지점에서 모든 동작을 가로채고 결정론적 ALLOW, BLOCK 또는 REDACT 결정을 내립니다. LLM은 이러한 결정을 우회, 수정 또는 영향을 미칠 수 없습니다.

## 핵심 원칙: LLM 아래의 시행

<img src="/diagrams/policy-enforcement-layers.svg" alt="정책 시행 계층: LLM은 정책 계층 위에, 정책 계층은 실행 계층 위에 있습니다" style="max-width: 100%;" />

::: warning 보안 LLM은 정책 계층 위에 있습니다. 프롬프트 인젝션, 탈옥 또는 조작될 수 있습니다 -- 그리고 그것은 중요하지 않습니다. 정책 계층은 LLM 아래에서 실행되는 순수 코드로, 구조화된 동작 요청을 검사하고 분류 규칙에 기반한 이진 결정을 내립니다. LLM 출력에서 hook 우회로의 경로가 없습니다. :::

## Hook 유형

8개의 시행 hook이 데이터 흐름의 모든 중요 지점에서 동작을 가로챕니다.

### Hook 아키텍처

<img src="/diagrams/hook-chain-flow.svg" alt="Hook 체인 흐름: PRE_CONTEXT_INJECTION → LLM 컨텍스트 → PRE_TOOL_CALL → 도구 실행 → POST_TOOL_RESPONSE → LLM 응답 → PRE_OUTPUT → 출력 채널" style="max-width: 100%;" />

### 모든 Hook 유형

| Hook                    | 트리거                         | 주요 동작                                                                | 실패 모드            |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------ | -------------------- |
| `PRE_CONTEXT_INJECTION` | 외부 입력이 컨텍스트에 진입    | 입력 분류, taint 할당, 계보 생성, 인젝션 스캔                            | 입력 거부            |
| `PRE_TOOL_CALL`         | LLM이 도구 실행 요청           | 권한 확인, 속도 제한, 매개변수 유효성 검사                               | 도구 호출 차단       |
| `POST_TOOL_RESPONSE`    | 도구가 데이터 반환             | 응답 분류, 세션 taint 업데이트, 계보 생성/업데이트                       | 교정 또는 차단       |
| `PRE_OUTPUT`            | 응답이 시스템을 떠나려 함      | 대상에 대한 최종 분류 확인, PII 스캔                                     | 출력 차단            |
| `SECRET_ACCESS`         | Plugin이 자격 증명 요청        | 접근 로깅, 선언된 범위에 대한 권한 확인                                  | 자격 증명 거부       |
| `SESSION_RESET`         | 사용자가 taint 초기화 요청     | 계보 아카이빙, 컨텍스트 지우기, 확인 검증                                | 확인 요구            |
| `AGENT_INVOCATION`      | 에이전트가 다른 에이전트 호출  | 위임 체인 확인, taint 상한 시행                                          | 호출 차단            |
| `MCP_TOOL_CALL`         | MCP 서버 도구 호출             | Gateway 정책 확인 (서버 상태, 도구 권한, 스키마)                         | MCP 호출 차단        |

## Hook 인터페이스

모든 hook은 컨텍스트를 받고 결과를 반환합니다. 핸들러는 동기적 순수 함수입니다.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hook별 페이로드는 유형에 따라 다릅니다
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler`는 동기적이며 Promise가 아닌 `HookResult`를 직접 반환합니다. 이것은 의도적입니다. Hook은 동작이 진행되기 전에 완료되어야 하며, 동기적으로 만드는 것은 비동기 우회의 모든 가능성을 제거합니다. hook이 시간 초과되면 동작이 거부됩니다. :::

## Hook 보장

모든 hook 실행은 네 가지 불변 규칙을 수반합니다:

| 보장              | 의미                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **결정론적**      | 같은 입력은 항상 같은 결정을 생성합니다. 무작위성 없음. hook 내 LLM 호출 없음. 결정에 영향을 미치는 외부 API 호출 없음.                   |
| **동기적**        | Hook은 동작이 진행되기 전에 완료됩니다. 비동기 우회는 불가능합니다. 시간 초과는 거부입니다.                                               |
| **로깅됨**        | 모든 hook 실행이 기록됩니다: 입력 매개변수, 내린 결정, 타임스탬프, 평가된 정책 규칙.                                                     |
| **위조 불가**     | LLM 출력에 hook 우회 지시가 포함될 수 없습니다. hook 계층에는 "LLM 출력을 명령으로 파싱" 로직이 없습니다.                                 |

## 정책 규칙 계층 구조

정책 규칙은 세 가지 티어로 구성됩니다. 상위 티어는 하위 티어를 재정의할 수 없습니다.

### 고정 규칙 (항상 시행, 구성 불가)

이 규칙들은 하드코딩되어 있으며 어떤 관리자, 사용자 또는 구성으로도 비활성화할 수 없습니다:

- **No write-down**: 분류 흐름은 단방향입니다. 데이터는 더 낮은 수준으로 흐를 수 없습니다.
- **UNTRUSTED 채널**: 데이터 입출력 없음. 예외 없음.
- **세션 taint**: 한번 상승하면 세션 수명 동안 유지됩니다.
- **감사 로깅**: 모든 동작이 로깅됩니다. 예외 없음. 비활성화 방법 없음.

### 구성 가능 규칙 (관리자 조정 가능)

관리자가 UI 또는 구성 파일을 통해 조정할 수 있습니다:

- 통합 기본 분류 (예: Salesforce는 기본 `CONFIDENTIAL`)
- 채널 분류
- 통합별 동작 허용/거부 목록
- 외부 통신을 위한 도메인 허용 목록
- 도구별, 사용자별 또는 세션별 속도 제한

### 선언적 Escape Hatch (엔터프라이즈)

엔터프라이즈 배포는 고급 시나리오를 위해 구조화된 YAML로 사용자 정의 정책 규칙을 정의할 수 있습니다:

```yaml
# SSN 패턴이 포함된 Salesforce 쿼리 차단
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDACTED]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# 고액 거래에 대한 승인 요구
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# 시간 기반 제한: 업무 시간 외 외부 전송 금지
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "External communications restricted outside business hours"
```

::: tip 사용자 정의 YAML 규칙은 활성화 전에 유효성 검사를 통과해야 합니다. 유효하지 않은 규칙은 런타임이 아닌 구성 시점에 거부됩니다. 이는 잘못된 구성으로 인한 보안 격차를 방지합니다. :::

## 거부 사용자 경험

정책 엔진이 동작을 차단하면 사용자에게 일반 오류가 아닌 명확한 설명이 표시됩니다.

**기본값 (구체적):**

```
I can't send confidential data to a public channel.

  -> Reset session and send message
  -> Cancel
```

**교육 모드 (선택적 활성화):**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  -> Reset session and send message
  -> Ask your admin to reclassify the WhatsApp channel
  -> Learn more: [docs link]
```

교육 모드는 선택적이며 동작이 차단된 _이유_를 이해하는 데 도움을 줍니다. taint 상승을 유발한 데이터 소스와 분류 불일치가 무엇인지 포함합니다. 두 모드 모두 막다른 오류 대신 실행 가능한 다음 단계를 제공합니다.

## Hook 체이닝 방식

일반적인 요청/응답 주기에서 여러 hook이 순서대로 실행됩니다. 각 hook은 체인에서 이전 hook이 내린 결정에 대한 완전한 가시성을 가집니다.

```
사용자 전송: "Check my Salesforce pipeline and message my wife"

1. PRE_CONTEXT_INJECTION
   - 소유자 입력, PUBLIC으로 분류
   - 세션 taint: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - 도구 허용? 예
   - 사용자에게 Salesforce 연결 있음? 예
   - 속도 제한? 정상
   - 결정: ALLOW

3. POST_TOOL_RESPONSE (salesforce 결과)
   - 데이터 분류: CONFIDENTIAL
   - 세션 taint 상승: PUBLIC -> CONFIDENTIAL
   - 계보 레코드 생성

4. PRE_TOOL_CALL (whatsapp.send_message)
   - 도구 허용? 예
   - 결정: ALLOW (도구 수준 확인 통과)

5. PRE_OUTPUT (WhatsApp을 통한 아내에게의 메시지)
   - 세션 taint: CONFIDENTIAL
   - 대상 유효 분류: PUBLIC (외부 수신자)
   - CONFIDENTIAL -> PUBLIC: 차단됨
   - 결정: BLOCK
   - 이유: "classification_violation"

6. 에이전트가 사용자에게 초기화 옵션 제시
```
