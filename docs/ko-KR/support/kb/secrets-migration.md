# KB: Secrets 마이그레이션

이 문서는 평문 저장소에서 암호화된 형식으로, 그리고 인라인 구성 값에서 keychain 참조로의 secret 마이그레이션을 다룹니다.

## 배경

Triggerfish의 초기 버전은 secret을 평문 JSON으로 저장했습니다. 현재 버전은 파일 기반 secret 저장소(Windows, Docker)에는 AES-256-GCM 암호화를, OS 네이티브 keychain(macOS Keychain, Linux Secret Service)을 사용합니다.

## 자동 마이그레이션 (평문에서 암호화로)

Triggerfish가 secrets 파일을 열고 이전 평문 형식(`v` 필드가 없는 플랫 JSON 객체)을 감지하면 자동으로 마이그레이션합니다:

1. **감지.** `{v: 1, entries: {...}}` 구조의 존재 여부를 확인합니다. 단순한 `Record<string, string>`이면 레거시 형식입니다.

2. **마이그레이션.** 각 평문 값이 PBKDF2로 파생된 machine key를 사용하여 AES-256-GCM으로 암호화됩니다. 각 값에 대해 고유한 IV가 생성됩니다.

3. **원자적 쓰기.** 암호화된 데이터는 먼저 임시 파일에 기록된 다음, 원본을 교체하기 위해 원자적으로 이름이 변경됩니다. 이는 프로세스가 중단되어도 데이터 손실을 방지합니다.

4. **로깅.** 두 개의 로그 항목이 생성됩니다:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **디바이스 간 처리.** 원자적 이름 변경이 실패하면(예: 임시 파일과 secrets 파일이 다른 파일 시스템에 있는 경우) 마이그레이션은 복사 후 삭제로 대체됩니다.

### 수행해야 할 작업

없습니다. 마이그레이션은 완전 자동이며 첫 번째 액세스 시 발생합니다. 그러나 마이그레이션 후:

- **Secret을 순환하십시오.** 평문 버전이 백업, 캐시 또는 로그에 남아 있을 수 있습니다. 새 API 키를 생성하고 업데이트하십시오:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **이전 백업을 삭제하십시오.** 이전 평문 secrets 파일의 백업이 있으면 안전하게 삭제하십시오.

## 수동 마이그레이션 (인라인 구성에서 Keychain으로)

`triggerfish.yaml`에 `secret:` 참조 대신 원시 secret 값이 포함된 경우:

```yaml
# 변경 전 (보안 취약)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

마이그레이션 명령을 실행하십시오:

```bash
triggerfish config migrate-secrets
```

이 명령은:

1. 알려진 secret 필드(API 키, 봇 토큰, 비밀번호)에 대해 구성을 스캔합니다
2. 각 값을 표준 키 이름으로 OS keychain에 저장합니다
3. 인라인 값을 `secret:` 참조로 교체합니다

```yaml
# 변경 후 (보안)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### 알려진 secret 필드

마이그레이션 명령이 인식하는 필드:

| 구성 경로 | Keychain 키 |
|-------------|-------------|
| `models.providers.<name>.apiKey` | `provider:<name>:apiKey` |
| `channels.telegram.botToken` | `telegram:botToken` |
| `channels.slack.botToken` | `slack:botToken` |
| `channels.slack.appToken` | `slack:appToken` |
| `channels.slack.signingSecret` | `slack:signingSecret` |
| `channels.discord.botToken` | `discord:botToken` |
| `channels.whatsapp.accessToken` | `whatsapp:accessToken` |
| `channels.whatsapp.webhookVerifyToken` | `whatsapp:webhookVerifyToken` |
| `channels.email.smtpPassword` | `email:smtpPassword` |
| `channels.email.imapPassword` | `email:imapPassword` |
| `web.search.api_key` | `web:search:apiKey` |

## Machine Key

암호화된 파일 저장소는 `secrets.key`에 저장된 machine key에서 암호화 키를 파생합니다. 이 키는 처음 사용 시 자동으로 생성됩니다.

### 키 파일 권한

Unix 시스템에서 키 파일은 `0600` 권한(소유자 읽기/쓰기만)을 가져야 합니다. Triggerfish는 시작 시 이를 확인하고 권한이 너무 개방적이면 경고를 로그합니다:

```
Machine key file permissions too open
```

해결 방법:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### 키 파일 분실

Machine key 파일이 삭제되거나 손상되면 해당 키로 암호화된 모든 secret을 복구할 수 없게 됩니다. 모든 secret을 다시 저장해야 합니다:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... 등
```

안전한 장소에 `secrets.key` 파일을 백업하십시오.

### 사용자 정의 키 경로

키 파일 위치를 재정의하려면:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

이것은 주로 비표준 볼륨 레이아웃을 가진 Docker 배포에 유용합니다.
