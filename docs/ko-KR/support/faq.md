# 자주 묻는 질문

## 설치

### 시스템 요구 사항은 무엇입니까?

Triggerfish는 macOS(Intel 및 Apple Silicon), Linux(x64 및 arm64), Windows(x64)에서 실행됩니다. 바이너리 설치 프로그램이 모든 것을 처리합니다. 소스에서 빌드하는 경우 Deno 2.x가 필요합니다.

Docker 배포의 경우 Docker 또는 Podman을 실행하는 모든 시스템에서 작동합니다. 컨테이너 이미지는 distroless Debian 12를 기반으로 합니다.

### Triggerfish는 데이터를 어디에 저장합니까?

기본적으로 모든 것이 `~/.triggerfish/` 아래에 저장됩니다:

```
~/.triggerfish/
  triggerfish.yaml          # 구성 파일
  SPINE.md                  # 에이전트 아이덴티티
  TRIGGER.md                # 사전 행동 정의
  logs/                     # 로그 파일 (1 MB에서 로테이션, 10개 백업)
  data/triggerfish.db       # SQLite 데이터베이스 (세션, 메모리, 상태)
  skills/                   # 설치된 skill
  backups/                  # 타임스탬프 구성 백업
```

Docker 배포는 대신 `/data`를 사용합니다. `TRIGGERFISH_DATA_DIR` 환경 변수로 기본 디렉토리를 재정의할 수 있습니다.

### 데이터 디렉토리를 이동할 수 있습니까?

네. daemon을 시작하기 전에 `TRIGGERFISH_DATA_DIR` 환경 변수를 원하는 경로로 설정하십시오. systemd 또는 launchd를 사용하는 경우 서비스 정의를 업데이트해야 합니다([플랫폼 참고 사항](/ko-KR/support/guides/platform-notes) 참조).

### 설치 프로그램이 `/usr/local/bin`에 쓸 수 없다고 합니다

설치 프로그램은 먼저 `/usr/local/bin`을 시도합니다. root 액세스가 필요한 경우 `~/.local/bin`으로 대체됩니다. 시스템 전체 위치를 원하시면 `sudo`로 다시 실행하십시오:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Triggerfish를 제거하려면 어떻게 합니까?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

이 명령은 daemon을 중지하고, 서비스 정의(systemd unit 또는 launchd plist)를 제거하고, 바이너리를 삭제하고, 모든 데이터를 포함한 `~/.triggerfish/` 디렉토리 전체를 제거합니다.

---

## 구성

### LLM provider를 변경하려면 어떻게 합니까?

`triggerfish.yaml`을 편집하거나 CLI를 사용하십시오:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

구성 변경 후 daemon이 자동으로 재시작됩니다.

### API 키는 어디에 저장합니까?

API 키는 OS keychain(macOS Keychain, Linux Secret Service 또는 Windows/Docker의 암호화된 파일)에 저장됩니다. `triggerfish.yaml`에 원시 API 키를 직접 넣지 마십시오. `secret:` 참조 구문을 사용하십시오:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

실제 키를 저장하십시오:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### 구성에서 `secret:`은 무엇을 의미합니까?

`secret:`으로 시작하는 값은 OS keychain에 대한 참조입니다. 시작 시 Triggerfish는 각 참조를 해석하고 메모리에서 실제 secret 값으로 교체합니다. 원시 secret은 디스크의 `triggerfish.yaml`에 절대 나타나지 않습니다. 플랫폼별 백엔드 세부 정보는 [Secrets & 자격 증명](/ko-KR/support/troubleshooting/secrets)을 참조하십시오.

### SPINE.md란 무엇입니까?

`SPINE.md`는 에이전트의 아이덴티티 파일입니다. 에이전트의 이름, 미션, 성격 및 행동 지침을 정의합니다. 시스템 프롬프트의 기반이라고 생각하시면 됩니다. 설정 마법사(`triggerfish dive`)가 자동으로 생성하지만, 자유롭게 편집할 수 있습니다.

### TRIGGER.md란 무엇입니까?

`TRIGGER.md`는 에이전트의 사전 행동을 정의합니다: 예약된 trigger 웨이크업 시 확인, 모니터링 및 조치해야 할 사항을 정합니다. `TRIGGER.md`가 없으면 trigger는 여전히 실행되지만 에이전트에게 수행할 지침이 없습니다.

### 새 채널을 추가하려면 어떻게 합니까?

```bash
triggerfish config add-channel telegram
```

이 명령은 필수 필드(봇 토큰, 소유자 ID, classification 수준)를 안내하는 대화형 프롬프트를 시작합니다. `triggerfish.yaml`의 `channels:` 섹션을 직접 편집할 수도 있습니다.

### 구성을 변경했는데 아무 일도 일어나지 않습니다

변경 사항을 적용하려면 daemon을 재시작해야 합니다. `triggerfish config set`을 사용한 경우 자동으로 재시작 여부를 묻습니다. YAML 파일을 직접 편집한 경우 다음과 같이 재시작하십시오:

```bash
triggerfish stop && triggerfish start
```

---

## 채널

### 봇이 메시지에 응답하지 않는 이유는 무엇입니까?

먼저 다음을 확인하십시오:

1. **daemon이 실행 중입니까?** `triggerfish status`를 실행하십시오
2. **채널이 연결되어 있습니까?** 로그를 확인하십시오: `triggerfish logs`
3. **봇 토큰이 유효합니까?** 대부분의 채널은 유효하지 않은 토큰으로 조용히 실패합니다
4. **소유자 ID가 올바릅니까?** 소유자로 인식되지 않으면 봇이 응답을 제한할 수 있습니다

채널별 체크리스트는 [채널 문제 해결](/ko-KR/support/troubleshooting/channels) 가이드를 참조하십시오.

### 소유자 ID란 무엇이며 왜 중요합니까?

소유자 ID는 주어진 채널에서 어떤 사용자가 운영자(사용자)인지를 Triggerfish에 알려줍니다. 소유자가 아닌 사용자는 제한된 도구 액세스를 받으며 classification 제한을 받을 수 있습니다. 소유자 ID를 비워 두면 동작은 채널에 따라 다릅니다. WhatsApp과 같은 일부 채널은 모든 사람을 소유자로 취급하여 보안 위험이 됩니다.

### 여러 채널을 동시에 사용할 수 있습니까?

네. `triggerfish.yaml`에 원하는 만큼 채널을 구성하십시오. 각 채널은 자체 세션과 classification 수준을 유지합니다. 라우터가 모든 연결된 채널 간의 메시지 전달을 처리합니다.

### 메시지 크기 제한은 무엇입니까?

| 채널 | 제한 | 동작 |
|---------|-------|----------|
| Telegram | 4,096자 | 자동 분할 |
| Discord | 2,000자 | 자동 분할 |
| Slack | 40,000자 | 잘림 (분할되지 않음) |
| WhatsApp | 4,096자 | 잘림 |
| Email | 하드 제한 없음 | 전체 메시지 전송 |
| WebChat | 하드 제한 없음 | 전체 메시지 전송 |

### Slack 메시지가 잘리는 이유는 무엇입니까?

Slack에는 40,000자 제한이 있습니다. Telegram 및 Discord와 달리 Triggerfish는 Slack 메시지를 여러 메시지로 분할하지 않고 잘라냅니다. 대용량 코드 출력과 같은 매우 긴 응답은 끝 부분의 콘텐츠가 손실될 수 있습니다.

---

## 보안 & Classification

### Classification 수준은 무엇입니까?

민감도가 낮은 것부터 높은 것까지 네 가지 수준이 있습니다:

1. **PUBLIC** - 데이터 흐름에 제한 없음
2. **INTERNAL** - 표준 운영 데이터
3. **CONFIDENTIAL** - 민감한 데이터 (자격 증명, 개인 정보, 금융 기록)
4. **RESTRICTED** - 최고 민감도 (규제 데이터, 컴플라이언스 관련)

데이터는 낮은 수준에서 동일하거나 높은 수준으로만 흐를 수 있습니다. CONFIDENTIAL 데이터는 PUBLIC 채널에 절대 도달할 수 없습니다. 이것이 "no write-down" 규칙이며 재정의할 수 없습니다.

### "session taint"란 무엇을 의미합니까?

모든 세션은 PUBLIC에서 시작합니다. 에이전트가 분류된 데이터에 액세스하면(CONFIDENTIAL 파일 읽기, RESTRICTED 데이터베이스 쿼리) 세션 taint가 해당 수준으로 상승합니다. Taint는 올라가기만 하고 내려가지 않습니다. CONFIDENTIAL로 taint된 세션은 PUBLIC 채널로 출력을 보낼 수 없습니다.

### "write-down blocked" 오류가 발생하는 이유는 무엇입니까?

세션이 대상보다 높은 classification 수준으로 taint되었습니다. 예를 들어, CONFIDENTIAL 데이터에 액세스한 후 PUBLIC WebChat 채널로 결과를 보내려고 하면 정책 엔진이 차단합니다.

이것은 의도된 동작입니다. 해결하려면:
- 새 세션을 시작하십시오 (새 대화)
- 세션의 taint 수준 이상으로 분류된 채널을 사용하십시오

### Classification 적용을 비활성화할 수 있습니까?

아니요. Classification 시스템은 핵심 보안 불변 요소입니다. LLM 계층 아래의 결정론적 코드로 실행되며 에이전트가 우회, 비활성화 또는 영향을 미칠 수 없습니다. 이것은 설계에 의한 것입니다.

---

## LLM Provider

### 어떤 provider를 지원합니까?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI 및 Ollama 또는 LM Studio를 통한 로컬 모델을 지원합니다.

### Failover는 어떻게 작동합니까?

`triggerfish.yaml`에서 `failover` 목록을 구성하십시오:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

기본 provider가 실패하면 Triggerfish는 각 대체 항목을 순서대로 시도합니다. `failover_config` 섹션에서 재시도 횟수, 지연 시간 및 failover를 트리거하는 오류 조건을 제어합니다.

### Provider가 401 / 403 오류를 반환합니다

API 키가 유효하지 않거나 만료되었습니다. 다시 저장하십시오:

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

그런 다음 daemon을 재시작하십시오. provider별 안내는 [LLM Provider 문제 해결](/ko-KR/support/troubleshooting/providers)을 참조하십시오.

### Classification 수준별로 다른 모델을 사용할 수 있습니까?

네. `classification_models` 구성을 사용하십시오:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

특정 수준으로 taint된 세션은 해당 모델을 사용합니다. 명시적 재정의가 없는 수준은 기본 모델로 대체됩니다.

---

## Docker

### Docker에서 Triggerfish를 실행하려면 어떻게 합니까?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

이 명령은 Docker 래퍼 스크립트와 compose 파일을 다운로드하고, 이미지를 pull하고, 설정 마법사를 실행합니다.

### Docker에서 데이터는 어디에 저장됩니까?

모든 영구 데이터는 컨테이너 내부의 `/data`에 마운트된 Docker named volume(`triggerfish-data`)에 저장됩니다. 구성, secrets, SQLite 데이터베이스, 로그, skill 및 에이전트 작업 공간이 포함됩니다.

### Docker에서 secrets은 어떻게 작동합니까?

Docker 컨테이너는 호스트 OS keychain에 액세스할 수 없습니다. Triggerfish는 대신 암호화된 파일 저장소를 사용합니다: `secrets.json`(암호화된 값)과 `secrets.key`(AES-256 암호화 키)가 모두 `/data` 볼륨에 저장됩니다. 볼륨을 민감한 것으로 취급하십시오.

### 컨테이너가 구성 파일을 찾을 수 없습니다

올바르게 마운트했는지 확인하십시오:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

구성 파일 없이 컨테이너가 시작되면 도움말 메시지를 출력하고 종료합니다.

### Docker 이미지를 업데이트하려면 어떻게 합니까?

```bash
triggerfish update    # 래퍼 스크립트를 사용하는 경우
# 또는
docker compose pull && docker compose up -d
```

---

## Skill & The Reef

### Skill이란 무엇입니까?

Skill은 에이전트에게 새로운 기능, 컨텍스트 또는 행동 지침을 제공하는 `SKILL.md` 파일이 포함된 폴더입니다. Skill에는 도구 정의, 코드, 템플릿 및 지침이 포함될 수 있습니다.

### The Reef란 무엇입니까?

The Reef는 Triggerfish의 skill 마켓플레이스입니다. 이를 통해 skill을 검색, 설치 및 게시할 수 있습니다:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### 보안 스캐너에 의해 skill이 차단된 이유는 무엇입니까?

모든 skill은 설치 전에 스캔됩니다. 스캐너는 의심스러운 패턴, 과도한 권한 및 classification ceiling 위반을 검사합니다. Skill의 ceiling이 현재 세션 taint보다 낮으면 write-down을 방지하기 위해 활성화가 차단됩니다.

### Skill의 classification ceiling이란 무엇입니까?

Skill은 작동이 허용되는 최대 classification 수준을 선언합니다. `classification_ceiling: INTERNAL`인 skill은 CONFIDENTIAL 이상으로 taint된 세션에서 활성화할 수 없습니다. 이는 skill이 허가 수준 이상의 데이터에 액세스하는 것을 방지합니다.

---

## Trigger & 스케줄링

### Trigger란 무엇입니까?

Trigger는 사전 행동을 위한 정기적인 에이전트 웨이크업입니다. `TRIGGER.md`에 에이전트가 확인해야 할 사항을 정의하면 Triggerfish가 일정에 따라 에이전트를 깨웁니다. 에이전트는 지침을 검토하고, 조치를 취하고(일정 확인, 서비스 모니터링, 알림 전송), 다시 슬립 상태로 돌아갑니다.

### Trigger는 cron job과 어떻게 다릅니까?

Cron job은 일정에 따라 고정된 작업을 실행합니다. Trigger는 에이전트에게 전체 컨텍스트(메모리, 도구, 채널 액세스)를 제공하며 `TRIGGER.md` 지침에 따라 무엇을 할지 결정하게 합니다. Cron은 기계적이고, trigger는 에이전트 기반입니다.

### Quiet hours란 무엇입니까?

`scheduler.trigger`의 `quiet_hours` 설정은 지정된 시간 동안 trigger가 실행되지 않도록 합니다:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Webhook은 어떻게 작동합니까?

외부 서비스는 Triggerfish의 webhook 엔드포인트에 POST하여 에이전트 작업을 트리거할 수 있습니다. 각 webhook 소스는 인증을 위한 HMAC 서명이 필요하며 재생 감지가 포함됩니다.

---

## 에이전트 팀

### 에이전트 팀이란 무엇입니까?

에이전트 팀은 복잡한 작업을 함께 수행하는 협업 에이전트의 영구 그룹입니다. 각 팀 멤버는 고유한 역할, 대화 컨텍스트 및 도구를 가진 별도의 에이전트 세션입니다. 한 멤버가 리드로 지정되어 작업을 조율합니다. 전체 문서는 [에이전트 팀](/features/agent-teams)을 참조하십시오.

### 팀은 sub-agent와 어떻게 다릅니까?

Sub-agent는 fire-and-forget 방식입니다: 단일 작업을 위임하고 결과를 기다립니다. 팀은 영구적입니다 -- 멤버들은 `sessions_send`를 통해 서로 통신하고, 리드가 작업을 조율하며, 팀은 해산되거나 시간 초과될 때까지 자율적으로 실행됩니다. 집중적인 위임에는 sub-agent를, 복잡한 다중 역할 협업에는 팀을 사용하십시오.

### 에이전트 팀에 유료 플랜이 필요합니까?

Triggerfish Gateway 사용 시 에이전트 팀에는 **Power** 플랜($149/월)이 필요합니다. 자체 API 키를 사용하는 오픈 소스 사용자는 전체 액세스가 가능합니다 -- 각 팀 멤버는 구성된 LLM provider의 추론을 소비합니다.

### 팀 리드가 즉시 실패하는 이유는 무엇입니까?

가장 일반적인 원인은 잘못 구성된 LLM provider입니다. 각 팀 멤버는 작동하는 LLM 연결이 필요한 자체 에이전트 세션을 생성합니다. 팀 생성 시점의 provider 오류를 `triggerfish logs`에서 확인하십시오. 자세한 내용은 [에이전트 팀 문제 해결](/ko-KR/support/troubleshooting/security#agent-teams)을 참조하십시오.

### 팀 멤버가 다른 모델을 사용할 수 있습니까?

네. 각 멤버 정의는 선택적 `model` 필드를 허용합니다. 생략하면 멤버는 생성 에이전트의 모델을 상속합니다. 이를 통해 복잡한 역할에는 비싼 모델을, 간단한 역할에는 저렴한 모델을 할당할 수 있습니다.

### 팀은 얼마나 오래 실행할 수 있습니까?

기본적으로 팀은 1시간의 수명을 가집니다(`max_lifetime_seconds: 3600`). 제한에 도달하면 리드에게 60초 경고가 주어져 최종 출력을 생성하고, 그 후 팀이 자동으로 해산됩니다. 생성 시 더 긴 수명을 구성할 수 있습니다.

### 팀 멤버가 충돌하면 어떻게 됩니까?

수명 주기 모니터가 30초 이내에 멤버 실패를 감지합니다. 실패한 멤버는 `failed`로 표시되고 리드에게 나머지 멤버로 계속하거나 해산하도록 통지됩니다. 리드 자체가 실패하면 팀이 일시 중지되고 생성 세션에 통지됩니다.

---

## 기타

### Triggerfish는 오픈 소스입니까?

네, Apache 2.0 라이선스입니다. 모든 보안 관련 구성 요소를 포함한 전체 소스 코드가 [GitHub](https://github.com/greghavens/triggerfish)에서 감사할 수 있습니다.

### Triggerfish가 외부에 연결합니까?

아니요. Triggerfish는 명시적으로 구성한 서비스(LLM provider, 채널 API, 통합) 외에는 아웃바운드 연결을 하지 않습니다. `triggerfish update`를 실행하지 않는 한 텔레메트리, 분석 또는 업데이트 확인이 없습니다.

### 여러 에이전트를 실행할 수 있습니까?

네. `agents` 구성 섹션은 각각 고유한 이름, 모델, 채널 바인딩, 도구 세트 및 classification ceiling을 가진 여러 에이전트를 정의합니다. 라우팅 시스템이 메시지를 적절한 에이전트로 전달합니다.

### Gateway란 무엇입니까?

Gateway는 Triggerfish의 내부 WebSocket 제어 평면입니다. 세션을 관리하고, 채널과 에이전트 간에 메시지를 라우팅하고, 도구를 디스패치하고, 정책을 적용합니다. CLI 채팅 인터페이스는 gateway에 연결하여 에이전트와 통신합니다.

### Triggerfish는 어떤 포트를 사용합니까?

| 포트 | 용도 | 바인딩 |
|------|---------|---------|
| 18789 | Gateway WebSocket | localhost만 |
| 18790 | Tidepool A2UI | localhost만 |
| 8765 | WebChat (활성화된 경우) | 구성 가능 |
| 8443 | WhatsApp webhook (활성화된 경우) | 구성 가능 |

모든 기본 포트는 localhost에 바인딩됩니다. 명시적으로 구성하거나 리버스 프록시를 사용하지 않는 한 네트워크에 노출되지 않습니다.
