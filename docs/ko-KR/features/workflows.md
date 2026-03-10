---
title: 워크플로
description: Triggerfish에 내장된 CNCF Serverless Workflow DSL 엔진으로 다단계 작업을 자동화합니다.
---

# 워크플로

Triggerfish에는 [CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification)을 위한 내장 실행 엔진이 포함되어 있습니다.
워크플로를 사용하면 실행 중에 **LLM이 개입하지 않는** 결정론적 다단계 자동화를 YAML로 정의할 수 있습니다. 에이전트가 워크플로를 생성하고 트리거하지만, 실제 작업 디스패치, 분기, 반복 및 데이터 흐름은 엔진이 처리합니다.

## 워크플로를 사용해야 하는 경우

**워크플로를 사용하세요** — 단계를 미리 알고 있는 반복 가능한 결정론적 시퀀스에 적합합니다: API에서 데이터를 가져오고, 변환하고, 메모리에 저장하고, 알림을 보내는 경우입니다. 동일한 입력은 항상 동일한 출력을 생성합니다.

**에이전트를 직접 사용하세요** — 개방형 추론, 탐색 또는 다음 단계가 판단에 따라 달라지는 작업에 적합합니다: 주제 조사, 코드 작성, 문제 해결 등입니다.

좋은 기준: 에이전트에게 동일한 다단계 시퀀스를 반복적으로 요청하고 있다면, 워크플로로 전환하십시오.

::: info 가용성
워크플로는 모든 플랜에서 사용할 수 있습니다. 자체 API 키를 사용하는 오픈 소스 사용자는 워크플로 엔진에 대한 전체 액세스 권한을 가집니다 — 워크플로 내의 각 `triggerfish:llm` 또는 `triggerfish:agent` 호출은 구성된 제공자의 추론을 소비합니다.
:::

## 도구

### `workflow_save`

워크플로 정의를 파싱, 검증 및 저장합니다. 워크플로는 현재 세션의 분류 수준으로 저장됩니다.

| Parameter     | Type   | Required | 설명                               |
| ------------- | ------ | -------- | ---------------------------------- |
| `name`        | string | yes      | 워크플로 이름                      |
| `yaml`        | string | yes      | YAML 워크플로 정의                 |
| `description` | string | no       | 워크플로의 기능 설명               |

### `workflow_run`

이름 또는 인라인 YAML로 워크플로를 실행합니다. 실행 출력 및 상태를 반환합니다.

| Parameter | Type   | Required | 설명                                              |
| --------- | ------ | -------- | ------------------------------------------------- |
| `name`    | string | no       | 실행할 저장된 워크플로의 이름                     |
| `yaml`    | string | no       | 인라인 YAML 정의 (저장된 것을 사용하지 않을 때)   |
| `input`   | string | no       | 워크플로의 입력 데이터 JSON 문자열                |

`name` 또는 `yaml` 중 하나가 필요합니다.

### `workflow_list`

현재 분류 수준에서 접근 가능한 모든 저장된 워크플로를 나열합니다. 매개변수가 없습니다.

### `workflow_get`

이름으로 저장된 워크플로 정의를 검색합니다.

| Parameter | Type   | Required | 설명                              |
| --------- | ------ | -------- | --------------------------------- |
| `name`    | string | yes      | 검색할 워크플로 이름              |

### `workflow_delete`

이름으로 저장된 워크플로를 삭제합니다. 워크플로는 현재 세션의 분류 수준에서 접근 가능해야 합니다.

| Parameter | Type   | Required | 설명                            |
| --------- | ------ | -------- | ------------------------------- |
| `name`    | string | yes      | 삭제할 워크플로 이름            |

### `workflow_history`

과거 워크플로 실행 결과를 확인합니다. 선택적으로 워크플로 이름으로 필터링할 수 있습니다.

| Parameter       | Type   | Required | 설명                                   |
| --------------- | ------ | -------- | -------------------------------------- |
| `workflow_name` | string | no       | 워크플로 이름으로 결과 필터링          |
| `limit`         | string | no       | 최대 결과 수 (기본값 10)               |

## 작업 유형

워크플로는 `do:` 블록의 작업으로 구성됩니다. 각 작업은 유형별 본문이 있는 명명된 항목입니다. Triggerfish는 8가지 작업 유형을 지원합니다.

### `call` — 외부 호출

HTTP 엔드포인트 또는 Triggerfish 서비스로 디스패치합니다.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

`call` 필드가 디스패치 대상을 결정합니다. 전체 매핑은 [호출 디스패치](#호출-디스패치)를 참조하십시오.

### `run` — 셸, 스크립트 또는 하위 워크플로

셸 명령, 인라인 스크립트 또는 다른 저장된 워크플로를 실행합니다.

**셸 명령:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**하위 워크플로:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
셸 및 스크립트 실행에는 워크플로 도구 컨텍스트에서 `allowShellExecution` 플래그를 활성화해야 합니다. 비활성화된 경우 `shell` 또는 `script` 대상이 있는 run 작업이 실패합니다.
:::

### `set` — 데이터 컨텍스트 변경

워크플로의 데이터 컨텍스트에 값을 할당합니다. 표현식을 지원합니다.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — 조건부 분기

조건에 따라 분기합니다. 각 케이스에는 `when` 표현식과 `then` 흐름 지시문이 있습니다. `when`이 없는 케이스는 기본값으로 작동합니다.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — 반복

컬렉션을 순회하며 각 항목에 대해 중첩된 `do:` 블록을 실행합니다.

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

`each` 필드는 루프 변수의 이름을 지정하고, `in`은 컬렉션을 참조하며, 선택적 `at` 필드는 현재 인덱스를 제공합니다.

### `raise` — 오류로 중지

구조화된 오류와 함께 실행을 중지합니다.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — 이벤트 기록

워크플로 이벤트를 기록합니다. 이벤트는 실행 결과에 캡처되며 `workflow_history`를 통해 검토할 수 있습니다.

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — 대기

ISO 8601 기간 동안 실행을 일시 중지합니다.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## 호출 디스패치

호출 작업의 `call` 필드는 호출되는 Triggerfish 도구를 결정합니다.

| 호출 유형              | Triggerfish 도구 | 필수 `with:` 필드                      |
| ---------------------- | ---------------- | -------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` (또는 `url`), `method`      |
| `triggerfish:llm`      | `llm_task`       | `prompt` (또는 `task`)                 |
| `triggerfish:agent`    | `subagent`       | `prompt` (또는 `task`)                 |
| `triggerfish:memory`   | `memory_*`       | `operation` + 작업별 필드              |
| `triggerfish:web_search` | `web_search`   | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`   |
| `triggerfish:message`  | `send_message`   | `channel`, `text`                      |

**메모리 작업:** `triggerfish:memory` 호출 유형은 `operation` 필드가 `save`, `search`, `get`, `list` 또는 `delete` 중 하나로 설정되어야 합니다. 나머지 `with:` 필드는 해당 메모리 도구에 직접 전달됩니다.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**MCP 호출:** `triggerfish:mcp` 호출 유형은 연결된 모든 MCP 서버 도구로 라우팅됩니다. `server` 이름, `tool` 이름 및 `arguments` 객체를 지정합니다.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## 표현식

워크플로 표현식은 워크플로의 데이터 컨텍스트에 대한 점 경로 확인과 함께 `${ }` 구문을 사용합니다.

```yaml
# 단순 값 참조
url: "${ .config.api_url }"

# 배열 인덱싱
first_item: "${ .results[0].name }"

# 문자열 보간 (하나의 문자열에 여러 표현식)
message: "Found ${ .count } issues in ${ .repo }"

# 비교 (부울 반환)
if: "${ .status == 'open' }"

# 산술
total: "${ .price * .quantity }"
```

**지원되는 연산자:**

- 비교: `==`, `!=`, `>`, `<`, `>=`, `<=`
- 산술: `+`, `-`, `*`, `/`, `%`

**리터럴:** 문자열 (`"value"` 또는 `'value'`), 숫자 (`42`, `3.14`), 부울 (`true`, `false`), null (`null`).

`${ }` 표현식이 전체 값인 경우 원시 유형이 보존됩니다 (숫자, 부울, 객체). 텍스트와 혼합된 경우 결과는 항상 문자열입니다.

## 전체 예제

이 워크플로는 GitHub 이슈를 가져오고, LLM으로 요약하고, 요약을 메모리에 저장하고, 알림을 보냅니다.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**실행하기:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## 입력 및 출력 변환

작업은 실행 전에 입력을 변환하고 실행 후 결과를 저장하기 전에 출력을 변환할 수 있습니다.

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — 작업 실행 전에 작업의 입력 컨텍스트를 대체하는 표현식 또는 객체 매핑입니다.
- **`output.from`** — 데이터 컨텍스트에 저장하기 전에 작업 결과를 재구성하는 표현식 또는 객체 매핑입니다.

## 흐름 제어

모든 작업에는 다음에 일어나는 일을 제어하는 `then` 지시문을 포함할 수 있습니다:

- **`continue`** (기본값) — 시퀀스의 다음 작업으로 진행합니다
- **`end`** — 워크플로를 즉시 중지합니다 (상태: completed)
- **명명된 작업** — 이름으로 특정 작업으로 이동합니다

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## 조건부 실행

모든 작업에 `if` 필드를 포함할 수 있습니다. 조건이 거짓으로 평가되면 작업이 건너뛰어집니다.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## 하위 워크플로

`workflow` 대상이 있는 `run` 작업은 다른 저장된 워크플로를 실행합니다. 하위 워크플로는 자체 컨텍스트로 실행되며 출력을 상위에 반환합니다.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

하위 워크플로는 최대 **5단계**까지 중첩할 수 있습니다. 이 한도를 초과하면 오류가 발생하고 실행이 중지됩니다.

## 분류 및 보안

워크플로는 다른 모든 Triggerfish 데이터와 동일한 분류 시스템에 참여합니다.

**저장 분류.** `workflow_save`로 워크플로를 저장하면 현재 세션의 taint 수준으로 저장됩니다. `CONFIDENTIAL` 세션 중에 저장된 워크플로는 `CONFIDENTIAL` 이상의 세션에서만 로드할 수 있습니다.

**분류 상한.** 워크플로는 YAML에서 `classification_ceiling`을 선언할 수 있습니다. 각 작업이 실행되기 전에 엔진은 세션의 현재 taint가 상한을 초과하지 않는지 확인합니다. 실행 중에 세션 taint가 상한을 초과하면 (예: 도구 호출을 통해 분류된 데이터에 액세스하여) 워크플로가 상한 위반 오류와 함께 중지됩니다.

```yaml
classification_ceiling: INTERNAL
```

유효한 값: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**실행 기록.** 실행 결과는 완료 시점의 세션 분류와 함께 저장됩니다. `workflow_history`는 `canFlowTo`로 결과를 필터링하므로 현재 세션 taint 이하의 실행만 볼 수 있습니다.

::: danger 보안
워크플로 삭제에는 현재 세션의 분류 수준에서 워크플로에 접근할 수 있어야 합니다. `PUBLIC` 세션에서 `CONFIDENTIAL`로 저장된 워크플로를 삭제할 수 없습니다. `workflow_delete` 도구는 먼저 워크플로를 로드하고 분류 확인에 실패하면 "찾을 수 없음"을 반환합니다.
:::
