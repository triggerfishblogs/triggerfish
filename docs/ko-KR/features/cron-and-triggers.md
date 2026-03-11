# Cron 및 트리거

Triggerfish 에이전트는 반응적인 질의응답에 국한되지 않습니다. Cron 및 트리거 시스템은 능동적 동작을 가능하게 합니다: 예약 작업, 주기적 체크인, 아침 브리핑, 백그라운드 모니터링, 자율 다단계 워크플로우.

## Cron 작업

Cron 작업은 고정 지시, 전달 채널, 분류 상한을 가진 예약 작업입니다. 표준 cron 표현식 구문을 사용합니다.

### 구성

`triggerfish.yaml`에서 cron 작업을 정의하거나 에이전트가 cron 도구를 통해 런타임에 관리하도록 합니다:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 매일 오전 7시
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # 전달 위치
        classification: INTERNAL # 이 작업의 최대 taint

      - id: pipeline-check
        schedule: "0 */4 * * *" # 4시간마다
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### 작동 방식

1. **CronManager**가 표준 cron 표현식을 파싱하고 재시작 후에도 유지되는 영구 작업 레지스트리를 관리합니다.
2. 작업이 실행되면 **OrchestratorFactory**가 해당 실행을 위한 격리된 오케스트레이터와 세션을 생성합니다.
3. 작업은 자체 taint 추적을 가진 **백그라운드 세션 워크스페이스**에서 실행됩니다.
4. 출력은 해당 채널의 분류 규칙에 따라 구성된 채널로 전달됩니다.
5. 실행 기록이 감사를 위해 기록됩니다.

### 에이전트 관리 Cron

에이전트는 `cron` 도구를 통해 자체 cron 작업을 생성하고 관리할 수 있습니다:

| 동작           | 설명                    | 보안                                  |
| -------------- | ----------------------- | ------------------------------------- |
| `cron.list`    | 모든 예약 작업 목록     | 소유자만                              |
| `cron.create`  | 새 작업 예약            | 소유자만, 분류 상한 시행              |
| `cron.delete`  | 예약 작업 제거          | 소유자만                              |
| `cron.history` | 과거 실행 보기          | 감사 추적 보존                        |

::: warning Cron 작업 생성은 소유자 인증이 필요합니다. 에이전트는 외부 사용자를 대신하여 작업을 예약하거나 구성된 분류 상한을 초과할 수 없습니다. :::

### CLI Cron 관리

Cron 작업은 명령줄에서도 직접 관리할 수 있습니다:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

`--classification` 플래그는 작업의 분류 상한을 설정합니다. 유효한 수준은 `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`입니다. 생략하면 기본값은 `INTERNAL`입니다.

## 트리거 시스템

트리거는 에이전트가 깨어나 능동적 조치가 필요한지 평가하는 주기적 "체크인" 루프입니다. 고정 작업이 있는 cron 작업과 달리 트리거는 에이전트에게 주의가 필요한 것을 결정할 재량을 부여합니다.

### TRIGGER.md

`TRIGGER.md`는 각 기상 시 에이전트가 확인해야 할 것을 정의합니다. `~/.triggerfish/config/TRIGGER.md`에 위치하며 모니터링 우선순위, 에스컬레이션 규칙, 능동적 동작을 지정하는 자유 형식 마크다운 파일입니다.

`TRIGGER.md`가 없으면 에이전트는 일반 지식을 사용하여 주의가 필요한 것을 결정합니다.

**TRIGGER.md 예시:**

```markdown
# TRIGGER.md -- 각 기상 시 확인할 사항

## 우선순위 확인

- 모든 채널에서 1시간 이상 된 읽지 않은 메시지
- 향후 24시간 내 캘린더 충돌
- Linear 또는 Jira의 기한 초과 작업

## 모니터링

- GitHub: 내 검토를 기다리는 PR
- 이메일: VIP 연락처로부터 온 것 (즉시 알림 플래그)
- Slack: #incidents 채널의 멘션

## 능동적

- 아침 (오전 7-9시)이면 일일 브리핑 준비
- 금요일 오후면 주간 요약 초안 작성
```

### 트리거 구성

트리거 타이밍과 제약은 `triggerfish.yaml`에서 설정합니다:

```yaml
scheduler:
  trigger:
    enabled: true # false로 설정하여 트리거 비활성화 (기본값: true)
    interval_minutes: 30 # 30분마다 확인 (기본값: 30)
    # 구성을 제거하지 않고 트리거를 비활성화하려면 0으로 설정
    classification_ceiling: CONFIDENTIAL # 최대 taint 상한 (기본값: CONFIDENTIAL)
    quiet_hours:
      start: 22 # 오후 10시부터 ...
      end: 7 # ... 오전 7시까지 깨우지 않음
```

| 설정                                    | 설명                                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | 주기적 트리거 기상이 활성화되어 있는지 여부입니다. `false`로 설정하여 비활성화합니다.                                             |
| `interval_minutes`                      | 에이전트가 트리거를 확인하기 위해 깨어나는 빈도(분)입니다. 기본값: `30`. 구성 블록을 제거하지 않고 트리거를 비활성화하려면 `0`으로 설정합니다. |
| `classification_ceiling`                | 트리거 세션이 도달할 수 있는 최대 분류 수준입니다. 기본값: `CONFIDENTIAL`.                                                        |
| `quiet_hours.start` / `quiet_hours.end` | 트리거가 억제되는 시간 범위 (24시간 시계)입니다.                                                                                  |

::: tip 트리거를 일시적으로 비활성화하려면 `interval_minutes: 0`으로 설정하십시오. 이는 `enabled: false`와 동일하며 다른 트리거 설정을 유지하여 쉽게 다시 활성화할 수 있습니다. :::

### 트리거 실행

각 트리거 기상은 다음 순서를 따릅니다:

1. 스케줄러가 구성된 간격으로 실행됩니다.
2. `PUBLIC` taint로 새로운 백그라운드 세션이 생성됩니다.
3. 에이전트가 모니터링 지시를 위해 `TRIGGER.md`를 읽습니다.
4. 에이전트가 사용 가능한 도구와 MCP 서버를 사용하여 각 확인 사항을 평가합니다.
5. 조치가 필요하면 에이전트가 행동합니다 -- 알림 전송, 작업 생성 또는 요약 전달.
6. 분류된 데이터에 접근하면 세션의 taint가 상승할 수 있지만 구성된 상한을 초과할 수 없습니다.
7. 완료 후 세션이 아카이빙됩니다.

::: tip 트리거와 cron 작업은 서로를 보완합니다. 조건에 관계없이 정확한 시간에 실행해야 하는 작업에는 cron을 사용합니다 (오전 7시 아침 브리핑). 판단이 필요한 모니터링에는 트리거를 사용합니다 (30분마다 주의가 필요한 것이 있는지 확인). :::

## 트리거 컨텍스트 도구

에이전트는 `trigger_add_to_context` 도구를 사용하여 트리거 결과를 현재 대화에 로드할 수 있습니다. 마지막 트리거 기상 중 확인된 것에 대해 사용자가 물어볼 때 유용합니다.

### 사용법

| 매개변수 | 기본값      | 설명                                                                                            |
| -------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `source` | `"trigger"` | 로드할 트리거 출력: `"trigger"` (주기적), `"cron:<job-id>"` 또는 `"webhook:<source>"`           |

도구는 지정된 소스의 가장 최근 실행 결과를 로드하고 대화 컨텍스트에 추가합니다.

### Write-Down 시행

트리거 컨텍스트 주입은 no write-down 규칙을 준수합니다:

- 트리거의 분류가 세션 taint를 **초과**하면 세션 taint가 일치하도록 **상승**합니다
- 세션 taint가 트리거의 분류를 **초과**하면 주입이 **허용**됩니다 -- 더 낮은 분류 데이터는 항상 더 높은 분류 세션으로 흐를 수 있습니다 (일반적인 `canFlowTo` 동작). 세션 taint는 변경되지 않습니다.

::: info CONFIDENTIAL 세션은 문제 없이 PUBLIC 트리거 결과를 로드할 수 있습니다 -- 데이터는 위로 흐릅니다. 반대 (PUBLIC 상한을 가진 세션에 CONFIDENTIAL 트리거 데이터 주입)는 세션 taint를 CONFIDENTIAL로 상승시킵니다. :::

### 영속성

트리거 결과는 `trigger:last:<source>` 형식의 키로 `StorageProvider`를 통해 저장됩니다. 소스당 가장 최근 결과만 유지됩니다.

## 보안 연동

모든 예약 실행은 핵심 보안 모델과 통합됩니다:

- **격리된 세션** -- 각 cron 작업과 트리거 기상은 독립적인 taint 추적을 가진 자체 생성 세션에서 실행됩니다.
- **분류 상한** -- 백그라운드 작업은 호출하는 도구가 더 높은 분류 데이터를 반환하더라도 구성된 분류 수준을 초과할 수 없습니다.
- **정책 hook** -- 예약 작업 내의 모든 동작은 대화형 세션과 동일한 시행 hook을 통과합니다 (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT).
- **채널 분류** -- 출력 전달은 대상 채널의 분류 수준을 준수합니다. `CONFIDENTIAL` 결과는 `PUBLIC` 채널로 전송될 수 없습니다.
- **감사 추적** -- 모든 예약 실행은 전체 컨텍스트와 함께 로깅됩니다: 작업 ID, 세션 ID, taint 이력, 수행한 동작, 전달 상태.
- **영속성** -- Cron 작업은 `StorageProvider`(네임스페이스: `cron:`)를 통해 저장되며 Gateway 재시작 후에도 유지됩니다.
