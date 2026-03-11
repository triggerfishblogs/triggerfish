# 코드베이스 탐색

`explore` 도구는 에이전트에게 코드베이스와 디렉터리에 대한 빠르고 구조화된 이해를 제공합니다. `read_file`, `list_directory`, `search_files`를 순서대로 수동으로 호출하는 대신 에이전트가 `explore`를 한 번 호출하면 병렬 서브 에이전트가 생성한 구조화된 보고서를 받습니다.

## 도구

### `explore`

디렉터리 또는 코드베이스를 탐색하여 구조, 패턴, 규칙을 이해합니다. 읽기 전용입니다.

| 매개변수 | 유형   | 필수   | 설명                                                     |
| -------- | ------ | ------ | -------------------------------------------------------- |
| `path`   | string | 예     | 탐색할 디렉터리 또는 파일                                |
| `focus`  | string | 아니오 | 찾을 내용 (예: "auth 패턴", "테스트 구조")               |
| `depth`  | string | 아니오 | 탐색 깊이: `shallow`, `standard` (기본값) 또는 `deep`    |

## 깊이 수준

| 깊이       | 생성 에이전트 수 | 분석 내용                                           |
| ---------- | ---------------- | --------------------------------------------------- |
| `shallow`  | 2                | 디렉터리 트리 + 종속성 매니페스트                   |
| `standard` | 3-4              | 트리 + 매니페스트 + 코드 패턴 + 포커스 (지정된 경우) |
| `deep`     | 5-6              | 위의 모든 것 + 임포트 그래프 추적 + git 기록        |

## 작동 방식

탐색 도구는 각각 다른 측면에 초점을 맞춘 병렬 서브 에이전트를 생성합니다:

1. **트리 에이전트** -- 디렉터리 구조를 매핑하고 (3레벨 깊이) 규칙에 따라 주요 파일을 식별합니다 (`mod.ts`, `main.ts`, `deno.json`, `README.md` 등)
2. **매니페스트 에이전트** -- 종속성 파일을 읽고 (`deno.json`, `package.json`, `tsconfig.json`) 종속성, 스크립트, 엔트리 포인트를 나열합니다
3. **패턴 에이전트** -- 소스 파일을 샘플링하여 코딩 패턴을 감지합니다: 모듈 구조, 오류 처리, 유형 규칙, 임포트 스타일, 네이밍, 테스팅
4. **포커스 에이전트** -- 포커스 쿼리와 관련된 파일과 패턴을 검색합니다
5. **임포트 에이전트** (deep만) -- 엔트리 포인트에서 임포트 그래프를 추적하고 순환 종속성을 감지합니다
6. **Git 에이전트** (deep만) -- 최근 커밋, 현재 브랜치, 커밋되지 않은 변경 사항을 분석합니다

모든 에이전트가 동시에 실행됩니다. 결과는 구조화된 `ExploreResult`로 조립됩니다:

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Classification levels" }
  ],
  "patterns": [
    { "name": "Result pattern", "description": "Uses Result<T,E> for error handling", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Core module with classification types, policy engine, and session management."
}
```

## 에이전트가 사용하는 경우

에이전트는 다음 상황에서 `explore`를 사용하도록 지시됩니다:

- 익숙하지 않은 코드를 수정하기 전
- "이것이 무엇을 하는가" 또는 "이것이 어떻게 구조화되어 있는가"라는 질문을 받았을 때
- 기존 코드와 관련된 사소하지 않은 작업을 시작할 때
- 따라야 할 올바른 파일이나 패턴을 찾아야 할 때

탐색 후 에이전트는 새 코드를 작성할 때 발견한 패턴과 규칙을 참조하여 기존 코드베이스와의 일관성을 보장합니다.

## 예시

```
# 디렉터리의 빠른 개요
explore({ path: "src/auth" })

# 특정 패턴에 대한 집중 검색
explore({ path: "src/auth", focus: "how tokens are validated" })

# git 기록 및 임포트 그래프를 포함한 심층 분석
explore({ path: "src/core", depth: "deep" })

# 테스트 작성 전 테스트 규칙 이해
explore({ path: "tests/", focus: "test patterns and assertions" })
```
