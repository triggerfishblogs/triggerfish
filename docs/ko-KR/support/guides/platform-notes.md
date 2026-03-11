# 플랫폼 참고 사항

플랫폼별 동작, 요구 사항 및 특이 사항입니다.

## macOS

### 서비스 관리자: launchd

Triggerfish는 다음 위치에 launchd 에이전트로 등록됩니다:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist는 `RunAtLoad: true` 및 `KeepAlive: true`로 설정되어 있어, 로그인 시 daemon이 시작되고 충돌 시 재시작됩니다.

### PATH 캡처

launchd plist는 설치 시 셸 PATH를 캡처합니다. launchd는 셸 프로필을 소싱하지 않으므로 이것이 중요합니다. daemon 설치 후 MCP 서버 종속성(`npx`, `python` 등)을 설치하면 해당 바이너리가 daemon의 PATH에 포함되지 않습니다.

**해결 방법:** 캡처된 PATH를 업데이트하려면 daemon을 다시 설치하십시오:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### 격리

macOS는 다운로드된 바이너리에 격리 플래그를 적용합니다. 설치 프로그램은 `xattr -cr`로 이를 제거하지만, 바이너리를 수동으로 다운로드한 경우:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

Secret은 `security` CLI를 통해 macOS 로그인 keychain에 저장됩니다. Keychain Access가 잠겨 있으면 잠금을 해제할 때까지(보통 로그인으로) secret 작업이 실패합니다.

### Homebrew Deno

소스에서 빌드하고 Deno가 Homebrew를 통해 설치된 경우, 설치 스크립트를 실행하기 전에 Homebrew bin 디렉토리가 PATH에 있는지 확인하십시오.

---

## Linux

### 서비스 관리자: systemd (사용자 모드)

Daemon은 systemd 사용자 서비스로 실행됩니다:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

기본적으로 systemd 사용자 서비스는 사용자가 로그아웃하면 중지됩니다. Triggerfish는 설치 시 linger를 활성화합니다:

```bash
loginctl enable-linger $USER
```

이것이 실패하면(예: 시스템 관리자가 비활성화한 경우) daemon은 로그인한 동안에만 실행됩니다. daemon이 지속되어야 하는 서버에서는 관리자에게 계정에 대한 linger 활성화를 요청하십시오.

### PATH 및 환경

systemd unit은 PATH를 캡처하고 `DENO_DIR=~/.cache/deno`를 설정합니다. macOS와 마찬가지로 설치 후 PATH 변경은 daemon을 다시 설치해야 합니다.

Unit은 또한 `Environment=PATH=...`를 명시적으로 설정합니다. daemon이 MCP 서버 바이너리를 찾을 수 없으면 이것이 가장 유력한 원인입니다.

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic 데스크톱에서는 `/home`이 `/var/home`으로 심볼릭 링크되어 있습니다. Triggerfish는 홈 디렉토리를 해석할 때 심볼릭 링크를 따라 실제 경로를 찾아 자동으로 처리합니다.

Flatpak으로 설치된 브라우저는 `flatpak run`을 호출하는 래퍼 스크립트를 통해 감지되고 실행됩니다.

### Headless 서버

데스크톱 환경이 없는 서버에서는 GNOME Keyring / Secret Service daemon이 실행되지 않을 수 있습니다. 설정 지침은 [Secrets 문제 해결](/ko-KR/support/troubleshooting/secrets)을 참조하십시오.

### SQLite FFI

SQLite 스토리지 백엔드는 FFI를 통해 네이티브 라이브러리를 로드하는 `@db/sqlite`를 사용합니다. 이것은 `--allow-ffi` Deno 권한이 필요합니다(컴파일된 바이너리에 포함). 일부 최소 Linux 배포판에서는 공유 C 라이브러리 또는 관련 종속성이 누락될 수 있습니다. FFI 관련 오류가 발생하면 기본 개발 라이브러리를 설치하십시오.

---

## Windows

### 서비스 관리자: Windows 서비스

Triggerfish는 "Triggerfish"라는 이름의 Windows 서비스로 설치됩니다. 서비스는 설치 중 .NET Framework 4.x의 `csc.exe`를 사용하여 컴파일된 C# 래퍼로 구현됩니다.

**요구 사항:**
- .NET Framework 4.x (대부분의 Windows 10/11 시스템에 설치됨)
- 서비스 설치를 위한 관리자 권한
- .NET Framework 디렉토리에서 `csc.exe` 접근 가능

### 업데이트 시 바이너리 교체

Windows는 현재 실행 중인 실행 파일을 덮어쓸 수 없습니다. 업데이터는:

1. 실행 중인 바이너리의 이름을 `triggerfish.exe.old`로 변경
2. 새 바이너리를 원래 경로에 복사
3. 서비스 재시작
4. 다음 시작 시 `.old` 파일 정리

이름 변경 또는 복사가 실패하면 업데이트 전에 수동으로 서비스를 중지하십시오.

### ANSI 색상 지원

Triggerfish는 색상 콘솔 출력을 위해 Virtual Terminal Processing을 활성화합니다. 최신 PowerShell과 Windows Terminal에서 작동합니다. 이전 `cmd.exe` 창에서는 색상이 올바르게 렌더링되지 않을 수 있습니다.

### 배타적 파일 잠금

Windows는 배타적 파일 잠금을 사용합니다. Daemon이 실행 중이고 다른 인스턴스를 시작하려고 하면 로그 파일 잠금이 이를 방지합니다:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

이 감지는 Windows에 특화되어 있으며 로그 파일을 열 때 EBUSY / "os error 32"를 기반으로 합니다.

### Secret 저장소

Windows는 `~/.triggerfish/secrets.json`에 암호화된 파일 저장소(AES-256-GCM)를 사용합니다. Windows 자격 증명 관리자 통합은 없습니다. `secrets.key` 파일을 민감한 것으로 취급하십시오.

### PowerShell 설치 프로그램 참고 사항

PowerShell 설치 프로그램(`install.ps1`):
- 프로세서 아키텍처 감지 (x64/arm64)
- `%LOCALAPPDATA%\Triggerfish`에 설치
- 레지스트리를 통해 사용자 PATH에 설치 디렉토리 추가
- C# 서비스 래퍼 컴파일
- Windows 서비스 등록 및 시작

서비스 컴파일 단계에서 설치 프로그램이 실패하면 Triggerfish를 수동으로 실행할 수 있습니다:

```powershell
triggerfish run    # 포그라운드 모드
```

---

## Docker

### 컨테이너 런타임

Docker 배포는 Docker와 Podman을 모두 지원합니다. 감지는 자동이며, 명시적으로 설정할 수도 있습니다:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### 이미지 세부 사항

- 베이스: `gcr.io/distroless/cc-debian12` (최소, 셸 없음)
- 디버그 변형: `distroless:debug` (문제 해결을 위한 셸 포함)
- UID 65534(nonroot)로 실행
- Init: `true` (`tini`를 통한 PID 1 시그널 전달)
- 재시작 정책: `unless-stopped`

### 데이터 지속성

모든 영구 데이터는 Docker named volume으로 지원되는 컨테이너 내부의 `/data` 디렉토리에 있습니다:

```
/data/
  triggerfish.yaml        # 구성
  secrets.json            # 암호화된 secret
  secrets.key             # 암호화 키
  SPINE.md                # 에이전트 아이덴티티
  TRIGGER.md              # Trigger 동작
  data/triggerfish.db     # SQLite 데이터베이스
  logs/                   # 로그 파일
  skills/                 # 설치된 skill
  workspace/              # 에이전트 작업 공간
  .deno/                  # Deno FFI 플러그인 캐시
```

### 환경 변수

| 변수 | 기본값 | 용도 |
|----------|---------|---------|
| `TRIGGERFISH_DATA_DIR` | `/data` | 기본 데이터 디렉토리 |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | 구성 파일 경로 |
| `TRIGGERFISH_DOCKER` | `true` | Docker 특화 동작 활성화 |
| `DENO_DIR` | `/data/.deno` | Deno 캐시 (FFI 플러그인) |
| `HOME` | `/data` | nonroot 사용자의 홈 디렉토리 |

### Docker에서의 Secret

Docker 컨테이너는 호스트 OS keychain에 액세스할 수 없습니다. 암호화된 파일 저장소가 자동으로 사용됩니다. 암호화 키(`secrets.key`)와 암호화된 데이터(`secrets.json`)는 `/data` 볼륨에 저장됩니다.

**보안 참고:** Docker 볼륨에 대한 액세스 권한이 있는 사람은 암호화 키를 읽을 수 있습니다. 볼륨을 적절히 보호하십시오. 프로덕션에서는 Docker secrets 또는 secrets 관리자를 사용하여 런타임에 키를 주입하는 것을 고려하십시오.

### 포트

Compose 파일은 다음을 매핑합니다:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

추가 포트(WebChat의 8765, WhatsApp webhook의 8443)는 해당 채널을 활성화하는 경우 compose 파일에 추가해야 합니다.

### Docker에서 설정 마법사 실행

```bash
# 컨테이너가 실행 중인 경우
docker exec -it triggerfish triggerfish dive

# 컨테이너가 실행 중이 아닌 경우 (일회성)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### 업데이트

```bash
# 래퍼 스크립트 사용
triggerfish update

# 수동
docker compose pull
docker compose up -d
```

### 디버깅

문제 해결을 위해 이미지의 디버그 변형을 사용하십시오:

```yaml
# docker-compose.yml에서
image: ghcr.io/greghavens/triggerfish:debug
```

여기에는 셸이 포함되어 있어 컨테이너에 exec할 수 있습니다:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (브라우저만)

Triggerfish 자체는 Flatpak으로 실행되지 않지만, 브라우저 자동화를 위해 Flatpak으로 설치된 브라우저를 사용할 수 있습니다.

### 감지되는 Flatpak 브라우저

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### 작동 방식

Triggerfish는 headless 모드 플래그와 함께 `flatpak run`을 호출하는 임시 래퍼 스크립트를 생성한 다음, 해당 스크립트를 통해 Chrome을 실행합니다. 래퍼는 임시 디렉토리에 기록됩니다.

### 일반적인 문제

- **Flatpak 미설치.** 바이너리가 `/usr/bin/flatpak` 또는 `/usr/local/bin/flatpak`에 있어야 합니다.
- **임시 디렉토리에 쓸 수 없음.** 래퍼 스크립트는 실행 전에 디스크에 기록해야 합니다.
- **Flatpak 샌드박스 충돌.** 일부 Flatpak Chrome 빌드는 `--remote-debugging-port`를 제한합니다. CDP 연결이 실패하면 Flatpak이 아닌 Chrome 설치를 시도하십시오.
