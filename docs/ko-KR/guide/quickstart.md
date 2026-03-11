# 빠른 시작

이 가이드는 Triggerfish를 사용하는 첫 5분을 안내합니다 -- 설정 마법사 실행부터 채팅할 수 있는 작동하는 AI 에이전트를 갖추는 것까지.

## 설정 마법사 실행

단일 명령 설치 프로그램을 사용한 경우 마법사는 이미 설치 중에 실행되었습니다. 다시 실행하거나 새로 시작하려면:

```bash
triggerfish dive
```

마법사는 8단계를 안내합니다:

### 1단계: LLM 제공자 선택

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

제공자를 선택하고 자격 증명을 입력합니다. Triggerfish는 자동 장애 조치와 함께 여러 제공자를 지원합니다. **Triggerfish Gateway**가 가장 쉬운 옵션입니다 -- [Pro 또는 Power 플랜](/ko-KR/pricing)을 구독하면 API 키 구성 없이 관리되는 LLM 및 검색 인프라에 에이전트가 연결됩니다.

### 2단계: 에이전트 이름 지정

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

이 단계에서 `SPINE.md` 파일이 생성됩니다 -- 에이전트 시스템 프롬프트의 기반입니다. `~/.triggerfish/SPINE.md`에서 언제든지 편집할 수 있습니다.

### 3단계: 채널 연결

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

메시징 플랫폼을 선택하거나 이 단계를 건너뛰어 CLI만으로 시작합니다. 나중에 `triggerfish.yaml`에서 채널을 추가할 수 있습니다.

### 4단계: 선택적 plugin

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

Obsidian과 같은 선택적 통합을 연결하여 메모 작성에 사용합니다.

### 5단계: Google Workspace 연결 (선택 사항)

OAuth2를 통해 Gmail, Calendar, Tasks, Drive, Sheets를 위한 Google 계정을 연결합니다. 이 단계를 건너뛰고 나중에 `triggerfish connect google`로 연결할 수 있습니다.

### 6단계: GitHub 연결 (선택 사항)

Personal Access Token을 붙여넣어 GitHub를 연결합니다. 에이전트에게 리포지토리, PR, 이슈, Actions 도구를 제공합니다. 이 단계를 건너뛰고 나중에 `triggerfish connect github`으로 연결할 수 있습니다.

### 7단계: 웹 검색 설정

에이전트가 사용할 검색 엔진(Brave Search 또는 자체 호스팅 SearXNG)을 선택하거나 지금은 건너뜁니다.

### 8단계: 데몬 시작

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

Yes를 선택하면 머신이 켜져 있을 때마다 에이전트가 실행됩니다.

## 채팅 시작

마법사가 완료된 후 CLI를 통해 즉시 채팅을 시작할 수 있습니다:

```bash
triggerfish chat
```

또는 메시징 채널을 연결한 경우 해당 채널에서 에이전트에게 메시지를 보냅니다.

### 대화 예시

```
You: What can you help me with?

Reef: I can help you with a wide range of tasks. Here are some things
I'm set up for:

  - Answer questions and have conversations
  - Manage your calendar and schedule
  - Summarize emails and messages
  - Write and edit documents
  - Run code in a sandboxed environment
  - Search the web for information
  - Automate recurring tasks with cron jobs

What would you like to start with?

You: Set up a morning briefing every day at 7am

Reef: I've created a cron job for your morning briefing:

  Schedule: Every day at 7:00 AM
  Task: Prepare briefing with calendar events, unread emails,
        and weather forecast
  Delivery: CLI (add a channel in config to get it on Telegram/Slack)

You'll receive your first briefing tomorrow morning. You can manage
cron jobs anytime with /cron list.
```

## 설정 확인

상태 점검을 실행하여 모든 것이 정상적으로 작동하는지 확인합니다:

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 2m)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  1 channel active (CLI)
  Policy engine loaded (4 rules)
  3 skills installed (3 bundled)

Overall: HEALTHY
```

## 다음에 할 일

- **에이전트 커스터마이즈** -- `~/.triggerfish/SPINE.md`를 편집하여 에이전트의 성격과 능력을 다듬습니다. [SPINE과 트리거](./spine-and-triggers)를 참조하십시오.
- **더 많은 채널 추가** -- `triggerfish.yaml`에서 Telegram, Slack, Discord 또는 WhatsApp를 연결합니다. [구성](./configuration)을 참조하십시오.
- **통합 연결** -- Google Workspace용 `triggerfish connect google`, GitHub용 `triggerfish connect github`. [통합](/ko-KR/integrations/)을 참조하십시오.
- **능동적 행동 설정** -- `~/.triggerfish/TRIGGER.md`를 생성하여 에이전트가 무엇을 모니터링할지 알려줍니다. [SPINE과 트리거](./spine-and-triggers)를 참조하십시오.
- **명령어 탐색** -- 모든 사용 가능한 CLI 및 채팅 내 명령어를 알아봅니다. [CLI 명령어](./commands)를 참조하십시오.
