# 구성

Triggerfish는 `~/.triggerfish/triggerfish.yaml`에 있는 단일 YAML 파일을 통해 구성됩니다. 설정 마법사(`triggerfish dive`)가 이 파일을 생성하지만, 언제든지 수동으로 편집할 수 있습니다.

## 구성 파일 위치

```
~/.triggerfish/triggerfish.yaml
```

명령줄에서 점 표기법 경로를 사용하여 개별 값을 설정할 수 있습니다:

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

불리언 및 정수 값은 자동으로 변환됩니다. 시크릿은 출력에서 마스킹됩니다.

구성을 검증합니다:

```bash
triggerfish config validate
```

## 모델

`models` 섹션은 LLM 제공자와 장애 조치 동작을 구성합니다.

```yaml
models:
  # 기본으로 사용할 제공자와 모델
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # 선택 사항: 주 모델이 비전을 지원하지 않을 때
  # 자동 이미지 설명을 위한 비전 모델
  # vision: gemini-2.0-flash

  # 스트리밍 응답 (기본값: true)
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # Ollama 기본값

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio 기본값

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # 장애 조치 체인: 주 모델이 실패하면 순서대로 시도
  failover:
    - openai
    - google
```

API 키는 이 파일이 아닌 OS 키체인에 저장됩니다. 설정 마법사(`triggerfish dive`)가 API 키를 입력받아 안전하게 저장합니다. Ollama와 LM Studio는 로컬이며 인증이 필요하지 않습니다.

## 채널

`channels` 섹션은 에이전트가 연결하는 메시징 플랫폼과 각각의 분류 수준을 정의합니다.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  signal:
    enabled: true
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "your-phone-number-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL
```

각 채널의 토큰, 비밀번호, API 키는 OS 키체인에 저장됩니다. `triggerfish config add-channel <name>`을 실행하여 대화형으로 자격 증명을 입력합니다 -- 키체인에 저장되며 이 파일에는 저장되지 않습니다.

### 채널 구성 키

`triggerfish.yaml`의 비시크릿 구성:

| 채널     | 구성 키                                                        | 선택적 키                                                               |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                               | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                      | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                     | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`, `port`, `allowedOrigins`                              |
| Email    | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

시크릿(봇 토큰, API 키, 비밀번호, 서명 시크릿)은 채널 설정 중에 입력되어 OS 키체인에 저장됩니다.

### 기본 분류 수준

| 채널     | 기본값          |
| -------- | --------------- |
| CLI      | `INTERNAL`      |
| Telegram | `INTERNAL`      |
| Signal   | `PUBLIC`        |
| Slack    | `PUBLIC`        |
| Discord  | `PUBLIC`        |
| WhatsApp | `PUBLIC`        |
| WebChat  | `PUBLIC`        |
| Email    | `CONFIDENTIAL`  |

모든 기본값은 구성 가능합니다. 어떤 채널이든 어떤 분류 수준이든 설정할 수 있습니다.

## MCP 서버

외부 MCP 서버를 연결하여 에이전트에 추가 도구에 대한 접근을 제공합니다. 전체 보안 모델은 [MCP Gateway](/ko-KR/integrations/mcp-gateway)를 참조하십시오.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL
```

각 서버에는 `classification` 수준이 있어야 하며, 없으면 거부됩니다(기본 거부). 로컬 서버(서브프로세스로 생성)에는 `command` + `args`를, 원격 서버(HTTP SSE)에는 `url`을 사용합니다. `keychain:`으로 시작하는 환경 값은 OS 키체인에서 확인됩니다.

분류 수준 선택에 대한 도움이 필요하면 [분류 가이드](./classification-guide)를 참조하십시오.

## 분류

`classification` 섹션은 Triggerfish가 데이터를 분류하고 보호하는 방법을 제어합니다.

```yaml
classification:
  mode: personal # "personal" 또는 "enterprise" (출시 예정)
```

**분류 수준:**

| 수준           | 설명            | 예시                                                  |
| -------------- | --------------- | ----------------------------------------------------- |
| `RESTRICTED`   | 가장 민감       | M&A 문서, PII, 은행 계좌, 의료 기록                   |
| `CONFIDENTIAL` | 민감             | CRM 데이터, 재무, 계약, 세금 기록                     |
| `INTERNAL`     | 내부 전용       | 내부 위키, 개인 메모, 연락처                          |
| `PUBLIC`       | 누구나 볼 수 있음 | 마케팅 자료, 공개 정보, 일반 웹 콘텐츠               |

통합, 채널, MCP 서버에 적합한 수준을 선택하는 자세한 지침은 [분류 가이드](./classification-guide)를 참조하십시오.

## 정책

`policy` 섹션은 내장 보호 기능 외에 사용자 정의 시행 규칙을 구성합니다.

```yaml
policy:
  # 일치하는 규칙이 없을 때의 기본 동작
  default_action: ALLOW

  # 사용자 정의 규칙
  rules:
    # SSN 패턴이 포함된 도구 응답 차단
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # 외부 API 호출 속도 제한
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info 핵심 보안 규칙 -- no write-down, 세션 taint 에스컬레이션, 감사 로깅 -- 은 항상 시행되며 비활성화할 수 없습니다. 사용자 정의 정책 규칙은 이러한 고정 보호 기능 위에 추가 제어를 추가합니다. :::

## 웹 검색 및 가져오기

`web` 섹션은 웹 검색 및 콘텐츠 가져오기를 구성하며, 도메인 보안 제어를 포함합니다.

```yaml
web:
  search:
    provider: brave # 검색 백엔드 (현재 brave 지원)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # 분당 요청 수
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability 또는 raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # 비어있으면 = 모두 허용 (거부 목록 제외)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

명령줄에서 검색을 설정합니다:

```bash
triggerfish config set web.search.provider brave
```

Brave API 키는 `triggerfish dive` 중에 입력되어 OS 키체인에 저장됩니다.

::: tip [brave.com/search/api](https://brave.com/search/api/)에서 Brave Search API 키를 받으십시오. 무료 티어에는 월 2,000건의 쿼리가 포함됩니다. :::

## Cron 작업

에이전트를 위한 반복 작업을 예약합니다:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # 매일 오전 7시
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # 결과를 전달할 채널
      classification: INTERNAL # 이 작업의 최대 taint 상한

    - id: pipeline-check
      schedule: "0 */4 * * *" # 4시간마다
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

각 cron 작업은 분류 상한이 있는 자체 격리된 세션에서 실행됩니다. 모든 cron 동작은 일반 정책 hook을 통과합니다.

## 트리거 타이밍

에이전트가 능동적 점검을 수행하는 빈도를 구성합니다:

```yaml
trigger:
  interval: 30m # 30분마다 확인
  classification: INTERNAL # 트리거 세션의 최대 taint 상한
  quiet_hours: "22:00-07:00" # 조용한 시간 동안 트리거하지 않음
```

트리거 시스템은 `~/.triggerfish/TRIGGER.md` 파일을 읽어 각 기상 시 무엇을 확인할지 결정합니다. TRIGGER.md 작성에 대한 자세한 내용은 [SPINE과 트리거](./spine-and-triggers)를 참조하십시오.

## Webhook

외부 서비스로부터의 인바운드 이벤트를 수신합니다:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"
```

## 전체 예시

주석이 포함된 전체 구성 예시입니다:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLM 제공자 ---
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929
  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
    openai:
      model: gpt-4o
  failover:
    - openai

# --- 채널 ---
channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL
  signal:
    enabled: false
  slack:
    enabled: false

# --- 분류 ---
classification:
  mode: personal

# --- 정책 ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Prepare morning briefing"
      channel: telegram
      classification: INTERNAL

# --- 트리거 ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## 다음 단계

- [SPINE.md](./spine-and-triggers)에서 에이전트의 정체성 정의
- [TRIGGER.md](./spine-and-triggers)로 능동적 모니터링 설정
- [명령어 참조](./commands)에서 모든 CLI 명령어 학습
