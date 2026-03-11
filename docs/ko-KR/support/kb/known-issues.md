# KB: 알려진 문제

현재 알려진 문제와 해결 방법입니다. 이 페이지는 문제가 발견되고 해결될 때 업데이트됩니다.

---

## Email: IMAP 재연결 없음

**상태:** 미해결

Email 채널 어댑터는 IMAP을 통해 30초마다 새 메시지를 폴링합니다. IMAP 연결이 끊기면(네트워크 중단, 서버 재시작, 유휴 타임아웃) 폴링 루프가 조용히 실패하며 재연결을 시도하지 않습니다.

**증상:**
- Email 채널이 새 메시지 수신을 중단
- 로그에 `IMAP unseen email poll failed`가 나타남
- 자동 복구 없음

**해결 방법:** daemon을 재시작하십시오:

```bash
triggerfish stop && triggerfish start
```

**근본 원인:** IMAP 폴링 루프에 재연결 로직이 없습니다. `setInterval`은 계속 실행되지만 연결이 끊어져 각 폴링이 실패합니다.

---

## Slack/Discord SDK: 비동기 작업 누수

**상태:** 알려진 업스트림 문제

Slack(`@slack/bolt`) 및 Discord(`discord.js`) SDK는 import 시 비동기 작업을 누수합니다. 이것은 테스트에 영향을 미치지만(`sanitizeOps: false` 필요) 프로덕션 사용에는 영향을 미치지 않습니다.

**증상:**
- 채널 어댑터 테스트 시 "leaking async ops" 테스트 실패
- 프로덕션 영향 없음

**해결 방법:** Slack 또는 Discord 어댑터를 import하는 테스트 파일은 다음을 설정해야 합니다:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: 분할 대신 메시지 잘림

**상태:** 설계에 의한 것

Slack 메시지는 여러 메시지로 분할되는 대신(Telegram 및 Discord처럼) 40,000자에서 잘립니다. 매우 긴 에이전트 응답은 끝 부분의 콘텐츠가 손실됩니다.

**해결 방법:** 에이전트에게 더 짧은 응답을 생성하도록 요청하거나, 대용량 출력을 생성하는 작업에는 다른 채널을 사용하십시오.

---

## WhatsApp: ownerPhone 누락 시 모든 사용자가 소유자로 취급

**상태:** 설계에 의한 것 (경고 포함)

WhatsApp 채널에 `ownerPhone` 필드가 구성되지 않으면 모든 메시지 발신자가 소유자로 취급되어 전체 도구 액세스가 부여됩니다.

**증상:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (로그 경고는 실제로 오해의 소지가 있음; 동작은 소유자 액세스를 부여함)
- 모든 WhatsApp 사용자가 모든 도구에 액세스 가능

**해결 방법:** 항상 `ownerPhone`을 설정하십시오:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: 도구 설치 후 PATH 업데이트되지 않음

**상태:** 설계에 의한 것

systemd unit 파일은 daemon 설치 시 셸 PATH를 캡처합니다. daemon 설치 후 새 도구(MCP 서버 바이너리, `npx` 등)를 설치하면 daemon이 이를 찾지 못합니다.

**증상:**
- MCP 서버 생성 실패
- 터미널에서는 작동하지만 도구 바이너리가 "not found"

**해결 방법:** 캡처된 PATH를 업데이트하려면 daemon을 다시 설치하십시오:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

이것은 launchd(macOS)에도 적용됩니다.

---

## 브라우저: Flatpak Chrome CDP 제한

**상태:** 플랫폼 제한

일부 Flatpak Chrome 또는 Chromium 빌드는 `--remote-debugging-port` 플래그를 제한하여 Triggerfish가 Chrome DevTools Protocol을 통해 연결하는 것을 방지합니다.

**증상:**
- `CDP endpoint on port X not ready after Yms`
- 브라우저가 실행되지만 Triggerfish가 제어할 수 없음

**해결 방법:** Flatpak 대신 네이티브 패키지로 Chrome 또는 Chromium을 설치하십시오:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Podman에서 볼륨 권한

**상태:** 플랫폼별

Rootless 컨테이너와 함께 Podman을 사용할 때 UID 매핑으로 인해 컨테이너(UID 65534로 실행)가 데이터 볼륨에 쓸 수 없을 수 있습니다.

**증상:**
- 시작 시 `Permission denied` 오류
- 구성 파일, 데이터베이스 또는 로그를 생성할 수 없음

**해결 방법:** SELinux 재레이블링을 위해 `:Z` 볼륨 마운트 플래그를 사용하고 볼륨 디렉토리가 쓰기 가능한지 확인하십시오:

```bash
podman run -v triggerfish-data:/data:Z ...
```

또는 올바른 소유권으로 볼륨을 생성하십시오. 먼저 볼륨 마운트 경로를 찾은 다음 chown하십시오:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # "Mountpoint" 경로 확인
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: .NET Framework csc.exe를 찾을 수 없음

**상태:** 플랫폼별

Windows 설치 프로그램은 설치 시 C# 서비스 래퍼를 컴파일합니다. `csc.exe`를 찾을 수 없으면(.NET Framework 누락 또는 비표준 설치 경로) 서비스 설치가 실패합니다.

**증상:**
- 설치 프로그램이 완료되지만 서비스가 등록되지 않음
- `triggerfish status`가 서비스가 존재하지 않는다고 표시

**해결 방법:** .NET Framework 4.x를 설치하거나 포그라운드 모드에서 Triggerfish를 실행하십시오:

```powershell
triggerfish run
```

터미널을 열어 두십시오. 닫을 때까지 daemon이 실행됩니다.

---

## CalDAV: 동시 클라이언트와의 ETag 충돌

**상태:** 설계에 의한 것 (CalDAV 사양)

캘린더 이벤트를 업데이트하거나 삭제할 때 CalDAV는 낙관적 동시성 제어를 위해 ETag를 사용합니다. 읽기와 쓰기 사이에 다른 클라이언트(전화 앱, 웹 인터페이스)가 이벤트를 수정하면 작업이 실패합니다:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**해결 방법:** 에이전트가 최신 이벤트 버전을 가져와 자동으로 재시도해야 합니다. 그렇지 않으면 "이벤트의 최신 버전을 가져와서 다시 시도해 주세요"라고 요청하십시오.

---

## 메모리 대체: 재시작 시 Secret 손실

**상태:** 설계에 의한 것

`TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true`를 사용할 때 secret은 메모리에만 저장되며 daemon 재시작 시 손실됩니다. 이 모드는 테스트용으로만 사용하십시오.

**증상:**
- Daemon 재시작까지 secret이 작동
- 재시작 후: `Secret not found` 오류

**해결 방법:** 적절한 secret 백엔드를 설정하십시오. Headless Linux에서는 `gnome-keyring`을 설치하십시오:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: 재인증 시 Refresh Token 미발급

**상태:** Google API 동작

Google은 첫 번째 인증 시에만 refresh token을 발급합니다. 이전에 앱을 인증하고 `triggerfish connect google`을 다시 실행하면 access token은 받지만 refresh token은 받지 못합니다.

**증상:**
- Google API가 처음에는 작동하지만 access token이 만료되면(1시간) 실패
- `No refresh token` 오류

**해결 방법:** 먼저 앱의 액세스를 취소한 후 재인증하십시오:

1. [Google 계정 권한](https://myaccount.google.com/permissions)으로 이동
2. Triggerfish를 찾아 "액세스 제거"를 클릭
3. `triggerfish connect google`을 다시 실행
4. Google이 이제 새로운 refresh token을 발급합니다

---

## 새 문제 보고

여기에 나열되지 않은 문제가 발생하면 [GitHub Issues](https://github.com/greghavens/triggerfish/issues) 페이지를 확인하십시오. 아직 보고되지 않았다면 [이슈 작성 가이드](/ko-KR/support/guides/filing-issues)를 따라 새 이슈를 작성하십시오.
