# WebChat

WebChat 채널은 WebSocket을 통해 Triggerfish 에이전트에 연결되는 내장형
임베드 가능 채팅 위젯을 제공합니다. 고객 대면 상호 작용, 지원 위젯 또는
웹 기반 채팅 경험을 제공하려는 모든 시나리오에 적합합니다.

## 기본 분류

WebChat은 기본적으로 `PUBLIC` 분류입니다. 이것은 의도적인 기본값입니다:
**웹 방문자는 절대 소유자로 취급되지 않습니다**. WebChat 세션의 모든
메시지는 구성에 관계없이 `PUBLIC` 테인트를 가집니다.

::: warning 방문자는 소유자가 아닙니다 사용자 ID나 전화번호로 소유자 신원이
확인되는 다른 채널과 달리, WebChat은 모든 연결에 대해 `isOwner: false`를
설정합니다. 이는 에이전트가 WebChat 세션에서 소유자 수준의 명령을 절대
실행하지 않는다는 것을 의미합니다. 이것은 의도적인 보안 결정입니다 --
익명 웹 방문자의 신원을 확인할 수 없습니다. :::

## 설정

### 1단계: Triggerfish 구성

`triggerfish.yaml`에 WebChat 채널을 추가합니다:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| 옵션             | 타입     | 필수   | 설명                                     |
| ---------------- | -------- | ------ | ---------------------------------------- |
| `port`           | number   | 아니오 | WebSocket 서버 포트 (기본값: `8765`)     |
| `classification` | string   | 아니오 | 분류 등급 (기본값: `PUBLIC`)             |
| `allowedOrigins` | string[] | 아니오 | 허용된 CORS 오리진 (기본값: `["*"]`)     |

### 2단계: Triggerfish 시작

```bash
triggerfish stop && triggerfish start
```

WebSocket 서버가 구성된 포트에서 수신을 시작합니다.

### 3단계: 채팅 위젯 연결

웹 애플리케이션에서 WebSocket 엔드포인트에 연결합니다:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // 서버가 세션 ID를 할당함
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // 에이전트 응답
    console.log("Agent:", frame.content);
  }
};

// 메시지 전송
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## 작동 방식

### 연결 흐름

1. 브라우저 클라이언트가 구성된 포트에 WebSocket 연결을 엽니다
2. Triggerfish가 HTTP 요청을 WebSocket으로 업그레이드합니다
3. 고유 세션 ID가 생성됩니다 (`webchat-<uuid>`)
4. 서버가 `session` 프레임으로 클라이언트에 세션 ID를 보냅니다
5. 클라이언트가 JSON으로 `message` 프레임을 송수신합니다

### 메시지 프레임 형식

모든 메시지는 다음 구조의 JSON 객체입니다:

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

프레임 유형:

| 유형      | 방향             | 설명                                                |
| --------- | ---------------- | --------------------------------------------------- |
| `session` | 서버에서 클라이언트 | 연결 시 할당된 세션 ID와 함께 전송                |
| `message` | 양방향           | 텍스트 콘텐츠가 포함된 채팅 메시지                  |
| `ping`    | 양방향           | 연결 유지 핑                                        |
| `pong`    | 양방향           | 연결 유지 응답                                      |

### 세션 관리

각 WebSocket 연결은 자체 세션을 가집니다. 연결이 종료되면 세션이 활성 연결
맵에서 제거됩니다. 세션 재개 기능은 없습니다 -- 연결이 끊어지면 재연결 시
새 세션 ID가 할당됩니다.

## 상태 검사

WebSocket 서버는 일반 HTTP 요청에 대해서도 상태 검사로 응답합니다:

```bash
curl http://localhost:8765
# 응답: "WebChat OK"
```

이것은 로드 밸런서 상태 검사 및 모니터링에 유용합니다.

## 타이핑 인디케이터

Triggerfish는 WebChat을 통해 타이핑 인디케이터를 송수신합니다. 에이전트가
처리 중일 때 클라이언트에 타이핑 인디케이터 프레임이 전송됩니다. 위젯에서
이를 표시하여 에이전트가 생각 중임을 나타낼 수 있습니다.

## 보안 고려 사항

- **모든 방문자는 외부입니다** -- `isOwner`는 항상 `false`입니다.
  에이전트는 WebChat에서 소유자 명령을 실행하지 않습니다.
- **PUBLIC 테인트** -- 모든 메시지는 세션 수준에서 `PUBLIC`으로
  테인트됩니다. 에이전트는 WebChat 세션에서 `PUBLIC` 분류 이상의 데이터에
  접근하거나 반환할 수 없습니다.
- **CORS** -- 연결할 수 있는 도메인을 제한하려면 `allowedOrigins`를
  구성합니다. 기본값 `["*"]`은 모든 오리진을 허용하며, 이는 개발에는
  적합하지만 프로덕션에서는 잠가야 합니다.

::: tip 프로덕션에서 오리진을 잠그십시오 프로덕션 배포의 경우 허용된
오리진을 항상 명시적으로 지정하십시오:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## 분류 변경

WebChat은 기본적으로 `PUBLIC`이지만 기술적으로 다른 등급으로 설정할 수
있습니다. 그러나 `isOwner`가 항상 `false`이므로 유효 분류 규칙
(`min(channel, recipient)`)에 따라 모든 메시지의 유효 분류는 `PUBLIC`으로
유지됩니다.

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # 허용되지만 isOwner는 여전히 false
```

유효한 등급: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
