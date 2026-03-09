# Gateway

Gateway는 Triggerfish의 중앙 제어 평면입니다 -- 단일 WebSocket 엔드포인트를 통해 세션, 채널, 도구, 이벤트, 에이전트 프로세스를 조율하는 장기 실행 로컬 서비스입니다. Triggerfish에서 일어나는 모든 것이 Gateway를 통해 흐릅니다.

## 아키텍처

<img src="/diagrams/gateway-architecture.svg" alt="Gateway 아키텍처: 왼쪽의 채널이 중앙 Gateway를 통해 오른쪽의 서비스에 연결됩니다" style="max-width: 100%;" />

Gateway는 구성 가능한 포트(기본값 `18789`)에서 수신 대기하며 채널 어댑터, CLI 명령, 컴패니언 앱, 내부 서비스로부터의 연결을 수락합니다. 모든 통신은 WebSocket을 통한 JSON-RPC를 사용합니다.

## Gateway 서비스

Gateway는 WebSocket 및 HTTP 엔드포인트를 통해 다음 서비스를 제공합니다:

| 서비스            | 설명                                                                          | 보안 연동                              |
| ----------------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| **세션**          | 생성, 목록, 기록 검색, 세션 간 전송, 백그라운드 작업 생성                     | 세션별 taint 추적                      |
| **채널**          | 메시지 라우팅, 연결 관리, 실패한 전달 재시도, 큰 메시지 분할                  | 모든 출력에 분류 확인                  |
| **Cron**          | `TRIGGER.md`에서 반복 작업 예약 및 트리거 기상                                | Cron 동작은 정책 hook을 통과           |
| **Webhook**       | `POST /webhooks/:sourceId`를 통해 외부 서비스의 인바운드 이벤트 수락          | 인바운드 데이터는 수집 시 분류됨       |
| **Ripple**        | 채널 간 온라인 상태 및 타이핑 표시기 추적                                     | 민감한 데이터 노출 없음                |
| **구성**          | 재시작 없이 설정 핫 리로드                                                    | 엔터프라이즈에서 관리자 전용           |
| **제어 UI**       | Gateway 상태 및 관리를 위한 웹 대시보드                                       | 토큰 인증                              |
| **Tide Pool**     | 에이전트 기반 A2UI 시각적 워크스페이스 호스팅                                 | 콘텐츠는 출력 hook의 대상              |
| **알림**          | 우선순위 라우팅을 포함한 채널 간 알림 전달                                    | 분류 규칙 적용                         |

## WebSocket JSON-RPC 프로토콜

클라이언트는 WebSocket을 통해 Gateway에 연결하고 JSON-RPC 2.0 메시지를 교환합니다. 각 메시지는 타입이 지정된 매개변수와 타입이 지정된 응답이 있는 메서드 호출입니다.

```typescript
// 클라이언트 전송:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway 응답:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

Gateway는 webhook 수집을 위한 HTTP 엔드포인트도 제공합니다. `SchedulerService`가 연결되면 인바운드 webhook 이벤트를 위한 `POST /webhooks/:sourceId` 경로를 사용할 수 있습니다.

## 서버 인터페이스

```typescript
interface GatewayServerOptions {
  /** 수신할 포트. 사용 가능한 임의 포트에는 0을 사용합니다. */
  readonly port?: number;
  /** 연결을 위한 인증 토큰. */
  readonly authToken?: string;
  /** webhook 엔드포인트를 위한 선택적 스케줄러 서비스. */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** 서버를 시작합니다. 바인딩된 주소를 반환합니다. */
  start(): Promise<GatewayAddr>;
  /** 서버를 우아하게 중지합니다. */
  stop(): Promise<void>;
}
```

## 인증

Gateway 연결은 토큰으로 인증됩니다. 토큰은 설정 시(`triggerfish dive`) 생성되어 로컬에 저장됩니다.

::: warning 보안 Gateway는 기본적으로 `127.0.0.1`에 바인딩되며 네트워크에 노출되지 않습니다. 원격 접근에는 명시적 터널 구성이 필요합니다. 인증 없이 Gateway WebSocket을 공개 인터넷에 절대 노출하지 마십시오. :::

## 세션 관리

Gateway는 세션의 전체 수명 주기를 관리합니다. 세션은 독립적인 taint 추적을 가진 대화 상태의 기본 단위입니다.

### 세션 유형

| 유형       | 키 패턴                      | 설명                                                                 |
| ---------- | ---------------------------- | -------------------------------------------------------------------- |
| Main       | `main`                       | 소유자와의 주요 직접 대화. 재시작 후에도 유지됩니다.                 |
| Channel    | `channel:<type>:<id>`        | 연결된 채널당 하나. 채널별 격리된 taint.                             |
| Background | `bg:<task_id>`               | Cron 작업과 webhook 트리거 작업을 위해 생성됨. `PUBLIC` taint로 시작. |
| Agent      | `agent:<agent_id>`           | 멀티 에이전트 라우팅을 위한 에이전트별 세션.                         |
| Group      | `group:<channel>:<group_id>` | 그룹 채팅 세션.                                                      |

### 세션 도구

에이전트는 Gateway를 통해 라우팅되는 이 도구들을 통해 세션과 상호 작용합니다:

| 도구               | 설명                                       | Taint 영향                             |
| ------------------ | ------------------------------------------ | -------------------------------------- |
| `sessions_list`    | 선택적 필터로 활성 세션 목록               | Taint 변경 없음                        |
| `sessions_history` | 세션의 대화 내용 검색                      | 참조된 세션에서 taint 상속             |
| `sessions_send`    | 다른 세션으로 메시지 전송                  | Write-down 확인 대상                   |
| `sessions_spawn`   | 백그라운드 작업 세션 생성                  | 새 세션은 `PUBLIC` taint로 시작        |
| `session_status`   | 현재 세션 상태, 모델, 비용 확인            | Taint 변경 없음                        |

::: info `sessions_send`를 통한 세션 간 통신은 다른 모든 출력과 동일한 write-down 규칙의 대상입니다. `CONFIDENTIAL` 세션은 `PUBLIC` 채널에 연결된 세션으로 데이터를 보낼 수 없습니다. :::

## 채널 라우팅

Gateway는 채널 라우터를 통해 채널과 세션 사이에서 메시지를 라우팅합니다. 라우터는 다음을 처리합니다:

- **분류 게이트**: 모든 아웃바운드 메시지가 전달 전에 `PRE_OUTPUT`을 통과합니다
- **백오프를 포함한 재시도**: 실패한 전달은 `sendWithRetry()`를 통해 지수 백오프로 재시도됩니다
- **메시지 분할**: 큰 메시지는 플랫폼에 적합한 크기로 분할됩니다 (예: Telegram의 4096자 제한)
- **스트리밍**: 스트리밍을 지원하는 채널에 응답이 스트리밍됩니다
- **연결 관리**: 수명 주기 관리를 위한 `connectAll()` 및 `disconnectAll()`

## 알림 서비스

Gateway는 플랫폼 전체에서 임시 "소유자에게 알림" 패턴을 대체하는 일급 알림 서비스를 통합합니다. 모든 알림은 단일 `NotificationService`를 통해 흐릅니다.

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### 우선순위 라우팅

| 우선순위   | 동작                                                              |
| ---------- | ----------------------------------------------------------------- |
| `CRITICAL` | 조용한 시간을 무시하고 모든 연결된 채널에 즉시 전달               |
| `HIGH`     | 선호 채널에 즉시 전달, 오프라인인 경우 대기열에 추가              |
| `NORMAL`   | 활성 세션에 전달, 또는 다음 세션 시작 시 대기열에서 전달          |
| `LOW`      | 대기열에 추가, 활성 세션 중 일괄 전달                             |

### 알림 소스

| 소스                       | 카테고리   | 기본 우선순위 |
| -------------------------- | ---------- | ------------- |
| 정책 위반                  | `security` | `CRITICAL`    |
| 위협 인텔리전스 알림       | `security` | `CRITICAL`    |
| 스킬 승인 요청             | `approval` | `HIGH`        |
| Cron 작업 실패             | `system`   | `HIGH`        |
| 시스템 상태 경고           | `system`   | `HIGH`        |
| Webhook 이벤트 트리거      | `info`     | `NORMAL`      |
| The Reef 업데이트 가용     | `info`     | `LOW`         |

알림은 `StorageProvider`를 통해 영속화되며(네임스페이스: `notifications:`) 재시작 후에도 유지됩니다. 미전달 알림은 다음 Gateway 시작 또는 세션 연결 시 재시도됩니다.

### 전달 설정

사용자는 채널별 알림 설정을 구성합니다:

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "America/Chicago"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## 스케줄러 연동

Gateway는 다음을 관리하는 스케줄러 서비스를 호스팅합니다:

- **Cron 틱 루프**: 예약된 작업의 주기적 평가
- **트리거 기상**: `TRIGGER.md`에 정의된 에이전트 기상
- **Webhook HTTP 엔드포인트**: 인바운드 이벤트를 위한 `POST /webhooks/:sourceId`
- **오케스트레이터 격리**: 각 예약된 작업은 격리된 세션 상태를 가진 자체 `OrchestratorFactory`에서 실행됩니다

::: tip Cron 트리거 및 webhook 트리거 작업은 새로운 `PUBLIC` taint로 백그라운드 세션을 생성합니다. 기존 세션의 taint를 상속하지 않으므로, 자율 작업이 깨끗한 분류 상태로 시작합니다. :::

## 상태 및 진단

`triggerfish patrol` 명령은 Gateway에 연결하여 진단 상태 점검을 실행하며 다음을 확인합니다:

- Gateway가 실행 중이고 응답하는지
- 모든 구성된 채널이 연결되었는지
- 저장소에 접근 가능한지
- 예약된 작업이 정시에 실행되는지
- 미전달 중요 알림이 대기열에 갇혀 있지 않은지
