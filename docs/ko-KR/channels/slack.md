# Slack

에이전트가 워크스페이스 대화에 참여할 수 있도록 Triggerfish 에이전트를
Slack에 연결합니다. 어댑터는 Socket Mode를 사용하는
[Bolt](https://slack.dev/bolt-js/) 프레임워크를 사용하며, 이는 공개 URL이나
webhook 엔드포인트가 필요 없음을 의미합니다.

## 기본 분류

Slack은 기본적으로 `PUBLIC` 분류입니다. 이는 Slack 워크스페이스에 외부
게스트, Slack Connect 사용자 및 공유 채널이 종종 포함되는 현실을
반영합니다. 워크스페이스가 엄격하게 내부용인 경우 `INTERNAL` 이상으로
올릴 수 있습니다.

## 설정

### 1단계: Slack 앱 생성

1. [api.slack.com/apps](https://api.slack.com/apps)로 이동합니다
2. **Create New App**을 클릭합니다
3. **From scratch**를 선택합니다
4. 앱 이름(예: "Triggerfish")을 지정하고 워크스페이스를 선택합니다
5. **Create App**을 클릭합니다

### 2단계: 봇 토큰 스코프 구성

사이드바에서 **OAuth & Permissions**로 이동하고 다음 **Bot Token Scopes**를
추가합니다:

| 스코프             | 목적                            |
| ------------------ | ------------------------------- |
| `chat:write`       | 메시지 전송                     |
| `channels:history` | 공개 채널의 메시지 읽기         |
| `groups:history`   | 비공개 채널의 메시지 읽기       |
| `im:history`       | 다이렉트 메시지 읽기            |
| `mpim:history`     | 그룹 다이렉트 메시지 읽기       |
| `channels:read`    | 공개 채널 목록                  |
| `groups:read`      | 비공개 채널 목록                |
| `im:read`          | 다이렉트 메시지 대화 목록       |
| `users:read`       | 사용자 정보 조회                |

### 3단계: Socket Mode 활성화

1. 사이드바에서 **Socket Mode**로 이동합니다
2. **Enable Socket Mode**를 켭니다
3. **App-Level Token**을 생성하라는 메시지가 표시됩니다 -- 이름을
   지정하고(예: "triggerfish-socket") `connections:write` 스코프를
   추가합니다
4. 생성된 **App Token**을 복사합니다 (`xapp-`로 시작)

### 4단계: 이벤트 활성화

1. 사이드바에서 **Event Subscriptions**로 이동합니다
2. **Enable Events**를 켭니다
3. **Subscribe to bot events** 아래에 추가합니다:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### 5단계: 자격 증명 확인

세 가지 값이 필요합니다:

- **Bot Token** -- **OAuth & Permissions**로 이동하여 **Install to
  Workspace**를 클릭한 후 **Bot User OAuth Token**을 복사합니다
  (`xoxb-`로 시작)
- **App Token** -- 3단계에서 생성한 토큰 (`xapp-`로 시작)
- **Signing Secret** -- **Basic Information**으로 이동하여 **App
  Credentials**까지 스크롤하고 **Signing Secret**을 복사합니다

### 6단계: Slack 사용자 ID 확인

소유자 신원을 구성하려면:

1. Slack을 엽니다
2. 오른쪽 상단의 프로필 사진을 클릭합니다
3. **Profile**을 클릭합니다
4. 세 점 메뉴를 클릭하고 **Copy member ID**를 선택합니다

### 7단계: Triggerfish 구성

`triggerfish.yaml`에 Slack 채널을 추가합니다:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret은 OS 키체인에 저장됨
    ownerId: "U01234ABC"
```

시크릿(봇 토큰, 앱 토큰, 서명 시크릿)은
`triggerfish config add-channel slack` 중에 입력되며 OS 키체인에
저장됩니다.

| 옵션             | 타입   | 필수   | 설명                                          |
| ---------------- | ------ | ------ | --------------------------------------------- |
| `ownerId`        | string | 권장   | 소유자 확인을 위한 Slack 멤버 ID              |
| `classification` | string | 아니오 | 분류 등급 (기본값: `PUBLIC`)                  |

::: warning 시크릿을 안전하게 저장하십시오 토큰이나 시크릿을 소스 관리에
커밋하지 마십시오. 환경 변수나 OS 키체인을 사용하십시오.
[시크릿 관리](/security/secrets)에서 자세한 내용을 확인하십시오. :::

### 8단계: 봇 초대

봇이 채널에서 메시지를 읽거나 보내려면 초대해야 합니다:

1. 봇을 추가할 Slack 채널을 엽니다
2. `/invite @Triggerfish` (또는 앱에 지정한 이름)를 입력합니다

봇은 채널에 초대되지 않아도 다이렉트 메시지를 수신할 수 있습니다.

### 9단계: Triggerfish 시작

```bash
triggerfish stop && triggerfish start
```

봇이 있는 채널에서 메시지를 보내거나 직접 DM을 보내 연결을 확인합니다.

## 소유자 신원

Triggerfish는 소유자 확인을 위해 Slack OAuth 플로우를 사용합니다. 메시지가
도착하면 어댑터는 발신자의 Slack 사용자 ID를 구성된 `ownerId`와 비교합니다:

- **일치** -- 소유자 명령
- **불일치** -- `PUBLIC` 테인트를 가진 외부 입력

### 워크스페이스 멤버십

수신자 분류의 경우 Slack 워크스페이스 멤버십이 사용자가 `INTERNAL`인지
`EXTERNAL`인지를 결정합니다:

- 일반 워크스페이스 멤버는 `INTERNAL`입니다
- Slack Connect 외부 사용자는 `EXTERNAL`입니다
- 게스트 사용자는 `EXTERNAL`입니다

## 메시지 제한

Slack은 최대 40,000자의 메시지를 지원합니다. 이 제한을 초과하는 메시지는
잘립니다. 대부분의 에이전트 응답에서 이 제한에 도달하지 않습니다.

## 타이핑 인디케이터

Triggerfish는 에이전트가 요청을 처리할 때 Slack에 타이핑 인디케이터를
보냅니다. Slack은 봇에게 수신 타이핑 이벤트를 노출하지 않으므로 송신
전용입니다.

## 그룹 채팅

봇은 그룹 채널에 참여할 수 있습니다. `triggerfish.yaml`에서 그룹 동작을
구성합니다:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| 동작             | 설명                                    |
| ---------------- | --------------------------------------- |
| `mentioned-only` | 봇이 @멘션될 때만 응답                  |
| `always`         | 채널의 모든 메시지에 응답               |

## 분류 변경

```yaml
channels:
  slack:
    classification: INTERNAL
```

유효한 등급: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
