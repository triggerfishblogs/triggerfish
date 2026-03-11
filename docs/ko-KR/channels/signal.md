# Signal

Signal 앱에서 에이전트에게 메시지를 보낼 수 있도록 Triggerfish 에이전트를
Signal에 연결합니다. 어댑터는 연결된 Signal 전화번호를 사용하여 JSON-RPC를
통해 [signal-cli](https://github.com/AsamK/signal-cli) 데몬과 통신합니다.

## Signal의 차이점

Signal 어댑터**는** 사용자의 전화번호입니다. 별도의 봇 계정이 존재하는
Telegram이나 Slack과 달리 Signal 메시지는 다른 사람들로부터 사용자의
번호로 옵니다. 이는 다음을 의미합니다:

- 모든 인바운드 메시지는 `isOwner: false`입니다 -- 항상 다른 사람으로부터
  옵니다
- 어댑터는 사용자의 전화번호로 답장합니다
- 다른 채널처럼 메시지별 소유자 확인이 없습니다

이로 인해 Signal은 사용자의 번호로 메시지를 보내는 연락처로부터 메시지를
수신하고 에이전트가 대신 응답하는 데 이상적입니다.

## 기본 분류

Signal은 기본적으로 `PUBLIC` 분류입니다. 모든 인바운드 메시지가 외부
연락처로부터 오므로 `PUBLIC`이 안전한 기본값입니다.

## 설정

### 1단계: signal-cli 설치

signal-cli는 Signal용 타사 명령줄 클라이언트입니다. Triggerfish는 TCP 또는
Unix 소켓을 통해 통신합니다.

**Linux (네이티브 빌드 -- Java 불필요):**

[signal-cli 릴리스](https://github.com/AsamK/signal-cli/releases) 페이지에서
최신 네이티브 빌드를 다운로드하거나 설정 중에 Triggerfish가 자동으로
다운로드하도록 하십시오.

**macOS / 기타 플랫폼 (JVM 빌드):**

Java 21+이 필요합니다. Java가 설치되지 않은 경우 Triggerfish가 자동으로
포터블 JRE를 다운로드할 수 있습니다.

가이드 설정을 실행할 수도 있습니다:

```bash
triggerfish config add-channel signal
```

이는 signal-cli를 확인하고 없는 경우 다운로드를 제안하며 연결 과정을
안내합니다.

### 2단계: 기기 연결

signal-cli는 기존 Signal 계정에 연결해야 합니다 (데스크톱 앱을 연결하는
것과 같습니다):

```bash
signal-cli link -n "Triggerfish"
```

`tsdevice:` URI가 출력됩니다. Signal 모바일 앱에서 QR 코드를
스캔합니다 (설정 > 연결된 기기 > 새 기기 연결).

### 3단계: 데몬 시작

signal-cli는 Triggerfish가 연결하는 백그라운드 데몬으로 실행됩니다:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

`+14155552671`을 E.164 형식의 전화번호로 교체합니다.

### 4단계: Triggerfish 구성

`triggerfish.yaml`에 Signal을 추가합니다:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| 옵션               | 타입    | 필수   | 설명                                                                            |
| ------------------ | ------- | ------ | ------------------------------------------------------------------------------- |
| `endpoint`         | string  | 예     | signal-cli 데몬 주소 (`tcp://host:port` 또는 `unix:///path/to/socket`)          |
| `account`          | string  | 예     | Signal 전화번호 (E.164 형식)                                                    |
| `classification`   | string  | 아니오 | 분류 상한 (기본값: `PUBLIC`)                                                    |
| `defaultGroupMode` | string  | 아니오 | 그룹 메시지 처리: `always`, `mentioned-only`, `owner-only` (기본값: `always`)   |
| `groups`           | object  | 아니오 | 그룹별 구성 오버라이드                                                          |
| `ownerPhone`       | string  | 아니오 | 향후 사용을 위해 예약                                                           |
| `pairing`          | boolean | 아니오 | 설정 중 페어링 모드 활성화                                                      |

### 5단계: Triggerfish 시작

```bash
triggerfish stop && triggerfish start
```

다른 Signal 사용자로부터 전화번호로 메시지를 보내 연결을 확인합니다.

## 그룹 메시지

Signal은 그룹 채팅을 지원합니다. 에이전트가 그룹 메시지에 응답하는 방식을
제어할 수 있습니다:

| 모드             | 동작                                                    |
| ---------------- | ------------------------------------------------------- |
| `always`         | 모든 그룹 메시지에 응답 (기본값)                        |
| `mentioned-only` | 전화번호 또는 @멘션으로 언급될 때만 응답                |
| `owner-only`     | 그룹에서 응답하지 않음                                  |

전역 또는 그룹별로 구성합니다:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

그룹 ID는 base64로 인코딩된 식별자입니다. `triggerfish signal list-groups`를
사용하거나 signal-cli 문서를 확인하여 찾으십시오.

## 메시지 청킹

Signal에는 4,000자 메시지 제한이 있습니다. 이보다 긴 응답은 자동으로 여러
메시지로 분할되며 가독성을 위해 줄바꿈이나 공백에서 분할합니다.

## 타이핑 인디케이터

어댑터는 에이전트가 요청을 처리하는 동안 타이핑 인디케이터를 보냅니다.
답장이 전송되면 타이핑 상태가 해제됩니다.

## 확장 도구

Signal 어댑터는 추가 도구를 노출합니다:

- `sendTyping` / `stopTyping` -- 수동 타이핑 인디케이터 제어
- `listGroups` -- 계정이 멤버인 모든 Signal 그룹 목록
- `listContacts` -- 모든 Signal 연락처 목록

## 분류 변경

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

유효한 등급: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

변경 후 데몬을 재시작합니다: `triggerfish stop && triggerfish start`

## 안정성 기능

Signal 어댑터에는 여러 안정성 메커니즘이 포함되어 있습니다:

### 자동 재연결

signal-cli와의 연결이 끊어지면(네트워크 중단, 데몬 재시작) 어댑터가
지수 백오프로 자동 재연결합니다. 수동 개입이 필요 없습니다.

### 상태 검사

시작 시 Triggerfish는 JSON-RPC 핑 프로브를 사용하여 기존 signal-cli 데몬이
정상인지 확인합니다. 데몬이 응답하지 않으면 자동으로 종료하고
재시작합니다.

### 버전 추적

Triggerfish는 알려진 정상 signal-cli 버전(현재 0.13.0)을 추적하며 설치된
버전이 더 오래된 경우 시작 시 경고합니다. signal-cli 버전은 각 성공적인
연결에서 로깅됩니다.

### Unix 소켓 지원

TCP 엔드포인트 외에도 어댑터는 Unix 도메인 소켓을 지원합니다:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## 문제 해결

**signal-cli 데몬에 연결할 수 없음:**

- 데몬이 실행 중인지 확인합니다: 프로세스를 확인하거나
  `nc -z 127.0.0.1 7583`을 시도합니다
- signal-cli는 IPv4만 바인드합니다 -- `localhost`가 아닌 `127.0.0.1`을
  사용합니다
- TCP 기본 포트는 7583입니다
- Triggerfish는 비정상 프로세스를 감지하면 데몬을 자동 재시작합니다

**메시지가 도착하지 않음:**

- 기기가 연결되었는지 확인합니다: Signal 모바일 앱의 연결된 기기에서
  확인합니다
- signal-cli는 연결 후 최소 한 번의 동기화를 수신해야 합니다
- 연결 오류 로그를 확인합니다: `triggerfish logs --tail`

**Java 오류 (JVM 빌드만):**

- signal-cli JVM 빌드에는 Java 21+이 필요합니다
- `java -version`으로 확인합니다
- 필요한 경우 Triggerfish가 설정 중에 포터블 JRE를 다운로드할 수 있습니다

**재연결 루프:**

- 로그에서 반복적인 재연결 시도가 보이면 signal-cli 데몬이 충돌하고 있을
  수 있습니다
- signal-cli의 자체 stderr 출력에서 오류를 확인합니다
- 새 데몬으로 재시작합니다: Triggerfish를 중지하고 signal-cli를 종료한 후
  둘 다 재시작합니다
