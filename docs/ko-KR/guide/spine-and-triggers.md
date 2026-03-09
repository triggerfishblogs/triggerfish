# SPINE과 트리거

Triggerfish는 두 개의 마크다운 파일을 사용하여 에이전트의 행동을 정의합니다: **SPINE.md**는 에이전트의 정체성을 제어하고, **TRIGGER.md**는 에이전트가 능동적으로 수행하는 작업을 제어합니다. 두 파일 모두 자유 형식 마크다운이며 일반 한국어(또는 영어)로 작성합니다.

## SPINE.md -- 에이전트 정체성

`SPINE.md`는 에이전트 시스템 프롬프트의 기반입니다. 에이전트의 이름, 성격, 미션, 지식 도메인, 경계를 정의합니다. Triggerfish는 메시지를 처리할 때마다 이 파일을 로드하므로 변경 사항이 즉시 적용됩니다.

### 파일 위치

```
~/.triggerfish/SPINE.md
```

멀티 에이전트 설정의 경우 각 에이전트에 자체 SPINE.md가 있습니다:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### 시작하기

설정 마법사(`triggerfish dive`)는 답변을 기반으로 시작 SPINE.md를 생성합니다. 언제든지 자유롭게 편집할 수 있습니다 -- 단순한 마크다운입니다.

### 효과적인 SPINE.md 작성

좋은 SPINE.md는 구체적입니다. 에이전트의 역할에 대해 구체적일수록 더 좋은 성능을 발휘합니다. 권장 구조입니다:

```markdown
# Identity

You are Reef, a personal AI assistant for Sarah.

# Mission

Help Sarah stay organized, informed, and productive. Prioritize calendar
management, email triage, and task tracking.

# Communication Style

- Be concise and direct. No filler.
- Use bullet points for lists of 3+ items.
- When uncertain, say so rather than guessing.
- Match the formality of the channel: casual on WhatsApp, professional on Slack.

# Domain Knowledge

- Sarah is a product manager at Acme Corp.
- Key tools: Linear for tasks, Google Calendar, Gmail, Slack.
- VIP contacts: @boss (David Chen), @skip (Maria Lopez).
- Current priorities: Q2 roadmap, mobile app launch.

# Boundaries

- Never send messages to external contacts without explicit approval.
- Never make financial transactions.
- Always confirm before deleting or modifying calendar events.
- When discussing work topics on personal channels, remind Sarah about
  classification boundaries.

# Response Preferences

- Default to short responses (2-3 sentences).
- Use longer responses only when the question requires detail.
- For code, include brief comments explaining key decisions.
```

### 모범 사례

::: tip **성격에 대해 구체적으로 작성하십시오.** "도움이 되게"라고 쓰는 대신 "간결하고 직접적이며 명확성을 위해 글머리 기호를 사용"이라고 작성하십시오. :::

::: tip **소유자에 대한 맥락을 포함하십시오.** 에이전트는 역할, 도구, 우선순위를 알 때 더 나은 성능을 발휘합니다. :::

::: tip **명시적 경계를 설정하십시오.** 에이전트가 절대 해서는 안 되는 것을 정의하십시오. 이는 정책 엔진의 결정론적 시행을 보완하지만(대체하지는 않습니다). :::

::: warning SPINE.md 지침은 LLM의 행동을 안내하지만 보안 제어는 아닙니다. 시행 가능한 제한 사항에 대해서는 `triggerfish.yaml`의 정책 엔진을 사용하십시오. 정책 엔진은 결정론적이며 우회할 수 없습니다 -- SPINE.md 지침은 우회될 수 있습니다. :::

## TRIGGER.md -- 능동적 행동

`TRIGGER.md`는 에이전트가 주기적 기상 중에 확인, 모니터링, 수행해야 할 사항을 정의합니다. 고정된 작업을 일정에 따라 실행하는 cron 작업과 달리, 트리거는 에이전트에게 조건을 평가하고 조치가 필요한지 결정하는 재량을 줍니다.

### 파일 위치

```
~/.triggerfish/TRIGGER.md
```

멀티 에이전트 설정의 경우:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### 트리거 작동 방식

1. 트리거 루프가 구성된 간격으로 에이전트를 깨웁니다(`triggerfish.yaml`에서 설정)
2. Triggerfish가 TRIGGER.md를 로드하여 에이전트에 제시합니다
3. 에이전트가 각 항목을 평가하고 필요한 경우 조치를 취합니다
4. 모든 트리거 동작은 일반 정책 hook을 통과합니다
5. 트리거 세션은 분류 상한으로 실행됩니다(YAML에서도 구성)
6. 조용한 시간이 존중됩니다 -- 해당 시간에는 트리거가 실행되지 않습니다

### YAML에서 트리거 구성

`triggerfish.yaml`에서 타이밍과 제약 조건을 설정합니다:

```yaml
trigger:
  interval: 30m # 30분마다 확인
  classification: INTERNAL # 트리거 세션의 최대 taint 상한
  quiet_hours: "22:00-07:00" # 이 시간 동안 기상 없음
```

### TRIGGER.md 작성

우선순위별로 트리거를 구성하십시오. 무엇이 조치 가능한지, 에이전트가 그에 대해 무엇을 해야 하는지 구체적으로 작성하십시오.

```markdown
# Priority Checks

- Unread messages across all channels older than 1 hour -- summarize and notify
  on primary channel.
- Calendar conflicts in the next 24 hours -- flag and suggest resolution.
- Overdue tasks in Linear -- list them with days overdue.

# Monitoring

- GitHub: PRs awaiting my review -- notify if older than 4 hours.
- Email: anything from VIP contacts (David Chen, Maria Lopez) -- flag for
  immediate notification regardless of quiet hours.
- Slack: mentions in #incidents channel -- summarize and escalate if unresolved.

# Proactive

- If morning (7-9am), prepare daily briefing with calendar, weather, and top 3
  priorities.
- If Friday afternoon, draft weekly summary of completed tasks and open items.
- If inbox count exceeds 50 unread, offer to batch-triage.
```

### 예시: 최소 TRIGGER.md

간단한 출발점을 원한다면:

```markdown
# Check on each wakeup

- Any unread messages older than 1 hour
- Calendar events in the next 4 hours
- Anything urgent in email
```

### 예시: 개발자 중심 TRIGGER.md

```markdown
# High Priority

- CI failures on main branch -- investigate and notify.
- PRs awaiting my review older than 2 hours.
- Sentry errors with "critical" severity in the last hour.

# Monitoring

- Dependabot PRs -- auto-approve patch updates, flag minor/major.
- Build times trending above 10 minutes -- report weekly.
- Open issues assigned to me with no updates in 3 days.

# Daily

- Morning: summarize overnight CI runs and deploy status.
- End of day: list PRs I opened that are still pending review.
```

### 트리거와 정책 엔진

모든 트리거 동작은 대화형 대화와 동일한 정책 시행의 대상입니다:

- 각 트리거 기상은 자체 taint 추적이 있는 격리된 세션을 생성합니다
- YAML 구성의 분류 상한이 트리거가 접근할 수 있는 데이터를 제한합니다
- No write-down 규칙이 적용됩니다 -- 트리거가 기밀 데이터에 접근하면 공개 채널로 결과를 보낼 수 없습니다
- 모든 트리거 동작이 감사 추적에 기록됩니다

::: info TRIGGER.md가 없으면 트리거 기상은 구성된 간격으로 여전히 발생합니다. 에이전트는 일반 지식과 SPINE.md를 사용하여 무엇이 주의가 필요한지 결정합니다. 최상의 결과를 위해 TRIGGER.md를 작성하십시오. :::

## SPINE.md vs TRIGGER.md

| 측면     | SPINE.md                           | TRIGGER.md                         |
| -------- | ---------------------------------- | ---------------------------------- |
| 목적     | 에이전트의 정체성 정의             | 에이전트가 모니터링하는 것 정의    |
| 로딩     | 모든 메시지                        | 각 트리거 기상                     |
| 범위     | 모든 대화                          | 트리거 세션만                      |
| 영향     | 성격, 지식, 경계                   | 능동적 점검 및 동작                |
| 필수     | 예 (Dive 마법사가 생성)            | 아니오 (권장)                      |

## 다음 단계

- [triggerfish.yaml](./configuration)에서 트리거 타이밍 및 cron 작업 구성
- [명령어 참조](./commands)에서 모든 사용 가능한 CLI 명령어 학습
