# Skill 빌드하기

이 가이드는 Triggerfish skill을 처음부터 만드는 과정을 안내합니다 -- `SKILL.md` 파일 작성부터 테스트 및 승인까지.

## 무엇을 만들 것인가

Skill은 에이전트에게 어떤 것을 하는 방법을 가르치는 `SKILL.md` 파일이 포함된 폴더입니다. 이 가이드를 마치면 에이전트가 발견하고 사용할 수 있는 작동하는 skill을 갖게 됩니다.

## Skill 구조

모든 skill은 루트에 `SKILL.md`가 있는 디렉터리입니다:

```
my-skill/
  SKILL.md           # 필수: 프론트매터 + 지침
  template.md        # 선택: skill이 참조하는 템플릿
  helper.ts          # 선택: 지원 코드
```

`SKILL.md` 파일은 두 부분으로 구성됩니다:

1. **YAML 프론트매터** (`---` 구분자 사이) -- skill에 대한 메타데이터
2. **마크다운 본문** -- 에이전트가 읽는 지침

## 1단계: 프론트매터 작성

프론트매터는 skill이 하는 일, 필요한 것, 적용되는 보안 제약을 선언합니다.

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, and flag PRs needing review.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---
```

### 필수 필드

| 필드          | 설명                                             | 예시            |
| ------------- | ------------------------------------------------ | --------------- |
| `name`        | 고유 식별자. 소문자, 공백 대신 하이픈 사용.      | `github-triage` |
| `description` | skill의 기능과 사용 시기. 1-3문장.               | 위 참조         |

### 선택 필드

| 필드                     | 설명                              | 기본값   |
| ------------------------ | --------------------------------- | -------- |
| `classification_ceiling` | 최대 데이터 민감도 수준           | `PUBLIC` |
| `requires_tools`         | skill이 접근해야 하는 도구        | `[]`     |
| `network_domains`        | skill이 접근하는 외부 도메인      | `[]`     |

`version`, `category`, `tags`, `triggers` 같은 추가 필드를 문서화 및 향후 사용을 위해 포함할 수 있습니다. Skill 로더는 인식하지 못하는 필드를 자동으로 무시합니다.

### 분류 상한 선택

분류 상한은 skill이 처리할 최대 데이터 민감도입니다. 작동하는 가장 낮은 수준을 선택하십시오:

| 수준           | 사용 시기                         | 예시                                             |
| -------------- | --------------------------------- | ------------------------------------------------ |
| `PUBLIC`       | 공개적으로 사용 가능한 데이터만   | 웹 검색, 공개 API 문서, 날씨                     |
| `INTERNAL`     | 내부 프로젝트 데이터 작업         | 코드 분석, 구성 검토, 내부 문서                  |
| `CONFIDENTIAL` | 개인 또는 비공개 데이터 처리      | 이메일 요약, GitHub 알림, CRM 쿼리               |
| `RESTRICTED`   | 고도로 민감한 데이터 접근         | 키 관리, 보안 감사, 컴플라이언스                 |

::: warning Skill의 상한이 사용자의 구성된 상한을 초과하면 skill 작성자 API가 거부합니다. 항상 필요한 최소 수준을 사용하십시오. :::

## 2단계: 지침 작성

마크다운 본문은 에이전트가 skill을 실행하는 방법을 배우기 위해 읽는 것입니다. 실행 가능하고 구체적으로 작성하십시오.

### 구조 템플릿

```markdown
# Skill 이름

한 줄 목적 설명.

## 사용 시기

- 조건 1 (사용자가 X를 요청)
- 조건 2 (cron에 의해 트리거)
- 조건 3 (관련 키워드 감지)

## 단계

1. 구체적인 세부 사항이 있는 첫 번째 동작
2. 구체적인 세부 사항이 있는 두 번째 동작
3. 결과 처리 및 형식 지정
4. 구성된 채널로 전달

## 출력 형식

결과의 형식 지정 방법을 설명합니다.

## 일반적인 실수

- Y 때문에 X를 하지 마십시오
- 진행하기 전에 항상 Z를 확인하십시오
```

### 모범 사례

- **목적으로 시작**: skill이 하는 일을 설명하는 한 문장
- **"사용 시기" 포함**: 에이전트가 skill을 활성화할 시기를 결정하는 데 도움
- **구체적으로 작성**: "지난 24시간의 읽지 않은 이메일 가져오기"가 "이메일 가져오기"보다 좋음
- **코드 예시 사용**: 정확한 API 호출, 데이터 형식, 명령 패턴을 보여줌
- **표 추가**: 옵션, 엔드포인트, 매개변수에 대한 빠른 참조
- **오류 처리 포함**: API 호출 실패 또는 데이터 누락 시 대처 방법
- **"일반적인 실수"로 끝**: 에이전트가 알려진 문제를 반복하는 것을 방지

## 3단계: 검색 테스트

Skill 로더에 의해 skill이 검색 가능한지 확인합니다. 번들된 디렉터리에 배치한 경우:

```typescript
import { createSkillLoader } from "../src/skills/loader.ts";

const loader = createSkillLoader({
  directories: ["skills/bundled"],
  dirTypes: { "skills/bundled": "bundled" },
});

const skills = await loader.discover();
const mySkill = skills.find((s) => s.name === "github-triage");
console.log(mySkill);
// { name: "github-triage", classificationCeiling: "CONFIDENTIAL", ... }
```

다음을 확인하십시오:

- Skill이 검색된 목록에 나타남
- `name`이 프론트매터와 일치
- `classificationCeiling`이 올바름
- `requiresTools`와 `networkDomains`가 채워져 있음

## 에이전트 자체 작성

에이전트는 `SkillAuthor` API를 사용하여 프로그래밍 방식으로 skill을 생성할 수 있습니다. 이는 에이전트가 새로운 것을 하도록 요청받았을 때 스스로를 확장하는 방법입니다.

### 워크플로우

```
1. 사용자: "매일 아침 Notion에서 새 작업을 확인해줘"
2. 에이전트: SkillAuthor를 사용하여 워크스페이스에 skill 생성
3. Skill: PENDING_APPROVAL 상태로 진입
4. 사용자: 알림 수신, skill 검토
5. 사용자: 승인 → skill 활성화
6. 에이전트: 아침 cron 스케줄에 skill 연결
```

### SkillAuthor API 사용

```typescript
import { createSkillAuthor } from "triggerfish/skills";

const author = createSkillAuthor({
  skillsDir: workspace.skillsPath,
  userCeiling: "CONFIDENTIAL",
});

const result = await author.create({
  name: "notion-tasks",
  description: "Check Notion for new tasks and summarize them daily",
  classificationCeiling: "INTERNAL",
  requiresTools: ["browser"],
  networkDomains: ["api.notion.com"],
  content: `# Notion Task Checker

## When to Use

- Morning cron trigger
- User asks about pending tasks

## Steps

1. Fetch tasks from Notion API using the user's integration token
2. Filter for tasks created or updated in the last 24 hours
3. Categorize by priority (P0, P1, P2)
4. Format as a concise bullet-point summary
5. Deliver to the configured channel
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### 승인 상태

| 상태               | 의미                              |
| ------------------ | --------------------------------- |
| `PENDING_APPROVAL` | 생성됨, 소유자 검토 대기 중       |
| `APPROVED`         | 소유자 승인됨, skill 활성화       |
| `REJECTED`         | 소유자 거부됨, skill 비활성화     |

::: warning 보안 에이전트는 자체 skill을 승인할 수 없습니다. 이는 API 수준에서 시행됩니다. 모든 에이전트 작성 skill은 활성화 전에 명시적인 소유자 확인이 필요합니다. :::

## 보안 스캔

활성화 전에 skill은 프롬프트 인젝션 패턴을 검사하는 보안 스캐너를 통과합니다:

- "Ignore all previous instructions" -- 프롬프트 인젝션
- "You are now a..." -- 아이덴티티 재정의
- "Reveal secrets/credentials" -- 데이터 유출 시도
- "Bypass security/policy" -- 보안 우회
- "Sudo/admin/god mode" -- 권한 상승

스캐너에 의해 플래그된 skill에는 소유자가 승인 전에 검토해야 하는 경고가 포함됩니다.

## 트리거

Skill은 프론트매터에 자동 트리거를 정의할 수 있습니다:

```yaml
triggers:
  - cron: "0 7 * * *" # 매일 오전 7시
  - cron: "*/30 * * * *" # 30분마다
```

스케줄러가 이 정의를 읽고 지정된 시간에 에이전트를 깨워 skill을 실행합니다. `triggerfish.yaml`의 조용한 시간과 트리거를 결합하여 특정 기간 동안 실행을 방지할 수 있습니다.

## 전체 예시

GitHub 알림을 분류하는 전체 skill입니다:

```
github-triage/
  SKILL.md
```

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, flag PRs needing review. Use when the user
  asks about GitHub activity or on the hourly cron.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---

# GitHub Triage

Review and categorize GitHub notifications, issues, and pull requests.

## When to Use

- User asks "what's happening on GitHub?"
- Hourly cron trigger
- User asks about specific repo activity

## Steps

1. Fetch notifications from GitHub API using the user's token
2. Categorize: PRs needing review, new issues, mentions, CI failures
3. Prioritize by label: bug > security > feature > question
4. Summarize top items with direct links
5. Flag anything assigned to the user

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- Don't fetch all notifications — filter by `since` parameter for the last hour
- Always check rate limits before making multiple API calls
- Include direct links to every item for quick action
```

## Skill 체크리스트

Skill을 완료로 간주하기 전에:

- [ ] 폴더 이름이 프론트매터의 `name`과 일치
- [ ] 설명이 **무엇을** 하고 **언제** 사용하는지 설명
- [ ] 분류 상한이 작동하는 가장 낮은 수준
- [ ] 모든 필수 도구가 `requires_tools`에 나열
- [ ] 모든 외부 도메인이 `network_domains`에 나열
- [ ] 지침이 구체적이고 단계별로 작성
- [ ] 코드 예시가 Triggerfish 패턴 사용 (Result 타입, 팩토리 함수)
- [ ] 출력 형식이 지정됨
- [ ] 일반적인 실수 섹션이 포함됨
- [ ] 로더에 의해 skill이 검색 가능 (테스트 완료)
