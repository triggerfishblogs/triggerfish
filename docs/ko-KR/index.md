---
layout: home

hero:
  name: Triggerfish
  text: 안전한 AI 에이전트
  tagline: LLM 계층 아래의 결정론적 정책 시행. 모든 채널. 예외 없음.
  image:
    src: /triggerfish.png
    alt: Triggerfish — 디지털 바다를 누비며
  actions:
    - theme: brand
      text: 시작하기
      link: /ko-KR/guide/
    - theme: alt
      text: 가격
      link: /ko-KR/pricing
    - theme: alt
      text: GitHub에서 보기
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: LLM 아래의 보안
    details: 결정론적, LLM 하위 정책 시행. AI가 우회하거나 재정의하거나 영향을 줄 수 없는 순수 코드 hook. 동일한 입력은 항상 동일한 결정을 생성합니다.
  - icon: "\U0001F4AC"
    title: 사용하는 모든 채널
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — 모두 채널별 분류 등급과 자동 taint 추적을 지원합니다.
  - icon: "\U0001F528"
    title: 무엇이든 구축
    details: 쓰기/실행/수정 피드백 루프가 포함된 에이전트 실행 환경. 자체 작성 skill. 기능을 검색하고 공유할 수 있는 The Reef 마켓플레이스.
  - icon: "\U0001F916"
    title: 모든 LLM 제공업체
    details: Anthropic, OpenAI, Google Gemini, Ollama를 통한 로컬 모델, OpenRouter. 자동 failover 체인. 또는 Triggerfish Gateway를 선택하면 API 키가 필요 없습니다.
  - icon: "\U0001F3AF"
    title: 기본적으로 능동적
    details: Cron 작업, 트리거, webhook. 에이전트가 엄격한 정책 경계 내에서 자율적으로 확인하고, 모니터링하고, 조치합니다.
  - icon: "\U0001F310"
    title: 오픈 소스
    details: Apache 2.0 라이선스. 보안 핵심 구성 요소가 감사를 위해 완전히 공개되어 있습니다. 저희를 신뢰하지 마십시오 — 코드를 직접 확인하십시오.
---

<LatestRelease />

## 한 줄 명령으로 설치

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

바이너리 설치 프로그램은 사전 빌드된 릴리스를 다운로드하고, 체크섬을 검증하고,
설정 마법사를 실행합니다. Docker 설정, 소스에서 빌드하기, 릴리스 프로세스에
대해서는 [설치 가이드](/ko-KR/guide/installation)를 참조하십시오.

API 키를 관리하고 싶지 않으십니까? 수 분 내에 사용 가능한 관리형 LLM 및 검색
인프라인 Triggerfish Gateway에 대해서는 [가격](/ko-KR/pricing)을 참조하십시오.

## 작동 원리

Triggerfish는 AI 에이전트와 에이전트가 접촉하는 모든 것 사이에 결정론적 정책
계층을 배치합니다. LLM은 작업을 제안하고 — 순수 코드 hook이 허용 여부를
결정합니다.

- **결정론적 정책** — 보안 결정은 순수 코드입니다. 무작위성 없음, LLM 영향 없음,
  예외 없음. 동일한 입력, 동일한 결정, 매번.
- **정보 흐름 제어** — 네 가지 분류 등급(PUBLIC, INTERNAL, CONFIDENTIAL,
  RESTRICTED)이 세션 taint를 통해 자동으로 전파됩니다. 데이터는 보안 수준이 낮은
  컨텍스트로 절대 흐르지 않습니다.
- **여섯 가지 시행 Hook** — 데이터 파이프라인의 모든 단계가 게이트됩니다: LLM
  컨텍스트에 진입하는 것, 호출되는 도구, 반환되는 결과, 시스템을 떠나는 것. 모든
  결정이 감사 로그에 기록됩니다.
- **기본 거부** — 아무것도 암묵적으로 허용되지 않습니다. 분류되지 않은 도구,
  통합, 데이터 소스는 명시적으로 구성될 때까지 거부됩니다.
- **에이전트 아이덴티티** — 에이전트의 미션은 SPINE.md에, 능동적 행동은
  TRIGGER.md에 있습니다. Skill은 간단한 폴더 규칙을 통해 기능을 확장합니다.
  The Reef 마켓플레이스에서 검색하고 공유할 수 있습니다.

[아키텍처에 대해 더 알아보기.](/ko-KR/architecture/)
