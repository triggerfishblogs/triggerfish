# 문제 해결: Secrets & 자격 증명

## 플랫폼별 Keychain 백엔드

| 플랫폼 | 백엔드 | 세부 사항 |
|----------|---------|---------|
| macOS | Keychain (네이티브) | `security` CLI를 사용하여 Keychain Access에 접근 |
| Linux | Secret Service (D-Bus) | `secret-tool` CLI 사용 (libsecret / GNOME Keyring) |
| Windows | 암호화된 파일 저장소 | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | 암호화된 파일 저장소 | `/data/secrets.json` + `/data/secrets.key` |

백엔드는 시작 시 자동으로 선택됩니다. 플랫폼에 사용되는 백엔드를 변경할 수 없습니다.

---

## macOS 문제

### Keychain 액세스 프롬프트

macOS에서 `triggerfish`가 keychain에 액세스하도록 허용할지 묻는 프롬프트가 표시될 수 있습니다. "항상 허용"을 클릭하여 반복적인 프롬프트를 피하십시오. 실수로 "거부"를 클릭한 경우 Keychain Access를 열고 해당 항목을 찾아 제거하십시오. 다음 액세스 시 다시 프롬프트가 표시됩니다.

### Keychain 잠김

macOS keychain이 잠겨 있으면(예: 슬립 후) secret 작업이 실패합니다. 잠금을 해제하십시오:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

또는 Mac의 잠금을 해제하십시오(로그인 시 keychain이 잠금 해제됩니다).

---

## Linux 문제

### "secret-tool"을 찾을 수 없음

Linux keychain 백엔드는 `libsecret-tools` 패키지의 일부인 `secret-tool`을 사용합니다.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Secret Service daemon이 실행 중이 아님

headless 서버 또는 최소 데스크톱 환경에서는 Secret Service daemon이 없을 수 있습니다. 증상:

- `secret-tool` 명령이 멈추거나 실패함
- D-Bus 연결에 대한 오류 메시지

**옵션:**

1. **GNOME Keyring 설치 및 시작:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **암호화된 파일 대체 사용:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   경고: 메모리 대체는 재시작 시 secret이 유지되지 않습니다. 테스트용으로만 적합합니다.

3. **서버의 경우 Docker를 고려하십시오.** Docker 배포는 keyring daemon이 필요 없는 암호화된 파일 저장소를 사용합니다.

### KDE / KWallet

GNOME Keyring 대신 KWallet을 사용하는 KDE를 사용하는 경우, KWallet이 구현하는 Secret Service D-Bus API를 통해 `secret-tool`이 여전히 작동해야 합니다. 작동하지 않으면 KWallet과 함께 `gnome-keyring`을 설치하십시오.

---

## Windows / Docker 암호화된 파일 저장소

### 작동 방식

암호화된 파일 저장소는 AES-256-GCM 암호화를 사용합니다:

1. PBKDF2를 사용하여 machine key가 파생되어 `secrets.key`에 저장됩니다
2. 각 secret 값은 고유한 IV로 개별 암호화됩니다
3. 암호화된 데이터는 버전이 있는 형식(`{v: 1, entries: {...}}`)으로 `secrets.json`에 저장됩니다

### "Machine key file permissions too open"

Unix 기반 시스템(Docker의 Linux)에서 키 파일은 `0600` 권한(소유자 읽기/쓰기만)을 가져야 합니다. 권한이 너무 개방적이면:

```
Machine key file permissions too open
```

**해결 방법:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# 또는 Docker에서
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

키 파일이 존재하지만 파싱할 수 없습니다. 잘리거나 덮어써졌을 수 있습니다.

**해결 방법:** 키 파일을 삭제하고 재생성하십시오:

```bash
rm ~/.triggerfish/secrets.key
```

다음 시작 시 새 키가 생성됩니다. 그러나 이전 키로 암호화된 모든 기존 secret은 읽을 수 없게 됩니다. 모든 secret을 다시 저장해야 합니다:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# 모든 secret에 대해 반복
```

### "Secret file permissions too open"

키 파일과 마찬가지로 secrets 파일도 제한적인 권한을 가져야 합니다:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

시스템이 파일 권한을 설정할 수 없었습니다. Unix 권한을 지원하지 않는 파일 시스템(일부 네트워크 마운트, FAT/exFAT 볼륨)에서 발생할 수 있습니다. 파일 시스템이 권한 변경을 지원하는지 확인하십시오.

---

## 레거시 Secrets 마이그레이션

### 자동 마이그레이션

Triggerfish가 평문 secrets 파일(암호화 없는 이전 형식)을 감지하면 첫 번째 로드 시 자동으로 암호화된 형식으로 마이그레이션합니다:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

마이그레이션 과정:
1. 평문 JSON 파일을 읽습니다
2. AES-256-GCM으로 각 값을 암호화합니다
3. 임시 파일에 기록한 후 원본을 원자적으로 교체합니다
4. secret 순환을 권장하는 경고를 로그합니다

### 수동 마이그레이션

`triggerfish.yaml` 파일에 `secret:` 참조 대신 직접 secret이 있는 경우 keychain으로 마이그레이션하십시오:

```bash
triggerfish config migrate-secrets
```

이 명령은 구성에서 알려진 secret 필드(API 키, 봇 토큰 등)를 스캔하고, keychain에 저장하고, 구성 파일의 값을 `secret:` 참조로 교체합니다.

### 디바이스 간 이동 문제

마이그레이션이 파일 시스템 경계(다른 마운트 포인트, NFS)를 넘어 파일을 이동하는 경우 원자적 이름 변경이 실패할 수 있습니다. 마이그레이션은 복사 후 삭제로 대체되며, 이는 안전하지만 잠시 두 파일이 디스크에 존재합니다.

---

## Secret 해석

### `secret:` 참조 작동 방식

`secret:`으로 시작하는 구성 값은 시작 시 해석됩니다:

```yaml
# triggerfish.yaml에서
apiKey: "secret:provider:anthropic:apiKey"

# 시작 시 해석됨:
apiKey: "sk-ant-api03-actual-key-value..."
```

해석된 값은 메모리에만 존재합니다. 디스크의 구성 파일은 항상 `secret:` 참조를 포함합니다.

### "Secret not found"

```
Secret not found: <key>
```

참조된 키가 keychain에 존재하지 않습니다.

**해결 방법:**

```bash
triggerfish config set-secret <key> <value>
```

### Secret 나열

```bash
# 저장된 모든 secret 키 나열 (값은 표시되지 않음)
triggerfish config get-secret --list
```

### Secret 삭제

```bash
triggerfish config set-secret <key> ""
# 또는 에이전트를 통해:
# 에이전트가 secrets 도구를 통해 secret 삭제를 요청할 수 있습니다
```

---

## 환경 변수 재정의

키 파일 경로는 `TRIGGERFISH_KEY_PATH`로 재정의할 수 있습니다:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

이것은 주로 사용자 정의 볼륨 레이아웃을 가진 Docker 배포에 유용합니다.

---

## 일반적인 Secret 키 이름

Triggerfish에서 사용하는 표준 keychain 키입니다:

| 키 | 용도 |
|-----|-------|
| `provider:<name>:apiKey` | LLM provider API 키 |
| `telegram:botToken` | Telegram 봇 토큰 |
| `slack:botToken` | Slack 봇 토큰 |
| `slack:appToken` | Slack 앱 수준 토큰 |
| `slack:signingSecret` | Slack 서명 secret |
| `discord:botToken` | Discord 봇 토큰 |
| `whatsapp:accessToken` | WhatsApp Cloud API access token |
| `whatsapp:webhookVerifyToken` | WhatsApp webhook 검증 토큰 |
| `email:smtpPassword` | SMTP 릴레이 비밀번호 |
| `email:imapPassword` | IMAP 서버 비밀번호 |
| `web:search:apiKey` | Brave Search API 키 |
| `github-pat` | GitHub Personal Access Token |
| `notion:token` | Notion 통합 토큰 |
| `caldav:password` | CalDAV 서버 비밀번호 |
| `google:clientId` | Google OAuth 클라이언트 ID |
| `google:clientSecret` | Google OAuth 클라이언트 secret |
| `google:refreshToken` | Google OAuth refresh token |
