# 멀티 채널 개요

Triggerfish는 기존 메시징 플랫폼에 연결됩니다. 터미널, Telegram, Slack, Discord,
WhatsApp, 웹 위젯 또는 이메일 등 이미 사용하고 있는 곳에서 에이전트와
대화할 수 있습니다. 모든 채널은 고유한 분류 등급, 소유자 신원 확인 및
정책 적용을 갖추고 있습니다.

## 채널 작동 방식

모든 채널 어댑터는 동일한 인터페이스를 구현합니다: `connect`, `disconnect`,
`send`, `onMessage`, `status`. **채널 라우터**는 모든 어댑터 위에 위치하며
메시지 디스패치, 분류 검사 및 재시도 로직을 처리합니다.

<img src="/diagrams/channel-router.svg" alt="채널 라우터: 모든 채널 어댑터가 중앙 분류 게이트를 통해 Gateway 서버로 흐릅니다" style="max-width: 100%;" />

메시지가 어느 채널에든 도착하면 라우터는 다음을 수행합니다:

1. LLM 해석이 아닌 **코드 레벨 신원 확인**을 통해 발신자(소유자 또는
   외부)를 식별합니다
2. 메시지에 채널의 분류 등급을 태그합니다
3. 정책 엔진으로 전달하여 적용합니다
4. 에이전트의 응답을 동일한 채널을 통해 다시 라우팅합니다

## 채널 분류

각 채널에는 데이터 흐름을 결정하는 기본 분류 등급이 있습니다. 정책 엔진은
**하향 기록 금지 규칙**을 적용합니다: 특정 분류 등급의 데이터는 더 낮은
분류의 채널로 절대 흐를 수 없습니다.

| 채널                                      | 기본 분류         | 소유자 감지                          |
| ----------------------------------------- | :---------------: | ------------------------------------ |
| [CLI](/ko-KR/channels/cli)                |     `INTERNAL`    | 항상 소유자 (터미널 사용자)          |
| [Telegram](/ko-KR/channels/telegram)      |     `INTERNAL`    | Telegram 사용자 ID 일치             |
| [Signal](/ko-KR/channels/signal)          |      `PUBLIC`     | 소유자 아님 (어댑터가 사용자의 전화) |
| [Slack](/ko-KR/channels/slack)            |      `PUBLIC`     | OAuth를 통한 Slack 사용자 ID        |
| [Discord](/ko-KR/channels/discord)        |      `PUBLIC`     | Discord 사용자 ID 일치              |
| [WhatsApp](/ko-KR/channels/whatsapp)      |      `PUBLIC`     | 전화번호 일치                        |
| [WebChat](/ko-KR/channels/webchat)        |      `PUBLIC`     | 소유자 아님 (방문자)                 |
| [Email](/ko-KR/channels/email)            |   `CONFIDENTIAL`  | 이메일 주소 일치                     |

::: tip 완전 구성 가능 모든 분류는 `triggerfish.yaml`에서 구성할 수 있습니다.
보안 요구 사항에 따라 모든 채널을 원하는 분류 등급으로 설정할 수 있습니다.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## 유효 분류

메시지의 유효 분류는 채널 분류와 수신자 분류의 **최솟값**입니다:

| 채널 등급      | 수신자 등급     | 유효 등급       |
| -------------- | --------------- | --------------- |
| INTERNAL       | INTERNAL        | INTERNAL        |
| INTERNAL       | EXTERNAL        | PUBLIC          |
| CONFIDENTIAL   | INTERNAL        | INTERNAL        |
| CONFIDENTIAL   | EXTERNAL        | PUBLIC          |

이는 채널이 `CONFIDENTIAL`로 분류되어 있더라도 해당 채널의 외부 수신자에게
보내는 메시지는 `PUBLIC`으로 처리된다는 의미입니다.

## 채널 상태

채널은 정의된 상태를 거칩니다:

- **UNTRUSTED** -- 새로운 또는 알 수 없는 채널은 여기서 시작합니다. 데이터가
  유입되거나 유출되지 않습니다. 분류할 때까지 채널은 완전히 격리됩니다.
- **CLASSIFIED** -- 채널에 분류 등급이 할당되어 활성 상태입니다. 메시지는
  정책 규칙에 따라 흐릅니다.
- **BLOCKED** -- 채널이 명시적으로 비활성화되었습니다. 메시지가 처리되지
  않습니다.

::: warning UNTRUSTED 채널 `UNTRUSTED` 채널은 에이전트로부터 어떤 데이터도
수신할 수 없으며 에이전트의 컨텍스트로 데이터를 보낼 수 없습니다. 이것은
엄격한 보안 경계이며 제안이 아닙니다. :::

## 채널 라우터

채널 라우터는 등록된 모든 어댑터를 관리하며 다음을 제공합니다:

- **어댑터 등록** -- 채널 ID별로 채널 어댑터를 등록 및 해제합니다
- **메시지 디스패치** -- 아웃바운드 메시지를 올바른 어댑터로 라우팅합니다
- **지수 백오프 재시도** -- 실패한 전송은 증가하는 지연(1초, 2초, 4초)으로
  최대 3회 재시도됩니다
- **일괄 작업** -- 수명 주기 관리를 위한 `connectAll()` 및
  `disconnectAll()`

```yaml
# 라우터 재시도 동작은 구성 가능합니다
router:
  maxRetries: 3
  baseDelay: 1000 # 밀리초
```

## Ripple: 타이핑 및 프레즌스

Triggerfish는 지원하는 채널 간에 타이핑 인디케이터와 프레즌스 상태를
중계합니다. 이를 **Ripple**이라고 합니다.

| 채널     | 타이핑 인디케이터 | 읽음 확인 |
| -------- | :---------------: | :-------: |
| Telegram |    송수신 모두    |    예     |
| Signal   |    송수신 모두    |    --     |
| Slack    |     송신만       |    --     |
| Discord  |     송신만       |    --     |
| WhatsApp |    송수신 모두    |    예     |
| WebChat  |    송수신 모두    |    예     |

에이전트 프레즌스 상태: `idle`, `online`, `away`, `busy`, `processing`,
`speaking`, `error`.

## 메시지 청킹

플랫폼에는 메시지 길이 제한이 있습니다. Triggerfish는 각 플랫폼의 제약 조건에
맞게 긴 응답을 자동으로 분할하며, 가독성을 위해 줄바꿈이나 공백에서
분할합니다:

| 채널     |   최대 메시지 길이  |
| -------- | :-----------------: |
| Telegram |   4,096자           |
| Signal   |   4,000자           |
| Discord  |   2,000자           |
| Slack    |  40,000자           |
| WhatsApp |   4,096자           |
| WebChat  |     무제한          |

## 다음 단계

사용하는 채널을 설정하십시오:

- [CLI](/ko-KR/channels/cli) -- 항상 사용 가능, 설정 불필요
- [Telegram](/ko-KR/channels/telegram) -- @BotFather를 통해 봇 생성
- [Signal](/ko-KR/channels/signal) -- signal-cli 데몬을 통해 연결
- [Slack](/ko-KR/channels/slack) -- Socket Mode로 Slack 앱 생성
- [Discord](/ko-KR/channels/discord) -- Discord 봇 애플리케이션 생성
- [WhatsApp](/ko-KR/channels/whatsapp) -- WhatsApp Business Cloud API를 통해 연결
- [WebChat](/ko-KR/channels/webchat) -- 사이트에 채팅 위젯 임베드
- [Email](/ko-KR/channels/email) -- IMAP 및 SMTP 릴레이를 통해 연결
