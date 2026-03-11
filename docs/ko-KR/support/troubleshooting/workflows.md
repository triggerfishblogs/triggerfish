---
title: 워크플로 문제 해결
description: Triggerfish 워크플로 작업 시 일반적인 문제와 해결 방법입니다.
---

# 문제 해결: 워크플로

## "Workflow not found or not accessible"

워크플로가 존재하지만 현재 세션 taint보다 높은 분류 수준으로 저장되어 있습니다.

`CONFIDENTIAL` 세션 중에 저장된 워크플로는 `PUBLIC` 또는 `INTERNAL` 세션에서 보이지 않습니다. 저장소는 모든 로드에서 `canFlowTo` 검사를 사용하며, 워크플로의 분류가 세션 taint를 초과하면 `null` (표시상 "찾을 수 없음")을 반환합니다.

**해결 방법:** 먼저 분류된 데이터에 접근하여 세션 taint를 높이거나, 콘텐츠가 허용하는 경우 더 낮은 분류 세션에서 워크플로를 다시 저장하십시오.

**확인:** `workflow_list`를 실행하여 현재 분류 수준에서 어떤 워크플로가 보이는지 확인하십시오. 예상하는 워크플로가 없으면 더 높은 수준에서 저장된 것입니다.

---

## "Workflow classification ceiling breached"

세션의 taint 수준이 워크플로의 `classification_ceiling`을 초과했습니다. 이 검사는 모든 작업 전에 실행되므로, 이전 작업이 세션 taint를 높인 경우 실행 중에 트리거될 수 있습니다.

예를 들어, `classification_ceiling: INTERNAL`인 워크플로는 `triggerfish:memory` 호출이 세션 taint를 높이는 `CONFIDENTIAL` 데이터를 검색하면 중지됩니다.

**해결 방법:**

- 예상되는 데이터 민감도에 맞게 워크플로의 `classification_ceiling`을 높이십시오.
- 또는 분류된 데이터에 접근하지 않도록 워크플로를 재구성하십시오. 분류된 메모리를 읽는 대신 입력 매개변수를 사용하십시오.

---

## YAML 파싱 오류

### "YAML parse error: ..."

일반적인 YAML 구문 실수:

**들여쓰기.** YAML은 공백에 민감합니다. 탭이 아닌 스페이스를 사용하십시오. 각 중첩 수준은 정확히 2개의 스페이스여야 합니다.

```yaml
# Wrong — tabs or inconsistent indent
do:
- fetch:
      call: http

# Correct
do:
  - fetch:
      call: http
```

**표현식 주위에 따옴표 누락.** `${ }`가 포함된 표현식 문자열은 따옴표로 묶어야 합니다. 그렇지 않으면 YAML이 `{`를 인라인 매핑으로 해석합니다.

```yaml
# Wrong — YAML parse error
endpoint: ${ .config.url }

# Correct
endpoint: "${ .config.url }"
```

**`document` 블록 누락.** 모든 워크플로에는 `dsl`, `namespace` 및 `name`이 포함된 `document` 필드가 있어야 합니다:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

YAML이 성공적으로 파싱되었지만 결과가 스칼라 또는 배열이지 객체가 아닙니다. YAML에 최상위 키 (`document`, `do`)가 있는지 확인하십시오.

### "Task has no recognized type"

각 작업 항목에는 정확히 하나의 유형 키가 포함되어야 합니다: `call`, `run`, `set`, `switch`, `for`, `raise`, `emit` 또는 `wait`. 파서가 이러한 키를 찾지 못하면 인식되지 않는 유형을 보고합니다.

일반적인 원인: 작업 유형 이름의 오타 (예: `call` 대신 `calls`).

---

## 표현식 평가 실패

### 잘못된 값 또는 빈 값

표현식은 `${ .path.to.value }` 구문을 사용합니다. 선행 점은 필수입니다 — 이는 워크플로의 데이터 컨텍스트 루트에 경로를 고정합니다.

```yaml
# Wrong — missing leading dot
value: "${ result.name }"

# Correct
value: "${ .result.name }"
```

### 출력에서 "undefined"

점 경로가 아무것도 확인하지 못했습니다. 일반적인 원인:

- **잘못된 작업 이름.** 각 작업은 자신의 이름 아래에 결과를 저장합니다. 작업 이름이 `fetch_data`이면 결과를 `${ .fetch_data }`로 참조하십시오. `${ .data }` 또는 `${ .result }`가 아닙니다.
- **잘못된 중첩.** HTTP 호출이 `{"data": {"items": [...]}}`를 반환하면, 항목은 `${ .fetch_data.data.items }`에 있습니다.
- **배열 인덱싱.** 대괄호 구문을 사용하십시오: `${ .items[0].name }`. 점만 사용하는 경로는 숫자 인덱스를 지원하지 않습니다.

### 부울 조건이 작동하지 않음

표현식 비교는 엄격합니다 (`===`). 유형이 일치하는지 확인하십시오:

```yaml
# This fails if .count is a string "0"
if: "${ .count == 0 }"

# Works when .count is a number
if: "${ .count == 0 }"
```

업스트림 작업이 문자열을 반환하는지 숫자를 반환하는지 확인하십시오. HTTP 응답은 종종 문자열 값을 반환하며 비교를 위해 변환이 필요하지 않습니다 — 문자열 형식과 비교하면 됩니다.

---

## HTTP 호출 실패

### 타임아웃

HTTP 호출은 `web_fetch` 도구를 통해 이루어집니다. 대상 서버가 느리면 요청이 시간 초과될 수 있습니다. 워크플로 DSL에는 HTTP 호출에 대한 작업별 타임아웃 재정의가 없습니다 — `web_fetch` 도구의 기본 타임아웃이 적용됩니다.

### SSRF 차단

Triggerfish의 모든 아웃바운드 HTTP는 먼저 DNS를 확인하고 확인된 IP를 하드코딩된 거부 목록과 대조합니다. 사설 및 예약 IP 범위는 항상 차단됩니다.

워크플로가 사설 IP의 내부 서비스를 호출하면 (예: `http://192.168.1.100/api`), SSRF 방지에 의해 차단됩니다. 이는 의도된 것이며 구성할 수 없습니다.

**해결 방법:** 공용 IP로 확인되는 공용 호스트 이름을 사용하거나, 직접 접근 권한이 있는 MCP 서버를 통해 라우팅하기 위해 `triggerfish:mcp`를 사용하십시오.

### 헤더 누락

`http` 호출 유형은 `with.headers`를 요청 헤더에 직접 매핑합니다. API에 인증이 필요한 경우 헤더를 포함하십시오:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

토큰 값이 워크플로 입력에 제공되거나 이전 작업에서 설정되었는지 확인하십시오.

---

## 하위 워크플로 재귀 제한

### "Workflow recursion depth exceeded maximum of 5"

하위 워크플로는 최대 5단계까지 중첩할 수 있습니다. 이 제한은 워크플로 A가 워크플로 B를 호출하고 워크플로 B가 워크플로 A를 호출하는 무한 재귀를 방지합니다.

**해결 방법:**

- 워크플로 체인을 평탄화하십시오. 단계를 더 적은 수의 워크플로로 결합하십시오.
- 두 워크플로가 서로를 호출하는 순환 참조를 확인하십시오.

---

## 셸 실행 비활성화

### "Shell execution failed" 또는 run 작업에서 빈 결과

워크플로 도구 컨텍스트의 `allowShellExecution` 플래그는 `shell` 또는 `script` 대상이 있는 `run` 작업의 허용 여부를 제어합니다. 비활성화되면 이러한 작업이 실패합니다.

**해결 방법:** Triggerfish 구성에서 셸 실행이 활성화되어 있는지 확인하십시오. 프로덕션 환경에서는 보안을 위해 셸 실행이 의도적으로 비활성화될 수 있습니다.

---

## 워크플로가 실행되지만 잘못된 출력을 생성

### `workflow_history`로 디버깅

`workflow_history`를 사용하여 과거 실행을 검사하십시오:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

각 기록 항목에는 다음이 포함됩니다:

- **status** — `completed` 또는 `failed`
- **error** — 실패 시 오류 메시지
- **taskCount** — 워크플로의 작업 수
- **startedAt / completedAt** — 타이밍 정보

### 컨텍스트 흐름 확인

각 작업은 작업 이름 아래에 결과를 데이터 컨텍스트에 저장합니다. 워크플로에 `fetch`, `transform`, `save`라는 이름의 작업이 있으면 세 작업 모두 완료된 후 데이터 컨텍스트는 다음과 같습니다:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

일반적인 실수:

- **컨텍스트 덮어쓰기.** 이미 존재하는 키에 할당하는 `set` 작업은 이전 값을 대체합니다.
- **잘못된 작업 참조.** 작업 이름이 `step_1`인데 `${ .step1 }`을 참조하는 경우.
- **입력 변환이 컨텍스트를 대체.** `input.from` 지시문은 작업의 입력 컨텍스트를 완전히 대체합니다. `input.from: "${ .config }"`를 사용하면 작업은 전체 컨텍스트가 아닌 `config` 객체만 볼 수 있습니다.

### 누락된 출력

워크플로가 완료되었지만 빈 출력을 반환하는 경우, 마지막 작업의 결과가 예상대로인지 확인하십시오. 워크플로 출력은 내부 키가 필터링된 완료 시점의 전체 데이터 컨텍스트입니다.

---

## workflow_delete에서 "Permission denied"

`workflow_delete` 도구는 먼저 세션의 현재 taint 수준을 사용하여 워크플로를 로드합니다. 워크플로가 세션 taint를 초과하는 분류 수준으로 저장된 경우 로드는 null을 반환하고 `workflow_delete`는 "permission denied"가 아닌 "not found"를 보고합니다.

이는 의도된 것입니다 — 분류된 워크플로의 존재는 더 낮은 분류 세션에 공개되지 않습니다.

**해결 방법:** 삭제하기 전에 세션 taint를 워크플로의 분류 수준과 일치하거나 초과하도록 높이십시오. 또는 원래 저장된 것과 동일한 세션 유형에서 삭제하십시오.
