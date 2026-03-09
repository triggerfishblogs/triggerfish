# Email

Triggerfish 에이전트를 이메일에 연결하여 IMAP을 통해 메시지를 수신하고
SMTP 릴레이 서비스를 통해 답장을 보낼 수 있습니다. 어댑터는 아웃바운드
이메일에 SendGrid, Mailgun 및 Amazon SES와 같은 서비스를 지원하고,
인바운드 메시지에는 모든 IMAP 서버를 폴링합니다.

## 기본 분류

Email은 기본적으로 `CONFIDENTIAL` 분류입니다. 이메일에는 종종 민감한
콘텐츠(계약서, 계정 알림, 개인 서신)가 포함되므로 `CONFIDENTIAL`이 안전한
기본값입니다.

## 설정

### 1단계: SMTP 릴레이 선택

Triggerfish는 HTTP 기반 SMTP 릴레이 API를 통해 아웃바운드 이메일을
전송합니다. 지원되는 서비스는 다음과 같습니다:

| 서비스     | API 엔드포인트                                                   |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

이 서비스 중 하나에 가입하고 API 키를 받으십시오.

### 2단계: 수신용 IMAP 구성

이메일을 수신하려면 IMAP 자격 증명이 필요합니다. 대부분의 이메일
프로바이더가 IMAP을 지원합니다:

| 프로바이더 | IMAP 호스트             | 포트 |
| ---------- | ----------------------- | ---- |
| Gmail      | `imap.gmail.com`        | 993  |
| Outlook    | `outlook.office365.com` | 993  |
| Fastmail   | `imap.fastmail.com`     | 993  |
| 사용자 정의 | 메일 서버             | 993  |

::: info Gmail 앱 비밀번호 2단계 인증을 사용하는 Gmail의 경우 IMAP 접근을
위해 [앱 비밀번호](https://myaccount.google.com/apppasswords)를 생성해야
합니다. 일반 Gmail 비밀번호는 작동하지 않습니다. :::

### 3단계: Triggerfish 구성

`triggerfish.yaml`에 Email 채널을 추가합니다:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "triggerfish@yourdomain.com"
    ownerEmail: "you@gmail.com"
```

시크릿(SMTP API 키, IMAP 비밀번호)은
`triggerfish config add-channel email` 중에 입력되며 OS 키체인에
저장됩니다.

| 옵션             | 타입   | 필수   | 설명                                                    |
| ---------------- | ------ | ------ | ------------------------------------------------------- |
| `smtpApiUrl`     | string | 예     | SMTP 릴레이 API 엔드포인트 URL                          |
| `imapHost`       | string | 예     | IMAP 서버 호스트 이름                                   |
| `imapPort`       | number | 아니오 | IMAP 서버 포트 (기본값: `993`)                          |
| `imapUser`       | string | 예     | IMAP 사용자 이름 (일반적으로 이메일 주소)               |
| `fromAddress`    | string | 예     | 발신 이메일의 보내는 사람 주소                          |
| `pollInterval`   | number | 아니오 | 새 이메일 확인 간격 (밀리초, 기본값: `30000`)           |
| `classification` | string | 아니오 | 분류 등급 (기본값: `CONFIDENTIAL`)                      |
| `ownerEmail`     | string | 권장   | 소유자 확인을 위한 이메일 주소                          |

::: warning 자격 증명 SMTP API 키와 IMAP 비밀번호는 OS 키체인(Linux: GNOME
Keyring, macOS: Keychain Access)에 저장됩니다. `triggerfish.yaml`에는
나타나지 않습니다. :::

### 4단계: Triggerfish 시작

```bash
triggerfish stop && triggerfish start
```

구성된 주소로 이메일을 보내 연결을 확인합니다.

## 소유자 신원

Triggerfish는 발신자의 이메일 주소를 구성된 `ownerEmail`과 비교하여 소유자
상태를 결정합니다:

- **일치** -- 소유자 명령
- **불일치** -- `PUBLIC` 테인트를 가진 외부 입력

`ownerEmail`이 구성되지 않은 경우 모든 메시지가 소유자로부터 온 것으로
처리됩니다.

## 도메인 기반 분류

더 세밀한 제어를 위해 이메일은 도메인 기반 수신자 분류를 지원합니다. 이는
특히 기업 환경에서 유용합니다:

- `@yourcompany.com`에서 온 이메일은 `INTERNAL`로 분류할 수 있습니다
- 알 수 없는 도메인에서 온 이메일은 기본적으로 `EXTERNAL`입니다
- 관리자가 내부 도메인 목록을 구성할 수 있습니다

```yaml
channels:
  email:
    # ... 기타 구성
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

이는 정책 엔진이 이메일의 출처에 따라 다른 규칙을 적용함을 의미합니다:

| 발신자 도메인            | 분류           |
| ------------------------ | :------------: |
| 구성된 내부 도메인       |   `INTERNAL`   |
| 알 수 없는 도메인        |   `EXTERNAL`   |

## 작동 방식

### 인바운드 메시지

어댑터는 구성된 간격(기본값: 30초마다)으로 IMAP 서버를 폴링하여 읽지 않은
새 메시지를 확인합니다. 새 이메일이 도착하면:

1. 발신자 주소가 추출됩니다
2. `ownerEmail`에 대해 소유자 상태가 확인됩니다
3. 이메일 본문이 메시지 핸들러로 전달됩니다
4. 각 이메일 스레드가 발신자 주소를 기반으로 세션 ID에 매핑됩니다
   (`email-sender@example.com`)

### 아웃바운드 메시지

에이전트가 응답하면 어댑터는 구성된 SMTP 릴레이 HTTP API를 통해 답장을
보냅니다. 답장에는 다음이 포함됩니다:

- **From** -- 구성된 `fromAddress`
- **To** -- 원래 발신자의 이메일 주소
- **Subject** -- "Triggerfish" (기본값)
- **Body** -- 에이전트의 응답 (일반 텍스트)

## 폴링 간격

기본 폴링 간격은 30초입니다. 필요에 따라 조정할 수 있습니다:

```yaml
channels:
  email:
    # ... 기타 구성
    pollInterval: 10000 # 10초마다 확인
```

::: tip 반응성과 리소스 균형 폴링 간격이 짧으면 수신 이메일에 대한 응답이
빨라지지만 IMAP 연결이 더 자주 발생합니다. 대부분의 개인 사용 사례에서
30초가 적절한 균형입니다. :::

## 분류 변경

```yaml
channels:
  email:
    # ... 기타 구성
    classification: CONFIDENTIAL
```

유효한 등급: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
