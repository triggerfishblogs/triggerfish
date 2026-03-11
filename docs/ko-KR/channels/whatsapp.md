# WhatsApp

휴대전화에서 에이전트와 상호 작용할 수 있도록 Triggerfish 에이전트를
WhatsApp에 연결합니다. 어댑터는 **WhatsApp Business Cloud API** (공식
Meta 호스팅 HTTP API)를 사용하며, webhook을 통해 메시지를 수신하고 REST를
통해 전송합니다.

## 기본 분류

WhatsApp은 기본적으로 `PUBLIC` 분류입니다. WhatsApp 연락처에는 전화번호를
가진 누구나 포함될 수 있으므로 `PUBLIC`이 안전한 기본값입니다.

## 설정

### 1단계: Meta Business 계정 생성

1. [Meta for Developers](https://developers.facebook.com/) 포털로
   이동합니다
2. 개발자 계정이 없는 경우 생성합니다
3. 새 앱을 생성하고 앱 유형으로 **Business**를 선택합니다
4. 앱 대시보드에서 **WhatsApp** 제품을 추가합니다

### 2단계: 자격 증명 확인

앱 대시보드의 WhatsApp 섹션에서 다음 값을 수집합니다:

- **Access Token** -- 영구 액세스 토큰 (또는 테스트용 임시 토큰 생성)
- **Phone Number ID** -- WhatsApp Business에 등록된 전화번호의 ID
- **Verify Token** -- webhook 등록 확인에 사용할 사용자 선택 문자열

### 3단계: Webhook 구성

1. WhatsApp 제품 설정에서 **Webhooks**로 이동합니다
2. 콜백 URL을 서버의 공개 주소로 설정합니다 (예:
   `https://your-server.com:8443/webhook`)
3. **Verify Token**을 Triggerfish 구성에서 사용할 동일한 값으로 설정합니다
4. `messages` webhook 필드를 구독합니다

::: info 공개 URL 필요 WhatsApp webhook은 공개적으로 접근 가능한 HTTPS
엔드포인트가 필요합니다. Triggerfish를 로컬에서 실행하는 경우 터널
서비스(예: ngrok, Cloudflare Tunnel) 또는 공개 IP가 있는 서버가
필요합니다. :::

### 4단계: Triggerfish 구성

`triggerfish.yaml`에 WhatsApp 채널을 추가합니다:

```yaml
channels:
  whatsapp:
    # accessToken은 OS 키체인에 저장됨
    phoneNumberId: "your-phone-number-id"
    # verifyToken은 OS 키체인에 저장됨
    ownerPhone: "15551234567"
```

| 옵션             | 타입   | 필수   | 설명                                                             |
| ---------------- | ------ | ------ | ---------------------------------------------------------------- |
| `accessToken`    | string | 예     | WhatsApp Business API 액세스 토큰                                |
| `phoneNumberId`  | string | 예     | Meta Business 대시보드의 Phone Number ID                         |
| `verifyToken`    | string | 예     | webhook 확인용 토큰 (사용자가 선택)                              |
| `webhookPort`    | number | 아니오 | webhook 수신 포트 (기본값: `8443`)                               |
| `ownerPhone`     | string | 권장   | 소유자 확인을 위한 전화번호 (예: `"15551234567"`)                |
| `classification` | string | 아니오 | 분류 등급 (기본값: `PUBLIC`)                                     |

::: warning 시크릿을 안전하게 저장하십시오 액세스 토큰을 소스 관리에
커밋하지 마십시오. 환경 변수나 OS 키체인을 사용하십시오. :::

### 5단계: Triggerfish 시작

```bash
triggerfish stop && triggerfish start
```

휴대전화에서 WhatsApp Business 번호로 메시지를 보내 연결을 확인합니다.

## 소유자 신원

Triggerfish는 발신자의 전화번호를 구성된 `ownerPhone`과 비교하여 소유자
상태를 결정합니다. 이 검사는 LLM이 메시지를 보기 전에 코드에서 수행됩니다:

- **일치** -- 소유자 명령
- **불일치** -- `PUBLIC` 테인트를 가진 외부 입력

`ownerPhone`이 구성되지 않은 경우 모든 메시지가 소유자로부터 온 것으로
처리됩니다.

::: tip 항상 소유자 전화번호를 설정하십시오 다른 사람이 WhatsApp Business
번호로 메시지를 보낼 수 있는 경우 무단 명령 실행을 방지하기 위해 항상
`ownerPhone`을 구성하십시오. :::

## Webhook 작동 방식

어댑터는 구성된 포트(기본값 `8443`)에서 HTTP 서버를 시작하여 두 가지 유형의
요청을 처리합니다:

1. **GET /webhook** -- Meta가 webhook 엔드포인트를 확인하기 위해
   보냅니다. 확인 토큰이 일치하면 Triggerfish가 챌린지 토큰으로
   응답합니다.
2. **POST /webhook** -- Meta가 수신 메시지를 여기로 보냅니다.
   Triggerfish가 Cloud API webhook 페이로드를 파싱하고 텍스트 메시지를
   추출하여 메시지 핸들러로 전달합니다.

## 메시지 제한

WhatsApp은 최대 4,096자의 메시지를 지원합니다. 이 제한을 초과하는 메시지는
전송 전에 여러 메시지로 청킹됩니다.

## 타이핑 인디케이터

Triggerfish는 WhatsApp에서 타이핑 인디케이터를 송수신합니다. 에이전트가
요청을 처리하는 동안 채팅에 타이핑 인디케이터가 표시됩니다. 읽음 확인도
지원됩니다.

## 분류 변경

```yaml
channels:
  whatsapp:
    # accessToken은 OS 키체인에 저장됨
    phoneNumberId: "your-phone-number-id"
    # verifyToken은 OS 키체인에 저장됨
    classification: INTERNAL
```

유효한 등급: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
