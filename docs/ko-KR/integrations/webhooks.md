# Webhook

Triggerfish는 외부 서비스로부터 인바운드 이벤트를 수신할 수 있어 이메일, 오류 알림, CI/CD 이벤트, 캘린더 변경 등에 대한 실시간 반응을 가능하게 합니다. Webhook은 에이전트를 반응적 질문 응답 시스템에서 워크플로우의 능동적 참여자로 전환합니다.

## Webhook 작동 방식

외부 서비스가 Triggerfish gateway의 등록된 webhook 엔드포인트로 HTTP POST 요청을 보냅니다. 들어오는 각 이벤트는 진위가 검증되고, 분류되며, 처리를 위해 에이전트로 라우팅됩니다.

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook 파이프라인: 외부 서비스가 HMAC 검증, 분류, 세션 격리, 정책 hook을 통해 에이전트 처리로 HTTP POST 전송" style="max-width: 100%;" />

## 지원되는 이벤트 소스

Triggerfish는 HTTP webhook 전달을 지원하는 모든 서비스로부터 webhook을 수신할 수 있습니다. 일반적인 통합은 다음과 같습니다:

| 소스     | 메커니즘                   | 이벤트 예시                           |
| -------- | -------------------------- | ------------------------------------- |
| Gmail    | Pub/Sub 푸시 알림          | 새 이메일, 라벨 변경                  |
| GitHub   | Webhook                    | PR 열림, 이슈 코멘트, CI 실패        |
| Sentry   | Webhook                    | 오류 알림, 회귀 감지                  |
| Stripe   | Webhook                    | 결제 수신, 구독 변경                  |
| Calendar | 폴링 또는 푸시             | 이벤트 알림, 충돌 감지                |
| 사용자 정의 | 일반 webhook 엔드포인트 | 모든 JSON 페이로드                    |

## 구성

Webhook 엔드포인트는 `triggerfish.yaml`에서 구성됩니다:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret stored in OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secret stored in OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### 구성 필드

| 필드              | 필수   | 설명                                                     |
| ----------------- | :----: | -------------------------------------------------------- |
| `id`              |   예   | 이 webhook 엔드포인트의 고유 식별자                      |
| `path`            |   예   | 엔드포인트가 등록된 URL 경로                             |
| `secret`          |   예   | HMAC 서명 검증을 위한 공유 시크릿                        |
| `classification`  |   예   | 이 소스의 이벤트에 할당된 분류 수준                      |
| `actions`         |   예   | 이벤트-작업 매핑 목록                                    |
| `actions[].event` |   예   | 매칭할 이벤트 유형 패턴                                  |
| `actions[].task`  |   예   | 에이전트가 실행할 자연어 작업                            |

::: tip Webhook 시크릿은 OS 키체인에 저장됩니다. `triggerfish dive`를 실행하거나 대화형으로 webhook을 구성하여 안전하게 입력하십시오. :::

## HMAC 서명 검증

모든 인바운드 webhook 요청은 페이로드가 처리되기 전에 HMAC 서명 검증으로 진위가 확인됩니다.

### 검증 작동 방식

1. 외부 서비스가 서명 헤더와 함께 webhook을 보냅니다 (예: GitHub의 경우 `X-Hub-Signature-256`)
2. Triggerfish가 구성된 공유 시크릿을 사용하여 요청 본문의 HMAC을 계산합니다
3. 계산된 서명이 요청 헤더의 서명과 비교됩니다
4. 서명이 일치하지 않으면 요청이 즉시 **거부**됩니다
5. 검증되면 페이로드가 분류 및 처리로 진행됩니다

<img src="/diagrams/hmac-verification.svg" alt="HMAC 검증 흐름: 서명 존재 확인, HMAC 계산, 서명 비교, 거부 또는 진행" style="max-width: 100%;" />

::: warning 보안 유효한 HMAC 서명이 없는 Webhook 요청은 처리 전에 거부됩니다. 이는 위조된 이벤트가 에이전트 동작을 트리거하는 것을 방지합니다. 프로덕션에서 서명 검증을 비활성화하지 마십시오. :::

## 이벤트 처리 파이프라인

Webhook 이벤트가 서명 검증을 통과하면 표준 보안 파이프라인을 통해 흐릅니다:

### 1. 분류

이벤트 페이로드는 webhook 엔드포인트에 구성된 수준으로 분류됩니다. `CONFIDENTIAL`로 구성된 webhook 엔드포인트는 `CONFIDENTIAL` 이벤트를 생성합니다.

### 2. 세션 격리

각 webhook 이벤트는 자체 격리된 세션을 생성합니다. 이는 다음을 의미합니다:

- 이벤트가 진행 중인 대화와 독립적으로 처리됩니다
- 세션 taint가 새로 시작됩니다 (webhook의 분류 수준에서)
- Webhook 트리거 세션과 사용자 세션 간에 데이터 누출이 없습니다
- 각 세션은 자체 taint 추적과 계보를 가집니다

### 3. PRE_CONTEXT_INJECTION Hook

이벤트 페이로드가 에이전트 컨텍스트에 진입하기 전에 `PRE_CONTEXT_INJECTION` hook을 통과합니다. 이 hook은:

- 페이로드 구조를 검증합니다
- 모든 데이터 필드에 분류를 적용합니다
- 인바운드 데이터에 대한 계보 레코드를 생성합니다
- 문자열 필드에서 인젝션 패턴을 스캔합니다
- 정책 규칙이 지시하면 이벤트를 차단할 수 있습니다

### 4. 에이전트 처리

에이전트는 분류된 이벤트를 수신하고 구성된 작업을 실행합니다. 작업은 자연어 지시입니다 -- 에이전트는 정책 제약 내에서 전체 기능(도구, skill, 브라우저, 실행 환경)을 사용하여 완료합니다.

### 5. 출력 전달

에이전트의 모든 출력(메시지, 알림, 동작)은 `PRE_OUTPUT` hook을 통과합니다. No Write-Down 규칙이 적용됩니다: `CONFIDENTIAL` webhook 트리거 세션의 출력은 `PUBLIC` 채널로 전송할 수 없습니다.

### 6. 감사

완전한 이벤트 수명 주기가 기록됩니다: 수신, 검증, 분류, 세션 생성, 에이전트 동작, 출력 결정.

## 스케줄러와의 통합

Webhook은 Triggerfish의 [cron 및 트리거 시스템](/ko-KR/features/cron-and-triggers)과 자연스럽게 통합됩니다. Webhook 이벤트는:

- 기존 cron 작업을 예정보다 일찍 **트리거**할 수 있습니다 (예: 배포 webhook이 즉시 헬스 체크를 트리거)
- **새 예약 작업을 생성**할 수 있습니다 (예: 캘린더 webhook이 알림을 예약)
- **트리거 우선순위를 업데이트**할 수 있습니다 (예: Sentry 알림이 에이전트가 다음 트리거 웨이크업에서 오류 조사를 우선시하게 함)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # 에이전트가 cron.create를 사용하여 후속 검사를 예약할 수 있음
```

## 보안 요약

| 제어                    | 설명                                                                            |
| ----------------------- | ------------------------------------------------------------------------------- |
| HMAC 검증               | 모든 인바운드 webhook이 처리 전에 검증됩니다                                    |
| 분류                    | Webhook 페이로드가 구성된 수준으로 분류됩니다                                   |
| 세션 격리               | 각 이벤트가 자체 격리된 세션을 가집니다                                         |
| `PRE_CONTEXT_INJECTION` | 컨텍스트에 진입하기 전에 페이로드가 스캔되고 분류됩니다                         |
| No Write-Down           | 높은 분류의 이벤트 출력이 낮은 분류의 채널에 도달할 수 없습니다                 |
| 감사 로깅               | 완전한 이벤트 수명 주기가 기록됩니다                                            |
| 비공개 노출             | Webhook 엔드포인트는 기본적으로 공용 인터넷에 노출되지 않습니다                 |

## 예시: GitHub PR 리뷰 루프

실제 webhook 활용 예시: 에이전트가 PR을 열고, GitHub webhook 이벤트가 폴링 없이 코드 리뷰 피드백 루프를 구동합니다.

### 작동 방식

1. 에이전트가 피처 브랜치를 생성하고, 코드를 커밋하고, `gh pr create`를 통해 PR을 엽니다
2. 에이전트가 `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`에 브랜치 이름, PR 번호, 작업 컨텍스트가 포함된 추적 파일을 작성합니다
3. 에이전트가 중지하고 대기합니다 -- 폴링 없음

리뷰어가 피드백을 게시하면:

4. GitHub가 Triggerfish에 `pull_request_review` webhook을 보냅니다
5. Triggerfish가 HMAC 서명을 검증하고, 이벤트를 분류하고, 격리된 세션을 생성합니다
6. 에이전트가 추적 파일을 읽어 컨텍스트를 복구하고, 브랜치를 체크아웃하고, 리뷰를 처리하고, 커밋, 푸시하고, PR에 코멘트합니다
7. 리뷰가 승인될 때까지 4-6단계가 반복됩니다

PR이 병합되면:

8. GitHub가 `merged: true`와 함께 `pull_request.closed` webhook을 보냅니다
9. 에이전트가 정리합니다: 로컬 브랜치 삭제, 추적 파일 아카이브

### 구성

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

GitHub webhook은 다음을 전송해야 합니다: `Pull requests`, `Pull request reviews`, `Pull request review comments`, `Issue comments`.

설정 지침과 완전한 에이전트 워크플로우에 대한 `git-branch-management` 번들 skill은 [GitHub 통합](/ko-KR/integrations/github) 가이드를 참조하십시오.

### 엔터프라이즈 제어

- 관리자가 관리하는 **Webhook 허용 목록** -- 승인된 외부 소스만 엔드포인트를 등록할 수 있습니다
- 남용을 방지하기 위한 엔드포인트별 **속도 제한**
- 메모리 소진을 방지하기 위한 **페이로드 크기 제한**
- 추가 소스 검증을 위한 **IP 허용 목록**
- Webhook 이벤트 로그에 대한 **보존 정책**

::: info Webhook 엔드포인트는 기본적으로 공용 인터넷에 노출되지 않습니다. 외부 서비스가 Triggerfish 인스턴스에 접근하려면 포트 포워딩, 리버스 프록시 또는 터널을 구성해야 합니다. [원격 접근](/ko-KR/integrations/remote) 섹션에서 안전한 노출 옵션을 다룹니다. :::
