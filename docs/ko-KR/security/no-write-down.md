# No Write-Down 규칙

No write-down 규칙은 Triggerfish의 데이터 보호 모델의 기반입니다. 모든 세션, 모든 채널, 모든 에이전트에 적용되는 고정된 구성 불가 규칙이며 -- 예외가 없고 LLM 재정의가 없습니다.

**규칙:** 데이터는 **동일하거나 더 높은** 분류 수준의 채널과 수신자에게만 흐를 수 있습니다.

이 단일 규칙은 우발적인 과도한 공유부터 민감한 정보를 유출하도록 설계된 정교한 프롬프트 인젝션 공격까지 전체 유형의 데이터 유출 시나리오를 방지합니다.

## 분류 흐름 방식

Triggerfish는 네 가지 분류 수준을 사용합니다(높은 것부터 낮은 것 순):

<img src="/diagrams/write-down-rules.svg" alt="Write-down 규칙: 데이터는 동일하거나 더 높은 분류 수준으로만 흐릅니다" style="max-width: 100%;" />

주어진 수준으로 분류된 데이터는 해당 수준 또는 그 위의 수준으로 흐를 수 있습니다. 절대 아래로 흐를 수 없습니다. 이것이 no write-down 규칙입니다.

::: danger No write-down 규칙은 **고정되고 구성 불가**합니다. 관리자가 완화하거나, 정책 규칙으로 재정의하거나, LLM이 우회할 수 없습니다. 다른 모든 보안 통제가 기반하는 아키텍처적 기반입니다. :::

## 유효 분류

데이터가 시스템을 떠나려 할 때 Triggerfish는 대상의 **유효 분류**를 계산합니다:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

채널과 수신자 모두 데이터의 분류 수준 이상이어야 합니다. 둘 중 하나라도 미만이면 출력이 차단됩니다.

| 채널                    | 수신자                       | 유효 분류  |
| ----------------------- | ---------------------------- | ---------- |
| INTERNAL (Slack)        | INTERNAL (동료)              | INTERNAL   |
| INTERNAL (Slack)        | EXTERNAL (벤더)              | PUBLIC     |
| CONFIDENTIAL (Slack)    | INTERNAL (동료)              | INTERNAL   |
| CONFIDENTIAL (Email)    | EXTERNAL (개인 연락처)       | PUBLIC     |

::: info EXTERNAL 수신자가 있는 CONFIDENTIAL 채널은 유효 분류가 PUBLIC입니다. 세션이 PUBLIC 이상의 데이터에 접근한 경우 출력이 차단됩니다. :::

## 실제 예시

No write-down 규칙이 작동하는 구체적인 시나리오입니다.

```
사용자: "내 Salesforce 파이프라인 확인해줘"

에이전트: [사용자의 위임된 토큰으로 Salesforce 접근]
         [Salesforce 데이터가 CONFIDENTIAL로 분류됨]
         [세션 taint가 CONFIDENTIAL로 상승]

         "이번 주에 마감되는 거래가 3건이며 총 $2.1M..."

사용자: "아내에게 오늘 늦을 거라고 메시지 보내줘"

정책 계층: 차단
  - 세션 taint: CONFIDENTIAL
  - 수신자 (아내): EXTERNAL
  - 유효 분류: PUBLIC
  - CONFIDENTIAL > PUBLIC --> write-down 위반

에이전트: "기밀 데이터에 접근한 이 세션에서는 외부 연락처에
          전송할 수 없습니다.

          -> 세션 초기화 후 메시지 전송
          -> 취소"
```

사용자가 Salesforce 데이터(CONFIDENTIAL로 분류됨)에 접근하여 전체 세션이 taint되었습니다. 그런 다음 외부 연락처(유효 분류 PUBLIC)에게 메시지를 보내려 하자 정책 계층이 CONFIDENTIAL 데이터가 PUBLIC 대상으로 흐를 수 없기 때문에 출력을 차단했습니다.

::: tip 아내에게 보내는 에이전트의 메시지("오늘 늦을 거예요")는 그 자체로 Salesforce 데이터를 포함하지 않습니다. 그러나 세션은 이전 Salesforce 접근으로 taint되었고 LLM이 Salesforce 응답에서 보유했을 수 있는 모든 것을 포함하는 전체 세션 컨텍스트가 출력에 영향을 미칠 수 있습니다. No write-down 규칙은 이 전체 유형의 컨텍스트 유출을 방지합니다. :::

## 사용자에게 표시되는 내용

No write-down 규칙이 동작을 차단하면 사용자에게 명확하고 실행 가능한 메시지가 표시됩니다. Triggerfish는 두 가지 응답 모드를 제공합니다:

**기본값 (구체적):**

```
I can't send confidential data to a public channel.

-> Reset session and send message
-> Cancel
```

**교육 모드 (구성을 통해 선택적 활성화):**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  - Reset session and send message
  - Ask your admin to reclassify the WhatsApp channel
  - Learn more: https://trigger.fish/security/no-write-down
```

두 경우 모두 사용자에게 명확한 옵션이 제공됩니다. 무슨 일이 일어났는지 또는 어떻게 할 수 있는지에 대해 혼란스럽지 않습니다.

## 세션 초기화

사용자가 "세션 초기화 후 메시지 전송"을 선택하면 Triggerfish는 **전체 초기화**를 수행합니다:

1. 세션 taint가 PUBLIC으로 지워집니다
2. 전체 대화 기록이 지워집니다(컨텍스트 유출 방지)
3. 요청된 동작이 새로운 세션에 대해 재평가됩니다
4. 동작이 이제 허용되면(PUBLIC 데이터를 PUBLIC 채널로) 진행됩니다

::: warning 보안 세션 초기화는 taint **및** 대화 기록을 모두 지웁니다. 이것은 선택 사항이 아닙니다. taint 레이블만 지우고 대화 컨텍스트가 남아 있으면 LLM이 이전 메시지에서 분류된 정보를 참조할 수 있어 초기화의 목적이 무효화됩니다. :::

## 시행 방식

No write-down 규칙은 `PRE_OUTPUT` hook -- 데이터가 시스템을 떠나기 전 마지막 시행 지점 -- 에서 시행됩니다. Hook은 동기적이고 결정론적인 코드로 실행됩니다:

```typescript
// 단순화된 시행 로직
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Session taint (${sessionTaint}) exceeds effective ` +
        `classification (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Classification check passed" };
}
```

이 코드는:

- **결정론적** -- 같은 입력은 항상 같은 결정을 생성합니다
- **동기적** -- hook이 완료된 후에야 출력이 전송됩니다
- **위조 불가** -- LLM이 hook의 결정에 영향을 미칠 수 없습니다
- **로깅됨** -- 모든 실행이 전체 컨텍스트와 함께 기록됩니다

## 세션 Taint와 상승

세션 taint는 세션 중 접근한 데이터의 최고 분류 수준을 추적합니다. 두 가지 엄격한 규칙을 따릅니다:

1. **상승만 가능** -- taint는 세션 내에서 증가만 가능하고 감소하지 않습니다
2. **자동** -- 데이터가 세션에 진입할 때마다 `POST_TOOL_RESPONSE` hook에 의해 taint가 업데이트됩니다

| 동작                                  | 이전 Taint   | 이후 Taint                    |
| ------------------------------------- | ------------ | ----------------------------- |
| 날씨 API 접근 (PUBLIC)               | PUBLIC       | PUBLIC                        |
| 내부 위키 접근 (INTERNAL)             | PUBLIC       | INTERNAL                      |
| Salesforce 접근 (CONFIDENTIAL)        | INTERNAL     | CONFIDENTIAL                  |
| 날씨 API 다시 접근 (PUBLIC)           | CONFIDENTIAL | CONFIDENTIAL (변경 없음)      |

세션이 CONFIDENTIAL에 도달하면 사용자가 명시적으로 초기화할 때까지 CONFIDENTIAL로 유지됩니다. 자동 감소, 시간 초과, LLM이 taint를 낮추는 방법이 없습니다.

## 이 규칙이 고정인 이유

No write-down 규칙은 구성 가능하게 만들면 전체 보안 모델이 약화되기 때문에 구성 불가입니다. 관리자가 예외를 만들 수 있다면 -- "이 하나의 통합에 대해 CONFIDENTIAL 데이터가 PUBLIC 채널로 흐르는 것을 허용" -- 그 예외가 공격 면이 됩니다.

Triggerfish의 다른 모든 보안 통제는 no write-down 규칙이 절대적이라는 가정 위에 구축됩니다. 세션 taint, 데이터 계보, 에이전트 위임 상한, 감사 로깅 모두 이에 의존합니다. 구성 가능하게 만들면 전체 아키텍처를 재고해야 합니다.

::: info 관리자는 채널, 수신자, 통합에 할당된 분류 수준을 **구성할 수** 있습니다. 이것이 데이터 흐름을 조정하는 올바른 방법입니다: 채널이 더 높은 분류의 데이터를 받아야 한다면 채널을 더 높은 수준으로 분류하십시오. 규칙 자체는 고정이고 규칙에 대한 입력이 구성 가능합니다. :::

## 관련 페이지

- [보안 우선 설계](./) -- 보안 아키텍처 개요
- [신원 및 인증](./identity) -- 채널 신원이 수립되는 방법
- [감사 및 컴플라이언스](./audit-logging) -- 차단된 동작이 기록되는 방법
- [아키텍처: Taint 및 세션](/ko-KR/architecture/taint-and-sessions) -- 세션 taint 메커니즘의 상세 내용
