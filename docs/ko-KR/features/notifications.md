# 알림

NotificationService는 모든 연결된 채널에서 에이전트 소유자에게 알림을 전달하기 위한 Triggerfish의 일급 추상화입니다.

## 알림 서비스가 필요한 이유

전용 서비스 없이는 알림 로직이 코드베이스 전체에 분산되는 경향이 있습니다 -- 각 기능이 자체 "소유자에게 알림" 패턴을 구현합니다. 이는 일관성 없는 동작, 누락된 알림, 중복을 초래합니다.

Triggerfish는 모든 알림 전달을 우선순위, 대기열, 중복 제거를 처리하는 단일 서비스를 통해 중앙 집중화합니다.

## 작동 방식

<img src="/diagrams/notification-routing.svg" alt="알림 라우팅: 소스가 우선순위 라우팅, 대기열, 중복 제거를 가진 NotificationService를 통해 채널로 흐릅니다" style="max-width: 100%;" />

구성 요소가 소유자에게 알려야 할 때 -- cron 작업 완료, 트리거가 중요한 것을 감지, webhook 실행 -- NotificationService를 호출합니다. 서비스가 알림을 어떻게 어디에 전달할지 결정합니다.

## 인터페이스

```typescript
interface NotificationService {
  /** 사용자에게 알림을 전달하거나 대기열에 넣습니다. */
  deliver(options: DeliverOptions): Promise<void>;

  /** 사용자의 대기 중(미전달) 알림을 가져옵니다. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** 알림을 전달됨으로 확인합니다. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## 우선순위 수준

각 알림은 전달 동작에 영향을 미치는 우선순위를 가집니다:

| 우선순위   | 동작                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| `critical` | 모든 연결된 채널에 즉시 전달됩니다. 조용한 시간을 무시합니다.          |
| `normal`   | 선호 채널에 전달됩니다. 사용자가 오프라인이면 대기열에 넣습니다.       |
| `low`      | 대기열에 넣고 일괄로 전달됩니다. 요약될 수 있습니다.                  |

## 전달 옵션

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## 대기열 및 오프라인 전달

대상 사용자가 오프라인이거나 연결된 채널이 없으면 알림이 대기열에 넣어집니다. 다음 경우에 전달됩니다:

- 사용자가 새 세션을 시작할 때.
- 채널이 재연결될 때.
- 사용자가 대기 중인 알림을 명시적으로 요청할 때.

대기 중인 알림은 `getPending()`으로 검색하고 `acknowledge()`로 확인할 수 있습니다.

## 중복 제거

NotificationService는 중복 알림이 사용자에게 도달하는 것을 방지합니다. 같은 알림 내용이 윈도우 내에서 여러 번 전달되면 첫 번째 전달만 통과합니다.

## 구성

`triggerfish.yaml`에서 알림 동작을 구성합니다:

```yaml
notifications:
  preferred_channel: telegram # 기본 전달 채널
  quiet_hours: "22:00-07:00" # 이 시간 동안 normal/low 억제
  batch_interval: 15m # 낮은 우선순위 알림 일괄 처리
```

## 사용 예시

알림은 시스템 전체에서 사용됩니다:

- **Cron 작업**은 예약 작업이 완료되거나 실패할 때 소유자에게 알립니다.
- **트리거**는 모니터링이 주의가 필요한 것을 감지하면 소유자에게 알립니다.
- **Webhook**은 외부 이벤트가 발생하면(GitHub PR, Sentry 알림) 소유자에게 알립니다.
- **정책 위반**은 차단된 동작이 시도되면 소유자에게 알립니다.
- **채널 상태**는 채널이 연결 해제되거나 재연결되면 소유자에게 알립니다.

::: info 알림 대기열은 `StorageProvider`(네임스페이스: `notifications:`)를 통해 영속화되며 전달 후 기본 7일의 보존 기간을 가집니다. 미전달 알림은 확인될 때까지 유지됩니다. :::
