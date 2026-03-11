# Telegram

Telegram을 사용하는 모든 기기에서 에이전트와 상호 작용할 수 있도록
Triggerfish 에이전트를 Telegram에 연결합니다. 어댑터는
[grammY](https://grammy.dev/) 프레임워크를 사용하여 Telegram Bot API와
통신합니다.

## 설정

### 1단계: 봇 생성

1. Telegram을 열고 [@BotFather](https://t.me/BotFather)를 검색합니다
2. `/newbot`을 전송합니다
3. 봇의 표시 이름을 선택합니다 (예: "My Triggerfish")
4. 봇의 사용자 이름을 선택합니다 (`bot`으로 끝나야 합니다, 예:
   `my_triggerfish_bot`)
5. BotFather가 **봇 토큰**으로 답장합니다 -- 복사하십시오

::: warning 토큰을 비밀로 유지하십시오 봇 토큰은 봇에 대한 완전한 제어권을
부여합니다. 소스 관리에 커밋하거나 공개적으로 공유하지 마십시오.
Triggerfish는 이를 OS 키체인에 저장합니다. :::

### 2단계: Telegram 사용자 ID 확인

Triggerfish는 메시지가 사용자로부터 온 것인지 확인하기 위해 숫자 사용자
ID가 필요합니다. Telegram 사용자 이름은 변경할 수 있으며 신원 확인에
신뢰할 수 없습니다 -- 숫자 ID는 영구적이며 Telegram 서버에서 할당되므로
위조할 수 없습니다.

1. Telegram에서 [@getmyid_bot](https://t.me/getmyid_bot)을 검색합니다
2. 아무 메시지나 전송합니다
3. 사용자 ID를 답장합니다 (`8019881968`과 같은 숫자)

### 3단계: 채널 추가

대화형 설정을 실행합니다:

```bash
triggerfish config add-channel telegram
```

봇 토큰, 사용자 ID 및 분류 등급을 입력하라는 메시지가 표시된 후
`triggerfish.yaml`에 구성을 기록하고 데몬 재시작을 제안합니다.

수동으로도 추가할 수 있습니다:

```yaml
channels:
  telegram:
    # botToken은 OS 키체인에 저장됨
    ownerId: 8019881968
    classification: INTERNAL
```

| 옵션             | 타입   | 필수 | 설명                                    |
| ---------------- | ------ | ---- | --------------------------------------- |
| `botToken`       | string | 예   | @BotFather에서 받은 Bot API 토큰        |
| `ownerId`        | number | 예   | 사용자의 숫자 Telegram 사용자 ID        |
| `classification` | string | 아니오 | 분류 상한 (기본값: `INTERNAL`)        |

### 4단계: 채팅 시작

데몬이 재시작된 후 Telegram에서 봇을 열고 `/start`를 전송합니다. 봇이
연결이 활성화되었음을 확인하는 인사말을 보냅니다. 그런 다음 에이전트와
직접 채팅할 수 있습니다.

## 분류 동작

`classification` 설정은 **상한**입니다 -- **소유자** 대화에서 이 채널을
통해 흐를 수 있는 데이터의 최대 민감도를 제어합니다. 모든 사용자에게
균일하게 적용되지 않습니다.

**메시지별 작동 방식:**

- **봇에 메시지를 보내는 경우** (사용자 ID가 `ownerId`와 일치): 세션은
  채널 상한을 사용합니다. 기본값 `INTERNAL`로 에이전트가 내부 수준의
  데이터를 공유할 수 있습니다.
- **다른 사람이 봇에 메시지를 보내는 경우**: 채널 분류에 관계없이 세션이
  자동으로 `PUBLIC`으로 테인트됩니다. 하향 기록 금지 규칙이 내부 데이터가
  해당 세션에 도달하는 것을 방지합니다.

이는 단일 Telegram 봇이 소유자와 비소유자 대화를 모두 안전하게 처리함을
의미합니다. 신원 확인은 LLM이 메시지를 보기 전에 코드에서 수행됩니다 --
LLM은 이에 영향을 줄 수 없습니다.

| 채널 분류       | 소유자 메시지      | 비소유자 메시지    |
| --------------- | :----------------: | :----------------: |
| `PUBLIC`        |       PUBLIC       |       PUBLIC       |
| `INTERNAL` (기본값) | 최대 INTERNAL  |       PUBLIC       |
| `CONFIDENTIAL`  | 최대 CONFIDENTIAL  |       PUBLIC       |
| `RESTRICTED`    | 최대 RESTRICTED    |       PUBLIC       |

전체 모델은 [분류 시스템](/architecture/classification)을, 테인트 에스컬레이션
작동 방식은 [세션 및 테인트](/architecture/taint-and-sessions)를
참조하십시오.

## 소유자 신원

Triggerfish는 발신자의 숫자 Telegram 사용자 ID를 구성된 `ownerId`와 비교하여
소유자 상태를 결정합니다. 이 검사는 LLM이 메시지를 보기 **전에** 코드에서
수행됩니다:

- **일치** -- 메시지가 소유자로 태그되며 채널의 분류 상한까지 데이터에
  접근할 수 있습니다
- **불일치** -- 메시지가 `PUBLIC` 테인트로 태그되며, 하향 기록 금지 규칙이
  분류된 데이터가 해당 세션으로 흐르는 것을 방지합니다

::: danger 항상 소유자 ID를 설정하십시오 `ownerId`가 없으면 Triggerfish는
**모든** 발신자를 소유자로 취급합니다. 봇을 찾는 누구든 채널의 분류
등급까지 데이터에 접근할 수 있습니다. 이러한 이유로 이 필드는 설정 시
필수입니다. :::

## 메시지 청킹

Telegram에는 4,096자 메시지 제한이 있습니다. 에이전트가 이보다 긴 응답을
생성하면 Triggerfish가 자동으로 여러 메시지로 분할합니다. 청커는 가독성을
위해 줄바꿈이나 공백에서 분할합니다 -- 단어나 문장을 반으로 자르는 것을
피합니다.

## 지원되는 메시지 유형

Telegram 어댑터는 현재 다음을 처리합니다:

- **텍스트 메시지** -- 전체 송수신 지원
- **긴 응답** -- Telegram 제한에 맞게 자동 청킹

## 타이핑 인디케이터

에이전트가 요청을 처리하는 동안 봇은 Telegram 채팅에서 "typing..."을
표시합니다. 인디케이터는 LLM이 응답을 생성하는 동안 실행되며 답장이
전송되면 사라집니다.

## 분류 변경

분류 상한을 높이거나 낮추려면:

```bash
triggerfish config add-channel telegram
# 프롬프트에서 기존 구성 덮어쓰기를 선택합니다
```

또는 `triggerfish.yaml`을 직접 편집합니다:

```yaml
channels:
  telegram:
    # botToken은 OS 키체인에 저장됨
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

유효한 등급: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

변경 후 데몬을 재시작합니다: `triggerfish stop && triggerfish start`
