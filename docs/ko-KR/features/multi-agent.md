# 멀티 에이전트 라우팅

Triggerfish는 다른 채널, 계정 또는 연락처를 각각 자체 워크스페이스, 세션, 성격, 분류 상한을 가진 별도의 격리된 에이전트로 라우팅하는 것을 지원합니다.

## 여러 에이전트가 필요한 이유

단일 성격의 단일 에이전트가 항상 충분하지는 않습니다. 다음을 원할 수 있습니다:

- WhatsApp에서 캘린더, 알림, 가족 메시지를 처리하는 **개인 비서**.
- Slack에서 Jira 티켓, GitHub PR, 코드 리뷰를 관리하는 **업무 비서**.
- Discord에서 다른 톤과 제한된 접근으로 커뮤니티 질문에 답하는 **지원 에이전트**.

멀티 에이전트 라우팅을 사용하면 단일 Triggerfish 설치에서 이 모든 것을 동시에 실행할 수 있습니다.

## 작동 방식

<img src="/diagrams/multi-agent-routing.svg" alt="멀티 에이전트 라우팅: 인바운드 채널이 AgentRouter를 통해 격리된 에이전트 워크스페이스로 라우팅됩니다" style="max-width: 100%;" />

**AgentRouter**는 각 인바운드 메시지를 검사하고 구성 가능한 라우팅 규칙에 따라 에이전트에 매핑합니다. 일치하는 규칙이 없으면 메시지가 기본 에이전트로 전달됩니다.

## 라우팅 규칙

메시지는 다음으로 라우팅할 수 있습니다:

| 기준    | 설명                                  | 예시                                      |
| ------- | ------------------------------------- | ----------------------------------------- |
| 채널    | 메시징 플랫폼별 라우팅               | 모든 Slack 메시지가 "업무"로              |
| 계정    | 채널 내 특정 계정별 라우팅           | 업무 이메일 vs 개인 이메일                |
| 연락처  | 발신자/상대방 신원별 라우팅          | 매니저의 메시지가 "업무"로               |
| 기본값  | 규칙이 일치하지 않을 때 폴백         | 나머지 모든 것이 "개인"으로              |

## 구성

`triggerfish.yaml`에서 에이전트와 라우팅을 정의합니다:

```yaml
agents:
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Work Assistant"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Customer Support"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

각 에이전트는 다음을 지정합니다:

- **id** -- 라우팅을 위한 고유 식별자.
- **name** -- 사람이 읽을 수 있는 이름.
- **channels** -- 이 에이전트가 처리하는 채널 인스턴스.
- **tools** -- 도구 프로필 및 명시적 허용/거부 목록.
- **model** -- 사용할 LLM 모델 (에이전트별로 다를 수 있음).
- **classification_ceiling** -- 이 에이전트가 도달할 수 있는 최대 분류 수준.

## 에이전트 신원

각 에이전트는 성격, 미션, 경계를 정의하는 자체 `SPINE.md`를 가집니다. SPINE.md 파일은 에이전트의 워크스페이스 디렉터리에 있습니다:

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # 개인 비서 성격
    work/
      SPINE.md          # 업무 비서 성격
    support/
      SPINE.md          # 지원 봇 성격
```

## 격리

멀티 에이전트 라우팅은 에이전트 간 엄격한 격리를 시행합니다:

| 측면       | 격리                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------- |
| 세션       | 각 에이전트는 독립적인 세션 공간을 가집니다. 세션은 절대 공유되지 않습니다.               |
| Taint      | Taint는 에이전트별로 추적되며 에이전트 간에는 아닙니다. 업무 taint는 개인 세션에 영향을 미치지 않습니다. |
| 스킬       | 스킬은 워크스페이스별로 로드됩니다. 업무 스킬은 개인 에이전트에 사용할 수 없습니다.       |
| 시크릿     | 자격 증명은 에이전트별로 격리됩니다. 지원 에이전트는 업무 API 키에 접근할 수 없습니다.    |
| 워크스페이스 | 각 에이전트는 코드 실행을 위한 자체 파일시스템 워크스페이스를 가집니다.                  |

::: warning 에이전트 간 통신은 `sessions_send`를 통해 가능하지만 정책 계층에 의해 게이팅됩니다. 한 에이전트는 명시적 정책 규칙 없이 다른 에이전트의 데이터나 세션에 조용히 접근할 수 없습니다. :::

::: tip 멀티 에이전트 라우팅은 채널과 페르소나 간의 관심사 분리를 위한 것입니다. 공유 작업에 협업해야 하는 에이전트의 경우 [에이전트 팀](/ko-KR/features/agent-teams)을 참조하십시오. :::

## 기본 에이전트

인바운드 메시지와 일치하는 라우팅 규칙이 없으면 기본 에이전트로 전달됩니다. 구성에서 설정할 수 있습니다:

```yaml
agents:
  default: personal
```

기본값이 구성되지 않으면 목록의 첫 번째 에이전트가 기본값으로 사용됩니다.
