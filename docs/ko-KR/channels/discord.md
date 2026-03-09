# Discord

에이전트가 서버 채널과 다이렉트 메시지에서 응답할 수 있도록 Triggerfish
에이전트를 Discord에 연결합니다. 어댑터는 [discord.js](https://discord.js.org/)를
사용하여 Discord Gateway에 연결합니다.

## 기본 분류

Discord는 기본적으로 `PUBLIC` 분류입니다. Discord 서버는 종종 신뢰할 수
있는 멤버와 공개 방문자가 혼합되어 있으므로 `PUBLIC`이 안전한 기본값입니다.
서버가 비공개이고 신뢰할 수 있는 경우 이를 올릴 수 있습니다.

## 설정

### 1단계: Discord 애플리케이션 생성

1. [Discord 개발자 포털](https://discord.com/developers/applications)로
   이동합니다
2. **New Application**을 클릭합니다
3. 애플리케이션 이름을 지정합니다 (예: "Triggerfish")
4. **Create**를 클릭합니다

### 2단계: 봇 사용자 생성

1. 애플리케이션에서 사이드바의 **Bot**으로 이동합니다
2. **Add Bot**을 클릭합니다 (아직 생성되지 않은 경우)
3. 봇의 사용자 이름 아래에서 **Reset Token**을 클릭하여 새 토큰을
   생성합니다
4. **봇 토큰**을 복사합니다

::: warning 토큰을 비밀로 유지하십시오 봇 토큰은 봇에 대한 완전한 제어권을
부여합니다. 소스 관리에 커밋하거나 공개적으로 공유하지 마십시오. :::

### 3단계: 특권 인텐트 구성

**Bot** 페이지에서 다음 특권 게이트웨이 인텐트를 활성화합니다:

- **Message Content Intent** -- 메시지 콘텐츠를 읽기 위해 필수
- **Server Members Intent** -- 선택사항, 멤버 조회용

### 4단계: Discord 사용자 ID 확인

1. Discord를 엽니다
2. **Settings** > **Advanced**로 이동하여 **Developer Mode**를 활성화합니다
3. Discord 어디에서든 사용자 이름을 클릭합니다
4. **Copy User ID**를 클릭합니다

이것이 Triggerfish가 소유자 신원을 확인하는 데 사용하는 스노우플레이크
ID입니다.

### 5단계: 초대 링크 생성

1. 개발자 포털에서 **OAuth2** > **URL Generator**로 이동합니다
2. **Scopes** 아래에서 `bot`을 선택합니다
3. **Bot Permissions** 아래에서 선택합니다:
   - Send Messages
   - Read Message History
   - View Channels
4. 생성된 URL을 복사하고 브라우저에서 엽니다
5. 봇을 추가할 서버를 선택하고 **Authorize**를 클릭합니다

### 6단계: Triggerfish 구성

`triggerfish.yaml`에 Discord 채널을 추가합니다:

```yaml
channels:
  discord:
    # botToken은 OS 키체인에 저장됨
    ownerId: "123456789012345678"
```

| 옵션             | 타입   | 필수   | 설명                                                      |
| ---------------- | ------ | ------ | --------------------------------------------------------- |
| `botToken`       | string | 예     | Discord 봇 토큰                                           |
| `ownerId`        | string | 권장   | 소유자 확인을 위한 Discord 사용자 ID (스노우플레이크)     |
| `classification` | string | 아니오 | 분류 등급 (기본값: `PUBLIC`)                              |

### 7단계: Triggerfish 시작

```bash
triggerfish stop && triggerfish start
```

봇이 있는 채널에서 메시지를 보내거나 직접 DM을 보내 연결을 확인합니다.

## 소유자 신원

Triggerfish는 발신자의 Discord 사용자 ID를 구성된 `ownerId`와 비교하여
소유자 상태를 결정합니다. 이 검사는 LLM이 메시지를 보기 전에 코드에서
수행됩니다:

- **일치** -- 소유자 명령
- **불일치** -- `PUBLIC` 테인트를 가진 외부 입력

`ownerId`가 구성되지 않은 경우 모든 메시지가 소유자로부터 온 것으로
처리됩니다.

::: danger 항상 소유자 ID를 설정하십시오 봇이 다른 멤버가 있는 서버에
있는 경우 항상 `ownerId`를 구성하십시오. 이를 설정하지 않으면 모든 서버
멤버가 에이전트에게 명령을 내릴 수 있습니다. :::

## 메시지 청킹

Discord에는 2,000자 메시지 제한이 있습니다. 에이전트가 이보다 긴 응답을
생성하면 Triggerfish가 자동으로 여러 메시지로 분할합니다. 청커는 가독성을
유지하기 위해 줄바꿈이나 공백에서 분할합니다.

## 봇 동작

Discord 어댑터:

- **자신의 메시지를 무시합니다** -- 봇이 자신이 보낸 메시지에 응답하지
  않습니다
- **접근 가능한 모든 채널에서 수신합니다** -- 길드 채널, 그룹 DM 및
  다이렉트 메시지
- **Message Content Intent가 필요합니다** -- 이를 설정하지 않으면 봇이 빈
  메시지 이벤트를 수신합니다

## 타이핑 인디케이터

Triggerfish는 에이전트가 요청을 처리할 때 Discord에 타이핑 인디케이터를
보냅니다. Discord는 사용자의 타이핑 이벤트를 봇에게 신뢰할 수 있는
방식으로 노출하지 않으므로 송신 전용입니다.

## 그룹 채팅

봇은 서버 채널에 참여할 수 있습니다. 그룹 동작을 구성합니다:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| 동작             | 설명                                    |
| ---------------- | --------------------------------------- |
| `mentioned-only` | 봇이 @멘션될 때만 응답                  |
| `always`         | 채널의 모든 메시지에 응답               |

## 분류 변경

```yaml
channels:
  discord:
    # botToken은 OS 키체인에 저장됨
    ownerId: "123456789012345678"
    classification: INTERNAL
```

유효한 등급: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
