# 구성 스키마

Triggerfish는 `triggerfish dive`를 실행한 후 `~/.triggerfish/triggerfish.yaml`에 위치한 `triggerfish.yaml`을 통해 구성됩니다. 이 페이지는 모든 구성 섹션을 문서화합니다.

::: info 시크릿 참조 이 파일의 모든 문자열 값은 `secret:` 접두사를 사용하여 OS 키체인에 저장된 자격 증명을 참조할 수 있습니다. 예를 들어, `apiKey: "secret:provider:anthropic:apiKey"`는 시작 시 키체인에서 값을 확인합니다. 자세한 내용은 [시크릿 관리](/ko-KR/security/secrets#secret-references-in-configuration)를 참조하십시오. :::

## 전체 주석 예시

```yaml
# =============================================================================
# triggerfish.yaml -- Complete configuration reference
# =============================================================================

# ---------------------------------------------------------------------------
# Models: LLM provider configuration and failover
# ---------------------------------------------------------------------------
models:
  # The primary model used for agent completions
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Optional: separate vision model for image description
  # When the primary model doesn't support vision, images are automatically
  # described by this model before reaching the primary.
  # vision: glm-4.5v

  # Streaming responses (default: true)
  # streaming: true

  # Provider-specific configuration
  # API keys are referenced via secret: syntax and resolved from the OS keychain.
  # Run `triggerfish dive` or `triggerfish config migrate-secrets` to set up.
  providers:
    anthropic:
      model: claude-sonnet-4-5
      # apiKey: "secret:provider:anthropic:apiKey"

    openai:
      model: gpt-4o

    google:
      model: gemini-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234"

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Ordered failover chain -- tried in sequence when primary fails
  failover:
    - claude-haiku-4-5 # First fallback
    - gpt-4o # Second fallback
    - ollama/llama3 # Local fallback (no internet required)

  # Failover behavior
  failover_config:
    max_retries: 3 # Retries per provider before moving to next
    retry_delay_ms: 1000 # Delay between retries
    conditions: # What triggers failover
      - rate_limited # Provider returned 429
      - server_error # Provider returned 5xx
      - timeout # Request exceeded timeout

# ---------------------------------------------------------------------------
# Logging: Structured log output
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Messaging platform connections
# ---------------------------------------------------------------------------
# Secrets (bot tokens, API keys, passwords) are stored in the OS keychain.
# Run `triggerfish config add-channel <name>` to enter them securely.
# Only non-secret configuration appears here.
channels:
  telegram:
    ownerId: 123456789 # Your Telegram numeric user ID
    classification: INTERNAL # Default: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # signal-cli daemon endpoint
    account: "+14155552671" # Your Signal phone number (E.164)
    classification: PUBLIC # Default: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # Default: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # Your Discord user ID
    classification: PUBLIC # Default: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # From Meta Business Dashboard
    classification: PUBLIC # Default: PUBLIC

  webchat:
    port: 8765 # WebSocket port for web client
    classification: PUBLIC # Default: PUBLIC (visitors)

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # Default: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: Data sensitivity model
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" or "enterprise" (coming soon)
# Levels: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

# ---------------------------------------------------------------------------
# Policy: Custom enforcement rules (enterprise escape hatch)
# ---------------------------------------------------------------------------
policy:
  rules:
    - id: block-external-pii
      hook: PRE_OUTPUT
      priority: 100
      conditions:
        - type: recipient_is
          value: EXTERNAL
        - type: content_matches
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" # SSN pattern
      action: REDACT
      message: "PII redacted for external recipient"

    - id: rate-limit-browser
      hook: PRE_TOOL_CALL
      priority: 50
      conditions:
        - type: tool_name
          value: browser
        - type: rate_exceeds
          value: 10/minute
      action: BLOCK
      message: "Browser tool rate limit exceeded"

# ---------------------------------------------------------------------------
# MCP Servers: External tool servers
# ---------------------------------------------------------------------------
mcp_servers:
  filesystem:
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL

  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Scheduler: Cron jobs and triggers
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 AM daily
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # Every 4 hours
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # Every 15 minutes
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m # Check every 30 minutes
    classification: INTERNAL # Max taint ceiling for triggers
    quiet_hours: "22:00-07:00" # Suppress during these hours

# ---------------------------------------------------------------------------
# Notifications: Delivery preferences
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # Suppress normal/low priority
  batch_interval: 15m # Batch low-priority notifications

# ---------------------------------------------------------------------------
# Agents: Multi-agent routing (optional)
# ---------------------------------------------------------------------------
agents:
  default: personal # Fallback agent
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp, telegram]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: INTERNAL

    - id: work
      name: "Work Assistant"
      channels: [slack, email]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Voice: Speech configuration (optional)
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper model size
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice-id"
  wake_word: "triggerfish"
  push_to_talk:
    shortcut: "Ctrl+Space"

# ---------------------------------------------------------------------------
# Webhooks: Inbound event endpoints (optional)
# ---------------------------------------------------------------------------
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # Webhook secret is stored in the OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "pull_request_review"
          task: "A PR review was submitted. Read tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read tracking file, address comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address feedback."
        - event: "pull_request.closed"
          task: "PR closed or merged. Clean up branches and archive tracking file."
        - event: "issues.opened"
          task: "Triage new issue"

# ---------------------------------------------------------------------------
# GitHub: GitHub integration settings (optional)
# ---------------------------------------------------------------------------
github:
  auto_merge: false # Default: false. Set true to auto-merge approved PRs.

# ---------------------------------------------------------------------------
# Groups: Group chat behavior (optional)
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Remote: Remote access (optional)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Web: Search and fetch configuration
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # Search backend (brave is the default)
# API key is stored in the OS keychain

# ---------------------------------------------------------------------------
# Remote: Remote access (optional)
# ---------------------------------------------------------------------------
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
# Auth token is stored in the OS keychain
```

## 섹션 참조

### `models`

| 키                               | 유형     | 설명                                                                                                   |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `primary`                        | object   | `provider`와 `model` 필드가 있는 기본 모델 참조                                                       |
| `primary.provider`               | string   | 제공자 이름 (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)     |
| `primary.model`                  | string   | 에이전트 완성에 사용되는 모델 식별자                                                                   |
| `vision`                         | string   | 자동 이미지 설명을 위한 선택적 비전 모델 ([이미지 및 비전](/ko-KR/features/image-vision) 참조)         |
| `streaming`                      | boolean  | 스트리밍 응답 활성화 (기본값: `true`)                                                                  |
| `providers`                      | object   | 제공자별 구성 (아래 참조)                                                                              |
| `failover`                       | string[] | 정렬된 대체 모델 목록                                                                                  |
| `failover_config.max_retries`    | number   | 페일오버 전 제공자당 재시도 횟수                                                                       |
| `failover_config.retry_delay_ms` | number   | 재시도 간 지연 시간(밀리초)                                                                            |
| `failover_config.conditions`     | string[] | 페일오버를 트리거하는 조건                                                                             |

### `channels`

각 채널 키는 채널 유형입니다. 모든 채널 유형은 기본 분류 수준을 재정의하는 `classification` 필드를 지원합니다.

::: info 모든 시크릿(토큰, API 키, 비밀번호)은 이 파일이 아닌 OS 키체인에 저장됩니다. 자격 증명을 안전하게 입력하려면 `triggerfish config add-channel <name>`을 실행하십시오. :::

### `classification`

| 키     | 유형                           | 설명                                                                              |
| ------ | ------------------------------ | --------------------------------------------------------------------------------- |
| `mode` | `"personal"` 또는 `"enterprise"` | 배포 모드 (출시 예정 -- 현재 두 모드 모두 동일한 분류 수준을 사용)              |

### `policy`

Hook 실행 중 평가되는 사용자 정의 규칙. 각 규칙은 hook 유형, 우선순위, 조건, 동작을 지정합니다. 우선순위 번호가 높을수록 먼저 평가됩니다.

### `mcp_servers`

외부 MCP 도구 서버. 각 서버는 실행 명령, 선택적 환경 변수, 분류 수준, 도구별 권한을 지정합니다.

### `scheduler`

Cron 작업 정의와 트리거 타이밍. 자세한 내용은 [Cron과 트리거](/ko-KR/features/cron-and-triggers)를 참조하십시오.

### `notifications`

알림 전달 기본 설정. 자세한 내용은 [알림](/ko-KR/features/notifications)을 참조하십시오.

### `web`

| 키                    | 유형   | 설명                                                      |
| --------------------- | ------ | --------------------------------------------------------- |
| `web.search.provider` | string | `web_search` 도구의 검색 백엔드 (현재: `brave`)           |

자세한 내용은 [웹 검색 및 가져오기](/ko-KR/features/web-search)를 참조하십시오.

### `logging`

| 키      | 유형   | 기본값     | 설명                                                                                  |
| ------- | ------ | ---------- | ------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | 로그 상세도: `quiet` (오류만), `normal` (정보), `verbose` (디버그), `debug` (트레이스) |

로그 출력과 파일 회전에 대한 자세한 내용은 [구조화된 로깅](/ko-KR/features/logging)을 참조하십시오.

### `github`

| 키           | 유형    | 기본값  | 설명                                                                                                                                                                      |
| ------------ | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false` | `true`이면 에이전트가 승인 리뷰를 받은 후 PR을 자동 병합합니다. `false`(기본값)이면 에이전트가 소유자에게 알리고 명시적인 병합 지시를 기다립니다. |

전체 설정 지침은 [GitHub 통합](/ko-KR/integrations/github) 가이드를 참조하십시오.
