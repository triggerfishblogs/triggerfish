# 문제 해결: 채널

## 일반적인 채널 문제

### 채널이 연결된 것으로 보이지만 메시지가 도착하지 않음

1. **소유자 ID를 확인하십시오.** `ownerId`가 설정되지 않았거나 잘못된 경우, 사용자의 메시지가 제한된 권한을 가진 외부(비소유자) 메시지로 라우팅될 수 있습니다.
2. **Classification을 확인하십시오.** 채널의 classification이 세션 taint보다 낮으면 no-write-down 규칙에 의해 응답이 차단됩니다.
3. **daemon 로그를 확인하십시오.** `triggerfish logs --level WARN`을 실행하고 전달 오류를 찾으십시오.

### 메시지가 전송되지 않음

라우터는 전달 실패를 로그합니다. `triggerfish logs`에서 다음을 확인하십시오:

```
Channel send failed
```

이는 라우터가 전달을 시도했지만 채널 어댑터가 오류를 반환했음을 의미합니다. 구체적인 오류가 함께 로그됩니다.

### 재시도 동작

채널 라우터는 실패한 전송에 대해 지수 백오프를 사용합니다. 메시지가 실패하면 증가하는 지연으로 재시도됩니다. 모든 재시도가 소진된 후 메시지는 폐기되고 오류가 로그됩니다.

---

## Telegram

### 봇이 응답하지 않음

1. **토큰을 검증하십시오.** Telegram에서 @BotFather로 이동하여 토큰이 유효하고 keychain에 저장된 것과 일치하는지 확인하십시오.
2. **봇에게 직접 메시지를 보내십시오.** 그룹 메시지는 봇에게 그룹 메시지 권한이 필요합니다.
3. **폴링 오류를 확인하십시오.** Telegram은 long polling을 사용합니다. 연결이 끊기면 어댑터가 자동으로 재연결하지만, 지속적인 네트워크 문제는 메시지 수신을 방해합니다.

### 메시지가 여러 부분으로 분할됨

Telegram에는 메시지당 4,096자 제한이 있습니다. 긴 응답은 자동으로 청크됩니다. 이것은 정상적인 동작입니다.

### 봇 명령이 메뉴에 표시되지 않음

어댑터는 시작 시 슬래시 명령을 등록합니다. 등록이 실패하면 경고를 로그하지만 계속 실행됩니다. 이것은 치명적이지 않습니다. 봇은 여전히 작동하며, 명령 메뉴에 자동 완성 제안이 표시되지 않을 뿐입니다.

### 오래된 메시지를 삭제할 수 없음

Telegram은 봇이 48시간보다 오래된 메시지를 삭제하는 것을 허용하지 않습니다. 오래된 메시지 삭제 시도는 조용히 실패합니다. 이것은 Telegram API의 제한 사항입니다.

---

## Slack

### 봇이 연결되지 않음

Slack에는 세 가지 자격 증명이 필요합니다:

| 자격 증명 | 형식 | 찾는 위치 |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | Slack 앱 설정의 OAuth & Permissions 페이지 |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | 16진수 문자열 | Basic Information > App Credentials |

세 가지 중 하나라도 누락되거나 유효하지 않으면 연결이 실패합니다. 가장 흔한 실수는 Bot Token과는 별도인 App Token을 잊는 것입니다.

### Socket Mode 문제

Triggerfish는 HTTP 이벤트 구독이 아닌 Slack의 Socket Mode를 사용합니다. Slack 앱 설정에서:

1. "Socket Mode"로 이동하여 활성화되어 있는지 확인하십시오
2. `connections:write` 스코프로 앱 수준 토큰을 생성하십시오
3. 이 토큰이 `appToken`(`xapp-...`)입니다

Socket Mode가 활성화되지 않으면 봇 토큰만으로는 실시간 메시징에 충분하지 않습니다.

### 메시지 잘림

Slack에는 40,000자 제한이 있습니다. Telegram 및 Discord와 달리 Triggerfish는 Slack 메시지를 분할하지 않고 잘라냅니다. 이 제한에 자주 도달하면 에이전트에게 더 간결한 출력을 요청하는 것을 고려하십시오.

### 테스트에서 SDK 리소스 누수

Slack SDK는 import 시 비동기 작업을 누수합니다. 이것은 알려진 업스트림 문제입니다. Slack 어댑터를 사용하는 테스트에는 `sanitizeResources: false` 및 `sanitizeOps: false`가 필요합니다. 프로덕션 사용에는 영향을 미치지 않습니다.

---

## Discord

### 봇이 서버에서 메시지를 읽을 수 없음

Discord에는 **Message Content** 특권 intent가 필요합니다. 이것이 없으면 봇은 메시지 이벤트를 수신하지만 메시지 내용이 비어 있습니다.

**해결 방법:** [Discord Developer Portal](https://discord.com/developers/applications)에서:
1. 애플리케이션을 선택하십시오
2. "Bot" 설정으로 이동하십시오
3. Privileged Gateway Intents에서 "Message Content Intent"를 활성화하십시오
4. 변경 사항을 저장하십시오

### 필수 봇 intent

어댑터에는 다음 intent가 활성화되어야 합니다:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (특권)

### 메시지 청크

Discord에는 2,000자 제한이 있습니다. 긴 메시지는 자동으로 여러 메시지로 분할됩니다.

### 타이핑 표시기 실패

어댑터는 응답 전에 타이핑 표시기를 전송합니다. 봇에게 채널에서 메시지를 보낼 권한이 없으면 타이핑 표시기가 조용히 실패합니다(DEBUG 수준에서 로그됨). 이것은 외관상의 문제일 뿐입니다.

### SDK 리소스 누수

Slack과 마찬가지로 discord.js SDK는 import 시 비동기 작업을 누수합니다. 테스트에는 `sanitizeOps: false`가 필요합니다. 프로덕션에는 영향을 미치지 않습니다.

---

## WhatsApp

### 메시지가 수신되지 않음

WhatsApp은 webhook 모델을 사용합니다. 봇은 Meta 서버로부터 들어오는 HTTP POST 요청을 수신합니다. 메시지가 도착하려면:

1. **webhook URL을 등록하십시오.** [Meta Business Dashboard](https://developers.facebook.com/)에서
2. **verify token을 구성하십시오.** Meta가 처음 연결할 때 어댑터가 검증 핸드셰이크를 실행합니다
3. **webhook 리스너를 시작하십시오.** 어댑터는 기본적으로 포트 8443에서 수신합니다. 이 포트가 인터넷에서 접근 가능한지 확인하십시오(리버스 프록시 또는 터널 사용)

### "ownerPhone not configured" 경고

WhatsApp 채널 구성에서 `ownerPhone`이 설정되지 않으면 모든 발신자가 소유자로 취급됩니다. 이는 모든 사용자가 모든 도구에 대한 전체 액세스를 갖게 됨을 의미합니다. 이것은 보안 문제입니다.

**해결 방법:** 구성에서 소유자 전화번호를 설정하십시오:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Access token 만료

WhatsApp Cloud API access token은 만료될 수 있습니다. 401 오류로 전송이 실패하기 시작하면 Meta 대시보드에서 토큰을 재생성하고 업데이트하십시오:

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### signal-cli를 찾을 수 없음

Signal 채널에는 서드파티 Java 애플리케이션인 `signal-cli`가 필요합니다. Triggerfish는 설정 중 자동 설치를 시도하지만, 다음과 같은 경우 실패할 수 있습니다:

- Java(JRE 21+)를 사용할 수 없고 JRE 25 자동 설치에 실패한 경우
- 네트워크 제한으로 다운로드가 차단된 경우
- 대상 디렉토리에 쓸 수 없는 경우

**수동 설치:**

```bash
# signal-cli 수동 설치
# 지침은 https://github.com/AsamK/signal-cli 참조
```

### signal-cli daemon에 접근할 수 없음

signal-cli를 시작한 후 Triggerfish는 최대 60초 동안 접근 가능해지기를 기다립니다. 이 시간이 초과되면:

```
signal-cli daemon (tcp) not reachable within 60s
```

확인 사항:
1. signal-cli가 실제로 실행 중입니까? `ps aux | grep signal-cli`를 확인하십시오
2. 예상 엔드포인트(TCP 소켓 또는 Unix 소켓)에서 수신 중입니까?
3. Signal 계정을 연결해야 합니까? `triggerfish config add-channel signal`을 실행하여 연결 프로세스를 다시 진행하십시오.

### 디바이스 연결 실패

Signal은 QR 코드를 통해 디바이스를 Signal 계정에 연결해야 합니다. 연결 프로세스가 실패하면:

1. 휴대폰에 Signal이 설치되어 있는지 확인하십시오
2. Signal > 설정 > 연결된 디바이스 > 새 디바이스 연결을 여십시오
3. 설정 마법사가 표시하는 QR 코드를 스캔하십시오
4. QR 코드가 만료된 경우 연결 프로세스를 다시 시작하십시오

### signal-cli 버전 불일치

Triggerfish는 알려진 안정 버전의 signal-cli를 고정합니다. 다른 버전을 설치한 경우 경고가 표시될 수 있습니다:

```
Signal CLI version older than known-good
```

이것은 치명적이지 않지만 호환성 문제를 일으킬 수 있습니다.

---

## Email

### IMAP 연결 실패

email 어댑터는 수신 메일을 위해 IMAP 서버에 연결합니다. 일반적인 문제:

- **잘못된 자격 증명.** IMAP 사용자 이름과 비밀번호를 확인하십시오.
- **포트 993 차단.** 어댑터는 IMAP over TLS(포트 993)를 사용합니다. 일부 네트워크에서 이를 차단합니다.
- **앱별 비밀번호 필요.** Gmail 및 기타 provider는 2FA가 활성화된 경우 앱별 비밀번호가 필요합니다.

표시될 수 있는 오류 메시지:
- `IMAP LOGIN failed` - 잘못된 사용자 이름 또는 비밀번호
- `IMAP connection not established` - 서버에 접근할 수 없음
- `IMAP connection closed unexpectedly` - 서버가 연결을 끊음

### SMTP 전송 실패

email 어댑터는 SMTP API 릴레이를 통해 전송합니다(직접 SMTP가 아님). HTTP 오류로 전송이 실패하면:

- 401/403: API 키가 유효하지 않음
- 429: 속도 제한됨
- 5xx: 릴레이 서비스가 다운됨

### IMAP 폴링 중지

어댑터는 30초마다 새 이메일을 폴링합니다. 폴링이 실패하면 오류가 로그되지만 자동 재연결은 없습니다. daemon을 재시작하여 IMAP 연결을 다시 설정하십시오.

이것은 알려진 제한 사항입니다. [알려진 문제](/ko-KR/support/kb/known-issues)를 참조하십시오.

---

## WebChat

### WebSocket 업그레이드 거부

WebChat 어댑터는 들어오는 연결을 검증합니다:

- **헤더가 너무 큼 (431).** 결합된 헤더 크기가 8,192바이트를 초과합니다. 과도하게 큰 쿠키 또는 사용자 정의 헤더로 인해 발생할 수 있습니다.
- **CORS 거부.** `allowedOrigins`가 구성된 경우 Origin 헤더가 일치해야 합니다. 기본값은 `["*"]`(모두 허용)입니다.
- **잘못된 프레임.** WebSocket 프레임의 유효하지 않은 JSON은 WARN 수준에서 로그되고 프레임이 폐기됩니다.

### Classification

WebChat은 기본적으로 PUBLIC classification입니다. 방문자는 소유자로 취급되지 않습니다. WebChat에 더 높은 classification이 필요하면 명시적으로 설정하십시오:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub 폴링 실패

Google Chat은 메시지 전달에 Pub/Sub를 사용합니다. 폴링이 실패하면:

```
Google Chat PubSub poll failed
```

확인 사항:
- Google Cloud 자격 증명이 유효한지(구성의 `credentials_ref` 확인)
- Pub/Sub 구독이 존재하고 삭제되지 않았는지
- 서비스 계정에 `pubsub.subscriber` 역할이 있는지

### 그룹 메시지 거부

그룹 모드가 구성되지 않으면 그룹 메시지가 조용히 폐기될 수 있습니다:

```
Google Chat group message denied by group mode
```

Google Chat 채널 구성에서 `defaultGroupMode`를 구성하십시오.

### ownerEmail 미구성

`ownerEmail`이 없으면 모든 사용자가 비소유자로 취급됩니다:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

전체 도구 액세스를 위해 구성에서 설정하십시오.
