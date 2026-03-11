# 문제 해결: Daemon

## Daemon이 시작되지 않음

### "Triggerfish is already running"

이 메시지는 로그 파일이 다른 프로세스에 의해 잠겨 있을 때 나타납니다. Windows에서는 파일 writer가 로그 파일을 열려고 할 때 `EBUSY` / "os error 32"로 감지됩니다.

**해결 방법:**

```bash
triggerfish status    # 실행 중인 인스턴스가 있는지 확인
triggerfish stop      # 기존 인스턴스 중지
triggerfish start     # 새로 시작
```

`triggerfish status`가 daemon이 실행 중이 아니라고 보고하지만 여전히 이 오류가 발생하면, 다른 프로세스가 로그 파일을 열어 두고 있습니다. 좀비 프로세스를 확인하십시오:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

오래된 프로세스를 종료한 후 다시 시도하십시오.

### 포트 18789 또는 18790이 이미 사용 중

Gateway는 포트 18789(WebSocket)에서, Tidepool은 18790(A2UI)에서 수신합니다. 다른 애플리케이션이 이 포트를 사용 중이면 daemon이 시작에 실패합니다.

**포트를 사용 중인 프로세스 찾기:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### LLM provider가 구성되지 않음

`triggerfish.yaml`에 `models` 섹션이 없거나 기본 provider에 API 키가 없으면 gateway가 다음과 같이 로그합니다:

```
No LLM provider configured. Check triggerfish.yaml.
```

**해결 방법:** 설정 마법사를 실행하거나 수동으로 구성하십시오:

```bash
triggerfish dive                    # 대화형 설정
# 또는
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### 구성 파일을 찾을 수 없음

예상 경로에 `triggerfish.yaml`이 존재하지 않으면 daemon이 종료됩니다. 오류 메시지는 환경에 따라 다릅니다:

- **네이티브 설치:** `triggerfish dive` 실행을 제안합니다
- **Docker:** `-v ./triggerfish.yaml:/data/triggerfish.yaml`으로 구성 파일 마운트를 제안합니다

경로를 확인하십시오:

```bash
ls ~/.triggerfish/triggerfish.yaml      # 네이티브
docker exec triggerfish ls /data/       # Docker
```

### Secret 해석 실패

구성이 keychain에 존재하지 않는 secret(`secret:provider:anthropic:apiKey`)을 참조하면, daemon이 누락된 secret의 이름이 포함된 오류와 함께 종료됩니다.

**해결 방법:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## 서비스 관리

### systemd: 로그아웃 후 daemon 중지

기본적으로 systemd 사용자 서비스는 사용자가 로그아웃하면 중지됩니다. Triggerfish는 설치 시 `loginctl enable-linger`를 활성화하여 이를 방지합니다. linger 활성화에 실패한 경우:

```bash
# linger 상태 확인
loginctl show-user $USER | grep Linger

# 활성화 (sudo 필요할 수 있음)
sudo loginctl enable-linger $USER
```

Linger가 없으면 daemon은 로그인한 동안에만 실행됩니다.

### systemd: 서비스 시작 실패

서비스 상태와 journal을 확인하십시오:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

일반적인 원인:
- **바이너리 이동 또는 삭제.** unit 파일에 바이너리 경로가 하드코딩되어 있습니다. daemon을 다시 설치하십시오: `triggerfish dive --install-daemon`
- **PATH 문제.** systemd unit은 설치 시 PATH를 캡처합니다. daemon 설치 후 새 도구(예: MCP 서버)를 설치한 경우 daemon을 다시 설치하여 PATH를 업데이트하십시오.
- **DENO_DIR 미설정.** systemd unit은 `DENO_DIR=~/.cache/deno`를 설정합니다. 이 디렉토리에 쓸 수 없으면 SQLite FFI 플러그인이 로드에 실패합니다.

### launchd: 로그인 시 daemon이 시작되지 않음

plist 상태를 확인하십시오:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

plist가 로드되지 않은 경우:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

일반적인 원인:
- **Plist 제거 또는 손상.** 다시 설치하십시오: `triggerfish dive --install-daemon`
- **바이너리 이동.** plist에 경로가 하드코딩되어 있습니다. 바이너리 이동 후 다시 설치하십시오.
- **설치 시점의 PATH.** systemd와 마찬가지로 launchd는 plist 생성 시 PATH를 캡처합니다. PATH에 새 도구를 추가한 경우 다시 설치하십시오.

### Windows: 서비스가 시작되지 않음

서비스 상태를 확인하십시오:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

일반적인 원인:
- **서비스 미설치.** 관리자 권한으로 설치 프로그램을 다시 실행하십시오.
- **바이너리 경로 변경.** 서비스 래퍼에 경로가 하드코딩되어 있습니다. 다시 설치하십시오.
- **.NET 컴파일이 설치 중 실패.** C# 서비스 래퍼에는 .NET Framework 4.x `csc.exe`가 필요합니다.

### 업그레이드로 daemon이 중단됨

`triggerfish update`를 실행한 후 daemon이 자동으로 재시작됩니다. 재시작되지 않으면:

1. 이전 바이너리가 여전히 실행 중일 수 있습니다. 수동으로 중지하십시오: `triggerfish stop`
2. Windows에서는 이전 바이너리의 이름이 `.old`로 변경됩니다. 이름 변경에 실패하면 업데이트에 오류가 발생합니다. 먼저 서비스를 중지한 후 업데이트하십시오.

---

## 로그 파일 문제

### 로그 파일이 비어 있음

Daemon은 `~/.triggerfish/logs/triggerfish.log`에 기록합니다. 파일이 존재하지만 비어 있는 경우:

- daemon이 방금 시작되었을 수 있습니다. 잠시 기다리십시오.
- 로그 수준이 ERROR 수준 메시지만 기록하는 `quiet`으로 설정되어 있습니다. `normal` 또는 `verbose`로 설정하십시오:

```bash
triggerfish config set logging.level normal
```

### 로그가 너무 시끄러움

오류만 보려면 로그 수준을 `quiet`으로 설정하십시오:

```bash
triggerfish config set logging.level quiet
```

수준 매핑:

| 구성 값 | 최소 로깅 수준 |
|-------------|---------------------|
| `quiet` | ERROR만 |
| `normal` | INFO 이상 |
| `verbose` | DEBUG 이상 |
| `debug` | TRACE 이상 (모두) |

### 로그 로테이션

현재 파일이 1 MB를 초과하면 로그가 자동으로 로테이션됩니다. 최대 10개의 로테이션된 파일이 보관됩니다:

```
triggerfish.log        # 현재
triggerfish.1.log      # 가장 최근 백업
triggerfish.2.log      # 두 번째 최근
...
triggerfish.10.log     # 가장 오래된 (새 로테이션 시 삭제)
```

시간 기반 로테이션은 없으며 크기 기반만 있습니다.
