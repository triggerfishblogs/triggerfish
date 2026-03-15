---
title: 워크플로 DSL 레퍼런스
description: Triggerfish에서 구현된 CNCF Serverless Workflow DSL 1.0의 전체 레퍼런스입니다.
---

# 워크플로 DSL 레퍼런스

Triggerfish의 워크플로 엔진에서 구현된 CNCF Serverless Workflow DSL 1.0의 전체 레퍼런스입니다. 사용 가이드 및 예제는 [워크플로](/ko-KR/features/workflows)를 참조하십시오.

## 문서 구조

모든 워크플로 YAML에는 최상위 `document` 필드와 `do` 블록이 있어야 합니다.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # optional
  description: "What it does"  # optional
classification_ceiling: INTERNAL  # optional
input:                            # optional
  from: "${ . }"
output:                           # optional
  from:
    result: "${ .final_step }"
timeout:                          # optional
  after: PT5M
do:
  - task_name:
      # task definition
```

### 문서 메타데이터

| Field         | Type   | Required | 설명                                         |
| ------------- | ------ | -------- | -------------------------------------------- |
| `dsl`         | string | yes      | DSL 버전. `"1.0"`이어야 합니다               |
| `namespace`   | string | yes      | 논리적 그룹 (예: `ops`, `reports`)            |
| `name`        | string | yes      | 네임스페이스 내 고유 워크플로 이름            |
| `version`     | string | no       | 시맨틱 버전 문자열                           |
| `description` | string | no       | 사람이 읽을 수 있는 설명                     |

### 최상위 필드

| Field                     | Type         | Required | 설명                                        |
| ------------------------- | ------------ | -------- | ------------------------------------------- |
| `document`                | object       | yes      | 문서 메타데이터 (위 참조)                    |
| `do`                      | array        | yes      | 정렬된 작업 항목 목록                        |
| `classification_ceiling`  | string       | no       | 실행 중 허용되는 최대 세션 taint             |
| `input`                   | transform    | no       | 워크플로 입력에 적용되는 변환                |
| `output`                  | transform    | no       | 워크플로 출력에 적용되는 변환                |
| `timeout`                 | object       | no       | 워크플로 수준 타임아웃 (`after: <ISO 8601>`) |
| `metadata`                | object       | no       | 임의의 키-값 메타데이터                      |

---

## 작업 항목 형식

`do` 블록의 각 항목은 단일 키 객체입니다. 키는 작업 이름이고 값은 작업 정의입니다.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

작업 이름은 동일한 `do` 블록 내에서 고유해야 합니다. 작업 결과는 작업 이름 아래에 데이터 컨텍스트에 저장됩니다.

---

## 공통 작업 필드

모든 작업 유형은 다음과 같은 선택적 필드를 공유합니다:

| Field      | Type      | 설명                                                |
| ---------- | --------- | --------------------------------------------------- |
| `if`       | string    | 표현식 조건. 거짓이면 작업이 건너뛰어집니다.         |
| `input`    | transform | 작업 실행 전에 적용되는 변환                         |
| `output`   | transform | 작업 실행 후에 적용되는 변환                         |
| `timeout`  | object    | 작업 타임아웃: `after: <ISO 8601 기간>`              |
| `then`     | string    | 흐름 지시문: `continue`, `end` 또는 작업 이름        |
| `metadata` | object    | 임의의 키-값 메타데이터. 자가 치유 활성화 시 `description`, `expects`, `produces`가 필요합니다. |

---

## 자가 치유 구성

`metadata.triggerfish.self_healing` 블록은 워크플로에 대한 자율 치유 에이전트를 활성화합니다. 전체 가이드는 [자가 치유](/ko-KR/features/workflows#자가-치유)를 참조하십시오.

```yaml
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
      pause_timeout_seconds: 300
      pause_timeout_policy: escalate_and_halt
      notify_on: [intervention, escalation, approval_required]
```

| Field                   | Type    | Required | Default              | 설명 |
| ----------------------- | ------- | -------- | -------------------- | ---- |
| `enabled`               | boolean | yes      | —                    | 치유 에이전트 활성화 |
| `retry_budget`          | number  | no       | `3`                  | 최대 개입 시도 횟수 |
| `approval_required`     | boolean | no       | `true`               | 수정에 사람의 승인 필요 여부 |
| `pause_on_intervention` | string  | no       | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | no       | `300`                | 타임아웃 정책 실행까지 대기 시간(초) |
| `pause_timeout_policy`  | string  | no       | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | no       | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### 단계 메타데이터 (자가 치유 활성화 시 필수)

`self_healing.enabled`가 `true`인 경우 모든 작업에 다음 메타데이터 필드가 포함되어야 합니다. 파서는 이러한 필드가 누락된 워크플로를 거부합니다.

| Field         | Type   | 설명                                         |
| ------------- | ------ | -------------------------------------------- |
| `description` | string | 해당 단계의 기능과 이유                      |
| `expects`     | string | 필요한 입력 형태 또는 전제 조건              |
| `produces`    | string | 생성되는 출력 형태                           |

```yaml
- fetch-invoices:
    call: http
    with:
      endpoint: "https://api.example.com/invoices"
    metadata:
      description: "Fetch open invoices from billing API"
      expects: "API available, returns JSON array"
      produces: "Array of {id, amount, status} objects"
```

---

## 작업 유형

### `call`

HTTP 엔드포인트 또는 Triggerfish 서비스로 디스패치합니다.

| Field  | Type   | Required | 설명                                              |
| ------ | ------ | -------- | ------------------------------------------------- |
| `call` | string | yes      | 호출 유형 (아래 디스패치 테이블 참조)              |
| `with` | object | no       | 대상 도구에 전달되는 인수                          |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

셸 명령, 인라인 스크립트 또는 하위 워크플로를 실행합니다. `run` 필드는 `shell`, `script` 또는 `workflow` 중 정확히 하나를 포함해야 합니다.

**셸:**

| Field                  | Type   | Required | 설명                     |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.shell.command`    | string | yes      | 실행할 셸 명령           |
| `run.shell.arguments`  | object | no       | 명명된 인수              |
| `run.shell.environment`| object | no       | 환경 변수                |

**스크립트:**

| Field                  | Type   | Required | 설명                     |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | 스크립트 언어            |
| `run.script.code`      | string | yes      | 인라인 스크립트 코드     |
| `run.script.arguments` | object | no       | 명명된 인수              |

**하위 워크플로:**

| Field                | Type   | Required | 설명                         |
| -------------------- | ------ | -------- | ---------------------------- |
| `run.workflow.name`  | string | yes      | 저장된 워크플로 이름         |
| `run.workflow.version` | string | no     | 버전 제약                    |
| `run.workflow.input` | object | no       | 하위 워크플로의 입력 데이터  |

### `set`

데이터 컨텍스트에 값을 할당합니다.

| Field | Type   | Required | 설명                                             |
| ----- | ------ | -------- | ------------------------------------------------ |
| `set` | object | yes      | 할당할 키-값 쌍. 값은 표현식일 수 있습니다.       |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

조건부 분기. `switch` 필드는 케이스 항목의 배열입니다. 각 케이스는 키가 케이스 이름인 단일 키 객체입니다.

| Case field | Type   | Required | 설명                                                |
| ---------- | ------ | -------- | --------------------------------------------------- |
| `when`     | string | no       | 표현식 조건. 기본 케이스의 경우 생략합니다.          |
| `then`     | string | yes      | 흐름 지시문: `continue`, `end` 또는 작업 이름        |

케이스는 순서대로 평가됩니다. 참인 `when`을 가진 (또는 `when`이 없는) 첫 번째 케이스가 선택됩니다.

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

컬렉션을 반복합니다.

| Field      | Type   | Required | 설명                                         |
| ---------- | ------ | -------- | -------------------------------------------- |
| `for.each` | string | yes      | 현재 항목의 변수 이름                        |
| `for.in`   | string | yes      | 컬렉션을 참조하는 표현식                     |
| `for.at`   | string | no       | 현재 인덱스의 변수 이름                      |
| `do`       | array  | yes      | 각 반복에서 실행되는 중첩 작업 목록           |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Process item ${ .idx }: ${ .item.name }"
```

### `raise`

구조화된 오류와 함께 워크플로를 중지합니다.

| Field                | Type   | Required | 설명                     |
| -------------------- | ------ | -------- | ---------------------- |
| `raise.error.status` | number | yes      | HTTP 스타일 상태 코드    |
| `raise.error.type`   | string | yes      | 오류 유형 URI/문자열     |
| `raise.error.title`  | string | yes      | 사람이 읽을 수 있는 제목 |
| `raise.error.detail` | string | no       | 상세 오류 메시지         |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Invalid input"
        detail: "Field 'email' is required"
```

### `emit`

워크플로 이벤트를 기록합니다. 이벤트는 실행 결과에 저장됩니다.

| Field                | Type   | Required | 설명                     |
| -------------------- | ------ | -------- | ---------------------- |
| `emit.event.type`    | string | yes      | 이벤트 유형 식별자       |
| `emit.event.source`  | string | no       | 이벤트 소스 URI          |
| `emit.event.data`    | object | no       | 이벤트 페이로드          |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

일정 기간 동안 실행을 일시 중지합니다.

| Field  | Type   | Required | 설명                                   |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | ISO 8601 기간 (예: `PT5S`)             |

일반적인 기간: `PT1S` (1초), `PT30S` (30초), `PT1M` (1분), `PT5M` (5분).

---

## 호출 디스패치 테이블

`call` 필드 값을 실제로 호출되는 Triggerfish 도구에 매핑합니다.

| `call` 값              | 호출되는 도구    | 필수 `with:` 필드                              |
| ---------------------- | ---------------- | ---------------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` 또는 `url`; 선택적 `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`       | `prompt` 또는 `task`; 선택적 `tools`, `max_iterations`    |
| `triggerfish:agent`    | `subagent`       | `prompt` 또는 `task`; 선택적 `tools`, `agent`             |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + 작업 필드 |
| `triggerfish:web_search` | `web_search`   | `query`; 선택적 `max_results`                  |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`; 선택적 `method`, `headers`, `body`      |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; 선택적 `arguments`    |
| `triggerfish:message`  | `send_message`   | `channel`, `text`; 선택적 `recipient`          |

지원되지 않는 CNCF 호출 유형 (`grpc`, `openapi`, `asyncapi`)은 오류를 반환합니다.

---

## 표현식 구문

표현식은 `${ }`로 구분되며 워크플로 데이터 컨텍스트에 대해 확인됩니다.

### 점 경로 확인

| 구문                    | 설명                                | 예제 결과             |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | 전체 데이터 컨텍스트                | `{...}`              |
| `${ .key }`             | 최상위 키                           | `"value"`            |
| `${ .a.b.c }`           | 중첩 키                             | `"deep value"`       |
| `${ .items[0] }`        | 배열 인덱스                         | `{...첫 번째 항목...}` |
| `${ .items[0].name }`   | 배열 인덱스 후 키                   | `"first"`            |

선행 점 (또는 `$.`)은 컨텍스트 루트에 경로를 고정합니다. `undefined`로 확인되는 경로는 보간 시 빈 문자열을 생성하고, 독립형 값으로 사용될 때는 `undefined`를 생성합니다.

### 연산자

| 유형       | 연산자                       | 예제                           |
| ---------- | ---------------------------- | ------------------------------ |
| 비교       | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`         |
| 산술       | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

비교 표현식은 `true` 또는 `false`를 반환합니다. 산술 표현식은 숫자를 반환합니다 (피연산자가 숫자가 아니거나 0으로 나누는 경우 `undefined`).

### 리터럴

| 유형    | 예제                     |
| ------- | ------------------------ |
| 문자열  | `"hello"`, `'hello'`     |
| 숫자    | `42`, `3.14`, `-1`       |
| 부울    | `true`, `false`          |
| Null    | `null`                   |

### 보간 모드

**단일 표현식 (원시 값):** 전체 문자열이 하나의 `${ }` 표현식인 경우 원시 유형 값이 반환됩니다 (숫자, 부울, 객체, 배열).

```yaml
count: "${ .items.length }"  # returns a number, not a string
```

**혼합 / 복수 표현식 (문자열):** `${ }` 표현식이 텍스트와 혼합되거나 여러 표현식이 있는 경우 결과는 항상 문자열입니다.

```yaml
message: "Found ${ .count } items in ${ .category }"  # returns a string
```

### 진실성

`if:` 조건 및 `switch` `when:` 표현식의 경우 JavaScript 스타일 진실성을 사용하여 값을 평가합니다:

| 값                              | 참? |
| ------------------------------- | --- |
| `true`                          | 예  |
| 0이 아닌 숫자                    | 예  |
| 비어 있지 않은 문자열            | 예  |
| 비어 있지 않은 배열              | 예  |
| 객체                            | 예  |
| `false`, `0`, `""`, `null`, `undefined`, 빈 배열 | 아니오 |

---

## 입력/출력 변환

변환은 작업에 들어가고 나가는 데이터를 재구성합니다.

### `input`

작업 실행 전에 적용됩니다. 작업의 데이터 컨텍스트 뷰를 대체합니다.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task sees only the config object
    with:
      endpoint: "${ .api_url }"  # resolved against the config object
```

**문자열로서의 `from`:** 전체 입력 컨텍스트를 대체하는 표현식.

**객체로서의 `from`:** 새 키를 표현식에 매핑합니다:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

작업 실행 후에 적용됩니다. 결과를 작업 이름 아래에 컨텍스트에 저장하기 전에 재구성합니다.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## 흐름 지시문

모든 작업의 `then` 필드는 작업 완료 후 실행 흐름을 제어합니다.

| 값           | 동작                                                |
| ------------ | --------------------------------------------------- |
| `continue`   | 시퀀스의 다음 작업으로 진행 (기본값)                 |
| `end`        | 워크플로 중지. 상태: `completed`.                   |
| `<작업 이름>`| 명명된 작업으로 이동. 작업은 동일한 `do` 블록에 있어야 합니다. |

switch 케이스도 `then` 필드에서 흐름 지시문을 사용합니다.

---

## 분류 상한

실행 중 최대 세션 taint를 제한하는 선택적 필드입니다.

```yaml
classification_ceiling: INTERNAL
```

| 값             | 의미                                                 |
| -------------- | ---------------------------------------------------- |
| `PUBLIC`       | 분류된 데이터에 접근하면 워크플로가 중지됩니다        |
| `INTERNAL`     | `PUBLIC` 및 `INTERNAL` 데이터 허용                   |
| `CONFIDENTIAL` | `CONFIDENTIAL`까지 데이터 허용                       |
| `RESTRICTED`   | 모든 분류 수준 허용                                  |
| *(생략)*       | 상한 미적용                                          |

상한은 모든 작업 전에 확인됩니다. 세션 taint가 상한을 초과한 경우 (예: 이전 작업이 분류된 데이터에 접근했기 때문에) 워크플로는 `failed` 상태와 `Workflow classification ceiling breached` 오류로 중지됩니다.

---

## 저장소

### 워크플로 정의

키 접두사 `workflows:{name}`으로 저장됩니다. 각 저장 레코드에는 다음이 포함됩니다:

| Field            | Type   | 설명                                     |
| ---------------- | ------ | ---------------------------------------- |
| `name`           | string | 워크플로 이름                            |
| `yaml`           | string | 원시 YAML 정의                           |
| `classification` | string | 저장 시점의 분류 수준                    |
| `savedAt`        | string | ISO 8601 타임스탬프                      |
| `description`    | string | 선택적 설명                              |

### 실행 기록

키 접두사 `workflow-runs:{runId}`로 저장됩니다. 각 실행 레코드에는 다음이 포함됩니다:

| Field            | Type   | 설명                                     |
| ---------------- | ------ | ---------------------------------------- |
| `runId`          | string | 이 실행의 UUID                           |
| `workflowName`   | string | 실행된 워크플로 이름                     |
| `status`         | string | `completed`, `failed` 또는 `cancelled`   |
| `output`         | object | 최종 데이터 컨텍스트 (내부 키 필터링)    |
| `events`         | array  | 실행 중 발행된 이벤트                    |
| `error`          | string | 오류 메시지 (`failed` 상태인 경우)       |
| `startedAt`      | string | ISO 8601 타임스탬프                      |
| `completedAt`    | string | ISO 8601 타임스탬프                      |
| `taskCount`      | number | 워크플로의 작업 수                       |
| `classification` | string | 완료 시점의 세션 taint                   |

---

## 제한

| 제한                     | 값    | 설명                                     |
| ------------------------ | ----- | ---------------------------------------- |
| 하위 워크플로 최대 깊이  | 5     | `run.workflow` 호출의 최대 중첩           |
| 실행 기록 기본 제한      | 10    | `workflow_history`의 기본 `limit`         |

---

## 실행 상태

| 상태        | 설명                                                 |
| ----------- | ---------------------------------------------------- |
| `pending`   | 워크플로가 생성되었지만 시작되지 않음                 |
| `running`   | 워크플로가 현재 실행 중                               |
| `completed` | 모든 작업이 성공적으로 완료 (또는 `then: end`)        |
| `failed`    | 작업 실패, `raise` 도달 또는 상한 위반                |
| `cancelled` | 외부에서 실행 취소됨                                 |
