# CLI 명령어

Triggerfish는 에이전트, 데몬, 채널, 세션을 관리하기 위한 CLI를 제공합니다. 이 페이지에서는 사용 가능한 모든 명령어와 채팅 내 단축키를 다룹니다.

## 핵심 명령어

### `triggerfish dive`

대화형 설정 마법사를 실행합니다. 설치 후 처음 실행하는 명령어이며 언제든지 다시 실행하여 재구성할 수 있습니다.

```bash
triggerfish dive
```

마법사는 8단계를 안내합니다: LLM 제공자, 에이전트 이름/성격, 채널 설정, 선택적 plugin, Google Workspace 연결, GitHub 연결, 검색 제공자, 데몬 설치. 전체 안내는 [빠른 시작](./quickstart)을 참조하십시오.

### `triggerfish chat`

터미널에서 대화형 채팅 세션을 시작합니다. 인수 없이 `triggerfish`를 실행할 때의 기본 명령어입니다.

```bash
triggerfish chat
```

채팅 인터페이스 기능:

- 터미널 하단의 전체 너비 입력 바
- 실시간 토큰 표시와 함께하는 스트리밍 응답
- 컴팩트 도구 호출 표시 (Ctrl+O로 전환)
- 입력 기록 (세션 간 유지)
- ESC로 실행 중인 응답 중단
- 긴 세션을 관리하기 위한 대화 압축

### `triggerfish run`

Gateway 서버를 포그라운드에서 시작합니다. 개발 및 디버깅에 유용합니다.

```bash
triggerfish run
```

Gateway는 WebSocket 연결, 채널 어댑터, 정책 엔진, 세션 상태를 관리합니다. 프로덕션에서는 대신 `triggerfish start`를 사용하여 데몬으로 실행합니다.

### `triggerfish start`

OS 서비스 관리자를 사용하여 Triggerfish를 백그라운드 데몬으로 설치하고 시작합니다.

```bash
triggerfish start
```

| 플랫폼  | 서비스 관리자                          |
| ------- | -------------------------------------- |
| macOS   | launchd                               |
| Linux   | systemd                               |
| Windows | Windows 서비스 / 작업 스케줄러         |

데몬은 로그인 시 자동으로 시작되며 에이전트를 백그라운드에서 계속 실행합니다.

### `triggerfish stop`

실행 중인 데몬을 중지합니다.

```bash
triggerfish stop
```

### `triggerfish status`

데몬이 현재 실행 중인지 확인하고 기본 상태 정보를 표시합니다.

```bash
triggerfish status
```

출력 예시:

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

데몬 로그 출력을 봅니다.

```bash
# 최근 로그 보기
triggerfish logs

# 실시간으로 로그 스트리밍
triggerfish logs --tail
```

### `triggerfish patrol`

Triggerfish 설치 상태 점검을 실행합니다.

```bash
triggerfish patrol
```

출력 예시:

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 3d 2h)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  3 channels active (CLI, Telegram, Slack)
  Policy engine loaded (12 rules, 3 custom)
  5 skills installed (2 bundled, 1 managed, 2 workspace)
  Secrets stored securely (macOS Keychain)
  2 cron jobs scheduled
  Webhook endpoints configured (2 active)

Overall: HEALTHY
```

Patrol 점검 항목:

- Gateway 프로세스 상태 및 업타임
- LLM 제공자 연결
- 채널 어댑터 상태
- 정책 엔진 규칙 로딩
- 설치된 스킬
- 시크릿 저장소
- Cron 작업 스케줄링
- Webhook 엔드포인트 구성
- 노출된 포트 감지

### `triggerfish config`

구성 파일을 관리합니다. `triggerfish.yaml`에 점 표기법 경로를 사용합니다.

```bash
# 구성 값 설정
triggerfish config set <key> <value>

# 구성 값 읽기
triggerfish config get <key>

# 구성 구문 및 구조 검증
triggerfish config validate

# 대화형으로 채널 추가
triggerfish config add-channel [type]
```

예시:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

`triggerfish.yaml`의 평문 자격 증명을 OS 키체인으로 마이그레이션합니다.

```bash
triggerfish config migrate-secrets
```

이 명령어는 구성에서 평문 API 키, 토큰, 비밀번호를 검색하고, OS 키체인에 저장한 후, 평문 값을 `secret:` 참조로 교체합니다. 변경 전에 원본 파일의 백업이 생성됩니다.

자세한 내용은 [시크릿 관리](/ko-KR/security/secrets)를 참조하십시오.

### `triggerfish connect`

외부 서비스를 Triggerfish에 연결합니다.

```bash
triggerfish connect google    # Google Workspace (OAuth2 흐름)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** -- OAuth2 흐름을 시작합니다. Google Cloud OAuth Client ID와 Client Secret을 입력하라는 메시지가 표시되고, 인증을 위한 브라우저가 열리며, 토큰이 OS 키체인에 안전하게 저장됩니다. 자격 증명 생성 방법을 포함한 전체 설정 지침은 [Google Workspace](/ko-KR/integrations/google-workspace)를 참조하십시오.

**GitHub** -- 세분화된 Personal Access Token 생성을 안내하고, GitHub API에 대해 유효성을 검증하며, OS 키체인에 저장합니다. 자세한 내용은 [GitHub](/ko-KR/integrations/github)를 참조하십시오.

### `triggerfish disconnect`

외부 서비스의 인증을 제거합니다.

```bash
triggerfish disconnect google    # Google 토큰 제거
triggerfish disconnect github    # GitHub 토큰 제거
```

키체인에서 모든 저장된 토큰을 제거합니다. 언제든지 다시 연결할 수 있습니다.

### `triggerfish healthcheck`

구성된 LLM 제공자에 대한 빠른 연결 확인을 실행합니다. 제공자가 응답하면 성공을, 그렇지 않으면 세부 정보와 함께 오류를 반환합니다.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

현재 또는 지정된 버전의 릴리스 노트를 표시합니다.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

사용 가능한 업데이트를 확인하고 설치합니다.

```bash
triggerfish update
```

### `triggerfish version`

현재 Triggerfish 버전을 표시합니다.

```bash
triggerfish version
```

## 스킬 명령어

The Reef 마켓플레이스와 로컬 워크스페이스에서 스킬을 관리합니다.

```bash
triggerfish skill search "calendar"     # The Reef에서 스킬 검색
triggerfish skill install google-cal    # 스킬 설치
triggerfish skill list                  # 설치된 스킬 목록
triggerfish skill update --all          # 모든 설치된 스킬 업데이트
triggerfish skill publish               # The Reef에 스킬 게시
triggerfish skill create                # 새 스킬 스캐폴드
```

## 세션 명령어

활성 세션을 검사하고 관리합니다.

```bash
triggerfish session list                # 활성 세션 목록
triggerfish session history             # 세션 대화 내용 보기
triggerfish session spawn               # 백그라운드 세션 생성
```

## Buoy 명령어 <ComingSoon :inline="true" />

컴패니언 디바이스 연결을 관리합니다. Buoy는 아직 사용할 수 없습니다.

```bash
triggerfish buoys list                  # 연결된 buoy 목록
triggerfish buoys pair                  # 새 buoy 디바이스 페어링
```

## 채팅 내 명령어

이 명령어들은 대화형 채팅 세션(`triggerfish chat` 또는 연결된 채널)에서 사용할 수 있습니다. 소유자만 사용할 수 있습니다.

| 명령어                  | 설명                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `/help`                 | 사용 가능한 채팅 내 명령어 표시                                |
| `/status`               | 세션 상태 표시: 모델, 토큰 수, 비용, taint 레벨               |
| `/reset`                | 세션 taint 및 대화 기록 초기화                                 |
| `/compact`              | LLM 요약을 사용하여 대화 기록 압축                             |
| `/model <name>`         | 현재 세션의 LLM 모델 전환                                      |
| `/skill install <name>` | The Reef에서 스킬 설치                                         |
| `/cron list`            | 예약된 cron 작업 목록                                          |

## 키보드 단축키

이 단축키는 CLI 채팅 인터페이스에서 작동합니다:

| 단축키   | 동작                                                                             |
| -------- | -------------------------------------------------------------------------------- |
| ESC      | 현재 LLM 응답 중단                                                              |
| Ctrl+V   | 클립보드에서 이미지 붙여넣기 ([이미지 및 비전](/ko-KR/features/image-vision) 참조) |
| Ctrl+O   | 컴팩트/확장 도구 호출 표시 전환                                                  |
| Ctrl+C   | 채팅 세션 종료                                                                   |
| Up/Down  | 입력 기록 탐색                                                                   |

::: tip ESC 인터럽트는 오케스트레이터에서 LLM 제공자까지 전체 체인을 통해 중단 신호를 보냅니다. 응답이 깔끔하게 중지되고 대화를 계속할 수 있습니다. :::

## 디버그 출력

Triggerfish에는 LLM 제공자 문제, 도구 호출 파싱, 에이전트 루프 동작을 진단하기 위한 상세한 디버그 로깅이 포함되어 있습니다. `TRIGGERFISH_DEBUG` 환경 변수를 `1`로 설정하여 활성화합니다.

::: tip 로그 상세도를 제어하는 권장 방법은 `triggerfish.yaml`을 통하는 것입니다:

```yaml
logging:
  level: verbose # quiet, normal, verbose, 또는 debug
```

`TRIGGERFISH_DEBUG=1` 환경 변수는 하위 호환성을 위해 여전히 지원됩니다. 전체 내용은 [구조화된 로깅](/ko-KR/features/logging)을 참조하십시오. :::

### 포그라운드 모드

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

또는 채팅 세션의 경우:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### 데몬 모드 (systemd)

systemd 서비스 유닛에 환경 변수를 추가합니다:

```bash
systemctl --user edit triggerfish.service
```

`[Service]` 아래에 추가합니다:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

그런 다음 재시작합니다:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

디버그 출력 보기:

```bash
journalctl --user -u triggerfish.service -f
```

### 로깅 내용

디버그 모드가 활성화되면 다음이 stderr에 기록됩니다:

| 컴포넌트        | 로그 접두사    | 세부 사항                                                                                                                    |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator    | `[orch]`       | 각 반복: 시스템 프롬프트 길이, 기록 항목 수, 메시지 역할/크기, 파싱된 도구 호출 수, 최종 응답 텍스트                          |
| OpenRouter      | `[openrouter]` | 전체 요청 페이로드 (모델, 메시지 수, 도구 수), 원시 응답 본문, 콘텐츠 길이, 완료 이유, 토큰 사용량                            |
| 기타 제공자     | `[provider]`   | 요청/응답 요약 (제공자마다 다름)                                                                                             |

디버그 출력 예시:

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning 디버그 출력에는 전체 LLM 요청 및 응답 페이로드가 포함됩니다. 민감한 대화 내용이 stderr/journal에 기록될 수 있으므로 프로덕션에서는 활성화된 상태로 두지 마십시오. :::

## 빠른 참조

```bash
# 설정 및 관리
triggerfish dive              # 설정 마법사
triggerfish start             # 데몬 시작
triggerfish stop              # 데몬 중지
triggerfish status            # 상태 확인
triggerfish logs --tail       # 로그 스트리밍
triggerfish patrol            # 상태 점검
triggerfish config set <k> <v> # 구성 값 설정
triggerfish config get <key>  # 구성 값 읽기
triggerfish config add-channel # 채널 추가
triggerfish config migrate-secrets  # 시크릿을 키체인으로 마이그레이션
triggerfish update            # 업데이트 확인
triggerfish version           # 버전 표시

# 일상 사용
triggerfish chat              # 대화형 채팅
triggerfish run               # 포그라운드 모드

# 스킬
triggerfish skill search      # The Reef 검색
triggerfish skill install     # 스킬 설치
triggerfish skill list        # 설치된 스킬 목록
triggerfish skill create      # 새 스킬 생성

# 세션
triggerfish session list      # 세션 목록
triggerfish session history   # 대화 내용 보기
```
